import { CareerSave, Match, NewsArticle, TournamentTableEntry, TournamentEdition, RivalryCompetition } from '../types/cricket';
import { simulateFullMatch, applyMatchStatsToPlayers } from './matchEngine';
import { updateTourSeriesStandings } from './tourEngine';
import { recordMatchInTournament, createWTCFinalMatch } from './tournamentEngine';
import { processSquadTrainingDay, TrainingFocus } from './playerDevelopmentEngine';
import { ALL_PLAYERS, getPlayersByCountry } from '../data/squads';
import { INITIAL_ASHES_COMPETITION, INITIAL_BGT_COMPETITION, INITIAL_TOURNAMENT_EDITIONS } from '../data/tournamentData';

export interface WorldSimulationResult {
  updatedCareer: CareerSave;
  simulatedMatches: Match[];
  generatedNews: NewsArticle[];
}

/**
 * Simulates all non-user world matches up to a target calendar date,
 * updates tour series standings, tournament standings, player development, and generates news.
 */
export function simulateWorldMatchesUntil(
  career: CareerSave,
  targetDate: string
): WorldSimulationResult {
  const simulatedMatches: Match[] = [];
  const generatedNews: NewsArticle[] = [];

  // Deep clone career objects where needed
  const updatedCareer: CareerSave = {
    ...career,
    currentDate: targetDate,
    fixtures: [...career.fixtures],
    worldFixtures: [...(career.worldFixtures || [])],
    tours: JSON.parse(JSON.stringify(career.tours || [])),
    tournamentEditions: JSON.parse(JSON.stringify(career.tournamentEditions || INITIAL_TOURNAMENT_EDITIONS)),
    ashes: career.ashes ? JSON.parse(JSON.stringify(career.ashes)) : JSON.parse(JSON.stringify(INITIAL_ASHES_COMPETITION)),
    borderGavaskar: career.borderGavaskar ? JSON.parse(JSON.stringify(career.borderGavaskar)) : JSON.parse(JSON.stringify(INITIAL_BGT_COMPETITION)),
    playerTrainingFocus: { ...(career.playerTrainingFocus || {}) },
    playerOverrides: { ...(career.playerOverrides || {}) },
    news: [...career.news],
    calendar: [...(career.calendar || [])],
  };

  // 1. Find world matches scheduled on or before targetDate that haven't completed yet
  updatedCareer.worldFixtures = updatedCareer.worldFixtures.map((match) => {
    if (match.status === 'SCHEDULED' && (!match.date || match.date <= targetDate)) {
      // Simulate this world match using the realistic engine
      const completed = simulateFullMatch(match);
      simulatedMatches.push(completed);
      applyMatchStatsToPlayers(completed, updatedCareer);

      // Create news article for the world match
      const winnerName = completed.status === 'COMPLETED'
        ? (completed.resultText || `${completed.homeTeamId} vs ${completed.awayTeamId} concluded`)
        : `Match ended in ${completed.status}`;

      const newsItem: NewsArticle = {
        id: `news_wm_${completed.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: `${completed.format} Result: ${completed.homeTeamId} vs ${completed.awayTeamId}`,
        summary: `${winnerName}. ${completed.playerOfTheMatch ? `Player of the match: ${completed.playerOfTheMatch.playerName} (${completed.playerOfTheMatch.reason}).` : ''}`,
        category: 'MATCH_REPORT',
        timestamp: completed.date || targetDate,
        relatedTeamId: completed.homeTeamId,
      };

      generatedNews.push(newsItem);

      // 2. Update Tour Standings if part of a tour
      if (completed.tourId && updatedCareer.tours) {
        const tourIdx = updatedCareer.tours.findIndex((t) => t.id === completed.tourId);
        if (tourIdx !== -1) {
          const allTourMatches = [...updatedCareer.fixtures, ...updatedCareer.worldFixtures]
            .map((m) => (m.id === completed.id ? completed : m));
          const { updatedTour, updatedAshes, updatedBGT } = updateTourSeriesStandings(
            updatedCareer.tours[tourIdx],
            allTourMatches,
            updatedCareer.ashes,
            updatedCareer.borderGavaskar
          );
          updatedCareer.tours[tourIdx] = updatedTour;
          if (updatedAshes) updatedCareer.ashes = updatedAshes;
          if (updatedBGT) updatedCareer.borderGavaskar = updatedBGT;
        }
      }

      // 3. Update Tournament Standings if part of a tournament/WTC
      const compId = completed.tournamentId || completed.competitionId;
      if (compId && updatedCareer.tournamentEditions) {
        const tIdx = updatedCareer.tournamentEditions.findIndex((t) => t.id === compId || t.competitionType === compId);
        if (tIdx !== -1) {
          updatedCareer.tournamentEditions[tIdx] = recordMatchInTournament(
            updatedCareer.tournamentEditions[tIdx],
            completed
          );
        }
      }

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

  // 4. Check for WTC Grand Final qualification
  const wtc = updatedCareer.tournamentEditions?.find((t) => t.competitionType === 'WTC');
  if (wtc && wtc.table.length >= 2 && !wtc.finalMatchId) {
    const totalWtcPlayed = wtc.table.reduce((acc, row) => acc + row.played, 0);
    // If sufficient WTC matches have completed (or top 2 qualify)
    if (totalWtcPlayed >= 10) {
      const finalists = [wtc.table[0].teamId, wtc.table[1].teamId] as [string, string];
      wtc.finalistTeamIds = finalists;
      const finalMatch = createWTCFinalMatch(finalists[0], finalists[1]);
      wtc.finalMatchId = finalMatch.id;
      if (finalists.includes(updatedCareer.selectedTeamId)) {
        finalMatch.isUserMatch = true;
        finalMatch.userTeamId = updatedCareer.selectedTeamId;
        updatedCareer.fixtures.push(finalMatch);
      } else {
        updatedCareer.worldFixtures.push(finalMatch);
      }
      generatedNews.push({
        id: `news_wtc_final_${Date.now()}`,
        title: `ICC World Test Championship Final Confirmed at Lord’s: ${finalists[0]} vs ${finalists[1]}`,
        summary: `The top two Test nations, ${finalists[0]} and ${finalists[1]}, have qualified for the prestigious ICC WTC Final at Lord's following a grueling cycle.`,
        category: 'TOURNAMENT',
        timestamp: targetDate,
      });
    }
  }

  // 5. Daily Squad Training & Player Progression
  // Compute days elapsed between previous career.currentDate and targetDate
  const startMs = new Date(career.currentDate || '2026-11-15').getTime();
  const endMs = new Date(targetDate).getTime();
  const daysDiff = Math.max(1, Math.round((endMs - startMs) / (24 * 3600 * 1000)));

  // Retrieve user squad players and apply overrides
  const userTeamPlayers = getPlayersByCountry(updatedCareer.selectedTeamId).map((p) => {
    const override = updatedCareer.playerOverrides?.[p.id];
    return override ? ({ ...p, ...override, attributes: { ...p.attributes, ...(override.attributes || {}) } } as any) : p;
  });

  for (let d = 0; d < Math.min(daysDiff, 30); d++) {
    const dayResult = processSquadTrainingDay(
      userTeamPlayers,
      (updatedCareer.playerTrainingFocus || {}) as Record<string, TrainingFocus>,
      false,
      targetDate
    );

    // Save changes to playerOverrides
    dayResult.updatedPlayers.forEach((up) => {
      if (!updatedCareer.playerOverrides) updatedCareer.playerOverrides = {};
      updatedCareer.playerOverrides[up.id] = {
        attributes: up.attributes,
        potential: up.potential,
        fitness: up.fitness,
        currentForm: up.currentForm,
        workloadFatigue: up.workloadFatigue,
        isInjured: up.isInjured,
        injuryType: up.injuryType,
        injuryDaysRemaining: up.injuryDaysRemaining,
        injurySeverity: up.injurySeverity,
        developmentFeedback: up.developmentFeedback,
        developmentHistory: up.developmentHistory,
        testRating: up.testRating,
        odiRating: up.odiRating,
        t20Rating: up.t20Rating,
      };
    });

    // Check if any player improved significantly or got injured
    dayResult.changes.forEach((ch) => {
      if (Math.random() < 0.05) { // Sample notable improvements for news
        generatedNews.push({
          id: `news_dev_${ch.playerId}_${Date.now()}`,
          title: `Player Development: ${ch.playerName} Showing Rapid Gains`,
          summary: `${ch.playerName} has excelled in squad training focusing on ${ch.focus.toLowerCase()} drills. Attributes improved: ${ch.attributeChanged} (+${ch.delta}).`,
          category: 'SQUAD_SELECTION',
          timestamp: targetDate,
          relatedTeamId: updatedCareer.selectedTeamId,
        });
      }
    });
  }

  // Prepend generated news
  if (generatedNews.length > 0) {
    updatedCareer.news = [...generatedNews, ...updatedCareer.news];
  }

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
