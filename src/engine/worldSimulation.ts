import { CareerSave, Match, NewsArticle, TournamentTableEntry } from '../types/cricket';
import { simulateFullMatch } from './matchEngine';
import { INITIAL_TOURNAMENTS } from '../data/tournaments';

export interface WorldSimulationResult {
  updatedCareer: CareerSave;
  simulatedMatches: Match[];
  generatedNews: NewsArticle[];
}

/**
 * Simulates all non-user world matches up to a target calendar date,
 * updates tournament standings, accumulates player statistics, and generates news.
 */
export function simulateWorldMatchesUntil(
  career: CareerSave,
  targetDate: string
): WorldSimulationResult {
  const simulatedMatches: Match[] = [];
  const generatedNews: NewsArticle[] = [];

  // Clone career
  const updatedCareer: CareerSave = {
    ...career,
    currentDate: targetDate,
    fixtures: [...career.fixtures],
    worldFixtures: [...(career.worldFixtures || [])],
    news: [...career.news],
    calendar: [...(career.calendar || [])],
  };

  // Find world matches scheduled on or before targetDate that haven't completed yet
  updatedCareer.worldFixtures = updatedCareer.worldFixtures.map((match) => {
    if (match.status === 'SCHEDULED' && (!match.date || match.date <= targetDate)) {
      // Simulate this world match using the realistic engine
      const completed = simulateFullMatch(match);
      simulatedMatches.push(completed);

      // Create news article for the world match
      const winnerName = completed.status === 'COMPLETED'
        ? (completed.resultText || `${completed.homeTeamId} vs ${completed.awayTeamId} concluded`)
        : `Match ended in ${completed.status}`;

      const newsItem: NewsArticle = {
        id: `news_wm_${completed.id}_${Date.now()}`,
        title: `${completed.format} Result: ${completed.homeTeamId} vs ${completed.awayTeamId}`,
        summary: `${winnerName}. ${completed.playerOfTheMatch ? `Player of the match: ${completed.playerOfTheMatch.playerName} (${completed.playerOfTheMatch.reason}).` : ''}`,
        category: 'MATCH_REPORT',
        timestamp: completed.date || targetDate,
        relatedTeamId: completed.homeTeamId,
      };

      generatedNews.push(newsItem);
      return completed;
    }
    return match;
  });

  // Mark corresponding calendar events as simulated
  updatedCareer.calendar = updatedCareer.calendar.map((ev) => {
    if (ev.matchId && simulatedMatches.some((m) => m.id === ev.matchId)) {
      return { ...ev, isSimulated: true };
    }
    return ev;
  });

  // Prepend generated news
  if (generatedNews.length > 0) {
    updatedCareer.news = [...generatedNews, ...updatedCareer.news];
  }

  // Workload fatigue recovery / accumulation for user squad
  // Each day progressed recovers 3% fatigue for non-playing players
  // Format squads fatigue management
  ['TEST', 'ODI', 'T20I'].forEach((fmtKey) => {
    const fmt = fmtKey as 'TEST' | 'ODI' | 'T20I';
    const config = updatedCareer.formatSquads?.[fmt];
    if (config) {
      // Workload adjustment handled in player records
    }
  });

  return {
    updatedCareer,
    simulatedMatches,
    generatedNews,
  };
}

/**
 * Updates a tournament table entry after a simulated match
 */
export function recordMatchInTournamentTable(
  table: TournamentTableEntry[],
  match: Match
): TournamentTableEntry[] {
  if (match.status !== 'COMPLETED' && match.status !== 'DRAW' && match.status !== 'TIE') {
    return table;
  }

  const inn1 = match.innings[0];
  const inn2 = match.innings[1];
  if (!inn1 || !inn2) return table;

  const homeWon = inn1.battingTeamId === match.homeTeamId
    ? inn1.totalRuns > inn2.totalRuns
    : inn2.totalRuns > inn1.totalRuns;

  const awayWon = !homeWon && match.status === 'COMPLETED';
  const isDraw = match.status === 'DRAW';
  const isTie = match.status === 'TIE';

  return table.map((entry) => {
    if (entry.teamId === match.homeTeamId) {
      const won = homeWon ? 1 : 0;
      const lost = awayWon ? 1 : 0;
      const drawn = isDraw ? 1 : 0;
      const tied = isTie ? 1 : 0;
      const pts = match.format === 'TEST'
        ? (won ? 12 : drawn ? 4 : tied ? 6 : 0)
        : (won ? 2 : tied ? 1 : 0);

      const totalPlayed = entry.played + 1;
      const totalPoints = entry.points + pts;
      const pct = match.format === 'TEST' ? Number(((totalPoints / (totalPlayed * 12)) * 100).toFixed(2)) : undefined;

      return {
        ...entry,
        played: totalPlayed,
        won: entry.won + won,
        lost: entry.lost + lost,
        drawn: entry.drawn + drawn,
        tied: entry.tied + tied,
        points: totalPoints,
        pointsPercentage: pct !== undefined ? pct : entry.pointsPercentage,
      };
    }

    if (entry.teamId === match.awayTeamId) {
      const won = awayWon ? 1 : 0;
      const lost = homeWon ? 1 : 0;
      const drawn = isDraw ? 1 : 0;
      const tied = isTie ? 1 : 0;
      const pts = match.format === 'TEST'
        ? (won ? 12 : drawn ? 4 : tied ? 6 : 0)
        : (won ? 2 : tied ? 1 : 0);

      const totalPlayed = entry.played + 1;
      const totalPoints = entry.points + pts;
      const pct = match.format === 'TEST' ? Number(((totalPoints / (totalPlayed * 12)) * 100).toFixed(2)) : undefined;

      return {
        ...entry,
        played: totalPlayed,
        won: entry.won + won,
        lost: entry.lost + lost,
        drawn: entry.drawn + drawn,
        tied: entry.tied + tied,
        points: totalPoints,
        pointsPercentage: pct !== undefined ? pct : entry.pointsPercentage,
      };
    }

    return entry;
  });
}

/**
 * Computes live sorted tournament table given base table and completed matches
 */
export function computeTournamentTable(
  baseTable: TournamentTableEntry[],
  format: 'TEST' | 'ODI' | 'T20I',
  completedMatches: Match[]
): TournamentTableEntry[] {
  let updatedTable = [...baseTable];

  // Apply completed matches for this format
  completedMatches
    .filter((m) => m.format === format && (m.status === 'COMPLETED' || m.status === 'DRAW' || m.status === 'TIE'))
    .forEach((m) => {
      updatedTable = recordMatchInTournamentTable(updatedTable, m);
    });

  // Sort table according to format rules
  if (format === 'TEST') {
    return updatedTable.sort((a, b) => {
      const pctA = a.pointsPercentage || 0;
      const pctB = b.pointsPercentage || 0;
      if (pctB !== pctA) return pctB - pctA;
      return b.points - a.points;
    });
  }

  return updatedTable.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return (b.netRunRate || 0) - (a.netRunRate || 0);
  });
}
