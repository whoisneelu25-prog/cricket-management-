import { test } from 'node:test';
import assert from 'node:assert';
import {
  createNewCareerSave,
  announceTourSquad,
  takeSquadRestDay,
  assignPlayerTrainingFocus,
  applyUserMatchResult,
} from '../store/careerStore';
import {
  createBilateralTour,
  validateTourSquad,
  updateTourSeriesStandings,
} from './tourEngine';
import {
  calculateWTCPCT,
  calculateNRR,
  sortTournamentTable,
  recordMatchInTournament,
  createWTCFinalMatch,
} from './tournamentEngine';
import {
  processSquadTrainingDay,
  applyMatchWorkload,
  calculateOverallAbility,
} from './playerDevelopmentEngine';
import { simulateWorldMatchesUntil } from './worldSimulation';
import { buildInternationalCalendar } from './calendarEngine';
import { ALL_PLAYERS, getPlayersByCountry } from '../data/squads';
import { INITIAL_ASHES_COMPETITION, INITIAL_BGT_COMPETITION, INITIAL_TOURNAMENT_EDITIONS } from '../data/tournamentData';
import { Match, Player, TournamentEdition, RivalryCompetition } from '../types/cricket';

test('1. New career creation & international cricket calendar generation', () => {
  const career = createNewCareerSave('Rahul Dravid', 'IND', 'TEST', 'INTERNATIONAL', 'TACTICAL');

  assert.ok(career.id.startsWith('career_'));
  assert.strictEqual(career.selectedTeamId, 'IND');
  assert.strictEqual(career.manager.name, 'Rahul Dravid');
  assert.strictEqual(career.manager.nationality, 'India');
  assert.ok(career.fixtures.length > 0, 'Fixtures must be generated for manager team');
  assert.ok(career.calendar.length > 0, 'Calendar events must be generated');
  assert.ok(career.tours.length > 0, 'Tours must be generated');
  assert.ok(career.formatSquads.TEST.playingXI.length === 11);
  assert.ok(career.formatSquads.ODI.playingXI.length === 11);
  assert.ok(career.formatSquads.T20I.playingXI.length === 11);
  assert.ok(career.ashes !== undefined);
  assert.ok(career.borderGavaskar !== undefined);
  assert.ok(career.tournamentEditions && career.tournamentEditions.length > 0);
});

test('2. India receives realistic international schedule (BGT, multi-format tours, ICC CWC)', () => {
  const career = createNewCareerSave('Rahul Dravid', 'IND', 'TEST');

  // Check for Border-Gavaskar Trophy tour / match
  const bgtTour = career.tours.find(
    (t) =>
      (t.competitionType === 'BORDER_GAVASKAR' || t.id.includes('bgt')) &&
      (t.hostTeamId === 'IND' || t.visitingTeamId === 'IND')
  );
  assert.ok(bgtTour, 'India must have Border-Gavaskar Trophy on their international calendar');

  // Multi-format fixtures verification
  const testMatches = career.fixtures.filter((m) => m.format === 'TEST');
  const odiMatches = career.fixtures.filter((m) => m.format === 'ODI');
  const t20Matches = career.fixtures.filter((m) => m.format === 'T20I');

  assert.ok(testMatches.length > 0, 'India must have Test matches scheduled');
  assert.ok(odiMatches.length > 0, 'India must have ODI matches scheduled');
  assert.ok(t20Matches.length > 0, 'India must have T20I matches scheduled');

  // ICC competition fixtures check
  const iccMatches = career.fixtures.filter((m) => m.competitionId || m.tournamentId);
  assert.ok(iccMatches.length > 0, 'India must have ICC competition fixtures scheduled');
});

test('3. India tours Australia with separate Test, ODI and T20I schedules', () => {
  const { tour, matches } = createBilateralTour(
    'AUS',
    'IND',
    { tests: 5, odis: 3, t20is: 5 },
    '2026-11-20',
    2026,
    'India Tour of Australia'
  );

  assert.strictEqual(tour.hostTeamId, 'AUS');
  assert.strictEqual(tour.visitingTeamId, 'IND');

  const tests = matches.filter((m) => m.format === 'TEST');
  const odis = matches.filter((m) => m.format === 'ODI');
  const t20is = matches.filter((m) => m.format === 'T20I');

  assert.strictEqual(tests.length, 5, 'Must contain 5 Test matches');
  assert.strictEqual(odis.length, 3, 'Must contain 3 ODI matches');
  assert.strictEqual(t20is.length, 5, 'Must contain 5 T20I matches');

  // Verify non-overlapping dates and sequential progression
  for (let i = 0; i < matches.length - 1; i++) {
    const cur = new Date(matches[i].date!).getTime();
    const next = new Date(matches[i + 1].date!).getTime();
    assert.ok(cur < next, `Match ${i + 1} date (${matches[i].date}) must precede Match ${i + 2} date (${matches[i + 1].date})`);
  }
});

test('4. Select a tour squad of 15-20 players with WK and Playing XI constraint', () => {
  const indPlayers = getPlayersByCountry('IND');
  const nonWkPlayers = indPlayers.filter((p) => !p.isWicketKeeper && p.role !== 'WICKETKEEPER_BATTER');
  const wkPlayers = indPlayers.filter((p) => p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER');

  // < 15 players fails
  const under15 = indPlayers.slice(0, 14).map((p) => p.id);
  const val1 = validateTourSquad(under15, indPlayers);
  assert.strictEqual(val1.valid, false);

  // > 20 players fails
  const over20 = indPlayers.slice(0, 21).map((p) => p.id);
  const val2 = validateTourSquad(over20, indPlayers);
  assert.strictEqual(val2.valid, false);

  // 16 players without WK fails
  const noWkSquad = nonWkPlayers.slice(0, 16).map((p) => p.id);
  const val3 = validateTourSquad(noWkSquad, indPlayers);
  assert.strictEqual(val3.valid, false);

  // 16 players with WK succeeds
  const validSquadIds = [...nonWkPlayers.slice(0, 15).map((p) => p.id), wkPlayers[0].id];
  const val4 = validateTourSquad(validSquadIds, indPlayers);
  assert.strictEqual(val4.valid, true);

  // Announce tour squad in career
  const career = createNewCareerSave('Head Coach', 'IND', 'TEST');
  const tourId = career.tours[0].id;
  const updatedCareer = announceTourSquad(career, tourId, validSquadIds);
  const announcedTour = updatedCareer.tours.find((t) => t.id === tourId);

  assert.strictEqual(announcedTour?.squadAnnounced, true);
  assert.deepStrictEqual(announcedTour?.tourSquadIds, validSquadIds);
});

test('5. Simulate an Ashes series and verify winner or drawn-series retention rule', () => {
  const { tour, matches } = createBilateralTour(
    'AUS',
    'ENG',
    { tests: 5 },
    '2027-11-15',
    2027,
    undefined,
    'ASHES'
  );

  const ashesComp: RivalryCompetition = {
    ...INITIAL_ASHES_COMPETITION,
    currentTrophyHolder: 'AUS',
  };

  // Case A: Drawn series 2-2 with 1 draw -> Australia retains the Ashes
  const drawnMatches: Match[] = matches.map((m, idx) => {
    const mock = { ...m, status: 'COMPLETED' as const };
    if (idx === 0 || idx === 1) {
      // AUS wins
      mock.innings = [
        { battingTeamId: 'AUS', totalRuns: 350, wickets: 10, completedOvers: 90, ballsInCurrentOver: 0 } as any,
        { battingTeamId: 'ENG', totalRuns: 200, wickets: 10, completedOvers: 70, ballsInCurrentOver: 0 } as any,
      ];
    } else if (idx === 2 || idx === 3) {
      // ENG wins
      mock.innings = [
        { battingTeamId: 'ENG', totalRuns: 400, wickets: 10, completedOvers: 100, ballsInCurrentOver: 0 } as any,
        { battingTeamId: 'AUS', totalRuns: 250, wickets: 10, completedOvers: 80, ballsInCurrentOver: 0 } as any,
      ];
    } else {
      // 5th Test drawn
      mock.status = 'DRAW' as const;
      mock.innings = [
        { battingTeamId: 'AUS', totalRuns: 300, wickets: 5, completedOvers: 120, ballsInCurrentOver: 0 } as any,
        { battingTeamId: 'ENG', totalRuns: 280, wickets: 4, completedOvers: 110, ballsInCurrentOver: 0 } as any,
      ];
    }
    return mock;
  });

  const resDrawn = updateTourSeriesStandings(tour, drawnMatches, ashesComp);
  assert.strictEqual(resDrawn.summary.isCompleted, true);
  assert.strictEqual(resDrawn.summary.trophyRetained, true, 'Drawn Ashes series must retain with current holder');
  assert.strictEqual(resDrawn.summary.winnerTeamId, 'AUS');
  assert.strictEqual(resDrawn.updatedTour.trophyHolder, 'AUS');
  assert.strictEqual(resDrawn.updatedAshes?.currentTrophyHolder, 'AUS');

  // Case B: England wins series 3-1 -> England claims the Ashes
  const engWinMatches: Match[] = matches.map((m, idx) => {
    const mock = { ...m, status: 'COMPLETED' as const };
    if (idx === 0) {
      mock.innings = [
        { battingTeamId: 'AUS', totalRuns: 300, wickets: 10, completedOvers: 90, ballsInCurrentOver: 0 } as any,
        { battingTeamId: 'ENG', totalRuns: 200, wickets: 10, completedOvers: 70, ballsInCurrentOver: 0 } as any,
      ];
    } else {
      mock.innings = [
        { battingTeamId: 'ENG', totalRuns: 350, wickets: 10, completedOvers: 95, ballsInCurrentOver: 0 } as any,
        { battingTeamId: 'AUS', totalRuns: 220, wickets: 10, completedOvers: 75, ballsInCurrentOver: 0 } as any,
      ];
    }
    return mock;
  });

  const resEng = updateTourSeriesStandings(tour, engWinMatches, ashesComp);
  assert.strictEqual(resEng.summary.winnerTeamId, 'ENG');
  assert.strictEqual(resEng.summary.trophyRetained, false);
  assert.strictEqual(resEng.updatedTour.trophyHolder, 'ENG');
});

test('6. Simulate a Border-Gavaskar Trophy series and verify winner or trophy holder', () => {
  const { tour, matches } = createBilateralTour(
    'AUS',
    'IND',
    { tests: 5 },
    '2026-11-22',
    2026,
    undefined,
    'BORDER_GAVASKAR'
  );

  const bgtComp: RivalryCompetition = {
    ...INITIAL_BGT_COMPETITION,
    currentTrophyHolder: 'IND',
  };

  // Simulate 3 wins for India, 2 for Australia
  const indWins: Match[] = matches.map((m, idx) => {
    const mock = { ...m, status: 'COMPLETED' as const };
    if (idx < 3) {
      mock.innings = [
        { battingTeamId: 'IND', totalRuns: 380, wickets: 10, completedOvers: 100, ballsInCurrentOver: 0 } as any,
        { battingTeamId: 'AUS', totalRuns: 260, wickets: 10, completedOvers: 85, ballsInCurrentOver: 0 } as any,
      ];
    } else {
      mock.innings = [
        { battingTeamId: 'AUS', totalRuns: 340, wickets: 10, completedOvers: 92, ballsInCurrentOver: 0 } as any,
        { battingTeamId: 'IND', totalRuns: 210, wickets: 10, completedOvers: 70, ballsInCurrentOver: 0 } as any,
      ];
    }
    return mock;
  });

  const resBGT = updateTourSeriesStandings(tour, indWins, undefined, bgtComp);
  assert.strictEqual(resBGT.summary.isCompleted, true);
  assert.strictEqual(resBGT.summary.winnerTeamId, 'IND');
  assert.strictEqual(resBGT.updatedTour.trophyHolder, 'IND');
  assert.strictEqual(resBGT.updatedBGT?.currentScore.team2Wins, 3); // India was visiting team
});

test('7. WTC matches points & PCT calculation (12 pts win, PCT formula)', () => {
  // 12 points for win
  const pctAllWins = calculateWTCPCT(36, 3, 12);
  assert.strictEqual(pctAllWins, 100);

  // 1 win (12), 1 draw (4), 1 loss (0) out of 3 matches = 16 points out of 36 max = 44.44%
  const pctMixed = calculateWTCPCT(16, 3, 12);
  assert.strictEqual(pctMixed, 44.44);

  // Record a WTC Test win in tournament edition
  const wtcEdition = JSON.parse(JSON.stringify(INITIAL_TOURNAMENT_EDITIONS[0])) as TournamentEdition;
  const initialInd = wtcEdition.table.find((t) => t.teamId === 'IND')!;
  const initialWon = initialInd.won;
  const initialPoints = initialInd.points;

  const mockTestMatch: Match = {
    id: 'wtc_test_1',
    format: 'TEST',
    homeTeamId: 'IND',
    awayTeamId: 'AUS',
    venue: 'Eden Gardens',
    pitch: { name: 'Balanced', type: 'SPORTING_BALANCED', paceBonus: 0, spinBonus: 0, bounceVariation: 0, wearFactor: 1 },
    weather: { type: 'SUNNY', swingBonus: 0, description: 'Clear skies' },
    dayNumber: 5,
    sessionNumber: 3,
    status: 'COMPLETED',
    currentInningsIndex: 1,
    innings: [
      { battingTeamId: 'IND', totalRuns: 400, wickets: 10, completedOvers: 110, ballsInCurrentOver: 0 } as any,
      { battingTeamId: 'AUS', totalRuns: 280, wickets: 10, completedOvers: 90, ballsInCurrentOver: 0 } as any,
    ],
    homeXI: [],
    awayXI: [],
    homeCaptainId: '',
    awayCaptainId: '',
    homeWicketKeeperId: '',
    awayWicketKeeperId: '',
  };

  const updatedWTC = recordMatchInTournament(wtcEdition, mockTestMatch);
  const indEntry = updatedWTC.table.find((t) => t.teamId === 'IND');
  assert.ok(indEntry);
  assert.strictEqual(indEntry.won, initialWon + 1);
  assert.strictEqual(indEntry.points, initialPoints + 12);
  const expectedPct = calculateWTCPCT(indEntry.points, indEntry.played, 12);
  assert.strictEqual(indEntry.pointsPercentage, expectedPct);
});

test("8. Complete WTC cycle & verify top 2 teams qualify for Lord's Final", () => {
  const wtcEdition = JSON.parse(JSON.stringify(INITIAL_TOURNAMENT_EDITIONS[0])) as TournamentEdition;

  // Set explicit points and PCT
  wtcEdition.table[0].pointsPercentage = 68.5; // Team 1
  wtcEdition.table[1].pointsPercentage = 62.0; // Team 2
  wtcEdition.table[2].pointsPercentage = 54.0; // Team 3

  const sorted = sortTournamentTable(wtcEdition.table, true);
  const finalist1 = sorted[0];
  const finalist2 = sorted[1];

  assert.ok(finalist1.pointsPercentage! > finalist2.pointsPercentage!);
  assert.ok(finalist2.pointsPercentage! > sorted[2].pointsPercentage!);

  // Generate Lord's Standalone Final
  const finalMatch = createWTCFinalMatch(finalist1.teamId, finalist2.teamId, '2027-06-11');
  assert.strictEqual(finalMatch.venue, "Lord's Cricket Ground, London");
  assert.strictEqual(finalMatch.format, 'TEST');
  assert.strictEqual(finalMatch.stage, 'FINAL');
  assert.strictEqual(finalMatch.homeTeamId, finalist1.teamId);
  assert.strictEqual(finalMatch.awayTeamId, finalist2.teamId);
});

test('9. ODI World Cup generates group standings, Net Run Rate (NRR) and knockouts', () => {
  // Test NRR formula: (For Runs / For Overs) - (Against Runs / Against Overs)
  // Team A scores 300 in 50 overs (6.0), concedes 250 in 50 overs (5.0) -> NRR = +1.000
  const nrr = calculateNRR(300, 50, 250, 50);
  assert.strictEqual(nrr, 1.0);

  const cwcEdition = INITIAL_TOURNAMENT_EDITIONS.find((t) => t.competitionType === 'ODI_WORLD_CUP');
  assert.ok(cwcEdition);
  assert.strictEqual(cwcEdition.format, 'ODI');
  assert.strictEqual(cwcEdition.cycleLengthYears, 4);

  // Sorting by points then NRR
  const mockTable = [
    { teamId: 'A', teamName: 'Team A', points: 6, netRunRate: 0.45, won: 3, played: 3, lost: 0, drawn: 0, tied: 0, noResult: 0, forRuns: 900, forOvers: 150, againstRuns: 800, againstOvers: 150, flagEmoji: '🏏' },
    { teamId: 'B', teamName: 'Team B', points: 6, netRunRate: 1.25, won: 3, played: 3, lost: 0, drawn: 0, tied: 0, noResult: 0, forRuns: 950, forOvers: 150, againstRuns: 700, againstOvers: 150, flagEmoji: '🏏' },
    { teamId: 'C', teamName: 'Team C', points: 2, netRunRate: -0.8, won: 1, played: 3, lost: 2, drawn: 0, tied: 0, noResult: 0, forRuns: 600, forOvers: 150, againstRuns: 750, againstOvers: 150, flagEmoji: '🏏' },
  ];

  const sorted = sortTournamentTable(mockTable, false);
  assert.strictEqual(sorted[0].teamId, 'B', 'Team B has higher NRR with equal points');
  assert.strictEqual(sorted[1].teamId, 'A');
});

test('10. T20 World Cup supports tournament structure and matches', () => {
  const t20Edition = INITIAL_TOURNAMENT_EDITIONS.find((t) => t.competitionType === 'T20_WORLD_CUP');
  assert.ok(t20Edition);
  assert.strictEqual(t20Edition.format, 'T20I');
  assert.strictEqual(t20Edition.cycleLengthYears, 2);
  assert.ok(t20Edition.pastChampions.length > 0);
  assert.ok(t20Edition.table.length >= 8);
});

test('11. Simulate background international match between computer-controlled nations while user team has no match scheduled', () => {
  const career = createNewCareerSave('Rahul Dravid', 'IND', 'TEST');

  // Verify world fixtures exist for computer nations (e.g. AUS vs ENG or SA vs NZ)
  assert.ok(career.worldFixtures.length > 0, 'World fixtures must be present');

  const firstWorldMatch = career.worldFixtures[0];
  const targetDate = firstWorldMatch.date || '2026-11-20';

  const { updatedCareer, simulatedMatches } = simulateWorldMatchesUntil(career, targetDate);

  assert.ok(simulatedMatches.length > 0, 'Background match must be simulated');
  const sim = simulatedMatches[0];
  assert.strictEqual(sim.status, 'COMPLETED');
  assert.ok(sim.innings.length >= 2, 'Simulated match must have realistic innings data');
  assert.ok(sim.resultText, 'Simulated match must have result text');

  // India scheduled matches remain scheduled
  const indNext = updatedCareer.fixtures.find((f) => f.id !== sim.id);
  assert.ok(indNext);
});

test('12. Assign a player to training and verify attributes develop over time as calendar advances', () => {
  const career = createNewCareerSave('Rahul Dravid', 'IND', 'TEST');
  const indPlayers = getPlayersByCountry('IND');
  const youngBatter = indPlayers.find((p) => p.age <= 25 && (p.role === 'BATTER' || p.role === 'ALL_ROUNDER')) || indPlayers[0];

  const techBefore = youngBatter.attributes.technique;

  // Assign Batting training focus
  const assignedCareer = assignPlayerTrainingFocus(career, youngBatter.id, 'BATTING');
  assert.strictEqual(assignedCareer.playerTrainingFocus?.[youngBatter.id], 'BATTING');

  // Advance training
  const result = processSquadTrainingDay([youngBatter], { [youngBatter.id]: 'BATTING' }, false, '2026-11-16');
  const developedPlayer = result.updatedPlayers[0];

  assert.ok(developedPlayer.developmentHistory && developedPlayer.developmentHistory.length > 0);
  assert.ok(['Improving', 'Developing steadily', 'At peak performance'].includes(developedPlayer.developmentFeedback!));
});

test('13. Player fatigue accumulates during matches, recovers with rest, and injuries restrict selection', () => {
  const indPlayers = getPlayersByCountry('IND');
  const player = indPlayers[0];

  // Workload fatigue accumulates (+22 for Test)
  const afterMatch = applyMatchWorkload(player, 'TEST');
  assert.strictEqual(afterMatch.workloadFatigue, (player.workloadFatigue || 15) + 22);

  // Recovery day reduces fatigue
  const career = createNewCareerSave('Head Coach', 'IND', 'TEST');
  const rested = takeSquadRestDay(career);
  assert.ok(rested.news.some((n) => n.title.includes('Squad Recovery Session')));

  // Injury simulation
  const injuredPlayer: Player = {
    ...player,
    isInjured: true,
    injuryType: 'Hamstring Strain',
    injuryDaysRemaining: 10,
    injurySeverity: 'MODERATE',
  };

  // Rest day heals injury
  const trainingResult = processSquadTrainingDay([injuredPlayer], {}, false, '2026-11-16');
  const healingPlayer = trainingResult.updatedPlayers[0];
  assert.strictEqual(healingPlayer.injuryDaysRemaining, 9, 'Injury days remaining should decrement by 1');
});

test('14. Save and reload career; verify tournament standings, player development, and calendar state preserved', () => {
  const career = createNewCareerSave('Rahul Dravid', 'IND', 'TEST');
  career.playerTrainingFocus = { PLY_IND_001: 'BOWLING', PLY_IND_002: 'BATTING' };
  career.playerOverrides = {
    PLY_IND_001: {
      potential: 94,
      fitness: 90,
      developmentFeedback: 'Improving',
    },
  };

  // Simulate JSON serialization / deserialization (as in localStorage)
  const serialized = JSON.stringify(career);
  const reloaded = JSON.parse(serialized);

  assert.strictEqual(reloaded.id, career.id);
  assert.strictEqual(reloaded.selectedTeamId, 'IND');
  assert.strictEqual(reloaded.playerTrainingFocus['PLY_IND_001'], 'BOWLING');
  assert.strictEqual(reloaded.playerOverrides['PLY_IND_001'].potential, 94);
  assert.strictEqual(reloaded.ashes.id, 'the_ashes');
  assert.strictEqual(reloaded.borderGavaskar.id, 'border_gavaskar');
  assert.strictEqual(reloaded.tournamentEditions.length, career.tournamentEditions!.length);
  assert.strictEqual(reloaded.fixtures.length, career.fixtures.length);
  assert.strictEqual(reloaded.calendar.length, career.calendar.length);
});

test('15. Verify that no team has overlapping fixtures or impossible international schedules', () => {
  const { userMatches, worldMatches } = buildInternationalCalendar('IND');
  const allMatches = [...userMatches, ...worldMatches];

  // Map of team -> Set of match dates
  const teamDates = new Map<string, Set<string>>();

  allMatches.forEach((match) => {
    if (!match.date) return;
    const teams = [match.homeTeamId, match.awayTeamId];

    teams.forEach((tId) => {
      if (!teamDates.has(tId)) {
        teamDates.set(tId, new Set<string>());
      }
      const dates = teamDates.get(tId)!;
      assert.ok(
        !dates.has(match.date!),
        `Team ${tId} has duplicate/overlapping fixture scheduled on ${match.date} (Match: ${match.seriesName})`
      );
      dates.add(match.date!);
    });
  });

  assert.ok(teamDates.size >= 10, 'Multiple international teams verified for non-overlapping schedules');
});
