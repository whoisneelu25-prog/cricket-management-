import { INTERNATIONAL_TEAMS } from '../data/teams';
import { INTERNATIONAL_PLAYERS } from '../data/players';
import {
  ALL_PLAYERS,
  ADDITIONAL_SQUAD_MEMBERS,
  getPlayersByCountry,
  getFormatEligiblePlayers,
  getDefaultFormatSquadConfig,
  getDefaultCaptainId,
  getDefaultViceCaptainId,
  getDefaultWicketKeeperId,
  getDefaultPlayingXI,
} from '../data/squads';
import { OFFICIAL_TOURS } from '../data/tours';
import { INITIAL_TOURNAMENTS } from '../data/tournaments';
import { VENUES } from '../data/venues';
import { buildInternationalCalendar } from './calendarEngine';
import { MatchFormat, Player } from '../types/cricket';

const FORMATS: MatchFormat[] = ['TEST', 'ODI', 'T20I'];

const VALID_BOWLING_STYLES = new Set([
  'RIGHT_ARM_FAST',
  'RIGHT_ARM_FAST_MEDIUM',
  'RIGHT_ARM_MEDIUM',
  'LEFT_ARM_FAST',
  'LEFT_ARM_FAST_MEDIUM',
  'OFF_BREAK',
  'LEG_BREAK',
  'SLOW_LEFT_ARM',
  'LEFT_ARM_WRIST_SPIN',
]);

export interface ValidationIssue {
  id: string;
  category:
    | 'DUPLICATE_PLAYER'
    | 'MISSING_PLAYER'
    | 'COUNTRY_ASSIGNMENT'
    | 'FORMAT_LINEUP_INCONSISTENCY'
    | 'DATA_SCHEMA_ANOMALY'
    | 'TOUR_SQUAD_ISSUE';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  countryId?: string;
  format?: MatchFormat;
  playerId?: string;
  title: string;
  details: string;
  recommendation: string;
}

export interface DatabaseValidationReport {
  generatedAt: string;
  summary: {
    totalRegisteredCountries: number;
    totalPlayerCountriesInDb: number;
    totalPlayers: number;
    coreInternationalPlayers: number;
    additionalSquadMembers: number;
    activeMalePlayers: number;
    activeFemalePlayers: number;
    retiredPlayers: number;
    legendPlayers: number;
    totalIssuesFound: number;
    highSeverityCount: number;
    mediumSeverityCount: number;
    lowSeverityCount: number;
    byCategory: {
      duplicatePlayers: number;
      missingPlayers: number;
      countryAssignments: number;
      formatLineupInconsistencies: number;
      schemaAnomalies: number;
      tourSquadIssues: number;
    };
  };
  countryRosterAudit: Array<{
    countryId: string;
    countryName: string;
    inInternationalTeamsTable: boolean;
    totalPlayersInDb: number;
    activeMenCount: number;
    activeWomenCount: number;
    legendsCount: number;
    retiredCount: number;
    eligibleCounts: { TEST: number; ODI: number; T20I: number };
    activeMenEligibleCounts: { TEST: number; ODI: number; T20I: number };
    canFieldFullActiveMenXI: { TEST: boolean; ODI: boolean; T20I: boolean };
    status: 'COMPLETE' | 'INCOMPLETE_SQUAD' | 'EMPTY_ROSTER' | 'UNREGISTERED_COUNTRY';
  }>;
  duplicatePlayers: ValidationIssue[];
  missingPlayers: ValidationIssue[];
  incorrectCountryAssignments: ValidationIssue[];
  formatLineupInconsistencies: ValidationIssue[];
  schemaAndTourAnomalies: ValidationIssue[];
}

/**
 * 1. Countries Export
 */
export function exportCountriesData() {
  const registeredTeamIds = new Set(INTERNATIONAL_TEAMS.map((t) => t.id));
  const playerCountryMap = new Map<string, string>();
  ALL_PLAYERS.forEach((p) => {
    if (!playerCountryMap.has(p.countryId)) {
      playerCountryMap.set(p.countryId, p.countryName);
    }
  });

  const unregisteredCountriesWithPlayers = Array.from(playerCountryMap.entries())
    .filter(([id]) => !registeredTeamIds.has(id))
    .map(([id, name]) => ({
      id,
      name,
      registeredInTeamsTable: false,
      playerCount: ALL_PLAYERS.filter((p) => p.countryId === id).length,
    }));

  return {
    exportedAt: new Date().toISOString(),
    totalRegisteredCountries: INTERNATIONAL_TEAMS.length,
    countries: INTERNATIONAL_TEAMS.map((team) => {
      const players = getPlayersByCountry(team.id);
      return {
        ...team,
        databasePlayerCount: players.length,
        activeMalePlayerCount: players.filter((p) => p.status === 'ACTIVE' && p.gender === 'MALE').length,
      };
    }),
    unregisteredCountriesReferencedByPlayers: unregisteredCountriesWithPlayers,
    venues: VENUES,
  };
}

/**
 * 2. All Players Export
 */
export function exportAllPlayersData() {
  return {
    exportedAt: new Date().toISOString(),
    totalPlayers: ALL_PLAYERS.length,
    corePlayersCount: INTERNATIONAL_PLAYERS.length,
    additionalSquadMembersCount: ADDITIONAL_SQUAD_MEMBERS.length,
    players: ALL_PLAYERS.map((p) => ({
      ...p,
      datasetOrigin: INTERNATIONAL_PLAYERS.some((ip) => ip.id === p.id)
        ? 'INTERNATIONAL_PLAYERS (src/data/players.ts)'
        : 'ADDITIONAL_SQUAD_MEMBERS (src/data/squads.ts)',
    })),
  };
}

/**
 * Helper to build format squad export for 3, 4, 5
 */
export function exportFormatSquadsData(format: MatchFormat) {
  const squadsByCountry = INTERNATIONAL_TEAMS.map((team) => {
    const config = getDefaultFormatSquadConfig(team.id, format);
    const eligiblePool = getFormatEligiblePlayers(team.id, format);
    const allCountryPlayers = getPlayersByCountry(team.id);

    const resolvePlayerSummary = (id: string) => {
      const p = ALL_PLAYERS.find((pl) => pl.id === id);
      if (!p) return { id, name: 'MISSING_PLAYER', missing: true };
      return {
        id: p.id,
        name: p.name,
        shortName: p.shortName,
        role: p.role,
        status: p.status,
        gender: p.gender,
        age: p.age,
        rating: format === 'TEST' ? p.testRating : format === 'ODI' ? p.odiRating : p.t20Rating,
        formatEligible: p.formatEligibility?.[format] ?? true,
        isWicketKeeper: Boolean(p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER'),
      };
    };

    return {
      countryId: team.id,
      countryName: team.name,
      format,
      totalCountryPlayersInDb: allCountryPlayers.length,
      formatEligiblePoolCount: eligiblePool.length,
      squadSize: config.squadPlayerIds.length,
      playingXISize: config.playingXI.length,
      captainId: config.captainId,
      captainName: ALL_PLAYERS.find((p) => p.id === config.captainId)?.name || null,
      viceCaptainId: config.viceCaptainId,
      viceCaptainName: ALL_PLAYERS.find((p) => p.id === config.viceCaptainId)?.name || null,
      wicketKeeperId: config.wicketKeeperId,
      wicketKeeperName: ALL_PLAYERS.find((p) => p.id === config.wicketKeeperId)?.name || null,
      squadPlayerIds: config.squadPlayerIds,
      squadPlayers: config.squadPlayerIds.map(resolvePlayerSummary),
      playingXIIds: config.playingXI,
      playingXI: config.playingXI.map(resolvePlayerSummary),
      battingOrderIds: config.battingOrder,
      bowlingRotationIds: config.bowlingRotation,
    };
  });

  return {
    exportedAt: new Date().toISOString(),
    format,
    totalCountries: squadsByCountry.length,
    countriesWithFullXI: squadsByCountry.filter((s) => s.playingXISize === 11).length,
    countriesWithIncompleteXI: squadsByCountry.filter((s) => s.playingXISize < 11).length,
    squads: squadsByCountry,
  };
}

/**
 * 6. Captains and Vice-Captains Export
 */
export function exportCaptainsAndViceCaptainsData() {
  const leadershipByCountry = INTERNATIONAL_TEAMS.map((team) => {
    const formats: Record<MatchFormat, any> = {} as any;
    FORMATS.forEach((fmt) => {
      const capId = getDefaultCaptainId(team.id, fmt);
      const vcId = getDefaultViceCaptainId(team.id, fmt);
      const wkId = getDefaultWicketKeeperId(team.id, fmt);
      const cap = ALL_PLAYERS.find((p) => p.id === capId);
      const vc = ALL_PLAYERS.find((p) => p.id === vcId);
      const wk = ALL_PLAYERS.find((p) => p.id === wkId);

      formats[fmt] = {
        captain: cap
          ? {
              id: cap.id,
              name: cap.name,
              role: cap.role,
              status: cap.status,
              gender: cap.gender,
              leadership: cap.attributes.leadership,
              formatEligible: cap.formatEligibility[fmt],
              flaggedIsCaptainInDb: Boolean(cap.isCaptain),
            }
          : null,
        viceCaptain: vc
          ? {
              id: vc.id,
              name: vc.name,
              role: vc.role,
              status: vc.status,
              gender: vc.gender,
              leadership: vc.attributes.leadership,
              formatEligible: vc.formatEligibility[fmt],
              flaggedIsViceCaptainInDb: Boolean(vc.isViceCaptain),
            }
          : null,
        wicketKeeper: wk
          ? {
              id: wk.id,
              name: wk.name,
              role: wk.role,
              status: wk.status,
              gender: wk.gender,
              isActualWicketKeeper: Boolean(wk.isWicketKeeper || wk.role === 'WICKETKEEPER_BATTER'),
            }
          : null,
      };
    });

    return {
      countryId: team.id,
      countryName: team.name,
      formats,
    };
  });

  const playersFlaggedInDb = ALL_PLAYERS.filter((p) => p.isCaptain || p.isViceCaptain).map((p) => ({
    id: p.id,
    name: p.name,
    countryId: p.countryId,
    countryName: p.countryName,
    gender: p.gender,
    status: p.status,
    isCaptain: Boolean(p.isCaptain),
    isViceCaptain: Boolean(p.isViceCaptain),
    leadershipAttribute: p.attributes.leadership,
  }));

  return {
    exportedAt: new Date().toISOString(),
    leadershipByCountry,
    playersWithLeadershipFlagsInDb: playersFlaggedInDb,
  };
}

/**
 * 7. Player Roles and Playing Styles Export
 */
export function exportPlayerRolesAndStylesData() {
  const players = ALL_PLAYERS.map((p) => ({
    id: p.id,
    name: p.name,
    shortName: p.shortName,
    countryId: p.countryId,
    countryName: p.countryName,
    gender: p.gender,
    status: p.status,
    role: p.role,
    isWicketKeeper: Boolean(p.isWicketKeeper),
    battingHand: p.battingHand,
    bowlingStyle: p.bowlingStyle,
    isValidBowlingStyleEnum: VALID_BOWLING_STYLES.has(p.bowlingStyle),
    formatEligibility: p.formatEligibility,
    ratings: {
      TEST: p.testRating,
      ODI: p.odiRating,
      T20I: p.t20Rating,
    },
  }));

  return {
    exportedAt: new Date().toISOString(),
    totalPlayers: players.length,
    roleBreakdown: {
      BATTER: players.filter((p) => p.role === 'BATTER').length,
      BOWLER: players.filter((p) => p.role === 'BOWLER').length,
      ALL_ROUNDER: players.filter((p) => p.role === 'ALL_ROUNDER').length,
      WICKETKEEPER_BATTER: players.filter((p) => p.role === 'WICKETKEEPER_BATTER').length,
    },
    battingHandBreakdown: {
      RIGHT_HAND: players.filter((p) => p.battingHand === 'RIGHT_HAND').length,
      LEFT_HAND: players.filter((p) => p.battingHand === 'LEFT_HAND').length,
    },
    players,
  };
}

/**
 * 8. Tour Squads Export
 */
export function exportTourSquadsData() {
  return {
    exportedAt: new Date().toISOString(),
    totalTours: OFFICIAL_TOURS.length,
    toursWithAnnouncedSquads: OFFICIAL_TOURS.filter((t) => t.squadAnnounced && t.tourSquadIds.length > 0).length,
    toursWithEmptySquads: OFFICIAL_TOURS.filter((t) => t.tourSquadIds.length === 0).length,
    tourSquads: OFFICIAL_TOURS.map((tour) => ({
      tourId: tour.id,
      tourName: tour.name,
      hostTeamId: tour.hostTeamId,
      visitingTeamId: tour.visitingTeamId,
      startDate: tour.startDate,
      endDate: tour.endDate,
      status: tour.status,
      formatsIncluded: Object.keys(tour.series),
      squadSelectionDeadline: tour.squadSelectionDeadline,
      squadAnnounced: tour.squadAnnounced,
      squadCount: tour.tourSquadIds.length,
      tourSquadIds: tour.tourSquadIds,
      resolvedPlayers: tour.tourSquadIds.map((pid) => {
        const p = ALL_PLAYERS.find((pl) => pl.id === pid);
        return p
          ? {
              id: p.id,
              name: p.name,
              countryId: p.countryId,
              role: p.role,
              status: p.status,
              formatEligibility: p.formatEligibility,
            }
          : { id: pid, name: 'UNRESOLVED_PLAYER_ID', missing: true };
      }),
    })),
  };
}

/**
 * 9. Current Playing XIs Export
 */
export function exportCurrentPlayingXIsData() {
  const playingXIs = INTERNATIONAL_TEAMS.map((team) => {
    const formats: Record<MatchFormat, any> = {} as any;
    FORMATS.forEach((fmt) => {
      const config = getDefaultFormatSquadConfig(team.id, fmt);
      const players = config.playingXI.map((pid, idx) => {
        const p = ALL_PLAYERS.find((pl) => pl.id === pid);
        return {
          battingPosition: idx + 1,
          id: pid,
          name: p?.name || 'MISSING',
          role: p?.role || 'UNKNOWN',
          status: p?.status || 'UNKNOWN',
          gender: p?.gender || 'UNKNOWN',
          formatEligible: p ? p.formatEligibility[fmt] : false,
          rating: p ? (fmt === 'TEST' ? p.testRating : fmt === 'ODI' ? p.odiRating : p.t20Rating) : 0,
          isCaptain: pid === config.captainId,
          isViceCaptain: pid === config.viceCaptainId,
          isWicketKeeper: pid === config.wicketKeeperId,
        };
      });

      formats[fmt] = {
        count: players.length,
        isCompleteXI: players.length === 11,
        captainId: config.captainId,
        viceCaptainId: config.viceCaptainId,
        wicketKeeperId: config.wicketKeeperId,
        playingXIIds: config.playingXI,
        bowlingRotationIds: config.bowlingRotation,
        lineup: players,
      };
    });

    return {
      countryId: team.id,
      countryName: team.name,
      formats,
    };
  });

  return {
    exportedAt: new Date().toISOString(),
    playingXIsByCountry: playingXIs,
  };
}

/**
 * 10. Fixtures and Tours Export
 */
export function exportFixturesAndToursData() {
  const defaultCalendar = buildInternationalCalendar('IND');
  return {
    exportedAt: new Date().toISOString(),
    officialTours: OFFICIAL_TOURS,
    iccTournaments: INITIAL_TOURNAMENTS,
    venues: VENUES,
    defaultSeasonCalendarSample_IND: {
      totalEvents: defaultCalendar.events.length,
      userMatchesCount: defaultCalendar.userMatches.length,
      worldMatchesCount: defaultCalendar.worldMatches.length,
      userMatches: defaultCalendar.userMatches,
      worldMatches: defaultCalendar.worldMatches,
      calendarEvents: defaultCalendar.events,
    },
  };
}

/**
 * 11. Comprehensive Data Validation Report
 * Identifies duplicate players, missing players, incorrect country assignments,
 * and format-specific lineup inconsistencies without modifying existing game data.
 */
export function generateDatabaseValidationReport(): DatabaseValidationReport {
  const duplicatePlayers: ValidationIssue[] = [];
  const missingPlayers: ValidationIssue[] = [];
  const incorrectCountryAssignments: ValidationIssue[] = [];
  const formatLineupInconsistencies: ValidationIssue[] = [];
  const schemaAndTourAnomalies: ValidationIssue[] = [];

  // 1. Check Duplicate Players (by ID, normalized Name, or sourceId)
  const seenIds = new Map<string, Player>();
  const seenNames = new Map<string, Player>();
  const seenSourceIds = new Map<string, Player>();

  ALL_PLAYERS.forEach((p) => {
    const normName = p.name.trim().toLowerCase();
    if (seenIds.has(p.id)) {
      duplicatePlayers.push({
        id: `dup_id_${p.id}`,
        category: 'DUPLICATE_PLAYER',
        severity: 'HIGH',
        countryId: p.countryId,
        playerId: p.id,
        title: `Duplicate Player ID '${p.id}'`,
        details: `Player '${p.name}' shares ID '${p.id}' with '${seenIds.get(p.id)?.name}'.`,
        recommendation: `Assign a unique player ID to each player record.`,
      });
    } else {
      seenIds.set(p.id, p);
    }

    if (seenNames.has(normName)) {
      duplicatePlayers.push({
        id: `dup_name_${p.id}`,
        category: 'DUPLICATE_PLAYER',
        severity: 'HIGH',
        countryId: p.countryId,
        playerId: p.id,
        title: `Duplicate Player Name '${p.name}'`,
        details: `Player '${p.name}' (${p.id}) appears more than once (existing ID: '${seenNames.get(normName)?.id}').`,
        recommendation: `Consolidate duplicate player records into a single entry.`,
      });
    } else {
      seenNames.set(normName, p);
    }

    const srcId = p.sourceMeta?.sourceId;
    if (srcId) {
      if (seenSourceIds.has(srcId)) {
        duplicatePlayers.push({
          id: `dup_source_${p.id}`,
          category: 'DUPLICATE_PLAYER',
          severity: 'MEDIUM',
          countryId: p.countryId,
          playerId: p.id,
          title: `Duplicate Source ID '${srcId}'`,
          details: `Players '${p.name}' and '${seenSourceIds.get(srcId)?.name}' share sourceId '${srcId}'.`,
          recommendation: `Ensure every player has a distinct external sourceId.`,
        });
      } else {
        seenSourceIds.set(srcId, p);
      }
    }
  });

  //Also check surname / shortName collisions within the same country (e.g., R. Singh / A. Singh or S. Yadav / K. Yadav)
  const shortNameByCountry = new Map<string, Player[]>();
  ALL_PLAYERS.forEach((p) => {
    const key = `${p.countryId}:${p.shortName.toLowerCase()}`;
    const list = shortNameByCountry.get(key) || [];
    list.push(p);
    shortNameByCountry.set(key, list);
  });
  shortNameByCountry.forEach((list, key) => {
    if (list.length > 1) {
      duplicatePlayers.push({
        id: `dup_shortname_${key}`,
        category: 'DUPLICATE_PLAYER',
        severity: 'LOW',
        countryId: list[0].countryId,
        title: `Duplicate ShortName in ${list[0].countryId}: '${list[0].shortName}'`,
        details: `Multiple players share shortName '${list[0].shortName}': ${list.map((x) => x.name).join(', ')}.`,
        recommendation: `Disambiguate initials in shortName so scorecards are unambiguous.`,
      });
    }
  });

  // 2. Country Assignments & Pool Contamination
  const registeredTeamIds = new Set(INTERNATIONAL_TEAMS.map((t) => t.id));

  // 2a. Players assigned to countries missing from INTERNATIONAL_TEAMS
  ALL_PLAYERS.forEach((p) => {
    if (!registeredTeamIds.has(p.countryId)) {
      incorrectCountryAssignments.push({
        id: `unregistered_country_${p.id}`,
        category: 'COUNTRY_ASSIGNMENT',
        severity: 'HIGH',
        countryId: p.countryId,
        playerId: p.id,
        title: `Player '${p.name}' assigned to unregistered country '${p.countryId}' (${p.countryName})`,
        details: `'${p.countryId}' (${p.countryName}) is assigned to player '${p.name}' (${p.id}), but '${p.countryId}' does not exist in INTERNATIONAL_TEAMS (which only defines the 12 Full Member nations). As a result, '${p.name}' cannot be filtered by country in DatabaseView or managed as a team.`,
        recommendation: `Either add Associate nations (${p.countryId} - ${p.countryName}) to INTERNATIONAL_TEAMS or separate Associate teams into a dedicated registry included in country filters.`,
      });
    }
  });

  // 2b. Legends, Retired, and Female players mixed into active Men's National Team Pools via getPlayersByCountry()
  ALL_PLAYERS.forEach((p) => {
    if (registeredTeamIds.has(p.countryId) && (p.status !== 'ACTIVE' || p.gender !== 'MALE')) {
      incorrectCountryAssignments.push({
        id: `pool_contamination_${p.id}`,
        category: 'COUNTRY_ASSIGNMENT',
        severity: 'HIGH',
        countryId: p.countryId,
        playerId: p.id,
        title: `Non-eligible player '${p.name}' (${p.status}, ${p.gender}) mixed into active ${p.countryId} men's national pool`,
        details: `getPlayersByCountry('${p.countryId}') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, '${p.name}' (${p.status}, ${p.gender}) is automatically pulled into ${p.countryId}'s active men's national squad and Playing XI.`,
        recommendation: `Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.`,
      });
    }
  });

  // 3. Missing Players & Country Roster Audit
  const allCountryIds = Array.from(
    new Set([...INTERNATIONAL_TEAMS.map((t) => t.id), ...ALL_PLAYERS.map((p) => p.countryId)])
  );

  const countryRosterAudit = allCountryIds.map((cid) => {
    const teamObj = INTERNATIONAL_TEAMS.find((t) => t.id === cid);
    const countryPlayers = ALL_PLAYERS.filter((p) => p.countryId === cid);
    const countryName = teamObj?.name || countryPlayers[0]?.countryName || cid;
    const activeMen = countryPlayers.filter((p) => p.status === 'ACTIVE' && p.gender === 'MALE');
    const activeWomen = countryPlayers.filter((p) => p.status === 'ACTIVE' && p.gender === 'FEMALE');
    const legends = countryPlayers.filter((p) => p.status === 'LEGEND');
    const retired = countryPlayers.filter((p) => p.status === 'RETIRED');

    const eligibleCounts = {
      TEST: countryPlayers.filter((p) => p.formatEligibility.TEST).length,
      ODI: countryPlayers.filter((p) => p.formatEligibility.ODI).length,
      T20I: countryPlayers.filter((p) => p.formatEligibility.T20I).length,
    };

    const activeMenEligibleCounts = {
      TEST: activeMen.filter((p) => p.formatEligibility.TEST).length,
      ODI: activeMen.filter((p) => p.formatEligibility.ODI).length,
      T20I: activeMen.filter((p) => p.formatEligibility.T20I).length,
    };

    const canFieldFullActiveMenXI = {
      TEST: activeMenEligibleCounts.TEST >= 11,
      ODI: activeMenEligibleCounts.ODI >= 11,
      T20I: activeMenEligibleCounts.T20I >= 11,
    };

    let status: 'COMPLETE' | 'INCOMPLETE_SQUAD' | 'EMPTY_ROSTER' | 'UNREGISTERED_COUNTRY' = 'COMPLETE';
    if (!teamObj) {
      status = 'UNREGISTERED_COUNTRY';
    } else if (countryPlayers.length === 0) {
      status = 'EMPTY_ROSTER';
    } else if (!canFieldFullActiveMenXI.TEST || !canFieldFullActiveMenXI.ODI || !canFieldFullActiveMenXI.T20I) {
      status = 'INCOMPLETE_SQUAD';
    }

    return {
      countryId: cid,
      countryName,
      inInternationalTeamsTable: Boolean(teamObj),
      totalPlayersInDb: countryPlayers.length,
      activeMenCount: activeMen.length,
      activeWomenCount: activeWomen.length,
      legendsCount: legends.length,
      retiredCount: retired.length,
      eligibleCounts,
      activeMenEligibleCounts,
      canFieldFullActiveMenXI,
      status,
    };
  });

  // Populate Missing Player Issues for each registered team
  INTERNATIONAL_TEAMS.forEach((team) => {
    const audit = countryRosterAudit.find((a) => a.countryId === team.id)!;
    if (audit.totalPlayersInDb === 0) {
      missingPlayers.push({
        id: `missing_entire_roster_${team.id}`,
        category: 'MISSING_PLAYER',
        severity: 'HIGH',
        countryId: team.id,
        title: `${team.name} (${team.id}) has 0 players in the database`,
        details: `${team.name} is registered as an official playable nation in INTERNATIONAL_TEAMS, but has 0 players in ALL_PLAYERS. Selecting ${team.name} results in empty squads and crashes/empty lineups in match simulation.`,
        recommendation: `Add at least 18-25 active international players across Test, ODI, and T20I formats for ${team.name}.`,
      });
    } else if (audit.activeMenCount < 15) {
      missingPlayers.push({
        id: `missing_full_squad_${team.id}`,
        category: 'MISSING_PLAYER',
        severity: 'HIGH',
        countryId: team.id,
        title: `${team.name} (${team.id}) has only ${audit.activeMenCount} active male players (needs 15-20 per format)`,
        details: `${team.name} has ${audit.totalPlayersInDb} total players (${audit.activeMenCount} active male, ${audit.legendsCount} legends, ${audit.retiredCount} retired, ${audit.activeWomenCount} female). Active male eligible counts: TEST=${audit.activeMenEligibleCounts.TEST}, ODI=${audit.activeMenEligibleCounts.ODI}, T20I=${audit.activeMenEligibleCounts.T20I}.`,
        recommendation: `Expand ${team.name}'s active men's player pool so each format (TEST, ODI, T20I) has at least 15-18 eligible active players.`,
      });
    }

    FORMATS.forEach((fmt) => {
      if (audit.totalPlayersInDb > 0 && audit.activeMenEligibleCounts[fmt] < 11) {
        missingPlayers.push({
          id: `missing_xi_${team.id}_${fmt}`,
          category: 'MISSING_PLAYER',
          severity: 'HIGH',
          countryId: team.id,
          format: fmt,
          title: `${team.name} (${team.id}) cannot field 11 active male players in ${fmt} (only ${audit.activeMenEligibleCounts[fmt]} available)`,
          details: `A standard cricket Playing XI requires 11 players, plus reserves. Currently ${team.name} only has ${audit.activeMenEligibleCounts[fmt]} active male players eligible for ${fmt} (short by ${11 - audit.activeMenEligibleCounts[fmt]} players just for a starting XI).`,
          recommendation: `Add ${Math.max(15 - audit.activeMenEligibleCounts[fmt], 11 - audit.activeMenEligibleCounts[fmt])} more ${fmt}-eligible active players for ${team.name}.`,
        });
      }
    });
  });

  // 4. Format-Specific Lineup Inconsistencies
  INTERNATIONAL_TEAMS.forEach((team) => {
    const configs = {
      TEST: getDefaultFormatSquadConfig(team.id, 'TEST'),
      ODI: getDefaultFormatSquadConfig(team.id, 'ODI'),
      T20I: getDefaultFormatSquadConfig(team.id, 'T20I'),
    };

    FORMATS.forEach((fmt) => {
      const cfg = configs[fmt];
      const xiPlayers = cfg.playingXI
        .map((id) => ALL_PLAYERS.find((p) => p.id === id))
        .filter((p): p is Player => Boolean(p));

      // 4a. Playing XI has fewer than 11 players
      if (cfg.playingXI.length < 11) {
        formatLineupInconsistencies.push({
          id: `incomplete_xi_${team.id}_${fmt}`,
          category: 'FORMAT_LINEUP_INCONSISTENCY',
          severity: 'HIGH',
          countryId: team.id,
          format: fmt,
          title: `${team.name} ${fmt} Playing XI has only ${cfg.playingXI.length}/11 players`,
          details: `getDefaultFormatSquadConfig('${team.id}', '${fmt}') produces a Playing XI of length ${cfg.playingXI.length} (${xiPlayers.map((p) => p.name).join(', ') || 'none'}).`,
          recommendation: `Populate ${team.name}'s ${fmt} player pool so a valid 11-player lineup is always generated.`,
        });
      }

      // 4b. Legends, Retired, or Female players selected in current Men's Playing XI
      xiPlayers.forEach((p) => {
        if (p.status !== 'ACTIVE' || p.gender !== 'MALE') {
          formatLineupInconsistencies.push({
            id: `non_active_in_xi_${team.id}_${fmt}_${p.id}`,
            category: 'FORMAT_LINEUP_INCONSISTENCY',
            severity: 'HIGH',
            countryId: team.id,
            format: fmt,
            playerId: p.id,
            title: `${p.name} (${p.status}, ${p.gender}) is auto-selected in ${team.name}'s current ${fmt} Playing XI`,
            details: `Because ${p.name} has a high ${fmt} rating (${fmt === 'TEST' ? p.testRating : fmt === 'ODI' ? p.odiRating : p.t20Rating}), getDefaultFormatSquadConfig includes them in ${team.name}'s active ${fmt} Playing XI despite status='${p.status}' and gender='${p.gender}'.`,
            recommendation: `Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.`,
          });
        }
      });

      // 4c. Ineligible player selected as Captain or Vice-Captain for a format
      const cap = ALL_PLAYERS.find((p) => p.id === cfg.captainId);
      if (cap && !cap.formatEligibility[fmt]) {
        formatLineupInconsistencies.push({
          id: `ineligible_captain_${team.id}_${fmt}`,
          category: 'FORMAT_LINEUP_INCONSISTENCY',
          severity: 'HIGH',
          countryId: team.id,
          format: fmt,
          playerId: cap.id,
          title: `${team.name} ${fmt} Captain '${cap.name}' is marked ineligible for ${fmt}`,
          details: `getDefaultCaptainId('${team.id}', '${fmt}') selects '${cap.name}' (${cap.id}), whose formatEligibility.${fmt} is false, and forces them into the ${fmt} squad and Playing XI.`,
          recommendation: `Ensure getDefaultCaptainId only selects from players eligible for ${fmt}.`,
        });
      }

      const vc = ALL_PLAYERS.find((p) => p.id === cfg.viceCaptainId);
      if (vc && !vc.formatEligibility[fmt]) {
        formatLineupInconsistencies.push({
          id: `ineligible_vc_${team.id}_${fmt}`,
          category: 'FORMAT_LINEUP_INCONSISTENCY',
          severity: 'HIGH',
          countryId: team.id,
          format: fmt,
          playerId: vc.id,
          title: `${team.name} ${fmt} Vice-Captain '${vc.name}' is marked ineligible for ${fmt}`,
          details: `getDefaultViceCaptainId('${team.id}', '${fmt}') selects '${vc.name}' (${vc.id}), whose formatEligibility.${fmt} is false.`,
          recommendation: `Ensure getDefaultViceCaptainId only selects from players eligible for ${fmt}.`,
        });
      }

      // 4d. Vice-captain not in Playing XI
      if (cfg.viceCaptainId && cfg.playingXI.length > 0 && !cfg.playingXI.includes(cfg.viceCaptainId)) {
        formatLineupInconsistencies.push({
          id: `vc_not_in_xi_${team.id}_${fmt}`,
          category: 'FORMAT_LINEUP_INCONSISTENCY',
          severity: 'MEDIUM',
          countryId: team.id,
          format: fmt,
          playerId: cfg.viceCaptainId,
          title: `${team.name} ${fmt} Vice-Captain '${vc?.name || cfg.viceCaptainId}' is omitted from the Playing XI`,
          details: `getDefaultFormatSquadConfig adds captainId and wicketKeeperId to selectedXI first, but never ensures viceCaptainId ('${cfg.viceCaptainId}') is included in the Playing XI.`,
          recommendation: `Include viceCaptainId in the Playing XI selection priority alongside captainId and wicketKeeperId.`,
        });
      }

      // 4e. Designated Wicketkeeper is not an actual Wicketkeeper
      const wk = ALL_PLAYERS.find((p) => p.id === cfg.wicketKeeperId);
      if (wk && !wk.isWicketKeeper && wk.role !== 'WICKETKEEPER_BATTER') {
        formatLineupInconsistencies.push({
          id: `non_wk_assigned_${team.id}_${fmt}`,
          category: 'FORMAT_LINEUP_INCONSISTENCY',
          severity: 'MEDIUM',
          countryId: team.id,
          format: fmt,
          playerId: wk.id,
          title: `${team.name} ${fmt} designated Wicketkeeper '${wk.name}' is a ${wk.role} (not a Wicketkeeper)`,
          details: `No eligible wicketkeeper was found for ${team.name} in ${fmt}, so getDefaultWicketKeeperId fell back to squad[2] ('${wk.name}', role=${wk.role}).`,
          recommendation: `Add a specialist WICKETKEEPER_BATTER for ${team.name} in ${fmt}.`,
        });
      }

      // 4f. Fewer than 5 bowling options in Playing XI
      if (cfg.playingXI.length === 11 && cfg.bowlingRotation.length < 5) {
        formatLineupInconsistencies.push({
          id: `insufficient_bowlers_${team.id}_${fmt}`,
          category: 'FORMAT_LINEUP_INCONSISTENCY',
          severity: 'MEDIUM',
          countryId: team.id,
          format: fmt,
          title: `${team.name} ${fmt} Playing XI has only ${cfg.bowlingRotation.length} bowling options (needs at least 5)`,
          details: `In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. ${team.name} ${fmt} XI only has ${cfg.bowlingRotation.length}.`,
          recommendation: `Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.`,
        });
      }

      // 4g. Batting order is unsorted by role (Bowler batting at #1/#2)
      if (xiPlayers.length >= 2) {
        const openers = xiPlayers.slice(0, 2);
        openers.forEach((opener, idx) => {
          if (opener.role === 'BOWLER') {
            formatLineupInconsistencies.push({
              id: `bowler_opening_batting_${team.id}_${fmt}_${opener.id}`,
              category: 'FORMAT_LINEUP_INCONSISTENCY',
              severity: 'MEDIUM',
              countryId: team.id,
              format: fmt,
              playerId: opener.id,
              title: `Specialist Bowler '${opener.name}' is placed at #${idx + 1} (Opener) in ${team.name}'s ${fmt} Batting Order`,
              details: `Because getDefaultFormatSquadConfig pushes captainId ('${cfg.captainId}') into selectedXI[0] and sets battingOrder = [...finalXI], bowler captains like '${opener.name}' open the batting at #1!`,
              recommendation: `Sort battingOrder by batting role and technique/timing (Batters & WK in top 6, All-Rounders at 6-8, Specialist Bowlers at 8-11) instead of using insertion order.`,
            });
          }
        });
      }
    });

    // 4h. Check if identical Playing XI is used across formats when team has players
    if (configs.TEST.playingXI.length > 0) {
      const testKey = [...configs.TEST.playingXI].sort().join(',');
      const odiKey = [...configs.ODI.playingXI].sort().join(',');
      const t20Key = [...configs.T20I.playingXI].sort().join(',');
      if (testKey === odiKey && odiKey === t20Key) {
        formatLineupInconsistencies.push({
          id: `identical_xi_all_formats_${team.id}`,
          category: 'FORMAT_LINEUP_INCONSISTENCY',
          severity: 'MEDIUM',
          countryId: team.id,
          title: `${team.name} uses the exact same player set across TEST, ODI, and T20I`,
          details: `All three formats for ${team.name} resolve to the exact same ${configs.TEST.playingXI.length} players because there are no format-differentiated squad members in the pool.`,
          recommendation: `Add format specialists (red-ball Test specialists vs white-ball ODI/T20I specialists) for ${team.name}.`,
        });
      }
    }
  });

  // 5. Data Schema & Tour Squad Anomalies
  ALL_PLAYERS.forEach((p) => {
    if (!VALID_BOWLING_STYLES.has(p.bowlingStyle)) {
      schemaAndTourAnomalies.push({
        id: `invalid_bowling_style_${p.id}`,
        category: 'DATA_SCHEMA_ANOMALY',
        severity: 'MEDIUM',
        countryId: p.countryId,
        playerId: p.id,
        title: `Invalid BowlingStyle '${p.bowlingStyle}' on player '${p.name}' (${p.id})`,
        details: `'${p.bowlingStyle}' is not a valid member of the BowlingStyle union in src/types/cricket.ts (expected 'OFF_BREAK' instead of 'RIGHT_ARM_OFF_BREAK').`,
        recommendation: `Replace '${p.bowlingStyle}' with 'OFF_BREAK' in src/data/squads.ts.`,
      });
    }

    if (p.id === 'ind_shiraz' && p.name === 'Mohammed Siraj') {
      schemaAndTourAnomalies.push({
        id: `typo_player_id_ind_shiraz`,
        category: 'DATA_SCHEMA_ANOMALY',
        severity: 'LOW',
        countryId: p.countryId,
        playerId: p.id,
        title: `Typo in Player ID 'ind_shiraz' for Mohammed Siraj`,
        details: `Mohammed Siraj's player ID is spelled 'ind_shiraz' in src/data/squads.ts and src/data/tours.ts.`,
        recommendation: `Normalize ID to 'ind_siraj' across squads.ts and tours.ts.`,
      });
    }
  });

  // Check Tour Squads
  OFFICIAL_TOURS.forEach((tour) => {
    if (tour.squadAnnounced && tour.tourSquadIds.length < 15) {
      schemaAndTourAnomalies.push({
        id: `undersized_tour_squad_${tour.id}`,
        category: 'TOUR_SQUAD_ISSUE',
        severity: 'MEDIUM',
        title: `Announced Tour Squad for '${tour.name}' has only ${tour.tourSquadIds.length} players (requires 15-20)`,
        details: `Tour '${tour.id}' has squadAnnounced=true, but tourSquadIds only lists ${tour.tourSquadIds.length} players (${tour.tourSquadIds.join(', ')}).`,
        recommendation: `Expand initial announced tourSquadIds to 15-18 players.`,
      });
    } else if (!tour.squadAnnounced && tour.tourSquadIds.length === 0) {
      schemaAndTourAnomalies.push({
        id: `empty_upcoming_tour_squad_${tour.id}`,
        category: 'TOUR_SQUAD_ISSUE',
        severity: 'LOW',
        title: `Upcoming Tour '${tour.name}' has an empty tourSquadIds array (0 players)`,
        details: `Tour '${tour.id}' (${tour.startDate} to ${tour.endDate}) currently has tourSquadIds: [] awaiting selection prior to deadline ${tour.squadSelectionDeadline}.`,
        recommendation: `Provide a default provisional 15-player touring squad or auto-populate on deadline if the user has not manually selected one.`,
      });
    }
  });

  // Check WTC / Tournament teams that have 0 players in DB
  INITIAL_TOURNAMENTS.forEach((tourn) => {
    tourn.table.forEach((row) => {
      const count = ALL_PLAYERS.filter((p) => p.countryId === row.teamId).length;
      if (count === 0) {
        schemaAndTourAnomalies.push({
          id: `tournament_team_no_players_${tourn.id}_${row.teamId}`,
          category: 'TOUR_SQUAD_ISSUE',
          severity: 'HIGH',
          countryId: row.teamId,
          format: tourn.format,
          title: `Tournament participant '${row.teamName}' (${row.teamId}) in '${tourn.name}' has 0 players in DB`,
          details: `${row.teamName} is an active participant in '${tourn.name}' (${tourn.format}), but has 0 players in ALL_PLAYERS.`,
          recommendation: `Add full player rosters for all tournament-participating nations (${row.teamId}).`,
        });
      }
    });
  });

  const allIssues = [
    ...duplicatePlayers,
    ...missingPlayers,
    ...incorrectCountryAssignments,
    ...formatLineupInconsistencies,
    ...schemaAndTourAnomalies,
  ];

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalRegisteredCountries: INTERNATIONAL_TEAMS.length,
      totalPlayerCountriesInDb: allCountryIds.length,
      totalPlayers: ALL_PLAYERS.length,
      coreInternationalPlayers: INTERNATIONAL_PLAYERS.length,
      additionalSquadMembers: ADDITIONAL_SQUAD_MEMBERS.length,
      activeMalePlayers: ALL_PLAYERS.filter((p) => p.status === 'ACTIVE' && p.gender === 'MALE').length,
      activeFemalePlayers: ALL_PLAYERS.filter((p) => p.status === 'ACTIVE' && p.gender === 'FEMALE').length,
      retiredPlayers: ALL_PLAYERS.filter((p) => p.status === 'RETIRED').length,
      legendPlayers: ALL_PLAYERS.filter((p) => p.status === 'LEGEND').length,
      totalIssuesFound: allIssues.length,
      highSeverityCount: allIssues.filter((i) => i.severity === 'HIGH').length,
      mediumSeverityCount: allIssues.filter((i) => i.severity === 'MEDIUM').length,
      lowSeverityCount: allIssues.filter((i) => i.severity === 'LOW').length,
      byCategory: {
        duplicatePlayers: duplicatePlayers.length,
        missingPlayers: missingPlayers.length,
        countryAssignments: incorrectCountryAssignments.length,
        formatLineupInconsistencies: formatLineupInconsistencies.length,
        schemaAnomalies: schemaAndTourAnomalies.filter((x) => x.category === 'DATA_SCHEMA_ANOMALY').length,
        tourSquadIssues: schemaAndTourAnomalies.filter((x) => x.category === 'TOUR_SQUAD_ISSUE').length,
      },
    },
    countryRosterAudit,
    duplicatePlayers,
    missingPlayers,
    incorrectCountryAssignments,
    formatLineupInconsistencies,
    schemaAndTourAnomalies,
  };
}

/**
 * Generates a Markdown version of the Validation Report for easy human reading
 */
export function generateValidationReportMarkdown(report: DatabaseValidationReport): string {
  const lines: string[] = [];
  lines.push(`# International Cricket Manager — Database Validation Report`);
  lines.push(`Generated At: ${report.generatedAt}\n`);

  lines.push(`## 1. Executive Summary`);
  lines.push(`- **Registered Countries (\`INTERNATIONAL_TEAMS\`)**: ${report.summary.totalRegisteredCountries}`);
  lines.push(`- **Countries Referenced by Players**: ${report.summary.totalPlayerCountriesInDb}`);
  lines.push(`- **Total Players in \`ALL_PLAYERS\`**: ${report.summary.totalPlayers} (${report.summary.coreInternationalPlayers} in \`players.ts\` + ${report.summary.additionalSquadMembers} in \`squads.ts\`)`);
  lines.push(`  - Active Men's Players: **${report.summary.activeMalePlayers}**`);
  lines.push(`  - Active Women's Players: **${report.summary.activeFemalePlayers}**`);
  lines.push(`  - Historical Legends: **${report.summary.legendPlayers}**`);
  lines.push(`  - Retired Players: **${report.summary.retiredPlayers}**`);
  lines.push(`- **Total Validation Findings**: **${report.summary.totalIssuesFound}** (${report.summary.highSeverityCount} High, ${report.summary.mediumSeverityCount} Medium, ${report.summary.lowSeverityCount} Low)\n`);

  lines.push(`## 2. Country-by-Country Roster Audit`);
  lines.push(`| Country | Code | In Teams Table | Total Players | Active Men | Legends/Retired | Women | Active Men Eligible (TEST / ODI / T20I) | Status |`);
  lines.push(`| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |`);
  report.countryRosterAudit.forEach((c) => {
    lines.push(
      `| ${c.countryName} | \`${c.countryId}\` | ${c.inInternationalTeamsTable ? 'Yes' : 'NO'} | ${c.totalPlayersInDb} | ${c.activeMenCount} | ${c.legendsCount + c.retiredCount} | ${c.activeWomenCount} | ${c.activeMenEligibleCounts.TEST} / ${c.activeMenEligibleCounts.ODI} / ${c.activeMenEligibleCounts.T20I} | **${c.status}** |`
    );
  });
  lines.push('');

  const renderSection = (title: string, issues: ValidationIssue[]) => {
    lines.push(`## ${title} (${issues.length})`);
    if (issues.length === 0) {
      lines.push(`No issues detected in this category.\n`);
      return;
    }
    issues.forEach((iss, idx) => {
      lines.push(`### ${idx + 1}. [${iss.severity}] ${iss.title}`);
      lines.push(`- **Issue ID**: \`${iss.id}\``);
      if (iss.countryId) lines.push(`- **Country**: \`${iss.countryId}\``);
      if (iss.format) lines.push(`- **Format**: \`${iss.format}\``);
      if (iss.playerId) lines.push(`- **Player ID**: \`${iss.playerId}\``);
      lines.push(`- **Details**: ${iss.details}`);
      lines.push(`- **Recommendation**: ${iss.recommendation}\n`);
    });
  };

  renderSection('3. Duplicate Players & Name Collisions', report.duplicatePlayers);
  renderSection('4. Missing Players & Incomplete National Pools', report.missingPlayers);
  renderSection('5. Incorrect Country Assignments & Pool Contamination', report.incorrectCountryAssignments);
  renderSection('6. Format-Specific Lineup Inconsistencies', report.formatLineupInconsistencies);
  renderSection('7. Schema & Tour Squad Anomalies', report.schemaAndTourAnomalies);

  return lines.join('\n');
}

/**
 * Builds the complete map of exported files (10 JSON files + validation report JSON & Markdown)
 */
export function buildAllDatabaseExportFiles(): Record<string, string> {
  const report = generateDatabaseValidationReport();
  const reportMd = generateValidationReportMarkdown(report);

  return {
    '01_countries.json': JSON.stringify(exportCountriesData(), null, 2),
    '02_all_players.json': JSON.stringify(exportAllPlayersData(), null, 2),
    '03_test_squads.json': JSON.stringify(exportFormatSquadsData('TEST'), null, 2),
    '04_odi_squads.json': JSON.stringify(exportFormatSquadsData('ODI'), null, 2),
    '05_t20i_squads.json': JSON.stringify(exportFormatSquadsData('T20I'), null, 2),
    '06_captains_and_vice_captains.json': JSON.stringify(exportCaptainsAndViceCaptainsData(), null, 2),
    '07_player_roles_and_styles.json': JSON.stringify(exportPlayerRolesAndStylesData(), null, 2),
    '08_tour_squads.json': JSON.stringify(exportTourSquadsData(), null, 2),
    '09_current_playing_xis.json': JSON.stringify(exportCurrentPlayingXIsData(), null, 2),
    '10_fixtures_and_tours.json': JSON.stringify(exportFixturesAndToursData(), null, 2),
    '11_validation_report.json': JSON.stringify(report, null, 2),
    '11_validation_report.md': reportMd,
  };
}

/**
 * Pure TypeScript PKZIP Builder (Store method 0 with valid CRC-32)
 * Works identically in Node.js and Browser without external dependencies.
 */
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function createZipArchive(files: Record<string, string>): Uint8Array {
  const encoder = new TextEncoder();
  const entries = Object.entries(files).map(([name, content]) => {
    const nameBytes = encoder.encode(name);
    const dataBytes = encoder.encode(content);
    const crc = crc32(dataBytes);
    return { name, nameBytes, dataBytes, crc };
  });

  let localHeadersSize = 0;
  let centralDirSize = 0;
  for (const entry of entries) {
    localHeadersSize += 30 + entry.nameBytes.length + entry.dataBytes.length;
    centralDirSize += 46 + entry.nameBytes.length;
  }

  const totalSize = localHeadersSize + centralDirSize + 22;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const out = new Uint8Array(buffer);

  let offset = 0;
  const localOffsets: number[] = [];

  // Write Local File Headers + File Data
  for (const entry of entries) {
    localOffsets.push(offset);
    view.setUint32(offset, 0x04034b50, true); // Local file header signature
    view.setUint16(offset + 4, 20, true); // Version needed to extract (2.0)
    view.setUint16(offset + 6, 0x0800, true); // General purpose bit flag (UTF-8)
    view.setUint16(offset + 8, 0, true); // Compression method (0 = Store)
    view.setUint16(offset + 10, 0, true); // Last mod file time
    view.setUint16(offset + 12, 0x5d62, true); // Last mod file date
    view.setUint32(offset + 14, entry.crc, true); // CRC-32
    view.setUint32(offset + 18, entry.dataBytes.length, true); // Compressed size
    view.setUint32(offset + 22, entry.dataBytes.length, true); // Uncompressed size
    view.setUint16(offset + 26, entry.nameBytes.length, true); // File name length
    view.setUint16(offset + 28, 0, true); // Extra field length
    offset += 30;

    out.set(entry.nameBytes, offset);
    offset += entry.nameBytes.length;

    out.set(entry.dataBytes, offset);
    offset += entry.dataBytes.length;
  }

  const centralDirOffset = offset;

  // Write Central Directory Headers
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    view.setUint32(offset, 0x02014b50, true); // Central file header signature
    view.setUint16(offset + 4, 20, true); // Version made by
    view.setUint16(offset + 6, 20, true); // Version needed to extract
    view.setUint16(offset + 8, 0x0800, true); // General purpose bit flag (UTF-8)
    view.setUint16(offset + 10, 0, true); // Compression method (0 = Store)
    view.setUint16(offset + 12, 0, true); // Last mod file time
    view.setUint16(offset + 14, 0x5d62, true); // Last mod file date
    view.setUint32(offset + 16, entry.crc, true); // CRC-32
    view.setUint32(offset + 20, entry.dataBytes.length, true); // Compressed size
    view.setUint32(offset + 24, entry.dataBytes.length, true); // Uncompressed size
    view.setUint16(offset + 28, entry.nameBytes.length, true); // File name length
    view.setUint16(offset + 30, 0, true); // Extra field length
    view.setUint16(offset + 32, 0, true); // File comment length
    view.setUint16(offset + 34, 0, true); // Disk number start
    view.setUint16(offset + 36, 0, true); // Internal file attributes
    view.setUint32(offset + 38, 0, true); // External file attributes
    view.setUint32(offset + 42, localOffsets[i], true); // Relative offset of local header
    offset += 46;

    out.set(entry.nameBytes, offset);
    offset += entry.nameBytes.length;
  }

  // Write End of Central Directory Record (EOCD)
  view.setUint32(offset, 0x06054b50, true); // EOCD signature
  view.setUint16(offset + 4, 0, true); // Number of this disk
  view.setUint16(offset + 6, 0, true); // Disk where central directory starts
  view.setUint16(offset + 8, entries.length, true); // Number of central directory records on this disk
  view.setUint16(offset + 10, entries.length, true); // Total number of central directory records
  view.setUint32(offset + 12, centralDirSize, true); // Size of central directory
  view.setUint32(offset + 16, centralDirOffset, true); // Offset of start of central directory
  view.setUint16(offset + 20, 0, true); // Comment length

  return out;
}

/**
 * Browser helper to trigger download of the full ZIP package
 */
export function downloadDatabaseExportZip(filename = 'ICM_Database_Export.zip'): void {
  const files = buildAllDatabaseExportFiles();
  const zipBytes = createZipArchive(files);
  const blob = new Blob([zipBytes], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Browser helper to download an individual JSON/MD file from the export bundle
 */
export function downloadSingleExportFile(fileName: string): void {
  const files = buildAllDatabaseExportFiles();
  const content = files[fileName];
  if (!content) return;
  const mime = fileName.endsWith('.json') ? 'application/json' : 'text/markdown';
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
