import {
  CareerSave,
  Match,
  MatchFormat,
  NewsArticle,
  NotificationItem,
  Player,
  PlayerRankingCategory,
  PlayerRankingEntry,
  PlayerRankingState,
  TeamRankingEntry,
  TeamRankingSnapshot,
  TeamRankingState,
} from '../types/cricket';
import { INTERNATIONAL_TEAMS } from '../data/teams';
import { ALL_PLAYERS, getCombinedFormatStats, getEffectivePlayer } from '../data/squads';
import { determineMatchOutcome } from './matchEngine';

/**
 * Baseline international match counts per team and format as of 2026.
 */
const BASELINE_MATCH_COUNTS: Record<string, Record<MatchFormat, number>> = {
  IND: { TEST: 32, ODI: 42, T20I: 56 },
  AUS: { TEST: 34, ODI: 38, T20I: 48 },
  ENG: { TEST: 36, ODI: 36, T20I: 52 },
  RSA: { TEST: 28, ODI: 34, T20I: 44 },
  NZL: { TEST: 28, ODI: 32, T20I: 46 },
  PAK: { TEST: 26, ODI: 35, T20I: 54 },
  SL:  { TEST: 24, ODI: 36, T20I: 42 },
  BAN: { TEST: 22, ODI: 34, T20I: 44 },
  WI:  { TEST: 22, ODI: 32, T20I: 48 },
  AFG: { TEST: 10, ODI: 26, T20I: 40 },
  IRE: { TEST: 8,  ODI: 24, T20I: 38 },
  ZIM: { TEST: 8,  ODI: 22, T20I: 36 },
  SCO: { TEST: 0,  ODI: 18, T20I: 28 },
  NED: { TEST: 0,  ODI: 20, T20I: 26 },
  NEP: { TEST: 0,  ODI: 16, T20I: 24 },
  NAM: { TEST: 0,  ODI: 14, T20I: 22 },
  USA: { TEST: 0,  ODI: 16, T20I: 24 },
  CAN: { TEST: 0,  ODI: 14, T20I: 20 },
  OMA: { TEST: 0,  ODI: 14, T20I: 22 },
  UAE: { TEST: 0,  ODI: 16, T20I: 26 },
  PNG: { TEST: 0,  ODI: 12, T20I: 18 },
  IDN: { TEST: 0,  ODI: 0,  T20I: 12 },
};

export const DEFAULT_MIN_ELIGIBILITY: Record<MatchFormat, number> = {
  TEST: 3,
  ODI: 5,
  T20I: 8,
};

/**
 * Initializes team rankings with matches, totalPoints (rating * matches), and history
 */
export function initializeDetailedTeamRankings(): Record<string, TeamRankingState> {
  const map: Record<string, TeamRankingState> = {};
  INTERNATIONAL_TEAMS.forEach((t) => {
    const counts = BASELINE_MATCH_COUNTS[t.id] || { TEST: 10, ODI: 15, T20I: 20 };
    const ratings = { ...t.ratingPoints };
    const matches = { ...counts };
    const totalPoints = {
      TEST: Math.round(ratings.TEST * matches.TEST),
      ODI: Math.round(ratings.ODI * matches.ODI),
      T20I: Math.round(ratings.T20I * matches.T20I),
    };
    map[t.id] = {
      teamId: t.id,
      ratingPoints: ratings,
      worldRankings: { ...t.worldRankings },
      matches,
      totalPoints,
      previousRankings: { ...t.worldRankings },
      highestRankings: { ...t.worldRankings },
    };
  });
  recomputeDetailedRankingPositions(map);
  return map;
}

/**
 * Recomputes positions, ranking movement, and rating = totalPoints / matches
 */
export function recomputeDetailedRankingPositions(
  rankingsMap: Record<string, TeamRankingState>
): void {
  (['TEST', 'ODI', 'T20I'] as MatchFormat[]).forEach((fmt) => {
    const list = Object.values(rankingsMap);
    list.sort((a, b) => {
      const ratA = a.ratingPoints[fmt] ?? 0;
      const ratB = b.ratingPoints[fmt] ?? 0;
      if (ratB !== ratA) return ratB - ratA;
      const ptsA = a.totalPoints?.[fmt] ?? 0;
      const ptsB = b.totalPoints?.[fmt] ?? 0;
      return ptsB - ptsA;
    });

    list.forEach((entry, idx) => {
      const newPos = idx + 1;
      if (!entry.previousRankings) {
        entry.previousRankings = { ...entry.worldRankings };
      }
      if (!entry.highestRankings) {
        entry.highestRankings = { ...entry.worldRankings };
      }
      entry.worldRankings[fmt] = newPos;
      if (newPos < (entry.highestRankings[fmt] || 999)) {
        entry.highestRankings[fmt] = newPos;
      }
    });
  });
}

/**
 * Generates an initial ranking snapshot for the career Day 1.
 */
export function createTeamRankingSnapshot(
  rankingsMap: Record<string, TeamRankingState>,
  dateStr: string,
  label: string = 'Season Opening Snapshot'
): TeamRankingSnapshot {
  const snapshot: TeamRankingSnapshot = {
    date: dateStr,
    label,
    rankings: {
      TEST: [],
      ODI: [],
      T20I: [],
    },
  };

  (['TEST', 'ODI', 'T20I'] as MatchFormat[]).forEach((fmt) => {
    const sorted = Object.values(rankingsMap)
      .map((entry) => ({
        teamId: entry.teamId,
        position: entry.worldRankings[fmt] || 99,
        rating: entry.ratingPoints[fmt] || 0,
        points: entry.totalPoints?.[fmt] || 0,
        matches: entry.matches?.[fmt] || 0,
      }))
      .sort((a, b) => a.position - b.position);

    snapshot.rankings[fmt] = sorted;
  });

  return snapshot;
}

/**
 * Returns formatted table rows for the Team Rankings UI
 */
export function getSortedTeamRankingEntries(
  rankingsMap: Record<string, TeamRankingState>,
  format: MatchFormat
): TeamRankingEntry[] {
  const entries: TeamRankingEntry[] = [];
  const metaMap = new Map(INTERNATIONAL_TEAMS.map((t) => [t.id, t]));

  Object.values(rankingsMap).forEach((st) => {
    const meta = metaMap.get(st.teamId);
    const pos = st.worldRankings[format] || 99;
    const prev = st.previousRankings?.[format] || pos;
    const high = st.highestRankings?.[format] || pos;
    const movement = prev - pos; // e.g. prev 3, cur 2 => +1 (moved up)

    entries.push({
      teamId: st.teamId,
      name: meta?.name || st.teamId,
      code: meta?.code || st.teamId,
      flagEmoji: meta?.flagEmoji || '🏏',
      position: pos,
      previousPosition: prev,
      highestPosition: high,
      movement,
      matches: st.matches?.[format] || BASELINE_MATCH_COUNTS[st.teamId]?.[format] || 20,
      points: st.totalPoints?.[format] || Math.round((st.ratingPoints[format] || 70) * 20),
      rating: st.ratingPoints[format] || 70,
    });
  });

  return entries.sort((a, b) => a.position - b.position);
}

/**
 * Transparent deterministic ICM International Rating System update:
 * Evaluates match result against expected outcome based on pre-match rating differential.
 * Awards match points, scales by match importance, and maintains moving averages.
 */
export function updateTeamRankingsAfterMatch(
  career: CareerSave,
  match: Match
): {
  updatedRankings: Record<string, TeamRankingState>;
  rankingNews: NewsArticle[];
  newSnapshot: TeamRankingSnapshot;
  snapshot: TeamRankingSnapshot;
  notifications: NotificationItem[];
} {
  const rankings: Record<string, TeamRankingState> = career.teamRankings
    ? JSON.parse(JSON.stringify(career.teamRankings))
    : initializeDetailedTeamRankings();

  const rankingNews: NewsArticle[] = [];
  const fmt = match.format;

  const homeState = rankings[match.homeTeamId];
  const awayState = rankings[match.awayTeamId];
  if (!homeState || !awayState) {
    const fallbackSnapshot = createTeamRankingSnapshot(rankings, match.date || career.currentDate);
    return {
      updatedRankings: rankings,
      rankingNews,
      newSnapshot: fallbackSnapshot,
      snapshot: fallbackSnapshot,
      notifications: [],
    };
  }

  // Ensure detailed subfields exist on legacy saves
  if (!homeState.matches) homeState.matches = { ...BASELINE_MATCH_COUNTS[match.homeTeamId] || { TEST: 20, ODI: 25, T20I: 30 } };
  if (!awayState.matches) awayState.matches = { ...BASELINE_MATCH_COUNTS[match.awayTeamId] || { TEST: 20, ODI: 25, T20I: 30 } };
  if (!homeState.totalPoints) homeState.totalPoints = {
    TEST: Math.round(homeState.ratingPoints.TEST * homeState.matches.TEST),
    ODI: Math.round(homeState.ratingPoints.ODI * homeState.matches.ODI),
    T20I: Math.round(homeState.ratingPoints.T20I * homeState.matches.T20I),
  };
  if (!awayState.totalPoints) awayState.totalPoints = {
    TEST: Math.round(awayState.ratingPoints.TEST * awayState.matches.TEST),
    ODI: Math.round(awayState.ratingPoints.ODI * awayState.matches.ODI),
    T20I: Math.round(awayState.ratingPoints.T20I * awayState.matches.T20I),
  };
  if (!homeState.previousRankings) homeState.previousRankings = { ...homeState.worldRankings };
  if (!awayState.previousRankings) awayState.previousRankings = { ...awayState.worldRankings };
  if (!homeState.highestRankings) homeState.highestRankings = { ...homeState.worldRankings };
  if (!awayState.highestRankings) awayState.highestRankings = { ...awayState.worldRankings };

  // Store pre-match positions for movement detection
  const preLeader = Object.values(rankings).find((r) => r.worldRankings[fmt] === 1)?.teamId;
  const userPrePos = rankings[career.selectedTeamId]?.worldRankings[fmt];

  // Save previous ranks
  homeState.previousRankings[fmt] = homeState.worldRankings[fmt];
  awayState.previousRankings[fmt] = awayState.worldRankings[fmt];

  const outcome = determineMatchOutcome(match);
  if (outcome.isNoResult) {
    const fallbackSnap = createTeamRankingSnapshot(rankings, match.date || career.currentDate);
    return {
      updatedRankings: rankings,
      rankingNews,
      newSnapshot: fallbackSnap,
      snapshot: fallbackSnap,
      notifications: [],
    };
  }

  // Match Importance multiplier
  let importanceWeight = 1.0;
  if (match.stage === 'FINAL') importanceWeight = 1.5;
  else if (match.stage === 'SEMI_FINAL') importanceWeight = 1.35;
  else if (match.stage === 'SUPER_EIGHT') importanceWeight = 1.2;
  else if (match.tournamentId) importanceWeight = 1.15;
  else if (match.competitionId === 'the_ashes' || match.competitionId === 'border_gavaskar') importanceWeight = 1.1;

  const rHome = homeState.ratingPoints[fmt];
  const rAway = awayState.ratingPoints[fmt];
  const diff = rHome - rAway;

  let earnedHomePts: number;
  let earnedAwayPts: number;

  if (outcome.isDraw || outcome.isTie) {
    earnedHomePts = Math.round(rAway);
    earnedAwayPts = Math.round(rHome);
  } else if (outcome.winnerTeamId === match.homeTeamId) {
    if (diff <= 40 && diff >= -40) {
      earnedHomePts = rAway + 50;
      earnedAwayPts = rHome - 50;
    } else if (diff > 40) {
      earnedHomePts = rHome + 10;
      earnedAwayPts = rAway - 10;
    } else {
      // Underdog won
      earnedHomePts = rAway + 90;
      earnedAwayPts = rHome - 90;
    }
  } else {
    // Away won
    if (diff <= 40 && diff >= -40) {
      earnedAwayPts = rHome + 50;
      earnedHomePts = rAway - 50;
    } else if (diff < -40) {
      earnedAwayPts = rAway + 10;
      earnedHomePts = rHome - 10;
    } else {
      // Underdog away won
      earnedAwayPts = rHome + 90;
      earnedHomePts = rAway - 90;
    }
  }

  // Controlled decay & moving average:
  // Add match count + 1, add weighted earned points, divide by new matches count
  homeState.matches[fmt] = (homeState.matches[fmt] || 20) + 1;
  awayState.matches[fmt] = (awayState.matches[fmt] || 20) + 1;

  homeState.totalPoints[fmt] = Math.max(
    100,
    Math.round(homeState.totalPoints[fmt] + earnedHomePts * importanceWeight)
  );
  awayState.totalPoints[fmt] = Math.max(
    100,
    Math.round(awayState.totalPoints[fmt] + earnedAwayPts * importanceWeight)
  );

  homeState.ratingPoints[fmt] = Math.max(
    15,
    Math.round(homeState.totalPoints[fmt] / homeState.matches[fmt])
  );
  awayState.ratingPoints[fmt] = Math.max(
    15,
    Math.round(awayState.totalPoints[fmt] / awayState.matches[fmt])
  );

  recomputeDetailedRankingPositions(rankings);

  // Check if leadership changed or user's position moved
  const newLeader = Object.values(rankings).find((r) => r.worldRankings[fmt] === 1)?.teamId;
  const userPostPos = rankings[career.selectedTeamId]?.worldRankings[fmt];

  if (newLeader && preLeader && newLeader !== preLeader) {
    const leaderTeam = INTERNATIONAL_TEAMS.find((t) => t.id === newLeader);
    rankingNews.push({
      id: `news_rank_${fmt}_leader_${newLeader}_${match.id}`,
      title: `ICM Rankings Shake-Up: ${leaderTeam?.name || newLeader} Take World No. 1 in ${fmt}!`,
      summary: `${leaderTeam?.name || newLeader} (${rankings[newLeader].ratingPoints[fmt]} rating pts) have displaced ${preLeader} atop the ICM International ${fmt} Rankings.`,
      category: 'RANKINGS',
      timestamp: match.date || career.currentDate,
      relatedTeamId: newLeader,
    });
  }

  if (userPrePos && userPostPos && userPrePos !== userPostPos) {
    const userTeam = INTERNATIONAL_TEAMS.find((t) => t.id === career.selectedTeamId);
    const movedUp = userPostPos < userPrePos;
    rankingNews.push({
      id: `news_rank_${fmt}_user_${match.id}`,
      title: `${userTeam?.name || career.selectedTeamId} Move to #${userPostPos} in ${fmt} Rankings!`,
      summary: `Following recent international fixtures, ${userTeam?.name || career.selectedTeamId} have ${movedUp ? 'climbed' : 'dropped'} to position #${userPostPos} (${rankings[career.selectedTeamId].ratingPoints[fmt]} rating).`,
      category: 'RANKINGS',
      timestamp: match.date || career.currentDate,
      relatedTeamId: career.selectedTeamId,
    });
  }

  const snapshot = createTeamRankingSnapshot(
    rankings,
    match.date || career.currentDate,
    `Post-${match.format} Update (${match.homeTeamId} vs ${match.awayTeamId})`
  );

  const notifications: NotificationItem[] = [];
  if (userPrePos && userPostPos && userPrePos !== userPostPos) {
    const userTeam = INTERNATIONAL_TEAMS.find((t) => t.id === career.selectedTeamId);
    const movedUp = userPostPos < userPrePos;
    notifications.push({
      id: `notif_rank_${fmt}_${match.id}`,
      title: `${fmt} Ranking Shift: #${userPostPos}`,
      message: `${userTeam?.name || career.selectedTeamId} moved ${movedUp ? 'up' : 'down'} to #${userPostPos} in the official ${fmt} rankings.`,
      date: match.date || career.currentDate,
      type: 'RANKING_CHANGE',
      read: false,
      actionTab: 'RANKINGS',
    });
  }

  return {
    updatedRankings: rankings,
    rankingNews,
    newSnapshot: snapshot,
    snapshot,
    notifications,
  };
}

/**
 * Computes 9 separate international player rankings:
 * TEST Batters, TEST Bowlers, TEST All-Rounders
 * ODI Batters, ODI Bowlers, ODI All-Rounders
 * T20I Batters, T20I Bowlers, T20I All-Rounders
 */
export function computeAllPlayerRankings(
  career: CareerSave,
  minEligibilityOverrides?: Partial<Record<MatchFormat, number>>
): PlayerRankingState {
  const minEligibility = {
    TEST: minEligibilityOverrides?.TEST ?? DEFAULT_MIN_ELIGIBILITY.TEST,
    ODI: minEligibilityOverrides?.ODI ?? DEFAULT_MIN_ELIGIBILITY.ODI,
    T20I: minEligibilityOverrides?.T20I ?? DEFAULT_MIN_ELIGIBILITY.T20I,
  };

  const pool = [...ALL_PLAYERS, ...(career.emergingPlayers || [])]
    .map((p) => getEffectivePlayer(p, career) || p)
    .filter((p) => p.status !== 'RETIRED' && p.gender !== 'FEMALE');

  const prevRankings = career.playerRankings?.rankings;

  const resultRankings: Record<MatchFormat, Record<PlayerRankingCategory, PlayerRankingEntry[]>> = {
    TEST: { BATTER: [], BOWLER: [], ALL_ROUNDER: [] },
    ODI: { BATTER: [], BOWLER: [], ALL_ROUNDER: [] },
    T20I: { BATTER: [], BOWLER: [], ALL_ROUNDER: [] },
  };

  (['TEST', 'ODI', 'T20I'] as MatchFormat[]).forEach((fmt) => {
    const minMat = minEligibility[fmt];

    (['BATTER', 'BOWLER', 'ALL_ROUNDER'] as PlayerRankingCategory[]).forEach((cat) => {
      const candidates = pool.filter((p) => {
        if (cat === 'BATTER') {
          return p.role === 'BATTER' || p.role === 'WICKETKEEPER_BATTER';
        }
        if (cat === 'BOWLER') {
          return p.role === 'BOWLER';
        }
        return p.role === 'ALL_ROUNDER';
      });

      const scored = candidates.map((p) => {
        const stats = getCombinedFormatStats(p, fmt);
        const simStats = p.simulatedStats?.[fmt];
        const isEligible = stats.matches >= minMat;

        let baseRating = fmt === 'TEST' ? p.testRating : fmt === 'ODI' ? p.odiRating : p.t20Rating;

        // Attribute & Performance formula
        if (cat === 'BATTER') {
          const avgBonus = Math.min(15, Math.max(-10, (stats.average - 38) * 0.4));
          const srBonus = fmt === 'TEST' ? 0 : fmt === 'ODI' ? (stats.strikeRate - 85) * 0.1 : (stats.strikeRate - 130) * 0.15;
          const simFormBonus = (simStats?.runs || 0) > 200 ? 3 : 0;
          baseRating = Math.max(30, Math.min(99, Math.round(baseRating + avgBonus + srBonus + simFormBonus)));
        } else if (cat === 'BOWLER') {
          const avgBonus = stats.bowlingAverage > 0 ? Math.min(15, Math.max(-10, (28 - stats.bowlingAverage) * 0.5)) : 0;
          const econBonus = fmt === 'TEST' ? (3.2 - stats.economy) * 2 : (5.5 - stats.economy) * 1.5;
          const simFormBonus = (simStats?.wickets || 0) >= 10 ? 3 : 0;
          baseRating = Math.max(30, Math.min(99, Math.round(baseRating + avgBonus + econBonus + simFormBonus)));
        } else {
          // All-Rounder
          const batPart = stats.average * 0.45;
          const bowlPart = stats.wickets > 0 ? Math.max(0, 35 - stats.bowlingAverage) * 0.5 : 0;
          baseRating = Math.max(30, Math.min(99, Math.round(baseRating * 0.7 + batPart + bowlPart)));
        }

        const prevList = prevRankings?.[fmt]?.[cat] || [];
        const existingEntry = prevList.find((e) => e.playerId === p.id);
        const prevRank = existingEntry?.rank || 999;
        const highestRank = Math.min(existingEntry?.highestRank || 999, prevRank);

        return {
          playerId: p.id,
          playerName: p.name,
          countryId: p.countryId,
          countryName: p.countryName,
          format: fmt,
          category: cat,
          rating: baseRating,
          matchesPlayed: stats.matches,
          isEligible,
          previousRank: prevRank === 999 ? 0 : prevRank,
          highestRank,
          highlightStats:
            cat === 'BATTER'
              ? `${stats.runs} runs @ ${stats.average} avg (${stats.centuries} 100s)`
              : cat === 'BOWLER'
              ? `${stats.wickets} wkts @ ${stats.bowlingAverage} avg (BBI ${stats.bestBowlingWickets}/${stats.bestBowlingRuns})`
              : `${stats.runs} runs, ${stats.wickets} wkts`,
        };
      });

      // Filter eligible first, sort by rating desc, then matchesPlayed desc
      scored.sort((a, b) => {
        if (a.isEligible !== b.isEligible) return a.isEligible ? -1 : 1;
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.matchesPlayed - a.matchesPlayed;
      });

      const rankedList: PlayerRankingEntry[] = scored.map((item, idx) => {
        const curRank = idx + 1;
        const movement = item.previousRank > 0 ? item.previousRank - curRank : 0;
        const highest = Math.min(item.highestRank || curRank, curRank);
        return {
          ...item,
          rank: curRank,
          highestRank: highest,
          movement,
        };
      });

      resultRankings[fmt][cat] = rankedList;
    });
  });

  return {
    lastUpdatedDate: career.currentDate || '2026-11-15',
    rankings: resultRankings,
    minimumEligibility: minEligibility,
  };
}
