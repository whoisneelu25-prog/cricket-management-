import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialInningsState,
  stepMatchBall,
  stepMatchOver,
  stepMatchInnings,
  simulateFullMatch,
  simulateSuperOver,
  determineMatchOutcome,
  computeMatchResult,
  accumulateMatchIntoFormatStats,
  isPreMatchStatus,
  isTerminalMatchStatus,
  getPlayerById,
} from './matchEngine';
import {
  DLS_SUPPORT_STATUS,
  MIN_OVERS_FOR_WHITE_BALL_RESULT,
  applyPreMatchOversReduction,
  abandonWhiteBallMatch,
  concludeWhiteBallNoResult,
  createWhiteBallConditions,
  getWhiteBallConditionsModifiers,
  determineAIWhiteBallBattingApproach,
} from './whiteBallEngine';
import {
  applyBallToInnings,
  getMaxOversPerBowler,
  getMaxOversPerInnings,
  getShortenedBowlerQuotaDistribution,
  getPowerplayPhase,
  calculateRequiredRunRate,
  isDismissalLegalForDelivery,
} from './rules';
import { simulateDelivery, setSimulationSeed } from './simulation';
import { simulateWorldMatchesUntil } from './worldSimulation';
import {
  createNewCareerSave,
  applyUserMatchResult,
  confirmMatchPreparationLineup,
  getNextUserMatchInfo,
} from '../store/careerStore';
import {
  ALL_PLAYERS,
  createEmptyFormatStats,
  getCombinedFormatStats,
  getEffectivePlayer,
} from '../data/squads';
import { INTERNATIONAL_TEAMS } from '../data/teams';
import { VENUES } from '../data/venues';
import {
  BallOutcome,
  InningsState,
  Match,
  PitchCondition,
  WeatherCondition,
} from '../types/cricket';

function getTeamName(teamId: string): string {
  return INTERNATIONAL_TEAMS.find((t) => t.id === teamId)?.name || teamId;
}

function buildNameMap(ids: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  ids.forEach((id) => {
    map[id] = getPlayerById(id).shortName;
  });
  return map;
}

/**
 * Helper to build a realistic ODI or T20I match fixture between two international sides
 */
function buildWhiteBallMatchFixture(
  id: string,
  format: 'ODI' | 'T20I',
  homeTeamId: string,
  awayTeamId: string,
  options?: {
    seed?: number;
    pitch?: PitchCondition;
    weather?: WeatherCondition;
    venueName?: string;
    isUserMatch?: boolean;
    userTeamId?: string;
    allocatedOvers?: number;
    stage?: Match['stage'];
    tournamentId?: string;
  }
): Match {
  const homeCareer = createNewCareerSave('WB Coach', homeTeamId, format, 'INTERNATIONAL', 'TACTICAL');
  const awaySquad = homeCareer.aiTeams?.[awayTeamId]?.formatSquads[format];
  const homeSquad = homeCareer.formatSquads[format];

  const homeXI = homeSquad.battingOrder?.length === 11 ? homeSquad.battingOrder : homeSquad.playingXI;
  const awayXI = awaySquad
    ? awaySquad.battingOrder?.length === 11
      ? awaySquad.battingOrder
      : awaySquad.playingXI
    : createNewCareerSave('Away', awayTeamId, format, 'INTERNATIONAL', 'TACTICAL').formatSquads[format]
        .playingXI;

  const homeWk = homeSquad.wicketKeeperId;
  const awayWk = awaySquad ? awaySquad.wicketKeeperId : awayXI[4];
  const homeCap = homeSquad.captainId;
  const awayCap = awaySquad ? awaySquad.captainId : awayXI[0];
  const homeBowling = homeSquad.bowlingRotation;
  const awayBowling = awaySquad?.bowlingRotation;

  const venueObj =
    (options?.venueName ? VENUES.find((v) => v.name === options.venueName) : undefined) ||
    VENUES.find((v) => v.countryId === homeTeamId) ||
    VENUES[0];
  const pitch = options?.pitch || venueObj.pitch;
  const weather = options?.weather || venueObj.weather;
  const seed = options?.seed ?? 5001;
  const allocatedOvers = options?.allocatedOvers;

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
      format,
      pitch,
      weather,
      bowlingWicketKeeperId: awayWk,
      allocatedOvers,
      seed: seed + 11,
      nominatedBowlerIds: awayBowling,
    }
  );

  const baseMatch: Match = {
    id,
    format,
    seriesName: `${homeName} vs ${awayName} ${format} Series`,
    stage: options?.stage,
    tournamentId: options?.tournamentId,
    homeTeamId,
    awayTeamId,
    venue: options?.venueName || venueObj.name,
    pitch,
    weather,
    date: '2027-02-14',
    dayNumber: 1,
    sessionNumber: 1,
    status: 'IN_PROGRESS',
    tossWinnerId: homeTeamId,
    tossChoice: 'BAT',
    currentInningsIndex: 0,
    innings: [inn1],
    homeXI,
    awayXI,
    homeCaptainId: homeCap,
    awayCaptainId: awayCap,
    homeWicketKeeperId: homeWk,
    awayWicketKeeperId: awayWk,
    homeBowlingOptions: homeBowling,
    awayBowlingOptions: awayBowling,
    allocatedOversPerInnings: allocatedOvers,
    userTeamId: options?.userTeamId ?? homeTeamId,
    isUserMatch: options?.isUserMatch ?? false,
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
    seed,
  };

  baseMatch.whiteBallConditions = createWhiteBallConditions(baseMatch, seed + 5);
  return baseMatch;
}

/**
 * Full mathematical scorecard reconciliation check for any ODI, T20I, or Super Over innings
 */
function assertWhiteBallInningsReconciles(
  inn: InningsState,
  format: 'ODI' | 'T20I',
  bowlingWkId: string,
  options?: { isSuperOver?: boolean; allocatedOvers?: number }
) {
  const isSO = Boolean(options?.isSuperOver);
  const maxOvers = isSO ? 1 : getMaxOversPerInnings(format, options?.allocatedOvers ?? inn.allocatedOvers);
  const maxWickets = isSO ? 2 : 10;

  // 1. Batter runs + extras === team totalRuns
  const sumBatterRuns = inn.batters.reduce((s, b) => s + b.runs, 0);
  const calcExtrasTotal =
    inn.extras.wides +
    inn.extras.noBalls +
    inn.extras.byes +
    inn.extras.legByes +
    (inn.extras.penalty || 0);
  assert.equal(inn.extras.total, calcExtrasTotal, 'Extras breakdown must sum to extras.total');
  assert.equal(
    sumBatterRuns + inn.extras.total,
    inn.totalRuns,
    `Batter runs (${sumBatterRuns}) + Extras (${inn.extras.total}) must equal Team Total (${inn.totalRuns})`
  );

  // 2. Wickets === dismissed batters === fallOfWickets length, bounded by maxWickets
  const dismissedBatters = inn.batters.filter((b) => Boolean(b.dismissal));
  assert.equal(
    dismissedBatters.length,
    inn.wickets,
    `Dismissed batters (${dismissedBatters.length}) must equal inn.wickets (${inn.wickets})`
  );
  assert.equal(inn.fallOfWickets.length, inn.wickets, 'Fall of wickets count must match wickets');
  assert.ok(inn.wickets >= 0 && inn.wickets <= maxWickets, `Wickets (${inn.wickets}) within 0..${maxWickets}`);

  // 3. Total legal balls bowled === sum of bowler legal balls, bounded by maxOvers * 6
  const inningsLegalBalls = inn.completedOvers * 6 + inn.ballsInCurrentOver;
  assert.ok(
    inningsLegalBalls <= maxOvers * 6,
    `Innings legal balls (${inningsLegalBalls}) must never exceed ${maxOvers * 6}`
  );
  const sumBowlerLegalBalls = inn.bowlers.reduce((s, bw) => s + bw.overs * 6 + bw.ballsThisOver, 0);
  assert.equal(
    sumBowlerLegalBalls,
    inningsLegalBalls,
    `Bowler legal balls (${sumBowlerLegalBalls}) must equal innings legal balls (${inningsLegalBalls})`
  );

  // 4. Batter balls faced === innings legal balls + no-balls (batters face no-balls, not wides)
  const sumBatterBalls = inn.batters.reduce((s, b) => s + b.balls, 0);
  assert.equal(
    sumBatterBalls,
    inningsLegalBalls + inn.extras.noBalls,
    `Batter balls faced (${sumBatterBalls}) must equal legal balls (${inningsLegalBalls}) + no-balls (${inn.extras.noBalls})`
  );

  // 5. Bowler runs conceded === team totalRuns - byes - legByes - penalty (byes/leg-byes/penalty never charged to bowler)
  const sumBowlerRuns = inn.bowlers.reduce((s, bw) => s + bw.runs, 0);
  const expectedBowlerRuns =
    inn.totalRuns - inn.extras.byes - inn.extras.legByes - (inn.extras.penalty || 0);
  assert.equal(
    sumBowlerRuns,
    expectedBowlerRuns,
    `Sum of bowler runs (${sumBowlerRuns}) must equal team runs minus byes/leg-byes/penalty (${expectedBowlerRuns})`
  );

  // 6. Bowler wickets === dismissals excluding RUN_OUT, OBSTRUCTING_FIELD, RETIRED_HURT, TIMED_OUT, HIT_BALL_TWICE
  const uncreditedTypes = new Set([
    'RUN_OUT',
    'OBSTRUCTING_FIELD',
    'RETIRED_HURT',
    'TIMED_OUT',
    'HIT_BALL_TWICE',
  ]);
  const expectedBowlerWickets = dismissedBatters.filter(
    (b) => b.dismissal && !uncreditedTypes.has(b.dismissal.type)
  ).length;
  const sumBowlerWickets = inn.bowlers.reduce((s, bw) => s + bw.wickets, 0);
  assert.equal(
    sumBowlerWickets,
    expectedBowlerWickets,
    `Bowler wickets (${sumBowlerWickets}) must equal credited dismissals (${expectedBowlerWickets})`
  );

  // 7. Wicketkeeper never bowled, and every bowler obeys format/shortened quota
  const maxBowlerCap = isSO
    ? 1
    : getMaxOversPerBowler(format, options?.allocatedOvers ?? inn.allocatedOvers);
  for (const bw of inn.bowlers) {
    if (bw.overs > 0 || bw.ballsThisOver > 0) {
      assert.notEqual(bw.playerId, bowlingWkId, `Designated WK (${bowlingWkId}) must never bowl`);
      const bwBalls = bw.overs * 6 + bw.ballsThisOver;
      assert.ok(
        bwBalls <= maxBowlerCap * 6,
        `Bowler ${bw.playerName} bowled ${bw.overs}.${bw.ballsThisOver}, exceeding cap ${maxBowlerCap}.0`
      );
    }
  }
}

// ============================================================================
// 1. ODI MATCH ENGINE SUITE (PHASE 2 & PHASE 12)
// ============================================================================

test('ODI Suite 1: 50-over limit, 10-over bowling limit, no consecutive overs & WK exclusion', () => {
  const m = buildWhiteBallMatchFixture('odi_rules_1', 'ODI', 'IND', 'AUS', { seed: 7101 });

  let current = m;
  let prevInningsIdx = 0;
  let lastOverBowler: string | undefined = undefined;
  let guard = 0;

  while (!isTerminalMatchStatus(current.status) && guard < 130) {
    guard++;
    const beforeInn = current.innings[current.currentInningsIndex];
    if (beforeInn.isCompleted) {
      current = stepMatchOver(current);
      prevInningsIdx = current.currentInningsIndex;
      lastOverBowler = undefined;
      continue;
    }
    const activeBowlerBefore = beforeInn.currentBowlerId;
    if (current.currentInningsIndex !== prevInningsIdx) {
      prevInningsIdx = current.currentInningsIndex;
      lastOverBowler = undefined;
    }
    if (beforeInn.ballsInCurrentOver === 0 && lastOverBowler) {
      assert.notEqual(
        activeBowlerBefore,
        lastOverBowler,
        `Bowler ${activeBowlerBefore} bowled consecutive overs in ODI!`
      );
    }
    current = stepMatchOver(current);
    const afterInn = current.innings[prevInningsIdx];
    if (afterInn && afterInn.ballsInCurrentOver === 0 && afterInn.completedOvers > 0) {
      lastOverBowler = activeBowlerBefore;
    }
  }

  assert.ok(isTerminalMatchStatus(current.status), 'ODI match must complete cleanly');
  assert.equal(current.innings.length, 2, 'ODI match must have 2 innings');

  const inn1 = current.innings[0];
  const inn2 = current.innings[1];
  assert.ok(inn1.completedOvers * 6 + inn1.ballsInCurrentOver <= 300, 'ODI Inn 1 <= 300 legal balls');
  assert.ok(inn2.completedOvers * 6 + inn2.ballsInCurrentOver <= 300, 'ODI Inn 2 <= 300 legal balls');
  assert.equal(inn2.targetRuns, inn1.totalRuns + 1, 'ODI target must equal 1st innings runs + 1');

  assertWhiteBallInningsReconciles(inn1, 'ODI', current.awayWicketKeeperId);
  assertWhiteBallInningsReconciles(inn2, 'ODI', current.homeWicketKeeperId);
});

test('ODI Suite 2: Shortened ODI overs & ICC dynamic bowler quota distribution', () => {
  // 38-over shortened ODI: 38 = 3 * 8 + 2 * 7 -> max 3 bowlers may bowl 8 overs, others capped at 7
  const dist38 = getShortenedBowlerQuotaDistribution('ODI', 38);
  assert.equal(dist38.maxQuota, 8);
  assert.equal(dist38.maxQuotaBowlersAllowed, 3);
  assert.equal(dist38.reducedQuota, 7);

  // Attempting < 20 overs for ODI clamps cleanly to minimum 20 overs per ICC Playing Conditions
  const rawMatch = buildWhiteBallMatchFixture('odi_short_clamp', 'ODI', 'ENG', 'NZL', { seed: 7201 });
  const clampedMin = applyPreMatchOversReduction(rawMatch, 12);
  assert.equal(clampedMin.allocatedOversPerInnings, 20, 'Minimum valid ODI allocation is 20 overs');

  // Apply official 33-over pre-match reduction (33 = 3 * 7 + 2 * 6) and simulate full match
  const reduced = applyPreMatchOversReduction(rawMatch, 33);
  assert.equal(reduced.allocatedOversPerInnings, 33);

  const completed = simulateFullMatch(reduced);
  assert.ok(isTerminalMatchStatus(completed.status));
  for (let i = 0; i < completed.innings.length; i++) {
    const inn = completed.innings[i];
    const wkId = i === 0 ? completed.awayWicketKeeperId : completed.homeWicketKeeperId;
    assert.ok(inn.completedOvers * 6 + inn.ballsInCurrentOver <= 33 * 6);
    const sevenOverBowlers = inn.bowlers.filter((bw) => bw.overs * 6 + bw.ballsThisOver > 6 * 6);
    assert.ok(
      sevenOverBowlers.length <= 3,
      `At most 3 bowlers may exceed 6 overs in a 33-over ODI (got ${sevenOverBowlers.length})`
    );
    for (const bw of inn.bowlers) {
      assert.ok(bw.overs * 6 + bw.ballsThisOver <= 7 * 6, 'No bowler may exceed 7 overs in 33-over ODI');
    }
    assertWhiteBallInningsReconciles(inn, 'ODI', wkId, { allocatedOvers: 33 });
  }
});

test('ODI Suite 3: Three Powerplays (1-10, 11-40, 41-50) & actual simulation impact', () => {
  const pp1Start = getPowerplayPhase('ODI', 0);
  const pp1End = getPowerplayPhase('ODI', 9);
  const pp2Start = getPowerplayPhase('ODI', 10);
  const pp2End = getPowerplayPhase('ODI', 39);
  const pp3Start = getPowerplayPhase('ODI', 40);
  const pp3End = getPowerplayPhase('ODI', 49);

  assert.equal(pp1Start.phase, 'MANDATORY_PP1');
  assert.equal(pp1Start.maxFieldersOutsideCircle, 2);
  assert.equal(pp1End.phase, 'MANDATORY_PP1');
  assert.equal(pp2Start.phase, 'INTERMEDIATE_PP2');
  assert.equal(pp2Start.maxFieldersOutsideCircle, 4);
  assert.equal(pp2End.phase, 'INTERMEDIATE_PP2');
  assert.equal(pp3Start.phase, 'DEATH_PP3');
  assert.equal(pp3Start.maxFieldersOutsideCircle, 5);
  assert.equal(pp3End.phase, 'DEATH_PP3');

  // Verify Powerplay restrictions genuinely influence simulated scoring & boundary probability
  const m = buildWhiteBallMatchFixture('odi_pp_impact', 'ODI', 'IND', 'AUS', { seed: 7300 });
  const striker = getPlayerById(m.homeXI[0]);
  const nonStriker = getPlayerById(m.homeXI[1]);
  const bowler = getPlayerById(m.awayXI[8]);

  let pp1Boundaries = 0;
  let pp1Runs = 0;
  let pp2Boundaries = 0;
  let pp2Runs = 0;

  setSimulationSeed(91001);
  for (let i = 0; i < 600; i++) {
    const b = simulateDelivery({
      format: 'ODI',
      striker,
      nonStriker,
      bowler,
      pitch: m.pitch,
      weather: m.weather,
      overNumber: 3, // Overs 1-10 Mandatory PP1 (max 2 outside)
      ballInOver: i % 6,
      currentScore: 18,
      wicketsLost: 0,
      battingAggression: 'ATTACKING',
      bowlingTactic: 'BALANCED_CONTAIN',
      fieldPreset: 'DEFENSIVE_BOUNDARY',
      overCompletedOvers: 3,
    });
    pp1Runs += b.runsOffBat;
    if (b.runsOffBat === 4 || b.runsOffBat === 6) pp1Boundaries++;
  }

  setSimulationSeed(91001);
  for (let i = 0; i < 600; i++) {
    const b = simulateDelivery({
      format: 'ODI',
      striker,
      nonStriker,
      bowler,
      pitch: m.pitch,
      weather: m.weather,
      overNumber: 22, // Overs 11-40 PP2 (up to 4 outside)
      ballInOver: i % 6,
      currentScore: 118,
      wicketsLost: 1,
      battingAggression: 'ATTACKING',
      bowlingTactic: 'BALANCED_CONTAIN',
      fieldPreset: 'DEFENSIVE_BOUNDARY',
      overCompletedOvers: 22,
    });
    pp2Runs += b.runsOffBat;
    if (b.runsOffBat === 4 || b.runsOffBat === 6) pp2Boundaries++;
  }

  assert.ok(
    pp1Boundaries > pp2Boundaries && pp1Runs > pp2Runs,
    `ODI Powerplay 1 (2 outside) must yield higher boundaries/runs (${pp1Boundaries} boundaries, ${pp1Runs}r) than PP2 with boundary protection (${pp2Boundaries} boundaries, ${pp2Runs}r)`
  );
});

test('ODI Suite 4: Phase-aware ODI Batting AI, Bowling AI & ball-by-ball Chase metrics', () => {
  const m = buildWhiteBallMatchFixture('odi_chase_1', 'ODI', 'AUS', 'ENG', { seed: 7405 });
  const endInn1 = stepMatchInnings(m);
  assert.equal(endInn1.innings[0].isCompleted, true);
  const afterInn1 = stepMatchBall(endInn1);
  assert.equal(afterInn1.currentInningsIndex, 1);

  const inn1Score = afterInn1.innings[0].totalRuns;
  const inn2Start = afterInn1.innings[1];
  assert.equal(inn2Start.targetRuns, inn1Score + 1);
  const strikerPlayer = getPlayerById(inn2Start.currentStrikerId);

  // Verify ODI Batting AI responds to Powerplay, Middle-overs collapse, and Death launch
  const ppApproach = determineAIWhiteBallBattingApproach(
    afterInn1,
    { ...inn2Start, completedOvers: 4, wickets: 0, totalRuns: 24 },
    strikerPlayer,
    getPlayerById
  );
  assert.ok(ppApproach === 'ATTACKING' || ppApproach === 'BALANCED');

  const collapseMiddle = determineAIWhiteBallBattingApproach(
    afterInn1,
    { ...inn2Start, completedOvers: 18, wickets: 5, totalRuns: 78, targetRuns: undefined },
    strikerPlayer,
    getPlayerById
  );
  assert.equal(collapseMiddle, 'DEFENSIVE', 'ODI middle-overs collapse should protect wickets');

  const deathLaunch = determineAIWhiteBallBattingApproach(
    afterInn1,
    { ...inn2Start, completedOvers: 47, wickets: 3, totalRuns: 285, targetRuns: undefined },
    strikerPlayer,
    getPlayerById
  );
  assert.ok(
    deathLaunch === 'SMASH' || deathLaunch === 'ATTACKING',
    'ODI death overs with wickets in hand must launch aggressively'
  );

  // Step 15 balls in the 2nd-innings chase and verify RRR, balls remaining, runs required, wickets remaining update every delivery
  let chasing = afterInn1;
  for (let b = 0; b < 15; b++) {
    chasing = stepMatchBall(chasing);
    if (isTerminalMatchStatus(chasing.status)) break;
    const chaseInn = chasing.innings[1];
    const legalBowled = chaseInn.completedOvers * 6 + chaseInn.ballsInCurrentOver;
    const ballsRemaining = 300 - legalBowled;
    const runsRequired = Math.max(0, chaseInn.targetRuns! - chaseInn.totalRuns);
    const wicketsRemaining = 10 - chaseInn.wickets;
    const expectedRrr =
      runsRequired <= 0 ? 0 : Number(((runsRequired / ballsRemaining) * 6).toFixed(2));
    const engineRrr = calculateRequiredRunRate(
      chaseInn.targetRuns!,
      chaseInn.totalRuns,
      chaseInn.completedOvers,
      chaseInn.ballsInCurrentOver,
      'ODI'
    );
    assert.equal(engineRrr, expectedRrr, 'ODI RRR must update accurately after every delivery');
    assert.ok(wicketsRemaining >= 0 && wicketsRemaining <= 10);
  }
});

test('ODI Suite 5: Bilateral ODI Tie vs Knockout ODI Super Over, No Result, Abandoned & DLS Policy', () => {
  // 1. Explicit DLS Unsupported policy (never invents a revised target!)
  assert.equal(DLS_SUPPORT_STATUS.supported, false);
  assert.equal(MIN_OVERS_FOR_WHITE_BALL_RESULT.ODI, 20);
  assert.equal(MIN_OVERS_FOR_WHITE_BALL_RESULT.T20I, 5);

  // 2. Bilateral ODI Tie -> stays isTie === true (no Super Over in regular bilateral ODI)
  const tiedBilateral = buildWhiteBallMatchFixture('odi_tie_bilat', 'ODI', 'NZL', 'ENG', {
    seed: 7501,
  });
  const inn1 = { ...tiedBilateral.innings[0], totalRuns: 265, wickets: 8, completedOvers: 50, isCompleted: true };
  const inn2Base = createInitialInningsState(
    2,
    'ENG',
    'England',
    'NZL',
    'New Zealand',
    tiedBilateral.awayXI,
    tiedBilateral.homeXI,
    266,
    { format: 'ODI', bowlingWicketKeeperId: tiedBilateral.homeWicketKeeperId, seed: 7502 }
  );
  const inn2 = { ...inn2Base, totalRuns: 265, wickets: 9, completedOvers: 50, isCompleted: true };
  tiedBilateral.innings = [inn1, inn2];
  tiedBilateral.currentInningsIndex = 1;
  tiedBilateral.status = 'TIE';

  const bilatOutcome = determineMatchOutcome(tiedBilateral);
  assert.equal(bilatOutcome.isTie, true);
  assert.equal(bilatOutcome.winnerTeamId, null);

  // 3. Tournament Knockout ODI Tie -> triggers ICC Super Over and crowns a winner!
  const tiedKnockout: Match = {
    ...tiedBilateral,
    id: 'odi_wc_final_tie',
    status: 'IN_PROGRESS',
    stage: 'FINAL',
    tournamentId: 'cwc_2027',
  };
  const knockoutResolved = simulateSuperOver(tiedKnockout);
  const koRes = computeMatchResult(knockoutResolved);
  knockoutResolved.status = 'COMPLETED';
  knockoutResolved.resultText = koRes.resultText;
  knockoutResolved.winnerTeamId = koRes.winnerTeamId;

  assert.equal(knockoutResolved.superOverPlayed, true);
  assert.ok(knockoutResolved.winnerTeamId === 'NZL' || knockoutResolved.winnerTeamId === 'ENG');
  assert.match(knockoutResolved.resultText || '', /Super Over/i);

  // 4. ODI No Result (washout before 20 overs in 2nd innings — never invents fake DLS target!)
  const rainOdi = buildWhiteBallMatchFixture('odi_nr_1', 'ODI', 'RSA', 'AUS', { seed: 7510 });
  const rainAfter12Ov: Match = {
    ...rainOdi,
    currentInningsIndex: 1,
    innings: [
      { ...rainOdi.innings[0], totalRuns: 280, wickets: 6, completedOvers: 50, isCompleted: true },
      {
        ...createInitialInningsState(
          2,
          'AUS',
          'Australia',
          'RSA',
          'South Africa',
          rainOdi.awayXI,
          rainOdi.homeXI,
          281,
          { format: 'ODI', bowlingWicketKeeperId: rainOdi.homeWicketKeeperId }
        ),
        totalRuns: 68,
        wickets: 2,
        completedOvers: 12,
      },
    ],
  };
  const noResultMatch = concludeWhiteBallNoResult(rainAfter12Ov, 'Persistent rain stopped play at 12.0 overs');
  assert.equal(noResultMatch.status, 'NO_RESULT');
  assert.equal(noResultMatch.innings[1].targetRuns, 281, 'Target must NEVER be altered by fake DLS');
  assert.match(noResultMatch.resultText || '', /rain/i);

  // 5. Abandoned ODI before a ball is bowled
  const preMatch = buildWhiteBallMatchFixture('odi_aban_1', 'ODI', 'PAK', 'SL', { seed: 7520 });
  preMatch.status = 'READY';
  preMatch.innings = [];
  const abandoned = abandonWhiteBallMatch(preMatch, 'Wet outfield & torrential rain');
  assert.equal(abandoned.status, 'ABANDONED');
  assert.equal(abandoned.innings.length, 0);
});

test('ODI Suite 6: Multi-Match Seeded ODI Batch — Non-repetitive 5+ bowler rotations & realistic scores', () => {
  const pairings: Array<[string, string]> = [
    ['IND', 'AUS'],
    ['ENG', 'RSA'],
    ['NZL', 'PAK'],
    ['SL', 'AFG'],
    ['WI', 'BAN'],
    ['IND', 'ENG'],
    ['AUS', 'NZL'],
    ['RSA', 'PAK'],
  ];

  // Run 4 matches with the exact same teams (IND vs AUS) & different seeds to prove bowling rotations vary
  const indAusRotations = new Set<string>();
  for (let s = 0; s < 4; s++) {
    const m = simulateFullMatch(
      buildWhiteBallMatchFixture(`odi_rot_${s}`, 'ODI', 'IND', 'AUS', { seed: 7600 + s * 37 })
    );
    const seq = m.innings[0].bowlers.map((b) => `${b.playerId}:${b.overs}`).join('|');
    indAusRotations.add(seq);
    const activeBowlers = m.innings[0].bowlers.filter((b) => b.overs > 0 || b.ballsThisOver > 0);
    if (m.innings[0].completedOvers >= 25) {
      assert.ok(
        activeBowlers.length >= 5,
        `ODI innings >= 25 overs should use at least 5 bowlers (used ${activeBowlers.length})`
      );
    }
  }
  assert.ok(
    indAusRotations.size >= 2,
    'ODI bowling rotations & allocations must vary across matches rather than repeating identically'
  );

  let totalFirstInningsRuns = 0;
  for (let i = 0; i < pairings.length; i++) {
    const [home, away] = pairings[i];
    const completed = simulateFullMatch(
      buildWhiteBallMatchFixture(`odi_batch_${i}`, 'ODI', home, away, { seed: 7700 + i * 53 })
    );
    assert.ok(isTerminalMatchStatus(completed.status));
    assert.equal(completed.innings.length, 2);
    assertWhiteBallInningsReconciles(completed.innings[0], 'ODI', completed.awayWicketKeeperId);
    assertWhiteBallInningsReconciles(completed.innings[1], 'ODI', completed.homeWicketKeeperId);
    totalFirstInningsRuns += completed.innings[0].totalRuns;
  }

  const avgFirstInnings = totalFirstInningsRuns / pairings.length;
  assert.ok(
    avgFirstInnings >= 190 && avgFirstInnings <= 365,
    `Average ODI 1st-innings score (${avgFirstInnings.toFixed(1)}) must sit in a realistic international ODI band`
  );
});

// ============================================================================
// 2. T20I MATCH ENGINE SUITE (PHASE 3 & PHASE 12)
// ============================================================================

test('T20I Suite 1: 20-over limit, 4-over bowler limit, no consecutive overs & shortened T20I quotas', () => {
  const m = buildWhiteBallMatchFixture('t20_rules_1', 'T20I', 'IND', 'ENG', { seed: 8101 });

  let current = m;
  let prevInningsIdx = 0;
  let lastOverBowler: string | undefined = undefined;
  let guard = 0;

  while (!isTerminalMatchStatus(current.status) && guard < 60) {
    guard++;
    const beforeInn = current.innings[current.currentInningsIndex];
    if (beforeInn.isCompleted) {
      current = stepMatchOver(current);
      prevInningsIdx = current.currentInningsIndex;
      lastOverBowler = undefined;
      continue;
    }
    const activeBowlerBefore = beforeInn.currentBowlerId;
    if (current.currentInningsIndex !== prevInningsIdx) {
      prevInningsIdx = current.currentInningsIndex;
      lastOverBowler = undefined;
    }
    if (beforeInn.ballsInCurrentOver === 0 && lastOverBowler) {
      assert.notEqual(
        activeBowlerBefore,
        lastOverBowler,
        `Bowler ${activeBowlerBefore} bowled consecutive overs in T20I!`
      );
    }
    current = stepMatchOver(current);
    const afterInn = current.innings[prevInningsIdx];
    if (afterInn && afterInn.ballsInCurrentOver === 0 && afterInn.completedOvers > 0) {
      lastOverBowler = activeBowlerBefore;
    }
  }

  assert.ok(isTerminalMatchStatus(current.status));
  assert.equal(current.innings.length, 2);
  assert.ok(current.innings[0].completedOvers * 6 + current.innings[0].ballsInCurrentOver <= 120);
  assert.ok(current.innings[1].completedOvers * 6 + current.innings[1].ballsInCurrentOver <= 120);
  assert.equal(current.innings[1].targetRuns, current.innings[0].totalRuns + 1);

  assertWhiteBallInningsReconciles(current.innings[0], 'T20I', current.awayWicketKeeperId);
  assertWhiteBallInningsReconciles(current.innings[1], 'T20I', current.homeWicketKeeperId);

  // Shortened 13-over T20I: 13 = 3 * 3 + 2 * 2 -> max 3 bowlers bowl 3 overs, others max 2
  const rawShort = buildWhiteBallMatchFixture('t20_short_13', 'T20I', 'RSA', 'WI', { seed: 8150 });
  const clampedMin5 = applyPreMatchOversReduction(rawShort, 3);
  assert.equal(clampedMin5.allocatedOversPerInnings, 5, 'Minimum T20I allocation clamps to 5 overs');

  const short13 = simulateFullMatch(applyPreMatchOversReduction(rawShort, 13));
  for (let i = 0; i < short13.innings.length; i++) {
    const inn = short13.innings[i];
    const wkId = i === 0 ? short13.awayWicketKeeperId : short13.homeWicketKeeperId;
    assert.ok(inn.completedOvers * 6 + inn.ballsInCurrentOver <= 13 * 6);
    const threeOverBowlers = inn.bowlers.filter((bw) => bw.overs * 6 + bw.ballsThisOver > 2 * 6);
    assert.ok(threeOverBowlers.length <= 3, 'At most 3 bowlers may bowl 3 overs in a 13-over T20I');
    for (const bw of inn.bowlers) {
      assert.ok(bw.overs * 6 + bw.ballsThisOver <= 3 * 6, 'Max 3 overs per bowler in 13-over T20I');
    }
    assertWhiteBallInningsReconciles(inn, 'T20I', wkId, { allocatedOvers: 13 });
  }
});

test('T20I Suite 2: Powerplay (Overs 1-6 vs 7-20), Death Overs (16-20) & 4 Tactical Batting Approaches', () => {
  assert.equal(getPowerplayPhase('T20I', 0).phase, 'MANDATORY_PP1');
  assert.equal(getPowerplayPhase('T20I', 0).maxFieldersOutsideCircle, 2);
  assert.equal(getPowerplayPhase('T20I', 5).phase, 'MANDATORY_PP1');
  assert.equal(getPowerplayPhase('T20I', 6).phase, 'STANDARD');
  assert.equal(getPowerplayPhase('T20I', 6).maxFieldersOutsideCircle, 5);
  assert.equal(getPowerplayPhase('T20I', 19).maxFieldersOutsideCircle, 5);

  const m = buildWhiteBallMatchFixture('t20_phases', 'T20I', 'IND', 'AUS', { seed: 8201 });
  const striker = getPlayerById(m.homeXI[1]);
  const nonStriker = getPlayerById(m.homeXI[2]);
  const bowler = getPlayerById(m.awayXI[9]);

  // Compare all 4 tactical approaches: DEFENSIVE < BALANCED < ATTACKING < SMASH (All-Out Attack)
  const approaches = ['DEFENSIVE', 'BALANCED', 'ATTACKING', 'SMASH'] as const;
  const runsByApproach: Record<string, number> = {};
  const wktsByApproach: Record<string, number> = {};

  for (const app of approaches) {
    setSimulationSeed(82999);
    let runs = 0;
    let wkts = 0;
    for (let i = 0; i < 500; i++) {
      const b = simulateDelivery({
        format: 'T20I',
        striker,
        nonStriker,
        bowler,
        pitch: m.pitch,
        weather: m.weather,
        overNumber: 16, // Death overs (16-20)
        ballInOver: i % 6,
        currentScore: 142,
        wicketsLost: 3,
        battingAggression: app,
        bowlingTactic: 'YORKER_DEATH',
        fieldPreset: 'DEATH_PROTECT',
        overCompletedOvers: 16,
      });
      runs += b.runsOffBat;
      if (b.isWicket) wkts++;
    }
    runsByApproach[app] = runs;
    wktsByApproach[app] = wkts;
  }

  assert.ok(
    runsByApproach.DEFENSIVE < runsByApproach.BALANCED &&
      runsByApproach.BALANCED < runsByApproach.ATTACKING &&
      runsByApproach.ATTACKING < runsByApproach.SMASH,
    `T20I tactical approaches must monotonically scale scoring rate: ${JSON.stringify(runsByApproach)}`
  );
  assert.ok(
    wktsByApproach.SMASH > wktsByApproach.DEFENSIVE,
    'All-out attack (SMASH) must carry higher wicket risk than DEFENSIVE'
  );

  // Verify T20I Powerplay (over 2, max 2 outside) produces more boundaries than Middle overs (over 10, 5 outside)
  let ppBoundaries = 0;
  let midBoundaries = 0;
  setSimulationSeed(83111);
  for (let i = 0; i < 500; i++) {
    const b = simulateDelivery({
      format: 'T20I',
      striker,
      nonStriker,
      bowler,
      pitch: m.pitch,
      weather: m.weather,
      overNumber: 2,
      ballInOver: i % 6,
      currentScore: 16,
      wicketsLost: 0,
      battingAggression: 'ATTACKING',
      bowlingTactic: 'BALANCED_CONTAIN',
      fieldPreset: 'DEFENSIVE_BOUNDARY',
      overCompletedOvers: 2,
    });
    if (b.runsOffBat >= 4) ppBoundaries++;
  }
  setSimulationSeed(83111);
  for (let i = 0; i < 500; i++) {
    const b = simulateDelivery({
      format: 'T20I',
      striker,
      nonStriker,
      bowler,
      pitch: m.pitch,
      weather: m.weather,
      overNumber: 10,
      ballInOver: i % 6,
      currentScore: 80,
      wicketsLost: 2,
      battingAggression: 'ATTACKING',
      bowlingTactic: 'BALANCED_CONTAIN',
      fieldPreset: 'DEFENSIVE_BOUNDARY',
      overCompletedOvers: 10,
    });
    if (b.runsOffBat >= 4) midBoundaries++;
  }
  assert.ok(
    ppBoundaries > midBoundaries,
    `T20I Powerplay (Overs 1-6) must yield more boundaries (${ppBoundaries}) than Middle Overs (${midBoundaries})`
  );
});

test('T20I Suite 3: ICC Super Over — 6 legal balls (extras re-bowled), 3 batters / 2 wickets, batting order & Repeat Super Overs on tie', () => {
  const baseT20 = buildWhiteBallMatchFixture('t20_so_test', 'T20I', 'IND', 'RSA', { seed: 8401 });
  const inn1 = { ...baseT20.innings[0], totalRuns: 178, wickets: 6, completedOvers: 20, isCompleted: true };
  const inn2Base = createInitialInningsState(
    2,
    'RSA',
    'South Africa',
    'IND',
    'India',
    baseT20.awayXI,
    baseT20.homeXI,
    179,
    { format: 'T20I', bowlingWicketKeeperId: baseT20.homeWicketKeeperId, seed: 8402 }
  );
  const inn2 = { ...inn2Base, totalRuns: 178, wickets: 7, completedOvers: 20, isCompleted: true };
  baseT20.innings = [inn1, inn2];
  baseT20.currentInningsIndex = 1;

  let sawRepeatSuperOver = false;
  let sawExtraRebowled = false;
  let sawTwoWicketTermination = false;

  for (let s = 1; s <= 120; s++) {
    const resolved = simulateSuperOver({ ...baseT20, seed: 8400 + s * 19 });
    const out = determineMatchOutcome(resolved);
    const res = computeMatchResult(resolved);

    assert.equal(resolved.superOverPlayed, true);
    assert.ok(resolved.superOverInnings && resolved.superOverInnings.length >= 2);
    assert.equal(resolved.superOverInnings.length % 2, 0);
    assert.equal(
      resolved.superOverInnings[0].battingTeamId,
      'RSA',
      'Team batting 2nd in main T20I (RSA) must bat 1st in Super Over Round 1'
    );
    assert.equal(out.isTie, false, 'Super Over must break tie');
    assert.ok(out.winnerTeamId === 'IND' || out.winnerTeamId === 'RSA');
    assert.equal(res.winnerTeamId, out.winnerTeamId);

    for (const soInn of resolved.superOverInnings) {
      const bowlWk =
        soInn.bowlingTeamId === 'IND' ? resolved.homeWicketKeeperId : resolved.awayWicketKeeperId;
      assertWhiteBallInningsReconciles(soInn, 'T20I', bowlWk, { isSuperOver: true });
      assert.ok(soInn.batters.length <= 3, 'At most 3 nominated batters can appear in a Super Over');
      assert.equal(soInn.bowlers.length, 1, 'Exactly 1 nominated bowler bowls a Super Over');

      const legalBalls = soInn.completedOvers * 6 + soInn.ballsInCurrentOver;
      if (soInn.wickets === 2) {
        sawTwoWicketTermination = true;
        assert.ok(legalBalls <= 6);
      }
      if (soInn.extras.wides + soInn.extras.noBalls > 0 && soInn.wickets < 2 && !soInn.targetRuns) {
        sawExtraRebowled = true;
        assert.equal(legalBalls, 6, 'Wides/no-balls must NOT shorten the 6 legal deliveries of a Super Over');
      }
    }

    if ((resolved.superOverRounds || 1) >= 2 && resolved.superOverInnings.length >= 4) {
      sawRepeatSuperOver = true;
      const r1First = resolved.superOverInnings[0];
      const r1Second = resolved.superOverInnings[1];
      assert.equal(r1First.totalRuns, r1Second.totalRuns, 'Repeat Super Over only occurs when Round 1 tied');

      const r2First = resolved.superOverInnings[2];
      const r2Second = resolved.superOverInnings[3];
      const r1Bowlers = new Set([r1First.bowlers[0].playerId, r1Second.bowlers[0].playerId]);
      assert.ok(
        !r1Bowlers.has(r2First.bowlers[0].playerId) && !r1Bowlers.has(r2Second.bowlers[0].playerId),
        'Bowler from Super Over Round 1 must not bowl Round 2'
      );

      const r1Dismissed = new Set(
        [...r1First.batters, ...r1Second.batters]
          .filter((b) => Boolean(b.dismissal))
          .map((b) => b.playerId)
      );
      for (const b of [...r2First.batters, ...r2Second.batters]) {
        assert.ok(!r1Dismissed.has(b.playerId), `Dismissed R1 batter ${b.playerId} cannot bat in R2`);
      }
    }
  }

  assert.ok(sawExtraRebowled, 'Verified Super Over wides/no-balls re-bowled for full 6 legal balls');
  assert.ok(sawTwoWicketTermination, 'Verified 2 wickets immediately terminate Super Over innings');
  assert.ok(sawRepeatSuperOver, 'Verified tied Super Over triggers Repeat Super Over (Round 2)');
});

test('T20I Suite 4: Multi-Match Seeded T20I Batch — Varied bowling rotations, chases & scorecard reconciliation', () => {
  const pairings: Array<[string, string]> = [
    ['IND', 'AUS'],
    ['ENG', 'WI'],
    ['RSA', 'NZL'],
    ['PAK', 'AFG'],
    ['SL', 'BAN'],
    ['AUS', 'ENG'],
    ['IND', 'RSA'],
    ['NZL', 'WI'],
  ];

  const rotationSignatures = new Set<string>();
  for (let s = 0; s < 5; s++) {
    const m = simulateFullMatch(
      buildWhiteBallMatchFixture(`t20_rot_${s}`, 'T20I', 'IND', 'AUS', { seed: 8500 + s * 41 })
    );
    const sig = m.innings[0].bowlers.map((b) => `${b.playerId}:${b.overs}`).join(',');
    rotationSignatures.add(sig);
    if (m.innings[0].completedOvers >= 16) {
      const used = m.innings[0].bowlers.filter((b) => b.overs > 0 || b.ballsThisOver > 0).length;
      assert.ok(used >= 5, `T20I innings >= 16 overs must use at least 5 bowlers (used ${used})`);
    }
  }
  assert.ok(rotationSignatures.size >= 2, 'T20I bowling rotations must vary across matches');

  let totalFirstInningsRuns = 0;
  for (let i = 0; i < pairings.length; i++) {
    const [home, away] = pairings[i];
    const completed = simulateFullMatch(
      buildWhiteBallMatchFixture(`t20_batch_${i}`, 'T20I', home, away, { seed: 8600 + i * 61 })
    );
    assert.ok(isTerminalMatchStatus(completed.status));
    assert.equal(completed.innings.length, 2);
    assertWhiteBallInningsReconciles(completed.innings[0], 'T20I', completed.awayWicketKeeperId);
    assertWhiteBallInningsReconciles(completed.innings[1], 'T20I', completed.homeWicketKeeperId);
    totalFirstInningsRuns += completed.innings[0].totalRuns;
  }

  const avgRuns = totalFirstInningsRuns / pairings.length;
  assert.ok(
    avgRuns >= 130 && avgRuns <= 225,
    `Average T20I 1st-innings score (${avgRuns.toFixed(1)}) must sit in a realistic T20I band`
  );
});

// ============================================================================
// 3. COMMON BALL-BY-BALL, CONDITIONS, STATS, SAVE/RESUME & AI WORLD SUITE
// ============================================================================

test('Common Suite 1: Extras (Wd, Nb + Free Hit, Byes, Leg-Byes, Penalty) & Legal Dismissals', () => {
  const m = buildWhiteBallMatchFixture('wb_laws_1', 'T20I', 'IND', 'AUS', { seed: 9001 });
  let inn = m.innings[0];
  const allNames = buildNameMap([...m.homeXI, ...m.awayXI]);
  const striker0 = inn.currentStrikerId;
  const nonStriker0 = inn.currentNonStrikerId;
  const bowler0 = inn.currentBowlerId;
  const bowlerName = allNames[bowler0];

  // 1. Wide (2w = 1 wide + 1 extra run taken -> swaps strike, 0 legal balls, charged to bowler)
  const wide2: BallOutcome = {
    overNumber: 0,
    ballInOver: 1,
    bowlerId: bowler0,
    bowlerName,
    strikerId: striker0,
    strikerName: allNames[striker0],
    nonStrikerId: nonStriker0,
    nonStrikerName: allNames[nonStriker0],
    runsOffBat: 0,
    extras: { wides: 2, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
    totalRuns: 2,
    isLegalDelivery: false,
    isWicket: false,
    commentary: 'Wide down leg and they scamper an extra single!',
  };
  inn = applyBallToInnings(inn, wide2, m.homeXI, allNames, 'T20I');
  assert.equal(inn.ballsInCurrentOver, 0, 'Wide must not advance legal ball count');
  assert.equal(inn.totalRuns, 2);
  assert.equal(inn.currentStrikerId, nonStriker0, '2 wides (1 extra run) must swap strike');
  assert.equal(inn.bowlers[0].runs, 2, 'Wides are charged to bowler');

  // 2. No-Ball + 4 off bat -> triggers FREE HIT, 0 legal balls, 4 credited to batter, 5 charged to bowler
  const nbFour: BallOutcome = {
    overNumber: 0,
    ballInOver: 1,
    bowlerId: bowler0,
    bowlerName,
    strikerId: nonStriker0,
    strikerName: allNames[nonStriker0],
    nonStrikerId: striker0,
    nonStrikerName: allNames[striker0],
    runsOffBat: 4,
    extras: { wides: 0, noBalls: 1, byes: 0, legByes: 0, penalty: 0 },
    totalRuns: 5,
    isLegalDelivery: false,
    isWicket: false,
    commentary: 'No-ball overstepped and crunched for FOUR! Free Hit coming up!',
  };
  inn = applyBallToInnings(inn, nbFour, m.homeXI, allNames, 'T20I');
  assert.equal(inn.ballsInCurrentOver, 0, 'No-ball must not count as legal delivery');
  assert.equal(inn.isFreeHit, true, 'No-ball in ODI/T20I must arm Free Hit');
  assert.equal(inn.batters.find((b) => b.playerId === nonStriker0)?.runs, 4);
  assert.equal(inn.batters.find((b) => b.playerId === nonStriker0)?.balls, 1);

  // Verify Free Hit dismissal laws: Caught/Bowled/LBW/Stumped ILLEGAL; Run Out & Obstructing Field LEGAL!
  assert.equal(isDismissalLegalForDelivery('BOWLED', false, false, true), false);
  assert.equal(isDismissalLegalForDelivery('CAUGHT', false, false, true), false);
  assert.equal(isDismissalLegalForDelivery('LBW', false, false, true), false);
  assert.equal(isDismissalLegalForDelivery('STUMPED', true, false, true), false);
  assert.equal(isDismissalLegalForDelivery('RUN_OUT', false, false, true), true);
  assert.equal(isDismissalLegalForDelivery('OBSTRUCTING_FIELD', false, false, true), true);

  // Wide on a Free Hit must CARRY OVER the Free Hit to the next ball!
  const wideOnFreeHit: BallOutcome = {
    ...wide2,
    strikerId: nonStriker0,
    strikerName: allNames[nonStriker0],
    nonStrikerId: striker0,
    nonStrikerName: allNames[striker0],
    extras: { wides: 1, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
    totalRuns: 1,
  };
  inn = applyBallToInnings(inn, wideOnFreeHit, m.homeXI, allNames, 'T20I');
  assert.equal(inn.isFreeHit, true, 'Wide bowled on Free Hit must preserve Free Hit for next ball');

  // 3. Legal Free Hit delivery with 2 Leg-Byes + 5 Penalty Runs -> clears Free Hit, NOT charged to bowler
  const bowlerRunsBeforeLb = inn.bowlers[0].runs;
  const lbPenalty: BallOutcome = {
    overNumber: 0,
    ballInOver: 1,
    bowlerId: bowler0,
    bowlerName,
    strikerId: nonStriker0,
    strikerName: allNames[nonStriker0],
    nonStrikerId: striker0,
    nonStrikerName: allNames[striker0],
    runsOffBat: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 2, penalty: 5 },
    totalRuns: 7,
    isLegalDelivery: true,
    isWicket: false,
    commentary: 'Two leg-byes plus 5 penalty runs after ball strikes helmet on the ground.',
  };
  inn = applyBallToInnings(inn, lbPenalty, m.homeXI, allNames, 'T20I');
  assert.equal(inn.isFreeHit, false, 'Legal delivery consumes Free Hit');
  assert.equal(inn.ballsInCurrentOver, 1);
  assert.equal(inn.bowlers[0].runs, bowlerRunsBeforeLb, 'Leg-byes & penalty runs must NOT be charged to bowler');

  // 4. Non-striker RUN_OUT must NOT credit bowler wickets!
  const nonStrikerOutBall: BallOutcome = {
    overNumber: 0,
    ballInOver: 2,
    bowlerId: bowler0,
    bowlerName,
    strikerId: nonStriker0,
    strikerName: allNames[nonStriker0],
    nonStrikerId: striker0,
    nonStrikerName: allNames[striker0],
    runsOffBat: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
    totalRuns: 0,
    isLegalDelivery: true,
    isWicket: true,
    wicketDetails: {
      type: 'RUN_OUT',
      bowlerName,
      fielderName: allNames[m.awayXI[2]],
      dismissedPlayerId: striker0, // backing-up non-striker run out!
      description: `run out (${allNames[m.awayXI[2]]})`,
    },
    commentary: 'Direct hit at the non-striker end! Backing up too far and RUN OUT!',
  };
  inn = applyBallToInnings(inn, nonStrikerOutBall, m.homeXI, allNames, 'T20I');
  assert.equal(inn.wickets, 1);
  assert.equal(inn.bowlers[0].wickets, 0, 'Run out must NOT credit bowler wickets');
  assert.equal(inn.currentStrikerId, nonStriker0, 'Surviving striker remains on strike');
  assert.equal(inn.currentNonStrikerId, m.homeXI[2], 'New batter replaces dismissed non-striker');

  assertWhiteBallInningsReconciles(inn, 'T20I', m.awayWicketKeeperId);
});

test('Common Suite 2: Strike Rotation — Odd/Even runs, Boundaries, End-of-over & Odd-run on Ball 6', () => {
  const m = buildWhiteBallMatchFixture('wb_strike_1', 'ODI', 'ENG', 'NZL', { seed: 9101 });
  let inn = m.innings[0];
  const allNames = buildNameMap([...m.homeXI, ...m.awayXI]);
  const bA = inn.currentStrikerId;
  const bB = inn.currentNonStrikerId;
  const bw = inn.currentBowlerId;

  const mkBall = (ballNum: number, striker: string, nonStriker: string, runs: number): BallOutcome => ({
    overNumber: 0,
    ballInOver: ballNum,
    bowlerId: bw,
    bowlerName: allNames[bw],
    strikerId: striker,
    strikerName: allNames[striker],
    nonStrikerId: nonStriker,
    nonStrikerName: allNames[nonStriker],
    runsOffBat: runs,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
    totalRuns: runs,
    isLegalDelivery: true,
    isWicket: false,
    commentary: `${runs} run(s)`,
  });

  // Ball 1: Single (1) -> swaps A to non-striker, B on strike
  inn = applyBallToInnings(inn, mkBall(1, bA, bB, 1), m.homeXI, allNames, 'ODI');
  assert.equal(inn.currentStrikerId, bB);

  // Ball 2: Boundary Four (4) -> B stays on strike
  inn = applyBallToInnings(inn, mkBall(2, bB, bA, 4), m.homeXI, allNames, 'ODI');
  assert.equal(inn.currentStrikerId, bB);

  // Ball 3: Two runs (2) -> B stays on strike
  inn = applyBallToInnings(inn, mkBall(3, bB, bA, 2), m.homeXI, allNames, 'ODI');
  assert.equal(inn.currentStrikerId, bB);

  // Ball 4: Three runs (3) -> swaps back to A
  inn = applyBallToInnings(inn, mkBall(4, bB, bA, 3), m.homeXI, allNames, 'ODI');
  assert.equal(inn.currentStrikerId, bA);

  // Ball 5: Six (6) -> A stays on strike
  inn = applyBallToInnings(inn, mkBall(5, bA, bB, 6), m.homeXI, allNames, 'ODI');
  assert.equal(inn.currentStrikerId, bA);

  // Ball 6: Single (1) on final ball of over -> odd run swaps (A->B), then end-of-over swaps (B->A), so A keeps strike for Over 2!
  inn = applyBallToInnings(inn, mkBall(6, bA, bB, 1), m.homeXI, allNames, 'ODI');
  assert.equal(inn.completedOvers, 1);
  assert.equal(inn.ballsInCurrentOver, 0);
  assert.equal(inn.currentStrikerId, bA, 'Single on ball 6 must keep batter A on strike for next over');
});

test('Common Suite 3: White-Ball Match Conditions — Boundaries, Dew & Separate ODI vs T20I Behaviour', () => {
  const shortMatch = buildWhiteBallMatchFixture('cond_short', 'T20I', 'IND', 'AUS', {
    venueName: 'Wankhede Stadium, Mumbai',
    seed: 9201,
  });
  const largeMatch = buildWhiteBallMatchFixture('cond_large', 'T20I', 'AUS', 'IND', {
    venueName: 'Melbourne Cricket Ground (MCG)',
    seed: 9201,
  });

  assert.equal(shortMatch.whiteBallConditions?.boundarySize, 'SHORT');
  assert.equal(largeMatch.whiteBallConditions?.boundarySize, 'LARGE');

  const shortMod = getWhiteBallConditionsModifiers(shortMatch, { inningsNumber: 1, completedOvers: 8 });
  const largeMod = getWhiteBallConditionsModifiers(largeMatch, { inningsNumber: 1, completedOvers: 8 });
  assert.ok(
    shortMod.boundarySixMultiplier > largeMod.boundarySixMultiplier &&
      shortMod.boundaryFourMultiplier > largeMod.boundaryFourMultiplier,
    'Short boundaries must boost 4s and 6s compared to large MCG boundaries'
  );

  // 2nd-innings Heavy Dew effect on wet-ball bowling vs 1st innings dry ball
  shortMatch.whiteBallConditions = {
    ...shortMatch.whiteBallConditions!,
    dewFactor: 'HEAVY',
  };
  const inn1NoDew = getWhiteBallConditionsModifiers(shortMatch, { inningsNumber: 1, completedOvers: 12 });
  const inn2HeavyDew = getWhiteBallConditionsModifiers(shortMatch, { inningsNumber: 2, completedOvers: 12 });
  assert.ok(
    inn2HeavyDew.effectiveSpinBonus < inn1NoDew.effectiveSpinBonus &&
      inn2HeavyDew.dewBattingBoost > inn1NoDew.dewBattingBoost,
    '2nd-innings Heavy Dew must reduce spin grip and boost chasing batting'
  );

  // Separate ODI vs T20I match behaviour under identical venue, pitch & weather
  const odiSame = buildWhiteBallMatchFixture('cond_odi', 'ODI', 'IND', 'AUS', {
    venueName: 'Wankhede Stadium, Mumbai',
    pitch: shortMatch.pitch,
    weather: shortMatch.weather,
    seed: 9201,
  });
  const t20Mod = getWhiteBallConditionsModifiers(shortMatch, { inningsNumber: 1, completedOvers: 18 });
  const odiMod = getWhiteBallConditionsModifiers(odiSame, { inningsNumber: 1, completedOvers: 38 });
  assert.notEqual(
    t20Mod.ballSoftnessSixMod,
    odiMod.ballSoftnessSixMod,
    'ODI (softening 2-ball 50-over behaviour) and T20I (hard 20-over behaviour) must remain distinct'
  );
});

test('Common Suite 4: Format-Isolated Player Career Statistics, 4w/5w Hauls, Historical Preservation & Idempotency', () => {
  let career = createNewCareerSave('Stats Coach', 'IND', 'ODI', 'INTERNATIONAL', 'TACTICAL');

  const bumrahRawBefore = JSON.stringify(ALL_PLAYERS.find((p) => p.id === 'ind_jb')?.stats);

  const odiFixture =
    career.fixtures.find((f) => f.format === 'ODI') ||
    buildWhiteBallMatchFixture('career_odi_stat', 'ODI', 'IND', 'AUS', {
      isUserMatch: true,
      userTeamId: 'IND',
      seed: 9301,
    });
  if (!career.fixtures.some((f) => f.id === odiFixture.id)) {
    career = { ...career, fixtures: [odiFixture, ...career.fixtures] };
  }

  const completedOdi = simulateFullMatch({ ...odiFixture, seed: 9301 });
  career = applyUserMatchResult(career, completedOdi);

  // Verify ODI simulatedStats updated ONLY ODI, leaving T20I and TEST at 0
  const captainId = completedOdi.homeTeamId === 'IND' ? completedOdi.homeCaptainId : completedOdi.awayCaptainId;
  const effAfterOdi = getEffectivePlayer(captainId, career)!;
  assert.equal(effAfterOdi.simulatedStats?.ODI.matches, 1);
  assert.equal(effAfterOdi.simulatedStats?.T20I.matches, 0, 'ODI match must NOT touch T20I stats');
  assert.equal(effAfterOdi.simulatedStats?.TEST.matches, 0, 'ODI match must NOT touch TEST stats');

  // Re-applying exact same completed match must be idempotent (never double-count stats!)
  const matchesBeforeDupe = effAfterOdi.simulatedStats?.ODI.matches;
  const runsBeforeDupe = effAfterOdi.simulatedStats?.ODI.runs;
  career = applyUserMatchResult(career, completedOdi);
  const effAfterDupe = getEffectivePlayer(captainId, career)!;
  assert.equal(effAfterDupe.simulatedStats?.ODI.matches, matchesBeforeDupe, 'Never update stats twice');
  assert.equal(effAfterDupe.simulatedStats?.ODI.runs, runsBeforeDupe, 'Never double-count runs');

  // Now simulate a T20I match and verify T20I stats update without altering ODI stats
  const t20Fixture =
    career.fixtures.find((f) => f.format === 'T20I' && !isTerminalMatchStatus(f.status)) ||
    buildWhiteBallMatchFixture('career_t20_stat', 'T20I', 'IND', 'ENG', {
      isUserMatch: true,
      userTeamId: 'IND',
      seed: 9302,
    });
  if (!career.fixtures.some((f) => f.id === t20Fixture.id)) {
    career = { ...career, fixtures: [t20Fixture, ...career.fixtures] };
  }
  const completedT20 = simulateFullMatch({ ...t20Fixture, seed: 9302 });
  career = applyUserMatchResult(career, completedT20);

  const t20PlayerId = completedT20.homeTeamId === 'IND' ? completedT20.homeXI[0] : completedT20.awayXI[0];
  const effAfterT20 = getEffectivePlayer(t20PlayerId, career)!;
  assert.equal(effAfterT20.simulatedStats?.T20I.matches, 1);

  // Verify 4-wicket haul (4w) and 5-wicket haul (5w) tracking in accumulateMatchIntoFormatStats
  const sampleBowlerId = completedT20.homeXI[8];
  const synthetic4wMatch: Match = {
    ...completedT20,
    id: 'synth_4w',
    innings: [
      {
        ...completedT20.innings[0],
        battingTeamId: completedT20.awayTeamId,
        bowlingTeamId: completedT20.homeTeamId,
        bowlers: [
          {
            playerId: sampleBowlerId,
            playerName: getPlayerById(sampleBowlerId).shortName,
            overs: 4,
            ballsThisOver: 0,
            maidens: 1,
            runs: 22,
            wickets: 4,
            economy: 5.5,
            wides: 0,
            noBalls: 0,
            dots: 14,
          },
        ],
      },
    ],
  };
  const baseEmpty = createEmptyFormatStats();
  const after4w = accumulateMatchIntoFormatStats(createEmptyFormatStats(), synthetic4wMatch, sampleBowlerId);
  assert.equal(after4w.fourWicketHauls, 1, '4-wicket haul must increment fourWicketHauls');
  assert.equal(after4w.fiveWicketHauls, 0, '4 wickets must not increment fiveWicketHauls');
  const combined = getCombinedFormatStats(baseEmpty, after4w);
  assert.equal(combined.fourWicketHauls, 1);

  // Verify ALL_PLAYERS historical database record was NEVER mutated
  const bumrahRawAfter = JSON.stringify(ALL_PLAYERS.find((p) => p.id === 'ind_jb')?.stats);
  assert.equal(
    bumrahRawBefore,
    bumrahRawAfter,
    'Historical ALL_PLAYERS database records must NEVER be overwritten by simulated career stats'
  );
});

test('Common Suite 5: Exact Mid-Match Save & Resume Determinism (ODI & T20I) + Post-Match Actions', () => {
  for (const format of ['ODI', 'T20I'] as const) {
    const startMatch = buildWhiteBallMatchFixture(`save_resume_${format}`, format, 'IND', 'NZL', {
      seed: format === 'ODI' ? 9401 : 9402,
      isUserMatch: true,
      userTeamId: 'IND',
    });

    // Advance partway into the match using over-by-over + ball-by-ball modes
    let midState = stepMatchOver(startMatch);
    midState = stepMatchOver(midState);
    midState = stepMatchBall(midState);
    midState = stepMatchBall(midState);
    midState = stepMatchBall(midState);

    // Branch A: Continue uninterrupted in memory
    const uninterrupted = simulateFullMatch(JSON.parse(JSON.stringify(midState)));

    // Branch B: Serialize to JSON (simulating storage save), parse back, and resume
    const savedJson = JSON.stringify(midState);
    const restored: Match = JSON.parse(savedJson);
    assert.equal(restored.innings[0].totalRuns, midState.innings[0].totalRuns);
    assert.equal(restored.innings[0].ballsInCurrentOver, midState.innings[0].ballsInCurrentOver);

    const resumedFinished = simulateFullMatch(restored);

    assert.equal(
      resumedFinished.resultText,
      uninterrupted.resultText,
      `${format} resumed match must produce identical result to uninterrupted simulation`
    );
    assert.equal(resumedFinished.innings[0].totalRuns, uninterrupted.innings[0].totalRuns);
    assert.equal(resumedFinished.innings[1].totalRuns, uninterrupted.innings[1].totalRuns);
  }

  // Verify Pre-Match Lineup Confirmation (single-team guard) & Post-Match 3-action workflow
  let career = createNewCareerSave('Workflow Coach', 'IND', 'T20I', 'INTERNATIONAL', 'TACTICAL');
  const firstUserFixture = career.fixtures.find((f) => !isTerminalMatchStatus(f.status))!;
  assert.ok(isPreMatchStatus(firstUserFixture.status));

  const customBowlers =
    firstUserFixture.homeTeamId === 'IND'
      ? firstUserFixture.homeXI.filter((id) => id !== firstUserFixture.homeWicketKeeperId).slice(-5)
      : firstUserFixture.awayXI.filter((id) => id !== firstUserFixture.awayWicketKeeperId).slice(-5);

  career = confirmMatchPreparationLineup(career, firstUserFixture.id, {
    playingXI: firstUserFixture.homeTeamId === 'IND' ? firstUserFixture.homeXI : firstUserFixture.awayXI,
    captainId:
      firstUserFixture.homeTeamId === 'IND' ? firstUserFixture.homeCaptainId : firstUserFixture.awayCaptainId,
    wicketKeeperId:
      firstUserFixture.homeTeamId === 'IND'
        ? firstUserFixture.homeWicketKeeperId
        : firstUserFixture.awayWicketKeeperId,
    bowlingRotation: customBowlers,
  });

  const confirmedMatch = career.fixtures.find((f) => f.id === firstUserFixture.id)!;
  assert.equal(confirmedMatch.status, 'READY');
  assert.equal(confirmedMatch.lineupConfirmed, true);

  // Attempting to edit an AI-vs-AI world fixture must be rejected / ignored (user manages ONLY selected team!)
  const aiWorldFixture = career.worldFixtures[0];
  if (aiWorldFixture) {
    const afterAiEditAttempt = confirmMatchPreparationLineup(career, aiWorldFixture.id, {
      playingXI: aiWorldFixture.homeXI,
      captainId: aiWorldFixture.homeCaptainId,
      wicketKeeperId: aiWorldFixture.homeWicketKeeperId,
    });
    assert.equal(
      afterAiEditAttempt,
      career,
      'User must never be allowed to modify AI-controlled country fixtures'
    );
  }

  // Complete match and verify Continue / Scorecard / Next Match safety (cannot replay completed match!)
  const played = simulateFullMatch(confirmedMatch);
  career = applyUserMatchResult(career, played);
  const storedCompleted = career.fixtures.find((f) => f.id === firstUserFixture.id)!;
  assert.equal(isTerminalMatchStatus(storedCompleted.status), true);
  assert.equal(isPreMatchStatus(storedCompleted.status), false, 'Completed match can never be re-started');

  const nextInfo = getNextUserMatchInfo(career);
  assert.notEqual(
    nextInfo.nextMatch?.id,
    storedCompleted.id,
    'NEXT MATCH action must point to the next unplayed fixture, never replaying completed match'
  );
});

test('Common Suite 6: AI World Match Simulation uses real ODI & T20I engine, scorecards & stats', () => {
  const career = createNewCareerSave('World AI Coach', 'IND', 'ODI', 'INTERNATIONAL', 'TACTICAL');

  const whiteBallWorld = career.worldFixtures.filter(
    (wm) => (wm.format === 'ODI' || wm.format === 'T20I') && wm.date
  );
  assert.ok(whiteBallWorld.length > 0, 'World calendar must contain AI ODI and T20I fixtures');

  const targetDate = whiteBallWorld[Math.min(12, whiteBallWorld.length - 1)].date!;
  const { updatedCareer } = simulateWorldMatchesUntil(career, targetDate);

  const completedAIWhiteBall = updatedCareer.worldFixtures.filter(
    (wm) => (wm.format === 'ODI' || wm.format === 'T20I') && isTerminalMatchStatus(wm.status)
  );
  assert.ok(completedAIWhiteBall.length >= 3, 'Multiple AI ODI/T20I matches must complete via real engine');

  for (const aiMatch of completedAIWhiteBall) {
    assert.equal(aiMatch.isUserMatch, false);
    assert.equal(aiMatch.innings.length, 2, 'AI ODI/T20I match must simulate 2 real innings');
    assert.equal(aiMatch.statsRecorded, true, 'AI match must update player career stats');
    assertWhiteBallInningsReconciles(
      aiMatch.innings[0],
      aiMatch.format as 'ODI' | 'T20I',
      aiMatch.awayWicketKeeperId
    );
    assertWhiteBallInningsReconciles(
      aiMatch.innings[1],
      aiMatch.format as 'ODI' | 'T20I',
      aiMatch.homeWicketKeeperId
    );
  }
});
