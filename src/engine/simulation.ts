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

export interface DeliveryContext {
  format: MatchFormat;
  striker: Player;
  nonStriker: Player;
  bowler: Player;
  pitch: PitchCondition;
  weather: WeatherCondition;
  overNumber: number; // 0-based
  ballInOver: number; // 0-5
  currentScore: number;
  wicketsLost: number;
  targetRuns?: number;
  battingAggression: BattingAggression;
  bowlingTactic: BowlingTactic;
  fieldPreset: FieldPreset;
  overCompletedOvers: number;
  seed?: number;
}

// Simple deterministic Mulberry32 PRNG for reproducible test runs
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let activeRandom = Math.random;

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
    return `${bowlerName} strays down the leg side, wide called by the umpire. Bonus run added.`;
  }
  if (outcome.extras.noBalls > 0) {
    return `NO BALL! ${bowlerName} oversteps the crease. Free hit opportunity for ${strikerName}!`;
  }
  if (outcome.extras.byes > 0 || outcome.extras.legByes > 0) {
    return `${strikerName} misses with the shot, the ball clips the pad and rolls away for ${outcome.extras.legByes || outcome.extras.byes} leg bye.`;
  }

  if (outcome.isWicket) {
    switch (outcome.wicketType) {
      case 'BOWLED':
        return `BOWLED HIM! Clean through the gate! ${bowlerName} rattles the timber with a beauty, dismissing ${strikerName}!`;
      case 'CAUGHT':
        return `OUT! In the air and CAUGHT! ${strikerName} miscues and the fielder takes a sharp catch off ${bowlerName}!`;
      case 'LBW':
        return `LOUDWICK APPEAL AND GIVEN! Plumb in front! ${bowlerName} strikes with the classic LBW dismissal of ${strikerName}!`;
      case 'RUN_OUT':
        return `RUN OUT! Direct hit! A terrible mix-up between the batters and ${strikerName} is caught well short of the crease!`;
      case 'STUMPED':
        return `STUMPED! ${strikerName} was lured down the track, beaten in flight, and the keeper whips the bails off in a flash!`;
      default:
        return `WICKET! ${bowlerName} removes ${strikerName}! A huge breakthrough in the match!`;
    }
  }

  switch (outcome.runsOffBat) {
    case 0: {
      const dotLines = [
        `${bowlerName} lands it on a good length outside off, ${strikerName} defends solidly into the covers.`,
        `Beaten outside off! Good movement off the seam from ${bowlerName}, no run.`,
        `${strikerName} pushes it gently towards mid-on, no single on offer.`,
        `Short of a length, ${strikerName} hops and taps it down safely to point.`,
        `A tight, probing delivery from ${bowlerName}. Dot ball.`
      ];
      return dotLines[Math.floor(activeRandom() * dotLines.length)];
    }
    case 1: {
      return `${strikerName} works it into the gap at mid-wicket and scampers through for a brisk single.`;
    }
    case 2: {
      return `Nicely placed into the deep pocket at square leg, good running between the wickets gets them two.`;
    }
    case 3: {
      return `Superb placement through the covers, the fielder hares after it and slides to keep it to three runs.`;
    }
    case 4: {
      const fourLines = [
        `FOUR! Pierced the gap with surgical precision! ${strikerName} leans into a glorious cover drive to the fence!`,
        `FOUR! Short and punished! ${strikerName} swivels on the back foot and pulls with authority through mid-wicket!`,
        `FOUR! Edged and past the slips! Flies down to the third-man boundary at blistering speed!`,
        `FOUR! Up and over extra cover! Pure elegance from ${strikerName}!`
      ];
      return fourLines[Math.floor(activeRandom() * fourLines.length)];
    }
    case 6: {
      const sixLines = [
        `SIX! High, handsome and deep into the crowd! ${strikerName} launches ${bowlerName} over long-on for maximum!`,
        `SIX! What a monster hit! Sweet as a nut off the middle of the willow, sailing into the upper deck!`,
        `SIX! Slog sweep executed to perfection! ${strikerName} clears the ropes with effortless swagger!`
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
  const {
    format,
    striker,
    bowler,
    pitch,
    weather,
    overNumber,
    ballInOver,
    battingAggression,
    bowlingTactic,
    fieldPreset,
  } = ctx;

  const isSpin = isSpinBowler(bowler.bowlingStyle);

  // 1. Calculate Batter Rating vs Bowler Rating for current matchup
  const batterMatchupSkill = isSpin
    ? (striker.attributes.againstSpin * 0.6 + striker.attributes.technique * 0.4)
    : (striker.attributes.againstPace * 0.6 + striker.attributes.technique * 0.4);

  const bowlerSkill = isSpin
    ? (bowler.attributes.spin * 0.4 + bowler.attributes.variation * 0.3 + bowler.attributes.accuracy * 0.3)
    : (bowler.attributes.pace * 0.3 + bowler.attributes.swing * 0.3 + bowler.attributes.accuracy * 0.4);

  // Form & Fatigue factors
  const batterFormMod = (striker.attributes.currentForm - 50) / 100; // -0.5 to +0.5
  const bowlerFormMod = (bowler.attributes.currentForm - 50) / 100;

  // Pitch & Weather influence
  let pitchBowlerBoost = 0;
  if (isSpin) {
    pitchBowlerBoost = pitch.spinBonus * 0.15;
  } else {
    pitchBowlerBoost = (pitch.paceBonus + weather.swingBonus) * 0.15;
  }

  // Tactical modifiers
  // Batting aggression modifies run scoring probability vs wicket probability
  let aggressionRunFactor = 1.0;
  let aggressionWicketRisk = 1.0;
  switch (battingAggression) {
    case 'BLOCK':
      aggressionRunFactor = 0.25;
      aggressionWicketRisk = 0.35;
      break;
    case 'DEFENSIVE':
      aggressionRunFactor = 0.6;
      aggressionWicketRisk = 0.65;
      break;
    case 'BALANCED':
      aggressionRunFactor = 1.0;
      aggressionWicketRisk = 1.0;
      break;
    case 'ATTACKING':
      aggressionRunFactor = 1.45;
      aggressionWicketRisk = 1.5;
      break;
    case 'SMASH':
      aggressionRunFactor = 1.95;
      aggressionWicketRisk = 2.4;
      break;
  }

  // Format baseline aggression
  let formatPaceBonus = 1.0;
  if (format === 'T20I') formatPaceBonus = 1.55;
  else if (format === 'ODI') formatPaceBonus = 1.15;
  else if (format === 'TEST') formatPaceBonus = 0.65;

  // 2. Extra Probabilities (Wide, No-Ball)
  // Bowler accuracy reduces extras
  const wideProb = Math.max(0.015, (100 - bowler.attributes.accuracy) / 1800);
  const noBallProb = Math.max(0.005, (100 - bowler.attributes.control) / 3000);

  const rollExtra = activeRandom();
  if (rollExtra < wideProb) {
    return {
      overNumber,
      ballInOver: ballInOver + 1,
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

  if (rollExtra < wideProb + noBallProb) {
    return {
      overNumber,
      ballInOver: ballInOver + 1,
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

  // 3. Wicket Calculation
  // Base wicket chance ~ 3.5% per legal ball in T20, 2.5% in Test, 2.8% in ODI
  let baseWicketProb = 0.03;
  if (format === 'TEST') baseWicketProb = 0.024;
  else if (format === 'ODI') baseWicketProb = 0.028;
  else if (format === 'T20I') baseWicketProb = 0.042;

  // Compare skill difference: +bowlerSkill -batterSkill
  const skillDelta = (bowlerSkill + pitchBowlerBoost * 20 - batterMatchupSkill) / 200;
  let finalWicketProb = baseWicketProb * (1 + skillDelta + bowlerFormMod - batterFormMod) * aggressionWicketRisk;

  // Field preset impact on wicket taking
  if (fieldPreset === 'ATTACKING_SLIPS') finalWicketProb *= 1.25;
  if (fieldPreset === 'DEFENSIVE_BOUNDARY') finalWicketProb *= 0.85;

  const rollWicket = activeRandom();
  if (rollWicket < Math.min(0.25, Math.max(0.005, finalWicketProb))) {
    // Choose realistic dismissal type
    let dismissalType: DismissalType = 'CAUGHT';
    const rollDismissal = activeRandom();
    if (isSpin) {
      if (rollDismissal < 0.40) dismissalType = 'CAUGHT';
      else if (rollDismissal < 0.65) dismissalType = 'LBW';
      else if (rollDismissal < 0.85) dismissalType = 'BOWLED';
      else dismissalType = 'STUMPED';
    } else {
      if (rollDismissal < 0.50) dismissalType = 'CAUGHT';
      else if (rollDismissal < 0.75) dismissalType = 'BOWLED';
      else if (rollDismissal < 0.95) dismissalType = 'LBW';
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

  // 4. Run Scoring Probabilities
  // Compute distribution of Dot, 1, 2, 3, 4, 6
  // Power hitting, timing, and aggression heavily influence boundaries
  const powerFactor = (striker.attributes.powerHitting / 100) * (striker.attributes.timing / 100);
  const boundaryBonus = powerFactor * aggressionRunFactor * formatPaceBonus;

  // Base probabilities
  let probSix = 0.02 * boundaryBonus;
  let probFour = 0.07 * boundaryBonus;
  let probThree = 0.015;
  let probTwo = 0.08 * (striker.attributes.fitness / 85);
  let probOne = 0.35 * aggressionRunFactor;

  // In Test cricket, dot balls are much more frequent (~60-70%)
  if (format === 'TEST') {
    probSix *= 0.25;
    probFour *= 0.65;
    probOne *= 0.55;
    probTwo *= 0.6;
  }

  // Normalize
  const totalBoundaryRunProb = probSix + probFour + probThree + probTwo + probOne;
  const probDot = Math.max(0.15, 1 - totalBoundaryRunProb);

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
