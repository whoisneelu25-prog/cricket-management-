import {
  ArchivedMatchSummary,
  CalendarEvent,
  CareerSave,
  Match,
  MatchFormat,
  Tour,
  TournamentEdition,
} from '../types/cricket';
import { VENUES } from '../data/venues';
import {
  getDefaultCaptainId,
  getDefaultPlayingXI,
  getDefaultWicketKeeperId,
} from '../data/squads';
import { createZeroTableForTeams, TEAM_META } from '../data/tournamentData';
import { createBilateralTour } from './tourEngine';
import { isTerminalMatchStatus } from './matchEngine';

export interface CalendarTimeline {
  events: CalendarEvent[];
  userMatches: Match[];
  worldMatches: Match[];
  tours: Tour[];
}

const WTC_NATIONS = new Set(['AUS', 'IND', 'ENG', 'RSA', 'NZL', 'PAK', 'SL', 'WI', 'BAN']);
const FULL_TEST_MEMBERS = new Set([
  'IND', 'AUS', 'ENG', 'PAK', 'RSA', 'NZL', 'SL', 'BAN', 'WI', 'AFG', 'IRE', 'ZIM',
]);

function addDays(dateStr: string, days: number): string {
  const ms = new Date(dateStr).getTime() + days * 24 * 3600 * 1000;
  return new Date(ms).toISOString().split('T')[0];
}

/**
 * Multi-day window conflict tracker:
 * - TEST match occupies 6 days (Days 1-5 + 1 mandatory travel/recovery day)
 * - ODI / T20I match occupies 2 days (Match day + 1 travel/recovery day)
 */
class TeamWindowTracker {
  private busyTeamDates = new Set<string>();

  constructor(existingMatches: Match[] = []) {
    existingMatches.forEach((m) => {
      if (m.date) {
        this.reserveWindow(m.homeTeamId, m.awayTeamId, m.date, m.format);
      }
    });
  }

  getWindowDays(format: MatchFormat): number {
    return format === 'TEST' ? 6 : 2;
  }

  isWindowFree(teamA: string, teamB: string, startDate: string, format: MatchFormat): boolean {
    const span = this.getWindowDays(format);
    for (let d = 0; d < span; d++) {
      const dt = addDays(startDate, d);
      if (this.busyTeamDates.has(`${teamA}_${dt}`) || this.busyTeamDates.has(`${teamB}_${dt}`)) {
        return false;
      }
    }
    return true;
  }

  findNextFreeDate(teamA: string, teamB: string, proposedDate: string, format: MatchFormat): string {
    let candidate = proposedDate;
    let guard = 0;
    while (!this.isWindowFree(teamA, teamB, candidate, format) && guard < 400) {
      candidate = addDays(candidate, 1);
      guard++;
    }
    return candidate;
  }

  reserveWindow(teamA: string, teamB: string, startDate: string, format: MatchFormat): void {
    const span = this.getWindowDays(format);
    for (let d = 0; d < span; d++) {
      const dt = addDays(startDate, d);
      this.busyTeamDates.add(`${teamA}_${dt}`);
      this.busyTeamDates.add(`${teamB}_${dt}`);
    }
  }
}

function getVenueForCountry(countryId: string, idx = 0, preferredVenueName?: string) {
  if (preferredVenueName) {
    const found = VENUES.find((v) =>
      v.name.toLowerCase().includes(preferredVenueName.toLowerCase())
    );
    if (found) return found;
  }
  const list = VENUES.filter((v) => v.countryId === countryId);
  if (list.length > 0) return list[idx % list.length];
  return VENUES[idx % VENUES.length];
}

function makeSeedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h) + 17;
}

function generateRoundRobinGroupMatches(
  tournamentId: string,
  tournamentName: string,
  format: MatchFormat,
  hostCountryId: string,
  groups: Array<{ id: string; name: string; teamIds: string[] }>,
  startDate: string,
  userTeamId: string,
  tracker: TeamWindowTracker
): Match[] {
  const generated: Match[] = [];
  let cursorDate = startDate;
  let matchCounter = 1;

  // Interleave group pairings so teams get natural rest between matches
  const pairings: Array<{ groupId: string; groupName: string; home: string; away: string }> = [];
  groups.forEach((grp) => {
    const teams = grp.teamIds;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        pairings.push({
          groupId: grp.id,
          groupName: grp.name,
          home: teams[i],
          away: teams[j],
        });
      }
    }
  });

  // Sort pairings to alternate groups
  pairings.sort((a, b) => (a.groupId === b.groupId ? 0 : a.groupId.localeCompare(b.groupId)));
  const interleaved: typeof pairings = [];
  const grpA = pairings.filter((p) => p.groupId === groups[0]?.id);
  const grpB = pairings.filter((p) => p.groupId !== groups[0]?.id);
  const maxLen = Math.max(grpA.length, grpB.length);
  for (let i = 0; i < maxLen; i++) {
    if (grpA[i]) interleaved.push(grpA[i]);
    if (grpB[i]) interleaved.push(grpB[i]);
  }

  interleaved.forEach((pair, idx) => {
    const scheduledDate = tracker.findNextFreeDate(pair.home, pair.away, cursorDate, format);
    tracker.reserveWindow(pair.home, pair.away, scheduledDate, format);
    // Advance cursor every 1-2 matches so tournament progresses day by day
    if (idx % 2 === 1) {
      cursorDate = addDays(cursorDate, 1);
    }

    const vObj = getVenueForCountry(hostCountryId, matchCounter);
    const matchId = `match_${tournamentId}_grp_${matchCounter}`;
    const isUser = pair.home === userTeamId || pair.away === userTeamId;

    generated.push({
      id: matchId,
      format,
      seriesName: `${tournamentName} — ${pair.groupName}`,
      tournamentId,
      competitionId: tournamentId,
      groupId: pair.groupId,
      stage: 'GROUP',
      matchNumber: matchCounter,
      totalMatchesInSeries: interleaved.length,
      homeTeamId: pair.home,
      awayTeamId: pair.away,
      venue: vObj.name,
      pitch: vObj.pitch,
      weather: vObj.weather,
      date: scheduledDate,
      dayNumber: 1,
      sessionNumber: 1,
      status: 'SCHEDULED',
      currentInningsIndex: 0,
      innings: [],
      homeXI: getDefaultPlayingXI(pair.home, format),
      awayXI: getDefaultPlayingXI(pair.away, format),
      homeCaptainId: getDefaultCaptainId(pair.home, format),
      awayCaptainId: getDefaultCaptainId(pair.away, format),
      homeWicketKeeperId: getDefaultWicketKeeperId(pair.home, format),
      awayWicketKeeperId: getDefaultWicketKeeperId(pair.away, format),
      userTeamId,
      isUserMatch: isUser,
      userTactics: {
        battingAggression: 'BALANCED',
        bowlingTactic: 'BALANCED_CONTAIN',
        fieldPreset: 'BALANCED_STANDARD',
      },
      aiTactics: {
        battingAggression: 'BALANCED',
        bowlingTactic: 'BALANCED_CONTAIN',
        fieldPreset: 'BALANCED_STANDARD',
      },
      seed: makeSeedFromId(matchId),
    });

    matchCounter++;
  });

  return generated;
}

/**
 * Builds the comprehensive initial multi-year international cricket calendar (Nov 2026 – Mar 2028)
 * across all supported countries, bilateral tours, Ashes, BGT, WTC, T20 WC, Asia Cup, Tri-Series,
 * ODI World Cup, and Champions Trophy.
 */
export function buildInternationalCalendar(userTeamId: string): CalendarTimeline {
  const events: CalendarEvent[] = [];
  const userMatches: Match[] = [];
  const worldMatches: Match[] = [];
  const allTours: Tour[] = [];
  const tracker = new TeamWindowTracker();

  const tourTemplates: Array<{
    host: string;
    visiting: string;
    tests: number;
    odis: number;
    t20is: number;
    startDate: string;
    year: number;
    name?: string;
    isSpecial?: 'ASHES' | 'BORDER_GAVASKAR';
    wtcId?: string;
    suffix?: string;
  }> = [
    // Window 1: Late Nov 2026 – Early Jan 2027 (WTC 2025-27 Window)
    {
      host: 'AUS',
      visiting: 'IND',
      tests: 5,
      odis: 0,
      t20is: 0,
      startDate: '2026-11-22',
      year: 2026,
      name: 'Border-Gavaskar Trophy (India in Australia)',
      isSpecial: 'BORDER_GAVASKAR',
      wtcId: 'wtc_2025_27',
    },
    {
      host: 'RSA',
      visiting: 'SL',
      tests: 2,
      odis: 3,
      t20is: 0,
      startDate: '2026-11-24',
      year: 2026,
      name: 'Sri Lanka Tour of South Africa',
      wtcId: 'wtc_2025_27',
    },
    {
      host: 'NZL',
      visiting: 'ENG',
      tests: 3,
      odis: 0,
      t20is: 3,
      startDate: '2026-11-25',
      year: 2026,
      name: 'England Tour of New Zealand',
      wtcId: 'wtc_2025_27',
    },
    {
      host: 'WI',
      visiting: 'BAN',
      tests: 2,
      odis: 3,
      t20is: 3,
      startDate: '2026-11-26',
      year: 2026,
      name: 'Bangladesh Tour of West Indies',
      wtcId: 'wtc_2025_27',
    },
    {
      host: 'ZIM',
      visiting: 'PAK',
      tests: 0,
      odis: 3,
      t20is: 3,
      startDate: '2026-11-24',
      year: 2026,
      name: 'Pakistan White-Ball Tour of Zimbabwe',
    },
    {
      host: 'AFG',
      visiting: 'IRE',
      tests: 1,
      odis: 3,
      t20is: 3,
      startDate: '2026-11-28',
      year: 2026,
      name: 'Ireland vs Afghanistan Series',
    },

    // Window 2: Mid Jan 2027 – Late Feb 2027 (Ashes + Multi-Format Bilateral Tours)
    {
      host: 'AUS',
      visiting: 'ENG',
      tests: 5,
      odis: 0,
      t20is: 0,
      startDate: '2027-01-14',
      year: 2027,
      name: 'The Ashes Series (England in Australia)',
      isSpecial: 'ASHES',
      wtcId: 'wtc_2025_27',
    },
    {
      host: 'IND',
      visiting: 'RSA',
      tests: 2,
      odis: 3,
      t20is: 5,
      startDate: '2027-01-16',
      year: 2027,
      name: 'South Africa Tour of India (Multi-Format Series)',
      wtcId: 'wtc_2025_27',
    },
    {
      host: 'PAK',
      visiting: 'WI',
      tests: 2,
      odis: 3,
      t20is: 0,
      startDate: '2027-01-18',
      year: 2027,
      name: 'West Indies Tour of Pakistan',
      wtcId: 'wtc_2025_27',
    },
    {
      host: 'SL',
      visiting: 'NZL',
      tests: 2,
      odis: 3,
      t20is: 3,
      startDate: '2027-01-20',
      year: 2027,
      name: 'New Zealand Tour of Sri Lanka',
      wtcId: 'wtc_2025_27',
    },
    {
      host: 'BAN',
      visiting: 'ZIM',
      tests: 1,
      odis: 3,
      t20is: 3,
      startDate: '2027-01-22',
      year: 2027,
      name: 'Zimbabwe Tour of Bangladesh',
    },

    // Window 4: Late Apr 2027 – Late May 2027 (Final WTC 2025-27 Qualification Series)
    {
      host: 'ENG',
      visiting: 'PAK',
      tests: 3,
      odis: 3,
      t20is: 0,
      startDate: '2027-04-26',
      year: 2027,
      name: 'Pakistan Tour of England',
      wtcId: 'wtc_2025_27',
    },
    {
      host: 'SL',
      visiting: 'IND',
      tests: 0,
      odis: 3,
      t20is: 3,
      startDate: '2027-05-02',
      year: 2027,
      name: 'India White-Ball Tour of Sri Lanka',
    },
    {
      host: 'BAN',
      visiting: 'RSA',
      tests: 2,
      odis: 0,
      t20is: 3,
      startDate: '2027-04-28',
      year: 2027,
      name: 'South Africa Tour of Bangladesh',
      wtcId: 'wtc_2025_27',
    },

    // Window 5: Jul – Aug 2027 (Start of 2027-2029 WTC Cycle & Summer Tours)
    {
      host: 'ENG',
      visiting: 'IND',
      tests: 5,
      odis: 3,
      t20is: 3,
      startDate: '2027-07-02',
      year: 2027,
      name: 'India Tour of England (5 Tests & White-Ball)',
    },
    {
      host: 'WI',
      visiting: 'AUS',
      tests: 2,
      odis: 3,
      t20is: 3,
      startDate: '2027-07-08',
      year: 2027,
      name: 'Frank Worrell Trophy (Australia in West Indies)',
    },
    {
      host: 'IRE',
      visiting: 'NZL',
      tests: 1,
      odis: 3,
      t20is: 3,
      startDate: '2027-07-12',
      year: 2027,
      name: 'New Zealand Tour of Ireland',
    },
  ];

  // Ensure Associate nations (if selected by user, plus global associate cricket) have international fixtures!
  const associatePairs: Array<[string, string, string]> = [
    ['NEP', 'UAE', '2026-12-04'],
    ['SCO', 'NED', '2026-12-08'],
    ['USA', 'CAN', '2027-02-04'],
    ['NAM', 'OMA', '2027-02-10'],
  ];
  associatePairs.forEach(([h, v, dt]) => {
    tourTemplates.push({
      host: h,
      visiting: v,
      tests: 0,
      odis: 3,
      t20is: 3,
      startDate: dt,
      year: Number(dt.slice(0, 4)),
      name: `${TEAM_META[v]?.name || v} Tour of ${TEAM_META[h]?.name || h}`,
    });
  });

  const hasUserTour = tourTemplates.some(
    (t) => t.host === userTeamId || t.visiting === userTeamId
  );
  if (!hasUserTour) {
    const isTestNation = FULL_TEST_MEMBERS.has(userTeamId);
    const oppId = isTestNation ? 'IND' : 'IRE';
    tourTemplates.unshift({
      host: userTeamId,
      visiting: oppId,
      tests: isTestNation ? 2 : 0,
      odis: 3,
      t20is: 3,
      startDate: '2026-11-21',
      year: 2026,
      name: `${TEAM_META[oppId]?.name || oppId} Tour of ${userTeamId}`,
    });
  }

  // Generate all bilateral tours with conflict-free date adjustment
  tourTemplates.forEach((tmpl) => {
    const canPlayTests =
      FULL_TEST_MEMBERS.has(tmpl.host) && FULL_TEST_MEMBERS.has(tmpl.visiting);
    const testsCount = canPlayTests ? tmpl.tests : 0;
    const isWtc =
      tmpl.wtcId && WTC_NATIONS.has(tmpl.host) && WTC_NATIONS.has(tmpl.visiting)
        ? tmpl.wtcId
        : undefined;

    const { tour, matches } = createBilateralTour(
      tmpl.host,
      tmpl.visiting,
      { tests: testsCount, odis: tmpl.odis, t20is: tmpl.t20is },
      tmpl.startDate,
      tmpl.year,
      tmpl.name,
      tmpl.isSpecial,
      isWtc,
      tmpl.suffix
    );

    const scheduledTourMatches: Match[] = [];
    matches.forEach((m) => {
      const safeDate = tracker.findNextFreeDate(
        m.homeTeamId,
        m.awayTeamId,
        m.date || tmpl.startDate,
        m.format
      );
      tracker.reserveWindow(m.homeTeamId, m.awayTeamId, safeDate, m.format);

      const isUser = m.homeTeamId === userTeamId || m.awayTeamId === userTeamId;
      const adjustedMatch: Match = {
        ...m,
        date: safeDate,
        isUserMatch: isUser,
        userTeamId,
        seed: makeSeedFromId(m.id),
      };
      scheduledTourMatches.push(adjustedMatch);

      if (isUser) userMatches.push(adjustedMatch);
      else worldMatches.push(adjustedMatch);
    });

    if (scheduledTourMatches.length > 0) {
      tour.startDate = scheduledTourMatches[0].date || tour.startDate;
      tour.endDate =
        scheduledTourMatches[scheduledTourMatches.length - 1].date || tour.endDate;
      tour.squadSelectionDeadline = addDays(tour.startDate, -5);
      // AI-vs-AI tours auto-announce their squads
      if (tour.hostTeamId !== userTeamId && tour.visitingTeamId !== userTeamId) {
        tour.squadAnnounced = true;
      }
      allTours.push(tour);
    }
  });

  // Sort tours so user's tours come first chronologically, followed by global AI tours
  allTours.sort((a, b) => {
    const aUser = a.hostTeamId === userTeamId || a.visitingTeamId === userTeamId ? 0 : 1;
    const bUser = b.hostTeamId === userTeamId || b.visitingTeamId === userTeamId ? 0 : 1;
    if (aUser !== bUser) return aUser - bUser;
    return a.startDate.localeCompare(b.startDate);
  });

  // 2. ICC Men's T20 World Cup (Mar 2027 — Group Stage; SF & Final generated dynamically!)
  const t20WcMatches = generateRoundRobinGroupMatches(
    't20_wc_2026',
    'ICC Men’s T20 World Cup',
    'T20I',
    'IND',
    [
      { id: 'GROUP_A', name: 'Group 1', teamIds: ['IND', 'PAK', 'ENG', 'AFG'] },
      { id: 'GROUP_B', name: 'Group 2', teamIds: ['AUS', 'RSA', 'WI', 'NZL'] },
    ],
    '2027-03-08',
    userTeamId,
    tracker
  );

  // 3. Southern Hemisphere Tri-Series (Apr 2027 — Double Round-Robin; Final generated dynamically!)
  const triMatches1 = generateRoundRobinGroupMatches(
    'tri_series_2027',
    'Southern Hemisphere Tri-Series',
    'ODI',
    'AUS',
    [{ id: 'GROUP_A', name: 'League Stage', teamIds: ['AUS', 'RSA', 'NZL'] }],
    '2027-04-06',
    userTeamId,
    tracker
  );

  // 4. Asia Cup 2027 (Sep 2027 — Group Stage; SF & Final generated dynamically!)
  const asiaCupMatches = generateRoundRobinGroupMatches(
    'asia_cup_2027',
    'Asia Cup 2027',
    'T20I',
    'SL',
    [
      { id: 'GROUP_A', name: 'Group A', teamIds: ['IND', 'PAK', 'NEP'] },
      { id: 'GROUP_B', name: 'Group B', teamIds: ['SL', 'BAN', 'AFG'] },
    ],
    '2027-09-04',
    userTeamId,
    tracker
  );

  // 5. ICC Men's Cricket World Cup 2027 (Oct 2027 — 20 Group Matches; SF & Final generated dynamically!)
  const cwcMatches = generateRoundRobinGroupMatches(
    'cwc_2027',
    'ICC Cricket World Cup 2027',
    'ODI',
    'RSA',
    [
      { id: 'GROUP_A', name: 'Group A', teamIds: ['IND', 'AUS', 'PAK', 'WI', 'BAN'] },
      { id: 'GROUP_B', name: 'Group B', teamIds: ['RSA', 'ENG', 'NZL', 'SL', 'AFG'] },
    ],
    '2027-10-02',
    userTeamId,
    tracker
  );

  // 6. ICC Champions Trophy 2028 (Feb 2028 — 12 Group Matches; SF & Final generated dynamically!)
  const ctMatches = generateRoundRobinGroupMatches(
    'ct_2028',
    'ICC Champions Trophy 2028',
    'ODI',
    'PAK',
    [
      { id: 'GROUP_A', name: 'Group A', teamIds: ['PAK', 'IND', 'NZL', 'BAN'] },
      { id: 'GROUP_B', name: 'Group B', teamIds: ['AUS', 'ENG', 'RSA', 'AFG'] },
    ],
    '2028-02-06',
    userTeamId,
    tracker
  );

  [...t20WcMatches, ...triMatches1, ...asiaCupMatches, ...cwcMatches, ...ctMatches].forEach(
    (tm) => {
      if (tm.isUserMatch) userMatches.push(tm);
      else worldMatches.push(tm);
    }
  );

  userMatches.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  worldMatches.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // Build Calendar Events
  const startDateMs = new Date('2026-11-15').getTime();
  const toDayIdx = (d: string) =>
    Math.max(0, Math.round((new Date(d).getTime() - startDateMs) / (24 * 3600 * 1000)));

  userMatches.forEach((m) => {
    const dt = m.date || '2026-11-20';
    events.push({
      id: `ev_user_${m.id}`,
      date: dt,
      dayIndex: toDayIdx(dt),
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

  worldMatches.forEach((m) => {
    const dt = m.date || '2026-11-20';
    events.push({
      id: `ev_world_${m.id}`,
      date: dt,
      dayIndex: toDayIdx(dt),
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

  allTours.forEach((t) => {
    if (t.hostTeamId === userTeamId || t.visitingTeamId === userTeamId) {
      events.push({
        id: `ev_deadline_${t.id}`,
        date: t.squadSelectionDeadline,
        dayIndex: toDayIdx(t.squadSelectionDeadline),
        type: 'SQUAD_DEADLINE',
        title: `Squad Announcement Deadline: ${t.name}`,
        description: `Select the 15–20 player touring squad for ${t.name}.`,
        tourId: t.id,
      });

      events.push({
        id: `ev_tour_start_${t.id}`,
        date: t.startDate,
        dayIndex: toDayIdx(t.startDate),
        type: 'TOUR_START',
        title: `Tour Commencement: ${t.name}`,
        description: `${t.visitingTeamId} vs ${t.hostTeamId} — ${t.name} gets underway.`,
        tourId: t.id,
      });
    }
  });

  // Rest and Training periods between user matches
  for (let i = 0; i < userMatches.length - 1; i++) {
    const m1 = userMatches[i];
    const m2 = userMatches[i + 1];
    if (m1.date && m2.date) {
      const d1 = new Date(m1.date).getTime();
      const d2 = new Date(m2.date).getTime();
      const gapDays = Math.round((d2 - d1) / (24 * 3600 * 1000));

      if (gapDays >= 3) {
        const restDate = addDays(m1.date, 1);
        events.push({
          id: `ev_rest_${m1.id}`,
          date: restDate,
          dayIndex: toDayIdx(restDate),
          type: 'REST_DAY',
          title: 'Squad Recovery & Rest Period',
          description: 'Physiotherapy, workload recovery, and video analysis.',
        });

        const trainDate = addDays(m1.date, 2);
        events.push({
          id: `ev_train_${m1.id}`,
          date: trainDate,
          dayIndex: toDayIdx(trainDate),
          type: 'TRAINING_DAY',
          title: 'National Squad Net & Fitness Session',
          description: 'Focused batting, bowling, fielding, and conditioning drills.',
        });
      }
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));

  return {
    events,
    userMatches,
    worldMatches,
    tours: allTours,
  };
}

/**
 * Dynamically generates a full new year of international bilateral tours, alternating
 * Ashes/BGT hosts, WTC cycles, and ICC/Continental tournaments for multi-season careers (2028, 2029, 2030+);
 * also archives old completed fixtures cleanly so saves never bloat or slow down!
 */
export function generateNextSeasonSchedule(career: CareerSave, targetYear: number): void {
  const generatedThrough = career.seasonsGeneratedThroughYear || 2027;
  if (targetYear <= generatedThrough) return;

  const userTeamId = career.selectedTeamId;
  const existingAll = [...career.fixtures, ...career.worldFixtures];
  const tracker = new TeamWindowTracker(existingAll);

  // Determine current WTC cycle ID (2-year cycles ending in odd years: 2027-29 -> wtc_2027_29, 2029-31 -> wtc_2029_31)
  const wtcEndYear = targetYear % 2 === 0 ? targetYear + 1 : targetYear;
  const wtcStartYear = wtcEndYear - 2;
  const wtcId = `wtc_${wtcStartYear}_${String(wtcEndYear).slice(-2)}`;

  if (!career.tournamentEditions) career.tournamentEditions = [];

  if (!career.tournamentEditions.some((t) => t.id === wtcId)) {
    const prevWtc = career.tournamentEditions.find((t) => t.competitionType === 'WTC');
    career.tournamentEditions.push({
      id: wtcId,
      competitionType: 'WTC',
      name: 'ICC World Test Championship',
      format: 'TEST',
      season: `${wtcStartYear}–${wtcEndYear} Cycle`,
      cycleLengthYears: 2,
      year: wtcEndYear,
      hostCountryId: 'ENG',
      cutoffDate: `${wtcEndYear}-06-01`,
      currentStage: 'GROUP',
      participatingTeamIds: ['AUS', 'IND', 'ENG', 'RSA', 'NZL', 'PAK', 'SL', 'WI', 'BAN'],
      description: 'Two-year ICC World Test Championship cycle culminating in the Final at Lord’s.',
      status: 'IN_PROGRESS',
      rules: {
        pointsForWin: 12,
        pointsForTie: 6,
        pointsForDraw: 4,
        pointsForLoss: 0,
        usePCT: true,
        totalQualifiers: 2,
      },
      table: createZeroTableForTeams(
        ['AUS', 'IND', 'ENG', 'RSA', 'NZL', 'PAK', 'SL', 'WI', 'BAN'],
        true
      ),
      pastChampions: prevWtc ? [...prevWtc.pastChampions] : [],
    });
  }

  // Rotate pairings each year so every season feels fresh
  const coreTeams = ['IND', 'AUS', 'ENG', 'RSA', 'NZL', 'PAK', 'SL', 'WI', 'BAN', 'AFG', 'IRE', 'ZIM'];
  const shift = (targetYear - 2027) % (coreTeams.length - 1);
  const rotated = [
    coreTeams[0],
    ...coreTeams.slice(1 + shift),
    ...coreTeams.slice(1, 1 + shift),
  ];

  const newSeasonTours: Array<{
    host: string;
    visiting: string;
    tests: number;
    odis: number;
    t20is: number;
    startDate: string;
    name?: string;
    isSpecial?: 'ASHES' | 'BORDER_GAVASKAR';
    suffix: string;
  }> = [];

  // Window A: March–May bilateral tours
  for (let i = 0; i < 6; i++) {
    const tA = rotated[i];
    const tB = rotated[rotated.length - 1 - i];
    const host = targetYear % 2 === 0 ? tA : tB;
    const vis = host === tA ? tB : tA;

    const isAshesPair = (host === 'AUS' && vis === 'ENG') || (host === 'ENG' && vis === 'AUS');
    const isBgtPair = (host === 'IND' && vis === 'AUS') || (host === 'AUS' && vis === 'IND');

    newSeasonTours.push({
      host,
      visiting: vis,
      tests: isAshesPair || isBgtPair ? 5 : WTC_NATIONS.has(host) && WTC_NATIONS.has(vis) ? 2 : 1,
      odis: isAshesPair || isBgtPair ? 0 : 3,
      t20is: 3,
      startDate: `${targetYear}-03-14`,
      isSpecial: isAshesPair ? 'ASHES' : isBgtPair ? 'BORDER_GAVASKAR' : undefined,
      suffix: 'spr',
    });
  }

  // Guarantee alternating Ashes in odd years (2029 in ENG, 2031 in AUS) and BGT in even years (2028 in IND, 2030 in AUS)
  if (targetYear % 2 === 0 && !newSeasonTours.some((t) => t.isSpecial === 'BORDER_GAVASKAR')) {
    const bgtHost = ((targetYear - 2026) / 2) % 2 === 1 ? 'IND' : 'AUS';
    const bgtVis = bgtHost === 'IND' ? 'AUS' : 'IND';
    newSeasonTours.push({
      host: bgtHost,
      visiting: bgtVis,
      tests: 5,
      odis: 0,
      t20is: 0,
      startDate: `${targetYear}-11-18`,
      isSpecial: 'BORDER_GAVASKAR',
      name: `Border-Gavaskar Trophy (${bgtVis} in ${bgtHost} ${targetYear})`,
      suffix: 'win',
    });
  }

  if (targetYear % 2 === 1 && !newSeasonTours.some((t) => t.isSpecial === 'ASHES')) {
    const ashesHost = ((targetYear - 2027) / 2) % 2 === 1 ? 'ENG' : 'AUS';
    const ashesVis = ashesHost === 'ENG' ? 'AUS' : 'ENG';
    newSeasonTours.push({
      host: ashesHost,
      visiting: ashesVis,
      tests: 5,
      odis: 0,
      t20is: 0,
      startDate: `${targetYear}-07-04`,
      isSpecial: 'ASHES',
      name: `The Ashes ${targetYear} (${ashesVis} in ${ashesHost})`,
      suffix: 'sum',
    });
  }

  // Window B: July–August tours for non-Ashes nations
  const nextShift = (shift + 3) % (coreTeams.length - 1);
  const rotatedB = [
    coreTeams[0],
    ...coreTeams.slice(1 + nextShift),
    ...coreTeams.slice(1, 1 + nextShift),
  ];
  for (let i = 0; i < 4; i++) {
    const host = rotatedB[i];
    const vis = rotatedB[rotatedB.length - 1 - i];
    if (
      targetYear % 2 === 1 &&
      (host === 'ENG' || host === 'AUS' || vis === 'ENG' || vis === 'AUS')
    ) {
      continue;
    }
    newSeasonTours.push({
      host,
      visiting: vis,
      tests: WTC_NATIONS.has(host) && WTC_NATIONS.has(vis) ? 2 : 0,
      odis: 3,
      t20is: 3,
      startDate: `${targetYear}-07-12`,
      suffix: 'jul',
    });
  }

  const startDateMs = new Date('2026-11-15').getTime();
  const toDayIdx = (d: string) =>
    Math.max(0, Math.round((new Date(d).getTime() - startDateMs) / (24 * 3600 * 1000)));

  newSeasonTours.forEach((tmpl) => {
    const isWtcEligible =
      WTC_NATIONS.has(tmpl.host) && WTC_NATIONS.has(tmpl.visiting) ? wtcId : undefined;
    const { tour, matches } = createBilateralTour(
      tmpl.host,
      tmpl.visiting,
      { tests: tmpl.tests, odis: tmpl.odis, t20is: tmpl.t20is },
      tmpl.startDate,
      targetYear,
      tmpl.name,
      tmpl.isSpecial,
      isWtcEligible,
      tmpl.suffix
    );

    if (career.tours.some((t) => t.id === tour.id)) return;

    const scheduled: Match[] = [];
    matches.forEach((m) => {
      const safeDate = tracker.findNextFreeDate(
        m.homeTeamId,
        m.awayTeamId,
        m.date || tmpl.startDate,
        m.format
      );
      tracker.reserveWindow(m.homeTeamId, m.awayTeamId, safeDate, m.format);
      const isUser = m.homeTeamId === userTeamId || m.awayTeamId === userTeamId;
      const adj: Match = {
        ...m,
        date: safeDate,
        isUserMatch: isUser,
        userTeamId,
        seed: makeSeedFromId(m.id),
      };
      scheduled.push(adj);

      if (isUser) career.fixtures.push(adj);
      else career.worldFixtures.push(adj);

      career.calendar.push({
        id: `ev_${isUser ? 'user' : 'world'}_${adj.id}`,
        date: safeDate,
        dayIndex: toDayIdx(safeDate),
        type: isUser ? 'USER_MATCH' : 'WORLD_MATCH',
        title: `${adj.format}: ${adj.homeTeamId} vs ${adj.awayTeamId}`,
        description: `${adj.seriesName} at ${adj.venue}`,
        countryId: adj.homeTeamId,
        format: adj.format,
        matchId: adj.id,
        tourId: adj.tourId,
        tournamentId: adj.tournamentId,
      });
    });

    if (scheduled.length > 0) {
      tour.startDate = scheduled[0].date || tour.startDate;
      tour.endDate = scheduled[scheduled.length - 1].date || tour.endDate;
      tour.squadSelectionDeadline = addDays(tour.startDate, -5);
      if (tour.hostTeamId !== userTeamId && tour.visitingTeamId !== userTeamId) {
        tour.squadAnnounced = true;
      }
      career.tours.push(tour);
    }
  });

  // Recurring ICC / Continental Tournament Cycles
  // T20 World Cup in odd-cycle years (2029, 2031...) or even years >= 2028 if not scheduled
  if (targetYear >= 2029 && targetYear % 2 === 1) {
    const t20Id = `t20_wc_${targetYear}`;
    if (!career.tournamentEditions.some((t) => t.id === t20Id)) {
      const prev = career.tournamentEditions.find((t) => t.competitionType === 'T20_WORLD_CUP');
      const newEdition: TournamentEdition = {
        id: t20Id,
        competitionType: 'T20_WORLD_CUP',
        name: 'ICC Men’s T20 World Cup',
        format: 'T20I',
        season: `${targetYear} Edition`,
        cycleLengthYears: 2,
        year: targetYear,
        hostCountryId: targetYear % 4 === 1 ? 'AUS' : 'ENG',
        currentStage: 'GROUP',
        participatingTeamIds: ['IND', 'PAK', 'ENG', 'AFG', 'AUS', 'RSA', 'WI', 'NZL'],
        description: `Global 20-over World Cup (${targetYear} Edition).`,
        status: 'UPCOMING',
        rules: { pointsForWin: 2, pointsForTie: 1, pointsForDraw: 1, pointsForLoss: 0, qualifiersPerGroup: 2, totalQualifiers: 4 },
        table: createZeroTableForTeams(['IND', 'PAK', 'ENG', 'AFG', 'AUS', 'RSA', 'WI', 'NZL'], false),
        groups: [
          { id: 'GROUP_A', name: 'Group 1', teamIds: ['IND', 'PAK', 'ENG', 'AFG'], table: createZeroTableForTeams(['IND', 'PAK', 'ENG', 'AFG'], false) },
          { id: 'GROUP_B', name: 'Group 2', teamIds: ['AUS', 'RSA', 'WI', 'NZL'], table: createZeroTableForTeams(['AUS', 'RSA', 'WI', 'NZL'], false) },
        ],
        pastChampions: prev ? [...prev.pastChampions] : [],
      };
      career.tournamentEditions.push(newEdition);

      const t20Matches = generateRoundRobinGroupMatches(
        t20Id,
        `ICC Men’s T20 World Cup ${targetYear}`,
        'T20I',
        newEdition.hostCountryId || 'AUS',
        [
          { id: 'GROUP_A', name: 'Group 1', teamIds: ['IND', 'PAK', 'ENG', 'AFG'] },
          { id: 'GROUP_B', name: 'Group 2', teamIds: ['AUS', 'RSA', 'WI', 'NZL'] },
        ],
        `${targetYear}-10-04`,
        userTeamId,
        tracker
      );
      t20Matches.forEach((tm) => {
        if (tm.isUserMatch) career.fixtures.push(tm);
        else career.worldFixtures.push(tm);
      });
    }
  }

  // ODI World Cup every 4 years (2031, 2035...)
  if (targetYear >= 2031 && (targetYear - 2027) % 4 === 0) {
    const cwcId = `cwc_${targetYear}`;
    if (!career.tournamentEditions.some((t) => t.id === cwcId)) {
      const prev = career.tournamentEditions.find((t) => t.competitionType === 'ODI_WORLD_CUP');
      career.tournamentEditions.push({
        id: cwcId,
        competitionType: 'ODI_WORLD_CUP',
        name: 'ICC Men’s Cricket World Cup',
        format: 'ODI',
        season: `${targetYear} Edition`,
        cycleLengthYears: 4,
        year: targetYear,
        hostCountryId: 'IND',
        currentStage: 'GROUP',
        participatingTeamIds: ['IND', 'AUS', 'PAK', 'WI', 'BAN', 'RSA', 'ENG', 'NZL', 'SL', 'AFG'],
        description: `ICC 50-over World Cup (${targetYear} Edition).`,
        status: 'UPCOMING',
        rules: { pointsForWin: 2, pointsForTie: 1, pointsForDraw: 1, pointsForLoss: 0, qualifiersPerGroup: 2, totalQualifiers: 4 },
        table: createZeroTableForTeams(['IND', 'AUS', 'PAK', 'WI', 'BAN', 'RSA', 'ENG', 'NZL', 'SL', 'AFG'], false),
        groups: [
          { id: 'GROUP_A', name: 'Group A', teamIds: ['IND', 'AUS', 'PAK', 'WI', 'BAN'], table: createZeroTableForTeams(['IND', 'AUS', 'PAK', 'WI', 'BAN'], false) },
          { id: 'GROUP_B', name: 'Group B', teamIds: ['RSA', 'ENG', 'NZL', 'SL', 'AFG'], table: createZeroTableForTeams(['RSA', 'ENG', 'NZL', 'SL', 'AFG'], false) },
        ],
        pastChampions: prev ? [...prev.pastChampions] : [],
      });

      const cwcM = generateRoundRobinGroupMatches(
        cwcId,
        `ICC Cricket World Cup ${targetYear}`,
        'ODI',
        'IND',
        [
          { id: 'GROUP_A', name: 'Group A', teamIds: ['IND', 'AUS', 'PAK', 'WI', 'BAN'] },
          { id: 'GROUP_B', name: 'Group B', teamIds: ['RSA', 'ENG', 'NZL', 'SL', 'AFG'] },
        ],
        `${targetYear}-10-18`,
        userTeamId,
        tracker
      );
      cwcM.forEach((tm) => {
        if (tm.isUserMatch) career.fixtures.push(tm);
        else career.worldFixtures.push(tm);
      });
    }
  }

  // Asia Cup in even years >= 2028 (alternating ODI and T20I!)
  if (targetYear >= 2028 && targetYear % 2 === 0) {
    const acId = `asia_cup_${targetYear}`;
    const acFmt: MatchFormat = targetYear % 4 === 0 ? 'ODI' : 'T20I';
    if (!career.tournamentEditions.some((t) => t.id === acId)) {
      const prev = career.tournamentEditions.find((t) => t.competitionType === 'ASIA_CUP');
      career.tournamentEditions.push({
        id: acId,
        competitionType: 'ASIA_CUP',
        name: 'Asia Cup',
        format: acFmt,
        season: `${targetYear} Edition (${acFmt})`,
        cycleLengthYears: 2,
        year: targetYear,
        hostCountryId: 'IND',
        currentStage: 'GROUP',
        participatingTeamIds: ['IND', 'PAK', 'NEP', 'SL', 'BAN', 'AFG'],
        description: `Continental Asian Championship (${acFmt} format).`,
        status: 'UPCOMING',
        rules: { pointsForWin: 2, pointsForTie: 1, pointsForDraw: 1, pointsForLoss: 0, qualifiersPerGroup: 2, totalQualifiers: 4 },
        table: createZeroTableForTeams(['IND', 'PAK', 'NEP', 'SL', 'BAN', 'AFG'], false),
        groups: [
          { id: 'GROUP_A', name: 'Group A', teamIds: ['IND', 'PAK', 'NEP'], table: createZeroTableForTeams(['IND', 'PAK', 'NEP'], false) },
          { id: 'GROUP_B', name: 'Group B', teamIds: ['SL', 'BAN', 'AFG'], table: createZeroTableForTeams(['SL', 'BAN', 'AFG'], false) },
        ],
        pastChampions: prev ? [...prev.pastChampions] : [],
      });

      const acM = generateRoundRobinGroupMatches(
        acId,
        `Asia Cup ${targetYear}`,
        acFmt,
        'IND',
        [
          { id: 'GROUP_A', name: 'Group A', teamIds: ['IND', 'PAK', 'NEP'] },
          { id: 'GROUP_B', name: 'Group B', teamIds: ['SL', 'BAN', 'AFG'] },
        ],
        `${targetYear}-09-05`,
        userTeamId,
        tracker
      );
      acM.forEach((tm) => {
        if (tm.isUserMatch) career.fixtures.push(tm);
        else career.worldFixtures.push(tm);
      });
    }
  }

  // Archive old completed world fixtures older than (targetYear - 1)-01-01 to keep save lean & fast
  const archiveCutoff = `${targetYear - 1}-01-01`;
  if (!career.archivedMatches) career.archivedMatches = [];
  const toSummary = (m: Match): ArchivedMatchSummary => ({
    id: m.id,
    date: m.date || '',
    format: m.format,
    seriesName: m.seriesName,
    tournamentId: m.tournamentId,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    venue: m.venue,
    status: m.status,
    resultText: m.resultText || 'Completed',
    winnerTeamId: m.winnerTeamId,
    inningsSummaries: (m.innings || []).map((inn) => ({
      battingTeamId: inn.battingTeamId,
      totalRuns: inn.totalRuns,
      wickets: inn.wickets,
      overs: inn.completedOvers,
    })),
    playerOfTheMatch: m.playerOfTheMatch,
    isUserMatch: m.isUserMatch,
  });

  // Only archive old AI worldFixtures that are NOT part of an active tournament
  const activeTournamentIds = new Set(
    (career.tournamentEditions || [])
      .filter((t) => t.status !== 'COMPLETED')
      .map((t) => t.id)
  );

  const retainedWorld: Match[] = [];
  career.worldFixtures.forEach((wm) => {
    if (
      isTerminalMatchStatus(wm.status) &&
      wm.date &&
      wm.date < archiveCutoff &&
      !(wm.tournamentId && activeTournamentIds.has(wm.tournamentId))
    ) {
      career.archivedMatches!.push(toSummary(wm));
    } else {
      retainedWorld.push(wm);
    }
  });
  career.worldFixtures = retainedWorld;

  career.fixtures.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  career.worldFixtures.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  career.calendar.sort((a, b) => a.date.localeCompare(b.date));
  career.seasonsGeneratedThroughYear = targetYear;
}
