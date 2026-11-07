import { PitchCondition, WeatherCondition } from '../types/cricket';

export interface VenueInfo {
  id: string;
  name: string;
  city: string;
  countryId: string;
  capacity: number;
  boundarySize: 'SHORT' | 'MEDIUM' | 'LARGE';
  avgBoundaryMeters: number;
  dewProne: boolean;
  pitch: PitchCondition;
  weather: WeatherCondition;
}

export const VENUES: VenueInfo[] = [
  {
    id: 'lord_london',
    name: "Lord's Cricket Ground",
    city: 'London',
    countryId: 'ENG',
    capacity: 31100,
    boundarySize: 'MEDIUM',
    avgBoundaryMeters: 70,
    dewProne: false,
    pitch: {
      name: 'Lord’s Slope & Seam',
      type: 'GREEN_SEAMER',
      paceBonus: 15,
      spinBonus: -5,
      bounceVariation: 12,
      wearFactor: 1.0,
    },
    weather: {
      type: 'OVERCAST_SWING',
      swingBonus: 20,
      description: 'Typical English overcast sky with notable late swing under heavy cloud cover.',
    },
  },
  {
    id: 'mcg_melbourne',
    name: 'Melbourne Cricket Ground (MCG)',
    city: 'Melbourne',
    countryId: 'AUS',
    capacity: 100024,
    boundarySize: 'LARGE',
    avgBoundaryMeters: 82,
    dewProne: false,
    pitch: {
      name: 'Drop-in True Bounce',
      type: 'SPORTING_BALANCED',
      paceBonus: 12,
      spinBonus: 4,
      bounceVariation: 8,
      wearFactor: 1.1,
    },
    weather: {
      type: 'SUNNY',
      swingBonus: 4,
      description: 'Clear sunny sky with crisp breeze across the massive colosseum.',
    },
  },
  {
    id: 'wankhede_mumbai',
    name: 'Wankhede Stadium',
    city: 'Mumbai',
    countryId: 'IND',
    capacity: 33108,
    boundarySize: 'SHORT',
    avgBoundaryMeters: 64,
    dewProne: true,
    pitch: {
      name: 'Red Soil True Bounce',
      type: 'BATTER_PARADISE',
      paceBonus: 6,
      spinBonus: 14,
      bounceVariation: 6,
      wearFactor: 1.4,
    },
    weather: {
      type: 'HUMID',
      swingBonus: 8,
      description: 'Warm, humid evening coastal breeze with noticeable evening dew potential.',
    },
  },
  {
    id: 'eden_kolkata',
    name: 'Eden Gardens',
    city: 'Kolkata',
    countryId: 'IND',
    capacity: 68000,
    boundarySize: 'MEDIUM',
    avgBoundaryMeters: 68,
    dewProne: true,
    pitch: {
      name: 'Historic Black Clay',
      type: 'SPORTING_BALANCED',
      paceBonus: 10,
      spinBonus: 12,
      bounceVariation: 7,
      wearFactor: 1.3,
    },
    weather: {
      type: 'HAZY',
      swingBonus: 6,
      description: 'Electric atmosphere with slight evening haze under the floodlights.',
    },
  },
  {
    id: 'super_centurion',
    name: 'SuperSport Park',
    city: 'Centurion',
    countryId: 'RSA',
    capacity: 22000,
    boundarySize: 'MEDIUM',
    avgBoundaryMeters: 72,
    dewProne: false,
    pitch: {
      name: 'Highveld Steep Bounce',
      type: 'GREEN_SEAMER',
      paceBonus: 22,
      spinBonus: -8,
      bounceVariation: 18,
      wearFactor: 1.2,
    },
    weather: {
      type: 'SUNNY',
      swingBonus: 12,
      description: 'High altitude thin air allowing high pace through to the keeper.',
    },
  },
  {
    id: 'kensington_barbados',
    name: 'Kensington Oval',
    city: 'Bridgetown',
    countryId: 'WI',
    capacity: 28000,
    boundarySize: 'MEDIUM',
    avgBoundaryMeters: 69,
    dewProne: true,
    pitch: {
      name: 'Caribbean Hard Deck',
      type: 'SPORTING_BALANCED',
      paceBonus: 14,
      spinBonus: 8,
      bounceVariation: 10,
      wearFactor: 1.15,
    },
    weather: {
      type: 'SUNNY',
      swingBonus: 10,
      description: 'Vibrant trade winds blowing across the ground from the Atlantic.',
    },
  },
  {
    id: 'arun_jaitley_delhi',
    name: 'Arun Jaitley Stadium, Delhi',
    city: 'Delhi',
    countryId: 'IND',
    capacity: 41820,
    boundarySize: 'SHORT',
    avgBoundaryMeters: 64,
    dewProne: true,
    pitch: {
      name: 'Low Slow Black Clay',
      type: 'DUSTBOWL_SPIN',
      paceBonus: 4,
      spinBonus: 18,
      bounceVariation: 10,
      wearFactor: 1.45,
    },
    weather: {
      type: 'HAZY',
      swingBonus: 6,
      description: 'Warm Delhi air with evening floodlights and late finger-spin grip.',
    },
  },
  {
    id: 'chepauk_chennai',
    name: 'M. A. Chidambaram Stadium, Chennai',
    city: 'Chennai',
    countryId: 'IND',
    capacity: 38200,
    boundarySize: 'MEDIUM',
    avgBoundaryMeters: 68,
    dewProne: true,
    pitch: {
      name: 'Chepauk Red Clay Turner',
      type: 'DUSTBOWL_SPIN',
      paceBonus: 5,
      spinBonus: 20,
      bounceVariation: 12,
      wearFactor: 1.5,
    },
    weather: {
      type: 'HUMID',
      swingBonus: 7,
      description: 'Coastal sea breeze from Marina Beach with traditional spin assistance.',
    },
  },
  {
    id: 'oval_london',
    name: 'The Oval, London',
    city: 'London',
    countryId: 'ENG',
    capacity: 27500,
    boundarySize: 'MEDIUM',
    avgBoundaryMeters: 71,
    dewProne: false,
    pitch: {
      name: 'Surrey True Pace & Late Turn',
      type: 'SPORTING_BALANCED',
      paceBonus: 12,
      spinBonus: 6,
      bounceVariation: 9,
      wearFactor: 1.15,
    },
    weather: {
      type: 'OVERCAST_SWING',
      swingBonus: 14,
      description: 'Breezy South London skies offering swing early and good batting value.',
    },
  },
  {
    id: 'scg_sydney',
    name: 'Sydney Cricket Ground (SCG)',
    city: 'Sydney',
    countryId: 'AUS',
    capacity: 48000,
    boundarySize: 'LARGE',
    avgBoundaryMeters: 76,
    dewProne: false,
    pitch: {
      name: 'SCG Traditional Bulli Soil',
      type: 'SPORTING_BALANCED',
      paceBonus: 10,
      spinBonus: 14,
      bounceVariation: 9,
      wearFactor: 1.3,
    },
    weather: {
      type: 'SUNNY',
      swingBonus: 6,
      description: 'Warm coastal afternoon with footmarks aiding spin on days four and five.',
    },
  },
  {
    id: 'gaddafi_lahore',
    name: 'Gaddafi Stadium, Lahore',
    city: 'Lahore',
    countryId: 'PAK',
    capacity: 27000,
    boundarySize: 'MEDIUM',
    avgBoundaryMeters: 69,
    dewProne: true,
    pitch: {
      name: 'Flat Subcontinent Batting Deck',
      type: 'BATTER_PARADISE',
      paceBonus: 8,
      spinBonus: 10,
      bounceVariation: 6,
      wearFactor: 1.25,
    },
    weather: {
      type: 'HAZY',
      swingBonus: 8,
      description: 'Dry conditions with reverse swing potential and heavy evening dew under lights.',
    },
  },
  {
    id: 'national_karachi',
    name: 'National Stadium, Karachi',
    city: 'Karachi',
    countryId: 'PAK',
    capacity: 34228,
    boundarySize: 'MEDIUM',
    avgBoundaryMeters: 70,
    dewProne: true,
    pitch: {
      name: 'Abrasive Reverse & Spin Strip',
      type: 'SPORTING_BALANCED',
      paceBonus: 9,
      spinBonus: 14,
      bounceVariation: 8,
      wearFactor: 1.35,
    },
    weather: {
      type: 'HUMID',
      swingBonus: 9,
      description: 'Arabian Sea breeze helping late reverse swing and spinners.',
    },
  },
  {
    id: 'wanderers_johannesburg',
    name: 'The Wanderers Stadium, Johannesburg',
    city: 'Johannesburg',
    countryId: 'RSA',
    capacity: 34000,
    boundarySize: 'MEDIUM',
    avgBoundaryMeters: 70,
    dewProne: false,
    pitch: {
      name: 'Bullring High-Pace Strip',
      type: 'GREEN_SEAMER',
      paceBonus: 20,
      spinBonus: -6,
      bounceVariation: 16,
      wearFactor: 1.2,
    },
    weather: {
      type: 'SUNNY',
      swingBonus: 14,
      description: 'Electric Bullring atmosphere at altitude with lively carry and seam.',
    },
  },
  {
    id: 'basin_wellington',
    name: 'Basin Reserve, Wellington',
    city: 'Wellington',
    countryId: 'NZL',
    capacity: 11600,
    boundarySize: 'MEDIUM',
    avgBoundaryMeters: 68,
    dewProne: false,
    pitch: {
      name: 'Lush Green Top (Flattens Days 3–5)',
      type: 'GREEN_SEAMER',
      paceBonus: 18,
      spinBonus: -4,
      bounceVariation: 12,
      wearFactor: 1.05,
    },
    weather: {
      type: 'OVERCAST_SWING',
      swingBonus: 18,
      description: 'Strong Cook Strait breeze assisting sustained swing and seam bowling.',
    },
  },
  {
    id: 'eden_park_auckland',
    name: 'Eden Park, Auckland',
    city: 'Auckland',
    countryId: 'NZL',
    capacity: 42000,
    boundarySize: 'SHORT',
    avgBoundaryMeters: 60,
    dewProne: true,
    pitch: {
      name: 'Drop-in True Pace Deck',
      type: 'BATTER_PARADISE',
      paceBonus: 10,
      spinBonus: 4,
      bounceVariation: 6,
      wearFactor: 1.05,
    },
    weather: {
      type: 'SUNNY',
      swingBonus: 10,
      description: 'Short straight boundaries producing high-scoring white-ball contests.',
    },
  },
  {
    id: 'premadasa_colombo',
    name: 'R. Premadasa Stadium, Colombo',
    city: 'Colombo',
    countryId: 'SL',
    capacity: 35000,
    boundarySize: 'MEDIUM',
    avgBoundaryMeters: 69,
    dewProne: true,
    pitch: {
      name: 'Slow Turning Subcontinent Surface',
      type: 'DUSTBOWL_SPIN',
      paceBonus: 4,
      spinBonus: 19,
      bounceVariation: 11,
      wearFactor: 1.45,
    },
    weather: {
      type: 'HUMID',
      swingBonus: 8,
      description: 'Tropical Colombo humidity with pronounced turn as the ball softens.',
    },
  },
  {
    id: 'galle_stadium',
    name: 'Galle International Stadium',
    city: 'Galle',
    countryId: 'SL',
    capacity: 35000,
    boundarySize: 'MEDIUM',
    avgBoundaryMeters: 68,
    dewProne: false,
    pitch: {
      name: 'Classic Galle Rank Turner',
      type: 'DUSTBOWL_SPIN',
      paceBonus: 3,
      spinBonus: 22,
      bounceVariation: 14,
      wearFactor: 1.55,
    },
    weather: {
      type: 'SUNNY',
      swingBonus: 6,
      description: 'Iconic Dutch Fort backdrop with ocean breeze and sharp spin from Day 2.',
    },
  },
  {
    id: 'mirpur_dhaka',
    name: 'Sher-e-Bangla National Cricket Stadium, Mirpur',
    city: 'Dhaka',
    countryId: 'BAN',
    capacity: 25416,
    boundarySize: 'MEDIUM',
    avgBoundaryMeters: 67,
    dewProne: true,
    pitch: {
      name: 'Mirpur Low & Slow Black Soil',
      type: 'DUSTBOWL_SPIN',
      paceBonus: 4,
      spinBonus: 18,
      bounceVariation: 13,
      wearFactor: 1.45,
    },
    weather: {
      type: 'HUMID',
      swingBonus: 6,
      description: 'Warm, sticky Dhaka conditions where accurate spinners dominate.',
    },
  },
  {
    id: 'sharjah_afg',
    name: 'Sharjah Cricket Stadium',
    city: 'Sharjah',
    countryId: 'AFG',
    capacity: 16000,
    boundarySize: 'SHORT',
    avgBoundaryMeters: 62,
    dewProne: true,
    pitch: {
      name: 'Dry Desert Wrist-Spin Strip',
      type: 'DUSTBOWL_SPIN',
      paceBonus: 6,
      spinBonus: 16,
      bounceVariation: 9,
      wearFactor: 1.35,
    },
    weather: {
      type: 'SUNNY',
      swingBonus: 5,
      description: 'Arid desert stadium with short boundaries and grip for mystery spin.',
    },
  },
  {
    id: 'malahide_dublin',
    name: 'Malahide Cricket Club Ground, Dublin',
    city: 'Dublin',
    countryId: 'IRE',
    capacity: 11500,
    boundarySize: 'MEDIUM',
    avgBoundaryMeters: 66,
    dewProne: false,
    pitch: {
      name: 'Lush Irish Green Seamer',
      type: 'GREEN_SEAMER',
      paceBonus: 16,
      spinBonus: -4,
      bounceVariation: 12,
      wearFactor: 1.05,
    },
    weather: {
      type: 'OVERCAST_SWING',
      swingBonus: 19,
      description: 'Cool Irish sea breeze assisting swing bowlers throughout the day.',
    },
  },
  {
    id: 'harare_sports_club',
    name: 'Harare Sports Club',
    city: 'Harare',
    countryId: 'ZIM',
    capacity: 10000,
    boundarySize: 'MEDIUM',
    avgBoundaryMeters: 69,
    dewProne: false,
    pitch: {
      name: 'Morning Seam, Afternoon Spin Deck',
      type: 'SPORTING_BALANCED',
      paceBonus: 11,
      spinBonus: 11,
      bounceVariation: 9,
      wearFactor: 1.25,
    },
    weather: {
      type: 'SUNNY',
      swingBonus: 10,
      description: 'Crisp highveld morning movement followed by slower afternoon turn.',
    },
  },
];

export function resolveVenueProfile(venueName: string): {
  boundarySize: 'SHORT' | 'MEDIUM' | 'LARGE';
  avgBoundaryMeters: number;
  dewProne: boolean;
} {
  const lower = (venueName || '').toLowerCase();
  const exact = VENUES.find(
    (v) =>
      v.name.toLowerCase() === lower ||
      lower.includes(v.city.toLowerCase()) ||
      lower.includes(v.name.split(' ')[0].toLowerCase())
  );
  if (exact) {
    return {
      boundarySize: exact.boundarySize,
      avgBoundaryMeters: exact.avgBoundaryMeters,
      dewProne: exact.dewProne,
    };
  }
  if (lower.includes('melbourne') || lower.includes('mcg') || lower.includes('adelaide') || lower.includes('perth') || lower.includes('gabba') || lower.includes('sydney')) {
    return { boundarySize: 'LARGE', avgBoundaryMeters: 80, dewProne: false };
  }
  if (lower.includes('chinnaswamy') || lower.includes('auckland') || lower.includes('eden park') || lower.includes('sharjah') || lower.includes('wankhede')) {
    return { boundarySize: 'SHORT', avgBoundaryMeters: 63, dewProne: true };
  }
  if (lower.includes('mumbai') || lower.includes('kolkata') || lower.includes('chennai') || lower.includes('colombo') || lower.includes('dhaka') || lower.includes('lahore') || lower.includes('karachi') || lower.includes('dubai')) {
    return { boundarySize: 'MEDIUM', avgBoundaryMeters: 68, dewProne: true };
  }
  return { boundarySize: 'MEDIUM', avgBoundaryMeters: 71, dewProne: false };
}
