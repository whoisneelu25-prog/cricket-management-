import { MatchFormat } from '../types/cricket';
import { VENUES } from './venues';

/**
 * Local stadium photograph registry.
 *
 * Every photograph lives in `public/assets/stadiums/` (no external URLs).
 * Resolution order used by `resolveStadiumImage`:
 *   1. EXACT        – the photograph belongs to the match venue itself.
 *   2. HOST_COUNTRY – a real photograph of another stadium in the host nation.
 *   3. NEUTRAL      – no suitable photograph exists; a neutral, image-free
 *                     floodlit-outfield backdrop is rendered instead (we never
 *                     substitute a stadium from an unrelated country).
 *
 * To add a stadium: drop the optimized JPG (≈1920px wide) into
 * `public/assets/stadiums/` and add an entry below with the venue id(s) it depicts.
 */
export interface StadiumImageAsset {
  id: string;
  src: string;
  /** Stadium shown in the photograph */
  label: string;
  /** Country the stadium is located in (team id, e.g. 'IND') */
  countryId: string;
  /** VENUES ids this photograph depicts exactly */
  venueIds: string[];
  /** Lower-case substrings that identify the venue name in fixture data */
  venueKeywords: string[];
  lighting: 'DAY' | 'NIGHT';
  /** Native width; low-res photographs receive a subtle blur so upscaling is not pixelated */
  nativeWidth: number;
}

export const STADIUM_IMAGES: StadiumImageAsset[] = [
  {
    id: 'lords-day',
    src: '/assets/stadiums/lords-day.jpg',
    label: "Lord's Cricket Ground, London",
    countryId: 'ENG',
    venueIds: ['lord_london'],
    venueKeywords: ["lord's", 'lords', 'lord’s'],
    lighting: 'DAY',
    nativeWidth: 596,
  },
  {
    id: 'jaitley-day',
    src: '/assets/stadiums/jaitley-day.jpg',
    label: 'Arun Jaitley Stadium, Delhi',
    countryId: 'IND',
    venueIds: [],
    venueKeywords: ['arun jaitley', 'feroz shah kotla', 'delhi'],
    lighting: 'DAY',
    nativeWidth: 1920,
  },
  {
    id: 'jaitley-night',
    src: '/assets/stadiums/jaitley-night.jpg',
    label: 'Arun Jaitley Stadium, Delhi (floodlights)',
    countryId: 'IND',
    venueIds: [],
    venueKeywords: [],
    lighting: 'NIGHT',
    nativeWidth: 1920,
  },
  {
    id: 'chepauk-night',
    src: '/assets/stadiums/chepauk-night.jpg',
    label: 'M. A. Chidambaram Stadium, Chennai',
    countryId: 'IND',
    venueIds: [],
    venueKeywords: ['chepauk', 'chidambaram', 'chennai'],
    lighting: 'NIGHT',
    nativeWidth: 1200,
  },
];

export type StadiumMatchType = 'EXACT' | 'HOST_COUNTRY' | 'NEUTRAL';

export interface ResolvedStadiumImage {
  src: string | null;
  label: string;
  matchType: StadiumMatchType;
  hostCountryId?: string;
  blurPx: number;
}

function blurFor(asset: StadiumImageAsset): number {
  if (asset.nativeWidth < 800) return 1.5;
  if (asset.nativeWidth < 1400) return 0.5;
  return 0;
}

function stableIndex(key: string, length: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(h) % Math.max(1, length);
}

/** Finds the venue record for a fixture's venue string (exact name first, then name/city contains). */
export function findVenueRecord(venue?: string) {
  const lower = (venue || '').toLowerCase().trim();
  if (!lower) return undefined;
  return (
    VENUES.find((v) => v.name.toLowerCase() === lower) ||
    VENUES.find((v) => lower.includes(v.name.toLowerCase()) || v.name.toLowerCase().includes(lower)) ||
    VENUES.find((v) => lower.includes(v.city.toLowerCase()))
  );
}

export function resolveStadiumImage(
  paramsOrVenue?:
    | {
        venue?: string;
        hostCountryId?: string;
        format?: MatchFormat;
        fallbackSrc?: string;
      }
    | string,
  argHostCountryId?: string,
  argFormat?: MatchFormat,
  argFallbackSrc?: string
): ResolvedStadiumImage {
  const params =
    typeof paramsOrVenue === 'object' && paramsOrVenue !== null
      ? paramsOrVenue
      : {
          venue: paramsOrVenue,
          hostCountryId: argHostCountryId,
          format: argFormat,
          fallbackSrc: argFallbackSrc,
        };

  const { venue, format, fallbackSrc } = params;
  const lowerVenue = (venue || '').toLowerCase();
  const venueRecord = findVenueRecord(venue);
  // The venue's own country is the true host (covers neutral ICC venues); else the fixture's home side.
  const hostCountryId = venueRecord?.countryId || params.hostCountryId;

  // 1. Exact venue photograph
  const exact = STADIUM_IMAGES.find(
    (img) =>
      (venueRecord && img.venueIds.includes(venueRecord.id)) ||
      (lowerVenue && img.venueKeywords.some((k) => lowerVenue.includes(k)))
  );
  if (exact) {
    return { src: exact.src, label: exact.label, matchType: 'EXACT', hostCountryId, blurPx: blurFor(exact) };
  }

  // 2. Host-country photograph (day images for Tests, floodlit images for white-ball when available)
  if (hostCountryId) {
    const countryImages = STADIUM_IMAGES.filter((img) => img.countryId === hostCountryId);
    if (countryImages.length > 0) {
      const preferredLighting = format === 'TEST' ? 'DAY' : 'NIGHT';
      const preferred = countryImages.filter((img) => img.lighting === preferredLighting);
      const pool = preferred.length > 0 ? preferred : countryImages;
      const chosen = pool[stableIndex(venue || hostCountryId, pool.length)];
      return {
        src: chosen.src,
        label: chosen.label,
        matchType: 'HOST_COUNTRY',
        hostCountryId,
        blurPx: blurFor(chosen),
      };
    }
  }

  // 3. Neutral fallback (explicit fallback image if the caller supplied one)
  return {
    src: fallbackSrc || null,
    label: venue || 'International Cricket Ground',
    matchType: 'NEUTRAL',
    hostCountryId,
    blurPx: 0,
  };
}

/** Convenience function that always returns a string path for `img.src` */
export function getStadiumImageSrc(
  venue?: string,
  hostCountryId?: string,
  format?: MatchFormat,
  defaultFallback: string = '/assets/stadiums/jaitley-day.jpg'
): string {
  const resolved = resolveStadiumImage({ venue, hostCountryId, format });
  return resolved.src || defaultFallback;
}

