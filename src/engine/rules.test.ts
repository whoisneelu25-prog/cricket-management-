import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMaxOversPerBowler,
  getMaxOversPerInnings,
  isDeliveryLegal,
  isInningsComplete,
  calculateRunRate,
  calculateRequiredRunRate,
  applyBallToInnings
} from './rules';
import { InningsState, BallOutcome } from '../types/cricket';

test('format over limits are correct', () => {
  assert.equal(getMaxOversPerBowler('T20I'), 4);
  assert.equal(getMaxOversPerBowler('ODI'), 10);
  assert.equal(getMaxOversPerBowler('TEST'), Infinity);

  assert.equal(getMaxOversPerInnings('T20I'), 20);
  assert.equal(getMaxOversPerInnings('ODI'), 50);
  assert.equal(getMaxOversPerInnings('TEST'), Infinity);
});

test('legal delivery detection', () => {
  assert.equal(isDeliveryLegal({ wides: 0, noBalls: 0 }), true);
  assert.equal(isDeliveryLegal({ wides: 1, noBalls: 0 }), false);
  assert.equal(isDeliveryLegal({ wides: 0, noBalls: 1 }), false);
});

test('run rate and required run rate calculations', () => {
  // 50 runs in 5 overs (30 balls) = 10.00 rpo
  assert.equal(calculateRunRate(50, 5, 0), 10.0);
  // 10 runs in 1.3 overs (9 balls) = 6.67 rpo
  assert.equal(calculateRunRate(10, 1, 3), 6.67);

  // Target 180, current 100 in 10 overs (10 remaining) -> 80 runs in 10 overs = 8.00 rrr
  assert.equal(calculateRequiredRunRate(180, 100, 10, 0, 'T20I'), 8.0);
});

test('innings completion triggers at 10 wickets or target met', () => {
  const baseInnings: InningsState = {
    inningsNumber: 1,
    battingTeamId: 'IND',
    battingTeamName: 'India',
    bowlingTeamId: 'AUS',
    bowlingTeamName: 'Australia',
    totalRuns: 160,
    wickets: 9,
    completedOvers: 18,
    ballsInCurrentOver: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    batters: [],
    bowlers: [],
    currentStrikerId: 'p1',
    currentNonStrikerId: 'p2',
    currentBowlerId: 'b1',
    fallOfWickets: [],
    recentBalls: [],
  };

  assert.equal(isInningsComplete(baseInnings, 'T20I'), false);

  // 10 wickets = all out
  const allOut = { ...baseInnings, wickets: 10 };
  assert.equal(isInningsComplete(allOut, 'T20I'), true);

  // 20 completed overs in T20I = complete
  const maxOvers = { ...baseInnings, completedOvers: 20 };
  assert.equal(isInningsComplete(maxOvers, 'T20I'), true);

  // 2nd innings target achieved
  const targetMet = { ...baseInnings, targetRuns: 160, totalRuns: 161 };
  assert.equal(isInningsComplete(targetMet, 'T20I'), true);
});

test('applyBallToInnings handles single run strike rotation and legal ball progression', () => {
  const initialInnings: InningsState = {
    inningsNumber: 1,
    battingTeamId: 'IND',
    battingTeamName: 'India',
    bowlingTeamId: 'AUS',
    bowlingTeamName: 'Australia',
    totalRuns: 0,
    wickets: 0,
    completedOvers: 0,
    ballsInCurrentOver: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    batters: [
      {
        playerId: 'rohit',
        playerName: 'Rohit Sharma',
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isCurrentStriker: true,
        isCurrentNonStriker: false,
      },
      {
        playerId: 'virat',
        playerName: 'Virat Kohli',
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isCurrentStriker: false,
        isCurrentNonStriker: true,
      },
    ],
    bowlers: [],
    currentStrikerId: 'rohit',
    currentNonStrikerId: 'virat',
    currentBowlerId: 'starc',
    fallOfWickets: [],
    recentBalls: [],
  };

  const ball1: BallOutcome = {
    overNumber: 0,
    ballInOver: 1,
    runsOffBat: 1,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
    totalRuns: 1,
    isLegalDelivery: true,
    isWicket: false,
    strikerId: 'rohit',
    strikerName: 'Rohit Sharma',
    nonStrikerId: 'virat',
    nonStrikerName: 'Virat Kohli',
    bowlerId: 'starc',
    bowlerName: 'Mitchell Starc',
    commentary: 'Single taken.',
  };

  const updated1 = applyBallToInnings(
    initialInnings,
    ball1,
    ['rohit', 'virat', 'gill', 'surya'],
    { rohit: 'Rohit Sharma', virat: 'Virat Kohli', starc: 'Mitchell Starc' },
    'T20I'
  );

  // 1 run scored, totalRuns = 1
  assert.equal(updated1.totalRuns, 1);
  // Legal ball counted: 1 ball in current over
  assert.equal(updated1.ballsInCurrentOver, 1);
  // Odd runs rotate strike: virat is now striker, rohit is non-striker
  assert.equal(updated1.currentStrikerId, 'virat');
  assert.equal(updated1.currentNonStrikerId, 'rohit');
  // Rohit faced 1 ball and scored 1 run
  const rohitStats = updated1.batters.find((b) => b.playerId === 'rohit');
  assert.equal(rohitStats?.runs, 1);
  assert.equal(rohitStats?.balls, 1);
});

test('applyBallToInnings wide delivery does NOT increment legal balls', () => {
  const initialInnings: InningsState = {
    inningsNumber: 1,
    battingTeamId: 'IND',
    battingTeamName: 'India',
    bowlingTeamId: 'AUS',
    bowlingTeamName: 'Australia',
    totalRuns: 0,
    wickets: 0,
    completedOvers: 0,
    ballsInCurrentOver: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    batters: [
      {
        playerId: 'rohit',
        playerName: 'Rohit Sharma',
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isCurrentStriker: true,
        isCurrentNonStriker: false,
      },
    ],
    bowlers: [],
    currentStrikerId: 'rohit',
    currentNonStrikerId: 'virat',
    currentBowlerId: 'starc',
    fallOfWickets: [],
    recentBalls: [],
  };

  const wideBall: BallOutcome = {
    overNumber: 0,
    ballInOver: 1,
    runsOffBat: 0,
    extras: { wides: 1, noBalls: 0, byes: 0, legByes: 0 },
    totalRuns: 1,
    isLegalDelivery: false,
    isWicket: false,
    strikerId: 'rohit',
    strikerName: 'Rohit Sharma',
    nonStrikerId: 'virat',
    nonStrikerName: 'Virat Kohli',
    bowlerId: 'starc',
    bowlerName: 'Mitchell Starc',
    commentary: 'Wide ball.',
  };

  const updated = applyBallToInnings(
    initialInnings,
    wideBall,
    ['rohit', 'virat'],
    { rohit: 'Rohit Sharma', virat: 'Virat Kohli', starc: 'Mitchell Starc' },
    'T20I'
  );

  // Legal ball must still be 0
  assert.equal(updated.ballsInCurrentOver, 0);
  assert.equal(updated.totalRuns, 1);
  assert.equal(updated.extras.wides, 1);
  // Striker balls faced should NOT increment on wide
  const rohitStats = updated.batters.find((b) => b.playerId === 'rohit');
  assert.equal(rohitStats?.balls, 0);
});
