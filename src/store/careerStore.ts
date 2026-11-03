import {
  CareerSave,
  Match,
  MatchFormat,
  Player,
  NewsArticle,
  FormatSquadConfig,
  SupportStaff,
  Tour,
  CalendarEvent,
  DataProvenanceReport,
  TournamentEdition,
  RivalryCompetition,
} from '../types/cricket';
import { INTERNATIONAL_TEAMS } from '../data/teams';
import {
  ALL_PLAYERS,
  getDefaultFormatSquadConfig,
  getDefaultSupportStaff,
  getPlayersByCountry,
  getFormatEligiblePlayers,
  getDefaultPlayingXI,
  getDefaultCaptainId,
  getDefaultWicketKeeperId,
} from '../data/squads';
import { OFFICIAL_TOURS } from '../data/tours';
import { buildInternationalCalendar } from '../engine/calendarEngine';
import { simulateWorldMatchesUntil } from '../engine/worldSimulation';
import { OFFICIAL_SOURCES } from '../data/players';
import { INITIAL_ASHES_COMPETITION, INITIAL_BGT_COMPETITION, INITIAL_TOURNAMENT_EDITIONS } from '../data/tournamentData';
import { updateTourSeriesStandings } from '../engine/tourEngine';
import { recordMatchInTournament } from '../engine/tournamentEngine';
import { applyMatchWorkload, TrainingFocus } from '../engine/playerDevelopmentEngine';
import { applyMatchStatsToPlayers } from '../engine/matchEngine';

const STORAGE_KEY = 'icm_career_save_v1';

export type MainNavigationTab =
  | 'DASHBOARD'
  | 'MY_TEAM'
  | 'SQUAD_MANAGEMENT'
  | 'PLAYER_DEVELOPMENT'
  | 'TOURS'
  | 'RIVALRIES'
  | 'MATCH_CENTRE'
  | 'FIXTURES'
  | 'TOURNAMENTS'
  | 'PLAYER_DATABASE'
  | 'RANKINGS'
  | 'STATISTICS'
  | 'NEWS'
  | 'CAREER_HISTORY'
  | 'SETTINGS';

/**
 * Creates default data provenance report for settings & data management
 */
export function generateDataProvenanceReport(): DataProvenanceReport {
  return {
    lastDatabaseUpdate: '2026-11-01',
    playerCount: ALL_PLAYERS.length,
    teamCount: INTERNATIONAL_TEAMS.length,
    historicalMatchCount: 520,
    sources: [
      { name: OFFICIAL_SOURCES.ICC.name, url: OFFICIAL_SOURCES.ICC.url, status: OFFICIAL_SOURCES.ICC.status, lastSync: OFFICIAL_SOURCES.ICC.lastSync },
      { name: OFFICIAL_SOURCES.CRICBUZZ.name, url: OFFICIAL_SOURCES.CRICBUZZ.url, status: OFFICIAL_SOURCES.CRICBUZZ.status, lastSync: OFFICIAL_SOURCES.CRICBUZZ.lastSync },
      { name: OFFICIAL_SOURCES.CRICSHEET.name, url: OFFICIAL_SOURCES.CRICSHEET.url, status: OFFICIAL_SOURCES.CRICSHEET.status, lastSync: OFFICIAL_SOURCES.CRICSHEET.lastSync },
    ],
    missingRecords: [],
    validationChecksPassed: 14,
    validationChecksTotal: 14,
  };
}

/**
 * Creates a fully initialized career save with format squads, calendar, tours, and staff
 */
export function createNewCareerSave(
  managerName: string,
  teamId: string,
  preferredFormat: MatchFormat = 'TEST',
  coachingExperience: 'CLUB' | 'DOMESTIC' | 'INTERNATIONAL' = 'INTERNATIONAL',
  managementStyle: 'TACTICAL' | 'MAN_MANAGER' | 'AGGRESSIVE' | 'ANALYTICAL' = 'TACTICAL'
): CareerSave {
  const team = INTERNATIONAL_TEAMS.find((t) => t.id === teamId) || INTERNATIONAL_TEAMS[0];
  const { events, userMatches, worldMatches } = buildInternationalCalendar(teamId);

  const testConfig = getDefaultFormatSquadConfig(teamId, 'TEST');
  const odiConfig = getDefaultFormatSquadConfig(teamId, 'ODI');
  const t20Config = getDefaultFormatSquadConfig(teamId, 'T20I');

  const tours = JSON.parse(JSON.stringify(OFFICIAL_TOURS)) as Tour[];
  const initialTour = tours.find((t) => t.hostTeamId === teamId || t.visitingTeamId === teamId) || tours[0];

  const newCareer: CareerSave = {
    id: `career_${Date.now()}`,
    version: 2,
    saveName: `${team.name} Championship Campaign`,
    savedAt: new Date().toISOString(),
    manager: {
      name: managerName,
      nationality: team.name,
      preferredFormat,
      coachingExperience,
      managementStyle,
      difficulty: 'NORMAL',
      reputation: 85,
      boardConfidence: 85,
      trophies: [],
      matchesManaged: 0,
      matchesWon: 0,
      matchesLost: 0,
      matchesDrawn: 0,
    },
    supportStaff: getDefaultSupportStaff(teamId),
    selectedTeamId: teamId,
    currentDate: '2026-11-15',
    currentDayIndex: 0,
    currentTourId: initialTour ? initialTour.id : 'tour_bgt_2026_27',
    formatSquads: {
      TEST: testConfig,
      ODI: odiConfig,
      T20I: t20Config,
    },
    customSquadXI: {
      TEST: testConfig.playingXI,
      ODI: odiConfig.playingXI,
      T20I: t20Config.playingXI,
      captainId: testConfig.captainId,
      viceCaptainId: testConfig.viceCaptainId,
      wicketKeeperId: testConfig.wicketKeeperId,
      battingOrder: testConfig.battingOrder,
    },
    fixtures: userMatches,
    worldFixtures: worldMatches,
    tours,
    calendar: events,
    news: generateInitialNews(managerName, team.name),
    dataProvenance: generateDataProvenanceReport(),
    playerTrainingFocus: {},
    playerOverrides: {},
    ashes: JSON.parse(JSON.stringify(INITIAL_ASHES_COMPETITION)),
    borderGavaskar: JSON.parse(JSON.stringify(INITIAL_BGT_COMPETITION)),
    tournamentEditions: JSON.parse(JSON.stringify(INITIAL_TOURNAMENT_EDITIONS)),
  };

  return sanitizeCareerSave(newCareer);
}

/**
 * Creates initial news reports on appointment
 */
export function generateInitialNews(managerName: string, teamName: string): NewsArticle[] {
  return [
    {
      id: 'news_1',
      title: `${managerName} Appointed Head Coach & Manager of ${teamName}`,
      summary: `The National Cricket Board has officially appointed ${managerName} as the head coach across Test, ODI, and T20I formats. Multi-format support staff has been confirmed.`,
      category: 'SQUAD_SELECTION',
      timestamp: '2026-11-15, 09:00',
    },
    {
      id: 'news_2',
      title: `Board Mandate: WTC Final Qualification & Global Trophy Required`,
      summary: `Board executives emphasize that high tactical discipline, rotation between format specialists, and maintaining fitness over bilateral tours will determine contract extension.`,
      category: 'TOURNAMENT',
      timestamp: '2026-11-15, 07:30',
    },
    {
      id: 'news_3',
      title: `Official Calendar Confirmed: Bilateral Tours & World Matches Set`,
      summary: `The full international season schedule is released, including Border-Gavaskar, Ashes, and multi-format tours leading towards the ICC World Test Championship Final at Lord's.`,
      category: 'RANKINGS',
      timestamp: '2026-11-14',
    },
  ];
}

/**
 * Assigns or updates a player's training focus
 */
export function assignPlayerTrainingFocus(
  career: CareerSave,
  playerId: string,
  focus: TrainingFocus
): CareerSave {
  return {
    ...career,
    playerTrainingFocus: {
      ...(career.playerTrainingFocus || {}),
      [playerId]: focus,
    },
  };
}

/**
 * Updates playing XI for a given format and synchronizes scheduled matches
 */
export function setFormatPlayingXI(
  career: CareerSave,
  format: MatchFormat,
  playingXI: string[]
): CareerSave {
  const currentFormatConfig = career.formatSquads[format];
  const userTeamId = career.selectedTeamId;

  // Validate captain, vice-captain, and wicketkeeper against playingXI
  let capId = currentFormatConfig.captainId;
  if (!playingXI.includes(capId)) {
    capId = playingXI[0] || '';
  }

  let vcId = currentFormatConfig.viceCaptainId;
  if (!playingXI.includes(vcId)) {
    vcId = playingXI[1] || playingXI[0] || '';
  }

  let wkId = currentFormatConfig.wicketKeeperId;
  if (!playingXI.includes(wkId)) {
    const wk = playingXI.find((id) => {
      const p = ALL_PLAYERS.find((x) => x.id === id);
      return p?.isWicketKeeper || p?.role === 'WICKETKEEPER_BATTER';
    });
    wkId = wk || playingXI[2] || playingXI[0] || '';
  }

  const updatedConfig: FormatSquadConfig = {
    ...currentFormatConfig,
    playingXI,
    battingOrder: playingXI,
    captainId: capId,
    viceCaptainId: vcId,
    wicketKeeperId: wkId,
  };

  // Synchronize scheduled fixtures
  const updatedFixtures = (career.fixtures || []).map((m) => {
    if (m.status !== 'SCHEDULED' || m.format !== format) return m;
    if (m.homeTeamId === userTeamId) {
      return {
        ...m,
        homeXI: playingXI,
        homeCaptainId: capId,
        homeWicketKeeperId: wkId,
      };
    } else if (m.awayTeamId === userTeamId) {
      return {
        ...m,
        awayXI: playingXI,
        awayCaptainId: capId,
        awayWicketKeeperId: wkId,
      };
    }
    return m;
  });

  return {
    ...career,
    formatSquads: {
      ...career.formatSquads,
      [format]: updatedConfig,
    },
    customSquadXI: {
      ...(career.customSquadXI || {}),
      [format]: playingXI,
      battingOrder: playingXI,
      captainId: capId,
      viceCaptainId: vcId,
      wicketKeeperId: wkId,
    },
    fixtures: updatedFixtures,
  };
}

export const updateSquadXI = setFormatPlayingXI;

export function setFormatCaptain(
  career: CareerSave,
  format: MatchFormat,
  playerId: string
): CareerSave {
  const cfg = career.formatSquads[format];
  if (!cfg) return career;
  const userTeamId = career.selectedTeamId;

  const updatedConfig: FormatSquadConfig = {
    ...cfg,
    captainId: playerId,
  };

  const updatedFixtures = (career.fixtures || []).map((m) => {
    if (m.status !== 'SCHEDULED' || m.format !== format) return m;
    if (m.homeTeamId === userTeamId) return { ...m, homeCaptainId: playerId };
    if (m.awayTeamId === userTeamId) return { ...m, awayCaptainId: playerId };
    return m;
  });

  return {
    ...career,
    formatSquads: {
      ...career.formatSquads,
      [format]: updatedConfig,
    },
    fixtures: updatedFixtures,
  };
}

export function setFormatViceCaptain(
  career: CareerSave,
  format: MatchFormat,
  playerId: string
): CareerSave {
  const cfg = career.formatSquads[format];
  if (!cfg) return career;

  return {
    ...career,
    formatSquads: {
      ...career.formatSquads,
      [format]: {
        ...cfg,
        viceCaptainId: playerId,
      },
    },
  };
}

export function setFormatWicketKeeper(
  career: CareerSave,
  format: MatchFormat,
  playerId: string
): CareerSave {
  const cfg = career.formatSquads[format];
  if (!cfg) return career;
  const userTeamId = career.selectedTeamId;

  const updatedConfig: FormatSquadConfig = {
    ...cfg,
    wicketKeeperId: playerId,
  };

  const updatedFixtures = (career.fixtures || []).map((m) => {
    if (m.status !== 'SCHEDULED' || m.format !== format) return m;
    if (m.homeTeamId === userTeamId) return { ...m, homeWicketKeeperId: playerId };
    if (m.awayTeamId === userTeamId) return { ...m, awayWicketKeeperId: playerId };
    return m;
  });

  return {
    ...career,
    formatSquads: {
      ...career.formatSquads,
      [format]: updatedConfig,
    },
    fixtures: updatedFixtures,
  };
}

/**
 * Advances calendar to the next scheduled match date, simulating world matches in between
 */
export function advanceToNextMatchDate(career: CareerSave): CareerSave {
  const nextMatch = career.fixtures.find((f) => f.status === 'SCHEDULED');
  if (!nextMatch || !nextMatch.date) {
    // Advance 7 days
    const currentMs = new Date(career.currentDate).getTime();
    const nextDate = new Date(currentMs + 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const sim = simulateWorldMatchesUntil(career, nextDate);
    return sim.updatedCareer;
  }

  const sim = simulateWorldMatchesUntil(career, nextMatch.date);
  return sim.updatedCareer;
}

/**
 * Advances calendar by 1 day as a dedicated recovery day,
 * simulating any world matches scheduled on that day and recovering fatigue for user squad players.
 */
export function takeSquadRestDay(career: CareerSave): CareerSave {
  const currentMs = new Date(career.currentDate).getTime();
  const nextDate = new Date(currentMs + 24 * 3600 * 1000).toISOString().split('T')[0];

  // Simulate any world matches on this day
  const sim = simulateWorldMatchesUntil(career, nextDate);
  const updatedCareer = sim.updatedCareer;
  updatedCareer.currentDayIndex = (updatedCareer.currentDayIndex || 0) + 1;

  // Reduce fatigue for all players in user squad
  const userPlayers = getPlayersByCountry(career.selectedTeamId);
  userPlayers.forEach((p) => {
    if (!updatedCareer.playerOverrides) updatedCareer.playerOverrides = {};
    const existing = updatedCareer.playerOverrides[p.id] || {};
    const currentFatigue = existing.workloadFatigue !== undefined ? existing.workloadFatigue : (p.workloadFatigue || 15);
    updatedCareer.playerOverrides[p.id] = {
      ...existing,
      workloadFatigue: Math.max(0, currentFatigue - 15),
    };
  });

  const newsArticle: NewsArticle = {
    id: `news_rest_day_${Date.now()}`,
    title: `Squad Recovery Session Held on ${nextDate}`,
    summary: `Head Coach ${career.manager.name} directed a dedicated rehabilitation and recovery session. Squad fatigue levels have decreased by 15% ahead of upcoming fixtures.`,
    category: 'SQUAD_SELECTION',
    timestamp: nextDate,
    relatedTeamId: career.selectedTeamId,
  };

  updatedCareer.news = [newsArticle, ...updatedCareer.news];
  return updatedCareer;
}

/**
 * Applies a completed user match result to the career save:
 * Updates manager record, tour standings, tournament standings, Ashes/BGT, and player workloads.
 */
export function applyUserMatchResult(
  career: CareerSave,
  completedMatch: Match
): CareerSave {
  const updatedCareer: CareerSave = {
    ...career,
    fixtures: career.fixtures.map((m) => (m.id === completedMatch.id ? completedMatch : m)),
    tours: JSON.parse(JSON.stringify(career.tours || [])),
    tournamentEditions: JSON.parse(JSON.stringify(career.tournamentEditions || INITIAL_TOURNAMENT_EDITIONS)),
    ashes: career.ashes ? JSON.parse(JSON.stringify(career.ashes)) : JSON.parse(JSON.stringify(INITIAL_ASHES_COMPETITION)),
    borderGavaskar: career.borderGavaskar ? JSON.parse(JSON.stringify(career.borderGavaskar)) : JSON.parse(JSON.stringify(INITIAL_BGT_COMPETITION)),
    playerOverrides: { ...(career.playerOverrides || {}) },
  };

  // 1. Manager record update
  const inn1 = completedMatch.innings[0];
  const inn2 = completedMatch.innings[1];
  let userWon = false;
  let userLost = false;
  let isDraw = completedMatch.status === 'DRAW';

  if (inn1 && inn2 && completedMatch.status === 'COMPLETED') {
    const userBatFirst = inn1.battingTeamId === career.selectedTeamId;
    const userRuns = userBatFirst ? inn1.totalRuns : inn2.totalRuns;
    const oppRuns = userBatFirst ? inn2.totalRuns : inn1.totalRuns;
    userWon = userRuns > oppRuns;
    userLost = oppRuns > userRuns;
  }

  updatedCareer.manager = {
    ...updatedCareer.manager,
    matchesManaged: updatedCareer.manager.matchesManaged + 1,
    matchesWon: updatedCareer.manager.matchesWon + (userWon ? 1 : 0),
    matchesLost: updatedCareer.manager.matchesLost + (userLost ? 1 : 0),
    matchesDrawn: updatedCareer.manager.matchesDrawn + (isDraw ? 1 : 0),
  };

  // 2. Tour standings update
  if (completedMatch.tourId && updatedCareer.tours) {
    const tourIdx = updatedCareer.tours.findIndex((t) => t.id === completedMatch.tourId);
    if (tourIdx !== -1) {
      const allTourMatches = [...updatedCareer.fixtures, ...(updatedCareer.worldFixtures || [])];
      const { updatedTour, updatedAshes, updatedBGT } = updateTourSeriesStandings(
        updatedCareer.tours[tourIdx],
        allTourMatches,
        updatedCareer.ashes,
        updatedCareer.borderGavaskar
      );
      updatedCareer.tours[tourIdx] = updatedTour;
      if (updatedAshes) updatedCareer.ashes = updatedAshes;
      if (updatedBGT) updatedCareer.borderGavaskar = updatedBGT;
    }
  }

  // 3. Tournament standings update
  const compId = completedMatch.tournamentId || completedMatch.competitionId;
  if (compId && updatedCareer.tournamentEditions) {
    const tIdx = updatedCareer.tournamentEditions.findIndex((t) => t.id === compId || t.competitionType === compId);
    if (tIdx !== -1) {
      updatedCareer.tournamentEditions[tIdx] = recordMatchInTournament(
        updatedCareer.tournamentEditions[tIdx],
        completedMatch
      );
    }
  }

  // 4. Workload fatigue for playing XI
  const playingXI = completedMatch.homeTeamId === career.selectedTeamId ? completedMatch.homeXI : completedMatch.awayXI;
  playingXI.forEach((pId) => {
    const existing = updatedCareer.playerOverrides?.[pId] || {};
    const baseFatigue = existing.workloadFatigue !== undefined ? existing.workloadFatigue : 15;
    const fatigueGain = completedMatch.format === 'TEST' ? 22 : completedMatch.format === 'ODI' ? 14 : 9;
    updatedCareer.playerOverrides![pId] = {
      ...existing,
      workloadFatigue: Math.min(100, baseFatigue + fatigueGain),
    };
  });

  // 5. Update player career statistics
  applyMatchStatsToPlayers(completedMatch, updatedCareer);

  return updatedCareer;
}

/**
 * Announces the official touring squad (15-20 players) for a tour,
 * ensuring only active male players are eligible and updating format XIs & matches.
 */
export function announceTourSquad(
  career: CareerSave,
  tourId: string,
  playerIds: string[]
): CareerSave {
  const tour = career.tours.find((t) => t.id === tourId);
  if (!tour) return career;

  const userTeamId = career.selectedTeamId;
  const activePool = getPlayersByCountry(userTeamId, true);
  const activeMap = new Map(activePool.map((p) => [p.id, p]));
  const validPlayerIds = playerIds.filter((id) => activeMap.has(id));

  const updatedTours = career.tours.map((t) => {
    if (t.id === tourId) {
      return {
        ...t,
        tourSquadIds: validPlayerIds,
        squadAnnounced: true,
      };
    }
    return t;
  });

  // Ensure formatSquads for formats in this tour draw from this squad
  const updatedFormatSquads: Record<MatchFormat, FormatSquadConfig> = { ...career.formatSquads };
  const rawTourFormats: MatchFormat[] = tour.formats || (Object.keys(tour.series || {}) as MatchFormat[]);
  const tourFormats: MatchFormat[] = rawTourFormats.length > 0 ? rawTourFormats : (['TEST', 'ODI', 'T20I'] as MatchFormat[]);
  tourFormats.forEach((fmt: MatchFormat) => {
    const currentCfg = updatedFormatSquads[fmt];
    if (currentCfg) {
      const eligibleInTour = validPlayerIds.filter((id) => {
        const p = activeMap.get(id);
        return p?.formatEligibility?.[fmt];
      });

      let newXI = currentCfg.playingXI.filter((id: string) => validPlayerIds.includes(id));
      for (const candidateId of eligibleInTour) {
        if (newXI.length >= 11) break;
        if (!newXI.includes(candidateId)) {
          newXI.push(candidateId);
        }
      }
      if (newXI.length < 11) {
        for (const candidate of activePool) {
          if (newXI.length >= 11) break;
          if (!newXI.includes(candidate.id)) newXI.push(candidate.id);
        }
      }

      const capId = newXI.includes(currentCfg.captainId) ? currentCfg.captainId : (newXI[0] || '');
      const vcId = newXI.includes(currentCfg.viceCaptainId) ? currentCfg.viceCaptainId : (newXI[1] || newXI[0] || '');
      const wk = newXI.find((id: string) => {
        const p = activeMap.get(id);
        return p?.isWicketKeeper || p?.role === 'WICKETKEEPER_BATTER';
      });
      const wkId = wk || (newXI.includes(currentCfg.wicketKeeperId) ? currentCfg.wicketKeeperId : (newXI[2] || newXI[0] || ''));

      updatedFormatSquads[fmt] = {
        ...currentCfg,
        playingXI: newXI,
        battingOrder: newXI,
        captainId: capId,
        viceCaptainId: vcId,
        wicketKeeperId: wkId,
        squadPlayerIds: validPlayerIds,
      };
    }
  });

  // Sync scheduled matches belonging to this tour
  const updatedFixtures = (career.fixtures || []).map((m) => {
    if (m.tourId !== tourId || m.status !== 'SCHEDULED') return m;
    const cfg = updatedFormatSquads[m.format];
    if (!cfg) return m;

    if (m.homeTeamId === userTeamId) {
      return {
        ...m,
        homeXI: cfg.playingXI,
        homeCaptainId: cfg.captainId,
        homeWicketKeeperId: cfg.wicketKeeperId,
      };
    } else if (m.awayTeamId === userTeamId) {
      return {
        ...m,
        awayXI: cfg.playingXI,
        awayCaptainId: cfg.captainId,
        awayWicketKeeperId: cfg.wicketKeeperId,
      };
    }
    return m;
  });

  const newsArticle: NewsArticle = {
    id: `news_tour_squad_${Date.now()}`,
    title: `Tour Squad Announced: ${tour.name}`,
    summary: `Head Coach ${career.manager.name} and selectors have announced an official ${validPlayerIds.length}-man touring party for the upcoming campaign.`,
    category: 'SQUAD_SELECTION',
    timestamp: career.currentDate,
    relatedTeamId: career.selectedTeamId,
  };

  return {
    ...career,
    tours: updatedTours,
    formatSquads: updatedFormatSquads,
    fixtures: updatedFixtures,
    news: [newsArticle, ...career.news],
  };
}

/**
 * Sanitizes career save data:
 * - Purges all non-active, retired, legend, and female players from men's squads
 * - Enforces valid 11-player Playing XIs, captains, and wicketkeepers
 * - Synchronizes scheduled matches with sanitized format lineups
 */
export function sanitizeCareerSave(career: CareerSave): CareerSave {
  const userTeamId = career.selectedTeamId || 'IND';
  const activePool = getPlayersByCountry(userTeamId, true);
  const activeIds = new Set(activePool.map((p) => p.id));
  const activeMap = new Map(activePool.map((p) => [p.id, p]));

  const sanitizedFormatSquads: Record<MatchFormat, FormatSquadConfig> = { ...career.formatSquads };

  (['TEST', 'ODI', 'T20I'] as MatchFormat[]).forEach((fmt) => {
    let cfg = sanitizedFormatSquads[fmt];
    if (!cfg) {
      cfg = getDefaultFormatSquadConfig(userTeamId, fmt);
    }
    const fmtEligible = activePool.filter((p) => p.formatEligibility?.[fmt]);
    const fmtEligibleIds = fmtEligible.map((p) => p.id);

    // Keep only active male eligible players
    let validXI = (cfg.playingXI || []).filter((id) => activeIds.has(id));
    for (const pId of fmtEligibleIds) {
      if (validXI.length >= 11) break;
      if (!validXI.includes(pId)) validXI.push(pId);
    }
    validXI = validXI.slice(0, 11);

    let validOrder = (cfg.battingOrder || []).filter((id) => validXI.includes(id));
    for (const id of validXI) {
      if (!validOrder.includes(id)) validOrder.push(id);
    }

    let capId = cfg.captainId;
    if (!validXI.includes(capId) || !activeIds.has(capId)) {
      capId = validXI[0] || '';
    }

    let vcId = cfg.viceCaptainId;
    if (!validXI.includes(vcId) || !activeIds.has(vcId)) {
      vcId = validXI[1] || validXI[0] || '';
    }

    let wkId = cfg.wicketKeeperId;
    const designatedWk = validXI.find((id) => {
      const p = activeMap.get(id);
      return p?.isWicketKeeper || p?.role === 'WICKETKEEPER_BATTER';
    });
    if (designatedWk) {
      wkId = designatedWk;
    } else if (!validXI.includes(wkId) || !activeIds.has(wkId)) {
      wkId = validXI[2] || validXI[0] || '';
    }

    sanitizedFormatSquads[fmt] = {
      ...cfg,
      playingXI: validXI,
      battingOrder: validOrder,
      captainId: capId,
      viceCaptainId: vcId,
      wicketKeeperId: wkId,
      squadPlayerIds: (cfg.squadPlayerIds || []).filter((id) => activeIds.has(id)),
    };
  });

  // Sanitize scheduled fixtures
  const sanitizedFixtures = (career.fixtures || []).map((m) => {
    if (m.status !== 'SCHEDULED') return m;
    const cfg = sanitizedFormatSquads[m.format];
    if (!cfg) return m;

    let homeXI = m.homeXI;
    let awayXI = m.awayXI;
    let homeCap = m.homeCaptainId;
    let awayCap = m.awayCaptainId;
    let homeWk = m.homeWicketKeeperId;
    let awayWk = m.awayWicketKeeperId;

    if (m.homeTeamId === userTeamId) {
      homeXI = cfg.playingXI;
      homeCap = cfg.captainId;
      homeWk = cfg.wicketKeeperId;
    } else {
      homeXI = getDefaultPlayingXI(m.homeTeamId, m.format);
      homeCap = getDefaultCaptainId(m.homeTeamId, m.format);
      homeWk = getDefaultWicketKeeperId(m.homeTeamId, m.format);
    }

    if (m.awayTeamId === userTeamId) {
      awayXI = cfg.playingXI;
      awayCap = cfg.captainId;
      awayWk = cfg.wicketKeeperId;
    } else {
      awayXI = getDefaultPlayingXI(m.awayTeamId, m.format);
      awayCap = getDefaultCaptainId(m.awayTeamId, m.format);
      awayWk = getDefaultWicketKeeperId(m.awayTeamId, m.format);
    }

    return {
      ...m,
      homeXI,
      awayXI,
      homeCaptainId: homeCap,
      awayCaptainId: awayCap,
      homeWicketKeeperId: homeWk,
      awayWicketKeeperId: awayWk,
    };
  });

  // Sanitize tours
  const sanitizedTours = (career.tours || []).map((t) => {
    if (!t.tourSquadIds) return t;
    const valid = t.tourSquadIds.filter((id) => activeIds.has(id));
    return {
      ...t,
      tourSquadIds: valid,
    };
  });

  return {
    ...career,
    formatSquads: sanitizedFormatSquads,
    customSquadXI: {
      TEST: sanitizedFormatSquads.TEST.playingXI,
      ODI: sanitizedFormatSquads.ODI.playingXI,
      T20I: sanitizedFormatSquads.T20I.playingXI,
      captainId: sanitizedFormatSquads.TEST.captainId,
      viceCaptainId: sanitizedFormatSquads.TEST.viceCaptainId,
      wicketKeeperId: sanitizedFormatSquads.TEST.wicketKeeperId,
      battingOrder: sanitizedFormatSquads.TEST.battingOrder,
    },
    fixtures: sanitizedFixtures,
    tours: sanitizedTours,
  };
}

/**
 * Updates support staff members
 */
export function updateSupportStaff(
  career: CareerSave,
  updatedStaff: Partial<SupportStaff>
): CareerSave {
  return {
    ...career,
    supportStaff: {
      ...career.supportStaff,
      ...updatedStaff,
    },
  };
}

/**
 * Helpers for persistent local storage
 */
export function loadSavedCareerFromStorage(): CareerSave | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    // Ensure formatSquads and dataProvenance are present
    if (!parsed.formatSquads && parsed.selectedTeamId) {
      parsed.formatSquads = {
        TEST: getDefaultFormatSquadConfig(parsed.selectedTeamId, 'TEST'),
        ODI: getDefaultFormatSquadConfig(parsed.selectedTeamId, 'ODI'),
        T20I: getDefaultFormatSquadConfig(parsed.selectedTeamId, 'T20I'),
      };
    }
    if (!parsed.supportStaff && parsed.selectedTeamId) {
      parsed.supportStaff = getDefaultSupportStaff(parsed.selectedTeamId);
    }
    if (!parsed.dataProvenance) {
      parsed.dataProvenance = generateDataProvenanceReport();
    }
    if (!parsed.ashes) {
      parsed.ashes = JSON.parse(JSON.stringify(INITIAL_ASHES_COMPETITION));
    }
    if (!parsed.borderGavaskar) {
      parsed.borderGavaskar = JSON.parse(JSON.stringify(INITIAL_BGT_COMPETITION));
    }
    if (!parsed.tournamentEditions) {
      parsed.tournamentEditions = JSON.parse(JSON.stringify(INITIAL_TOURNAMENT_EDITIONS));
    }
    if (!parsed.playerTrainingFocus) {
      parsed.playerTrainingFocus = {};
    }
    if (!parsed.playerOverrides) {
      parsed.playerOverrides = {};
    }

    // Apply strict sanitization to purge legends, retired players, and invalid selections
    return sanitizeCareerSave(parsed);
  } catch {
    return null;
  }
}

export function saveCareerToStorage(career: CareerSave): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(career));
  } catch (err) {
    console.error('Error saving career:', err);
  }
}

export function clearCareerStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Deprecated export for backwards compatibility
export function generateInitialFixtures(userTeamId: string): Match[] {
  const { userMatches } = buildInternationalCalendar(userTeamId);
  return userMatches;
}
