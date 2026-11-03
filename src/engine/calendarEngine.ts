import { CalendarEvent, Match, MatchFormat, Tour } from '../types/cricket';
import { VENUES } from '../data/venues';
import { getDefaultPlayingXI, getDefaultCaptainId, getDefaultWicketKeeperId } from '../data/squads';
import { OFFICIAL_TOURS } from '../data/tours';

export interface CalendarTimeline {
  events: CalendarEvent[];
  userMatches: Match[];
  worldMatches: Match[];
}

/**
 * Builds the initial dynamic international calendar and match fixtures for the manager's career
 */
export function buildInternationalCalendar(userTeamId: string): CalendarTimeline {
  const events: CalendarEvent[] = [];
  const userMatches: Match[] = [];
  const worldMatches: Match[] = [];

  // Other top nations
  const worldTeams = ['IND', 'AUS', 'ENG', 'RSA', 'PAK', 'NZL', 'WI', 'AFG'].filter((id) => id !== userTeamId);

  // 1. Initial Tour for the user
  // If user is IND, start with Border-Gavaskar in AUS; if user is AUS, host IND; if ENG, Ashes prep; etc.
  let primaryTour = OFFICIAL_TOURS.find((t) => t.visitingTeamId === userTeamId || t.hostTeamId === userTeamId);
  if (!primaryTour) {
    primaryTour = {
      id: `tour_${userTeamId.toLowerCase()}_bilateral`,
      name: `${userTeamId} Championship Series`,
      hostTeamId: userTeamId,
      visitingTeamId: worldTeams[0] || 'AUS',
      startDate: '2026-11-20',
      endDate: '2026-12-28',
      year: 2026,
      status: 'IN_PROGRESS',
      series: {
        TEST: { matchCount: 3, matchesPlayed: 0, homeWins: 0, awayWins: 0, draws: 0 },
        ODI: { matchCount: 3, matchesPlayed: 0, homeWins: 0, awayWins: 0, ties: 0 },
      },
      venues: ['Eden Gardens', 'Wankhede Stadium'],
      squadSelectionDeadline: '2026-11-15',
      squadAnnounced: true,
      tourSquadIds: [],
    };
  }

  // Generate 5 User Matches across the season
  const matchConfigs: Array<{
    id: string;
    format: MatchFormat;
    oppId: string;
    isHome: boolean;
    date: string;
    dayIndex: number;
    seriesName: string;
    tourId: string;
  }> = [
    {
      id: 'match_user_1',
      format: 'TEST',
      oppId: primaryTour.hostTeamId === userTeamId ? primaryTour.visitingTeamId : primaryTour.hostTeamId,
      isHome: primaryTour.hostTeamId === userTeamId,
      date: '2026-11-22',
      dayIndex: 1,
      seriesName: `${primaryTour.name} — 1st Match`,
      tourId: primaryTour.id,
    },
    {
      id: 'match_user_2',
      format: 'TEST',
      oppId: primaryTour.hostTeamId === userTeamId ? primaryTour.visitingTeamId : primaryTour.hostTeamId,
      isHome: primaryTour.hostTeamId === userTeamId,
      date: '2026-12-06',
      dayIndex: 15,
      seriesName: `${primaryTour.name} — 2nd Match`,
      tourId: primaryTour.id,
    },
    {
      id: 'match_user_3',
      format: 'ODI',
      oppId: worldTeams[1] || 'ENG',
      isHome: true,
      date: '2026-12-20',
      dayIndex: 29,
      seriesName: `International ODI Super League — Match 1`,
      tourId: primaryTour.id,
    },
    {
      id: 'match_user_4',
      format: 'T20I',
      oppId: worldTeams[2] || 'RSA',
      isHome: true,
      date: '2027-01-10',
      dayIndex: 50,
      seriesName: `T20 Global Challenge — Clash of Champions`,
      tourId: primaryTour.id,
    },
    {
      id: 'match_user_5',
      format: 'TEST',
      oppId: worldTeams[0] || 'AUS',
      isHome: false,
      date: '2027-02-15',
      dayIndex: 86,
      seriesName: `ICC World Test Championship Decider`,
      tourId: primaryTour.id,
    },
  ];

  matchConfigs.forEach((cfg) => {
    const homeTeamId = cfg.isHome ? userTeamId : cfg.oppId;
    const awayTeamId = cfg.isHome ? cfg.oppId : userTeamId;
    const venueObj = VENUES.find((v) => v.countryId === homeTeamId) || VENUES[0];

    const match: Match = {
      id: cfg.id,
      format: cfg.format,
      seriesName: cfg.seriesName,
      tourId: cfg.tourId,
      homeTeamId,
      awayTeamId,
      venue: venueObj.name,
      pitch: venueObj.pitch,
      weather: venueObj.weather,
      date: cfg.date,
      dayNumber: 1,
      sessionNumber: 1,
      status: 'SCHEDULED',
      currentInningsIndex: 0,
      innings: [],
      homeXI: getDefaultPlayingXI(homeTeamId, cfg.format),
      awayXI: getDefaultPlayingXI(awayTeamId, cfg.format),
      homeCaptainId: getDefaultCaptainId(homeTeamId, cfg.format),
      awayCaptainId: getDefaultCaptainId(awayTeamId, cfg.format),
      homeWicketKeeperId: getDefaultWicketKeeperId(homeTeamId, cfg.format),
      awayWicketKeeperId: getDefaultWicketKeeperId(awayTeamId, cfg.format),
      userTeamId,
      isUserMatch: true,
      userTactics: {
        battingAggression: cfg.format === 'TEST' ? 'BALANCED' : 'ATTACKING',
        bowlingTactic: 'BALANCED_CONTAIN',
        fieldPreset: 'BALANCED_STANDARD',
      },
      aiTactics: {
        battingAggression: 'BALANCED',
        bowlingTactic: 'BALANCED_CONTAIN',
        fieldPreset: 'BALANCED_STANDARD',
      },
    };

    userMatches.push(match);

    events.push({
      id: `ev_user_${match.id}`,
      date: cfg.date,
      dayIndex: cfg.dayIndex,
      type: 'USER_MATCH',
      title: `${match.format}: ${homeTeamId} vs ${awayTeamId}`,
      description: `${match.seriesName} at ${match.venue}`,
      matchId: match.id,
      tourId: cfg.tourId,
      isSimulated: false,
    });
  });

  // 2. Generate Real World Matches among other nations (e.g. AUS vs ENG, RSA vs PAK, NZL vs WIN)
  const worldMatchPairings = [
    { team1: 'ENG', team2: 'AUS', format: 'TEST' as MatchFormat, date: '2026-11-20', dayIndex: 0, venue: VENUES[1] },
    { team1: 'RSA', team2: 'PAK', format: 'ODI' as MatchFormat, date: '2026-11-25', dayIndex: 4, venue: VENUES[3] },
    { team1: 'NZL', team2: 'WI', format: 'T20I' as MatchFormat, date: '2026-11-30', dayIndex: 9, venue: VENUES[0] },
    { team1: 'ENG', team2: 'RSA', format: 'TEST' as MatchFormat, date: '2026-12-08', dayIndex: 17, venue: VENUES[1] },
    { team1: 'AUS', team2: 'PAK', format: 'T20I' as MatchFormat, date: '2026-12-18', dayIndex: 27, venue: VENUES[2] },
    { team1: 'RSA', team2: 'NZL', format: 'ODI' as MatchFormat, date: '2027-01-05', dayIndex: 45, venue: VENUES[3] },
  ].filter((p) => p.team1 !== userTeamId && p.team2 !== userTeamId);

  worldMatchPairings.forEach((pair, idx) => {
    const wmId = `wm_${pair.team1}_${pair.team2}_${idx + 1}`;
    const wm: Match = {
      id: wmId,
      format: pair.format,
      seriesName: `ICC International Bilateral Series`,
      homeTeamId: pair.team1,
      awayTeamId: pair.team2,
      venue: pair.venue.name,
      pitch: pair.venue.pitch,
      weather: pair.venue.weather,
      date: pair.date,
      dayNumber: 1,
      sessionNumber: 1,
      status: 'SCHEDULED',
      currentInningsIndex: 0,
      innings: [],
      homeXI: getDefaultPlayingXI(pair.team1, pair.format),
      awayXI: getDefaultPlayingXI(pair.team2, pair.format),
      homeCaptainId: getDefaultCaptainId(pair.team1, pair.format),
      awayCaptainId: getDefaultCaptainId(pair.team2, pair.format),
      homeWicketKeeperId: getDefaultWicketKeeperId(pair.team1, pair.format),
      awayWicketKeeperId: getDefaultWicketKeeperId(pair.team2, pair.format),
      userTeamId,
      isUserMatch: false,
      userTactics: { battingAggression: 'BALANCED', bowlingTactic: 'BALANCED_CONTAIN', fieldPreset: 'BALANCED_STANDARD' },
      aiTactics: { battingAggression: 'BALANCED', bowlingTactic: 'BALANCED_CONTAIN', fieldPreset: 'BALANCED_STANDARD' },
    };

    worldMatches.push(wm);

    events.push({
      id: `ev_wm_${wm.id}`,
      date: pair.date,
      dayIndex: pair.dayIndex,
      type: 'WORLD_MATCH',
      title: `${pair.format}: ${pair.team1} vs ${pair.team2}`,
      description: `ICC International Series match in ${pair.venue.city}`,
      matchId: wm.id,
      isSimulated: false,
    });
  });

  // 3. Squad Deadlines & Tour Starts
  OFFICIAL_TOURS.forEach((tour) => {
    events.push({
      id: `ev_tour_deadline_${tour.id}`,
      date: tour.squadSelectionDeadline,
      dayIndex: Math.max(0, Math.floor((new Date(tour.squadSelectionDeadline).getTime() - new Date('2026-11-15').getTime()) / (1000 * 3600 * 24))),
      type: 'SQUAD_DEADLINE',
      title: `Squad Announcement Deadline: ${tour.name}`,
      description: `National selection committee must finalize the official touring party (15-20 players).`,
      tourId: tour.id,
    });

    events.push({
      id: `ev_tour_start_${tour.id}`,
      date: tour.startDate,
      dayIndex: Math.max(0, Math.floor((new Date(tour.startDate).getTime() - new Date('2026-11-15').getTime()) / (1000 * 3600 * 24))),
      type: 'TOUR_START',
      title: `Tour Commences: ${tour.name}`,
      description: `Opening ceremonies and preliminary press conferences before series opener.`,
      tourId: tour.id,
    });
  });

  // Sort events by date / dayIndex
  events.sort((a, b) => a.dayIndex - b.dayIndex);

  return {
    events,
    userMatches,
    worldMatches,
  };
}
