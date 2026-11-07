import {
  BattingAggression,
  BowlingTactic,
  FieldPreset,
  InningsState,
  Match,
  MatchTactics,
  PitchCondition,
  Player,
  TestDynamicWeather,
  WeatherCondition,
} from '../types/cricket';
import { isSpinBowler, mulberry32 } from './simulation';

export const DEFAULT_TEST_OVERS_PER_DAY = 90;
export const DEFAULT_NEW_BALL_OVERS = 80;

/**
 * Returns initial dynamic weather state for Day 1 Morning of a Test match from venue baseline
 */
export function createInitialTestWeather(
  baseWeather?: WeatherCondition | string,
  seed = 101
): TestDynamicWeather {
  const rand = mulberry32(seed + 41);
  const weatherType =
    typeof baseWeather === 'string'
      ? baseWeather
      : baseWeather && typeof baseWeather === 'object'
      ? baseWeather.type
      : 'SUNNY';
  const customDesc =
    typeof baseWeather === 'object' && baseWeather?.description
      ? baseWeather.description
      : undefined;

  switch (weatherType) {
    case 'OVERCAST_SWING':
      return {
        condition: 'OVERCAST',
        cloudCover: 72 + Math.floor(rand() * 18),
        temperatureC: 17 + Math.floor(rand() * 5),
        humidity: 68 + Math.floor(rand() * 16),
        lightLevel: 'GOOD',
        description: customDesc || 'Heavy cloud cover aiding prodigious seam and swing.',
      };
    case 'RAIN_RISK':
      return {
        condition: 'OVERCAST',
        cloudCover: 80 + Math.floor(rand() * 16),
        temperatureC: 16 + Math.floor(rand() * 5),
        humidity: 78 + Math.floor(rand() * 15),
        lightLevel: 'FADING',
        description: customDesc || 'Brooding grey skies with passing showers in the vicinity.',
      };
    case 'HUMID':
      return {
        condition: 'HUMID',
        cloudCover: 42 + Math.floor(rand() * 25),
        temperatureC: 29 + Math.floor(rand() * 5),
        humidity: 74 + Math.floor(rand() * 16),
        lightLevel: 'GOOD',
        description: customDesc || 'Warm, humid conditions offering conventional swing with the new ball.',
      };
    case 'HAZY':
      return {
        condition: 'PARTLY_CLOUDY',
        cloudCover: 35 + Math.floor(rand() * 25),
        temperatureC: 27 + Math.floor(rand() * 6),
        humidity: 55 + Math.floor(rand() * 18),
        lightLevel: 'GOOD',
        description: customDesc || 'Warm hazy sunshine baking the surface.',
      };
    case 'SUNNY':
    default:
      return {
        condition: 'SUNNY',
        cloudCover: 12 + Math.floor(rand() * 22),
        temperatureC: 25 + Math.floor(rand() * 9),
        humidity: 36 + Math.floor(rand() * 20),
        lightLevel: 'GOOD',
        description: customDesc || 'Clear blue skies and bright sunshine.',
      };
  }
}

/**
 * Computes initial Day 1 pitch wear (0-100) based on surface type
 */
export function getInitialTestPitchWear(pitch?: PitchCondition | string, seed = 101): number {
  const rand = mulberry32(seed + 73);
  const pType =
    typeof pitch === 'string'
      ? pitch
      : pitch && typeof pitch === 'object'
      ? pitch.type
      : 'SPORTING_BALANCED';

  if (pType === 'CRACKED_DAY5') return 42 + Math.round(rand() * 10);
  if (pType === 'DUSTBOWL_SPIN') return 14 + Math.round(rand() * 6);
  if (pType === 'GREEN_SEAMER') return 4 + Math.round(rand() * 4);
  if (pType === 'BATTER_PARADISE') return 5 + Math.round(rand() * 4);
  return 7 + Math.round(rand() * 5);
}

/**
 * Returns exact remaining scheduled overs in a 5-day Test match
 */
export function getRemainingOversInTestMatch(match: Match): number {
  if (match.format !== 'TEST') return 0;
  const oversPerDay = match.oversPerDay || DEFAULT_TEST_OVERS_PER_DAY;
  const day = match.dayNumber || 1;
  if (day > 5) return 0;

  const extraToday = match.extraOversToday || 0;
  const bowledToday = match.oversBowledToday || 0;
  const lostToday = match.oversLostToday || 0;

  const remainingToday = Math.max(0, oversPerDay + extraToday - bowledToday - lostToday);
  const futureDaysOvers = Math.max(0, 5 - day) * oversPerDay;
  return remainingToday + futureDaysOvers;
}

/**
 * Evaluates pitch, ball age, and dynamic weather modifiers for a Test delivery.
 * Returns modifiers properly scaled to `venues.ts` (-8..22) bonus scale!
 */
export function getTestConditionsModifiers(
  match: Match,
  innings: InningsState
): {
  effectivePaceBonus: number;
  effectiveSpinBonus: number;
  effectiveSwingBonus: number;
  effectiveBounceVariation: number;
  unevenBounceWicketFactor: number;
  newBallFactor: number;
  reverseSwingFactor: number;
  badLightBattingPenalty: number;
  pitchWear: number;
  ballAgeOvers: number;
} {
  const pitch = match.pitch;
  const day = match.dayNumber || 1;
  const pitchWear = match.pitchWear ?? getInitialTestPitchWear(pitch, match.seed || 101);
  const ballAgeOvers = innings.ballAgeOvers ?? (innings.completedOvers % (match.newBallOversThreshold || DEFAULT_NEW_BALL_OVERS));
  const dynWeather = match.dynamicWeather || createInitialTestWeather(match.weather, match.seed || 101);

  // 1. Pitch evolution across Days 1-5 driven by non-identical pitchWear (0..100)
  // Day 1 fresh seam/moisture fades as wear increases; spin & variable bounce grow nonlinearly with wear
  const freshness = Math.max(0, 1 - pitchWear / 38); // 1.0 at 0% wear -> 0 at 38%+ wear
  const wearNorm = pitchWear / 100; // 0.0 -> 1.0

  let effectivePaceBonus = pitch.paceBonus * (0.65 + 0.50 * freshness);
  if (day === 1 && pitch.type === 'GREEN_SEAMER') {
    effectivePaceBonus += 5;
  }

  // Spin grows substantially as footmarks & cracks open (especially above 45% wear on Days 3-5)
  const spinFromWear = wearNorm * wearNorm * 28 * (pitch.wearFactor || 1.0);
  const effectiveSpinBonus = pitch.spinBonus + spinFromWear;

  // Bounce variation rises with cracks on Days 4-5
  const effectiveBounceVariation = pitch.bounceVariation + wearNorm * 16 * (pitch.wearFactor || 1.0);
  const unevenBounceWicketFactor =
    pitchWear >= 70 ? 1.24 : pitchWear >= 50 ? 1.13 : pitchWear >= 35 ? 1.05 : 1.0;

  // 2. Ball age mechanics (New Ball 0-14 ov, Soft Ball 15-45 ov, Old Ball 46-79 ov)
  let newBallFactor = 1.0;
  let reverseSwingFactor = 0;
  if (ballAgeOvers < 12) {
    newBallFactor = 1.22 - ballAgeOvers * 0.015; // Crisp seam & conventional swing
    effectivePaceBonus += 4;
  } else if (ballAgeOvers >= 15 && ballAgeOvers <= 44) {
    // Settled softer ball — easiest batting window against pace
    newBallFactor = 0.92;
    effectivePaceBonus -= 2;
  } else if (ballAgeOvers >= 48) {
    // Old ball grips for spinners and reverses on dry abrasive surfaces
    if (dynWeather.humidity < 65 || pitchWear >= 35) {
      reverseSwingFactor = Math.min(8, (ballAgeOvers - 45) * 0.22);
    }
  }

  // 3. Weather & Light effects
  const cloudSwingBoost = (dynWeather.cloudCover - 40) * 0.14; // -5.6 to +8.4
  const humiditySwingBoost = (dynWeather.humidity - 50) * 0.08;
  const effectiveSwingBonus = Math.max(
    0,
    match.weather.swingBonus * (ballAgeOvers < 25 ? 1.0 : 0.45) +
      cloudSwingBoost +
      humiditySwingBoost +
      reverseSwingFactor
  );

  const badLightBattingPenalty =
    dynWeather.lightLevel === 'BAD_LIGHT'
      ? 1.15
      : dynWeather.lightLevel === 'FADING'
      ? 1.06
      : 1.0;

  return {
    effectivePaceBonus,
    effectiveSpinBonus,
    effectiveSwingBonus,
    effectiveBounceVariation,
    unevenBounceWicketFactor,
    newBallFactor,
    reverseSwingFactor,
    badLightBattingPenalty,
    pitchWear,
    ballAgeOvers,
  };
}

/**
 * Advances Test match time by 1 completed over:
 * - Updates `ballAgeOvers` & checks 80-over new-ball availability
 * - Progressively deteriorates `pitchWear` based on `pitch.wearFactor`, `pitch.type`, temperature, and seed variance
 * - Evolves session (`Morning` -> `Lunch` -> `Afternoon` -> `Tea` -> `Evening` -> `Stumps`)
 * - Applies realistic Rain Delays & Bad Light Interruptions when weather warrants
 * - Grants configurable Extra Time (up to +8 overs) if a result is imminent on the final session
 * - Concludes match as `DRAW` when Day 5 playing time expires!
 */
export function advanceTestOverTimeAndConditions(
  matchInput: Match,
  getPlayer: (id: string) => Player
): Match {
  if (matchInput.format !== 'TEST') return matchInput;

  const match: Match = {
    ...matchInput,
    innings: matchInput.innings.map((inn) => ({ ...inn })),
  };

  const oversPerDay = match.oversPerDay || DEFAULT_TEST_OVERS_PER_DAY;
  const newBallThreshold = match.newBallOversThreshold || DEFAULT_NEW_BALL_OVERS;
  const sessionLen = Math.floor(oversPerDay / 3); // 30 overs per session for 90-over day

  let dayNumber = match.dayNumber || 1;
  let sessionNumber = match.sessionNumber || 1;
  let oversBowledToday = (match.oversBowledToday || 0) + 1;
  let oversLostToday = match.oversLostToday || 0;
  let totalOversLost = match.totalOversLostToWeather || 0;
  let extraOversToday = match.extraOversToday || 0;
  let sessionBreakStatus: string | undefined = undefined;
  let lastInterruptionText = match.lastInterruptionText;

  // Deterministic PRNG for this exact day & over
  const totalMatchOvers = match.innings.reduce((s, i) => s + i.completedOvers, 0);
  const rand = mulberry32((match.seed || 101) + dayNumber * 997 + totalMatchOvers * 31);

  // 1. Update active innings ball age & new ball availability
  const activeInn = match.innings[match.currentInningsIndex];
  if (activeInn && !activeInn.isCompleted) {
    const nextBallAge = (activeInn.ballAgeOvers ?? (activeInn.completedOvers - 1)) + 1;
    activeInn.ballAgeOvers = nextBallAge;

    if (nextBallAge >= newBallThreshold) {
      activeInn.newBallAvailable = true;

      // If AI is bowling, decide intelligently whether to take the new ball now!
      const isUserBowling = match.isUserMatch && activeInn.bowlingTeamId === match.userTeamId;
      if (!isUserBowling) {
        if (shouldAITakeNewBall(match, activeInn, getPlayer)) {
          activeInn.ballAgeOvers = 0;
          activeInn.newBallAvailable = false;
          activeInn.newBallsTaken = (activeInn.newBallsTaken || 0) + 1;
        }
      }
    }
  }

  // 2. Progressive Pitch Wear (varies per venue wearFactor, pitch type, temperature & match seed!)
  const venueWearVariance = 0.85 + ((match.seed || 101) % 31) * 0.01; // 0.85x to 1.15x unique per match
  const dynWeather =
    match.dynamicWeather || createInitialTestWeather(match.weather, match.seed || 101);
  const heatFactor = dynWeather.temperatureC >= 30 ? 1.15 : dynWeather.temperatureC <= 18 ? 0.88 : 1.0;
  const typeWearBase =
    match.pitch.type === 'DUSTBOWL_SPIN'
      ? 0.21
      : match.pitch.type === 'CRACKED_DAY5'
      ? 0.22
      : match.pitch.type === 'BATTER_PARADISE'
      ? 0.13
      : 0.165;

  const curWear = match.pitchWear ?? getInitialTestPitchWear(match.pitch, match.seed || 101);
  const wearIncrement = typeWearBase * (match.pitch.wearFactor || 1.0) * venueWearVariance * heatFactor;
  const updatedPitchWear = Number(Math.min(98, curWear + wearIncrement).toFixed(2));

  // 3. Weather & Light Checks at Session Boundaries / Evening Light
  let updatedWeather: TestDynamicWeather = { ...dynWeather };
  const effectiveOversElapsedToday = oversBowledToday + oversLostToday;

  // Occasional weather shift every 10 overs (or ongoing rain-delay check)
  if (oversBowledToday % 10 === 0 || updatedWeather.condition === 'RAIN_DELAY') {
    const cloudDelta = Math.round((rand() - 0.46) * 20);
    const nextCloud = Math.max(5, Math.min(98, updatedWeather.cloudCover + cloudDelta));
    updatedWeather.cloudCover = nextCloud;

    // Rain interruption check when clouds are heavy
    const rainBaseProb =
      match.weather.type === 'RAIN_RISK'
        ? 0.34
        : match.weather.type === 'OVERCAST_SWING'
        ? 0.14
        : match.weather.type === 'HUMID'
        ? 0.06
        : 0.015;

    if (nextCloud >= 76 && rand() < rainBaseProb) {
      const maxRemainingToday = Math.max(4, oversPerDay - (oversBowledToday + oversLostToday));
      const rawRainLost =
        match.weather.type === 'RAIN_RISK'
          ? 12 + Math.floor(rand() * 26) // Heavy rain front: 12-37 overs lost
          : 6 + Math.floor(rand() * 18); // Passing shower: 6-23 overs lost
      const rainOversLost = Math.min(maxRemainingToday, rawRainLost);
      oversLostToday += rainOversLost;
      totalOversLost += rainOversLost;
      updatedWeather.condition = 'RAIN_DELAY';
      updatedWeather.humidity = Math.min(96, updatedWeather.humidity + 10);
      updatedWeather.description = `Passing rain shower delayed play — ${rainOversLost} overs lost.`;
      lastInterruptionText = `Day ${dayNumber}: Rain delay cost ${rainOversLost} overs`;
      sessionBreakStatus = 'RAIN_DELAY';
    } else if (
      sessionNumber === 3 &&
      nextCloud >= 74 &&
      oversBowledToday >= sessionLen * 2 + 12 &&
      rand() < 0.20
    ) {
      // Bad light stops play in late Evening Session!
      const remainingBeforeStumps = Math.max(
        2,
        oversPerDay - (oversBowledToday + oversLostToday)
      );
      const lightLost = Math.min(remainingBeforeStumps, 3 + Math.floor(rand() * 8));
      if (lightLost > 0) {
        oversLostToday += lightLost;
        totalOversLost += lightLost;
        updatedWeather.condition = 'BAD_LIGHT';
        updatedWeather.lightLevel = 'BAD_LIGHT';
        updatedWeather.description = `Umpires took players off for bad light (${lightLost} overs lost).`;
        lastInterruptionText = `Day ${dayNumber} Evening: Bad light lost ${lightLost} overs`;
        sessionBreakStatus = 'BAD_LIGHT';
      }
    } else {
      updatedWeather.condition =
        nextCloud >= 70 ? 'OVERCAST' : nextCloud >= 38 ? 'PARTLY_CLOUDY' : 'SUNNY';
      updatedWeather.lightLevel =
        sessionNumber === 3 && nextCloud >= 65 ? 'FADING' : 'GOOD';
      updatedWeather.description =
        updatedWeather.condition === 'OVERCAST'
          ? 'Overcast skies offering lateral movement to seamers.'
          : updatedWeather.condition === 'PARTLY_CLOUDY'
          ? 'Scattered cloud cover with good viewing conditions.'
          : 'Bright sunshine baking the wicket.';
    }
  }

  // 4. Extra Time Rule: If at end of scheduled overs for the day (Days 1-4 or Day 5 when result is close),
  // umpires can grant up to 8 extra overs if 9 wickets are down or < 24 runs are needed in Innings 4!
  const totalScheduledToday = oversPerDay + extraOversToday;
  const nowElapsedToday = oversBowledToday + oversLostToday;

  if (
    nowElapsedToday >= totalScheduledToday &&
    extraOversToday === 0 &&
    updatedWeather.lightLevel !== 'BAD_LIGHT' &&
    activeInn &&
    !activeInn.isCompleted
  ) {
    const nineDown = activeInn.wickets === 9 && dayNumber < 5;
    const closeFinish =
      match.currentInningsIndex === 3 &&
      ((activeInn.targetRuns !== undefined && activeInn.targetRuns - activeInn.totalRuns <= 24) ||
        activeInn.wickets === 9);

    if (nineDown || closeFinish) {
      extraOversToday = 4; // Extra half-hour (4-8 overs) claimed!
    }
  }

  // 5. Session & Day Rollover
  const finalDayQuota = oversPerDay + extraOversToday;
  if (oversBowledToday + oversLostToday >= finalDayQuota) {
    dayNumber += 1;
    sessionNumber = 1;
    oversBowledToday = 0;
    oversLostToday = 0;
    extraOversToday = 0;
    sessionBreakStatus = 'STUMPS';
    updatedWeather.lightLevel = 'GOOD';
    if (updatedWeather.condition === 'BAD_LIGHT' || updatedWeather.condition === 'RAIN_DELAY') {
      updatedWeather.condition = updatedWeather.cloudCover >= 65 ? 'OVERCAST' : 'PARTLY_CLOUDY';
    }
  } else if (effectiveOversElapsedToday >= sessionLen * 2 && sessionNumber < 3) {
    sessionNumber = 3;
    sessionBreakStatus = 'TEA';
  } else if (effectiveOversElapsedToday >= sessionLen && sessionNumber < 2) {
    sessionNumber = 2;
    sessionBreakStatus = 'LUNCH';
  }

  // 6. Check Day 5 Time Expiry -> Match Drawn!
  if (dayNumber > 5) {
    return {
      ...match,
      dayNumber: 5,
      sessionNumber: 3,
      oversBowledToday: oversPerDay,
      oversLostToday,
      totalOversLostToWeather: totalOversLost,
      pitchWear: updatedPitchWear,
      dynamicWeather: updatedWeather,
      sessionBreakStatus: 'STUMPS',
      lastInterruptionText,
      status: 'DRAW',
      winnerTeamId: undefined,
      resultText:
        totalOversLost >= 25
          ? `Match Drawn (Rain & Time Expired — ${totalOversLost} overs lost)`
          : 'Match Drawn (Time Expired on Day 5)',
    };
  }

  return {
    ...match,
    dayNumber,
    sessionNumber,
    oversBowledToday,
    oversLostToday,
    extraOversToday,
    totalOversLostToWeather: totalOversLost,
    pitchWear: updatedPitchWear,
    dynamicWeather: updatedWeather,
    sessionBreakStatus,
    lastInterruptionText,
  };
}

/**
 * Decides whether AI captain takes the new ball once >= 80 overs old
 */
export function shouldAITakeNewBall(
  match: Match,
  innings: InningsState,
  getPlayer: (id: string) => Player
): boolean {
  // If 9 wickets are down and spinners are bowling on a raging Day 5 turner, keep old ball for 3-4 overs
  const bowlingXI = innings.bowlingTeamId === match.homeTeamId ? match.homeXI : match.awayXI;
  const pacers = bowlingXI
    .map((id) => getPlayer(id))
    .filter((p) => !isSpinBowler(p.bowlingStyle) && (p.role === 'BOWLER' || p.role === 'ALL_ROUNDER'));

  if (pacers.length === 0) return false;

  const wear = match.pitchWear || 20;
  if (wear >= 82 && (innings.ballAgeOvers || 80) < 88 && innings.wickets >= 7) {
    return false; // Spinners exploiting heavy rough against tail
  }

  return true;
}

/**
 * Explicitly takes the new ball in Test cricket when eligible (>= threshold overs)
 */
export function takeNewBallInTestMatch(match: Match): Match {
  if (match.format !== 'TEST' || match.status !== 'IN_PROGRESS') return match;
  const inn = match.innings[match.currentInningsIndex];
  if (!inn || inn.isCompleted) return match;

  const threshold = match.newBallOversThreshold || DEFAULT_NEW_BALL_OVERS;
  const ballAge = inn.ballAgeOvers ?? inn.completedOvers;
  if (ballAge < threshold && !inn.newBallAvailable) return match;

  const updatedInn: InningsState = {
    ...inn,
    ballAgeOvers: 0,
    newBallAvailable: false,
    newBallsTaken: (inn.newBallsTaken || 0) + 1,
  };

  const nextInnings = [...match.innings];
  nextInnings[match.currentInningsIndex] = updatedInn;
  return {
    ...match,
    innings: nextInnings,
  };
}

/**
 * Official MCC Law 14 Follow-On threshold:
 * - 200 runs in a 5-day Test match
 * - 150 runs if an entire day (>= 90 overs) was lost before play progressed (3-4 day effective match)
 */
export function getTestFollowOnThreshold(match: Match): number {
  if ((match.totalOversLostToWeather || 0) >= 90 && (match.innings[0]?.completedOvers || 0) === 0) {
    return 150;
  }
  return 200;
}

export function isTestFollowOnEligible(match: Match): boolean {
  if (match.format !== 'TEST' || match.innings.length < 2) return false;
  const inn1 = match.innings[0];
  const inn2 = match.innings[1];
  if (!inn1?.isCompleted || !inn2?.isCompleted) return false;
  const lead = inn1.totalRuns - inn2.totalRuns;
  return lead >= getTestFollowOnThreshold(match);
}

/**
 * Multi-factor AI Follow-On Decision Engine (Section 4):
 * Considers lead, match time remaining, pitch conditions, bowler fatigue, and bowling resources!
 * Does NOT blindly enforce follow-on every time!
 */
export function decideAIFollowOn(
  match: Match,
  getPlayer: (id: string) => Player
): boolean {
  if (!isTestFollowOnEligible(match)) return false;

  const inn1 = match.innings[0];
  const inn2 = match.innings[1];
  const lead = inn1.totalRuns - inn2.totalRuns;
  const oversRemaining = getRemainingOversInTestMatch(match);
  const pitchWear = match.pitchWear || 25;
  const inn2Overs = inn2.completedOvers;

  // Measure bowling attack workload & fatigue
  const bowlingXI = inn1.battingTeamId === match.homeTeamId ? match.homeXI : match.awayXI;
  const specialistBowlers = bowlingXI
    .map((id) => getPlayer(id))
    .filter((p) => p.role === 'BOWLER' || p.role === 'ALL_ROUNDER');

  const avgFatigue =
    specialistBowlers.length > 0
      ? specialistBowlers.reduce((s, p) => s + (p.workloadFatigue || 20), 0) /
        specialistBowlers.length
      : 35;

  let score = 0;

  // 1. Lead size
  if (lead >= 320) score += 40;
  else if (lead >= 260) score += 22;
  else score += 8; // 200-259 lead: cautious if plenty of time left

  // 2. Remaining match time: if rain/slow play left < 145 overs, MUST enforce to have time to take 10 wickets!
  if (oversRemaining < 135) score += 45;
  else if (oversRemaining < 175) score += 20;
  else if (oversRemaining > 235) score -= 22; // Tons of time left (e.g. Day 3 Morning) -> bat again & rest bowlers!

  // 3. Bowler fatigue & Innings 2 duration
  if (inn2Overs >= 95) score -= 35; // Bowlers just spent 95+ overs in the dirt — rest them!
  else if (inn2Overs >= 75) score -= 18;
  else if (inn2Overs <= 52) score += 22; // Rolled opponent quickly — bowlers are fresh!

  if (avgFatigue >= 68) score -= 25;
  else if (avgFatigue <= 35) score += 10;

  // 4. Pitch conditions: if surface will crumble badly on Day 5, avoid chasing last!
  if (match.pitch.type === 'DUSTBOWL_SPIN' || (match.pitch.wearFactor || 1.0) >= 1.3) {
    score += 15;
  } else if (match.pitch.type === 'BATTER_PARADISE' && pitchWear < 35) {
    score -= 15;
  }

  // 5. Available bowling depth (5+ genuine options makes enforcing safer)
  if (specialistBowlers.length >= 5) score += 8;
  else if (specialistBowlers.length <= 3) score -= 18;

  return score >= 20;
}

/**
 * Validates whether the current batting captain is legally & logically permitted to declare
 */
export function validateTestDeclaration(match: Match): {
  allowed: boolean;
  reason?: string;
} {
  if (match.format !== 'TEST') {
    return { allowed: false, reason: 'Declarations are only permitted in Test cricket.' };
  }
  if (match.status !== 'IN_PROGRESS') {
    return { allowed: false, reason: 'Match is not actively in progress.' };
  }
  if (match.awaitingFollowOnDecision) {
    return { allowed: false, reason: 'Resolve the follow-on decision before declaring.' };
  }
  const inn = match.innings[match.currentInningsIndex];
  if (!inn || inn.isCompleted || inn.wickets >= 10) {
    return { allowed: false, reason: 'Current innings has already concluded.' };
  }
  if (inn.completedOvers === 0 && inn.ballsInCurrentOver === 0) {
    return { allowed: false, reason: 'Cannot declare before a ball has been bowled in the innings.' };
  }
  if (match.currentInningsIndex === 3) {
    return {
      allowed: false,
      reason: 'Cannot declare in the 4th innings — batting side is chasing a final-innings target.',
    };
  }
  return { allowed: true };
}

export interface DeclarationStrategicSummary {
  allowed: boolean;
  reason?: string;
  inningsNumber: number;
  scoreText: string;
  oversFacedText: string;
  leadOrDeficitText: string;
  leadRuns: number; // positive = leading, negative = trailing
  opponentPreviousScoreText: string;
  oversRemainingInMatch: number;
  daysSessionsRemainingText: string;
  strategicConsequences: string;
}

/**
 * Computes rich strategic information for the Declaration Confirmation UI (Section 5)
 */
export function getDeclarationStrategicContext(match: Match): DeclarationStrategicSummary {
  const check = validateTestDeclaration(match);
  const inn = match.innings[match.currentInningsIndex];
  const oversRemaining = getRemainingOversInTestMatch(match);

  if (!inn) {
    return {
      allowed: false,
      reason: check.reason || 'No active innings',
      inningsNumber: 1,
      scoreText: '0/0',
      oversFacedText: '0.0',
      leadOrDeficitText: 'Level',
      leadRuns: 0,
      opponentPreviousScoreText: 'Yet to bat',
      oversRemainingInMatch: oversRemaining,
      daysSessionsRemainingText: `${oversRemaining} overs remaining`,
      strategicConsequences: '',
    };
  }

  const scoreText = `${inn.totalRuns}/${inn.wickets}`;
  const oversFacedText = `${inn.completedOvers}.${inn.ballsInCurrentOver}`;
  const daysApprox = (oversRemaining / (match.oversPerDay || 90)).toFixed(1);
  const daysSessionsRemainingText = `Day ${match.dayNumber} Session ${match.sessionNumber} • ~${oversRemaining} overs left (~${daysApprox} days)`;

  let leadRuns = 0;
  let leadOrDeficitText = '';
  let opponentPreviousScoreText = '';
  let strategicConsequences = '';

  const inn1 = match.innings[0];
  const inn2 = match.innings[1];

  if (match.currentInningsIndex === 0) {
    leadRuns = inn.totalRuns;
    leadOrDeficitText = `1st Innings Total: ${inn.totalRuns}`;
    opponentPreviousScoreText = `${inn.bowlingTeamName} yet to bat`;
    strategicConsequences =
      inn.totalRuns >= 450
        ? `Strong 1st-innings platform (${inn.totalRuns}). Declaring now puts ${inn.bowlingTeamName}'s openers in against a fresh new ball with ${oversRemaining} overs remaining in the Test.`
        : `Caution: Declaring on ${inn.totalRuns} in the 1st innings risks conceding a first-innings lead unless conditions are extreme (${oversRemaining} overs left).`;
  } else if (match.currentInningsIndex === 1 && inn1) {
    leadRuns = inn.totalRuns - inn1.totalRuns;
    opponentPreviousScoreText = `${inn1.battingTeamName} 1st Innings: ${inn1.totalRuns}/${inn1.wickets}${inn1.isDeclared ? 'd' : ''}`;
    if (leadRuns >= 0) {
      leadOrDeficitText = `Lead by ${leadRuns} runs`;
      strategicConsequences = `Declaring hands ${inn.battingTeamName} a ${leadRuns}-run 1st-innings lead and immediately attacks ${inn1.battingTeamName} in their 2nd innings.`;
    } else {
      const deficit = Math.abs(leadRuns);
      leadOrDeficitText = `Trail by ${deficit} runs`;
      strategicConsequences =
        deficit >= 200
          ? `High Risk: Declaring ${deficit} runs behind leaves ${inn.battingTeamName} vulnerable to having the follow-on enforced!`
          : `Tactical behind-declaration (${deficit} runs arrears) to utilize bowling conditions and advance the game with ${oversRemaining} overs remaining.`;
    }
  } else if (match.currentInningsIndex === 2 && inn1 && inn2) {
    if (match.followOnEnforced) {
      const comb = inn2.totalRuns + inn.totalRuns;
      leadRuns = comb - inn1.totalRuns;
      opponentPreviousScoreText = `${inn1.battingTeamName}: ${inn1.totalRuns}/${inn1.wickets}${inn1.isDeclared ? 'd' : ''}`;
      if (leadRuns < 0) {
        leadOrDeficitText = `Still trail by ${Math.abs(leadRuns)} runs (Following On)`;
        strategicConsequences = `CRITICAL WARNING: Declaring while still trailing by ${Math.abs(leadRuns)} runs following-on will hand ${inn1.battingTeamName} an immediate Innings Victory!`;
      } else {
        const target = leadRuns + 1;
        const reqRpo = oversRemaining > 0 ? (target / oversRemaining).toFixed(2) : '99.9';
        leadOrDeficitText = `Lead by ${leadRuns} runs (Target ${target})`;
        strategicConsequences = `Sets ${inn1.battingTeamName} a 4th-innings target of ${target} in ${oversRemaining} remaining overs (Required RPO: ${reqRpo}).`;
      }
    } else {
      leadRuns = inn1.totalRuns + inn.totalRuns - inn2.totalRuns;
      const target = Math.max(1, leadRuns + 1);
      const reqRpo = oversRemaining > 0 ? (target / oversRemaining).toFixed(2) : '99.9';
      opponentPreviousScoreText = `${inn2.battingTeamName} 1st Innings: ${inn2.totalRuns}/${inn2.wickets}${inn2.isDeclared ? 'd' : ''}`;
      leadOrDeficitText = `Overall Lead: ${leadRuns} runs (Sets Target: ${target})`;
      strategicConsequences =
        leadRuns >= 320
          ? `Sets ${inn2.battingTeamName} a challenging 4th-innings target of ${target} on a Day ${match.dayNumber} pitch (${Math.round(match.pitchWear || 40)}% wear) with ${oversRemaining} overs to take 10 wickets (Req RPO: ${reqRpo}).`
          : `Aggressive sporting declaration: ${inn2.battingTeamName} will need ${target} runs in ${oversRemaining} overs (Req RPO: ${reqRpo}), keeping all three results in play.`;
    }
  }

  return {
    allowed: check.allowed,
    reason: check.reason,
    inningsNumber: inn.inningsNumber,
    scoreText,
    oversFacedText,
    leadOrDeficitText,
    leadRuns,
    opponentPreviousScoreText,
    oversRemainingInMatch: oversRemaining,
    daysSessionsRemainingText,
    strategicConsequences,
  };
}

/**
 * Intelligent AI Captain Declaration Engine (Section 5):
 * Evaluates match score, lead, pitch wear, and remaining overs in the Test match.
 */
export function shouldAICaptainDeclare(match: Match): boolean {
  const check = validateTestDeclaration(match);
  if (!check.allowed) return false;

  const inn = match.innings[match.currentInningsIndex];
  if (!inn) return false;

  const oversRemaining = getRemainingOversInTestMatch(match);
  const oversPerDay = match.oversPerDay || DEFAULT_TEST_OVERS_PER_DAY;
  const pitchWear = match.pitchWear || 25;

  // 1. INNINGS 1 DECLARATION
  if (match.currentInningsIndex === 0) {
    // Declare on massive score >= 555, OR >= 505 right before Stumps on Day 2/3 to get a fiery 10-over burst!
    const nearStumps = (match.oversBowledToday || 0) >= oversPerDay - 12;
    if (inn.totalRuns >= 565 && inn.wickets >= 5) return true;
    if (inn.totalRuns >= 510 && inn.wickets >= 6 && nearStumps) return true;
    if (oversRemaining <= 165 && inn.totalRuns >= 440 && inn.wickets >= 6) return true; // Rain-shortened Test
    return false;
  }

  // 2. INNINGS 2 DECLARATION
  if (match.currentInningsIndex === 1) {
    const inn1 = match.innings[0];
    if (!inn1) return false;
    const lead = inn.totalRuns - inn1.totalRuns;
    if (lead >= 230 && inn.wickets >= 6) return true;
    if (lead >= 175 && oversRemaining <= 125 && inn.wickets >= 5) return true;
    return false;
  }

  // 3. INNINGS 3 DECLARATION (Setting 4th-Innings Target!)
  if (match.currentInningsIndex === 2) {
    const inn1 = match.innings[0];
    const inn2 = match.innings[1];
    if (!inn1 || !inn2) return false;

    if (match.followOnEnforced) {
      // Following on: never declare unless miraculous 390+ lead with < 95 overs left!
      const folLead = inn2.totalRuns + inn.totalRuns - inn1.totalRuns;
      return folLead >= 390 && oversRemaining <= 95 && oversRemaining >= 55;
    }

    const lead = inn1.totalRuns + inn.totalRuns - inn2.totalRuns;
    // Need enough overs left to actually bowl the opposition out (at least ~50 overs ideally)
    if (oversRemaining < 38) return false;

    // Safe RPO cushion depends on Day 4/5 pitch wear:
    // Heavy wear (>=60%): 3.65 RPO is almost impossible to chase over 85+ overs
    // Moderate wear (40-59%): 3.95 RPO cushion
    // Flat pitch (<40%): 4.25 RPO cushion
    const safeChaseRPO = pitchWear >= 62 ? 3.35 : pitchWear >= 42 ? 3.65 : 3.95;
    const desiredTarget = Math.max(
      pitchWear >= 65 ? 285 : 320,
      Math.min(420, Math.round(oversRemaining * safeChaseRPO))
    );

    if (lead + 1 >= desiredTarget && oversRemaining <= 145) {
      return true;
    }

    // Day 4 Afternoon/Evening on worn wicket: 305+ lead with <= 140 overs remaining
    if (pitchWear >= 52 && lead >= 305 && oversRemaining <= 140 && oversRemaining >= 48) {
      return true;
    }

    // Late Day 4 / Day 5 Morning: if ~48-95 overs left and lead >= 285, declare to force a win!
    if (oversRemaining <= 95 && oversRemaining >= 48 && lead >= 285) {
      return true;
    }
  }

  return false;
}

/**
 * Dynamic Test Batting AI (Section 7):
 * Evaluates match situation, target, remaining overs, wickets lost, pitch wear, and batter traits
 * so AI teams protect wickets for a draw, accelerate before declaring, or pace a 4th-innings chase!
 */
export function determineAITestBattingApproach(
  match: Match,
  innings: InningsState,
  striker: Player
): BattingAggression {
  const oversRemaining = getRemainingOversInTestMatch(match);
  const oversPerDay = match.oversPerDay || DEFAULT_TEST_OVERS_PER_DAY;
  const oversToday = match.oversBowledToday || 0;
  const wickets = innings.wickets;
  const ballAge = innings.ballAgeOvers ?? innings.completedOvers;
  const pitchWear = match.pitchWear || 20;

  // Last 3 overs before Stumps: batters tighten defense to survive overnight!
  if (oversToday >= oversPerDay - 3 && match.currentInningsIndex !== 2) {
    return wickets >= 5 ? 'BLOCK' : 'DEFENSIVE';
  }

  // 4TH INNINGS CHASE vs SURVIVAL FOR A DRAW
  if (match.currentInningsIndex === 3 && innings.targetRuns !== undefined) {
    const runsNeeded = innings.targetRuns - innings.totalRuns;
    if (runsNeeded <= 0) return 'BALANCED';

    const reqRPO = oversRemaining > 0 ? runsNeeded / oversRemaining : 99;

    // Case A: Draw Survival Mode!
    // Target out of reach OR 7+ wickets down with too many runs still required
    if (
      (wickets >= 7 && runsNeeded > 55 && oversRemaining <= 55) ||
      (wickets >= 6 && reqRPO > 4.8 && oversRemaining <= 65) ||
      (reqRPO > 5.5 && oversRemaining <= 45)
    ) {
      return wickets >= 8 || oversRemaining <= 22 ? 'BLOCK' : 'DEFENSIVE';
    }

    // Case B: Realistic Winning Chase!
    if (runsNeeded <= 45 && wickets <= 7) {
      return 'BALANCED';
    }
    if (reqRPO >= 3.8 && reqRPO <= 5.2 && wickets <= 5) {
      return 'ATTACKING';
    }
    if (wickets >= 6 && pitchWear >= 60) {
      return 'DEFENSIVE';
    }
    return 'BALANCED';
  }

  // 3RD INNINGS: SETTING UP A DECLARATION OR SAVING FOLLOW-ON
  if (match.currentInningsIndex === 2) {
    const inn1 = match.innings[0];
    const inn2 = match.innings[1];
    if (match.followOnEnforced && inn1 && inn2) {
      const stillBehind = inn1.totalRuns - (inn2.totalRuns + innings.totalRuns);
      if (stillBehind > 0 && wickets >= 5) {
        return oversRemaining <= 65 ? 'BLOCK' : 'DEFENSIVE';
      }
      return wickets >= 6 ? 'DEFENSIVE' : 'BALANCED';
    }

    if (inn1 && inn2) {
      const lead = inn1.totalRuns + innings.totalRuns - inn2.totalRuns;
      // Accelerate when wickets in hand and pushing toward declaration window!
      if (lead >= 210 && wickets <= 5 && oversRemaining <= 145) {
        return 'ATTACKING';
      }
      if (lead >= 280 && wickets <= 7 && oversRemaining <= 115) {
        return 'ATTACKING';
      }
    }
  }

  // 1ST / 2ND INNINGS SITUATIONAL ADAPTATION
  // Early collapse (< 65 for 3+ wickets) or brand-new swinging ball under overcast skies -> rebuild defensively!
  const isHeavySwing =
    ballAge < 10 &&
    ((match.dynamicWeather?.cloudCover || 40) >= 70 || match.pitch.type === 'GREEN_SEAMER');
  if ((innings.totalRuns < 65 && wickets >= 3) || (isHeavySwing && wickets >= 2)) {
    return 'DEFENSIVE';
  }

  // Dominant platform (320+ with <= 4 wickets down) -> positive strokeplay
  if (innings.totalRuns >= 320 && wickets <= 4 && striker.attributes.aggression >= 72) {
    return 'ATTACKING';
  }

  // Deteriorating pitch with tailenders / pressure
  if (pitchWear >= 68 && striker.attributes.defense >= 78 && striker.attributes.aggression < 65) {
    return 'DEFENSIVE';
  }

  return 'BALANCED';
}

/**
 * Dynamic Test Bowling & Field Placement AI (Section 8)
 */
export function determineAITestBowlingTactics(
  match: Match,
  innings: InningsState,
  bowler: Player
): Pick<MatchTactics, 'bowlingTactic' | 'fieldPreset'> {
  const isSpin = isSpinBowler(bowler.bowlingStyle);
  const ballAge = innings.ballAgeOvers ?? innings.completedOvers;
  const pitchWear = match.pitchWear || 20;
  const oversRemaining = getRemainingOversInTestMatch(match);

  // Day 5 pushing for final wickets to win!
  if (
    match.currentInningsIndex >= 2 &&
    innings.wickets >= 6 &&
    oversRemaining <= 45 &&
    (!innings.targetRuns || innings.targetRuns - innings.totalRuns > 45)
  ) {
    return {
      bowlingTactic: isSpin ? 'FLIGHT_SPIN' : 'ATTACKING_FULL',
      fieldPreset: 'ATTACKING_SLIPS',
    };
  }

  // New ball (< 12 overs): slips cordon + full swinging length
  if (!isSpin && ballAge < 12) {
    return {
      bowlingTactic: 'ATTACKING_FULL',
      fieldPreset: 'ATTACKING_SLIPS',
    };
  }

  // Spinner on worn Day 3-5 track
  if (isSpin && pitchWear >= 42) {
    return {
      bowlingTactic: 'FLIGHT_SPIN',
      fieldPreset: innings.wickets >= 5 || pitchWear >= 65 ? 'ATTACKING_SLIPS' : 'RING_INNER',
    };
  }

  // Defending small 4th-innings target (< 50 runs left)
  if (
    match.currentInningsIndex === 3 &&
    innings.targetRuns &&
    innings.targetRuns - innings.totalRuns <= 45 &&
    innings.wickets <= 6
  ) {
    return {
      bowlingTactic: 'TIGHT_DEFENSIVE',
      fieldPreset: 'DEFENSIVE_BOUNDARY',
    };
  }

  // Express pacer vs tailender -> short-ball barrage!
  if (!isSpin && bowler.attributes.pace >= 84 && innings.wickets >= 7) {
    return {
      bowlingTactic: 'BOUNCER_SHORT',
      fieldPreset: 'ATTACKING_SLIPS',
    };
  }

  return {
    bowlingTactic: isSpin ? 'FLIGHT_SPIN' : 'BALANCED_CONTAIN',
    fieldPreset: 'BALANCED_STANDARD',
  };
}

function isEligibleBowlerRole(p: Player): boolean {
  return p.role === 'BOWLER' || p.role === 'ALL_ROUNDER';
}

/**
 * Scores a player's genuine Test bowling capability (separating front-line bowlers & all-rounders from pure batters/keepers)
 */
function scoreTestBowlerBaseAbility(p: Player, isWk: boolean): number {
  if (isWk || !isEligibleBowlerRole(p)) return -500;
  const isSpin = isSpinBowler(p.bowlingStyle);
  const primarySkill = isSpin
    ? p.attributes.spin * 0.45 + p.attributes.variation * 0.25 + p.attributes.accuracy * 0.30
    : p.attributes.pace * 0.35 +
      Math.max(p.attributes.swing, p.attributes.seam) * 0.35 +
      p.attributes.accuracy * 0.30;

  const roleBonus = p.role === 'BOWLER' ? 35 : 18;

  return primarySkill * 0.65 + p.attributes.wicketTaking * 0.35 + roleBonus;
}

/**
 * Selects the opening new-ball bowler at the start of a Test innings.
 * Strictly restricts selection to nominated bowlers (if provided) and never allows specialist batters or wicketkeepers to bowl.
 */
export function selectTestOpeningBowler(
  bowlingXI: string[],
  wicketKeeperId: string | undefined,
  pitch?: PitchCondition | string,
  weather?: WeatherCondition | string,
  getPlayer?: (id: string) => Player,
  nominatedBowlerIds?: string[]
): string {
  const getP =
    getPlayer ||
    ((id: string) => ({ id, shortName: 'Bowler', role: 'BOWLER', bowlingStyle: 'RIGHT_ARM_FAST_MEDIUM' } as Player));

  const allMapped = bowlingXI
    .filter((id) => id !== wicketKeeperId)
    .map((id) => ({ id, player: getP(id) }));

  const genuineBowlers = allMapped.filter((c) => isEligibleBowlerRole(c.player));
  const nominatedPool =
    nominatedBowlerIds && nominatedBowlerIds.length > 0
      ? genuineBowlers.filter((c) => nominatedBowlerIds.includes(c.id))
      : [];

  const candidates =
    nominatedPool.length > 0
      ? nominatedPool
      : genuineBowlers.length > 0
      ? genuineBowlers
      : allMapped.filter((c) => isEligibleBowlerRole(c.player));

  if (candidates.length === 0) {
    const anyEligible = bowlingXI
      .map((id) => ({ id, player: getP(id) }))
      .filter((c) => isEligibleBowlerRole(c.player));
    if (anyEligible.length > 0) return anyEligible[0].id;
    return bowlingXI[bowlingXI.length - 1];
  }

  const pType =
    typeof pitch === 'string'
      ? pitch
      : pitch && typeof pitch === 'object'
      ? pitch.type
      : 'SPORTING_BALANCED';
  const wSwing =
    typeof weather === 'object' && weather?.swingBonus !== undefined
      ? weather.swingBonus
      : 6;

  candidates.sort((a, b) => {
    const aSpin = isSpinBowler(a.player.bowlingStyle);
    const bSpin = isSpinBowler(b.player.bowlingStyle);
    // Strongly prefer fast/swing/seam bowlers with the brand-new red ball unless pitch is extreme dustbowl with no pacers
    const aNewBall =
      scoreTestBowlerBaseAbility(a.player, false) +
      (aSpin ? (pType === 'DUSTBOWL_SPIN' ? -8 : -45) : 25 + wSwing * 0.4);
    const bNewBall =
      scoreTestBowlerBaseAbility(b.player, false) +
      (bSpin ? (pType === 'DUSTBOWL_SPIN' ? -8 : -45) : 25 + wSwing * 0.4);
    return bNewBall - aNewBall;
  });

  return candidates[0].id;
}

/**
 * Intelligent Test Bowling Rotation Engine (Section 8):
 * - Strictly excludes specialist batters (BATTER) and wicketkeepers (WICKETKEEPER_BATTER).
 * - Prioritizes the user's nominated bowlers (homeBowlingOptions / awayBowlingOptions); only falls back
 *   to other BOWLER / ALL_ROUNDER players in the XI if fewer than 2 bowlers were nominated.
 * - When the user is bowling, preserves the user's active two-bowler tandem (currentEndIncumbentId)
 *   so the user controls when bowling changes happen.
 */
export function selectNextTestBowler(
  match: Match,
  innings: InningsState,
  bowlingXI: string[],
  getPlayer: (id: string) => Player
): string {
  const prevBowlerId = innings.currentBowlerId;
  const wkId =
    innings.bowlingTeamId === match.homeTeamId
      ? match.homeWicketKeeperId
      : match.awayWicketKeeperId;
  const nominated =
    innings.bowlingTeamId === match.homeTeamId
      ? match.homeBowlingOptions
      : match.awayBowlingOptions;
  const isUserTeamBowling = Boolean(
    match.isUserMatch && match.userTeamId && innings.bowlingTeamId === match.userTeamId
  );

  const completedOvers = innings.completedOvers;
  const ballAge = innings.ballAgeOvers ?? completedOvers;
  const pitchWear = match.pitchWear ?? getInitialTestPitchWear(match.pitch, match.seed || 101);
  const striker = getPlayer(innings.currentStrikerId);

  const spellMap = innings.bowlerSpellOvers || {};
  const lastOverMap = innings.bowlerLastOverBowled || {};

  // Identify who bowled 2 overs ago (the bowler currently operating from THIS end!)
  let currentEndIncumbentId: string | undefined;
  for (const [bId, lastOv] of Object.entries(lastOverMap)) {
    if (lastOv === completedOvers - 2 && bId !== prevBowlerId) {
      currentEndIncumbentId = bId;
      break;
    }
  }

  const rand = mulberry32((match.seed || 101) + match.currentInningsIndex * 409 + completedOvers * 53);

  const nonKeepers = bowlingXI.filter((id) => id !== prevBowlerId && id !== wkId);
  const genuineBowlers = nonKeepers.filter((id) => isEligibleBowlerRole(getPlayer(id)));
  const nominatedBowlers =
    nominated && nominated.length > 0
      ? genuineBowlers.filter((id) => nominated.includes(id))
      : [];

  // Strictly use BOWLER and ALL_ROUNDER roles only (never specialist batters or wicketkeepers)
  const eligible =
    nominatedBowlers.length > 0
      ? nominatedBowlers
      : genuineBowlers.length > 0
      ? genuineBowlers
      : bowlingXI.filter((id) => id !== prevBowlerId && isEligibleBowlerRole(getPlayer(id)));

  if (eligible.length === 0) {
    const anyBowlerInXI = bowlingXI.filter((id) => isEligibleBowlerRole(getPlayer(id)));
    if (anyBowlerInXI.length > 0) {
      return anyBowlerInXI.find((id) => id !== prevBowlerId) || anyBowlerInXI[0];
    }
    return bowlingXI[bowlingXI.length - 1];
  }

  const scored = eligible.map((id) => {
    const p = getPlayer(id);
    const isSpin = isSpinBowler(p.bowlingStyle);
    const baseScore = scoreTestBowlerBaseAbility(p, id === wkId);

    const fig = innings.bowlers.find((b) => b.playerId === id);
    const totalOversBowled = fig ? fig.overs : 0;
    const spellOvers = spellMap[id] || 0;
    const lastOv = lastOverMap[id];
    const oversRested = lastOv === undefined ? 99 : Math.max(0, completedOvers - 1 - lastOv);

    // Max spell length before needing a breather
    const maxSpell = isSpin ? 11 : p.attributes.pace >= 85 ? 5 : 7;
    const minRestRequired = isSpin ? 3 : 5;

    let priority = baseScore;

    // 1. Continuity within an active spell from this end (so bowlers bowl coherent 5-8 over spells!)
    if (id === currentEndIncumbentId) {
      if (spellOvers < maxSpell) {
        // Bonus to continue current spell (even stronger if taking wickets or economical!)
        priority += 28;
        if (fig && fig.wickets > 0 && fig.economy < 3.5) priority += 8;
      } else {
        // Completed full spell — take off the attack to rest!
        priority -= 65 - (spellOvers - maxSpell) * 18;
      }
    } else if (lastOv !== undefined && oversRested < minRestRequired) {
      // Still recovering from recent spell!
      priority -= 48;
    } else if (oversRested >= minRestRequired && totalOversBowled === 0 && completedOvers >= 10) {
      // Bring 3rd / 4th / 5th front-line bowler into the attack after opening spell!
      if (p.role === 'BOWLER' || p.role === 'ALL_ROUNDER') {
        priority += 24;
      }
    }

    // 2. Prevent excessive innings workload (spread overs realistically across the 4-5 bowlers)
    const workloadCap = isSpin ? 28 : 22;
    if (totalOversBowled > workloadCap) {
      priority -= (totalOversBowled - workloadCap) * 4.5;
    } else {
      priority -= totalOversBowled * 0.9;
    }

    // Bowler career/match fatigue & stamina
    if ((p.workloadFatigue || 15) >= 75 && !isSpin) {
      priority -= 14;
    }

    // 3. Ball Age & Conditions Matchup
    if (ballAge < 12) {
      // Brand new cherry: prime fast/swing bowlers dominate selection!
      priority += isSpin ? -28 : 26 + Math.max(p.attributes.swing, p.attributes.seam) * 0.15;
    } else if (ballAge >= 18 && ballAge <= 45) {
      // Middle overs with softer ball: spinners & change-up all-rounders come into play
      if (isSpin) priority += 12;
    } else if (ballAge >= 48) {
      // Old ball: spinners grip + high-pace reverse swingers
      if (isSpin) priority += 16;
      else if (p.attributes.pace >= 82 && p.attributes.control >= 75) priority += 12;
    }

    // 4. Pitch Deterioration (Days 3-5 wear boosts spinners significantly)
    if (isSpin) {
      priority += (pitchWear - 25) * 0.45 + match.pitch.spinBonus * 0.6;
    } else {
      priority += match.pitch.paceBonus * 0.45 + (match.dynamicWeather?.cloudCover || 30) * 0.12;
    }

    // 5. Target Striker Weakness!
    if (isSpin && striker.attributes.againstSpin + 6 < striker.attributes.againstPace) {
      priority += 9;
    } else if (!isSpin && striker.attributes.againstPace + 6 < striker.attributes.againstSpin) {
      priority += 9;
    }

    // 6. Subtle seeded tactical variance so AI doesn't repeat identical patterns every match
    priority += (rand() - 0.5) * 9;

    return { id, priority };
  });

  scored.sort((a, b) => b.priority - a.priority);
  return scored[0].id;
}

/**
 * Updates spell tracking maps when an over is completed by `bowlerId` at `completedOverIndex` (0-based)
 */
export function recordBowlerOverInSpellTracker(
  innings: InningsState,
  bowlerId: string,
  completedOverIndex: number
): void {
  const spellMap = { ...(innings.bowlerSpellOvers || {}) };
  const lastOverMap = { ...(innings.bowlerLastOverBowled || {}) };

  const prevLastOver = lastOverMap[bowlerId];
  // If this bowler bowled 2 overs ago (same end continuity), increment spell; otherwise start fresh spell of 1!
  if (prevLastOver !== undefined && completedOverIndex - prevLastOver <= 2) {
    spellMap[bowlerId] = (spellMap[bowlerId] || 0) + 1;
  } else {
    spellMap[bowlerId] = 1;
  }

  // Decay spell counter to 0 for any bowler who has rested >= 3 overs
  for (const [otherId, lastOv] of Object.entries(lastOverMap)) {
    if (otherId !== bowlerId && completedOverIndex - lastOv >= 3) {
      spellMap[otherId] = 0;
    }
  }

  lastOverMap[bowlerId] = completedOverIndex;
  innings.bowlerSpellOvers = spellMap;
  innings.bowlerLastOverBowled = lastOverMap;
  innings.lastCompletedOverBowlerId = bowlerId;
}
