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
  PitchCondition,
  WeatherCondition,
} from '../types/cricket';
import {
  ALL_PLAYERS,
  createEmptyFormatStats,
  getEffectivePlayer,
  getDefaultPlayingXI,
  getDefaultCaptainId,
  getDefaultWicketKeeperId,
} from '../data/squads';
import { INTERNATIONAL_TEAMS } from '../data/teams';
import { simulateDelivery, setSimulationSeed, mulberry32, FieldingPlayerRef } from './simulation';
export { mulberry32 };
import { applyBallToInnings, isInningsComplete, getMaxOversPerBowler } from './rules';
import {
  DEFAULT_TEST_OVERS_PER_DAY,
  DEFAULT_NEW_BALL_OVERS,
  createInitialTestWeather,
  getInitialTestPitchWear,
  getRemainingOversInTestMatch,
  getTestConditionsModifiers,
  advanceTestOverTimeAndConditions,
  takeNewBallInTestMatch,
  getTestFollowOnThreshold,
  isTestFollowOnEligible,
  decideAIFollowOn,
  validateTestDeclaration,
  getDeclarationStrategicContext,
  DeclarationStrategicSummary,
  shouldAICaptainDeclare,
  determineAITestBattingApproach,
  determineAITestBowlingTactics,
  selectTestOpeningBowler,
  selectNextTestBowler,
  recordBowlerOverInSpellTracker,
} from './testCricketEngine';
import {
  DLS_SUPPORT_STATUS,
  MIN_OVERS_FOR_WHITE_BALL_RESULT,
  createWhiteBallConditions,
  getWhiteBallConditionsModifiers,
  applyPreMatchOversReduction,
  abandonWhiteBallMatch,
  concludeWhiteBallNoResult,
  determineAIWhiteBallBattingApproach,
  determineAIWhiteBallBowlingTactics,
  selectWhiteBallOpeningBowler,
  selectNextWhiteBallBowler,
  recordWhiteBallOverInSpellTracker,
  simulateWhiteBallSuperOver,
} from './whiteBallEngine';
import {
  DEFAULT_TACTICAL_CALIBRATION,
  initializeBowlerSpellData,
  recordOverInSpellManager,
  applyRestToBenchBowlers,
  getStandardFieldPresets,
  createDefaultPhaseTargets,
  evaluateLBWReview,
  evaluateCaughtBehindReview,
  determineOppositionTactics,
} from './tacticalEngine';
import {
  IndividualBatterInstruction,
  IndividualBowlingPlan,
  CustomScoringTarget,
  PhaseScoringTargets,
  CustomFieldLayout,
  TeamBattingGamePlan,
  DRSReviewType,
  DRSReviewState,
  DRSOutcome,
  BowlerSpellData,
} from '../types/cricket';

export {
  takeNewBallInTestMatch,
  validateTestDeclaration,
  getDeclarationStrategicContext,
  getRemainingOversInTestMatch,
  isTestFollowOnEligible,
  decideAIFollowOn,
  getTestFollowOnThreshold,
  DLS_SUPPORT_STATUS,
  MIN_OVERS_FOR_WHITE_BALL_RESULT,
  createWhiteBallConditions,
  getWhiteBallConditionsModifiers,
  applyPreMatchOversReduction,
  abandonWhiteBallMatch,
  concludeWhiteBallNoResult,
  DEFAULT_TACTICAL_CALIBRATION,
  getStandardFieldPresets,
  createDefaultPhaseTargets,
};
export type { DeclarationStrategicSummary };

let activeSimulationCareer: CareerSave | undefined = undefined;
let interactiveUserPlayMode = true;

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
  targetRuns?: number,
  options?: {
    format?: MatchFormat;
    pitch?: PitchCondition;
    weather?: WeatherCondition;
    bowlingWicketKeeperId?: string;
    allocatedOvers?: number;
    seed?: number;
    nominatedBowlerIds?: string[];
  }
): InningsState {
  const strikerId = battingXI[0] || 'p1';
  const nonStrikerId = battingXI[1] || 'p2';

  const defaultPitch: PitchCondition = {
    name: 'Sporting',
    type: 'SPORTING_BALANCED',
    paceBonus: 10,
    spinBonus: 5,
    bounceVariation: 8,
    wearFactor: 1.0,
  };
  const defaultWeather: WeatherCondition = {
    type: 'SUNNY',
    swingBonus: 6,
    description: 'Clear conditions.',
  };

  // Opening bowler: in Test choose red-ball opening bowler; in ODI/T20I choose phase-aware white-ball opening bowler
  const openingBowlerId =
    options?.format === 'TEST'
      ? selectTestOpeningBowler(
          bowlingXI,
          options.bowlingWicketKeeperId,
          options.pitch || defaultPitch,
          options.weather || defaultWeather,
          getPlayerById,
          options.nominatedBowlerIds
        )
      : options?.format === 'ODI' || options?.format === 'T20I'
      ? selectWhiteBallOpeningBowler(
          bowlingXI,
          options.bowlingWicketKeeperId,
          options.format,
          options.pitch || defaultPitch,
          options.weather || defaultWeather,
          getPlayerById,
          options.seed ?? inningsNumber * 131,
          options.nominatedBowlerIds
        )
      : bowlingXI[bowlingXI.length - 1] || 'b1';

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

  const baseState: InningsState = {
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
    lastWicketLegalBalls: 0,
  };

  if (options?.format === 'TEST') {
    baseState.ballAgeOvers = 0;
    baseState.newBallAvailable = false;
    baseState.newBallsTaken = 0;
    baseState.bowlerSpellOvers = {};
    baseState.bowlerLastOverBowled = {};
  } else if (options?.format === 'ODI' || options?.format === 'T20I') {
    baseState.isFreeHit = false;
    baseState.bowlerSpellOvers = {};
    baseState.bowlerLastOverBowled = {};
    if (options.allocatedOvers !== undefined) {
      baseState.allocatedOvers = options.allocatedOvers;
    }
  }

  return baseState;
}

/**
 * Chooses next bowler for bowling side adhering strictly to format over quotas,
 * spell-based Test rotation, phase-aware ODI/T20I rotation, and preventing consecutive overs.
 */
export function selectNextBowler(
  match: Match,
  currentInnings: InningsState,
  bowlingXI: string[]
): string {
  if (match.format === 'TEST') {
    return selectNextTestBowler(match, currentInnings, bowlingXI, getPlayerById);
  }
  return selectNextWhiteBallBowler(match, currentInnings, bowlingXI, getPlayerById);
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
  const maxQuotaOvers =
    match.format === 'TEST'
      ? 0
      : match.allocatedOversPerInnings ?? (match.format === 'T20I' ? 20 : 50);

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
      const s1 = match.superOverInnings[match.superOverInnings.length - 2];
      const s2 = match.superOverInnings[match.superOverInnings.length - 1];
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
    // TEST CRICKET RESULT LOGIC (Up to 4 innings — normal order & follow-on)
    const inn1 = innings[0];
    const inn2 = innings[1];
    const inn3 = innings[2];
    const inn4 = innings[3];

    if (!inn1 || !inn2) {
      resultText = match.status === 'DRAW' ? 'Match Drawn' : 'Match in progress';
    } else if (inn3 && inn3.isCompleted && !inn4) {
      if (match.followOnEnforced) {
        // Follow-on enforced: Team A batted Inn 1; Team B batted Inn 2 & Inn 3
        const teamARuns = inn1.totalRuns;
        const teamBCombined = inn2.totalRuns + inn3.totalRuns;
        if (teamBCombined < teamARuns) {
          const margin = teamARuns - teamBCombined;
          resultText = `${inn1.battingTeamName} won by an innings and ${margin} run${margin === 1 ? '' : 's'}!`;
          winningTeamId = inn1.battingTeamId;
        } else {
          resultText = 'Match Drawn';
        }
      } else {
        // Normal order: Team A batted Inn 1 & Inn 3; Team B batted Inn 2
        const teamACombined = inn1.totalRuns + inn3.totalRuns;
        const teamBRuns = inn2.totalRuns;
        if (teamACombined < teamBRuns) {
          const margin = teamBRuns - teamACombined;
          resultText = `${inn2.battingTeamName} won by an innings and ${margin} run${margin === 1 ? '' : 's'}!`;
          winningTeamId = inn2.battingTeamId;
        } else {
          resultText = 'Match Drawn';
        }
      }
    } else if (inn4 && inn4.isCompleted) {
      const chasingTotal = innings
        .filter((i) => i.battingTeamId === inn4.battingTeamId)
        .reduce((s, i) => s + i.totalRuns, 0);
      const defendingTotal = innings
        .filter((i) => i.battingTeamId === inn4.bowlingTeamId)
        .reduce((s, i) => s + i.totalRuns, 0);

      if (
        (inn4.targetRuns !== undefined && inn4.totalRuns >= inn4.targetRuns) ||
        chasingTotal > defendingTotal
      ) {
        const wkts = Math.max(1, 10 - inn4.wickets);
        resultText = `${inn4.battingTeamName} won by ${wkts} wicket${wkts === 1 ? '' : 's'}!`;
        winningTeamId = inn4.battingTeamId;
      } else if (inn4.wickets >= 10 || inn4.isAllOut) {
        if (chasingTotal === defendingTotal) {
          resultText = 'Match Tied! Historic Test Tie!';
          winningTeamId = '';
        } else {
          const runMargin = Math.max(1, defendingTotal - chasingTotal);
          resultText = `${inn4.bowlingTeamName} won by ${runMargin} run${runMargin === 1 ? '' : 's'}!`;
          winningTeamId = inn4.bowlingTeamId;
        }
      } else {
        resultText = 'Match Drawn';
      }
    } else {
      resultText = 'Match Drawn';
    }
  } else {
    // WHITE-BALL CRICKET RESULT LOGIC (ODI & T20I)
    if (match.status === 'ABANDONED') {
      resultText = match.resultText || 'Match Abandoned without a ball bowled';
    } else if (match.status === 'NO_RESULT') {
      resultText = match.resultText || 'No Result';
    } else {
      const inn1 = innings[0];
      const inn2 = innings[1];
      const allocOvers =
        inn2?.allocatedOvers ??
        match.allocatedOversPerInnings ??
        (match.format === 'T20I' ? 20 : 50);

      if (!inn1 || !inn2) {
        resultText = 'Match in progress';
      } else if (inn2.targetRuns && inn2.totalRuns >= inn2.targetRuns) {
        const wktsLeft = Math.max(1, 10 - inn2.wickets);
        resultText = `${inn2.battingTeamName} won by ${wktsLeft} wicket${wktsLeft > 1 ? 's' : ''}`;
        winningTeamId = inn2.battingTeamId;
      } else if (inn2.isCompleted || inn2.completedOvers >= allocOvers || inn2.wickets >= 10) {
        if (inn2.totalRuns === inn1.totalRuns) {
          if (match.superOverPlayed && match.superOverInnings && match.superOverInnings.length >= 2) {
            const s1 = match.superOverInnings[match.superOverInnings.length - 2];
            const s2 = match.superOverInnings[match.superOverInnings.length - 1];
            const rounds = match.superOverRounds || Math.floor(match.superOverInnings.length / 2);
            const soLabel = rounds > 1 ? `Super Over #${rounds}` : 'Super Over';
            if (s2.totalRuns > s1.totalRuns) {
              winningTeamId = s2.battingTeamId;
              resultText = `${s2.battingTeamName} won via ${soLabel} (${s2.totalRuns}/${s2.wickets} vs ${s1.totalRuns}/${s1.wickets})!`;
            } else if (s1.totalRuns > s2.totalRuns) {
              winningTeamId = s1.battingTeamId;
              resultText = `${s1.battingTeamName} won via ${soLabel} (${s1.totalRuns}/${s1.wickets} vs ${s2.totalRuns}/${s2.wickets})!`;
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
  }

  // Find Player of the Match across all match innings
  let bestScore = -1;
  let topPlayerId = match.homeCaptainId;
  let topPlayerReason = 'Solid match performance';

  if (match.format === 'TEST') {
    const aggMap = new Map<
      string,
      { runs: number; balls: number; fours: number; sixes: number; wickets: number; bowlRuns: number; maidens: number; score: number }
    >();
    for (const inn of innings) {
      for (const b of inn.batters) {
        const rec = aggMap.get(b.playerId) || { runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, bowlRuns: 0, maidens: 0, score: 0 };
        rec.runs += b.runs;
        rec.balls += b.balls;
        rec.fours += b.fours;
        rec.sixes += b.sixes;
        rec.score +=
          b.runs * 1.25 +
          b.fours * 1.5 +
          b.sixes * 3 +
          (b.runs >= 200 ? 55 : b.runs >= 100 ? 30 : b.runs >= 50 ? 14 : 0);
        aggMap.set(b.playerId, rec);
      }
      for (const bw of inn.bowlers) {
        const rec = aggMap.get(bw.playerId) || { runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, bowlRuns: 0, maidens: 0, score: 0 };
        rec.wickets += bw.wickets;
        rec.bowlRuns += bw.runs;
        rec.maidens += bw.maidens;
        rec.score +=
          bw.wickets * 34 +
          bw.maidens * 4 +
          bw.dots * 0.25 -
          bw.runs * 0.35 +
          (bw.wickets >= 5 ? 28 : 0);
        aggMap.set(bw.playerId, rec);
      }
    }
    aggMap.forEach((rec, pId) => {
      const totalScore = rec.score + (rec.wickets >= 10 ? 45 : 0) + (winningTeamId && (match.homeTeamId === winningTeamId ? match.homeXI.includes(pId) : match.awayXI.includes(pId)) ? 18 : 0);
      if (totalScore > bestScore) {
        bestScore = totalScore;
        topPlayerId = pId;
        if (rec.runs >= 60 && rec.wickets >= 4) {
          topPlayerReason = `Match-defining all-round display: ${rec.runs} runs & ${rec.wickets}/${rec.bowlRuns}`;
        } else if (rec.wickets * 34 >= rec.runs * 1.25) {
          topPlayerReason = `Outstanding Test match bowling: ${rec.wickets}/${rec.bowlRuns} (${rec.maidens} maidens)`;
        } else {
          topPlayerReason = `Commanding Test match batting: ${rec.runs} runs (${rec.balls}b, ${rec.fours}x4)`;
        }
      }
    });
  } else {
    const wbMap = new Map<
      string,
      {
        runs: number;
        balls: number;
        fours: number;
        sixes: number;
        wickets: number;
        bowlRuns: number;
        oversText: string;
        score: number;
      }
    >();
    for (const inn of innings) {
      for (const b of inn.batters) {
        const rec = wbMap.get(b.playerId) || {
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          wickets: 0,
          bowlRuns: 0,
          oversText: '0.0',
          score: 0,
        };
        rec.runs += b.runs;
        rec.balls += b.balls;
        rec.fours += b.fours;
        rec.sixes += b.sixes;
        const srBonus =
          b.balls >= 12
            ? Math.max(-8, ((b.runs / b.balls) * 100 - (match.format === 'T20I' ? 125 : 85)) * 0.14)
            : 0;
        rec.score +=
          b.runs * 1.25 +
          b.fours * 2 +
          b.sixes * 4 +
          srBonus +
          (b.runs >= 100 ? 32 : b.runs >= 50 ? 15 : 0);
        wbMap.set(b.playerId, rec);
      }
      for (const bw of inn.bowlers) {
        const rec = wbMap.get(bw.playerId) || {
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          wickets: 0,
          bowlRuns: 0,
          oversText: '0.0',
          score: 0,
        };
        rec.wickets += bw.wickets;
        rec.bowlRuns += bw.runs;
        rec.oversText = `${bw.overs}.${bw.ballsThisOver}`;
        rec.score +=
          bw.wickets * 35 +
          bw.maidens * 14 +
          bw.dots * 0.5 -
          bw.runs * 0.4 +
          (bw.wickets >= 5 ? 32 : bw.wickets === 4 ? 18 : 0);
        wbMap.set(bw.playerId, rec);
      }
    }
    wbMap.forEach((rec, pId) => {
      const onWinningSide =
        winningTeamId &&
        (winningTeamId === match.homeTeamId
          ? match.homeXI.includes(pId)
          : match.awayXI.includes(pId));
      const totalScore = rec.score + (onWinningSide ? 16 : 0);
      if (totalScore > bestScore) {
        bestScore = totalScore;
        topPlayerId = pId;
        if (rec.runs >= 35 && rec.wickets >= 2) {
          topPlayerReason = `Match-winning all-round impact: ${rec.runs} (${rec.balls}b) & ${rec.wickets}/${rec.bowlRuns}`;
        } else if (rec.wickets * 35 >= rec.runs * 1.25 && rec.wickets > 0) {
          topPlayerReason = `Exceptional bowling figures: ${rec.wickets}/${rec.bowlRuns} in ${rec.oversText} overs`;
        } else {
          topPlayerReason = `Magnificent batting: ${rec.runs} runs (${rec.balls}b, ${rec.fours}x4, ${rec.sixes}x6)`;
        }
      }
    });
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
 * Legacy helper alias delegating to full Test time & conditions progression engine
 */
export function advanceTestMatchSession(match: Match): Match {
  return advanceTestOverTimeAndConditions(match, getPlayerById);
}

/**
 * Resolves an interactive user Follow-On decision ("Enforce Follow-On" vs "Bat Again")
 * and immediately creates Innings 3.
 */
export function resolveFollowOnDecision(match: Match, enforceFollowOn: boolean): Match {
  if (match.format !== 'TEST' || match.innings.length < 2) return match;
  const inn1 = match.innings[0];
  const inn2 = match.innings[1];
  if (!inn1?.isCompleted || !inn2?.isCompleted) return match;
  if (match.innings.length >= 3) {
    return {
      ...match,
      followOnEnforced: enforceFollowOn,
      awaitingFollowOnDecision: false,
    };
  }

  const nextBattingId = enforceFollowOn ? inn2.battingTeamId : inn1.battingTeamId;
  const nextBowlingId = enforceFollowOn ? inn1.battingTeamId : inn2.battingTeamId;
  const nextBattingXI = nextBattingId === match.homeTeamId ? match.homeXI : match.awayXI;
  const nextBowlingXI = nextBowlingId === match.homeTeamId ? match.homeXI : match.awayXI;
  const bowlingWkId =
    nextBowlingId === match.homeTeamId ? match.homeWicketKeeperId : match.awayWicketKeeperId;
  const bowlingNominated =
    nextBowlingId === match.homeTeamId ? match.homeBowlingOptions : match.awayBowlingOptions;
  const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.homeTeamId);
  const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.awayTeamId);

  const inn3 = createInitialInningsState(
    3,
    nextBattingId,
    nextBattingId === match.homeTeamId ? homeTeam?.name || nextBattingId : awayTeam?.name || nextBattingId,
    nextBowlingId,
    nextBowlingId === match.homeTeamId ? homeTeam?.name || nextBowlingId : awayTeam?.name || nextBowlingId,
    nextBattingXI,
    nextBowlingXI,
    undefined,
    {
      format: 'TEST',
      pitch: match.pitch,
      weather: match.weather,
      bowlingWicketKeeperId: bowlingWkId,
      nominatedBowlerIds: bowlingNominated,
    }
  );

  return {
    ...match,
    isFollowOnEligible: true,
    followOnOffered: true,
    followOnEnforced: enforceFollowOn,
    awaitingFollowOnDecision: false,
    currentInningsIndex: 2,
    innings: [...match.innings, inn3],
  };
}

/**
 * Simulates a single delivery within the active match with full multi-innings state machine
 */
export function stepMatchBall(matchInput: Match): Match {
  if (isTerminalMatchStatus(matchInput.status)) {
    return matchInput;
  }

  if (
    matchInput.format === 'TEST' &&
    matchInput.awaitingFollowOnDecision &&
    interactiveUserPlayMode
  ) {
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
    const bowlingWkId =
      bowlingFirstId === match.homeTeamId ? match.homeWicketKeeperId : match.awayWicketKeeperId;
    const bowlingNominated =
      bowlingFirstId === match.homeTeamId ? match.homeBowlingOptions : match.awayBowlingOptions;

    const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.homeTeamId);
    const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.awayTeamId);

    const battingTeamName =
      battingFirstId === match.homeTeamId ? homeTeam?.name || match.homeTeamId : awayTeam?.name || match.awayTeamId;
    const bowlingTeamName =
      bowlingFirstId === match.homeTeamId ? homeTeam?.name || match.homeTeamId : awayTeam?.name || match.awayTeamId;

    const mSeed = getMatchSeed(match, 0);
    const firstInnings = createInitialInningsState(
      1,
      battingFirstId,
      battingTeamName,
      bowlingFirstId,
      bowlingTeamName,
      battingXI,
      bowlingXI,
      undefined,
      match.format === 'TEST'
        ? {
            format: 'TEST',
            pitch: match.pitch,
            weather: match.weather,
            bowlingWicketKeeperId: bowlingWkId,
            nominatedBowlerIds: bowlingNominated,
          }
        : {
            format: match.format,
            pitch: match.pitch,
            weather: match.weather,
            bowlingWicketKeeperId: bowlingWkId,
            allocatedOvers: match.allocatedOversPerInnings,
            seed: mSeed + 101,
            nominatedBowlerIds: bowlingNominated,
          }
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
      ...(match.format === 'TEST'
        ? {
            oversPerDay: match.oversPerDay || DEFAULT_TEST_OVERS_PER_DAY,
            newBallOversThreshold: match.newBallOversThreshold || DEFAULT_NEW_BALL_OVERS,
            oversLostToday: 0,
            totalOversLostToWeather: match.totalOversLostToWeather || 0,
            extraOversToday: 0,
            pitchWear: match.pitchWear ?? getInitialTestPitchWear(match.pitch, mSeed),
            dynamicWeather: match.dynamicWeather || createInitialTestWeather(match.weather, mSeed),
          }
        : {
            whiteBallConditions:
              match.whiteBallConditions || createWhiteBallConditions(match, mSeed),
          }),
    };
  } else if (
    match.format === 'TEST' &&
    (match.pitchWear === undefined || match.dynamicWeather === undefined)
  ) {
    const mSeed = getMatchSeed(match, 0);
    match = {
      ...match,
      oversPerDay: match.oversPerDay || DEFAULT_TEST_OVERS_PER_DAY,
      newBallOversThreshold: match.newBallOversThreshold || DEFAULT_NEW_BALL_OVERS,
      pitchWear: match.pitchWear ?? getInitialTestPitchWear(match.pitch, mSeed),
      dynamicWeather: match.dynamicWeather || createInitialTestWeather(match.weather, mSeed),
    };
  } else if (match.format !== 'TEST' && !match.whiteBallConditions) {
    const mSeed = getMatchSeed(match, 0);
    match = {
      ...match,
      whiteBallConditions: createWhiteBallConditions(match, mSeed),
    };
  }

  const currentInnings = match.innings[match.currentInningsIndex];
  if (!currentInnings) {
    return match;
  }

  // 1. INNINGS TRANSITION STATE MACHINE
  if (currentInnings.isCompleted) {
    if (match.format === 'TEST') {
      // TEST 4-INNINGS SYSTEM
      if (match.currentInningsIndex === 0) {
        // Transition from Innings 1 to Innings 2
        const nextBattingId = currentInnings.bowlingTeamId;
        const nextBowlingId = currentInnings.battingTeamId;
        const nextBattingXI = nextBattingId === match.homeTeamId ? match.homeXI : match.awayXI;
        const nextBowlingXI = nextBowlingId === match.homeTeamId ? match.homeXI : match.awayXI;
        const bowlingWkId =
          nextBowlingId === match.homeTeamId ? match.homeWicketKeeperId : match.awayWicketKeeperId;
        const bowlingNominated =
          nextBowlingId === match.homeTeamId ? match.homeBowlingOptions : match.awayBowlingOptions;
        const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.homeTeamId);
        const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.awayTeamId);

        const inn2 = createInitialInningsState(
          2,
          nextBattingId,
          nextBattingId === match.homeTeamId ? homeTeam?.name || nextBattingId : awayTeam?.name || nextBattingId,
          nextBowlingId,
          nextBowlingId === match.homeTeamId ? homeTeam?.name || nextBowlingId : awayTeam?.name || nextBowlingId,
          nextBattingXI,
          nextBowlingXI,
          undefined,
          {
            format: 'TEST',
            pitch: match.pitch,
            weather: match.weather,
            bowlingWicketKeeperId: bowlingWkId,
            nominatedBowlerIds: bowlingNominated,
          }
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
        const eligible = isTestFollowOnEligible(match);
        let followOnEnforced = match.followOnEnforced;

        if (eligible && followOnEnforced === undefined) {
          const userControlsLeadingSide =
            match.isUserMatch &&
            interactiveUserPlayMode &&
            inn1.battingTeamId === match.userTeamId;

          if (userControlsLeadingSide) {
            return {
              ...match,
              isFollowOnEligible: true,
              followOnOffered: true,
              awaitingFollowOnDecision: true,
            };
          }

          followOnEnforced = decideAIFollowOn(match, getPlayerById);
        } else if (!eligible) {
          followOnEnforced = false;
        }

        const nextBattingId = followOnEnforced ? inn2.battingTeamId : inn1.battingTeamId;
        const nextBowlingId = followOnEnforced ? inn1.battingTeamId : inn2.battingTeamId;
        const nextBattingXI = nextBattingId === match.homeTeamId ? match.homeXI : match.awayXI;
        const nextBowlingXI = nextBowlingId === match.homeTeamId ? match.homeXI : match.awayXI;
        const bowlingWkId =
          nextBowlingId === match.homeTeamId ? match.homeWicketKeeperId : match.awayWicketKeeperId;
        const bowlingNominated =
          nextBowlingId === match.homeTeamId ? match.homeBowlingOptions : match.awayBowlingOptions;
        const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.homeTeamId);
        const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.awayTeamId);

        const inn3 = createInitialInningsState(
          3,
          nextBattingId,
          nextBattingId === match.homeTeamId ? homeTeam?.name || nextBattingId : awayTeam?.name || nextBattingId,
          nextBowlingId,
          nextBowlingId === match.homeTeamId ? homeTeam?.name || nextBowlingId : awayTeam?.name || nextBowlingId,
          nextBattingXI,
          nextBowlingXI,
          undefined,
          {
            format: 'TEST',
            pitch: match.pitch,
            weather: match.weather,
            bowlingWicketKeeperId: bowlingWkId,
            nominatedBowlerIds: bowlingNominated,
          }
        );

        return {
          ...match,
          isFollowOnEligible: eligible,
          followOnOffered: eligible,
          followOnEnforced,
          awaitingFollowOnDecision: false,
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
            const { resultText, winnerTeamId, potm } = computeMatchResult(match);
            return {
              ...match,
              status: 'COMPLETED',
              winnerTeamId,
              resultText,
              playerOfTheMatch: potm,
            };
          }
          const target = teamBCombined - inn1.totalRuns + 1;
          const nextBattingId = inn1.battingTeamId;
          const nextBowlingId = inn2.battingTeamId;
          const nextBattingXI = nextBattingId === match.homeTeamId ? match.homeXI : match.awayXI;
          const nextBowlingXI = nextBowlingId === match.homeTeamId ? match.homeXI : match.awayXI;
          const bowlingWkId =
            nextBowlingId === match.homeTeamId ? match.homeWicketKeeperId : match.awayWicketKeeperId;
          const bowlingNominated =
            nextBowlingId === match.homeTeamId ? match.homeBowlingOptions : match.awayBowlingOptions;
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
            target,
            {
              format: 'TEST',
              pitch: match.pitch,
              weather: match.weather,
              bowlingWicketKeeperId: bowlingWkId,
              nominatedBowlerIds: bowlingNominated,
            }
          );

          return {
            ...match,
            currentInningsIndex: 3,
            innings: [...match.innings, inn4],
          };
        } else {
          // Normal: Team A batted Innings 3; if Team A's combined total still trails Team B's 1st innings, Team B wins by an innings!
          const teamACombined = inn1.totalRuns + inn3.totalRuns;
          if (teamACombined < inn2.totalRuns) {
            const { resultText, winnerTeamId, potm } = computeMatchResult(match);
            return {
              ...match,
              status: 'COMPLETED',
              winnerTeamId,
              resultText,
              playerOfTheMatch: potm,
            };
          }
          const target = teamACombined - inn2.totalRuns + 1;

          const nextBattingId = inn2.battingTeamId;
          const nextBowlingId = inn1.battingTeamId;
          const nextBattingXI = nextBattingId === match.homeTeamId ? match.homeXI : match.awayXI;
          const nextBowlingXI = nextBowlingId === match.homeTeamId ? match.homeXI : match.awayXI;
          const bowlingWkId =
            nextBowlingId === match.homeTeamId ? match.homeWicketKeeperId : match.awayWicketKeeperId;
          const bowlingNominated =
            nextBowlingId === match.homeTeamId ? match.homeBowlingOptions : match.awayBowlingOptions;
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
            target,
            {
              format: 'TEST',
              pitch: match.pitch,
              weather: match.weather,
              bowlingWicketKeeperId: bowlingWkId,
              nominatedBowlerIds: bowlingNominated,
            }
          );

          return {
            ...match,
            currentInningsIndex: 3,
            innings: [...match.innings, inn4],
          };
        }
      } else {
        // Innings 4 completed -> Test Match finished!
        const { resultText, winnerTeamId, potm } = computeMatchResult(match);
        return {
          ...match,
          status: resultText.includes('Tied') ? 'TIE' : resultText.includes('Drawn') ? 'DRAW' : 'COMPLETED',
          winnerTeamId,
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
        const nextBowlingWkId =
          nextBowlingId === match.homeTeamId ? match.homeWicketKeeperId : match.awayWicketKeeperId;
        const nextBowlingNominated =
          nextBowlingId === match.homeTeamId ? match.homeBowlingOptions : match.awayBowlingOptions;
        const target = currentInnings.totalRuns + 1;
        const allocOvers = match.allocatedOversPerInnings ?? currentInnings.allocatedOvers;

        const innings2 = createInitialInningsState(
          2,
          nextBattingId,
          nextBattingName,
          nextBowlingId,
          nextBowlingName,
          nextBattingXI,
          nextBowlingXI,
          target,
          {
            format: match.format,
            pitch: match.pitch,
            weather: match.weather,
            bowlingWicketKeeperId: nextBowlingWkId,
            allocatedOvers: allocOvers,
            seed: getMatchSeed(match, 202),
            nominatedBowlerIds: nextBowlingNominated,
          }
        );

        return {
          ...match,
          currentInningsIndex: 1,
          innings: [...match.innings, innings2],
        };
      } else {
        // 2nd innings complete -> Check for Super Over in T20I tie or ODI knockout tie
        const inn1 = match.innings[0];
        const inn2 = match.innings[1];
        const isKnockout = match.stage === 'SEMI_FINAL' || match.stage === 'FINAL';
        if (
          inn1.totalRuns === inn2.totalRuns &&
          (match.format === 'T20I' || isKnockout) &&
          !match.superOverPlayed
        ) {
          return simulateSuperOver(match);
        }

        const { resultText, winnerTeamId, potm } = computeMatchResult(match);
        return {
          ...match,
          status: inn1.totalRuns === inn2.totalRuns ? 'TIE' : 'COMPLETED',
          winnerTeamId,
          resultText,
          playerOfTheMatch: potm,
        };
      }
    }
  }

  // 2. SIMULATE ACTIVE DELIVERY
  match = ensureMatchTacticalSystemsInitialized(match);

  const striker = getPlayerById(currentInnings.currentStrikerId);
  const nonStriker = getPlayerById(currentInnings.currentNonStrikerId);
  const bowler = getPlayerById(currentInnings.currentBowlerId);

  const isUserTeamBatting = Boolean(
    match.isUserMatch &&
      match.userTeamId &&
      currentInnings.battingTeamId === match.userTeamId
  );

  const isUserTeamBowling = Boolean(
    match.isUserMatch &&
      match.userTeamId &&
      currentInnings.bowlingTeamId === match.userTeamId
  );

  const isUserBatting = isUserTeamBatting && interactiveUserPlayMode;
  const isUserBowling = isUserTeamBowling && interactiveUserPlayMode;

  // Smart situational batting & bowling plans (applied as baseline for AI or non-interactive simulation; never overwrite user interactive tactics)
  if (!isUserBatting && !match.individualBatterInstructions?.[striker.id]) {
    const oppBat = determineOppositionTactics({
      match,
      currentInnings,
      isBatting: true,
      activeBowler: bowler,
      activeStriker: striker,
    });
    if (oppBat.batterInstruction) {
      match.individualBatterInstructions = {
        ...(match.individualBatterInstructions || {}),
        [striker.id]: oppBat.batterInstruction,
      };
    }
  }

  if (!isUserBowling && !match.individualBowlingPlans?.[bowler.id]) {
    const oppBowl = determineOppositionTactics({
      match,
      currentInnings,
      isBatting: false,
      activeBowler: bowler,
      activeStriker: striker,
    });
    if (oppBowl.bowlingPlan) {
      match.individualBowlingPlans = {
        ...(match.individualBowlingPlans || {}),
        [bowler.id]: oppBowl.bowlingPlan,
      };
    }
  }

  let activeAiTactics = match.aiTactics;
  if (match.format === 'TEST') {
    const aiBatAggression = !isUserBatting
      ? determineAITestBattingApproach(match, currentInnings, striker)
      : activeAiTactics.battingAggression;
    const aiBowlSetup = !isUserBowling
      ? determineAITestBowlingTactics(match, currentInnings, bowler)
      : { bowlingTactic: activeAiTactics.bowlingTactic, fieldPreset: activeAiTactics.fieldPreset };

    activeAiTactics = {
      battingAggression: aiBatAggression,
      bowlingTactic: aiBowlSetup.bowlingTactic,
      fieldPreset: aiBowlSetup.fieldPreset,
    };
  } else {
    const aiBatAggression = !isUserBatting
      ? determineAIWhiteBallBattingApproach(match, currentInnings, striker, getPlayerById)
      : activeAiTactics.battingAggression;
    const aiBowlSetup = !isUserBowling
      ? determineAIWhiteBallBowlingTactics(match, currentInnings, bowler)
      : { bowlingTactic: activeAiTactics.bowlingTactic, fieldPreset: activeAiTactics.fieldPreset };

    activeAiTactics = {
      battingAggression: aiBatAggression,
      bowlingTactic: aiBowlSetup.bowlingTactic,
      fieldPreset: aiBowlSetup.fieldPreset,
    };
  }

  const battingTactics = isUserBatting ? match.userTactics : activeAiTactics;
  const bowlingTactics = isUserBowling ? match.userTactics : activeAiTactics;

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

  const bowlingXIIds =
    currentInnings.bowlingTeamId === match.homeTeamId ? match.homeXI : match.awayXI;
  const bowlingWkId =
    currentInnings.bowlingTeamId === match.homeTeamId
      ? match.homeWicketKeeperId
      : match.awayWicketKeeperId;
  const bowlingFielders: FieldingPlayerRef[] = bowlingXIIds.map((id) => ({
    id,
    shortName: getPlayerById(id).shortName,
    isWicketKeeper: id === bowlingWkId,
  }));

  const testConditions =
    match.format === 'TEST' ? getTestConditionsModifiers(match, currentInnings) : undefined;
  const whiteBallModifiers =
    match.format !== 'TEST' ? getWhiteBallConditionsModifiers(match, currentInnings) : undefined;
  const allocatedOvers =
    match.format !== 'TEST'
      ? currentInnings.allocatedOvers ?? match.allocatedOversPerInnings
      : undefined;

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
    battingAggression: battingTactics.battingAggression,
    bowlingTactic: bowlingTactics.bowlingTactic,
    fieldPreset: bowlingTactics.fieldPreset,
    overCompletedOvers: currentInnings.completedOvers,
    dayNumber: match.dayNumber,
    sessionNumber: match.sessionNumber,
    seed: ballSeed,
    strikerBallsFaced,
    strikerRunsScored,
    testConditions,
    whiteBallModifiers,
    isFreeHit: currentInnings.isFreeHit,
    allocatedOvers,
    bowlingFielders,
    individualBatterInstruction: match.individualBatterInstructions?.[striker.id],
    teamBattingGamePlan: isUserBatting
      ? (match.teamBattingGamePlans?.home || match.teamBattingGamePlans?.away)
      : (match.teamBattingGamePlans?.away || match.teamBattingGamePlans?.home),
    customScoringTargets: match.customScoringTargets,
    individualBowlingPlan: match.individualBowlingPlans?.[bowler.id],
    bowlerSpellData: match.bowlerSpellData?.[bowler.id],
    customFieldLayout: match.activeFieldLayout,
    tacticalCalibration: match.tacticalCalibration,
    isUserBatting: isUserTeamBatting,
    isUserBowling: isUserTeamBowling,
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

  // Record Match Intelligence Deliveries (Wagon Wheel & Pitch Map)
  let updatedWagonWheel = match.wagonWheelDeliveries || [];
  if (ballOutcome.wagonWheel) {
    updatedWagonWheel = [
      ...updatedWagonWheel.slice(-300),
      {
        deliveryIndex,
        strikerId: striker.id,
        runs: ballOutcome.runsOffBat,
        angleDegrees: ballOutcome.wagonWheel.angleDegrees,
        distanceMeters: ballOutcome.wagonWheel.distanceMeters,
        zone: ballOutcome.wagonWheel.zone as any,
        isBoundary: ballOutcome.runsOffBat === 4 || ballOutcome.runsOffBat === 6,
        isAerial: ballOutcome.wagonWheel.isAerial,
      },
    ];
  }

  let updatedPitchMap = match.pitchMapDeliveries || [];
  if (ballOutcome.pitchMap) {
    updatedPitchMap = [
      ...updatedPitchMap.slice(-300),
      {
        deliveryIndex,
        bowlerId: bowler.id,
        strikerId: striker.id,
        line: ballOutcome.pitchMap.line,
        length: ballOutcome.pitchMap.length,
        xCm: ballOutcome.pitchMap.xCm,
        yMeters: ballOutcome.pitchMap.yMeters,
        runs: ballOutcome.totalRuns,
        isWicket: ballOutcome.isWicket,
        isDot: ballOutcome.totalRuns === 0,
      },
    ];
  }

  // Update Bowler Spell Management & Workload Recovery on Over Completion
  let updatedSpellData = match.bowlerSpellData ? { ...match.bowlerSpellData } : {};
  if (ballOutcome.isLegalDelivery && updatedInnings.ballsInCurrentOver === 0) {
    const curBowlerId = currentInnings.currentBowlerId;
    if (updatedSpellData[curBowlerId]) {
      updatedSpellData[curBowlerId] = recordOverInSpellManager(
        updatedSpellData[curBowlerId],
        bowler,
        match.format
      );
    }
    updatedSpellData = applyRestToBenchBowlers(updatedSpellData, curBowlerId);
  }

  // White-ball over completion: record spell over and select next phase-aware bowler
  if (
    match.format !== 'TEST' &&
    updatedInnings.ballsInCurrentOver === 0 &&
    !updatedInnings.isCompleted &&
    ballOutcome.isLegalDelivery
  ) {
    recordWhiteBallOverInSpellTracker(
      updatedInnings,
      currentInnings.currentBowlerId,
      updatedInnings.completedOvers - 1
    );
    const bowlingXI = updatedInnings.bowlingTeamId === match.homeTeamId ? match.homeXI : match.awayXI;
    updatedInnings.currentBowlerId = selectNextBowler(match, updatedInnings, bowlingXI);
  }

  const updatedInningsList = [...match.innings];
  updatedInningsList[match.currentInningsIndex] = updatedInnings;

  let updatedMatch: Match = {
    ...match,
    aiTactics: activeAiTactics,
    innings: updatedInningsList,
    wagonWheelDeliveries: updatedWagonWheel,
    pitchMapDeliveries: updatedPitchMap,
    bowlerSpellData: updatedSpellData,
  };

  // Test cricket legal over completion:
  // 1) Record spell over 2) Advance Test time/sessions/weather/ballAge 3) Rotate bowler 4) Check AI declaration!
  if (match.format === 'TEST' && ballOutcome.isLegalDelivery && updatedInnings.ballsInCurrentOver === 0) {
    recordBowlerOverInSpellTracker(
      updatedInnings,
      currentInnings.currentBowlerId,
      updatedInnings.completedOvers - 1
    );

    updatedMatch = advanceTestOverTimeAndConditions(updatedMatch, getPlayerById);

    const postTimeInn = updatedMatch.innings[updatedMatch.currentInningsIndex];
    if (postTimeInn && !postTimeInn.isCompleted && !isTerminalMatchStatus(updatedMatch.status)) {
      const bowlingXI = postTimeInn.bowlingTeamId === match.homeTeamId ? updatedMatch.homeXI : updatedMatch.awayXI;
      postTimeInn.currentBowlerId = selectNextBowler(updatedMatch, postTimeInn, bowlingXI);

      // AI Captain Declaration Check at the end of an over
      if (!isUserBatting && shouldAICaptainDeclare(updatedMatch)) {
        return declareInnings(updatedMatch);
      }
    }
  } else if (match.format === 'TEST' && updatedMatch.sessionBreakStatus) {
    // Clear transient session break banner once play resumes on subsequent ball
    updatedMatch.sessionBreakStatus = undefined;
  }

  const finalActiveInn = updatedMatch.innings[updatedMatch.currentInningsIndex] || updatedInnings;

  // Check if match completed or follow-on prompt triggered on this ball
  if (finalActiveInn.isCompleted && !isTerminalMatchStatus(updatedMatch.status)) {
    if (match.format === 'TEST') {
      if (match.currentInningsIndex === 1) {
        const eligible = isTestFollowOnEligible(updatedMatch);
        updatedMatch.isFollowOnEligible = eligible;
        if (
          eligible &&
          updatedMatch.followOnEnforced === undefined &&
          updatedMatch.isUserMatch &&
          interactiveUserPlayMode &&
          updatedMatch.innings[0]?.battingTeamId === updatedMatch.userTeamId
        ) {
          updatedMatch.followOnOffered = true;
          updatedMatch.awaitingFollowOnDecision = true;
        }
      }

      const isInningsVictoryOnFollowOn =
        updatedMatch.followOnEnforced &&
        updatedMatch.currentInningsIndex === 2 &&
        updatedMatch.innings[1] &&
        updatedMatch.innings[0] &&
        updatedMatch.innings[1].totalRuns + finalActiveInn.totalRuns < updatedMatch.innings[0].totalRuns;

      const isInningsVictoryNormalOrder =
        !updatedMatch.followOnEnforced &&
        updatedMatch.currentInningsIndex === 2 &&
        updatedMatch.innings[1] &&
        updatedMatch.innings[0] &&
        updatedMatch.innings[0].totalRuns + finalActiveInn.totalRuns < updatedMatch.innings[1].totalRuns;

      if (
        updatedMatch.currentInningsIndex === 3 ||
        isInningsVictoryOnFollowOn ||
        isInningsVictoryNormalOrder
      ) {
        const { resultText, winnerTeamId, potm } = computeMatchResult(updatedMatch);
        updatedMatch.status = resultText.includes('Tied')
          ? 'TIE'
          : resultText.includes('Drawn')
          ? 'DRAW'
          : 'COMPLETED';
        updatedMatch.winnerTeamId = winnerTeamId;
        updatedMatch.resultText = resultText;
        updatedMatch.playerOfTheMatch = potm;
      }
    } else if (match.currentInningsIndex === 1) {
      const isScoresTied = match.innings[0].totalRuns === finalActiveInn.totalRuns;
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
 * Executes a validated captain's declaration in Test cricket, immediately ending the innings.
 */
export function ensureMatchTacticalSystemsInitialized(match: Match): Match {
  let updated = { ...match };

  if (!updated.tacticalCalibration) {
    updated.tacticalCalibration = { ...DEFAULT_TACTICAL_CALIBRATION };
  }

  if (!updated.userTactics || !updated.userTactics.battingAggression || !updated.userTactics.bowlingTactic) {
    updated.userTactics = {
      battingAggression: updated.userTactics?.battingAggression || 'BALANCED',
      bowlingTactic: updated.userTactics?.bowlingTactic || 'BALANCED_CONTAIN',
      fieldPreset: updated.userTactics?.fieldPreset || 'BALANCED_STANDARD',
    };
  }

  if (!updated.aiTactics || !updated.aiTactics.battingAggression || !updated.aiTactics.bowlingTactic) {
    updated.aiTactics = {
      battingAggression: updated.aiTactics?.battingAggression || 'BALANCED',
      bowlingTactic: updated.aiTactics?.bowlingTactic || 'BALANCED_CONTAIN',
      fieldPreset: updated.aiTactics?.fieldPreset || 'BALANCED_STANDARD',
    };
  }

  if (!updated.homeXI || updated.homeXI.length < 11) {
    updated.homeXI = getDefaultPlayingXI(updated.homeTeamId || 'IND', updated.format);
  }
  if (!updated.awayXI || updated.awayXI.length < 11) {
    updated.awayXI = getDefaultPlayingXI(updated.awayTeamId || 'AUS', updated.format);
  }
  if (!updated.homeCaptainId) {
    updated.homeCaptainId = getDefaultCaptainId(updated.homeTeamId || 'IND', updated.format);
  }
  if (!updated.awayCaptainId) {
    updated.awayCaptainId = getDefaultCaptainId(updated.awayTeamId || 'AUS', updated.format);
  }
  if (!updated.homeWicketKeeperId) {
    updated.homeWicketKeeperId = getDefaultWicketKeeperId(updated.homeTeamId || 'IND', updated.format);
  }
  if (!updated.awayWicketKeeperId) {
    updated.awayWicketKeeperId = getDefaultWicketKeeperId(updated.awayTeamId || 'AUS', updated.format);
  }

  if (!updated.drsReviewsRemaining) {
    const defaultReviews = match.format === 'TEST' ? 3 : 2;
    updated.drsReviewsRemaining = {
      home: defaultReviews,
      away: defaultReviews,
    };
  }

  if (!updated.drsHistory) {
    updated.drsHistory = [];
  }

  if (!updated.phaseScoringTargets && match.format !== 'TEST') {
    updated.phaseScoringTargets = createDefaultPhaseTargets(match.format);
  }

  if (!updated.customScoringTargets || updated.customScoringTargets.length === 0) {
    updated.customScoringTargets = [];
    if (updated.phaseScoringTargets?.powerplayTarget) {
      updated.customScoringTargets.push({ ...updated.phaseScoringTargets.powerplayTarget });
    }
    if (updated.phaseScoringTargets?.middlePhaseTarget) {
      updated.customScoringTargets.push({ ...updated.phaseScoringTargets.middlePhaseTarget });
    }
    if (updated.phaseScoringTargets?.deathPhaseTarget) {
      updated.customScoringTargets.push({ ...updated.phaseScoringTargets.deathPhaseTarget });
    }
  }

  if (!updated.bowlerSpellData) {
    const spellData: Record<string, BowlerSpellData> = {};
    const allBowlerIds = Array.from(new Set([...(updated.homeXI || []), ...(updated.awayXI || [])]));
    allBowlerIds.forEach((id) => {
      const p = getPlayerById(id);
      if (p) {
        spellData[id] = initializeBowlerSpellData(p, match.format, match.pitch);
      }
    });
    updated.bowlerSpellData = spellData;
  }

  if (!updated.individualBatterInstructions) {
    updated.individualBatterInstructions = {};
  }

  if (!updated.individualBowlingPlans) {
    updated.individualBowlingPlans = {};
  }

  if (!updated.savedFieldPresets || updated.savedFieldPresets.length === 0) {
    const homeWk = updated.homeWicketKeeperId || updated.homeXI[0];
    const presets = getStandardFieldPresets(updated.homeXI[updated.homeXI.length - 1], updated.homeXI, homeWk);
    updated.savedFieldPresets = Object.values(presets);
    if (!updated.activeFieldLayout) {
      updated.activeFieldLayout = presets.BALANCED_STANDARD;
    }
  }

  if (!updated.wagonWheelDeliveries) {
    updated.wagonWheelDeliveries = [];
  }
  if (!updated.pitchMapDeliveries) {
    updated.pitchMapDeliveries = [];
  }

  return updated;
}

export function executeDRSReview(
  match: Match,
  reviewType: DRSReviewType,
  reviewingTeamId: string
): { updatedMatch: Match; review: DRSReviewState } {
  let m = ensureMatchTacticalSystemsInitialized(match);
  const currentInnings = m.innings[m.currentInningsIndex] || m.innings[0];
  const lastBall = currentInnings.recentBalls[currentInnings.recentBalls.length - 1];

  const deliveryIndex =
    m.currentInningsIndex * 10000 +
    currentInnings.completedOvers * 6 +
    currentInnings.ballsInCurrentOver +
    currentInnings.extras.wides +
    currentInnings.extras.noBalls;

  const striker = getPlayerById(currentInnings.currentStrikerId);
  const bowler = getPlayerById(currentInnings.currentBowlerId);
  const isSpin = bowler.bowlingStyle ? bowler.bowlingStyle.toLowerCase().includes('spin') : false;

  const originalDecision: 'OUT' | 'NOT_OUT' = lastBall?.isWicket ? 'OUT' : 'NOT_OUT';
  const dismissalType: DismissalType = lastBall?.wicketDetails?.type || 'LBW';

  let outcome: DRSOutcome = 'DECISION_STANDS';
  let finalDecision: 'OUT' | 'NOT_OUT' = originalDecision;
  let reason = '';
  let ballTracking: DRSReviewState['ballTracking'] | undefined = undefined;
  let ultraEdge: DRSReviewState['ultraEdge'] | undefined = undefined;

  if (reviewType === 'LBW') {
    const res = evaluateLBWReview({
      deliveryIndex,
      bowler,
      striker,
      pitch: m.pitch,
      originalDecision,
      isSpin,
    });
    outcome = res.outcome;
    finalDecision = res.finalDecision;
    reason = res.reason;
    ballTracking = res.ballTracking;
  } else {
    const res = evaluateCaughtBehindReview({
      deliveryIndex,
      originalDecision,
    });
    outcome = res.outcome;
    finalDecision = res.finalDecision;
    reason = res.reason;
    ultraEdge = res.ultraEdge;
  }

  const isHome = reviewingTeamId === m.homeTeamId;
  const currentRemaining = isHome ? m.drsReviewsRemaining!.home : m.drsReviewsRemaining!.away;

  // Review Retention Law: Retained if decision is OVERTURNED or if UMPIRE'S CALL
  const retained = outcome === 'DECISION_OVERTURNED' || outcome === 'UMPIRES_CALL';
  const newRemaining = retained ? currentRemaining : Math.max(0, currentRemaining - 1);

  const updatedReviewsRemaining = {
    home: isHome ? newRemaining : m.drsReviewsRemaining!.home,
    away: !isHome ? newRemaining : m.drsReviewsRemaining!.away,
  };

  const review: DRSReviewState = {
    id: `drs_${Date.now()}_${deliveryIndex}`,
    matchId: m.id,
    deliveryIndex,
    overNumber: currentInnings.completedOvers,
    ballInOver: currentInnings.ballsInCurrentOver,
    reviewingTeamId,
    originalDecision,
    dismissalType,
    strikerId: striker.id,
    bowlerId: bowler.id,
    reviewType,
    outcome,
    finalDecision,
    reason,
    ballTracking,
    ultraEdge,
    reviewsRemainingHome: updatedReviewsRemaining.home,
    reviewsRemainingAway: updatedReviewsRemaining.away,
    retained,
  };

  // If decision is OVERTURNED from OUT to NOT OUT, adjust scorecard
  if (originalDecision === 'OUT' && finalDecision === 'NOT_OUT') {
    if (lastBall && lastBall.isWicket) {
      lastBall.isWicket = false;
      lastBall.wicketDetails = undefined;
      currentInnings.wickets = Math.max(0, currentInnings.wickets - 1);
      currentInnings.fallOfWickets.pop();
      const bScore = currentInnings.batters.find((b) => b.playerId === striker.id);
      if (bScore) {
        bScore.dismissal = undefined;
      }
    }
  } else if (originalDecision === 'NOT_OUT' && finalDecision === 'OUT') {
    if (lastBall) {
      lastBall.isWicket = true;
      lastBall.wicketDetails = {
        type: dismissalType,
        bowlerId: bowler.id,
        bowlerName: bowler.shortName,
        dismissedPlayerId: striker.id,
        description: dismissalType === 'LBW' ? `lbw b ${bowler.shortName}` : `c †wk b ${bowler.shortName}`,
      };
      currentInnings.wickets += 1;
    }
  }

  m = {
    ...m,
    drsReviewsRemaining: updatedReviewsRemaining,
    drsHistory: [review, ...(m.drsHistory || [])],
    activeDRSReview: review,
  };

  return { updatedMatch: m, review };
}

export function updateIndividualBatterInstruction(
  match: Match,
  instruction: IndividualBatterInstruction
): Match {
  return {
    ...match,
    individualBatterInstructions: {
      ...(match.individualBatterInstructions || {}),
      [instruction.playerId]: instruction,
    },
  };
}

export function updateIndividualBowlingPlan(
  match: Match,
  plan: IndividualBowlingPlan
): Match {
  return {
    ...match,
    individualBowlingPlans: {
      ...(match.individualBowlingPlans || {}),
      [plan.bowlerId]: plan,
    },
  };
}

export function updateCustomScoringTargets(
  match: Match,
  targets: CustomScoringTarget[]
): Match {
  return {
    ...match,
    customScoringTargets: targets,
  };
}

export function updatePhaseScoringTargets(
  match: Match,
  phaseTargets: PhaseScoringTargets
): Match {
  return {
    ...match,
    phaseScoringTargets: phaseTargets,
  };
}

export function updateActiveFieldLayout(
  match: Match,
  layout: CustomFieldLayout
): Match {
  return {
    ...match,
    activeFieldLayout: layout,
  };
}

export function updateTeamBattingGamePlan(
  match: Match,
  teamId: string,
  plan: TeamBattingGamePlan
): Match {
  const isHome = teamId === match.homeTeamId;
  return {
    ...match,
    teamBattingGamePlans: {
      home: isHome ? plan : (match.teamBattingGamePlans?.home || 'BALANCED_BATTING'),
      away: !isHome ? plan : (match.teamBattingGamePlans?.away || 'BALANCED_BATTING'),
    },
  };
}

export function declareInnings(match: Match): Match {
  const check = validateTestDeclaration(match);
  if (!check.allowed) return match;

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
 * Conducts an ICC-compliant Super Over for tied T20I / knockout matches
 * (1 legal over per team, 3 nominated batters, 2 wickets end innings, repeat Super Overs if tied)
 */
export function simulateSuperOver(match: Match): Match {
  return simulateWhiteBallSuperOver(
    match,
    getPlayerById,
    getMatchSeed,
    (m) => computeMatchResult(m).potm
  );
}

/**
 * Simulates an entire over
 */
export function stepMatchOver(match: Match): Match {
  let current = match;
  if (isTerminalMatchStatus(current.status)) return current;
  if (current.format === 'TEST' && current.awaitingFollowOnDecision && interactiveUserPlayMode) {
    return current;
  }

  const currentInn = current.innings[current.currentInningsIndex];
  if (!currentInn || currentInn.isCompleted) return stepMatchBall(current);

  const targetInnIdx = current.currentInningsIndex;
  const startingOver = currentInn.completedOvers;
  let iterations = 0;

  while (
    current.status === 'IN_PROGRESS' &&
    !(current.format === 'TEST' && current.awaitingFollowOnDecision && interactiveUserPlayMode) &&
    current.currentInningsIndex === targetInnIdx &&
    current.innings[targetInnIdx] &&
    !current.innings[targetInnIdx].isCompleted &&
    current.innings[targetInnIdx].completedOvers === startingOver &&
    iterations < 24
  ) {
    current = stepMatchBall(current);
    iterations++;
  }

  return current;
}

/**
 * Simulates until current innings finishes (supports unlimited Test innings overs without arbitrary 75-over cap)
 */
export function stepMatchInnings(match: Match): Match {
  let current = match;
  if (isTerminalMatchStatus(current.status)) return current;
  if (current.format === 'TEST' && current.awaitingFollowOnDecision && interactiveUserPlayMode) {
    return current;
  }

  if (isPreMatchStatus(current.status)) {
    current = stepMatchBall(current);
  }

  const currentInn = current.innings[current.currentInningsIndex];
  if (!currentInn || currentInn.isCompleted) {
    current = stepMatchBall(current);
    if (isTerminalMatchStatus(current.status) || current.awaitingFollowOnDecision) {
      return current;
    }
  }

  const targetInnIdx = current.currentInningsIndex;
  const maxIterations = current.format === 'TEST' ? 2400 : 600;
  let iterations = 0;

  while (
    current.status === 'IN_PROGRESS' &&
    !(current.format === 'TEST' && current.awaitingFollowOnDecision && interactiveUserPlayMode) &&
    current.currentInningsIndex === targetInnIdx &&
    current.innings[targetInnIdx] &&
    !current.innings[targetInnIdx].isCompleted &&
    iterations < maxIterations
  ) {
    current = stepMatchBall(current);
    iterations++;
    if (
      current.format === 'TEST' &&
      current.currentInningsIndex === targetInnIdx &&
      current.innings[targetInnIdx] &&
      !current.innings[targetInnIdx].isCompleted &&
      current.innings[targetInnIdx].ballsInCurrentOver === 0 &&
      shouldAICaptainDeclare(current)
    ) {
      current = declareInnings(current);
      break;
    }
  }

  return current;
}

/**
 * Simulates entire match to completion
 */
export function simulateFullMatch(match: Match, career?: CareerSave): Match {
  if (isTerminalMatchStatus(match.status)) return match;

  const prevInteractive = interactiveUserPlayMode;
  interactiveUserPlayMode = false;
  try {
    return withCareerSimulationContext(career, () => {
      let current: Match = {
        ...match,
        awaitingFollowOnDecision: false,
      };

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
        const bowlingWkId =
          bowlingFirstId === current.homeTeamId ? current.homeWicketKeeperId : current.awayWicketKeeperId;
        const bowlingNominated =
          bowlingFirstId === current.homeTeamId ? current.homeBowlingOptions : current.awayBowlingOptions;

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
          bowlingXI,
          undefined,
          current.format === 'TEST'
            ? {
                format: 'TEST',
                pitch: current.pitch,
                weather: current.weather,
                bowlingWicketKeeperId: bowlingWkId,
                nominatedBowlerIds: bowlingNominated,
              }
            : {
                format: current.format,
                pitch: current.pitch,
                weather: current.weather,
                bowlingWicketKeeperId: bowlingWkId,
                allocatedOvers: current.allocatedOversPerInnings,
                seed: tossSeed + 101,
                nominatedBowlerIds: bowlingNominated,
              }
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
          ...(current.format === 'TEST'
            ? {
                oversPerDay: current.oversPerDay || DEFAULT_TEST_OVERS_PER_DAY,
                newBallOversThreshold: current.newBallOversThreshold || DEFAULT_NEW_BALL_OVERS,
                oversLostToday: 0,
                totalOversLostToWeather: current.totalOversLostToWeather || 0,
                extraOversToday: 0,
                pitchWear: current.pitchWear ?? getInitialTestPitchWear(current.pitch, tossSeed),
                dynamicWeather: current.dynamicWeather || createInitialTestWeather(current.weather, tossSeed),
              }
            : {
                whiteBallConditions:
                  current.whiteBallConditions || createWhiteBallConditions(current, tossSeed),
              }),
        };
      }

      let iterations = 0;
      const maxIterations = current.format === 'TEST' ? 5500 : 1200;

      while (!isTerminalMatchStatus(current.status) && iterations < maxIterations) {
        current = stepMatchBall(current);
        iterations++;
      }

      // Fallback for Test cricket if maximum time/overs are exhausted
      if (current.format === 'TEST' && (!isTerminalMatchStatus(current.status) || current.dayNumber > 5)) {
        const res = computeMatchResult(current);
        const allFourDone = current.innings.length === 4 && current.innings[3].isCompleted;
        const isTie = allFourDone && res.resultText.includes('Tied');
        current = {
          ...current,
          status: isTie ? 'TIE' : allFourDone && res.winnerTeamId ? 'COMPLETED' : 'DRAW',
          winnerTeamId: allFourDone ? res.winnerTeamId : undefined,
          resultText:
            isTie || (allFourDone && res.winnerTeamId)
              ? res.resultText
              : 'Match Drawn (Time Expired on Day 5)',
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
  } finally {
    interactiveUserPlayMode = prevInteractive;
  }
}

export function accumulateMatchIntoFormatStats(st: FormatStats, match: Match, pId: string): FormatStats {
  const prevBalls =
    st.ballsFaced !== undefined
      ? st.ballsFaced
      : st.strikeRate > 0
      ? Math.round((st.runs / st.strikeRate) * 100)
      : 0;
  let matchBallsFaced = 0;
  let matchWicketsTaken = 0;

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

      if (b.runs >= 200) {
        st.doubleCenturies = (st.doubleCenturies || 0) + 1;
        st.centuries += 1;
      } else if (b.runs >= 100) {
        st.centuries += 1;
      } else if (b.runs >= 50) {
        st.fifties += 1;
      }
    }

    const bw = inn.bowlers?.find((bowl) => bowl.playerId === pId);
    if (bw && (bw.overs > 0 || bw.ballsThisOver > 0)) {
      st.bowlingInnings += 1;
      st.oversBowled = Number((st.oversBowled + bw.overs + bw.ballsThisOver / 6).toFixed(2));
      st.maidens += bw.maidens;
      st.runsConceded += bw.runs;
      st.wickets += bw.wickets;
      matchWicketsTaken += bw.wickets;

      if (
        bw.wickets > st.bestBowlingWickets ||
        (bw.wickets === st.bestBowlingWickets && bw.wickets > 0 && (st.bestBowlingRuns === 0 || bw.runs < st.bestBowlingRuns))
      ) {
        st.bestBowlingWickets = bw.wickets;
        st.bestBowlingRuns = bw.runs;
      }

      if (bw.wickets === 4) {
        st.fourWicketHauls = (st.fourWicketHauls || 0) + 1;
      } else if (bw.wickets >= 5) {
        st.fiveWicketHauls += 1;
      }
    }

    // Accurately credit fielding dismissals across the entire innings (not just the last 24 balls!)
    let hasBatterDismissalRecords = false;
    (inn.batters || []).forEach((bat) => {
      if (bat.dismissal) {
        hasBatterDismissalRecords = true;
        if (bat.dismissal.fielderId === pId) {
          if (bat.dismissal.type === 'CAUGHT') st.catches += 1;
          else if (bat.dismissal.type === 'RUN_OUT') st.runOuts += 1;
          else if (bat.dismissal.type === 'STUMPED') st.stumpings += 1;
        }
      }
    });

    if (!hasBatterDismissalRecords) {
      (inn.recentBalls || []).forEach((ball) => {
        if (ball.isWicket && ball.wicketDetails && ball.wicketDetails.fielderId === pId) {
          if (ball.wicketDetails.type === 'CAUGHT') st.catches += 1;
          else if (ball.wicketDetails.type === 'RUN_OUT') st.runOuts += 1;
          else if (ball.wicketDetails.type === 'STUMPED') st.stumpings += 1;
        }
      });
    }
  });

  if (matchWicketsTaken >= 10) {
    st.tenWicketHauls = (st.tenWicketHauls || 0) + 1;
  }

  const dismissals = Math.max(0, st.innings - st.notOuts);
  st.average = dismissals > 0 ? Number((st.runs / dismissals).toFixed(2)) : st.runs;

  const totalBalls = prevBalls + matchBallsFaced;
  st.ballsFaced = totalBalls;
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

  // Matches abandoned without a ball bowled do not count as official caps/matches
  if (match.status === 'ABANDONED' && (!match.innings || match.innings.length === 0)) {
    return;
  }

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
