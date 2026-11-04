import {
  CareerSave,
  Match,
  MatchFormat,
  NewsArticle,
  TournamentEdition,
  TournamentTableEntry,
} from '../types/cricket';
import { VENUES } from '../data/venues';
import { INTERNATIONAL_TEAMS } from '../data/teams';
import {
  getDefaultCaptainId,
  getDefaultPlayingXI,
  getDefaultWicketKeeperId,
} from '../data/squads';
import { createZeroTableForTeams, TEAM_META } from '../data/tournamentData';
import { determineMatchOutcome, isTerminalMatchStatus } from './matchEngine';
import { selectAIPlayingXIForMatch } from './aiTeamEngine';

/**
 * Calculates official WTC PCT% (Percentage of contested points won, accounting for slow-over-rate penalties)
 */
export function calculateWTCPCT(
  points: number,
  matchesPlayed: number,
  pointsForWin = 12,
  penaltyPoints = 0
): number {
  if (matchesPlayed <= 0) return 0;
  const effectivePoints = Math.max(0, points - penaltyPoints);
  const maxContestedPoints = matchesPlayed * pointsForWin;
  return +((effectivePoints / maxContestedPoints) * 100).toFixed(2);
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
      if (b.points !== a.points) return b.points - a.points;
      return b.won - a.won;
    }

    if (b.points !== a.points) return b.points - a.points;

    const nrrA = a.netRunRate || 0;
    const nrrB = b.netRunRate || 0;
    if (nrrB !== nrrA) return nrrB - nrrA;

    return b.won - a.won;
  });
  return sorted;
}

function applyMatchToTableEntries(
  entries: TournamentTableEntry[],
  match: Match,
  rules: TournamentEdition['rules'],
  penalties?: Record<string, number>
): TournamentTableEntry[] {
  const outcome = determineMatchOutcome(match);

  return entries.map((entry) => {
    if (entry.teamId !== match.homeTeamId && entry.teamId !== match.awayTeamId) {
      return entry;
    }

    const isHome = entry.teamId === match.homeTeamId;
    const won = outcome.winnerTeamId === entry.teamId;
    const lost =
      outcome.winnerTeamId !== null &&
      outcome.winnerTeamId !== entry.teamId &&
      !outcome.isDraw &&
      !outcome.isTie &&
      !outcome.isNoResult;

    const pointsGain = outcome.isNoResult
      ? rules.pointsForTie
      : won
      ? rules.pointsForWin
      : outcome.isTie
      ? rules.pointsForTie
      : outcome.isDraw
      ? rules.pointsForDraw
      : rules.pointsForLoss;

    const teamRuns = isHome ? outcome.homeTotalRuns : outcome.awayTotalRuns;
    const oppRuns = isHome ? outcome.awayTotalRuns : outcome.homeTotalRuns;
    const teamOvers = isHome ? outcome.homeEffectiveOvers : outcome.awayEffectiveOvers;
    const oppOvers = isHome ? outcome.awayEffectiveOvers : outcome.homeEffectiveOvers;

    const forR = outcome.isNoResult ? entry.forRuns : entry.forRuns + teamRuns;
    const forO = outcome.isNoResult ? entry.forOvers : +(entry.forOvers + teamOvers).toFixed(2);
    const againstR = outcome.isNoResult ? entry.againstRuns : entry.againstRuns + oppRuns;
    const againstO = outcome.isNoResult ? entry.againstOvers : +(entry.againstOvers + oppOvers).toFixed(2);

    const played = entry.played + 1;
    const rawPts = entry.points + pointsGain;
    const penalty = penalties?.[entry.teamId] || 0;
    const effectivePts = Math.max(0, rawPts - penalty);

    const pct = rules.usePCT ? calculateWTCPCT(rawPts, played, rules.pointsForWin, penalty) : undefined;
    const nrr = !rules.usePCT ? calculateNRR(forR, forO, againstR, againstO) : undefined;

    return {
      ...entry,
      played,
      won: entry.won + (won ? 1 : 0),
      lost: entry.lost + (lost ? 1 : 0),
      drawn: entry.drawn + (outcome.isDraw ? 1 : 0),
      tied: entry.tied + (outcome.isTie ? 1 : 0),
      noResult: entry.noResult + (outcome.isNoResult ? 1 : 0),
      points: effectivePts,
      pointsPercentage: pct,
      netRunRate: nrr,
      forRuns: forR,
      forOvers: forO,
      againstRuns: againstR,
      againstOvers: againstO,
    };
  });
}

/**
 * Incremental update of a tournament edition with a single completed match outcome.
 */
export function recordMatchInTournament(
  tournament: TournamentEdition,
  match: Match
): TournamentEdition {
  const t: TournamentEdition = JSON.parse(JSON.stringify(tournament));
  if (!isTerminalMatchStatus(match.status)) {
    return t;
  }

  if (t.status === 'UPCOMING') {
    t.status = 'IN_PROGRESS';
  }

  // Only Group / League stage matches count toward points tables (Knockout matches decide progression)
  const isKnockout = match.stage === 'SEMI_FINAL' || match.stage === 'FINAL';
  if (!isKnockout) {
    t.table = sortTournamentTable(
      applyMatchToTableEntries(t.table, match, t.rules, t.penalties),
      !!t.rules.usePCT
    );

    if (t.groups && t.groups.length > 0) {
      t.groups = t.groups.map((grp) => {
        if (grp.teamIds.includes(match.homeTeamId) && grp.teamIds.includes(match.awayTeamId)) {
          const updatedGrpTable = sortTournamentTable(
            applyMatchToTableEntries(grp.table, match, t.rules, t.penalties),
            !!t.rules.usePCT
          );
          return { ...grp, table: updatedGrpTable };
        }
        return grp;
      });
    }

    if (t.competitionType === 'WTC' && t.table.length >= 2 && !t.finalMatchId) {
      t.finalistTeamIds = [t.table[0].teamId, t.table[1].teamId];
    }
  } else if (match.stage === 'FINAL') {
    const outcome = determineMatchOutcome(match);
    // In WTC Final, if drawn, top table qualifier or joint holder wins; otherwise outcome.winnerTeamId
    const winnerId = outcome.winnerTeamId || t.finalistTeamIds?.[0] || match.homeTeamId;
    const runnerUpId = winnerId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
    t.winnerTeamId = winnerId;
    t.runnerUpTeamId = runnerUpId;
    t.status = 'COMPLETED';
    t.currentStage = 'COMPLETED';

    const winnerName = TEAM_META[winnerId]?.name || winnerId;
    const runnerUpName = TEAM_META[runnerUpId]?.name || runnerUpId;
    const hostName = t.hostCountryId ? TEAM_META[t.hostCountryId]?.name || t.hostCountryId : 'Neutral';

    if (!t.pastChampions.some((c) => c.year === t.year)) {
      t.pastChampions = [
        {
          year: t.year,
          host: hostName,
          winner: winnerName,
          runnerUp: runnerUpName,
          finalResult: match.resultText || `${winnerName} won the Final`,
        },
        ...t.pastChampions,
      ];
    }
  }

  return t;
}

/**
 * Deterministically recalculates a tournament's full standings, top scorers, and wicket-takers
 * strictly from actual completed fixtures (preventing any duplicate stat drift).
 */
export function recalculateTournamentFromMatches(
  tournament: TournamentEdition,
  allMatches: Match[]
): TournamentEdition {
  const t: TournamentEdition = JSON.parse(JSON.stringify(tournament));
  const usePCT = !!t.rules.usePCT;
  const teamIds =
    t.participatingTeamIds && t.participatingTeamIds.length > 0
      ? t.participatingTeamIds
      : t.table.map((row) => row.teamId);

  t.table = createZeroTableForTeams(teamIds, usePCT);
  if (t.groups && t.groups.length > 0) {
    t.groups = t.groups.map((g) => ({
      ...g,
      table: createZeroTableForTeams(g.teamIds, usePCT),
    }));
  }

  const tournamentMatches = allMatches.filter(
    (m) =>
      (m.tournamentId === t.id || m.competitionId === t.id) &&
      isTerminalMatchStatus(m.status)
  );

  // Track tournament batting & bowling leaders
  const runTotals = new Map<string, { name: string; runs: number }>();
  const wicketTotals = new Map<string, { name: string; wickets: number }>();

  let current = t;
  tournamentMatches.forEach((m) => {
    current = recordMatchInTournament(current, m);

    m.innings.forEach((inn) => {
      inn.batters.forEach((b) => {
        const prev = runTotals.get(b.playerId) || { name: b.playerName, runs: 0 };
        prev.runs += b.runs;
        runTotals.set(b.playerId, prev);
      });
      inn.bowlers.forEach((bw) => {
        const prev = wicketTotals.get(bw.playerId) || { name: bw.playerName, wickets: 0 };
        prev.wickets += bw.wickets;
        wicketTotals.set(bw.playerId, prev);
      });
    });
  });

  // Populate tournament player leaders
  let bestRuns = 0;
  runTotals.forEach((val, pId) => {
    if (val.runs > bestRuns) {
      bestRuns = val.runs;
      current.leadingRunScorer = { playerId: pId, playerName: val.name, runs: val.runs };
    }
  });

  let bestWkts = 0;
  wicketTotals.forEach((val, pId) => {
    if (val.wickets > bestWkts) {
      bestWkts = val.wickets;
      current.leadingWicketTaker = { playerId: pId, playerName: val.name, wickets: val.wickets };
    }
  });

  if (current.status === 'COMPLETED' && (current.leadingRunScorer || current.leadingWicketTaker)) {
    const r = current.leadingRunScorer;
    const w = current.leadingWicketTaker;
    if (r && (!w || r.runs >= w.wickets * 28)) {
      current.playerOfTheTournament = {
        playerId: r.playerId,
        playerName: r.playerName,
        reason: `Tournament leading run-scorer (${r.runs} runs)`,
      };
    } else if (w) {
      current.playerOfTheTournament = {
        playerId: w.playerId,
        playerName: w.playerName,
        reason: `Tournament leading wicket-taker (${w.wickets} wickets)`,
      };
    }
  }

  return current;
}

function addDaysISO(dateStr: string, days: number): string {
  const ms = new Date(dateStr).getTime() + days * 24 * 3600 * 1000;
  return new Date(ms).toISOString().split('T')[0];
}

function buildKnockoutFixture(
  id: string,
  tournament: TournamentEdition,
  homeTeamId: string,
  awayTeamId: string,
  date: string,
  stage: 'SEMI_FINAL' | 'FINAL',
  matchNumber: number,
  career?: CareerSave,
  preferredVenueName?: string
): Match {
  const hostCountry = tournament.hostCountryId || homeTeamId;
  const venuePool = VENUES.filter((v) =>
    preferredVenueName
      ? v.name.toLowerCase().includes(preferredVenueName.toLowerCase())
      : v.countryId === hostCountry
  );
  const vObj = venuePool[matchNumber % Math.max(1, venuePool.length)] || VENUES[0];

  const userTeamId = career?.selectedTeamId || 'IND';
  const isUserMatch = homeTeamId === userTeamId || awayTeamId === userTeamId;
  const fmt = tournament.format;

  const homeCfg =
    career && homeTeamId === userTeamId
      ? career.formatSquads[fmt]
      : career
      ? selectAIPlayingXIForMatch(homeTeamId, fmt, career, vObj.pitch, true)
      : undefined;

  const awayCfg =
    career && awayTeamId === userTeamId
      ? career.formatSquads[fmt]
      : career
      ? selectAIPlayingXIForMatch(awayTeamId, fmt, career, vObj.pitch, true)
      : undefined;

  let seedHash = 0;
  for (let i = 0; i < id.length; i++) seedHash = (seedHash * 31 + id.charCodeAt(i)) | 0;

  return {
    id,
    format: fmt,
    seriesName: `${tournament.name} (${tournament.season}) — ${stage === 'FINAL' ? 'Grand Final' : `Semi-Final ${matchNumber}`}`,
    tournamentId: tournament.id,
    competitionId: tournament.id,
    matchNumber,
    totalMatchesInSeries: stage === 'FINAL' ? 1 : 2,
    homeTeamId,
    awayTeamId,
    venue: preferredVenueName || vObj.name,
    pitch: vObj.pitch,
    weather: vObj.weather,
    date,
    dayNumber: 1,
    sessionNumber: 1,
    status: 'SCHEDULED',
    currentInningsIndex: 0,
    innings: [],
    homeXI: homeCfg?.playingXI || getDefaultPlayingXI(homeTeamId, fmt),
    awayXI: awayCfg?.playingXI || getDefaultPlayingXI(awayTeamId, fmt),
    homeCaptainId: homeCfg?.captainId || getDefaultCaptainId(homeTeamId, fmt),
    awayCaptainId: awayCfg?.captainId || getDefaultCaptainId(awayTeamId, fmt),
    homeWicketKeeperId: homeCfg?.wicketKeeperId || getDefaultWicketKeeperId(homeTeamId, fmt),
    awayWicketKeeperId: awayCfg?.wicketKeeperId || getDefaultWicketKeeperId(awayTeamId, fmt),
    userTeamId,
    isUserMatch,
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
    stage,
    seed: Math.abs(seedHash) + 101,
  };
}

/**
 * Creates the official standalone WTC Final at Lord's between the top 2 teams
 */
export function createWTCFinalMatch(
  team1Id: string,
  team2Id: string,
  date = '2027-06-10',
  venueName = "Lord's Cricket Ground, London",
  tournamentId = 'wtc_2025_27',
  userTeamId = team1Id,
  career?: CareerSave
): Match {
  const neutralVenue =
    VENUES.find((v) => v.name.includes("Lord's") || v.countryId === 'ENG') || VENUES[0];

  const matchId = `match_${tournamentId}_grand_final`;
  const isUserMatch = team1Id === userTeamId || team2Id === userTeamId;

  const homeCfg =
    career && team1Id === userTeamId
      ? career.formatSquads.TEST
      : career
      ? selectAIPlayingXIForMatch(team1Id, 'TEST', career, neutralVenue.pitch, true)
      : undefined;

  const awayCfg =
    career && team2Id === userTeamId
      ? career.formatSquads.TEST
      : career
      ? selectAIPlayingXIForMatch(team2Id, 'TEST', career, neutralVenue.pitch, true)
      : undefined;

  return {
    id: matchId,
    format: 'TEST',
    seriesName: 'ICC World Test Championship Grand Final (Lord’s)',
    tournamentId,
    competitionId: tournamentId,
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
    homeXI: homeCfg?.playingXI || getDefaultPlayingXI(team1Id, 'TEST'),
    awayXI: awayCfg?.playingXI || getDefaultPlayingXI(team2Id, 'TEST'),
    homeCaptainId: homeCfg?.captainId || getDefaultCaptainId(team1Id, 'TEST'),
    awayCaptainId: awayCfg?.captainId || getDefaultCaptainId(team2Id, 'TEST'),
    homeWicketKeeperId: homeCfg?.wicketKeeperId || getDefaultWicketKeeperId(team1Id, 'TEST'),
    awayWicketKeeperId: awayCfg?.wicketKeeperId || getDefaultWicketKeeperId(team2Id, 'TEST'),
    userTeamId,
    isUserMatch,
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
    stage: 'FINAL',
    seed: 20270610 + tournamentId.length * 13,
  };
}

/**
 * Inspects all tournament editions in `career`, recalculates their standings from real matches,
 * and dynamically generates Semi-Finals, Finals, and Champions as stages complete!
 */
export function synchronizeAndAdvanceTournaments(
  career: CareerSave,
  currentDate: string
): NewsArticle[] {
  const generatedNews: NewsArticle[] = [];
  if (!career.tournamentEditions) return generatedNews;

  const registerGeneratedMatch = (m: Match) => {
    const exists =
      career.fixtures.some((x) => x.id === m.id) ||
      career.worldFixtures.some((x) => x.id === m.id);
    if (exists) return;

    if (m.isUserMatch) {
      career.fixtures.push(m);
      career.fixtures.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    } else {
      career.worldFixtures.push(m);
      career.worldFixtures.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    }

    const startDateMs = new Date('2026-11-15').getTime();
    const dayIndex = Math.max(
      0,
      Math.round((new Date(m.date || currentDate).getTime() - startDateMs) / (24 * 3600 * 1000))
    );
    career.calendar.push({
      id: `ev_ko_${m.id}`,
      date: m.date || currentDate,
      dayIndex,
      type: m.isUserMatch ? 'USER_MATCH' : 'WORLD_MATCH',
      title: `${m.format} ${m.stage === 'FINAL' ? 'FINAL' : 'SEMI-FINAL'}: ${m.homeTeamId} vs ${m.awayTeamId}`,
      description: `${m.seriesName} at ${m.venue}`,
      countryId: m.homeTeamId,
      format: m.format,
      matchId: m.id,
      tournamentId: m.tournamentId,
    });
    career.calendar.sort((a, b) => a.date.localeCompare(b.date));
  };

  career.tournamentEditions = career.tournamentEditions.map((origEdition) => {
    const wasCompleted = origEdition.status === 'COMPLETED';
    const allMatches = [...career.fixtures, ...career.worldFixtures];
    const t = recalculateTournamentFromMatches(origEdition, allMatches);

    // Check if tournament just completed its Final!
    if (!wasCompleted && t.status === 'COMPLETED' && t.winnerTeamId) {
      const winnerTeam = INTERNATIONAL_TEAMS.find((tm) => tm.id === t.winnerTeamId);
      const trophyLabel = `${t.name} (${t.year})`;
      if (
        t.winnerTeamId === career.selectedTeamId &&
        !career.manager.trophies.includes(trophyLabel)
      ) {
        career.manager.trophies = [...career.manager.trophies, trophyLabel];
        career.manager.reputation = Math.min(100, career.manager.reputation + 8);
        career.manager.boardConfidence = Math.min(100, career.manager.boardConfidence + 10);
      }

      generatedNews.push({
        id: `news_champ_${t.id}_${t.year}`,
        title: `CHAMPIONS! ${winnerTeam?.name || t.winnerTeamId} Win the ${t.name} (${t.season})!`,
        summary: `${winnerTeam?.name || t.winnerTeamId} defeated ${TEAM_META[t.runnerUpTeamId || '']?.name || t.runnerUpTeamId} in the Grand Final to lift the ${t.name} trophy!`,
        category: 'TOURNAMENT',
        timestamp: currentDate,
        relatedTeamId: t.winnerTeamId,
      });
      return t;
    }

    if (t.status === 'COMPLETED') return t;

    const editionMatches = allMatches.filter(
      (m) => m.tournamentId === t.id || m.competitionId === t.id
    );

    // 1. WTC League -> Standalone Lord's Final
    if (t.competitionType === 'WTC') {
      const leagueMatches = editionMatches.filter((m) => m.stage !== 'FINAL');
      const completedLeague = leagueMatches.filter((m) => isTerminalMatchStatus(m.status));
      const cutoffReached = t.cutoffDate ? currentDate >= t.cutoffDate : false;
      const allLeagueDone =
        leagueMatches.length > 0 && completedLeague.length === leagueMatches.length;

      if (!t.finalMatchId && completedLeague.length >= 4 && (cutoffReached || allLeagueDone)) {
        const top1 = t.table[0]?.teamId;
        const top2 = t.table[1]?.teamId;
        if (top1 && top2) {
          const finalDate =
            currentDate >= `${t.year}-06-10` ? addDaysISO(currentDate, 5) : `${t.year}-06-10`;
          const finalMatch = createWTCFinalMatch(
            top1,
            top2,
            finalDate,
            "Lord's Cricket Ground, London",
            t.id,
            career.selectedTeamId,
            career
          );
          t.finalistTeamIds = [top1, top2];
          t.finalMatchId = finalMatch.id;
          t.currentStage = 'FINAL';
          registerGeneratedMatch(finalMatch);

          generatedNews.push({
            id: `news_wtc_qual_${t.id}`,
            title: `WTC Finalists Confirmed: ${TEAM_META[top1]?.name || top1} vs ${TEAM_META[top2]?.name || top2} at Lord’s!`,
            summary: `${TEAM_META[top1]?.name || top1} (${t.table[0].pointsPercentage}% PCT) and ${TEAM_META[top2]?.name || top2} (${t.table[1].pointsPercentage}% PCT) have topped the World Test Championship standings and advance to the Grand Final on ${finalDate}.`,
            category: 'TOURNAMENT',
            timestamp: currentDate,
            relatedTeamId: top1,
          });
        }
      }
      return t;
    }

    // 2. Tri-Series -> Top 2 Directly to Final
    if (t.competitionType === 'TRI_SERIES') {
      const groupMatches = editionMatches.filter((m) => m.stage !== 'FINAL');
      const allGroupDone =
        groupMatches.length > 0 && groupMatches.every((m) => isTerminalMatchStatus(m.status));

      if (allGroupDone && !t.finalMatchId && t.table.length >= 2) {
        const lastGroupDate =
          groupMatches
            .map((m) => m.date || currentDate)
            .sort()
            .pop() || currentDate;
        const finalDate = addDaysISO(
          lastGroupDate > currentDate ? lastGroupDate : currentDate,
          3
        );
        const top1 = t.table[0].teamId;
        const top2 = t.table[1].teamId;
        const finalMatch = buildKnockoutFixture(
          `match_${t.id}_final`,
          t,
          top1,
          top2,
          finalDate,
          'FINAL',
          1,
          career
        );
        t.finalistTeamIds = [top1, top2];
        t.finalMatchId = finalMatch.id;
        t.currentStage = 'FINAL';
        registerGeneratedMatch(finalMatch);

        generatedNews.push({
          id: `news_tri_final_${t.id}`,
          title: `${t.name} Final Set: ${TEAM_META[top1]?.name || top1} vs ${TEAM_META[top2]?.name || top2}`,
          summary: `Following the round-robin stage, ${TEAM_META[top1]?.name || top1} and ${TEAM_META[top2]?.name || top2} advance to the Tri-Series Final on ${finalDate}.`,
          category: 'TOURNAMENT',
          timestamp: currentDate,
          relatedTeamId: top1,
        });
      }
      return t;
    }

    // 3. Multi-Group Tournaments (ODI World Cup, T20 World Cup, Champions Trophy, Asia Cup)
    // Stage 1: Group Stage -> Semi-Finals
    const groupMatches = editionMatches.filter(
      (m) => !m.stage || m.stage === 'GROUP' || m.stage === 'LEAGUE'
    );
    const allGroupDone =
      groupMatches.length > 0 && groupMatches.every((m) => isTerminalMatchStatus(m.status));

    const existingSFs = editionMatches.filter((m) => m.stage === 'SEMI_FINAL');

    if (allGroupDone && existingSFs.length === 0) {
      let sf1Home = '';
      let sf1Away = '';
      let sf2Home = '';
      let sf2Away = '';

      if (t.groups && t.groups.length >= 2) {
        const gA = t.groups[0].table;
        const gB = t.groups[1].table;
        sf1Home = gA[0]?.teamId;
        sf1Away = gB[1]?.teamId;
        sf2Home = gB[0]?.teamId;
        sf2Away = gA[1]?.teamId;
      } else if (t.table.length >= 4) {
        sf1Home = t.table[0].teamId;
        sf1Away = t.table[3].teamId;
        sf2Home = t.table[1].teamId;
        sf2Away = t.table[2].teamId;
      }

      if (sf1Home && sf1Away && sf2Home && sf2Away) {
        const lastGroupDate =
          groupMatches
            .map((m) => m.date || currentDate)
            .sort()
            .pop() || currentDate;
        const baseDate = lastGroupDate > currentDate ? lastGroupDate : currentDate;
        const sf1Date = addDaysISO(baseDate, 3);
        const sf2Date = addDaysISO(baseDate, 4);

        const sf1 = buildKnockoutFixture(
          `match_${t.id}_sf1`,
          t,
          sf1Home,
          sf1Away,
          sf1Date,
          'SEMI_FINAL',
          1,
          career
        );
        const sf2 = buildKnockoutFixture(
          `match_${t.id}_sf2`,
          t,
          sf2Home,
          sf2Away,
          sf2Date,
          'SEMI_FINAL',
          2,
          career
        );

        t.semiFinalMatchIds = [sf1.id, sf2.id];
        t.currentStage = 'SEMI_FINAL';
        registerGeneratedMatch(sf1);
        registerGeneratedMatch(sf2);

        generatedNews.push({
          id: `news_sf_${t.id}`,
          title: `${t.name} Semi-Finals Confirmed!`,
          summary: `Semi-Final 1: ${TEAM_META[sf1Home]?.name || sf1Home} vs ${TEAM_META[sf1Away]?.name || sf1Away} (${sf1Date}). Semi-Final 2: ${TEAM_META[sf2Home]?.name || sf2Home} vs ${TEAM_META[sf2Away]?.name || sf2Away} (${sf2Date}).`,
          category: 'TOURNAMENT',
          timestamp: currentDate,
        });
      }
      return t;
    }

    // Stage 2: Semi-Finals -> Grand Final
    const refreshedAll = [...career.fixtures, ...career.worldFixtures];
    const sfMatches = refreshedAll.filter(
      (m) => (m.tournamentId === t.id || m.competitionId === t.id) && m.stage === 'SEMI_FINAL'
    );
    const allSFsDone =
      sfMatches.length >= 2 && sfMatches.every((m) => isTerminalMatchStatus(m.status));

    if (allSFsDone && !t.finalMatchId) {
      const out1 = determineMatchOutcome(sfMatches[0]);
      const out2 = determineMatchOutcome(sfMatches[1]);
      const f1 = out1.winnerTeamId || sfMatches[0].homeTeamId;
      const f2 = out2.winnerTeamId || sfMatches[1].homeTeamId;

      const lastSfDate =
        sfMatches
          .map((m) => m.date || currentDate)
          .sort()
          .pop() || currentDate;
      const finalDate = addDaysISO(lastSfDate > currentDate ? lastSfDate : currentDate, 4);

      const finalMatch = buildKnockoutFixture(
        `match_${t.id}_final`,
        t,
        f1,
        f2,
        finalDate,
        'FINAL',
        1,
        career
      );

      t.finalistTeamIds = [f1, f2];
      t.finalMatchId = finalMatch.id;
      t.currentStage = 'FINAL';
      registerGeneratedMatch(finalMatch);

      generatedNews.push({
        id: `news_final_${t.id}`,
        title: `${t.name} Grand Final Set: ${TEAM_META[f1]?.name || f1} vs ${TEAM_META[f2]?.name || f2}!`,
        summary: `${TEAM_META[f1]?.name || f1} and ${TEAM_META[f2]?.name || f2} won their Semi-Finals and will clash for the ${t.name} title on ${finalDate}!`,
        category: 'TOURNAMENT',
        timestamp: currentDate,
        relatedTeamId: f1,
      });
    }

    return t;
  });

  return generatedNews;
}
