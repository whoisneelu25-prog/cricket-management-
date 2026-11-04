import test from 'node:test';
import assert from 'node:assert/strict';
import {
  announceTourSquad,
  applyUserMatchResult,
  assignPlayerTrainingFocus,
  advanceCareerTime,
  canUserManageTeam,
  confirmMatchPreparationLineup,
  createNewCareerSave,
  getNextUserMatchInfo,
  inspectNationalTeamSquad,
  sanitizeCareerSave,
  setFormatBattingOrder,
  setFormatCaptain,
  setFormatPlayingXI,
  setFormatViceCaptain,
  setFormatWicketKeeper,
  validateUserManagementAction,
} from '../store/careerStore';
import {
  ALL_PLAYERS,
  getEffectivePlayer,
  getEffectivePlayersByCountry,
} from '../data/squads';
import { INTERNATIONAL_TEAMS } from '../data/teams';
import {
  isPreMatchStatus,
  isTerminalMatchStatus,
  simulateFullMatch,
  stepMatchBall,
  stepMatchInnings,
  stepMatchOver,
} from './matchEngine';
import { simulateWorldMatchesUntil } from './worldSimulation';
import { updateTourSeriesStandings } from './tourEngine';
import { CareerSave, Match } from '../types/cricket';

/**
 * Helper: Plays all scheduled user matches on or before `targetDate` while advancing the global cricket world
 * chronologically up to `targetDate`. Uses the exact same match engine (`simulateFullMatch` + `applyUserMatchResult`)
 * and world engine (`simulateWorldMatchesUntil`) as live gameplay!
 */
function playCareerThroughDate(initialCareer: CareerSave, targetDate: string): CareerSave {
  let career = initialCareer;
  let safety = 0;

  while (safety < 300) {
    safety++;
    // Auto-announce any unannounced user tour whose deadline is on or before targetDate
    for (const tour of career.tours) {
      const isUserTour =
        tour.hostTeamId === career.selectedTeamId ||
        tour.visitingTeamId === career.selectedTeamId;
      if (isUserTour && !tour.squadAnnounced && tour.squadSelectionDeadline <= targetDate) {
        const pool = getEffectivePlayersByCountry(career.selectedTeamId, career, true);
        career = announceTourSquad(
          career,
          tour.id,
          pool.slice(0, 17).map((p) => p.id)
        );
      }
    }

    const nextUserMatch = career.fixtures.find(
      (m) => isPreMatchStatus(m.status) && (m.date || '') <= targetDate
    );

    if (!nextUserMatch) {
      if (career.currentDate < targetDate) {
        career = simulateWorldMatchesUntil(career, targetDate).updatedCareer;
      }
      // Check once more in case tournament knockouts generated a new user match <= targetDate!
      const newlyGeneratedUserMatch = career.fixtures.find(
        (m) => isPreMatchStatus(m.status) && (m.date || '') <= targetDate
      );
      if (!newlyGeneratedUserMatch) {
        break;
      }
      continue;
    }

    const matchDate = nextUserMatch.date || career.currentDate;
    if (matchDate > career.currentDate) {
      career = simulateWorldMatchesUntil(career, matchDate).updatedCareer;
    }

    // Re-fetch match from updated fixtures and play via common match engine
    const liveFixture = career.fixtures.find((m) => m.id === nextUserMatch.id);
    if (liveFixture && isPreMatchStatus(liveFixture.status)) {
      const completed = simulateFullMatch(liveFixture, career);
      career = applyUserMatchResult(career, completed);
    }
  }

  return career;
}

test('TEST A — Single-Country Career Control & AI Read-Only Inspection', () => {
  // Snapshot historical stats to guarantee zero base mutation
  const kohliBaseBefore = JSON.stringify(
    ALL_PLAYERS.find((p) => p.countryId === 'IND')?.stats
  );

  const career = createNewCareerSave('Rahul Dravid', 'IND', 'TEST');

  // 1. User controls strictly ONE country ('IND'); all other 21 nations are AI-controlled
  assert.equal(career.selectedTeamId, 'IND');
  assert.equal(canUserManageTeam(career, 'IND'), true);
  assert.equal(canUserManageTeam(career, 'AUS'), false);
  assert.equal(canUserManageTeam(career, 'ENG'), false);

  assert.equal(career.aiTeams?.['IND'], undefined, 'User country must never be in aiTeams');
  assert.equal(
    Object.keys(career.aiTeams || {}).length,
    INTERNATIONAL_TEAMS.length - 1,
    'Every non-user national team must be controlled by AI'
  );

  const permCheck = validateUserManagementAction(career, 'AUS');
  assert.equal(permCheck.allowed, false);
  assert.match(permCheck.reason || '', /controlled by AI/i);

  // 2. Attempt every management mutation against Australia ('AUS') & foreign players/tours
  const ausPlayers = getEffectivePlayersByCountry('AUS', career, true);
  const ausXI = ausPlayers.slice(0, 11).map((p) => p.id);
  const beforeJSON = JSON.stringify(career);

  let attempted = setFormatPlayingXI(career, 'TEST', ausXI, 'AUS');
  assert.equal(attempted, career, 'setFormatPlayingXI must reject AI targetTeamId');

  // Even if caller omits targetTeamId and tries injecting Australian player IDs into India's XI:
  attempted = setFormatPlayingXI(career, 'TEST', ausXI);
  assert.equal(attempted, career, 'setFormatPlayingXI must reject foreign player IDs');

  attempted = setFormatCaptain(career, 'TEST', ausPlayers[0].id, 'AUS');
  assert.equal(attempted, career);
  attempted = setFormatCaptain(career, 'TEST', ausPlayers[0].id);
  assert.equal(attempted, career, 'setFormatCaptain must reject foreign player ID');

  attempted = setFormatViceCaptain(career, 'TEST', ausPlayers[1].id, 'AUS');
  assert.equal(attempted, career);

  attempted = setFormatWicketKeeper(career, 'TEST', ausPlayers[2].id, 'AUS');
  assert.equal(attempted, career);

  attempted = setFormatBattingOrder(career, 'TEST', [...ausXI].reverse(), 'AUS');
  assert.equal(attempted, career);

  attempted = assignPlayerTrainingFocus(career, ausPlayers[0].id, 'BOWLING', 'AUS');
  assert.equal(attempted, career);
  attempted = assignPlayerTrainingFocus(career, ausPlayers[0].id, 'BOWLING');
  assert.equal(attempted, career, 'assignPlayerTrainingFocus must reject foreign player ID');

  const aiOnlyTour = career.tours.find(
    (t) => t.hostTeamId !== 'IND' && t.visitingTeamId !== 'IND'
  );
  assert.ok(aiOnlyTour, 'Should have AI-vs-AI bilateral tours');
  attempted = announceTourSquad(
    career,
    aiOnlyTour.id,
    ausPlayers.slice(0, 16).map((p) => p.id)
  );
  assert.equal(attempted, career, 'announceTourSquad must reject AI-only tours');

  assert.equal(JSON.stringify(career), beforeJSON, 'Career state must remain 100% untouched');

  // 3. Read-only inspection of AI squads works cleanly
  const ausInspection = inspectNationalTeamSquad(career, 'AUS', 'TEST');
  assert.equal(ausInspection.teamId, 'AUS');
  assert.equal(ausInspection.isUserControlled, false);
  assert.equal(ausInspection.isReadOnly, true);
  assert.equal(ausInspection.formatConfig.playingXI.length, 11);
  assert.ok(ausInspection.formatConfig.captainId);
  assert.ok(ausInspection.formatConfig.wicketKeeperId);

  const indInspection = inspectNationalTeamSquad(career, 'IND', 'TEST');
  assert.equal(indInspection.isUserControlled, true);
  assert.equal(indInspection.isReadOnly, false);

  const kohliBaseAfter = JSON.stringify(
    ALL_PLAYERS.find((p) => p.countryId === 'IND')?.stats
  );
  assert.equal(kohliBaseAfter, kohliBaseBefore);
});

test('TEST B — Global Cricket World Simulation & AI Management', () => {
  // Snapshot ALL_PLAYERS historical stats before any simulation
  const sampleAusPlayer = ALL_PLAYERS.find(
    (p) => p.countryId === 'AUS' && p.status === 'ACTIVE' && p.gender === 'MALE'
  )!;
  const historicalTestMatchesBefore = sampleAusPlayer.stats.TEST.matches;

  const career = createNewCareerSave('Gautam Gambhir', 'IND', 'TEST');

  // Advance calendar across late Nov 2026 – Jan 2027 without playing India matches yet
  // so we verify AI countries play independently while India has its own schedule!
  const sim = simulateWorldMatchesUntil(career, '2027-01-25');
  const updated = sim.updatedCareer;

  assert.ok(
    sim.simulatedMatches.length >= 10,
    `Expected >= 10 global AI matches simulated, got ${sim.simulatedMatches.length}`
  );

  // Verify multiple distinct non-Indian nations participated and completed full scorecards
  const participatingNations = new Set<string>();
  for (const m of sim.simulatedMatches) {
    assert.notEqual(m.homeTeamId, 'IND');
    assert.notEqual(m.awayTeamId, 'IND');
    participatingNations.add(m.homeTeamId);
    participatingNations.add(m.awayTeamId);

    assert.equal(isTerminalMatchStatus(m.status), true);
    assert.ok(m.innings.length >= 2, `Match ${m.id} must have >= 2 innings`);
    assert.ok(m.resultText && m.resultText.length > 5, `Match ${m.id} must have resultText`);
    assert.ok(m.playerOfTheMatch?.playerId, `Match ${m.id} must award Player of the Match`);
    assert.equal(m.homeXI.length, 11);
    assert.equal(m.awayXI.length, 11);

    // Reconcile innings totals
    for (const inn of m.innings) {
      const batRuns = inn.batters.reduce((sum, b) => sum + b.runs, 0);
      assert.equal(
        batRuns + inn.extras.total,
        inn.totalRuns,
        `Innings reconciliation failed in AI match ${m.id}`
      );
      assert.ok(
        inn.bowlers.length >= (inn.completedOvers >= 1 ? 2 : 1),
        `Innings in ${m.id} (${inn.completedOvers} overs) must record active bowlers`
      );
    }
  }

  assert.ok(
    participatingNations.size >= 8,
    `Expected >= 8 AI nations active globally, got ${participatingNations.size}`
  );

  // Verify simulatedStats recorded in playerOverrides while ALL_PLAYERS base stats remain untouched!
  const anySimulatedOverride = Object.values(updated.playerOverrides || {}).some(
    (ov) =>
      (ov.simulatedStats?.TEST?.matches || 0) > 0 ||
      (ov.simulatedStats?.ODI?.matches || 0) > 0 ||
      (ov.simulatedStats?.T20I?.matches || 0) > 0
  );
  assert.equal(anySimulatedOverride, true, 'AI match stats must be recorded in playerOverrides.simulatedStats');
  assert.equal(
    sampleAusPlayer.stats.TEST.matches,
    historicalTestMatchesBefore,
    'Base historical stats in ALL_PLAYERS must NEVER be mutated'
  );

  // Verify ICC Team Rankings updated dynamically
  assert.ok(updated.teamRankings);
  const rankChanged = INTERNATIONAL_TEAMS.some(
    (t) =>
      updated.teamRankings![t.id].ratingPoints.TEST !== t.ratingPoints.TEST ||
      updated.teamRankings![t.id].ratingPoints.ODI !== t.ratingPoints.ODI ||
      updated.teamRankings![t.id].ratingPoints.T20I !== t.ratingPoints.T20I
  );
  assert.equal(rankChanged, true, 'Live ICC rating points must evolve as global matches finish');
});

test('TEST C — Match Completion Flow & Lifecycle Safety (Idempotency & Anti-Replay)', () => {
  let career = createNewCareerSave('Rahul Dravid', 'IND', 'TEST');
  const firstMatch = career.fixtures[0];
  assert.ok(firstMatch);
  assert.equal(isPreMatchStatus(firstMatch.status), true);

  // Advance to match day
  career = simulateWorldMatchesUntil(career, firstMatch.date!).updatedCareer;
  const dateAtMatchStart = career.currentDate;

  // Step through opening ball (toss + innings init) & simulate to completion
  let liveMatch: Match = stepMatchBall(career.fixtures[0]);
  assert.equal(liveMatch.status, 'IN_PROGRESS');

  liveMatch = simulateFullMatch(liveMatch, career);
  assert.equal(isTerminalMatchStatus(liveMatch.status), true);
  assert.ok(liveMatch.resultText);
  assert.ok(liveMatch.playerOfTheMatch);

  // Action 1 ("CONTINUE"): Save match result to career WITHOUT skipping calendar date
  const afterSave1 = applyUserMatchResult(career, liveMatch);
  assert.equal(afterSave1.currentDate, dateAtMatchStart, 'Continue must NOT skip calendar dates');
  assert.equal(afterSave1.manager.matchesManaged, 1);

  const savedFixture1 = afterSave1.fixtures.find((f) => f.id === firstMatch.id)!;
  assert.equal(isTerminalMatchStatus(savedFixture1.status), true);
  assert.equal(savedFixture1.statsRecorded, true);

  const sampleBatterId = liveMatch.innings[0].batters[0].playerId;
  const effAfter1 = getEffectivePlayer(sampleBatterId, afterSave1)!;
  const simMatches1 = effAfter1.simulatedStats?.[liveMatch.format]?.matches || 0;
  assert.equal(simMatches1, 1);

  // Idempotency Check: Calling applyUserMatchResult a 2nd & 3rd time (e.g. viewing Full Scorecard -> returning to Dashboard)
  const afterSave2 = applyUserMatchResult(afterSave1, savedFixture1);
  const afterSave3 = applyUserMatchResult(afterSave2, liveMatch);
  assert.equal(afterSave3.manager.matchesManaged, 1, 'matchesManaged must NEVER double-increment');
  const effAfter3 = getEffectivePlayer(sampleBatterId, afterSave3)!;
  assert.equal(
    effAfter3.simulatedStats?.[liveMatch.format]?.matches,
    1,
    'Player simulatedStats must NEVER double-count'
  );

  // Anti-Replay Guard: Calling stepMatchBall / stepMatchOver / stepMatchInnings / simulateFullMatch on a completed match
  const inningsSnapshot = JSON.stringify(savedFixture1.innings);
  const afterStepBall = stepMatchBall(savedFixture1);
  const afterStepOver = stepMatchOver(savedFixture1);
  const afterStepInnings = stepMatchInnings(savedFixture1);
  const afterReSim = simulateFullMatch(savedFixture1, afterSave3);

  assert.equal(isTerminalMatchStatus(afterStepBall.status), true);
  assert.equal(isTerminalMatchStatus(afterStepOver.status), true);
  assert.equal(isTerminalMatchStatus(afterStepInnings.status), true);
  assert.equal(isTerminalMatchStatus(afterReSim.status), true);
  assert.equal(JSON.stringify(afterStepBall.innings), inningsSnapshot);
  assert.equal(JSON.stringify(afterReSim.innings), inningsSnapshot);
});

test('TEST D — Dashboard Next Match & Pre-Match Preparation Workflow', () => {
  let career = createNewCareerSave('Rahul Dravid', 'IND', 'TEST');

  // Announce opening tour squad so calendar won't pause at squad deadline when advancing to Match 1
  const openingTour = career.tours.find(
    (t) => t.hostTeamId === 'IND' || t.visitingTeamId === 'IND'
  )!;
  const indPool = getEffectivePlayersByCountry('IND', career, true);
  career = announceTourSquad(
    career,
    openingTour.id,
    indPool.slice(0, 17).map((p) => p.id)
  );

  // Complete Match 1
  const match1 = career.fixtures[0];
  career = simulateWorldMatchesUntil(career, match1.date!).updatedCareer;
  const completed1 = simulateFullMatch(career.fixtures[0], career);
  career = applyUserMatchResult(career, completed1);

  // Inspect Next Match Info on Dashboard immediately after Match 1 completes
  const nextInfo = getNextUserMatchInfo(career);
  assert.ok(nextInfo.nextMatch, 'Next user match must be available');
  assert.notEqual(nextInfo.nextMatch.id, match1.id, 'Next match must advance past completed Match 1');
  assert.equal(nextInfo.nextMatch.matchNumber, 2);
  assert.ok(nextInfo.daysRemaining > 0, 'Days remaining until Match 2 should be > 0');
  assert.match(nextInfo.seriesScoreText, /AUS \d+ – \d+ IND/);

  // Open Pre-Match Preparation & confirm a custom 11-player XI, reversed batting order, custom captain & WK
  const customXI = indPool.slice(0, 11).reverse().map((p) => p.id);
  const wkCandidate =
    indPool.slice(0, 11).find((p) => p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER') ||
    indPool[0];
  const customCap = customXI[0];
  const bowlers = indPool
    .filter((p) => customXI.includes(p.id) && (p.role === 'BOWLER' || p.role === 'ALL_ROUNDER'))
    .map((p) => p.id);

  career = confirmMatchPreparationLineup(career, nextInfo.nextMatch.id, {
    playingXI: customXI,
    captainId: customCap,
    wicketKeeperId: wkCandidate.id,
    bowlingRotation: bowlers,
  });

  const preparedMatch2 = career.fixtures.find((f) => f.id === nextInfo.nextMatch!.id)!;
  assert.equal(preparedMatch2.status, 'READY', 'Confirmed preparation must transition match status to READY');
  assert.equal(preparedMatch2.lineupConfirmed, true);

  const userSideXI =
    preparedMatch2.homeTeamId === 'IND' ? preparedMatch2.homeXI : preparedMatch2.awayXI;
  assert.deepEqual(userSideXI, customXI, 'Prepared Playing XI & batting order must be saved on fixture');

  // Advance calendar to Next Match via controlled advancement
  const adv = advanceCareerTime(career, 'NEXT_MATCH');
  career = adv.updatedCareer;
  assert.equal(career.currentDate, preparedMatch2.date);
  assert.equal(getNextUserMatchInfo(career).daysRemaining, 0);

  // Start & complete Match 2 and verify our custom XI actually took the field!
  const completed2 = simulateFullMatch(
    career.fixtures.find((f) => f.id === preparedMatch2.id)!,
    career
  );
  assert.equal(isTerminalMatchStatus(completed2.status), true);
  const indBatInnings = completed2.innings.find((i) => i.battingTeamId === 'IND')!;
  assert.equal(indBatInnings.batters[0].playerId, customXI[0], 'Custom #1 opener must open the innings');
  assert.equal(indBatInnings.batters[1].playerId, customXI[1], 'Custom #2 opener must partner at #2');
});

test('TEST E — Complete Tournament Progression (T20 World Cup & ODI World Cup: Groups -> SFs -> Final -> Champion)', () => {
  let career = createNewCareerSave('Gautam Gambhir', 'IND', 'T20I');

  // 1. Verify zero fake pre-populated tournament points at career start
  for (const ed of career.tournamentEditions!) {
    for (const row of ed.table) {
      assert.equal(row.played, 0, `${ed.id} must start with 0 played for ${row.teamId}`);
      assert.equal(row.points, 0, `${ed.id} must start with 0 points for ${row.teamId}`);
    }
  }

  // 2. Play through ICC Men's T20 World Cup (March – April 2027) including dynamically generated Semi-Finals & Final!
  career = playCareerThroughDate(career, '2027-04-05');

  const t20wc = career.tournamentEditions!.find((t) => t.id === 't20_wc_2026')!;
  assert.equal(t20wc.status, 'COMPLETED', 'T20 World Cup must complete through Group -> SF -> Final');
  assert.ok(t20wc.semiFinalMatchIds && t20wc.semiFinalMatchIds.length === 2, 'Two Semi-Finals must be generated');
  assert.ok(t20wc.finalMatchId, 'Grand Final must be generated');
  assert.ok(t20wc.winnerTeamId, 'Champion must be crowned');
  assert.ok(t20wc.runnerUpTeamId, 'Runner-up must be recorded');
  assert.ok(t20wc.leadingRunScorer && t20wc.leadingRunScorer.runs > 0, 'Leading run scorer must be tracked');
  assert.ok(t20wc.leadingWicketTaker && t20wc.leadingWicketTaker.wickets > 0, 'Leading wicket taker must be tracked');
  assert.ok(t20wc.playerOfTheTournament, 'Player of the Tournament must be awarded');
  assert.equal(t20wc.pastChampions[0].year, t20wc.year, 'New champion must be prepended to pastChampions');

  // Verify group math: 2 groups of 4 teams -> each team plays 3 group matches (total 12 group matches = 24 team-appearances)
  const totalPlayedInGroups = t20wc.table.reduce((s, r) => s + r.played, 0);
  assert.equal(totalPlayedInGroups, 24, '8 teams playing 3 group games each = 24 played entries');

  // Verify ODI World Cup 2027 (Oct – Nov 2027: 2 groups of 5 teams = 20 group matches -> SFs -> Final -> Champion)
  career = playCareerThroughDate(career, '2027-11-25');
  const cwc = career.tournamentEditions!.find((t) => t.id === 'cwc_2027')!;
  assert.equal(cwc.status, 'COMPLETED', 'ODI Cricket World Cup 2027 must complete end-to-end');
  assert.equal(cwc.semiFinalMatchIds?.length, 2);
  assert.ok(cwc.finalMatchId);
  assert.ok(cwc.winnerTeamId);
  assert.equal(
    cwc.table.reduce((s, r) => s + r.played, 0),
    40,
    '10 teams playing 4 group games each = 40 played entries'
  );
});

test('TEST F — Rivalry Series (5-Test Border-Gavaskar Trophy & 5-Test Ashes + Drawn-Series Retention Rule)', () => {
  // 1. Play full 5-Test Border-Gavaskar Trophy (Nov 2026 – Jan 2027) & 5-Test Ashes (Nov 2027 – Jan 2028)
  let career = createNewCareerSave('Rahul Dravid', 'IND', 'TEST');
  career = playCareerThroughDate(career, '2027-01-25');

  const bgtTour = career.tours.find((t) => t.competitionType === 'BORDER_GAVASKAR')!;
  assert.ok(bgtTour);
  assert.equal(bgtTour.status, 'COMPLETED', '5-Test Border-Gavaskar Trophy must complete');
  assert.equal(bgtTour.series.TEST?.matchCount, 5);
  assert.equal(
    (bgtTour.series.TEST?.homeWins || 0) +
      (bgtTour.series.TEST?.awayWins || 0) +
      (bgtTour.series.TEST?.draws || 0),
    5,
    'All 5 BGT Test matches must be accounted in series score'
  );
  assert.ok(bgtTour.playerOfTheSeries, 'Player of the Series must be awarded');
  assert.ok(career.borderGavaskar?.currentTrophyHolder);

  // Advance through Jan 2028 to complete the 5-Test Ashes series between AI England & AI Australia
  career = playCareerThroughDate(career, '2028-01-25');
  const ashesTour = career.tours.find((t) => t.competitionType === 'ASHES')!;
  assert.ok(ashesTour);
  assert.equal(ashesTour.status, 'COMPLETED', '5-Test Ashes series must complete between AI England & AI Australia');
  assert.equal(ashesTour.series.TEST?.matchCount, 5);
  assert.equal(
    (ashesTour.series.TEST?.homeWins || 0) +
      (ashesTour.series.TEST?.awayWins || 0) +
      (ashesTour.series.TEST?.draws || 0),
    5
  );

  // 2. Explicitly verify Drawn-Series Trophy Retention Rule (2–2 draw -> holder retains urn!)
  const ashesCopy = JSON.parse(JSON.stringify(career.ashes!));
  ashesCopy.currentTrophyHolder = 'AUS'; // Australia enters as holder
  const tourCopy = JSON.parse(JSON.stringify(ashesTour));
  tourCopy.year = 2029; // Fresh Ashes edition year so historicalEditions archives it
  tourCopy.hostTeamId = 'ENG';
  tourCopy.visitingTeamId = 'AUS';
  tourCopy.status = 'IN_PROGRESS';

  const ashesMatches = [...career.fixtures, ...career.worldFixtures]
    .filter((m) => m.tourId === ashesTour.id)
    .slice(0, 5)
    .map((m, idx) => ({
      ...m,
      homeTeamId: 'ENG',
      awayTeamId: 'AUS',
      status: (idx === 4 ? 'DRAW' : 'COMPLETED') as Match['status'],
      winnerTeamId: idx < 2 ? 'ENG' : idx < 4 ? 'AUS' : undefined,
      innings: [
        { ...m.innings[0], battingTeamId: 'ENG', bowlingTeamId: 'AUS', totalRuns: idx < 2 ? 350 : 250 },
        { ...m.innings[1], battingTeamId: 'AUS', bowlingTeamId: 'ENG', totalRuns: idx < 2 ? 250 : idx < 4 ? 350 : 250 },
      ],
    }));

  const retentionCheck = updateTourSeriesStandings(
    tourCopy,
    ashesMatches,
    ashesCopy,
    career.borderGavaskar
  );
  assert.equal(retentionCheck.updatedTour.series.TEST?.homeWins, 2);
  assert.equal(retentionCheck.updatedTour.series.TEST?.awayWins, 2);
  assert.equal(retentionCheck.updatedTour.series.TEST?.draws, 1);
  assert.equal(
    retentionCheck.updatedAshes?.currentTrophyHolder,
    'AUS',
    'Defending holder (AUS) must retain The Ashes on a 2–2 drawn series!'
  );
  assert.equal(retentionCheck.updatedAshes?.historicalEditions[0].holderRetained, true);
});

test("TEST G — World Test Championship (WTC Cycle -> PCT% -> Lord's Final -> Champion)", () => {
  let career = createNewCareerSave('Pat Cummins', 'AUS', 'TEST');

  // Play past June 1, 2027 WTC cutoff and through June 25, 2027 Lord's Final window
  career = playCareerThroughDate(career, '2027-06-25');

  const wtc = career.tournamentEditions!.find((t) => t.id === 'wtc_2025_27')!;
  assert.equal(wtc.status, 'COMPLETED', 'WTC 2025–27 cycle must complete after Lord’s Final');
  assert.ok(wtc.finalistTeamIds && wtc.finalistTeamIds.length === 2, 'Top 2 WTC teams must qualify');
  assert.ok(wtc.finalMatchId, 'Standalone WTC Lord’s Final match must be generated');
  assert.ok(wtc.winnerTeamId, 'WTC Champion must be crowned');

  const allMatches = [...career.fixtures, ...career.worldFixtures];
  const wtcFinal = allMatches.find((m) => m.id === wtc.finalMatchId)!;
  assert.ok(wtcFinal, 'WTC Final fixture must exist in career matches');
  assert.match(wtcFinal.venue, /Lord's/i, 'WTC Final must be staged at Lord’s, London');
  assert.equal(isTerminalMatchStatus(wtcFinal.status), true);

  // Verify PCT% ordering & calculation accuracy on WTC standings table
  for (let i = 0; i < wtc.table.length - 1; i++) {
    const a = wtc.table[i].pointsPercentage || 0;
    const b = wtc.table[i + 1].pointsPercentage || 0;
    assert.ok(a >= b, `WTC table must be sorted descending by PCT% (${a} >= ${b})`);
  }
});

test('TEST H — Long-Term Multi-Season Career (2026 -> 2029), Schedule Integrity, Player Lifecycle & Save Persistence', () => {
  let career = createNewCareerSave('Brendon McCullum', 'ENG', 'TEST');

  // Assign focused training to young English players
  const engPlayersStart = getEffectivePlayersByCountry('ENG', career, true);
  const youngTrainee =
    engPlayersStart.find((p) => p.age <= 25) || engPlayersStart[0];
  const startAge = youngTrainee.age;
  career = assignPlayerTrainingFocus(career, youngTrainee.id, 'BATTING');

  // Advance across multiple full seasons: Nov 2026 -> Feb 2029 (3 annual rollovers: 2027, 2028, 2029)
  career = playCareerThroughDate(career, '2029-02-20');

  // 1. Multi-season calendar generation verified
  assert.ok(
    (career.seasonsGeneratedThroughYear || 0) >= 2029,
    `Expected seasons generated >= 2029, got ${career.seasonsGeneratedThroughYear}`
  );

  // Verify 2029 fixtures exist for both England (user) and AI nations
  const fixturesIn2029 = [...career.fixtures, ...career.worldFixtures].filter((m) =>
    (m.date || '').startsWith('2029-')
  );
  assert.ok(
    fixturesIn2029.length >= 5,
    `Expected >= 5 fixtures scheduled in 2029, got ${fixturesIn2029.length}`
  );

  // 2. Strict Conflict-Free Global Schedule Check: No team plays 2 matches on the exact same date!
  const teamDateSeen = new Map<string, string>();
  for (const m of [...career.fixtures, ...career.worldFixtures]) {
    if (!m.date) continue;
    for (const tid of [m.homeTeamId, m.awayTeamId]) {
      const key = `${tid}_${m.date}`;
      const prevMatchId = teamDateSeen.get(key);
      assert.equal(
        prevMatchId,
        undefined,
        `Schedule conflict detected: ${tid} scheduled twice on ${m.date} (${prevMatchId} vs ${m.id})`
      );
      teamDateSeen.set(key, m.id);
    }
  }

  // 3. Player Lifecycle: Annual aging (+3 years across 2027, 2028, 2029), veteran retirements & academy debutants
  const updatedTrainee = getEffectivePlayer(youngTrainee.id, career)!;
  assert.equal(
    updatedTrainee.age,
    startAge + 3,
    `Player age must advance by +3 across 3 New Year rollovers (${startAge} -> ${updatedTrainee.age})`
  );

  const retiredCount = Object.values(career.playerOverrides || {}).filter(
    (ov) => ov.status === 'RETIRED'
  ).length;
  assert.ok(retiredCount >= 1, 'Veteran 37+ international players should retire over multi-year career');

  assert.ok(
    (career.emergingPlayers || []).length >= 2,
    `Expected National Academy debutants to emerge over 3 seasons, got ${(career.emergingPlayers || []).length}`
  );

  // 4. Older world fixtures archived cleanly to keep save fast
  assert.ok(
    (career.archivedMatches || []).length > 0,
    'Old completed world fixtures should archive into archivedMatches across multi-year seasons'
  );

  // 5. Full JSON Save & Sanitize Reload Persistence Check
  const serialized = JSON.stringify(career);
  const reloaded = sanitizeCareerSave(JSON.parse(serialized));

  assert.equal(reloaded.selectedTeamId, 'ENG');
  assert.equal(reloaded.aiTeams?.['ENG'], undefined);
  assert.equal(reloaded.currentDate, career.currentDate);
  assert.equal(reloaded.manager.matchesManaged, career.manager.matchesManaged);
  assert.equal(
    reloaded.emergingPlayers?.length,
    career.emergingPlayers?.length,
    'Emerging academy players must persist across save/reload'
  );
  assert.equal(
    reloaded.tournamentEditions?.filter((t) => t.status === 'COMPLETED').length,
    career.tournamentEditions?.filter((t) => t.status === 'COMPLETED').length,
    'Completed tournament champions must persist across save/reload'
  );
});
