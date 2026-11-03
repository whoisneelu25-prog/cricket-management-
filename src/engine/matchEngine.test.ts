import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialInningsState,
  stepMatchBall,
  stepMatchOver,
  simulateFullMatch,
  computeMatchResult
} from './matchEngine';
import { Match } from '../types/cricket';
import { getDefaultPlayingXI } from '../data/squads';
import { VENUES } from '../data/venues';

test('matchEngine runs full T20 match to completion with realistic outcome', () => {
  const homeXI = getDefaultPlayingXI('IND');
  const awayXI = getDefaultPlayingXI('AUS');

  const testMatch: Match = {
    id: 'test_t20_1',
    format: 'T20I',
    seriesName: 'T20 Showcase',
    homeTeamId: 'IND',
    awayTeamId: 'AUS',
    venue: VENUES[0].name,
    pitch: VENUES[0].pitch,
    weather: VENUES[0].weather,
    dayNumber: 1,
    sessionNumber: 3,
    status: 'IN_PROGRESS',
    currentInningsIndex: 0,
    innings: [
      createInitialInningsState(
        1,
        'IND',
        'India',
        'AUS',
        'Australia',
        homeXI,
        awayXI
      ),
    ],
    homeXI,
    awayXI,
    homeCaptainId: homeXI[0],
    awayCaptainId: awayXI[0],
    homeWicketKeeperId: homeXI[3],
    awayWicketKeeperId: awayXI[3],
    userTeamId: 'IND',
    userTactics: {
      battingAggression: 'BALANCED',
      bowlingTactic: 'BALANCED_CONTAIN',
      fieldPreset: 'BALANCED_STANDARD',
    },
    aiTactics: {
      battingAggression: 'BALANCED',
      bowlingTactic: 'BALANCED_CONTAIN',
      fieldPreset: 'BALANCED_STANDARD',
    },
  };

  // Run full match
  const completedMatch = simulateFullMatch(testMatch);

  assert.equal(completedMatch.status, 'COMPLETED');
  assert.equal(completedMatch.innings.length, 2);
  assert.ok(completedMatch.resultText && completedMatch.resultText.length > 5);
  assert.ok(completedMatch.playerOfTheMatch);
  assert.ok(completedMatch.innings[0].totalRuns > 50);
  assert.ok(completedMatch.innings[1].totalRuns > 0);
});
