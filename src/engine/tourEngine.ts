import {
  Tour,
  Match,
  MatchFormat,
  Player,
  RivalryCompetition,
} from '../types/cricket';
import { VENUES } from '../data/venues';
import { ALL_PLAYERS, getDefaultPlayingXI, getDefaultCaptainId, getDefaultViceCaptainId, getDefaultWicketKeeperId, getPlayersByCountry } from '../data/squads';
import { INITIAL_ASHES_COMPETITION, INITIAL_BGT_COMPETITION } from '../data/tournamentData';

export interface TourStandingsSummary {
  tourId: string;
  tourName: string;
  hostTeamId: string;
  visitingTeamId: string;
  isCompleted: boolean;
  seriesScoreText: string;
  winnerTeamId?: string;
  trophyRetained?: boolean;
  leadingRunScorer?: { playerId: string; playerName: string; runs: number };
  leadingWicketTaker?: { playerId: string; playerName: string; wickets: number };
  playerOfTheSeries?: { playerId: string; playerName: string; reason: string };
}

/**
 * Validates a tour squad selection
 */
export function validateTourSquad(
  selectedPlayerIds: string[],
  allPlayers: Player[] = ALL_PLAYERS
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (selectedPlayerIds.length < 15) {
    errors.push(`Tour squad must contain at least 15 players (currently ${selectedPlayerIds.length}).`);
  }
  if (selectedPlayerIds.length > 20) {
    errors.push(`Tour squad cannot exceed 20 players (currently ${selectedPlayerIds.length}).`);
  }

  const selectedPlayers = allPlayers.filter((p) => selectedPlayerIds.includes(p.id));
  const hasWk = selectedPlayers.some((p) => p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER');
  if (!hasWk) {
    errors.push('Tour squad must include at least one designated wicketkeeper.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a fully scheduled bilateral or rivalry tour between two nations
 */
export function createBilateralTour(
  hostTeamId: string,
  visitingTeamId: string,
  seriesConfig: {
    tests?: number;
    odis?: number;
    t20is?: number;
  },
  startDate: string,
  year: number = 2026,
  customName?: string,
  isSpecialRivalry?: 'ASHES' | 'BORDER_GAVASKAR'
): { tour: Tour; matches: Match[] } {
  const isAshes = isSpecialRivalry === 'ASHES' || (
    ((hostTeamId === 'AUS' && visitingTeamId === 'ENG') || (hostTeamId === 'ENG' && visitingTeamId === 'AUS')) &&
    (seriesConfig.tests || 0) >= 4 && !seriesConfig.odis && !seriesConfig.t20is
  );

  const isBGT = isSpecialRivalry === 'BORDER_GAVASKAR' || (
    ((hostTeamId === 'IND' && visitingTeamId === 'AUS') || (hostTeamId === 'AUS' && visitingTeamId === 'IND')) &&
    (seriesConfig.tests || 0) >= 4 && !seriesConfig.odis && !seriesConfig.t20is
  );

  let tourName = customName;
  if (!tourName) {
    if (isAshes) tourName = `The Ashes (${visitingTeamId === 'ENG' ? 'England in Australia' : 'Australia in England'})`;
    else if (isBGT) tourName = `Border-Gavaskar Trophy (${visitingTeamId} in ${hostTeamId})`;
    else tourName = `${visitingTeamId} Tour of ${hostTeamId}`;
  }

  const tourId = isAshes
    ? `tour_ashes_${year}`
    : isBGT
    ? `tour_bgt_${year}`
    : `tour_${visitingTeamId.toLowerCase()}_in_${hostTeamId.toLowerCase()}_${year}`;

  const hostVenues = VENUES.filter((v) => v.countryId === hostTeamId);
  const selectedVenues = hostVenues.length > 0
    ? hostVenues.map((v) => v.name)
    : ['National Cricket Stadium'];

  const testCount = isAshes ? 5 : (seriesConfig.tests || 0);
  const odiCount = seriesConfig.odis || 0;
  const t20Count = seriesConfig.t20is || 0;

  const tour: Tour = {
    id: tourId,
    name: tourName,
    hostTeamId,
    visitingTeamId,
    startDate,
    endDate: startDate, // Updated below after fixture generation
    year,
    status: 'UPCOMING',
    competitionType: isAshes ? 'ASHES' : isBGT ? 'BORDER_GAVASKAR' : 'BILATERAL',
    trophyHolder: isAshes ? 'AUS' : isBGT ? 'IND' : undefined,
    series: {
      TEST: testCount > 0 ? { matchCount: testCount, matchesPlayed: 0, homeWins: 0, awayWins: 0, draws: 0 } : undefined,
      ODI: odiCount > 0 ? { matchCount: odiCount, matchesPlayed: 0, homeWins: 0, awayWins: 0, ties: 0 } : undefined,
      T20I: t20Count > 0 ? { matchCount: t20Count, matchesPlayed: 0, homeWins: 0, awayWins: 0, ties: 0 } : undefined,
    },
    venues: selectedVenues,
    squadSelectionDeadline: new Date(new Date(startDate).getTime() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
    squadAnnounced: false,
    tourSquadIds: [],
    formatSquads: {},
    captains: {
      TEST: getDefaultCaptainId(hostTeamId, 'TEST'),
      ODI: getDefaultCaptainId(hostTeamId, 'ODI'),
      T20I: getDefaultCaptainId(hostTeamId, 'T20I'),
    },
    viceCaptains: {
      TEST: getDefaultViceCaptainId(hostTeamId, 'TEST'),
      ODI: getDefaultViceCaptainId(hostTeamId, 'ODI'),
      T20I: getDefaultViceCaptainId(hostTeamId, 'T20I'),
    },
  };

  const matches: Match[] = [];
  let currentDateObj = new Date(startDate);
  let venueIndex = 0;

  // 1. T20I Series
  for (let i = 1; i <= t20Count; i++) {
    const vObj = hostVenues[venueIndex % hostVenues.length] || VENUES[0];
    venueIndex++;
    const matchDateStr = currentDateObj.toISOString().split('T')[0];

    matches.push({
      id: `${tourId}_t20_${i}`,
      format: 'T20I',
      tourId,
      seriesId: `${tourId}_t20`,
      seriesName: `${tourName} — T20I Series`,
      competitionId: isAshes ? 'the_ashes' : isBGT ? 'border_gavaskar' : undefined,
      matchNumber: i,
      totalMatchesInSeries: t20Count,
      seriesStartDate: startDate,
      homeTeamId: hostTeamId,
      awayTeamId: visitingTeamId,
      venue: vObj.name,
      pitch: vObj.pitch,
      weather: vObj.weather,
      date: matchDateStr,
      dayNumber: 1,
      sessionNumber: 3,
      status: 'SCHEDULED',
      currentInningsIndex: 0,
      innings: [],
      homeXI: getDefaultPlayingXI(hostTeamId, 'T20I'),
      awayXI: getDefaultPlayingXI(visitingTeamId, 'T20I'),
      homeCaptainId: getDefaultCaptainId(hostTeamId, 'T20I'),
      awayCaptainId: getDefaultCaptainId(visitingTeamId, 'T20I'),
      homeWicketKeeperId: getDefaultWicketKeeperId(hostTeamId, 'T20I'),
      awayWicketKeeperId: getDefaultWicketKeeperId(visitingTeamId, 'T20I'),
      userTeamId: hostTeamId,
      isUserMatch: false,
      userTactics: { battingAggression: 'ATTACKING', bowlingTactic: 'BALANCED_CONTAIN', fieldPreset: 'BALANCED_STANDARD' },
      aiTactics: { battingAggression: 'ATTACKING', bowlingTactic: 'BALANCED_CONTAIN', fieldPreset: 'BALANCED_STANDARD' },
    });

    // 2-3 days gap between T20Is
    currentDateObj = new Date(currentDateObj.getTime() + 2 * 24 * 3600 * 1000);
  }

  // 2. ODI Series
  if (t20Count > 0 && odiCount > 0) {
    // 3 days travel/prep gap between formats
    currentDateObj = new Date(currentDateObj.getTime() + 2 * 24 * 3600 * 1000);
  }

  for (let i = 1; i <= odiCount; i++) {
    const vObj = hostVenues[venueIndex % hostVenues.length] || VENUES[0];
    venueIndex++;
    const matchDateStr = currentDateObj.toISOString().split('T')[0];

    matches.push({
      id: `${tourId}_odi_${i}`,
      format: 'ODI',
      tourId,
      seriesId: `${tourId}_odi`,
      seriesName: `${tourName} — ODI Series`,
      competitionId: isAshes ? 'the_ashes' : isBGT ? 'border_gavaskar' : undefined,
      matchNumber: i,
      totalMatchesInSeries: odiCount,
      seriesStartDate: startDate,
      homeTeamId: hostTeamId,
      awayTeamId: visitingTeamId,
      venue: vObj.name,
      pitch: vObj.pitch,
      weather: vObj.weather,
      date: matchDateStr,
      dayNumber: 1,
      sessionNumber: 1,
      status: 'SCHEDULED',
      currentInningsIndex: 0,
      innings: [],
      homeXI: getDefaultPlayingXI(hostTeamId, 'ODI'),
      awayXI: getDefaultPlayingXI(visitingTeamId, 'ODI'),
      homeCaptainId: getDefaultCaptainId(hostTeamId, 'ODI'),
      awayCaptainId: getDefaultCaptainId(visitingTeamId, 'ODI'),
      homeWicketKeeperId: getDefaultWicketKeeperId(hostTeamId, 'ODI'),
      awayWicketKeeperId: getDefaultWicketKeeperId(visitingTeamId, 'ODI'),
      userTeamId: hostTeamId,
      isUserMatch: false,
      userTactics: { battingAggression: 'BALANCED', bowlingTactic: 'BALANCED_CONTAIN', fieldPreset: 'BALANCED_STANDARD' },
      aiTactics: { battingAggression: 'BALANCED', bowlingTactic: 'BALANCED_CONTAIN', fieldPreset: 'BALANCED_STANDARD' },
    });

    // 3 days gap between ODIs
    currentDateObj = new Date(currentDateObj.getTime() + 3 * 24 * 3600 * 1000);
  }

  // 3. Test Series
  if ((t20Count > 0 || odiCount > 0) && testCount > 0) {
    // 4 days prep gap before Tests
    currentDateObj = new Date(currentDateObj.getTime() + 3 * 24 * 3600 * 1000);
  }

  for (let i = 1; i <= testCount; i++) {
    const vObj = hostVenues[venueIndex % hostVenues.length] || VENUES[0];
    venueIndex++;
    const matchDateStr = currentDateObj.toISOString().split('T')[0];

    matches.push({
      id: `${tourId}_test_${i}`,
      format: 'TEST',
      tourId,
      seriesId: `${tourId}_test`,
      seriesName: isAshes
        ? `The Ashes — ${i}${i === 1 ? 'st' : i === 2 ? 'nd' : i === 3 ? 'rd' : 'th'} Test`
        : isBGT
        ? `Border-Gavaskar Trophy — ${i}${i === 1 ? 'st' : i === 2 ? 'nd' : i === 3 ? 'rd' : 'th'} Test`
        : `${tourName} — ${i}${i === 1 ? 'st' : i === 2 ? 'nd' : i === 3 ? 'rd' : 'th'} Test`,
      competitionId: isAshes ? 'the_ashes' : isBGT ? 'border_gavaskar' : undefined,
      matchNumber: i,
      totalMatchesInSeries: testCount,
      seriesStartDate: startDate,
      homeTeamId: hostTeamId,
      awayTeamId: visitingTeamId,
      venue: vObj.name,
      pitch: vObj.pitch,
      weather: vObj.weather,
      date: matchDateStr,
      dayNumber: 1,
      sessionNumber: 1,
      status: 'SCHEDULED',
      currentInningsIndex: 0,
      innings: [],
      homeXI: getDefaultPlayingXI(hostTeamId, 'TEST'),
      awayXI: getDefaultPlayingXI(visitingTeamId, 'TEST'),
      homeCaptainId: getDefaultCaptainId(hostTeamId, 'TEST'),
      awayCaptainId: getDefaultCaptainId(visitingTeamId, 'TEST'),
      homeWicketKeeperId: getDefaultWicketKeeperId(hostTeamId, 'TEST'),
      awayWicketKeeperId: getDefaultWicketKeeperId(visitingTeamId, 'TEST'),
      userTeamId: hostTeamId,
      isUserMatch: false,
      userTactics: { battingAggression: 'BALANCED', bowlingTactic: 'BALANCED_CONTAIN', fieldPreset: 'BALANCED_STANDARD' },
      aiTactics: { battingAggression: 'BALANCED', bowlingTactic: 'BALANCED_CONTAIN', fieldPreset: 'BALANCED_STANDARD' },
    });

    // 5-day Test + 4 days rest/travel before next Test
    currentDateObj = new Date(currentDateObj.getTime() + 9 * 24 * 3600 * 1000);
  }

  tour.endDate = currentDateObj.toISOString().split('T')[0];

  return { tour, matches };
}

/**
 * Updates a tour's standings and checks trophy retention rules
 */
export function updateTourSeriesStandings(
  tour: Tour,
  matches: Match[],
  ashesComp?: RivalryCompetition,
  bgtComp?: RivalryCompetition
): { updatedTour: Tour; updatedAshes?: RivalryCompetition; updatedBGT?: RivalryCompetition; summary: TourStandingsSummary } {
  const t: Tour = JSON.parse(JSON.stringify(tour));
  const tourMatches = matches.filter((m) => m.tourId === t.id);

  // Accumulate scores per format
  (['TEST', 'ODI', 'T20I'] as MatchFormat[]).forEach((fmt) => {
    const s = t.series[fmt];
    if (!s) return;

    const fmtMatches = tourMatches.filter((m) => m.format === fmt);
    s.matchesPlayed = fmtMatches.filter((m) => m.status === 'COMPLETED' || m.status === 'DRAW' || m.status === 'TIE').length;
    s.homeWins = 0;
    s.awayWins = 0;
    if (fmt === 'TEST') (s as any).draws = 0;
    else (s as any).ties = 0;

    fmtMatches.forEach((m) => {
      if (m.status === 'COMPLETED') {
        const inn1 = m.innings[0];
        const inn2 = m.innings[1];
        if (inn1 && inn2) {
          const homeBatFirst = inn1.battingTeamId === m.homeTeamId;
          const homeScore = homeBatFirst ? inn1.totalRuns : inn2.totalRuns;
          const awayScore = homeBatFirst ? inn2.totalRuns : inn1.totalRuns;
          if (homeScore > awayScore) s.homeWins++;
          else s.awayWins++;
        }
      } else if (m.status === 'DRAW' && fmt === 'TEST') {
        (s as any).draws++;
      } else if (m.status === 'TIE') {
        (s as any).ties++;
      }
    });
  });

  const totalMatchesScheduled =
    (t.series.TEST?.matchCount || 0) + (t.series.ODI?.matchCount || 0) + (t.series.T20I?.matchCount || 0);
  const totalMatchesPlayed =
    (t.series.TEST?.matchesPlayed || 0) + (t.series.ODI?.matchesPlayed || 0) + (t.series.T20I?.matchesPlayed || 0);

  const isCompleted = totalMatchesPlayed >= totalMatchesScheduled && totalMatchesScheduled > 0;
  if (isCompleted) {
    t.status = 'COMPLETED';
  } else if (totalMatchesPlayed > 0) {
    t.status = 'IN_PROGRESS';
  }

  // Calculate winner & drawn retention rule
  let winnerTeamId: string | undefined;
  let trophyRetained = false;
  let seriesScoreText = '';

  if (t.competitionType === 'ASHES' || tour.id.includes('ashes')) {
    const s = t.series.TEST || { homeWins: 0, awayWins: 0, draws: 0, matchCount: 5, matchesPlayed: 0 };
    const ausWins = t.hostTeamId === 'AUS' ? s.homeWins : s.awayWins;
    const engWins = t.hostTeamId === 'ENG' ? s.homeWins : s.awayWins;
    const draws = s.draws || 0;

    seriesScoreText = `Australia ${ausWins} – England ${engWins}${draws > 0 ? ` (${draws} drawn)` : ''}`;

    if (isCompleted) {
      if (ausWins > engWins) {
        winnerTeamId = 'AUS';
        t.trophyHolder = 'AUS';
        t.retainedTrophy = false;
      } else if (engWins > ausWins) {
        winnerTeamId = 'ENG';
        t.trophyHolder = 'ENG';
        t.retainedTrophy = false;
      } else {
        // DRAWN SERIES! The Ashes retain with current holder!
        const prevHolder = ashesComp?.currentTrophyHolder || t.trophyHolder || 'AUS';
        winnerTeamId = prevHolder;
        t.trophyHolder = prevHolder;
        trophyRetained = true;
        t.retainedTrophy = true;
      }
      t.resultText = trophyRetained
        ? `Series Drawn ${ausWins}–${engWins}. Australia retain The Ashes as current holders!`
        : `${winnerTeamId === 'AUS' ? 'Australia' : 'England'} win The Ashes ${winnerTeamId === 'AUS' ? ausWins : engWins}–${winnerTeamId === 'AUS' ? engWins : ausWins}!`;
    }
  } else if (t.competitionType === 'BORDER_GAVASKAR' || tour.id.includes('bgt')) {
    const s = t.series.TEST || { homeWins: 0, awayWins: 0, draws: 0, matchCount: 5, matchesPlayed: 0 };
    const indWins = t.hostTeamId === 'IND' ? s.homeWins : s.awayWins;
    const ausWins = t.hostTeamId === 'AUS' ? s.homeWins : s.awayWins;
    const draws = s.draws || 0;

    seriesScoreText = `India ${indWins} – Australia ${ausWins}${draws > 0 ? ` (${draws} drawn)` : ''}`;

    if (isCompleted) {
      if (indWins > ausWins) {
        winnerTeamId = 'IND';
        t.trophyHolder = 'IND';
        t.retainedTrophy = false;
      } else if (ausWins > indWins) {
        winnerTeamId = 'AUS';
        t.trophyHolder = 'AUS';
        t.retainedTrophy = false;
      } else {
        // DRAWN SERIES! Border-Gavaskar Trophy retains with current holder!
        const prevHolder = bgtComp?.currentTrophyHolder || t.trophyHolder || 'IND';
        winnerTeamId = prevHolder;
        t.trophyHolder = prevHolder;
        trophyRetained = true;
        t.retainedTrophy = true;
      }
      t.resultText = trophyRetained
        ? `Series Drawn ${indWins}–${ausWins}. India retain the Border-Gavaskar Trophy!`
        : `${winnerTeamId === 'IND' ? 'India' : 'Australia'} win the Border-Gavaskar Trophy ${winnerTeamId === 'IND' ? indWins : ausWins}–${winnerTeamId === 'IND' ? ausWins : indWins}!`;
    }
  } else {
    // Standard Bilateral Tour
    const totalHomeWins = (t.series.TEST?.homeWins || 0) + (t.series.ODI?.homeWins || 0) + (t.series.T20I?.homeWins || 0);
    const totalAwayWins = (t.series.TEST?.awayWins || 0) + (t.series.ODI?.awayWins || 0) + (t.series.T20I?.awayWins || 0);
    seriesScoreText = `${t.hostTeamId} ${totalHomeWins} – ${totalAwayWins} ${t.visitingTeamId}`;

    if (isCompleted) {
      if (totalHomeWins > totalAwayWins) winnerTeamId = t.hostTeamId;
      else if (totalAwayWins > totalHomeWins) winnerTeamId = t.visitingTeamId;
      t.resultText = winnerTeamId
        ? `${winnerTeamId} win the series ${totalHomeWins > totalAwayWins ? totalHomeWins : totalAwayWins}–${totalHomeWins > totalAwayWins ? totalAwayWins : totalHomeWins}`
        : `Series drawn ${totalHomeWins}–${totalAwayWins}`;
    }
  }

  // Update Rivalry Competition objects if present
  let updatedAshes = ashesComp;
  if (ashesComp && (t.competitionType === 'ASHES' || tour.id.includes('ashes'))) {
    updatedAshes = {
      ...ashesComp,
      currentTrophyHolder: t.trophyHolder || ashesComp.currentTrophyHolder,
      currentScore: {
        team1Wins: t.series.TEST?.homeWins || 0,
        team2Wins: t.series.TEST?.awayWins || 0,
        draws: t.series.TEST?.draws || 0,
      },
    };
  }

  let updatedBGT = bgtComp;
  if (bgtComp && (t.competitionType === 'BORDER_GAVASKAR' || tour.id.includes('bgt'))) {
    updatedBGT = {
      ...bgtComp,
      currentTrophyHolder: t.trophyHolder || bgtComp.currentTrophyHolder,
      currentScore: {
        team1Wins: t.series.TEST?.homeWins || 0,
        team2Wins: t.series.TEST?.awayWins || 0,
        draws: t.series.TEST?.draws || 0,
      },
    };
  }

  return {
    updatedTour: t,
    updatedAshes,
    updatedBGT,
    summary: {
      tourId: t.id,
      tourName: t.name,
      hostTeamId: t.hostTeamId,
      visitingTeamId: t.visitingTeamId,
      isCompleted,
      seriesScoreText,
      winnerTeamId,
      trophyRetained,
    },
  };
}
