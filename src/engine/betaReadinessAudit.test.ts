import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CORE_12_TEAM_IDS,
  CORE_12_TEAMS,
  INTERNATIONAL_TEAMS,
} from '../data/teams';
import { VENUES } from '../data/venues';
import {
  STADIUM_IMAGES,
  resolveStadiumImage,
  getStadiumImageSrc,
} from '../data/stadiumImages';
import {
  NATIONAL_SELECTION_DATA,
  FORMAT_PLAYERS,
  getNationFormatSelectionData,
  getFormatSelectionPoolPlayers,
  validateFormatSquad,
  validatePlayingXI,
  FORMAT_PLAYERS_MAP,
} from '../data/formatSquadsData';
import {
  ALL_PLAYERS,
  getEffectivePlayer,
  getEffectivePlayersByCountry,
} from '../data/squads';
import {
  createNewCareerSave,
  inspectNationalTeamSquad,
  setFormatTargetSquadSize,
  addPlayerToFormatSquad,
  removePlayerFromFormatSquad,
  setFormatPlayingXI,
  setFormatBattingOrder,
  setFormatCaptain,
  setFormatViceCaptain,
  setFormatWicketKeeper,
  saveFormatSquad,
  saveFormatPlayingXI,
  confirmMatchPreparationLineup,
  announceTourSquad,
  applyUserMatchResult,
  sanitizeCareerSave,
  migrateCareerSave,
  getNextUserMatchInfo,
} from '../store/careerStore';
import {
  createInitialInningsState,
  ensureMatchTacticalSystemsInitialized,
  stepMatchBall,
  stepMatchOver,
  stepMatchInnings,
  simulateFullMatch,
  declareInnings,
  resolveFollowOnDecision,
  isTerminalMatchStatus,
} from './matchEngine';
import { createBilateralTour } from './tourEngine';
import { selectAIPlayingXIForMatch } from './aiTeamEngine';
import { MatchFormat } from '../types/cricket';

test('PHASE 3 & 4 — All 12 Nations & 36 Format Selection Pools Integrity', () => {
  assert.equal(CORE_12_TEAMS.length, 12, 'Must have exactly 12 core ICC Full Member nations');

  const formats: MatchFormat[] = ['TEST', 'ODI', 'T20I'];

  for (const teamId of CORE_12_TEAM_IDS) {
    const team = CORE_12_TEAMS.find((t) => t.id === teamId);
    assert.ok(team, `Team metadata missing for ${teamId}`);
    assert.ok(team.flagEmoji, `Flag missing for ${teamId}`);

    const hostVenues = VENUES.filter((v) => v.countryId === teamId);
    assert.ok(hostVenues.length >= 1, `Nation ${teamId} must have at least 1 authentic home venue in VENUES`);

    for (const fmt of formats) {
      const data = getNationFormatSelectionData(teamId, fmt);
      assert.ok(data, `Missing format selection data for ${teamId} ${fmt}`);

      // First-Choice XI validation
      assert.equal(
        data.firstChoiceXIPlayerIds.length,
        11,
        `${teamId} ${fmt} firstChoiceXI must have 11 players`
      );
      assert.equal(
        new Set(data.firstChoiceXIPlayerIds).size,
        11,
        `${teamId} ${fmt} firstChoiceXI must have 11 unique players`
      );

      // Pool rule: First-Choice XI + Selection Pool = Complete Format Selection Pool
      const poolSet = new Set(data.poolPlayerIds);
      assert.equal(
        poolSet.size,
        data.poolPlayerIds.length,
        `${teamId} ${fmt} poolPlayerIds must contain zero duplicates`
      );
      assert.ok(
        data.poolPlayerIds.length >= 15,
        `${teamId} ${fmt} pool must have at least 15 players (found ${data.poolPlayerIds.length})`
      );
      for (const xiId of data.firstChoiceXIPlayerIds) {
        assert.ok(
          poolSet.has(xiId),
          `${teamId} ${fmt} first-choice XI player ${xiId} must be included in poolPlayerIds`
        );
      }

      // Default squad size rule: 15 players
      assert.equal(
        data.defaultSquadPlayerIds.length,
        15,
        `${teamId} ${fmt} defaultSquadPlayerIds must have exactly 15 players`
      );
      assert.equal(
        new Set(data.defaultSquadPlayerIds).size,
        15,
        `${teamId} ${fmt} defaultSquadPlayerIds must have 15 unique players`
      );

      // Leadership & Wicketkeeper designations
      assert.ok(
        data.firstChoiceXIPlayerIds.includes(data.captainPlayerId),
        `${teamId} ${fmt} captain ${data.captainPlayerId} must be in firstChoiceXI`
      );
      assert.ok(
        data.firstChoiceXIPlayerIds.includes(data.wicketKeeperPlayerId),
        `${teamId} ${fmt} wicketkeeper ${data.wicketKeeperPlayerId} must be in firstChoiceXI`
      );

      const poolPlayers = getFormatSelectionPoolPlayers(teamId, fmt);
      assert.equal(
        poolPlayers.length,
        data.poolPlayerIds.length,
        `${teamId} ${fmt} resolved Player objects must match poolPlayerIds count`
      );
    }
  }
});

test('PHASE 4 & 5 — Independent Format Squads, Configurable Size (11–20, Default 15) & Playing XI Validation', () => {
  let career = createNewCareerSave('Gautam Gambhir', 'IND', 'TEST');

  // Verify default squad size is 15 across all 3 formats
  for (const fmt of ['TEST', 'ODI', 'T20I'] as MatchFormat[]) {
    assert.equal(career.formatSquads[fmt].targetSquadSize, 15, `${fmt} default targetSquadSize must be 15`);
    assert.equal(career.formatSquads[fmt].squadPlayerIds.length, 15, `${fmt} initial squad length must be 15`);
    assert.equal(career.formatSquads[fmt].playingXI.length, 11, `${fmt} initial playingXI must be 11`);
  }

  // Verify configurable squad size range 11 to 20
  career = setFormatTargetSquadSize(career, 'T20I', 11);
  assert.equal(career.formatSquads.T20I.targetSquadSize, 11);
  assert.equal(
    career.formatSquads.T20I.squadPlayerIds.length,
    11,
    'Reducing targetSquadSize to 11 trims overflow non-XI squad players to reserves'
  );
  assert.equal(career.formatSquads.TEST.targetSquadSize, 15, 'TEST targetSquadSize untouched');
  assert.equal(career.formatSquads.ODI.targetSquadSize, 15, 'ODI targetSquadSize untouched');

  career = setFormatTargetSquadSize(career, 'T20I', 20);
  assert.equal(career.formatSquads.T20I.targetSquadSize, 20);

  // Clamp check (<11 -> 11, >20 -> 20)
  career = setFormatTargetSquadSize(career, 'T20I', 8);
  assert.equal(career.formatSquads.T20I.targetSquadSize, 11);
  career = setFormatTargetSquadSize(career, 'T20I', 25);
  assert.equal(career.formatSquads.T20I.targetSquadSize, 20);
  career = setFormatTargetSquadSize(career, 'T20I', 15);

  // Verify inspectNationalTeamSquad scopes pool to format selection pool
  const indTestInspection = inspectNationalTeamSquad(career, 'IND', 'TEST');
  const indTestPoolIds = new Set(getNationFormatSelectionData('IND', 'TEST')!.poolPlayerIds);
  for (const p of indTestInspection.players) {
    assert.ok(indTestPoolIds.has(p.id), `Inspected TEST pool player ${p.id} must belong to IND TEST pool`);
  }

  // Verify saveFormatPlayingXI rejects non-squad players
  const nonSquadPoolPlayer = indTestInspection.players.find(
    (p) => !career.formatSquads.TEST.squadPlayerIds.includes(p.id)
  );
  assert.ok(nonSquadPoolPlayer, 'Must have a pool player outside the 15-man squad');
  const invalidXI = [...career.formatSquads.TEST.playingXI.slice(0, 10), nonSquadPoolPlayer.id];
  const { updatedCareer: afterInvalidXI, error: xiError } = saveFormatPlayingXI(
    career,
    'TEST',
    invalidXI,
    career.formatSquads.TEST.captainId,
    career.formatSquads.TEST.viceCaptainId,
    career.formatSquads.TEST.wicketKeeperId
  );
  assert.ok(xiError, 'saveFormatPlayingXI must return validation error for non-squad player');
  assert.deepEqual(
    afterInvalidXI.formatSquads.TEST.playingXI,
    career.formatSquads.TEST.playingXI,
    'saveFormatPlayingXI must reject players not in the selected format squad'
  );

  // Verify Announcing a Tour Squad NEVER overwrites independent format squads
  const testSquadBeforeTour = [...career.formatSquads.TEST.squadPlayerIds];
  const odiSquadBeforeTour = [...career.formatSquads.ODI.squadPlayerIds];
  const t20SquadBeforeTour = [...career.formatSquads.T20I.squadPlayerIds];
  const userTour = career.tours.find(
    (t) => t.hostTeamId === 'IND' || t.visitingTeamId === 'IND'
  );
  if (userTour) {
    const afterTourAnnounce = announceTourSquad(career, userTour.id, testSquadBeforeTour);
    assert.deepEqual(afterTourAnnounce.formatSquads.TEST.squadPlayerIds, testSquadBeforeTour);
    assert.deepEqual(afterTourAnnounce.formatSquads.ODI.squadPlayerIds, odiSquadBeforeTour);
    assert.deepEqual(afterTourAnnounce.formatSquads.T20I.squadPlayerIds, t20SquadBeforeTour);
  }
});

test('PHASE 7 & 8 — Host Country Venues & Stadium Background Resolution Across All 12 Nations', () => {
  for (const hostId of CORE_12_TEAM_IDS) {
    const visitorId = hostId === 'IND' ? 'AUS' : 'IND';
    const { matches } = createBilateralTour(
      hostId,
      visitorId,
      { tests: 1, odis: 1, t20is: 1 },
      '2027-03-01',
      2027
    );
    assert.equal(matches.length, 3);
    for (const m of matches) {
      if (hostId !== 'ENG') {
        assert.ok(
          !m.venue.toLowerCase().includes("lord's"),
          `Match hosted by ${hostId} must not default to Lord's Cricket Ground (got ${m.venue})`
        );
      }
      const resolved = resolveStadiumImage({
        venue: m.venue,
        hostCountryId: m.homeTeamId,
        format: m.format,
      });
      assert.ok(resolved.src && resolved.src.startsWith('/assets/stadiums/'), 'Must resolve to local stadium asset');
    }
  }

  // Exact match checks
  const lords = resolveStadiumImage({ venue: "Lord's Cricket Ground, London", hostCountryId: 'ENG', format: 'TEST' });
  assert.equal(lords.matchType, 'EXACT');
  assert.equal(lords.src, '/assets/stadiums/lords-day.jpg');

  const delhi = resolveStadiumImage({ venue: 'Arun Jaitley Stadium, Delhi', hostCountryId: 'IND', format: 'TEST' });
  assert.equal(delhi.matchType, 'EXACT');
  assert.equal(delhi.src, '/assets/stadiums/jaitley-day.jpg');

  const chepauk = resolveStadiumImage({ venue: 'M. A. Chidambaram Stadium, Chennai', hostCountryId: 'IND', format: 'T20I' });
  assert.equal(chepauk.matchType, 'EXACT');
  assert.equal(chepauk.src, '/assets/stadiums/chepauk-night.jpg');
});

test('PHASE 15 — Complete 17-Step End-to-End Career Workflow & Multi-Format Simulation', () => {
  // Step 1 & 2: Create new career & select country (India)
  let career = createNewCareerSave('Rahul Dravid', 'IND', 'TEST');
  assert.equal(career.selectedTeamId, 'IND');

  // Step 3: Customize Test squad (swap 15th squad player with another Test pool player)
  const testPool = getNationFormatSelectionData('IND', 'TEST')!.poolPlayerIds;
  const extraTestPlayerId = testPool.find((id) => !career.formatSquads.TEST.squadPlayerIds.includes(id))!;
  const dropTestPlayerId = career.formatSquads.TEST.squadPlayerIds.find(
    (id) => !career.formatSquads.TEST.playingXI.includes(id)
  )!;
  career = removePlayerFromFormatSquad(career, 'TEST', dropTestPlayerId).updatedCareer;
  career = addPlayerToFormatSquad(career, 'TEST', extraTestPlayerId).updatedCareer;
  assert.ok(career.formatSquads.TEST.squadPlayerIds.includes(extraTestPlayerId));
  assert.equal(career.formatSquads.TEST.squadPlayerIds.length, 15);

  // Step 4: Customize ODI squad independently
  const odiPool = getNationFormatSelectionData('IND', 'ODI')!.poolPlayerIds;
  const extraOdiPlayerId = odiPool.find((id) => !career.formatSquads.ODI.squadPlayerIds.includes(id))!;
  const dropOdiPlayerId = career.formatSquads.ODI.squadPlayerIds.find(
    (id) => !career.formatSquads.ODI.playingXI.includes(id)
  )!;
  career = removePlayerFromFormatSquad(career, 'ODI', dropOdiPlayerId).updatedCareer;
  career = addPlayerToFormatSquad(career, 'ODI', extraOdiPlayerId).updatedCareer;
  assert.ok(career.formatSquads.ODI.squadPlayerIds.includes(extraOdiPlayerId));

  // Step 5: Customize T20I squad independently
  const t20Pool = getNationFormatSelectionData('IND', 'T20I')!.poolPlayerIds;
  const extraT20PlayerId = t20Pool.find((id) => !career.formatSquads.T20I.squadPlayerIds.includes(id))!;
  const dropT20PlayerId = career.formatSquads.T20I.squadPlayerIds.find(
    (id) => !career.formatSquads.T20I.playingXI.includes(id)
  )!;
  career = removePlayerFromFormatSquad(career, 'T20I', dropT20PlayerId).updatedCareer;
  career = addPlayerToFormatSquad(career, 'T20I', extraT20PlayerId).updatedCareer;
  assert.ok(career.formatSquads.T20I.squadPlayerIds.includes(extraT20PlayerId));

  // Step 6: Set Playing XIs & batting orders for each format
  for (const fmt of ['TEST', 'ODI', 'T20I'] as MatchFormat[]) {
    const cfg = career.formatSquads[fmt];
    const reorderedXI = [cfg.playingXI[1], cfg.playingXI[0], ...cfg.playingXI.slice(2)];
    career = setFormatPlayingXI(career, fmt, reorderedXI);
    assert.deepEqual(career.formatSquads[fmt].playingXI, reorderedXI);
  }

  // Step 7 & 8 & 9: Open Dashboard & Monthly Calendar & locate upcoming fixture
  const nextInfo = getNextUserMatchInfo(career);
  assert.ok(nextInfo.nextMatch, 'Dashboard/Calendar must have an upcoming user fixture');
  const targetMatch = nextInfo.nextMatch!;

  // Step 10: Confirm match lineup in Match Preparation Modal
  const fmtCfg = career.formatSquads[targetMatch.format];
  career = confirmMatchPreparationLineup(career, targetMatch.id, {
    playingXI: fmtCfg.playingXI,
    captainId: fmtCfg.captainId,
    viceCaptainId: fmtCfg.viceCaptainId,
    wicketKeeperId: fmtCfg.wicketKeeperId,
  });
  const preparedMatch = career.fixtures.find((f) => f.id === targetMatch.id)!;
  assert.equal(preparedMatch.status, 'READY');
  assert.equal(preparedMatch.lineupConfirmed, true);

  // Step 11: Start match via interactive coin toss (User calls HEADS and chooses BAT)
  const homeTeam = INTERNATIONAL_TEAMS.find((tm) => tm.id === preparedMatch.homeTeamId)!;
  const awayTeam = INTERNATIONAL_TEAMS.find((tm) => tm.id === preparedMatch.awayTeamId)!;
  const inn1 = createInitialInningsState(
    1,
    homeTeam.id,
    homeTeam.name,
    awayTeam.id,
    awayTeam.name,
    preparedMatch.homeXI,
    preparedMatch.awayXI,
    undefined,
    { format: preparedMatch.format, pitch: preparedMatch.pitch, weather: preparedMatch.weather }
  );
  let liveMatch = ensureMatchTacticalSystemsInitialized({
    ...preparedMatch,
    status: 'IN_PROGRESS',
    tossWinnerId: preparedMatch.homeTeamId,
    tossChoice: 'BAT',
    currentInningsIndex: 0,
    innings: [inn1],
    dayNumber: 1,
    sessionNumber: 1,
    oversBowledToday: 0,
  });
  assert.equal(liveMatch.status, 'IN_PROGRESS');
  assert.ok(liveMatch.tossWinnerId);
  assert.equal(liveMatch.innings.length, 1);

  // Step 12: Play ball-by-ball, over-by-over, and innings-by-innings
  liveMatch = stepMatchBall(liveMatch);
  assert.equal(liveMatch.status, 'IN_PROGRESS');
  liveMatch = stepMatchOver(liveMatch);
  assert.equal(liveMatch.status, 'IN_PROGRESS');
  liveMatch = stepMatchInnings(liveMatch);
  assert.equal(liveMatch.innings[0].isCompleted, true, 'Innings 1 must be marked completed');
  liveMatch = stepMatchInnings(liveMatch);
  assert.ok(
    liveMatch.innings.length >= 2 || isTerminalMatchStatus(liveMatch.status),
    'Stepping innings 2 must advance to Innings 2 without resetting to toss'
  );

  // Step 13: Complete match
  const completedMatch = simulateFullMatch(liveMatch, career);
  assert.equal(isTerminalMatchStatus(completedMatch.status), true);
  assert.ok(completedMatch.resultText && completedMatch.resultText.length > 0);
  assert.ok(completedMatch.playerOfTheMatch?.playerId);

  // Step 14: Verify full scorecard reconciliation
  for (const inn of completedMatch.innings) {
    const batSum = inn.batters.reduce((s, b) => s + b.runs, 0);
    assert.equal(batSum + inn.extras.total, inn.totalRuns, 'Scorecard runs + extras must equal totalRuns');
  }

  // Step 15: Continue career & apply match result
  const matchesBefore = career.manager.matchesManaged;
  career = applyUserMatchResult(career, completedMatch);
  assert.equal(career.manager.matchesManaged, matchesBefore + 1);

  // Step 16 & 17: Save career & reload saved career
  const serialized = JSON.stringify(career);
  const reloaded = migrateCareerSave(JSON.parse(serialized));
  assert.equal(reloaded.selectedTeamId, 'IND');
  assert.equal(reloaded.manager.matchesManaged, matchesBefore + 1);
  assert.deepEqual(reloaded.formatSquads.TEST.squadPlayerIds, career.formatSquads.TEST.squadPlayerIds);
  assert.deepEqual(reloaded.formatSquads.ODI.squadPlayerIds, career.formatSquads.ODI.squadPlayerIds);
  assert.deepEqual(reloaded.formatSquads.T20I.squadPlayerIds, career.formatSquads.T20I.squadPlayerIds);
});

test('PHASE 18 — Format-Specific Tour Squad Selection (TEST / ODI / T20I Independent Tour Pools)', () => {
  let career = createNewCareerSave('Gautam Gambhir', 'IND', 'TEST');
  const userTour = career.tours.find(
    (t) => t.hostTeamId === 'IND' || t.visitingTeamId === 'IND'
  );
  assert.ok(userTour, 'User nation must have at least one scheduled tour');

  const testPool = getFormatSelectionPoolPlayers('IND', 'TEST').map((p) => p.id);
  const odiPool = getFormatSelectionPoolPlayers('IND', 'ODI').map((p) => p.id);
  const t20Pool = getFormatSelectionPoolPlayers('IND', 'T20I').map((p) => p.id);

  // Select 16 players for TEST tour pool, 15 for ODI tour pool, 14 for T20I tour pool
  const customTestTourPool = testPool.slice(0, 16);
  const customOdiTourPool = odiPool.slice(1, 16); // shifted slice to verify independence
  const customT20TourPool = t20Pool.slice(0, 14);

  career = announceTourSquad(career, userTour!.id, {
    formatSquads: {
      TEST: customTestTourPool,
      ODI: customOdiTourPool,
      T20I: customT20TourPool,
    },
    captains: {
      TEST: customTestTourPool[0],
      ODI: customOdiTourPool[0],
      T20I: customT20TourPool[0],
    },
    viceCaptains: {
      TEST: customTestTourPool[1],
      ODI: customOdiTourPool[1],
      T20I: customT20TourPool[1],
    },
  });

  const updatedTour = career.tours.find((t) => t.id === userTour!.id)!;
  assert.equal(updatedTour.squadAnnounced, true);
  assert.deepEqual(updatedTour.formatSquads?.TEST, customTestTourPool);
  assert.deepEqual(updatedTour.formatSquads?.ODI, customOdiTourPool);
  assert.deepEqual(updatedTour.formatSquads?.T20I, customT20TourPool);

  assert.equal(updatedTour.captains?.TEST, customTestTourPool[0]);
  assert.equal(updatedTour.captains?.ODI, customOdiTourPool[0]);
  assert.equal(updatedTour.captains?.T20I, customT20TourPool[0]);

  assert.equal(updatedTour.viceCaptains?.TEST, customTestTourPool[1]);
  assert.equal(updatedTour.viceCaptains?.ODI, customOdiTourPool[1]);
  assert.equal(updatedTour.viceCaptains?.T20I, customT20TourPool[1]);

  // Verify career.formatSquads are synced per format independently
  assert.deepEqual(career.formatSquads.TEST.squadPlayerIds, customTestTourPool);
  assert.deepEqual(career.formatSquads.ODI.squadPlayerIds, customOdiTourPool);
  assert.deepEqual(career.formatSquads.T20I.squadPlayerIds, customT20TourPool);
});

