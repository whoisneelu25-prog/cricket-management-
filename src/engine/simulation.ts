import {
  MatchFormat,
  Player,
  BallOutcome,
  DismissalType,
  BattingAggression,
  BowlingTactic,
  FieldPreset,
  PitchCondition,
  WeatherCondition
} from '../types/cricket';
import { getPowerplayPhase, isDismissalLegalForDelivery } from './rules';

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
}

// Deterministic Mulberry32 PRNG for reproducible test runs
function mulberry32(a: number) {
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
export function isSpinBowler(bowlingStyle: string): boolean {
  return (
    bowlingStyle.includes('BREAK') ||
    bowlingStyle.includes('SPIN') ||
    bowlingStyle.includes('SLOW')
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

  // 1. Dynamic Pitch Deterioration for 5-Day Test Cricket
  // On Day 1-2: Standard pitch.
  // Day 3: Seam wears slightly, spin increases.
  // Day 4-5: Pitch breaks up; spin bonus jumps significantly, uneven bounce rises, wearFactor increases.
  let dynamicSpinBonus = pitch.spinBonus;
  let dynamicPaceBonus = pitch.paceBonus;
  let dynamicBounceVariation = pitch.bounceVariation;

  if (format === 'TEST') {
    if (dayNumber >= 4) {
      dynamicSpinBonus += (dayNumber === 4 ? 0.25 : 0.40);
      dynamicBounceVariation += (dayNumber === 4 ? 0.20 : 0.35);
      dynamicPaceBonus -= 0.15;
    } else if (dayNumber === 3) {
      dynamicSpinBonus += 0.10;
      dynamicBounceVariation += 0.10;
    }
  }

  // 2. Ball Age & New Ball Availability (Test Cricket after 80 overs)
  // Innings over count: overNumber
  const isNewBall = format === 'TEST' && (overNumber < 15 || (overNumber % 80 < 15 && overNumber >= 80));
  if (isNewBall && !isSpin) {
    dynamicPaceBonus += 0.20; // New ball swings and seams more
  }

  // 3. Powerplay & Fielding Restrictions Influence
  const ppInfo = getPowerplayPhase(format, overNumber);
  const isMandatoryPP = ppInfo.phase === 'MANDATORY_PP1';
  let powerplayBoundaryBonus = isMandatoryPP ? 1.30 : 1.0;
  let powerplayDotReduction = isMandatoryPP ? 0.85 : 1.0;

  // 4. Calculate Batter Rating vs Bowler Rating for current matchup
  const batterMatchupSkill = isSpin
    ? (striker.attributes.againstSpin * 0.55 + striker.attributes.technique * 0.35 + striker.attributes.defense * 0.10)
    : (striker.attributes.againstPace * 0.55 + striker.attributes.technique * 0.35 + striker.attributes.defense * 0.10);

  const bowlerSkill = isSpin
    ? (bowler.attributes.spin * 0.40 + bowler.attributes.variation * 0.30 + bowler.attributes.accuracy * 0.30)
    : (bowler.attributes.pace * 0.35 + bowler.attributes.swing * 0.35 + bowler.attributes.accuracy * 0.30);

  // Form & Fatigue factors
  const batterFormMod = ((striker.attributes.currentForm || 80) - 50) / 100; // -0.5 to +0.5
  const bowlerFormMod = ((bowler.attributes.currentForm || 80) - 50) / 100;
  const bowlerFatiguePenalty = Math.max(0, ((bowler.workloadFatigue || 15) - 60) * 0.005); // Fatigue impairs accuracy

  // Pitch & Weather assistance
  let pitchBowlerBoost = 0;
  if (isSpin) {
    pitchBowlerBoost = dynamicSpinBonus * 0.15;
  } else {
    pitchBowlerBoost = (dynamicPaceBonus + weather.swingBonus) * 0.15;
  }

  // 5. Situational Batting Intent & Tactics
  let effectiveAggression = battingAggression;

  // Dynamic Situational Adaptation:
  // If chasing in white ball and Required Run Rate is very high, shift aggression upwards
  if (targetRuns && format !== 'TEST') {
    const runsNeeded = targetRuns - currentScore;
    const maxBalls = format === 'T20I' ? 120 : 300;
    const ballsRemaining = Math.max(1, maxBalls - (overNumber * 6 + ballInOver));
    const rrr = (runsNeeded / ballsRemaining) * 6;

    if (rrr > 11 && wicketsLost < 8) {
      effectiveAggression = 'SMASH';
    } else if (rrr > 9 && effectiveAggression === 'BALANCED') {
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
      aggressionRunFactor = 1.0;
      aggressionWicketRisk = 1.0;
      break;
    case 'ATTACKING':
      aggressionRunFactor = 1.45;
      aggressionWicketRisk = 1.55;
      break;
    case 'SMASH':
      aggressionRunFactor = 1.95;
      aggressionWicketRisk = 2.45;
      break;
  }

  // Format baseline pacing
  let formatPaceBonus = 1.0;
  if (format === 'T20I') formatPaceBonus = 1.55;
  else if (format === 'ODI') formatPaceBonus = 1.15;
  else if (format === 'TEST') formatPaceBonus = 0.65;

  // 6. Extras Generation (Wides, No-Balls)
  const wideProb = Math.max(0.010, (100 - bowler.attributes.accuracy) / 2200 + bowlerFatiguePenalty);
  const noBallProb = Math.max(0.004, (100 - bowler.attributes.control) / 3600);

  const rollExtra = activeRandom();

  // WIDE
  if (rollExtra < wideProb) {
    // Check if keeper executes a stumping or batter is run out on a wide
    const rollWideWicket = activeRandom();
    const canBeStumped = isSpin && rollWideWicket < 0.035;
    const canBeRunOut = rollWideWicket < 0.015;

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
        wicketDetails: {
          type: dismissalType,
          bowlerId: canBeStumped ? bowler.id : undefined,
          bowlerName: canBeStumped ? bowler.shortName : undefined,
          description: comm,
        },
        strikerId: striker.id,
        strikerName: striker.shortName,
        nonStrikerId: ctx.nonStriker.id,
        nonStrikerName: ctx.nonStriker.shortName,
        bowlerId: bowler.id,
        bowlerName: bowler.shortName,
        commentary: comm,
      };
    }

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
      commentary: generateBallCommentary({ runsOffBat: 0, extras: { wides: 1, noBalls: 0, byes: 0, legByes: 0 }, isWicket: false }, striker.shortName, bowler.shortName, format),
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
        wicketDetails: {
          type: 'RUN_OUT',
          description: comm,
        },
        strikerId: striker.id,
        strikerName: striker.shortName,
        nonStrikerId: ctx.nonStriker.id,
        nonStrikerName: ctx.nonStriker.shortName,
        bowlerId: bowler.id,
        bowlerName: bowler.shortName,
        commentary: comm,
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
  let baseWicketProb = 0.028;
  if (format === 'TEST') baseWicketProb = 0.023;
  else if (format === 'ODI') baseWicketProb = 0.027;
  else if (format === 'T20I') baseWicketProb = 0.040;

  // Skill disparity: +bowlerSkill -batterMatchupSkill
  const skillDelta = (bowlerSkill + pitchBowlerBoost * 25 - batterMatchupSkill) / 200;
  let finalWicketProb = baseWicketProb * (1 + skillDelta + bowlerFormMod - batterFormMod) * aggressionWicketRisk;

  // Field preset impact on wicket taking
  if (fieldPreset === 'ATTACKING_SLIPS') finalWicketProb *= 1.25;
  if (fieldPreset === 'DEFENSIVE_BOUNDARY') finalWicketProb *= 0.85;

  const rollWicket = activeRandom();
  if (rollWicket < Math.min(0.24, Math.max(0.004, finalWicketProb))) {
    // Choose realistic dismissal type
    let dismissalType: DismissalType = 'CAUGHT';
    const rollDismissal = activeRandom();
    if (isSpin) {
      if (rollDismissal < 0.42) dismissalType = 'CAUGHT';
      else if (rollDismissal < 0.68) dismissalType = 'LBW';
      else if (rollDismissal < 0.86) dismissalType = 'BOWLED';
      else dismissalType = 'STUMPED';
    } else {
      if (rollDismissal < 0.52) dismissalType = 'CAUGHT';
      else if (rollDismissal < 0.74) dismissalType = 'BOWLED';
      else if (rollDismissal < 0.94) dismissalType = 'LBW';
      else dismissalType = 'RUN_OUT';
    }

    const comm = generateBallCommentary(
      { runsOffBat: 0, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 }, isWicket: true, wicketType: dismissalType },
      striker.shortName,
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
      wicketDetails: {
        type: dismissalType,
        bowlerId: dismissalType !== 'RUN_OUT' ? bowler.id : undefined,
        bowlerName: dismissalType !== 'RUN_OUT' ? bowler.shortName : undefined,
        description: comm,
      },
      strikerId: striker.id,
      strikerName: striker.shortName,
      nonStrikerId: ctx.nonStriker.id,
      nonStrikerName: ctx.nonStriker.shortName,
      bowlerId: bowler.id,
      bowlerName: bowler.shortName,
      commentary: comm,
    };
  }

  // 8. Byes and Leg-Byes on Legal Delivery (~1.5% - 2.5% frequency)
  const rollBye = activeRandom();
  if (rollBye < 0.018) {
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

  // In Test cricket, dot balls are much more frequent (~60–70%)
  if (format === 'TEST') {
    probSix *= 0.20;
    probFour *= 0.65;
    probOne *= 0.55;
    probTwo *= 0.55;
  }

  const totalRunsProb = probSix + probFour + probThree + probTwo + probOne;
  const probDot = Math.max(0.12, (1 - totalRunsProb) * powerplayDotReduction);

  const rollRuns = activeRandom();
  let runs = 0;
  if (rollRuns < probDot) {
    runs = 0;
  } else if (rollRuns < probDot + probOne) {
    runs = 1;
  } else if (rollRuns < probDot + probOne + probTwo) {
    runs = 2;
  } else if (rollRuns < probDot + probOne + probTwo + probThree) {
    runs = 3;
  } else if (rollRuns < probDot + probOne + probTwo + probThree + probFour) {
    runs = 4;
  } else {
    runs = 6;
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
  };
}
