import {
  RivalryCompetition,
  TournamentEdition,
  TournamentTableEntry,
} from '../types/cricket';

export function makeZeroTableEntry(teamId: string, teamName: string, flagEmoji: string, usePCT = false): TournamentTableEntry {
  return {
    teamId,
    teamName,
    flagEmoji,
    played: 0,
    won: 0,
    lost: 0,
    drawn: 0,
    tied: 0,
    noResult: 0,
    points: 0,
    pointsPercentage: usePCT ? 0 : undefined,
    netRunRate: usePCT ? undefined : 0,
    forRuns: 0,
    forOvers: 0,
    againstRuns: 0,
    againstOvers: 0,
  };
}

export const TEAM_META: Record<string, { name: string; flag: string }> = {
  IND: { name: 'India', flag: '🇮🇳' },
  AUS: { name: 'Australia', flag: '🇦🇺' },
  ENG: { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  PAK: { name: 'Pakistan', flag: '🇵🇰' },
  RSA: { name: 'South Africa', flag: '🇿🇦' },
  NZL: { name: 'New Zealand', flag: '🇳🇿' },
  SL: { name: 'Sri Lanka', flag: '🇱🇰' },
  BAN: { name: 'Bangladesh', flag: '🇧🇩' },
  WI: { name: 'West Indies', flag: '🌴' },
  AFG: { name: 'Afghanistan', flag: '🇦🇫' },
  IRE: { name: 'Ireland', flag: '☘️' },
  ZIM: { name: 'Zimbabwe', flag: '🇿🇼' },
  NEP: { name: 'Nepal', flag: '🇳🇵' },
  NED: { name: 'Netherlands', flag: '🇳🇱' },
  SCO: { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  USA: { name: 'United States', flag: '🇺🇸' },
};

export function createZeroTableForTeams(teamIds: string[], usePCT = false): TournamentTableEntry[] {
  return teamIds.map((id) => {
    const meta = TEAM_META[id] || { name: id, flag: '🏏' };
    return makeZeroTableEntry(id, meta.name, meta.flag, usePCT);
  });
}

/**
 * THE ASHES — Test Rivalry between Australia & England
 * Rules: 5-Test series, alternate hosting, drawn series retains with current holder.
 */
export const INITIAL_ASHES_COMPETITION: RivalryCompetition = {
  id: 'the_ashes',
  name: 'The Ashes',
  format: 'TEST',
  team1Id: 'AUS',
  team2Id: 'ENG',
  currentTrophyHolder: 'AUS',
  currentTourId: 'tour_ashes_2027',
  currentEditionYear: 2027,
  matchesInSeries: 5,
  currentScore: { team1Wins: 0, team2Wins: 0, draws: 0 },
  historicalEditions: [
    {
      year: '2023',
      host: 'England',
      winner: 'DRAWN (Australia Retained)',
      score: '2–2 (5 Tests)',
      holderRetained: true,
      playerOfTheSeries: 'Mitchell Starc / Chris Woakes',
      leadingRunScorer: 'Usman Khawaja (496 runs)',
      leadingWicketTaker: 'Mitchell Starc (23 wickets)',
    },
    {
      year: '2021–22',
      host: 'Australia',
      winner: 'Australia',
      score: '4–0 (5 Tests)',
      holderRetained: false,
      playerOfTheSeries: 'Travis Head',
      leadingRunScorer: 'Travis Head (357 runs)',
      leadingWicketTaker: 'Pat Cummins (21 wickets)',
    },
    {
      year: '2019',
      host: 'England',
      winner: 'DRAWN (Australia Retained)',
      score: '2–2 (5 Tests)',
      holderRetained: true,
      playerOfTheSeries: 'Steve Smith',
      leadingRunScorer: 'Steve Smith (774 runs)',
      leadingWicketTaker: 'Pat Cummins (29 wickets)',
    },
    {
      year: '2017–18',
      host: 'Australia',
      winner: 'Australia',
      score: '4–0 (5 Tests)',
      holderRetained: false,
      playerOfTheSeries: 'Steve Smith',
      leadingRunScorer: 'Steve Smith (687 runs)',
      leadingWicketTaker: 'Pat Cummins (23 wickets)',
    },
    {
      year: '2015',
      host: 'England',
      winner: 'England',
      score: '3–2 (5 Tests)',
      holderRetained: false,
      playerOfTheSeries: 'Joe Root',
      leadingRunScorer: 'Steve Smith (508 runs)',
      leadingWicketTaker: 'Stuart Broad (21 wickets)',
    },
  ],
};

/**
 * BORDER-GAVASKAR TROPHY (BGT) — Test Rivalry between India & Australia
 * Rules: 5 Tests, alternate hosting, drawn series retains with current holder.
 */
export const INITIAL_BGT_COMPETITION: RivalryCompetition = {
  id: 'border_gavaskar',
  name: 'Border-Gavaskar Trophy',
  format: 'TEST',
  team1Id: 'AUS',
  team2Id: 'IND',
  currentTrophyHolder: 'IND',
  currentTourId: 'tour_bgt_2026',
  currentEditionYear: 2026,
  matchesInSeries: 5,
  currentScore: { team1Wins: 0, team2Wins: 0, draws: 0 },
  historicalEditions: [
    {
      year: '2022–23',
      host: 'India',
      winner: 'India',
      score: '2–1 (4 Tests)',
      holderRetained: false,
      playerOfTheSeries: 'Ravichandran Ashwin & Ravindra Jadeja',
      leadingRunScorer: 'Usman Khawaja (333 runs)',
      leadingWicketTaker: 'Ravichandran Ashwin (25 wickets)',
    },
    {
      year: '2020–21',
      host: 'Australia',
      winner: 'India',
      score: '2–1 (4 Tests, Historic Gabba Win)',
      holderRetained: false,
      playerOfTheSeries: 'Pat Cummins',
      leadingRunScorer: 'Marnus Labuschagne (426 runs)',
      leadingWicketTaker: 'Pat Cummins (21 wickets)',
    },
    {
      year: '2018–19',
      host: 'Australia',
      winner: 'India',
      score: '2–1 (4 Tests)',
      holderRetained: false,
      playerOfTheSeries: 'Cheteshwar Pujara',
      leadingRunScorer: 'Cheteshwar Pujara (521 runs)',
      leadingWicketTaker: 'Jasprit Bumrah (21 wickets)',
    },
    {
      year: '2016–17',
      host: 'India',
      winner: 'India',
      score: '2–1 (4 Tests)',
      holderRetained: false,
      playerOfTheSeries: 'Ravindra Jadeja',
      leadingRunScorer: 'Steve Smith (499 runs)',
      leadingWicketTaker: 'Ravindra Jadeja (25 wickets)',
    },
  ],
};

/**
 * INITIAL MULTI-YEAR TOURNAMENT EDITIONS
 * All active/upcoming editions start with clean zeroed standings and advance purely from simulated fixtures.
 */
export const INITIAL_TOURNAMENT_EDITIONS: TournamentEdition[] = [
  // 1. ICC WORLD TEST CHAMPIONSHIP (2025–2027 Cycle)
  {
    id: 'wtc_2025_27',
    competitionType: 'WTC',
    name: 'ICC World Test Championship',
    format: 'TEST',
    season: '2025–2027 Cycle',
    cycleLengthYears: 2,
    year: 2027,
    hostCountryId: 'ENG',
    cutoffDate: '2027-06-01',
    currentStage: 'GROUP',
    participatingTeamIds: ['AUS', 'IND', 'ENG', 'RSA', 'NZL', 'PAK', 'SL', 'WI', 'BAN'],
    penalties: {},
    description: 'Two-year Test championship cycle across 9 Test nations. Top 2 teams by Points Percentage (PCT%) qualify for the standalone neutral-venue Final at Lord’s.',
    status: 'IN_PROGRESS',
    rules: {
      pointsForWin: 12,
      pointsForTie: 6,
      pointsForDraw: 4,
      pointsForLoss: 0,
      usePCT: true,
      totalQualifiers: 2,
    },
    table: createZeroTableForTeams(['AUS', 'IND', 'ENG', 'RSA', 'NZL', 'PAK', 'SL', 'WI', 'BAN'], true),
    pastChampions: [
      { year: 2025, host: "Lord's, London", winner: 'South Africa', runnerUp: 'Australia', finalResult: 'South Africa won by 5 wickets' },
      { year: 2023, host: 'The Oval, London', winner: 'Australia', runnerUp: 'India', finalResult: 'Australia won by 209 runs' },
      { year: 2021, host: 'Southampton', winner: 'New Zealand', runnerUp: 'India', finalResult: 'New Zealand won by 8 wickets' },
    ],
  },

  // 2. ICC MEN'S CRICKET WORLD CUP 2027 (ODI)
  {
    id: 'cwc_2027',
    competitionType: 'ODI_WORLD_CUP',
    name: 'ICC Men’s Cricket World Cup',
    format: 'ODI',
    season: '2027 Edition',
    cycleLengthYears: 4,
    year: 2027,
    hostCountryId: 'RSA',
    currentStage: 'GROUP',
    participatingTeamIds: ['IND', 'AUS', 'PAK', 'WI', 'BAN', 'RSA', 'ENG', 'NZL', 'SL', 'AFG'],
    description: 'Premier 50-over World Cup hosted in South Africa & Zimbabwe. Two groups of 5 teams battle for Semi-Final qualification and the World Cup trophy.',
    status: 'UPCOMING',
    rules: {
      pointsForWin: 2,
      pointsForTie: 1,
      pointsForDraw: 1,
      pointsForLoss: 0,
      qualifiersPerGroup: 2,
      totalQualifiers: 4,
    },
    table: createZeroTableForTeams(['IND', 'AUS', 'PAK', 'WI', 'BAN', 'RSA', 'ENG', 'NZL', 'SL', 'AFG'], false),
    groups: [
      {
        id: 'GROUP_A',
        name: 'Group A',
        teamIds: ['IND', 'AUS', 'PAK', 'WI', 'BAN'],
        table: createZeroTableForTeams(['IND', 'AUS', 'PAK', 'WI', 'BAN'], false),
      },
      {
        id: 'GROUP_B',
        name: 'Group B',
        teamIds: ['RSA', 'ENG', 'NZL', 'SL', 'AFG'],
        table: createZeroTableForTeams(['RSA', 'ENG', 'NZL', 'SL', 'AFG'], false),
      },
    ],
    pastChampions: [
      { year: 2023, host: 'India', winner: 'Australia', runnerUp: 'India', finalResult: 'Australia won by 6 wickets' },
      { year: 2019, host: 'England & Wales', winner: 'England', runnerUp: 'New Zealand', finalResult: 'Match tied; England won on Super Over' },
      { year: 2015, host: 'Australia & New Zealand', winner: 'Australia', runnerUp: 'New Zealand', finalResult: 'Australia won by 7 wickets' },
      { year: 2011, host: 'India, Sri Lanka & Bangladesh', winner: 'India', runnerUp: 'Sri Lanka', finalResult: 'India won by 6 wickets' },
    ],
  },

  // 3. ICC MEN'S T20 WORLD CUP (2026–27 Cycle)
  {
    id: 't20_wc_2026',
    competitionType: 'T20_WORLD_CUP',
    name: 'ICC Men’s T20 World Cup',
    format: 'T20I',
    season: '2026–27 Edition',
    cycleLengthYears: 2,
    year: 2027,
    hostCountryId: 'IND',
    currentStage: 'GROUP',
    participatingTeamIds: ['IND', 'PAK', 'ENG', 'AFG', 'AUS', 'RSA', 'WI', 'NZL'],
    description: 'Global 20-over championship hosted in India & Sri Lanka. Group stage followed by Semi-Finals and Grand Final.',
    status: 'UPCOMING',
    rules: {
      pointsForWin: 2,
      pointsForTie: 1,
      pointsForDraw: 1,
      pointsForLoss: 0,
      qualifiersPerGroup: 2,
      totalQualifiers: 4,
    },
    table: createZeroTableForTeams(['IND', 'PAK', 'ENG', 'AFG', 'AUS', 'RSA', 'WI', 'NZL'], false),
    groups: [
      {
        id: 'GROUP_A',
        name: 'Group 1',
        teamIds: ['IND', 'PAK', 'ENG', 'AFG'],
        table: createZeroTableForTeams(['IND', 'PAK', 'ENG', 'AFG'], false),
      },
      {
        id: 'GROUP_B',
        name: 'Group 2',
        teamIds: ['AUS', 'RSA', 'WI', 'NZL'],
        table: createZeroTableForTeams(['AUS', 'RSA', 'WI', 'NZL'], false),
      },
    ],
    pastChampions: [
      { year: 2024, host: 'USA & West Indies', winner: 'India', runnerUp: 'South Africa', finalResult: 'India won by 7 runs' },
      { year: 2022, host: 'Australia', winner: 'England', runnerUp: 'Pakistan', finalResult: 'England won by 5 wickets' },
      { year: 2021, host: 'UAE & Oman', winner: 'Australia', runnerUp: 'New Zealand', finalResult: 'Australia won by 8 wickets' },
    ],
  },

  // 4. ICC CHAMPIONS TROPHY (2028 Edition)
  {
    id: 'ct_2028',
    competitionType: 'CHAMPIONS_TROPHY',
    name: 'ICC Champions Trophy',
    format: 'ODI',
    season: '2028 Edition',
    cycleLengthYears: 4,
    year: 2028,
    hostCountryId: 'PAK',
    currentStage: 'GROUP',
    participatingTeamIds: ['PAK', 'IND', 'NZL', 'BAN', 'AUS', 'ENG', 'RSA', 'AFG'],
    description: 'Elite 8-nation ODI tournament featuring two groups of four, Semi-Finals, and Grand Final.',
    status: 'UPCOMING',
    rules: {
      pointsForWin: 2,
      pointsForTie: 1,
      pointsForDraw: 1,
      pointsForLoss: 0,
      qualifiersPerGroup: 2,
      totalQualifiers: 4,
    },
    table: createZeroTableForTeams(['PAK', 'IND', 'NZL', 'BAN', 'AUS', 'ENG', 'RSA', 'AFG'], false),
    groups: [
      {
        id: 'GROUP_A',
        name: 'Group A',
        teamIds: ['PAK', 'IND', 'NZL', 'BAN'],
        table: createZeroTableForTeams(['PAK', 'IND', 'NZL', 'BAN'], false),
      },
      {
        id: 'GROUP_B',
        name: 'Group B',
        teamIds: ['AUS', 'ENG', 'RSA', 'AFG'],
        table: createZeroTableForTeams(['AUS', 'ENG', 'RSA', 'AFG'], false),
      },
    ],
    pastChampions: [
      { year: 2025, host: 'Pakistan & UAE', winner: 'India', runnerUp: 'New Zealand', finalResult: 'India won by 4 wickets' },
      { year: 2017, host: 'England & Wales', winner: 'Pakistan', runnerUp: 'India', finalResult: 'Pakistan won by 180 runs' },
      { year: 2013, host: 'England & Wales', winner: 'India', runnerUp: 'England', finalResult: 'India won by 5 runs' },
    ],
  },

  // 5. ASIA CUP 2027 (T20I)
  {
    id: 'asia_cup_2027',
    competitionType: 'ASIA_CUP',
    name: 'Asia Cup',
    format: 'T20I',
    season: '2027 Edition',
    cycleLengthYears: 2,
    year: 2027,
    hostCountryId: 'SL',
    currentStage: 'GROUP',
    participatingTeamIds: ['IND', 'PAK', 'NEP', 'SL', 'BAN', 'AFG'],
    description: 'Asian continental championship featuring India, Pakistan, Sri Lanka, Bangladesh, Afghanistan, and Nepal across two groups, Semi-Finals, and Final.',
    status: 'UPCOMING',
    rules: {
      pointsForWin: 2,
      pointsForTie: 1,
      pointsForDraw: 1,
      pointsForLoss: 0,
      qualifiersPerGroup: 2,
      totalQualifiers: 4,
    },
    table: createZeroTableForTeams(['IND', 'PAK', 'NEP', 'SL', 'BAN', 'AFG'], false),
    groups: [
      {
        id: 'GROUP_A',
        name: 'Group A',
        teamIds: ['IND', 'PAK', 'NEP'],
        table: createZeroTableForTeams(['IND', 'PAK', 'NEP'], false),
      },
      {
        id: 'GROUP_B',
        name: 'Group B',
        teamIds: ['SL', 'BAN', 'AFG'],
        table: createZeroTableForTeams(['SL', 'BAN', 'AFG'], false),
      },
    ],
    pastChampions: [
      { year: 2023, host: 'Sri Lanka & Pakistan', winner: 'India', runnerUp: 'Sri Lanka', finalResult: 'India won by 10 wickets' },
      { year: 2022, host: 'UAE', winner: 'Sri Lanka', runnerUp: 'Pakistan', finalResult: 'Sri Lanka won by 23 runs' },
    ],
  },

  // 6. SOUTHERN HEMISPHERE TRI-SERIES 2027 (ODI)
  {
    id: 'tri_series_2027',
    competitionType: 'TRI_SERIES',
    name: 'Southern Hemisphere Tri-Series',
    format: 'ODI',
    season: '2027 Edition',
    cycleLengthYears: 2,
    year: 2027,
    hostCountryId: 'AUS',
    currentStage: 'GROUP',
    participatingTeamIds: ['AUS', 'RSA', 'NZL'],
    description: 'Triangular ODI series featuring Australia, South Africa, and New Zealand. Top 2 teams advance to the Grand Final.',
    status: 'UPCOMING',
    rules: {
      pointsForWin: 4,
      pointsForTie: 2,
      pointsForDraw: 2,
      pointsForLoss: 0,
      totalQualifiers: 2,
    },
    table: createZeroTableForTeams(['AUS', 'RSA', 'NZL'], false),
    pastChampions: [
      { year: 2024, host: 'Australia', winner: 'Australia', runnerUp: 'South Africa', finalResult: 'Australia won by 42 runs' },
    ],
  },
];
