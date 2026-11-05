export type MatchFormat = 'TEST' | 'ODI' | 'T20I';

export type PlayerRole = 'BATTER' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKETKEEPER_BATTER';

export type GranularPlayerRole =
  | 'BATTER'
  | 'OPENING_BATTER'
  | 'MIDDLE_ORDER_BATTER'
  | 'WICKETKEEPER_BATTER'
  | 'ALL_ROUNDER'
  | 'FAST_BOWLER'
  | 'SPIN_BOWLER';

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
  ballsFaced?: number;
  highestScore: number;
  highestScoreNotOut: boolean;
  average: number;
  strikeRate: number;
  centuries: number;
  doubleCenturies?: number;
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
  fourWicketHauls?: number;
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
  granularRole?: GranularPlayerRole;
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
  injuryType?: string;
  injurySeverity?: 'MINOR' | 'MODERATE' | 'SEVERE';
  workloadFatigue: number; // 0 (fresh) to 100 (exhausted)
  fitness?: number; // 0-100 overall physical conditioning
  currentForm?: number; // 0-100 form momentum

  // Player Development & Potential
  potential?: number; // 0-100 development ceiling
  trainingFocus?: 'BATTING' | 'BOWLING' | 'FIELDING' | 'FITNESS' | 'AUTO';
  developmentFeedback?: 'Improving' | 'Developing steadily' | 'No significant change' | 'At peak performance' | 'Declining';
  developmentHistory?: Array<{
    date: string;
    attribute: string;
    change: number;
    message: string;
    ratingBefore: number;
    ratingAfter: number;
  }>;

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
  | 'OBSTRUCTING_FIELD'
  | 'HIT_BALL_TWICE'
  | 'RETIRED_OUT'
  | 'TIMED_OUT'
  | 'NOT_OUT';

export interface Dismissal {
  type: DismissalType;
  dismissedPlayerId?: string;
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
    penalty?: number;
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
  pitchMap?: {
    line: BowlingLine;
    length: BowlingLength;
    xCm: number;
    yMeters: number;
  };
  wagonWheel?: {
    angleDegrees: number;
    distanceMeters: number;
    zone: string;
    isAerial: boolean;
  };
  drsDetails?: {
    isReviewed?: boolean;
    reviewId?: string;
    reviewOutcome?: DRSOutcome;
  };
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
    penalty?: number;
    total: number;
  };
  isDeclared?: boolean;
  isAllOut?: boolean;
  isCompleted?: boolean;
  isFreeHit?: boolean;
  allocatedOvers?: number;
  superOverNumber?: number;
  batters: BatterInningsScore[];
  bowlers: BowlerInningsFigures[];
  currentStrikerId: string;
  currentNonStrikerId: string;
  currentBowlerId: string;
  fallOfWickets: FallOfWicket[];
  recentBalls: BallOutcome[];
  targetRuns?: number;
  // Test cricket ball & spell tracking
  ballAgeOvers?: number;
  newBallAvailable?: boolean;
  newBallsTaken?: number;
  bowlerSpellOvers?: Record<string, number>;
  bowlerLastOverBowled?: Record<string, number>;
  lastCompletedOverBowlerId?: string;
  lastWicketLegalBalls?: number;
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

// --- MASTER UPGRADE TACTICAL TYPES ---

// 1. Individual Batter Instructions
export type BattingApproach =
  | 'VERY_DEFENSIVE'
  | 'DEFENSIVE'
  | 'BALANCED'
  | 'POSITIVE'
  | 'AGGRESSIVE'
  | 'SMASH';

export type ShotSelection =
  | 'PLAY_STRAIGHT'
  | 'TARGET_OFF'
  | 'TARGET_LEG'
  | 'ALONG_GROUND'
  | 'LOOK_FOR_BOUNDARIES'
  | 'ROTATE_STRIKE'
  | 'AVOID_RISKY_SHOTS'
  | 'ATTACK_SPIN'
  | 'ATTACK_PACE'
  | 'PLAY_LATE_PACE';

export type BowlerTargetAction =
  | 'ATTACK'
  | 'DEFEND'
  | 'ROTATE_STRIKE'
  | 'TARGET_WEAKNESS';

export type SituationalInstruction =
  | 'PROTECT_WICKET'
  | 'BUILD_PARTNERSHIP'
  | 'ACCELERATE'
  | 'SURVIVE_SESSION'
  | 'ATTACK_POWERPLAY'
  | 'TARGET_DEATH'
  | 'PRESERVE_WICKETS';

export interface IndividualBatterInstruction {
  playerId: string;
  approach: BattingApproach;
  shotSelection: ShotSelection;
  bowlerInstruction?: {
    targetBowlerId?: string;
    action: BowlerTargetAction;
  };
  situationalInstruction?: SituationalInstruction;
}

// 2. Team Batting Game Plans
export type GeneralGamePlan =
  | 'DEFENSIVE_ACCUMULATION'
  | 'BALANCED_BATTING'
  | 'POSITIVE_CRICKET'
  | 'AGGRESSIVE_BATTING'
  | 'SMASH'
  | 'ALL_OUT_ATTACK'
  | 'BUILD_PARTNERSHIPS'
  | 'PROTECT_WICKETS'
  | 'TARGET_SPECIFIC_BOWLERS'
  | 'ACCELERATE_SCORING';

export type TestGamePlan =
  | 'OCCUPY_CREASE'
  | 'BUILD_LONG_INNINGS'
  | 'PROTECT_WICKETS'
  | 'ROTATE_STRIKE'
  | 'COUNTERATTACK'
  | 'ATTACK_SPINNERS'
  | 'BAT_FOR_DRAW'
  | 'ACCELERATE_DECLARATION';

export type ODIGamePlan =
  | 'CONSERVATIVE_OPENING'
  | 'POWERPLAY_AGGRESSION'
  | 'BALANCED_POWERPLAY'
  | 'BUILD_PARTNERSHIPS'
  | 'MIDDLE_ACCUMULATION'
  | 'ROTATE_STRIKE'
  | 'ATTACK_SPIN'
  | 'TARGET_WEAKER_BOWLERS'
  | 'ACCELERATE_30_OVERS'
  | 'DEATH_OVER_ATTACK'
  | 'CONTROLLED_CHASE';

export type T20IGamePlan =
  | 'POWERPLAY_ATTACK'
  | 'BALANCED_POWERPLAY'
  | 'MIDDLE_ROTATION'
  | 'SPIN_ATTACK'
  | 'PACE_ATTACK'
  | 'DEATH_ACCELERATION'
  | 'SMASH'
  | 'ALL_OUT_ATTACK'
  | 'DEFEND_LOW_TARGET';

export type TeamBattingGamePlan = GeneralGamePlan | TestGamePlan | ODIGamePlan | T20IGamePlan;

// 3. Custom Scoring Targets & Phase Targets
export type TargetStatus = 'AHEAD_OF_PLAN' | 'ON_TRACK' | 'BEHIND_PLAN' | 'TARGET_ACHIEVED';

export interface CustomScoringTarget {
  id: string;
  targetScore: number;
  targetOver: number;
  label?: string;
  achieved?: boolean;
}

export interface PhaseScoringTargets {
  powerplayTarget?: CustomScoringTarget;
  middlePhaseTarget?: CustomScoringTarget;
  deathPhaseTarget?: CustomScoringTarget;
  phaseBattingPlan?: string;
}

// 4. Individual Bowling Plans
export type BowlingLine =
  | 'OUTSIDE_OFF'
  | 'FOURTH_STUMP'
  | 'MIDDLE_STUMP'
  | 'LEG_STUMP'
  | 'WIDE_OUTSIDE_OFF'
  | 'BODY_LINE';

export type BowlingLength =
  | 'YORKER'
  | 'FULL'
  | 'GOOD_LENGTH'
  | 'BACK_OF_A_LENGTH'
  | 'SHORT'
  | 'BOUNCER';

export type FastBowlingVariation =
  | 'OUTSWING'
  | 'INSWING'
  | 'REVERSE_SWING'
  | 'SLOWER_BALL'
  | 'CUTTER'
  | 'YORKER'
  | 'BOUNCER';

export type SpinBowlingVariation =
  | 'OFF_BREAK'
  | 'LEG_BREAK'
  | 'GOOGLY'
  | 'TOP_SPINNER'
  | 'ARM_BALL'
  | 'FLIGHTED'
  | 'FASTER_DELIVERY';

export type BowlingIntention =
  | 'ATTACK_WICKETS'
  | 'BUILD_PRESSURE'
  | 'DEFEND_RUNS'
  | 'FORCE_MISTAKES'
  | 'TARGET_STUMPS'
  | 'OUTSIDE_OFF_CONTAINMENT'
  | 'BODY_LINE_ATTACK'
  | 'RESTRICT_BOUNDARIES';

export interface IndividualBowlingPlan {
  bowlerId: string;
  line: BowlingLine;
  length: BowlingLength;
  variation?: FastBowlingVariation | SpinBowlingVariation;
  intention: BowlingIntention;
  targetBatterId?: string;
}

// 5. Bowling Spells & Fatigue Management
export type BowlerFatigueLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXHAUSTED';

export interface BowlerSpellData {
  bowlerId: string;
  totalOvers: number;
  currentSpellOvers: number;
  targetSpellLength?: number;
  spellHistory: number[];
  restOversSinceLastSpell: number;
  fatigue: BowlerFatigueLevel;
  effectiveness: number; // 0-100%
  recommendedRestOvers: number;
  availableForSpell: boolean;
  pitchSuitability: string;
}

// 6. Custom Field Placement & Legal Circle Restrictions
export type FieldPosition =
  | 'SLIP_1'
  | 'SLIP_2'
  | 'SLIP_3'
  | 'GULLY'
  | 'POINT'
  | 'BACKWARD_POINT'
  | 'COVER'
  | 'EXTRA_COVER'
  | 'MID_OFF'
  | 'MID_ON'
  | 'MIDWICKET'
  | 'SQUARE_LEG'
  | 'FINE_LEG'
  | 'THIRD_MAN'
  | 'LONG_ON'
  | 'LONG_OFF'
  | 'DEEP_COVER'
  | 'DEEP_MIDWICKET'
  | 'DEEP_SQUARE_LEG'
  | 'SHORT_LEG'
  | 'SILLY_POINT'
  | 'LEG_SLIP'
  | 'WICKETKEEPER';

export interface CustomFieldPosition {
  position: FieldPosition;
  fielderId: string;
  x: number; // 0-100%
  y: number; // 0-100%
  isDeep: boolean;
  isLegSide: boolean;
}

export interface CustomFieldLayout {
  id: string;
  name: string;
  positions: CustomFieldPosition[];
  isLegal: boolean;
  validationErrors?: string[];
}

// 7. Decision Review System (DRS)
export type DRSReviewType = 'LBW' | 'CAUGHT_BEHIND' | 'CATCH';
export type DRSOutcome = 'DECISION_OVERTURNED' | 'DECISION_STANDS' | 'UMPIRES_CALL';

export interface DRSReviewState {
  id: string;
  matchId: string;
  deliveryIndex: number;
  overNumber: number;
  ballInOver: number;
  reviewingTeamId: string;
  originalDecision: 'OUT' | 'NOT_OUT';
  dismissalType: DismissalType;
  strikerId: string;
  bowlerId: string;
  reviewType: DRSReviewType;
  outcome: DRSOutcome;
  finalDecision: 'OUT' | 'NOT_OUT';
  reason: string;
  ballTracking?: {
    pitching: 'OUTSIDE_OFF' | 'IN_LINE' | 'OUTSIDE_LEG';
    impact: 'IN_LINE' | 'OUTSIDE_OFF' | 'UMPIRES_CALL';
    wickets: 'HITTING' | 'MISSING' | 'UMPIRES_CALL';
    projectedHeightCm: number;
  };
  ultraEdge?: {
    hasSpike: boolean;
    spikeFrame: number;
    spikeAmplitude: number;
    gapToBatMm: number;
  };
  reviewsRemainingHome: number;
  reviewsRemainingAway: number;
  retained: boolean;
}

// 8. Match Intelligence Deliveries
export interface WagonWheelShot {
  deliveryIndex: number;
  strikerId: string;
  runs: number;
  angleDegrees: number;
  distanceMeters: number;
  zone: 'COVER' | 'POINT' | 'MID_WICKET' | 'LONG_ON' | 'LONG_OFF' | 'FINE_LEG' | 'THIRD_MAN' | 'SQUARE_LEG' | 'STRAIGHT';
  isBoundary: boolean;
  isAerial: boolean;
}

export interface PitchMapDelivery {
  deliveryIndex: number;
  bowlerId: string;
  strikerId: string;
  line: BowlingLine;
  length: BowlingLength;
  xCm: number;
  yMeters: number;
  runs: number;
  isWicket: boolean;
  isDot: boolean;
}

// 9. Engine Tactical Calibration
export interface TacticalCalibrationSettings {
  testHighRiskSuccessBaseline: number; // 0.40
  testHighRiskFailureBaseline: number; // 0.60
  whiteBallHighRiskSuccessBaseline: number; // 0.60
  whiteBallHighRiskFailureBaseline: number; // 0.40
}

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

export type MatchStatus =
  | 'SCHEDULED'
  | 'AWAITING_SQUAD'
  | 'AWAITING_XI'
  | 'READY'
  | 'TOSS'
  | 'IN_PROGRESS'
  | 'INNINGS_BREAK'
  | 'COMPLETED'
  | 'DRAW'
  | 'TIE'
  | 'ABANDONED'
  | 'NO_RESULT';

export interface TestDynamicWeather {
  condition: 'SUNNY' | 'PARTLY_CLOUDY' | 'OVERCAST' | 'HUMID' | 'RAIN_DELAY' | 'BAD_LIGHT';
  cloudCover: number; // 0-100%
  temperatureC: number;
  humidity: number; // 0-100%
  lightLevel: 'GOOD' | 'FADING' | 'BAD_LIGHT';
  description: string;
}

export interface WhiteBallMatchConditions {
  boundarySize: 'SHORT' | 'MEDIUM' | 'LARGE';
  avgBoundaryMeters: number;
  surfacePace: number; // 0-100
  bounce: number; // 0-100
  seamMovement: number; // 0-100
  spinAssistance: number; // 0-100
  cloudCover: number; // 0-100
  humidity: number; // 0-100
  temperatureC: number;
  dewFactor: 'NONE' | 'MILD' | 'HEAVY';
  dlsSupported: false;
}

export interface Match {
  id: string;
  format: MatchFormat;
  seriesId?: string;
  seriesName?: string;
  tourId?: string;
  tournamentId?: string;
  competitionId?: string;
  matchNumber?: number;
  totalMatchesInSeries?: number;
  seriesStartDate?: string;
  seriesEndDate?: string;
  squadSelectionDeadline?: string;
  tourStatus?: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
  stage?: 'GROUP' | 'SUPER_EIGHT' | 'SEMI_FINAL' | 'FINAL' | 'LEAGUE';
  groupId?: string;
  homeTeamId: string;
  awayTeamId: string;
  venue: string;
  pitch: PitchCondition;
  weather: WeatherCondition;
  date?: string;
  dayNumber: number;
  sessionNumber: number;
  status: MatchStatus;
  lineupConfirmed?: boolean;
  tossWinnerId?: string;
  tossChoice?: 'BAT' | 'BOWL';
  currentInningsIndex: number;
  innings: InningsState[];
  resultText?: string;
  winnerTeamId?: string;
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
  oversBowledToday?: number;
  oversPerDay?: number;
  newBallOversThreshold?: number;
  extraOversToday?: number;
  oversLostToday?: number;
  totalOversLostToWeather?: number;
  sessionBreakStatus?: string;
  lastInterruptionText?: string;
  pitchWear?: number; // 0-100 dynamic deterioration across 5 days
  dynamicWeather?: TestDynamicWeather;
  followOnEnforced?: boolean;
  followOnOffered?: boolean;
  isFollowOnEligible?: boolean;
  awaitingFollowOnDecision?: boolean;
  allocatedOversPerInnings?: number;
  whiteBallConditions?: WhiteBallMatchConditions;
  homeBowlingOptions?: string[];
  awayBowlingOptions?: string[];
  superOverInnings?: InningsState[];
  superOverPlayed?: boolean;
  superOverRounds?: number;
  statsRecorded?: boolean;
  seed?: number;

  // Master Upgrade: Tactical Systems & Custom Gameplay
  teamBattingGamePlans?: {
    home: TeamBattingGamePlan;
    away: TeamBattingGamePlan;
  };
  individualBatterInstructions?: Record<string, IndividualBatterInstruction>;
  customScoringTargets?: CustomScoringTarget[];
  phaseScoringTargets?: PhaseScoringTargets;
  individualBowlingPlans?: Record<string, IndividualBowlingPlan>;
  bowlerSpellData?: Record<string, BowlerSpellData>;
  currentSpellIntendedOvers?: Record<string, number>;
  activeFieldLayout?: CustomFieldLayout;
  savedFieldPresets?: CustomFieldLayout[];
  drsReviewsRemaining?: {
    home: number;
    away: number;
  };
  drsHistory?: DRSReviewState[];
  activeDRSReview?: DRSReviewState | null;
  wagonWheelDeliveries?: WagonWheelShot[];
  pitchMapDeliveries?: PitchMapDelivery[];
  tacticalCalibration?: TacticalCalibrationSettings;
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
 * Every format has its own Squad, Reserves, Captain, Vice-Captain, Wicketkeeper, and Batting Order
 */
export interface FormatSquadConfig {
  format: MatchFormat;
  squadPlayerIds: string[]; // Active 15-20 players selected for this format
  reservePlayerIds?: string[]; // Standby / reserves for injuries & emergency promotions
  playingXI: string[];      // Match-day 11
  battingOrder: string[];   // 11 in batting order
  captainId: string;        // Dedicated format captain
  viceCaptainId: string;    // Dedicated format vice-captain
  wicketKeeperId: string;   // Dedicated format keeper
  wicketKeeperOptions?: string[]; // Keeper candidates in squad
  bowlingRotation: string[]; // Designated bowlers
  targetSquadSize?: number; // Configurable between 15 and 20 (defaults: TEST 18, ODI 15, T20I 16)
  defaultTactics?: MatchTactics; // Format-specific tactical philosophy
  isConfirmed?: boolean;
  lastConfirmedDate?: string;
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

export type TourType =
  | 'HOME'
  | 'AWAY'
  | 'SINGLE_FORMAT'
  | 'MULTI_FORMAT'
  | 'NEUTRAL'
  | 'TRI_SERIES'
  | 'TOURNAMENT';

export interface Tour {
  id: string;
  name: string;
  hostTeamId: string;
  visitingTeamId: string;
  startDate: string;
  endDate: string;
  year: number;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
  competitionType?: 'BILATERAL' | 'ASHES' | 'BORDER_GAVASKAR' | 'TRI_SERIES' | 'ICC_TOURNAMENT';
  tourType?: TourType;
  neutralCountryId?: string;
  trophyHolder?: string;
  retainedTrophy?: boolean;
  formats?: MatchFormat[];
  series: {
    TEST?: { matchCount: number; matchesPlayed: number; homeWins: number; awayWins: number; draws: number };
    ODI?: { matchCount: number; matchesPlayed: number; homeWins: number; awayWins: number; ties: number };
    T20I?: { matchCount: number; matchesPlayed: number; homeWins: number; awayWins: number; ties: number };
  };
  venues: string[];
  squadSelectionDeadline: string;
  squadAnnounced: boolean;
  tourSquadIds: string[]; // 15-20 players selected from national pool
  reservePlayerIds?: string[];
  formatSquads?: {
    TEST?: string[];
    ODI?: string[];
    T20I?: string[];
  };
  captains?: {
    TEST?: string;
    ODI?: string;
    T20I?: string;
  };
  viceCaptains?: {
    TEST?: string;
    ODI?: string;
    T20I?: string;
  };
  progressionStage?:
    | 'ANNOUNCED'
    | 'SQUAD_DEADLINE'
    | 'SQUAD_ANNOUNCED'
    | 'TRAVEL_PREP'
    | 'MATCH_PREP'
    | 'PLAYING_XI_CONFIRMED'
    | 'IN_PROGRESS'
    | 'SERIES_UPDATE'
    | 'COMPLETED';
  leadingRunScorer?: { playerId: string; playerName: string; runs: number; average: number };
  leadingWicketTaker?: { playerId: string; playerName: string; wickets: number; average: number };
  bestBattingPerformance?: { playerId: string; playerName: string; description: string; runs: number };
  bestBowlingPerformance?: { playerId: string; playerName: string; description: string; wickets: number; runs: number };
  playerOfTheSeries?: { playerId: string; playerName: string; reason: string };
  historicalResults?: Array<{ year: number; host: string; winner: string; score: string; retained?: boolean }>;
  resultText?: string;
}

export interface CalendarEvent {
  id: string;
  date: string;
  dayIndex: number;
  type:
    | 'USER_MATCH'
    | 'WORLD_MATCH'
    | 'SQUAD_DEADLINE'
    | 'TOUR_START'
    | 'TOUR_END'
    | 'TOURNAMENT_STAGE'
    | 'REST_DAY'
    | 'TRAINING_DAY'
    | 'TRAVEL_DAY';
  title: string;
  description: string;
  countryId?: string;
  format?: MatchFormat;
  matchId?: string;
  tourId?: string;
  tournamentId?: string;
  isSimulated?: boolean;
}

export type TournamentCompetitionType =
  | 'WTC'
  | 'ODI_WORLD_CUP'
  | 'T20_WORLD_CUP'
  | 'CHAMPIONS_TROPHY'
  | 'ASIA_CUP'
  | 'TRI_SERIES';

export interface TournamentGroup {
  id: string;
  name: string;
  teamIds: string[];
  table: TournamentTableEntry[];
}

export type AISelectionStrategy =
  | 'BALANCED'
  | 'AGGRESSIVE'
  | 'YOUTH_FOCUS'
  | 'EXPERIENCE_FIRST'
  | 'SPIN_HEAVY'
  | 'PACE_HEAVY';

export interface AITeamManagementState {
  teamId: string;
  strategy: AISelectionStrategy;
  formatSquads: {
    TEST: FormatSquadConfig;
    ODI: FormatSquadConfig;
    T20I: FormatSquadConfig;
  };
  lastUpdatedDate?: string;
  rotationCounter?: number;
}

export interface TeamRankingEntry {
  teamId: string;
  name: string;
  code: string;
  flagEmoji: string;
  position: number;
  previousPosition: number;
  highestPosition: number;
  movement: number; // positive = moved up, negative = dropped
  matches: number;
  points: number;
  rating: number;
}

export interface TeamRankingSnapshot {
  date: string;
  label?: string;
  rankings: Record<
    MatchFormat,
    Array<{
      teamId: string;
      position: number;
      rating: number;
      points: number;
      matches: number;
    }>
  >;
}

export type PlayerRankingCategory = 'BATTER' | 'BOWLER' | 'ALL_ROUNDER';

export interface PlayerRankingEntry {
  rank: number;
  previousRank: number;
  highestRank: number;
  movement: number;
  playerId: string;
  playerName: string;
  countryId: string;
  countryName: string;
  format: MatchFormat;
  category: PlayerRankingCategory;
  rating: number;
  matchesPlayed: number;
  isEligible: boolean;
  highlightStats?: string;
}

export interface PlayerRankingState {
  lastUpdatedDate: string;
  rankings: Record<MatchFormat, Record<PlayerRankingCategory, PlayerRankingEntry[]>>;
  minimumEligibility: {
    TEST: number;
    ODI: number;
    T20I: number;
  };
}

export interface NotificationItem {
  id: string;
  date: string;
  type:
    | 'SQUAD_ANNOUNCEMENT'
    | 'INJURY'
    | 'SELECTION_DEADLINE'
    | 'MATCH_RESULT'
    | 'TOUR_ANNOUNCEMENT'
    | 'RANKING_CHANGE';
  title: string;
  message: string;
  read: boolean;
  actionTab?: string;
  relatedId?: string;
}

export interface TeamRankingState {
  teamId: string;
  ratingPoints: {
    TEST: number;
    ODI: number;
    T20I: number;
  };
  worldRankings: {
    TEST: number;
    ODI: number;
    T20I: number;
  };
  // Detailed deterministic ranking tracking (Phase 2)
  matches?: {
    TEST: number;
    ODI: number;
    T20I: number;
  };
  totalPoints?: {
    TEST: number;
    ODI: number;
    T20I: number;
  };
  previousRankings?: {
    TEST: number;
    ODI: number;
    T20I: number;
  };
  highestRankings?: {
    TEST: number;
    ODI: number;
    T20I: number;
  };
}

export interface ArchivedMatchSummary {
  id: string;
  date: string;
  format: MatchFormat;
  seriesName?: string;
  tournamentId?: string;
  homeTeamId: string;
  awayTeamId: string;
  venue: string;
  status: MatchStatus;
  resultText: string;
  winnerTeamId?: string;
  inningsSummaries: Array<{ battingTeamId: string; totalRuns: number; wickets: number; overs: number }>;
  playerOfTheMatch?: { playerId: string; playerName: string; reason: string };
  isUserMatch: boolean;
}

export interface TournamentEdition {
  id: string;
  competitionType: TournamentCompetitionType;
  name: string;
  format: MatchFormat;
  season: string;
  cycleLengthYears: number;
  year: number;
  hostCountryId?: string;
  description: string;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
  currentStage?: 'GROUP' | 'SUPER_EIGHT' | 'SEMI_FINAL' | 'FINAL' | 'COMPLETED';
  participatingTeamIds?: string[];
  cutoffDate?: string;
  penalties?: Record<string, number>;
  rules: {
    pointsForWin: number;
    pointsForTie: number;
    pointsForDraw: number;
    pointsForLoss: number;
    usePCT?: boolean; // For WTC
    qualifiersPerGroup?: number;
    totalQualifiers?: number;
    hasSuperStage?: boolean;
  };
  table: TournamentTableEntry[];
  groups?: TournamentGroup[];
  semiFinalMatchIds?: string[];
  superStageMatchIds?: string[];
  finalistTeamIds?: [string, string];
  finalMatchId?: string;
  winnerTeamId?: string;
  runnerUpTeamId?: string;
  playerOfTheTournament?: { playerId: string; playerName: string; reason: string };
  leadingRunScorer?: { playerId: string; playerName: string; runs: number };
  leadingWicketTaker?: { playerId: string; playerName: string; wickets: number };
  pastChampions: Array<{
    year: number;
    host: string;
    winner: string;
    runnerUp: string;
    finalResult: string;
  }>;
}

export interface RivalryCompetition {
  id: 'the_ashes' | 'border_gavaskar';
  name: string;
  format: 'TEST';
  team1Id: string;
  team2Id: string;
  currentTrophyHolder: string; // Team ID
  currentTourId: string;
  currentEditionYear: number;
  matchesInSeries: number;
  currentScore: { team1Wins: number; team2Wins: number; draws: number };
  leadingRunScorer?: { playerId: string; playerName: string; runs: number; average: number };
  leadingWicketTaker?: { playerId: string; playerName: string; wickets: number; average: number };
  playerOfTheSeries?: { playerId: string; playerName: string; reason: string };
  historicalEditions: Array<{
    year: string;
    host: string;
    winner: string;
    score: string;
    holderRetained?: boolean;
    playerOfTheSeries?: string;
    leadingRunScorer?: string;
    leadingWicketTaker?: string;
  }>;
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
    coachingExperience: 'CLUB' | 'DOMESTIC' | 'INTERNATIONAL' | 'FRANCHISE' | 'ACADEMY';
    managementStyle: 'TACTICAL' | 'MAN_MANAGER' | 'AGGRESSIVE' | 'ANALYTICAL' | 'FITNESS' | 'DISCIPLINARIAN';
    coachArchetype?: string;
    coachPerk?: string;
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
  seasonsGeneratedThroughYear?: number;

  // Format-specific independent squads (User-controlled team ONLY)
  formatSquads: {
    TEST: FormatSquadConfig;
    ODI: FormatSquadConfig;
    T20I: FormatSquadConfig;
  };

  // Independent AI team management states for every non-user country
  aiTeams?: Record<string, AITeamManagementState>;

  // Live evolving ICC / ICM rankings & rating points per country
  teamRankings?: Record<string, TeamRankingState>;

  // 9-category format-specific international player rankings
  playerRankings?: PlayerRankingState;

  // Real historical ranking snapshots over time for progression charts
  rankingHistory?: TeamRankingSnapshot[];

  // Interactive notification items
  notifications?: NotificationItem[];

  // Team morale (0–100) computed from recent results and board confidence
  teamMorale?: number;

  // Emerging academy/debutant players generated over multi-year careers
  emergingPlayers?: Player[];

  // Archived historical match summaries from older completed seasons
  archivedMatches?: ArchivedMatchSummary[];

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

  // Player Training Assignments & Progression
  playerTrainingFocus?: Record<string, 'BATTING' | 'BOWLING' | 'FIELDING' | 'FITNESS' | 'AUTO'>;
  playerOverrides?: Record<string, Partial<Player>>;

  // Special Rivalry Series
  ashes?: RivalryCompetition;
  borderGavaskar?: RivalryCompetition;

  // Complete Multi-Year Tournament System
  tournamentEditions?: TournamentEdition[];
}
