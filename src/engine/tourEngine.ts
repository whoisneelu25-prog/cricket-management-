import {
  Tour,
  Match,
  MatchFormat,
  Player,
  RivalryCompetition,
} from '../types/cricket';
import { VENUES } from '../data/venues';
import { ALL_PLAYERS, getDefaultPlayingXI, getDefaultCaptainId, getDefaultViceCaptainId, getDefaultWicketKeeperId, getPlayersByCountry } from '../data/squads';
import { INITIAL_ASHES_COMPETITION, INITIAL_BGT_COMPETITION, TEAM_META } from '../data/tournamentData';
import { determineMatchOutcome, isTerminalMatchStatus } from './matchEngine';

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
  isSpecialRivalry?: 'ASHES' | 'BORDER_GAVASKAR',
  wtcTournamentId?: string,
  tourSuffix?: string
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

  const suffix = tourSuffix ? `_${tourSuffix}` : '';
  const tourId = isAshes
    ? `tour_ashes_${year}${suffix}`
    : isBGT
    ? `tour_bgt_${year}${suffix}`
    : `tour_${visitingTeamId.toLowerCase()}_in_${hostTeamId.toLowerCase()}_${year}${suffix}`;

  const hostVenues = VENUES.filter((v) => v.countryId === hostTeamId);
  const selectedVenues = hostVenues.length > 0
    ? hostVenues.map((v) => v.name)
    : ['National Cricket Stadium'];

  const testCount = isAshes ? 5 : (seriesConfig.tests || 0);
  const odiCount = seriesConfig.odis || 0;
  const t20Count = seriesConfig.t20is || 0;

  const formats: MatchFormat[] = [];
  if (testCount > 0) formats.push('TEST');
  if (odiCount > 0) formats.push('ODI');
  if (t20Count > 0) formats.push('T20I');

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
    formats,
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
      tournamentId: wtcTournamentId,
      competitionId: isAshes ? 'the_ashes' : isBGT ? 'border_gavaskar' : wtcTournamentId,
      stage: wtcTournamentId ? 'LEAGUE' : undefined,
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
 * Updates a tour's standings and checks trophy retention rules across 2-, 3-, and 4-innings matches
 */
export function updateTourSeriesStandings(
  tour: Tour,
  matches: Match[],
  ashesComp?: RivalryCompetition,
  bgtComp?: RivalryCompetition
): { updatedTour: Tour; updatedAshes?: RivalryCompetition; updatedBGT?: RivalryCompetition; summary: TourStandingsSummary } {
  const t: Tour = JSON.parse(JSON.stringify(tour));
  const tourMatches = matches.filter((m) => m.tourId === t.id);

  const runMap = new Map<string, { name: string; runs: number; dismissals: number }>();
  const wktMap = new Map<string, { name: string; wickets: number; runs: number }>();

  // Accumulate scores per format using canonical multi-innings outcome logic
  (['TEST', 'ODI', 'T20I'] as MatchFormat[]).forEach((fmt) => {
    const s = t.series[fmt];
    if (!s) return;

    const fmtMatches = tourMatches.filter((m) => m.format === fmt);
    const concluded = fmtMatches.filter((m) => isTerminalMatchStatus(m.status));
    s.matchesPlayed = concluded.length;
    s.homeWins = 0;
    s.awayWins = 0;
    if (fmt === 'TEST') (s as any).draws = 0;
    else (s as any).ties = 0;

    concluded.forEach((m) => {
      const outcome = determineMatchOutcome(m);
      if (outcome.isDraw && fmt === 'TEST') {
        (s as any).draws++;
      } else if (outcome.isTie) {
        if (fmt === 'TEST') (s as any).draws++;
        else (s as any).ties++;
      } else if (outcome.winnerTeamId === m.homeTeamId) {
        if (m.homeTeamId === t.hostTeamId) s.homeWins++;
        else s.awayWins++;
      } else if (outcome.winnerTeamId === m.awayTeamId) {
        if (m.awayTeamId === t.visitingTeamId) s.awayWins++;
        else s.homeWins++;
      }

      // Accumulate series batting & bowling leaders
      (m.innings || []).forEach((inn) => {
        (inn.batters || []).forEach((b) => {
          const cur = runMap.get(b.playerId) || { name: b.playerName, runs: 0, dismissals: 0 };
          cur.runs += b.runs;
          if (b.dismissal) cur.dismissals += 1;
          runMap.set(b.playerId, cur);
        });
        (inn.bowlers || []).forEach((bw) => {
          const cur = wktMap.get(bw.playerId) || { name: bw.playerName, wickets: 0, runs: 0 };
          cur.wickets += bw.wickets;
          cur.runs += bw.runs;
          wktMap.set(bw.playerId, cur);
        });
      });
    });
  });

  // Populate leading run scorer & wicket taker on tour
  let bestRuns = 0;
  runMap.forEach((v, id) => {
    if (v.runs > bestRuns) {
      bestRuns = v.runs;
      t.leadingRunScorer = {
        playerId: id,
        playerName: v.name,
        runs: v.runs,
        average: v.dismissals > 0 ? +(v.runs / v.dismissals).toFixed(2) : v.runs,
      };
    }
  });

  let bestWkts = 0;
  wktMap.forEach((v, id) => {
    if (v.wickets > bestWkts) {
      bestWkts = v.wickets;
      t.leadingWicketTaker = {
        playerId: id,
        playerName: v.name,
        wickets: v.wickets,
        average: v.wickets > 0 ? +(v.runs / v.wickets).toFixed(2) : 0,
      };
    }
  });

  const totalMatchesScheduled =
    (t.series.TEST?.matchCount || 0) + (t.series.ODI?.matchCount || 0) + (t.series.T20I?.matchCount || 0);
  const totalMatchesPlayed =
    (t.series.TEST?.matchesPlayed || 0) + (t.series.ODI?.matchesPlayed || 0) + (t.series.T20I?.matchesPlayed || 0);

  const isCompleted = totalMatchesPlayed >= totalMatchesScheduled && totalMatchesScheduled > 0;
  if (isCompleted) {
    t.status = 'COMPLETED';
    if (t.leadingRunScorer || t.leadingWicketTaker) {
      const r = t.leadingRunScorer;
      const w = t.leadingWicketTaker;
      if (r && (!w || r.runs >= w.wickets * 26)) {
        t.playerOfTheSeries = {
          playerId: r.playerId,
          playerName: r.playerName,
          reason: `${r.runs} runs at ${r.average} avg`,
        };
      } else if (w) {
        t.playerOfTheSeries = {
          playerId: w.playerId,
          playerName: w.playerName,
          reason: `${w.wickets} wickets at ${w.average} avg`,
        };
      }
    }
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
        const prevHolder = ashesComp?.currentTrophyHolder || t.trophyHolder || 'AUS';
        winnerTeamId = prevHolder;
        t.trophyHolder = prevHolder;
        trophyRetained = true;
        t.retainedTrophy = true;
      }
      const holderName = t.trophyHolder === 'AUS' ? 'Australia' : 'England';
      t.resultText = trophyRetained
        ? `Series Drawn ${ausWins}–${engWins}. ${holderName} retain The Ashes as current holders!`
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
        const prevHolder = bgtComp?.currentTrophyHolder || t.trophyHolder || 'IND';
        winnerTeamId = prevHolder;
        t.trophyHolder = prevHolder;
        trophyRetained = true;
        t.retainedTrophy = true;
      }
      const holderName = t.trophyHolder === 'IND' ? 'India' : 'Australia';
      t.resultText = trophyRetained
        ? `Series Drawn ${indWins}–${ausWins}. ${holderName} retain the Border-Gavaskar Trophy!`
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
      const winName = winnerTeamId ? TEAM_META[winnerTeamId]?.name || winnerTeamId : '';
      t.resultText = winnerTeamId
        ? `${winName} win the series ${Math.max(totalHomeWins, totalAwayWins)}–${Math.min(totalHomeWins, totalAwayWins)}`
        : `Series drawn ${totalHomeWins}–${totalAwayWins}`;
    }
  }

  // Update Rivalry Competition objects & historical archive if present
  let updatedAshes = ashesComp;
  if (ashesComp && (t.competitionType === 'ASHES' || tour.id.includes('ashes'))) {
    const s = t.series.TEST || { homeWins: 0, awayWins: 0, draws: 0, matchCount: 5, matchesPlayed: 0 };
    const team1Wins = t.hostTeamId === ashesComp.team1Id ? s.homeWins : s.awayWins;
    const team2Wins = t.hostTeamId === ashesComp.team2Id ? s.homeWins : s.awayWins;
    const yearStr = String(t.year);
    const alreadyArchived = ashesComp.historicalEditions.some((h) => h.year === yearStr);

    updatedAshes = {
      ...ashesComp,
      currentTrophyHolder: t.trophyHolder || ashesComp.currentTrophyHolder,
      currentTourId: t.id,
      currentEditionYear: t.year,
      currentScore: {
        team1Wins,
        team2Wins,
        draws: s.draws || 0,
      },
      leadingRunScorer: t.leadingRunScorer || ashesComp.leadingRunScorer,
      leadingWicketTaker: t.leadingWicketTaker || ashesComp.leadingWicketTaker,
      playerOfTheSeries: t.playerOfTheSeries || ashesComp.playerOfTheSeries,
      historicalEditions:
        isCompleted && !alreadyArchived
          ? [
              {
                year: yearStr,
                host: TEAM_META[t.hostTeamId]?.name || t.hostTeamId,
                winner: trophyRetained
                  ? `DRAWN (${TEAM_META[t.trophyHolder || 'AUS']?.name} Retained)`
                  : TEAM_META[winnerTeamId || 'AUS']?.name || winnerTeamId || 'AUS',
                score: `${Math.max(team1Wins, team2Wins)}–${Math.min(team1Wins, team2Wins)} (${s.matchCount} Tests)`,
                holderRetained: trophyRetained,
                playerOfTheSeries: t.playerOfTheSeries?.playerName,
                leadingRunScorer: t.leadingRunScorer
                  ? `${t.leadingRunScorer.playerName} (${t.leadingRunScorer.runs} runs)`
                  : undefined,
                leadingWicketTaker: t.leadingWicketTaker
                  ? `${t.leadingWicketTaker.playerName} (${t.leadingWicketTaker.wickets} wickets)`
                  : undefined,
              },
              ...ashesComp.historicalEditions,
            ]
          : ashesComp.historicalEditions,
    };
  }

  let updatedBGT = bgtComp;
  if (bgtComp && (t.competitionType === 'BORDER_GAVASKAR' || tour.id.includes('bgt'))) {
    const s = t.series.TEST || { homeWins: 0, awayWins: 0, draws: 0, matchCount: 5, matchesPlayed: 0 };
    const team1Wins = t.hostTeamId === bgtComp.team1Id ? s.homeWins : s.awayWins;
    const team2Wins = t.hostTeamId === bgtComp.team2Id ? s.homeWins : s.awayWins;
    const yearStr = String(t.year);
    const alreadyArchived = bgtComp.historicalEditions.some((h) => h.year === yearStr);

    updatedBGT = {
      ...bgtComp,
      currentTrophyHolder: t.trophyHolder || bgtComp.currentTrophyHolder,
      currentTourId: t.id,
      currentEditionYear: t.year,
      currentScore: {
        team1Wins,
        team2Wins,
        draws: s.draws || 0,
      },
      leadingRunScorer: t.leadingRunScorer || bgtComp.leadingRunScorer,
      leadingWicketTaker: t.leadingWicketTaker || bgtComp.leadingWicketTaker,
      playerOfTheSeries: t.playerOfTheSeries || bgtComp.playerOfTheSeries,
      historicalEditions:
        isCompleted && !alreadyArchived
          ? [
              {
                year: yearStr,
                host: TEAM_META[t.hostTeamId]?.name || t.hostTeamId,
                winner: trophyRetained
                  ? `DRAWN (${TEAM_META[t.trophyHolder || 'IND']?.name} Retained)`
                  : TEAM_META[winnerTeamId || 'IND']?.name || winnerTeamId || 'IND',
                score: `${Math.max(team1Wins, team2Wins)}–${Math.min(team1Wins, team2Wins)} (${s.matchCount} Tests)`,
                holderRetained: trophyRetained,
                playerOfTheSeries: t.playerOfTheSeries?.playerName,
                leadingRunScorer: t.leadingRunScorer
                  ? `${t.leadingRunScorer.playerName} (${t.leadingRunScorer.runs} runs)`
                  : undefined,
                leadingWicketTaker: t.leadingWicketTaker
                  ? `${t.leadingWicketTaker.playerName} (${t.leadingWicketTaker.wickets} wickets)`
                  : undefined,
              },
              ...bgtComp.historicalEditions,
            ]
          : bgtComp.historicalEditions,
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
      leadingRunScorer: t.leadingRunScorer
        ? { playerId: t.leadingRunScorer.playerId, playerName: t.leadingRunScorer.playerName, runs: t.leadingRunScorer.runs }
        : undefined,
      leadingWicketTaker: t.leadingWicketTaker
        ? { playerId: t.leadingWicketTaker.playerId, playerName: t.leadingWicketTaker.playerName, wickets: t.leadingWicketTaker.wickets }
        : undefined,
      playerOfTheSeries: t.playerOfTheSeries,
    },
  };
}
