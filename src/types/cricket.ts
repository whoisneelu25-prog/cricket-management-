export type MatchFormat = 'TEST' | 'ODI' | 'T20I';

export type PlayerRole = 'BATTER' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKETKEEPER_BATTER';

export type BattingHand = 'RIGHT_HAND' | 'LEFT_HAND';

export type BowlingStyle =
  | 'RIGHT_ARM_FAST'
  | 'RIGHT_ARM_FAST_MEDIUM'
  | 'RIGHT_ARM_MEDIUM'
  | 'LEFT_ARM_FAST'
  | 'LEFT_ARM_FAST_MEDIUM'
  | 'OFF_BREAK'
  | 'LEG_BREAK'
  | 'SLOW_LEFT_ARM'
  | 'LEFT_ARM_WRIST_SPIN';

export type PlayerCareerStatus = 'ACTIVE' | 'RETIRED' | 'LEGEND';

export interface FormatStats {
  matches: number;
  innings: number;
  runs: number;
  highestScore: number;
  highestScoreNotOut: boolean;
  average: number;
  strikeRate: number;
  centuries: number;
  fifties: number;
  fours: number;
  sixes: number;
  ducks: number;
  notOuts: number;

  bowlingInnings: number;
  oversBowled: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  bestBowlingWickets: number;
  bestBowlingRuns: number;
  bowlingAverage: number;
  economy: number;
  bowlingStrikeRate: number;
  fiveWicketHauls: number;
  tenWicketHauls: number;

  catches: number;
  stumpings: number;
  runOuts: number;
}

export interface PlayerAttributes {
  // Batting (0-100)
  technique: number;
  timing: number;
  shotSelection: number;
  defense: number;
  aggression: number;
  powerHitting: number;
  againstPace: number;
  againstSpin: number;
  consistency: number;
  temperament: number;

  // Bowling (0-100)
  pace: number;
  swing: number;
  seam: number;
  spin: number;
  accuracy: number;
  variation: number;
  control: number;
  deathBowling: number;
  wicketTaking: number;
  stamina: number;

  // Mental & Physical (0-100)
  fielding: number;
  catching: number;
  throwing: number;
  fitness: number;
  leadership: number;
  mentalStrength: number;
  currentForm: number; // dynamically adjusts (0-100)
  potential: number;
}

export interface PlayerSourceMeta {
  source: string;       // e.g. "ICC", "Cricbuzz", "Cricsheet"
  sourceId: string;
  lastUpdated: string;
  verified: boolean;
}

export interface PlayerMatchLog {
  matchId: string;
  date: string;
  format: MatchFormat;
  oppTeamCode: string;
  runsScored: number;
  ballsFaced: number;
  wicketsTaken: number;
  runsConceded: number;
  oversBowled: number;
}

export interface Player {
  id: string;
  name: string;
  shortName: string;
  countryId: string;
  countryName: string;
  age: number;
  dob?: string;
  gender: 'MALE' | 'FEMALE';
  status: PlayerCareerStatus;
  role: PlayerRole;
  battingHand: BattingHand;
  bowlingStyle: BowlingStyle;

  // Format Eligibility
  formatEligibility: {
    TEST: boolean;
    ODI: boolean;
    T20I: boolean;
  };

  isCaptain?: boolean;
  isViceCaptain?: boolean;
  isWicketKeeper?: boolean;

  // Workload & Health
  isInjured?: boolean;
  injuryDaysRemaining?: number;
  workloadFatigue: number; // 0 (fresh) to 100 (exhausted)

  // Format skill ratings (0-100)
  testRating: number;
  odiRating: number;
  t20Rating: number;

  attributes: PlayerAttributes;

  // Historical verified career statistics (preserved separately from simulated career)
  stats: {
    TEST: FormatStats;
    ODI: FormatStats;
    T20I: FormatStats;
  };

  // Simulated career stats added during current game career
  simulatedStats?: {
    TEST: FormatStats;
    ODI: FormatStats;
    T20I: FormatStats;
  };

  sourceMeta: PlayerSourceMeta;
  recentLogs?: PlayerMatchLog[];
}

export type DismissalType =
  | 'BOWLED'
  | 'CAUGHT'
  | 'LBW'
  | 'RUN_OUT'
  | 'STUMPED'
  | 'HIT_WICKET'
  | 'NOT_OUT';

export interface Dismissal {
  type: DismissalType;
  bowlerId?: string;
  bowlerName?: string;
  fielderId?: string;
  fielderName?: string;
  description: string;
}

export interface BatterInningsScore {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  dismissal?: Dismissal;
  isCurrentStriker: boolean;
  isCurrentNonStriker: boolean;
}

export interface BowlerInningsFigures {
  playerId: string;
  playerName: string;
  overs: number;
  ballsThisOver: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
  dots: number;
}

export interface FallOfWicket {
  wicketNumber: number;
  score: number;
  overs: number;
  batterName: string;
  partnershipRuns: number;
  partnershipBalls: number;
}

export interface BallOutcome {
  overNumber: number;
  ballInOver: number;
  runsOffBat: number;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
  };
  totalRuns: number;
  isLegalDelivery: boolean;
  isWicket: boolean;
  wicketDetails?: Dismissal;
  strikerId: string;
  strikerName: string;
  nonStrikerId: string;
  nonStrikerName: string;
  bowlerId: string;
  bowlerName: string;
  commentary: string;
  shotType?: string;
  zone?: 'COVER' | 'POINT' | 'MID_WICKET' | 'LONG_ON' | 'LONG_OFF' | 'FINE_LEG' | 'THIRD_MAN' | 'SQUARE_LEG' | 'STRAIGHT';
}

export interface InningsState {
  inningsNumber: number;
  battingTeamId: string;
  battingTeamName: string;
  bowlingTeamId: string;
  bowlingTeamName: string;
  totalRuns: number;
  wickets: number;
  completedOvers: number;
  ballsInCurrentOver: number;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    total: number;
  };
  isDeclared?: boolean;
  isAllOut?: boolean;
  isCompleted?: boolean;
  batters: BatterInningsScore[];
  bowlers: BowlerInningsFigures[];
  currentStrikerId: string;
  currentNonStrikerId: string;
  currentBowlerId: string;
  fallOfWickets: FallOfWicket[];
  recentBalls: BallOutcome[];
  targetRuns?: number;
}

export type BattingAggression =
  | 'BLOCK'
  | 'DEFENSIVE'
  | 'BALANCED'
  | 'ATTACKING'
  | 'SMASH';

export type BowlingTactic =
  | 'TIGHT_DEFENSIVE'
  | 'BALANCED_CONTAIN'
  | 'ATTACKING_FULL'
  | 'BOUNCER_SHORT'
  | 'YORKER_DEATH'
  | 'FLIGHT_SPIN';

export type FieldPreset =
  | 'DEFENSIVE_BOUNDARY'
  | 'BALANCED_STANDARD'
  | 'ATTACKING_SLIPS'
  | 'RING_INNER'
  | 'DEATH_PROTECT';

export interface PitchCondition {
  name: string;
  type: 'GREEN_SEAMER' | 'DUSTBOWL_SPIN' | 'BATTER_PARADISE' | 'SPORTING_BALANCED' | 'CRACKED_DAY5';
  paceBonus: number;
  spinBonus: number;
  bounceVariation: number;
  wearFactor: number;
}

export interface WeatherCondition {
  type: 'SUNNY' | 'OVERCAST_SWING' | 'HUMID' | 'HAZY' | 'RAIN_RISK';
  swingBonus: number;
  description: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  code: string;
  flagEmoji: string;
  primaryColor: string;
  secondaryColor: string;
  worldRankings: {
    TEST: number;
    ODI: number;
    T20I: number;
  };
  ratingPoints: {
    TEST: number;
    ODI: number;
    T20I: number;
  };
  homeVenues: string[];
  historicalAchievements: string[];
}

export interface MatchTactics {
  battingAggression: BattingAggression;
  bowlingTactic: BowlingTactic;
  fieldPreset: FieldPreset;
}

export interface Match {
  id: string;
  format: MatchFormat;
  seriesId?: string;
  seriesName?: string;
  tourId?: string;
  tournamentId?: string;
  homeTeamId: string;
  awayTeamId: string;
  venue: string;
  pitch: PitchCondition;
  weather: WeatherCondition;
  date?: string;
  dayNumber: number;
  sessionNumber: number;
  status: 'SCHEDULED' | 'TOSS' | 'IN_PROGRESS' | 'INNINGS_BREAK' | 'COMPLETED' | 'DRAW' | 'TIE';
  tossWinnerId?: string;
  tossChoice?: 'BAT' | 'BOWL';
  currentInningsIndex: number;
  innings: InningsState[];
  resultText?: string;
  playerOfTheMatch?: {
    playerId: string;
    playerName: string;
    reason: string;
  };
  homeXI: string[];
  awayXI: string[];
  homeCaptainId: string;
  awayCaptainId: string;
  homeWicketKeeperId: string;
  awayWicketKeeperId: string;
  userTeamId: string;
  isUserMatch: boolean;
  userTactics: MatchTactics;
  aiTactics: MatchTactics;
}

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

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  category: 'MATCH_REPORT' | 'SQUAD_SELECTION' | 'INJURY' | 'MILESTONE' | 'TOURNAMENT' | 'RANKINGS';
  timestamp: string;
  relatedTeamId?: string;
  relatedPlayerId?: string;
}

/**
 * Format-specific Squad configuration
 * Every format has its own Squad, Captain, Vice-Captain, Wicketkeeper, and Batting Order
 */
export interface FormatSquadConfig {
  format: MatchFormat;
  squadPlayerIds: string[]; // Active 15-20 players selected for this format
  playingXI: string[];      // Match-day 11
  battingOrder: string[];   // 11 in batting order
  captainId: string;        // Dedicated format captain
  viceCaptainId: string;    // Dedicated format vice-captain
  wicketKeeperId: string;   // Dedicated format keeper
  bowlingRotation: string[]; // Designated bowlers
}

export interface SupportStaff {
  testAssistantCoach: string;
  battingCoach: string;
  bowlingCoach: string;
  spinCoach: string;
  fieldingCoach: string;
  fitnessCoach: string;
  t20Consultant: string;
}

export interface Tour {
  id: string;
  name: string;
  hostTeamId: string;
  visitingTeamId: string;
  startDate: string;
  endDate: string;
  year: number;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
  series: {
    TEST?: { matchCount: number; matchesPlayed: number; homeWins: number; awayWins: number; draws: number };
    ODI?: { matchCount: number; matchesPlayed: number; homeWins: number; awayWins: number; ties: number };
    T20I?: { matchCount: number; matchesPlayed: number; homeWins: number; awayWins: number; ties: number };
  };
  venues: string[];
  squadSelectionDeadline: string;
  squadAnnounced: boolean;
  tourSquadIds: string[]; // 15-20 players selected from national pool
  resultText?: string;
}

export interface CalendarEvent {
  id: string;
  date: string;
  dayIndex: number;
  type: 'USER_MATCH' | 'WORLD_MATCH' | 'SQUAD_DEADLINE' | 'TOUR_START' | 'TOURNAMENT_STAGE' | 'REST_DAY';
  title: string;
  description: string;
  matchId?: string;
  tourId?: string;
  tournamentId?: string;
  isSimulated?: boolean;
}

export interface DataProvenanceReport {
  lastDatabaseUpdate: string;
  playerCount: number;
  teamCount: number;
  historicalMatchCount: number;
  sources: Array<{ name: string; url: string; status: 'ONLINE' | 'VERIFIED' | 'LOCAL_CACHE'; lastSync: string }>;
  missingRecords: string[];
  validationChecksPassed: number;
  validationChecksTotal: number;
}

export interface CareerSave {
  id: string;
  version: number;
  saveName: string;
  savedAt: string;
  manager: {
    name: string;
    nationality: string;
    preferredFormat: MatchFormat;
    coachingExperience: 'CLUB' | 'DOMESTIC' | 'INTERNATIONAL';
    managementStyle: 'TACTICAL' | 'MAN_MANAGER' | 'AGGRESSIVE' | 'ANALYTICAL';
    difficulty: 'BEGINNER' | 'NORMAL' | 'PROFESSIONAL' | 'EXPERT';
    reputation: number;
    boardConfidence: number;
    trophies: string[];
    matchesManaged: number;
    matchesWon: number;
    matchesLost: number;
    matchesDrawn: number;
  };
  supportStaff: SupportStaff;
  selectedTeamId: string;
  currentDate: string;
  currentDayIndex: number; // For progressive calendar timeline
  currentTourId: string;
  activeMatchId?: string;

  // Format-specific independent squads
  formatSquads: {
    TEST: FormatSquadConfig;
    ODI: FormatSquadConfig;
    T20I: FormatSquadConfig;
  };

  // Deprecated backwards-compatible field
  customSquadXI?: {
    TEST?: string[];
    ODI?: string[];
    T20I?: string[];
    captainId?: string;
    viceCaptainId?: string;
    wicketKeeperId?: string;
    battingOrder?: string[];
  };

  fixtures: Match[];
  worldFixtures: Match[]; // Background simulated matches among other nations
  tours: Tour[];
  calendar: CalendarEvent[];
  news: NewsArticle[];
  dataProvenance: DataProvenanceReport;
}
