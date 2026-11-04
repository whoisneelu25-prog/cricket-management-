import {
  Tour,
  Match,
  MatchFormat,
  Player,
  RivalryCompetition,
  CareerSave,
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

export interface TourDetailedStatistics {
  tourId: string;
  matchesPlayed: number;
  leadingRunScorer?: {
    playerId: string;
    playerName: string;
    runs: number;
    average: number;
    strikeRate: number;
    highestScore: number;
    centuries: number;
    fifties: number;
  };
  leadingWicketTaker?: {
    playerId: string;
    playerName: string;
    wickets: number;
    average: number;
    economy: number;
    bestWickets: number;
    bestRuns: number;
    fiveWickets: number;
  };
  bestBattingPerformance?: {
    playerId: string;
    playerName: string;
    runs: number;
    balls: number;
    notOut: boolean;
    description: string;
  };
  bestBowlingPerformance?: {
    playerId: string;
    playerName: string;
    wickets: number;
    runs: number;
    description: string;
  };
  playerOfTheSeries?: {
    playerId: string;
    playerName: string;
    reason: string;
  };
  formatStandings: Record<
    MatchFormat,
    {
      scheduled: number;
      played: number;
      homeWins: number;
      awayWins: number;
      draws: number;
      ties: number;
      statusText: string;
    }
  >;
}

export function computeTourDetailedStatistics(
  tour: Tour,
  allMatches: Match[]
): TourDetailedStatistics {
  const tourMatches = allMatches.filter((m) => m.tourId === tour.id);
  const completedMatches = tourMatches.filter((m) => isTerminalMatchStatus(m.status));

  const runMap = new Map<
    string,
    {
      name: string;
      runs: number;
      balls: number;
      dismissals: number;
      highestScore: number;
      centuries: number;
      fifties: number;
    }
  >();

  const wktMap = new Map<
    string,
    {
      name: string;
      wickets: number;
      runs: number;
      balls: number;
      bestWickets: number;
      bestRuns: number;
      fiveWickets: number;
    }
  >();

  let bestBatting: TourDetailedStatistics['bestBattingPerformance'] = undefined;
  let bestBowling: TourDetailedStatistics['bestBowlingPerformance'] = undefined;

  completedMatches.forEach((m) => {
    (m.innings || []).forEach((inn) => {
      (inn.batters || []).forEach((b) => {
        const cur = runMap.get(b.playerId) || {
          name: b.playerName,
          runs: 0,
          balls: 0,
          dismissals: 0,
          highestScore: 0,
          centuries: 0,
          fifties: 0,
        };
        cur.runs += b.runs;
        cur.balls += b.balls || 0;
        if (b.dismissal) cur.dismissals += 1;
        if (b.runs > cur.highestScore) cur.highestScore = b.runs;
        if (b.runs >= 100) cur.centuries += 1;
        else if (b.runs >= 50) cur.fifties += 1;
        runMap.set(b.playerId, cur);

        if (!bestBatting || b.runs > bestBatting.runs) {
          bestBatting = {
            playerId: b.playerId,
            playerName: b.playerName,
            runs: b.runs,
            balls: b.balls || 0,
            notOut: !b.dismissal,
            description: `${b.runs}${b.dismissal ? '' : '*'} (${b.balls || 0}b) vs ${
              inn.bowlingTeamId
            } (${m.format})`,
          };
        }
      });

      (inn.bowlers || []).forEach((bw) => {
        const cur = wktMap.get(bw.playerId) || {
          name: bw.playerName,
          wickets: 0,
          runs: 0,
          balls: 0,
          bestWickets: 0,
          bestRuns: 999,
          fiveWickets: 0,
        };
        cur.wickets += bw.wickets;
        cur.runs += bw.runs;
        cur.balls += bw.overs * 6 + bw.ballsThisOver;
        if (
          bw.wickets > cur.bestWickets ||
          (bw.wickets === cur.bestWickets && bw.runs < cur.bestRuns)
        ) {
          cur.bestWickets = bw.wickets;
          cur.bestRuns = bw.runs;
        }
        if (bw.wickets >= 5) cur.fiveWickets += 1;
        wktMap.set(bw.playerId, cur);

        if (
          !bestBowling ||
          bw.wickets > bestBowling.wickets ||
          (bw.wickets === bestBowling.wickets && bw.runs < bestBowling.runs)
        ) {
          bestBowling = {
            playerId: bw.playerId,
            playerName: bw.playerName,
            wickets: bw.wickets,
            runs: bw.runs,
            description: `${bw.wickets}/${bw.runs} (${bw.overs} ov) vs ${
              inn.battingTeamId
            } (${m.format})`,
          };
        }
      });
    });
  });

  let leadingRunScorer: TourDetailedStatistics['leadingRunScorer'] = undefined;
  let topRuns = 0;
  runMap.forEach((v, id) => {
    if (v.runs > topRuns) {
      topRuns = v.runs;
      leadingRunScorer = {
        playerId: id,
        playerName: v.name,
        runs: v.runs,
        average: v.dismissals > 0 ? Number((v.runs / v.dismissals).toFixed(2)) : v.runs,
        strikeRate: v.balls > 0 ? Number(((v.runs / v.balls) * 100).toFixed(1)) : 0,
        highestScore: v.highestScore,
        centuries: v.centuries,
        fifties: v.fifties,
      };
    }
  });

  let leadingWicketTaker: TourDetailedStatistics['leadingWicketTaker'] = undefined;
  let topWkts = 0;
  wktMap.forEach((v, id) => {
    if (v.wickets > topWkts) {
      topWkts = v.wickets;
      const overs = Number((v.balls / 6).toFixed(1));
      leadingWicketTaker = {
        playerId: id,
        playerName: v.name,
        wickets: v.wickets,
        average: v.wickets > 0 ? Number((v.runs / v.wickets).toFixed(2)) : 0,
        economy: overs > 0 ? Number((v.runs / overs).toFixed(2)) : 0,
        bestWickets: v.bestWickets,
        bestRuns: v.bestRuns === 999 ? 0 : v.bestRuns,
        fiveWickets: v.fiveWickets,
      };
    }
  });

  let playerOfTheSeries: TourDetailedStatistics['playerOfTheSeries'] = undefined;
  const r = leadingRunScorer as { playerId: string; playerName: string; runs: number; average: number; centuries: number; fifties: number } | undefined;
  const w = leadingWicketTaker as { playerId: string; playerName: string; wickets: number; average: number; bestWickets: number; bestRuns: number } | undefined;
  if (r && (!w || r.runs >= w.wickets * 28)) {
    playerOfTheSeries = {
      playerId: r.playerId,
      playerName: r.playerName,
      reason: `${r.runs} runs @ ${r.average} avg (${r.centuries} centuries, ${r.fifties} fifties)`,
    };
  } else if (w) {
    playerOfTheSeries = {
      playerId: w.playerId,
      playerName: w.playerName,
      reason: `${w.wickets} wickets @ ${w.average} avg (Best: ${w.bestWickets}/${w.bestRuns})`,
    };
  }

  const formatStandings: TourDetailedStatistics['formatStandings'] = {
    TEST: { scheduled: 0, played: 0, homeWins: 0, awayWins: 0, draws: 0, ties: 0, statusText: 'No matches' },
    ODI: { scheduled: 0, played: 0, homeWins: 0, awayWins: 0, draws: 0, ties: 0, statusText: 'No matches' },
    T20I: { scheduled: 0, played: 0, homeWins: 0, awayWins: 0, draws: 0, ties: 0, statusText: 'No matches' },
  };

  (['TEST', 'ODI', 'T20I'] as MatchFormat[]).forEach((fmt) => {
    const fmtMatches = tourMatches.filter((m) => m.format === fmt);
    const concluded = fmtMatches.filter((m) => isTerminalMatchStatus(m.status));
    let homeWins = 0;
    let awayWins = 0;
    let draws = 0;
    let ties = 0;

    concluded.forEach((m) => {
      const outcome = determineMatchOutcome(m);
      if (outcome.isDraw) draws++;
      else if (outcome.isTie) ties++;
      else if (outcome.winnerTeamId === tour.hostTeamId) homeWins++;
      else if (outcome.winnerTeamId === tour.visitingTeamId) awayWins++;
    });

    let statusText = `${fmtMatches.length} Matches Scheduled`;
    if (concluded.length > 0) {
      if (concluded.length === fmtMatches.length) {
        if (homeWins > awayWins) statusText = `${tour.hostTeamId} won ${homeWins}–${awayWins}`;
        else if (awayWins > homeWins) statusText = `${tour.visitingTeamId} won ${awayWins}–${homeWins}`;
        else statusText = `Series Drawn ${homeWins}–${awayWins}${draws > 0 ? ` (${draws}D)` : ''}`;
      } else {
        statusText = `In progress: ${tour.hostTeamId} ${homeWins} – ${awayWins} ${tour.visitingTeamId}`;
      }
    }

    formatStandings[fmt] = {
      scheduled: fmtMatches.length,
      played: concluded.length,
      homeWins,
      awayWins,
      draws,
      ties,
      statusText,
    };
  });

  return {
    tourId: tour.id,
    matchesPlayed: completedMatches.length,
    leadingRunScorer,
    leadingWicketTaker,
    bestBattingPerformance: bestBatting,
    bestBowlingPerformance: bestBowling,
    playerOfTheSeries,
    formatStandings,
  };
}

export type TourProgressionStage =
  | 'ANNOUNCED'
  | 'SQUAD_DEADLINE'
  | 'SQUAD_ANNOUNCED'
  | 'TRAVEL_PREP'
  | 'MATCH_PREPARATION'
  | 'PLAYING_XI_CONFIRMED'
  | 'MATCH_READY'
  | 'IN_PROGRESS'
  | 'SERIES_UPDATE'
  | 'COMPLETED';

export function getTourProgressionStage(
  tour: Tour,
  allMatches: Match[],
  currentDate: string
): {
  stage: TourProgressionStage;
  stageIndex: number;
  label: string;
  description: string;
} {
  const tourMatches = allMatches
    .filter((m) => m.tourId === tour.id)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const completedMatches = tourMatches.filter((m) => isTerminalMatchStatus(m.status));
  const activeMatch = tourMatches.find((m) => m.status === 'IN_PROGRESS');
  const nextMatch = tourMatches.find((m) => !isTerminalMatchStatus(m.status));

  if (tour.status === 'COMPLETED' || (tourMatches.length > 0 && completedMatches.length === tourMatches.length)) {
    return {
      stage: 'COMPLETED',
      stageIndex: 10,
      label: 'Tour Completed',
      description: tour.resultText || 'All matches completed. Final trophy and statistics locked.',
    };
  }

  if (activeMatch) {
    return {
      stage: 'IN_PROGRESS',
      stageIndex: 8,
      label: 'Match Live In Progress',
      description: `${activeMatch.seriesName || activeMatch.format} is underway at ${activeMatch.venue}.`,
    };
  }

  if (nextMatch && nextMatch.lineupConfirmed && nextMatch.date && nextMatch.date <= currentDate) {
    return {
      stage: 'MATCH_READY',
      stageIndex: 7,
      label: 'Match Day — Lineup Confirmed',
      description: `Both teams are locked in for ${nextMatch.seriesName || nextMatch.format}. Ready for toss.`,
    };
  }

  if (nextMatch && nextMatch.date && nextMatch.date <= currentDate) {
    return {
      stage: 'PLAYING_XI_CONFIRMED',
      stageIndex: 6,
      label: 'Playing XI Selection Due',
      description: `Match day has arrived at ${nextMatch.venue}. Confirm your Starting XI.`,
    };
  }

  if (nextMatch && nextMatch.date) {
    const diffDays = Math.round((new Date(nextMatch.date).getTime() - new Date(currentDate).getTime()) / (24 * 3600 * 1000));
    if (diffDays <= 2 && completedMatches.length > 0) {
      return {
        stage: 'SERIES_UPDATE',
        stageIndex: 9,
        label: 'Series Recalibration & Travel',
        description: `Standings updated. Teams traveling to ${nextMatch.venue} for Match ${nextMatch.matchNumber || ''}.`,
      };
    }
    if (diffDays <= 3) {
      return {
        stage: 'MATCH_PREPARATION',
        stageIndex: 5,
        label: 'Pre-Match Pitch & Tactics Prep',
        description: `Inspecting pitch and weather conditions at ${nextMatch.venue} ahead of next match.`,
      };
    }
  }

  if (tour.squadAnnounced) {
    return {
      stage: 'TRAVEL_PREP',
      stageIndex: 4,
      label: 'Tour Squad Assembled & Travel',
      description: `Touring squad confirmed. Traveling to ${tour.hostTeamId} for training sessions.`,
    };
  }

  if (tour.squadSelectionDeadline <= currentDate) {
    return {
      stage: 'SQUAD_DEADLINE',
      stageIndex: 2,
      label: 'Squad Selection Deadline',
      description: 'Official deadline reached. Select your 15–20 player touring party.',
    };
  }

  return {
    stage: 'ANNOUNCED',
    stageIndex: 1,
    label: 'Tour Schedule Announced',
    description: `Bilateral series locked in the international calendar starting ${tour.startDate}.`,
  };
}

export function validateCustomTourSchedule(
  career: CareerSave,
  hostTeamId: string,
  visitingTeamId: string,
  startDate: string,
  seriesConfig: { tests: number; odis: number; t20is: number }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (hostTeamId === visitingTeamId) {
    errors.push('Host nation and visiting nation cannot be the same team.');
  }

  const totalMatches = (seriesConfig.tests || 0) + (seriesConfig.odis || 0) + (seriesConfig.t20is || 0);
  if (totalMatches <= 0) {
    errors.push('Tour must include at least one match (Test, ODI, or T20I).');
  }

  const startMs = new Date(startDate).getTime();
  const curMs = new Date(career.currentDate || '2026-11-15').getTime();
  if (startMs < curMs) {
    errors.push(`Tour start date (${startDate}) cannot be in the past (Current date: ${career.currentDate}).`);
  }

  const approxDays =
    (seriesConfig.t20is || 0) * 3 +
    (seriesConfig.odis || 0) * 4 +
    (seriesConfig.tests || 0) * 9 +
    5;
  const endMs = startMs + approxDays * 24 * 3600 * 1000;

  const allMatches = [...career.fixtures, ...(career.worldFixtures || [])];
  const conflicting = allMatches.find((m) => {
    if (!m.date || isTerminalMatchStatus(m.status)) return false;
    const mMs = new Date(m.date).getTime();
    if (mMs >= startMs && mMs <= endMs) {
      return (
        m.homeTeamId === hostTeamId ||
        m.awayTeamId === hostTeamId ||
        m.homeTeamId === visitingTeamId ||
        m.awayTeamId === visitingTeamId
      );
    }
    return false;
  });

  if (conflicting) {
    errors.push(
      `Scheduling conflict: ${conflicting.homeTeamId} vs ${conflicting.awayTeamId} is already scheduled on ${conflicting.date}. Please pick a different window.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function scheduleCustomInternationalTour(
  career: CareerSave,
  hostTeamId: string,
  visitingTeamId: string,
  startDate: string,
  seriesConfig: { tests: number; odis: number; t20is: number },
  customName?: string,
  neutralCountryId?: string
): { updatedCareer: CareerSave; createdTour?: Tour; error?: string } {
  const validation = validateCustomTourSchedule(
    career,
    hostTeamId,
    visitingTeamId,
    startDate,
    seriesConfig
  );
  if (!validation.valid) {
    return { updatedCareer: career, error: validation.errors[0] };
  }

  const year = Number(startDate.slice(0, 4)) || 2026;
  const { tour, matches } = createBilateralTour(
    hostTeamId,
    visitingTeamId,
    seriesConfig,
    startDate,
    year,
    customName,
    undefined,
    undefined,
    `custom_${Date.now()}`
  );

  if (neutralCountryId) {
    tour.tourType = 'NEUTRAL';
    tour.neutralCountryId = neutralCountryId;
  } else if (
    (seriesConfig.tests > 0 ? 1 : 0) +
      (seriesConfig.odis > 0 ? 1 : 0) +
      (seriesConfig.t20is > 0 ? 1 : 0) >
    1
  ) {
    tour.tourType = 'MULTI_FORMAT';
  } else {
    tour.tourType = tour.hostTeamId === career.selectedTeamId ? 'HOME' : 'AWAY';
  }

  const userTeamId = career.selectedTeamId;
  const isUserTour = tour.hostTeamId === userTeamId || tour.visitingTeamId === userTeamId;

  if (!isUserTour) {
    tour.squadAnnounced = true;
  }

  const updatedTours = [tour, ...(career.tours || [])];
  const newFixtures = [...career.fixtures];
  const newWorldFixtures = [...(career.worldFixtures || [])];

  matches.forEach((m) => {
    const isUser = m.homeTeamId === userTeamId || m.awayTeamId === userTeamId;
    const tagged: Match = {
      ...m,
      isUserMatch: isUser,
      userTeamId,
    };
    if (isUser) newFixtures.push(tagged);
    else newWorldFixtures.push(tagged);
  });

  newFixtures.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  newWorldFixtures.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  return {
    updatedCareer: {
      ...career,
      tours: updatedTours,
      fixtures: newFixtures,
      worldFixtures: newWorldFixtures,
    },
    createdTour: tour,
  };
}

