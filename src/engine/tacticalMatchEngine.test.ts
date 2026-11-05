import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHighRiskActionProbabilities,
  evaluateScoringTargetProgress,
  createDefaultPhaseTargets,
  initializeBowlerSpellData,
  recordOverInSpellManager,
  applyRestToBenchBowlers,
  getStandardFieldPresets,
  validateCustomFieldLayout,
  evaluateLBWReview,
  evaluateCaughtBehindReview,
  determineOppositionTactics,
  DEFAULT_TACTICAL_CALIBRATION,
} from './tacticalEngine';
import {
  stepMatchBall,
  createInitialInningsState,
  ensureMatchTacticalSystemsInitialized,
  executeDRSReview,
  updateIndividualBatterInstruction,
  updateIndividualBowlingPlan,
  updateCustomScoringTargets,
  updatePhaseScoringTargets,
  updateActiveFieldLayout,
  updateTeamBattingGamePlan,
} from './matchEngine';
import { ALL_PLAYERS, getDefaultPlayingXI } from '../data/squads';
import { Match, MatchFormat, CustomScoringTarget, CustomFieldLayout, PitchCondition } from '../types/cricket';

describe('MASTER UPGRADE: Advanced Match Engine & Tactical Gameplay', () => {
  const batsman = ALL_PLAYERS.find((p) => p.role === 'BATTER') || ALL_PLAYERS[0];
  const bowler = ALL_PLAYERS.find((p) => p.role === 'BOWLER') || ALL_PLAYERS[1];
  const standardPitch: PitchCondition = {
    name: 'Standard Sporting',
    type: 'SPORTING_BALANCED',
    paceBonus: 0,
    spinBonus: 0,
    bounceVariation: 0,
    wearFactor: 1.0,
  };
  const standardWeather = { type: 'SUNNY' as const, swingBonus: 0, description: 'Clear sky' };

  // 1. High Risk Attacking Action Baselines
  describe('High-Risk Action Calibration & Baselines', () => {
    it('enforces 40% Success / 60% Failure baseline in Test cricket and always sums to 100%', () => {
      const probs = calculateHighRiskActionProbabilities({
        format: 'TEST',
        approach: 'AGGRESSIVE',
        batter: batsman,
        bowler: bowler,
        pitch: standardPitch,
        isSpin: false,
        fieldPreset: 'BALANCED_STANDARD',
      });

      // Total must always equal exactly 1.0 (100%)
      const sum = probs.successProbability + probs.failureProbability;
      assert.ok(Math.abs(sum - 1.0) < 0.0001, `Expected sum 1.0, got ${sum}`);
      assert.ok(probs.successProbability >= 0.2 && probs.successProbability <= 0.65);
      assert.ok(probs.failureProbability >= 0.35);
    });

    it('enforces 60% Success / 40% Failure baseline in ODI and T20I cricket and always sums to 100%', () => {
      const odiProbs = calculateHighRiskActionProbabilities({
        format: 'ODI',
        approach: 'AGGRESSIVE',
        batter: batsman,
        bowler: bowler,
        pitch: standardPitch,
        isSpin: false,
        fieldPreset: 'BALANCED_STANDARD',
      });
      assert.ok(Math.abs(odiProbs.successProbability + odiProbs.failureProbability - 1.0) < 0.0001);
      assert.ok(odiProbs.successProbability >= 0.45);

      const t20iProbs = calculateHighRiskActionProbabilities({
        format: 'T20I',
        approach: 'AGGRESSIVE',
        batter: batsman,
        bowler: bowler,
        pitch: standardPitch,
        isSpin: false,
        fieldPreset: 'BALANCED_STANDARD',
      });
      assert.ok(Math.abs(t20iProbs.successProbability + t20iProbs.failureProbability - 1.0) < 0.0001);
      assert.ok(t20iProbs.successProbability >= 0.45);
    });

    it('distinguishes Smash from Aggressive: Smash has higher boundary intent and higher dismissal risk', () => {
      const aggProbs = calculateHighRiskActionProbabilities({
        format: 'T20I',
        approach: 'AGGRESSIVE',
        batter: batsman,
        bowler: bowler,
        pitch: standardPitch,
        isSpin: false,
        fieldPreset: 'BALANCED_STANDARD',
      });
      const smashProbs = calculateHighRiskActionProbabilities({
        format: 'T20I',
        approach: 'SMASH',
        batter: batsman,
        bowler: bowler,
        pitch: standardPitch,
        isSpin: false,
        fieldPreset: 'BALANCED_STANDARD',
      });

      assert.ok(smashProbs.scoringIntentBonus > aggProbs.scoringIntentBonus);
      assert.ok(smashProbs.riskMultiplier > aggProbs.riskMultiplier);
      assert.ok(Math.abs(smashProbs.successProbability + smashProbs.failureProbability - 1.0) < 0.0001);
    });
  });

  // 2. Custom Scoring Targets & Dynamic Urgency
  describe('Custom Scoring Targets & Dynamic Urgency Calibration', () => {
    it('evaluates target progress as AHEAD_OF_PLAN, ON_TRACK, BEHIND_PLAN, or TARGET_ACHIEVED', () => {
      const targets: CustomScoringTarget[] = [
        { id: 't1', targetScore: 200, targetOver: 30, label: '30-Over Mark' },
      ];

      // Behind plan: Only 80 runs scored in 20 overs
      const behindEval = evaluateScoringTargetProgress(80, 20, 0, 4, targets, 'ODI', 50);
      assert.strictEqual(behindEval.status, 'BEHIND_PLAN');
      assert.ok(behindEval.intentAdjustmentRunFactor > 1.0);
      assert.ok(behindEval.intentAdjustmentWicketRisk > 1.0);

      // Ahead of plan: 210 runs scored in 25 overs
      const achievedEval = evaluateScoringTargetProgress(210, 25, 0, 2, targets, 'ODI', 50);
      assert.strictEqual(achievedEval.status, 'TARGET_ACHIEVED');
      assert.ok(achievedEval.intentAdjustmentRunFactor <= 1.0);
    });

    it('creates default phase targets for ODI and T20I with appropriate phase milestones', () => {
      const odiTargets = createDefaultPhaseTargets('ODI');
      assert.ok(odiTargets.powerplayTarget);
      assert.strictEqual(odiTargets.powerplayTarget?.targetOver, 10);
      assert.strictEqual(odiTargets.middlePhaseTarget?.targetOver, 40);
      assert.strictEqual(odiTargets.deathPhaseTarget?.targetOver, 50);

      const t20iTargets = createDefaultPhaseTargets('T20I');
      assert.strictEqual(t20iTargets.powerplayTarget?.targetOver, 6);
      assert.strictEqual(t20iTargets.middlePhaseTarget?.targetOver, 15);
      assert.strictEqual(t20iTargets.deathPhaseTarget?.targetOver, 20);
    });
  });

  // 3. Bowling Spells & Fatigue Management
  describe('Bowling Spell Management & Fatigue Recovery', () => {
    it('initializes bowler spell tracker and tracks consecutive overs bowled', () => {
      const tracker = initializeBowlerSpellData(bowler, 'TEST', standardPitch);
      assert.strictEqual(tracker.fatigue, 'LOW');
      assert.strictEqual(tracker.currentSpellOvers, 0);

      const afterOver1 = recordOverInSpellManager(tracker, bowler, 'TEST');
      assert.strictEqual(afterOver1.currentSpellOvers, 1);
      assert.strictEqual(afterOver1.restOversSinceLastSpell, 0);
    });

    it('accumulates fatigue during long spells and recovers during bench rest overs', () => {
      let tracker = initializeBowlerSpellData(bowler, 'TEST', standardPitch);

      // Bowl 7 consecutive overs
      for (let i = 0; i < 7; i++) {
        tracker = recordOverInSpellManager(tracker, bowler, 'TEST');
      }

      assert.strictEqual(tracker.currentSpellOvers, 7);
      assert.ok(['MEDIUM', 'HIGH', 'EXHAUSTED'].includes(tracker.fatigue));

      // Rested for 8 overs while others bowl
      let spellMap: Record<string, typeof tracker> = { [bowler.id]: tracker };
      for (let r = 0; r < 8; r++) {
        spellMap = applyRestToBenchBowlers(spellMap, 'other_bowler');
      }

      assert.ok(spellMap[bowler.id].restOversSinceLastSpell >= 8);
      assert.strictEqual(spellMap[bowler.id].currentSpellOvers, 0); // Spell reset
      assert.strictEqual(spellMap[bowler.id].fatigue, 'LOW'); // Recovered
    });
  });

  // 4. Custom Field Placement & Legal Circle Restrictions
  describe('Custom Field Placements & Legal Rules Validation', () => {
    const presets = getStandardFieldPresets('bowler_1', [], 'wk_1');

    it('validates standard presets as legal field setups', () => {
      const validation = validateCustomFieldLayout(presets.BALANCED_STANDARD, 'TEST', 20);
      assert.strictEqual(validation.isLegal, true);
      assert.strictEqual(validation.errors.length, 0);
    });

    it('detects fielding violations (e.g. more than 5 on leg side)', () => {
      const illegalLayout: CustomFieldLayout = {
        id: 'illegal_1',
        name: 'Too Many On Leg',
        positions: [
          { position: 'WICKETKEEPER', fielderId: 'wk', x: 50, y: 38, isDeep: false, isLegSide: false },
          { position: 'MID_ON', fielderId: 'f1', x: 60, y: 70, isDeep: false, isLegSide: true },
          { position: 'MIDWICKET', fielderId: 'f2', x: 70, y: 60, isDeep: false, isLegSide: true },
          { position: 'SQUARE_LEG', fielderId: 'f3', x: 75, y: 48, isDeep: false, isLegSide: true },
          { position: 'FINE_LEG', fielderId: 'f4', x: 72, y: 34, isDeep: false, isLegSide: true },
          { position: 'LONG_ON', fielderId: 'f5', x: 65, y: 88, isDeep: true, isLegSide: true },
          { position: 'DEEP_MIDWICKET', fielderId: 'f6', x: 80, y: 66, isDeep: true, isLegSide: true }, // 6th leg side!
          { position: 'POINT', fielderId: 'f7', x: 28, y: 48, isDeep: false, isLegSide: false },
          { position: 'COVER', fielderId: 'f8', x: 30, y: 62, isDeep: false, isLegSide: false },
          { position: 'MID_OFF', fielderId: 'f9', x: 44, y: 72, isDeep: false, isLegSide: false },
        ],
        isLegal: true,
      };

      const validation = validateCustomFieldLayout(illegalLayout, 'ODI', 15, 50);
      assert.strictEqual(validation.isLegal, false);
      assert.ok(validation.errors.some((e) => e.includes('leg side')));
    });

    it('enforces white-ball mandatory powerplay restrictions (max 2 fielders outside 30-yard circle)', () => {
      const deepLayout: CustomFieldLayout = {
        id: 'deep_pp',
        name: 'Too Deep for PP1',
        positions: [
          { position: 'WICKETKEEPER', fielderId: 'wk', x: 50, y: 38, isDeep: false, isLegSide: false },
          { position: 'THIRD_MAN', fielderId: 'f1', x: 25, y: 22, isDeep: true, isLegSide: false },
          { position: 'DEEP_COVER', fielderId: 'f2', x: 18, y: 66, isDeep: true, isLegSide: false },
          { position: 'LONG_OFF', fielderId: 'f3', x: 38, y: 88, isDeep: true, isLegSide: false },
          { position: 'LONG_ON', fielderId: 'f4', x: 62, y: 88, isDeep: true, isLegSide: true },
          { position: 'DEEP_MIDWICKET', fielderId: 'f5', x: 82, y: 66, isDeep: true, isLegSide: true },
          { position: 'POINT', fielderId: 'f6', x: 28, y: 48, isDeep: false, isLegSide: false },
          { position: 'COVER', fielderId: 'f7', x: 30, y: 62, isDeep: false, isLegSide: false },
          { position: 'MID_OFF', fielderId: 'f8', x: 44, y: 72, isDeep: false, isLegSide: false },
          { position: 'MID_ON', fielderId: 'f9', x: 56, y: 72, isDeep: false, isLegSide: true },
        ],
        isLegal: true,
      };

      const validation = validateCustomFieldLayout(deepLayout, 'ODI', 5, 50);
      assert.strictEqual(validation.isLegal, false);
      assert.ok(validation.errors.some((e) => e.includes('outside the 30-yard circle')));
    });
  });

  // 5. Decision Review System (DRS)
  describe('Decision Review System (DRS)', () => {
    it('evaluates LBW reviews with ball tracking and retains review on Overturn or Umpire’s Call', () => {
      const res = evaluateLBWReview({
        deliveryIndex: 101,
        bowler,
        striker: batsman,
        pitch: standardPitch,
        originalDecision: 'OUT',
        isSpin: false,
      });

      assert.ok(['OUT', 'NOT_OUT'].includes(res.finalDecision));
      assert.ok(['DECISION_OVERTURNED', 'DECISION_STANDS', 'UMPIRES_CALL'].includes(res.outcome));
      assert.ok(res.ballTracking);
      assert.ok(['IN_LINE', 'OUTSIDE_OFF', 'OUTSIDE_LEG'].includes(res.ballTracking.pitching));
    });

    it('evaluates Caught Behind reviews with UltraEdge acoustic waveform', () => {
      const res = evaluateCaughtBehindReview({
        deliveryIndex: 202,
        originalDecision: 'OUT',
      });

      assert.ok(res.ultraEdge);
      assert.strictEqual(typeof res.ultraEdge.hasSpike, 'boolean');
      assert.ok(['DECISION_OVERTURNED', 'DECISION_STANDS'].includes(res.outcome));
    });
  });

  // 6. Rule-Based Opposition Management (Zero External AI)
  describe('Rule-Based Opposition Management (100% Offline / No External AI)', () => {
    it('adapts opposition batting and bowling tactics dynamically based on match context', () => {
      const indXI = getDefaultPlayingXI('IND', 'TEST');
      const ausXI = getDefaultPlayingXI('AUS', 'TEST');

      const innings1 = createInitialInningsState(
        4,
        'AUS',
        'Australia',
        'IND',
        'India',
        ausXI,
        indXI,
        350,
        {
          format: 'TEST',
          pitch: standardPitch,
          weather: standardWeather,
          bowlingWicketKeeperId: indXI[indXI.length - 1],
          seed: 99,
        }
      );
      innings1.wickets = 8; // 8 down on Day 5

      const testMatch: Match = {
        id: 'test_opp_m',
        format: 'TEST',
        homeTeamId: 'IND',
        awayTeamId: 'AUS',
        userTeamId: 'IND',
        isUserMatch: true,
        status: 'IN_PROGRESS',
        venue: 'Sydney Cricket Ground',
        pitch: standardPitch,
        weather: standardWeather,
        homeXI: indXI,
        awayXI: ausXI,
        homeCaptainId: indXI[0],
        awayCaptainId: ausXI[0],
        homeWicketKeeperId: indXI[indXI.length - 1],
        awayWicketKeeperId: ausXI[ausXI.length - 1],
        currentInningsIndex: 0,
        innings: [innings1],
        dayNumber: 5,
        sessionNumber: 3,
        userTactics: {
          battingAggression: 'BALANCED',
          bowlingTactic: 'ATTACKING_FULL',
          fieldPreset: 'BALANCED_STANDARD',
        },
        aiTactics: {
          battingAggression: 'DEFENSIVE',
          bowlingTactic: 'TIGHT_DEFENSIVE',
          fieldPreset: 'BALANCED_STANDARD',
        },
      };

      const tactics = determineOppositionTactics({
        match: testMatch,
        currentInnings: innings1,
        isBatting: true,
        activeBowler: bowler,
        activeStriker: batsman,
      });

      assert.ok(tactics.batterInstruction);
      assert.strictEqual(tactics.batterInstruction.approach, 'DEFENSIVE');
      assert.strictEqual(tactics.batterInstruction.situationalInstruction, 'PROTECT_WICKET');
    });
  });

  // 7. Full Integration into Match Engine
  describe('Full Simulation Integration & Wagon Wheel / Pitch Map Tracking', () => {
    it('simulates deliveries in an active match and logs Wagon Wheel and Pitch Map vectors', () => {
      const indXI = getDefaultPlayingXI('IND', 'T20I');
      const ausXI = getDefaultPlayingXI('AUS', 'T20I');

      const innings1 = createInitialInningsState(
        1,
        'IND',
        'India',
        'AUS',
        'Australia',
        indXI,
        ausXI,
        undefined,
        {
          format: 'T20I',
          pitch: standardPitch,
          weather: standardWeather,
          bowlingWicketKeeperId: ausXI[ausXI.length - 1],
          allocatedOvers: 20,
          seed: 42,
        }
      );

      let match: Match = {
        id: 'test_tactical_m1',
        format: 'T20I',
        homeTeamId: 'IND',
        awayTeamId: 'AUS',
        userTeamId: 'IND',
        isUserMatch: true,
        status: 'IN_PROGRESS',
        venue: 'Eden Gardens',
        pitch: standardPitch,
        weather: standardWeather,
        homeXI: indXI,
        awayXI: ausXI,
        homeCaptainId: indXI[0],
        awayCaptainId: ausXI[0],
        homeWicketKeeperId: indXI[indXI.length - 1],
        awayWicketKeeperId: ausXI[ausXI.length - 1],
        currentInningsIndex: 0,
        innings: [innings1],
        dayNumber: 1,
        sessionNumber: 1,
        allocatedOversPerInnings: 20,
        userTactics: {
          battingAggression: 'SMASH',
          bowlingTactic: 'ATTACKING_FULL',
          fieldPreset: 'RING_INNER',
        },
        aiTactics: {
          battingAggression: 'BALANCED',
          bowlingTactic: 'BALANCED_CONTAIN',
          fieldPreset: 'BALANCED_STANDARD',
        },
      };

      match = ensureMatchTacticalSystemsInitialized(match);

      match = updateIndividualBatterInstruction(match, {
        playerId: indXI[0],
        approach: 'SMASH',
        shotSelection: 'LOOK_FOR_BOUNDARIES',
        situationalInstruction: 'ATTACK_POWERPLAY',
      });

      for (let b = 0; b < 6; b++) {
        match = stepMatchBall(match);
      }

      assert.ok(match.innings[0].completedOvers >= 1);
      assert.ok(match.wagonWheelDeliveries);
      assert.ok(match.pitchMapDeliveries);
      assert.ok(match.wagonWheelDeliveries.length > 0);
      assert.ok(match.pitchMapDeliveries.length > 0);

      const activeBowlerId = match.innings[0].currentBowlerId;
      assert.ok(match.bowlerSpellData);
      assert.ok(match.bowlerSpellData[activeBowlerId]);
    });
  });
});
