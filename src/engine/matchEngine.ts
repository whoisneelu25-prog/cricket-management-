import {
  Match,
  MatchFormat,
  Player,
  InningsState,
  BallOutcome,
  BattingAggression,
  BowlingTactic,
  FieldPreset,
  BatterInningsScore,
  BowlerInningsFigures
} from '../types/cricket';
import { ALL_PLAYERS } from '../data/squads';
import { INTERNATIONAL_TEAMS } from '../data/teams';
import { simulateDelivery } from './simulation';
import { applyBallToInnings, isInningsComplete } from './rules';

/**
 * Returns Player object by ID from the player database
 */
export function getPlayerById(playerId: string): Player {
  const found = ALL_PLAYERS.find((p) => p.id === playerId);
  if (found) return found;
  // Fallback placeholder
  return {
    id: playerId,
    name: 'Cricketer',
    shortName: 'Cricketer',
    countryId: 'GEN',
    countryName: 'International',
    age: 26,
    gender: 'MALE',
    status: 'ACTIVE',
    role: 'ALL_ROUNDER',
    battingHand: 'RIGHT_HAND',
    bowlingStyle: 'RIGHT_ARM_FAST_MEDIUM',
    formatEligibility: { TEST: true, ODI: true, T20I: true },
    workloadFatigue: 15,
    sourceMeta: {
      source: 'ICC',
      sourceId: playerId,
      lastUpdated: '2026-11-03',
      verified: false,
    },
    testRating: 75,
    odiRating: 75,
    t20Rating: 75,
    attributes: {
      technique: 75, timing: 75, shotSelection: 75, defense: 75, aggression: 75, powerHitting: 75,
      againstPace: 75, againstSpin: 75, consistency: 75, temperament: 75, pace: 75, swing: 75,
      seam: 75, spin: 20, accuracy: 75, variation: 75, control: 75, deathBowling: 75,
      wicketTaking: 75, stamina: 85, fielding: 80, catching: 80, throwing: 80, fitness: 85,
      leadership: 70, mentalStrength: 75, currentForm: 80, potential: 80
    },
    stats: {
      TEST: { matches: 10, innings: 15, runs: 400, highestScore: 65, highestScoreNotOut: false, average: 30, strikeRate: 50, centuries: 0, fifties: 2, fours: 40, sixes: 4, ducks: 1, notOuts: 1, bowlingInnings: 15, oversBowled: 150, maidens: 20, runsConceded: 500, wickets: 20, bestBowlingWickets: 3, bestBowlingRuns: 40, bowlingAverage: 25, economy: 3.33, bowlingStrikeRate: 45, fiveWicketHauls: 0, tenWicketHauls: 0, catches: 5, stumpings: 0, runOuts: 1 },
      ODI: { matches: 20, innings: 18, runs: 500, highestScore: 78, highestScoreNotOut: false, average: 32, strikeRate: 85, centuries: 0, fifties: 3, fours: 45, sixes: 8, ducks: 1, notOuts: 2, bowlingInnings: 18, oversBowled: 120, maidens: 5, runsConceded: 600, wickets: 22, bestBowlingWickets: 4, bestBowlingRuns: 35, bowlingAverage: 27.2, economy: 5.0, bowlingStrikeRate: 32.7, fiveWicketHauls: 0, tenWicketHauls: 0, catches: 8, stumpings: 0, runOuts: 1 },
      T20I: { matches: 15, innings: 14, runs: 300, highestScore: 52, highestScoreNotOut: true, average: 25, strikeRate: 135, centuries: 0, fifties: 1, fours: 25, sixes: 12, ducks: 1, notOuts: 2, bowlingInnings: 15, oversBowled: 50, maidens: 0, runsConceded: 400, wickets: 16, bestBowlingWickets: 3, bestBowlingRuns: 20, bowlingAverage: 25, economy: 8.0, bowlingStrikeRate: 18.75, fiveWicketHauls: 0, tenWicketHauls: 0, catches: 6, stumpings: 0, runOuts: 1 },
    }
  };
}

/**
 * Initializes a new innings for the batting and bowling teams
 */
export function createInitialInningsState(
  inningsNumber: number,
  battingTeamId: string,
  battingTeamName: string,
  bowlingTeamId: string,
  bowlingTeamName: string,
  battingXI: string[],
  bowlingXI: string[],
  targetRuns?: number
): InningsState {
  const strikerId = battingXI[0] || 'p1';
  const nonStrikerId = battingXI[1] || 'p2';

  // Opening bowler is chosen from bowling XI (typically primary pacer/bowler)
  const openingBowlerId = bowlingXI[bowlingXI.length - 1] || 'b1';

  const strikerPlayer = getPlayerById(strikerId);
  const nonStrikerPlayer = getPlayerById(nonStrikerId);
  const bowlerPlayer = getPlayerById(openingBowlerId);

  const initialBatters: BatterInningsScore[] = [
    {
      playerId: strikerId,
      playerName: strikerPlayer.shortName,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      isCurrentStriker: true,
      isCurrentNonStriker: false,
    },
    {
      playerId: nonStrikerId,
      playerName: nonStrikerPlayer.shortName,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      isCurrentStriker: false,
      isCurrentNonStriker: true,
    },
  ];

  const initialBowlers: BowlerInningsFigures[] = [
    {
      playerId: openingBowlerId,
      playerName: bowlerPlayer.shortName,
      overs: 0,
      ballsThisOver: 0,
      maidens: 0,
      runs: 0,
      wickets: 0,
      economy: 0,
      wides: 0,
      noBalls: 0,
      dots: 0,
    },
  ];

  return {
    inningsNumber,
    battingTeamId,
    battingTeamName,
    bowlingTeamId,
    bowlingTeamName,
    totalRuns: 0,
    wickets: 0,
    completedOvers: 0,
    ballsInCurrentOver: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    batters: initialBatters,
    bowlers: initialBowlers,
    currentStrikerId: strikerId,
    currentNonStrikerId: nonStrikerId,
    currentBowlerId: openingBowlerId,
    fallOfWickets: [],
    recentBalls: [],
    targetRuns,
  };
}

/**
 * Chooses next bowler for bowling side if an over finishes
 */
export function selectNextBowler(
  match: Match,
  currentInnings: InningsState,
  bowlingXI: string[]
): string {
  // Can't bowl two consecutive overs
  const prevBowlerId = currentInnings.currentBowlerId;
  const eligibleBowlers = bowlingXI.filter((id) => id !== prevBowlerId);

  // Filter based on bowler limits in T20 (4) and ODI (10)
  const maxOvers = match.format === 'T20I' ? 4 : match.format === 'ODI' ? 10 : Infinity;
  const available = eligibleBowlers.filter((id) => {
    const figures = currentInnings.bowlers.find((b) => b.playerId === id);
    return !figures || figures.overs < maxOvers;
  });

  if (available.length === 0) return eligibleBowlers[0] || bowlingXI[0];

  // Pick bowler with lowest economy or best rating
  available.sort((a, b) => {
    const playerA = getPlayerById(a);
    const playerB = getPlayerById(b);
    return (playerB.attributes.wicketTaking + playerB.attributes.accuracy) -
           (playerA.attributes.wicketTaking + playerA.attributes.accuracy);
  });

  return available[0];
}

/**
 * Calculates the final match result text and Player of the Match
 */
export function computeMatchResult(match: Match): { resultText: string; potm: { playerId: string; playerName: string; reason: string } } {
  const innings1 = match.innings[0];
  const innings2 = match.innings[1];

  if (!innings1 || !innings2) {
    return {
      resultText: 'Match in progress',
      potm: { playerId: match.homeCaptainId, playerName: 'Captain', reason: 'Match in progress' },
    };
  }

  const team1Name = innings1.battingTeamName;
  const team2Name = innings2.battingTeamName;

  let resultText = '';
  let winningTeamId = '';

  if (innings2.totalRuns >= (innings1.totalRuns + 1)) {
    const wicketsLeft = 10 - innings2.wickets;
    resultText = `${team2Name} won by ${wicketsLeft} wicket${wicketsLeft > 1 ? 's' : ''}`;
    winningTeamId = innings2.battingTeamId;
  } else if (innings2.isCompleted || innings2.completedOvers >= (match.format === 'T20I' ? 20 : 50) || innings2.wickets >= 10) {
    if (innings2.totalRuns === innings1.totalRuns) {
      resultText = 'Match Tied!';
    } else {
      const runMargin = innings1.totalRuns - innings2.totalRuns;
      resultText = `${team1Name} won by ${runMargin} run${runMargin > 1 ? 's' : ''}`;
      winningTeamId = innings1.battingTeamId;
    }
  } else {
    resultText = 'Match completed';
  }

  // Find Player of the Match across all performances
  let bestScore = -1;
  let topPlayerId = match.homeCaptainId;
  let topPlayerReason = 'Solid all-round performance';

  // Evaluate batters
  for (const inn of match.innings) {
    for (const b of inn.batters) {
      const score = b.runs * 1.2 + b.fours * 2 + b.sixes * 4;
      if (score > bestScore) {
        bestScore = score;
        topPlayerId = b.playerId;
        topPlayerReason = `Scored ${b.runs} off ${b.balls} balls (${b.fours}x4, ${b.sixes}x6)`;
      }
    }
    // Evaluate bowlers
    for (const bw of inn.bowlers) {
      const bowlScore = bw.wickets * 35 + (bw.maidens * 15) - (bw.runs * 0.4);
      if (bowlScore > bestScore) {
        bestScore = bowlScore;
        topPlayerId = bw.playerId;
        topPlayerReason = `Outstanding bowling figures: ${bw.wickets}/${bw.runs} in ${bw.overs}.${bw.ballsThisOver} overs`;
      }
    }
  }

  const potmPlayer = getPlayerById(topPlayerId);

  return {
    resultText,
    potm: {
      playerId: potmPlayer.id,
      playerName: potmPlayer.name,
      reason: topPlayerReason,
    },
  };
}

/**
 * Simulates a single delivery within the active match
 */
export function stepMatchBall(match: Match): Match {
  if (match.status === 'COMPLETED' || match.status === 'SCHEDULED' || match.status === 'TOSS') {
    return match;
  }

  const currentInnings = match.innings[match.currentInningsIndex];
  if (!currentInnings || currentInnings.isCompleted) {
    // Check if we need to start 2nd innings
    if (match.currentInningsIndex === 0 && match.format !== 'TEST') {
      const nextBattingTeamId = currentInnings.bowlingTeamId;
      const nextBattingTeamName = currentInnings.bowlingTeamName;
      const nextBowlingTeamId = currentInnings.battingTeamId;
      const nextBowlingTeamName = currentInnings.battingTeamName;

      const nextBattingXI = nextBattingTeamId === match.homeTeamId ? match.homeXI : match.awayXI;
      const nextBowlingXI = nextBowlingTeamId === match.homeTeamId ? match.homeXI : match.awayXI;

      const target = currentInnings.totalRuns + 1;
      const innings2 = createInitialInningsState(
        2,
        nextBattingTeamId,
        nextBattingTeamName,
        nextBowlingTeamId,
        nextBowlingTeamName,
        nextBattingXI,
        nextBowlingXI,
        target
      );

      return {
        ...match,
        currentInningsIndex: 1,
        innings: [...match.innings, innings2],
      };
    } else {
      // All innings complete!
      const { resultText, potm } = computeMatchResult(match);
      return {
        ...match,
        status: 'COMPLETED',
        resultText,
        playerOfTheMatch: potm,
      };
    }
  }

  // Get active players
  const striker = getPlayerById(currentInnings.currentStrikerId);
  const nonStriker = getPlayerById(currentInnings.currentNonStrikerId);
  const bowler = getPlayerById(currentInnings.currentBowlerId);

  const isUserBatting = currentInnings.battingTeamId === match.userTeamId;
  const tactics = isUserBatting ? match.userTactics : match.aiTactics;
  const bowlingTactics = isUserBatting ? match.aiTactics : match.userTactics;

  // Build delivery context
  const ballOutcome = simulateDelivery({
    format: match.format,
    striker,
    nonStriker,
    bowler,
    pitch: match.pitch,
    weather: match.weather,
    overNumber: currentInnings.completedOvers,
    ballInOver: currentInnings.ballsInCurrentOver,
    currentScore: currentInnings.totalRuns,
    wicketsLost: currentInnings.wickets,
    targetRuns: currentInnings.targetRuns,
    battingAggression: tactics.battingAggression,
    bowlingTactic: bowlingTactics.bowlingTactic,
    fieldPreset: bowlingTactics.fieldPreset,
    overCompletedOvers: currentInnings.completedOvers,
  });

  // Name map
  const nameMap: Record<string, string> = {};
  ALL_PLAYERS.forEach((p) => {
    nameMap[p.id] = p.shortName;
  });

  const battingXI = currentInnings.battingTeamId === match.homeTeamId ? match.homeXI : match.awayXI;
  const updatedInnings = applyBallToInnings(
    currentInnings,
    ballOutcome,
    battingXI,
    nameMap,
    match.format
  );

  // If over finished and innings is still active, pick new bowler
  if (updatedInnings.ballsInCurrentOver === 0 && !updatedInnings.isCompleted && ballOutcome.isLegalDelivery) {
    const bowlingXI = updatedInnings.bowlingTeamId === match.homeTeamId ? match.homeXI : match.awayXI;
    updatedInnings.currentBowlerId = selectNextBowler(match, updatedInnings, bowlingXI);
  }

  const updatedInningsList = [...match.innings];
  updatedInningsList[match.currentInningsIndex] = updatedInnings;

  let nextMatchStatus: Match['status'] = match.status;
  let finalResultText = match.resultText;
  let finalPotm = match.playerOfTheMatch;

  // Check if 2nd innings ended or match completed
  if (updatedInnings.isCompleted) {
    if (match.currentInningsIndex === 1 || match.format === 'TEST') {
      const { resultText, potm } = computeMatchResult({ ...match, innings: updatedInningsList });
      nextMatchStatus = 'COMPLETED';
      finalResultText = resultText;
      finalPotm = potm;
    }
  }

  return {
    ...match,
    status: nextMatchStatus,
    innings: updatedInningsList,
    resultText: finalResultText,
    playerOfTheMatch: finalPotm,
  };
}

/**
 * Simulates an entire over (or until innings completion)
 */
export function stepMatchOver(match: Match): Match {
  let current = match;
  if (current.status === 'COMPLETED') return current;

  const currentInn = current.innings[current.currentInningsIndex];
  if (!currentInn) return stepMatchBall(current);

  const startingOver = currentInn.completedOvers;
  let iterations = 0;

  while (
    current.status === 'IN_PROGRESS' &&
    current.innings[current.currentInningsIndex] &&
    !current.innings[current.currentInningsIndex].isCompleted &&
    current.innings[current.currentInningsIndex].completedOvers === startingOver &&
    iterations < 20
  ) {
    current = stepMatchBall(current);
    iterations++;
  }

  return current;
}

/**
 * Simulates until current innings finishes
 */
export function stepMatchInnings(match: Match): Match {
  let current = match;
  if (current.status === 'COMPLETED') return current;

  const targetInnIdx = current.currentInningsIndex;
  let iterations = 0;

  while (
    current.status === 'IN_PROGRESS' &&
    current.currentInningsIndex === targetInnIdx &&
    current.innings[targetInnIdx] &&
    !current.innings[targetInnIdx].isCompleted &&
    iterations < 400
  ) {
    current = stepMatchBall(current);
    iterations++;
  }

  return current;
}

/**
 * Simulates entire match to completion
 */
export function simulateFullMatch(match: Match): Match {
  let current = match;

  // If match has not started yet (SCHEDULED or TOSS), conduct toss and initialize first innings
  if (current.status === 'SCHEDULED' || current.status === 'TOSS') {
    const tossWinnerId = Math.random() > 0.5 ? current.homeTeamId : current.awayTeamId;
    const tossChoice = Math.random() > 0.4 ? 'BAT' : 'BOWL';
    const battingFirstId =
      (tossWinnerId === current.homeTeamId && tossChoice === 'BAT') ||
      (tossWinnerId === current.awayTeamId && tossChoice === 'BOWL')
        ? current.homeTeamId
        : current.awayTeamId;
    const bowlingFirstId = battingFirstId === current.homeTeamId ? current.awayTeamId : current.homeTeamId;

    const battingXI = battingFirstId === current.homeTeamId ? current.homeXI : current.awayXI;
    const bowlingXI = bowlingFirstId === current.homeTeamId ? current.homeXI : current.awayXI;

    const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === current.homeTeamId);
    const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === current.awayTeamId);

    const battingTeamName = battingFirstId === current.homeTeamId ? (homeTeam?.name || current.homeTeamId) : (awayTeam?.name || current.awayTeamId);
    const bowlingTeamName = bowlingFirstId === current.homeTeamId ? (homeTeam?.name || current.homeTeamId) : (awayTeam?.name || current.awayTeamId);

    const firstInnings = createInitialInningsState(
      1,
      battingFirstId,
      battingTeamName,
      bowlingFirstId,
      bowlingTeamName,
      battingXI,
      bowlingXI
    );

    current = {
      ...current,
      status: 'IN_PROGRESS',
      tossWinnerId,
      tossChoice,
      currentInningsIndex: 0,
      innings: [firstInnings],
    };
  }

  let iterations = 0;
  while (current.status !== 'COMPLETED' && iterations < 800) {
    current = stepMatchBall(current);
    iterations++;
  }

  // Ensure result text is set if completed
  if (current.status === 'COMPLETED' && !current.resultText) {
    const res = computeMatchResult(current);
    current = {
      ...current,
      resultText: res.resultText,
      playerOfTheMatch: res.potm,
    };
  }

  return current;
}

