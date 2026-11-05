import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CareerSave,
  Match,
  MatchFormat,
  Player,
  FormatSquadConfig,
} from '../types/cricket';
import {
  createNewCareerSave,
  migrateCareerSave,
  addPlayerToFormatSquad,
  removePlayerFromFormatSquad,
  setFormatCaptain,
  setFormatViceCaptain,
  setFormatWicketKeeper,
  setFormatTargetSquadSize,
  validateUserManagementAction,
} from '../store/careerStore';
import { getNationFormatSelectionData } from '../data/formatSquadsData';
import {
  initializeDetailedTeamRankings,
  getSortedTeamRankingEntries,
  updateTeamRankingsAfterMatch,
  computeAllPlayerRankings,
  createTeamRankingSnapshot,
} from './rankingEngine';
import {
  validateCustomTourSchedule,
  scheduleCustomInternationalTour,
  computeTourDetailedStatistics,
  getTourProgressionStage,
} from './tourEngine';
import { getEffectivePlayersByCountry } from '../data/squads';

test('1. Team Rankings: Deterministic calculations, ordering & snapshot history', () => {
  const career = createNewCareerSave('Test Coach', 'IND', 'TEST', 'INTERNATIONAL', 'TACTICAL');

  assert.ok(career.teamRankings, 'teamRankings should be initialized');
  assert.ok(career.rankingHistory && career.rankingHistory.length > 0, 'rankingHistory should have initial snapshot');

  // Initial ranking ordering
  const testRankings = getSortedTeamRankingEntries(career.teamRankings, 'TEST');
  assert.ok(testRankings.length >= 10, 'There should be at least 10 ranked Test teams');
  assert.equal(testRankings[0].position, 1, 'First team should be rank #1');

  // Simulate a match result where IND beats AUS in a Test match
  const mockMatch: Match = {
    id: 'test_match_ind_aus',
    tourId: 'ind_aus_tour',
    seriesName: 'Border-Gavaskar Trophy',
    format: 'TEST',
    homeTeamId: 'IND',
    awayTeamId: 'AUS',
    venue: 'Wankhede Stadium, Mumbai',
    date: '2026-12-01',
    status: 'COMPLETED',
    resultText: 'India won by 150 runs',
    winnerTeamId: 'IND',
    homeCaptainId: 'p_ind_1',
    awayCaptainId: 'p_aus_1',
    homeWicketKeeperId: 'p_ind_wk',
    awayWicketKeeperId: 'p_aus_wk',
    homeXI: ['p_ind_1'],
    awayXI: ['p_aus_1'],
    innings: [
      {
        inningsNumber: 1,
        battingTeamId: 'IND',
        battingTeamName: 'India',
        bowlingTeamId: 'AUS',
        bowlingTeamName: 'Australia',
        totalRuns: 350,
        wickets: 10,
        completedOvers: 95,
        ballsInCurrentOver: 2,
        extras: { wides: 0, noBalls: 0, byes: 4, legByes: 2, total: 6 },
        isDeclared: false,
        batters: [
          { playerId: 'p_ind_1', playerName: 'Rohit Sharma', runs: 120, balls: 180, fours: 12, sixes: 3, strikeRate: 66.7, isCurrentStriker: false, isCurrentNonStriker: false } as any,
        ],
        bowlers: [
          { playerId: 'p_aus_star', playerName: 'Mitchell Starc', overs: 22, maidens: 3, runs: 75, wickets: 4, ballsThisOver: 0, economy: 3.41, wides: 0, noBalls: 0, dots: 70 } as any,
        ],
      } as any,
      {
        inningsNumber: 2,
        battingTeamId: 'AUS',
        battingTeamName: 'Australia',
        bowlingTeamId: 'IND',
        bowlingTeamName: 'India',
        totalRuns: 200,
        wickets: 10,
        completedOvers: 68,
        ballsInCurrentOver: 4,
        extras: { wides: 2, noBalls: 1, byes: 0, legByes: 1, total: 4 },
        isDeclared: false,
        batters: [],
        bowlers: [
          { playerId: 'p_ind_bum', playerName: 'Jasprit Bumrah', overs: 18, maidens: 5, runs: 45, wickets: 5, ballsThisOver: 0, economy: 2.5, wides: 0, noBalls: 0, dots: 65 } as any,
        ],
      } as any,
    ],
  } as unknown as Match;

  const initialIndPoints = career.teamRankings['IND'].ratingPoints.TEST;
  const initialAusPoints = career.teamRankings['AUS'].ratingPoints.TEST;

  const result = updateTeamRankingsAfterMatch(career, mockMatch);
  assert.ok(result.updatedRankings, 'Rankings should be updated');
  assert.ok(result.snapshot, 'Snapshot must be produced');

  // IND points should increase or remain strong, AUS points should decrease or drop relative
  const updatedIndPoints = result.updatedRankings['IND'].ratingPoints.TEST;
  assert.ok(
    updatedIndPoints >= initialIndPoints,
    `India rating points should increase or hold on victory (was ${initialIndPoints}, now ${updatedIndPoints})`
  );
  assert.ok(result.snapshot.rankings.TEST.length >= 10, 'Snapshot must capture all ranked teams');
});

test('2. Player Rankings: 9 format-specific tables and minimum eligibility filtering', () => {
  const career = createNewCareerSave('Test Coach', 'IND', 'TEST', 'INTERNATIONAL', 'TACTICAL');

  const playerRankingsState = computeAllPlayerRankings(career);
  assert.ok(playerRankingsState.rankings, 'Player rankings state should exist');

  // Formats: TEST, ODI, T20I
  for (const fmt of ['TEST', 'ODI', 'T20I'] as MatchFormat[]) {
    assert.ok(playerRankingsState.rankings[fmt], `${fmt} table must exist`);
    assert.ok(playerRankingsState.rankings[fmt].BATTER.length > 0, `${fmt} Batters must have entries`);
    assert.ok(playerRankingsState.rankings[fmt].BOWLER.length > 0, `${fmt} Bowlers must have entries`);
    assert.ok(playerRankingsState.rankings[fmt].ALL_ROUNDER.length > 0, `${fmt} All-Rounders must have entries`);

    // Verify ordering
    const topBatters = playerRankingsState.rankings[fmt].BATTER.filter((b) => b.isEligible);
    for (let i = 0; i < topBatters.length - 1; i++) {
      assert.ok(
        topBatters[i].rating >= topBatters[i + 1].rating,
        `Batters should be ordered descending by rating in ${fmt}`
      );
    }
  }

  // Minimum eligibility check
  const strictFilterRankings = computeAllPlayerRankings(career, { TEST: 20 });
  const qualifiedTestBatters = strictFilterRankings.rankings.TEST.BATTER.filter((b) => b.isEligible);
  assert.ok(qualifiedTestBatters.length > 0, 'There should be qualified Test batters with >= 20 matches');
  for (const b of qualifiedTestBatters) {
    assert.ok(b.matchesPlayed >= 20, `Player ${b.playerName} must have at least 20 matches`);
  }
});

test('3. International Tours: Scheduling, conflict validation, standings & statistics', () => {
  const career = createNewCareerSave('Test Coach', 'IND', 'TEST', 'INTERNATIONAL', 'TACTICAL');

  // Validate conflict detection
  const conflictCheck = validateCustomTourSchedule(
    career,
    'IND',
    'IND', // Same team!
    '2027-05-01',
    { tests: 2, odis: 3, t20is: 3 }
  );
  assert.equal(conflictCheck.valid, false, 'Same team tour must be invalid');

  // Valid tour creation
  const validSchedule = validateCustomTourSchedule(
    career,
    'IND',
    'ENG',
    '2027-11-01',
    { tests: 3, odis: 3, t20is: 3 }
  );
  assert.equal(validSchedule.valid, true, 'Valid schedule must pass validation');

  const { updatedCareer, createdTour } = scheduleCustomInternationalTour(
    career,
    'IND',
    'ENG',
    '2027-11-01',
    { tests: 3, odis: 3, t20is: 3 }
  );

  assert.ok(createdTour, 'Tour should be created successfully');
  assert.equal(createdTour.hostTeamId, 'IND');
  assert.equal(createdTour.visitingTeamId, 'ENG');
  assert.ok(createdTour.series.TEST, 'Test series must be created');
  assert.ok(createdTour.series.ODI, 'ODI series must be created');
  assert.ok(createdTour.series.T20I, 'T20I series must be created');

  // Test 10-step progression stage
  const progression = getTourProgressionStage(createdTour, updatedCareer.fixtures, '2026-11-15');
  assert.ok(progression.stageIndex >= 1 && progression.stageIndex <= 10, 'Stage index must be between 1 and 10');
  assert.ok(progression.label, 'Stage label must be provided');

  // Completed tour statistics extraction
  const mockCompletedTourMatch: Match = {
    id: `tour_m_${createdTour.id}_1`,
    tourId: createdTour.id,
    seriesName: createdTour.name,
    format: 'TEST',
    homeTeamId: 'IND',
    awayTeamId: 'ENG',
    venue: 'Eden Gardens, Kolkata',
    date: '2027-11-02',
    status: 'COMPLETED',
    resultText: 'India won by an innings and 45 runs',
    winnerTeamId: 'IND',
    homeCaptainId: 'p1',
    awayCaptainId: 'p2',
    homeWicketKeeperId: 'pwk1',
    awayWicketKeeperId: 'pwk2',
    homeXI: ['p_ind_virat'],
    awayXI: ['p_eng_root'],
    innings: [
      {
        inningsNumber: 1,
        battingTeamId: 'IND',
        battingTeamName: 'India',
        bowlingTeamId: 'ENG',
        bowlingTeamName: 'England',
        totalRuns: 480,
        wickets: 10,
        completedOvers: 130,
        ballsInCurrentOver: 0,
        extras: { wides: 0, noBalls: 0, byes: 4, legByes: 2, total: 6 },
        isDeclared: false,
        batters: [
          { playerId: 'p_ind_virat', playerName: 'Virat Kohli', runs: 165, balls: 240, fours: 18, sixes: 2, strikeRate: 68.75, isCurrentStriker: false, isCurrentNonStriker: false } as any,
        ],
        bowlers: [],
      } as any,
      {
        inningsNumber: 2,
        battingTeamId: 'ENG',
        battingTeamName: 'England',
        bowlingTeamId: 'IND',
        bowlingTeamName: 'India',
        totalRuns: 210,
        wickets: 10,
        completedOvers: 72,
        ballsInCurrentOver: 0,
        extras: { wides: 2, noBalls: 0, byes: 0, legByes: 0, total: 2 },
        isDeclared: false,
        batters: [],
        bowlers: [
          { playerId: 'p_ind_ashwin', playerName: 'Ravichandran Ashwin', overs: 24, maidens: 6, runs: 58, wickets: 6, ballsThisOver: 0, economy: 2.41, wides: 0, noBalls: 0, dots: 85 } as any,
        ],
      } as any,
    ],
  } as unknown as Match;

  const detailedStats = computeTourDetailedStatistics(createdTour, [mockCompletedTourMatch]);
  assert.equal(detailedStats.matchesPlayed, 1, '1 completed match should be tracked');
  assert.equal(detailedStats.leadingRunScorer?.playerName, 'Virat Kohli');
  assert.equal(detailedStats.leadingRunScorer?.runs, 165);
  assert.equal(detailedStats.leadingWicketTaker?.playerName, 'Ravichandran Ashwin');
  assert.equal(detailedStats.leadingWicketTaker?.wickets, 6);
});

test('4. Format Squad Independence: Modifying ODI squad NEVER affects Test or T20I squads', () => {
  let career = createNewCareerSave('Test Coach', 'IND', 'TEST', 'INTERNATIONAL', 'TACTICAL');
  career = setFormatTargetSquadSize(career, 'ODI', 18);
  const indPool = getEffectivePlayersByCountry('IND', career, true);

  const initialTestSquad = [...career.formatSquads.TEST.squadPlayerIds];
  const initialT20Squad = [...career.formatSquads.T20I.squadPlayerIds];
  const initialOdiSquad = [...career.formatSquads.ODI.squadPlayerIds];

  // Pick a player in the ODI selection pool not yet in ODI squad to add
  const odiPoolData = getNationFormatSelectionData('IND', 'ODI');
  const candidateId = (odiPoolData?.poolPlayerIds || []).find((id) => !initialOdiSquad.includes(id)) ||
    (indPool.find((p) => !initialOdiSquad.includes(p.id)) || indPool[indPool.length - 1]).id;
  const candidate = indPool.find((p) => p.id === candidateId) || indPool[0];

  // Add to ODI squad
  const { updatedCareer: afterAdd } = addPlayerToFormatSquad(career, 'ODI', candidate.id);
  assert.ok(afterAdd.formatSquads.ODI.squadPlayerIds.includes(candidate.id), 'Candidate must be in ODI squad');

  // Verify TEST and T20I were completely untouched
  assert.deepEqual(afterAdd.formatSquads.TEST.squadPlayerIds, initialTestSquad, 'TEST squad must NOT change when ODI changes');
  assert.deepEqual(afterAdd.formatSquads.T20I.squadPlayerIds, initialT20Squad, 'T20I squad must NOT change when ODI changes');

  // Set distinct Captains for each format
  const capTest = indPool[0].id;
  const capOdi = indPool[1].id;
  const capT20 = indPool[2].id;

  let c = setFormatCaptain(afterAdd, 'TEST', capTest);
  c = setFormatCaptain(c, 'ODI', capOdi);
  c = setFormatCaptain(c, 'T20I', capT20);

  assert.equal(c.formatSquads.TEST.captainId, capTest);
  assert.equal(c.formatSquads.ODI.captainId, capOdi);
  assert.equal(c.formatSquads.T20I.captainId, capT20);

  // Set distinct target squad sizes
  let sizeCareer = setFormatTargetSquadSize(c, 'TEST', 20);
  sizeCareer = setFormatTargetSquadSize(sizeCareer, 'ODI', 15);
  sizeCareer = setFormatTargetSquadSize(sizeCareer, 'T20I', 16);

  assert.equal(sizeCareer.formatSquads.TEST.targetSquadSize, 20);
  assert.equal(sizeCareer.formatSquads.ODI.targetSquadSize, 15);
  assert.equal(sizeCareer.formatSquads.T20I.targetSquadSize, 16);
});

test('5. Single-Country Career Guard: Non-managed nations are strictly read-only', () => {
  const career = createNewCareerSave('Test Coach', 'IND', 'TEST', 'INTERNATIONAL', 'TACTICAL');

  const userAction = validateUserManagementAction(career, 'IND');
  assert.equal(userAction.allowed, true, 'User must be permitted to manage India');

  const aiAction = validateUserManagementAction(career, 'AUS');
  assert.equal(aiAction.allowed, false, 'User must NOT be permitted to modify Australia');
  assert.ok(aiAction.reason && aiAction.reason.includes('Permission denied'), 'Action must return permission denied reason');
});

test('6. Safe Migration: Preserves progression and initializes missing schemas on legacy saves', () => {
  const legacySave: any = {
    id: 'legacy_career_save_123',
    selectedTeamId: 'IND',
    currentDate: '2026-11-20',
    manager: {
      name: 'Legacy Coach',
      boardConfidence: 82,
      matchesManaged: 14,
      matchesWon: 9,
      matchesLost: 3,
      matchesDrawn: 2,
    },
    // Missing rankingHistory, playerRankings, notifications, teamMorale, targetSquadSize
  };

  const migrated = migrateCareerSave(legacySave);

  assert.equal(migrated.selectedTeamId, 'IND');
  assert.equal(migrated.manager.name, 'Legacy Coach');
  assert.ok(migrated.formatSquads.TEST.targetSquadSize, 'targetSquadSize must be set for TEST');
  assert.ok(migrated.formatSquads.ODI.targetSquadSize, 'targetSquadSize must be set for ODI');
  assert.ok(migrated.formatSquads.T20I.targetSquadSize, 'targetSquadSize must be set for T20I');
  assert.ok(migrated.teamRankings, 'teamRankings must be populated');
  assert.ok(migrated.rankingHistory && migrated.rankingHistory.length > 0, 'rankingHistory must have initial snapshot');
  assert.ok(migrated.playerRankings, 'playerRankings must be computed');
  assert.ok(Array.isArray(migrated.notifications), 'notifications must be initialized as an array');
  assert.ok(typeof migrated.teamMorale === 'number', 'teamMorale must be initialized as a number');
});
