import { Player, FormatStats, PlayerAttributes, PlayerSourceMeta } from '../types/cricket';
import masterPlayersJson from './master_players.json';

export function createFormatStats(partial?: Partial<FormatStats>): FormatStats {
  return {
    matches: 0,
    innings: 0,
    runs: 0,
    highestScore: 0,
    highestScoreNotOut: false,
    average: 0,
    strikeRate: 0,
    centuries: 0,
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
    fiveWicketHauls: 0,
    tenWicketHauls: 0,
    catches: 0,
    stumpings: 0,
    runOuts: 0,
    ...partial,
  };
}

export function createPlayerAttributes(partial?: Partial<PlayerAttributes>): PlayerAttributes {
  return {
    technique: 80,
    timing: 80,
    shotSelection: 80,
    defense: 75,
    aggression: 80,
    powerHitting: 80,
    againstPace: 80,
    againstSpin: 80,
    consistency: 82,
    temperament: 82,
    pace: 25,
    swing: 25,
    seam: 20,
    spin: 20,
    accuracy: 60,
    variation: 50,
    control: 60,
    deathBowling: 40,
    wicketTaking: 50,
    stamina: 85,
    fielding: 85,
    catching: 85,
    throwing: 85,
    fitness: 88,
    leadership: 75,
    mentalStrength: 85,
    currentForm: 85,
    potential: 85,
    ...partial,
  };
}

export const OFFICIAL_SOURCES = {
  ICC: { name: 'ICC Official Database', url: 'https://www.icc-cricket.com/teams/men', status: 'VERIFIED' as const, lastSync: '2026-11-03' },
  CRICBUZZ: { name: 'Cricbuzz International Directory', url: 'https://www.cricbuzz.com/cricket-team', status: 'VERIFIED' as const, lastSync: '2026-11-03' },
  CRICSHEET: { name: 'Cricsheet Ball-by-Ball Data', url: 'https://cricsheet.org/downloads/', status: 'LOCAL_CACHE' as const, lastSync: '2026-11-03' },
  ESPNCRICINFO: { name: 'ESPNcricinfo Verified Records', url: 'https://www.espncricinfo.com/', status: 'VERIFIED' as const, lastSync: '2026-11-03' },
};

const CORE_12 = new Set(['IND', 'AUS', 'ENG', 'PAK', 'RSA', 'NZL', 'SL', 'BAN', 'WI', 'AFG', 'IRE', 'ZIM']);

export const INTERNATIONAL_PLAYERS: Player[] = (masterPlayersJson as Player[]).filter(
  (p) => CORE_12.has(p.countryId)
);
