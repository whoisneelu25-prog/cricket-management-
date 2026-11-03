import { MatchFormat } from '../types/cricket';

export interface CoachPreset {
  id: string;
  name: string;
  nationality: string;
  countryId: string;
  avatar: string;
  tagline: string;
  preferredFormat: MatchFormat;
  coachingExp: 'INTERNATIONAL' | 'DOMESTIC' | 'CLUB' | 'FRANCHISE' | 'ACADEMY';
  managementStyle: 'AGGRESSIVE' | 'TACTICAL' | 'MAN_MANAGER' | 'ANALYTICAL' | 'FITNESS' | 'DISCIPLINARIAN';
  perkTitle: string;
  perkDescription: string;
}

export const FAMOUS_COACH_PRESETS: CoachPreset[] = [
  {
    id: 'gambhir',
    name: 'Gautam Gambhir',
    nationality: 'India',
    countryId: 'IND',
    avatar: '🇮🇳',
    tagline: 'Aggressive & Fearless Intent',
    preferredFormat: 'T20I',
    coachingExp: 'FRANCHISE',
    managementStyle: 'AGGRESSIVE',
    perkTitle: 'High-Pressure Intent',
    perkDescription: '+12% boundary hitting under pressure; boosts counter-attack intent across all formats.',
  },
  {
    id: 'dravid',
    name: 'Rahul Dravid',
    nationality: 'India',
    countryId: 'IND',
    avatar: '🇮🇳',
    tagline: 'The Wall: Technical Resilience',
    preferredFormat: 'TEST',
    coachingExp: 'INTERNATIONAL',
    managementStyle: 'TACTICAL',
    perkTitle: 'Defensive Fortitude',
    perkDescription: '+15% batter patience & eye-in defense; significantly reduces batting collapses in Tests.',
  },
  {
    id: 'mccullum',
    name: 'Brendon McCullum',
    nationality: 'New Zealand',
    countryId: 'NZL',
    avatar: '🇳🇿',
    tagline: 'Bazball Pioneer & Attacking Cricket',
    preferredFormat: 'TEST',
    coachingExp: 'INTERNATIONAL',
    managementStyle: 'AGGRESSIVE',
    perkTitle: 'Bazball Revolution',
    perkDescription: '+20% run rate in red-ball cricket; aggressive 4th-innings run-chase mindset.',
  },
  {
    id: 'flower',
    name: 'Andy Flower',
    nationality: 'Zimbabwe',
    countryId: 'ZIM',
    avatar: '🇿🇼',
    tagline: 'Master Tactician & Analytics Guru',
    preferredFormat: 'T20I',
    coachingExp: 'FRANCHISE',
    managementStyle: 'ANALYTICAL',
    perkTitle: 'Data-Driven Matchups',
    perkDescription: '+12% bowling matchup accuracy; optimizes bowler field placement efficiency.',
  },
  {
    id: 'langer',
    name: 'Justin Langer',
    nationality: 'Australia',
    countryId: 'AUS',
    avatar: '🇦🇺',
    tagline: 'Elite Conditioning & Relentless Grit',
    preferredFormat: 'TEST',
    coachingExp: 'INTERNATIONAL',
    managementStyle: 'FITNESS',
    perkTitle: 'Peak Conditioning',
    perkDescription: '+25% squad stamina recovery; reduces match fatigue and injury vulnerability.',
  },
  {
    id: 'fleming',
    name: 'Stephen Fleming',
    nationality: 'New Zealand',
    countryId: 'NZL',
    avatar: '🇳🇿',
    tagline: 'Franchise Legend & Calm Man-Manager',
    preferredFormat: 'ODI',
    coachingExp: 'FRANCHISE',
    managementStyle: 'MAN_MANAGER',
    perkTitle: 'Clutch Composure',
    perkDescription: '+10% squad morale boost; exceptional consistency in tournament knockouts.',
  },
  {
    id: 'kirsten',
    name: 'Gary Kirsten',
    nationality: 'South Africa',
    countryId: 'RSA',
    avatar: '🇿🇦',
    tagline: 'World Cup Winning Architect',
    preferredFormat: 'ODI',
    coachingExp: 'INTERNATIONAL',
    managementStyle: 'MAN_MANAGER',
    perkTitle: 'Tournament Peak',
    perkDescription: '+15% performance boost in ICC tournament elimination and final matches.',
  },
  {
    id: 'sammy',
    name: 'Daren Sammy',
    nationality: 'West Indies',
    countryId: 'WI',
    avatar: '🌴',
    tagline: 'T20 Powerhouse & Inspirational Leader',
    preferredFormat: 'T20I',
    coachingExp: 'INTERNATIONAL',
    managementStyle: 'AGGRESSIVE',
    perkTitle: 'Maximum Six Intent',
    perkDescription: '+15% maximum boundary clear rate in death overs and powerplays.',
  },
];

