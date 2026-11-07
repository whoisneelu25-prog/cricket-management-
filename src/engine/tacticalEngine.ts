import {
  MatchFormat,
  Player,
  BattingAggression,
  BowlingTactic,
  FieldPreset,
  PitchCondition,
  WeatherCondition,
  DismissalType,
  BattingApproach,
  ShotSelection,
  BowlerTargetAction,
  SituationalInstruction,
  IndividualBatterInstruction,
  TeamBattingGamePlan,
  CustomScoringTarget,
  TargetStatus,
  PhaseScoringTargets,
  BowlingLine,
  BowlingLength,
  FastBowlingVariation,
  SpinBowlingVariation,
  BowlingIntention,
  IndividualBowlingPlan,
  BowlerSpellData,
  BowlerFatigueLevel,
  FieldPosition,
  CustomFieldPosition,
  CustomFieldLayout,
  DRSReviewType,
  DRSOutcome,
  DRSReviewState,
  WagonWheelShot,
  PitchMapDelivery,
  TacticalCalibrationSettings,
  InningsState,
  Match,
} from '../types/cricket';
import { mulberry32, isSpinBowler } from './simulation';
import { getPowerplayPhase, getMaxOversPerBowler } from './rules';

// ============================================================================
// PART 8 — HIGH-RISK ATTACKING ACTION PROBABILITY ENGINE (40/60 & 60/40 BASELINE)
// ============================================================================

export const DEFAULT_TACTICAL_CALIBRATION: TacticalCalibrationSettings = {
  testHighRiskSuccessBaseline: 0.40, // Test: 40% Success / 60% Failure
  testHighRiskFailureBaseline: 0.60,
  whiteBallHighRiskSuccessBaseline: 0.60, // ODI & T20I: 60% Success / 40% Failure
  whiteBallHighRiskFailureBaseline: 0.40,
};

export interface HighRiskActionResult {
  isAttempted: boolean;
  isSuccessful: boolean;
  successProbability: number;
  failureProbability: number;
  isSmash: boolean;
  scoringIntentBonus: number; // multiplier applied to boundary/run probabilities
  riskMultiplier: number; // multiplier applied to dismissal probability
}

/**
 * Calculates deterministic success/failure probabilities for high-risk attacking actions
 * strictly adhering to the prompt's required baselines:
 * - Test: 40% Success / 60% Failure baseline
 * - ODI / T20I: 60% Success / 40% Failure baseline
 * Final success and failure probabilities always total exactly 100%.
 */
export function calculateHighRiskActionProbabilities(params: {
  format: MatchFormat;
  batter: Player;
  bowler: Player;
  approach: BattingApproach | BattingAggression;
  shotSelection?: ShotSelection;
  pitch: PitchCondition;
  isSpin: boolean;
  fieldPreset: FieldPreset;
  deliveryQualityMod?: number; // -0.10 to +0.10
  calibration?: TacticalCalibrationSettings;
  seedHint?: number;
}): HighRiskActionResult {
  const {
    format,
    batter,
    bowler,
    approach,
    shotSelection,
    pitch,
    isSpin,
    fieldPreset,
    deliveryQualityMod = 0,
    calibration = DEFAULT_TACTICAL_CALIBRATION,
    seedHint = 12345,
  } = params;

  const isSmash = approach === 'SMASH';
  const isAggressive =
    approach === 'AGGRESSIVE' ||
    approach === 'ATTACKING' ||
    isSmash ||
    shotSelection === 'LOOK_FOR_BOUNDARIES';

  if (!isAggressive) {
    return {
      isAttempted: false,
      isSuccessful: false,
      successProbability: 0,
      failureProbability: 0,
      isSmash: false,
      scoringIntentBonus: 1.0,
      riskMultiplier: 1.0,
    };
  }

  // 1. Format-specific baseline starting weight
  const baselineSuccess =
    format === 'TEST'
      ? calibration.testHighRiskSuccessBaseline
      : calibration.whiteBallHighRiskSuccessBaseline;

  // 2. Batter skill modifiers (power, technique, timing, form, matchup vs pace/spin)
  const powerMod = ((batter.attributes.powerHitting - 75) / 100) * 0.12;
  const techMod = ((batter.attributes.technique - 75) / 100) * 0.08;
  const timingMod = ((batter.attributes.timing - 75) / 100) * 0.06;
  const matchupSkill = isSpin ? batter.attributes.againstSpin : batter.attributes.againstPace;
  const matchupMod = ((matchupSkill - 75) / 100) * 0.10;
  const batterFormMod = (((batter.attributes.currentForm || 75) - 75) / 100) * 0.05;

  // 3. Bowler skill & pitch resistance modifiers
  const bowlerSkill = isSpin
    ? (bowler.attributes.spin + bowler.attributes.variation) / 2
    : (bowler.attributes.pace + bowler.attributes.swing) / 2;
  const bowlerMod = -(((bowlerSkill - 75) / 100) * 0.10);
  const pitchResistance =
    format === 'TEST'
      ? pitch.type === 'GREEN_SEAMER' || pitch.type === 'CRACKED_DAY5'
        ? -0.06
        : pitch.type === 'BATTER_PARADISE'
        ? +0.07
        : 0
      : pitch.type === 'BATTER_PARADISE'
      ? +0.06
      : 0;

  // 4. Shot selection & tactical intent adjustments
  let tacticalMod = 0;
  if (shotSelection === 'ATTACK_SPIN' && isSpin) tacticalMod += 0.06;
  if (shotSelection === 'ATTACK_PACE' && !isSpin) tacticalMod += 0.06;
  if (shotSelection === 'AVOID_RISKY_SHOTS') tacticalMod -= 0.12;
  if (shotSelection === 'LOOK_FOR_BOUNDARIES') tacticalMod += 0.04;

  // Smash accepts substantially higher risk in exchange for maximum boundary pursuit
  if (isSmash) {
    tacticalMod += 0.03; // slightly more willing to commit into the shot
  }

  // 5. Compute raw success probability and clamp to realistic cricket range [0.15, 0.85]
  let success = baselineSuccess + powerMod + techMod + timingMod + matchupMod + batterFormMod + bowlerMod + pitchResistance + tacticalMod - deliveryQualityMod;
  success = Math.max(0.15, Math.min(0.85, Math.round(success * 1000) / 1000));

  // 6. Guarantee: success + failure MUST ALWAYS sum to exactly 1.0 (100%)
  const failure = Math.round((1.0 - success) * 1000) / 1000;

  const rand = mulberry32(seedHint + 3307)();
  const isSuccessful = rand < success;

  // Scoring and risk factors depending on mode:
  // Smash is more boundary-oriented while keeping dismissal risk balanced so teams don't collapse
  const scoringIntentBonus = isSmash ? 1.55 : 1.32;
  const riskMultiplier = isSmash ? (format === 'TEST' ? 1.12 : 1.10) : (format === 'TEST' ? 1.06 : 1.05);

  return {
    isAttempted: true,
    isSuccessful,
    successProbability: success,
    failureProbability: failure,
    isSmash,
    scoringIntentBonus,
    riskMultiplier,
  };
}

// ============================================================================
// PART 5, 6, 7 — CUSTOM BATTING SCORING TARGETS & PHASE TARGETS
// ============================================================================

export interface TargetProgressEvaluation {
  status: TargetStatus;
  activeTarget?: CustomScoringTarget;
  runsRequired: number;
  oversRemaining: number;
  ballsRemaining: number;
  requiredRunRate: number;
  currentRunRate: number;
  intentAdjustmentRunFactor: number;
  intentAdjustmentWicketRisk: number;
  guidanceText: string;
}

/**
 * Creates sensible default phase targets for ODI and T20I based on standard international innings phases
 */
export function createDefaultPhaseTargets(format: MatchFormat): PhaseScoringTargets {
  if (format === 'ODI') {
    return {
      powerplayTarget: {
        id: 'odi_pp1',
        targetScore: 60,
        targetOver: 10,
        label: 'Powerplay 1 (Overs 1–10)',
      },
      middlePhaseTarget: {
        id: 'odi_mid',
        targetScore: 235,
        targetOver: 40,
        label: 'Middle Phase (Overs 11–40)',
      },
      deathPhaseTarget: {
        id: 'odi_death',
        targetScore: 310,
        targetOver: 50,
        label: 'Death Phase (Overs 41–50)',
      },
      phaseBattingPlan: 'BALANCED_ACCUMULATION',
    };
  }

  if (format === 'T20I') {
    return {
      powerplayTarget: {
        id: 't20_pp',
        targetScore: 54,
        targetOver: 6,
        label: 'Powerplay (Overs 1–6)',
      },
      middlePhaseTarget: {
        id: 't20_mid',
        targetScore: 135,
        targetOver: 15,
        label: 'Middle Overs (Overs 7–15)',
      },
      deathPhaseTarget: {
        id: 't20_death',
        targetScore: 190,
        targetOver: 20,
        label: 'Death Overs (Overs 16–20)',
      },
      phaseBattingPlan: 'POSITIVE_ATTACK',
    };
  }

  return {};
}

/**
 * Evaluates live progress against custom scoring targets and computes dynamic intent adjustments
 */
export function evaluateScoringTargetProgress(
  currentScore: number,
  completedOvers: number,
  ballsInCurrentOver: number,
  wicketsLost: number,
  targets: CustomScoringTarget[] | undefined,
  format: MatchFormat,
  allocatedOvers?: number
): TargetProgressEvaluation {
  const currentTotalBalls = completedOvers * 6 + ballsInCurrentOver;
  const currentRR = currentTotalBalls > 0 ? (currentScore / currentTotalBalls) * 6 : 0;

  if (!targets || targets.length === 0) {
    return {
      status: 'ON_TRACK',
      runsRequired: 0,
      oversRemaining: 0,
      ballsRemaining: 0,
      requiredRunRate: 0,
      currentRunRate: currentRR,
      intentAdjustmentRunFactor: 1.0,
      intentAdjustmentWicketRisk: 1.0,
      guidanceText: 'No custom target configured. Batting on natural tactical plan.',
    };
  }

  // Find the next upcoming unachieved target
  const sorted = [...targets].sort((a, b) => a.targetOver - b.targetOver);
  const active = sorted.find((t) => t.targetOver * 6 > currentTotalBalls) || sorted[sorted.length - 1];

  if (!active) {
    return {
      status: 'TARGET_ACHIEVED',
      runsRequired: 0,
      oversRemaining: 0,
      ballsRemaining: 0,
      requiredRunRate: 0,
      currentRunRate: currentRR,
      intentAdjustmentRunFactor: 1.0,
      intentAdjustmentWicketRisk: 1.0,
      guidanceText: 'All planned milestones achieved.',
    };
  }

  const targetBalls = active.targetOver * 6;
  const ballsRemaining = Math.max(1, targetBalls - currentTotalBalls);
  const oversRemaining = Math.round((ballsRemaining / 6) * 10) / 10;
  const runsRequired = Math.max(0, active.targetScore - currentScore);
  const requiredRR = (runsRequired / ballsRemaining) * 6;

  // Determine progress status
  let status: TargetStatus = 'ON_TRACK';
  let intentAdjustmentRunFactor = 1.0;
  let intentAdjustmentWicketRisk = 1.0;
  let guidanceText = '';

  if (currentScore >= active.targetScore) {
    status = 'TARGET_ACHIEVED';
    intentAdjustmentRunFactor = 0.95;
    intentAdjustmentWicketRisk = 0.85;
    guidanceText = `Target of ${active.targetScore} achieved with ${oversRemaining} overs to spare. Consolidate and preserve wickets.`;
  } else if (currentTotalBalls >= targetBalls) {
    status = 'BEHIND_PLAN';
    intentAdjustmentRunFactor = 1.15;
    intentAdjustmentWicketRisk = 1.25;
    guidanceText = `Fell short of ${active.targetScore} by ${runsRequired} runs at over ${active.targetOver}. Re-calibrating next phase.`;
  } else {
    const rrRatio = currentRR > 0 ? requiredRR / currentRR : 1.2;
    if (rrRatio > 1.30) {
      status = 'BEHIND_PLAN';
      // Behind plan: Gradually increase attacking intent without recklessness
      const urgency = Math.min(0.25, (rrRatio - 1.0) * 0.15);
      const wicketCaution = wicketsLost >= 7 ? 0.05 : 0.0;
      intentAdjustmentRunFactor = 1.0 + urgency - wicketCaution;
      intentAdjustmentWicketRisk = 1.0 + urgency * 1.2;
      guidanceText = `Behind target (${active.targetScore} by over ${active.targetOver}). RRR is ${requiredRR.toFixed(1)} vs current ${currentRR.toFixed(1)}. Increasing boundary intent.`;
    } else if (rrRatio < 0.82) {
      status = 'AHEAD_OF_PLAN';
      // Ahead of plan: Reduce unnecessary risks, preserve wickets, consolidate
      intentAdjustmentRunFactor = 0.96;
      intentAdjustmentWicketRisk = 0.85;
      guidanceText = `Ahead of target (${currentScore}/${active.targetScore} at over ${completedOvers}.${ballsInCurrentOver}). Reducing high-risk shots.`;
    } else {
      status = 'ON_TRACK';
      intentAdjustmentRunFactor = 1.0;
      intentAdjustmentWicketRisk = 1.0;
      guidanceText = `On track for ${active.targetScore} at over ${active.targetOver} (Required: ${requiredRR.toFixed(1)} RPO).`;
    }
  }

  return {
    status,
    activeTarget: active,
    runsRequired,
    oversRemaining,
    ballsRemaining,
    requiredRunRate: Math.round(requiredRR * 100) / 100,
    currentRunRate: Math.round(currentRR * 100) / 100,
    intentAdjustmentRunFactor,
    intentAdjustmentWicketRisk,
    guidanceText,
  };
}

// ============================================================================
// PART 9 & 10 — BOWLING MANAGEMENT, SPELL TRACKING & TEST FATIGUE ROTATION
// ============================================================================

/**
 * Initializes or updates a bowler's spell and fatigue data
 */
export function initializeBowlerSpellData(bowler: Player, format: MatchFormat, pitch: PitchCondition): BowlerSpellData {
  const isSpin = isSpinBowler(bowler.bowlingStyle);
  let pitchSuitability = 'Neutral';
  if (isSpin) {
    if (pitch.spinBonus >= 12) pitchSuitability = 'Excellent (High Turn)';
    else if (pitch.spinBonus >= 5) pitchSuitability = 'Good (Helpful Surface)';
    else pitchSuitability = 'Moderate';
  } else {
    if (pitch.paceBonus >= 12) pitchSuitability = 'Excellent (High Seam/Pace)';
    else if (pitch.paceBonus >= 5) pitchSuitability = 'Good (Carrying Well)';
    else pitchSuitability = 'Flat Surface';
  }

  const defaultSpellTarget =
    format === 'TEST' ? (isSpin ? 10 : 5) : format === 'ODI' ? (isSpin ? 6 : 4) : 2;

  return {
    bowlerId: bowler.id,
    totalOvers: 0,
    currentSpellOvers: 0,
    targetSpellLength: defaultSpellTarget,
    spellHistory: [],
    restOversSinceLastSpell: 20,
    fatigue: 'LOW',
    effectiveness: 100,
    recommendedRestOvers: 0,
    availableForSpell: true,
    pitchSuitability,
  };
}

/**
 * Updates a bowler's spell metrics upon completing an over
 */
export function recordOverInSpellManager(
  currentData: BowlerSpellData,
  bowler: Player,
  format: MatchFormat
): BowlerSpellData {
  const isSpin = bowler ? isSpinBowler(bowler.bowlingStyle) : false;
  const newSpellOvers = currentData.currentSpellOvers + 1;
  const newTotalOvers = currentData.totalOvers + 1;

  // Workload accumulation: pacers fatigue ~2x faster than spinners; high fitness reduces fatigue rate
  const fitnessFactor = ((bowler?.attributes?.fitness) || 80) / 100;
  const fatiguePerOver = isSpin ? 3.0 / fitnessFactor : 6.2 / fitnessFactor;
  // Continuous fatigue accumulation from spell length and total workload
  const baseOverFatigue = newSpellOvers * fatiguePerOver;
  const spellFatigueModifier = newSpellOvers > 6 ? 1.5 : newSpellOvers > 4 ? 1.25 : 1.0;
  const totalWorkloadMod = newTotalOvers * 1.5;
  const newNumericFatigue = Math.min(100, baseOverFatigue * spellFatigueModifier + totalWorkloadMod);

  let newFatigueLevel: BowlerFatigueLevel = 'LOW';
  let recommendedRest = 0;
  if (newNumericFatigue >= 78) {
    newFatigueLevel = 'EXHAUSTED';
    recommendedRest = isSpin ? 6 : 10;
  } else if (newNumericFatigue >= 55) {
    newFatigueLevel = 'HIGH';
    recommendedRest = isSpin ? 4 : 7;
  } else if (newNumericFatigue >= 30) {
    newFatigueLevel = 'MEDIUM';
    recommendedRest = isSpin ? 2 : 4;
  } else {
    newFatigueLevel = 'LOW';
    recommendedRest = 0;
  }

  // Effectiveness drops as fatigue rises
  const effectiveness = Math.max(50, Math.round(100 - (newNumericFatigue - 20) * 0.6));

  return {
    ...currentData,
    totalOvers: newTotalOvers,
    currentSpellOvers: newSpellOvers,
    restOversSinceLastSpell: 0,
    fatigue: newFatigueLevel,
    effectiveness,
    recommendedRestOvers: recommendedRest,
    availableForSpell: newFatigueLevel !== 'EXHAUSTED',
  };
}

/**
 * Simulates rest and recovery for bowlers resting during an over
 */
export function applyRestToBenchBowlers(
  allBowlerData: Record<string, BowlerSpellData>,
  activeBowlerId: string
): Record<string, BowlerSpellData> {
  const updated: Record<string, BowlerSpellData> = {};

  Object.entries(allBowlerData).forEach(([bId, data]) => {
    if (bId === activeBowlerId) {
      updated[bId] = data;
      return;
    }

    const newRest = data.restOversSinceLastSpell + 1;
    let newFatigue = data.fatigue;
    let recRest = Math.max(0, data.recommendedRestOvers - 1);
    let effectiveness = data.effectiveness;

    // Bowler rested: if current spell overs were active and now resting, end the spell and push to history
    let spellHistory = [...data.spellHistory];
    let currentSpellOvers = data.currentSpellOvers;
    if (currentSpellOvers > 0) {
      spellHistory.push(currentSpellOvers);
      currentSpellOvers = 0;
    }

    // Recover fatigue
    if (newRest >= 8) {
      newFatigue = 'LOW';
      effectiveness = 100;
    } else if (newRest >= 5 && (data.fatigue === 'HIGH' || data.fatigue === 'EXHAUSTED')) {
      newFatigue = 'MEDIUM';
      effectiveness = Math.min(100, effectiveness + 25);
    } else if (newRest >= 3 && data.fatigue === 'MEDIUM') {
      newFatigue = 'LOW';
      effectiveness = 100;
    }

    updated[bId] = {
      ...data,
      currentSpellOvers,
      spellHistory,
      restOversSinceLastSpell: newRest,
      fatigue: newFatigue,
      recommendedRestOvers: recRest,
      effectiveness,
      availableForSpell: newFatigue !== 'EXHAUSTED',
    };
  });

  return updated;
}

// ============================================================================
// PART 12 — CUSTOM FIELD PLACEMENT & LEGAL CIRCLE VALIDATION
// ============================================================================

export const STANDARD_FIELD_COORDINATES: Record<FieldPosition, { x: number; y: number; isDeep: boolean; isLegSide: boolean }> = {
  WICKETKEEPER: { x: 50, y: 38, isDeep: false, isLegSide: false },
  SLIP_1: { x: 46, y: 36, isDeep: false, isLegSide: false },
  SLIP_2: { x: 43, y: 35, isDeep: false, isLegSide: false },
  SLIP_3: { x: 40, y: 34, isDeep: false, isLegSide: false },
  GULLY: { x: 35, y: 38, isDeep: false, isLegSide: false },
  POINT: { x: 28, y: 48, isDeep: false, isLegSide: false },
  BACKWARD_POINT: { x: 29, y: 42, isDeep: false, isLegSide: false },
  COVER: { x: 30, y: 62, isDeep: false, isLegSide: false },
  EXTRA_COVER: { x: 36, y: 68, isDeep: false, isLegSide: false },
  MID_OFF: { x: 44, y: 72, isDeep: false, isLegSide: false },
  MID_ON: { x: 56, y: 72, isDeep: false, isLegSide: true },
  MIDWICKET: { x: 68, y: 62, isDeep: false, isLegSide: true },
  SQUARE_LEG: { x: 72, y: 48, isDeep: false, isLegSide: true },
  FINE_LEG: { x: 70, y: 34, isDeep: false, isLegSide: true },
  THIRD_MAN: { x: 25, y: 22, isDeep: true, isLegSide: false },
  DEEP_COVER: { x: 18, y: 66, isDeep: true, isLegSide: false },
  LONG_OFF: { x: 38, y: 88, isDeep: true, isLegSide: false },
  LONG_ON: { x: 62, y: 88, isDeep: true, isLegSide: true },
  DEEP_MIDWICKET: { x: 82, y: 66, isDeep: true, isLegSide: true },
  DEEP_SQUARE_LEG: { x: 86, y: 48, isDeep: true, isLegSide: true },
  SHORT_LEG: { x: 58, y: 48, isDeep: false, isLegSide: true },
  SILLY_POINT: { x: 42, y: 48, isDeep: false, isLegSide: false },
  LEG_SLIP: { x: 54, y: 36, isDeep: false, isLegSide: true },
};

/**
 * Builds preset standard field layouts
 */
export function getStandardFieldPresets(bowlerId: string, xiIds: string[], wkId: string): Record<FieldPreset, CustomFieldLayout> {
  const otherIds = xiIds.filter((id) => id !== bowlerId && id !== wkId);

  const makeLayout = (id: FieldPreset, name: string, posList: FieldPosition[]): CustomFieldLayout => {
    const positions: CustomFieldPosition[] = [
      { position: 'WICKETKEEPER', fielderId: wkId, ...STANDARD_FIELD_COORDINATES.WICKETKEEPER },
    ];
    posList.slice(0, 9).forEach((p, idx) => {
      positions.push({
        position: p,
        fielderId: otherIds[idx] || `f_${idx}`,
        ...STANDARD_FIELD_COORDINATES[p],
      });
    });
    return { id, name, positions, isLegal: true };
  };

  return {
    BALANCED_STANDARD: makeLayout('BALANCED_STANDARD', 'Balanced Standard (7-2)', [
      'SLIP_1', 'POINT', 'COVER', 'EXTRA_COVER', 'MID_OFF', 'MID_ON', 'MIDWICKET', 'SQUARE_LEG', 'FINE_LEG'
    ]),
    ATTACKING_SLIPS: makeLayout('ATTACKING_SLIPS', 'Attacking Slip Cordon (Pace)', [
      'SLIP_1', 'SLIP_2', 'SLIP_3', 'GULLY', 'POINT', 'COVER', 'MID_OFF', 'MID_ON', 'FINE_LEG'
    ]),
    DEFENSIVE_BOUNDARY: makeLayout('DEFENSIVE_BOUNDARY', 'Defensive Ring & Boundaries', [
      'THIRD_MAN', 'DEEP_COVER', 'LONG_OFF', 'LONG_ON', 'DEEP_MIDWICKET', 'POINT', 'COVER', 'MID_OFF', 'MID_ON'
    ]),
    RING_INNER: makeLayout('RING_INNER', 'Powerplay Ring (Max 2 Deep)', [
      'SLIP_1', 'POINT', 'COVER', 'EXTRA_COVER', 'MID_OFF', 'MID_ON', 'MIDWICKET', 'THIRD_MAN', 'FINE_LEG'
    ]),
    DEATH_PROTECT: makeLayout('DEATH_PROTECT', 'Death Overs Protect', [
      'THIRD_MAN', 'DEEP_COVER', 'LONG_OFF', 'LONG_ON', 'DEEP_MIDWICKET', 'POINT', 'EXTRA_COVER', 'MIDWICKET', 'SQUARE_LEG'
    ]),
  };
}

/**
 * Validates whether a custom field layout respects ICC rules and powerplay circle limits:
 * - Exactly 11 fielders (10 outfield + 1 WK + 1 Bowler).
 * - Exactly 1 Wicketkeeper.
 * - Max 5 fielders on leg side (Law 28.4).
 * - Max 2 fielders behind square on leg side (Law 28.4).
 * - Format Powerplay limits:
 *   - Mandatory PP (ODI 1-10, T20I 1-6): Max 2 fielders outside 30-yard circle!
 *   - ODI PP2 (11-40): Max 4 fielders outside 30-yard circle!
 *   - Non-PP / Death: Max 5 fielders outside 30-yard circle!
 */
export function validateCustomFieldLayout(
  layout: CustomFieldLayout,
  format: MatchFormat,
  completedOvers: number,
  allocatedOvers?: number
): { isLegal: boolean; errors: string[] } {
  const errors: string[] = [];

  const fielders = layout.positions || [];
  // 9 fielders + 1 WK in layout + 1 bowler active = 11 players
  if (fielders.length !== 10) {
    errors.push(`Field setup must have exactly 10 positioned fielders plus the bowler (currently ${fielders.length}).`);
  }

  const wkCount = fielders.filter((p) => p.position === 'WICKETKEEPER').length;
  if (wkCount !== 1) {
    errors.push('Field layout must have exactly 1 Wicketkeeper.');
  }

  // Leg side check (Law 28.4: max 5 on leg side)
  const legSideCount = fielders.filter((p) => p.isLegSide).length;
  if (legSideCount > 5) {
    errors.push(`Illegal field (Law 28.4): Maximum 5 fielders allowed on leg side (currently ${legSideCount}).`);
  }

  // Behind square leg side (max 2 behind square on leg side)
  const behindSquareLegCount = fielders.filter((p) => p.position === 'FINE_LEG' || p.position === 'LEG_SLIP').length;
  if (behindSquareLegCount > 2) {
    errors.push(`Illegal field (Law 28.4): Maximum 2 fielders allowed behind square on leg side (currently ${behindSquareLegCount}).`);
  }

  // Powerplay Circle Check
  if (format !== 'TEST') {
    const ppInfo = getPowerplayPhase(format, completedOvers, allocatedOvers);
    const deepFieldersCount = fielders.filter((p) => p.isDeep).length;

    let maxDeepAllowed = 5;
    if (ppInfo.phase === 'MANDATORY_PP1') {
      maxDeepAllowed = 2; // Mandatory Powerplay: max 2 outside circle
    } else if (ppInfo.phase === 'INTERMEDIATE_PP2') {
      maxDeepAllowed = 4; // ODI Overs 11-40: max 4 outside circle
    }

    if (deepFieldersCount > maxDeepAllowed) {
      errors.push(
        `Fielding restriction violation (${ppInfo.description}): Maximum ${maxDeepAllowed} fielders permitted outside the 30-yard circle (currently ${deepFieldersCount} deep fielders).`
      );
    }
  }

  return {
    isLegal: errors.length === 0,
    errors,
  };
}

// ============================================================================
// PART 13 — DECISION REVIEW SYSTEM (DRS) EVALUATION ENGINE
// ============================================================================

/**
 * Evaluates an LBW review deterministically from delivery seed, seam movement, and impact line
 */
export function evaluateLBWReview(params: {
  deliveryIndex: number;
  bowler: Player;
  striker: Player;
  pitch: PitchCondition;
  originalDecision: 'OUT' | 'NOT_OUT';
  isSpin: boolean;
}): {
  outcome: DRSOutcome;
  finalDecision: 'OUT' | 'NOT_OUT';
  reason: string;
  ballTracking: NonNullable<DRSReviewState['ballTracking']>;
} {
  const { deliveryIndex, bowler, pitch, originalDecision, isSpin } = params;
  const rand = mulberry32(deliveryIndex * 83 + 991);

  // Pitching calculation: where did delivery pitch relative to stumps?
  const pitchRoll = rand();
  let pitching: 'OUTSIDE_OFF' | 'IN_LINE' | 'OUTSIDE_LEG' = 'IN_LINE';
  if (pitchRoll < 0.22) pitching = 'OUTSIDE_OFF';
  else if (pitchRoll > 0.88) pitching = 'OUTSIDE_LEG';

  // If ball pitched outside leg stump, by Law 36 it CANNOT be out LBW!
  if (pitching === 'OUTSIDE_LEG') {
    return {
      outcome: 'DECISION_OVERTURNED',
      finalDecision: 'NOT_OUT',
      reason: 'Ball pitched outside leg stump. Decision overturned to NOT OUT.',
      ballTracking: {
        pitching: 'OUTSIDE_LEG',
        impact: 'IN_LINE',
        wickets: 'HITTING',
        projectedHeightCm: 64,
      },
    };
  }

  // Impact calculation
  const impactRoll = rand();
  let impact: 'IN_LINE' | 'OUTSIDE_OFF' | 'UMPIRES_CALL' = 'IN_LINE';
  if (impactRoll < 0.14) impact = 'OUTSIDE_OFF';
  else if (impactRoll < 0.24) impact = 'UMPIRES_CALL';

  if (impact === 'OUTSIDE_OFF') {
    return {
      outcome: originalDecision === 'OUT' ? 'DECISION_OVERTURNED' : 'DECISION_STANDS',
      finalDecision: 'NOT_OUT',
      reason: 'Impact outside off-stump with shot offered. Decision is NOT OUT.',
      ballTracking: {
        pitching,
        impact: 'OUTSIDE_OFF',
        wickets: 'HITTING',
        projectedHeightCm: 68,
      },
    };
  }

  // Wickets hitting projection: trajectory towards the stumps
  const bounceRoll = rand();
  const heightCm = Math.round(52 + bounceRoll * 26 + pitch.bounceVariation * 0.4);
  let wickets: 'HITTING' | 'MISSING' | 'UMPIRES_CALL' = 'HITTING';

  if (heightCm > 73) {
    wickets = 'MISSING'; // bounced over stumps
  } else if (heightCm >= 69 || bounceRoll > 0.82) {
    wickets = 'UMPIRES_CALL'; // clipping top of bails/off bail
  }

  if (wickets === 'MISSING') {
    return {
      outcome: originalDecision === 'OUT' ? 'DECISION_OVERTURNED' : 'DECISION_STANDS',
      finalDecision: 'NOT_OUT',
      reason: 'Ball tracking shows delivery is missing the stumps (projected over the top). NOT OUT.',
      ballTracking: {
        pitching,
        impact,
        wickets: 'MISSING',
        projectedHeightCm: heightCm,
      },
    };
  }

  if (wickets === 'UMPIRES_CALL' || impact === 'UMPIRES_CALL') {
    return {
      outcome: 'UMPIRES_CALL',
      finalDecision: originalDecision,
      reason: `Umpire's Call on ${wickets === 'UMPIRES_CALL' ? 'wickets hitting' : 'impact'}. On-field decision of ${originalDecision} stands. Review retained!`,
      ballTracking: {
        pitching,
        impact,
        wickets,
        projectedHeightCm: heightCm,
      },
    };
  }

  // Plumb hitting!
  return {
    outcome: originalDecision === 'OUT' ? 'DECISION_STANDS' : 'DECISION_OVERTURNED',
    finalDecision: 'OUT',
    reason: 'Three reds! Pitching in line, impact in line, wickets hitting! Decision is OUT.',
    ballTracking: {
      pitching,
      impact,
      wickets: 'HITTING',
      projectedHeightCm: heightCm,
    },
  };
}

/**
 * Evaluates a caught-behind review (UltraEdge / Snicko bat contact)
 */
export function evaluateCaughtBehindReview(params: {
  deliveryIndex: number;
  originalDecision: 'OUT' | 'NOT_OUT';
}): {
  outcome: DRSOutcome;
  finalDecision: 'OUT' | 'NOT_OUT';
  reason: string;
  ultraEdge: NonNullable<DRSReviewState['ultraEdge']>;
} {
  const { deliveryIndex, originalDecision } = params;
  const rand = mulberry32(deliveryIndex * 71 + 331)();

  // If umpire gave out, ~82% chance edge is confirmed on review; ~18% clear gap!
  const hasSpike = originalDecision === 'OUT' ? rand < 0.82 : rand < 0.24;
  const amplitude = hasSpike ? Math.round((0.55 + rand * 0.40) * 100) / 100 : 0.05;
  const gap = hasSpike ? 0 : Math.round((1.2 + rand * 3.5) * 10) / 10;

  if (hasSpike) {
    return {
      outcome: originalDecision === 'OUT' ? 'DECISION_STANDS' : 'DECISION_OVERTURNED',
      finalDecision: 'OUT',
      reason: 'UltraEdge detects clear spike as the ball passes the outside edge! Decision is OUT.',
      ultraEdge: {
        hasSpike: true,
        spikeFrame: 4,
        spikeAmplitude: amplitude,
        gapToBatMm: 0,
      },
    };
  }

  return {
    outcome: originalDecision === 'OUT' ? 'DECISION_OVERTURNED' : 'DECISION_STANDS',
    finalDecision: 'NOT_OUT',
    reason: 'UltraEdge shows flat line. Daylight between bat and ball. Decision is NOT OUT.',
    ultraEdge: {
      hasSpike: false,
      spikeFrame: 4,
      spikeAmplitude: 0.05,
      gapToBatMm: gap,
    },
  };
}

// ============================================================================
// PART 15 — RULE-BASED OPPOSITION TACTICAL AI (NO EXTERNAL AI)
// ============================================================================

/**
 * Computes deterministic tactical decisions for computer-controlled opposition teams
 */
export function determineOppositionTactics(params: {
  match: Match;
  currentInnings: InningsState;
  isBatting: boolean;
  activeBowler: Player;
  activeStriker: Player;
}): {
  gamePlan?: TeamBattingGamePlan;
  batterInstruction?: IndividualBatterInstruction;
  bowlingPlan?: IndividualBowlingPlan;
  recommendedBowlerId?: string;
} {
  const { match, currentInnings, isBatting, activeBowler, activeStriker } = params;
  const isSpin = activeBowler ? isSpinBowler(activeBowler.bowlingStyle) : false;

  if (isBatting) {
    // 1. Batting Opposition Decision: format, wickets, target, match pressure
    let approach: BattingApproach = 'BALANCED';
    let shotSelection: ShotSelection = 'PLAY_STRAIGHT';
    let situational: SituationalInstruction = 'BUILD_PARTNERSHIP';

    if (match.format === 'TEST') {
      if (match.dayNumber === 5 && currentInnings.targetRuns && currentInnings.targetRuns - currentInnings.totalRuns > 180 && currentInnings.wickets >= 7) {
        approach = 'DEFENSIVE';
        shotSelection = 'AVOID_RISKY_SHOTS';
        situational = 'SURVIVE_SESSION';
      } else if (currentInnings.wickets >= 6) {
        approach = 'POSITIVE';
        shotSelection = 'LOOK_FOR_BOUNDARIES';
        situational = 'BUILD_PARTNERSHIP';
      } else if (isSpin && activeStriker.attributes.againstSpin > 82) {
        approach = 'POSITIVE';
        shotSelection = 'ATTACK_SPIN';
      }
    } else {
      // White ball: Powerplay, Chase RRR, Death
      const totalOvers = match.allocatedOversPerInnings || (match.format === 'T20I' ? 20 : 50);
      const ppInfo = getPowerplayPhase(match.format, currentInnings.completedOvers, totalOvers);

      if (currentInnings.targetRuns) {
        const needed = currentInnings.targetRuns - currentInnings.totalRuns;
        const ballsLeft = Math.max(1, totalOvers * 6 - (currentInnings.completedOvers * 6 + currentInnings.ballsInCurrentOver));
        const rrr = (needed / ballsLeft) * 6;

        if (rrr > 11.0 && currentInnings.wickets < 8) {
          approach = 'SMASH';
          shotSelection = 'LOOK_FOR_BOUNDARIES';
          situational = 'ACCELERATE';
        } else if (rrr > 8.5) {
          approach = 'AGGRESSIVE';
          situational = 'ACCELERATE';
        } else if (rrr < 4.5 && currentInnings.wickets < 6) {
          approach = 'BALANCED';
          shotSelection = 'ROTATE_STRIKE';
        }
      } else if (ppInfo.phase === 'MANDATORY_PP1') {
        approach = match.format === 'T20I' ? 'AGGRESSIVE' : 'POSITIVE';
        situational = 'ATTACK_POWERPLAY';
      } else if (currentInnings.completedOvers >= Math.floor(totalOvers * 0.8)) {
        approach = currentInnings.wickets < 7 ? 'SMASH' : 'AGGRESSIVE';
        situational = 'TARGET_DEATH';
      }
    }

    return {
      batterInstruction: {
        playerId: activeStriker.id,
        approach,
        shotSelection,
        situationalInstruction: situational,
      },
    };
  }

  // 2. Bowling Opposition Decision: Line, length, variation
  let line: BowlingLine = 'FOURTH_STUMP';
  let length: BowlingLength = 'GOOD_LENGTH';
  let intention: BowlingIntention = 'BUILD_PRESSURE';
  let variation: FastBowlingVariation | SpinBowlingVariation | undefined = undefined;

  if (isSpin) {
    line = 'OUTSIDE_OFF';
    length = 'FULL';
    intention = 'FORCE_MISTAKES';
    variation = activeBowler.attributes.variation > 80 ? 'GOOGLY' : 'FLIGHTED';
  } else {
    if (currentInnings.completedOvers < 10) {
      line = 'FOURTH_STUMP';
      length = 'GOOD_LENGTH';
      variation = 'OUTSWING';
      intention = 'ATTACK_WICKETS';
    } else if (match.format !== 'TEST' && currentInnings.completedOvers >= 42) {
      line = 'OUTSIDE_OFF';
      length = 'YORKER';
      variation = 'CUTTER';
      intention = 'RESTRICT_BOUNDARIES';
    }
  }

  return {
    bowlingPlan: {
      bowlerId: activeBowler.id,
      line,
      length,
      intention,
      variation,
      targetBatterId: activeStriker.id,
    },
  };
}
