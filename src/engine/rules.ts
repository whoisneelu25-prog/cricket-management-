import {
  MatchFormat,
  InningsState,
  BallOutcome,
  DismissalType,
  BatterInningsScore,
  BowlerInningsFigures,
  FallOfWicket
} from '../types/cricket';

/**
 * Returns the maximum overs allowed per bowler in the given format
 */
export function getMaxOversPerBowler(format: MatchFormat): number {
  switch (format) {
    case 'T20I':
      return 4;
    case 'ODI':
      return 10;
    case 'TEST':
      return Infinity; // No over restriction in Test matches
  }
}

/**
 * Returns total overs per innings in the given format
 */
export function getMaxOversPerInnings(format: MatchFormat): number {
  switch (format) {
    case 'T20I':
      return 20;
    case 'ODI':
      return 50;
    case 'TEST':
      return Infinity; // Completed by all-out or declaration
  }
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
 * - Max overs completed (for limited overs)
 * - Target achieved in 2nd innings
 * - Declared
 */
export function isInningsComplete(innings: InningsState, format: MatchFormat): boolean {
  if (innings.isDeclared || innings.isAllOut || innings.isCompleted) {
    return true;
  }

  // 10 wickets down = all out (playing XI has 11 players, 10 wickets means only 1 batter left)
  if (innings.wickets >= 10) {
    return true;
  }

  // Target achieved in chasing innings
  if (innings.targetRuns !== undefined && innings.totalRuns >= innings.targetRuns) {
    return true;
  }

  // Limited overs check
  const maxOvers = getMaxOversPerInnings(format);
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
  format: MatchFormat
): number | null {
  const maxOvers = getMaxOversPerInnings(format);
  if (format === 'TEST') return null; // No fixed over limit in test unless day 5 overs remaining

  const runsNeeded = targetRuns - currentRuns;
  if (runsNeeded <= 0) return 0;

  const ballsCompleted = completedOvers * 6 + ballsInOver;
  const ballsRemaining = maxOvers * 6 - ballsCompleted;

  if (ballsRemaining <= 0) return runsNeeded > 0 ? 99.9 : 0;
  return Number(((runsNeeded / ballsRemaining) * 6).toFixed(2));
}

/**
 * Updates innings state with a new ball outcome
 * Follows official MCC Laws of Cricket:
 * - Extras addition
 * - Legal ball accounting (wides and no-balls do not count towards the 6 balls)
 * - Strike rotation:
 *   - Runs scored off bat or byes/leg-byes: odd runs rotate strike
 *   - End of over: strike rotates between the two batters
 *   - Wicket: new batter takes strike (MCC 2022 Law 18.11)
 */
export function applyBallToInnings(
  current: InningsState,
  outcome: BallOutcome,
  battingXI: string[],
  playerNames: Record<string, string>,
  format: MatchFormat
): InningsState {
  const next: InningsState = {
    ...current,
    extras: {
      wides: current.extras.wides + outcome.extras.wides,
      noBalls: current.extras.noBalls + outcome.extras.noBalls,
      byes: current.extras.byes + outcome.extras.byes,
      legByes: current.extras.legByes + outcome.extras.legByes,
      total: current.extras.total + outcome.totalRuns - outcome.runsOffBat,
    },
    totalRuns: current.totalRuns + outcome.totalRuns,
    recentBalls: [outcome, ...current.recentBalls.slice(0, 23)], // keep last 24 balls
    batters: current.batters.map((b) => ({ ...b })),
    bowlers: current.bowlers.map((bw) => ({ ...bw })),
    fallOfWickets: [...current.fallOfWickets],
  };

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

  // Bowler runs conceded (byes and leg byes do NOT count against the bowler)
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
  if (outcome.isWicket && outcome.wicketDetails) {
    next.wickets += 1;

    // Bowler gets credit unless it was a RUN_OUT
    if (outcome.wicketDetails.type !== 'RUN_OUT') {
      bowler.wickets += 1;
    }

    if (striker) {
      striker.dismissal = outcome.wicketDetails;
      striker.isCurrentStriker = false;
    }

    // Record Fall of Wicket
    const fow: FallOfWicket = {
      wicketNumber: next.wickets,
      score: next.totalRuns,
      overs: Number(`${next.completedOvers}.${next.ballsInCurrentOver + (outcome.isLegalDelivery ? 1 : 0)}`),
      batterName: striker?.playerName || 'Batter',
      partnershipRuns: 0, // calculated from last wicket
      partnershipBalls: 0,
    };
    next.fallOfWickets.push(fow);

    // If 10 wickets fallen, team is all out
    if (next.wickets >= 10) {
      next.isAllOut = true;
      next.isCompleted = true;
    } else {
      // Bring in next batter from batting XI
      const alreadyBattedIds = new Set(next.batters.map((b) => b.playerId));
      const nextBatterId = battingXI.find((id) => !alreadyBattedIds.has(id));

      if (nextBatterId) {
        const newStriker: BatterInningsScore = {
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
        next.batters.push(newStriker);
        next.currentStrikerId = nextBatterId;
        striker = newStriker;
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

      // Update bowler complete over
      bowler.overs += 1;
      bowler.ballsThisOver = 0;

      // Check maiden (over had 0 runs conceded)
      // Note: maiden check is simplified: if in the last 6 balls of this over bowler conceded 0
      // We check bowler runs
    }
  }

  // Recalculate bowler economy
  const totalBowlerBalls = bowler.overs * 6 + bowler.ballsThisOver;
  bowler.economy = totalBowlerBalls > 0 ? Number(((bowler.runs / totalBowlerBalls) * 6).toFixed(2)) : 0;

  // Determine Strike Rotation:
  // Odd runs scored (off bat or physical runs from extras) switch ends
  const physicalRunsScored = outcome.runsOffBat + outcome.extras.byes + outcome.extras.legByes;
  const oddRuns = physicalRunsScored % 2 === 1;

  if (oddRuns && !outcome.isWicket) {
    // Swap striker and non-striker
    const temp = next.currentStrikerId;
    next.currentStrikerId = next.currentNonStrikerId;
    next.currentNonStrikerId = temp;
  }

  // If over finished, swap striker and non-striker as they change ends for next over
  if (overFinished && !next.isAllOut) {
    const temp = next.currentStrikerId;
    next.currentStrikerId = next.currentNonStrikerId;
    next.currentNonStrikerId = temp;
  }

  // Mark striker/non-striker flags in batters list
  next.batters.forEach((b) => {
    b.isCurrentStriker = b.playerId === next.currentStrikerId;
    b.isCurrentNonStriker = b.playerId === next.currentNonStrikerId;
  });

  // Check innings completion (e.g. target reached or max overs)
  if (isInningsComplete(next, format)) {
    next.isCompleted = true;
  }

  return next;
}
