import {
  CareerSave,
  Match,
  MatchFormat,
  Player,
  NewsArticle,
  FormatSquadConfig,
  SupportStaff,
  Tour,
  DataProvenanceReport,
  TournamentEdition,
  GranularPlayerRole,
  MatchTactics,
  NotificationItem,
} from '../types/cricket';
import { INTERNATIONAL_TEAMS } from '../data/teams';
import {
  ALL_PLAYERS,
  getDefaultFormatSquadConfig,
  getDefaultSupportStaff,
  getEffectivePlayer,
  getEffectivePlayersByCountry,
  getDefaultPlayingXI,
  getDefaultCaptainId,
  getDefaultWicketKeeperId,
} from '../data/squads';
import { buildInternationalCalendar } from '../engine/calendarEngine';
import {
  advanceCareerCalendar,
  CalendarAdvanceMode,
  CalendarAdvancementResult,
  simulateWorldMatchesUntil,
} from '../engine/worldSimulation';
import { OFFICIAL_SOURCES } from '../data/players';
import {
  INITIAL_ASHES_COMPETITION,
  INITIAL_BGT_COMPETITION,
  INITIAL_TOURNAMENT_EDITIONS,
  TEAM_META,
} from '../data/tournamentData';
import { updateTourSeriesStandings } from '../engine/tourEngine';
import { synchronizeAndAdvanceTournaments } from '../engine/tournamentEngine';
import { TrainingFocus } from '../engine/playerDevelopmentEngine';
import {
  applyMatchStatsToPlayers,
  determineMatchOutcome,
  isPreMatchStatus,
  isTerminalMatchStatus,
  ensureMatchTacticalSystemsInitialized,
  mulberry32,
} from '../engine/matchEngine';
import {
  buildAISquadConfig,
  initializeAITeams,
  selectAIPlayingXIForMatch,
} from '../engine/aiTeamEngine';
import {
  initializeDetailedTeamRankings,
  updateTeamRankingsAfterMatch as updateRankingEngineAfterMatch,
  computeAllPlayerRankings,
  createTeamRankingSnapshot,
} from '../engine/rankingEngine';

const STORAGE_KEY = 'icm_career_save_v1';

export type MainNavigationTab =
  | 'DASHBOARD'
  | 'SQUAD_MANAGEMENT'
  | 'TEAM_SELECTION'
  | 'TACTICS'
  | 'FIXTURES'
  | 'TOURS'
  | 'TOURNAMENTS'
  | 'RANKINGS'
  | 'PLAYERS'
  | 'STATISTICS'
  | 'NEWS'
  | 'CAREER_HISTORY'
  | 'SETTINGS'
  | 'MY_TEAM'
  | 'PLAYER_DEVELOPMENT'
  | 'RIVALRIES'
  | 'MATCH_CENTRE';

const SPIN_STYLES = new Set([
  'OFF_BREAK',
  'LEG_BREAK',
  'SLOW_LEFT_ARM',
  'LEFT_ARM_WRIST_SPIN',
]);

/**
 * Granular Player Role classifier:
 * Classifies players accurately into 7 roles based on attributes and database style.
 */
export function getGranularPlayerRole(p: Player): GranularPlayerRole {
  if (p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER') {
    return 'WICKETKEEPER_BATTER';
  }
  if (p.role === 'ALL_ROUNDER') {
    return 'ALL_ROUNDER';
  }
  if (p.role === 'BOWLER') {
    return SPIN_STYLES.has(p.bowlingStyle) ? 'SPIN_BOWLER' : 'FAST_BOWLER';
  }
  const defense = p.attributes?.defense || 70;
  const technique = p.attributes?.technique || 70;
  const power = p.attributes?.powerHitting || 70;
  const aggression = p.attributes?.aggression || 70;

  if (technique >= 78 && defense >= 76) {
    return 'OPENING_BATTER';
  }
  if (power >= 76 || aggression >= 76) {
    return 'MIDDLE_ORDER_BATTER';
  }
  return 'BATTER';
}


/**
 * Single-Country Career Control Guard (Phase 1):
 * Strictly enforces that the user can ONLY manage `career.selectedTeamId`.
 */
export function canUserManageTeam(career: CareerSave, targetTeamId: string): boolean {
  return Boolean(career && targetTeamId && career.selectedTeamId === targetTeamId);
}

export function validateUserManagementAction(
  career: CareerSave,
  targetTeamId: string
): { allowed: boolean; reason?: string } {
  if (canUserManageTeam(career, targetTeamId)) {
    return { allowed: true };
  }
  const targetName = TEAM_META[targetTeamId]?.name || targetTeamId;
  const userName = TEAM_META[career.selectedTeamId]?.name || career.selectedTeamId;
  return {
    allowed: false,
    reason: `Permission denied: You manage ${userName} (${career.selectedTeamId}). ${targetName} (${targetTeamId}) is controlled by AI and is strictly read-only.`,
  };
}

/**
 * Read-only / Manageable National Squad Inspector (Phase 1):
 * Allows inspecting ANY country's squad, captains, playing XI, and player statistics,
 * while flagging AI countries as strictly read-only (`isReadOnly: true`).
 */
export function inspectNationalTeamSquad(
  career: CareerSave,
  targetTeamId: string,
  format: MatchFormat
): {
  teamId: string;
  isUserControlled: boolean;
  isReadOnly: boolean;
  formatConfig: FormatSquadConfig;
  players: Player[];
} {
  const isUser = canUserManageTeam(career, targetTeamId);
  const players = getEffectivePlayersByCountry(targetTeamId, career, true);

  let formatConfig: FormatSquadConfig;
  if (isUser) {
    formatConfig = career.formatSquads[format] || getDefaultFormatSquadConfig(targetTeamId, format);
  } else {
    formatConfig =
      career.aiTeams?.[targetTeamId]?.formatSquads?.[format] ||
      buildAISquadConfig(targetTeamId, format, career);
  }

  return {
    teamId: targetTeamId,
    isUserControlled: isUser,
    isReadOnly: !isUser,
    formatConfig,
    players,
  };
}

/**
 * Creates default data provenance report for settings & data management
 */
export function generateDataProvenanceReport(): DataProvenanceReport {
  return {
    lastDatabaseUpdate: '2026-11-03',
    playerCount: ALL_PLAYERS.length,
    teamCount: INTERNATIONAL_TEAMS.length,
    historicalMatchCount: 520,
    sources: [
      {
        name: OFFICIAL_SOURCES.ICC.name,
        url: OFFICIAL_SOURCES.ICC.url,
        status: OFFICIAL_SOURCES.ICC.status,
        lastSync: OFFICIAL_SOURCES.ICC.lastSync,
      },
      {
        name: OFFICIAL_SOURCES.CRICBUZZ.name,
        url: OFFICIAL_SOURCES.CRICBUZZ.url,
        status: OFFICIAL_SOURCES.CRICBUZZ.status,
        lastSync: OFFICIAL_SOURCES.CRICBUZZ.lastSync,
      },
      {
        name: OFFICIAL_SOURCES.CRICSHEET.name,
        url: OFFICIAL_SOURCES.CRICSHEET.url,
        status: OFFICIAL_SOURCES.CRICSHEET.status,
        lastSync: OFFICIAL_SOURCES.CRICSHEET.lastSync,
      },
    ],
    missingRecords: [],
    validationChecksPassed: 14,
    validationChecksTotal: 14,
  };
}

/**
 * Creates a fully initialized single-country career save with AI management for all other countries,
 * conflict-free multi-year calendar, bilateral tours, rivalries, and tournament editions.
 */
export function createNewCareerSave(
  managerName: string,
  teamId: string,
  preferredFormat: MatchFormat = 'TEST',
  coachingExperience: 'CLUB' | 'DOMESTIC' | 'INTERNATIONAL' | 'FRANCHISE' | 'ACADEMY' = 'INTERNATIONAL',
  managementStyle: 'TACTICAL' | 'MAN_MANAGER' | 'AGGRESSIVE' | 'ANALYTICAL' | 'FITNESS' | 'DISCIPLINARIAN' = 'TACTICAL',
  coachArchetype?: string,
  coachPerk?: string
): CareerSave {
  const team = INTERNATIONAL_TEAMS.find((t) => t.id === teamId) || INTERNATIONAL_TEAMS[0];
  const { events, userMatches, worldMatches, tours } = buildInternationalCalendar(team.id);

  const testConfig = getDefaultFormatSquadConfig(team.id, 'TEST');
  const odiConfig = getDefaultFormatSquadConfig(team.id, 'ODI');
  const t20Config = getDefaultFormatSquadConfig(team.id, 'T20I');

  const initialTour =
    tours.find((t) => t.hostTeamId === team.id || t.visitingTeamId === team.id) || tours[0];

  const aiTeams = initializeAITeams(team.id);
  const teamRankings = initializeDetailedTeamRankings();
  const initialSnapshot = createTeamRankingSnapshot(
    teamRankings,
    '2026-11-15',
    'Career Opening Rankings'
  );

  const initialNotifications: NotificationItem[] = [
    {
      id: 'notif_init_1',
      date: '2026-11-15',
      type: 'TOUR_ANNOUNCEMENT',
      title: 'International Calendar Released',
      message: 'Bilateral tours, WTC fixtures, and ICC tournaments are locked for your nation.',
      read: false,
      actionTab: 'TOURS',
    },
    {
      id: 'notif_init_2',
      date: '2026-11-15',
      type: 'SELECTION_DEADLINE',
      title: 'Independent Format Squads Open',
      message: 'Select and manage separate squads for Test (18), ODI (15), and T20I (16).',
      read: false,
      actionTab: 'SQUAD_MANAGEMENT',
    },
  ];

  const allCountryPlayers = getEffectivePlayersByCountry(team.id, undefined, true);

  const newCareer: CareerSave = {
    id: `career_${Date.now()}`,
    version: 4,
    saveName: `${team.name} International Career`,
    savedAt: new Date().toISOString(),
    manager: {
      name: managerName,
      nationality: team.name,
      preferredFormat,
      coachingExperience,
      managementStyle,
      coachArchetype,
      coachPerk,
      difficulty: 'NORMAL',
      reputation: 85,
      boardConfidence: 85,
      trophies: [],
      matchesManaged: 0,
      matchesWon: 0,
      matchesLost: 0,
      matchesDrawn: 0,
    },
    supportStaff: getDefaultSupportStaff(team.id),
    selectedTeamId: team.id,
    currentDate: '2026-11-15',
    currentDayIndex: 0,
    currentTourId: initialTour ? initialTour.id : 'tour_bgt_2026',
    seasonsGeneratedThroughYear: 2027,
    formatSquads: {
      TEST: {
        ...testConfig,
        targetSquadSize: 18,
        squadPlayerIds: testConfig.squadPlayerIds.slice(0, 18),
        reservePlayerIds: testConfig.squadPlayerIds.length > 18
          ? testConfig.squadPlayerIds.slice(18, 22)
          : allCountryPlayers.filter((p) => !testConfig.squadPlayerIds.includes(p.id)).slice(0, 4).map((p) => p.id),
      },
      ODI: {
        ...odiConfig,
        targetSquadSize: 15,
        squadPlayerIds: odiConfig.squadPlayerIds.slice(0, 15),
        reservePlayerIds: odiConfig.squadPlayerIds.length > 15
          ? odiConfig.squadPlayerIds.slice(15, 19)
          : allCountryPlayers.filter((p) => !odiConfig.squadPlayerIds.includes(p.id)).slice(0, 4).map((p) => p.id),
      },
      T20I: {
        ...t20Config,
        targetSquadSize: 16,
        squadPlayerIds: t20Config.squadPlayerIds.slice(0, 16),
        reservePlayerIds: t20Config.squadPlayerIds.length > 16
          ? t20Config.squadPlayerIds.slice(16, 20)
          : allCountryPlayers.filter((p) => !t20Config.squadPlayerIds.includes(p.id)).slice(0, 4).map((p) => p.id),
      },
    },
    aiTeams,
    teamRankings,
    rankingHistory: [initialSnapshot],
    notifications: initialNotifications,
    teamMorale: 85,
    emergingPlayers: [],
    archivedMatches: [],
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

  newCareer.playerRankings = computeAllPlayerRankings(newCareer);

  return sanitizeCareerSave(newCareer);
}

/**
 * Creates initial news reports on appointment
 */
export function generateInitialNews(managerName: string, teamName: string): NewsArticle[] {
  return [
    {
      id: 'news_1',
      title: `${managerName} Appointed Head Coach of ${teamName}`,
      summary: `The National Cricket Board has appointed ${managerName} to lead ${teamName} across Test, ODI, and T20I cricket. All other international teams operate under independent national AI selectors.`,
      category: 'SQUAD_SELECTION',
      timestamp: '2026-11-15, 09:00',
    },
    {
      id: 'news_2',
      title: `International Calendar Released: WTC Cycle, T20 World Cup & 2027 World Cup`,
      summary: `Full bilateral tours, rivalry series, and ICC tournaments are locked in across all member nations. Prepare your touring squad ahead of opening fixtures.`,
      category: 'TOURNAMENT',
      timestamp: '2026-11-15, 08:00',
    },
  ];
}

function doesPlayerBelongToUserCountry(career: CareerSave, playerId: string): boolean {
  const p = getEffectivePlayer(playerId, career);
  if (!p) return false;
  const uId = career.selectedTeamId;
  return p.countryId === uId || (uId === 'SL' && p.countryId === 'SRI') || (uId === 'WI' && p.countryId === 'WIN');
}

/**
 * Assigns or updates a player's training focus (Strictly enforced for user's country ONLY)
 */
export function assignPlayerTrainingFocus(
  career: CareerSave,
  playerId: string,
  focus: TrainingFocus,
  targetTeamId?: string
): CareerSave {
  if (targetTeamId && !canUserManageTeam(career, targetTeamId)) {
    return career;
  }
  if (!doesPlayerBelongToUserCountry(career, playerId)) {
    return career;
  }

  return {
    ...career,
    playerTrainingFocus: {
      ...(career.playerTrainingFocus || {}),
      [playerId]: focus,
    },
  };
}

/**
 * Updates playing XI for a given format and synchronizes scheduled user matches.
 * Strictly rejects modifications to AI countries or foreign players!
 */
export function setFormatPlayingXI(
  career: CareerSave,
  format: MatchFormat,
  playingXI: string[],
  targetTeamId: string = career.selectedTeamId
): CareerSave {
  if (!canUserManageTeam(career, targetTeamId)) {
    return career;
  }

  const userTeamId = career.selectedTeamId;
  const validUserIds = playingXI.filter((id) => doesPlayerBelongToUserCountry(career, id));
  const uniqueIds = Array.from(new Set(validUserIds));
  if (uniqueIds.length !== 11) {
    return career;
  }

  const currentFormatConfig = career.formatSquads[format];

  let capId = currentFormatConfig.captainId;
  if (!uniqueIds.includes(capId)) {
    capId = uniqueIds[0] || '';
  }

  let vcId = currentFormatConfig.viceCaptainId;
  if (!uniqueIds.includes(vcId) || vcId === capId) {
    vcId = uniqueIds[1] || uniqueIds[0] || '';
  }

  let wkId = currentFormatConfig.wicketKeeperId;
  if (!uniqueIds.includes(wkId)) {
    const wk = uniqueIds.find((id) => {
      const p = getEffectivePlayer(id, career);
      return p?.isWicketKeeper || p?.role === 'WICKETKEEPER_BATTER';
    });
    wkId = wk || uniqueIds[2] || uniqueIds[0] || '';
  }

  const updatedConfig: FormatSquadConfig = {
    ...currentFormatConfig,
    playingXI: uniqueIds,
    battingOrder: uniqueIds,
    captainId: capId,
    viceCaptainId: vcId,
    wicketKeeperId: wkId,
  };

  const updatedFixtures = (career.fixtures || []).map((m) => {
    if (!isPreMatchStatus(m.status) || m.format !== format) return m;
    if (m.homeTeamId === userTeamId) {
      return {
        ...m,
        homeXI: uniqueIds,
        homeCaptainId: capId,
        homeWicketKeeperId: wkId,
      };
    } else if (m.awayTeamId === userTeamId) {
      return {
        ...m,
        awayXI: uniqueIds,
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
      [format]: uniqueIds,
      battingOrder: uniqueIds,
      captainId: capId,
      viceCaptainId: vcId,
      wicketKeeperId: wkId,
    },
    fixtures: updatedFixtures,
  };
}

export const updateSquadXI = setFormatPlayingXI;

export function setFormatBattingOrder(
  career: CareerSave,
  format: MatchFormat,
  battingOrder: string[],
  targetTeamId: string = career.selectedTeamId
): CareerSave {
  if (!canUserManageTeam(career, targetTeamId)) return career;
  const cfg = career.formatSquads[format];
  if (!cfg) return career;
  if (
    battingOrder.length !== 11 ||
    !battingOrder.every((id) => cfg.playingXI.includes(id))
  ) {
    return career;
  }

  return setFormatPlayingXI(career, format, battingOrder, targetTeamId);
}

export function setFormatCaptain(
  career: CareerSave,
  format: MatchFormat,
  playerId: string,
  targetTeamId: string = career.selectedTeamId
): CareerSave {
  if (!canUserManageTeam(career, targetTeamId)) return career;
  if (!doesPlayerBelongToUserCountry(career, playerId)) return career;

  const cfg = career.formatSquads[format];
  if (!cfg) return career;
  const userTeamId = career.selectedTeamId;

  const updatedConfig: FormatSquadConfig = {
    ...cfg,
    captainId: playerId,
  };

  const updatedFixtures = (career.fixtures || []).map((m) => {
    if (!isPreMatchStatus(m.status) || m.format !== format) return m;
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
  playerId: string,
  targetTeamId: string = career.selectedTeamId
): CareerSave {
  if (!canUserManageTeam(career, targetTeamId)) return career;
  if (!doesPlayerBelongToUserCountry(career, playerId)) return career;

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
  playerId: string,
  targetTeamId: string = career.selectedTeamId
): CareerSave {
  if (!canUserManageTeam(career, targetTeamId)) return career;
  if (!doesPlayerBelongToUserCountry(career, playerId)) return career;

  const cfg = career.formatSquads[format];
  if (!cfg) return career;
  const userTeamId = career.selectedTeamId;

  const updatedConfig: FormatSquadConfig = {
    ...cfg,
    wicketKeeperId: playerId,
  };

  const updatedFixtures = (career.fixtures || []).map((m) => {
    if (!isPreMatchStatus(m.status) || m.format !== format) return m;
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
 * Confirms Playing XI, Batting Order, Captain, Wicketkeeper, and Bowling Options for a specific upcoming user match,
 * transitioning the fixture status to 'READY' and locking dynamic AI opposition lineup!
 */
export function confirmMatchPreparationLineup(
  career: CareerSave,
  matchId: string,
  lineup: {
    playingXI: string[];
    captainId: string;
    wicketKeeperId: string;
    bowlingRotation?: string[];
  }
): CareerSave {
  const targetMatch = career.fixtures.find((f) => f.id === matchId);
  if (!targetMatch || !isPreMatchStatus(targetMatch.status)) return career;
  if (
    targetMatch.homeTeamId !== career.selectedTeamId &&
    targetMatch.awayTeamId !== career.selectedTeamId
  ) {
    return career;
  }

  let nextCareer = setFormatPlayingXI(career, targetMatch.format, lineup.playingXI);
  if (lineup.playingXI.includes(lineup.captainId)) {
    nextCareer = setFormatCaptain(nextCareer, targetMatch.format, lineup.captainId);
  }
  if (lineup.playingXI.includes(lineup.wicketKeeperId)) {
    nextCareer = setFormatWicketKeeper(nextCareer, targetMatch.format, lineup.wicketKeeperId);
  }
  if (lineup.bowlingRotation && lineup.bowlingRotation.length > 0) {
    nextCareer = {
      ...nextCareer,
      formatSquads: {
        ...nextCareer.formatSquads,
        [targetMatch.format]: {
          ...nextCareer.formatSquads[targetMatch.format],
          bowlingRotation: lineup.bowlingRotation,
        },
      },
    };
  }

  const oppTeamId =
    targetMatch.homeTeamId === nextCareer.selectedTeamId
      ? targetMatch.awayTeamId
      : targetMatch.homeTeamId;
  const oppAICfg = selectAIPlayingXIForMatch(
    oppTeamId,
    targetMatch.format,
    nextCareer,
    targetMatch.pitch,
    Boolean(targetMatch.tournamentId)
  );

  const userCfg = nextCareer.formatSquads[targetMatch.format];

  nextCareer = {
    ...nextCareer,
    fixtures: nextCareer.fixtures.map((m) => {
      if (m.id !== matchId) return m;
      const userIsHome = m.homeTeamId === nextCareer.selectedTeamId;
      return {
        ...m,
        status: 'READY',
        lineupConfirmed: true,
        homeXI: userIsHome ? userCfg.playingXI : oppAICfg.playingXI,
        homeCaptainId: userIsHome ? userCfg.captainId : oppAICfg.captainId,
        homeWicketKeeperId: userIsHome ? userCfg.wicketKeeperId : oppAICfg.wicketKeeperId,
        awayXI: userIsHome ? oppAICfg.playingXI : userCfg.playingXI,
        awayCaptainId: userIsHome ? oppAICfg.captainId : userCfg.captainId,
        awayWicketKeeperId: userIsHome ? oppAICfg.wicketKeeperId : userCfg.wicketKeeperId,
      };
    }),
  };

  return nextCareer;
}

/**
 * Format-Specific National Squad Management Actions (Phase 4):
 * Test, ODI, and T20I squads are strictly independent.
 * Modifying one format squad never mutates the other format squads!
 */
export function setFormatTargetSquadSize(
  career: CareerSave,
  format: MatchFormat,
  size: number
): CareerSave {
  const targetSize = Math.max(15, Math.min(20, size));
  const cfg = career.formatSquads[format];
  if (!cfg) return career;
  return {
    ...career,
    formatSquads: {
      ...career.formatSquads,
      [format]: {
        ...cfg,
        targetSquadSize: targetSize,
      },
    },
  };
}

export function addPlayerToFormatSquad(
  career: CareerSave,
  format: MatchFormat,
  playerId: string
): { updatedCareer: CareerSave; error?: string } {
  if (!doesPlayerBelongToUserCountry(career, playerId)) {
    return { updatedCareer: career, error: 'Player does not belong to your nation.' };
  }
  const cfg = career.formatSquads[format];
  if (!cfg) return { updatedCareer: career };
  const currentSquad = cfg.squadPlayerIds || [];
  if (currentSquad.includes(playerId)) {
    return { updatedCareer: career, error: 'Player is already selected in this format squad.' };
  }
  const maxSize = cfg.targetSquadSize || (format === 'TEST' ? 18 : format === 'ODI' ? 15 : 16);
  if (currentSquad.length >= maxSize) {
    return {
      updatedCareer: career,
      error: `Format squad has reached its configured size of ${maxSize} players. Remove a player or promote from reserves.`,
    };
  }

  const updatedReserves = (cfg.reservePlayerIds || []).filter((id) => id !== playerId);
  const updatedSquad = [...currentSquad, playerId];

  return {
    updatedCareer: {
      ...career,
      formatSquads: {
        ...career.formatSquads,
        [format]: {
          ...cfg,
          squadPlayerIds: updatedSquad,
          reservePlayerIds: updatedReserves,
        },
      },
    },
  };
}

export function removePlayerFromFormatSquad(
  career: CareerSave,
  format: MatchFormat,
  playerId: string
): { updatedCareer: CareerSave; error?: string } {
  const cfg = career.formatSquads[format];
  if (!cfg) return { updatedCareer: career };
  const currentSquad = cfg.squadPlayerIds || [];
  if (!currentSquad.includes(playerId)) {
    return { updatedCareer: career, error: 'Player is not in this format squad.' };
  }
  if (currentSquad.length <= 11) {
    return {
      updatedCareer: career,
      error: 'Cannot reduce squad below 11 players without adding a replacement first.',
    };
  }

  const updatedSquad = currentSquad.filter((id) => id !== playerId);

  let updatedXI = [...cfg.playingXI];
  if (updatedXI.includes(playerId)) {
    const candidate = updatedSquad.find((id) => !updatedXI.includes(id));
    if (candidate) {
      updatedXI = updatedXI.map((id) => (id === playerId ? candidate : id));
    } else {
      updatedXI = updatedXI.filter((id) => id !== playerId);
    }
  }

  let capId = cfg.captainId;
  if (capId === playerId) {
    capId = updatedXI[0] || updatedSquad[0] || '';
  }
  let vcId = cfg.viceCaptainId;
  if (vcId === playerId) {
    vcId = updatedXI[1] || updatedSquad[1] || updatedXI[0] || '';
  }
  let wkId = cfg.wicketKeeperId;
  if (wkId === playerId) {
    const nextWk = updatedXI.find((id) => {
      const p = getEffectivePlayer(id, career);
      return p?.isWicketKeeper || p?.role === 'WICKETKEEPER_BATTER';
    });
    wkId = nextWk || updatedXI[2] || updatedSquad[0] || '';
  }

  return {
    updatedCareer: {
      ...career,
      formatSquads: {
        ...career.formatSquads,
        [format]: {
          ...cfg,
          squadPlayerIds: updatedSquad,
          playingXI: updatedXI,
          battingOrder: updatedXI,
          captainId: capId,
          viceCaptainId: vcId,
          wicketKeeperId: wkId,
        },
      },
    },
  };
}

export function toggleFormatReservePlayer(
  career: CareerSave,
  format: MatchFormat,
  playerId: string
): CareerSave {
  if (!doesPlayerBelongToUserCountry(career, playerId)) return career;
  const cfg = career.formatSquads[format];
  if (!cfg) return career;
  const reserves = cfg.reservePlayerIds || [];
  const nextReserves = reserves.includes(playerId)
    ? reserves.filter((id) => id !== playerId)
    : [...reserves, playerId];

  return {
    ...career,
    formatSquads: {
      ...career.formatSquads,
      [format]: {
        ...cfg,
        reservePlayerIds: nextReserves,
      },
    },
  };
}

export function promoteReserveToFormatSquad(
  career: CareerSave,
  format: MatchFormat,
  reservePlayerId: string,
  replacePlayerId?: string
): { updatedCareer: CareerSave; error?: string } {
  const cfg = career.formatSquads[format];
  if (!cfg) return { updatedCareer: career };
  const reserves = cfg.reservePlayerIds || [];
  if (!reserves.includes(reservePlayerId)) {
    return { updatedCareer: career, error: 'Selected player is not in reserves.' };
  }

  let updatedSquad = [...(cfg.squadPlayerIds || [])];
  const maxSize = cfg.targetSquadSize || (format === 'TEST' ? 18 : format === 'ODI' ? 15 : 16);

  if (replacePlayerId && updatedSquad.includes(replacePlayerId)) {
    updatedSquad = updatedSquad.map((id) => (id === replacePlayerId ? reservePlayerId : id));
  } else if (updatedSquad.length < maxSize) {
    updatedSquad.push(reservePlayerId);
  } else {
    return {
      updatedCareer: career,
      error: `Squad is full (${maxSize}/${maxSize}). Choose a player to replace.`,
    };
  }

  const updatedReserves = reserves.filter((id) => id !== reservePlayerId);
  if (replacePlayerId && !updatedReserves.includes(replacePlayerId)) {
    updatedReserves.push(replacePlayerId);
  }

  return {
    updatedCareer: {
      ...career,
      formatSquads: {
        ...career.formatSquads,
        [format]: {
          ...cfg,
          squadPlayerIds: updatedSquad,
          reservePlayerIds: updatedReserves,
        },
      },
    },
  };
}

export function replaceInjuredPlayerInFormatSquad(
  career: CareerSave,
  format: MatchFormat,
  injuredPlayerId: string,
  replacementPlayerId: string
): { updatedCareer: CareerSave; error?: string } {
  if (!doesPlayerBelongToUserCountry(career, replacementPlayerId)) {
    return { updatedCareer: career, error: 'Replacement must belong to your nation.' };
  }
  const cfg = career.formatSquads[format];
  if (!cfg) return { updatedCareer: career };
  if (!cfg.squadPlayerIds.includes(injuredPlayerId)) {
    return { updatedCareer: career, error: 'Injured player is not in this squad.' };
  }

  const updatedSquad = cfg.squadPlayerIds.map((id) => (id === injuredPlayerId ? replacementPlayerId : id));
  const updatedXI = cfg.playingXI.map((id) => (id === injuredPlayerId ? replacementPlayerId : id));
  const updatedOrder = cfg.battingOrder.map((id) => (id === injuredPlayerId ? replacementPlayerId : id));
  const updatedReserves = (cfg.reservePlayerIds || []).filter((id) => id !== replacementPlayerId);

  return {
    updatedCareer: {
      ...career,
      formatSquads: {
        ...career.formatSquads,
        [format]: {
          ...cfg,
          squadPlayerIds: updatedSquad,
          playingXI: updatedXI,
          battingOrder: updatedOrder,
          reservePlayerIds: updatedReserves,
        },
      },
    },
  };
}

export function resetFormatSquadSelection(
  career: CareerSave,
  format: MatchFormat
): CareerSave {
  const defaultCfg = getDefaultFormatSquadConfig(career.selectedTeamId, format);
  return {
    ...career,
    formatSquads: {
      ...career.formatSquads,
      [format]: defaultCfg,
    },
  };
}

export function confirmFormatSquad(
  career: CareerSave,
  format: MatchFormat
): CareerSave {
  const cfg = career.formatSquads[format];
  if (!cfg) return career;
  const updatedConfig: FormatSquadConfig = {
    ...cfg,
    isConfirmed: true,
    lastConfirmedDate: career.currentDate,
  };
  return {
    ...career,
    formatSquads: {
      ...career.formatSquads,
      [format]: updatedConfig,
    },
  };
}

export function updateFormatDefaultTactics(
  career: CareerSave,
  format: MatchFormat,
  tactics: MatchTactics
): CareerSave {
  const cfg = career.formatSquads[format];
  if (!cfg) return career;
  return {
    ...career,
    formatSquads: {
      ...career.formatSquads,
      [format]: {
        ...cfg,
        defaultTactics: tactics,
      },
    },
  };
}


/**
 * Returns structured Next Match metadata for the Dashboard and Post-Match workflow (Phase 6).
 */
export function getNextUserMatchInfo(career: CareerSave): {
  nextMatch: Match | undefined;
  daysRemaining: number;
  isHome: boolean;
  locationLabel: 'HOME' | 'AWAY' | 'NEUTRAL';
  seriesScoreText: string;
  activeTour?: Tour;
  activeTournament?: TournamentEdition;
} {
  const nextMatch = career.fixtures.find((f) => !isTerminalMatchStatus(f.status));
  if (!nextMatch) {
    return {
      nextMatch: undefined,
      daysRemaining: 0,
      isHome: true,
      locationLabel: 'HOME',
      seriesScoreText: 'No pending fixture',
    };
  }

  const curMs = new Date(career.currentDate || '2026-11-15').getTime();
  const matchMs = new Date(nextMatch.date || career.currentDate).getTime();
  const daysRemaining = Math.max(0, Math.round((matchMs - curMs) / (24 * 3600 * 1000)));

  const activeTour = nextMatch.tourId
    ? career.tours.find((t) => t.id === nextMatch.tourId)
    : undefined;

  const compId = nextMatch.tournamentId || nextMatch.competitionId;
  const activeTournament = compId
    ? career.tournamentEditions?.find((t) => t.id === compId)
    : undefined;

  let locationLabel: 'HOME' | 'AWAY' | 'NEUTRAL' =
    nextMatch.homeTeamId === career.selectedTeamId ? 'HOME' : 'AWAY';
  if (
    activeTournament?.hostCountryId &&
    activeTournament.hostCountryId !== nextMatch.homeTeamId &&
    activeTournament.hostCountryId !== nextMatch.awayTeamId
  ) {
    locationLabel = 'NEUTRAL';
  }

  let seriesScoreText = 'Series 0–0';
  if (activeTour) {
    const s = activeTour.series[nextMatch.format];
    if (s) {
      seriesScoreText = `${activeTour.hostTeamId} ${s.homeWins} – ${s.awayWins} ${activeTour.visitingTeamId}`;
    }
  } else if (activeTournament) {
    const row = activeTournament.table.find((r) => r.teamId === career.selectedTeamId);
    if (row) {
      seriesScoreText = activeTournament.rules.usePCT
        ? `WTC: ${row.pointsPercentage || 0}% PCT (${row.won}W-${row.lost}L)`
        : `${activeTournament.name}: ${row.points} pts (NRR ${(row.netRunRate || 0) >= 0 ? '+' : ''}${row.netRunRate || 0})`;
    }
  }

  return {
    nextMatch,
    daysRemaining,
    isHome: locationLabel === 'HOME',
    locationLabel,
    seriesScoreText,
    activeTour,
    activeTournament,
  };
}

/**
 * Controlled calendar progression wrapper
 */
export function advanceCareerTime(
  career: CareerSave,
  mode: CalendarAdvanceMode
): CalendarAdvancementResult {
  return advanceCareerCalendar(career, mode);
}

/**
 * Advances calendar to the next scheduled match date, simulating world matches in between
 */
export function advanceToNextMatchDate(career: CareerSave): CareerSave {
  const nextMatch = career.fixtures.find((f) => isPreMatchStatus(f.status));
  if (!nextMatch || !nextMatch.date) {
    const res = advanceCareerCalendar(career, 'ONE_WEEK');
    return res.updatedCareer;
  }
  if (nextMatch.date <= career.currentDate) {
    return career;
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

  const sim = simulateWorldMatchesUntil(career, nextDate);
  const updatedCareer = sim.updatedCareer;
  updatedCareer.currentDayIndex = (updatedCareer.currentDayIndex || 0) + 1;

  const userPlayers = getEffectivePlayersByCountry(career.selectedTeamId, updatedCareer, true);
  userPlayers.forEach((p) => {
    if (!updatedCareer.playerOverrides) updatedCareer.playerOverrides = {};
    const existing = updatedCareer.playerOverrides[p.id] || {};
    const currentFatigue =
      existing.workloadFatigue !== undefined ? existing.workloadFatigue : p.workloadFatigue || 15;
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
 * Applies a completed user match result to the career save EXACTLY ONCE (idempotent!):
 * Updates manager record, tour standings, tournament standings/knockouts, Ashes/BGT, ICC rankings,
 * player statistics, form, fatigue, injuries, and news WITHOUT skipping the calendar date!
 */
export function applyUserMatchResult(
  career: CareerSave,
  completedMatch: Match
): CareerSave {
  if (!isTerminalMatchStatus(completedMatch.status)) {
    return career;
  }

  // Strict idempotency guard: if this fixture was ALREADY recorded in `career.fixtures`, never apply stats/standings twice!
  const existingStored = career.fixtures.find((m) => m.id === completedMatch.id);
  if (existingStored && existingStored.statsRecorded) {
    return career;
  }

  const matchCopy: Match = {
    ...completedMatch,
    statsRecorded: false, // Will be flipped to true inside `applyMatchStatsToPlayers`
  };

  const updatedCareer: CareerSave = {
    ...career,
    fixtures: career.fixtures.map((m) => (m.id === matchCopy.id ? matchCopy : m)),
    worldFixtures: [...(career.worldFixtures || [])],
    tours: JSON.parse(JSON.stringify(career.tours || [])),
    tournamentEditions: JSON.parse(
      JSON.stringify(career.tournamentEditions || INITIAL_TOURNAMENT_EDITIONS)
    ),
    ashes: career.ashes
      ? JSON.parse(JSON.stringify(career.ashes))
      : JSON.parse(JSON.stringify(INITIAL_ASHES_COMPETITION)),
    borderGavaskar: career.borderGavaskar
      ? JSON.parse(JSON.stringify(career.borderGavaskar))
      : JSON.parse(JSON.stringify(INITIAL_BGT_COMPETITION)),
    teamRankings: career.teamRankings
      ? JSON.parse(JSON.stringify(career.teamRankings))
      : initializeDetailedTeamRankings(),
    playerOverrides: JSON.parse(JSON.stringify(career.playerOverrides || {})),
    calendar: [...(career.calendar || [])],
    news: [...(career.news || [])],
  };

  // 1. Canonical multi-innings winner calculation (fixes 4-innings Tests!)
  const outcome = determineMatchOutcome(matchCopy);
  const userWon = outcome.winnerTeamId === career.selectedTeamId;
  const userLost =
    outcome.winnerTeamId !== null && outcome.winnerTeamId !== career.selectedTeamId;
  const isDrawOrTie = outcome.isDraw || outcome.isTie;

  updatedCareer.manager = {
    ...updatedCareer.manager,
    matchesManaged: updatedCareer.manager.matchesManaged + 1,
    matchesWon: updatedCareer.manager.matchesWon + (userWon ? 1 : 0),
    matchesLost: updatedCareer.manager.matchesLost + (userLost ? 1 : 0),
    matchesDrawn: updatedCareer.manager.matchesDrawn + (isDrawOrTie ? 1 : 0),
    reputation: Math.max(
      30,
      Math.min(100, updatedCareer.manager.reputation + (userWon ? 2 : userLost ? -1 : 0))
    ),
    boardConfidence: Math.max(
      25,
      Math.min(100, updatedCareer.manager.boardConfidence + (userWon ? 3 : userLost ? -2 : 0))
    ),
  };

  // 2. Player career statistics (recorded into `simulatedStats`, preserving historical `stats`)
  applyMatchStatsToPlayers(matchCopy, updatedCareer);
  updatedCareer.fixtures = updatedCareer.fixtures.map((m) =>
    m.id === matchCopy.id ? { ...matchCopy, statsRecorded: true } : m
  );

  // 3. Workload fatigue, performance form & injury check for user playing XI
  const playingXI =
    matchCopy.homeTeamId === career.selectedTeamId ? matchCopy.homeXI : matchCopy.awayXI;
  const fatigueGain =
    matchCopy.format === 'TEST' ? 22 : matchCopy.format === 'ODI' ? 14 : 9;
  const injRand = mulberry32((matchCopy.seed || 303) + 555);
  const newHeadlines: NewsArticle[] = [];

  playingXI.forEach((pId) => {
    const eff = getEffectivePlayer(pId, updatedCareer);
    const existing = updatedCareer.playerOverrides?.[pId] || {};
    const baseFatigue =
      existing.workloadFatigue !== undefined
        ? existing.workloadFatigue
        : eff?.workloadFatigue || 15;
    const nextFatigue = Math.min(100, baseFatigue + fatigueGain);

    let runs = 0;
    let wkts = 0;
    matchCopy.innings.forEach((inn) => {
      const b = inn.batters.find((x) => x.playerId === pId);
      if (b) runs += b.runs;
      const bw = inn.bowlers.find((x) => x.playerId === pId);
      if (bw) wkts += bw.wickets;
    });

    const curForm = eff?.currentForm ?? eff?.attributes.currentForm ?? 78;
    const formDelta =
      runs >= 75 || wkts >= 4 ? 4 : runs >= 35 || wkts >= 2 ? 2 : runs < 8 && wkts === 0 ? -1 : 0;

    let isInjured = eff?.isInjured || false;
    let injuryDaysRemaining = eff?.injuryDaysRemaining || 0;
    let injuryType = eff?.injuryType;
    let injurySeverity = eff?.injurySeverity;

    if (!isInjured && nextFatigue >= 82 && injRand() < 0.04) {
      isInjured = true;
      injuryDaysRemaining = 6 + Math.floor(injRand() * 12);
      injuryType = eff?.role === 'BOWLER' ? 'Shoulder Stiffness' : 'Grade 1 Hamstring Strain';
      injurySeverity = 'MINOR';
      newHeadlines.push({
        id: `news_usr_inj_${pId}_${matchCopy.id}`,
        title: `Medical Update: ${eff?.name || pId} Out for ${injuryDaysRemaining} Days (${injuryType})`,
        summary: `High match workload (${nextFatigue}%) contributed to a minor ${injuryType.toLowerCase()} for ${eff?.name || pId}.`,
        category: 'INJURY',
        timestamp: matchCopy.date || updatedCareer.currentDate,
        relatedTeamId: career.selectedTeamId,
        relatedPlayerId: pId,
      });
    }

    updatedCareer.playerOverrides![pId] = {
      ...existing,
      workloadFatigue: nextFatigue,
      currentForm: Math.max(45, Math.min(99, curForm + formDelta)),
      isInjured,
      injuryDaysRemaining,
      injuryType,
      injurySeverity,
    };
  });

  // 4. Tour & Rivalry Standings update
  if (matchCopy.tourId && updatedCareer.tours) {
    const tourIdx = updatedCareer.tours.findIndex((t) => t.id === matchCopy.tourId);
    if (tourIdx !== -1) {
      const wasDone = updatedCareer.tours[tourIdx].status === 'COMPLETED';
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

      if (!wasDone && updatedTour.status === 'COMPLETED' && updatedTour.resultText) {
        newHeadlines.push({
          id: `news_usr_tour_${updatedTour.id}`,
          title: `Tour Complete: ${updatedTour.resultText}`,
          summary: `${updatedTour.name} has concluded. ${updatedTour.resultText}`,
          category: 'MATCH_REPORT',
          timestamp: matchCopy.date || updatedCareer.currentDate,
          relatedTeamId: career.selectedTeamId,
        });
      }
    }
  }

  // 5. ICC / ICM Rankings update
  const { updatedRankings, rankingNews, newSnapshot } = updateRankingEngineAfterMatch(
    updatedCareer,
    matchCopy
  );
  updatedCareer.teamRankings = updatedRankings;
  if (newSnapshot) {
    updatedCareer.rankingHistory = [...(updatedCareer.rankingHistory || []), newSnapshot];
  }
  newHeadlines.push(...rankingNews);

  // Recalculate 9 player ranking categories based on fresh match performances
  updatedCareer.playerRankings = computeAllPlayerRankings(updatedCareer);

  // Update Team Morale dynamically from performance & board confidence
  const currentMorale = updatedCareer.teamMorale ?? 80;
  updatedCareer.teamMorale = Math.max(
    20,
    Math.min(100, currentMorale + (userWon ? 4 : userLost ? -3 : 1))
  );

  // Add ranking notifications if team moved
  rankingNews.forEach((rn) => {
    if (!updatedCareer.notifications) updatedCareer.notifications = [];
    updatedCareer.notifications.unshift({
      id: `notif_${rn.id}`,
      date: rn.timestamp,
      type: 'RANKING_CHANGE',
      title: rn.title,
      message: rn.summary,
      read: false,
      actionTab: 'RANKINGS',
    });
  });

  // 6. Tournament Standings & Knockout Synchronization
  const tourneyNews = synchronizeAndAdvanceTournaments(
    updatedCareer,
    matchCopy.date || updatedCareer.currentDate
  );
  newHeadlines.push(...tourneyNews);

  // 7. Match Report News Article
  newHeadlines.unshift({
    id: `news_user_match_${matchCopy.id}`,
    title: `${matchCopy.format} Result: ${matchCopy.resultText || `${matchCopy.homeTeamId} vs ${matchCopy.awayTeamId}`}`,
    summary: `${matchCopy.seriesName || 'International Match'} at ${matchCopy.venue}. ${
      matchCopy.playerOfTheMatch
        ? `Player of the Match: ${matchCopy.playerOfTheMatch.playerName} (${matchCopy.playerOfTheMatch.reason}).`
        : ''
    }`,
    category: 'MATCH_REPORT',
    timestamp: matchCopy.date || updatedCareer.currentDate,
    relatedTeamId: career.selectedTeamId,
  });

  updatedCareer.calendar = updatedCareer.calendar.map((ev) =>
    ev.matchId === matchCopy.id ? { ...ev, isSimulated: true } : ev
  );

  updatedCareer.news = [...newHeadlines, ...updatedCareer.news].slice(0, 180);

  return updatedCareer;
}

/**
 * Announces the official touring squad (15-20 players) for a user tour.
 * Rejects attempts to announce squads for AI-only tours!
 */
export function announceTourSquad(
  career: CareerSave,
  tourId: string,
  playerIds: string[]
): CareerSave {
  const tour = career.tours.find((t) => t.id === tourId);
  if (!tour) return career;

  const userTeamId = career.selectedTeamId;
  if (tour.hostTeamId !== userTeamId && tour.visitingTeamId !== userTeamId) {
    return career;
  }

  const activePool = getEffectivePlayersByCountry(userTeamId, career, true);
  const activeMap = new Map(activePool.map((p) => [p.id, p]));
  const validPlayerIds = playerIds.filter((id) => activeMap.has(id));
  if (validPlayerIds.length < 11) return career;

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

  const updatedFormatSquads: Record<MatchFormat, FormatSquadConfig> = { ...career.formatSquads };
  const rawTourFormats: MatchFormat[] =
    tour.formats || (Object.keys(tour.series || {}) as MatchFormat[]);
  const tourFormats: MatchFormat[] =
    rawTourFormats.length > 0 ? rawTourFormats : (['TEST', 'ODI', 'T20I'] as MatchFormat[]);

  tourFormats.forEach((fmt: MatchFormat) => {
    const currentCfg = updatedFormatSquads[fmt];
    if (currentCfg) {
      const eligibleInTour = validPlayerIds.filter((id) => {
        const p = activeMap.get(id);
        return p?.formatEligibility?.[fmt];
      });

      const newXI = currentCfg.playingXI.filter((id: string) => validPlayerIds.includes(id));
      for (const candidateId of eligibleInTour) {
        if (newXI.length >= 11) break;
        if (!newXI.includes(candidateId)) newXI.push(candidateId);
      }
      for (const candidateId of validPlayerIds) {
        if (newXI.length >= 11) break;
        if (!newXI.includes(candidateId)) newXI.push(candidateId);
      }
      if (newXI.length < 11) {
        for (const candidate of activePool) {
          if (newXI.length >= 11) break;
          if (!newXI.includes(candidate.id)) newXI.push(candidate.id);
        }
      }

      const capId = newXI.includes(currentCfg.captainId) ? currentCfg.captainId : newXI[0] || '';
      const vcId = newXI.includes(currentCfg.viceCaptainId)
        ? currentCfg.viceCaptainId
        : newXI[1] || newXI[0] || '';
      const wk = newXI.find((id: string) => {
        const p = activeMap.get(id);
        return p?.isWicketKeeper || p?.role === 'WICKETKEEPER_BATTER';
      });
      const wkId =
        wk ||
        (newXI.includes(currentCfg.wicketKeeperId)
          ? currentCfg.wicketKeeperId
          : newXI[2] || newXI[0] || '');

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

  const updatedFixtures = (career.fixtures || []).map((m) => {
    if (m.tourId !== tourId || !isPreMatchStatus(m.status)) return m;
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
    summary: `Head Coach ${career.manager.name} and national selectors have named a ${validPlayerIds.length}-player touring squad for ${tour.name}.`,
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
 * Sanitizes career save data & migrates older save versions safely without wiping career progress!
 */
export function sanitizeCareerSave(career: CareerSave): CareerSave {
  const userTeamId = career.selectedTeamId || 'IND';
  const activePool = getEffectivePlayersByCountry(userTeamId, career, true);
  const activeIds = new Set(activePool.map((p) => p.id));
  const activeMap = new Map(activePool.map((p) => [p.id, p]));

  const sanitizedFormatSquads: Record<MatchFormat, FormatSquadConfig> = { ...career.formatSquads };

  (['TEST', 'ODI', 'T20I'] as MatchFormat[]).forEach((fmt) => {
    let cfg = sanitizedFormatSquads[fmt];
    if (!cfg) {
      cfg = getDefaultFormatSquadConfig(userTeamId, fmt);
    }
    let fmtEligible = activePool.filter((p) => p.formatEligibility?.[fmt]);
    if (fmtEligible.length < 11) fmtEligible = activePool;
    const fmtEligibleIds = fmtEligible.map((p) => p.id);

    let validXI = (cfg.playingXI || []).filter((id) => activeIds.has(id));
    for (const pId of fmtEligibleIds) {
      if (validXI.length >= 11) break;
      if (!validXI.includes(pId)) validXI.push(pId);
    }
    validXI = validXI.slice(0, 11);

    const validOrder = (cfg.battingOrder || []).filter((id) => validXI.includes(id));
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

    const defaultTargetSize = fmt === 'TEST' ? 18 : fmt === 'ODI' ? 15 : 16;
    const targetSquadSize = cfg.targetSquadSize || defaultTargetSize;
    let filteredSquad = (cfg.squadPlayerIds || []).filter((id) => activeIds.has(id));
    let initialReserves = (cfg.reservePlayerIds || []).filter((id) => activeIds.has(id));

    // Ensure all 11 playing XI are in the squad
    for (const xiId of validXI) {
      if (!filteredSquad.includes(xiId)) filteredSquad.unshift(xiId);
    }

    // Overflow players beyond targetSquadSize into reserves
    if (filteredSquad.length > targetSquadSize) {
      const overflow = filteredSquad.slice(targetSquadSize);
      filteredSquad = filteredSquad.slice(0, targetSquadSize);
      for (const ovId of overflow) {
        if (!initialReserves.includes(ovId)) {
          initialReserves.push(ovId);
        }
      }
    }

    sanitizedFormatSquads[fmt] = {
      ...cfg,
      targetSquadSize,
      reservePlayerIds: initialReserves,
      wicketKeeperOptions: cfg.wicketKeeperOptions || [wkId],
      isConfirmed: cfg.isConfirmed !== undefined ? cfg.isConfirmed : true,
      lastConfirmedDate: cfg.lastConfirmedDate || career.currentDate || '2026-11-15',
      playingXI: validXI,
      battingOrder: validOrder,
      captainId: capId,
      viceCaptainId: vcId,
      wicketKeeperId: wkId,
      squadPlayerIds: filteredSquad,
    };
  });

  // Ensure AI Teams & Rankings exist on migrated saves
  const aiTeams =
    career.aiTeams && Object.keys(career.aiTeams).length > 0
      ? { ...career.aiTeams }
      : initializeAITeams(userTeamId, career);
  // Guarantee user's team is NEVER in `aiTeams`
  delete aiTeams[userTeamId];

  const teamRankings =
    career.teamRankings && Object.keys(career.teamRankings).length > 0
      ? career.teamRankings
      : initializeDetailedTeamRankings();

  const rankingHistory =
    career.rankingHistory && career.rankingHistory.length > 0
      ? career.rankingHistory
      : [createTeamRankingSnapshot(teamRankings, career.currentDate || '2026-11-15')];

  const notifications = career.notifications || [];
  const teamMorale =
    typeof career.teamMorale === 'number'
      ? career.teamMorale
      : Math.max(40, Math.min(100, Math.round((career.manager?.boardConfidence || 85) * 0.95)));

  // Sanitize scheduled user fixtures
  const sanitizedFixtures = (career.fixtures || []).map((m) => {
    if (!isPreMatchStatus(m.status)) {
      return ensureMatchTacticalSystemsInitialized(m);
    }
    const cfg = sanitizedFormatSquads[m.format];
    if (!cfg) return ensureMatchTacticalSystemsInitialized(m);

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
      const aiHome = aiTeams[m.homeTeamId]?.formatSquads?.[m.format];
      homeXI = aiHome?.playingXI || getDefaultPlayingXI(m.homeTeamId, m.format);
      homeCap = aiHome?.captainId || getDefaultCaptainId(m.homeTeamId, m.format);
      homeWk = aiHome?.wicketKeeperId || getDefaultWicketKeeperId(m.homeTeamId, m.format);
    }

    if (m.awayTeamId === userTeamId) {
      awayXI = cfg.playingXI;
      awayCap = cfg.captainId;
      awayWk = cfg.wicketKeeperId;
    } else {
      const aiAway = aiTeams[m.awayTeamId]?.formatSquads?.[m.format];
      awayXI = aiAway?.playingXI || getDefaultPlayingXI(m.awayTeamId, m.format);
      awayCap = aiAway?.captainId || getDefaultCaptainId(m.awayTeamId, m.format);
      awayWk = aiAway?.wicketKeeperId || getDefaultWicketKeeperId(m.awayTeamId, m.format);
    }

    const updatedMatch: Match = {
      ...m,
      isUserMatch: true,
      userTeamId,
      homeXI,
      awayXI,
      homeCaptainId: homeCap,
      awayCaptainId: awayCap,
      homeWicketKeeperId: homeWk,
      awayWicketKeeperId: awayWk,
    };
    return ensureMatchTacticalSystemsInitialized(updatedMatch);
  });

  // Sanitize user tours only (preserve AI tours intact)
  const sanitizedTours = (career.tours || []).map((t) => {
    if (!t.tourSquadIds) return t;
    if (t.hostTeamId !== userTeamId && t.visitingTeamId !== userTeamId) return t;
    return {
      ...t,
      tourSquadIds: t.tourSquadIds.filter((id) => activeIds.has(id)),
    };
  });

  const playerRankings =
    career.playerRankings &&
    career.playerRankings.rankings &&
    career.playerRankings.rankings.TEST &&
    career.playerRankings.rankings.ODI &&
    career.playerRankings.rankings.T20I
      ? career.playerRankings
      : computeAllPlayerRankings(career);

  return {
    ...career,
    version: 3,
    seasonsGeneratedThroughYear: career.seasonsGeneratedThroughYear || 2027,
    aiTeams,
    teamRankings,
    rankingHistory,
    playerRankings,
    notifications,
    teamMorale,
    emergingPlayers: career.emergingPlayers || [],
    archivedMatches: career.archivedMatches || [],
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
 * Migration helper for legacy career saves.
 * Preserves user progression, historical data, and upgrades schemas seamlessly.
 */
export function migrateCareerSave(rawSave: any): CareerSave {
  return sanitizeCareerSave(rawSave as CareerSave);
}

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

export function loadSavedCareerFromStorage(): CareerSave | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

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

export function generateInitialFixtures(userTeamId: string): Match[] {
  const { userMatches } = buildInternationalCalendar(userTeamId);
  return userMatches;
}
