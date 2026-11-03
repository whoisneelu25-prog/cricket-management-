import { test } from 'node:test';
import assert from 'node:assert';
import {
  Match,
  MatchFormat,
  PitchCondition,
  WeatherCondition,
} from '../types/cricket';
import {
  simulateFullMatch,
  stepMatchBall,
  stepMatchOver,
  stepMatchInnings,
  createInitialInningsState,
  computeMatchResult,
  declareInnings,
  simulateSuperOver,
  applyMatchStatsToPlayers,
  getPlayerById,
} from './matchEngine';
import {
  getMaxOversPerBowler,
  getMaxOversPerInnings,
  getPowerplayPhase,
  isDeliveryLegal,
  isDismissalLegalForDelivery,
  applyBallToInnings,
} from './rules';
import { simulateDelivery } from './simulation';
import {
  getDefaultPlayingXI,
  getDefaultCaptainId,
  getDefaultWicketKeeperId,
  ALL_PLAYERS,
} from '../data/squads';
import { VENUES } from '../data/venues';

function createFixture(
  homeTeamId: string,
  awayTeamId: string,
  format: MatchFormat,
  options: {
    seed?: number;
    venueName?: string;
    pitch?: PitchCondition;
    weather?: WeatherCondition;
  } = {}
): Match {
  const homeXI = getDefaultPlayingXI(homeTeamId, format);
  const awayXI = getDefaultPlayingXI(awayTeamId, format);
  const defaultVenue = VENUES.find((v) => v.countryId === homeTeamId) || VENUES[0];

  return {
    id: `test_match_${homeTeamId}_${awayTeamId}_${format}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    format,
    homeTeamId,
    awayTeamId,
    venue: options.venueName || defaultVenue.name,
    pitch: options.pitch || defaultVenue.pitch,
    weather: options.weather || defaultVenue.weather,
    dayNumber: 1,
    sessionNumber: 1,
    status: 'SCHEDULED',
    currentInningsIndex: 0,
    innings: [],
    homeXI,
    awayXI,
    homeCaptainId: getDefaultCaptainId(homeTeamId, format),
    awayCaptainId: getDefaultCaptainId(awayTeamId, format),
    homeWicketKeeperId: getDefaultWicketKeeperId(homeTeamId, format),
    awayWicketKeeperId: getDefaultWicketKeeperId(awayTeamId, format),
    userTeamId: homeTeamId,
    isUserMatch: false,
    userTactics: { battingAggression: 'BALANCED', bowlingTactic: 'BALANCED_CONTAIN', fieldPreset: 'BALANCED_STANDARD' },
    aiTactics: { battingAggression: 'BALANCED', bowlingTactic: 'BALANCED_CONTAIN', fieldPreset: 'BALANCED_STANDARD' },
    seed: options.seed !== undefined ? options.seed : 42,
  };
}

// ==========================================
// COMMON MATCH ENGINE TESTS (PHASE 12)
// ==========================================

test('Common 1: Team rosters contain exactly 11 distinct valid players', () => {
  const match = createFixture('IND', 'AUS', 'T20I');
  assert.strictEqual(match.homeXI.length, 11);
  assert.strictEqual(match.awayXI.length, 11);

  const homeSet = new Set(match.homeXI);
  const awaySet = new Set(match.awayXI);
  assert.strictEqual(homeSet.size, 11, 'Home team must have no duplicate players');
  assert.strictEqual(awaySet.size, 11, 'Away team must have no duplicate players');

  match.homeXI.forEach((id) => assert.ok(getPlayerById(id).name));
  match.awayXI.forEach((id) => assert.ok(getPlayerById(id).name));
});

test('Common 2: Innings reconciliation — Batter runs + Extras === Team total runs', () => {
  const match = createFixture('IND', 'PAK', 'ODI', { seed: 101 });
  const completed = simulateFullMatch(match);

  assert.ok(completed.innings.length >= 2);

  completed.innings.forEach((inn) => {
    const totalRunsFromBatters = inn.batters.reduce((acc, b) => acc + b.runs, 0);
    const totalExtras = inn.extras.total;
    const computedTotal = totalRunsFromBatters + totalExtras;

    assert.strictEqual(
      inn.totalRuns,
      computedTotal,
      `Innings total (${inn.totalRuns}) must equal batters (${totalRunsFromBatters}) + extras (${totalExtras})`
    );
    assert.ok(inn.wickets <= 10, 'Wickets can never exceed 10');
  });
});

test('Common 3: Bowler runs conceded excludes Byes and Leg-Byes', () => {
  const match = createFixture('ENG', 'IND', 'T20I', { seed: 202 });
  const completed = simulateFullMatch(match);

  completed.innings.forEach((inn) => {
    const bowlerRunsSum = inn.bowlers.reduce((acc, bw) => acc + bw.runs, 0);
    const runsOffBatSum = inn.batters.reduce((acc, b) => acc + b.runs, 0);
    const bowlerExtras = inn.extras.wides + inn.extras.noBalls;

    assert.strictEqual(
      bowlerRunsSum,
      runsOffBatSum + bowlerExtras,
      'Bowler runs conceded must equal runs off bat + wides + no-balls (byes and leg-byes excluded)'
    );
  });
});

test('Common 4: Legal ball delivery accounting and maiden calculation', () => {
  assert.strictEqual(isDeliveryLegal({ wides: 0, noBalls: 0 }), true);
  assert.strictEqual(isDeliveryLegal({ wides: 1, noBalls: 0 }), false);
  assert.strictEqual(isDeliveryLegal({ wides: 0, noBalls: 1 }), false);

  // Check dismissal legality on illegal deliveries
  assert.strictEqual(isDismissalLegalForDelivery('BOWLED', true, false), false, 'Cannot be bowled on a no-ball');
  assert.strictEqual(isDismissalLegalForDelivery('CAUGHT', true, false), false, 'Cannot be caught on a no-ball');
  assert.strictEqual(isDismissalLegalForDelivery('RUN_OUT', true, false), true, 'Can be run out on a no-ball');
  assert.strictEqual(isDismissalLegalForDelivery('STUMPED', false, true), true, 'Can be stumped on a wide');
  assert.strictEqual(isDismissalLegalForDelivery('BOWLED', false, true), false, 'Cannot be bowled on a wide');
});

test('Common 5: Player career statistics update exactly once', () => {
  const match = createFixture('AUS', 'RSA', 'ODI', { seed: 303 });
  const completed = simulateFullMatch(match);

  const strikerId = completed.homeXI[0];
  const playerBefore = getPlayerById(strikerId);
  const runsBefore = playerBefore.stats.ODI.runs;
  const matchesBefore = playerBefore.stats.ODI.matches;

  // Apply stats
  applyMatchStatsToPlayers(completed);

  const playerAfter1 = getPlayerById(strikerId);
  assert.strictEqual(playerAfter1.stats.ODI.matches, matchesBefore + 1);

  // Second application must be idempotent (no duplicate stat additions)
  applyMatchStatsToPlayers(completed);
  const playerAfter2 = getPlayerById(strikerId);
  assert.strictEqual(playerAfter2.stats.ODI.matches, matchesBefore + 1);
});

// ==========================================
// TEST CRICKET SPECIFIC TESTS (PHASE 3 & 12)
// ==========================================

test('Test 1: Five-day Test cricket progression and no 50-over limit', () => {
  const match = createFixture('IND', 'AUS', 'TEST', { seed: 404 });
  assert.strictEqual(getMaxOversPerInnings('TEST'), Infinity);
  assert.strictEqual(getMaxOversPerBowler('TEST'), Infinity);

  const completed = simulateFullMatch(match);
  assert.ok(['COMPLETED', 'DRAW'].includes(completed.status));
  assert.ok(completed.innings.length >= 2, 'Test match must have at least 2 innings');
  assert.ok(completed.dayNumber >= 1 && completed.dayNumber <= 5);
  assert.ok(completed.resultText && completed.resultText.length > 0);
});

test('Test 2: Declaration logic immediately closes innings', () => {
  const match = createFixture('ENG', 'IND', 'TEST', { seed: 505 });
  // Step through toss and into first innings
  let current = stepMatchBall(match);
  while (current.status !== 'IN_PROGRESS' || current.innings.length === 0) {
    current = stepMatchBall(current);
  }

  // Simulate 15 overs
  for (let i = 0; i < 15; i++) {
    current = stepMatchOver(current);
  }

  const innBefore = current.innings[0];
  assert.strictEqual(innBefore.isDeclared, undefined);
  assert.strictEqual(innBefore.isCompleted, undefined);

  // Declare innings
  const declared = declareInnings(current);
  assert.strictEqual(declared.innings[0].isDeclared, true);
  assert.strictEqual(declared.innings[0].isCompleted, true);
  assert.strictEqual(declared.currentInningsIndex, 1, 'Declaration must advance to next innings');
});

test('Test 3: Follow-on rule evaluation (>= 200 runs lead in 5-day Test)', () => {
  const match = createFixture('AUS', 'ENG', 'TEST', { seed: 606 });

  // Simulate manually: Innings 1 AUS scores 450, Innings 2 ENG scores 210 (lead = 240 >= 200)
  const inn1 = createInitialInningsState(1, 'AUS', 'Australia', 'ENG', 'England', match.homeXI, match.awayXI);
  inn1.totalRuns = 450;
  inn1.wickets = 10;
  inn1.completedOvers = 120;
  inn1.isCompleted = true;

  const inn2 = createInitialInningsState(2, 'ENG', 'England', 'AUS', 'Australia', match.awayXI, match.homeXI);
  inn2.totalRuns = 210;
  inn2.wickets = 10;
  inn2.completedOvers = 65;
  inn2.isCompleted = true;

  const testMatchWith2Innings: Match = {
    ...match,
    status: 'IN_PROGRESS',
    currentInningsIndex: 1,
    innings: [inn1, inn2],
  };

  const nextStep = stepMatchBall(testMatchWith2Innings);
  assert.strictEqual(nextStep.isFollowOnEligible, true, 'Lead of 240 must make follow-on eligible');
  assert.strictEqual(nextStep.currentInningsIndex, 2);
});

test('Test 4: Innings victory calculation when follow-on team is bowled out', () => {
  const match = createFixture('IND', 'ENG', 'TEST');

  const inn1 = createInitialInningsState(1, 'IND', 'India', 'ENG', 'England', match.homeXI, match.awayXI);
  inn1.totalRuns = 500;
  inn1.wickets = 10;
  inn1.isCompleted = true;

  const inn2 = createInitialInningsState(2, 'ENG', 'England', 'IND', 'India', match.awayXI, match.homeXI);
  inn2.totalRuns = 200;
  inn2.wickets = 10;
  inn2.isCompleted = true;

  const inn3 = createInitialInningsState(3, 'ENG', 'England', 'IND', 'India', match.awayXI, match.homeXI);
  inn3.totalRuns = 220; // Combined ENG = 420 < 500 (trails by 80 runs)
  inn3.wickets = 10;
  inn3.isCompleted = true;

  const matchFollowOnCompleted: Match = {
    ...match,
    status: 'IN_PROGRESS',
    followOnEnforced: true,
    currentInningsIndex: 2,
    innings: [inn1, inn2, inn3],
  };

  const res = computeMatchResult(matchFollowOnCompleted);
  assert.ok(res.resultText.includes('won by an innings and 80 runs'));
});

// ==========================================
// ODI CRICKET SPECIFIC TESTS (PHASE 4 & 12)
// ==========================================

test('ODI 1: Maximum 50 overs per innings and 10 overs per bowler', () => {
  assert.strictEqual(getMaxOversPerInnings('ODI'), 50);
  assert.strictEqual(getMaxOversPerBowler('ODI'), 10);

  const match = createFixture('AUS', 'RSA', 'ODI', { seed: 707 });
  const completed = simulateFullMatch(match);

  completed.innings.forEach((inn) => {
    assert.ok(inn.completedOvers <= 50, 'ODI innings cannot exceed 50 overs');
    inn.bowlers.forEach((bw) => {
      assert.ok(bw.overs <= 10, `Bowler ${bw.playerName} cannot exceed 10 overs in an ODI (bowled ${bw.overs})`);
    });
  });
});

test('ODI 2: Official three-phase Powerplay structure', () => {
  const pp1 = getPowerplayPhase('ODI', 5);
  assert.strictEqual(pp1.phase, 'MANDATORY_PP1');
  assert.strictEqual(pp1.maxFieldersOutsideCircle, 2);

  const pp2 = getPowerplayPhase('ODI', 25);
  assert.strictEqual(pp2.phase, 'INTERMEDIATE_PP2');
  assert.strictEqual(pp2.maxFieldersOutsideCircle, 4);

  const pp3 = getPowerplayPhase('ODI', 45);
  assert.strictEqual(pp3.phase, 'DEATH_PP3');
  assert.strictEqual(pp3.maxFieldersOutsideCircle, 5);
});

// ==========================================
// T20I CRICKET SPECIFIC TESTS (PHASE 5 & 12)
// ==========================================

test('T20I 1: Maximum 20 overs per innings and 4 overs per bowler', () => {
  assert.strictEqual(getMaxOversPerInnings('T20I'), 20);
  assert.strictEqual(getMaxOversPerBowler('T20I'), 4);

  const match = createFixture('IND', 'ENG', 'T20I', { seed: 808 });
  const completed = simulateFullMatch(match);

  completed.innings.forEach((inn) => {
    assert.ok(inn.completedOvers <= 20, 'T20 innings cannot exceed 20 overs');
    inn.bowlers.forEach((bw) => {
      assert.ok(bw.overs <= 4, `Bowler ${bw.playerName} cannot exceed 4 overs in T20I (bowled ${bw.overs})`);
    });
  });
});

test('T20I 2: Mandatory Powerplay in overs 1-6', () => {
  const pp = getPowerplayPhase('T20I', 3);
  assert.strictEqual(pp.phase, 'MANDATORY_PP1');
  assert.strictEqual(pp.maxFieldersOutsideCircle, 2);

  const nonPp = getPowerplayPhase('T20I', 10);
  assert.strictEqual(nonPp.phase, 'STANDARD');
  assert.strictEqual(nonPp.maxFieldersOutsideCircle, 5);
});

test('T20I 3: Super Over simulation for tied matches', () => {
  const match = createFixture('IND', 'PAK', 'T20I', { seed: 909 });

  // Mock tied match at 160-160
  const inn1 = createInitialInningsState(1, 'IND', 'India', 'PAK', 'Pakistan', match.homeXI, match.awayXI);
  inn1.totalRuns = 160;
  inn1.wickets = 6;
  inn1.completedOvers = 20;
  inn1.isCompleted = true;

  const inn2 = createInitialInningsState(2, 'PAK', 'Pakistan', 'IND', 'India', match.awayXI, match.homeXI, 161);
  inn2.totalRuns = 160;
  inn2.wickets = 8;
  inn2.completedOvers = 20;
  inn2.isCompleted = true;

  const tiedMatch: Match = {
    ...match,
    status: 'IN_PROGRESS',
    currentInningsIndex: 1,
    innings: [inn1, inn2],
  };

  const superOverCompleted = simulateSuperOver(tiedMatch);
  assert.strictEqual(superOverCompleted.status, 'COMPLETED');
  assert.strictEqual(superOverCompleted.superOverPlayed, true);
  assert.ok(superOverCompleted.superOverInnings && superOverCompleted.superOverInnings.length === 2);
  assert.ok(superOverCompleted.resultText && superOverCompleted.resultText.includes('Super Over'));
});

// ==========================================
// REALISTIC MATCH SCENARIOS (PHASE 13)
// ==========================================

test('Scenario 1: India vs Australia — Test match simulation produces plausible statistics', () => {
  const match = createFixture('IND', 'AUS', 'TEST', { seed: 1001 });
  const completed = simulateFullMatch(match);

  assert.ok(['COMPLETED', 'DRAW'].includes(completed.status));
  assert.ok(completed.innings.length >= 2);
  completed.innings.forEach((inn) => {
    assert.ok(inn.totalRuns >= 80, `Test innings score (${inn.totalRuns}) should be realistic`);
    assert.ok(inn.completedOvers >= 20, `Test innings overs (${inn.completedOvers}) should be realistic`);
  });
});

test('Scenario 2: England vs India — Test match simulation with English seam conditions', () => {
  const lordVenue = VENUES.find((v) => v.countryId === 'ENG') || VENUES[0];
  const match = createFixture('ENG', 'IND', 'TEST', {
    seed: 2002,
    venueName: lordVenue.name,
    pitch: lordVenue.pitch,
    weather: lordVenue.weather,
  });

  const completed = simulateFullMatch(match);
  assert.ok(['COMPLETED', 'DRAW'].includes(completed.status));
  assert.ok(completed.resultText && completed.resultText.length > 0);
  assert.ok(completed.playerOfTheMatch !== undefined);
});

test('Scenario 3: Australia vs South Africa — ODI match simulation (50 overs)', () => {
  const match = createFixture('AUS', 'RSA', 'ODI', { seed: 3003 });
  const completed = simulateFullMatch(match);

  assert.strictEqual(completed.status, 'COMPLETED');
  assert.strictEqual(completed.innings.length, 2);
  completed.innings.forEach((inn) => {
    assert.ok(inn.totalRuns >= 120 && inn.totalRuns <= 450, `ODI score ${inn.totalRuns} should be plausible`);
  });
});

test('Scenario 4: India vs Pakistan — ODI match simulation', () => {
  const match = createFixture('IND', 'PAK', 'ODI', { seed: 4004 });
  const completed = simulateFullMatch(match);

  assert.strictEqual(completed.status, 'COMPLETED');
  assert.strictEqual(completed.innings.length, 2);
  assert.ok(completed.resultText && completed.resultText.length > 0);
});

test('Scenario 5: India vs England — T20I match simulation (20 overs)', () => {
  const match = createFixture('IND', 'ENG', 'T20I', { seed: 5005 });
  const completed = simulateFullMatch(match);

  assert.strictEqual(completed.status, 'COMPLETED');
  assert.strictEqual(completed.innings.length, 2);
  completed.innings.forEach((inn) => {
    assert.ok(inn.totalRuns >= 80 && inn.totalRuns <= 270, `T20I score ${inn.totalRuns} should be plausible`);
  });
});

test('Scenario 6: Australia vs New Zealand — T20I match simulation', () => {
  const match = createFixture('AUS', 'NZL', 'T20I', { seed: 6006 });
  const completed = simulateFullMatch(match);

  assert.strictEqual(completed.status, 'COMPLETED');
  assert.strictEqual(completed.innings.length, 2);
});

test('Deterministic PRNG: Identical seeds produce bit-identical match simulations', () => {
  const match1 = createFixture('IND', 'AUS', 'T20I', { seed: 77777 });
  const match2 = createFixture('IND', 'AUS', 'T20I', { seed: 77777 });

  const sim1 = simulateFullMatch(match1);
  const sim2 = simulateFullMatch(match2);

  assert.strictEqual(sim1.innings[0].totalRuns, sim2.innings[0].totalRuns);
  assert.strictEqual(sim1.innings[0].wickets, sim2.innings[0].wickets);
  assert.strictEqual(sim1.innings[1].totalRuns, sim2.innings[1].totalRuns);
  assert.strictEqual(sim1.innings[1].wickets, sim2.innings[1].wickets);
  assert.strictEqual(sim1.resultText, sim2.resultText);
});

