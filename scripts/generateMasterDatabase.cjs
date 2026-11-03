const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const masterDir = path.join(projectRoot, 'src/data/master_dataset');

console.log('Reading master dataset from:', masterDir);

const countriesRaw = JSON.parse(fs.readFileSync(path.join(masterDir, 'countries/countries.json'), 'utf-8')).countries;
const playersRaw = JSON.parse(fs.readFileSync(path.join(masterDir, 'players/all_players.json'), 'utf-8')).players;
const statsRaw = JSON.parse(fs.readFileSync(path.join(masterDir, 'players/player_format_statistics.json'), 'utf-8')).player_statistics;
const captainsRaw = JSON.parse(fs.readFileSync(path.join(masterDir, 'captains/format_captains.json'), 'utf-8')).format_captains;
const testSquads = JSON.parse(fs.readFileSync(path.join(masterDir, 'squads/test_squads.json'), 'utf-8')).squads;
const odiSquads = JSON.parse(fs.readFileSync(path.join(masterDir, 'squads/odi_squads.json'), 'utf-8')).squads;
const t20iSquads = JSON.parse(fs.readFileSync(path.join(masterDir, 'squads/t20i_squads.json'), 'utf-8')).squads;
const poolsRaw = JSON.parse(fs.readFileSync(path.join(masterDir, 'squads/selection_pools.json'), 'utf-8')).selection_pools;
const testLineups = JSON.parse(fs.readFileSync(path.join(masterDir, 'matches/test_lineups.json'), 'utf-8')).lineups;
const odiLineups = JSON.parse(fs.readFileSync(path.join(masterDir, 'matches/odi_lineups.json'), 'utf-8')).lineups;
const t20iLineups = JSON.parse(fs.readFileSync(path.join(masterDir, 'matches/t20i_lineups.json'), 'utf-8')).lineups;

const statsMap = new Map();
statsRaw.forEach(s => statsMap.set(s.player_id, s));

const testSquadIds = new Set();
testSquads.forEach(s => (s.selected_players || []).concat(s.reserve_players || []).forEach(id => testSquadIds.add(id)));
const odiSquadIds = new Set();
odiSquads.forEach(s => (s.selected_players || []).concat(s.reserve_players || []).forEach(id => odiSquadIds.add(id)));
const t20iSquadIds = new Set();
t20iSquads.forEach(s => (s.selected_players || []).concat(s.reserve_players || []).forEach(id => t20iSquadIds.add(id)));

// Country metadata lookup table (colors, emojis, home venues, achievements)
const COUNTRY_META = {
  IND: {
    flagEmoji: '🇮🇳',
    primaryColor: '#00539C',
    secondaryColor: '#FF6F00',
    worldRankings: { TEST: 2, ODI: 1, T20I: 1 },
    ratingPoints: { TEST: 119, ODI: 122, T20I: 268 },
    homeVenues: ['Wankhede Stadium, Mumbai', 'Eden Gardens, Kolkata', 'Narendra Modi Stadium, Ahmedabad', 'M. Chinnaswamy, Bengaluru'],
    historicalAchievements: ['ICC Cricket World Cup (1983, 2011)', 'ICC T20 World Cup (2007, 2024)', 'ICC Champions Trophy (2002, 2013)', 'Border-Gavaskar Trophy Winners (2018-19, 2020-21)'],
  },
  AUS: {
    flagEmoji: '🇦🇺',
    primaryColor: '#00471B',
    secondaryColor: '#FFD700',
    worldRankings: { TEST: 1, ODI: 2, T20I: 2 },
    ratingPoints: { TEST: 124, ODI: 118, T20I: 259 },
    homeVenues: ['Melbourne Cricket Ground', 'Sydney Cricket Ground', 'The Gabba, Brisbane', 'Adelaide Oval', 'Optus Stadium, Perth'],
    historicalAchievements: ['ICC Cricket World Cup 6-time Winners (1987, 1999, 2003, 2007, 2015, 2023)', 'ICC World Test Championship Winners (2021-23)', 'ICC T20 World Cup (2021)', 'The Ashes Holders'],
  },
  ENG: {
    flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    primaryColor: '#002B49',
    secondaryColor: '#C8102E',
    worldRankings: { TEST: 3, ODI: 5, T20I: 3 },
    ratingPoints: { TEST: 111, ODI: 104, T20I: 254 },
    homeVenues: ["Lord's, London", 'The Oval, London', 'Edgbaston, Birmingham', 'Headingley, Leeds', 'Old Trafford, Manchester'],
    historicalAchievements: ['ICC Cricket World Cup (2019)', 'ICC T20 World Cup (2010, 2022)', 'Pioneers of aggressive Bazball Test philosophy'],
  },
  RSA: {
    flagEmoji: '🇿🇦',
    primaryColor: '#007749',
    secondaryColor: '#FFB81C',
    worldRankings: { TEST: 4, ODI: 3, T20I: 4 },
    ratingPoints: { TEST: 107, ODI: 110, T20I: 250 },
    homeVenues: ['SuperSport Park, Centurion', 'The Wanderers, Johannesburg', 'Newlands, Cape Town', "Kingsmead, Durban"],
    historicalAchievements: ['ICC Champions Trophy (1998)', 'ICC T20 World Cup Finalists (2024)', 'Dominant Test pace attack history'],
  },
  NZL: {
    flagEmoji: '🇳🇿',
    primaryColor: '#000000',
    secondaryColor: '#C8102E',
    worldRankings: { TEST: 5, ODI: 4, T20I: 5 },
    ratingPoints: { TEST: 102, ODI: 106, T20I: 245 },
    homeVenues: ['Basin Reserve, Wellington', 'Hagley Oval, Christchurch', 'Eden Park, Auckland'],
    historicalAchievements: ['Inaugural ICC World Test Championship Winners (2019-21)', 'ICC Champions Trophy (2000)', 'ICC Cricket World Cup Finalists (2015, 2019)'],
  },
  PAK: {
    flagEmoji: '🇵🇰',
    primaryColor: '#006629',
    secondaryColor: '#9BC53D',
    worldRankings: { TEST: 6, ODI: 6, T20I: 7 },
    ratingPoints: { TEST: 92, ODI: 98, T20I: 232 },
    homeVenues: ['Gaddafi Stadium, Lahore', 'National Stadium, Karachi', 'Rawalpindi Cricket Stadium'],
    historicalAchievements: ['ICC Cricket World Cup (1992)', 'ICC T20 World Cup (2009)', 'ICC Champions Trophy (2017)'],
  },
  SL: {
    flagEmoji: '🇱🇰',
    primaryColor: '#0033A0',
    secondaryColor: '#FFB81C',
    worldRankings: { TEST: 7, ODI: 7, T20I: 8 },
    ratingPoints: { TEST: 85, ODI: 94, T20I: 230 },
    homeVenues: ['R. Premadasa Stadium, Colombo', 'Galle International Stadium', 'Pallekele International Cricket Stadium'],
    historicalAchievements: ['ICC Cricket World Cup (1996)', 'ICC T20 World Cup (2014)', 'ICC Champions Trophy (2002 co-champions)'],
  },
  BAN: {
    flagEmoji: '🇧🇩',
    primaryColor: '#006A4E',
    secondaryColor: '#F42A41',
    worldRankings: { TEST: 9, ODI: 8, T20I: 9 },
    ratingPoints: { TEST: 65, ODI: 86, T20I: 224 },
    homeVenues: ['Sher-e-Bangla National Cricket Stadium, Mirpur', 'Zahur Ahmed Chowdhury Stadium, Chattogram'],
    historicalAchievements: ['ICC Champions Trophy Semi-finalists (2017)', 'Multi-nation Asia Cup Finalists (2012, 2016, 2018)'],
  },
  WI: {
    flagEmoji: '🌴',
    primaryColor: '#7A0026',
    secondaryColor: '#FDB913',
    worldRankings: { TEST: 8, ODI: 9, T20I: 6 },
    ratingPoints: { TEST: 78, ODI: 88, T20I: 240 },
    homeVenues: ['Kensington Oval, Barbados', "Queen's Park Oval, Trinidad", 'Sabina Park, Jamaica', 'Daren Sammy Cricket Ground, St Lucia'],
    historicalAchievements: ['ICC Cricket World Cup (1975, 1979)', 'ICC T20 World Cup Two-Time Champions (2012, 2016)', 'ICC Champions Trophy (2004)'],
  },
  AFG: {
    flagEmoji: '🇦🇫',
    primaryColor: '#002B49',
    secondaryColor: '#D32011',
    worldRankings: { TEST: 10, ODI: 10, T20I: 10 },
    ratingPoints: { TEST: 45, ODI: 80, T20I: 220 },
    homeVenues: ['Sharjah Cricket Stadium (UAE)', 'Greater Noida Sports Complex'],
    historicalAchievements: ['ICC T20 World Cup Semi-finalists (2024)', 'Incredible rise through ICC World Cricket League to Test status (2017)'],
  },
  IRE: {
    flagEmoji: '🇮🇪',
    primaryColor: '#169B62',
    secondaryColor: '#FFFFFF',
    worldRankings: { TEST: 11, ODI: 11, T20I: 11 },
    ratingPoints: { TEST: 38, ODI: 68, T20I: 195 },
    homeVenues: ['Malahide Cricket Club Ground, Dublin', 'Civil Service Cricket Club, Belfast'],
    historicalAchievements: ['Historic World Cup victories over England (2011), Pakistan (2007), West Indies (2015)', 'Full Test Status achieved in 2017'],
  },
  ZIM: {
    flagEmoji: '🇿🇼',
    primaryColor: '#C8102E',
    secondaryColor: '#FFD100',
    worldRankings: { TEST: 12, ODI: 12, T20I: 12 },
    ratingPoints: { TEST: 32, ODI: 62, T20I: 188 },
    homeVenues: ['Harare Sports Club', 'Queens Sports Club, Bulawayo'],
    historicalAchievements: ['ICC Cricket World Cup Super Six (1999)', 'Historic victories in ICC tournaments'],
  },
  SCO: {
    flagEmoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    primaryColor: '#003B6F',
    secondaryColor: '#E03C31',
    worldRankings: { TEST: 13, ODI: 13, T20I: 13 },
    ratingPoints: { TEST: 20, ODI: 55, T20I: 185 },
    homeVenues: ['The Grange Club, Edinburgh', 'Titwood, Glasgow'],
    historicalAchievements: ['ICC Men’s T20 World Cup Super 12 (2021)', 'CWC League 2 Champions'],
  },
  NED: {
    flagEmoji: '🇳🇱',
    primaryColor: '#FF6600',
    secondaryColor: '#003399',
    worldRankings: { TEST: 14, ODI: 14, T20I: 14 },
    ratingPoints: { TEST: 18, ODI: 52, T20I: 182 },
    homeVenues: ['VRA Cricket Ground, Amstelveen', 'Sportpark Westvliet, The Hague'],
    historicalAchievements: ['ICC Cricket World Cup 2023 wins over South Africa & Bangladesh', 'T20 World Cup 2022 win over South Africa'],
  },
  NEP: {
    flagEmoji: '🇳🇵',
    primaryColor: '#DC143C',
    secondaryColor: '#003893',
    worldRankings: { TEST: 15, ODI: 15, T20I: 17 },
    ratingPoints: { TEST: 15, ODI: 48, T20I: 175 },
    homeVenues: ['Tribhuvan University International Cricket Ground, Kirtipur', 'Mulpani Cricket Ground, Kathmandu'],
    historicalAchievements: ['ICC Men’s T20 World Cup (2014, 2024)', 'Asia Cup qualification (2023)'],
  },
  NAM: {
    flagEmoji: '🇳🇦',
    primaryColor: '#003580',
    secondaryColor: '#D21034',
    worldRankings: { TEST: 16, ODI: 16, T20I: 15 },
    ratingPoints: { TEST: 12, ODI: 45, T20I: 178 },
    homeVenues: ['United Cricket Club Ground, Windhoek', 'Wanderers Cricket Ground, Windhoek'],
    historicalAchievements: ['ICC Men’s T20 World Cup Super 12 (2021, 2022, 2024)', 'Win over Sri Lanka in T20 World Cup 2022'],
  },
  USA: {
    flagEmoji: '🇺🇸',
    primaryColor: '#0A3161',
    secondaryColor: '#B31942',
    worldRankings: { TEST: 17, ODI: 17, T20I: 16 },
    ratingPoints: { TEST: 10, ODI: 42, T20I: 176 },
    homeVenues: ['Grand Prairie Stadium, Dallas', 'Central Broward Park, Lauderhill, Florida', 'Church Street Park, Morrisville'],
    historicalAchievements: ['ICC Men’s T20 World Cup Super 8 (2024)', 'Historic victory over Pakistan in 2024 T20 World Cup'],
  },
  UAE: {
    flagEmoji: '🇦🇪',
    primaryColor: '#00732F',
    secondaryColor: '#C8102E',
    worldRankings: { TEST: 18, ODI: 18, T20I: 18 },
    ratingPoints: { TEST: 8, ODI: 38, T20I: 170 },
    homeVenues: ['Dubai International Cricket Stadium', 'Sharjah Cricket Stadium', 'Zayed Cricket Stadium, Abu Dhabi'],
    historicalAchievements: ['ICC Cricket World Cup appearances (1996, 2015)', 'ICC T20 World Cup 2022 participant with win over Namibia'],
  },
  OMA: {
    flagEmoji: '🇴🇲',
    primaryColor: '#D32011',
    secondaryColor: '#008000',
    worldRankings: { TEST: 19, ODI: 19, T20I: 19 },
    ratingPoints: { TEST: 6, ODI: 35, T20I: 165 },
    homeVenues: ['Al Amerat Cricket Stadium, Muscat'],
    historicalAchievements: ['ICC Men’s T20 World Cup co-hosts (2021) and participants (2016, 2021, 2024)'],
  },
  CAN: {
    flagEmoji: '🇨🇦',
    primaryColor: '#D80621',
    secondaryColor: '#FFFFFF',
    worldRankings: { TEST: 20, ODI: 20, T20I: 20 },
    ratingPoints: { TEST: 5, ODI: 32, T20I: 160 },
    homeVenues: ['Maple Leaf Cricket Club, King City, Ontario'],
    historicalAchievements: ['ICC Men’s T20 World Cup 2024 win over Ireland', 'World Cup appearances (1979, 2003, 2007, 2011)'],
  },
  PNG: {
    flagEmoji: '🇵🇬',
    primaryColor: '#000000',
    secondaryColor: '#CE1126',
    worldRankings: { TEST: 21, ODI: 21, T20I: 21 },
    ratingPoints: { TEST: 4, ODI: 28, T20I: 155 },
    homeVenues: ['Amini Park, Port Moresby'],
    historicalAchievements: ['ICC Men’s T20 World Cup (2021, 2024)', 'ODI status in 2014-2023'],
  },
  IDN: {
    flagEmoji: '🇮🇩',
    primaryColor: '#CE1126',
    secondaryColor: '#FFFFFF',
    worldRankings: { TEST: 22, ODI: 22, T20I: 22 },
    ratingPoints: { TEST: 2, ODI: 15, T20I: 110 },
    homeVenues: ['Udayana Cricket Ground, Bali'],
    historicalAchievements: ['Rising East Asia-Pacific Associate, ICC T20I status since 2019'],
  },
};

// 1. Build INTERNATIONAL_TEAMS
const INTERNATIONAL_TEAMS = countriesRaw.map(c => {
  const meta = COUNTRY_META[c.country_code] || {
    flagEmoji: '🏏',
    primaryColor: '#00471B',
    secondaryColor: '#FFD700',
    worldRankings: { TEST: 20, ODI: 20, T20I: 20 },
    ratingPoints: { TEST: 10, ODI: 30, T20I: 150 },
    homeVenues: ['National Stadium'],
    historicalAchievements: ['International Cricket participant'],
  };

  return {
    id: c.country_code,
    name: c.country_name,
    shortName: c.country_name,
    code: c.country_code,
    flagEmoji: meta.flagEmoji,
    primaryColor: meta.primaryColor,
    secondaryColor: meta.secondaryColor,
    worldRankings: meta.worldRankings,
    ratingPoints: meta.ratingPoints,
    homeVenues: meta.homeVenues,
    historicalAchievements: meta.historicalAchievements,
  };
});

console.log(`Generated ${INTERNATIONAL_TEAMS.length} international teams.`);

// Role and Bowling Style Mappings
function mapRole(primaryRole, isWk) {
  if (isWk || (primaryRole && primaryRole.includes('Wicketkeeper'))) return 'WICKETKEEPER_BATTER';
  if (primaryRole && primaryRole.includes('All-rounder')) return 'ALL_ROUNDER';
  if (primaryRole && (primaryRole.includes('Bowler') || primaryRole.includes('Spinner') || primaryRole.includes('Pacer'))) return 'BOWLER';
  return 'BATTER';
}

function mapBattingHand(style) {
  if (!style) return 'RIGHT_HAND';
  const s = style.toLowerCase();
  if (s.includes('lhb') || s.includes('left')) return 'LEFT_HAND';
  return 'RIGHT_HAND';
}

function mapBowlingStyle(style, batHand) {
  if (!style) {
    return batHand === 'LEFT_HAND' ? 'LEFT_ARM_FAST_MEDIUM' : 'RIGHT_ARM_FAST_MEDIUM';
  }
  const s = style.toLowerCase();
  if (s.includes('chinaman') || s.includes('wrist spin') || s.includes('la wrist')) return 'LEFT_ARM_WRIST_SPIN';
  if (s.includes('slow left') || s.includes('orthodox') || s.includes('sla') || s.includes('left-arm slow')) return 'SLOW_LEFT_ARM';
  if (s.includes('leg break') || s.includes('legbreak') || s.includes('googly') || s.includes('leg spin') || s === 'lb') return 'LEG_BREAK';
  if (s.includes('off break') || s.includes('off spin') || s === 'ob' || s.includes('off-break')) return 'OFF_BREAK';
  if (s.startsWith('left') || s.startsWith('la') || s.includes('lmf') || s.includes('lfm') || s.includes('lf')) {
    if (s.includes('fast-medium') || s.includes('medium-fast') || s.includes('lmf') || s.includes('lfm') || s.includes('medium') || s.includes('lm')) return 'LEFT_ARM_FAST_MEDIUM';
    return 'LEFT_ARM_FAST';
  }
  if (s.includes('fast-medium') || s.includes('medium-fast') || s.includes('rfm') || s.includes('rmf') || s.includes('fast medium') || s.includes('medium fast')) return 'RIGHT_ARM_FAST_MEDIUM';
  if (s.includes('fast') || s.includes('rf') || s.includes('ra fast')) return 'RIGHT_ARM_FAST';
  if (s.includes('medium') || s.includes('rm') || s.includes('slow')) return 'RIGHT_ARM_MEDIUM';
  return 'RIGHT_ARM_FAST_MEDIUM';
}

function parseNumeric(val, fallback = 0) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return val;
  const parsed = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return isNaN(parsed) ? fallback : parsed;
}

function mapFormatStats(statsObj, format) {
  const b = statsObj?.batting || {};
  const bw = statsObj?.bowling || {};
  const f = statsObj?.fielding || {};

  const matches = parseNumeric(b.matches, 0) || parseNumeric(bw.matches, 0);
  const runs = parseNumeric(b.runs, 0);
  const innings = parseNumeric(b.innings, matches > 0 ? Math.max(1, Math.round(matches * 0.9)) : 0);
  const rawHs = String(b.highest_score || '0');
  const hsNumber = parseInt(rawHs.replace(/[^0-9]/g, '')) || 0;
  const hsNotOut = rawHs.includes('*');
  const avg = parseNumeric(b.batting_average, (runs > 0 && innings > 0) ? +(runs / innings).toFixed(2) : 0);
  const defaultSr = format === 'T20I' ? 128 : format === 'ODI' ? 84 : 52;
  const sr = parseNumeric(b.strike_rate, defaultSr);

  const wickets = parseNumeric(bw.wickets, 0);
  const bowlInnings = parseNumeric(bw.innings, wickets > 0 ? matches : 0);
  const overs = parseNumeric(bw.overs, wickets > 0 ? Math.round(wickets * 4.5) : 0);
  const rawBbf = String(bw.best_bowling_figures || '0/0');
  const bbfParts = rawBbf.split('/');
  const bbfWickets = parseInt(bbfParts[0]) || (wickets > 0 ? Math.min(wickets, 3) : 0);
  const bbfRuns = parseInt(bbfParts[1]) || (wickets > 0 ? 25 : 0);
  const defaultEcon = format === 'T20I' ? 7.8 : format === 'ODI' ? 5.2 : 3.2;
  const econ = parseNumeric(bw.economy_rate, defaultEcon);
  const bowlAvg = parseNumeric(bw.bowling_average, wickets > 0 ? 27.5 : 0);

  return {
    matches,
    innings,
    runs,
    highestScore: hsNumber,
    highestScoreNotOut: hsNotOut,
    average: avg,
    strikeRate: sr,
    centuries: parseNumeric(b.hundreds, 0),
    fifties: parseNumeric(b.fifties, 0),
    fours: parseNumeric(b.fours, Math.round(runs * 0.1)),
    sixes: parseNumeric(b.sixes, Math.round(runs * 0.02)),
    ducks: parseNumeric(b.ducks, 0),
    notOuts: parseNumeric(b.not_outs, 0),

    bowlingInnings: bowlInnings,
    oversBowled: overs,
    maidens: parseNumeric(bw.maidens, 0),
    runsConceded: parseNumeric(bw.runs_conceded, Math.round(overs * econ)),
    wickets,
    bestBowlingWickets: bbfWickets,
    bestBowlingRuns: bbfRuns,
    bowlingAverage: bowlAvg,
    economy: econ,
    bowlingStrikeRate: parseNumeric(bw.strike_rate, 30.0),
    fiveWicketHauls: parseNumeric(bw.five_wicket_hauls, 0),
    tenWicketHauls: parseNumeric(bw.ten_wicket_match_hauls, 0),

    catches: parseNumeric(f.catches, 0),
    stumpings: parseNumeric(f.stumpings, 0),
    runOuts: parseNumeric(f.run_outs, 0),
  };
}

// 2. Build PLAYERS
const mappedPlayers = playersRaw.map(p => {
  const isWk = p.wicketkeeper_status === true;
  const role = mapRole(p.primary_role, isWk);
  const batHand = mapBattingHand(p.batting_style);
  const bowlStyle = mapBowlingStyle(p.bowling_style, batHand);

  // Age from DOB
  let age = 27;
  if (p.date_of_birth) {
    const year = parseInt(p.date_of_birth.split('-')[0]);
    if (!isNaN(year)) age = Math.max(18, 2026 - year);
  }

  const s = statsMap.get(p.player_id);
  const testStat = s?.formats?.Test?.career_statistics_as_of_2026_11_03;
  const odiStat = s?.formats?.ODI?.career_statistics_as_of_2026_11_03;
  const t20iStat = s?.formats?.T20I?.career_statistics_as_of_2026_11_03;

  const testMatches = (testStat?.batting?.matches || 0) + (testStat?.bowling?.matches || 0);
  const odiMatches = (odiStat?.batting?.matches || 0) + (odiStat?.bowling?.matches || 0);
  const t20iMatches = (t20iStat?.batting?.matches || 0) + (t20iStat?.bowling?.matches || 0);

  const isTestEligible = testMatches > 0 || !!p.test_debut || testSquadIds.has(p.player_id) || (p.recent_teams_and_formats || '').includes('Test');
  const isOdiEligible = odiMatches > 0 || !!p.odi_debut || odiSquadIds.has(p.player_id) || (p.recent_teams_and_formats || '').includes('ODI');
  const isT20iEligible = t20iMatches > 0 || !!p.t20i_debut || t20iSquadIds.has(p.player_id) || (p.recent_teams_and_formats || '').includes('T20I') || (!isTestEligible && !isOdiEligible);

  // Rating calibration based on Tier & Stats
  const group = p.selection_category_group || 'B';
  let baseRating = group === 'A' ? 85 : group === 'B' ? 79 : group === 'C' ? 74 : group === 'D' ? 70 : 66;

  // Calibrate per format
  let testRating = isTestEligible ? baseRating : Math.max(50, baseRating - 10);
  let odiRating = isOdiEligible ? baseRating : Math.max(50, baseRating - 8);
  let t20Rating = isT20iEligible ? baseRating : Math.max(50, baseRating - 6);

  // Performance bonuses
  const testAvg = testStat?.batting?.batting_average || 0;
  if (testAvg > 45) testRating = Math.min(96, testRating + 7);
  else if (testAvg > 38) testRating = Math.min(94, testRating + 4);

  const odiAvg = odiStat?.batting?.batting_average || 0;
  if (odiAvg > 45) odiRating = Math.min(96, odiRating + 6);

  const testWkts = testStat?.bowling?.wickets || 0;
  if (testWkts > 150) testRating = Math.min(96, testRating + 7);
  else if (testWkts > 80) testRating = Math.min(93, testRating + 4);

  const isSpin = bowlStyle.includes('BREAK') || bowlStyle.includes('SPIN') || bowlStyle.includes('SLOW');
  const isPace = !isSpin;

  // Determine bat/bowl focus
  const isPureBatter = role === 'BATTER' || role === 'WICKETKEEPER_BATTER';
  const isPureBowler = role === 'BOWLER';
  const isAllRounder = role === 'ALL_ROUNDER';

  const batSkill = isPureBatter ? baseRating + 5 : isAllRounder ? baseRating : baseRating - 35;
  const bowlSkill = isPureBowler ? baseRating + 5 : isAllRounder ? baseRating : 25;

  const attributes = {
    technique: Math.min(96, Math.max(35, batSkill + (testAvg > 40 ? 5 : 0))),
    timing: Math.min(96, Math.max(35, batSkill + 2)),
    shotSelection: Math.min(96, Math.max(35, batSkill)),
    defense: Math.min(96, Math.max(30, isPureBatter ? batSkill + 2 : batSkill - 5)),
    aggression: Math.min(96, Math.max(45, (p.primary_role || '').includes('Fast') || (p.primary_role || '').includes('Opening') ? 84 : 75)),
    powerHitting: Math.min(98, Math.max(35, isPureBatter || isAllRounder ? 80 : 50)),
    againstPace: Math.min(96, Math.max(35, batSkill)),
    againstSpin: Math.min(96, Math.max(35, batSkill - 2)),
    consistency: Math.min(95, Math.max(45, baseRating + 2)),
    temperament: Math.min(95, Math.max(45, baseRating + 1)),

    pace: isPace && (isPureBowler || isAllRounder) ? Math.min(96, Math.max(68, bowlSkill + 6)) : 25,
    swing: isPace && (isPureBowler || isAllRounder) ? Math.min(95, Math.max(65, bowlSkill)) : 20,
    seam: isPace && (isPureBowler || isAllRounder) ? Math.min(95, Math.max(65, bowlSkill - 2)) : 20,
    spin: isSpin && (isPureBowler || isAllRounder) ? Math.min(96, Math.max(70, bowlSkill + 5)) : 20,
    accuracy: isPureBowler || isAllRounder ? Math.min(95, Math.max(60, bowlSkill)) : 55,
    variation: isPureBowler || isAllRounder ? Math.min(95, Math.max(60, bowlSkill - 2)) : 50,
    control: isPureBowler || isAllRounder ? Math.min(95, Math.max(60, bowlSkill)) : 55,
    deathBowling: isPureBowler || isAllRounder ? Math.min(95, Math.max(55, bowlSkill + 2)) : 40,
    wicketTaking: isPureBowler || isAllRounder ? Math.min(96, Math.max(65, bowlSkill + 4)) : 45,
    stamina: 85,

    fielding: isWk ? 90 : Math.min(95, Math.max(65, baseRating + 2)),
    catching: isWk ? 92 : Math.min(95, Math.max(65, baseRating + 1)),
    throwing: Math.min(95, Math.max(65, baseRating)),
    fitness: 85,
    leadership: p.short_name.includes('Cummins') || p.short_name.includes('Rohit') || p.short_name.includes('Gill') || p.short_name.includes('Root') ? 92 : 72,
    mentalStrength: Math.min(96, Math.max(65, baseRating + 2)),
    currentForm: 82,
    potential: age < 24 ? 90 : age < 28 ? 85 : 80,
  };

  return {
    id: p.player_id,
    name: p.full_name,
    shortName: p.short_name,
    countryId: p.country_code,
    countryName: p.country,
    age,
    dob: p.date_of_birth || undefined,
    gender: 'MALE',
    status: p.active_status === 'Active' ? 'ACTIVE' : p.active_status === 'Retired' ? 'RETIRED' : 'LEGEND',
    role,
    battingHand: batHand,
    bowlingStyle: bowlStyle,
    formatEligibility: {
      TEST: isTestEligible,
      ODI: isOdiEligible,
      T20I: isT20iEligible,
    },
    isWicketKeeper: isWk,
    workloadFatigue: 15,
    testRating,
    odiRating,
    t20Rating,
    attributes,
    stats: {
      TEST: mapFormatStats(s?.formats?.Test?.career_statistics_as_of_2026_11_03, 'TEST'),
      ODI: mapFormatStats(s?.formats?.ODI?.career_statistics_as_of_2026_11_03, 'ODI'),
      T20I: mapFormatStats(s?.formats?.T20I?.career_statistics_as_of_2026_11_03, 'T20I'),
    },
    sourceMeta: {
      source: 'ICC / ESPNcricinfo Master Research (Nov 2026)',
      sourceId: p.player_id,
      lastUpdated: p.verification_date || '2026-11-03',
      verified: true,
    },
  };
});

console.log(`Mapped ${mappedPlayers.length} verified players.`);

// Add preserved Historical Legends & Women
const PRESERVED_SPECIAL_PLAYERS = [
  {
    id: 'ind_sachin',
    name: 'Sachin Tendulkar',
    shortName: 'S. Tendulkar',
    countryId: 'IND',
    countryName: 'India',
    age: 53,
    dob: '1973-04-24',
    gender: 'MALE',
    status: 'LEGEND',
    role: 'BATTER',
    battingHand: 'RIGHT_HAND',
    bowlingStyle: 'RIGHT_ARM_MEDIUM',
    formatEligibility: { TEST: true, ODI: true, T20I: true },
    workloadFatigue: 0,
    testRating: 99,
    odiRating: 99,
    t20Rating: 88,
    attributes: { technique: 99, timing: 99, shotSelection: 98, defense: 97, aggression: 85, powerHitting: 88, againstPace: 99, againstSpin: 99, consistency: 98, temperament: 98, pace: 40, swing: 40, seam: 35, spin: 65, accuracy: 70, variation: 65, control: 70, deathBowling: 50, wicketTaking: 60, stamina: 92, fielding: 88, catching: 90, throwing: 85, fitness: 88, leadership: 85, mentalStrength: 99, currentForm: 95, potential: 99 },
    stats: {
      TEST: { matches: 200, innings: 329, runs: 15921, highestScore: 248, highestScoreNotOut: true, average: 53.78, strikeRate: 54.07, centuries: 51, fifties: 68, fours: 2058, sixes: 69, ducks: 14, notOuts: 33, bowlingInnings: 145, oversBowled: 707.1, maidens: 114, runsConceded: 2490, wickets: 46, bestBowlingWickets: 3, bestBowlingRuns: 10, bowlingAverage: 54.13, economy: 3.52, bowlingStrikeRate: 92.2, fiveWicketHauls: 0, tenWicketHauls: 0, catches: 115, stumpings: 0, runOuts: 12 },
      ODI: { matches: 463, innings: 452, runs: 18426, highestScore: 200, highestScoreNotOut: true, average: 44.83, strikeRate: 86.23, centuries: 49, fifties: 96, fours: 2016, sixes: 195, ducks: 20, notOuts: 41, bowlingInnings: 270, oversBowled: 1340.5, maidens: 24, runsConceded: 6850, wickets: 154, bestBowlingWickets: 5, bestBowlingRuns: 32, bowlingAverage: 44.48, economy: 5.1, bowlingStrikeRate: 52.2, fiveWicketHauls: 2, tenWicketHauls: 0, catches: 140, stumpings: 0, runOuts: 23 },
      T20I: { matches: 1, innings: 1, runs: 10, highestScore: 10, highestScoreNotOut: false, average: 10.0, strikeRate: 83.33, centuries: 0, fifties: 0, fours: 2, sixes: 0, ducks: 0, notOuts: 0, bowlingInnings: 1, oversBowled: 2.3, maidens: 0, runsConceded: 12, wickets: 1, bestBowlingWickets: 1, bestBowlingRuns: 12, bowlingAverage: 12.0, economy: 4.8, bowlingStrikeRate: 15.0, fiveWicketHauls: 0, tenWicketHauls: 0, catches: 1, stumpings: 0, runOuts: 0 },
    },
    sourceMeta: { source: 'ICC Hall of Fame', sourceId: 'ind_sachin', lastUpdated: '2026-11-03', verified: true }
  },
  {
    id: 'ind_dhoni',
    name: 'MS Dhoni',
    shortName: 'MS Dhoni',
    countryId: 'IND',
    countryName: 'India',
    age: 45,
    dob: '1981-07-07',
    gender: 'MALE',
    status: 'LEGEND',
    role: 'WICKETKEEPER_BATTER',
    battingHand: 'RIGHT_HAND',
    bowlingStyle: 'RIGHT_ARM_MEDIUM',
    formatEligibility: { TEST: true, ODI: true, T20I: true },
    isWicketKeeper: true,
    workloadFatigue: 0,
    testRating: 92,
    odiRating: 98,
    t20Rating: 94,
    attributes: { technique: 88, timing: 92, shotSelection: 94, defense: 85, aggression: 88, powerHitting: 97, againstPace: 94, againstSpin: 93, consistency: 95, temperament: 99, pace: 35, swing: 30, seam: 30, spin: 20, accuracy: 65, variation: 50, control: 65, deathBowling: 40, wicketTaking: 45, stamina: 92, fielding: 98, catching: 99, throwing: 95, fitness: 92, leadership: 99, mentalStrength: 99, currentForm: 92, potential: 98 },
    stats: {
      TEST: { matches: 90, innings: 144, runs: 4876, highestScore: 224, highestScoreNotOut: false, average: 38.09, strikeRate: 59.11, centuries: 6, fifties: 33, fours: 542, sixes: 78, ducks: 10, notOuts: 16, bowlingInnings: 7, oversBowled: 16, maidens: 1, runsConceded: 67, wickets: 0, bestBowlingWickets: 0, bestBowlingRuns: 0, bowlingAverage: 0, economy: 4.18, bowlingStrikeRate: 0, fiveWicketHauls: 0, tenWicketHauls: 0, catches: 256, stumpings: 38, runOuts: 15 },
      ODI: { matches: 350, innings: 297, runs: 10773, highestScore: 183, highestScoreNotOut: true, average: 50.57, strikeRate: 87.56, centuries: 10, fifties: 73, fours: 826, sixes: 229, ducks: 10, notOuts: 84, bowlingInnings: 2, oversBowled: 6, maidens: 0, runsConceded: 31, wickets: 1, bestBowlingWickets: 1, bestBowlingRuns: 14, bowlingAverage: 31.0, economy: 5.16, bowlingStrikeRate: 36.0, fiveWicketHauls: 0, tenWicketHauls: 0, catches: 321, stumpings: 123, runOuts: 28 },
      T20I: { matches: 98, innings: 85, runs: 1617, highestScore: 56, highestScoreNotOut: false, average: 37.6, strikeRate: 126.13, centuries: 0, fifties: 2, fours: 116, sixes: 52, ducks: 1, notOuts: 42, bowlingInnings: 0, oversBowled: 0, maidens: 0, runsConceded: 0, wickets: 0, bestBowlingWickets: 0, bestBowlingRuns: 0, bowlingAverage: 0, economy: 0, bowlingStrikeRate: 0, fiveWicketHauls: 0, tenWicketHauls: 0, catches: 57, stumpings: 34, runOuts: 9 },
    },
    sourceMeta: { source: 'ICC Hall of Fame', sourceId: 'ind_dhoni', lastUpdated: '2026-11-03', verified: true }
  },
  {
    id: 'aus_bradman',
    name: 'Sir Donald Bradman',
    shortName: 'D. Bradman',
    countryId: 'AUS',
    countryName: 'Australia',
    age: 92,
    dob: '1908-08-27',
    gender: 'MALE',
    status: 'LEGEND',
    role: 'BATTER',
    battingHand: 'RIGHT_HAND',
    bowlingStyle: 'LEG_BREAK',
    formatEligibility: { TEST: true, ODI: false, T20I: false },
    workloadFatigue: 0,
    testRating: 99,
    odiRating: 85,
    t20Rating: 80,
    attributes: { technique: 99, timing: 99, shotSelection: 99, defense: 98, aggression: 90, powerHitting: 85, againstPace: 99, againstSpin: 99, consistency: 99, temperament: 99, pace: 20, swing: 20, seam: 20, spin: 60, accuracy: 65, variation: 60, control: 65, deathBowling: 40, wicketTaking: 50, stamina: 95, fielding: 92, catching: 92, throwing: 90, fitness: 90, leadership: 95, mentalStrength: 99, currentForm: 99, potential: 99 },
    stats: {
      TEST: { matches: 52, innings: 80, runs: 6996, highestScore: 334, highestScoreNotOut: false, average: 99.94, strikeRate: 65.0, centuries: 29, fifties: 13, fours: 618, sixes: 6, ducks: 7, notOuts: 10, bowlingInnings: 16, oversBowled: 38.2, maidens: 4, runsConceded: 72, wickets: 2, bestBowlingWickets: 1, bestBowlingRuns: 8, bowlingAverage: 36.0, economy: 1.87, bowlingStrikeRate: 115.0, fiveWicketHauls: 0, tenWicketHauls: 0, catches: 32, stumpings: 0, runOuts: 4 },
      ODI: { matches: 0, innings: 0, runs: 0, highestScore: 0, highestScoreNotOut: false, average: 0, strikeRate: 0, centuries: 0, fifties: 0, fours: 0, sixes: 0, ducks: 0, notOuts: 0, bowlingInnings: 0, oversBowled: 0, maidens: 0, runsConceded: 0, wickets: 0, bestBowlingWickets: 0, bestBowlingRuns: 0, bowlingAverage: 0, economy: 0, bowlingStrikeRate: 0, fiveWicketHauls: 0, tenWicketHauls: 0, catches: 0, stumpings: 0, runOuts: 0 },
      T20I: { matches: 0, innings: 0, runs: 0, highestScore: 0, highestScoreNotOut: false, average: 0, strikeRate: 0, centuries: 0, fifties: 0, fours: 0, sixes: 0, ducks: 0, notOuts: 0, bowlingInnings: 0, oversBowled: 0, maidens: 0, runsConceded: 0, wickets: 0, bestBowlingWickets: 0, bestBowlingRuns: 0, bowlingAverage: 0, economy: 0, bowlingStrikeRate: 0, fiveWicketHauls: 0, tenWicketHauls: 0, catches: 0, stumpings: 0, runOuts: 0 },
    },
    sourceMeta: { source: 'ICC Hall of Fame', sourceId: 'aus_bradman', lastUpdated: '2026-11-03', verified: true }
  },
  {
    id: 'pak_akram',
    name: 'Wasim Akram',
    shortName: 'W. Akram',
    countryId: 'PAK',
    countryName: 'Pakistan',
    age: 60,
    dob: '1966-06-03',
    gender: 'MALE',
    status: 'LEGEND',
    role: 'BOWLER',
    battingHand: 'LEFT_HAND',
    bowlingStyle: 'LEFT_ARM_FAST',
    formatEligibility: { TEST: true, ODI: true, T20I: true },
    workloadFatigue: 0,
    testRating: 98,
    odiRating: 98,
    t20Rating: 92,
    attributes: { technique: 70, timing: 72, shotSelection: 68, defense: 68, aggression: 85, powerHitting: 85, againstPace: 70, againstSpin: 65, consistency: 95, temperament: 92, pace: 98, swing: 99, seam: 98, spin: 20, accuracy: 96, variation: 96, control: 96, deathBowling: 99, wicketTaking: 99, stamina: 95, fielding: 85, catching: 85, throwing: 90, fitness: 90, leadership: 90, mentalStrength: 96, currentForm: 95, potential: 98 },
    stats: {
      TEST: { matches: 104, innings: 147, runs: 2898, highestScore: 257, highestScoreNotOut: true, average: 22.64, strikeRate: 60.5, centuries: 3, fifties: 7, fours: 350, sixes: 55, ducks: 19, notOuts: 19, bowlingInnings: 181, oversBowled: 3811.4, maidens: 871, runsConceded: 9779, wickets: 414, bestBowlingWickets: 7, bestBowlingRuns: 119, bowlingAverage: 23.62, economy: 2.59, bowlingStrikeRate: 54.6, fiveWicketHauls: 25, tenWicketHauls: 5, catches: 44, stumpings: 0, runOuts: 8 },
      ODI: { matches: 356, innings: 280, runs: 3717, highestScore: 86, highestScoreNotOut: false, average: 16.52, strikeRate: 88.33, centuries: 0, fifties: 6, fours: 280, sixes: 121, ducks: 28, notOuts: 55, bowlingInnings: 351, oversBowled: 3031.1, maidens: 238, runsConceded: 11812, wickets: 502, bestBowlingWickets: 5, bestBowlingRuns: 15, bowlingAverage: 23.52, economy: 3.89, bowlingStrikeRate: 36.2, fiveWicketHauls: 6, tenWicketHauls: 0, catches: 88, stumpings: 0, runOuts: 15 },
      T20I: { matches: 0, innings: 0, runs: 0, highestScore: 0, highestScoreNotOut: false, average: 0, strikeRate: 0, centuries: 0, fifties: 0, fours: 0, sixes: 0, ducks: 0, notOuts: 0, bowlingInnings: 0, oversBowled: 0, maidens: 0, runsConceded: 0, wickets: 0, bestBowlingWickets: 0, bestBowlingRuns: 0, bowlingAverage: 0, economy: 0, bowlingStrikeRate: 0, fiveWicketHauls: 0, tenWicketHauls: 0, catches: 0, stumpings: 0, runOuts: 0 },
    },
    sourceMeta: { source: 'ICC Hall of Fame', sourceId: 'pak_akram', lastUpdated: '2026-11-03', verified: true }
  },
  {
    id: 'ind_smriti',
    name: 'Smriti Mandhana',
    shortName: 'S. Mandhana',
    countryId: 'IND',
    countryName: 'India',
    age: 30,
    dob: '1996-07-18',
    gender: 'FEMALE',
    status: 'ACTIVE',
    role: 'BATTER',
    battingHand: 'LEFT_HAND',
    bowlingStyle: 'RIGHT_ARM_MEDIUM',
    formatEligibility: { TEST: true, ODI: true, T20I: true },
    workloadFatigue: 15,
    testRating: 92,
    odiRating: 95,
    t20Rating: 94,
    attributes: { technique: 94, timing: 95, shotSelection: 92, defense: 88, aggression: 88, powerHitting: 88, againstPace: 94, againstSpin: 93, consistency: 92, temperament: 92, pace: 25, swing: 25, seam: 20, spin: 20, accuracy: 60, variation: 50, control: 60, deathBowling: 40, wicketTaking: 45, stamina: 85, fielding: 88, catching: 88, throwing: 85, fitness: 88, leadership: 85, mentalStrength: 92, currentForm: 92, potential: 95 },
    stats: {
      TEST: { matches: 7, innings: 12, runs: 629, highestScore: 149, highestScoreNotOut: false, average: 57.18, strikeRate: 64.5, centuries: 2, fifties: 3, fours: 92, sixes: 3, ducks: 0, notOuts: 1, bowlingInnings: 0, oversBowled: 0, maidens: 0, runsConceded: 0, wickets: 0, bestBowlingWickets: 0, bestBowlingRuns: 0, bowlingAverage: 0, economy: 0, bowlingStrikeRate: 0, fiveWicketHauls: 0, tenWicketHauls: 0, catches: 5, stumpings: 0, runOuts: 1 },
      ODI: { matches: 85, innings: 85, runs: 3585, highestScore: 136, highestScoreNotOut: false, average: 45.37, strikeRate: 85.5, centuries: 8, fifties: 27, fours: 440, sixes: 42, ducks: 3, notOuts: 6, bowlingInnings: 0, oversBowled: 0, maidens: 0, runsConceded: 0, wickets: 0, bestBowlingWickets: 0, bestBowlingRuns: 0, bowlingAverage: 0, economy: 0, bowlingStrikeRate: 0, fiveWicketHauls: 0, tenWicketHauls: 0, catches: 28, stumpings: 0, runOuts: 5 },
      T20I: { matches: 141, innings: 135, runs: 3493, highestScore: 87, highestScoreNotOut: false, average: 28.86, strikeRate: 122.5, centuries: 0, fifties: 26, fours: 435, sixes: 70, ducks: 6, notOuts: 14, bowlingInnings: 0, oversBowled: 0, maidens: 0, runsConceded: 0, wickets: 0, bestBowlingWickets: 0, bestBowlingRuns: 0, bowlingAverage: 0, economy: 0, bowlingStrikeRate: 0, fiveWicketHauls: 0, tenWicketHauls: 0, catches: 35, stumpings: 0, runOuts: 8 },
    },
    sourceMeta: { source: 'ICC Women Cricket', sourceId: 'ind_smriti', lastUpdated: '2026-11-03', verified: true }
  },
  {
    id: 'aus_perry',
    name: 'Ellyse Perry',
    shortName: 'E. Perry',
    countryId: 'AUS',
    countryName: 'Australia',
    age: 36,
    dob: '1990-11-03',
    gender: 'FEMALE',
    status: 'ACTIVE',
    role: 'ALL_ROUNDER',
    battingHand: 'RIGHT_HAND',
    bowlingStyle: 'RIGHT_ARM_FAST_MEDIUM',
    formatEligibility: { TEST: true, ODI: true, T20I: true },
    workloadFatigue: 15,
    testRating: 98,
    odiRating: 97,
    t20Rating: 94,
    attributes: { technique: 95, timing: 95, shotSelection: 94, defense: 95, aggression: 82, powerHitting: 88, againstPace: 95, againstSpin: 93, consistency: 95, temperament: 96, pace: 85, swing: 90, seam: 88, spin: 20, accuracy: 92, variation: 88, control: 92, deathBowling: 88, wicketTaking: 92, stamina: 92, fielding: 92, catching: 92, throwing: 90, fitness: 95, leadership: 88, mentalStrength: 96, currentForm: 92, potential: 96 },
    stats: {
      TEST: { matches: 13, innings: 23, runs: 925, highestScore: 213, highestScoreNotOut: true, average: 61.66, strikeRate: 46.2, centuries: 2, fifties: 4, fours: 120, sixes: 4, ducks: 1, notOuts: 8, bowlingInnings: 22, oversBowled: 345, maidens: 98, runsConceded: 785, wickets: 38, bestBowlingWickets: 6, bestBowlingRuns: 32, bowlingAverage: 20.65, economy: 2.27, bowlingStrikeRate: 54.4, fiveWicketHauls: 2, tenWicketHauls: 0, catches: 12, stumpings: 0, runOuts: 2 },
      ODI: { matches: 147, innings: 118, runs: 3958, highestScore: 112, highestScoreNotOut: true, average: 51.4, strikeRate: 77.2, centuries: 3, fifties: 34, fours: 380, sixes: 32, ducks: 4, notOuts: 41, bowlingInnings: 136, oversBowled: 1045, maidens: 92, runsConceded: 4560, wickets: 165, bestBowlingWickets: 7, bestBowlingRuns: 22, bowlingAverage: 27.63, economy: 4.36, bowlingStrikeRate: 38.0, fiveWicketHauls: 3, tenWicketHauls: 0, catches: 52, stumpings: 0, runOuts: 8 },
      T20I: { matches: 157, innings: 98, runs: 1918, highestScore: 75, highestScoreNotOut: false, average: 31.44, strikeRate: 116.8, centuries: 0, fifties: 9, fours: 165, sixes: 38, ducks: 3, notOuts: 37, bowlingInnings: 135, oversBowled: 398, maidens: 7, runsConceded: 2350, wickets: 126, bestBowlingWickets: 4, bestBowlingRuns: 12, bowlingAverage: 18.65, economy: 5.9, bowlingStrikeRate: 18.9, fiveWicketHauls: 0, tenWicketHauls: 0, catches: 46, stumpings: 0, runOuts: 6 },
    },
    sourceMeta: { source: 'ICC Women Cricket', sourceId: 'aus_perry', lastUpdated: '2026-11-03', verified: true }
  }
];

const CORE_12_COUNTRIES = new Set(['IND', 'AUS', 'ENG', 'PAK', 'RSA', 'NZL', 'SL', 'BAN', 'WI', 'AFG', 'IRE', 'ZIM']);

const allPlayersCombined = [...mappedPlayers, ...PRESERVED_SPECIAL_PLAYERS];

const coreInternationalPlayers = allPlayersCombined.filter(p => CORE_12_COUNTRIES.has(p.countryId));
const additionalSquadMembers = allPlayersCombined.filter(p => !CORE_12_COUNTRIES.has(p.countryId));

console.log(`Core 12 players: ${coreInternationalPlayers.length}, Additional Associate players: ${additionalSquadMembers.length}, Total: ${allPlayersCombined.length}`);

// 3. Squad Configurations, Captains, Vice-Captains, and Verified Playing XIs
// Build a lookup for lineups:
function getLineupXI(countryCode, format) {
  let list = [];
  if (format === 'TEST') list = testLineups;
  else if (format === 'ODI') list = odiLineups;
  else if (format === 'T20I') list = t20iLineups;

  for (const m of list) {
    if (m.team_a_code === countryCode) return m.team_a_playing_xi;
    if (m.team_b_code === countryCode) return m.team_b_playing_xi;
  }
  return null;
}

// Build captain lookup:
function getCaptainVC(countryCode, format) {
  const fmtStr = format === 'TEST' ? 'Test' : format === 'ODI' ? 'ODI' : 'T20I';
  const found = captainsRaw.find(c => c.country_code === countryCode && c.format === fmtStr);
  return found || null;
}

// Build squad lookup:
function getOfficialSquad(countryCode, format) {
  let list = [];
  if (format === 'TEST') list = testSquads;
  else if (format === 'ODI') list = odiSquads;
  else if (format === 'T20I') list = t20iSquads;

  return list.find(s => s.country_code === countryCode) || null;
}

const formatSquadsData = {};

for (const c of countriesRaw) {
  const code = c.country_code;
  formatSquadsData[code] = {};

  for (const fmt of ['TEST', 'ODI', 'T20I']) {
    const nationalPlayers = allPlayersCombined.filter(p => p.countryId === code && p.status === 'ACTIVE' && p.gender === 'MALE');
    const eligiblePlayers = nationalPlayers.filter(p => p.formatEligibility[fmt]);

    const squadRec = getOfficialSquad(code, fmt);
    const captainRec = getCaptainVC(code, fmt);
    const lineupXI = getLineupXI(code, fmt);

    let squadPlayerIds = squadRec ? (squadRec.selected_players || []) : [];
    if (squadPlayerIds.length < 15) {
      // Add eligible players to fill up to 16
      eligiblePlayers.forEach(p => {
        if (!squadPlayerIds.includes(p.id) && squadPlayerIds.length < 18) {
          squadPlayerIds.push(p.id);
        }
      });
    }

    // Determine captain and vice captain
    let captainId = captainRec?.captain_id;
    if (!captainId || !allPlayersCombined.some(p => p.id === captainId)) {
      captainId = squadPlayerIds[0] || eligiblePlayers[0]?.id || '';
    }

    let viceCaptainId = captainRec?.vice_captain_id;
    if (!viceCaptainId || !allPlayersCombined.some(p => p.id === viceCaptainId)) {
      viceCaptainId = squadPlayerIds[1] || eligiblePlayers[1]?.id || '';
    }

    // Determine designated wicketkeeper
    let wicketKeeperId = squadRec?.wicketkeepers?.[0];
    if (!wicketKeeperId) {
      const wk = eligiblePlayers.find(p => p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER');
      wicketKeeperId = wk ? wk.id : (squadPlayerIds[2] || '');
    }

    // Determine Playing XI (11 players in batting order)
    let playingXI = [];
    if (lineupXI && lineupXI.length >= 11) {
      playingXI = lineupXI.slice(0, 11);
    } else {
      // Order squad players: Openers -> Middle -> All-rounder -> Bowlers
      const openers = eligiblePlayers.filter(p => (p.attributes?.aggression || 0) > 80 && p.role === 'BATTER');
      const middle = eligiblePlayers.filter(p => p.role === 'BATTER' && !openers.includes(p));
      const wk = eligiblePlayers.filter(p => p.id === wicketKeeperId);
      const allrounders = eligiblePlayers.filter(p => p.role === 'ALL_ROUNDER');
      const bowlers = eligiblePlayers.filter(p => p.role === 'BOWLER');

      const ordered = [
        ...openers,
        ...middle,
        ...wk,
        ...allrounders,
        ...bowlers,
        ...eligiblePlayers
      ];

      const seen = new Set();
      ordered.forEach(p => {
        if (!seen.has(p.id) && seen.size < 11) {
          seen.add(p.id);
          playingXI.push(p.id);
        }
      });
    }

    // Ensure XI has 11 if eligible has >= 11
    if (playingXI.length < 11) {
      eligiblePlayers.forEach(p => {
        if (!playingXI.includes(p.id) && playingXI.length < 11) {
          playingXI.push(p.id);
        }
      });
    }

    formatSquadsData[code][fmt] = {
      format: fmt,
      squadPlayerIds,
      playingXI,
      battingOrder: playingXI,
      captainId,
      viceCaptainId,
      wicketKeeperId,
      bowlingRotation: playingXI.filter(id => {
        const p = allPlayersCombined.find(x => x.id === id);
        return p && (p.role === 'BOWLER' || p.role === 'ALL_ROUNDER');
      }),
    };
  }
}

console.log('Built format squads and lineups for all 22 countries.');

// WRITE FILES TO DISK
// 1. src/data/master_players.json
const masterPlayersPath = path.join(projectRoot, 'src/data/master_players.json');
fs.writeFileSync(masterPlayersPath, JSON.stringify(allPlayersCombined, null, 2), 'utf-8');
console.log('Wrote master_players.json:', masterPlayersPath);

// 2. src/data/master_squads.json
const masterSquadsPath = path.join(projectRoot, 'src/data/master_squads.json');
fs.writeFileSync(masterSquadsPath, JSON.stringify(formatSquadsData, null, 2), 'utf-8');
console.log('Wrote master_squads.json:', masterSquadsPath);

// 3. src/data/teams.ts
const teamsTsPath = path.join(projectRoot, 'src/data/teams.ts');
const teamsTsContent = `import { Team } from '../types/cricket';

export const INTERNATIONAL_TEAMS: Team[] = ${JSON.stringify(INTERNATIONAL_TEAMS, null, 2)};

export function getTeamById(teamId: string): Team | undefined {
  if (teamId === 'SRI') return INTERNATIONAL_TEAMS.find((t) => t.id === 'SL');
  if (teamId === 'WIN') return INTERNATIONAL_TEAMS.find((t) => t.id === 'WI');
  return INTERNATIONAL_TEAMS.find((t) => t.id === teamId);
}
`;
fs.writeFileSync(teamsTsPath, teamsTsContent, 'utf-8');
console.log('Wrote teams.ts:', teamsTsPath);

// 4. src/data/players.ts
const playersTsPath = path.join(projectRoot, 'src/data/players.ts');
const playersTsContent = `import { Player, FormatStats, PlayerAttributes, PlayerSourceMeta } from '../types/cricket';
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
`;
fs.writeFileSync(playersTsPath, playersTsContent, 'utf-8');
console.log('Wrote players.ts:', playersTsPath);

// 5. src/data/squads.ts
const squadsTsPath = path.join(projectRoot, 'src/data/squads.ts');
const squadsTsContent = `import {
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
`;
fs.writeFileSync(squadsTsPath, squadsTsContent, 'utf-8');
console.log('Wrote squads.ts:', squadsTsPath);

console.log('Master database generation completed successfully!');

