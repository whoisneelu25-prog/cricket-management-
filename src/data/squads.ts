import {
  Player,
  MatchFormat,
  FormatSquadConfig,
  SupportStaff
} from '../types/cricket';
import { INTERNATIONAL_PLAYERS } from './players';
import masterPlayersJson from './master_players.json';
import masterSquadsJson from './master_squads.json';

const CORE_12 = new Set(['IND', 'AUS', 'ENG', 'PAK', 'RSA', 'NZL', 'SL', 'BAN', 'WI', 'AFG', 'IRE', 'ZIM']);

export const ADDITIONAL_SQUAD_MEMBERS: Player[] = (masterPlayersJson as Player[]).filter(
  (p) => !CORE_12.has(p.countryId)
);

export const ALL_PLAYERS: Player[] = (masterPlayersJson as Player[]);

const SQUADS_MAP = masterSquadsJson as Record<string, Record<MatchFormat, FormatSquadConfig>>;

export function getPlayersByCountry(countryId: string): Player[] {
  const normalizedId = countryId === 'SRI' ? 'SL' : countryId === 'WIN' ? 'WI' : countryId;
  return ALL_PLAYERS.filter((p) => p.countryId === normalizedId || p.countryId === countryId);
}

export function getFormatEligiblePlayers(countryId: string, format: MatchFormat): Player[] {
  const pool = getPlayersByCountry(countryId);
  return pool.filter((p) => p.formatEligibility[format] && p.status === 'ACTIVE');
}

export function getDefaultCaptainId(countryId: string, format: MatchFormat = 'TEST'): string {
  const normalizedId = countryId === 'SRI' ? 'SL' : countryId === 'WIN' ? 'WI' : countryId;
  const cfg = SQUADS_MAP[normalizedId]?.[format];
  if (cfg && cfg.captainId) return cfg.captainId;
  const pool = getFormatEligiblePlayers(normalizedId, format);
  return pool[0]?.id || '';
}

export function getDefaultViceCaptainId(countryId: string, format: MatchFormat = 'TEST'): string {
  const normalizedId = countryId === 'SRI' ? 'SL' : countryId === 'WIN' ? 'WI' : countryId;
  const cfg = SQUADS_MAP[normalizedId]?.[format];
  if (cfg && cfg.viceCaptainId) return cfg.viceCaptainId;
  const pool = getFormatEligiblePlayers(normalizedId, format);
  return pool[1]?.id || pool[0]?.id || '';
}

export function getDefaultWicketKeeperId(countryId: string, format: MatchFormat = 'TEST'): string {
  const normalizedId = countryId === 'SRI' ? 'SL' : countryId === 'WIN' ? 'WI' : countryId;
  const cfg = SQUADS_MAP[normalizedId]?.[format];
  if (cfg && cfg.wicketKeeperId) return cfg.wicketKeeperId;
  const pool = getFormatEligiblePlayers(normalizedId, format);
  const wk = pool.find((p) => p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER');
  return wk ? wk.id : (pool[2]?.id || pool[0]?.id || '');
}

export function getDefaultPlayingXI(countryId: string, format: MatchFormat = 'TEST'): string[] {
  const normalizedId = countryId === 'SRI' ? 'SL' : countryId === 'WIN' ? 'WI' : countryId;
  const cfg = SQUADS_MAP[normalizedId]?.[format];
  if (cfg && cfg.playingXI && cfg.playingXI.length >= 11) {
    return cfg.playingXI;
  }
  const pool = getFormatEligiblePlayers(normalizedId, format);
  return pool.slice(0, 11).map((p) => p.id);
}

export function getDefaultFormatSquadConfig(countryId: string, format: MatchFormat): FormatSquadConfig {
  const normalizedId = countryId === 'SRI' ? 'SL' : countryId === 'WIN' ? 'WI' : countryId;
  const cfg = SQUADS_MAP[normalizedId]?.[format];
  if (cfg) return cfg;

  const pool = getFormatEligiblePlayers(normalizedId, format);
  const xi = pool.slice(0, 11).map((p) => p.id);
  const squad = pool.slice(0, 18).map((p) => p.id);

  return {
    format,
    squadPlayerIds: squad,
    playingXI: xi,
    battingOrder: xi,
    captainId: pool[0]?.id || '',
    viceCaptainId: pool[1]?.id || '',
    wicketKeeperId: pool.find((p) => p.isWicketKeeper)?.id || pool[2]?.id || '',
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
