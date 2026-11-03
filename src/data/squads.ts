import {
  Player,
  PlayerRole,
  BattingHand,
  BowlingStyle,
  MatchFormat,
  FormatSquadConfig,
  SupportStaff
} from '../types/cricket';
import { INTERNATIONAL_PLAYERS, createPlayerAttributes, createFormatStats } from './players';

// Helper to construct realistic supplementary squad members for international teams
function createSquadMember(
  id: string,
  name: string,
  shortName: string,
  countryId: string,
  countryName: string,
  age: number,
  role: PlayerRole,
  battingHand: BattingHand,
  bowlingStyle: BowlingStyle,
  ratings: { test: number; odi: number; t20: number },
  batPower: number,
  bowlPower: number,
  isWK?: boolean,
  formatEligibility = { TEST: true, ODI: true, T20I: true }
): Player {
  const isSpin = bowlingStyle.includes('BREAK') || bowlingStyle.includes('SPIN') || bowlingStyle.includes('SLOW');
  return {
    id,
    name,
    shortName,
    countryId,
    countryName,
    age,
    dob: `199${Math.floor(Math.random() * 8) + 1}-0${Math.floor(Math.random() * 9) + 1}-15`,
    gender: 'MALE',
    status: 'ACTIVE',
    role,
    battingHand,
    bowlingStyle,
    formatEligibility,
    workloadFatigue: 15,
    isWicketKeeper: isWK,
    testRating: ratings.test,
    odiRating: ratings.odi,
    t20Rating: ratings.t20,
    attributes: createPlayerAttributes({
      technique: Math.min(95, Math.max(40, batPower + 5)),
      timing: Math.min(95, Math.max(40, batPower + 4)),
      shotSelection: Math.min(95, Math.max(40, batPower)),
      defense: Math.min(95, Math.max(35, batPower - 2)),
      aggression: Math.min(95, Math.max(50, batPower + 8)),
      powerHitting: Math.min(98, Math.max(40, batPower + 6)),
      againstPace: Math.min(95, Math.max(40, batPower)),
      againstSpin: Math.min(95, Math.max(40, batPower - 3)),
      pace: !isSpin ? Math.min(95, Math.max(30, bowlPower + 5)) : 20,
      swing: !isSpin ? Math.min(95, Math.max(30, bowlPower)) : 15,
      seam: !isSpin ? Math.min(95, Math.max(30, bowlPower - 2)) : 15,
      spin: isSpin ? Math.min(96, Math.max(50, bowlPower + 6)) : 10,
      accuracy: Math.min(95, Math.max(40, bowlPower)),
      variation: Math.min(95, Math.max(40, bowlPower - 4)),
      control: Math.min(95, Math.max(40, bowlPower - 2)),
      deathBowling: Math.min(95, Math.max(30, bowlPower)),
      wicketTaking: Math.min(95, Math.max(30, bowlPower + 2)),
    }),
    stats: {
      TEST: createFormatStats({
        matches: 25,
        runs: role === 'BATTER' || role === 'ALL_ROUNDER' ? 1200 : 180,
        average: role === 'BATTER' ? 38.5 : 12.2,
        wickets: role === 'BOWLER' ? 78 : 6,
        catches: 18,
        stumpings: isWK ? 6 : 0,
      }),
      ODI: createFormatStats({
        matches: 45,
        runs: role === 'BATTER' || role === 'ALL_ROUNDER' ? 1450 : 90,
        average: role === 'BATTER' ? 39.2 : 14.1,
        wickets: role === 'BOWLER' ? 58 : 12,
        catches: 24,
        stumpings: isWK ? 12 : 0,
      }),
      T20I: createFormatStats({
        matches: 40,
        runs: role === 'BATTER' || role === 'ALL_ROUNDER' ? 780 : 45,
        strikeRate: 135.0,
        wickets: role === 'BOWLER' ? 42 : 8,
        catches: 18,
        stumpings: isWK ? 8 : 0,
      }),
    },
    sourceMeta: {
      source: 'Cricbuzz & ICC',
      sourceId: `cb_${id}`,
      lastUpdated: '2026-11-01',
      verified: true,
    },
  };
}

export const ADDITIONAL_SQUAD_MEMBERS: Player[] = [
  // Additional INDIA squad members
  createSquadMember('ind_jaiswal', 'Yashasvi Jaiswal', 'Y. Jaiswal', 'IND', 'India', 23, 'BATTER', 'LEFT_HAND', 'LEG_BREAK', { test: 94, odi: 88, t20: 92 }, 94, 25),
  createSquadMember('ind_rahane', 'Ajinkya Rahane', 'A. Rahane', 'IND', 'India', 36, 'BATTER', 'RIGHT_HAND', 'RIGHT_ARM_MEDIUM', { test: 87, odi: 75, t20: 70 }, 87, 20, false, { TEST: true, ODI: false, T20I: false }),
  createSquadMember('ind_shiraz', 'Mohammed Siraj', 'M. Siraj', 'IND', 'India', 30, 'BOWLER', 'RIGHT_HAND', 'RIGHT_ARM_FAST', { test: 90, odi: 93, t20: 84 }, 30, 92),
  createSquadMember('ind_shami', 'Mohammed Shami', 'M. Shami', 'IND', 'India', 34, 'BOWLER', 'RIGHT_HAND', 'RIGHT_ARM_FAST', { test: 93, odi: 96, t20: 85 }, 42, 95),
  createSquadMember('ind_arshdeep', 'Arshdeep Singh', 'A. Singh', 'IND', 'India', 25, 'BOWLER', 'LEFT_HAND', 'LEFT_ARM_FAST_MEDIUM', { test: 75, odi: 84, t20: 95 }, 25, 93, false, { TEST: false, ODI: true, T20I: true }),
  createSquadMember('ind_axar', 'Axar Patel', 'A. Patel', 'IND', 'India', 31, 'ALL_ROUNDER', 'LEFT_HAND', 'SLOW_LEFT_ARM', { test: 89, odi: 87, t20: 91 }, 83, 89),
  createSquadMember('ind_hardik', 'Hardik Pandya', 'H. Pandya', 'IND', 'India', 31, 'ALL_ROUNDER', 'RIGHT_HAND', 'RIGHT_ARM_FAST_MEDIUM', { test: 70, odi: 91, t20: 96 }, 92, 88, false, { TEST: false, ODI: true, T20I: true }),
  createSquadMember('ind_rinku', 'Rinku Singh', 'R. Singh', 'IND', 'India', 27, 'BATTER', 'LEFT_HAND', 'OFF_BREAK', { test: 72, odi: 82, t20: 93 }, 92, 20, false, { TEST: false, ODI: true, T20I: true }),
  createSquadMember('ind_sanju', 'Sanju Samson', 'S. Samson', 'IND', 'India', 30, 'WICKETKEEPER_BATTER', 'RIGHT_HAND', 'RIGHT_ARM_MEDIUM', { test: 74, odi: 86, t20: 93 }, 90, 15, true, { TEST: false, ODI: true, T20I: true }),

  // Additional AUSTRALIA squad members
  createSquadMember('aus_marsh', 'Mitchell Marsh', 'M. Marsh', 'AUS', 'Australia', 33, 'ALL_ROUNDER', 'RIGHT_HAND', 'RIGHT_ARM_FAST_MEDIUM', { test: 86, odi: 91, t20: 94 }, 92, 84),
  createSquadMember('aus_labuschagne', 'Marnus Labuschagne', 'M. Labuschagne', 'AUS', 'Australia', 30, 'BATTER', 'RIGHT_HAND', 'LEG_BREAK', { test: 92, odi: 85, t20: 74 }, 91, 55, false, { TEST: true, ODI: true, T20I: false }),
  createSquadMember('aus_hazlewood', 'Josh Hazlewood', 'J. Hazlewood', 'AUS', 'Australia', 34, 'BOWLER', 'RIGHT_HAND', 'RIGHT_ARM_FAST_MEDIUM', { test: 94, odi: 93, t20: 90 }, 25, 95),
  createSquadMember('aus_lyon', 'Nathan Lyon', 'N. Lyon', 'AUS', 'Australia', 37, 'BOWLER', 'RIGHT_HAND', 'OFF_BREAK', { test: 96, odi: 72, t20: 68 }, 30, 96, false, { TEST: true, ODI: false, T20I: false }),
  createSquadMember('aus_carey', 'Alex Carey', 'A. Carey', 'AUS', 'Australia', 33, 'WICKETKEEPER_BATTER', 'LEFT_HAND', 'OFF_BREAK', { test: 88, odi: 86, t20: 80 }, 86, 15, true),
  createSquadMember('aus_inglis', 'Josh Inglis', 'J. Inglis', 'AUS', 'Australia', 29, 'WICKETKEEPER_BATTER', 'RIGHT_HAND', 'RIGHT_ARM_MEDIUM', { test: 78, odi: 86, t20: 93 }, 90, 10, true),
  createSquadMember('aus_maxwell', 'Glenn Maxwell', 'G. Maxwell', 'AUS', 'Australia', 36, 'ALL_ROUNDER', 'RIGHT_HAND', 'OFF_BREAK', { test: 74, odi: 92, t20: 96 }, 96, 82, false, { TEST: false, ODI: true, T20I: true }),
  createSquadMember('aus_zampa', 'Adam Zampa', 'A. Zampa', 'AUS', 'Australia', 32, 'BOWLER', 'RIGHT_HAND', 'LEG_BREAK', { test: 70, odi: 93, t20: 95 }, 25, 94, false, { TEST: false, ODI: true, T20I: true }),
  createSquadMember('aus_stoinis', 'Marcus Stoinis', 'M. Stoinis', 'AUS', 'Australia', 35, 'ALL_ROUNDER', 'RIGHT_HAND', 'RIGHT_ARM_FAST_MEDIUM', { test: 70, odi: 84, t20: 91 }, 89, 83, false, { TEST: false, ODI: true, T20I: true }),

  // Additional ENGLAND squad members
  createSquadMember('eng_brook', 'Harry Brook', 'H. Brook', 'ENG', 'England', 25, 'BATTER', 'RIGHT_HAND', 'RIGHT_ARM_MEDIUM', { test: 94, odi: 89, t20: 92 }, 94, 45),
  createSquadMember('eng_crawley', 'Zak Crawley', 'Z. Crawley', 'ENG', 'England', 27, 'BATTER', 'RIGHT_HAND', 'OFF_BREAK', { test: 86, odi: 78, t20: 76 }, 87, 20, false, { TEST: true, ODI: false, T20I: false }),
  createSquadMember('eng_duckett', 'Ben Duckett', 'B. Duckett', 'ENG', 'England', 30, 'BATTER', 'LEFT_HAND', 'RIGHT_ARM_MEDIUM', { test: 89, odi: 85, t20: 84 }, 89, 15),
  createSquadMember('eng_archer', 'Jofra Archer', 'J. Archer', 'ENG', 'England', 29, 'BOWLER', 'RIGHT_HAND', 'RIGHT_ARM_FAST', { test: 88, odi: 92, t20: 95 }, 50, 95),
  createSquadMember('eng_rashid', 'Adil Rashid', 'A. Rashid', 'ENG', 'England', 37, 'BOWLER', 'RIGHT_HAND', 'LEG_BREAK', { test: 75, odi: 93, t20: 96 }, 35, 94, false, { TEST: false, ODI: true, T20I: true }),
  createSquadMember('eng_wood', 'Mark Wood', 'M. Wood', 'ENG', 'England', 35, 'BOWLER', 'RIGHT_HAND', 'RIGHT_ARM_FAST', { test: 90, odi: 88, t20: 90 }, 34, 96),
  createSquadMember('eng_woakes', 'Chris Woakes', 'C. Woakes', 'ENG', 'England', 36, 'ALL_ROUNDER', 'RIGHT_HAND', 'RIGHT_ARM_FAST_MEDIUM', { test: 90, odi: 87, t20: 82 }, 82, 89),

  // Additional SOUTH AFRICA squad members
  createSquadMember('rsa_bavuma', 'Temba Bavuma', 'T. Bavuma', 'RSA', 'South Africa', 34, 'BATTER', 'RIGHT_HAND', 'RIGHT_ARM_MEDIUM', { test: 88, odi: 87, t20: 78 }, 87, 20),
  createSquadMember('rsa_markram', 'Aiden Markram', 'A. Markram', 'RSA', 'South Africa', 30, 'BATTER', 'RIGHT_HAND', 'OFF_BREAK', { test: 88, odi: 90, t20: 92 }, 90, 70),
  createSquadMember('rsa_klaasen', 'Heinrich Klaasen', 'H. Klaasen', 'RSA', 'South Africa', 33, 'WICKETKEEPER_BATTER', 'RIGHT_HAND', 'OFF_BREAK', { test: 75, odi: 95, t20: 98 }, 98, 15, true, { TEST: false, ODI: true, T20I: true }),
  createSquadMember('rsa_miller', 'David Miller', 'D. Miller', 'RSA', 'South Africa', 35, 'BATTER', 'LEFT_HAND', 'RIGHT_ARM_OFF_BREAK', { test: 70, odi: 91, t20: 94 }, 95, 15, false, { TEST: false, ODI: true, T20I: true }),
  createSquadMember('rsa_rabada', 'Kagiso Rabada', 'K. Rabada', 'RSA', 'South Africa', 29, 'BOWLER', 'RIGHT_HAND', 'RIGHT_ARM_FAST', { test: 96, odi: 94, t20: 93 }, 38, 96),
  createSquadMember('rsa_jansen', 'Marco Jansen', 'M. Jansen', 'RSA', 'South Africa', 24, 'ALL_ROUNDER', 'RIGHT_HAND', 'LEFT_ARM_FAST', { test: 89, odi: 88, t20: 89 }, 82, 91),
  createSquadMember('rsa_maharaj', 'Keshav Maharaj', 'K. Maharaj', 'RSA', 'South Africa', 35, 'BOWLER', 'RIGHT_HAND', 'SLOW_LEFT_ARM', { test: 91, odi: 90, t20: 88 }, 45, 92),
  createSquadMember('rsa_nortje', 'Anrich Nortje', 'A. Nortje', 'RSA', 'South Africa', 31, 'BOWLER', 'RIGHT_HAND', 'RIGHT_ARM_FAST', { test: 87, odi: 88, t20: 94 }, 28, 96),

  // Additional PAKISTAN squad members
  createSquadMember('pak_babar', 'Babar Azam', 'B. Azam', 'PAK', 'Pakistan', 30, 'BATTER', 'RIGHT_HAND', 'OFF_BREAK', { test: 91, odi: 96, t20: 92 }, 93, 30),
  createSquadMember('pak_rizwan', 'Mohammad Rizwan', 'M. Rizwan', 'PAK', 'Pakistan', 32, 'WICKETKEEPER_BATTER', 'RIGHT_HAND', 'RIGHT_ARM_MEDIUM', { test: 89, odi: 92, t20: 94 }, 90, 20, true),
  createSquadMember('pak_shaheen', 'Shaheen Shah Afridi', 'S. Afridi', 'PAK', 'Pakistan', 24, 'BOWLER', 'LEFT_HAND', 'LEFT_ARM_FAST', { test: 91, odi: 94, t20: 94 }, 45, 95),
  createSquadMember('pak_naseem', 'Naseem Shah', 'N. Shah', 'PAK', 'Pakistan', 22, 'BOWLER', 'RIGHT_HAND', 'RIGHT_ARM_FAST', { test: 89, odi: 91, t20: 92 }, 40, 94),
  createSquadMember('pak_shan', 'Shan Masood', 'S. Masood', 'PAK', 'Pakistan', 35, 'BATTER', 'LEFT_HAND', 'RIGHT_ARM_MEDIUM', { test: 86, odi: 79, t20: 75 }, 86, 20, false, { TEST: true, ODI: false, T20I: false }),
  createSquadMember('pak_rauf', 'Haris Rauf', 'H. Rauf', 'PAK', 'Pakistan', 31, 'BOWLER', 'RIGHT_HAND', 'RIGHT_ARM_FAST', { test: 72, odi: 90, t20: 93 }, 25, 94, false, { TEST: false, ODI: true, T20I: true }),
  createSquadMember('pak_agha', 'Agha Salman', 'A. Salman', 'PAK', 'Pakistan', 31, 'ALL_ROUNDER', 'RIGHT_HAND', 'OFF_BREAK', { test: 86, odi: 83, t20: 81 }, 84, 78),

  // NEW ZEALAND
  createSquadMember('nzl_williamson', 'Kane Williamson', 'K. Williamson', 'NZL', 'New Zealand', 34, 'BATTER', 'RIGHT_HAND', 'OFF_BREAK', { test: 96, odi: 94, t20: 88 }, 95, 40),
  createSquadMember('nzl_latham', 'Tom Latham', 'T. Latham', 'NZL', 'New Zealand', 32, 'WICKETKEEPER_BATTER', 'LEFT_HAND', 'RIGHT_ARM_MEDIUM', { test: 89, odi: 87, t20: 78 }, 88, 15, true),
  createSquadMember('nzl_mitchell', 'Daryl Mitchell', 'D. Mitchell', 'NZL', 'New Zealand', 33, 'ALL_ROUNDER', 'RIGHT_HAND', 'RIGHT_ARM_MEDIUM', { test: 90, odi: 92, t20: 90 }, 92, 75),
  createSquadMember('nzl_santner', 'Mitchell Santner', 'M. Santner', 'NZL', 'New Zealand', 33, 'ALL_ROUNDER', 'LEFT_HAND', 'SLOW_LEFT_ARM', { test: 85, odi: 89, t20: 94 }, 80, 91),
  createSquadMember('nzl_henry', 'Matt Henry', 'M. Henry', 'NZL', 'New Zealand', 33, 'BOWLER', 'RIGHT_HAND', 'RIGHT_ARM_FAST_MEDIUM', { test: 92, odi: 91, t20: 86 }, 40, 93),
  createSquadMember('nzl_boult', 'Trent Boult', 'T. Boult', 'NZL', 'New Zealand', 35, 'BOWLER', 'RIGHT_HAND', 'LEFT_ARM_FAST_MEDIUM', { test: 90, odi: 93, t20: 93 }, 35, 94),

  // AFGHANISTAN
  createSquadMember('afg_gurbaz', 'Rahmanullah Gurbaz', 'R. Gurbaz', 'AFG', 'Afghanistan', 23, 'WICKETKEEPER_BATTER', 'RIGHT_HAND', 'RIGHT_ARM_MEDIUM', { test: 75, odi: 89, t20: 94 }, 92, 10, true),
  createSquadMember('afg_farooqi', 'Fazalhaq Farooqi', 'F. Farooqi', 'AFG', 'Afghanistan', 24, 'BOWLER', 'RIGHT_HAND', 'LEFT_ARM_FAST_MEDIUM', { test: 76, odi: 90, t20: 94 }, 25, 93),
  createSquadMember('afg_nabi', 'Mohammad Nabi', 'M. Nabi', 'AFG', 'Afghanistan', 40, 'ALL_ROUNDER', 'RIGHT_HAND', 'OFF_BREAK', { test: 80, odi: 88, t20: 90 }, 86, 88),
  createSquadMember('afg_noor', 'Noor Ahmad', 'N. Ahmad', 'AFG', 'Afghanistan', 20, 'BOWLER', 'RIGHT_HAND', 'LEFT_ARM_WRIST_SPIN', { test: 75, odi: 86, t20: 92 }, 25, 92),
];

export const ALL_PLAYERS: Player[] = [...INTERNATIONAL_PLAYERS, ...ADDITIONAL_SQUAD_MEMBERS];

/**
 * Returns all players representing a specific country (active national pool)
 */
export function getPlayersByCountry(countryId: string): Player[] {
  return ALL_PLAYERS.filter((p) => p.countryId === countryId);
}

/**
 * Returns players eligible for a specific format in the nation
 */
export function getFormatEligiblePlayers(countryId: string, format: MatchFormat): Player[] {
  return getPlayersByCountry(countryId).filter((p) => p.formatEligibility?.[format] ?? true);
}

/**
 * Returns country-specific dedicated captains for each format
 */
export function getDefaultCaptainId(countryId: string, format: MatchFormat): string {
  const squad = getPlayersByCountry(countryId);

  if (countryId === 'IND') {
    if (format === 'TEST') return squad.find((p) => p.id === 'ind_rohit')?.id || squad[0].id;
    if (format === 'ODI') return squad.find((p) => p.id === 'ind_rohit')?.id || squad[0].id;
    if (format === 'T20I') return squad.find((p) => p.id === 'ind_surya')?.id || squad[0].id;
  }
  if (countryId === 'AUS') {
    if (format === 'TEST') return squad.find((p) => p.id === 'aus_cummins')?.id || squad[0].id;
    if (format === 'ODI') return squad.find((p) => p.id === 'aus_cummins')?.id || squad[0].id;
    if (format === 'T20I') return squad.find((p) => p.id === 'aus_marsh')?.id || squad[0].id;
  }
  if (countryId === 'ENG') {
    if (format === 'TEST') return squad.find((p) => p.id === 'eng_stokes')?.id || squad[0].id;
    if (format === 'ODI') return squad.find((p) => p.id === 'eng_buttler')?.id || squad[0].id;
    if (format === 'T20I') return squad.find((p) => p.id === 'eng_buttler')?.id || squad[0].id;
  }
  if (countryId === 'PAK') {
    if (format === 'TEST') return squad.find((p) => p.id === 'pak_shan')?.id || squad[0].id;
    if (format === 'ODI') return squad.find((p) => p.id === 'pak_rizwan')?.id || squad[0].id;
    if (format === 'T20I') return squad.find((p) => p.id === 'pak_rizwan')?.id || squad[0].id;
  }
  if (countryId === 'RSA') {
    if (format === 'TEST') return squad.find((p) => p.id === 'rsa_bavuma')?.id || squad[0].id;
    if (format === 'ODI') return squad.find((p) => p.id === 'rsa_bavuma')?.id || squad[0].id;
    if (format === 'T20I') return squad.find((p) => p.id === 'rsa_markram')?.id || squad[0].id;
  }

  // Fallback
  const leader = squad.find((p) => p.isCaptain) || squad[0];
  return leader ? leader.id : '';
}

/**
 * Returns dedicated vice-captain for a nation and format
 */
export function getDefaultViceCaptainId(countryId: string, format: MatchFormat): string {
  const squad = getPlayersByCountry(countryId);
  if (countryId === 'IND') {
    if (format === 'TEST') return 'ind_bumrah';
    if (format === 'ODI') return 'ind_gill';
    if (format === 'T20I') return 'ind_hardik';
  }
  if (countryId === 'AUS') {
    if (format === 'TEST') return 'aus_head';
    if (format === 'ODI') return 'aus_head';
    if (format === 'T20I') return 'aus_head';
  }
  const vc = squad.find((p) => p.isViceCaptain) || squad[1];
  return vc ? vc.id : (squad[1]?.id || '');
}

/**
 * Returns dedicated wicketkeeper for a nation and format
 */
export function getDefaultWicketKeeperId(countryId: string, format: MatchFormat): string {
  const squad = getFormatEligiblePlayers(countryId, format);
  const wk = squad.find((p) => p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER');
  return wk ? wk.id : (squad[2]?.id || '');
}

/**
 * Generates an authentic format-specific squad config
 */
export function getDefaultFormatSquadConfig(countryId: string, format: MatchFormat): FormatSquadConfig {
  const pool = getFormatEligiblePlayers(countryId, format);
  const captainId = getDefaultCaptainId(countryId, format);
  const viceCaptainId = getDefaultViceCaptainId(countryId, format);
  const wicketKeeperId = getDefaultWicketKeeperId(countryId, format);

  // Pick top 15 players for the format squad based on rating
  const sorted = [...pool].sort((a, b) => {
    const ratingA = format === 'TEST' ? a.testRating : format === 'ODI' ? a.odiRating : a.t20Rating;
    const ratingB = format === 'TEST' ? b.testRating : format === 'ODI' ? b.odiRating : b.t20Rating;
    return ratingB - ratingA;
  });

  const squadPlayerIds = sorted.slice(0, 16).map((p) => p.id);

  // Make sure captain, vc, wk are in squad
  if (captainId && !squadPlayerIds.includes(captainId)) squadPlayerIds.unshift(captainId);
  if (viceCaptainId && !squadPlayerIds.includes(viceCaptainId)) squadPlayerIds.push(viceCaptainId);
  if (wicketKeeperId && !squadPlayerIds.includes(wicketKeeperId)) squadPlayerIds.push(wicketKeeperId);

  // Build balanced Playing XI: 1 WK, 4-5 Batters, 1-2 All-Rounders, 3-4 Bowlers
  const selectedXI: string[] = [];
  const squadPlayers = squadPlayerIds.map((id) => pool.find((p) => p.id === id)).filter((p): p is Player => p !== undefined);

  // 1. Captain
  if (captainId) selectedXI.push(captainId);

  // 2. Wicketkeeper
  if (wicketKeeperId && !selectedXI.includes(wicketKeeperId)) selectedXI.push(wicketKeeperId);

  // 3. Batters
  const batters = squadPlayers.filter((p) => p.role === 'BATTER' && !selectedXI.includes(p.id));
  selectedXI.push(...batters.slice(0, 4).map((p) => p.id));

  // 4. All-Rounders
  const allRounders = squadPlayers.filter((p) => p.role === 'ALL_ROUNDER' && !selectedXI.includes(p.id));
  selectedXI.push(...allRounders.slice(0, 2).map((p) => p.id));

  // 5. Bowlers
  const bowlers = squadPlayers.filter((p) => p.role === 'BOWLER' && !selectedXI.includes(p.id));
  selectedXI.push(...bowlers.slice(0, 4).map((p) => p.id));

  // Fill up to 11 if still under
  for (const p of squadPlayers) {
    if (selectedXI.length >= 11) break;
    if (!selectedXI.includes(p.id)) selectedXI.push(p.id);
  }

  const finalXI = selectedXI.slice(0, 11);

  // Bowling rotation (specialist bowlers + all-rounders)
  const bowlingRotation = finalXI.filter((id) => {
    const p = pool.find((pl) => pl.id === id);
    return p && (p.role === 'BOWLER' || p.role === 'ALL_ROUNDER');
  });

  return {
    format,
    squadPlayerIds: squadPlayerIds.slice(0, 18),
    playingXI: finalXI,
    battingOrder: [...finalXI],
    captainId,
    viceCaptainId,
    wicketKeeperId,
    bowlingRotation,
  };
}

/**
 * Returns realistic support staff for the unified national Head Coach
 */
export function getDefaultSupportStaff(countryId: string): SupportStaff {
  if (countryId === 'IND') {
    return {
      testAssistantCoach: 'Abhishek Nayar',
      battingCoach: 'Vikram Rathour',
      bowlingCoach: 'Morne Morkel',
      spinCoach: 'Narendra Hirwani',
      fieldingCoach: 'T. Dilip',
      fitnessCoach: 'Soham Desai',
      t20Consultant: 'Ryan ten Doeschate',
    };
  }
  if (countryId === 'AUS') {
    return {
      testAssistantCoach: 'Daniel Vettori',
      battingCoach: 'Michael Di Venuto',
      bowlingCoach: 'Allan Donald',
      spinCoach: 'Stuart MacGill',
      fieldingCoach: 'Brad Haddin',
      fitnessCoach: 'David Beakley',
      t20Consultant: 'Ricky Ponting',
    };
  }
  if (countryId === 'ENG') {
    return {
      testAssistantCoach: 'Marcus Trescothick',
      battingCoach: 'Jonathan Trott',
      bowlingCoach: 'Jeetan Patel',
      spinCoach: 'Richard Dawson',
      fieldingCoach: 'Carl Hopkinson',
      fitnessCoach: 'Phil Scott',
      t20Consultant: 'Kieron Pollard',
    };
  }
  return {
    testAssistantCoach: 'Assistant Head Coach',
    battingCoach: 'Lead Batting Coach',
    bowlingCoach: 'Senior Fast Bowling Coach',
    spinCoach: 'Spin Bowling Consultant',
    fieldingCoach: 'High Performance Fielding Coach',
    fitnessCoach: 'Lead Physiotherapist & S&C',
    t20Consultant: 'White-ball Tactical Specialist',
  };
}

/**
 * Legacy compatibility helper
 */
export function getDefaultPlayingXI(countryId: string, format: MatchFormat = 'TEST'): string[] {
  const config = getDefaultFormatSquadConfig(countryId, format);
  return config.playingXI;
}
