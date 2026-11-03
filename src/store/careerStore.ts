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
import { ALL_PLAYERS, getDefaultFormatSquadConfig, getDefaultSupportStaff, getPlayersByCountry } from '../data/squads';
import { OFFICIAL_TOURS } from '../data/tours';
import { buildInternationalCalendar } from '../engine/calendarEngine';
import { simulateWorldMatchesUntil } from '../engine/worldSimulation';
import { OFFICIAL_SOURCES } from '../data/players';
import { INITIAL_ASHES_COMPETITION, INITIAL_BGT_COMPETITION, INITIAL_TOURNAMENT_EDITIONS } from '../data/tournamentData';
import { updateTourSeriesStandings } from '../engine/tourEngine';
import { recordMatchInTournament } from '../engine/tournamentEngine';
import { applyMatchWorkload, TrainingFocus } from '../engine/playerDevelopmentEngine';

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

  return {
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
 * Updates playing XI for a given format
 */
export function setFormatPlayingXI(
  career: CareerSave,
  format: MatchFormat,
  playingXI: string[]
): CareerSave {
  const currentFormatConfig = career.formatSquads[format];
  return {
    ...career,
    formatSquads: {
      ...career.formatSquads,
      [format]: {
        ...currentFormatConfig,
        playingXI,
      },
    },
    customSquadXI: {
      ...(career.customSquadXI || {}),
      [format]: playingXI,
    },
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

  return updatedCareer;
}

/**
 * Announces the official touring squad (15-20 players) for a tour
 */
export function announceTourSquad(
  career: CareerSave,
  tourId: string,
  playerIds: string[]
): CareerSave {
  const tour = career.tours.find((t) => t.id === tourId);
  if (!tour) return career;

  const updatedTours = career.tours.map((t) => {
    if (t.id === tourId) {
      return {
        ...t,
        tourSquadIds: playerIds,
        squadAnnounced: true,
      };
    }
    return t;
  });

  const newsArticle: NewsArticle = {
    id: `news_tour_squad_${Date.now()}`,
    title: `Tour Squad Announced: ${tour.name}`,
    summary: `Head Coach ${career.manager.name} and selectors have announced an official ${playerIds.length}-man touring party for the upcoming campaign.`,
    category: 'SQUAD_SELECTION',
    timestamp: career.currentDate,
    relatedTeamId: career.selectedTeamId,
  };

  return {
    ...career,
    tours: updatedTours,
    news: [newsArticle, ...career.news],
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

    return parsed;
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
