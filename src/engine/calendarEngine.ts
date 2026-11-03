import { CalendarEvent, Match, MatchFormat, Tour } from '../types/cricket';
import { VENUES } from '../data/venues';
import { getDefaultPlayingXI, getDefaultCaptainId, getDefaultWicketKeeperId } from '../data/squads';
import { createBilateralTour } from './tourEngine';

export interface CalendarTimeline {
  events: CalendarEvent[];
  userMatches: Match[];
  worldMatches: Match[];
  tours: Tour[];
}

/**
 * Builds a comprehensive, multi-year international cricket calendar for every nation
 * with bilateral tours, multi-format series, Ashes, BGT, WTC, World Cups, rest days & training days.
 * Strictly guarantees no team has overlapping matches on the same date.
 */
export function buildInternationalCalendar(userTeamId: string): CalendarTimeline {
  const events: CalendarEvent[] = [];
  const userMatches: Match[] = [];
  const worldMatches: Match[] = [];
  const allTours: Tour[] = [];

  // Track team dates to guarantee no overlapping fixtures for any team
  const busyTeamDates = new Set<string>(); // "TEAM_YYYY-MM-DD"

  function isTeamBusy(teamId: string, date: string): boolean {
    return busyTeamDates.has(`${teamId}_${date}`);
  }

  function markTeamBusy(teamId: string, date: string) {
    busyTeamDates.add(`${teamId}_${date}`);
  }

  function getNeutralOrHostVenue(hostTeamId: string, preferredVenueName?: string) {
    if (preferredVenueName) {
      const match = VENUES.find((v) => v.name.toLowerCase().includes(preferredVenueName.toLowerCase()));
      if (match) return match;
    }
    const hostVenues = VENUES.filter((v) => v.countryId === hostTeamId);
    return hostVenues.length > 0 ? hostVenues[0] : VENUES[0];
  }

  // 1. Core Bilateral Tours (including Ashes and BGT)
  const tourTemplates = [
    // Border-Gavaskar Trophy (5 Tests)
    {
      host: 'AUS',
      visiting: 'IND',
      tests: 5,
      odis: 0,
      t20is: 0,
      startDate: '2026-11-22',
      year: 2026,
      name: 'Border-Gavaskar Trophy (India in Australia)',
      isSpecial: 'BORDER_GAVASKAR' as const,
    },
    // The Ashes (5 Tests)
    {
      host: 'AUS',
      visiting: 'ENG',
      tests: 5,
      odis: 0,
      t20is: 0,
      startDate: '2027-01-14',
      year: 2027,
      name: 'The Ashes Series (England in Australia)',
      isSpecial: 'ASHES' as const,
    },
    // Multi-Format: South Africa in India (2 Tests, 3 ODIs, 5 T20Is)
    {
      host: 'IND',
      visiting: 'RSA',
      tests: 2,
      odis: 3,
      t20is: 5,
      startDate: '2027-02-18',
      year: 2027,
      name: 'South Africa Tour of India (Multi-Format Series)',
    },
    // Pakistan in Australia (3 Tests, 3 ODIs)
    {
      host: 'AUS',
      visiting: 'PAK',
      tests: 3,
      odis: 3,
      t20is: 0,
      startDate: '2027-02-24',
      year: 2027,
      name: 'Pakistan Tour of Australia',
    },
    // New Zealand in England (3 Tests, 3 ODIs, 3 T20Is)
    {
      host: 'ENG',
      visiting: 'NZL',
      tests: 3,
      odis: 3,
      t20is: 3,
      startDate: '2027-05-15',
      year: 2027,
      name: 'New Zealand Tour of England',
    },
    // India in England (Pataudi Trophy - 5 Tests)
    {
      host: 'ENG',
      visiting: 'IND',
      tests: 5,
      odis: 0,
      t20is: 0,
      startDate: '2027-07-02',
      year: 2027,
      name: 'Anthony de Mello Trophy (India in England)',
    },
    // Sri Lanka in South Africa (2 Tests, 3 ODIs)
    {
      host: 'RSA',
      visiting: 'SL',
      tests: 2,
      odis: 3,
      t20is: 0,
      startDate: '2026-11-28',
      year: 2026,
      name: 'Sri Lanka Tour of South Africa',
    },
    // West Indies in Pakistan (2 Tests, 3 T20Is)
    {
      host: 'PAK',
      visiting: 'WI',
      tests: 2,
      odis: 0,
      t20is: 3,
      startDate: '2027-01-08',
      year: 2027,
      name: 'West Indies Tour of Pakistan',
    },
    // Zimbabwe in England (Only Test)
    {
      host: 'ENG',
      visiting: 'ZIM',
      tests: 1,
      odis: 3,
      t20is: 0,
      startDate: '2027-05-22',
      year: 2027,
      name: 'Zimbabwe in England',
    },
    // Bangladesh in Sri Lanka (2 Tests, 3 ODIs, 3 T20Is)
    {
      host: 'SL',
      visiting: 'BAN',
      tests: 2,
      odis: 3,
      t20is: 3,
      startDate: '2027-03-12',
      year: 2027,
      name: 'Bangladesh Tour of Sri Lanka',
    },
    // Ireland in Afghanistan (1 Test, 3 ODIs, 3 T20Is)
    {
      host: 'AFG',
      visiting: 'IRE',
      tests: 1,
      odis: 3,
      t20is: 3,
      startDate: '2027-02-10',
      year: 2027,
      name: 'Ireland vs Afghanistan Series (Sharjah)',
    },
  ];

  // If user country is not among host/visiting above, create dedicated home & away series for them!
  const hasUserTour = tourTemplates.some((t) => t.host === userTeamId || t.visiting === userTeamId);
  if (!hasUserTour) {
    const oppId = userTeamId === 'AUS' ? 'IND' : userTeamId === 'ENG' ? 'AUS' : 'IND';
    tourTemplates.unshift({
      host: userTeamId,
      visiting: oppId,
      tests: 3,
      odis: 3,
      t20is: 3,
      startDate: '2026-11-20',
      year: 2026,
      name: `${userTeamId} Championship Campaign (vs ${oppId})`,
      isSpecial: undefined,
    });
  }

  // Generate All Bilateral Tours
  tourTemplates.forEach((tmpl) => {
    const { tour, matches } = createBilateralTour(
      tmpl.host,
      tmpl.visiting,
      { tests: tmpl.tests, odis: tmpl.odis, t20is: tmpl.t20is },
      tmpl.startDate,
      tmpl.year,
      tmpl.name,
      tmpl.isSpecial
    );

    allTours.push(tour);

    // Filter and add matches while maintaining non-overlapping constraints
    matches.forEach((m) => {
      if (m.date && !isTeamBusy(m.homeTeamId, m.date) && !isTeamBusy(m.awayTeamId, m.date)) {
        markTeamBusy(m.homeTeamId, m.date);
        markTeamBusy(m.awayTeamId, m.date);

        const isUser = m.homeTeamId === userTeamId || m.awayTeamId === userTeamId;
        m.isUserMatch = isUser;
        m.userTeamId = userTeamId;

        if (isUser) {
          userMatches.push(m);
        } else {
          worldMatches.push(m);
        }
      }
    });
  });

  // 2. Standalone ICC World Test Championship Final (Lord's, 10 June 2027)
  const wtcFinalDate = '2027-06-10';
  const wtcHost = 'AUS'; // Top seed
  const wtcVisiting = 'IND'; // Runner up
  const wtcVenue = getNeutralOrHostVenue('ENG', "Lord's");

  const wtcFinalMatch: Match = {
    id: 'match_wtc_final_2027',
    format: 'TEST',
    seriesName: 'ICC World Test Championship Grand Final (Lord’s)',
    tournamentId: 'wtc_2025_27',
    competitionId: 'wtc_2025_27',
    matchNumber: 1,
    totalMatchesInSeries: 1,
    homeTeamId: wtcHost,
    awayTeamId: wtcVisiting,
    venue: wtcVenue.name,
    pitch: wtcVenue.pitch,
    weather: wtcVenue.weather,
    date: wtcFinalDate,
    dayNumber: 1,
    sessionNumber: 1,
    status: 'SCHEDULED',
    currentInningsIndex: 0,
    innings: [],
    homeXI: getDefaultPlayingXI(wtcHost, 'TEST'),
    awayXI: getDefaultPlayingXI(wtcVisiting, 'TEST'),
    homeCaptainId: getDefaultCaptainId(wtcHost, 'TEST'),
    awayCaptainId: getDefaultCaptainId(wtcVisiting, 'TEST'),
    homeWicketKeeperId: getDefaultWicketKeeperId(wtcHost, 'TEST'),
    awayWicketKeeperId: getDefaultWicketKeeperId(wtcVisiting, 'TEST'),
    userTeamId,
    isUserMatch: wtcHost === userTeamId || wtcVisiting === userTeamId,
    userTactics: { battingAggression: 'BALANCED', bowlingTactic: 'BALANCED_CONTAIN', fieldPreset: 'BALANCED_STANDARD' },
    aiTactics: { battingAggression: 'BALANCED', bowlingTactic: 'BALANCED_CONTAIN', fieldPreset: 'BALANCED_STANDARD' },
    stage: 'FINAL',
  };

  if (!isTeamBusy(wtcHost, wtcFinalDate) && !isTeamBusy(wtcVisiting, wtcFinalDate)) {
    markTeamBusy(wtcHost, wtcFinalDate);
    markTeamBusy(wtcVisiting, wtcFinalDate);
    if (wtcFinalMatch.isUserMatch) userMatches.push(wtcFinalMatch);
    else worldMatches.push(wtcFinalMatch);
  }

  // 3. ICC Men's Cricket World Cup 2027 (Southern Africa) Fixtures
  const cwcFixtures = [
    { home: 'RSA', away: 'ENG', date: '2027-10-02', venueName: 'Wanderers Stadium, Johannesburg' },
    { home: 'IND', away: 'AUS', date: '2027-10-04', venueName: 'SuperSport Park, Centurion' },
    { home: 'NZL', away: 'PAK', date: '2027-10-06', venueName: 'Newlands, Cape Town' },
    { home: 'WI', away: 'SL', date: '2027-10-08', venueName: 'Kingsmead, Durban' },
    { home: 'AFG', away: 'BAN', date: '2027-10-10', venueName: 'Harare Sports Club, Zimbabwe' },
    { home: 'IND', away: 'RSA', date: '2027-10-14', venueName: 'Wanderers Stadium, Johannesburg' },
    { home: 'AUS', away: 'ENG', date: '2027-10-18', venueName: 'Newlands, Cape Town' },
    { home: 'IND', away: 'PAK', date: '2027-10-24', venueName: 'SuperSport Park, Centurion' },
    { home: 'RSA', away: 'AUS', date: '2027-10-30', venueName: 'Wanderers Stadium, Johannesburg' },
    // Knockouts
    { home: 'IND', away: 'ENG', date: '2027-11-08', venueName: 'Newlands, Cape Town', stage: 'SEMI_FINAL' as const },
    { home: 'AUS', away: 'RSA', date: '2027-11-10', venueName: 'SuperSport Park, Centurion', stage: 'SEMI_FINAL' as const },
    { home: 'IND', away: 'AUS', date: '2027-11-14', venueName: 'Wanderers Stadium, Johannesburg', stage: 'FINAL' as const },
  ];

  cwcFixtures.forEach((cf, idx) => {
    if (!isTeamBusy(cf.home, cf.date) && !isTeamBusy(cf.away, cf.date)) {
      markTeamBusy(cf.home, cf.date);
      markTeamBusy(cf.away, cf.date);

      const isUser = cf.home === userTeamId || cf.away === userTeamId;
      const vObj = getNeutralOrHostVenue(cf.home, cf.venueName);

      const cwcMatch: Match = {
        id: `match_cwc_2027_${idx + 1}`,
        format: 'ODI',
        seriesName: cf.stage ? `ICC Cricket World Cup 2027 — ${cf.stage === 'FINAL' ? 'Grand Final' : 'Semi-Final'}` : 'ICC Cricket World Cup 2027 — Group Stage',
        tournamentId: 'cwc_2027',
        competitionId: 'cwc_2027',
        matchNumber: idx + 1,
        totalMatchesInSeries: cwcFixtures.length,
        homeTeamId: cf.home,
        awayTeamId: cf.away,
        venue: vObj.name,
        pitch: vObj.pitch,
        weather: vObj.weather,
        date: cf.date,
        dayNumber: 1,
        sessionNumber: 1,
        status: 'SCHEDULED',
        currentInningsIndex: 0,
        innings: [],
        homeXI: getDefaultPlayingXI(cf.home, 'ODI'),
        awayXI: getDefaultPlayingXI(cf.away, 'ODI'),
        homeCaptainId: getDefaultCaptainId(cf.home, 'ODI'),
        awayCaptainId: getDefaultCaptainId(cf.away, 'ODI'),
        homeWicketKeeperId: getDefaultWicketKeeperId(cf.home, 'ODI'),
        awayWicketKeeperId: getDefaultWicketKeeperId(cf.away, 'ODI'),
        userTeamId,
        isUserMatch: isUser,
        userTactics: { battingAggression: 'BALANCED', bowlingTactic: 'BALANCED_CONTAIN', fieldPreset: 'BALANCED_STANDARD' },
        aiTactics: { battingAggression: 'BALANCED', bowlingTactic: 'BALANCED_CONTAIN', fieldPreset: 'BALANCED_STANDARD' },
        stage: cf.stage || 'GROUP',
      };

      if (isUser) userMatches.push(cwcMatch);
      else worldMatches.push(cwcMatch);
    }
  });

  // Sort matches chronologically
  userMatches.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  worldMatches.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // 4. Generate Calendar Timeline Events for the User Manager
  const startDateMs = new Date('2026-11-15').getTime();

  // Match events
  userMatches.forEach((m) => {
    const dayIndex = Math.max(0, Math.round((new Date(m.date || '2026-11-20').getTime() - startDateMs) / (24 * 3600 * 1000)));

    events.push({
      id: `ev_user_${m.id}`,
      date: m.date || '2026-11-20',
      dayIndex,
      type: 'USER_MATCH',
      title: `${m.format}: ${m.homeTeamId} vs ${m.awayTeamId}`,
      description: `${m.seriesName} at ${m.venue}`,
      countryId: m.homeTeamId === userTeamId ? m.awayTeamId : m.homeTeamId,
      format: m.format,
      matchId: m.id,
      tourId: m.tourId,
      tournamentId: m.tournamentId,
    });
  });

  // World match events (sampled so calendar has global visibility)
  worldMatches.forEach((m) => {
    const dayIndex = Math.max(0, Math.round((new Date(m.date || '2026-11-20').getTime() - startDateMs) / (24 * 3600 * 1000)));

    events.push({
      id: `ev_world_${m.id}`,
      date: m.date || '2026-11-20',
      dayIndex,
      type: 'WORLD_MATCH',
      title: `${m.format}: ${m.homeTeamId} vs ${m.awayTeamId}`,
      description: `${m.seriesName} at ${m.venue}`,
      countryId: m.homeTeamId,
      format: m.format,
      matchId: m.id,
      tourId: m.tourId,
      tournamentId: m.tournamentId,
    });
  });

  // Tour start & squad deadlines
  allTours.forEach((t) => {
    if (t.hostTeamId === userTeamId || t.visitingTeamId === userTeamId) {
      const deadlineDayIndex = Math.max(0, Math.round((new Date(t.squadSelectionDeadline).getTime() - startDateMs) / (24 * 3600 * 1000)));
      events.push({
        id: `ev_deadline_${t.id}`,
        date: t.squadSelectionDeadline,
        dayIndex: deadlineDayIndex,
        type: 'SQUAD_DEADLINE',
        title: `Squad Announcement Deadline: ${t.name}`,
        description: `National selectors must finalize the 15-20 player tour party for ${t.name}.`,
        tourId: t.id,
      });

      const startDayIndex = Math.max(0, Math.round((new Date(t.startDate).getTime() - startDateMs) / (24 * 3600 * 1000)));
      events.push({
        id: `ev_tour_start_${t.id}`,
        date: t.startDate,
        dayIndex: startDayIndex,
        type: 'TOUR_START',
        title: `Tour Commencement: ${t.name}`,
        description: `${t.visitingTeamId} arrives in ${t.hostTeamId} to begin ${t.name}.`,
        tourId: t.id,
      });
    }
  });

  // Add Training and Rest Days in gaps between matches for the user team
  for (let i = 0; i < userMatches.length - 1; i++) {
    const m1 = userMatches[i];
    const m2 = userMatches[i + 1];
    if (m1.date && m2.date) {
      const d1 = new Date(m1.date).getTime();
      const d2 = new Date(m2.date).getTime();
      const gapDays = Math.round((d2 - d1) / (24 * 3600 * 1000));

      if (gapDays >= 3) {
        // Rest day
        const restDate = new Date(d1 + 24 * 3600 * 1000).toISOString().split('T')[0];
        events.push({
          id: `ev_rest_${i}`,
          date: restDate,
          dayIndex: Math.round((new Date(restDate).getTime() - startDateMs) / (24 * 3600 * 1000)),
          type: 'REST_DAY',
          title: 'Squad Recovery & Rest Period',
          description: 'Physiotherapy sessions, ice baths, and tactical video analysis.',
        });

        // Training day
        const trainDate = new Date(d1 + 2 * 24 * 3600 * 1000).toISOString().split('T')[0];
        events.push({
          id: `ev_train_${i}`,
          date: trainDate,
          dayIndex: Math.round((new Date(trainDate).getTime() - startDateMs) / (24 * 3600 * 1000)),
          type: 'TRAINING_DAY',
          title: 'Intensive Training & Net Session',
          description: 'Batting drills, target bowling, slip catching practice, and fitness circuits.',
        });
      }
    }
  }

  // Sort all events by date
  events.sort((a, b) => a.date.localeCompare(b.date));

  return {
    events,
    userMatches,
    worldMatches,
    tours: allTours,
  };
}
