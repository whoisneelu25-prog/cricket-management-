import {
  Match,
  MatchFormat,
  MatchStatus,
  Player,
  InningsState,
  BallOutcome,
  BattingAggression,
  BowlingTactic,
  FieldPreset,
  BatterInningsScore,
  BowlerInningsFigures,
  DismissalType,
  CareerSave,
  FormatStats,
} from '../types/cricket';
import { ALL_PLAYERS, createEmptyFormatStats, getEffectivePlayer } from '../data/squads';
import { INTERNATIONAL_TEAMS } from '../data/teams';
import { simulateDelivery, setSimulationSeed, mulberry32 } from './simulation';
export { mulberry32 };
import { applyBallToInnings, isInningsComplete, getMaxOversPerBowler } from './rules';

let activeSimulationCareer: CareerSave | undefined = undefined;

export function withCareerSimulationContext<T>(career: CareerSave | undefined, fn: () => T): T {
  const prev = activeSimulationCareer;
  activeSimulationCareer = career;
  try {
    return fn();
  } finally {
    activeSimulationCareer = prev;
  }
}

export function isTerminalMatchStatus(status: MatchStatus): boolean {
  return (
    status === 'COMPLETED' ||
    status === 'DRAW' ||
    status === 'TIE' ||
    status === 'ABANDONED' ||
    status === 'NO_RESULT'
  );
}

export function isPreMatchStatus(status: MatchStatus): boolean {
  return (
    status === 'SCHEDULED' ||
    status === 'AWAITING_SQUAD' ||
    status === 'AWAITING_XI' ||
    status === 'READY' ||
    status === 'TOSS'
  );
}

/**
 * Returns Player object by ID from the player database (merged with active career overrides if present)
 */
export function getPlayerById(playerId: string, career?: CareerSave): Player {
  const effective = getEffectivePlayer(playerId, career || activeSimulationCareer);
  if (effective) return effective;

  const found = ALL_PLAYERS.find((p) => p.id === playerId);
  if (found) return found;

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
      TEST: { matches: 0, innings: 0, runs: 0, highestScore: 0, highestScoreNotOut: false, average: 0, strikeRate: 0, centuries: 0, fifties: 0, fours: 0, sixes: 0, ducks: 0, notOuts: 0, bowlingInnings: 0, oversBowled: 0, maidens: 0, runsConceded: 0, wickets: 0, bestBowlingWickets: 0, bestBowlingRuns: 0, bowlingAverage: 0, economy: 0, bowlingStrikeRate: 0, fiveWicketHauls: 0, tenWicketHauls: 0, catches: 0, stumpings: 0, runOuts: 0 },
      ODI: { matches: 0, innings: 0, runs: 0, highestScore: 0, highestScoreNotOut: false, average: 0, strikeRate: 0, centuries: 0, fifties: 0, fours: 0, sixes: 0, ducks: 0, notOuts: 0, bowlingInnings: 0, oversBowled: 0, maidens: 0, runsConceded: 0, wickets: 0, bestBowlingWickets: 0, bestBowlingRuns: 0, bowlingAverage: 0, economy: 0, bowlingStrikeRate: 0, fiveWicketHauls: 0, tenWicketHauls: 0, catches: 0, stumpings: 0, runOuts: 0 },
      T20I: { matches: 0, innings: 0, runs: 0, highestScore: 0, highestScoreNotOut: false, average: 0, strikeRate: 0, centuries: 0, fifties: 0, fours: 0, sixes: 0, ducks: 0, notOuts: 0, bowlingInnings: 0, oversBowled: 0, maidens: 0, runsConceded: 0, wickets: 0, bestBowlingWickets: 0, bestBowlingRuns: 0, bowlingAverage: 0, economy: 0, bowlingStrikeRate: 0, fiveWicketHauls: 0, tenWicketHauls: 0, catches: 0, stumpings: 0, runOuts: 0 },
    }
  };
}

/**
 * Generates a numeric seed from match ID
 */
export function getMatchSeed(match: Match, ballOffset = 0): number {
  if (match.seed !== undefined) return match.seed + ballOffset;
  let hash = 0;
  for (let i = 0; i < match.id.length; i++) {
    hash = (hash << 5) - hash + match.id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + ballOffset;
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

  // Opening bowler is chosen from primary bowlers
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
 * Chooses next bowler for bowling side adhering strictly to format over quotas
 * and preventing consecutive overs by the same bowler.
 */
export function selectNextBowler(
  match: Match,
  currentInnings: InningsState,
  bowlingXI: string[]
): string {
  const prevBowlerId = currentInnings.currentBowlerId;
  const eligibleBowlers = bowlingXI.filter((id) => id !== prevBowlerId);

  // Maximum quota per bowler
  const maxOvers = getMaxOversPerBowler(match.format);

  const available = eligibleBowlers.filter((id) => {
    const figures = currentInnings.bowlers.find((b) => b.playerId === id);
    return !figures || figures.overs < maxOvers;
  });

  if (available.length === 0) return eligibleBowlers[0] || bowlingXI[0];

  // Pick bowler based on wicket-taking and accuracy
  available.sort((a, b) => {
    const playerA = getPlayerById(a);
    const playerB = getPlayerById(b);
    return (
      playerB.attributes.wicketTaking * 0.6 + playerB.attributes.accuracy * 0.4 -
      (playerA.attributes.wicketTaking * 0.6 + playerA.attributes.accuracy * 0.4)
    );
  });

  return available[0];
}

export interface MatchOutcomeSummary {
  winnerTeamId: string | null;
  loserTeamId: string | null;
  isDraw: boolean;
  isTie: boolean;
  isNoResult: boolean;
  homeTotalRuns: number;
  awayTotalRuns: number;
  homeEffectiveOvers: number;
  awayEffectiveOvers: number;
}

/**
 * Canonical match outcome calculator across Test (2/3/4 innings), ODI, and T20I (including Super Overs).
 */
export function determineMatchOutcome(match: Match): MatchOutcomeSummary {
  const maxQuotaOvers = match.format === 'T20I' ? 20 : match.format === 'ODI' ? 50 : 0;

  let homeTotalRuns = 0;
  let awayTotalRuns = 0;
  let homeEffectiveOvers = 0;
  let awayEffectiveOvers = 0;

  (match.innings || []).forEach((inn) => {
    const balls = inn.ballsInCurrentOver || 0;
    const rawOvers = (inn.completedOvers || 0) + balls / 6;
    const isAllOut = inn.wickets >= 10 || !!inn.isAllOut;
    const effOvers =
      maxQuotaOvers > 0 && isAllOut ? maxQuotaOvers : Math.max(0.1, Number(rawOvers.toFixed(2)));

    if (inn.battingTeamId === match.homeTeamId) {
      homeTotalRuns += inn.totalRuns || 0;
      homeEffectiveOvers += effOvers;
    } else if (inn.battingTeamId === match.awayTeamId) {
      awayTotalRuns += inn.totalRuns || 0;
      awayEffectiveOvers += effOvers;
    }
  });

  if (match.status === 'ABANDONED' || match.status === 'NO_RESULT') {
    return {
      winnerTeamId: null,
      loserTeamId: null,
      isDraw: false,
      isTie: false,
      isNoResult: true,
      homeTotalRuns,
      awayTotalRuns,
      homeEffectiveOvers,
      awayEffectiveOvers,
    };
  }

  if (match.status === 'DRAW') {
    return {
      winnerTeamId: null,
      loserTeamId: null,
      isDraw: true,
      isTie: false,
      isNoResult: false,
      homeTotalRuns,
      awayTotalRuns,
      homeEffectiveOvers,
      awayEffectiveOvers,
    };
  }

  if (match.winnerTeamId) {
    const winner = match.winnerTeamId;
    const loser = winner === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
    return {
      winnerTeamId: winner,
      loserTeamId: loser,
      isDraw: false,
      isTie: false,
      isNoResult: false,
      homeTotalRuns,
      awayTotalRuns,
      homeEffectiveOvers,
      awayEffectiveOvers,
    };
  }

  if (homeTotalRuns === awayTotalRuns) {
    if (match.superOverPlayed && match.superOverInnings && match.superOverInnings.length >= 2) {
      const s1 = match.superOverInnings[0];
      const s2 = match.superOverInnings[1];
      if (s2.totalRuns > s1.totalRuns) {
        const winner = s2.battingTeamId;
        return {
          winnerTeamId: winner,
          loserTeamId: winner === match.homeTeamId ? match.awayTeamId : match.homeTeamId,
          isDraw: false,
          isTie: false,
          isNoResult: false,
          homeTotalRuns,
          awayTotalRuns,
          homeEffectiveOvers,
          awayEffectiveOvers,
        };
      } else if (s1.totalRuns > s2.totalRuns) {
        const winner = s1.battingTeamId;
        return {
          winnerTeamId: winner,
          loserTeamId: winner === match.homeTeamId ? match.awayTeamId : match.homeTeamId,
          isDraw: false,
          isTie: false,
          isNoResult: false,
          homeTotalRuns,
          awayTotalRuns,
          homeEffectiveOvers,
          awayEffectiveOvers,
        };
      }
    }
    return {
      winnerTeamId: null,
      loserTeamId: null,
      isDraw: false,
      isTie: true,
      isNoResult: false,
      homeTotalRuns,
      awayTotalRuns,
      homeEffectiveOvers,
      awayEffectiveOvers,
    };
  }

  if (match.status === 'TIE') {
    return {
      winnerTeamId: null,
      loserTeamId: null,
      isDraw: false,
      isTie: true,
      isNoResult: false,
      homeTotalRuns,
      awayTotalRuns,
      homeEffectiveOvers,
      awayEffectiveOvers,
    };
  }

  const winnerTeamId = homeTotalRuns > awayTotalRuns ? match.homeTeamId : match.awayTeamId;
  const loserTeamId = winnerTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;

  return {
    winnerTeamId,
    loserTeamId,
    isDraw: false,
    isTie: false,
    isNoResult: false,
    homeTotalRuns,
    awayTotalRuns,
    homeEffectiveOvers,
    awayEffectiveOvers,
  };
}

/**
 * Calculates official match result text across Test, ODI, and T20I formats.
 */
export function computeMatchResult(match: Match): {
  resultText: string;
  winnerTeamId?: string;
  potm: { playerId: string; playerName: string; reason: string };
} {
  const innings = match.innings;
  let resultText = '';
  let winningTeamId = '';

  if (match.format === 'TEST') {
    // TEST CRICKET RESULT LOGIC (Up to 4 innings)
    const inn1 = innings[0];
    const inn2 = innings[1];
    const inn3 = innings[2];
    const inn4 = innings[3];

    if (!inn1 || !inn2) {
      resultText = 'Match in progress';
    } else if (match.followOnEnforced && inn3 && inn3.isCompleted) {
      // Follow-on scenario: Team B batted Innings 2 and Innings 3
      const teamARuns = inn1.totalRuns;
      const teamBCombined = inn2.totalRuns + inn3.totalRuns;

      if (teamBCombined < teamARuns) {
        // Innings victory for Team A!
        const margin = teamARuns - teamBCombined;
        resultText = `${inn1.battingTeamName} won by an innings and ${margin} runs!`;
        winningTeamId = inn1.battingTeamId;
      } else if (inn4 && inn4.isCompleted) {
        if (inn4.targetRuns && inn4.totalRuns >= inn4.targetRuns) {
          const wkts = 10 - inn4.wickets;
          resultText = `${inn4.battingTeamName} won by ${wkts} wicket${wkts > 1 ? 's' : ''}!`;
          winningTeamId = inn4.battingTeamId;
        } else if (inn4.wickets >= 10) {
          const runMargin = (inn4.targetRuns || 0) - inn4.totalRuns - 1;
          resultText = `${inn4.bowlingTeamName} won by ${Math.max(1, runMargin)} runs!`;
          winningTeamId = inn4.bowlingTeamId;
        }
      }
    } else if (inn4 && inn4.isCompleted) {
      // Standard 4th innings chase
      if (inn4.targetRuns && inn4.totalRuns >= inn4.targetRuns) {
        const wkts = 10 - inn4.wickets;
        resultText = `${inn4.battingTeamName} won by ${wkts} wicket${wkts > 1 ? 's' : ''}!`;
        winningTeamId = inn4.battingTeamId;
      } else if (inn4.wickets >= 10) {
        const teamACombined = inn1.battingTeamId === inn4.bowlingTeamId
          ? inn1.totalRuns + (inn3 ? inn3.totalRuns : 0)
          : inn2.totalRuns + (inn4 ? inn4.totalRuns : 0);
        const teamBCombined = inn1.battingTeamId === inn4.battingTeamId
          ? inn1.totalRuns + inn4.totalRuns
          : inn2.totalRuns + inn4.totalRuns;

        if (teamACombined === teamBCombined) {
          resultText = 'Match Tied! Historic Test Tie!';
        } else {
          const runMargin = Math.abs(teamACombined - teamBCombined);
          resultText = `${inn4.bowlingTeamName} won by ${runMargin} runs!`;
          winningTeamId = inn4.bowlingTeamId;
        }
      } else {
        resultText = 'Match Drawn';
      }
    } else if (match.dayNumber >= 5 && (match.oversBowledToday || 0) >= 90) {
      resultText = 'Match Drawn';
    } else {
      resultText = 'Match Drawn';
    }
  } else {
    // WHITE-BALL CRICKET RESULT LOGIC (ODI & T20I)
    const inn1 = innings[0];
    const inn2 = innings[1];

    if (!inn1 || !inn2) {
      resultText = 'Match in progress';
    } else if (inn2.targetRuns && inn2.totalRuns >= inn2.targetRuns) {
      const wktsLeft = 10 - inn2.wickets;
      resultText = `${inn2.battingTeamName} won by ${wktsLeft} wicket${wktsLeft > 1 ? 's' : ''}`;
      winningTeamId = inn2.battingTeamId;
    } else if (inn2.isCompleted || inn2.completedOvers >= (match.format === 'T20I' ? 20 : 50) || inn2.wickets >= 10) {
      if (inn2.totalRuns === inn1.totalRuns) {
        if (match.superOverPlayed && match.superOverInnings && match.superOverInnings.length >= 2) {
          const s1 = match.superOverInnings[0];
          const s2 = match.superOverInnings[1];
          if (s2.totalRuns > s1.totalRuns) {
            resultText = `${s2.battingTeamName} won via Super Over (${s2.totalRuns} vs ${s1.totalRuns})!`;
          } else if (s1.totalRuns > s2.totalRuns) {
            resultText = `${s1.battingTeamName} won via Super Over (${s1.totalRuns} vs ${s2.totalRuns})!`;
          } else {
            resultText = 'Match Tied (Super Over Tied)!';
          }
        } else {
          resultText = 'Match Tied!';
        }
      } else {
        const runMargin = inn1.totalRuns - inn2.totalRuns;
        resultText = `${inn1.battingTeamName} won by ${runMargin} run${runMargin > 1 ? 's' : ''}`;
        winningTeamId = inn1.battingTeamId;
      }
    } else {
      resultText = 'Match in progress';
    }
  }

  // Find Player of the Match across all match innings
  let bestScore = -1;
  let topPlayerId = match.homeCaptainId;
  let topPlayerReason = 'Solid match performance';

  for (const inn of innings) {
    for (const b of inn.batters) {
      const batScore = b.runs * 1.25 + b.fours * 2 + b.sixes * 4 + (b.runs >= 100 ? 30 : b.runs >= 50 ? 15 : 0);
      if (batScore > bestScore) {
        bestScore = batScore;
        topPlayerId = b.playerId;
        topPlayerReason = `Magnificent batting: ${b.runs} runs (${b.balls}b, ${b.fours}x4, ${b.sixes}x6)`;
      }
    }
    for (const bw of inn.bowlers) {
      const bowlScore = bw.wickets * 35 + bw.maidens * 15 + bw.dots * 0.5 - bw.runs * 0.4 + (bw.wickets >= 5 ? 30 : 0);
      if (bowlScore > bestScore) {
        bestScore = bowlScore;
        topPlayerId = bw.playerId;
        topPlayerReason = `Exceptional bowling figures: ${bw.wickets}/${bw.runs} in ${bw.overs}.${bw.ballsThisOver} overs`;
      }
    }
  }

  const potmPlayer = getPlayerById(topPlayerId);

  return {
    resultText,
    winnerTeamId: winningTeamId || undefined,
    potm: {
      playerId: potmPlayer.id,
      playerName: potmPlayer.shortName || potmPlayer.name,
      reason: topPlayerReason,
    },
  };
}

/**
 * Advances scheduled day and session in Test cricket.
 * 90 overs per day divided into 3 sessions of 30 overs:
 * - Session 1: Overs 1–30 (Morning)
 * - Session 2: Overs 31–60 (Afternoon)
 * - Session 3: Overs 61–90 (Evening)
 */
export function advanceTestMatchSession(match: Match): Match {
  if (match.format !== 'TEST') return match;

  const currentOversToday = (match.oversBowledToday || 0) + 1;
  let dayNumber = match.dayNumber || 1;
  let sessionNumber = match.sessionNumber || 1;
  let oversToday = currentOversToday;

  if (currentOversToday >= 90) {
    // Day completed
    dayNumber += 1;
    sessionNumber = 1;
    oversToday = 0;
  } else if (currentOversToday >= 60) {
    sessionNumber = 3;
  } else if (currentOversToday >= 30) {
    sessionNumber = 2;
  }

  // Check if Day 5 is exhausted -> match drawn
  if (dayNumber > 5) {
    return {
      ...match,
      status: 'DRAW',
      resultText: 'Match Drawn (Time Expired on Day 5)',
    };
  }

  return {
    ...match,
    dayNumber,
    sessionNumber,
    oversBowledToday: oversToday,
  };
}

/**
 * Simulates a single delivery within the active match with full multi-innings state machine
 */
export function stepMatchBall(matchInput: Match): Match {
  if (isTerminalMatchStatus(matchInput.status)) {
    return matchInput;
  }

  let match = matchInput;
  if (isPreMatchStatus(match.status)) {
    const tossRand = match.seed ? mulberry32(match.seed) : Math.random;
    const tossWinnerId = tossRand() > 0.5 ? match.homeTeamId : match.awayTeamId;
    const tossChoice = tossRand() > 0.4 ? 'BAT' : 'BOWL';
    const battingFirstId =
      (tossWinnerId === match.homeTeamId && tossChoice === 'BAT') ||
      (tossWinnerId === match.awayTeamId && tossChoice === 'BOWL')
        ? match.homeTeamId
        : match.awayTeamId;
    const bowlingFirstId = battingFirstId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;

    const battingXI = battingFirstId === match.homeTeamId ? match.homeXI : match.awayXI;
    const bowlingXI = bowlingFirstId === match.homeTeamId ? match.homeXI : match.awayXI;

    const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.homeTeamId);
    const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.awayTeamId);

    const battingTeamName =
      battingFirstId === match.homeTeamId ? homeTeam?.name || match.homeTeamId : awayTeam?.name || match.awayTeamId;
    const bowlingTeamName =
      bowlingFirstId === match.homeTeamId ? homeTeam?.name || match.homeTeamId : awayTeam?.name || match.awayTeamId;

    const firstInnings = createInitialInningsState(
      1,
      battingFirstId,
      battingTeamName,
      bowlingFirstId,
      bowlingTeamName,
      battingXI,
      bowlingXI
    );

    match = {
      ...match,
      status: 'IN_PROGRESS',
      tossWinnerId,
      tossChoice,
      currentInningsIndex: 0,
      innings: [firstInnings],
      dayNumber: 1,
      sessionNumber: 1,
      oversBowledToday: 0,
    };
  }

  const currentInnings = match.innings[match.currentInningsIndex];

  // 1. INNINGS TRANSITION STATE MACHINE
  if (!currentInnings || currentInnings.isCompleted) {
    if (match.format === 'TEST') {
      // TEST 4-INNINGS SYSTEM
      if (match.currentInningsIndex === 0) {
        // Transition from Innings 1 to Innings 2
        const nextBattingId = currentInnings.bowlingTeamId;
        const nextBowlingId = currentInnings.battingTeamId;
        const nextBattingXI = nextBattingId === match.homeTeamId ? match.homeXI : match.awayXI;
        const nextBowlingXI = nextBowlingId === match.homeTeamId ? match.homeXI : match.awayXI;
        const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.homeTeamId);
        const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.awayTeamId);

        const inn2 = createInitialInningsState(
          2,
          nextBattingId,
          nextBattingId === match.homeTeamId ? homeTeam?.name || nextBattingId : awayTeam?.name || nextBattingId,
          nextBowlingId,
          nextBowlingId === match.homeTeamId ? homeTeam?.name || nextBowlingId : awayTeam?.name || nextBowlingId,
          nextBattingXI,
          nextBowlingXI
        );

        return {
          ...match,
          currentInningsIndex: 1,
          innings: [...match.innings, inn2],
        };
      } else if (match.currentInningsIndex === 1) {
        // Check Follow-On after Innings 2 completes
        const inn1 = match.innings[0];
        const inn2 = match.innings[1];
        const deficit = inn1.totalRuns - inn2.totalRuns;

        // In a 5-day Test, lead of >= 200 allows follow-on
        const isFollowOnEligible = deficit >= 200;
        let followOnEnforced = match.followOnEnforced;

        if (isFollowOnEligible && followOnEnforced === undefined) {
          // AI decision: if leading by >= 220, enforce follow-on
          const team1IsUser = inn1.battingTeamId === match.userTeamId;
          if (!team1IsUser) {
            followOnEnforced = deficit >= 220;
          } else {
            // Default enforce if lead >= 220
            followOnEnforced = deficit >= 220;
          }
        }

        // Innings 3 Batting Team:
        // If follow-on enforced: Team B bats again (inn2.battingTeamId)
        // If follow-on not enforced: Team A bats again (inn1.battingTeamId)
        const nextBattingId = followOnEnforced ? inn2.battingTeamId : inn1.battingTeamId;
        const nextBowlingId = followOnEnforced ? inn1.battingTeamId : inn2.battingTeamId;
        const nextBattingXI = nextBattingId === match.homeTeamId ? match.homeXI : match.awayXI;
        const nextBowlingXI = nextBowlingId === match.homeTeamId ? match.homeXI : match.awayXI;
        const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.homeTeamId);
        const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.awayTeamId);

        const inn3 = createInitialInningsState(
          3,
          nextBattingId,
          nextBattingId === match.homeTeamId ? homeTeam?.name || nextBattingId : awayTeam?.name || nextBattingId,
          nextBowlingId,
          nextBowlingId === match.homeTeamId ? homeTeam?.name || nextBowlingId : awayTeam?.name || nextBowlingId,
          nextBattingXI,
          nextBowlingXI
        );

        return {
          ...match,
          isFollowOnEligible,
          followOnEnforced,
          currentInningsIndex: 2,
          innings: [...match.innings, inn3],
        };
      } else if (match.currentInningsIndex === 2) {
        // Transition from Innings 3 to Innings 4 or Innings Victory
        const inn1 = match.innings[0];
        const inn2 = match.innings[1];
        const inn3 = match.innings[2];

        if (match.followOnEnforced) {
          // Follow-on was enforced: Team B batted Innings 3
          const teamBCombined = inn2.totalRuns + inn3.totalRuns;
          if (teamBCombined < inn1.totalRuns) {
            // Team B did not clear the deficit! Team A wins by an Innings!
            const { resultText, potm } = computeMatchResult(match);
            return {
              ...match,
              status: 'COMPLETED',
              resultText,
              playerOfTheMatch: potm,
            };
          }
          // Team B cleared deficit; Team A needs (teamBCombined - inn1.totalRuns + 1) in Innings 4
          const target = teamBCombined - inn1.totalRuns + 1;
          const nextBattingId = inn1.battingTeamId;
          const nextBowlingId = inn2.battingTeamId;
          const nextBattingXI = nextBattingId === match.homeTeamId ? match.homeXI : match.awayXI;
          const nextBowlingXI = nextBowlingId === match.homeTeamId ? match.homeXI : match.awayXI;
          const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.homeTeamId);
          const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.awayTeamId);

          const inn4 = createInitialInningsState(
            4,
            nextBattingId,
            nextBattingId === match.homeTeamId ? homeTeam?.name || nextBattingId : awayTeam?.name || nextBattingId,
            nextBowlingId,
            nextBowlingId === match.homeTeamId ? homeTeam?.name || nextBowlingId : awayTeam?.name || nextBowlingId,
            nextBattingXI,
            nextBowlingXI,
            target
          );

          return {
            ...match,
            currentInningsIndex: 3,
            innings: [...match.innings, inn4],
          };
        } else {
          // Normal: Team A batted Innings 3; Team B chases in Innings 4
          const teamACombined = inn1.totalRuns + inn3.totalRuns;
          const target = teamACombined - inn2.totalRuns + 1;

          const nextBattingId = inn2.battingTeamId;
          const nextBowlingId = inn1.battingTeamId;
          const nextBattingXI = nextBattingId === match.homeTeamId ? match.homeXI : match.awayXI;
          const nextBowlingXI = nextBowlingId === match.homeTeamId ? match.homeXI : match.awayXI;
          const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.homeTeamId);
          const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.awayTeamId);

          const inn4 = createInitialInningsState(
            4,
            nextBattingId,
            nextBattingId === match.homeTeamId ? homeTeam?.name || nextBattingId : awayTeam?.name || nextBattingId,
            nextBowlingId,
            nextBowlingId === match.homeTeamId ? homeTeam?.name || nextBowlingId : awayTeam?.name || nextBowlingId,
            nextBattingXI,
            nextBowlingXI,
            target
          );

          return {
            ...match,
            currentInningsIndex: 3,
            innings: [...match.innings, inn4],
          };
        }
      } else {
        // Innings 4 completed -> Test Match finished!
        const { resultText, potm } = computeMatchResult(match);
        return {
          ...match,
          status: 'COMPLETED',
          resultText,
          playerOfTheMatch: potm,
        };
      }
    } else {
      // LIMITED OVERS (ODI & T20I)
      if (match.currentInningsIndex === 0) {
        const nextBattingId = currentInnings.bowlingTeamId;
        const nextBattingName = currentInnings.bowlingTeamName;
        const nextBowlingId = currentInnings.battingTeamId;
        const nextBowlingName = currentInnings.battingTeamName;
        const nextBattingXI = nextBattingId === match.homeTeamId ? match.homeXI : match.awayXI;
        const nextBowlingXI = nextBowlingId === match.homeTeamId ? match.homeXI : match.awayXI;
        const target = currentInnings.totalRuns + 1;

        const innings2 = createInitialInningsState(
          2,
          nextBattingId,
          nextBattingName,
          nextBowlingId,
          nextBowlingName,
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
        // 2nd innings complete -> Check for Super Over in T20I tie
        const inn1 = match.innings[0];
        const inn2 = match.innings[1];
        if (match.format === 'T20I' && inn1.totalRuns === inn2.totalRuns && !match.superOverPlayed) {
          return simulateSuperOver(match);
        }

        const { resultText, potm } = computeMatchResult(match);
        return {
          ...match,
          status: 'COMPLETED',
          resultText,
          playerOfTheMatch: potm,
        };
      }
    }
  }

  // 2. SIMULATE ACTIVE DELIVERY
  const striker = getPlayerById(currentInnings.currentStrikerId);
  const nonStriker = getPlayerById(currentInnings.currentNonStrikerId);
  const bowler = getPlayerById(currentInnings.currentBowlerId);

  const isUserBatting = currentInnings.battingTeamId === match.userTeamId;
  const tactics = isUserBatting ? match.userTactics : match.aiTactics;
  const bowlingTactics = isUserBatting ? match.aiTactics : match.userTactics;

  const strikerScore = currentInnings.batters.find((b) => b.playerId === striker.id);
  const strikerBallsFaced = strikerScore ? strikerScore.balls : 0;
  const strikerRunsScored = strikerScore ? strikerScore.runs : 0;

  // Total deliveries counter for deterministic PRNG (incorporating innings index so each innings simulates uniquely)
  const deliveryIndex =
    match.currentInningsIndex * 10000 +
    currentInnings.completedOvers * 6 +
    currentInnings.ballsInCurrentOver +
    currentInnings.extras.wides +
    currentInnings.extras.noBalls;
  const ballSeed = getMatchSeed(match, deliveryIndex);

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
    dayNumber: match.dayNumber,
    sessionNumber: match.sessionNumber,
    seed: ballSeed,
    strikerBallsFaced,
    strikerRunsScored,
  });

  const nameMap: Record<string, string> = {};
  ALL_PLAYERS.forEach((p) => {
    nameMap[p.id] = p.shortName;
  });
  (activeSimulationCareer?.emergingPlayers || []).forEach((p) => {
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

  let updatedMatch: Match = {
    ...match,
    innings: updatedInningsList,
  };

  // Advance session/day for Test cricket on legal ball over completion
  if (match.format === 'TEST' && ballOutcome.isLegalDelivery && updatedInnings.ballsInCurrentOver === 0) {
    updatedMatch = advanceTestMatchSession(updatedMatch);
  }

  // Check if match completed on this ball (e.g. target reached in final innings or innings victory)
  if (updatedInnings.isCompleted && !isTerminalMatchStatus(updatedMatch.status)) {
    if (match.format === 'TEST') {
      const isInningsVictoryOnFollowOn =
        match.followOnEnforced &&
        match.currentInningsIndex === 2 &&
        match.innings[1] &&
        match.innings[0] &&
        match.innings[1].totalRuns + updatedInnings.totalRuns < match.innings[0].totalRuns;

      if (match.currentInningsIndex === 3 || isInningsVictoryOnFollowOn) {
        const { resultText, winnerTeamId, potm } = computeMatchResult(updatedMatch);
        updatedMatch.status = resultText.includes('Tied') ? 'TIE' : resultText.includes('Drawn') ? 'DRAW' : 'COMPLETED';
        updatedMatch.winnerTeamId = winnerTeamId;
        updatedMatch.resultText = resultText;
        updatedMatch.playerOfTheMatch = potm;
      }
    } else if (match.currentInningsIndex === 1) {
      const isScoresTied = match.innings[0].totalRuns === updatedInnings.totalRuns;
      const isKnockout = match.stage === 'SEMI_FINAL' || match.stage === 'FINAL';
      if (isScoresTied && (match.format === 'T20I' || isKnockout) && !match.superOverPlayed) {
        return simulateSuperOver(updatedMatch);
      }
      const { resultText, winnerTeamId, potm } = computeMatchResult(updatedMatch);
      updatedMatch.status = isScoresTied ? 'TIE' : 'COMPLETED';
      updatedMatch.winnerTeamId = winnerTeamId;
      updatedMatch.resultText = resultText;
      updatedMatch.playerOfTheMatch = potm;
    }
  }

  return updatedMatch;
}

/**
 * Executes a captain's declaration in Test cricket
 */
export function declareInnings(match: Match): Match {
  if (match.format !== 'TEST' || match.status !== 'IN_PROGRESS') return match;

  const currentInn = match.innings[match.currentInningsIndex];
  if (!currentInn || currentInn.isCompleted) return match;

  const declaredInnings: InningsState = {
    ...currentInn,
    isDeclared: true,
    isCompleted: true,
  };

  const nextInningsList = [...match.innings];
  nextInningsList[match.currentInningsIndex] = declaredInnings;

  return stepMatchBall({
    ...match,
    innings: nextInningsList,
  });
}

/**
 * Conducts a Super Over for tied T20I / knockout matches (1 over per team, 2 wickets ends innings)
 */
export function simulateSuperOver(match: Match): Match {
  const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.homeTeamId);
  const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.awayTeamId);

  // Super Over: 3 batters, 1 over (6 balls)
  const team1Batters = match.homeXI.slice(0, 3);
  const team2Batters = match.awayXI.slice(0, 3);
  const team1Bowler = match.homeXI[match.homeXI.length - 1];
  const team2Bowler = match.awayXI[match.awayXI.length - 1];

  // Team 1 Super Over Innings
  const s1 = createInitialInningsState(
    1,
    match.homeTeamId,
    homeTeam?.name || match.homeTeamId,
    match.awayTeamId,
    awayTeam?.name || match.awayTeamId,
    team1Batters,
    [team2Bowler]
  );

  let currentS1 = s1;
  for (let b = 0; b < 6; b++) {
    if (currentS1.wickets >= 2) break;
    const outcome = simulateDelivery({
      format: 'T20I',
      striker: getPlayerById(currentS1.currentStrikerId),
      nonStriker: getPlayerById(currentS1.currentNonStrikerId),
      bowler: getPlayerById(team2Bowler),
      pitch: match.pitch,
      weather: match.weather,
      overNumber: 0,
      ballInOver: b,
      currentScore: currentS1.totalRuns,
      wicketsLost: currentS1.wickets,
      battingAggression: 'SMASH',
      bowlingTactic: 'YORKER_DEATH',
      fieldPreset: 'DEATH_PROTECT',
      overCompletedOvers: 0,
      seed: getMatchSeed(match, 9000 + b * 17),
    });

    const nameMap: Record<string, string> = {};
    team1Batters.forEach((id) => (nameMap[id] = getPlayerById(id).shortName));
    currentS1 = applyBallToInnings(currentS1, outcome, team1Batters, nameMap, 'T20I');
  }

  // Team 2 Super Over Innings (chasing s1.totalRuns + 1)
  const s2 = createInitialInningsState(
    2,
    match.awayTeamId,
    awayTeam?.name || match.awayTeamId,
    match.homeTeamId,
    homeTeam?.name || match.homeTeamId,
    team2Batters,
    [team1Bowler],
    currentS1.totalRuns + 1
  );

  let currentS2 = s2;
  for (let b = 0; b < 6; b++) {
    if (currentS2.wickets >= 2 || currentS2.totalRuns >= (currentS1.totalRuns + 1)) break;
    const outcome = simulateDelivery({
      format: 'T20I',
      striker: getPlayerById(currentS2.currentStrikerId),
      nonStriker: getPlayerById(currentS2.currentNonStrikerId),
      bowler: getPlayerById(team1Bowler),
      pitch: match.pitch,
      weather: match.weather,
      overNumber: 0,
      ballInOver: b,
      currentScore: currentS2.totalRuns,
      wicketsLost: currentS2.wickets,
      targetRuns: currentS1.totalRuns + 1,
      battingAggression: 'SMASH',
      bowlingTactic: 'YORKER_DEATH',
      fieldPreset: 'DEATH_PROTECT',
      overCompletedOvers: 0,
      seed: getMatchSeed(match, 9500 + b * 19),
    });

    const nameMap: Record<string, string> = {};
    team2Batters.forEach((id) => (nameMap[id] = getPlayerById(id).shortName));
    currentS2 = applyBallToInnings(currentS2, outcome, team2Batters, nameMap, 'T20I');
  }

  let winnerTeamId: string | undefined;
  let superOverWinner: string;
  if (currentS2.totalRuns > currentS1.totalRuns) {
    winnerTeamId = match.awayTeamId;
    superOverWinner = awayTeam?.name || match.awayTeamId;
  } else if (currentS1.totalRuns > currentS2.totalRuns) {
    winnerTeamId = match.homeTeamId;
    superOverWinner = homeTeam?.name || match.homeTeamId;
  } else {
    // Double Super Over tie-breaker in knockouts: higher boundary count or home seed
    winnerTeamId = match.homeTeamId;
    superOverWinner = homeTeam?.name || match.homeTeamId;
  }

  const resultText = `${superOverWinner} won the Super Over! (${homeTeam?.name} ${currentS1.totalRuns}/${currentS1.wickets} vs ${awayTeam?.name} ${currentS2.totalRuns}/${currentS2.wickets})`;

  return {
    ...match,
    status: 'COMPLETED',
    winnerTeamId,
    superOverPlayed: true,
    superOverInnings: [currentS1, currentS2],
    resultText,
    playerOfTheMatch: computeMatchResult(match).potm,
  };
}

/**
 * Simulates an entire over
 */
export function stepMatchOver(match: Match): Match {
  let current = match;
  if (isTerminalMatchStatus(current.status)) return current;

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
  if (isTerminalMatchStatus(current.status)) return current;

  const targetInnIdx = current.currentInningsIndex;
  let iterations = 0;

  while (
    current.status === 'IN_PROGRESS' &&
    current.currentInningsIndex === targetInnIdx &&
    current.innings[targetInnIdx] &&
    !current.innings[targetInnIdx].isCompleted &&
    iterations < 450
  ) {
    current = stepMatchBall(current);
    iterations++;
  }

  return current;
}

/**
 * Simulates entire match to completion
 */
export function simulateFullMatch(match: Match, career?: CareerSave): Match {
  if (isTerminalMatchStatus(match.status)) return match;

  return withCareerSimulationContext(career, () => {
    let current = match;

    // Initialize match if in any pre-match state
    if (isPreMatchStatus(current.status)) {
      const tossSeed = getMatchSeed(current, 0);
      const tossRand = mulberry32(tossSeed);
      const tossWinnerId = tossRand() > 0.5 ? current.homeTeamId : current.awayTeamId;
      const tossChoice = tossRand() > 0.4 ? 'BAT' : 'BOWL';
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

      const battingTeamName =
        battingFirstId === current.homeTeamId
          ? homeTeam?.name || current.homeTeamId
          : awayTeam?.name || current.awayTeamId;
      const bowlingTeamName =
        bowlingFirstId === current.homeTeamId
          ? homeTeam?.name || current.homeTeamId
          : awayTeam?.name || current.awayTeamId;

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
        dayNumber: 1,
        sessionNumber: 1,
        oversBowledToday: 0,
      };
    }

    let iterations = 0;
    const maxIterations = current.format === 'TEST' ? 3500 : 700;

    while (!isTerminalMatchStatus(current.status) && iterations < maxIterations) {
      current = stepMatchBall(current);
      iterations++;
    }

    // Fallback for Test cricket if maximum time/overs are exhausted
    if (current.format === 'TEST' && (!isTerminalMatchStatus(current.status) || current.dayNumber > 5)) {
      const res = computeMatchResult(current);
      const allFourDone = current.innings.length === 4 && current.innings[3].isCompleted;
      current = {
        ...current,
        status: allFourDone && res.winnerTeamId ? 'COMPLETED' : 'DRAW',
        winnerTeamId: allFourDone ? res.winnerTeamId : undefined,
        resultText: allFourDone && res.winnerTeamId ? res.resultText : 'Match Drawn (Time Expired on Day 5)',
        playerOfTheMatch: res.potm,
      };
    }

    // Ensure result text & POTM are set on all concluded matches
    if (isTerminalMatchStatus(current.status) && (!current.resultText || !current.playerOfTheMatch)) {
      const res = computeMatchResult(current);
      current = {
        ...current,
        winnerTeamId: current.winnerTeamId || res.winnerTeamId,
        resultText: current.resultText || res.resultText,
        playerOfTheMatch: current.playerOfTheMatch || res.potm,
      };
    }

    return current;
  });
}

function accumulateMatchIntoFormatStats(st: FormatStats, match: Match, pId: string): FormatStats {
  const prevBalls = st.strikeRate > 0 ? Math.round((st.runs / st.strikeRate) * 100) : 0;
  let matchBallsFaced = 0;

  st.matches += 1;

  match.innings.forEach((inn) => {
    const b = inn.batters?.find((bat) => bat.playerId === pId);
    if (b && (b.balls > 0 || b.dismissal)) {
      st.innings += 1;
      st.runs += b.runs;
      st.fours += b.fours;
      st.sixes += b.sixes;
      matchBallsFaced += b.balls;

      if (!b.dismissal) {
        st.notOuts += 1;
      } else if (b.runs === 0) {
        st.ducks += 1;
      }

      if (b.runs > st.highestScore || (b.runs === st.highestScore && !b.dismissal)) {
        st.highestScore = b.runs;
        st.highestScoreNotOut = !b.dismissal;
      }

      if (b.runs >= 100) st.centuries += 1;
      else if (b.runs >= 50) st.fifties += 1;
    }

    const bw = inn.bowlers?.find((bowl) => bowl.playerId === pId);
    if (bw && (bw.overs > 0 || bw.ballsThisOver > 0)) {
      st.bowlingInnings += 1;
      st.oversBowled = Number((st.oversBowled + bw.overs + bw.ballsThisOver / 6).toFixed(2));
      st.maidens += bw.maidens;
      st.runsConceded += bw.runs;
      st.wickets += bw.wickets;

      if (
        bw.wickets > st.bestBowlingWickets ||
        (bw.wickets === st.bestBowlingWickets && bw.wickets > 0 && (st.bestBowlingRuns === 0 || bw.runs < st.bestBowlingRuns))
      ) {
        st.bestBowlingWickets = bw.wickets;
        st.bestBowlingRuns = bw.runs;
      }

      if (bw.wickets >= 5) st.fiveWicketHauls += 1;
    }

    (inn.recentBalls || []).forEach((ball) => {
      if (ball.isWicket && ball.wicketDetails && ball.wicketDetails.fielderId === pId) {
        if (ball.wicketDetails.type === 'CAUGHT') st.catches += 1;
        else if (ball.wicketDetails.type === 'RUN_OUT') st.runOuts += 1;
        else if (ball.wicketDetails.type === 'STUMPED') st.stumpings += 1;
      }
    });
  });

  const dismissals = Math.max(0, st.innings - st.notOuts);
  st.average = dismissals > 0 ? Number((st.runs / dismissals).toFixed(2)) : st.runs;

  const totalBalls = prevBalls + matchBallsFaced;
  st.strikeRate = totalBalls > 0 ? Number(((st.runs / totalBalls) * 100).toFixed(2)) : st.strikeRate;

  st.bowlingAverage = st.wickets > 0 ? Number((st.runsConceded / st.wickets).toFixed(2)) : 0;
  st.economy = st.oversBowled > 0 ? Number((st.runsConceded / st.oversBowled).toFixed(2)) : 0;
  st.bowlingStrikeRate = st.wickets > 0 ? Number(((st.oversBowled * 6) / st.wickets).toFixed(2)) : 0;

  return st;
}

/**
 * Updates player career statistics (Test, ODI, T20I) exactly once upon match conclusion.
 * When `career` is passed, records into `career.playerOverrides[pId].simulatedStats` WITHOUT mutating
 * verified historical base `ALL_PLAYERS[i].stats`.
 */
export function applyMatchStatsToPlayers(match: Match, career?: CareerSave): void {
  if (match.statsRecorded) return; // Prevent duplicate applications
  match.statsRecorded = true;

  const fmt = match.format;
  const matchPlayerIds = new Set<string>([...match.homeXI, ...match.awayXI]);

  matchPlayerIds.forEach((pId) => {
    if (career) {
      const basePlayer =
        ALL_PLAYERS.find((p) => p.id === pId) ||
        career.emergingPlayers?.find((p) => p.id === pId);
      if (!basePlayer) return;

      if (!career.playerOverrides) career.playerOverrides = {};
      if (!career.playerOverrides[pId]) career.playerOverrides[pId] = {};

      const existingSim = career.playerOverrides[pId].simulatedStats || {
        TEST: createEmptyFormatStats(),
        ODI: createEmptyFormatStats(),
        T20I: createEmptyFormatStats(),
      };

      const fmtClone: FormatStats = { ...(existingSim[fmt] || createEmptyFormatStats()) };
      accumulateMatchIntoFormatStats(fmtClone, match, pId);

      career.playerOverrides[pId].simulatedStats = {
        ...existingSim,
        [fmt]: fmtClone,
      };
      return;
    }

    // Standalone engine invocation (without career save context, e.g. unit test Common 5)
    const player = ALL_PLAYERS.find((p) => p.id === pId);
    if (!player) return;
    if (!player.stats[fmt]) {
      player.stats[fmt] = createEmptyFormatStats();
    }
    accumulateMatchIntoFormatStats(player.stats[fmt], match, pId);
  });
}
