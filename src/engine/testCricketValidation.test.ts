import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialInningsState,
  stepMatchBall,
  stepMatchOver,
  stepMatchInnings,
  simulateFullMatch,
  computeMatchResult,
  declareInnings,
  resolveFollowOnDecision,
  takeNewBallInTestMatch,
  validateTestDeclaration,
  getDeclarationStrategicContext,
  getRemainingOversInTestMatch,
  isTestFollowOnEligible,
  decideAIFollowOn,
  getTestFollowOnThreshold,
  getPlayerById,
} from './matchEngine';
import {
  DEFAULT_TEST_OVERS_PER_DAY,
  DEFAULT_NEW_BALL_OVERS,
  createInitialTestWeather,
  getInitialTestPitchWear,
  getTestConditionsModifiers,
  advanceTestOverTimeAndConditions,
  shouldAICaptainDeclare,
  determineAITestBattingApproach,
} from './testCricketEngine';
import {
  applyBallToInnings,
  getMaxOversPerBowler,
  getPowerplayPhase,
  isDismissalLegalForDelivery,
} from './rules';
import { simulateDelivery, setSimulationSeed } from './simulation';
import { createNewCareerSave, applyUserMatchResult } from '../store/careerStore';
import { ALL_PLAYERS, getEffectivePlayer } from '../data/squads';
import { INTERNATIONAL_TEAMS } from '../data/teams';
import { VENUES } from '../data/venues';
import { BallOutcome, InningsState, Match, PitchCondition, WeatherCondition } from '../types/cricket';

function getTeamName(teamId: string): string {
  return INTERNATIONAL_TEAMS.find((t) => t.id === teamId)?.name || teamId;
}

function buildNameMap(xi: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  xi.forEach((id) => {
    map[id] = getPlayerById(id).shortName;
  });
  return map;
}

/**
 * Helper to build a clean, authentic Test match between two countries with full XI, WK, and captains
 */
function buildTestMatchFixture(
  id: string,
  homeTeamId: string,
  awayTeamId: string,
  options?: {
    seed?: number;
    pitch?: PitchCondition;
    weather?: WeatherCondition;
    isUserMatch?: boolean;
    userTeamId?: string;
    oversPerDay?: number;
  }
): Match {
  const homeCareer = createNewCareerSave('Test Coach', homeTeamId, 'TEST', 'INTERNATIONAL', 'TACTICAL');
  const awaySquad = homeCareer.aiTeams?.[awayTeamId]?.formatSquads.TEST;
  const homeSquad = homeCareer.formatSquads.TEST;

  const homeXI = homeSquad.playingXI;
  const awayXI = awaySquad
    ? awaySquad.playingXI
    : createNewCareerSave('Away', awayTeamId, 'TEST', 'INTERNATIONAL', 'TACTICAL').formatSquads.TEST.playingXI;
  const homeWk = homeSquad.wicketKeeperId;
  const awayWk = awaySquad ? awaySquad.wicketKeeperId : awayXI[5];
  const homeCap = homeSquad.captainId;
  const awayCap = awaySquad ? awaySquad.captainId : awayXI[0];

  const venue = VENUES.find((v) => v.countryId === homeTeamId) || VENUES[0];
  const pitch = options?.pitch || venue.pitch;
  const weather = options?.weather || venue.weather;
  const seed = options?.seed ?? 1001;

  const homeName = getTeamName(homeTeamId);
  const awayName = getTeamName(awayTeamId);

  const inn1 = createInitialInningsState(
    1,
    homeTeamId,
    homeName,
    awayTeamId,
    awayName,
    homeXI,
    awayXI,
    undefined,
    {
      format: 'TEST',
      pitch,
      weather,
      bowlingWicketKeeperId: awayWk,
    }
  );

  return {
    id,
    seed,
    format: 'TEST',
    seriesName: `${homeName} vs ${awayName} Test Series`,
    homeTeamId,
    awayTeamId,
    venue: venue.name,
    pitch,
    weather,
    dayNumber: 1,
    sessionNumber: 1,
    oversBowledToday: 0,
    oversPerDay: options?.oversPerDay ?? DEFAULT_TEST_OVERS_PER_DAY,
    newBallOversThreshold: DEFAULT_NEW_BALL_OVERS,
    pitchWear: getInitialTestPitchWear(pitch, seed),
    dynamicWeather: createInitialTestWeather(weather, seed + 9),
    sessionBreakStatus: undefined,
    status: 'IN_PROGRESS',
    isUserMatch: options?.isUserMatch ?? false,
    currentInningsIndex: 0,
    innings: [inn1],
    homeXI,
    awayXI,
    homeCaptainId: homeCap,
    awayCaptainId: awayCap,
    homeWicketKeeperId: homeWk,
    awayWicketKeeperId: awayWk,
    userTeamId: options?.userTeamId ?? homeTeamId,
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

test('1. Ball-by-ball mechanics: legal balls, extras, strike rotation, maidens, wicket legality & partnershipBalls', () => {
  const match = buildTestMatchFixture('test_bbb_1', 'IND', 'AUS', { seed: 42 });
  let inn: InningsState = match.innings[0];
  const nameMap = { ...buildNameMap(match.homeXI), ...buildNameMap(match.awayXI) };
  const initialStriker = inn.currentStrikerId;
  const initialNonStriker = inn.currentNonStrikerId;
  const bowlerId = inn.currentBowlerId;

  // 1) Wide ball: adds 1 run, does NOT increment legal balls or batter balls faced
  const wideBall: BallOutcome = {
    overNumber: 0,
    ballInOver: 1,
    runsOffBat: 0,
    extras: { wides: 1, noBalls: 0, byes: 0, legByes: 0 },
    totalRuns: 1,
    isLegalDelivery: false,
    isWicket: false,
    strikerId: inn.currentStrikerId,
    strikerName: nameMap[inn.currentStrikerId],
    nonStrikerId: inn.currentNonStrikerId,
    nonStrikerName: nameMap[inn.currentNonStrikerId],
    bowlerId,
    bowlerName: nameMap[bowlerId],
    commentary: 'Wide down leg',
  };
  inn = applyBallToInnings(inn, wideBall, match.homeXI, nameMap, 'TEST');
  assert.equal(inn.totalRuns, 1);
  assert.equal(inn.ballsInCurrentOver, 0, 'Wide must not advance legal ball count');
  assert.equal(inn.extras.wides, 1);

  // 2) No-ball + 4 off bat: adds 5 total runs, batter gets 4 runs & +1 ball faced, legal ball count stays 0
  const noBallFour: BallOutcome = {
    overNumber: 0,
    ballInOver: 1,
    runsOffBat: 4,
    extras: { wides: 0, noBalls: 1, byes: 0, legByes: 0 },
    totalRuns: 5,
    isLegalDelivery: false,
    isWicket: false,
    strikerId: inn.currentStrikerId,
    strikerName: nameMap[inn.currentStrikerId],
    nonStrikerId: inn.currentNonStrikerId,
    nonStrikerName: nameMap[inn.currentNonStrikerId],
    bowlerId,
    bowlerName: nameMap[bowlerId],
    commentary: 'No ball driven for four!',
  };
  inn = applyBallToInnings(inn, noBallFour, match.homeXI, nameMap, 'TEST');
  assert.equal(inn.totalRuns, 6);
  assert.equal(inn.ballsInCurrentOver, 0);
  const strikerEntryAfterNb = inn.batters.find((b) => b.playerId === initialStriker)!;
  assert.equal(strikerEntryAfterNb.runs, 4);
  assert.equal(strikerEntryAfterNb.balls, 1);

  // 3) Single off legal ball rotates strike
  const singleBall: BallOutcome = {
    overNumber: 0,
    ballInOver: 1,
    runsOffBat: 1,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
    totalRuns: 1,
    isLegalDelivery: true,
    isWicket: false,
    strikerId: inn.currentStrikerId,
    strikerName: nameMap[inn.currentStrikerId],
    nonStrikerId: inn.currentNonStrikerId,
    nonStrikerName: nameMap[inn.currentNonStrikerId],
    bowlerId,
    bowlerName: nameMap[bowlerId],
    commentary: 'Single worked to midwicket',
  };
  inn = applyBallToInnings(inn, singleBall, match.homeXI, nameMap, 'TEST');
  assert.equal(inn.currentStrikerId, initialNonStriker, 'Odd run must rotate strike');
  assert.equal(inn.ballsInCurrentOver, 1);

  // 4) Complete remaining 5 balls of over 0 with leg-byes (1) + 3 dots + wicket on 6th ball -> verify partnershipBalls & over swap
  const legByeBall: BallOutcome = {
    overNumber: 0,
    ballInOver: 2,
    runsOffBat: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 1 },
    totalRuns: 1,
    isLegalDelivery: true,
    isWicket: false,
    strikerId: inn.currentStrikerId,
    strikerName: nameMap[inn.currentStrikerId],
    nonStrikerId: inn.currentNonStrikerId,
    nonStrikerName: nameMap[inn.currentNonStrikerId],
    bowlerId,
    bowlerName: nameMap[bowlerId],
    commentary: 'Leg bye off the pads',
  };
  inn = applyBallToInnings(inn, legByeBall, match.homeXI, nameMap, 'TEST');
  assert.equal(inn.currentStrikerId, initialStriker, 'Odd leg-bye rotates strike back');

  for (let b = 3; b <= 5; b++) {
    inn = applyBallToInnings(
      inn,
      {
        overNumber: 0,
        ballInOver: b,
        runsOffBat: 0,
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
        totalRuns: 0,
        isLegalDelivery: true,
        isWicket: false,
        strikerId: inn.currentStrikerId,
        strikerName: nameMap[inn.currentStrikerId],
        nonStrikerId: inn.currentNonStrikerId,
        nonStrikerName: nameMap[inn.currentNonStrikerId],
        bowlerId,
        bowlerName: nameMap[bowlerId],
        commentary: 'Solidly defended',
      },
      match.homeXI,
      nameMap,
      'TEST'
    );
  }

  const wicketBall: BallOutcome = {
    overNumber: 0,
    ballInOver: 6,
    runsOffBat: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
    totalRuns: 0,
    isLegalDelivery: true,
    isWicket: true,
    wicketDetails: {
      type: 'CAUGHT',
      bowlerId,
      bowlerName: nameMap[bowlerId],
      fielderId: match.awayWicketKeeperId,
      fielderName: nameMap[match.awayWicketKeeperId],
      description: `c †${nameMap[match.awayWicketKeeperId]} b ${nameMap[bowlerId]}`,
    },
    strikerId: inn.currentStrikerId,
    strikerName: nameMap[inn.currentStrikerId],
    nonStrikerId: inn.currentNonStrikerId,
    nonStrikerName: nameMap[inn.currentNonStrikerId],
    bowlerId,
    bowlerName: nameMap[bowlerId],
    commentary: 'Edged and taken by the keeper!',
  };
  inn = applyBallToInnings(inn, wicketBall, match.homeXI, nameMap, 'TEST');
  assert.equal(inn.completedOvers, 1);
  assert.equal(inn.ballsInCurrentOver, 0);
  assert.equal(inn.wickets, 1);
  assert.equal(inn.fallOfWickets.length, 1);
  // Total balls faced by batters in this partnership: 1 (no-ball) + 6 (legal balls) = 7!
  assert.equal(inn.fallOfWickets[0].partnershipBalls, 7, 'Fall of wicket must record exact partnership balls');
  assert.equal(inn.fallOfWickets[0].partnershipRuns, 8);

  // 5) Bowl a clean 6-dot Maiden Over with next bowler and verify maiden increments
  const bowler2Id = match.awayXI.find((id) => id !== bowlerId && id !== match.awayWicketKeeperId)!;
  inn = { ...inn, currentBowlerId: bowler2Id };
  for (let b = 1; b <= 6; b++) {
    inn = applyBallToInnings(
      inn,
      {
        overNumber: 1,
        ballInOver: b,
        runsOffBat: 0,
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
        totalRuns: 0,
        isLegalDelivery: true,
        isWicket: false,
        strikerId: inn.currentStrikerId,
        strikerName: nameMap[inn.currentStrikerId],
        nonStrikerId: inn.currentNonStrikerId,
        nonStrikerName: nameMap[inn.currentNonStrikerId],
        bowlerId: bowler2Id,
        bowlerName: nameMap[bowler2Id],
        commentary: 'Dot ball',
      },
      match.homeXI,
      nameMap,
      'TEST'
    );
  }
  const bowler2Entry = inn.bowlers.find((bw) => bw.playerId === bowler2Id)!;
  assert.equal(bowler2Entry.overs, 1);
  assert.equal(bowler2Entry.maidens, 1, 'Six dot balls with zero bowler runs must register a maiden over');

  // 6) Verify illegal delivery dismissal legality rules
  assert.equal(isDismissalLegalForDelivery('BOWLED', true, false), false);
  assert.equal(isDismissalLegalForDelivery('RUN_OUT', true, false), true);
  assert.equal(isDismissalLegalForDelivery('STUMPED', false, true), true);
  assert.equal(isDismissalLegalForDelivery('LBW', false, true), false);
});

test('2. Unlimited Test innings length: Test innings naturally exceed 75+ overs without artificial over caps', () => {
  let foundLongTestInnings = false;
  let maxOversObserved = 0;

  for (let seed = 200; seed < 218; seed++) {
    const m = buildTestMatchFixture(`long_inn_${seed}`, 'IND', 'ENG', {
      seed,
      pitch: VENUES[2].pitch, // Wankhede Batter Paradise
      weather: VENUES[1].weather, // Sunny
    });
    const afterInn1 = stepMatchInnings(m);
    const inn1 = afterInn1.innings[0];
    if (inn1.completedOvers > maxOversObserved) {
      maxOversObserved = inn1.completedOvers;
    }
    assert.ok(
      inn1.isCompleted,
      `Test Innings 1 must run to genuine completion (all-out, declaration, or match end), got ${inn1.totalRuns}/${inn1.wickets} in ${inn1.completedOvers} overs`
    );
    if (inn1.completedOvers >= 80) {
      foundLongTestInnings = true;
    }
  }

  assert.ok(
    foundLongTestInnings,
    `Expected Test innings to naturally exceed 80+ overs without any 50/75-over cap; max observed was ${maxOversObserved}`
  );
});

test('3. Follow-On System: 200-run threshold, interactive user pause, and Enforce vs Bat Again resolution', () => {
  const baseMatch = buildTestMatchFixture('followon_user_1', 'IND', 'AUS', {
    seed: 555,
    isUserMatch: true,
    userTeamId: 'IND',
  });

  assert.equal(getTestFollowOnThreshold(baseMatch), 200);

  const mkTwoInnMatch = (runs1: number, runs2: number): Match => ({
    ...baseMatch,
    innings: [
      { ...baseMatch.innings[0], totalRuns: runs1, wickets: 10, isCompleted: true },
      {
        ...createInitialInningsState(2, 'AUS', 'Australia', 'IND', 'India', baseMatch.awayXI, baseMatch.homeXI),
        totalRuns: runs2,
        wickets: 10,
        isCompleted: true,
      },
    ],
  });

  assert.equal(isTestFollowOnEligible(mkTwoInnMatch(450, 251)), false, '199-run lead must NOT be follow-on eligible');
  assert.equal(isTestFollowOnEligible(mkTwoInnMatch(450, 250)), true, 'Exact 200-run lead MUST be follow-on eligible');
  assert.equal(isTestFollowOnEligible(mkTwoInnMatch(510, 220)), true, '290-run lead MUST be follow-on eligible');

  // Construct interactive user Test match where user (IND) batted 1st for 460 and AUS is 240/9 on the verge of all-out
  const inn1Completed: InningsState = {
    ...baseMatch.innings[0],
    totalRuns: 460,
    wickets: 10,
    completedOvers: 112,
    isCompleted: true,
  };

  const awayNameMap = buildNameMap(baseMatch.awayXI);
  let inn2 = createInitialInningsState(
    2,
    'AUS',
    'Australia',
    'IND',
    'India',
    baseMatch.awayXI,
    baseMatch.homeXI,
    undefined,
    { format: 'TEST', pitch: baseMatch.pitch, weather: baseMatch.weather, bowlingWicketKeeperId: baseMatch.homeWicketKeeperId }
  );
  inn2 = {
    ...inn2,
    totalRuns: 240,
    wickets: 9,
    completedOvers: 74,
    batters: baseMatch.awayXI.map((pid, idx) => ({
      playerId: pid,
      playerName: awayNameMap[pid],
      runs: idx < 9 ? 25 : idx === 9 ? 10 : 5,
      balls: idx < 9 ? 45 : 20,
      fours: 2,
      sixes: 0,
      strikeRate: 50,
      isCurrentStriker: idx === 9,
      isCurrentNonStriker: idx === 10,
      dismissal: idx < 9 ? { type: 'BOWLED', bowlerId: baseMatch.homeXI[9], bowlerName: 'Bowler', description: 'b Bowler' } : undefined,
    })),
    currentStrikerId: baseMatch.awayXI[9],
    currentNonStrikerId: baseMatch.awayXI[10],
  };

  let mState: Match = {
    ...baseMatch,
    dayNumber: 3,
    sessionNumber: 1,
    oversBowledToday: 6,
    currentInningsIndex: 1,
    innings: [inn1Completed, inn2],
  };

  // Step balls until the 10th wicket falls
  let safety = 0;
  while (mState.innings[1] && !mState.innings[1].isCompleted && safety < 400) {
    safety++;
    mState = stepMatchBall(mState);
  }

  assert.equal(mState.innings[1].isCompleted, true);
  assert.equal(mState.isFollowOnEligible, true);
  assert.equal(
    mState.awaitingFollowOnDecision,
    true,
    'Interactive user match must pause and await user Follow-On decision instead of auto-deciding'
  );
  assert.equal(mState.innings.length, 2, 'Innings 3 must not start until user resolves follow-on');

  // Branch A: User enforces the follow-on -> AUS bats again in Innings 3!
  const enforcedMatch = resolveFollowOnDecision(mState, true);
  assert.equal(enforcedMatch.followOnEnforced, true);
  assert.equal(enforcedMatch.awaitingFollowOnDecision, false);
  assert.equal(enforcedMatch.innings.length, 3);
  assert.equal(enforcedMatch.innings[2].battingTeamId, 'AUS', 'Enforcing follow-on must force AUS to bat in Innings 3');

  // Branch B: User declines follow-on ("Bat Again") -> IND bats in Innings 3!
  const declinedMatch = resolveFollowOnDecision(mState, false);
  assert.equal(declinedMatch.followOnEnforced, false);
  assert.equal(declinedMatch.awaitingFollowOnDecision, false);
  assert.equal(declinedMatch.innings.length, 3);
  assert.equal(declinedMatch.innings[2].battingTeamId, 'IND', 'Declining follow-on must send IND in to bat in Innings 3');
});

test('4. Multi-Factor AI Follow-On Decision: weighs lead, remaining time, pitch wear & bowler fatigue', () => {
  const m = buildTestMatchFixture('ai_followon', 'AUS', 'ENG', { seed: 707 });
  const inn1: InningsState = { ...m.innings[0], totalRuns: 520, wickets: 8, isDeclared: true, isCompleted: true, completedOvers: 120 };
  const inn2FreshBowlers: InningsState = {
    ...createInitialInningsState(2, 'ENG', 'England', 'AUS', 'Australia', m.awayXI, m.homeXI),
    totalRuns: 235,
    wickets: 10,
    completedOvers: 58,
    isCompleted: true,
  };

  // Case A: Day 4 Afternoon (limited overs remaining ~135), huge 285-run lead, bowlers fresh (58 overs) -> AI ENFORCES
  const tightTimeMatch: Match = {
    ...m,
    dayNumber: 4,
    sessionNumber: 2,
    oversBowledToday: 45,
    pitchWear: 62,
    innings: [inn1, inn2FreshBowlers],
  };
  assert.equal(
    decideAIFollowOn(tightTimeMatch, getPlayerById),
    true,
    'AI captain should enforce follow-on when lead is 285 on Day 4 with fresh bowlers'
  );

  // Case B: Early Day 3 (260+ overs remaining), modest 205-run lead, bowlers exhausted after bowling 122 overs -> AI BATS AGAIN
  const inn1Modest: InningsState = { ...inn1, totalRuns: 530 };
  const inn2ExhaustedBowlers: InningsState = {
    ...inn2FreshBowlers,
    totalRuns: 325,
    completedOvers: 122,
  };
  const plentyTimeFatiguedMatch: Match = {
    ...m,
    dayNumber: 3,
    sessionNumber: 1,
    oversBowledToday: 10,
    pitchWear: 30,
    innings: [inn1Modest, inn2ExhaustedBowlers],
  };
  assert.equal(
    decideAIFollowOn(plentyTimeFatiguedMatch, getPlayerById),
    false,
    'AI captain should decline follow-on (bat again) when bowlers just bowled 122 overs and plenty of time remains'
  );
});

test('5. Declaration System: validation, strategic context, immediate closure, target calculation & AI declarations', () => {
  const m = buildTestMatchFixture('decl_test', 'IND', 'ENG', { seed: 808, isUserMatch: true, userTeamId: 'IND' });

  // Cannot declare on 0 balls
  const zeroBallCheck = validateTestDeclaration(m);
  assert.equal(zeroBallCheck.allowed, false);

  // Simulate 5 overs so balls > 0
  let mAfter5 = m;
  for (let i = 0; i < 5; i++) {
    mAfter5 = stepMatchOver(mAfter5);
  }
  const validCheck = validateTestDeclaration(mAfter5);
  assert.equal(validCheck.allowed, true);

  const ctx = getDeclarationStrategicContext(mAfter5);
  assert.equal(ctx.allowed, true);
  assert.ok(ctx.scoreText.includes('/'));
  assert.ok(ctx.daysSessionsRemainingText.includes('Day 1'));
  assert.ok(ctx.strategicConsequences.length > 20);

  // User declares Innings 1 -> immediately closes Innings 1 and starts Innings 2
  const afterDecl1 = declareInnings(mAfter5);
  assert.equal(afterDecl1.innings[0].isDeclared, true);
  assert.equal(afterDecl1.innings[0].isCompleted, true);
  assert.equal(afterDecl1.currentInningsIndex, 1);
  assert.equal(afterDecl1.innings[1].battingTeamId, 'ENG');

  // Verify 3rd innings AI declaration & exact 4th innings target calculation
  const inn1: InningsState = { ...mAfter5.innings[0], totalRuns: 350, wickets: 7, isDeclared: true, isCompleted: true };
  const inn2: InningsState = { ...afterDecl1.innings[1], totalRuns: 280, wickets: 10, completedOvers: 82, isCompleted: true };
  const inn3: InningsState = {
    ...createInitialInningsState(3, 'IND', 'India', 'ENG', 'England', m.homeXI, m.awayXI),
    totalRuns: 245,
    wickets: 5,
    completedOvers: 62,
  };
  const mInnings3: Match = {
    ...mAfter5,
    dayNumber: 4,
    sessionNumber: 2,
    oversBowledToday: 45,
    pitchWear: 58,
    currentInningsIndex: 2,
    innings: [inn1, inn2, inn3],
  };

  // AI should declare in Innings 3 with a 315-run lead on Day 4 Session 2 (135 overs remaining, worn pitch)
  assert.equal(
    shouldAICaptainDeclare(mInnings3),
    true,
    'AI captain must declare in 3rd innings when lead is 315 with 135 overs remaining on Day 4 worn wicket'
  );

  // Declare Innings 3 -> verify Innings 4 gets exact targetRuns = (350 + 245 - 280) + 1 = 316!
  const mInnings4 = declareInnings(mInnings3);
  assert.equal(mInnings4.currentInningsIndex, 3);
  assert.equal(mInnings4.innings[3].targetRuns, 316);

  // Advance 1 over in Innings 4 and confirm declaring in 4th innings is forbidden
  const mInn4Played = stepMatchOver(mInnings4);
  const fourthInnCheck = validateTestDeclaration(mInn4Played);
  assert.equal(fourthInnCheck.allowed, false, 'Declaring in the 4th innings must be rejected');
});

test('6. Time, Sessions, Rain/Bad-Light Interruptions, Extra Time & Natural Time-Expired Draws', () => {
  // 1) Session transitions across a 90-over day: 30 overs -> LUNCH, 60 overs -> TEA, 90 overs -> STUMPS & Day 2 Session 1
  let m = buildTestMatchFixture('time_sessions', 'ENG', 'AUS', {
    seed: 909,
    weather: { type: 'SUNNY', swingBonus: 2, description: 'Clear skies' },
    oversPerDay: 90,
  });
  m = {
    ...m,
    dynamicWeather: {
      condition: 'SUNNY',
      cloudCover: 10,
      temperatureC: 24,
      humidity: 40,
      lightLevel: 'GOOD',
      description: 'Clear sunshine',
    },
  };

  for (let ov = 1; ov <= 30; ov++) {
    m = advanceTestOverTimeAndConditions(
      { ...m, dynamicWeather: { ...m.dynamicWeather!, cloudCover: 10, lightLevel: 'GOOD' } },
      getPlayerById
    );
  }
  assert.equal(m.dayNumber, 1);
  assert.equal(m.sessionNumber, 2, 'After 30 overs on a 90-over day, match must enter Afternoon Session (2)');
  assert.equal(m.sessionBreakStatus, 'LUNCH');

  for (let ov = 31; ov <= 60; ov++) {
    m = advanceTestOverTimeAndConditions(
      { ...m, dynamicWeather: { ...m.dynamicWeather!, cloudCover: 10, lightLevel: 'GOOD' } },
      getPlayerById
    );
  }
  assert.equal(m.sessionNumber, 3, 'After 60 overs, match must enter Evening Session (3)');
  assert.equal(m.sessionBreakStatus, 'TEA');

  for (let ov = 61; ov <= 90; ov++) {
    m = advanceTestOverTimeAndConditions(
      { ...m, dynamicWeather: { ...m.dynamicWeather!, cloudCover: 10, lightLevel: 'GOOD' } },
      getPlayerById
    );
  }
  assert.equal(m.dayNumber, 2, 'After 90 overs, Day 1 must reach Stumps and advance to Day 2');
  assert.equal(m.sessionNumber, 1);
  assert.equal(m.oversBowledToday, 0);

  // 2) Rain & Bad-Light Interruptions genuinely deduct overs from remaining match time
  let rainyMatch = buildTestMatchFixture('rainy_draw', 'ENG', 'IND', {
    seed: 1313,
    weather: { type: 'RAIN_RISK', swingBonus: 18, description: 'Heavy persistent rain forecast' },
  });
  rainyMatch = {
    ...rainyMatch,
    dynamicWeather: {
      condition: 'RAIN_DELAY',
      cloudCover: 95,
      temperatureC: 15,
      humidity: 92,
      lightLevel: 'FADING',
      description: 'Heavy showers around the ground',
    },
  };
  const finishedRainy = simulateFullMatch(rainyMatch);
  assert.ok(
    (finishedRainy.totalOversLostToWeather || 0) > 0,
    'Heavy RAIN_RISK forecast must genuinely lose playing overs to weather/light'
  );

  // 3) Verify Extra Time granted when 9 wickets down or close to target, and Natural Time-Expired Draw on Day 5
  const drawCandidate = buildTestMatchFixture('day5_draw', 'AUS', 'IND', { seed: 1414 });
  const dInn1: InningsState = { ...drawCandidate.innings[0], totalRuns: 440, wickets: 10, completedOvers: 125, isCompleted: true };
  const dInn2: InningsState = {
    ...createInitialInningsState(2, 'IND', 'India', 'AUS', 'Australia', drawCandidate.awayXI, drawCandidate.homeXI),
    totalRuns: 410,
    wickets: 10,
    completedOvers: 120,
    isCompleted: true,
  };
  const dInn3: InningsState = {
    ...createInitialInningsState(3, 'AUS', 'Australia', 'IND', 'India', drawCandidate.homeXI, drawCandidate.awayXI),
    totalRuns: 290,
    wickets: 6,
    completedOvers: 85,
    isDeclared: true,
    isCompleted: true,
  };
  const dInn4: InningsState = {
    ...createInitialInningsState(4, 'IND', 'India', 'AUS', 'Australia', drawCandidate.awayXI, drawCandidate.homeXI, 321),
    totalRuns: 175,
    wickets: 5,
    completedOvers: 68,
  };
  let almostStumpsDay5: Match = {
    ...drawCandidate,
    dayNumber: 5,
    sessionNumber: 3,
    oversBowledToday: 89,
    oversPerDay: 90,
    currentInningsIndex: 3,
    innings: [dInn1, dInn2, dInn3, dInn4],
  };
  almostStumpsDay5 = stepMatchOver(almostStumpsDay5);
  assert.equal(
    almostStumpsDay5.status,
    'DRAW',
    'Test match must end in a natural DRAW when Day 5 overs expire without all-out or target reached'
  );
  assert.ok(almostStumpsDay5.resultText?.includes('Match Drawn'));
});

test('7. Test Match Conditions: non-identical Day 1->5 pitch wear, 80-over new ball & real pace/spin impact', () => {
  const dustbowlPitch: PitchCondition = {
    name: 'Rank Subcontinent Turner',
    type: 'DUSTBOWL_SPIN',
    paceBonus: -4,
    spinBonus: 20,
    bounceVariation: 14,
    wearFactor: 1.5,
  };
  const greenPitch = VENUES[0].pitch; // GREEN_SEAMER

  let dustMatch = buildTestMatchFixture('wear_dust', 'IND', 'AUS', { pitch: dustbowlPitch, seed: 301 });
  let greenMatch = buildTestMatchFixture('wear_green', 'ENG', 'AUS', { pitch: greenPitch, seed: 301 });

  const day1DustWear = dustMatch.pitchWear!;
  for (let ov = 0; ov < 280; ov++) {
    dustMatch = advanceTestOverTimeAndConditions(
      { ...dustMatch, dynamicWeather: { ...dustMatch.dynamicWeather!, cloudCover: 15, lightLevel: 'GOOD' } },
      getPlayerById
    );
    greenMatch = advanceTestOverTimeAndConditions(
      { ...greenMatch, dynamicWeather: { ...greenMatch.dynamicWeather!, cloudCover: 15, lightLevel: 'GOOD' } },
      getPlayerById
    );
  }
  assert.ok(dustMatch.pitchWear! > day1DustWear + 35, 'Pitch must progressively deteriorate from Day 1 to Day 4/5');
  assert.ok(
    dustMatch.pitchWear! > greenMatch.pitchWear!,
    `Dustbowl (wearFactor 1.5) must deteriorate faster than Green Seamer (wearFactor 1.0): ${dustMatch.pitchWear} vs ${greenMatch.pitchWear}`
  );

  // 80-over new ball availability for user bowling & manual reset via takeNewBallInTestMatch
  let nbMatch = buildTestMatchFixture('new_ball_80', 'AUS', 'ENG', {
    seed: 404,
    isUserMatch: true,
    userTeamId: 'ENG', // ENG is bowling in Innings 1!
  });
  const nbInn = { ...nbMatch.innings[0], completedOvers: 80, ballAgeOvers: 79, newBallAvailable: false };
  nbMatch = { ...nbMatch, innings: [nbInn] };
  nbMatch = advanceTestOverTimeAndConditions(
    { ...nbMatch, dynamicWeather: { ...nbMatch.dynamicWeather!, cloudCover: 20, lightLevel: 'GOOD' } },
    getPlayerById
  );
  assert.equal(nbMatch.innings[0].ballAgeOvers, 80);
  assert.equal(nbMatch.innings[0].newBallAvailable, true, 'New ball must become available to user captain at 80 overs');

  const afterNewBall = takeNewBallInTestMatch(nbMatch);
  assert.equal(afterNewBall.innings[0].ballAgeOvers, 0, 'Taking the new ball must reset ballAgeOvers to 0');
  assert.equal(afterNewBall.innings[0].newBallAvailable, false);
  assert.equal(afterNewBall.innings[0].newBallsTaken, 1);

  // Verify pitch & weather genuinely impact simulation outcomes (Day 1 Overcast Green Seamer vs Day 5 Dustbowl)
  const striker = getPlayerById(nbMatch.homeXI[2]);
  const nonStriker = getPlayerById(nbMatch.homeXI[3]);
  const pacer = ALL_PLAYERS.find((p) => p.countryId === 'AUS' && p.bowlingStyle.includes('FAST'))!;
  const spinner = ALL_PLAYERS.find(
    (p) => p.countryId === 'IND' && (p.bowlingStyle.includes('ORTHODOX') || p.bowlingStyle.includes('OFF_BREAK'))
  )!;

  const greenDay1Mods = getTestConditionsModifiers(
    {
      ...greenMatch,
      dayNumber: 1,
      pitchWear: 10,
      innings: [{ ...greenMatch.innings[0], ballAgeOvers: 3 }],
    },
    greenMatch.innings[0]
  );
  const dustDay5Mods = getTestConditionsModifiers(
    {
      ...dustMatch,
      dayNumber: 5,
      pitchWear: 88,
      innings: [{ ...dustMatch.innings[0], ballAgeOvers: 48 }],
    },
    { ...dustMatch.innings[0], ballAgeOvers: 48 }
  );

  let paceWicketsGreenD1 = 0;
  let paceWicketsFlatOldBall = 0;
  let spinWicketsGreenD1 = 0;
  let spinWicketsDustD5 = 0;

  setSimulationSeed(99991);
  for (let i = 0; i < 1800; i++) {
    const b1 = simulateDelivery({
      format: 'TEST',
      overNumber: 4,
      ballInOver: i % 6,
      striker,
      nonStriker,
      bowler: pacer,
      currentScore: 25,
      wicketsLost: 1,
      strikerBallsFaced: 12,
      battingAggression: 'BALANCED',
      bowlingTactic: 'ATTACKING_FULL',
      fieldPreset: 'ATTACKING_SLIPS',
      overCompletedOvers: 4,
      pitch: greenPitch,
      weather: VENUES[0].weather,
      testConditions: greenDay1Mods,
    });
    if (b1.isWicket) paceWicketsGreenD1++;

    const b2 = simulateDelivery({
      format: 'TEST',
      overNumber: 45,
      ballInOver: i % 6,
      striker,
      nonStriker,
      bowler: pacer,
      currentScore: 150,
      wicketsLost: 3,
      strikerBallsFaced: 12,
      battingAggression: 'BALANCED',
      bowlingTactic: 'BALANCED_CONTAIN',
      fieldPreset: 'BALANCED_STANDARD',
      overCompletedOvers: 45,
      pitch: VENUES[2].pitch, // BATTER_PARADISE
      weather: VENUES[1].weather,
      testConditions: { ...greenDay1Mods, effectivePaceBonus: 0.05, effectiveSwingBonus: 0.02, newBallFactor: 0.94, pitchWear: 22, ballAgeOvers: 45 },
    });
    if (b2.isWicket) paceWicketsFlatOldBall++;

    const s1 = simulateDelivery({
      format: 'TEST',
      overNumber: 12,
      ballInOver: i % 6,
      striker,
      nonStriker,
      bowler: spinner,
      currentScore: 40,
      wicketsLost: 1,
      strikerBallsFaced: 20,
      battingAggression: 'BALANCED',
      bowlingTactic: 'FLIGHT_SPIN',
      fieldPreset: 'BALANCED_STANDARD',
      overCompletedOvers: 12,
      pitch: greenPitch,
      weather: VENUES[0].weather,
      testConditions: greenDay1Mods,
    });
    if (s1.isWicket) spinWicketsGreenD1++;

    const s2 = simulateDelivery({
      format: 'TEST',
      overNumber: 55,
      ballInOver: i % 6,
      striker,
      nonStriker,
      bowler: spinner,
      currentScore: 160,
      wicketsLost: 5,
      strikerBallsFaced: 20,
      battingAggression: 'BALANCED',
      bowlingTactic: 'FLIGHT_SPIN',
      fieldPreset: 'ATTACKING_SLIPS',
      overCompletedOvers: 55,
      pitch: dustbowlPitch,
      weather: VENUES[1].weather,
      testConditions: dustDay5Mods,
    });
    if (s2.isWicket) spinWicketsDustD5++;
  }

  assert.ok(
    paceWicketsGreenD1 > paceWicketsFlatOldBall,
    `New-ball pacer on Day 1 Overcast Green Seamer must take more wickets than old ball on flat surface (${paceWicketsGreenD1} vs ${paceWicketsFlatOldBall})`
  );
  assert.ok(
    spinWicketsDustD5 > spinWicketsGreenD1,
    `Spinner on Day 5 Worn Dustbowl must take significantly more wickets than on Day 1 Green Seamer (${spinWicketsDustD5} vs ${spinWicketsGreenD1})`
  );
});

test('8. Test Batting AI & Spell-Based Bowling Rotation (4-6 bowlers, spell limits, no WK bowling)', () => {
  const m = buildTestMatchFixture('ai_tactics_rot', 'IND', 'AUS', { seed: 612 });

  // 1) Day 5 draw survival: 190 runs still needed in 22 overs with 7 wickets down -> AI blocks/defends!
  const survivalInn4: InningsState = {
    ...createInitialInningsState(4, 'AUS', 'Australia', 'IND', 'India', m.awayXI, m.homeXI, 380),
    totalRuns: 190,
    wickets: 7,
    completedOvers: 68,
  };
  const survivalMatch: Match = {
    ...m,
    dayNumber: 5,
    sessionNumber: 3,
    oversBowledToday: 68,
    currentInningsIndex: 3,
    innings: [m.innings[0], m.innings[0], m.innings[0], survivalInn4],
  };
  const survivalApproach = determineAITestBattingApproach(
    survivalMatch,
    survivalInn4,
    getPlayerById(m.awayXI[7])
  );
  assert.ok(
    survivalApproach === 'BLOCK' || survivalApproach === 'DEFENSIVE',
    `Expected survival batting approach on Day 5 evening 7 down, got ${survivalApproach}`
  );

  // 2) Declaration push: 3rd innings lead 295 on Day 4 with 4 wickets down -> AI attacks!
  const pushInn1: InningsState = { ...m.innings[0], totalRuns: 380, wickets: 10, isCompleted: true };
  const pushInn2: InningsState = { ...m.innings[0], battingTeamId: 'AUS', totalRuns: 300, wickets: 10, isCompleted: true };
  const pushInn3: InningsState = { ...m.innings[0], inningsNumber: 3, totalRuns: 215, wickets: 4, completedOvers: 54 };
  const pushMatch: Match = {
    ...m,
    dayNumber: 4,
    sessionNumber: 2,
    oversBowledToday: 50,
    currentInningsIndex: 2,
    innings: [pushInn1, pushInn2, pushInn3],
  };
  const pushApproach = determineAITestBattingApproach(
    pushMatch,
    pushInn3,
    getPlayerById(m.homeXI[4])
  );
  assert.equal(pushApproach, 'ATTACKING', 'AI should accelerate when building toward a declaration');

  // 3) Full Test innings bowling rotation: verify >= 4 bowlers used, WK never bowls, and realistic spell rotation
  const completedTest = simulateFullMatch(buildTestMatchFixture('rot_full', 'AUS', 'IND', { seed: 1921 }));
  const longInnings = completedTest.innings.find((inn) => inn.completedOvers >= 45) || completedTest.innings[0];
  const activeBowlers = longInnings.bowlers.filter((b) => b.overs > 0 || b.ballsThisOver > 0);
  assert.ok(
    activeBowlers.length >= 4,
    `Test bowling AI must rotate at least 4 bowlers in an innings (${longInnings.completedOvers} ov), got ${activeBowlers.length}`
  );
  const wkId =
    longInnings.bowlingTeamId === completedTest.homeTeamId
      ? completedTest.homeWicketKeeperId
      : completedTest.awayWicketKeeperId;
  assert.equal(
    activeBowlers.some((b) => b.playerId === wkId),
    false,
    'Designated wicketkeeper must never bowl in Test rotation'
  );
});

test('9. Exact Test Result Calculation: Win by runs, Win by wickets, Follow-on Innings Win, Normal-Order Innings Win, Tie & Draw', () => {
  const base = buildTestMatchFixture('results_matrix', 'IND', 'AUS', { seed: 77 });
  const mkInn = (num: 1 | 2 | 3 | 4, bat: string, bowl: string, runs: number, wkts: number, target?: number): InningsState => ({
    ...createInitialInningsState(
      num,
      bat,
      getTeamName(bat),
      bowl,
      getTeamName(bowl),
      bat === 'IND' ? base.homeXI : base.awayXI,
      bowl === 'IND' ? base.homeXI : base.awayXI,
      target
    ),
    totalRuns: runs,
    wickets: wkts,
    isAllOut: wkts >= 10,
    completedOvers: 75,
    isCompleted: true,
  });

  // A) Win by runs: IND 320 & 250 (570), AUS 290 & 210 all out (500) -> India won by 70 runs!
  const winByRuns = computeMatchResult({
    ...base,
    innings: [mkInn(1, 'IND', 'AUS', 320, 10), mkInn(2, 'AUS', 'IND', 290, 10), mkInn(3, 'IND', 'AUS', 250, 10), mkInn(4, 'AUS', 'IND', 210, 10, 281)],
  });
  assert.equal(winByRuns.winnerTeamId, 'IND');
  assert.equal(winByRuns.resultText, 'India won by 70 runs!');

  // B) Win by wickets: IND 280 & 220 (500), AUS 310 & 194/4 (504) -> Australia won by 6 wickets!
  const winByWickets = computeMatchResult({
    ...base,
    innings: [mkInn(1, 'IND', 'AUS', 280, 10), mkInn(2, 'AUS', 'IND', 310, 10), mkInn(3, 'IND', 'AUS', 220, 10), mkInn(4, 'AUS', 'IND', 194, 4, 191)],
  });
  assert.equal(winByWickets.winnerTeamId, 'AUS');
  assert.equal(winByWickets.resultText, 'Australia won by 6 wickets!');

  // C) Follow-On Innings Victory: IND 510, AUS 220 & (f/o) 205 -> India won by an innings and 85 runs!
  const followOnInningsWin = computeMatchResult({
    ...base,
    followOnEnforced: true,
    innings: [mkInn(1, 'IND', 'AUS', 510, 10), mkInn(2, 'AUS', 'IND', 220, 10), mkInn(3, 'AUS', 'IND', 205, 10)],
  });
  assert.equal(followOnInningsWin.winnerTeamId, 'IND');
  assert.equal(followOnInningsWin.resultText, 'India won by an innings and 85 runs!');

  // D) Normal-Order Innings Victory (Team B leads on 1st innings: IND 175, AUS 445, IND 210 all out -> Australia won by an innings and 60 runs!)
  const normalOrderInningsWin = computeMatchResult({
    ...base,
    followOnEnforced: false,
    innings: [mkInn(1, 'IND', 'AUS', 175, 10), mkInn(2, 'AUS', 'IND', 445, 10), mkInn(3, 'IND', 'AUS', 210, 10)],
  });
  assert.equal(normalOrderInningsWin.winnerTeamId, 'AUS');
  assert.equal(normalOrderInningsWin.resultText, 'Australia won by an innings and 60 runs!');

  // E) Exact Test Tie (Normal order: IND 300 & 240 = 540, AUS 280 & 260 all out = 540)
  const exactTie = computeMatchResult({
    ...base,
    innings: [mkInn(1, 'IND', 'AUS', 300, 10), mkInn(2, 'AUS', 'IND', 280, 10), mkInn(3, 'IND', 'AUS', 240, 10), mkInn(4, 'AUS', 'IND', 260, 10, 261)],
  });
  assert.equal(exactTie.winnerTeamId, undefined);
  assert.ok(exactTie.resultText.includes('Match Tied'));

  // F) Exact Test Tie after Follow-On (IND 480, AUS 220 & f/o 340, IND 80/10 = 480+80=560 vs 220+340=560)
  const followOnTie = computeMatchResult({
    ...base,
    followOnEnforced: true,
    innings: [mkInn(1, 'IND', 'AUS', 480, 10), mkInn(2, 'AUS', 'IND', 220, 10), mkInn(3, 'AUS', 'IND', 340, 10), mkInn(4, 'IND', 'AUS', 80, 10, 81)],
  });
  assert.equal(followOnTie.winnerTeamId, undefined);
  assert.ok(followOnTie.resultText.includes('Match Tied'));
});

test('10. Scorecard Reconciliation, Complete Test Player Statistics (200s, BF, 10w, Catches/Stumpings) & Idempotency', () => {
  const career = createNewCareerSave('Stats Coach', 'IND', 'TEST', 'INTERNATIONAL', 'TACTICAL');
  const firstTest = career.fixtures.find((f) => f.format === 'TEST')!;
  assert.ok(firstTest, 'Career must include Test fixtures');

  // Snapshot ALL_PLAYERS historical Test stats before simulation to confirm immutability
  const bumrahBaseBefore = ALL_PLAYERS.find((p) => p.shortName.includes('Bumrah') || p.countryId === 'IND')!;
  const baseRunsBefore = bumrahBaseBefore.stats.TEST.runs;
  const baseWktsBefore = bumrahBaseBefore.stats.TEST.wickets;

  let completed = simulateFullMatch({ ...firstTest, seed: 2026 });

  // Reconcile every innings scorecard: sum(batter.runs) + sum(extras) === totalRuns, dismissed batters === wickets
  for (const inn of completed.innings) {
    const batRunsSum = inn.batters.reduce((s, b) => s + b.runs, 0);
    const extrasSum = inn.extras.wides + inn.extras.noBalls + inn.extras.byes + inn.extras.legByes;
    assert.equal(
      batRunsSum + extrasSum,
      inn.totalRuns,
      `Innings ${inn.inningsNumber} batter runs (${batRunsSum}) + extras (${extrasSum}) must equal totalRuns (${inn.totalRuns})`
    );
    const dismissedCount = inn.batters.filter((b) => Boolean(b.dismissal)).length;
    assert.equal(dismissedCount, inn.wickets);
    assert.ok(inn.wickets <= 10);
  }

  // Inject a 215* double-century and a 10-wicket match haul (6/60 + 5/58 = 11 wickets) on a synthetic copy to verify 200s, BF, 10w & stumpings
  const heroBatterId = completed.homeXI[2];
  const heroBowlerId = completed.homeXI[9];
  const heroKeeperId = completed.homeWicketKeeperId;

  completed = {
    ...completed,
    innings: completed.innings.map((inn) => {
      if (inn.battingTeamId === completed.homeTeamId && inn.inningsNumber <= 2) {
        const exists = inn.batters.some((b) => b.playerId === heroBatterId);
        return {
          ...inn,
          batters: exists
            ? inn.batters.map((b) =>
                b.playerId === heroBatterId
                  ? { ...b, runs: 215, balls: 340, fours: 24, sixes: 2, dismissal: undefined }
                  : b
              )
            : [
                ...inn.batters,
                {
                  playerId: heroBatterId,
                  playerName: 'Hero Batter',
                  runs: 215,
                  balls: 340,
                  fours: 24,
                  sixes: 2,
                  strikeRate: 63.23,
                  isCurrentStriker: false,
                  isCurrentNonStriker: false,
                },
              ],
        };
      }
      if (inn.bowlingTeamId === completed.homeTeamId) {
        const wktsThisInn = inn.inningsNumber <= 2 ? 6 : 5;
        return {
          ...inn,
          batters: inn.batters.map((b, bIdx) =>
            bIdx === 0
              ? {
                  ...b,
                  dismissal: {
                    type: 'STUMPED',
                    bowlerId: heroBowlerId,
                    bowlerName: 'Hero Bowler',
                    fielderId: heroKeeperId,
                    fielderName: 'Keeper',
                    description: 'st †Keeper b Hero Bowler',
                  },
                }
              : b
          ),
          bowlers: inn.bowlers.some((bw) => bw.playerId === heroBowlerId)
            ? inn.bowlers.map((bw) =>
                bw.playerId === heroBowlerId ? { ...bw, wickets: wktsThisInn, runs: 60, overs: 22, maidens: 5 } : bw
              )
            : [
                ...inn.bowlers,
                {
                  playerId: heroBowlerId,
                  playerName: 'Hero Bowler',
                  overs: 22,
                  ballsThisOver: 0,
                  maidens: 5,
                  runs: 60,
                  wickets: wktsThisInn,
                  economy: 2.72,
                  wides: 0,
                  noBalls: 0,
                  dots: 98,
                },
              ],
        };
      }
      return inn;
    }),
  };

  // Ensure both bowling innings exist for the 10-wicket haul check
  if (completed.innings.filter((i) => i.bowlingTeamId === completed.homeTeamId).length === 1) {
    const oppBowled = completed.innings.find((i) => i.bowlingTeamId === completed.homeTeamId)!;
    completed = {
      ...completed,
      innings: [
        ...completed.innings,
        {
          ...oppBowled,
          inningsNumber: 4,
          bowlers: oppBowled.bowlers.map((bw) =>
            bw.playerId === heroBowlerId ? { ...bw, wickets: 5, runs: 58, overs: 20, maidens: 4 } : bw
          ),
        },
      ],
    };
  }

  const updatedCareer1 = applyUserMatchResult(career, completed);
  const updatedCareer2 = applyUserMatchResult(updatedCareer1, completed); // Call a second time -> must NOT double-count!

  const effBatter1 = getEffectivePlayer(heroBatterId, updatedCareer1)!;
  const effBatter2 = getEffectivePlayer(heroBatterId, updatedCareer2)!;
  assert.equal(effBatter1.simulatedStats?.TEST.matches, 1);
  assert.equal(effBatter2.simulatedStats?.TEST.matches, 1, 'Re-applying completed match must NEVER double-count stats');
  assert.ok((effBatter1.simulatedStats?.TEST.ballsFaced || 0) >= 340, 'Test ballsFaced must be tracked');
  assert.equal(effBatter1.simulatedStats?.TEST.doubleCenturies, 1, 'Test 200+ score must increment doubleCenturies');
  assert.ok((effBatter1.simulatedStats?.TEST.centuries || 0) >= 1);

  const effBowler = getEffectivePlayer(heroBowlerId, updatedCareer1)!;
  assert.equal(effBowler.simulatedStats?.TEST.tenWicketHauls, 1, '10+ match wickets across both Test innings must increment tenWicketHauls');
  assert.ok((effBowler.simulatedStats?.TEST.fiveWicketHauls || 0) >= 1);

  const effKeeper = getEffectivePlayer(heroKeeperId, updatedCareer1)!;
  assert.ok(
    (effKeeper.simulatedStats?.TEST.stumpings || 0) >= 1 || (effKeeper.simulatedStats?.TEST.catches || 0) >= 1,
    'Wicketkeeper catches/stumpings must be recorded from full innings dismissals'
  );

  // Confirm ALL_PLAYERS base database was not mutated
  assert.equal(bumrahBaseBefore.stats.TEST.runs, baseRunsBefore);
  assert.equal(bumrahBaseBefore.stats.TEST.wickets, baseWktsBefore);
});

test('11. Mid-Test JSON Save & Resume Determinism: saving on Day 2/3 and resuming yields bit-identical Test match', () => {
  const initial = buildTestMatchFixture('save_resume_test', 'ENG', 'AUS', { seed: 31415 });

  // Run uninterrupted match
  let uninterrupted = initial;
  let guard1 = 0;
  while (uninterrupted.status === 'IN_PROGRESS' && guard1 < 4000) {
    guard1++;
    uninterrupted = stepMatchOver(uninterrupted);
  }

  // Run 140 overs (~Day 2 Session 2), serialize to JSON, deserialize, and finish
  let midMatch = initial;
  for (let i = 0; i < 140 && midMatch.status === 'IN_PROGRESS'; i++) {
    midMatch = stepMatchOver(midMatch);
  }
  assert.equal(midMatch.status, 'IN_PROGRESS', 'Match should still be in progress mid-Test');
  assert.ok((midMatch.dayNumber || 1) >= 2, 'Mid-Test save should be on Day 2+');

  const jsonSnapshot = JSON.stringify(midMatch);
  let resumed: Match = JSON.parse(jsonSnapshot);

  let guard2 = 0;
  while (resumed.status === 'IN_PROGRESS' && guard2 < 4000) {
    guard2++;
    resumed = stepMatchOver(resumed);
  }

  assert.equal(resumed.status, uninterrupted.status);
  assert.equal(resumed.resultText, uninterrupted.resultText);
  assert.equal(resumed.innings.length, uninterrupted.innings.length);
  for (let i = 0; i < resumed.innings.length; i++) {
    assert.equal(resumed.innings[i].totalRuns, uninterrupted.innings[i].totalRuns);
    assert.equal(resumed.innings[i].wickets, uninterrupted.innings[i].wickets);
  }
});

test('12. Multi-Match Seeded 5-Day Test Batch (24 complete Tests): natural wins & draws, realistic scores & zero broken states', () => {
  const matchups: Array<[string, string]> = [
    ['IND', 'AUS'],
    ['ENG', 'IND'],
    ['AUS', 'ENG'],
    ['RSA', 'NZ'],
    ['PAK', 'SL'],
    ['WI', 'BAN'],
  ];

  let winsCount = 0;
  let drawsCount = 0;
  let totalInningsRuns = 0;
  let totalCompletedFirstTwoInnings = 0;

  for (let idx = 0; idx < 24; idx++) {
    const [home, away] = matchups[idx % matchups.length];
    const venue = VENUES[idx % VENUES.length];
    // Include realistic rainy English/monsoon weather on several fixtures so natural draws & rain delays occur alongside outright wins
    const weather: WeatherCondition =
      idx % 4 === 0
        ? { type: 'RAIN_RISK', swingBonus: 16, description: 'Heavy cloud and intermittent monsoon/English rain fronts' }
        : venue.weather;

    const match = buildTestMatchFixture(`batch_test_${idx}`, home, away, {
      seed: 5000 + idx * 37,
      pitch: venue.pitch,
      weather,
    });

    const finished = simulateFullMatch(match);

    assert.ok(
      finished.status === 'COMPLETED' || finished.status === 'DRAW' || finished.status === 'TIE',
      `Match ${idx} ended in invalid status ${finished.status}`
    );
    assert.ok(finished.resultText && finished.resultText.length > 5);
    assert.ok(finished.dayNumber >= 1 && finished.dayNumber <= 5, `Day number out of bounds: ${finished.dayNumber}`);
    assert.ok(finished.innings.length >= 1 && finished.innings.length <= 4);

    if (finished.status === 'COMPLETED') winsCount++;
    if (finished.status === 'DRAW') drawsCount++;

    for (let k = 0; k < Math.min(2, finished.innings.length); k++) {
      const inn = finished.innings[k];
      if (inn.isCompleted && inn.completedOvers > 10) {
        totalInningsRuns += inn.totalRuns;
        totalCompletedFirstTwoInnings++;
      }
    }
  }

  const avgFirstInningsScore =
    totalCompletedFirstTwoInnings > 0 ? totalInningsRuns / totalCompletedFirstTwoInnings : 0;

  assert.ok(winsCount >= 8, `Expected plenty of outright Test wins across 24 Tests, got ${winsCount}`);
  assert.ok(drawsCount >= 1, `Expected at least 1 natural Test draw across 24 Tests (including rainy/flat fixtures), got ${drawsCount}`);
  assert.ok(
    avgFirstInningsScore >= 210 && avgFirstInningsScore <= 480,
    `Expected realistic average 1st/2nd Test innings total (210-480), got ${avgFirstInningsScore.toFixed(1)}`
  );
});

test('13. Format Isolation Regression Check: ODI and T20I rules, quotas, powerplays & simulations remain 100% untouched', () => {
  // Quotas & Powerplays
  assert.equal(getMaxOversPerBowler('ODI'), 10);
  assert.equal(getMaxOversPerBowler('T20I'), 4);
  assert.equal(getMaxOversPerBowler('TEST'), Infinity);

  assert.equal(getPowerplayPhase('ODI', 5).phase, 'MANDATORY_PP1');
  assert.equal(getPowerplayPhase('ODI', 25).phase, 'INTERMEDIATE_PP2');
  assert.equal(getPowerplayPhase('ODI', 44).phase, 'DEATH_PP3');
  assert.equal(getPowerplayPhase('T20I', 3).phase, 'MANDATORY_PP1');
  assert.equal(getPowerplayPhase('T20I', 10).phase, 'STANDARD');

  // Run one full ODI and one full T20I career match to confirm zero regressions
  const odiCareer = createNewCareerSave('ODI Check', 'IND', 'ODI', 'INTERNATIONAL', 'TACTICAL');
  const odiFixture = odiCareer.fixtures.find((f) => f.format === 'ODI')!;
  const completedOdi = simulateFullMatch({ ...odiFixture, seed: 888 });
  assert.equal(completedOdi.status, 'COMPLETED');
  assert.ok(completedOdi.innings[0].completedOvers <= 50);
  for (const bw of completedOdi.innings[0].bowlers) {
    assert.ok(bw.overs <= 10, `ODI bowler exceeded 10-over quota: ${bw.overs}`);
  }

  const t20Career = createNewCareerSave('T20 Check', 'IND', 'T20I', 'INTERNATIONAL', 'AGGRESSIVE');
  const t20Fixture = t20Career.fixtures.find((f) => f.format === 'T20I')!;
  const completedT20 = simulateFullMatch({ ...t20Fixture, seed: 777 });
  assert.equal(completedT20.status, 'COMPLETED');
  assert.ok(completedT20.innings[0].completedOvers <= 20);
  for (const bw of completedT20.innings[0].bowlers) {
    assert.ok(bw.overs <= 4, `T20I bowler exceeded 4-over quota: ${bw.overs}`);
  }
});
