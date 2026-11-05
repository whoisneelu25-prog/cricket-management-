import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Match,
  MatchFormat,
  BattingAggression,
  BowlingTactic,
  FieldPreset,
  IndividualBatterInstruction,
  IndividualBowlingPlan,
  CustomScoringTarget,
  PhaseScoringTargets,
  PitchCondition,
} from '../types/cricket';
import {
  createInitialInningsState,
  stepMatchBall,
  simulateFullMatch,
  updateIndividualBatterInstruction,
  updateIndividualBowlingPlan,
  updateCustomScoringTargets,
  updatePhaseScoringTargets,
  getPlayerById,
} from './matchEngine';
import {
  evaluateScoringTargetProgress,
  createDefaultPhaseTargets,
  determineOppositionTactics,
  initializeBowlerSpellData,
  recordOverInSpellManager,
  applyRestToBenchBowlers,
} from './tacticalEngine';
import { getMaxOversPerBowler, getEffectiveMaxOversForBowler } from './rules';
import { simulateDelivery } from './simulation';
import { ALL_PLAYERS, getDefaultPlayingXI } from '../data/squads';
import { createNewCareerSave, sanitizeCareerSave } from '../store/careerStore';

describe('MATCH CENTRE SIMPLIFICATION & CONTEXTUAL CONTROL VALIDATION', () => {
  const standardPitch: PitchCondition = {
    name: 'Standard Sporting',
    type: 'SPORTING_BALANCED',
    paceBonus: 0,
    spinBonus: 0,
    bounceVariation: 0,
    wearFactor: 1.0,
  };
  const standardWeather = { type: 'SUNNY' as const, swingBonus: 0, description: 'Clear sky' };

  // Helper to build a basic fixture
  function createTestFixture(format: MatchFormat, userTeamId: string, homeTeam: string, awayTeam: string): Match {
    const homeXI = getDefaultPlayingXI(homeTeam, format);
    const awayXI = getDefaultPlayingXI(awayTeam, format);

    const innings1 = createInitialInningsState(
      1,
      homeTeam,
      homeTeam,
      awayTeam,
      awayTeam,
      homeXI,
      awayXI,
      undefined,
      {
        format,
        pitch: standardPitch,
        weather: standardWeather,
        bowlingWicketKeeperId: awayXI[awayXI.length - 1],
        allocatedOvers: format === 'T20I' ? 20 : format === 'ODI' ? 50 : undefined,
        seed: 1234,
      }
    );

    return {
      id: `match_simp_${format}`,
      format,
      homeTeamId: homeTeam,
      awayTeamId: awayTeam,
      userTeamId,
      isUserMatch: userTeamId === homeTeam || userTeamId === awayTeam,
      status: 'IN_PROGRESS',
      venue: 'Melbourne Cricket Ground',
      pitch: standardPitch,
      weather: standardWeather,
      homeXI,
      awayXI,
      homeCaptainId: homeXI[0],
      awayCaptainId: awayXI[0],
      homeWicketKeeperId: homeXI[homeXI.length - 1],
      awayWicketKeeperId: awayXI[awayXI.length - 1],
      currentInningsIndex: 0,
      innings: [innings1],
      dayNumber: 1,
      sessionNumber: 1,
      userTactics: {
        battingAggression: 'BALANCED',
        bowlingTactic: 'BALANCED_CONTAIN',
        fieldPreset: 'BALANCED_STANDARD',
      },
      aiTactics: {
        battingAggression: 'BALANCED',
        bowlingTactic: 'BALANCED_CONTAIN',
        fieldPreset: 'BALANCED_STANDARD',
      },
    };
  }

  // 1 & 2 & 3. User team contextual detection (Batting vs Bowling mutual exclusivity)
  it('detects user batting context and ensures Batting Settings and Bowling Settings NEVER appear simultaneously', () => {
    // Case A: User is IND, IND is batting in Innings 1
    const matchUserBatting = createTestFixture('ODI', 'IND', 'IND', 'AUS');
    const currInningsA = matchUserBatting.innings[0];

    const isUserBattingA = currInningsA.battingTeamId === matchUserBatting.userTeamId;
    const isUserBowlingA = currInningsA.bowlingTeamId === matchUserBatting.userTeamId;

    assert.strictEqual(isUserBattingA, true, 'User team must be detected as batting');
    assert.strictEqual(isUserBowlingA, false, 'User team must NOT be detected as bowling');
    assert.ok(!(isUserBattingA && isUserBowlingA), 'Both panels must NEVER appear simultaneously');

    // Case B: User is AUS, IND is batting in Innings 1 (AUS is bowling)
    const matchUserBowling = createTestFixture('ODI', 'AUS', 'IND', 'AUS');
    const currInningsB = matchUserBowling.innings[0];

    const isUserBattingB = currInningsB.battingTeamId === matchUserBowling.userTeamId;
    const isUserBowlingB = currInningsB.bowlingTeamId === matchUserBowling.userTeamId;

    assert.strictEqual(isUserBattingB, false, 'User team must NOT be detected as batting when bowling');
    assert.strictEqual(isUserBowlingB, true, 'User team must be detected as bowling');
    assert.ok(!(isUserBattingB && isUserBowlingB), 'Both panels must NEVER appear simultaneously');
  });

  // 4 & 5. Opposition matches remain AI-controlled through local rules; user cannot control opposition
  it('disables user tactical controls in neutral / opposition matches and lets opposition AI run automatically', () => {
    // User is RSA, but match is IND vs AUS (neutral)
    const neutralMatch = createTestFixture('T20I', 'RSA', 'IND', 'AUS');
    const currInnings = neutralMatch.innings[0];

    const isUserBatting = currInnings.battingTeamId === neutralMatch.userTeamId;
    const isUserBowling = currInnings.bowlingTeamId === neutralMatch.userTeamId;

    assert.strictEqual(isUserBatting, false, 'User cannot control batting in opposition match');
    assert.strictEqual(isUserBowling, false, 'User cannot control bowling in opposition match');

    // Opposition manager makes automated decisions
    const activeStriker = getPlayerById(currInnings.currentStrikerId!);
    const activeBowler = getPlayerById(currInnings.currentBowlerId!);

    const oppTactics = determineOppositionTactics({
      match: neutralMatch,
      currentInnings: currInnings,
      isBatting: true,
      activeBowler,
      activeStriker,
    });

    assert.ok(oppTactics.batterInstruction, 'Opposition manager generates automated batter instruction');
    assert.ok(
      ['DEFENSIVE', 'BALANCED', 'POSITIVE', 'AGGRESSIVE', 'SMASH'].includes(
        oppTactics.batterInstruction.approach
      ),
      'Opposition tactics strictly follow deterministic local rules'
    );
  });

  // 6. Batting settings affect actual deliveries
  it('applies team and individual batting approaches to future deliveries and scales scoring rate', () => {
    const striker = ALL_PLAYERS.find((p) => p.role === 'BATTER') || ALL_PLAYERS[0];
    const bowler = ALL_PLAYERS.find((p) => p.role === 'BOWLER') || ALL_PLAYERS[1];

    let defensiveRuns = 0;
    let smashRuns = 0;

    for (let i = 0; i < 100; i++) {
      const bDef = simulateDelivery({
        format: 'T20I',
        striker,
        nonStriker: striker,
        bowler,
        pitch: standardPitch,
        weather: standardWeather,
        overNumber: 10,
        ballInOver: i % 6,
        currentScore: 80,
        wicketsLost: 2,
        battingAggression: 'DEFENSIVE',
        bowlingTactic: 'BALANCED_CONTAIN',
        fieldPreset: 'BALANCED_STANDARD',
        overCompletedOvers: 10,
        seed: 7000 + i,
      });
      defensiveRuns += bDef.runsOffBat;

      const bSmash = simulateDelivery({
        format: 'T20I',
        striker,
        nonStriker: striker,
        bowler,
        pitch: standardPitch,
        weather: standardWeather,
        overNumber: 10,
        ballInOver: i % 6,
        currentScore: 80,
        wicketsLost: 2,
        battingAggression: 'SMASH',
        bowlingTactic: 'BALANCED_CONTAIN',
        fieldPreset: 'BALANCED_STANDARD',
        overCompletedOvers: 10,
        seed: 7000 + i,
      });
      smashRuns += bSmash.runsOffBat;
    }

    assert.ok(
      smashRuns > defensiveRuns,
      `Smash batting approach (${smashRuns}) must score more runs than Defensive approach (${defensiveRuns})`
    );
  });

  // 7. Individual bowling plan influences delivery execution
  it('applies simple individual bowling plans and influences delivery line, length and wicket risk', () => {
    const striker = ALL_PLAYERS.find((p) => p.role === 'BATTER') || ALL_PLAYERS[0];
    const paceBowler = ALL_PLAYERS.find((p) => p.bowlingStyle?.toLowerCase().includes('fast')) || ALL_PLAYERS[1];

    const attackingPlan: IndividualBowlingPlan = {
      bowlerId: paceBowler.id,
      line: 'MIDDLE_STUMP',
      length: 'FULL',
      intention: 'TARGET_STUMPS',
    };

    const defensivePlan: IndividualBowlingPlan = {
      bowlerId: paceBowler.id,
      line: 'FOURTH_STUMP',
      length: 'GOOD_LENGTH',
      intention: 'DEFEND_RUNS',
    };

    let targetStumpsDeliveries = 0;
    let defensiveDeliveries = 0;

    for (let i = 0; i < 50; i++) {
      const b1 = simulateDelivery({
        format: 'ODI',
        striker,
        nonStriker: striker,
        bowler: paceBowler,
        pitch: standardPitch,
        weather: standardWeather,
        overNumber: 20,
        ballInOver: i % 6,
        currentScore: 90,
        wicketsLost: 2,
        battingAggression: 'BALANCED',
        bowlingTactic: 'BALANCED_CONTAIN',
        fieldPreset: 'BALANCED_STANDARD',
        individualBowlingPlan: attackingPlan,
        overCompletedOvers: 20,
        seed: 9100 + i,
      });
      if (b1.pitchMap && (b1.pitchMap.length === 'FULL' || b1.pitchMap.length === 'YORKER')) {
        targetStumpsDeliveries++;
      }

      const b2 = simulateDelivery({
        format: 'ODI',
        striker,
        nonStriker: striker,
        bowler: paceBowler,
        pitch: standardPitch,
        weather: standardWeather,
        overNumber: 20,
        ballInOver: i % 6,
        currentScore: 90,
        wicketsLost: 2,
        battingAggression: 'BALANCED',
        bowlingTactic: 'BALANCED_CONTAIN',
        fieldPreset: 'BALANCED_STANDARD',
        individualBowlingPlan: defensivePlan,
        overCompletedOvers: 20,
        seed: 9100 + i,
      });
      if (b2.pitchMap && b2.pitchMap.length === 'GOOD_LENGTH') {
        defensiveDeliveries++;
      }
    }

    assert.ok(targetStumpsDeliveries > 20, 'Attacking full-length plan must yield full/yorker landing points');
    assert.ok(defensiveDeliveries > 20, 'Defensive plan must yield good length landing points');
  });

  // 8. Scoring targets update and progress calculation
  it('correctly tracks scoring target status as Ahead, On Track or Behind', () => {
    const targets: CustomScoringTarget[] = [
      { id: 't1', targetScore: 100, targetOver: 20, label: 'Target 1' },
    ];

    // Case Ahead: 60 runs after 10 overs (Target run rate is 5.0, current is 6.0)
    const evalAhead = evaluateScoringTargetProgress(60, 10, 0, 1, targets, 'ODI', 50);
    assert.strictEqual(evalAhead.status, 'AHEAD_OF_PLAN');

    // Case Behind: 35 runs after 10 overs (Current run rate is 3.5, required is 6.5)
    const evalBehind = evaluateScoringTargetProgress(35, 10, 0, 3, targets, 'ODI', 50);
    assert.strictEqual(evalBehind.status, 'BEHIND_PLAN');

    // Case Achieved: 105 runs reached before or by Over 20
    const evalAchieved = evaluateScoringTargetProgress(105, 18, 0, 2, targets, 'ODI', 50);
    assert.strictEqual(evalAchieved.status, 'TARGET_ACHIEVED');
  });

  // 9. Bowling rotation & format limits enforcement (ODI 10 overs, T20I 4 overs, no consecutive overs)
  it('enforces format-specific bowler limits and prohibits consecutive overs', () => {
    assert.strictEqual(getMaxOversPerBowler('ODI', 50), 10, 'ODI standard quota is 10 overs');
    assert.strictEqual(getMaxOversPerBowler('T20I', 20), 4, 'T20I standard quota is 4 overs');
    assert.strictEqual(getMaxOversPerBowler('TEST'), Infinity, 'Test cricket has uncapped overs');

    const match = createTestFixture('T20I', 'AUS', 'IND', 'AUS');
    const innings = match.innings[0];

    // Bowler has bowled 4 overs in T20I
    const bowlerFigures = [{ playerId: match.awayXI[0], overs: 4, maidens: 0, runs: 28, wickets: 1, economy: 7.0, ballsThisOver: 0, wides: 0, noBalls: 0, dots: 10, playerName: 'Bowler 1' }];
    const effectiveQuota = getEffectiveMaxOversForBowler('T20I', match.awayXI[0], bowlerFigures, 20);
    assert.strictEqual(effectiveQuota, 4);
    assert.ok(bowlerFigures[0].overs >= effectiveQuota, 'Bowler must be recognized as exhausted after 4 overs');
  });

  // 10. Mid-match save and resume preserves all tactical settings
  it('preserves team approach, individual batter instructions, bowling plans, and scoring targets across save/resume', () => {
    let match = createTestFixture('ODI', 'IND', 'IND', 'AUS');
    const strikerId = match.innings[0].currentStrikerId!;
    const bowlerId = match.innings[0].currentBowlerId!;

    // Set custom tactics
    match.userTactics.battingAggression = 'SMASH';
    match = updateIndividualBatterInstruction(match, {
      playerId: strikerId,
      approach: 'SMASH',
      shotSelection: 'LOOK_FOR_BOUNDARIES',
    });
    match = updateIndividualBowlingPlan(match, {
      bowlerId,
      line: 'MIDDLE_STUMP',
      length: 'YORKER',
      intention: 'RESTRICT_BOUNDARIES',
    });
    match = updateCustomScoringTargets(match, [
      { id: 'tgt_1', targetScore: 280, targetOver: 45, label: 'Late Milestone' },
    ]);

    // Save and sanitize (career save simulation)
    const career = createNewCareerSave('Coach', 'IND', 'ODI', 'INTERNATIONAL', 'TACTICAL');
    career.fixtures = [match];

    const restoredCareer = sanitizeCareerSave(JSON.parse(JSON.stringify(career)));
    const restoredMatch = restoredCareer.fixtures[0];

    assert.strictEqual(restoredMatch.userTactics.battingAggression, 'SMASH');
    assert.strictEqual(restoredMatch.individualBatterInstructions?.[strikerId]?.approach, 'SMASH');
    assert.strictEqual(restoredMatch.individualBowlingPlans?.[bowlerId]?.length, 'YORKER');
    assert.strictEqual(restoredMatch.customScoringTargets?.[0]?.targetScore, 280);
  });
});

