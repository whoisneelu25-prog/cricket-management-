import {
  Player,
  MatchFormat,
  FormatSquadConfig,
  FormatStats,
  SupportStaff,
  CareerSave,
} from '../types/cricket';
import { INTERNATIONAL_PLAYERS } from './players';
import masterPlayersJson from './master_players.json';
import masterSquadsJson from './master_squads.json';
import {
  FORMAT_PLAYERS,
  buildDefaultFormatSquadConfig,
  getFormatSelectionPoolPlayers,
  getDefaultFormatPlayingXI as getOfficialFormatXI,
  getDefaultFormatCaptainId as getOfficialFormatCaptain,
  getDefaultFormatViceCaptainId as getOfficialFormatViceCaptain,
  getDefaultFormatWicketKeeperId as getOfficialFormatWicketKeeper,
} from './formatSquadsData';

const CORE_12 = new Set(['IND', 'AUS', 'ENG', 'PAK', 'RSA', 'NZL', 'SL', 'BAN', 'WI', 'AFG', 'IRE', 'ZIM']);

const formatPlayerMap = new Map(FORMAT_PLAYERS.map((p) => [p.id, p]));
const masterList = (masterPlayersJson as Player[]).map((p) => {
  const formatOverride = formatPlayerMap.get(p.id);
  if (formatOverride) {
    return {
      ...p,
      status: 'ACTIVE' as const,
      formatEligibility: {
        ...p.formatEligibility,
        ...formatOverride.formatEligibility,
      },
      isWicketKeeper: Boolean(formatOverride.isWicketKeeper || formatOverride.role === 'WICKETKEEPER_BATTER'),
      role: formatOverride.role,
    };
  }
  return p;
});
const masterIds = new Set(masterList.map((p) => p.id));
const extraFormatPlayers = FORMAT_PLAYERS.filter((p) => !masterIds.has(p.id));

export const ADDITIONAL_SQUAD_MEMBERS: Player[] = masterList.filter(
  (p) => !CORE_12.has(p.countryId)
);

export const ALL_PLAYERS: Player[] = [...masterList, ...extraFormatPlayers];

const SQUADS_MAP = masterSquadsJson as Record<string, Record<MatchFormat, FormatSquadConfig>>;

export function getPlayersByCountry(countryId: string, activeMenOnly: boolean = true): Player[] {
  const normalizedId = countryId === 'SRI' ? 'SL' : countryId === 'WIN' ? 'WI' : countryId === 'SA' ? 'RSA' : countryId;
  return ALL_PLAYERS.filter((p) => {
    const match = p.countryId === normalizedId || p.countryId === countryId || (normalizedId === 'RSA' && p.countryId === 'SA');
    if (!match) return false;
    if (activeMenOnly) {
      return p.status === 'ACTIVE' && p.gender === 'MALE';
    }
    return true;
  });
}

export function getAllPlayersByCountry(countryId: string): Player[] {
  return getPlayersByCountry(countryId, false);
}

export function getFormatEligiblePlayers(countryId: string, format: MatchFormat): Player[] {
  // Use format-specific selection pool from 12 nations dataset if available
  const formatPool = getFormatSelectionPoolPlayers(countryId, format);
  if (formatPool && formatPool.length >= 11) {
    return formatPool;
  }
  const pool = getPlayersByCountry(countryId, true);
  const eligible = pool.filter((p) => p.formatEligibility[format] && p.status === 'ACTIVE' && p.gender === 'MALE');
  if (eligible.length >= 11) return eligible;
  return pool;
}

export function createEmptyFormatStats(): FormatStats {
  return {
    matches: 0,
    innings: 0,
    runs: 0,
    ballsFaced: 0,
    highestScore: 0,
    highestScoreNotOut: false,
    average: 0,
    strikeRate: 0,
    centuries: 0,
    doubleCenturies: 0,
    fifties: 0,
    fours: 0,
    sixes: 0,
    ducks: 0,
    notOuts: 0,
    bowlingInnings: 0,
    oversBowled: 0,
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    bestBowlingWickets: 0,
    bestBowlingRuns: 0,
    bowlingAverage: 0,
    economy: 0,
    bowlingStrikeRate: 0,
    fourWicketHauls: 0,
    fiveWicketHauls: 0,
    tenWicketHauls: 0,
    catches: 0,
    stumpings: 0,
    runOuts: 0,
  };
}

export function getCombinedFormatStats(player: Player, format: MatchFormat): FormatStats;
export function getCombinedFormatStats(
  base: FormatStats | undefined,
  simulated: FormatStats | undefined
): FormatStats;
export function getCombinedFormatStats(
  baseOrPlayer: FormatStats | Player | undefined,
  simulatedOrFormat: FormatStats | MatchFormat | undefined
): FormatStats {
  let base: FormatStats | undefined;
  let simulated: FormatStats | undefined;
  if (
    baseOrPlayer &&
    typeof baseOrPlayer === 'object' &&
    'stats' in baseOrPlayer &&
    typeof simulatedOrFormat === 'string'
  ) {
    base = baseOrPlayer.stats?.[simulatedOrFormat];
    simulated = baseOrPlayer.simulatedStats?.[simulatedOrFormat];
  } else {
    base = baseOrPlayer as FormatStats | undefined;
    simulated = simulatedOrFormat as FormatStats | undefined;
  }
  const b = base || createEmptyFormatStats();
  if (!simulated || simulated.matches === 0) return { ...b };

  const matches = b.matches + simulated.matches;
  const innings = b.innings + simulated.innings;
  const runs = b.runs + simulated.runs;
  const notOuts = b.notOuts + simulated.notOuts;
  const dismissals = Math.max(0, innings - notOuts);
  const average = dismissals > 0 ? Number((runs / dismissals).toFixed(2)) : runs;

  const baseBalls =
    b.ballsFaced !== undefined
      ? b.ballsFaced
      : b.strikeRate > 0
      ? Math.round((b.runs / b.strikeRate) * 100)
      : 0;
  const simBalls =
    simulated.ballsFaced !== undefined
      ? simulated.ballsFaced
      : simulated.strikeRate > 0
      ? Math.round((simulated.runs / simulated.strikeRate) * 100)
      : 0;
  const totalBalls = baseBalls + simBalls;
  const strikeRate = totalBalls > 0 ? Number(((runs / totalBalls) * 100).toFixed(2)) : b.strikeRate;

  let highestScore = b.highestScore;
  let highestScoreNotOut = b.highestScoreNotOut;
  if (
    simulated.highestScore > highestScore ||
    (simulated.highestScore === highestScore && simulated.highestScoreNotOut)
  ) {
    highestScore = simulated.highestScore;
    highestScoreNotOut = simulated.highestScoreNotOut;
  }

  const bowlingInnings = b.bowlingInnings + simulated.bowlingInnings;
  const oversBowled = Number((b.oversBowled + simulated.oversBowled).toFixed(1));
  const runsConceded = b.runsConceded + simulated.runsConceded;
  const wickets = b.wickets + simulated.wickets;

  let bestBowlingWickets = b.bestBowlingWickets;
  let bestBowlingRuns = b.bestBowlingRuns;
  if (
    simulated.bestBowlingWickets > bestBowlingWickets ||
    (simulated.bestBowlingWickets === bestBowlingWickets &&
      simulated.bestBowlingWickets > 0 &&
      (bestBowlingRuns === 0 || simulated.bestBowlingRuns < bestBowlingRuns))
  ) {
    bestBowlingWickets = simulated.bestBowlingWickets;
    bestBowlingRuns = simulated.bestBowlingRuns;
  }

  return {
    matches,
    innings,
    runs,
    ballsFaced: totalBalls,
    highestScore,
    highestScoreNotOut,
    average,
    strikeRate,
    centuries: b.centuries + simulated.centuries,
    doubleCenturies: (b.doubleCenturies || 0) + (simulated.doubleCenturies || 0),
    fifties: b.fifties + simulated.fifties,
    fours: b.fours + simulated.fours,
    sixes: b.sixes + simulated.sixes,
    ducks: b.ducks + simulated.ducks,
    notOuts,
    bowlingInnings,
    oversBowled,
    maidens: b.maidens + simulated.maidens,
    runsConceded,
    wickets,
    bestBowlingWickets,
    bestBowlingRuns,
    bowlingAverage: wickets > 0 ? Number((runsConceded / wickets).toFixed(2)) : 0,
    economy: oversBowled > 0 ? Number((runsConceded / oversBowled).toFixed(2)) : 0,
    bowlingStrikeRate: wickets > 0 ? Number(((oversBowled * 6) / wickets).toFixed(2)) : 0,
    fourWicketHauls: (b.fourWicketHauls || 0) + (simulated.fourWicketHauls || 0),
    fiveWicketHauls: b.fiveWicketHauls + simulated.fiveWicketHauls,
    tenWicketHauls: b.tenWicketHauls + simulated.tenWicketHauls,
    catches: b.catches + simulated.catches,
    stumpings: b.stumpings + simulated.stumpings,
    runOuts: b.runOuts + simulated.runOuts,
  };
}

export function getEffectivePlayer(playerOrId: Player | string, career?: CareerSave): Player | undefined {
  let base: Player | undefined;
  if (typeof playerOrId === 'string') {
    base =
      ALL_PLAYERS.find((p) => p.id === playerOrId) ||
      career?.emergingPlayers?.find((p) => p.id === playerOrId);
  } else {
    base = playerOrId;
  }
  if (!base) return undefined;
  if (!career) return base;

  const ov = career.playerOverrides?.[base.id];
  if (!ov) return base;

  return {
    ...base,
    ...ov,
    attributes: {
      ...base.attributes,
      ...(ov.attributes || {}),
    },
    stats: base.stats, // Always preserve verified historical stats untouched!
    simulatedStats: ov.simulatedStats || base.simulatedStats,
  };
}

export function getEffectivePlayersByCountry(
  countryId: string,
  career?: CareerSave,
  activeMenOnly: boolean = true
): Player[] {
  const normalizedId = countryId === 'SRI' ? 'SL' : countryId === 'WIN' ? 'WI' : countryId;
  const basePool = ALL_PLAYERS.filter(
    (p) => (p.countryId === normalizedId || p.countryId === countryId) && p.gender === 'MALE'
  );
  const emerging = (career?.emergingPlayers || []).filter(
    (p) => (p.countryId === normalizedId || p.countryId === countryId) && p.gender === 'MALE'
  );

  const combined = [...basePool, ...emerging].map((p) => getEffectivePlayer(p, career)!);
  if (!activeMenOnly) return combined;
  return combined.filter((p) => p.status === 'ACTIVE');
}

export function getDefaultCaptainId(countryId: string, format: MatchFormat = 'TEST'): string {
  const official = getOfficialFormatCaptain(countryId, format);
  if (official) return official;
  const normalizedId = countryId === 'SRI' ? 'SL' : countryId === 'WIN' ? 'WI' : countryId === 'SA' ? 'RSA' : countryId;
  const cfg = SQUADS_MAP[normalizedId]?.[format];
  if (cfg && cfg.captainId) {
    const p = ALL_PLAYERS.find((x) => x.id === cfg.captainId);
    if (p && p.status === 'ACTIVE' && p.gender === 'MALE') return cfg.captainId;
  }
  const pool = getFormatEligiblePlayers(normalizedId, format);
  return pool[0]?.id || '';
}

export function getDefaultViceCaptainId(countryId: string, format: MatchFormat = 'TEST'): string {
  const official = getOfficialFormatViceCaptain(countryId, format);
  if (official) return official;
  const normalizedId = countryId === 'SRI' ? 'SL' : countryId === 'WIN' ? 'WI' : countryId === 'SA' ? 'RSA' : countryId;
  const cfg = SQUADS_MAP[normalizedId]?.[format];
  if (cfg && cfg.viceCaptainId) {
    const p = ALL_PLAYERS.find((x) => x.id === cfg.viceCaptainId);
    if (p && p.status === 'ACTIVE' && p.gender === 'MALE') return cfg.viceCaptainId;
  }
  const pool = getFormatEligiblePlayers(normalizedId, format);
  return pool[1]?.id || pool[0]?.id || '';
}

export function getDefaultWicketKeeperId(countryId: string, format: MatchFormat = 'TEST'): string {
  const official = getOfficialFormatWicketKeeper(countryId, format);
  if (official) return official;
  const normalizedId = countryId === 'SRI' ? 'SL' : countryId === 'WIN' ? 'WI' : countryId === 'SA' ? 'RSA' : countryId;
  const cfg = SQUADS_MAP[normalizedId]?.[format];
  if (cfg && cfg.wicketKeeperId) {
    const p = ALL_PLAYERS.find((x) => x.id === cfg.wicketKeeperId);
    if (p && p.status === 'ACTIVE' && p.gender === 'MALE') return cfg.wicketKeeperId;
  }
  const pool = getFormatEligiblePlayers(normalizedId, format);
  const wk = pool.find((p) => p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER');
  return wk ? wk.id : (pool[2]?.id || pool[0]?.id || '');
}

export function getDefaultPlayingXI(countryId: string, format: MatchFormat = 'TEST'): string[] {
  const officialXI = getOfficialFormatXI(countryId, format);
  if (officialXI && officialXI.length === 11) return officialXI;
  const normalizedId = countryId === 'SRI' ? 'SL' : countryId === 'WIN' ? 'WI' : countryId === 'SA' ? 'RSA' : countryId;
  const cfg = SQUADS_MAP[normalizedId]?.[format];
  if (cfg && cfg.playingXI && cfg.playingXI.length >= 11) {
    const allActive = cfg.playingXI.every((id) => {
      const p = ALL_PLAYERS.find((x) => x.id === id);
      return p && p.status === 'ACTIVE' && p.gender === 'MALE';
    });
    if (allActive) {
      return cfg.playingXI;
    }
  }
  const pool = getFormatEligiblePlayers(normalizedId, format);
  return pool.slice(0, 11).map((p) => p.id);
}

export function getDefaultFormatSquadConfig(countryId: string, format: MatchFormat): FormatSquadConfig {
  const officialCfg = buildDefaultFormatSquadConfig(countryId, format);
  if (officialCfg && officialCfg.playingXI && officialCfg.playingXI.length === 11) {
    return officialCfg;
  }
  const normalizedId = countryId === 'SRI' ? 'SL' : countryId === 'WIN' ? 'WI' : countryId === 'SA' ? 'RSA' : countryId;
  const pool = getFormatEligiblePlayers(normalizedId, format);
  const poolIds = new Set(pool.map((p) => p.id));
  const cfg = SQUADS_MAP[normalizedId]?.[format];

  if (cfg && cfg.playingXI && cfg.playingXI.length >= 11) {
    const sanitizedXI = cfg.playingXI.filter((id) => poolIds.has(id));
    if (sanitizedXI.length === 11) {
      const capInXI = sanitizedXI.includes(cfg.captainId);
      const capId = capInXI ? cfg.captainId : sanitizedXI[0];
      const vcInXI = sanitizedXI.includes(cfg.viceCaptainId);
      const vcId = vcInXI ? cfg.viceCaptainId : (sanitizedXI[1] || sanitizedXI[0]);
      const wk = pool.find((x) => sanitizedXI.includes(x.id) && (x.isWicketKeeper || x.role === 'WICKETKEEPER_BATTER'));
      const wkInXI = sanitizedXI.includes(cfg.wicketKeeperId);
      const wkId = wk ? wk.id : (wkInXI ? cfg.wicketKeeperId : sanitizedXI[2]);

      return {
        ...cfg,
        playingXI: sanitizedXI,
        battingOrder: cfg.battingOrder && cfg.battingOrder.length === 11 && cfg.battingOrder.every((id) => poolIds.has(id))
          ? cfg.battingOrder
          : sanitizedXI,
        captainId: capId,
        viceCaptainId: vcId,
        wicketKeeperId: wkId,
        squadPlayerIds: (cfg.squadPlayerIds || []).filter((id) => poolIds.has(id)),
      };
    }
  }

  const xi = pool.slice(0, 11).map((p) => p.id);
  const squad = pool.slice(0, 18).map((p) => p.id);

  return {
    format,
    squadPlayerIds: squad,
    playingXI: xi,
    battingOrder: xi,
    captainId: pool[0]?.id || '',
    viceCaptainId: pool[1]?.id || '',
    wicketKeeperId: pool.find((p) => p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER')?.id || pool[2]?.id || '',
    bowlingRotation: xi.filter((id) => {
      const p = ALL_PLAYERS.find((x) => x.id === id);
      return p && (p.role === 'BOWLER' || p.role === 'ALL_ROUNDER');
    }),
  };
}

export function getDefaultSupportStaff(countryId: string): SupportStaff {
  const normalizedId = countryId === 'SRI' ? 'SL' : countryId === 'WIN' ? 'WI' : countryId;
  const staffByCountry: Record<string, Partial<SupportStaff>> = {
    IND: {
      testAssistantCoach: 'Abhishek Nayar',
      battingCoach: 'Vikram Rathour',
      bowlingCoach: 'Morne Morkel',
      spinCoach: 'Narendra Hirwani',
      fieldingCoach: 'T. Dilip',
      fitnessCoach: 'Soham Desai',
      t20Consultant: 'Ryan ten Doeschate',
    },
    AUS: {
      testAssistantCoach: 'Daniel Vettori',
      battingCoach: 'Michael Di Venuto',
      bowlingCoach: 'Allan Donald',
      spinCoach: 'Stuart MacGill',
      fieldingCoach: 'Brad Haddin',
      fitnessCoach: 'David Beakley',
      t20Consultant: 'Ricky Ponting',
    },
    ENG: {
      testAssistantCoach: 'Marcus Trescothick',
      battingCoach: 'Jonathan Trott',
      bowlingCoach: 'Jeetan Patel',
      spinCoach: 'Richard Dawson',
      fieldingCoach: 'Carl Hopkinson',
      fitnessCoach: 'Phil Scott',
      t20Consultant: 'Andrew Flintoff',
    },
    RSA: {
      testAssistantCoach: 'Ashwell Prince',
      battingCoach: 'JP Duminy',
      bowlingCoach: 'Piet Botha',
      spinCoach: 'Paul Adams',
      fieldingCoach: 'Wandile Gwavu',
      fitnessCoach: 'Greg King',
      t20Consultant: 'Jacques Kallis',
    },
    PAK: {
      testAssistantCoach: 'Azhar Mahmood',
      battingCoach: 'Mohammad Yousuf',
      bowlingCoach: 'Umar Gul',
      spinCoach: 'Saeed Ajmal',
      fieldingCoach: 'Aftab Khan',
      fitnessCoach: 'Grant Luden',
      t20Consultant: 'Shahid Afridi',
    },
    NZL: {
      testAssistantCoach: 'Luke Ronchi',
      battingCoach: 'Peter Fulton',
      bowlingCoach: 'Jacob Oram',
      spinCoach: 'Paul Wiseman',
      fieldingCoach: 'Ron Hart',
      fitnessCoach: 'Chris Donaldson',
      t20Consultant: 'Stephen Fleming',
    },
    SL: {
      testAssistantCoach: 'Naveed Nawaz',
      battingCoach: 'Thilina Kandamby',
      bowlingCoach: 'Aaqib Javed',
      spinCoach: 'Piyal Wijetunge',
      fieldingCoach: 'Upul Chandana',
      fitnessCoach: 'Grant Luden',
      t20Consultant: 'Sanath Jayasuriya',
    },
    BAN: {
      testAssistantCoach: 'Mohammad Salahuddin',
      battingCoach: 'David Hemp',
      bowlingCoach: 'Andre Adams',
      spinCoach: 'Mushtaq Ahmed',
      fieldingCoach: 'Sohel Islam',
      fitnessCoach: 'Nathan Kiely',
      t20Consultant: 'Albie Morkel',
    },
    WI: {
      testAssistantCoach: 'Rayon Griffith',
      battingCoach: 'Floyd Reifer',
      bowlingCoach: 'James Franklin',
      spinCoach: 'Carl Hooper',
      fieldingCoach: 'Ryan Hurley',
      fitnessCoach: 'Ronald Rogers',
      t20Consultant: 'Brian Lara',
    },
    AFG: {
      testAssistantCoach: 'Raees Ahmadzai',
      battingCoach: 'Andrew Puttick',
      bowlingCoach: 'Hamid Hassan',
      spinCoach: 'Muthiah Muralidaran',
      fieldingCoach: 'Shane McDermott',
      fitnessCoach: 'Jason Douglas',
      t20Consultant: 'Dwayne Bravo',
    },
    IRE: {
      testAssistantCoach: 'Gary Wilson',
      battingCoach: 'Mark Rausa',
      bowlingCoach: 'Ryan Eagleson',
      spinCoach: 'Albert van der Merwe',
      fieldingCoach: 'Peter Johnston',
      fitnessCoach: 'Brendan Connor',
      t20Consultant: 'Eoin Morgan',
    },
    ZIM: {
      testAssistantCoach: 'Stuart Matsikenyeri',
      battingCoach: 'Dion Ebrahim',
      bowlingCoach: 'Douglas Hondo',
      spinCoach: 'Ray Price',
      fieldingCoach: 'Shepherd Makunike',
      fitnessCoach: 'Sean Bell',
      t20Consultant: 'Dave Houghton',
    },
  };

  const c = staffByCountry[normalizedId] || {};
  return {
    testAssistantCoach: c.testAssistantCoach || 'Senior Assistant Coach',
    battingCoach: c.battingCoach || 'Head Batting Coach',
    bowlingCoach: c.bowlingCoach || 'Head Bowling Coach',
    spinCoach: c.spinCoach || 'Spin Bowling Specialist',
    fieldingCoach: c.fieldingCoach || 'Lead Fielding Coach',
    fitnessCoach: c.fitnessCoach || 'High Performance Director',
    t20Consultant: c.t20Consultant || 'White-Ball Tactical Consultant',
  };
}
