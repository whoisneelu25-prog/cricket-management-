export interface TournamentTableEntry {
  teamId: string;
  teamName: string;
  flagEmoji: string;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  tied: number;
  noResult: number;
  points: number;
  pointsPercentage?: number; // for WTC (PCT%)
  netRunRate?: number; // for ODI & T20
  forRuns: number;
  forOvers: number;
  againstRuns: number;
  againstOvers: number;
}

export interface Tournament {
  id: string;
  name: string;
  format: 'TEST' | 'ODI' | 'T20I';
  season: string;
  description: string;
  table: TournamentTableEntry[];
}

export const INITIAL_TOURNAMENTS: Tournament[] = [
  {
    id: 'wtc_2025',
    name: 'ICC World Test Championship',
    format: 'TEST',
    season: '2023-2025 Cycle',
    description: 'The pinnacle of Test cricket. Top two teams qualify for the Final at Lord’s.',
    table: [
      { teamId: 'AUS', teamName: 'Australia', flagEmoji: '🇦🇺', played: 12, won: 8, lost: 3, drawn: 1, tied: 0, noResult: 0, points: 90, pointsPercentage: 62.5, forRuns: 7200, forOvers: 1980, againstRuns: 6100, againstOvers: 1950 },
      { teamId: 'IND', teamName: 'India', flagEmoji: '🇮🇳', played: 14, won: 8, lost: 4, drawn: 2, tied: 0, noResult: 0, points: 98, pointsPercentage: 58.33, forRuns: 8100, forOvers: 2200, againstRuns: 7300, againstOvers: 2150 },
      { teamId: 'RSA', teamName: 'South Africa', flagEmoji: '🇿🇦', played: 8, won: 4, lost: 3, drawn: 1, tied: 0, noResult: 0, points: 52, pointsPercentage: 54.17, forRuns: 4300, forOvers: 1200, againstRuns: 4100, againstOvers: 1180 },
      { teamId: 'NZL', teamName: 'New Zealand', flagEmoji: '🇳🇿', played: 11, won: 5, lost: 5, drawn: 1, tied: 0, noResult: 0, points: 64, pointsPercentage: 48.48, forRuns: 5900, forOvers: 1650, againstRuns: 5800, againstOvers: 1620 },
      { teamId: 'ENG', teamName: 'England', flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', played: 16, won: 8, lost: 7, drawn: 1, tied: 0, noResult: 0, points: 81, pointsPercentage: 42.19, forRuns: 9500, forOvers: 2100, againstRuns: 9200, againstOvers: 2350 },
      { teamId: 'SL', teamName: 'Sri Lanka', flagEmoji: '🇱🇰', played: 9, won: 3, lost: 5, drawn: 1, tied: 0, noResult: 0, points: 38, pointsPercentage: 35.19, forRuns: 4600, forOvers: 1350, againstRuns: 5100, againstOvers: 1320 },
      { teamId: 'PAK', teamName: 'Pakistan', flagEmoji: '🇵🇰', played: 10, won: 3, lost: 6, drawn: 1, tied: 0, noResult: 0, points: 34, pointsPercentage: 28.33, forRuns: 5200, forOvers: 1500, againstRuns: 6100, againstOvers: 1480 },
      { teamId: 'WI', teamName: 'West Indies', flagEmoji: '🌴', played: 9, won: 1, lost: 6, drawn: 2, tied: 0, noResult: 0, points: 20, pointsPercentage: 18.52, forRuns: 3900, forOvers: 1280, againstRuns: 5200, againstOvers: 1240 },
    ],
  },
  {
    id: 't20_wc_2026',
    name: 'ICC Men’s T20 World Cup',
    format: 'T20I',
    season: '2026 Edition',
    description: 'Global 20-over showpiece featuring elite international nations competing for the world crown.',
    table: [
      { teamId: 'IND', teamName: 'India', flagEmoji: '🇮🇳', played: 4, won: 4, lost: 0, drawn: 0, tied: 0, noResult: 0, points: 8, netRunRate: 1.845, forRuns: 720, forOvers: 80, againstRuns: 572, againstOvers: 80 },
      { teamId: 'AUS', teamName: 'Australia', flagEmoji: '🇦🇺', played: 4, won: 3, lost: 1, drawn: 0, tied: 0, noResult: 0, points: 6, netRunRate: 1.250, forRuns: 704, forOvers: 80, againstRuns: 604, againstOvers: 80 },
      { teamId: 'RSA', teamName: 'South Africa', flagEmoji: '🇿🇦', played: 4, won: 3, lost: 1, drawn: 0, tied: 0, noResult: 0, points: 6, netRunRate: 0.890, forRuns: 660, forOvers: 80, againstRuns: 588, againstOvers: 80 },
      { teamId: 'ENG', teamName: 'England', flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', played: 4, won: 2, lost: 2, drawn: 0, tied: 0, noResult: 0, points: 4, netRunRate: 0.120, forRuns: 640, forOvers: 80, againstRuns: 630, againstOvers: 80 },
      { teamId: 'AFG', teamName: 'Afghanistan', flagEmoji: '🇦🇫', played: 4, won: 2, lost: 2, drawn: 0, tied: 0, noResult: 0, points: 4, netRunRate: -0.210, forRuns: 610, forOvers: 80, againstRuns: 627, againstOvers: 80 },
      { teamId: 'PAK', teamName: 'Pakistan', flagEmoji: '🇵🇰', played: 4, won: 1, lost: 3, drawn: 0, tied: 0, noResult: 0, points: 2, netRunRate: -0.650, forRuns: 580, forOvers: 80, againstRuns: 632, againstOvers: 80 },
      { teamId: 'WI', teamName: 'West Indies', flagEmoji: '🌴', played: 4, won: 1, lost: 3, drawn: 0, tied: 0, noResult: 0, points: 2, netRunRate: -0.980, forRuns: 570, forOvers: 80, againstRuns: 648, againstOvers: 80 },
      { teamId: 'NZL', teamName: 'New Zealand', flagEmoji: '🇳🇿', played: 4, won: 0, lost: 4, drawn: 0, tied: 0, noResult: 0, points: 0, netRunRate: -1.720, forRuns: 540, forOvers: 80, againstRuns: 677, againstOvers: 80 },
    ],
  },
  {
    id: 'cwc_2027',
    name: 'ICC Cricket World Cup',
    format: 'ODI',
    season: '2027 Edition',
    description: 'The historic 50-over championship hosted across Southern Africa.',
    table: [
      { teamId: 'IND', teamName: 'India', flagEmoji: '🇮🇳', played: 3, won: 3, lost: 0, drawn: 0, tied: 0, noResult: 0, points: 6, netRunRate: 1.420, forRuns: 920, forOvers: 150, againstRuns: 707, againstOvers: 150 },
      { teamId: 'AUS', teamName: 'Australia', flagEmoji: '🇦🇺', played: 3, won: 2, lost: 1, drawn: 0, tied: 0, noResult: 0, points: 4, netRunRate: 0.860, forRuns: 880, forOvers: 150, againstRuns: 751, againstOvers: 150 },
      { teamId: 'RSA', teamName: 'South Africa', flagEmoji: '🇿🇦', played: 3, won: 2, lost: 1, drawn: 0, tied: 0, noResult: 0, points: 4, netRunRate: 0.540, forRuns: 865, forOvers: 150, againstRuns: 784, againstOvers: 150 },
      { teamId: 'NZL', teamName: 'New Zealand', flagEmoji: '🇳🇿', played: 3, won: 1, lost: 2, drawn: 0, tied: 0, noResult: 0, points: 2, netRunRate: -0.210, forRuns: 790, forOvers: 150, againstRuns: 821, againstOvers: 150 },
      { teamId: 'ENG', teamName: 'England', flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', played: 3, won: 1, lost: 2, drawn: 0, tied: 0, noResult: 0, points: 2, netRunRate: -0.480, forRuns: 770, forOvers: 150, againstRuns: 842, againstOvers: 150 },
      { teamId: 'PAK', teamName: 'Pakistan', flagEmoji: '🇵🇰', played: 3, won: 0, lost: 3, drawn: 0, tied: 0, noResult: 0, points: 0, netRunRate: -1.950, forRuns: 690, forOvers: 150, againstRuns: 982, againstOvers: 150 },
    ],
  },
];
