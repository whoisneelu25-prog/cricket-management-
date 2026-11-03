import {
  TournamentEdition,
  TournamentTableEntry,
  Match,
  MatchFormat,
} from '../types/cricket';
import { VENUES } from '../data/venues';
import { getDefaultPlayingXI, getDefaultCaptainId, getDefaultWicketKeeperId } from '../data/squads';

/**
 * Calculates official WTC PCT% (Percentage of contested points won)
 */
export function calculateWTCPCT(points: number, matchesPlayed: number, pointsForWin = 12): number {
  if (matchesPlayed <= 0) return 0;
  const maxContestedPoints = matchesPlayed * pointsForWin;
  return +((points / maxContestedPoints) * 100).toFixed(2);
}

/**
 * Calculates Net Run Rate (NRR) for white-ball cricket
 */
export function calculateNRR(
  forRuns: number,
  forOvers: number,
  againstRuns: number,
  againstOvers: number
): number {
  if (forOvers <= 0 || againstOvers <= 0) return 0;
  const forRate = forRuns / forOvers;
  const againstRate = againstRuns / againstOvers;
  return +(forRate - againstRate).toFixed(3);
}

/**
 * Sorts tournament standings table according to edition rules
 */
export function sortTournamentTable(
  table: TournamentTableEntry[],
  usePCT: boolean = false
): TournamentTableEntry[] {
  const sorted = [...table];
  sorted.sort((a, b) => {
    if (usePCT) {
      const pctA = a.pointsPercentage || 0;
      const pctB = b.pointsPercentage || 0;
      if (pctB !== pctA) return pctB - pctA;
      return b.points - a.points;
    }

    if (b.points !== a.points) return b.points - a.points;

    const nrrA = a.netRunRate || 0;
    const nrrB = b.netRunRate || 0;
    if (nrrB !== nrrA) return nrrB - nrrA;

    return b.won - a.won;
  });
  return sorted;
}

/**
 * Updates a tournament edition with a completed match outcome
 */
export function recordMatchInTournament(
  tournament: TournamentEdition,
  match: Match
): TournamentEdition {
  const t: TournamentEdition = JSON.parse(JSON.stringify(tournament));
  if (match.status !== 'COMPLETED' && match.status !== 'DRAW' && match.status !== 'TIE') {
    return t;
  }

  const inn1 = match.innings[0];
  const inn2 = match.innings[1];
  if (!inn1 || !inn2) return t;

  const homeBatFirst = inn1.battingTeamId === match.homeTeamId;
  const homeRuns = homeBatFirst ? inn1.totalRuns : inn2.totalRuns;
  const awayRuns = homeBatFirst ? inn2.totalRuns : inn1.totalRuns;
  const homeOvers = homeBatFirst ? Math.max(1, inn1.completedOvers) : Math.max(1, inn2.completedOvers);
  const awayOvers = homeBatFirst ? Math.max(1, inn2.completedOvers) : Math.max(1, inn1.completedOvers);

  const isDraw = match.status === 'DRAW';
  const isTie = match.status === 'TIE';
  const homeWon = !isDraw && !isTie && (homeRuns > awayRuns);
  const awayWon = !isDraw && !isTie && (awayRuns > homeRuns);

  const rules = t.rules;

  t.table = t.table.map((entry) => {
    if (entry.teamId === match.homeTeamId || entry.teamId === match.awayTeamId) {
      const isHome = entry.teamId === match.homeTeamId;
      const won = isHome ? homeWon : awayWon;
      const lost = isHome ? awayWon : homeWon;
      const pointsGain = won ? rules.pointsForWin : isTie ? rules.pointsForTie : isDraw ? rules.pointsForDraw : rules.pointsForLoss;

      const forR = entry.forRuns + (isHome ? homeRuns : awayRuns);
      const forO = entry.forOvers + (isHome ? homeOvers : awayOvers);
      const againstR = entry.againstRuns + (isHome ? awayRuns : homeRuns);
      const againstO = entry.againstOvers + (isHome ? awayOvers : homeOvers);

      const played = entry.played + 1;
      const pts = entry.points + pointsGain;

      const pct = rules.usePCT ? calculateWTCPCT(pts, played, rules.pointsForWin) : undefined;
      const nrr = !rules.usePCT ? calculateNRR(forR, forO, againstR, againstO) : undefined;

      return {
        ...entry,
        played,
        won: entry.won + (won ? 1 : 0),
        lost: entry.lost + (lost ? 1 : 0),
        drawn: entry.drawn + (isDraw ? 1 : 0),
        tied: entry.tied + (isTie ? 1 : 0),
        points: pts,
        pointsPercentage: pct,
        netRunRate: nrr,
        forRuns: forR,
        forOvers: forO,
        againstRuns: againstR,
        againstOvers: againstO,
      };
    }
    return entry;
  });

  // Re-sort table
  t.table = sortTournamentTable(t.table, !!rules.usePCT);

  // If WTC and top 2 teams are verified, update finalists
  if (t.competitionType === 'WTC' && t.table.length >= 2) {
    t.finalistTeamIds = [t.table[0].teamId, t.table[1].teamId];
  }

  return t;
}

/**
 * Creates the official standalone WTC Final at Lord's between the top 2 teams
 */
export function createWTCFinalMatch(
  team1Id: string,
  team2Id: string,
  date = '2027-06-10',
  venueName = "Lord's Cricket Ground, London"
): Match {
  const neutralVenue = VENUES.find((v) => v.name.includes("Lord's") || v.countryId === 'ENG') || VENUES[0];

  return {
    id: 'match_wtc_grand_final_2027',
    format: 'TEST',
    seriesName: 'ICC World Test Championship Grand Final (Lord’s)',
    tournamentId: 'wtc_2025_27',
    competitionId: 'wtc_2025_27',
    matchNumber: 1,
    totalMatchesInSeries: 1,
    homeTeamId: team1Id,
    awayTeamId: team2Id,
    venue: venueName,
    pitch: neutralVenue.pitch,
    weather: neutralVenue.weather,
    date,
    dayNumber: 1,
    sessionNumber: 1,
    status: 'SCHEDULED',
    currentInningsIndex: 0,
    innings: [],
    homeXI: getDefaultPlayingXI(team1Id, 'TEST'),
    awayXI: getDefaultPlayingXI(team2Id, 'TEST'),
    homeCaptainId: getDefaultCaptainId(team1Id, 'TEST'),
    awayCaptainId: getDefaultCaptainId(team2Id, 'TEST'),
    homeWicketKeeperId: getDefaultWicketKeeperId(team1Id, 'TEST'),
    awayWicketKeeperId: getDefaultWicketKeeperId(team2Id, 'TEST'),
    userTeamId: team1Id,
    isUserMatch: false,
    userTactics: { battingAggression: 'BALANCED', bowlingTactic: 'BALANCED_CONTAIN', fieldPreset: 'BALANCED_STANDARD' },
    aiTactics: { battingAggression: 'BALANCED', bowlingTactic: 'BALANCED_CONTAIN', fieldPreset: 'BALANCED_STANDARD' },
    stage: 'FINAL',
  };
}

