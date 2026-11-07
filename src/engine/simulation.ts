import {
  MatchFormat,
  Player,
  BallOutcome,
  DismissalType,
  BattingAggression,
  BowlingTactic,
  FieldPreset,
  PitchCondition,
  WeatherCondition,
  IndividualBatterInstruction,
  TeamBattingGamePlan,
  CustomScoringTarget,
  IndividualBowlingPlan,
  BowlerSpellData,
  CustomFieldLayout,
  TacticalCalibrationSettings,
  BowlingLine,
  BowlingLength,
} from '../types/cricket';
import { getPowerplayPhase, isDismissalLegalForDelivery } from './rules';
import {
  calculateHighRiskActionProbabilities,
  evaluateScoringTargetProgress,
} from './tacticalEngine';

export interface TestConditionsModifiersInput {
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
}

export interface WhiteBallModifiersInput {
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

export interface FieldingPlayerRef {
  id: string;
  shortName: string;
  isWicketKeeper?: boolean;
}

export interface DeliveryContext {
  format: MatchFormat;
  striker: Player;
  nonStriker: Player;
  bowler: Player;
  pitch: PitchCondition;
  weather: WeatherCondition;
  overNumber: number; // 0-based completed overs
  ballInOver: number; // 0-5 balls in current over
  currentScore: number;
  wicketsLost: number;
  targetRuns?: number;
  battingAggression: BattingAggression;
  bowlingTactic: BowlingTactic;
  fieldPreset: FieldPreset;
  overCompletedOvers: number;
  dayNumber?: number; // 1-5 for Test
  sessionNumber?: number; // 1-3 for Test
  seed?: number;
  strikerBallsFaced?: number;
  strikerRunsScored?: number;
  testConditions?: TestConditionsModifiersInput;
  whiteBallModifiers?: WhiteBallModifiersInput;
  isFreeHit?: boolean;
  allocatedOvers?: number;
  bowlingFielders?: FieldingPlayerRef[];

  // Master Upgrade Extensions:
  individualBatterInstruction?: IndividualBatterInstruction;
  teamBattingGamePlan?: TeamBattingGamePlan;
  customScoringTargets?: CustomScoringTarget[];
  individualBowlingPlan?: IndividualBowlingPlan;
  bowlerSpellData?: BowlerSpellData;
  customFieldLayout?: CustomFieldLayout;
  tacticalCalibration?: TacticalCalibrationSettings;
  isUserBatting?: boolean;
  isUserBowling?: boolean;
}

// Deterministic Mulberry32 PRNG for reproducible test runs
export function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let activeRandom: () => number = Math.random;

export function setSimulationSeed(seed?: number) {
  if (seed !== undefined) {
    activeRandom = mulberry32(seed);
  } else {
    activeRandom = Math.random;
  }
}

/**
 * Checks if bowler is a spinner or pacer
 */
export function isSpinBowler(bowlingStyle?: string): boolean {
  if (!bowlingStyle) return false;
  const upper = bowlingStyle.toUpperCase();
  return (
    upper.includes('BREAK') ||
    upper.includes('SPIN') ||
    upper.includes('SLOW')
  );
}

/**
 * Generates an authentic cricket commentary line based on outcome and context
 */
export function generateBallCommentary(
  outcome: {
    runsOffBat: number;
    extras: { wides: number; noBalls: number; byes: number; legByes: number };
    isWicket: boolean;
    wicketType?: DismissalType;
    shotType?: string;
    zone?: string;
  },
  strikerName: string,
  bowlerName: string,
  format: MatchFormat
): string {
  if (outcome.extras.wides > 0) {
    return `${bowlerName} strays down the leg side, wide signaled by the umpire. Bonus run added to the total.`;
  }
  if (outcome.extras.noBalls > 0) {
    return `NO BALL! ${bowlerName} oversteps the crease. Free hit opportunity for ${strikerName}!`;
  }
  if (outcome.extras.legByes > 0) {
    return `${strikerName} is struck on the pad, the ball deflects away into the off side and they complete ${outcome.extras.legByes} leg bye.`;
  }
  if (outcome.extras.byes > 0) {
    return `Beaten by the bounce! The ball sneaks past the keeper's gloves and rolls away for ${outcome.extras.byes} bye.`;
  }

  if (outcome.isWicket) {
    switch (outcome.wicketType) {
      case 'BOWLED':
        return `BOWLED HIM! Clean through the gate! ${bowlerName} shatters the stumps with a vicious delivery to dismiss ${strikerName}!`;
      case 'CAUGHT':
        return `OUT! Edged and TAKEN! Sharp reflexes in the field as ${strikerName} falls to ${bowlerName}!`;
      case 'LBW':
        return `LOUD APPEAL AND GIVEN! Right in front of middle! ${bowlerName} traps ${strikerName} plumb in front for LBW!`;
      case 'RUN_OUT':
        return `RUN OUT! Superb direct hit from the deep! ${strikerName} is caught well short of safety!`;
      case 'STUMPED':
        return `STUMPED! ${strikerName} steps down the track, beaten in flight, and the wicketkeeper removes the bails in a flash!`;
      case 'HIT_WICKET':
        return `HIT WICKET! Disastrous for ${strikerName}! Stepped onto the stumps while playing the shot!`;
      case 'OBSTRUCTING_FIELD':
        return `OUT OBSTRUCTING THE FIELD! ${strikerName} willfully impeded the fielder's throw and is given out!`;
      default:
        return `WICKET! ${bowlerName} dismisses ${strikerName}! A critical breakthrough in the contest!`;
    }
  }

  switch (outcome.runsOffBat) {
    case 0: {
      const dotLines = [
        `${bowlerName} bowls a probing length outside off, ${strikerName} shoulders arms safely.`,
        `Beaten outside off! Beautiful seam movement from ${bowlerName}, no run.`,
        `${strikerName} defends firmly back down the track to ${bowlerName}.`,
        `Short of a length, tapped down softly towards backward point. Dot ball.`,
        `Pushed into the covers, fieldsman moves swiftly to prevent the single.`
      ];
      return dotLines[Math.floor(activeRandom() * dotLines.length)];
    }
    case 1: {
      return `${strikerName} works it into the gap at mid-wicket and scampers through for a brisk single.`;
    }
    case 2: {
      return `Nicely placed into the deep pocket at square leg, good running between the wickets earns them two runs.`;
    }
    case 3: {
      return `Superb placement through the covers, the fielder hares after it and slides near the rope to keep it to three.`;
    }
    case 4: {
      const fourLines = [
        `FOUR! Pierced the infield with surgical precision! ${strikerName} leans into a glorious cover drive to the boundary!`,
        `FOUR! Short delivery punished! ${strikerName} swivels on the back foot and pulls with authority through mid-wicket!`,
        `FOUR! Thick outside edge past the slip cordon! Races away down to third-man for a boundary!`,
        `FOUR! Up and over mid-off! Balanced and timed to absolute perfection by ${strikerName}!`
      ];
      return fourLines[Math.floor(activeRandom() * fourLines.length)];
    }
    case 6: {
      const sixLines = [
        `SIX! High, handsome and deep into the crowd! ${strikerName} deposits ${bowlerName} over long-on for maximum!`,
        `SIX! What a magnificent strike! Sweet as a nut off the sweet spot, sailing into the upper deck!`,
        `SIX! Slog sweep executed to perfection! ${strikerName} clears the boundary with effortless swagger!`
      ];
      return sixLines[Math.floor(activeRandom() * sixLines.length)];
    }
    default:
      return `${strikerName} collects ${outcome.runsOffBat} runs off ${bowlerName}.`;
  }
}

export function computeDeliveryPitchMap(
  ctx: DeliveryContext,
  isSpin: boolean,
  seedHint: number
): { line: BowlingLine; length: BowlingLength; xCm: number; yMeters: number } {
  const rand = mulberry32(seedHint + 1717);
  const line: BowlingLine = ctx.individualBowlingPlan?.line || (isSpin ? 'OUTSIDE_OFF' : 'FOURTH_STUMP');
  const length: BowlingLength =
    ctx.individualBowlingPlan?.length ||
    (ctx.bowlingTactic === 'YORKER_DEATH'
      ? 'YORKER'
      : ctx.bowlingTactic === 'BOUNCER_SHORT'
      ? 'SHORT'
      : ctx.bowlingTactic === 'ATTACKING_FULL'
      ? 'FULL'
      : 'GOOD_LENGTH');

  const acc = ctx.bowler.attributes.accuracy || 75;
  const errorMargin = (100 - acc) * 0.15;
  const lineBias = line === 'OUTSIDE_OFF' ? -22 : line === 'FOURTH_STUMP' ? -12 : line === 'LEG_STUMP' ? 14 : line === 'WIDE_OUTSIDE_OFF' ? -38 : 0;
  const xCm = Math.round((rand() - 0.5) * errorMargin * 3 + lineBias);
  const yBase = length === 'YORKER' ? 1.4 : length === 'FULL' ? 3.2 : length === 'GOOD_LENGTH' ? 5.4 : length === 'BACK_OF_A_LENGTH' ? 6.8 : 8.2;
  const yMeters = Math.round((yBase + (rand() - 0.5) * 0.8) * 10) / 10;

  return { line, length, xCm, yMeters };
}

export function computeDeliveryWagonWheel(
  zone: 'COVER' | 'POINT' | 'MID_WICKET' | 'LONG_ON' | 'LONG_OFF' | 'FINE_LEG' | 'THIRD_MAN' | 'SQUARE_LEG' | 'STRAIGHT',
  runs: number,
  seedHint: number
): { angleDegrees: number; distanceMeters: number; zone: string; isAerial: boolean } {
  const rand = mulberry32(seedHint + 9109);
  const zoneAngles: Record<string, number> = {
    STRAIGHT: 0,
    LONG_ON: 20,
    MID_WICKET: 55,
    SQUARE_LEG: 90,
    FINE_LEG: 140,
    THIRD_MAN: 220,
    POINT: 270,
    COVER: 315,
    LONG_OFF: 345,
  };
  const baseAngle = zoneAngles[zone] ?? 0;
  const jitter = Math.round((rand() - 0.5) * 22);
  const angleDegrees = (baseAngle + jitter + 360) % 360;

  const isBoundary = runs === 4 || runs === 6;
  const isSix = runs === 6;
  const distanceMeters = isSix
    ? Math.round(78 + rand() * 26)
    : runs === 4
    ? Math.round(65 + rand() * 14)
    : runs === 3
    ? Math.round(45 + rand() * 15)
    : runs === 2
    ? Math.round(28 + rand() * 18)
    : runs === 1
    ? Math.round(15 + rand() * 15)
    : Math.round(4 + rand() * 8);

  const isAerial = isSix || (isBoundary && rand() < 0.40);

  return { angleDegrees, distanceMeters, zone, isAerial };
}

/**
 * Builds official cricket scorecard wicket details with exact fielder/wicketkeeper attribution
 * using a dedicated deterministic PRNG so activeRandom() sequence is never perturbed.
 */
function buildWicketDetails(
  dismissalType: DismissalType,
  bowler: Player,
  isSpin: boolean,
  fielders: FieldingPlayerRef[] | undefined,
  seedHint: number,
  dismissedPlayerId?: string
): NonNullable<BallOutcome['wicketDetails']> {
  const fRand = mulberry32(seedHint + 7919);
  const wk = fielders?.find((f) => f.isWicketKeeper);
  const nonKeeperFielders = (fielders || []).filter(
    (f) => f.id !== bowler.id && (!wk || f.id !== wk.id)
  );

  switch (dismissalType) {
    case 'BOWLED':
      return {
        type: 'BOWLED',
        dismissedPlayerId,
        bowlerId: bowler.id,
        bowlerName: bowler.shortName,
        description: `b ${bowler.shortName}`,
      };
    case 'LBW':
      return {
        type: 'LBW',
        dismissedPlayerId,
        bowlerId: bowler.id,
        bowlerName: bowler.shortName,
        description: `lbw b ${bowler.shortName}`,
      };
    case 'HIT_WICKET':
      return {
        type: 'HIT_WICKET',
        dismissedPlayerId,
        bowlerId: bowler.id,
        bowlerName: bowler.shortName,
        description: `hit wicket b ${bowler.shortName}`,
      };
    case 'OBSTRUCTING_FIELD':
      return {
        type: 'OBSTRUCTING_FIELD',
        dismissedPlayerId,
        description: 'obstructing the field',
      };
    case 'STUMPED': {
      const keeper = wk || (fielders && fielders[0]);
      return {
        type: 'STUMPED',
        dismissedPlayerId,
        bowlerId: bowler.id,
        bowlerName: bowler.shortName,
        fielderId: keeper?.id,
        fielderName: keeper?.shortName,
        description: keeper
          ? `st †${keeper.shortName} b ${bowler.shortName}`
          : `st b ${bowler.shortName}`,
      };
    }
    case 'CAUGHT': {
      const r = fRand();
      // ~6% Caught & Bowled
      if (r < 0.06) {
        return {
          type: 'CAUGHT',
          dismissedPlayerId,
          bowlerId: bowler.id,
          bowlerName: bowler.shortName,
          fielderId: bowler.id,
          fielderName: bowler.shortName,
          description: `c & b ${bowler.shortName}`,
        };
      }
      // Wicketkeeper edge (~32% off pace, ~20% off spin)
      const keeperCatchProb = isSpin ? 0.26 : 0.38;
      if (wk && r < keeperCatchProb) {
        return {
          type: 'CAUGHT',
          dismissedPlayerId,
          bowlerId: bowler.id,
          bowlerName: bowler.shortName,
          fielderId: wk.id,
          fielderName: wk.shortName,
          description: `c †${wk.shortName} b ${bowler.shortName}`,
        };
      }
      if (nonKeeperFielders.length > 0) {
        const chosen = nonKeeperFielders[Math.floor(fRand() * nonKeeperFielders.length)];
        return {
          type: 'CAUGHT',
          dismissedPlayerId,
          bowlerId: bowler.id,
          bowlerName: bowler.shortName,
          fielderId: chosen.id,
          fielderName: chosen.shortName,
          description: `c ${chosen.shortName} b ${bowler.shortName}`,
        };
      }
      return {
        type: 'CAUGHT',
        dismissedPlayerId,
        bowlerId: bowler.id,
        bowlerName: bowler.shortName,
        description: `c b ${bowler.shortName}`,
      };
    }
    case 'RUN_OUT': {
      const pool = nonKeeperFielders.length > 0 ? nonKeeperFielders : fielders || [];
      if (pool.length > 0) {
        const chosen = pool[Math.floor(fRand() * pool.length)];
        return {
          type: 'RUN_OUT',
          dismissedPlayerId,
          fielderId: chosen.id,
          fielderName: chosen.shortName,
          description: `run out (${chosen.shortName})`,
        };
      }
      return {
        type: 'RUN_OUT',
        dismissedPlayerId,
        description: 'run out',
      };
    }
    default:
      return {
        type: dismissalType,
        dismissedPlayerId,
        bowlerId: bowler.id,
        bowlerName: bowler.shortName,
        description: `b ${bowler.shortName}`,
      };
  }
}

/**
 * Simulates an individual ball based on batter skills, bowler skills, pitch, weather, match situation and tactics
 */
export function simulateDelivery(ctx: DeliveryContext): BallOutcome {
  if (ctx.seed !== undefined) {
    setSimulationSeed(ctx.seed);
  }

  const {
    format,
    striker,
    bowler,
    pitch,
    weather,
    overNumber,
    ballInOver,
    currentScore,
    wicketsLost,
    targetRuns,
    battingAggression,
    bowlingTactic,
    fieldPreset,
    dayNumber = 1,
  } = ctx;

  const isSpin = isSpinBowler(bowler.bowlingStyle);
  const seedHint = ctx.seed ?? overNumber * 13 + ballInOver * 7 + currentScore;

  // 1. Dynamic Pitch Deterioration, Ball Age & Weather for 5-Day Test Cricket
  let dynamicSpinBonus = pitch.spinBonus;
  let dynamicPaceBonus = pitch.paceBonus;
  let dynamicSwingBonus = weather.swingBonus;
  let dynamicBounceVariation = pitch.bounceVariation;

  if (format === 'TEST') {
    if (ctx.testConditions) {
      dynamicPaceBonus = ctx.testConditions.effectivePaceBonus;
      dynamicSpinBonus = ctx.testConditions.effectiveSpinBonus;
      dynamicSwingBonus = ctx.testConditions.effectiveSwingBonus;
      dynamicBounceVariation = ctx.testConditions.effectiveBounceVariation;
    } else {
      const wearFallback = (dayNumber - 1) * 16 * (pitch.wearFactor || 1.0);
      dynamicSpinBonus += (wearFallback / 100) * 18;
      dynamicBounceVariation += (wearFallback / 100) * 10;
      dynamicPaceBonus *= dayNumber >= 4 ? 0.72 : dayNumber === 3 ? 0.88 : 1.0;
      const isNewBallFallback = overNumber < 12 || (overNumber % 80 < 12 && overNumber >= 80);
      if (isNewBallFallback && !isSpin) {
        dynamicPaceBonus += 4;
      }
    }
  } else if (ctx.whiteBallModifiers) {
    dynamicPaceBonus = ctx.whiteBallModifiers.effectivePaceBonus;
    dynamicSpinBonus = ctx.whiteBallModifiers.effectiveSpinBonus;
    dynamicSwingBonus = ctx.whiteBallModifiers.effectiveSwingBonus;
  }

  // 3. Powerplay & Fielding Restrictions Influence
  const ppInfo = getPowerplayPhase(format, overNumber, ctx.allocatedOvers);
  const isMandatoryPP = ppInfo.phase === 'MANDATORY_PP1';
  const totalAllocOvers = ctx.allocatedOvers ?? (format === 'T20I' ? 20 : 50);
  const isWhiteBallDeath =
    format !== 'TEST' &&
    (ppInfo.phase === 'DEATH_PP3' ||
      (format === 'T20I' && overNumber >= Math.floor(totalAllocOvers * 0.75)));

  let powerplayBoundaryBonus = isMandatoryPP ? 1.30 : 1.0;
  let powerplayDotReduction = isMandatoryPP ? 0.85 : 1.0;
  let powerplaySingleTwoMod = 1.0;
  let powerplayWicketMod = 1.0;

  if (format !== 'TEST') {
    if (ppInfo.phase === 'MANDATORY_PP1') {
      // Max 2 outside 30-yard circle: high boundary reward over the infield, slight edge/loft risk
      powerplayBoundaryBonus = format === 'T20I' ? 1.24 : 1.22;
      powerplayDotReduction = 0.86;
      powerplaySingleTwoMod = 0.94;
      powerplayWicketMod = 1.05;
    } else if (ppInfo.phase === 'INTERMEDIATE_PP2') {
      // ODI Overs 11-40 (Max 4 outside): gaps in deep encourage strike rotation & partnership building
      powerplayBoundaryBonus = 0.94;
      powerplayDotReduction = 0.95;
      powerplaySingleTwoMod = 1.08;
      powerplayWicketMod = 0.94;
    } else if (isWhiteBallDeath) {
      // Death overs (Max 5 outside): boundary riders cut off some 4s, aerial hitting boosts 6s & wickets
      powerplayBoundaryBonus = 1.04;
      powerplayDotReduction = 0.90;
      powerplaySingleTwoMod = 1.04;
      powerplayWicketMod = 1.12;
    } else {
      // T20I Middle Overs 7-15 (Max 5 outside)
      powerplayBoundaryBonus = 0.95;
      powerplayDotReduction = 0.96;
      powerplaySingleTwoMod = 1.06;
      powerplayWicketMod = 0.97;
    }
  }

  // Enforce Powerplay circle fielding restriction on effectiveFieldPreset
  let effectiveFieldPreset = fieldPreset;
  if (format !== 'TEST') {
    if (
      ppInfo.phase === 'MANDATORY_PP1' &&
      (effectiveFieldPreset === 'DEFENSIVE_BOUNDARY' || effectiveFieldPreset === 'DEATH_PROTECT')
    ) {
      effectiveFieldPreset = 'RING_INNER';
    } else if (ppInfo.phase === 'INTERMEDIATE_PP2' && effectiveFieldPreset === 'DEATH_PROTECT') {
      effectiveFieldPreset = 'BALANCED_STANDARD';
    }
  }

  // 4. Calculate Batter Rating vs Bowler Rating for current matchup
  const batterMatchupSkill = isSpin
    ? (striker.attributes.againstSpin * 0.55 + striker.attributes.technique * 0.35 + striker.attributes.defense * 0.10)
    : (striker.attributes.againstPace * 0.55 + striker.attributes.technique * 0.35 + striker.attributes.defense * 0.10);

  const bowlerSkill = isSpin
    ? (bowler.attributes.spin * 0.40 + bowler.attributes.variation * 0.30 + bowler.attributes.accuracy * 0.30)
    : (bowler.attributes.pace * 0.35 + bowler.attributes.swing * 0.35 + bowler.attributes.accuracy * 0.30);

  // Form, Fitness & Fatigue factors
  const strikerEffectiveFitness = striker.fitness ?? striker.attributes.fitness ?? 90;
  const bowlerEffectiveFitness = bowler.fitness ?? bowler.attributes.fitness ?? 90;
  const batterFormMod =
    ((striker.attributes.currentForm || 85) - 50) / 100 +
    ((strikerEffectiveFitness - 80) / 250);
  const bowlerFormMod =
    ((bowler.attributes.currentForm || 85) - 50) / 100 +
    ((bowlerEffectiveFitness - 80) / 250);
  const bowlerFatiguePenalty = Math.max(0, ((bowler.workloadFatigue || 15) - 60) * 0.005); // Fatigue impairs accuracy

  // Pitch & Weather assistance
  let pitchBowlerBoost = 0;
  if (format === 'TEST') {
    if (isSpin) {
      pitchBowlerBoost = dynamicSpinBonus * 0.135;
    } else {
      pitchBowlerBoost = (dynamicPaceBonus + dynamicSwingBonus) * 0.125;
    }
  } else {
    if (isSpin) {
      pitchBowlerBoost = dynamicSpinBonus * 0.15;
    } else {
      pitchBowlerBoost = (dynamicPaceBonus + dynamicSwingBonus) * 0.14;
    }
  }

  // 5. Situational Batting Intent, Custom Targets & Individual Instructions
  let effectiveAggression = battingAggression;

  // 5.1 Apply Individual Batter Instruction if present for the striker
  const batterInstruction = ctx.individualBatterInstruction;
  if (batterInstruction) {
    switch (batterInstruction.approach) {
      case 'VERY_DEFENSIVE':
        effectiveAggression = 'BLOCK';
        break;
      case 'DEFENSIVE':
        effectiveAggression = 'DEFENSIVE';
        break;
      case 'BALANCED':
        effectiveAggression = 'BALANCED';
        break;
      case 'POSITIVE':
        effectiveAggression = 'BALANCED';
        break;
      case 'AGGRESSIVE':
        effectiveAggression = 'ATTACKING';
        break;
      case 'SMASH':
        effectiveAggression = 'SMASH';
        break;
    }

    // Bowler-specific instruction against the active bowler
    if (batterInstruction.bowlerInstruction?.targetBowlerId === bowler.id) {
      switch (batterInstruction.bowlerInstruction.action) {
        case 'ATTACK':
          effectiveAggression = effectiveAggression === 'BLOCK' || effectiveAggression === 'DEFENSIVE' ? 'BALANCED' : 'ATTACKING';
          break;
        case 'DEFEND':
          effectiveAggression = effectiveAggression === 'SMASH' || effectiveAggression === 'ATTACKING' ? 'BALANCED' : 'DEFENSIVE';
          break;
        case 'ROTATE_STRIKE':
          // handled in singles/twos boost below
          break;
        case 'TARGET_WEAKNESS':
          effectiveAggression = effectiveAggression === 'BLOCK' ? 'BALANCED' : 'ATTACKING';
          break;
      }
    }
  }

  // Dynamic Situational Adaptation:
  // If chasing in white ball and Required Run Rate is very high, shift aggression upwards
  if (targetRuns && format !== 'TEST') {
    const runsNeeded = targetRuns - currentScore;
    const maxBalls = totalAllocOvers * 6;
    const ballsRemaining = Math.max(1, maxBalls - (overNumber * 6 + ballInOver));
    const rrr = (runsNeeded / ballsRemaining) * 6;

    if (rrr > 11.5 && wicketsLost < 8) {
      effectiveAggression = 'SMASH';
    } else if (rrr > 9.2 && effectiveAggression === 'BALANCED') {
      effectiveAggression = 'ATTACKING';
    }
  }

  // Tactical modifiers
  let aggressionRunFactor = 1.0;
  let aggressionWicketRisk = 1.0;
  switch (effectiveAggression) {
    case 'BLOCK':
      aggressionRunFactor = 0.20;
      aggressionWicketRisk = 0.30;
      break;
    case 'DEFENSIVE':
      aggressionRunFactor = 0.55;
      aggressionWicketRisk = 0.60;
      break;
    case 'BALANCED':
      aggressionRunFactor = batterInstruction?.approach === 'POSITIVE' ? 1.12 : 1.0;
      aggressionWicketRisk = 1.0;
      break;
    case 'ATTACKING':
      aggressionRunFactor = format === 'TEST' ? 1.45 : 1.24;
      aggressionWicketRisk = format === 'TEST' ? 1.55 : 1.25;
      break;
    case 'SMASH':
      aggressionRunFactor = format === 'TEST' ? 1.95 : 1.58;
      aggressionWicketRisk = format === 'TEST' ? 2.45 : 1.45;
      break;
  }

  // 5.2 Dynamic Scoring Target Influences (Ahead, On Track, Behind Plan)
  if (ctx.customScoringTargets && ctx.customScoringTargets.length > 0) {
    const targetEval = evaluateScoringTargetProgress(
      currentScore,
      overNumber,
      ballInOver,
      wicketsLost,
      ctx.customScoringTargets,
      format,
      ctx.allocatedOvers
    );
    aggressionRunFactor *= targetEval.intentAdjustmentRunFactor;
    aggressionWicketRisk *= targetEval.intentAdjustmentWicketRisk;
  }

  // 5.3 Situational Batter Instructions
  if (batterInstruction?.situationalInstruction) {
    switch (batterInstruction.situationalInstruction) {
      case 'PROTECT_WICKET':
      case 'PRESERVE_WICKETS':
        aggressionRunFactor *= 0.78;
        aggressionWicketRisk *= 0.62;
        break;
      case 'SURVIVE_SESSION':
        aggressionRunFactor *= 0.45;
        aggressionWicketRisk *= 0.40;
        break;
      case 'ACCELERATE':
      case 'ATTACK_POWERPLAY':
      case 'TARGET_DEATH':
        aggressionRunFactor *= 1.22;
        aggressionWicketRisk *= 1.18;
        break;
      case 'BUILD_PARTNERSHIP':
        aggressionRunFactor *= 0.92;
        aggressionWicketRisk *= 0.78;
        break;
    }
  }

  // 5.4 High-Risk Attacking Action Calibration (40/60 Test, 60/40 White-Ball Baseline)
  const highRiskOutcome = calculateHighRiskActionProbabilities({
    format,
    batter: striker,
    bowler,
    approach: effectiveAggression,
    shotSelection: batterInstruction?.shotSelection,
    pitch,
    isSpin,
    fieldPreset: effectiveFieldPreset,
    calibration: ctx.tacticalCalibration,
    seedHint,
  });

  if (highRiskOutcome.isAttempted) {
    if (highRiskOutcome.isSuccessful) {
      aggressionRunFactor *= highRiskOutcome.scoringIntentBonus;
      aggressionWicketRisk *= 0.95;
    } else {
      aggressionWicketRisk *= format === 'TEST' ? highRiskOutcome.riskMultiplier : 1.12;
    }
  }

  // 5.5 Shot Selection Adjustments
  if (batterInstruction?.shotSelection) {
    switch (batterInstruction.shotSelection) {
      case 'AVOID_RISKY_SHOTS':
        aggressionRunFactor *= 0.82;
        aggressionWicketRisk *= 0.68;
        break;
      case 'LOOK_FOR_BOUNDARIES':
        aggressionRunFactor *= 1.15;
        aggressionWicketRisk *= 1.14;
        break;
      case 'ROTATE_STRIKE':
        aggressionRunFactor *= 1.05;
        aggressionWicketRisk *= 0.85;
        break;
      case 'ATTACK_SPIN':
        if (isSpin) {
          aggressionRunFactor *= 1.20;
          aggressionWicketRisk *= 1.12;
        }
        break;
      case 'ATTACK_PACE':
        if (!isSpin) {
          aggressionRunFactor *= 1.18;
          aggressionWicketRisk *= 1.12;
        }
        break;
      case 'ALONG_GROUND':
        aggressionRunFactor *= 0.88;
        aggressionWicketRisk *= 0.75;
        break;
    }
  }

  // 5.6 Individual Bowling Plans & Bowler Fatigue Influences
  const bowlingPlan = ctx.individualBowlingPlan;
  if (bowlingPlan) {
    switch (bowlingPlan.intention) {
      case 'ATTACK_WICKETS':
        aggressionWicketRisk *= 1.16;
        aggressionRunFactor *= 1.05;
        break;
      case 'BUILD_PRESSURE':
      case 'OUTSIDE_OFF_CONTAINMENT':
        aggressionWicketRisk *= 0.95;
        aggressionRunFactor *= 0.88;
        break;
      case 'RESTRICT_BOUNDARIES':
      case 'DEFEND_RUNS':
        aggressionRunFactor *= 0.85;
        aggressionWicketRisk *= 0.90;
        break;
      case 'FORCE_MISTAKES':
        aggressionWicketRisk *= 1.12;
        break;
    }
  }

  if (ctx.bowlerSpellData) {
    if (ctx.bowlerSpellData.fatigue === 'HIGH') {
      aggressionRunFactor *= 1.10;
    } else if (ctx.bowlerSpellData.fatigue === 'EXHAUSTED') {
      aggressionRunFactor *= 1.25;
      aggressionWicketRisk *= 0.85;
    }
  }

  if (format !== 'TEST' && ctx.isFreeHit) {
    // Free Hit: batter swings freely with zero bowled/caught/LBW/stumped risk!
    aggressionRunFactor = Math.max(aggressionRunFactor * 1.28, 1.62);
  }

  // Format baseline pacing
  let formatPaceBonus = 1.0;
  if (format === 'T20I') formatPaceBonus = 1.12;
  else if (format === 'ODI') formatPaceBonus = 1.12;
  else if (format === 'TEST') formatPaceBonus = 0.65;

  // 6. Extras Generation (Wides, No-Balls)
  const wideProb = Math.max(0.010, (100 - bowler.attributes.accuracy) / 2200 + bowlerFatiguePenalty);
  const noBallProb = Math.max(0.004, (100 - bowler.attributes.control) / 3600);

  const rollExtra = activeRandom();

  // WIDE
  if (rollExtra < wideProb) {
    // Check if keeper executes a stumping or batter is run out on a wide (respecting Free Hit laws!)
    const rollWideWicket = activeRandom();
    const canBeStumped =
      isSpin &&
      isDismissalLegalForDelivery('STUMPED', false, true, !!ctx.isFreeHit) &&
      rollWideWicket < 0.035;
    const canBeRunOut =
      isDismissalLegalForDelivery('RUN_OUT', false, true, !!ctx.isFreeHit) &&
      rollWideWicket < 0.015;

    if (canBeStumped || canBeRunOut) {
      const dismissalType: DismissalType = canBeStumped ? 'STUMPED' : 'RUN_OUT';
      const comm = generateBallCommentary(
        { runsOffBat: 0, extras: { wides: 1, noBalls: 0, byes: 0, legByes: 0 }, isWicket: true, wicketType: dismissalType },
        striker.shortName,
        bowler.shortName,
        format
      );

      return {
        overNumber,
        ballInOver: ballInOver,
        runsOffBat: 0,
        extras: { wides: 1, noBalls: 0, byes: 0, legByes: 0 },
        totalRuns: 1,
        isLegalDelivery: false,
        isWicket: true,
        wicketDetails: buildWicketDetails(dismissalType, bowler, isSpin, ctx.bowlingFielders, seedHint),
        strikerId: striker.id,
        strikerName: striker.shortName,
        nonStrikerId: ctx.nonStriker.id,
        nonStrikerName: ctx.nonStriker.shortName,
        bowlerId: bowler.id,
        bowlerName: bowler.shortName,
        commentary: comm,
      };
    }

    const freeHitRepeatNote =
      format !== 'TEST' && ctx.isFreeHit ? ' Free Hit continues onto the next delivery!' : '';

    return {
      overNumber,
      ballInOver: ballInOver,
      runsOffBat: 0,
      extras: { wides: 1, noBalls: 0, byes: 0, legByes: 0 },
      totalRuns: 1,
      isLegalDelivery: false,
      isWicket: false,
      strikerId: striker.id,
      strikerName: striker.shortName,
      nonStrikerId: ctx.nonStriker.id,
      nonStrikerName: ctx.nonStriker.shortName,
      bowlerId: bowler.id,
      bowlerName: bowler.shortName,
      commentary:
        generateBallCommentary(
          { runsOffBat: 0, extras: { wides: 1, noBalls: 0, byes: 0, legByes: 0 }, isWicket: false },
          striker.shortName,
          bowler.shortName,
          format
        ) + freeHitRepeatNote,
    };
  }

  // NO-BALL
  if (rollExtra < wideProb + noBallProb) {
    // Only RUN_OUT is legally permissible on a no-ball
    const rollNbRunOut = activeRandom() < 0.02;
    if (rollNbRunOut) {
      const comm = `NO BALL and RUN OUT! A chaotic mix-up between batters on the illegal delivery!`;
      return {
        overNumber,
        ballInOver: ballInOver,
        runsOffBat: 0,
        extras: { wides: 0, noBalls: 1, byes: 0, legByes: 0 },
        totalRuns: 1,
        isLegalDelivery: false,
        isWicket: true,
        wicketDetails: buildWicketDetails('RUN_OUT', bowler, isSpin, ctx.bowlingFielders, seedHint),
        strikerId: striker.id,
        strikerName: striker.shortName,
        nonStrikerId: ctx.nonStriker.id,
        nonStrikerName: ctx.nonStriker.shortName,
        bowlerId: bowler.id,
        bowlerName: bowler.shortName,
        commentary: comm,
      };
    }

    // In ODI & T20I, batters can also score runs off the bat on an overstepped No-Ball!
    if (format !== 'TEST') {
      const nbRand = mulberry32(seedHint + 5101)();
      let nbBatRuns = 0;
      if (nbRand > 0.90) nbBatRuns = 6;
      else if (nbRand > 0.74) nbBatRuns = 4;
      else if (nbRand > 0.48) nbBatRuns = 1;

      const nbComm =
        nbBatRuns === 6
          ? `NO BALL AND SIX! ${bowler.shortName} oversteps and ${striker.shortName} launches it into the stands! Free Hit coming up!`
          : nbBatRuns === 4
          ? `NO BALL AND FOUR! ${bowler.shortName} oversteps the line and ${striker.shortName} punishes it to the fence! Free Hit next ball!`
          : nbBatRuns === 1
          ? `NO BALL! ${bowler.shortName} oversteps; ${striker.shortName} works a single and keeps a Free Hit for the next ball!`
          : generateBallCommentary(
              { runsOffBat: 0, extras: { wides: 0, noBalls: 1, byes: 0, legByes: 0 }, isWicket: false },
              striker.shortName,
              bowler.shortName,
              format
            );

      return {
        overNumber,
        ballInOver: ballInOver,
        runsOffBat: nbBatRuns,
        extras: { wides: 0, noBalls: 1, byes: 0, legByes: 0 },
        totalRuns: 1 + nbBatRuns,
        isLegalDelivery: false,
        isWicket: false,
        strikerId: striker.id,
        strikerName: striker.shortName,
        nonStrikerId: ctx.nonStriker.id,
        nonStrikerName: ctx.nonStriker.shortName,
        bowlerId: bowler.id,
        bowlerName: bowler.shortName,
        commentary: nbComm,
      };
    }

    return {
      overNumber,
      ballInOver: ballInOver,
      runsOffBat: 0,
      extras: { wides: 0, noBalls: 1, byes: 0, legByes: 0 },
      totalRuns: 1,
      isLegalDelivery: false,
      isWicket: false,
      strikerId: striker.id,
      strikerName: striker.shortName,
      nonStrikerId: ctx.nonStriker.id,
      nonStrikerName: ctx.nonStriker.shortName,
      bowlerId: bowler.id,
      bowlerName: bowler.shortName,
      commentary: generateBallCommentary({ runsOffBat: 0, extras: { wides: 0, noBalls: 1, byes: 0, legByes: 0 }, isWicket: false }, striker.shortName, bowler.shortName, format),
    };
  }

  // 7. Wicket Calculation
  const isTailender = striker.role === 'BOWLER';
  const ballsFaced = ctx.strikerBallsFaced || 0;

  // Realistic Settled Batter Mechanic (Cricket Management 2026 Engine):
  // When a batter gets their eye in, early vulnerability reduces, but concentration lapses remain
  let settledDiscount = 1.0;
  if (ballsFaced >= 50) {
    settledDiscount = 0.72; // Set batter, well adjusted to conditions
  } else if (ballsFaced >= 20) {
    settledDiscount = 0.84; // Getting settled
  } else if (ballsFaced < 8) {
    settledDiscount = 1.18; // Early ball vulnerability before eye is in
  }

  // Base wicket probability per delivery
  // Calibrated so Test matches realistically average 85-115 overs and 280-420 runs per innings
  let baseWicketProb = 0.018;
  if (format === 'TEST') {
    baseWicketProb = isTailender ? 0.036 : 0.0145;
  } else if (format === 'ODI') {
    baseWicketProb = isTailender ? 0.038 : 0.0175;
  } else if (format === 'T20I') {
    baseWicketProb = isTailender ? 0.040 : 0.022;
  }

  // Skill disparity: +bowlerSkill -batterMatchupSkill
  // High defensive and temperament attributes protect top batters against dismissals
  const defenseProtection = (striker.attributes.defense * 0.40 + striker.attributes.temperament * 0.35 + striker.attributes.shotSelection * 0.25) / 100;
  const skillDelta = (bowlerSkill + pitchBowlerBoost * 25 - batterMatchupSkill) / 220;
  let finalWicketProb = baseWicketProb * (1 + skillDelta + bowlerFormMod - batterFormMod) * aggressionWicketRisk * settledDiscount;

  if (format === 'TEST') {
    if (!isTailender) {
      finalWicketProb *= Math.max(0.70, 1.15 - defenseProtection * 0.40);
    }
    if (ctx.testConditions) {
      finalWicketProb *=
        ctx.testConditions.unevenBounceWicketFactor * ctx.testConditions.badLightBattingPenalty;
      if (!isSpin) {
        finalWicketProb *= ctx.testConditions.newBallFactor;
      }
    } else {
      if (dayNumber === 4) finalWicketProb *= 1.18;
      if (dayNumber === 5) finalWicketProb *= 1.35;
    }

    // Test bowling tactic influence
    if (bowlingTactic === 'ATTACKING_FULL' || bowlingTactic === 'FLIGHT_SPIN') {
      finalWicketProb *= 1.07;
      aggressionRunFactor *= 1.05;
    } else if (bowlingTactic === 'BOUNCER_SHORT') {
      finalWicketProb *= isTailender ? 1.16 : 1.02;
      aggressionRunFactor *= 0.94;
    } else if (bowlingTactic === 'TIGHT_DEFENSIVE') {
      finalWicketProb *= 0.88;
      aggressionRunFactor *= 0.86;
    }
  } else {
    // ODI & T20I Powerplay, Match Conditions & Bowling Tactics Influence
    finalWicketProb *= powerplayWicketMod;
    if (ctx.whiteBallModifiers) {
      finalWicketProb *= ctx.whiteBallModifiers.dewGripPenalty;
      if (!isSpin) {
        finalWicketProb *= ctx.whiteBallModifiers.newBallWicketBoost;
      }
      aggressionRunFactor *= ctx.whiteBallModifiers.dewBattingBoost;
    }

    if (bowlingTactic === 'YORKER_DEATH') {
      const deathSkill = bowler.attributes.deathBowling / 100;
      finalWicketProb *= 1.02 + deathSkill * 0.14;
      aggressionRunFactor *= Math.max(0.84, 1.05 - deathSkill * 0.19);
    } else if (bowlingTactic === 'ATTACKING_FULL' || bowlingTactic === 'FLIGHT_SPIN') {
      finalWicketProb *= 1.09;
      aggressionRunFactor *= 1.05;
    } else if (bowlingTactic === 'BOUNCER_SHORT') {
      finalWicketProb *= isTailender ? 1.16 : 1.03;
      aggressionRunFactor *= 0.94;
    } else if (bowlingTactic === 'TIGHT_DEFENSIVE') {
      finalWicketProb *= 0.88;
      aggressionRunFactor *= 0.87;
    }
  }

  // Field preset impact on wicket taking
  if (effectiveFieldPreset === 'ATTACKING_SLIPS') finalWicketProb *= format === 'TEST' ? 1.16 : 1.18;
  if (effectiveFieldPreset === 'DEFENSIVE_BOUNDARY') finalWicketProb *= 0.82;
  if (effectiveFieldPreset === 'DEATH_PROTECT' && format !== 'TEST') finalWicketProb *= 0.94;

  // User Team Managerial & Home Composure Balance (especially in Test matches)
  if (ctx.isUserBatting) {
    if (format === 'TEST') {
      finalWicketProb *= 0.78;
      aggressionRunFactor *= 1.09;
    } else {
      finalWicketProb *= 0.88;
      aggressionRunFactor *= 1.05;
    }
  } else if (ctx.isUserBowling) {
    if (format === 'TEST') {
      finalWicketProb *= 1.16;
      aggressionRunFactor *= 0.91;
    } else {
      finalWicketProb *= 1.10;
      aggressionRunFactor *= 0.94;
    }
  }

  const rollWicket = activeRandom();
  if (rollWicket < Math.min(0.20, Math.max(format === 'TEST' ? 0.0025 : 0.003, finalWicketProb))) {
    // Free Hit protection in ODI & T20I: only RUN_OUT is legally out; caught/bowled/LBW/stumped do not count!
    if (format !== 'TEST' && ctx.isFreeHit) {
      const fhRoll = activeRandom();
      if (fhRoll < 0.07) {
        const nonStrikerOut = mulberry32(seedHint + 6311)() < 0.35;
        const outId = nonStrikerOut ? ctx.nonStriker.id : striker.id;
        const outName = nonStrikerOut ? ctx.nonStriker.shortName : striker.shortName;
        return {
          overNumber,
          ballInOver: ballInOver + 1,
          runsOffBat: 0,
          extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
          totalRuns: 0,
          isLegalDelivery: true,
          isWicket: true,
          wicketDetails: buildWicketDetails('RUN_OUT', bowler, isSpin, ctx.bowlingFielders, seedHint, outId),
          strikerId: striker.id,
          strikerName: striker.shortName,
          nonStrikerId: ctx.nonStriker.id,
          nonStrikerName: ctx.nonStriker.shortName,
          bowlerId: bowler.id,
          bowlerName: bowler.shortName,
          commentary: `FREE HIT RUN OUT! ${outName} attempts a desperate second run on the Free Hit and is caught short of the crease!`,
        };
      }
      // Batter survives because it's a Free Hit!
      const fhRuns = fhRoll < 0.55 ? 1 : fhRoll < 0.80 ? 2 : 0;
      return {
        overNumber,
        ballInOver: ballInOver + 1,
        runsOffBat: fhRuns,
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
        totalRuns: fhRuns,
        isLegalDelivery: true,
        isWicket: false,
        strikerId: striker.id,
        strikerName: striker.shortName,
        nonStrikerId: ctx.nonStriker.id,
        nonStrikerName: ctx.nonStriker.shortName,
        bowlerId: bowler.id,
        bowlerName: bowler.shortName,
        commentary:
          fhRuns > 0
            ? `FREE HIT! ${striker.shortName} skies it into the deep — caught on the bounce/doesn't count on the Free Hit! They scamper ${fhRuns} run${fhRuns > 1 ? 's' : ''}.`
            : `FREE HIT! ${bowler.shortName} beats the big swing from ${striker.shortName} — dot ball on the Free Hit!`,
      };
    }

    // Choose realistic dismissal type
    let dismissalType: DismissalType = 'CAUGHT';
    const rollDismissal = activeRandom();
    if (format === 'TEST') {
      if (isSpin) {
        if (rollDismissal < 0.43) dismissalType = 'CAUGHT';
        else if (rollDismissal < 0.69) dismissalType = 'LBW';
        else if (rollDismissal < 0.86) dismissalType = 'BOWLED';
        else if (rollDismissal < 0.965) dismissalType = 'STUMPED';
        else if (rollDismissal < 0.992) dismissalType = 'RUN_OUT';
        else dismissalType = 'HIT_WICKET';
      } else {
        if (rollDismissal < 0.56) dismissalType = 'CAUGHT';
        else if (rollDismissal < 0.77) dismissalType = 'BOWLED';
        else if (rollDismissal < 0.955) dismissalType = 'LBW';
        else if (rollDismissal < 0.992) dismissalType = 'RUN_OUT';
        else dismissalType = 'HIT_WICKET';
      }
    } else if (isSpin) {
      if (rollDismissal < 0.46) dismissalType = 'CAUGHT';
      else if (rollDismissal < 0.68) dismissalType = 'LBW';
      else if (rollDismissal < 0.85) dismissalType = 'BOWLED';
      else if (rollDismissal < 0.955) dismissalType = 'STUMPED';
      else if (rollDismissal < 0.993) dismissalType = 'RUN_OUT';
      else dismissalType = 'HIT_WICKET';
    } else {
      if (rollDismissal < 0.56) dismissalType = 'CAUGHT';
      else if (rollDismissal < 0.77) dismissalType = 'BOWLED';
      else if (rollDismissal < 0.925) dismissalType = 'LBW';
      else if (rollDismissal < 0.993) dismissalType = 'RUN_OUT';
      else dismissalType = 'HIT_WICKET';
    }

    // In ODI/T20I, ~28% of run-outs dismiss the non-striker backing up or sent back
    const isNonStrikerRunOut =
      format !== 'TEST' &&
      dismissalType === 'RUN_OUT' &&
      mulberry32(seedHint + 8831)() < 0.28;
    const dismissedId = isNonStrikerRunOut ? ctx.nonStriker.id : striker.id;
    const dismissedName = isNonStrikerRunOut ? ctx.nonStriker.shortName : striker.shortName;

    const comm = generateBallCommentary(
      { runsOffBat: 0, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 }, isWicket: true, wicketType: dismissalType },
      dismissedName,
      bowler.shortName,
      format
    );

    return {
      overNumber,
      ballInOver: ballInOver + 1,
      runsOffBat: 0,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
      totalRuns: 0,
      isLegalDelivery: true,
      isWicket: true,
      wicketDetails: buildWicketDetails(
        dismissalType,
        bowler,
        isSpin,
        ctx.bowlingFielders,
        seedHint,
        dismissedId
      ),
      strikerId: striker.id,
      strikerName: striker.shortName,
      nonStrikerId: ctx.nonStriker.id,
      nonStrikerName: ctx.nonStriker.shortName,
      bowlerId: bowler.id,
      bowlerName: bowler.shortName,
      commentary: comm,
      pitchMap: computeDeliveryPitchMap(ctx, isSpin, seedHint),
    };
  }

  // 8. Byes and Leg-Byes on Legal Delivery (~1.5% - 2.5% frequency)
  const byeThreshold =
    format === 'TEST' && dynamicBounceVariation >= 16 ? 0.022 : 0.018;
  const rollBye = activeRandom();
  if (rollBye < byeThreshold) {
    const isLegBye = activeRandom() > 0.35;
    const byeRuns = activeRandom() < 0.85 ? 1 : 2;
    const comm = isLegBye
      ? `${striker.shortName} plays and misses, clips the pad, and they scamper through for ${byeRuns} leg-bye.`
      : `Beaten by movement! The ball skips past the wicketkeeper allowing ${byeRuns} bye.`;

    return {
      overNumber,
      ballInOver: ballInOver + 1,
      runsOffBat: 0,
      extras: {
        wides: 0,
        noBalls: 0,
        byes: isLegBye ? 0 : byeRuns,
        legByes: isLegBye ? byeRuns : 0,
      },
      totalRuns: byeRuns,
      isLegalDelivery: true,
      isWicket: false,
      strikerId: striker.id,
      strikerName: striker.shortName,
      nonStrikerId: ctx.nonStriker.id,
      nonStrikerName: ctx.nonStriker.shortName,
      bowlerId: bowler.id,
      bowlerName: bowler.shortName,
      commentary: comm,
      pitchMap: computeDeliveryPitchMap(ctx, isSpin, seedHint),
    };
  }

  // 9. Run Scoring Probabilities
  const powerFactor = (striker.attributes.powerHitting / 100) * (striker.attributes.timing / 100);
  const boundaryMultiplier = powerFactor * aggressionRunFactor * formatPaceBonus * powerplayBoundaryBonus;

  let probSix = 0.02 * boundaryMultiplier;
  let probFour = 0.075 * boundaryMultiplier;
  let probThree = 0.012;
  let probTwo = 0.075 * (striker.attributes.fitness / 85);
  let probOne = 0.34 * aggressionRunFactor;

  // Format Pacing Calibration (Realistic International Totals)
  if (format === 'TEST') {
    // 3.2 - 3.8 RPO baseline in Tests (scores between 260 - 450 across 80 - 125 overs)
    const testSurfaceTimingMod =
      ctx.testConditions && ctx.testConditions.pitchWear >= 62
        ? 0.90
        : ctx.testConditions &&
          ctx.testConditions.ballAgeOvers >= 15 &&
          ctx.testConditions.ballAgeOvers <= 45 &&
          ctx.testConditions.pitchWear < 40
        ? 1.08
        : 1.0;
    probSix = 0.009 * boundaryMultiplier * testSurfaceTimingMod;
    probFour = 0.070 * boundaryMultiplier * (ballsFaced >= 15 ? 1.15 : 0.95) * testSurfaceTimingMod;
    probThree = 0.008;
    probTwo = 0.050 * (striker.attributes.fitness / 85);
    probOne = 0.255 * aggressionRunFactor;
  } else if (format === 'ODI') {
    // 5.2 - 6.6 RPO baseline in ODIs (250-340 totals), influenced by ground dimensions & powerplays
    const fourGroundMod = ctx.whiteBallModifiers ? ctx.whiteBallModifiers.boundaryFourMultiplier : 1.0;
    const sixGroundMod = ctx.whiteBallModifiers ? ctx.whiteBallModifiers.boundarySixMultiplier : 1.0;
    const twoGroundMod = ctx.whiteBallModifiers ? ctx.whiteBallModifiers.twoRunsMultiplier : 1.0;
    const ropeProtectMod =
      effectiveFieldPreset === 'DEATH_PROTECT' || effectiveFieldPreset === 'DEFENSIVE_BOUNDARY'
        ? 0.90
        : 1.0;

    probSix = 0.025 * boundaryMultiplier * sixGroundMod * (isWhiteBallDeath ? 1.22 : 1.0);
    probFour = 0.088 * boundaryMultiplier * fourGroundMod * ropeProtectMod;
    probThree = 0.012 * twoGroundMod;
    probTwo = 0.062 * (striker.attributes.fitness / 85) * twoGroundMod * powerplaySingleTwoMod;
    probOne = 0.33 * aggressionRunFactor * powerplaySingleTwoMod;
  } else if (format === 'T20I') {
    // 7.8 - 10.2 RPO baseline in T20Is (155-205 totals), influenced by ground dimensions, dew & powerplays
    const fourGroundMod = ctx.whiteBallModifiers ? ctx.whiteBallModifiers.boundaryFourMultiplier : 1.0;
    const sixGroundMod = ctx.whiteBallModifiers ? ctx.whiteBallModifiers.boundarySixMultiplier : 1.0;
    const twoGroundMod = ctx.whiteBallModifiers ? ctx.whiteBallModifiers.twoRunsMultiplier : 1.0;
    const ropeProtectMod =
      effectiveFieldPreset === 'DEATH_PROTECT' || effectiveFieldPreset === 'DEFENSIVE_BOUNDARY'
        ? 0.90
        : 1.0;

    const isSmash = effectiveAggression === 'SMASH';
    probSix = (isSmash ? 0.082 : 0.038) * boundaryMultiplier * sixGroundMod * (isWhiteBallDeath ? 1.20 : 1.0);
    probFour = (isSmash ? 0.155 : 0.098) * boundaryMultiplier * fourGroundMod * ropeProtectMod;
    probThree = 0.010 * twoGroundMod;
    probTwo = 0.068 * (striker.attributes.fitness / 85) * twoGroundMod * powerplaySingleTwoMod;
    probOne = (isSmash ? 0.22 : 0.30 * aggressionRunFactor) * powerplaySingleTwoMod;
  }

  const rollRuns = activeRandom();
  let runs = 0;
  if (rollRuns < probSix) {
    runs = 6;
  } else if (rollRuns < probSix + probFour) {
    runs = 4;
  } else if (rollRuns < probSix + probFour + probThree) {
    runs = 3;
  } else if (rollRuns < probSix + probFour + probThree + probTwo) {
    runs = 2;
  } else if (rollRuns < probSix + probFour + probThree + probTwo + probOne) {
    runs = 1;
  } else {
    runs = 0;
  }

  const shotZones: Array<'COVER' | 'POINT' | 'MID_WICKET' | 'LONG_ON' | 'LONG_OFF' | 'FINE_LEG' | 'THIRD_MAN' | 'SQUARE_LEG' | 'STRAIGHT'> = [
    'COVER', 'POINT', 'MID_WICKET', 'LONG_ON', 'LONG_OFF', 'FINE_LEG', 'THIRD_MAN', 'SQUARE_LEG', 'STRAIGHT'
  ];
  const zone = shotZones[Math.floor(activeRandom() * shotZones.length)];

  const commentary = generateBallCommentary(
    { runsOffBat: runs, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 }, isWicket: false },
    striker.shortName,
    bowler.shortName,
    format
  );

  return {
    overNumber,
    ballInOver: ballInOver + 1,
    runsOffBat: runs,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
    totalRuns: runs,
    isLegalDelivery: true,
    isWicket: false,
    strikerId: striker.id,
    strikerName: striker.shortName,
    nonStrikerId: ctx.nonStriker.id,
    nonStrikerName: ctx.nonStriker.shortName,
    bowlerId: bowler.id,
    bowlerName: bowler.shortName,
    commentary,
    zone,
    pitchMap: computeDeliveryPitchMap(ctx, isSpin, seedHint),
    wagonWheel: computeDeliveryWagonWheel(zone, runs, seedHint),
  };
}
