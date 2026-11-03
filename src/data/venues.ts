import { PitchCondition, WeatherCondition } from '../types/cricket';

export interface VenueInfo {
  id: string;
  name: string;
  city: string;
  countryId: string;
  capacity: number;
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
    countryId: 'WIN',
    capacity: 28000,
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
];
