import { MatchFormat, Player, FormatSquadConfig, CareerSave } from '../types/cricket';
import formatSelectionDataJson from './format_selection_data.json';
import formatPlayersJson from './format_players.json';

export interface FormatSelectionPoolEntry {
  format: MatchFormat;
  captainPlayerId: string;
  viceCaptainPlayerId: string;
  wicketKeeperPlayerId: string;
  firstChoiceXIPlayerIds: string[];
  poolPlayerIds: string[];
  defaultSquadPlayerIds: string[];
}

export type NationSelectionData = Record<MatchFormat, FormatSelectionPoolEntry>;

export const NATIONAL_SELECTION_DATA = formatSelectionDataJson as Record<string, NationSelectionData>;
export const FORMAT_PLAYERS = formatPlayersJson as Player[];

/** Map of player ID to Player for fast lookup */
export const FORMAT_PLAYERS_MAP = new Map<string, Player>(
  FORMAT_PLAYERS.map((p) => [p.id, p])
);

/**
 * Normalizes country codes across variations (e.g. RSA / SA, SL / SRI, WI / WIN)
 */
export function normalizeCountryCode(code: string): string {
  if (!code) return '';
  const c = code.toUpperCase().trim();
  if (c === 'SA' || c === 'RSA') return 'RSA';
  if (c === 'SRI' || c === 'SL') return 'SL';
  if (c === 'WIN' || c === 'WI') return 'WI';
  return c;
}

/**
 * Gets format selection data for any of the 12 nations
 */
export function getNationFormatSelectionData(
  countryId: string,
  format: MatchFormat
): FormatSelectionPoolEntry | undefined {
  const norm = normalizeCountryCode(countryId);
  const nationData = NATIONAL_SELECTION_DATA[norm] || NATIONAL_SELECTION_DATA[countryId];
  return nationData?.[format];
}

/**
 * Returns all selectable players in that country & format's complete selection pool
 * (First-choice Playing XI + Selection Pool = Complete Format Selection Pool).
 */
export function getFormatSelectionPoolPlayers(
  countryId: string,
  format: MatchFormat,
  career?: CareerSave
): Player[] {
  const fData = getNationFormatSelectionData(countryId, format);
  if (!fData) return [];

  const poolSet = new Set(fData.poolPlayerIds);
  const result: Player[] = [];

  for (const id of fData.poolPlayerIds) {
    let p = FORMAT_PLAYERS_MAP.get(id);
    if (!p && career?.emergingPlayers) {
      p = career.emergingPlayers.find((x) => x.id === id);
    }
    if (p) {
      // Check career override if available
      const ov = career?.playerOverrides?.[id];
      result.push(ov ? { ...p, ...ov } : p);
    }
  }

  return result;
}

/**
 * Gets the first-choice Playing XI (11 players in order) for country & format
 */
export function getDefaultFormatPlayingXI(countryId: string, format: MatchFormat): string[] {
  const fData = getNationFormatSelectionData(countryId, format);
  return fData ? [...fData.firstChoiceXIPlayerIds] : [];
}

/**
 * Gets the official default captain for country & format
 */
export function getDefaultFormatCaptainId(countryId: string, format: MatchFormat): string {
  const fData = getNationFormatSelectionData(countryId, format);
  return fData?.captainPlayerId || '';
}

/**
 * Gets the default vice captain for country & format
 */
export function getDefaultFormatViceCaptainId(countryId: string, format: MatchFormat): string {
  const fData = getNationFormatSelectionData(countryId, format);
  return fData?.viceCaptainPlayerId || '';
}

/**
 * Gets the default wicketkeeper for country & format
 */
export function getDefaultFormatWicketKeeperId(countryId: string, format: MatchFormat): string {
  const fData = getNationFormatSelectionData(countryId, format);
  return fData?.wicketKeeperPlayerId || '';
}

/**
 * Gets the default 15-player squad (XI + top reserves) for country & format
 */
export function getDefaultFormatSquadPlayerIds(countryId: string, format: MatchFormat): string[] {
  const fData = getNationFormatSelectionData(countryId, format);
  return fData ? [...fData.defaultSquadPlayerIds] : [];
}

/**
 * Builds a complete default FormatSquadConfig for any country and format
 */
export function buildDefaultFormatSquadConfig(countryId: string, format: MatchFormat): FormatSquadConfig {
  const fData = getNationFormatSelectionData(countryId, format);
  const xi = fData ? [...fData.firstChoiceXIPlayerIds] : [];
  const squad = fData ? [...fData.defaultSquadPlayerIds] : [...xi];
  const cap = fData?.captainPlayerId || xi[0] || '';
  const vc = fData?.viceCaptainPlayerId || (xi[1] !== cap ? xi[1] : xi[0]) || '';
  const wk = fData?.wicketKeeperPlayerId || xi.find((id) => {
    const p = FORMAT_PLAYERS_MAP.get(id);
    return p?.isWicketKeeper || p?.role === 'WICKETKEEPER_BATTER';
  }) || xi[4] || xi[0] || '';

  return {
    format,
    squadPlayerIds: squad,
    reservePlayerIds: fData?.poolPlayerIds.filter((id) => !squad.includes(id)) || [],
    playingXI: xi,
    battingOrder: xi,
    captainId: cap,
    viceCaptainId: vc,
    wicketKeeperId: wk,
    bowlingRotation: xi.slice(5),
    targetSquadSize: squad.length,
    isConfirmed: true,
    lastConfirmedDate: new Date().toISOString().split('T')[0],
  };
}

/**
 * Validates squad size and pool membership
 */
export function validateFormatSquad(
  squadPlayerIds: string[],
  poolPlayerIds: string[],
  minSize: number = 11,
  maxSize: number = 20
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (squadPlayerIds.length < minSize) {
    errors.push(`Squad must contain at least ${minSize} players (currently selected: ${squadPlayerIds.length}).`);
  }
  if (squadPlayerIds.length > maxSize) {
    errors.push(`Squad cannot exceed ${maxSize} players (currently selected: ${squadPlayerIds.length}).`);
  }

  const poolSet = new Set(poolPlayerIds);
  for (const id of squadPlayerIds) {
    if (!poolSet.has(id)) {
      errors.push(`Player with ID ${id} is not in this format's official selection pool.`);
    }
  }

  // Check unique
  const uniqueCount = new Set(squadPlayerIds).size;
  if (uniqueCount !== squadPlayerIds.length) {
    errors.push('Squad contains duplicate player selections.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates Playing XI constraints:
 * - Exactly 11 players
 * - All in selected squad
 * - Exactly 1 Captain and 1 Vice-Captain (different players, in squad)
 * - Exactly 1 Wicketkeeper in Playing XI (with WK capability)
 */
export function validatePlayingXI(params: {
  playingXI: string[];
  squadPlayerIds: string[];
  captainId: string;
  viceCaptainId?: string;
  wicketKeeperId: string;
  playersById: Record<string, Player> | Map<string, Player>;
}): { isValid: boolean; errors: string[] } {
  const { playingXI, squadPlayerIds, captainId, viceCaptainId, wicketKeeperId, playersById } = params;
  const errors: string[] = [];
  const getP = (id: string): Player | undefined =>
    playersById instanceof Map ? playersById.get(id) : playersById[id];

  if (playingXI.length !== 11) {
    errors.push(`Playing XI must contain exactly 11 players (currently: ${playingXI.length}).`);
  }

  const squadSet = new Set(squadPlayerIds);
  for (const id of playingXI) {
    if (!squadSet.has(id)) {
      const p = getP(id);
      errors.push(`Player ${p?.shortName || id} is not in the selected squad.`);
    }
  }

  // Check duplicates
  if (new Set(playingXI).size !== playingXI.length) {
    errors.push('Playing XI contains duplicate players.');
  }

  // Captain validation
  if (!captainId || !squadSet.has(captainId)) {
    errors.push('Captain must be a member of the selected squad.');
  }

  // Vice-Captain validation
  if (viceCaptainId && (!squadSet.has(viceCaptainId) || viceCaptainId === captainId)) {
    if (viceCaptainId === captainId) {
      errors.push('Captain and Vice-Captain must be two different players.');
    } else {
      errors.push('Vice-Captain must be a member of the selected squad.');
    }
  }

  // Wicketkeeper validation
  if (!wicketKeeperId) {
    errors.push('A designated wicketkeeper must be selected.');
  } else if (!playingXI.includes(wicketKeeperId)) {
    errors.push('The designated wicketkeeper must be in the Playing XI.');
  } else {
    const wkPlayer = getP(wicketKeeperId);
    if (wkPlayer && !wkPlayer.isWicketKeeper && wkPlayer.role !== 'WICKETKEEPER_BATTER') {
      errors.push(`${wkPlayer.shortName} does not have wicketkeeper capabilities.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
