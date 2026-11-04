import {
  MatchFormat,
  InningsState,
  BallOutcome,
  DismissalType,
  BatterInningsScore,
  BowlerInningsFigures,
  FallOfWicket
} from '../types/cricket';

export type PowerplayPhase = 'MANDATORY_PP1' | 'INTERMEDIATE_PP2' | 'DEATH_PP3' | 'STANDARD' | 'NONE';

/**
 * Returns the maximum overs allowed per bowler in the given format
 * Adjusts dynamically for shortened limited-overs innings per ICC Playing Conditions.
 */
export function getMaxOversPerBowler(format: MatchFormat, allocatedOvers?: number): number {
  switch (format) {
    case 'T20I': {
      if (allocatedOvers !== undefined && allocatedOvers > 0 && allocatedOvers < 20) {
        return Math.min(4, Math.ceil(allocatedOvers / 5));
      }
      return 4;
    }
    case 'ODI': {
      if (allocatedOvers !== undefined && allocatedOvers > 0 && allocatedOvers < 50) {
        return Math.min(10, Math.ceil(allocatedOvers / 5));
      }
      return 10;
    }
    case 'TEST':
      return Infinity; // No over restriction in Test matches
  }
}

/**
 * Returns exact ICC shortened-innings bowler quota distribution (Clause 13.8.2):
 * e.g. 23-over ODI -> up to 3 bowlers may bowl 5 overs, remaining bowlers max 4 overs.
 */
export function getShortenedBowlerQuotaDistribution(
  format: MatchFormat,
  allocatedOvers?: number
): { maxQuota: number; maxQuotaBowlersAllowed: number; reducedQuota: number } {
  if (format === 'TEST') {
    return { maxQuota: Infinity, maxQuotaBowlersAllowed: 11, reducedQuota: Infinity };
  }
  const totalOvers = getMaxOversPerInnings(format, allocatedOvers);
  const standardCap = format === 'ODI' ? 10 : 4;
  if (totalOvers >= (format === 'ODI' ? 50 : 20)) {
    return { maxQuota: standardCap, maxQuotaBowlersAllowed: 5, reducedQuota: standardCap };
  }
  const remainder = totalOvers % 5;
  if (remainder === 0) {
    const q = Math.min(standardCap, totalOvers / 5);
    return { maxQuota: q, maxQuotaBowlersAllowed: 5, reducedQuota: q };
  }
  return {
    maxQuota: Math.min(standardCap, Math.ceil(totalOvers / 5)),
    maxQuotaBowlersAllowed: remainder,
    reducedQuota: Math.min(standardCap, Math.floor(totalOvers / 5)),
  };
}

/**
 * Returns the effective maximum overs this specific bowler may bowl in the current innings,
 * accounting for shortened-match ICC bowler quota distribution.
 */
export function getEffectiveMaxOversForBowler(
  format: MatchFormat,
  bowlerId: string,
  bowlers: BowlerInningsFigures[],
  allocatedOvers?: number
): number {
  if (format === 'TEST') return Infinity;
  const dist = getShortenedBowlerQuotaDistribution(format, allocatedOvers);
  if (dist.maxQuota === dist.reducedQuota) return dist.maxQuota;

  // Count how many OTHER bowlers have already exceeded reducedQuota (i.e. claimed a maxQuota slot)
  const otherBowlersUsingMaxSlot = bowlers.filter(
    (bw) =>
      bw.playerId !== bowlerId &&
      bw.overs * 6 + bw.ballsThisOver > dist.reducedQuota * 6
  ).length;

  return otherBowlersUsingMaxSlot >= dist.maxQuotaBowlersAllowed ? dist.reducedQuota : dist.maxQuota;
}

/**
 * Returns total overs per innings in the given format
 */
export function getMaxOversPerInnings(format: MatchFormat, allocatedOvers?: number): number {
  switch (format) {
    case 'T20I':
      return allocatedOvers !== undefined && allocatedOvers > 0 ? allocatedOvers : 20;
    case 'ODI':
      return allocatedOvers !== undefined && allocatedOvers > 0 ? allocatedOvers : 50;
    case 'TEST':
      return Infinity; // Completed by all-out, declaration, or target reached
  }
}

/**
 * Determines the current Powerplay phase and fielding restriction
 */
export function getPowerplayPhase(
  format: MatchFormat,
  completedOvers: number,
  allocatedOvers?: number
): {
  phase: PowerplayPhase;
  maxFieldersOutsideCircle: number;
  description: string;
} {
  if (format === 'T20I') {
    const totalOvers = getMaxOversPerInnings('T20I', allocatedOvers);
    const pp1End = totalOvers < 20 ? Math.max(1, Math.round(totalOvers * 0.3)) : 6;
    if (completedOvers < pp1End) {
      return {
        phase: 'MANDATORY_PP1',
        maxFieldersOutsideCircle: 2,
        description: `Powerplay (Overs 1–${pp1End}): Max 2 fielders outside 30-yard circle`,
      };
    }
    return {
      phase: 'STANDARD',
      maxFieldersOutsideCircle: 5,
      description: `Non-Powerplay (Overs ${pp1End + 1}–${totalOvers}): Max 5 fielders outside 30-yard circle`,
    };
  }

  if (format === 'ODI') {
    const totalOvers = getMaxOversPerInnings('ODI', allocatedOvers);
    const pp1End = totalOvers < 50 ? Math.max(2, Math.round(totalOvers * 0.2)) : 10;
    const pp2End = totalOvers < 50 ? Math.max(pp1End + 1, Math.round(totalOvers * 0.8)) : 40;
    if (completedOvers < pp1End) {
      return {
        phase: 'MANDATORY_PP1',
        maxFieldersOutsideCircle: 2,
        description: `Powerplay 1 (Overs 1–${pp1End}): Max 2 fielders outside circle`,
      };
    }
    if (completedOvers < pp2End) {
      return {
        phase: 'INTERMEDIATE_PP2',
        maxFieldersOutsideCircle: 4,
        description: `Powerplay 2 (Overs ${pp1End + 1}–${pp2End}): Max 4 fielders outside circle`,
      };
    }
    return {
      phase: 'DEATH_PP3',
      maxFieldersOutsideCircle: 5,
      description: `Powerplay 3 (Overs ${pp2End + 1}–${totalOvers}): Max 5 fielders outside circle`,
    };
  }

  return {
    phase: 'NONE',
    maxFieldersOutsideCircle: 9,
    description: 'Test Cricket: Unrestricted fielding placements',
  };
}

/**
 * Checks whether the delivery is a legal delivery that advances the over
 */
export function isDeliveryLegal(extras: { wides: number; noBalls: number }): boolean {
  return extras.wides === 0 && extras.noBalls === 0;
}

/**
 * Checks if the innings has reached a terminal condition:
 * - 10 wickets down (all out)
 * - Declared (Test cricket)
 * - Max overs completed (for limited overs)
 * - Target achieved in 2nd/4th chasing innings
 */
export function isInningsComplete(innings: InningsState, format: MatchFormat): boolean {
  if (innings.isDeclared || innings.isAllOut || innings.isCompleted) {
    return true;
  }

  // Super Over 2-wicket limit check
  if (innings.superOverNumber !== undefined && innings.wickets >= 2) {
    return true;
  }

  // 10 wickets down = all out
  if (innings.wickets >= 10) {
    return true;
  }

  // Target achieved in chasing innings
  if (innings.targetRuns !== undefined && innings.totalRuns >= innings.targetRuns) {
    return true;
  }

  // Limited overs check (respecting allocatedOvers if shortened or Super Over)
  const maxOvers = getMaxOversPerInnings(format, innings.allocatedOvers);
  if (format !== 'TEST' && innings.completedOvers >= maxOvers) {
    return true;
  }

  return false;
}

/**
 * Calculates current run rate (runs per over)
 */
export function calculateRunRate(totalRuns: number, completedOvers: number, ballsInOver: number): number {
  const totalBalls = completedOvers * 6 + ballsInOver;
  if (totalBalls === 0) return 0;
  return Number(((totalRuns / totalBalls) * 6).toFixed(2));
}

/**
 * Calculates required run rate for target chase
 */
export function calculateRequiredRunRate(
  targetRuns: number,
  currentRuns: number,
  completedOvers: number,
  ballsInOver: number,
  format: MatchFormat,
  allocatedOvers?: number
): number | null {
  if (format === 'TEST') return null;
  const maxOvers = getMaxOversPerInnings(format, allocatedOvers);

  const runsNeeded = targetRuns - currentRuns;
  if (runsNeeded <= 0) return 0;

  const ballsCompleted = completedOvers * 6 + ballsInOver;
  const ballsRemaining = maxOvers * 6 - ballsCompleted;

  if (ballsRemaining <= 0) return runsNeeded > 0 ? 99.9 : 0;
  return Number(((runsNeeded / ballsRemaining) * 6).toFixed(2));
}

/**
 * Checks if a dismissal is legally permitted on a given delivery type per MCC Laws & ICC Playing Conditions:
 * - On a No-Ball or Free Hit: Only RUN_OUT, OBSTRUCTING_FIELD, or HIT_BALL_TWICE is legal.
 * - On a Wide (non-Free-Hit): Only STUMPED, RUN_OUT, or HIT_WICKET is legal.
 */
export function isDismissalLegalForDelivery(
  dismissalType: DismissalType,
  isNoBall: boolean,
  isWide: boolean,
  isFreeHit: boolean = false
): boolean {
  if (isNoBall || isFreeHit) {
    return dismissalType === 'RUN_OUT' || dismissalType === 'OBSTRUCTING_FIELD' || dismissalType === 'HIT_BALL_TWICE';
  }
  if (isWide) {
    return dismissalType === 'STUMPED' || dismissalType === 'RUN_OUT' || dismissalType === 'HIT_WICKET';
  }
  return true;
}

/**
 * Updates innings state with a new ball outcome
 * Follows official MCC Laws of Cricket:
 * - Extras addition (wides, no-balls, byes, leg-byes)
 * - Bowler runs conceded: runsOffBat + wides + noBalls (NOT byes or leg-byes)
 * - Legal ball accounting: wides and no-balls do NOT count towards the 6 balls of the over
 * - Maiden over accounting: incremented when a completed 6-ball over concedes 0 runs
 * - Strike rotation:
 *   - Physical runs scored (off bat or physical runs from byes/leg-byes): odd runs rotate strike
 *   - End of over: strike rotates between the two batters
 *   - Wicket: new batter takes strike (MCC 2022 Law 18.11), unless non-striker was run out
 */
export function applyBallToInnings(
  current: InningsState,
  outcome: BallOutcome,
  battingXI: string[],
  playerNames: Record<string, string>,
  format: MatchFormat
): InningsState {
  const penaltyRuns = outcome.extras.penalty || 0;
  const next: InningsState = {
    ...current,
    extras: {
      wides: current.extras.wides + outcome.extras.wides,
      noBalls: current.extras.noBalls + outcome.extras.noBalls,
      byes: current.extras.byes + outcome.extras.byes,
      legByes: current.extras.legByes + outcome.extras.legByes,
      ...(current.extras.penalty !== undefined || penaltyRuns > 0
        ? { penalty: (current.extras.penalty || 0) + penaltyRuns }
        : {}),
      total: current.extras.total + outcome.totalRuns - outcome.runsOffBat,
    },
    totalRuns: current.totalRuns + outcome.totalRuns,
    recentBalls: [outcome, ...current.recentBalls.slice(0, 23)], // keep last 24 balls
    batters: current.batters.map((b) => ({ ...b })),
    bowlers: current.bowlers.map((bw) => ({ ...bw })),
    fallOfWickets: [...current.fallOfWickets],
  };

  // Update Free Hit status for ODI & T20I per ICC Playing Conditions Clause 21.19
  if (format === 'ODI' || format === 'T20I') {
    if (outcome.extras.noBalls > 0) {
      next.isFreeHit = true;
    } else if (current.isFreeHit && !outcome.isLegalDelivery) {
      // Wide on a Free Hit repeats the Free Hit
      next.isFreeHit = true;
    } else {
      next.isFreeHit = false;
    }
  }

  // Find or initialize striker and non-striker
  let striker = next.batters.find((b) => b.playerId === current.currentStrikerId);
  let nonStriker = next.batters.find((b) => b.playerId === current.currentNonStrikerId);

  // Update striker figures
  if (striker) {
    striker.runs += outcome.runsOffBat;
    // Only count balls faced if delivery was NOT a wide (no-balls count as balls faced)
    if (outcome.extras.wides === 0) {
      striker.balls += 1;
    }
    if (outcome.runsOffBat === 4) striker.fours += 1;
    if (outcome.runsOffBat === 6) striker.sixes += 1;
    striker.strikeRate = striker.balls > 0 ? Number(((striker.runs / striker.balls) * 100).toFixed(1)) : 0;
  }

  // Find or initialize bowler
  let bowler = next.bowlers.find((bw) => bw.playerId === current.currentBowlerId);
  if (!bowler) {
    bowler = {
      playerId: current.currentBowlerId,
      playerName: playerNames[current.currentBowlerId] || 'Bowler',
      overs: 0,
      ballsThisOver: 0,
      maidens: 0,
      runs: 0,
      wickets: 0,
      economy: 0,
      wides: 0,
      noBalls: 0,
      dots: 0,
    };
    next.bowlers.push(bowler);
  }

  // Bowler runs conceded: byes and leg-byes do NOT count against the bowler per Law 16
  const runsConcededThisBall = outcome.runsOffBat + outcome.extras.wides + outcome.extras.noBalls;
  bowler.runs += runsConcededThisBall;
  bowler.wides += outcome.extras.wides;
  bowler.noBalls += outcome.extras.noBalls;

  if (outcome.isLegalDelivery) {
    bowler.ballsThisOver += 1;
    if (outcome.totalRuns === 0 && !outcome.isWicket) {
      bowler.dots += 1;
    }
  }

  // Handle Wicket
  let wicketFell = false;
  let nonStrikerDismissed = false;

  if (outcome.isWicket && outcome.wicketDetails) {
    wicketFell = true;
    next.wickets += 1;

    // Bowler gets credit unless it was a RUN_OUT, OBSTRUCTING_FIELD, or HIT_BALL_TWICE
    const uncreditedDismissals: DismissalType[] = ['RUN_OUT', 'OBSTRUCTING_FIELD', 'HIT_BALL_TWICE', 'RETIRED_OUT', 'TIMED_OUT'];
    if (!uncreditedDismissals.includes(outcome.wicketDetails.type)) {
      bowler.wickets += 1;
    }

    // Check if dismissed batter was striker or non-striker
    const dismissedId = outcome.wicketDetails.dismissedPlayerId || current.currentStrikerId;
    nonStrikerDismissed = dismissedId === current.currentNonStrikerId && nonStriker !== undefined;

    if (nonStrikerDismissed && nonStriker) {
      nonStriker.dismissal = outcome.wicketDetails;
      nonStriker.isCurrentNonStriker = false;
    } else if (striker) {
      striker.dismissal = outcome.wicketDetails;
      striker.isCurrentStriker = false;
    }

    // Record Fall of Wicket with exact partnership runs and balls
    const lastFowScore = next.fallOfWickets.length > 0 ? next.fallOfWickets[next.fallOfWickets.length - 1].score : 0;
    const totalBatterBalls = next.batters.reduce((sum, b) => sum + b.balls, 0);
    const prevWicketBalls = current.lastWicketLegalBalls || 0;
    const dismissedBatterName = nonStrikerDismissed
      ? nonStriker?.playerName || 'Batter'
      : striker?.playerName || 'Batter';
    const fow: FallOfWicket = {
      wicketNumber: next.wickets,
      score: next.totalRuns,
      overs: Number(`${next.completedOvers}.${next.ballsInCurrentOver + (outcome.isLegalDelivery ? 1 : 0)}`),
      batterName: dismissedBatterName,
      partnershipRuns: next.totalRuns - lastFowScore,
      partnershipBalls: Math.max(0, totalBatterBalls - prevWicketBalls),
    };
    next.lastWicketLegalBalls = totalBatterBalls;
    next.fallOfWickets.push(fow);

    const maxWicketsForInnings = current.superOverNumber !== undefined ? 2 : Math.max(1, battingXI.length - 1);

    // If max wickets fallen (10 in normal innings, 2 in Super Over), team is all out
    if (next.wickets >= maxWicketsForInnings || next.wickets >= 10) {
      next.isAllOut = true;
      next.isCompleted = true;
    } else {
      // Bring in next batter from batting XI in sequence
      const alreadyBattedIds = new Set(next.batters.map((b) => b.playerId));
      const nextBatterId = battingXI.find((id) => !alreadyBattedIds.has(id));

      if (nextBatterId) {
        if (nonStrikerDismissed) {
          const newBatter: BatterInningsScore = {
            playerId: nextBatterId,
            playerName: playerNames[nextBatterId] || 'Batter',
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isCurrentStriker: false,
            isCurrentNonStriker: true,
          };
          next.batters.push(newBatter);
          next.currentNonStrikerId = nextBatterId;
          nonStriker = newBatter;
        } else {
          // MCC 2022 Law 18.11: Incoming batter takes strike regardless of whether batters crossed
          const newBatter: BatterInningsScore = {
            playerId: nextBatterId,
            playerName: playerNames[nextBatterId] || 'Batter',
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isCurrentStriker: true,
            isCurrentNonStriker: false,
          };
          next.batters.push(newBatter);
          next.currentStrikerId = nextBatterId;
          striker = newBatter;
        }
      } else {
        next.isAllOut = true;
        next.isCompleted = true;
      }
    }
  }

  // Handle Legal Ball & Over Progression
  let overFinished = false;
  if (outcome.isLegalDelivery) {
    next.ballsInCurrentOver += 1;
    if (next.ballsInCurrentOver >= 6) {
      next.completedOvers += 1;
      next.ballsInCurrentOver = 0;
      overFinished = true;
      next.lastCompletedOverBowlerId = current.currentBowlerId;

      // Update bowler complete over
      bowler.overs += 1;
      bowler.ballsThisOver = 0;

      // Accurate Maiden over calculation:
      // An over is a maiden if bowler conceded 0 runs across all deliveries in this over
      let runsConcededInCompletedOver = 0;
      let legalBallsFound = 0;
      for (const b of next.recentBalls) {
        runsConcededInCompletedOver += (b.runsOffBat + b.extras.wides + b.extras.noBalls);
        if (b.isLegalDelivery) {
          legalBallsFound++;
          if (legalBallsFound === 6) break;
        }
      }
      if (runsConcededInCompletedOver === 0 && legalBallsFound === 6) {
        bowler.maidens += 1;
      }
    }
  }

  // Recalculate bowler economy: (runs / balls) * 6
  const totalBowlerBalls = bowler.overs * 6 + bowler.ballsThisOver;
  bowler.economy = totalBowlerBalls > 0 ? Number(((bowler.runs / totalBowlerBalls) * 6).toFixed(2)) : 0;

  // Determine Strike Rotation:
  // Odd physical runs scored (off bat, byes, leg-byes, or extra runs run on a wide) rotate ends
  const extraWidePhysicalRuns =
    outcome.extras.wides > 1 && outcome.extras.wides !== 5 ? outcome.extras.wides - 1 : 0;
  const physicalRunsScored =
    outcome.runsOffBat + outcome.extras.byes + outcome.extras.legByes + extraWidePhysicalRuns;
  const oddRuns = physicalRunsScored % 2 === 1;

  if (oddRuns && !wicketFell) {
    const temp = next.currentStrikerId;
    next.currentStrikerId = next.currentNonStrikerId;
    next.currentNonStrikerId = temp;
  }

  // If over finished, batters swap ends for the new over (unless innings all out)
  if (overFinished && !next.isAllOut) {
    const temp = next.currentStrikerId;
    next.currentStrikerId = next.currentNonStrikerId;
    next.currentNonStrikerId = temp;
  }

  // Update striker / non-striker boolean flags in batters array
  next.batters.forEach((b) => {
    b.isCurrentStriker = b.playerId === next.currentStrikerId;
    b.isCurrentNonStriker = b.playerId === next.currentNonStrikerId;
  });

  // Check terminal conditions
  if (isInningsComplete(next, format)) {
    next.isCompleted = true;
  }

  return next;
}
