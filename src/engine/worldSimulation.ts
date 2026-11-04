import {
  CareerSave,
  Match,
  NewsArticle,
  TournamentTableEntry,
} from '../types/cricket';
import {
  applyMatchStatsToPlayers,
  determineMatchOutcome,
  isPreMatchStatus,
  isTerminalMatchStatus,
  simulateFullMatch,
} from './matchEngine';
import { updateTourSeriesStandings } from './tourEngine';
import { synchronizeAndAdvanceTournaments } from './tournamentEngine';
import { processSquadTrainingDay, TrainingFocus } from './playerDevelopmentEngine';
import { getEffectivePlayersByCountry } from '../data/squads';
import {
  INITIAL_ASHES_COMPETITION,
  INITIAL_BGT_COMPETITION,
  INITIAL_TOURNAMENT_EDITIONS,
  TEAM_META,
} from '../data/tournamentData';
import {
  applyPostMatchAIUpdates,
  initializeAITeams,
  initializeTeamRankings,
  processAIWorldDevelopment,
  processAnnualPlayerLifecycle,
  selectAIPlayingXIForMatch,
  updateTeamRankingsAfterMatch,
} from './aiTeamEngine';
import { generateNextSeasonSchedule } from './calendarEngine';

export interface WorldSimulationResult {
  updatedCareer: CareerSave;
  simulatedMatches: Match[];
  generatedNews: NewsArticle[];
}

export type CalendarAdvanceMode = 'ONE_DAY' | 'ONE_WEEK' | 'NEXT_EVENT' | 'NEXT_MATCH';

export interface CalendarAdvancementResult extends WorldSimulationResult {
  pausedReason:
    | 'USER_MATCH_TODAY'
    | 'TOUR_SQUAD_DEADLINE'
    | 'INJURY_IN_XI'
    | 'TARGET_REACHED';
  pausedMessage: string;
  targetMatchId?: string;
  targetTourId?: string;
}

function addDaysISO(dateStr: string, days: number): string {
  const ms = new Date(dateStr).getTime() + days * 24 * 3600 * 1000;
  return new Date(ms).toISOString().split('T')[0];
}

function diffDays(startISO: string, endISO: string): number {
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  return Math.round((e - s) / (24 * 3600 * 1000));
}

function cloneCareerForSim(career: CareerSave): CareerSave {
  return {
    ...career,
    manager: {
      ...career.manager,
      trophies: [...(career.manager.trophies || [])],
    },
    fixtures: [...(career.fixtures || [])],
    worldFixtures: [...(career.worldFixtures || [])],
    tours: JSON.parse(JSON.stringify(career.tours || [])),
    tournamentEditions: JSON.parse(
      JSON.stringify(career.tournamentEditions || INITIAL_TOURNAMENT_EDITIONS)
    ),
    ashes: career.ashes
      ? JSON.parse(JSON.stringify(career.ashes))
      : JSON.parse(JSON.stringify(INITIAL_ASHES_COMPETITION)),
    borderGavaskar: career.borderGavaskar
      ? JSON.parse(JSON.stringify(career.borderGavaskar))
      : JSON.parse(JSON.stringify(INITIAL_BGT_COMPETITION)),
    aiTeams: career.aiTeams
      ? JSON.parse(JSON.stringify(career.aiTeams))
      : initializeAITeams(career.selectedTeamId, career),
    teamRankings: career.teamRankings
      ? JSON.parse(JSON.stringify(career.teamRankings))
      : initializeTeamRankings(),
    emergingPlayers: [...(career.emergingPlayers || [])],
    archivedMatches: [...(career.archivedMatches || [])],
    playerTrainingFocus: { ...(career.playerTrainingFocus || {}) },
    playerOverrides: JSON.parse(JSON.stringify(career.playerOverrides || {})),
    news: [...(career.news || [])],
    calendar: [...(career.calendar || [])],
  };
}

/**
 * Simulates a single AI world match with dynamic AI squad selection, stats, rankings, tour & news updates.
 */
function simulateSingleAIMatchOnDate(
  updatedCareer: CareerSave,
  match: Match,
  dateStr: string
): { completed: Match; newsItems: NewsArticle[] } {
  const newsItems: NewsArticle[] = [];
  const isHighStakes =
    Boolean(match.tournamentId) ||
    match.competitionId === 'the_ashes' ||
    match.competitionId === 'border_gavaskar';

  const homeAICfg = selectAIPlayingXIForMatch(
    match.homeTeamId,
    match.format,
    updatedCareer,
    match.pitch,
    isHighStakes
  );
  const awayAICfg = selectAIPlayingXIForMatch(
    match.awayTeamId,
    match.format,
    updatedCareer,
    match.pitch,
    isHighStakes
  );

  const preparedMatch: Match = {
    ...match,
    homeXI: homeAICfg.playingXI,
    homeCaptainId: homeAICfg.captainId,
    homeWicketKeeperId: homeAICfg.wicketKeeperId,
    awayXI: awayAICfg.playingXI,
    awayCaptainId: awayAICfg.captainId,
    awayWicketKeeperId: awayAICfg.wicketKeeperId,
  };

  const completed = simulateFullMatch(preparedMatch, updatedCareer);
  applyMatchStatsToPlayers(completed, updatedCareer);

  // AI workload, form, and injuries
  const aiInjuryNews = applyPostMatchAIUpdates(updatedCareer, completed);
  newsItems.push(...aiInjuryNews);

  // Live ICC Rankings update
  const { updatedRankings, rankingNews } = updateTeamRankingsAfterMatch(updatedCareer, completed);
  updatedCareer.teamRankings = updatedRankings;
  newsItems.push(...rankingNews);

  // Match report & player milestones (centuries / 5-wicket hauls)
  const homeName = TEAM_META[completed.homeTeamId]?.name || completed.homeTeamId;
  const awayName = TEAM_META[completed.awayTeamId]?.name || completed.awayTeamId;
  const summaryResult =
    completed.resultText || `${homeName} vs ${awayName} concluded (${completed.status})`;

  newsItems.push({
    id: `news_wm_${completed.id}`,
    title: `${completed.format}: ${summaryResult}`,
    summary: `${completed.seriesName || 'International Fixture'} at ${completed.venue}. ${
      completed.playerOfTheMatch
        ? `Player of the Match: ${completed.playerOfTheMatch.playerName} (${completed.playerOfTheMatch.reason}).`
        : ''
    }`,
    category: 'MATCH_REPORT',
    timestamp: completed.date || dateStr,
    relatedTeamId: completed.winnerTeamId || completed.homeTeamId,
  });

  // Check notable century / 5-fer milestones
  completed.innings.forEach((inn) => {
    inn.batters.forEach((b) => {
      if (b.runs >= 125) {
        newsItems.push({
          id: `news_mile_bat_${completed.id}_${b.playerId}`,
          title: `Masterclass Century: ${b.playerName} Hammers ${b.runs} (${b.balls}b) for ${inn.battingTeamName}!`,
          summary: `${b.playerName} struck ${b.fours} fours and ${b.sixes} sixes in a commanding knock during ${completed.seriesName || completed.format}.`,
          category: 'MILESTONE',
          timestamp: completed.date || dateStr,
          relatedTeamId: inn.battingTeamId,
          relatedPlayerId: b.playerId,
        });
      }
    });
    inn.bowlers.forEach((bw) => {
      if (bw.wickets >= 5) {
        newsItems.push({
          id: `news_mile_bowl_${completed.id}_${bw.playerId}`,
          title: `Five-Wicket Haul: ${bw.playerName} Claims ${bw.wickets}/${bw.runs} Against ${inn.battingTeamName}!`,
          summary: `Spellbinding bowling from ${bw.playerName} (${bw.overs}.${bw.ballsThisOver} overs) dismantled ${inn.battingTeamName}'s lineup.`,
          category: 'MILESTONE',
          timestamp: completed.date || dateStr,
          relatedTeamId: inn.bowlingTeamId,
          relatedPlayerId: bw.playerId,
        });
      }
    });
  });

  return { completed, newsItems };
}

/**
 * Simulates all non-user world matches up to `targetDate` in chronological order,
 * updating bilateral tours, tournament knockouts, rankings, player development, and multi-season generation!
 */
export function simulateWorldMatchesUntil(
  career: CareerSave,
  targetDate: string
): WorldSimulationResult {
  const simulatedMatches: Match[] = [];
  const generatedNews: NewsArticle[] = [];
  const updatedCareer = cloneCareerForSim(career);

  const startDate = career.currentDate || '2026-11-15';
  const totalDays = Math.max(0, diffDays(startDate, targetDate));

  // First simulate any undated legacy world fixtures if scheduled
  for (let i = 0; i < updatedCareer.worldFixtures.length; i++) {
    const m = updatedCareer.worldFixtures[i];
    if (!m.date && isPreMatchStatus(m.status)) {
      const { completed, newsItems } = simulateSingleAIMatchOnDate(updatedCareer, m, startDate);
      updatedCareer.worldFixtures[i] = completed;
      simulatedMatches.push(completed);
      generatedNews.push(...newsItems);
    }
  }

  // Step chronologically date-by-date across active match dates & year rollovers
  let cursorDate = startDate;
  for (let step = 0; step <= totalDays; step++) {
    const prevDate = cursorDate;
    cursorDate = step === 0 ? startDate : addDaysISO(startDate, step);

    // Check annual rollover (Dec 31 -> Jan 1)
    const prevYear = Number(prevDate.slice(0, 4));
    const curYear = Number(cursorDate.slice(0, 4));
    if (curYear > prevYear) {
      const lifecycleNews = processAnnualPlayerLifecycle(updatedCareer, curYear);
      generatedNews.push(...lifecycleNews);
      generateNextSeasonSchedule(updatedCareer, curYear);
    }

    // Find all AI world matches scheduled on or before `cursorDate` that are still pre-match
    let foundOnDate = false;
    for (let i = 0; i < updatedCareer.worldFixtures.length; i++) {
      const wm = updatedCareer.worldFixtures[i];
      if (isPreMatchStatus(wm.status) && wm.date && wm.date <= cursorDate) {
        const { completed, newsItems } = simulateSingleAIMatchOnDate(
          updatedCareer,
          wm,
          cursorDate
        );
        updatedCareer.worldFixtures[i] = completed;
        simulatedMatches.push(completed);
        generatedNews.push(...newsItems);
        foundOnDate = true;

        // Update tour standings if part of a tour
        if (completed.tourId && updatedCareer.tours) {
          const tourIdx = updatedCareer.tours.findIndex((t) => t.id === completed.tourId);
          if (tourIdx !== -1) {
            const wasDone = updatedCareer.tours[tourIdx].status === 'COMPLETED';
            const allTourMatches = [
              ...updatedCareer.fixtures,
              ...updatedCareer.worldFixtures,
            ];
            const { updatedTour, updatedAshes, updatedBGT } = updateTourSeriesStandings(
              updatedCareer.tours[tourIdx],
              allTourMatches,
              updatedCareer.ashes,
              updatedCareer.borderGavaskar
            );
            updatedCareer.tours[tourIdx] = updatedTour;
            if (updatedAshes) updatedCareer.ashes = updatedAshes;
            if (updatedBGT) updatedCareer.borderGavaskar = updatedBGT;

            if (!wasDone && updatedTour.status === 'COMPLETED' && updatedTour.resultText) {
              generatedNews.push({
                id: `news_series_${updatedTour.id}`,
                title: `Series Concluded: ${updatedTour.name} — ${updatedTour.resultText}`,
                summary: `${updatedTour.resultText}${
                  updatedTour.playerOfTheSeries
                    ? ` Player of the Series: ${updatedTour.playerOfTheSeries.playerName} (${updatedTour.playerOfTheSeries.reason}).`
                    : ''
                }`,
                category: 'MATCH_REPORT',
                timestamp: cursorDate,
                relatedTeamId: updatedTour.hostTeamId,
              });
            }
          }
        }
      }
    }

    // Advance tournaments (group completion -> SF -> Final -> Champion) whenever matches finish or WTC cutoff hits
    if (foundOnDate || cursorDate.endsWith('-06-01') || step === totalDays) {
      const tourneyNews = synchronizeAndAdvanceTournaments(updatedCareer, cursorDate);
      generatedNews.push(...tourneyNews);
    }
  }

  updatedCareer.currentDate = targetDate;
  updatedCareer.currentDayIndex = Math.max(
    0,
    diffDays('2026-11-15', targetDate)
  );

  // Mark calendar events for simulated matches
  const simIds = new Set(simulatedMatches.map((m) => m.id));
  updatedCareer.calendar = updatedCareer.calendar.map((ev) =>
    ev.matchId && simIds.has(ev.matchId) ? { ...ev, isSimulated: true } : ev
  );

  // Process player training, recovery & injury healing for User Squad + AI Nations
  const effectiveDays = Math.max(1, totalDays);

  // User team daily progression (chunked up to 30 training ticks for fast multi-month sims, plus exact injury/fatigue healing)
  const userTrainingTicks = Math.min(effectiveDays, 30);
  let userTeamPlayers = getEffectivePlayersByCountry(
    updatedCareer.selectedTeamId,
    updatedCareer,
    true
  );

  for (let d = 0; d < userTrainingTicks; d++) {
    const dayResult = processSquadTrainingDay(
      userTeamPlayers,
      (updatedCareer.playerTrainingFocus || {}) as Record<string, TrainingFocus>,
      false,
      targetDate
    );
    userTeamPlayers = dayResult.updatedPlayers;

    dayResult.changes.forEach((ch) => {
      if (d === userTrainingTicks - 1 && ch.delta >= 1) {
        generatedNews.push({
          id: `news_dev_${ch.playerId}_${targetDate}`,
          title: `Training Breakthrough: ${ch.playerName} Improves ${ch.attributeChanged}`,
          summary: `${ch.playerName} showed measurable progress (+${ch.delta} ${ch.attributeChanged}) under national coaching supervision.`,
          category: 'SQUAD_SELECTION',
          timestamp: targetDate,
          relatedTeamId: updatedCareer.selectedTeamId,
          relatedPlayerId: ch.playerId,
        });
      }
    });
  }

  // If advancing > 30 days at once, ensure remaining injury days & fatigue heal proportionally
  const extraDays = Math.max(0, effectiveDays - userTrainingTicks);
  userTeamPlayers.forEach((up) => {
    if (!updatedCareer.playerOverrides) updatedCareer.playerOverrides = {};
    const remInjury = Math.max(0, (up.injuryDaysRemaining || 0) - extraDays);
    const healed = remInjury === 0;
    updatedCareer.playerOverrides[up.id] = {
      ...(updatedCareer.playerOverrides[up.id] || {}),
      attributes: up.attributes,
      potential: up.potential,
      fitness: up.fitness,
      currentForm: up.currentForm,
      workloadFatigue: Math.max(5, (up.workloadFatigue || 0) - extraDays * 5),
      isInjured: healed ? false : up.isInjured,
      injuryType: healed ? undefined : up.injuryType,
      injuryDaysRemaining: remInjury,
      injurySeverity: healed ? undefined : up.injurySeverity,
      developmentFeedback: up.developmentFeedback,
      developmentHistory: up.developmentHistory,
      testRating: up.testRating,
      odiRating: up.odiRating,
      t20Rating: up.t20Rating,
    };
  });

  // AI world player development & recovery across all other nations!
  const aiDevNews = processAIWorldDevelopment(updatedCareer, effectiveDays, targetDate);
  generatedNews.push(...aiDevNews);

  if (generatedNews.length > 0) {
    // Keep latest 180 news items so history stays rich without unbounded memory growth
    updatedCareer.news = [...generatedNews.reverse(), ...updatedCareer.news].slice(0, 180);
  }

  return {
    updatedCareer,
    simulatedMatches,
    generatedNews,
  };
}

/**
 * Controlled Career Calendar Progression (Phase 10):
 * Advances time according to `mode` ('ONE_DAY' | 'ONE_WEEK' | 'NEXT_EVENT' | 'NEXT_MATCH'),
 * automatically pausing when an important user decision is reached so user actions are NEVER skipped!
 */
export function advanceCareerCalendar(
  career: CareerSave,
  mode: CalendarAdvanceMode
): CalendarAdvancementResult {
  const curDate = career.currentDate || '2026-11-15';

  // 1. Check if there is ALREADY an unplayed user match scheduled on or before `curDate`!
  const dueUserMatch = career.fixtures.find(
    (f) => isPreMatchStatus(f.status) && f.date && f.date <= curDate
  );
  if (dueUserMatch) {
    return {
      updatedCareer: career,
      simulatedMatches: [],
      generatedNews: [],
      pausedReason: 'USER_MATCH_TODAY',
      pausedMessage: `Match Day Ready: ${dueUserMatch.seriesName || dueUserMatch.format} (${dueUserMatch.homeTeamId} vs ${dueUserMatch.awayTeamId}). Prepare your XI and play the match before advancing the calendar.`,
      targetMatchId: dueUserMatch.id,
    };
  }

  // Determine maximum target date for this advancement mode
  const nextUserMatch = career.fixtures.find(
    (f) => isPreMatchStatus(f.status) && f.date && f.date > curDate
  );

  // Ensure future season exists if no upcoming user match left in current year
  let workingCareer = career;
  if (!nextUserMatch) {
    const cloned = cloneCareerForSim(career);
    const nextYr = Math.max(
      Number(curDate.slice(0, 4)) + 1,
      (cloned.seasonsGeneratedThroughYear || 2027) + 1
    );
    generateNextSeasonSchedule(cloned, nextYr);
    workingCareer = cloned;
  }

  const upcomingUserMatch = workingCareer.fixtures.find(
    (f) => isPreMatchStatus(f.status) && f.date && f.date > curDate
  );

  const unannouncedUserTour = (workingCareer.tours || []).find(
    (t) =>
      (t.hostTeamId === workingCareer.selectedTeamId ||
        t.visitingTeamId === workingCareer.selectedTeamId) &&
      !t.squadAnnounced &&
      t.status === 'UPCOMING' &&
      t.squadSelectionDeadline > curDate
  );

  let desiredEndDate = addDaysISO(curDate, 1);
  if (mode === 'ONE_DAY') {
    desiredEndDate = addDaysISO(curDate, 1);
  } else if (mode === 'ONE_WEEK') {
    desiredEndDate = addDaysISO(curDate, 7);
  } else if (mode === 'NEXT_EVENT') {
    const candidates: string[] = [];
    if (upcomingUserMatch?.date) candidates.push(upcomingUserMatch.date);
    if (unannouncedUserTour?.squadSelectionDeadline) {
      candidates.push(unannouncedUserTour.squadSelectionDeadline);
    }
    candidates.sort();
    desiredEndDate = candidates[0] || addDaysISO(curDate, 7);
  } else if (mode === 'NEXT_MATCH') {
    desiredEndDate = upcomingUserMatch?.date || addDaysISO(curDate, 14);
  }

  // Cap stop date so we NEVER skip past an unplayed user match OR an unannounced tour deadline (unless mode === NEXT_MATCH and deadline already passed)
  let actualStopDate = desiredEndDate;
  let pausedReason: CalendarAdvancementResult['pausedReason'] = 'TARGET_REACHED';
  let pausedMessage = `Advanced calendar to ${actualStopDate}.`;
  let targetMatchId: string | undefined;
  let targetTourId: string | undefined;

  if (
    mode !== 'ONE_DAY' &&
    unannouncedUserTour &&
    unannouncedUserTour.squadSelectionDeadline <= actualStopDate &&
    (!upcomingUserMatch?.date ||
      unannouncedUserTour.squadSelectionDeadline < upcomingUserMatch.date)
  ) {
    actualStopDate = unannouncedUserTour.squadSelectionDeadline;
    pausedReason = 'TOUR_SQUAD_DEADLINE';
    pausedMessage = `Calendar paused on ${actualStopDate}: Tour Squad Selection Deadline reached for ${unannouncedUserTour.name}.`;
    targetTourId = unannouncedUserTour.id;
  }

  if (upcomingUserMatch?.date && upcomingUserMatch.date <= actualStopDate) {
    actualStopDate = upcomingUserMatch.date;
    pausedReason = 'USER_MATCH_TODAY';
    pausedMessage = `Calendar reached Match Day (${actualStopDate}): ${upcomingUserMatch.seriesName || upcomingUserMatch.format}.`;
    targetMatchId = upcomingUserMatch.id;
    targetTourId = undefined;
  }

  // Step day-by-day so if a tournament knockout dynamically qualifies the user's team mid-window, we stop right on that new user match!
  const allSimMatches: Match[] = [];
  const allGenNews: NewsArticle[] = [];
  let iterCareer = workingCareer;
  const maxSteps = Math.max(1, diffDays(curDate, actualStopDate));

  for (let s = 1; s <= maxSteps; s++) {
    const stepDate = addDaysISO(curDate, s);
    const stepRes = simulateWorldMatchesUntil(iterCareer, stepDate);
    iterCareer = stepRes.updatedCareer;
    allSimMatches.push(...stepRes.simulatedMatches);
    allGenNews.push(...stepRes.generatedNews);

    const newlyDueMatch = iterCareer.fixtures.find(
      (f) => isPreMatchStatus(f.status) && f.date && f.date <= stepDate
    );
    if (newlyDueMatch) {
      // Check if any player in the user's format Playing XI is injured!
      const fmtCfg = iterCareer.formatSquads[newlyDueMatch.format];
      const effectivePool = getEffectivePlayersByCountry(
        iterCareer.selectedTeamId,
        iterCareer,
        true
      );
      const injuredInXI = effectivePool.filter(
        (p) => fmtCfg.playingXI.includes(p.id) && p.isInjured && (p.injuryDaysRemaining || 0) > 0
      );

      if (injuredInXI.length > 0) {
        return {
          updatedCareer: iterCareer,
          simulatedMatches: allSimMatches,
          generatedNews: allGenNews,
          pausedReason: 'INJURY_IN_XI',
          pausedMessage: `Injury Alert before ${newlyDueMatch.homeTeamId} vs ${newlyDueMatch.awayTeamId}: ${injuredInXI.map((x) => x.shortName).join(', ')} injured! Replace in Match Preparation.`,
          targetMatchId: newlyDueMatch.id,
        };
      }

      return {
        updatedCareer: iterCareer,
        simulatedMatches: allSimMatches,
        generatedNews: allGenNews,
        pausedReason: 'USER_MATCH_TODAY',
        pausedMessage: `Match Day (${stepDate}): ${newlyDueMatch.seriesName || newlyDueMatch.format} (${newlyDueMatch.homeTeamId} vs ${newlyDueMatch.awayTeamId}).`,
        targetMatchId: newlyDueMatch.id,
      };
    }
  }

  return {
    updatedCareer: iterCareer,
    simulatedMatches: allSimMatches,
    generatedNews: allGenNews,
    pausedReason,
    pausedMessage,
    targetMatchId,
    targetTourId,
  };
}

/**
 * Legacy helper preserved for backwards compatibility & unit tests:
 * Updates a tournament table entry after a simulated match using canonical multi-innings outcome logic.
 */
export function recordMatchInTournamentTable(
  table: TournamentTableEntry[],
  match: Match
): TournamentTableEntry[] {
  if (!isTerminalMatchStatus(match.status)) {
    return table;
  }

  const outcome = determineMatchOutcome(match);
  if (outcome.isNoResult) return table;

  return table.map((entry) => {
    if (entry.teamId === match.homeTeamId || entry.teamId === match.awayTeamId) {
      const won = outcome.winnerTeamId === entry.teamId ? 1 : 0;
      const lost =
        outcome.winnerTeamId !== null && outcome.winnerTeamId !== entry.teamId ? 1 : 0;
      const drawn = outcome.isDraw ? 1 : 0;
      const tied = outcome.isTie ? 1 : 0;
      const pts =
        match.format === 'TEST'
          ? won
            ? 12
            : drawn
            ? 4
            : tied
            ? 6
            : 0
          : won
          ? 2
          : tied
          ? 1
          : 0;

      const totalPlayed = entry.played + 1;
      const totalPoints = entry.points + pts;
      const pct =
        match.format === 'TEST'
          ? Number(((totalPoints / (totalPlayed * 12)) * 100).toFixed(2))
          : undefined;

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

  completedMatches
    .filter((m) => m.format === format && isTerminalMatchStatus(m.status))
    .forEach((m) => {
      updatedTable = recordMatchInTournamentTable(updatedTable, m);
    });

  if (format === 'TEST') {
    return updatedTable.sort(
      (a, b) => (b.pointsPercentage || 0) - (a.pointsPercentage || 0)
    );
  }
  return updatedTable.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return (b.netRunRate || 0) - (a.netRunRate || 0);
  });
}
