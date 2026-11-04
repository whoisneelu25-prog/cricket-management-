import {
  AISelectionStrategy,
  AITeamManagementState,
  CareerSave,
  FormatSquadConfig,
  Match,
  MatchFormat,
  NewsArticle,
  PitchCondition,
  Player,
  PlayerRole,
  TeamRankingState,
} from '../types/cricket';
import { INTERNATIONAL_TEAMS } from '../data/teams';
import {
  ALL_PLAYERS,
  createEmptyFormatStats,
  getDefaultFormatSquadConfig,
  getEffectivePlayer,
  getEffectivePlayersByCountry,
} from '../data/squads';
import { calculateOverallAbility } from './playerDevelopmentEngine';
import { determineMatchOutcome, mulberry32 } from './matchEngine';

const STRATEGY_BY_COUNTRY: Record<string, AISelectionStrategy> = {
  ENG: 'AGGRESSIVE',
  AUS: 'PACE_HEAVY',
  RSA: 'PACE_HEAVY',
  IND: 'SPIN_HEAVY',
  SL: 'SPIN_HEAVY',
  BAN: 'SPIN_HEAVY',
  AFG: 'SPIN_HEAVY',
  PAK: 'YOUTH_FOCUS',
  WI: 'AGGRESSIVE',
  IRE: 'YOUTH_FOCUS',
  NZL: 'BALANCED',
  ZIM: 'EXPERIENCE_FIRST',
};

const SPIN_STYLES = new Set([
  'OFF_BREAK',
  'LEG_BREAK',
  'SLOW_LEFT_ARM',
  'LEFT_ARM_WRIST_SPIN',
]);

export function getNationalAIStrategy(teamId: string): AISelectionStrategy {
  return STRATEGY_BY_COUNTRY[teamId] || 'BALANCED';
}

/**
 * Initializes independent AI management states for every country EXCEPT `userTeamId`.
 */
export function initializeAITeams(
  userTeamId: string,
  career?: CareerSave
): Record<string, AITeamManagementState> {
  const aiTeams: Record<string, AITeamManagementState> = {};

  INTERNATIONAL_TEAMS.forEach((team) => {
    if (team.id === userTeamId) return;

    const testCfg = buildAISquadConfig(team.id, 'TEST', career);
    const odiCfg = buildAISquadConfig(team.id, 'ODI', career);
    const t20Cfg = buildAISquadConfig(team.id, 'T20I', career);

    aiTeams[team.id] = {
      teamId: team.id,
      strategy: getNationalAIStrategy(team.id),
      formatSquads: {
        TEST: testCfg,
        ODI: odiCfg,
        T20I: t20Cfg,
      },
      lastUpdatedDate: career?.currentDate || '2026-11-15',
      rotationCounter: 0,
    };
  });

  return aiTeams;
}

/**
 * Initializes live ICC ranking points & standings per format across all international teams.
 */
export function initializeTeamRankings(): Record<string, TeamRankingState> {
  const map: Record<string, TeamRankingState> = {};
  INTERNATIONAL_TEAMS.forEach((t) => {
    map[t.id] = {
      teamId: t.id,
      ratingPoints: { ...t.ratingPoints },
      worldRankings: { ...t.worldRankings },
    };
  });
  recomputeRankingPositions(map);
  return map;
}

export function recomputeRankingPositions(rankingsMap: Record<string, TeamRankingState>): void {
  (['TEST', 'ODI', 'T20I'] as MatchFormat[]).forEach((fmt) => {
    const entries = Object.values(rankingsMap).sort(
      (a, b) => (b.ratingPoints[fmt] || 0) - (a.ratingPoints[fmt] || 0)
    );
    entries.forEach((entry, idx) => {
      entry.worldRankings[fmt] = idx + 1;
    });
  });
}

/**
 * Updates live ICC team rating points and world rankings after any completed international match.
 */
export function updateTeamRankingsAfterMatch(
  career: CareerSave,
  match: Match
): { updatedRankings: Record<string, TeamRankingState>; rankingNews: NewsArticle[] } {
  const rankings: Record<string, TeamRankingState> = career.teamRankings
    ? JSON.parse(JSON.stringify(career.teamRankings))
    : initializeTeamRankings();

  const rankingNews: NewsArticle[] = [];
  const fmt = match.format;

  const homeState = rankings[match.homeTeamId];
  const awayState = rankings[match.awayTeamId];
  if (!homeState || !awayState) {
    return { updatedRankings: rankings, rankingNews };
  }

  const prevLeader = Object.values(rankings).find((r) => r.worldRankings[fmt] === 1)?.teamId;

  const outcome = determineMatchOutcome(match);
  if (outcome.isNoResult) {
    return { updatedRankings: rankings, rankingNews };
  }

  const homePts = homeState.ratingPoints[fmt];
  const awayPts = awayState.ratingPoints[fmt];
  const diff = Math.max(-40, Math.min(40, homePts - awayPts));

  let homeDelta = 0;
  let awayDelta = 0;

  if (outcome.isDraw || outcome.isTie) {
    // Lower-rated team gains 1 point if gap >= 10
    if (diff >= 10) {
      homeDelta = -1;
      awayDelta = 1;
    } else if (diff <= -10) {
      homeDelta = 1;
      awayDelta = -1;
    }
  } else if (outcome.winnerTeamId === match.homeTeamId) {
    const swing = Math.max(1, Math.round(2.5 - diff / 22));
    homeDelta = swing;
    awayDelta = -Math.max(1, swing - 1);
  } else if (outcome.winnerTeamId === match.awayTeamId) {
    const swing = Math.max(1, Math.round(2.5 + diff / 22));
    awayDelta = swing;
    homeDelta = -Math.max(1, swing - 1);
  }

  homeState.ratingPoints[fmt] = Math.max(20, homePts + homeDelta);
  awayState.ratingPoints[fmt] = Math.max(20, awayPts + awayDelta);

  recomputeRankingPositions(rankings);

  const newLeader = Object.values(rankings).find((r) => r.worldRankings[fmt] === 1)?.teamId;
  if (newLeader && prevLeader && newLeader !== prevLeader) {
    const leaderTeam = INTERNATIONAL_TEAMS.find((t) => t.id === newLeader);
    rankingNews.push({
      id: `news_rank_${fmt}_${newLeader}_${match.id}`,
      title: `ICC Rankings Shake-Up: ${leaderTeam?.name || newLeader} Claim World No. 1 in ${fmt}!`,
      summary: `${leaderTeam?.name || newLeader} (${rankings[newLeader].ratingPoints[fmt]} rating pts) have overtaken ${prevLeader} to sit atop the official ICC ${fmt} Championship Rankings.`,
      category: 'RANKINGS',
      timestamp: match.date || career.currentDate,
      relatedTeamId: newLeader,
    });
  }

  return { updatedRankings: rankings, rankingNews };
}

function getFormatRating(p: Player, format: MatchFormat): number {
  if (format === 'TEST') return p.testRating || 72;
  if (format === 'ODI') return p.odiRating || 72;
  return p.t20Rating || 72;
}

function scorePlayerForAISelection(
  p: Player,
  format: MatchFormat,
  strategy: AISelectionStrategy,
  pitch?: PitchCondition,
  isHighStakes: boolean = false,
  rotationOffset: number = 0
): number {
  let score = getFormatRating(p, format);

  const form = p.currentForm ?? p.attributes.currentForm ?? 75;
  const fitness = p.fitness ?? p.attributes.fitness ?? 82;
  const fatigue = p.workloadFatigue ?? 15;

  score += (form - 75) * 0.28;
  score += (fitness - 80) * 0.14;

  // Workload rotation: rest tired players in bilateral matches, lighter penalty in WC knockouts
  if (!isHighStakes) {
    if (fatigue >= 72) score -= 32;
    else if (fatigue >= 52) score -= 14;
    else if (fatigue <= 20) score += 3;
  } else if (fatigue >= 88) {
    score -= 12;
  }

  // Strategy modifiers
  if (strategy === 'AGGRESSIVE') {
    score += ((p.attributes.aggression - 70) * 0.12) + ((p.attributes.powerHitting - 70) * 0.1);
  } else if (strategy === 'YOUTH_FOCUS' && p.age <= 24) {
    score += 5 + Math.max(0, ((p.potential || 82) - 80) * 0.25);
  } else if (strategy === 'EXPERIENCE_FIRST' && p.age >= 29) {
    score += 4.5 + ((p.attributes.temperament - 75) * 0.12);
  } else if (strategy === 'SPIN_HEAVY' && SPIN_STYLES.has(p.bowlingStyle)) {
    score += 4.5;
  } else if (strategy === 'PACE_HEAVY' && !SPIN_STYLES.has(p.bowlingStyle) && p.role === 'BOWLER') {
    score += 4.5;
  }

  // Pitch suitability
  if (pitch) {
    if ((pitch.type === 'DUSTBOWL_SPIN' || pitch.type === 'CRACKED_DAY5') && SPIN_STYLES.has(p.bowlingStyle)) {
      score += 7.5;
    } else if (pitch.type === 'GREEN_SEAMER' && !SPIN_STYLES.has(p.bowlingStyle) && (p.role === 'BOWLER' || p.role === 'ALL_ROUNDER')) {
      score += 7.5;
    } else if (pitch.type === 'BATTER_PARADISE' && (p.role === 'BATTER' || p.role === 'WICKETKEEPER_BATTER')) {
      score += 3;
    }
  }

  // Deterministic squad rotation variation across matches so fringe squad players earn caps
  if (!isHighStakes && rotationOffset > 0) {
    let idHash = 0;
    for (let i = 0; i < p.id.length; i++) idHash = (idHash * 31 + p.id.charCodeAt(i)) | 0;
    const mod = Math.abs(idHash + rotationOffset * 7) % 5;
    if (mod === 0) score += 3.5;
    else if (mod === 1 && fatigue >= 35) score -= 4;
  }

  return score;
}

function arrangeBalancedBattingOrder(players: Player[]): Player[] {
  const roleWeight = (p: Player): number => {
    if (p.role === 'BATTER') return 1;
    if (p.role === 'WICKETKEEPER_BATTER') return 2;
    if (p.role === 'ALL_ROUNDER') return 3;
    return 4; // BOWLER
  };

  return [...players].sort((a, b) => {
    const rwA = roleWeight(a);
    const rwB = roleWeight(b);
    if (rwA !== rwB) return rwA - rwB;
    const batA = a.attributes.technique * 0.55 + a.attributes.timing * 0.45;
    const batB = b.attributes.technique * 0.55 + b.attributes.timing * 0.45;
    return batB - batA;
  });
}

export function buildAISquadConfig(
  teamId: string,
  format: MatchFormat,
  career?: CareerSave,
  pitch?: PitchCondition,
  isHighStakes: boolean = false,
  rotationCounter: number = 0
): FormatSquadConfig {
  const defaultCfg = getDefaultFormatSquadConfig(teamId, format);
  const allCountryMen = getEffectivePlayersByCountry(teamId, career, true);

  // Filter format-eligible if enough exist
  let eligible = allCountryMen.filter((p) => p.formatEligibility?.[format]);
  if (eligible.length < 11) eligible = allCountryMen;

  // Exclude injured players when healthy replacements exist
  const healthy = eligible.filter((p) => !(p.isInjured && (p.injuryDaysRemaining || 0) > 0));
  const candidatePool = healthy.length >= 11 ? healthy : eligible;

  const strategy = getNationalAIStrategy(teamId);
  const scored = candidatePool
    .map((p) => ({
      player: p,
      score: scorePlayerForAISelection(p, format, strategy, pitch, isHighStakes, rotationCounter),
    }))
    .sort((a, b) => b.score - a.score);

  // Squad of up to 17 players
  const squadPlayers = scored.slice(0, Math.min(17, Math.max(11, scored.length))).map((x) => x.player);

  // Build balanced XI: 1 WK, at least 4 bowlers/all-rounders (min 3 specialist bowlers if available), rest best batters/ARs
  const selectedIds = new Set<string>();
  const selectedPlayers: Player[] = [];

  const addPlayer = (p: Player | undefined) => {
    if (p && !selectedIds.has(p.id) && selectedPlayers.length < 11) {
      selectedIds.add(p.id);
      selectedPlayers.push(p);
    }
  };

  // 1. Best Wicketkeeper
  const wks = scored.filter(
    (x) => x.player.isWicketKeeper || x.player.role === 'WICKETKEEPER_BATTER'
  );
  if (wks.length > 0) addPlayer(wks[0].player);

  // 2. Top 3 Specialist Bowlers (respecting pitch/strategy scores)
  const bowlers = scored.filter((x) => x.player.role === 'BOWLER');
  bowlers.slice(0, 3).forEach((x) => addPlayer(x.player));

  // 3. At least 2 All-Rounders or 4th-5th bowling options
  const bowlingOptions = scored.filter(
    (x) => (x.player.role === 'ALL_ROUNDER' || x.player.role === 'BOWLER') && !selectedIds.has(x.player.id)
  );
  bowlingOptions.slice(0, 2).forEach((x) => addPlayer(x.player));

  // 4. Fill remaining slots with highest-scored batters/all-rounders
  for (const item of scored) {
    if (selectedPlayers.length >= 11) break;
    addPlayer(item.player);
  }

  // Safety pad if country has exactly 11 players
  for (const p of allCountryMen) {
    if (selectedPlayers.length >= 11) break;
    addPlayer(p);
  }

  const orderedPlayers = arrangeBalancedBattingOrder(selectedPlayers);
  const playingXI = orderedPlayers.map((p) => p.id);

  // Captain & Vice-Captain selection
  let captainId = defaultCfg.captainId;
  if (!playingXI.includes(captainId)) {
    const leaderSorted = [...orderedPlayers].sort(
      (a, b) => (b.attributes.leadership || 70) - (a.attributes.leadership || 70)
    );
    captainId = leaderSorted[0]?.id || playingXI[0] || '';
  }

  let viceCaptainId = defaultCfg.viceCaptainId;
  if (!playingXI.includes(viceCaptainId) || viceCaptainId === captainId) {
    const vcCandidate = orderedPlayers.find((p) => p.id !== captainId);
    viceCaptainId = vcCandidate?.id || playingXI[0] || '';
  }

  const wkInXI = orderedPlayers.find(
    (p) => p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER'
  );
  const wicketKeeperId = wkInXI?.id || playingXI[0] || '';

  const bowlingRotation = orderedPlayers
    .filter((p) => p.role === 'BOWLER' || p.role === 'ALL_ROUNDER')
    .map((p) => p.id);

  return {
    format,
    squadPlayerIds: squadPlayers.map((p) => p.id),
    playingXI,
    battingOrder: playingXI,
    captainId,
    viceCaptainId,
    wicketKeeperId,
    bowlingRotation: bowlingRotation.length >= 4 ? bowlingRotation : playingXI.slice(-5),
  };
}

/**
 * Selects a dynamic, conditions-aware AI Playing XI for a match and updates `career.aiTeams[teamId]`.
 */
export function selectAIPlayingXIForMatch(
  teamId: string,
  format: MatchFormat,
  career: CareerSave,
  pitch?: PitchCondition,
  isHighStakes: boolean = false
): FormatSquadConfig {
  if (!career.aiTeams) {
    career.aiTeams = initializeAITeams(career.selectedTeamId, career);
  }

  const existingAI = career.aiTeams[teamId];
  const nextRotation = (existingAI?.rotationCounter || 0) + 1;

  const updatedCfg = buildAISquadConfig(
    teamId,
    format,
    career,
    pitch,
    isHighStakes,
    nextRotation
  );

  if (existingAI) {
    existingAI.formatSquads[format] = updatedCfg;
    existingAI.rotationCounter = nextRotation;
    existingAI.lastUpdatedDate = career.currentDate;
  } else if (teamId !== career.selectedTeamId) {
    career.aiTeams[teamId] = {
      teamId,
      strategy: getNationalAIStrategy(teamId),
      formatSquads: {
        TEST: format === 'TEST' ? updatedCfg : buildAISquadConfig(teamId, 'TEST', career),
        ODI: format === 'ODI' ? updatedCfg : buildAISquadConfig(teamId, 'ODI', career),
        T20I: format === 'T20I' ? updatedCfg : buildAISquadConfig(teamId, 'T20I', career),
      },
      rotationCounter: nextRotation,
      lastUpdatedDate: career.currentDate,
    };
  }

  return updatedCfg;
}

/**
 * Applies workload, form momentum, and small match-injury risk to AI players who just played a match.
 */
export function applyPostMatchAIUpdates(
  career: CareerSave,
  match: Match
): NewsArticle[] {
  const news: NewsArticle[] = [];
  if (!career.playerOverrides) career.playerOverrides = {};

  const aiTeamIds = [match.homeTeamId, match.awayTeamId].filter(
    (id) => id !== career.selectedTeamId
  );

  const fatigueGain = match.format === 'TEST' ? 20 : match.format === 'ODI' ? 13 : 8;
  const rand = mulberry32((match.seed || 101) + 777);

  aiTeamIds.forEach((teamId) => {
    const xi = teamId === match.homeTeamId ? match.homeXI : match.awayXI;
    xi.forEach((pId) => {
      const eff = getEffectivePlayer(pId, career);
      if (!eff) return;

      const prev = career.playerOverrides![pId] || {};
      const nextFatigue = Math.min(100, (eff.workloadFatigue || 15) + fatigueGain);

      // Performance-driven form adjustment
      let runsScored = 0;
      let wicketsTaken = 0;
      match.innings.forEach((inn) => {
        const b = inn.batters.find((x) => x.playerId === pId);
        if (b) runsScored += b.runs;
        const bw = inn.bowlers.find((x) => x.playerId === pId);
        if (bw) wicketsTaken += bw.wickets;
      });

      const baseForm = eff.currentForm ?? eff.attributes.currentForm ?? 75;
      let formDelta = 0;
      if (runsScored >= 75 || wicketsTaken >= 4) formDelta = 4;
      else if (runsScored >= 40 || wicketsTaken >= 2) formDelta = 2;
      else if (runsScored < 10 && wicketsTaken === 0 && eff.role === 'BATTER') formDelta = -2;

      const nextForm = Math.max(40, Math.min(99, baseForm + formDelta));

      // Small realistic injury chance if high fatigue
      let isInjured = eff.isInjured || false;
      let injuryDaysRemaining = eff.injuryDaysRemaining || 0;
      let injuryType = eff.injuryType;
      let injurySeverity = eff.injurySeverity;

      const injuryProb = nextFatigue >= 75 ? 0.035 : 0.008;
      if (!isInjured && rand() < injuryProb) {
        isInjured = true;
        injuryDaysRemaining = 7 + Math.floor(rand() * 18);
        injuryType = eff.role === 'BOWLER' ? 'Side Strain' : 'Hamstring Tightness';
        injurySeverity = injuryDaysRemaining > 16 ? 'MODERATE' : 'MINOR';

        const rating = getFormatRating(eff, match.format);
        if (rating >= 80) {
          news.push({
            id: `news_ai_inj_${pId}_${match.id}`,
            title: `Injury Blow for ${eff.countryName}: ${eff.name} Ruled Out (${injuryDaysRemaining} Days)`,
            summary: `${eff.name} sustained a ${injuryType.toLowerCase()} during ${match.seriesName || 'international duty'} and will miss approximately ${injuryDaysRemaining} days.`,
            category: 'INJURY',
            timestamp: match.date || career.currentDate,
            relatedTeamId: teamId,
            relatedPlayerId: pId,
          });
        }
      }

      career.playerOverrides![pId] = {
        ...prev,
        workloadFatigue: nextFatigue,
        currentForm: nextForm,
        isInjured,
        injuryDaysRemaining,
        injuryType,
        injurySeverity,
      };
    });
  });

  return news;
}

/**
 * Processes AI world player recovery, injury healing, and gradual attribute development across all non-user nations.
 */
export function processAIWorldDevelopment(
  career: CareerSave,
  daysElapsed: number,
  currentDate: string
): NewsArticle[] {
  const news: NewsArticle[] = [];
  if (daysElapsed <= 0) return news;
  if (!career.playerOverrides) career.playerOverrides = {};

  const recoveryAmount = Math.min(100, daysElapsed * 6);
  // Only trigger attribute growth ticks every ~14 simulated days (or proportional probability)
  const growthTicks = Math.max(0, Math.floor(daysElapsed / 10));
  const dateSeed = currentDate.split('-').reduce((acc, part) => acc * 37 + Number(part || 1), 19);
  const rand = mulberry32(dateSeed);

  const allPool = [...ALL_PLAYERS, ...(career.emergingPlayers || [])];

  for (const baseP of allPool) {
    if (baseP.countryId === career.selectedTeamId) continue;
    if (baseP.gender !== 'MALE') continue;

    const ov = career.playerOverrides[baseP.id];
    const status = ov?.status || baseP.status;
    if (status !== 'ACTIVE') continue;

    let changed = false;
    const curFatigue = ov?.workloadFatigue ?? baseP.workloadFatigue ?? 15;
    let nextFatigue = curFatigue;
    if (curFatigue > 8) {
      nextFatigue = Math.max(8, curFatigue - recoveryAmount);
      if (nextFatigue !== curFatigue) changed = true;
    }

    let isInjured = ov?.isInjured ?? baseP.isInjured ?? false;
    let injuryDays = ov?.injuryDaysRemaining ?? baseP.injuryDaysRemaining ?? 0;
    let injuryType = ov?.injuryType ?? baseP.injuryType;
    let injurySeverity = ov?.injurySeverity ?? baseP.injurySeverity;

    if (isInjured && injuryDays > 0) {
      injuryDays = Math.max(0, injuryDays - daysElapsed);
      if (injuryDays === 0) {
        isInjured = false;
        injuryType = undefined;
        injurySeverity = undefined;
      }
      changed = true;
    }

    let nextAttrs = ov?.attributes ? { ...baseP.attributes, ...ov.attributes } : undefined;
    let testRating = ov?.testRating ?? baseP.testRating;
    let odiRating = ov?.odiRating ?? baseP.odiRating;
    let t20Rating = ov?.t20Rating ?? baseP.t20Rating;
    let devFeedback = ov?.developmentFeedback ?? baseP.developmentFeedback;

    const age = ov?.age ?? baseP.age;
    const potential = ov?.potential ?? baseP.potential ?? 84;

    if (growthTicks > 0 && age <= 26 && testRating < potential && rand() < Math.min(0.45, growthTicks * 0.14)) {
      nextAttrs = nextAttrs || { ...baseP.attributes };
      if (baseP.role === 'BATTER' || baseP.role === 'WICKETKEEPER_BATTER') {
        nextAttrs.technique = Math.min(potential, nextAttrs.technique + 1);
        nextAttrs.timing = Math.min(potential, nextAttrs.timing + 1);
      } else if (baseP.role === 'BOWLER') {
        nextAttrs.accuracy = Math.min(potential, nextAttrs.accuracy + 1);
        nextAttrs.wicketTaking = Math.min(potential, nextAttrs.wicketTaking + 1);
      } else {
        nextAttrs.technique = Math.min(potential, nextAttrs.technique + 1);
        nextAttrs.control = Math.min(potential, nextAttrs.control + 1);
      }
      const tempP: Player = { ...baseP, ...(ov || {}), attributes: nextAttrs };
      const overall = calculateOverallAbility(tempP);
      testRating = Math.min(97, Math.max(testRating, overall));
      odiRating = Math.min(97, Math.max(odiRating, overall));
      t20Rating = Math.min(97, Math.max(t20Rating, overall));
      devFeedback = 'Improving';
      changed = true;
    } else if (growthTicks > 0 && age >= 35 && rand() < Math.min(0.25, growthTicks * 0.07)) {
      nextAttrs = nextAttrs || { ...baseP.attributes };
      nextAttrs.fitness = Math.max(55, nextAttrs.fitness - 1);
      nextAttrs.stamina = Math.max(55, nextAttrs.stamina - 1);
      const tempP: Player = { ...baseP, ...(ov || {}), attributes: nextAttrs };
      const overall = calculateOverallAbility(tempP);
      testRating = Math.max(60, Math.min(testRating, overall));
      odiRating = Math.max(60, Math.min(odiRating, overall));
      t20Rating = Math.max(60, Math.min(t20Rating, overall));
      devFeedback = 'Declining';
      changed = true;
    }

    if (changed) {
      career.playerOverrides[baseP.id] = {
        ...(ov || {}),
        workloadFatigue: nextFatigue,
        isInjured,
        injuryDaysRemaining: injuryDays,
        injuryType,
        injurySeverity,
        ...(nextAttrs
          ? {
              attributes: nextAttrs,
              testRating,
              odiRating,
              t20Rating,
              developmentFeedback: devFeedback,
            }
          : {}),
      };
    }
  }

  return news;
}

const ACADEMY_FIRST_NAMES: Record<string, string[]> = {
  IND: ['Aarav', 'Vihaan', 'Riyan', 'Dev', 'Prithvi', 'Arjun', 'Tanush', 'Angkrish'],
  AUS: ['Lachlan', 'Callum', 'Cooper', 'Sam', 'Ollie', 'Campbell', 'Fergus', 'mahli'],
  ENG: ['Archie', 'Jacob', 'Sonny', 'Rehan', 'Josh', 'James', 'Dan', 'Shoaib'],
  PAK: ['Ali', 'Haseeb', 'Qasim', 'Arafat', 'Saad', 'Mehran', 'Ubaid', 'Shahzaib'],
  RSA: ['Kwena', 'Lhuan-dre', 'Dewald', 'Tristan', 'Matthew', 'Gerald', 'Nandre', 'Mihlali'],
  NZL: ['Rachin', 'Will', 'Ben', 'Adithya', 'Muhammad', 'Zac', 'Simon', 'Bevon'],
  SL: ['Dunith', 'Pathum', 'Matheesha', 'Vijayakanth', 'Nuwanidu', 'Shevon', 'Malsha', 'Sadeera'],
  BAN: ['Towhid', 'Tanzim', 'Rishad', 'Mahmudul', 'Shoriful', 'Parvez', 'Jaker', 'Rakibul'],
  WI: ['Alick', 'Shamar', 'Jewel', 'Jayden', 'Keacy', 'Matthew', 'Gudakesh', 'Teddy'],
  AFG: ['Allah', 'Noor', 'Sediqullah', 'Ibrahim', 'Nangeyalia', 'Bilal', 'Darwish', 'Wafiullah'],
  IRE: ['Harry', 'Lorcan', 'Matthew', 'Gavin', 'Joshua', 'Curtis', 'Neil', 'Ross'],
  ZIM: ['Brian', 'Wessly', 'Blessing', 'Clive', 'Dion', 'Tadiwanashe', 'Newman', 'Trevor'],
};

const ACADEMY_LAST_NAMES: Record<string, string[]> = {
  IND: ['Sharma', 'Verma', 'Nair', 'Kulkarni', 'Gill', 'Jaiswal', 'Reddy', 'Porel'],
  AUS: ['Konstas', 'Connolly', 'Vidler', 'Bartlett', 'Hardie', 'Sutherland', 'Davies', 'Beardman'],
  ENG: ['Bethell', 'Bashir', 'Hull', 'Turner', 'Rew', 'Mousley', 'Atkinson', 'Potts'],
  PAK: ['Minhas', 'Shah', 'Akram', 'Muqeem', 'Niazi', 'Bangalzai', 'Zeeshan', 'Tahir'],
  RSA: ['Maphaka', 'Pretorius', 'Stubbs', 'Breetzke', 'Burger', 'Coetzee', 'Peter', 'Luus'],
  NZL: ['O’Rourke', 'Sears', 'Foxcroft', 'Ashok', 'Abbas', 'Foulkes', 'Robinson', 'Hay'],
  SL: ['Wellalage', 'Wickramasinghe', 'Daniel', 'Croospulle', 'Paranavithana', 'Viyaskanth', 'Madushanka', 'Fernando'],
  BAN: ['Hridoy', 'Sakib', 'Hossain', 'Joy', 'Emon', 'rana', 'Hasan', 'Islam'],
  WI: ['Athanaze', 'Joseph', 'Andrew', 'Seales', 'Forde', 'Moti', 'Thorne', 'Wickham'],
  AFG: ['Ghazanfar', 'Atal', 'Kharote', 'Safi', 'Rasooli', 'Tarakhil', 'Ahmad', 'Zadran'],
  IRE: ['Tector', 'Humphreys', 'Hoey', 'Little', 'Campher', 'Rock', 'Adair', 'Doheny'],
  ZIM: ['Bennett', 'Madhevere', 'Muzarabani', 'Myers', 'Marumani', 'Gwandu', 'Ngarava', 'Masakadza'],
};

/**
 * Annual season rollover: ages players +1 year, handles realistic veteran retirements,
 * and promotes young academy talents across international cricket!
 */
export function processAnnualPlayerLifecycle(
  career: CareerSave,
  newYear: number
): NewsArticle[] {
  const news: NewsArticle[] = [];
  if (!career.playerOverrides) career.playerOverrides = {};
  if (!career.emergingPlayers) career.emergingPlayers = [];

  const rand = mulberry32(newYear * 1337 + 99);
  const allActive = [...ALL_PLAYERS, ...career.emergingPlayers].filter((p) => p.gender === 'MALE');

  // 1. Age players +1 and check veteran retirements
  allActive.forEach((baseP) => {
    const eff = getEffectivePlayer(baseP, career)!;
    if (eff.status !== 'ACTIVE') return;

    const nextAge = (eff.age || 26) + 1;
    const prevOv = career.playerOverrides![baseP.id] || {};

    // Retirement probability for veterans 37+
    const shouldRetire =
      (nextAge >= 39 && rand() < 0.65) ||
      (nextAge >= 37 && (eff.fitness ?? 80) < 76 && rand() < 0.35);

    if (shouldRetire) {
      // Ensure country still has >= 13 active players before retiring
      const countryActiveCount = getEffectivePlayersByCountry(baseP.countryId, career, true).length;
      if (countryActiveCount > 13) {
        career.playerOverrides![baseP.id] = {
          ...prevOv,
          age: nextAge,
          status: 'RETIRED',
        };
        news.push({
          id: `news_retire_${baseP.id}_${newYear}`,
          title: `International Retirement: ${eff.name} (${eff.countryName}) Announces Retirement`,
          summary: `At age ${nextAge}, veteran cricketer ${eff.name} has called time on a distinguished international career for ${eff.countryName}.`,
          category: 'MILESTONE',
          timestamp: `${newYear}-01-02`,
          relatedTeamId: baseP.countryId,
          relatedPlayerId: baseP.id,
        });
        return;
      }
    }

    career.playerOverrides![baseP.id] = {
      ...prevOv,
      age: nextAge,
    };
  });

  // 2. Promote 1 young academy talent for each Core 12 Test nation every new season
  const coreNations = ['IND', 'AUS', 'ENG', 'PAK', 'RSA', 'NZL', 'SL', 'BAN', 'WI', 'AFG', 'IRE', 'ZIM'];
  const roles: PlayerRole[] = ['BATTER', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER_BATTER'];

  coreNations.forEach((cId, idx) => {
    const team = INTERNATIONAL_TEAMS.find((t) => t.id === cId);
    if (!team) return;

    const fNames = ACADEMY_FIRST_NAMES[cId] || ['Alex', 'Sam', 'Jordan'];
    const lNames = ACADEMY_LAST_NAMES[cId] || ['Smith', 'Patel', 'Khan'];
    const firstName = fNames[Math.floor(rand() * fNames.length)];
    const lastName = lNames[Math.floor(rand() * lNames.length)];
    const capFirst = firstName.charAt(0).toUpperCase() + firstName.slice(1);
    const capLast = lastName.charAt(0).toUpperCase() + lastName.slice(1);

    const role = roles[(newYear + idx) % roles.length];
    const age = 19 + Math.floor(rand() * 3); // 19-21
    const potential = 85 + Math.floor(rand() * 10); // 85-94
    const baseSkill = 71 + Math.floor(rand() * 7); // 71-77 starting ability
    const isSpinner = cId === 'IND' || cId === 'SL' || cId === 'AFG' || cId === 'BAN' ? rand() > 0.45 : rand() > 0.7;

    const newPlayerId = `PLY_ACAD_${cId}_${newYear}_${idx + 1}`;
    if (career.emergingPlayers!.some((p) => p.id === newPlayerId)) return;

    const newPlayer: Player = {
      id: newPlayerId,
      name: `${capFirst} ${capLast}`,
      shortName: `${capFirst.charAt(0)}. ${capLast}`,
      countryId: cId,
      countryName: team.name,
      age,
      gender: 'MALE',
      status: 'ACTIVE',
      role,
      battingHand: rand() > 0.3 ? 'RIGHT_HAND' : 'LEFT_HAND',
      bowlingStyle: isSpinner ? 'OFF_BREAK' : rand() > 0.25 ? 'RIGHT_ARM_FAST' : 'LEFT_ARM_FAST',
      formatEligibility: { TEST: true, ODI: true, T20I: true },
      isWicketKeeper: role === 'WICKETKEEPER_BATTER',
      workloadFatigue: 10,
      fitness: 88,
      currentForm: 80,
      potential,
      developmentFeedback: 'Improving',
      testRating: baseSkill,
      odiRating: baseSkill + 1,
      t20Rating: baseSkill + 2,
      attributes: {
        technique: role === 'BOWLER' ? 52 : baseSkill + 2,
        timing: role === 'BOWLER' ? 54 : baseSkill + 3,
        shotSelection: role === 'BOWLER' ? 50 : baseSkill,
        defense: role === 'BOWLER' ? 52 : baseSkill + 1,
        aggression: baseSkill + 4,
        powerHitting: baseSkill + 2,
        againstPace: baseSkill + 1,
        againstSpin: baseSkill + 1,
        consistency: baseSkill - 2,
        temperament: baseSkill,
        pace: role === 'BATTER' || role === 'WICKETKEEPER_BATTER' ? 45 : isSpinner ? 50 : baseSkill + 8,
        swing: role === 'BATTER' ? 35 : isSpinner ? 30 : baseSkill + 4,
        seam: role === 'BATTER' ? 35 : isSpinner ? 30 : baseSkill + 4,
        spin: isSpinner && role !== 'BATTER' ? baseSkill + 8 : 35,
        accuracy: role === 'BATTER' ? 40 : baseSkill + 3,
        variation: role === 'BATTER' ? 40 : baseSkill + 3,
        control: role === 'BATTER' ? 40 : baseSkill + 2,
        deathBowling: role === 'BATTER' ? 35 : baseSkill + 1,
        wicketTaking: role === 'BATTER' ? 35 : baseSkill + 4,
        stamina: 86,
        fielding: 82,
        catching: 81,
        throwing: 82,
        fitness: 88,
        leadership: 65,
        mentalStrength: 76,
        currentForm: 80,
        potential,
      },
      stats: {
        TEST: createEmptyFormatStats(),
        ODI: createEmptyFormatStats(),
        T20I: createEmptyFormatStats(),
      },
      simulatedStats: {
        TEST: createEmptyFormatStats(),
        ODI: createEmptyFormatStats(),
        T20I: createEmptyFormatStats(),
      },
      sourceMeta: {
        source: 'National Cricket Academy',
        sourceId: newPlayerId,
        lastUpdated: `${newYear}-01-01`,
        verified: true,
      },
    };

    career.emergingPlayers!.push(newPlayer);

    if (cId === career.selectedTeamId || potential >= 91) {
      news.push({
        id: `news_debut_callup_${newPlayerId}`,
        title: `Rising Prodigy: ${newPlayer.name} (${team.name}, Age ${age}) Earns National Pool Call-Up`,
        summary: `Highly rated ${age}-year-old ${role.replace('_', ' ').toLowerCase()} ${newPlayer.name} (Potential: ${potential}) has graduated into ${team.name}'s senior international selection pool for the ${newYear} season.`,
        category: 'SQUAD_SELECTION',
        timestamp: `${newYear}-01-03`,
        relatedTeamId: cId,
        relatedPlayerId: newPlayerId,
      });
    }
  });

  // 3. Refresh AI squads & user sanitized squads so retired players are replaced cleanly
  career.aiTeams = initializeAITeams(career.selectedTeamId, career);

  return news;
}

