import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInternationalCalendar } from './calendarEngine';
import { simulateWorldMatchesUntil, recordMatchInTournamentTable, computeTournamentTable } from './worldSimulation';
import { CareerSave } from '../types/cricket';
import { getDefaultFormatSquadConfig, getDefaultSupportStaff } from '../data/squads';
import { INITIAL_TOURNAMENTS } from '../data/tournaments';

test('buildInternationalCalendar generates user matches, world matches, and tour deadlines', () => {
  const { events, userMatches, worldMatches } = buildInternationalCalendar('IND');

  assert.ok(userMatches.length >= 3, 'Should generate at least 3 user matches');
  assert.ok(worldMatches.length >= 2, 'Should generate at least 2 world matches among other nations');
  assert.ok(events.length >= 5, 'Should generate calendar events');

  // Verify none of worldMatches have IND as a participant
  worldMatches.forEach((wm) => {
    assert.notEqual(wm.homeTeamId, 'IND');
    assert.notEqual(wm.awayTeamId, 'IND');
  });

  // Verify user matches have IND
  userMatches.forEach((um) => {
    assert.ok(um.homeTeamId === 'IND' || um.awayTeamId === 'IND');
  });
});

test('simulateWorldMatchesUntil simulates scheduled world matches up to target date', () => {
  const { userMatches, worldMatches, events } = buildInternationalCalendar('IND');

  const mockCareer: CareerSave = {
    id: 'test_career',
    version: 1,
    saveName: 'Test Career',
    savedAt: new Date().toISOString(),
    manager: {
      name: 'Manager Test',
      nationality: 'India',
      preferredFormat: 'TEST',
      coachingExperience: 'INTERNATIONAL',
      managementStyle: 'TACTICAL',
      difficulty: 'NORMAL',
      reputation: 80,
      boardConfidence: 80,
      trophies: [],
      matchesManaged: 0,
      matchesWon: 0,
      matchesLost: 0,
      matchesDrawn: 0,
    },
    supportStaff: getDefaultSupportStaff('IND'),
    selectedTeamId: 'IND',
    currentDate: '2026-11-15',
    currentDayIndex: 0,
    currentTourId: 'tour_bgt_2026_27',
    formatSquads: {
      TEST: getDefaultFormatSquadConfig('IND', 'TEST'),
      ODI: getDefaultFormatSquadConfig('IND', 'ODI'),
      T20I: getDefaultFormatSquadConfig('IND', 'T20I'),
    },
    fixtures: userMatches,
    worldFixtures: worldMatches,
    tours: [],
    calendar: events,
    news: [],
    dataProvenance: {
      lastDatabaseUpdate: '2026-11-01',
      playerCount: 60,
      teamCount: 12,
      historicalMatchCount: 450,
      sources: [],
      missingRecords: [],
      validationChecksPassed: 10,
      validationChecksTotal: 10,
    },
  };

  // Simulate until 2026-12-01 (should simulate world matches scheduled before Dec 1)
  const result = simulateWorldMatchesUntil(mockCareer, '2026-12-01');

  assert.ok(result.simulatedMatches.length > 0, 'Should have simulated matches up to 2026-12-01');
  assert.equal(result.updatedCareer.currentDate, '2026-12-01');

  result.simulatedMatches.forEach((sm) => {
    assert.ok(sm.status === 'COMPLETED' || sm.status === 'DRAW' || sm.status === 'TIE');
    assert.ok(sm.innings.length > 0);
  });
});

test('recordMatchInTournamentTable calculates points and WTC PCT%', () => {
  const table = INITIAL_TOURNAMENTS[0].table;
  const mockCompletedTestMatch = {
    id: 'test_m1',
    format: 'TEST' as const,
    homeTeamId: 'AUS',
    awayTeamId: 'ENG',
    venue: 'MCG',
    pitch: { name: 'Pitch', type: 'SPORTING_BALANCED' as const, paceBonus: 0, spinBonus: 0, bounceVariation: 0, wearFactor: 0 },
    weather: { type: 'SUNNY' as const, swingBonus: 0, description: 'Sunny' },
    dayNumber: 4,
    sessionNumber: 3,
    status: 'COMPLETED' as const,
    currentInningsIndex: 1,
    innings: [
      {
        inningsNumber: 1,
        battingTeamId: 'ENG',
        battingTeamName: 'England',
        bowlingTeamId: 'AUS',
        bowlingTeamName: 'Australia',
        totalRuns: 200,
        wickets: 10,
        completedOvers: 60,
        ballsInCurrentOver: 0,
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
        batters: [],
        bowlers: [],
        currentStrikerId: '',
        currentNonStrikerId: '',
        currentBowlerId: '',
        fallOfWickets: [],
        recentBalls: [],
      },
      {
        inningsNumber: 2,
        battingTeamId: 'AUS',
        battingTeamName: 'Australia',
        bowlingTeamId: 'ENG',
        bowlingTeamName: 'England',
        totalRuns: 204,
        wickets: 4,
        completedOvers: 55,
        ballsInCurrentOver: 0,
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
        batters: [],
        bowlers: [],
        currentStrikerId: '',
        currentNonStrikerId: '',
        currentBowlerId: '',
        fallOfWickets: [],
        recentBalls: [],
      },
    ],
    homeXI: [],
    awayXI: [],
    homeCaptainId: '',
    awayCaptainId: '',
    homeWicketKeeperId: '',
    awayWicketKeeperId: '',
    userTeamId: 'IND',
    isUserMatch: false,
    userTactics: { battingAggression: 'BALANCED' as const, bowlingTactic: 'BALANCED_CONTAIN' as const, fieldPreset: 'BALANCED_STANDARD' as const },
    aiTactics: { battingAggression: 'BALANCED' as const, bowlingTactic: 'BALANCED_CONTAIN' as const, fieldPreset: 'BALANCED_STANDARD' as const },
  };

  const updatedTable = recordMatchInTournamentTable(table, mockCompletedTestMatch);
  const ausEntry = updatedTable.find((e) => e.teamId === 'AUS');
  assert.ok(ausEntry);
  assert.equal(ausEntry.played, 13);
  assert.equal(ausEntry.won, 9);
  assert.equal(ausEntry.points, 102);
});

test('computeTournamentTable correctly sorts table by WTC PCT%', () => {
  const baseTable = INITIAL_TOURNAMENTS[0].table;
  const sorted = computeTournamentTable(baseTable, 'TEST', []);
  assert.ok(sorted.length > 0);
  // Verify order is non-increasing by pointsPercentage
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i].pointsPercentage || 0;
    const next = sorted[i + 1].pointsPercentage || 0;
    assert.ok(current >= next, `Expected ${current} >= ${next} at index ${i}`);
  }
});
