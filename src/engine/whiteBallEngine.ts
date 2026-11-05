import {
  Match,
  MatchFormat,
  InningsState,
  Player,
  BattingAggression,
  BowlingTactic,
  FieldPreset,
  WhiteBallMatchConditions,
  PitchCondition,
  WeatherCondition,
} from '../types/cricket';
import { INTERNATIONAL_TEAMS } from '../data/teams';
import { resolveVenueProfile } from '../data/venues';
import {
  getPowerplayPhase,
  getMaxOversPerInnings,
  getEffectiveMaxOversForBowler,
  applyBallToInnings,
} from './rules';
import {
  isSpinBowler,
  mulberry32,
  simulateDelivery,
  FieldingPlayerRef,
} from './simulation';

/**
 * Official DLS Support Status (Phase 2 Requirement):
 * Duckworth-Lewis-Stern official ICC resource tables are proprietary/licensed and are NOT approximated.
 * Mid-innings revised target invention is strictly disabled; pre-match equal-overs reductions,
 * No Result, and Abandoned outcomes are supported accurately.
 */
export const DLS_SUPPORT_STATUS = {
  supported: false as const,
  label: 'DLS Unsupported',
  explanation:
    'Duckworth-Lewis-Stern (DLS) revised target calculations are not supported because official licensed resource tables are unavailable. Never invents revised targets; shortened matches require equal overs set prior to play, and mid-match washouts conclude as official No Result.',
};

export const MIN_OVERS_FOR_WHITE_BALL_RESULT: Record<'ODI' | 'T20I', number> = {
  ODI: 20,
  T20I: 5,
};

export interface WhiteBallConditionsModifiers {
  effectivePaceBonus: number;
  effectiveSpinBonus: number;
  effectiveSwingBonus: number;
  boundaryFourMultiplier: number;
  boundarySixMultiplier: number;
  twoRunsMultiplier: number;
  dewGripPenalty: number;
  dewBattingBoost: number;
  ballSoftnessSixMod: number;
  newBallWicketBoost: number;
}

/**
 * Creates deterministic white-ball match conditions (ground dimensions, surface pace/bounce/seam/spin,
 * cloud cover, humidity, temperature, and evening dew) for ODI and T20I matches.
 */
export function createWhiteBallConditions(
  match: Pick<Match, 'format' | 'venue' | 'pitch' | 'weather'>,
  seed: number = 101
): WhiteBallMatchConditions {
  const rand = mulberry32(seed + 4219);
  const venueProfile = resolveVenueProfile(match.venue);

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, Math.round(val)));

  const safePitch: PitchCondition =
    match.pitch && typeof match.pitch === 'object' && (match.pitch as any).type
      ? (match.pitch as PitchCondition)
      : {
          name: typeof match.pitch === 'string' ? match.pitch : 'Standard',
          type: 'SPORTING_BALANCED',
          paceBonus: 0,
          spinBonus: 0,
          bounceVariation: 0,
          wearFactor: 1.0,
        };

  const safeWeather: WeatherCondition =
    match.weather && typeof match.weather === 'object' && (match.weather as any).type
      ? (match.weather as WeatherCondition)
      : {
          type: typeof match.weather === 'string' ? (match.weather as any) : 'SUNNY',
          swingBonus: 6,
          description: 'Clear conditions.',
        };

  const basePace =
    safePitch.type === 'GREEN_SEAMER'
      ? 76
      : safePitch.type === 'BATTER_PARADISE'
      ? 68
      : safePitch.type === 'DUSTBOWL_SPIN'
      ? 44
      : 62;
  const surfacePace = clamp(basePace + (safePitch.paceBonus || 0) * 0.8 + (rand() - 0.5) * 8, 25, 95);

  const baseBounce =
    safePitch.type === 'GREEN_SEAMER'
      ? 74
      : safePitch.type === 'BATTER_PARADISE'
      ? 70
      : safePitch.type === 'DUSTBOWL_SPIN'
      ? 48
      : 64;
  const bounce = clamp(baseBounce + (safePitch.bounceVariation || 0) * 0.7 + (rand() - 0.5) * 8, 30, 95);

  const seamMovement = clamp(
    35 + (safePitch.paceBonus || 0) * 1.8 + (safePitch.type === 'GREEN_SEAMER' ? 16 : 0) + (rand() - 0.5) * 10,
    15,
    92
  );

  const spinAssistance = clamp(
    40 + (safePitch.spinBonus || 0) * 1.9 + (safePitch.type === 'DUSTBOWL_SPIN' ? 20 : 0) + (rand() - 0.5) * 10,
    15,
    95
  );

  let cloudCover = 28;
  let humidity = 52;
  let temperatureC = 27;

  switch (safeWeather.type) {
    case 'OVERCAST_SWING':
      cloudCover = 82;
      humidity = 74;
      temperatureC = 19;
      break;
    case 'RAIN_RISK':
      cloudCover = 88;
      humidity = 84;
      temperatureC = 21;
      break;
    case 'HUMID':
      cloudCover = 46;
      humidity = 82;
      temperatureC = 31;
      break;
    case 'HAZY':
      cloudCover = 50;
      humidity = 68;
      temperatureC = 29;
      break;
    case 'SUNNY':
    default:
      cloudCover = 18;
      humidity = venueProfile.dewProne ? 64 : 44;
      temperatureC = venueProfile.dewProne ? 30 : 26;
      break;
  }

  cloudCover = clamp(cloudCover + (rand() - 0.5) * 12, 5, 98);
  humidity = clamp(humidity + (rand() - 0.5) * 10, 25, 96);
  temperatureC = clamp(temperatureC + (rand() - 0.5) * 5, 14, 39);

  // Dew is most prominent in floodlit T20Is and day-night ODIs at humid / coastal / subcontinental venues
  let dewFactor: 'NONE' | 'MILD' | 'HEAVY' = 'NONE';
  const dewScore =
    (venueProfile.dewProne ? 35 : 0) +
    (humidity >= 72 ? 32 : humidity >= 60 ? 18 : 0) +
    (match.format === 'T20I' ? 18 : 10) +
    rand() * 20;

  if (dewScore >= 72) {
    dewFactor = 'HEAVY';
  } else if (dewScore >= 46) {
    dewFactor = 'MILD';
  }

  return {
    boundarySize: venueProfile.boundarySize,
    avgBoundaryMeters: venueProfile.avgBoundaryMeters,
    surfacePace,
    bounce,
    seamMovement,
    spinAssistance,
    cloudCover,
    humidity,
    temperatureC,
    dewFactor,
    dlsSupported: false,
  };
}

/**
 * Computes ball-by-ball white-ball condition modifiers with distinct ODI (two new balls, 50-over softening)
 * vs T20I (single hard ball, stronger boundary/dew impact) behaviour.
 */
export function getWhiteBallConditionsModifiers(
  match: Pick<Match, 'format' | 'venue' | 'pitch' | 'weather' | 'whiteBallConditions' | 'seed' | 'id'>,
  innings: Pick<InningsState, 'inningsNumber' | 'completedOvers'>
): WhiteBallConditionsModifiers {
  const cond =
    match.whiteBallConditions ||
    createWhiteBallConditions(match, match.seed ?? 101);

  const over = innings.completedOvers;
  const isSecondInnings = innings.inningsNumber === 2;

  // Ground dimensions impact
  let boundaryFourMultiplier = 1.0;
  let boundarySixMultiplier = 1.0;
  let twoRunsMultiplier = 1.0;

  if (cond.boundarySize === 'SHORT') {
    boundaryFourMultiplier = 1.08;
    boundarySixMultiplier = 1.15;
    twoRunsMultiplier = 0.90;
  } else if (cond.boundarySize === 'LARGE') {
    boundaryFourMultiplier = 0.93;
    boundarySixMultiplier = 0.84;
    twoRunsMultiplier = 1.18;
  }

  // True pace & bounce help timing & carry
  const paceCarryMod = 0.94 + (cond.surfacePace / 100) * 0.12;
  boundaryFourMultiplier *= paceCarryMod;

  // Separate ODI vs T20I white-ball behaviour
  let effectivePaceBonus = match.pitch.paceBonus + (cond.seamMovement - 50) * 0.12;
  let effectiveSpinBonus = match.pitch.spinBonus + (cond.spinAssistance - 50) * 0.14;
  let effectiveSwingBonus = match.weather.swingBonus + (cond.cloudCover - 40) * 0.08;
  let ballSoftnessSixMod = 1.0;
  let newBallWicketBoost = 1.0;

  if (match.format === 'ODI') {
    // ODI uses TWO new white balls (1 from each end), so each ball is half as old as completedOvers!
    const ballAgeEachEnd = over / 2;
    if (ballAgeEachEnd < 5) {
      // Overs 1-10: Twin new white balls swing and nip
      effectiveSwingBonus += 5;
      effectivePaceBonus += 3;
      newBallWicketBoost = 1.08;
    } else if (ballAgeEachEnd < 17) {
      // Overs 11-34: Hard white ball, minimal swing, optimal batting conditions unless pitch turns
      effectiveSwingBonus *= 0.35;
      ballSoftnessSixMod = 1.03;
    } else {
      // Overs 35-50: Older softer white balls grip slightly for cutters/spinners & require more power to clear big boundaries
      effectiveSwingBonus *= 0.15;
      effectiveSpinBonus += 3;
      ballSoftnessSixMod = 0.94;
    }
  } else {
    // T20I uses ONE white ball for 20 overs: swings only for first 2-3 overs, stays hard throughout
    if (over < 3) {
      effectiveSwingBonus += 4;
      newBallWicketBoost = 1.06;
    } else {
      effectiveSwingBonus *= 0.25;
    }
    ballSoftnessSixMod = 1.04;
  }

  // Evening Dew impact (strongest in 2nd innings under lights, or late 1st innings if heavy)
  let dewGripPenalty = 1.0;
  let dewBattingBoost = 1.0;

  if (isSecondInnings && cond.dewFactor === 'HEAVY') {
    effectiveSpinBonus -= 8;
    effectiveSwingBonus *= 0.65;
    dewGripPenalty = 0.89; // Wet ball harder for bowlers to grip
    dewBattingBoost = 1.07; // Skids nicely onto the bat & faster wet outfield
    boundaryFourMultiplier *= 1.05;
  } else if (isSecondInnings && cond.dewFactor === 'MILD') {
    effectiveSpinBonus -= 4;
    dewGripPenalty = 0.95;
    dewBattingBoost = 1.03;
  } else if (!isSecondInnings && match.format === 'T20I' && over >= 14 && cond.dewFactor === 'HEAVY') {
    dewGripPenalty = 0.96;
    dewBattingBoost = 1.02;
  }

  return {
    effectivePaceBonus,
    effectiveSpinBonus,
    effectiveSwingBonus: Math.max(0, effectiveSwingBonus),
    boundaryFourMultiplier,
    boundarySixMultiplier: boundarySixMultiplier * ballSoftnessSixMod,
    twoRunsMultiplier,
    dewGripPenalty,
    dewBattingBoost,
    ballSoftnessSixMod,
    newBallWicketBoost,
  };
}

/**
 * Applies an official pre-match equal-overs rain reduction (e.g. 35-over ODI or 12-over T20I)
 * BEFORE the match starts. Does not invent DLS revised targets.
 */
export function applyPreMatchOversReduction(match: Match, oversPerSide: number): Match {
  if (match.format === 'TEST') return match;
  const minOvers = MIN_OVERS_FOR_WHITE_BALL_RESULT[match.format];
  const maxOvers = match.format === 'ODI' ? 50 : 20;
  const clamped = Math.max(minOvers, Math.min(maxOvers, Math.floor(oversPerSide)));

  const hasBowledBall = match.innings.some(
    (inn) => inn.completedOvers > 0 || inn.ballsInCurrentOver > 0 || inn.recentBalls.length > 0
  );
  if (hasBowledBall) {
    // Cannot apply equal-overs pre-match reduction once play is underway without DLS
    return match;
  }

  const updatedInnings = match.innings.map((inn) => ({
    ...inn,
    allocatedOvers: clamped,
  }));

  return {
    ...match,
    allocatedOversPerInnings: clamped,
    innings: updatedInnings,
    lastInterruptionText: `Weather delay before start: Match officially shortened to ${clamped} overs per side.`,
  };
}

/**
 * Marks an ODI or T20I match as ABANDONED without a ball bowled (e.g. pre-toss washout).
 */
export function abandonWhiteBallMatch(
  match: Match,
  reason: string = 'Match Abandoned without a ball bowled (Rain)'
): Match {
  if (match.format === 'TEST') return match;
  return {
    ...match,
    status: 'ABANDONED',
    winnerTeamId: undefined,
    resultText: reason,
    lastInterruptionText: reason,
  };
}

/**
 * Concludes an interrupted ODI or T20I match as NO_RESULT when play cannot be completed.
 * Because DLS is explicitly unsupported (never inventing revised targets), any uncompleted
 * rain-halted limited-overs match finishes cleanly as an official No Result.
 */
export function concludeWhiteBallNoResult(
  match: Match,
  reason?: string
): Match {
  if (match.format === 'TEST') return match;
  const minOvers = MIN_OVERS_FOR_WHITE_BALL_RESULT[match.format];
  const inn2 = match.innings[1];
  const defaultReason =
    !inn2 || inn2.completedOvers < minOvers
      ? `No Result — Minimum ${minOvers} overs in 2nd innings not completed due to rain`
      : 'No Result — Match halted by rain (DLS revised targets unsupported)';

  return {
    ...match,
    status: 'NO_RESULT',
    winnerTeamId: undefined,
    resultText: reason || defaultReason,
    lastInterruptionText: reason || defaultReason,
  };
}

/**
 * Phase-aware Batting AI for ODI and T20I (Powerplay, Middle Overs, Death Overs, and Chases).
 */
export function determineAIWhiteBallBattingApproach(
  match: Match,
  innings: InningsState,
  striker: Player,
  getPlayerById: (id: string) => Player
): BattingAggression {
  const allocatedOvers =
    innings.allocatedOvers ??
    match.allocatedOversPerInnings ??
    getMaxOversPerInnings(match.format);
  const pp = getPowerplayPhase(match.format, innings.completedOvers, allocatedOvers);
  const wicketsInHand = Math.max(0, 10 - innings.wickets);
  const totalBalls = allocatedOvers * 6;
  const ballsBowled = innings.completedOvers * 6 + innings.ballsInCurrentOver;
  const ballsRemaining = Math.max(1, totalBalls - ballsBowled);

  const strikerEntry = innings.batters.find((b) => b.playerId === striker.id);
  const ballsFaced = strikerEntry?.balls || 0;
  const isSet = ballsFaced >= (match.format === 'ODI' ? 22 : 10);
  const isTailender = striker.role === 'BOWLER' && striker.attributes.powerHitting < 55;

  const bowler = getPlayerById(innings.currentBowlerId);
  const spin = isSpinBowler(bowler.bowlingStyle);
  const batterVsBowlerEdge =
    (spin ? striker.attributes.againstSpin : striker.attributes.againstPace) -
    (spin ? bowler.attributes.spin : (bowler.attributes.pace + bowler.attributes.accuracy) / 2);
  const favorableMatchup = batterVsBowlerEdge >= 7;

  if (match.format === 'ODI') {
    // ======================== ODI BATTING AI ========================
    if (innings.targetRuns !== undefined) {
      const runsNeeded = innings.targetRuns - innings.totalRuns;
      if (runsNeeded <= 0) return 'BALANCED';
      const rrr = (runsNeeded / ballsRemaining) * 6;

      // Death overs in ODI chase
      if (pp.phase === 'DEATH_PP3' || ballsRemaining <= 60) {
        if (rrr >= 9.5) return wicketsInHand >= 3 ? 'SMASH' : 'ATTACKING';
        if (rrr >= 6.8) return 'ATTACKING';
        if (rrr <= 4.0) return wicketsInHand <= 3 ? 'DEFENSIVE' : 'BALANCED';
        return wicketsInHand >= 5 ? 'ATTACKING' : 'BALANCED';
      }

      // Powerplay 1 in ODI chase (Overs 1-10, max 2 outside circle)
      if (pp.phase === 'MANDATORY_PP1') {
        if (innings.wickets >= 3) return 'DEFENSIVE';
        if (rrr >= 7.0) return 'ATTACKING';
        if (innings.wickets <= 1 && (striker.attributes.aggression >= 78 || favorableMatchup)) {
          return 'ATTACKING';
        }
        return 'BALANCED';
      }

      // Middle overs in ODI chase (Overs 11-40)
      if (innings.wickets >= 5 && rrr < 6.4) return 'DEFENSIVE';
      if (rrr >= 7.6) return 'ATTACKING';
      if (isSet && favorableMatchup && wicketsInHand >= 6) return 'ATTACKING';
      return 'BALANCED';
    }

    // 1st Innings ODI (Setting a Target)
    if (pp.phase === 'MANDATORY_PP1') {
      if (innings.wickets >= 2 && innings.completedOvers < 8) return 'DEFENSIVE';
      const heavyMovement = match.pitch.paceBonus + match.weather.swingBonus >= 30;
      if (heavyMovement && innings.completedOvers < 5) return 'BALANCED';
      if (innings.wickets === 0 && (striker.attributes.aggression >= 78 || favorableMatchup)) {
        return 'ATTACKING';
      }
      return 'BALANCED';
    }

    if (pp.phase === 'INTERMEDIATE_PP2') {
      if (innings.wickets >= 5 && innings.completedOvers < 30) return 'DEFENSIVE';
      const progressRatio = innings.completedOvers / allocatedOvers;
      if (progressRatio >= 0.62 && wicketsInHand >= 6 && (isSet || favorableMatchup)) {
        return 'ATTACKING';
      }
      if (isSet && favorableMatchup && wicketsInHand >= 7) {
        return 'ATTACKING';
      }
      return 'BALANCED';
    }

    // ODI Death Overs (Overs 41-50)
    if (ballsRemaining <= 30) {
      if (wicketsInHand >= 4 && !isTailender) return 'SMASH';
      return wicketsInHand >= 2 ? 'ATTACKING' : 'BALANCED';
    }
    return wicketsInHand >= 4 ? 'ATTACKING' : 'BALANCED';
  }

  // ======================== T20I BATTING AI ========================
  const isDeathPhase = innings.completedOvers >= Math.floor(allocatedOvers * 0.75) || ballsRemaining <= 30;

  if (innings.targetRuns !== undefined) {
    const runsNeeded = innings.targetRuns - innings.totalRuns;
    if (runsNeeded <= 0) return 'BALANCED';
    const rrr = (runsNeeded / ballsRemaining) * 6;

    if (rrr >= 12.5) return 'SMASH'; // All-out attack
    if (rrr >= 9.6) {
      return ballsRemaining <= 24 && wicketsInHand >= 3 ? 'SMASH' : 'ATTACKING';
    }
    if (rrr <= 5.5 && wicketsInHand <= 3) return 'DEFENSIVE';

    if (pp.phase === 'MANDATORY_PP1') {
      if (innings.wickets >= 3) return 'BALANCED';
      return rrr >= 7.5 || striker.attributes.aggression >= 74 || favorableMatchup
        ? 'ATTACKING'
        : 'BALANCED';
    }

    if (isDeathPhase) {
      if (rrr >= 8.2) return wicketsInHand >= 4 ? 'SMASH' : 'ATTACKING';
      if (rrr <= 6.0) return 'BALANCED';
      return 'ATTACKING';
    }

    // Middle overs T20I chase
    if (innings.wickets >= 5 && rrr < 7.5) return 'BALANCED';
    return rrr >= 8.5 || (favorableMatchup && wicketsInHand >= 6) ? 'ATTACKING' : 'BALANCED';
  }

  // 1st Innings T20I (Setting a Target)
  if (pp.phase === 'MANDATORY_PP1') {
    if (innings.wickets >= 3) return 'BALANCED';
    if (
      striker.attributes.aggression >= 74 ||
      striker.attributes.powerHitting >= 76 ||
      favorableMatchup
    ) {
      return 'ATTACKING';
    }
    return 'BALANCED';
  }

  if (isDeathPhase) {
    if (ballsRemaining <= 18) {
      if (wicketsInHand >= 4 && !isTailender) return 'SMASH';
      return wicketsInHand >= 2 ? 'ATTACKING' : 'BALANCED';
    }
    return wicketsInHand >= 4 ? 'ATTACKING' : 'BALANCED';
  }

  // Middle overs (Overs 7-15 in T20I)
  if (innings.wickets >= 5 && innings.completedOvers < Math.floor(allocatedOvers * 0.6)) {
    return 'DEFENSIVE';
  }
  if (
    (favorableMatchup && wicketsInHand >= 5) ||
    (isSet && wicketsInHand >= 6) ||
    (innings.completedOvers >= Math.floor(allocatedOvers * 0.6) && wicketsInHand >= 6)
  ) {
    return 'ATTACKING';
  }
  return 'BALANCED';
}

/**
 * Phase-aware Bowling & Fielding AI for ODI and T20I, strictly respecting Powerplay circle limits.
 */
export function determineAIWhiteBallBowlingTactics(
  match: Match,
  innings: InningsState,
  bowler: Player
): { bowlingTactic: BowlingTactic; fieldPreset: FieldPreset } {
  const allocatedOvers =
    innings.allocatedOvers ??
    match.allocatedOversPerInnings ??
    getMaxOversPerInnings(match.format);
  const pp = getPowerplayPhase(match.format, innings.completedOvers, allocatedOvers);
  const spin = isSpinBowler(bowler.bowlingStyle);
  const totalBalls = allocatedOvers * 6;
  const ballsRemaining = Math.max(
    1,
    totalBalls - (innings.completedOvers * 6 + innings.ballsInCurrentOver)
  );
  const isDeathOvers =
    pp.phase === 'DEATH_PP3' ||
    (match.format === 'T20I' &&
      (innings.completedOvers >= Math.floor(allocatedOvers * 0.75) || ballsRemaining <= 30));

  // 1. Mandatory Powerplay 1 (Max 2 fielders outside 30-yard circle!)
  if (pp.phase === 'MANDATORY_PP1') {
    const swingFriendly = match.pitch.paceBonus + match.weather.swingBonus >= 22;
    if (spin) {
      return {
        bowlingTactic: innings.wickets >= 2 ? 'FLIGHT_SPIN' : 'TIGHT_DEFENSIVE',
        fieldPreset: 'RING_INNER',
      };
    }
    return {
      bowlingTactic: swingFriendly || innings.wickets >= 1 ? 'ATTACKING_FULL' : 'BALANCED_CONTAIN',
      fieldPreset:
        (swingFriendly && innings.completedOvers < 4) || innings.wickets >= 2
          ? 'ATTACKING_SLIPS'
          : 'RING_INNER',
    };
  }

  // 2. Death Overs (ODI Overs 41-50 / T20I Overs 16-20 — Max 5 fielders outside circle)
  if (isDeathOvers) {
    if (spin) {
      return {
        bowlingTactic: 'TIGHT_DEFENSIVE',
        fieldPreset: 'DEATH_PROTECT',
      };
    }
    const useShortBallChangeup =
      bowler.attributes.variation >= 78 &&
      bowler.attributes.pace >= 80 &&
      innings.ballsInCurrentOver === 3;
    return {
      bowlingTactic: useShortBallChangeup
        ? 'BOUNCER_SHORT'
        : bowler.attributes.deathBowling >= 72
        ? 'YORKER_DEATH'
        : 'BALANCED_CONTAIN',
      fieldPreset: 'DEATH_PROTECT',
    };
  }

  // 3. Middle Overs (ODI PP2 Max 4 outside / T20I Overs 7-15 Max 5 outside)
  if (spin) {
    const attackingSpin = innings.wickets >= 3 || match.pitch.spinBonus >= 10;
    return {
      bowlingTactic: attackingSpin ? 'FLIGHT_SPIN' : 'BALANCED_CONTAIN',
      fieldPreset: attackingSpin && innings.wickets >= 4 ? 'RING_INNER' : 'BALANCED_STANDARD',
    };
  }

  if (bowler.attributes.pace >= 84 && innings.ballsInCurrentOver === 2 && innings.wickets < 7) {
    return {
      bowlingTactic: 'BOUNCER_SHORT',
      fieldPreset: 'BALANCED_STANDARD',
    };
  }

  return {
    bowlingTactic: innings.wickets >= 4 ? 'ATTACKING_FULL' : 'BALANCED_CONTAIN',
    fieldPreset:
      pp.phase === 'INTERMEDIATE_PP2'
        ? 'BALANCED_STANDARD'
        : innings.totalRuns / Math.max(1, innings.completedOvers) > 9.2
        ? 'DEFENSIVE_BOUNDARY'
        : 'BALANCED_STANDARD',
  };
}

/**
 * Evaluates a candidate bowler's intrinsic white-ball bowling rating.
 */
function getBaseWhiteBallBowlerQuality(player: Player, format: MatchFormat): number {
  if (player.role === 'WICKETKEEPER_BATTER') return 5;
  const spin = isSpinBowler(player.bowlingStyle);
  const primary = spin
    ? player.attributes.spin * 0.35 +
      player.attributes.variation * 0.25 +
      player.attributes.accuracy * 0.25 +
      player.attributes.wicketTaking * 0.15
    : player.attributes.pace * 0.25 +
      player.attributes.swing * 0.20 +
      player.attributes.accuracy * 0.25 +
      player.attributes.deathBowling * 0.15 +
      player.attributes.wicketTaking * 0.15;

  const roleBonus =
    player.role === 'BOWLER' ? 14 : player.role === 'ALL_ROUNDER' ? 8 : -16;
  const formatBonus = format === 'T20I' ? player.attributes.variation * 0.05 : player.attributes.stamina * 0.05;
  return primary + roleBonus + formatBonus;
}

/**
 * Selects an authentic opening bowler for ODI or T20I (new-ball pacer or powerplay specialist,
 * never wicketkeeper, with deterministic match-to-match variety).
 */
export function selectWhiteBallOpeningBowler(
  bowlingXI: string[],
  bowlingWicketKeeperId: string | undefined,
  format: MatchFormat,
  pitch: Match['pitch'],
  weather: Match['weather'],
  getPlayerById: (id: string) => Player,
  seed: number = 101,
  nominatedBowlerIds?: string[]
): string {
  const nonKeepers = bowlingXI.filter((id) => {
    if (id === bowlingWicketKeeperId) return false;
    const p = getPlayerById(id);
    return p.role !== 'WICKETKEEPER_BATTER';
  });

  const pool =
    nominatedBowlerIds && nominatedBowlerIds.length >= 2
      ? nonKeepers.filter((id) => nominatedBowlerIds.includes(id))
      : nonKeepers;
  const candidates = pool.length > 0 ? pool : nonKeepers.length > 0 ? nonKeepers : bowlingXI;

  const rand = mulberry32(seed + 1907);

  const safePaceBonus = (pitch && typeof pitch === 'object') ? ((pitch as any).paceBonus || 0) : 0;
  const safeSpinBonus = (pitch && typeof pitch === 'object') ? ((pitch as any).spinBonus || 0) : 0;
  const safeSwingBonus = (weather && typeof weather === 'object') ? ((weather as any).swingBonus || 0) : 6;

  const scored = candidates.map((id) => {
    const p = getPlayerById(id);
    const spin = isSpinBowler(p.bowlingStyle);
    let score = getBaseWhiteBallBowlerQuality(p, format);

    if (!spin) {
      // New ball favours swing, seam, pace, and control
      score +=
        (p.attributes?.swing || 50) * 0.32 +
        (p.attributes?.seam || 50) * 0.20 +
        (p.attributes?.pace || 50) * 0.18 +
        (safePaceBonus + safeSwingBonus) * 0.35;
    } else {
      // Spinners rarely open unless raging turner in T20I
      score += format === 'T20I' && safeSpinBonus >= 14 ? 8 : -24;
    }

    // Small match-specific jitter so #1 and #2 new-ball bowlers can alternate opening ends across matches
    score += (rand() - 0.5) * 7.5;
    return { id, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.id || bowlingXI[bowlingXI.length - 1] || bowlingXI[0];
}

/**
 * Selects the next bowler in ODI or T20I adhering strictly to:
 * - No consecutive overs by the same bowler
 * - Maximum overs per bowler (10 ODI / 4 T20I / exact ICC shortened-innings quota)
 * - Wicketkeeper exclusion
 * - Realistic 5-6 bowler rotation with Powerplay spells, Middle-over spin/control,
 *   Death-over specialist reservation, batter matchups, fatigue, and non-repetitive match variety.
 */
export function selectNextWhiteBallBowler(
  match: Match,
  currentInnings: InningsState,
  bowlingXI: string[],
  getPlayerById: (id: string) => Player
): string {
  const prevBowlerId =
    currentInnings.lastCompletedOverBowlerId || currentInnings.currentBowlerId;
  const bowlingWkId =
    currentInnings.bowlingTeamId === match.homeTeamId
      ? match.homeWicketKeeperId
      : match.awayWicketKeeperId;
  const nominated =
    currentInnings.bowlingTeamId === match.homeTeamId
      ? match.homeBowlingOptions
      : match.awayBowlingOptions;

  const allocatedOvers =
    currentInnings.allocatedOvers ??
    match.allocatedOversPerInnings ??
    getMaxOversPerInnings(match.format);
  const nextOver = currentInnings.completedOvers; // 0-based index of upcoming over
  const oversRemainingInInnings = Math.max(1, allocatedOvers - nextOver);

  // Filter eligible bowlers (not previous over bowler, not WK, under quota)
  const nonKeepers = bowlingXI.filter((id) => {
    if (id === prevBowlerId) return false;
    if (id === bowlingWkId) return false;
    const p = getPlayerById(id);
    return p.role !== 'WICKETKEEPER_BATTER';
  });

  const filterUnderQuota = (ids: string[]) =>
    ids.filter((id) => {
      const fig = currentInnings.bowlers.find((b) => b.playerId === id);
      const maxAllowed = getEffectiveMaxOversForBowler(
        match.format,
        id,
        currentInnings.bowlers,
        allocatedOvers
      );
      return !fig || fig.overs < maxAllowed;
    });

  let available = filterUnderQuota(
    nominated && nominated.length > 0
      ? nonKeepers.filter((id) => nominated.includes(id))
      : nonKeepers
  );

  // Fallback to wider non-keeper XI if user nominated <5 bowlers and their quotas ran out
  if (available.length === 0) {
    available = filterUnderQuota(nonKeepers);
  }
  if (available.length === 0) {
    const anyOther = bowlingXI.filter((id) => id !== prevBowlerId);
    return anyOther[0] || bowlingXI[0];
  }

  // Rank top 6 bowling unit in the XI & identify top 2 death specialists
  const allNonKeepers = bowlingXI.filter((id) => id !== bowlingWkId);
  const rankedUnit = [...allNonKeepers].sort(
    (a, b) =>
      getBaseWhiteBallBowlerQuality(getPlayerById(b), match.format) -
      getBaseWhiteBallBowlerQuality(getPlayerById(a), match.format)
  );
  const topSixUnit = new Set(rankedUnit.slice(0, 6));

  const deathRanked = [...rankedUnit.slice(0, 6)].sort((a, b) => {
    const pA = getPlayerById(a);
    const pB = getPlayerById(b);
    const dA =
      pA.attributes.deathBowling * 0.55 +
      pA.attributes.variation * 0.25 +
      pA.attributes.accuracy * 0.20 +
      (isSpinBowler(pA.bowlingStyle) ? -10 : 8);
    const dB =
      pB.attributes.deathBowling * 0.55 +
      pB.attributes.variation * 0.25 +
      pB.attributes.accuracy * 0.20 +
      (isSpinBowler(pB.bowlingStyle) ? -10 : 8);
    return dB - dA;
  });
  const deathSpecialists = new Set(deathRanked.slice(0, 2));

  const pp = getPowerplayPhase(match.format, nextOver, allocatedOvers);
  const isDeathPhase =
    pp.phase === 'DEATH_PP3' ||
    (match.format === 'T20I' &&
      (nextOver >= Math.floor(allocatedOvers * 0.75) || oversRemainingInInnings <= 5));
  const isPowerplay = pp.phase === 'MANDATORY_PP1';
  const isMiddlePhase = !isPowerplay && !isDeathPhase;

  const striker = getPlayerById(currentInnings.currentStrikerId);
  const matchSeedBase =
    (match.seed ?? match.id.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7)) +
    currentInnings.inningsNumber * 701 +
    nextOver * 43;
  const rotRand = mulberry32(Math.abs(matchSeedBase));

  const spellMap = currentInnings.bowlerSpellOvers || {};
  const lastOverMap = currentInnings.bowlerLastOverBowled || {};

  const scored = available.map((id) => {
    const p = getPlayerById(id);
    const spin = isSpinBowler(p.bowlingStyle);
    const fig = currentInnings.bowlers.find((b) => b.playerId === id);
    const oversBowled = fig ? fig.overs : 0;
    const maxQuota = getEffectiveMaxOversForBowler(
      match.format,
      id,
      currentInnings.bowlers,
      allocatedOvers
    );
    const remainingQuota = Math.max(0, maxQuota - oversBowled);

    // Current spell length (if bowled 2 overs ago, same spell; if rested >= 3 overs, fresh spell)
    const lastOver = lastOverMap[id];
    const inActiveSpell = lastOver !== undefined && nextOver - lastOver <= 2;
    const currentSpellOvers = inActiveSpell ? spellMap[id] || 0 : 0;

    let score = getBaseWhiteBallBowlerQuality(p, match.format);

    // Strongly prefer genuine top-6 bowling options over pure batters unless part-time matchup warrants
    if (!topSixUnit.has(id)) {
      score -= 32;
    }

    // Phase-specific role suitability
    if (isPowerplay) {
      if (!spin) {
        score +=
          p.attributes.swing * 0.28 +
          p.attributes.seam * 0.16 +
          p.attributes.pace * 0.14 +
          (match.pitch.paceBonus + match.weather.swingBonus) * 0.25;
      } else {
        // Powerplay spinner mainly on turning tracks or late PP in T20I
        score +=
          match.pitch.spinBonus >= 12 || (match.format === 'T20I' && nextOver >= 4)
            ? p.attributes.spin * 0.15
            : -18;
      }

      // Cap opening spell length so new-ball bowlers don't burn their entire quota in PP/early middle!
      const maxOpeningSpell = match.format === 'ODI' ? 5 : 2;
      if (currentSpellOvers >= maxOpeningSpell) {
        score -= 36;
      } else if (inActiveSpell && currentSpellOvers > 0) {
        score += 8; // Continuity within a 2-over (T20I) or 4-5 over (ODI) new-ball spell
      }
    } else if (isMiddlePhase) {
      if (spin) {
        score +=
          16 +
          p.attributes.spin * 0.22 +
          p.attributes.control * 0.16 +
          match.pitch.spinBonus * 0.45;
      } else {
        score += p.attributes.control * 0.15 + p.attributes.variation * 0.14;
      }

      // Reserve overs of top 2 death specialists for Death Overs!
      const reserveTarget = match.format === 'ODI' ? Math.min(3, Math.floor(maxQuota * 0.3)) : Math.min(2, Math.ceil(maxQuota * 0.45));
      if (deathSpecialists.has(id) && remainingQuota <= reserveTarget) {
        score -= 34;
      }

      // Spell management in middle overs: rotate after 5 overs (ODI) or 2 overs (T20I)
      const maxMidSpell = match.format === 'ODI' ? 5 : 2;
      if (currentSpellOvers >= maxMidSpell) {
        score -= 28;
      } else if (inActiveSpell && currentSpellOvers > 0 && currentSpellOvers < maxMidSpell) {
        score += 6;
      }

      // Encourage bringing 5th / 6th bowler into the attack during middle overs
      if (topSixUnit.has(id) && oversBowled === 0 && nextOver >= (match.format === 'ODI' ? 12 : 6)) {
        score += 11;
      }
    } else {
      // Death Overs: prioritise death bowling, yorkers, slower-ball variations & wicket-taking!
      score +=
        p.attributes.deathBowling * 0.42 +
        p.attributes.variation * 0.22 +
        p.attributes.wicketTaking * 0.18;
      if (!spin) score += 10;
      if (deathSpecialists.has(id)) score += 18;

      // Ensure frontline bowlers with remaining overs finish their quotas before lower-ranked options
      if (remainingQuota >= Math.ceil(oversRemainingInInnings / 2) && topSixUnit.has(id)) {
        score += 14;
      }
    }

    // Batter matchup awareness (pace vs spin weakness)
    const batterWeakness = spin
      ? 80 - striker.attributes.againstSpin
      : 80 - striker.attributes.againstPace;
    score += batterWeakness * 0.22;

    // Live match performance & fatigue adjustment
    if (fig && fig.overs >= 2) {
      const formatParEco = match.format === 'T20I' ? 8.3 : 5.6;
      if (fig.economy > formatParEco + 2.5 && fig.wickets === 0) {
        score -= 10; // Expensive bowler taken off
      } else if (fig.wickets >= 2 || fig.economy < formatParEco - 1.2) {
        score += 6; // In-rhythm bowler backed
      }
    }
    score -= Math.max(0, (p.workloadFatigue || 15) - 55) * 0.18;

    // Deterministic per-match + per-over tactical variety so rotations are never robotic clones
    score += (rotRand() - 0.5) * 9.5;

    return { id, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.id || available[0];
}

/**
 * Updates spell tracking on an ODI/T20I innings at the completion of a legal over.
 */
export function recordWhiteBallOverInSpellTracker(
  innings: InningsState,
  bowlerId: string,
  completedOverIndex: number
): void {
  if (!innings.bowlerSpellOvers) innings.bowlerSpellOvers = {};
  if (!innings.bowlerLastOverBowled) innings.bowlerLastOverBowled = {};

  const prevOver = innings.bowlerLastOverBowled[bowlerId];
  if (prevOver !== undefined && completedOverIndex - prevOver <= 2) {
    innings.bowlerSpellOvers[bowlerId] = (innings.bowlerSpellOvers[bowlerId] || 0) + 1;
  } else {
    innings.bowlerSpellOvers[bowlerId] = 1;
  }
  innings.bowlerLastOverBowled[bowlerId] = completedOverIndex;
}

/**
 * Creates a clean 1-over Super Over InningsState (3 nominated batters, 1 nominated bowler, max 2 wickets).
 */
function createSuperOverInningsState(
  inningsNumber: number,
  superOverRound: number,
  battingTeamId: string,
  battingTeamName: string,
  bowlingTeamId: string,
  bowlingTeamName: string,
  nominatedBatters: string[],
  nominatedBowlerId: string,
  getPlayerById: (id: string) => Player,
  targetRuns?: number
): InningsState {
  const strikerId = nominatedBatters[0];
  const nonStrikerId = nominatedBatters[1];
  const striker = getPlayerById(strikerId);
  const nonStriker = getPlayerById(nonStrikerId);
  const bowler = getPlayerById(nominatedBowlerId);

  return {
    inningsNumber,
    superOverNumber: superOverRound,
    allocatedOvers: 1,
    battingTeamId,
    battingTeamName,
    bowlingTeamId,
    bowlingTeamName,
    totalRuns: 0,
    wickets: 0,
    completedOvers: 0,
    ballsInCurrentOver: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    batters: [
      {
        playerId: strikerId,
        playerName: striker.shortName,
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
        playerName: nonStriker.shortName,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isCurrentStriker: false,
        isCurrentNonStriker: true,
      },
    ],
    bowlers: [
      {
        playerId: nominatedBowlerId,
        playerName: bowler.shortName,
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
    ],
    currentStrikerId: strikerId,
    currentNonStrikerId: nonStrikerId,
    currentBowlerId: nominatedBowlerId,
    fallOfWickets: [],
    recentBalls: [],
    targetRuns,
    isFreeHit: false,
    lastWicketLegalBalls: 0,
  };
}

/**
 * Nominates top 3 power-hitting batters for a Super Over (excluding batters dismissed in the immediately
 * prior Super Over per ICC Super Over regulations).
 */
function nominateSuperOverBatters(
  xi: string[],
  excludedDismissedIds: Set<string>,
  getPlayerById: (id: string) => Player
): string[] {
  const rankBatter = (id: string) => {
    const p = getPlayerById(id);
    return (
      p.attributes.powerHitting * 0.42 +
      p.attributes.timing * 0.28 +
      p.attributes.aggression * 0.18 +
      p.t20Rating * 0.12
    );
  };

  const eligible = xi.filter((id) => !excludedDismissedIds.has(id)).sort((a, b) => rankBatter(b) - rankBatter(a));
  if (eligible.length >= 3) return eligible.slice(0, 3);

  const fallback = xi.filter((id) => !eligible.includes(id)).sort((a, b) => rankBatter(b) - rankBatter(a));
  return [...eligible, ...fallback].slice(0, 3);
}

/**
 * Nominates #1 eligible Super Over bowler (never wicketkeeper, and never the bowler from the immediately
 * preceding Super Over round per ICC repeat Super Over rules).
 */
function nominateSuperOverBowler(
  xi: string[],
  wicketKeeperId: string | undefined,
  previousSuperOverBowlerId: string | undefined,
  getPlayerById: (id: string) => Player
): string {
  const rankBowler = (id: string) => {
    const p = getPlayerById(id);
    if (p.role === 'WICKETKEEPER_BATTER') return -100;
    return (
      p.attributes.deathBowling * 0.45 +
      p.attributes.wicketTaking * 0.30 +
      p.attributes.accuracy * 0.25 +
      (isSpinBowler(p.bowlingStyle) ? -6 : 6)
    );
  };

  const primaryPool = xi.filter(
    (id) =>
      id !== wicketKeeperId &&
      id !== previousSuperOverBowlerId &&
      getPlayerById(id).role !== 'WICKETKEEPER_BATTER'
  );
  const pool =
    primaryPool.length > 0
      ? primaryPool
      : xi.filter((id) => id !== wicketKeeperId);

  pool.sort((a, b) => rankBowler(b) - rankBowler(a));
  return pool[0] || xi[xi.length - 1];
}

/**
 * Conducts an ICC-compliant Super Over (with automatic repeat Super Overs if tied!):
 * - Team batting 2nd in the main match bats 1st in Super Over 1 (alternating in repeat rounds)
 * - 1 full legal over (6 legal balls; wides & no-balls do NOT count as legal balls)
 * - 3 nominated batters; 2 wickets end the Super Over innings immediately
 * - 1 eligible nominated bowler; dismissed batters & prior bowler excluded in immediate repeat round
 */
export function simulateWhiteBallSuperOver(
  match: Match,
  getPlayerById: (id: string) => Player,
  getMatchSeed: (m: Match, offset: number) => number,
  computePotm: (m: Match) => Match['playerOfTheMatch']
): Match {
  const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.homeTeamId);
  const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.awayTeamId);

  const getTeamName = (teamId: string) =>
    teamId === match.homeTeamId
      ? homeTeam?.name || match.homeTeamId
      : awayTeam?.name || match.awayTeamId;
  const getTeamXI = (teamId: string) =>
    teamId === match.homeTeamId ? match.homeXI : match.awayXI;
  const getTeamWK = (teamId: string) =>
    teamId === match.homeTeamId ? match.homeWicketKeeperId : match.awayWicketKeeperId;

  // Per ICC Playing Conditions: Team batting SECOND in the main match bats FIRST in Super Over 1!
  let firstBattingTeamId =
    match.innings[1]?.battingTeamId || match.awayTeamId;
  let secondBattingTeamId =
    firstBattingTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;

  const allSuperOverInnings: InningsState[] = [];
  let prevDismissedByTeam: Record<string, Set<string>> = {
    [match.homeTeamId]: new Set<string>(),
    [match.awayTeamId]: new Set<string>(),
  };
  let prevBowlerByTeam: Record<string, string | undefined> = {
    [match.homeTeamId]: undefined,
    [match.awayTeamId]: undefined,
  };

  let winnerTeamId: string | undefined = undefined;
  let round = 0;
  const maxRounds = 6;

  const wbMods = getWhiteBallConditionsModifiers(match, {
    inningsNumber: 2,
    completedOvers: match.format === 'ODI' ? 49 : 19,
  });

  while (!winnerTeamId && round < maxRounds) {
    round += 1;

    const team1Batters = nominateSuperOverBatters(
      getTeamXI(firstBattingTeamId),
      prevDismissedByTeam[firstBattingTeamId],
      getPlayerById
    );
    const team2Batters = nominateSuperOverBatters(
      getTeamXI(secondBattingTeamId),
      prevDismissedByTeam[secondBattingTeamId],
      getPlayerById
    );

    const team2Bowler = nominateSuperOverBowler(
      getTeamXI(secondBattingTeamId),
      getTeamWK(secondBattingTeamId),
      prevBowlerByTeam[secondBattingTeamId],
      getPlayerById
    );
    const team1Bowler = nominateSuperOverBowler(
      getTeamXI(firstBattingTeamId),
      getTeamWK(firstBattingTeamId),
      prevBowlerByTeam[firstBattingTeamId],
      getPlayerById
    );

    const buildFielders = (teamId: string): FieldingPlayerRef[] => {
      const xi = getTeamXI(teamId);
      const wkId = getTeamWK(teamId);
      return xi.map((id) => ({
        id,
        shortName: getPlayerById(id).shortName,
        isWicketKeeper: id === wkId,
      }));
    };

    const nameMap: Record<string, string> = {};
    [...match.homeXI, ...match.awayXI].forEach((id) => {
      nameMap[id] = getPlayerById(id).shortName;
    });

    // --- Super Over Innings 1 ---
    let currentS1 = createSuperOverInningsState(
      (round - 1) * 2 + 1,
      round,
      firstBattingTeamId,
      getTeamName(firstBattingTeamId),
      secondBattingTeamId,
      getTeamName(secondBattingTeamId),
      team1Batters,
      team2Bowler,
      getPlayerById
    );

    const s1Fielders = buildFielders(secondBattingTeamId);
    let deliveryStep1 = 0;
    while (
      !currentS1.isCompleted &&
      currentS1.completedOvers < 1 &&
      currentS1.wickets < 2 &&
      deliveryStep1 < 36
    ) {
      const striker = getPlayerById(currentS1.currentStrikerId);
      const nonStriker = getPlayerById(currentS1.currentNonStrikerId);
      const bowler = getPlayerById(team2Bowler);
      const outcome = simulateDelivery({
        format: 'T20I',
        striker,
        nonStriker,
        bowler,
        pitch: match.pitch,
        weather: match.weather,
        overNumber: 19, // Death-over fielding & pacing context (max 5 outside circle)
        ballInOver: currentS1.ballsInCurrentOver,
        currentScore: currentS1.totalRuns,
        wicketsLost: currentS1.wickets,
        battingAggression: currentS1.wickets === 1 ? 'ATTACKING' : 'SMASH',
        bowlingTactic: isSpinBowler(bowler.bowlingStyle) ? 'TIGHT_DEFENSIVE' : 'YORKER_DEATH',
        fieldPreset: 'DEATH_PROTECT',
        overCompletedOvers: 19,
        seed: getMatchSeed(match, 9000 + round * 1000 + deliveryStep1 * 17),
        isFreeHit: currentS1.isFreeHit,
        whiteBallModifiers: wbMods,
        bowlingFielders: s1Fielders,
      });
      outcome.overNumber = 0;
      currentS1 = applyBallToInnings(currentS1, outcome, team1Batters, nameMap, 'T20I');
      deliveryStep1++;
    }
    currentS1.isCompleted = true;

    // --- Super Over Innings 2 (Chasing s1.totalRuns + 1) ---
    const target = currentS1.totalRuns + 1;
    let currentS2 = createSuperOverInningsState(
      (round - 1) * 2 + 2,
      round,
      secondBattingTeamId,
      getTeamName(secondBattingTeamId),
      firstBattingTeamId,
      getTeamName(firstBattingTeamId),
      team2Batters,
      team1Bowler,
      getPlayerById,
      target
    );

    const s2Fielders = buildFielders(firstBattingTeamId);
    let deliveryStep2 = 0;
    while (
      !currentS2.isCompleted &&
      currentS2.completedOvers < 1 &&
      currentS2.wickets < 2 &&
      currentS2.totalRuns < target &&
      deliveryStep2 < 36
    ) {
      const striker = getPlayerById(currentS2.currentStrikerId);
      const nonStriker = getPlayerById(currentS2.currentNonStrikerId);
      const bowler = getPlayerById(team1Bowler);
      const runsNeeded = target - currentS2.totalRuns;
      const ballsLeft = Math.max(1, 6 - currentS2.ballsInCurrentOver);
      const agg: BattingAggression =
        runsNeeded <= ballsLeft && currentS2.wickets === 1
          ? 'BALANCED'
          : runsNeeded > ballsLeft * 1.5
          ? 'SMASH'
          : 'ATTACKING';

      const outcome = simulateDelivery({
        format: 'T20I',
        striker,
        nonStriker,
        bowler,
        pitch: match.pitch,
        weather: match.weather,
        overNumber: 19,
        ballInOver: currentS2.ballsInCurrentOver,
        currentScore: currentS2.totalRuns,
        wicketsLost: currentS2.wickets,
        targetRuns: target,
        battingAggression: agg,
        bowlingTactic: isSpinBowler(bowler.bowlingStyle) ? 'TIGHT_DEFENSIVE' : 'YORKER_DEATH',
        fieldPreset: 'DEATH_PROTECT',
        overCompletedOvers: 19,
        seed: getMatchSeed(match, 9500 + round * 1000 + deliveryStep2 * 19),
        isFreeHit: currentS2.isFreeHit,
        whiteBallModifiers: wbMods,
        bowlingFielders: s2Fielders,
      });
      outcome.overNumber = 0;
      currentS2 = applyBallToInnings(currentS2, outcome, team2Batters, nameMap, 'T20I');
      deliveryStep2++;
    }
    currentS2.isCompleted = true;

    allSuperOverInnings.push(currentS1, currentS2);

    if (currentS2.totalRuns > currentS1.totalRuns) {
      winnerTeamId = secondBattingTeamId;
    } else if (currentS1.totalRuns > currentS2.totalRuns) {
      winnerTeamId = firstBattingTeamId;
    } else {
      // Super Over tied! Accumulate dismissed batters across all prior rounds & record immediate prior bowler
      currentS1.batters
        .filter((b) => !!b.dismissal)
        .forEach((b) => prevDismissedByTeam[firstBattingTeamId].add(b.playerId));
      currentS2.batters
        .filter((b) => !!b.dismissal)
        .forEach((b) => prevDismissedByTeam[secondBattingTeamId].add(b.playerId));
      prevBowlerByTeam = {
        [firstBattingTeamId]: team1Bowler,
        [secondBattingTeamId]: team2Bowler,
      };
      const prevFirst = firstBattingTeamId;
      firstBattingTeamId = secondBattingTeamId;
      secondBattingTeamId = prevFirst;
    }
  }

  // Fallback if still tied after 6 Super Overs (astronomically rare: 1 in ~20 million)
  const finalS1 = allSuperOverInnings[allSuperOverInnings.length - 2];
  const finalS2 = allSuperOverInnings[allSuperOverInnings.length - 1];
  if (!winnerTeamId) {
    winnerTeamId = finalS2.battingTeamId;
  }

  const winnerName = getTeamName(winnerTeamId);
  const roundLabel =
    round === 1
      ? 'Super Over'
      : round === 2
      ? '2nd Super Over'
      : round === 3
      ? '3rd Super Over'
      : `${round}th Super Over`;
  const resultText = `${winnerName} won via ${roundLabel}! (${finalS1.battingTeamName} ${finalS1.totalRuns}/${finalS1.wickets} vs ${finalS2.battingTeamName} ${finalS2.totalRuns}/${finalS2.wickets})`;

  const updatedMatch: Match = {
    ...match,
    status: 'COMPLETED',
    winnerTeamId,
    superOverPlayed: true,
    superOverRounds: round,
    superOverInnings: allSuperOverInnings,
    resultText,
  };

  updatedMatch.playerOfTheMatch = computePotm(updatedMatch);
  return updatedMatch;
}
