import React, { useState, useMemo } from 'react';
import {
  X,
  Check,
  Shield,
  Users,
  AlertCircle,
  Award,
  Sparkles,
  Crown,
  Search,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { CareerSave, Player, Tour, MatchFormat } from '../../types/cricket';
import {
  getPlayersByCountry,
  getEffectivePlayer,
  getDefaultFormatSquadConfig,
} from '../../data/squads';
import {
  getFormatSelectionPoolPlayers,
  getNationFormatSelectionData,
} from '../../data/formatSquadsData';
import { TourFormatSquadAnnouncement, getGranularPlayerRole } from '../../store/careerStore';

interface TourSelectionModalProps {
  tour: Tour;
  countryId: string;
  career?: CareerSave;
  initialFormat?: MatchFormat;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tourId: string, squadData: string[] | TourFormatSquadAnnouncement) => void;
}

export const TourSelectionModal: React.FC<TourSelectionModalProps> = ({
  tour,
  countryId,
  career,
  initialFormat,
  isOpen,
  onClose,
  onConfirm,
}) => {
  // Determine the exact formats being played on this tour
  const tourFormats: MatchFormat[] = useMemo(() => {
    const bySeries = (['TEST', 'ODI', 'T20I'] as MatchFormat[]).filter(
      (fmt) => (tour.series?.[fmt]?.matchCount || 0) > 0
    );
    if (bySeries.length > 0) return bySeries;
    if (tour.formats && tour.formats.length > 0) return tour.formats;
    return ['TEST', 'ODI', 'T20I'];
  }, [tour]);

  const [activeFormat, setActiveFormat] = useState<MatchFormat>(() =>
    initialFormat && tourFormats.includes(initialFormat) ? initialFormat : tourFormats[0]
  );

  // Build the official format-specific selection pool for each format played on the tour
  const formatPoolsByFormat = useMemo(() => {
    const fallbackPool = getPlayersByCountry(countryId, true);
    const map: Record<MatchFormat, Player[]> = {
      TEST: [],
      ODI: [],
      T20I: [],
    };

    (['TEST', 'ODI', 'T20I'] as MatchFormat[]).forEach((fmt) => {
      const officialPool = getFormatSelectionPoolPlayers(countryId, fmt);
      const baseList = officialPool && officialPool.length >= 11 ? officialPool : fallbackPool;
      map[fmt] = baseList.map((p) => (career ? getEffectivePlayer(p.id, career) || p : p));
    });

    return map;
  }, [countryId, career]);

  const getFormatRating = (p: Player, fmt: MatchFormat): number => {
    if (fmt === 'TEST') return p.testRating || 75;
    if (fmt === 'ODI') return p.odiRating || 75;
    return p.t20Rating || 75;
  };

  const getRecommendedFormatSquadIds = (fmt: MatchFormat, targetCount: number = 15): string[] => {
    const pool = formatPoolsByFormat[fmt] || [];
    const poolIds = new Set(pool.map((p) => p.id));
    const nationData = getNationFormatSelectionData(countryId, fmt);

    if (nationData && nationData.defaultSquadPlayerIds.length >= 11) {
      const validDefault = nationData.defaultSquadPlayerIds.filter((id) => poolIds.has(id));
      if (validDefault.length >= targetCount) {
        return validDefault.slice(0, targetCount);
      }
      const extras = pool
        .filter((p) => !validDefault.includes(p.id))
        .map((p) => p.id)
        .slice(0, targetCount - validDefault.length);
      return [...validDefault, ...extras];
    }

    const sorted = [...pool].sort((a, b) => getFormatRating(b, fmt) - getFormatRating(a, fmt));
    const keepers = sorted.filter((p) => p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER');
    const batters = sorted.filter((p) => p.role === 'BATTER');
    const allRounders = sorted.filter((p) => p.role === 'ALL_ROUNDER');
    const bowlers = sorted.filter((p) => p.role === 'BOWLER');

    const squad: string[] = [];
    keepers.slice(0, 2).forEach((p) => squad.push(p.id));
    batters.slice(0, 5).forEach((p) => {
      if (!squad.includes(p.id)) squad.push(p.id);
    });
    allRounders.slice(0, 3).forEach((p) => {
      if (!squad.includes(p.id)) squad.push(p.id);
    });
    bowlers.slice(0, 5).forEach((p) => {
      if (!squad.includes(p.id)) squad.push(p.id);
    });

    for (const p of sorted) {
      if (squad.length >= targetCount) break;
      if (!squad.includes(p.id)) squad.push(p.id);
    }
    return squad.slice(0, targetCount);
  };

  // Independent selected squad IDs per format on the tour
  const [formatSquads, setFormatSquads] = useState<Record<MatchFormat, string[]>>(() => {
    const initial: Record<MatchFormat, string[]> = { TEST: [], ODI: [], T20I: [] };
    (['TEST', 'ODI', 'T20I'] as MatchFormat[]).forEach((fmt) => {
      const poolIds = new Set((formatPoolsByFormat[fmt] || []).map((p) => p.id));
      const existingTourFmt = tour.formatSquads?.[fmt]?.filter((id) => poolIds.has(id));
      if (existingTourFmt && existingTourFmt.length >= 11) {
        initial[fmt] = existingTourFmt;
        return;
      }
      const existingCareerFmt = career?.formatSquads?.[fmt]?.squadPlayerIds?.filter((id) =>
        poolIds.has(id)
      );
      if (existingCareerFmt && existingCareerFmt.length >= 11) {
        initial[fmt] = existingCareerFmt;
        return;
      }
      initial[fmt] = getRecommendedFormatSquadIds(fmt, 15);
    });
    return initial;
  });

  // Independent target squad size cap (11-20, default 15) per format
  const [targetSizes, setTargetSizes] = useState<Record<MatchFormat, number>>(() => ({
    TEST: Math.max(11, Math.min(20, formatSquads.TEST.length || 15)),
    ODI: Math.max(11, Math.min(20, formatSquads.ODI.length || 15)),
    T20I: Math.max(11, Math.min(20, formatSquads.T20I.length || 15)),
  }));

  // Independent Captain & Vice-Captain per format
  const [captains, setCaptains] = useState<Record<MatchFormat, string>>(() => {
    const init: Record<MatchFormat, string> = { TEST: '', ODI: '', T20I: '' };
    (['TEST', 'ODI', 'T20I'] as MatchFormat[]).forEach((fmt) => {
      const sq = formatSquads[fmt] || [];
      const defaultCfg = getDefaultFormatSquadConfig(countryId, fmt);
      const savedCap =
        tour.captains?.[fmt] ||
        career?.formatSquads?.[fmt]?.captainId ||
        defaultCfg.captainId;
      init[fmt] = sq.includes(savedCap) ? savedCap : sq[0] || '';
    });
    return init;
  });

  const [viceCaptains, setViceCaptains] = useState<Record<MatchFormat, string>>(() => {
    const init: Record<MatchFormat, string> = { TEST: '', ODI: '', T20I: '' };
    (['TEST', 'ODI', 'T20I'] as MatchFormat[]).forEach((fmt) => {
      const sq = formatSquads[fmt] || [];
      const defaultCfg = getDefaultFormatSquadConfig(countryId, fmt);
      const savedVc =
        tour.viceCaptains?.[fmt] ||
        career?.formatSquads?.[fmt]?.viceCaptainId ||
        defaultCfg.viceCaptainId;
      init[fmt] =
        sq.includes(savedVc) && savedVc !== captains[fmt]
          ? savedVc
          : sq.find((id) => id !== captains[fmt]) || sq[0] || '';
    });
    return init;
  });

  const [roleFilter, setRoleFilter] = useState<
    'ALL' | 'BATTER' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKETKEEPER_BATTER'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const activePool = formatPoolsByFormat[activeFormat] || [];
  const activeSelectedIds = formatSquads[activeFormat] || [];
  const activeTargetSize = targetSizes[activeFormat] || 15;
  const activeCaptainId = captains[activeFormat] || '';
  const activeViceCaptainId = viceCaptains[activeFormat] || '';

  const togglePlayerInFormat = (playerId: string) => {
    setStatusMessage(null);
    const current = formatSquads[activeFormat] || [];
    if (current.includes(playerId)) {
      const next = current.filter((id) => id !== playerId);
      setFormatSquads((prev) => ({ ...prev, [activeFormat]: next }));
      if (activeCaptainId === playerId && next[0]) {
        setCaptains((prev) => ({ ...prev, [activeFormat]: next[0] }));
      }
      if (activeViceCaptainId === playerId && next[1]) {
        setViceCaptains((prev) => ({ ...prev, [activeFormat]: next[1] }));
      }
    } else {
      if (current.length >= activeTargetSize) {
        setStatusMessage(
          `${activeFormat} tour squad is at its configured cap (${activeTargetSize} players). Increase the Squad Cap (up to 20) or deselect a player first.`
        );
        return;
      }
      const next = [...current, playerId];
      setFormatSquads((prev) => ({ ...prev, [activeFormat]: next }));
      if (!activeCaptainId) {
        setCaptains((prev) => ({ ...prev, [activeFormat]: playerId }));
      }
    }
  };

  const handleSetFormatTargetSize = (sz: number) => {
    const clamped = Math.max(11, Math.min(20, sz));
    setTargetSizes((prev) => ({ ...prev, [activeFormat]: clamped }));
    const current = formatSquads[activeFormat] || [];
    if (current.length > clamped) {
      const trimmed = current.slice(0, clamped);
      setFormatSquads((prev) => ({ ...prev, [activeFormat]: trimmed }));
    }
    setStatusMessage(null);
  };

  const handleAutoSelectFormat = () => {
    const rec = getRecommendedFormatSquadIds(activeFormat, activeTargetSize);
    setFormatSquads((prev) => ({ ...prev, [activeFormat]: rec }));
    const defaultCfg = getDefaultFormatSquadConfig(countryId, activeFormat);
    setCaptains((prev) => ({
      ...prev,
      [activeFormat]: rec.includes(defaultCfg.captainId) ? defaultCfg.captainId : rec[0] || '',
    }));
    setViceCaptains((prev) => ({
      ...prev,
      [activeFormat]: rec.includes(defaultCfg.viceCaptainId)
        ? defaultCfg.viceCaptainId
        : rec[1] || rec[0] || '',
    }));
    setStatusMessage(`Auto-selected recommended ${rec.length}-player ${activeFormat} tour squad.`);
  };

  // Validate a specific format's squad
  const isFormatSquadValid = (fmt: MatchFormat): { valid: boolean; reason?: string } => {
    const ids = formatSquads[fmt] || [];
    const pool = formatPoolsByFormat[fmt] || [];
    const players = pool.filter((p) => ids.includes(p.id));
    const wks = players.filter((p) => p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER').length;
    if (ids.length < 11) {
      return { valid: false, reason: `Select at least 11 players (${ids.length} selected)` };
    }
    if (ids.length > 20) {
      return { valid: false, reason: `Maximum 20 players allowed (${ids.length} selected)` };
    }
    if (wks < 1) {
      return { valid: false, reason: 'Must include at least 1 Wicketkeeper' };
    }
    return { valid: true };
  };

  const allTourFormatsValid = tourFormats.every((fmt) => isFormatSquadValid(fmt).valid);

  // Composition metrics for activeFormat
  const selectedPlayers = activePool.filter((p) => activeSelectedIds.includes(p.id));
  const wkCount = selectedPlayers.filter(
    (p) => p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER'
  ).length;
  const batterCount = selectedPlayers.filter((p) => p.role === 'BATTER').length;
  const allRounderCount = selectedPlayers.filter((p) => p.role === 'ALL_ROUNDER').length;
  const paceCount = selectedPlayers.filter((p) => {
    if (p.role !== 'BOWLER' && p.role !== 'ALL_ROUNDER') return false;
    const st = (p.bowlingStyle || '').toUpperCase();
    return st.includes('FAST') || st.includes('MEDIUM');
  }).length;
  const spinCount = selectedPlayers.filter((p) => {
    if (p.role !== 'BOWLER' && p.role !== 'ALL_ROUNDER') return false;
    const st = (p.bowlingStyle || '').toUpperCase();
    return st.includes('SPIN') || st.includes('BREAK') || st.includes('SLOW');
  }).length;

  const sortedPool = [...activePool].sort((a, b) => {
    const aSel = activeSelectedIds.includes(a.id) ? 1 : 0;
    const bSel = activeSelectedIds.includes(b.id) ? 1 : 0;
    if (aSel !== bSel) return bSel - aSel;
    return getFormatRating(b, activeFormat) - getFormatRating(a, activeFormat);
  });

  const filteredPool = sortedPool.filter((p) => {
    if (roleFilter !== 'ALL') {
      if (roleFilter === 'WICKETKEEPER_BATTER') {
        if (!p.isWicketKeeper && p.role !== 'WICKETKEEPER_BATTER') return false;
      } else if (p.role !== roleFilter) {
        return false;
      }
    }
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const currentFmtIdx = tourFormats.indexOf(activeFormat);
  const nextFormatInTour =
    currentFmtIdx >= 0 && currentFmtIdx < tourFormats.length - 1
      ? tourFormats[currentFmtIdx + 1]
      : null;

  const handleConfirmAllTourFormats = () => {
    if (!allTourFormatsValid) return;
    const payloadFormatSquads: Partial<Record<MatchFormat, string[]>> = {};
    const payloadCaptains: Partial<Record<MatchFormat, string>> = {};
    const payloadViceCaptains: Partial<Record<MatchFormat, string>> = {};

    tourFormats.forEach((fmt) => {
      payloadFormatSquads[fmt] = formatSquads[fmt];
      payloadCaptains[fmt] = captains[fmt] || formatSquads[fmt][0] || '';
      payloadViceCaptains[fmt] =
        viceCaptains[fmt] || formatSquads[fmt][1] || formatSquads[fmt][0] || '';
    });

    onConfirm(tour.id, {
      formatSquads: payloadFormatSquads,
      captains: payloadCaptains,
      viceCaptains: payloadViceCaptains,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="bg-[#070a0e] border border-[#1e2733] w-full max-w-5xl max-h-[92vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden text-[#e8edf2]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1e2733] flex items-center justify-between bg-[#10151c]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] bg-[#e2b64a]/15 text-[#ffe9a8] font-black border border-[#e2b64a]/40 px-2.5 py-0.5 rounded font-mono uppercase tracking-wider">
                Format-Specific Tour Selection
              </span>
              <span className="text-xs text-[#8b97a3] font-mono">
                Deadline: {tour.squadSelectionDeadline}
              </span>
              <span className="text-[10px] bg-[#070a0e] text-[#8fb2d9] border border-[#1e2733] px-2 py-0.5 rounded font-mono">
                Formats Played: {tourFormats.join(' • ')}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white mt-1 uppercase tracking-tight">
              Select Format Touring Pools: {tour.name}
            </h2>
            <p className="text-xs text-[#8b97a3] mt-0.5">
              Select an independent touring squad from the official format selection pool for each format played on this tour.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8b97a3] hover:text-white p-2 rounded-xl bg-[#070a0e] border border-[#1e2733] hover:border-[#33404f] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Tabs for Each Format Played on This Tour */}
        <div className="bg-[#070a0e] px-4 sm:px-5 py-3 border-b border-[#1e2733] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {tourFormats.map((fmt) => {
              const isSelectedTab = activeFormat === fmt;
              const fmtIds = formatSquads[fmt] || [];
              const fmtTarget = targetSizes[fmt] || 15;
              const matchCount = tour.series?.[fmt]?.matchCount || 0;
              const check = isFormatSquadValid(fmt);

              return (
                <button
                  key={fmt}
                  onClick={() => {
                    setActiveFormat(fmt);
                    setStatusMessage(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2.5 border ${
                    isSelectedTab
                      ? 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black border-transparent shadow-md font-black'
                      : 'bg-[#10151c] text-[#c3ccd6] hover:text-white border-[#1e2733]'
                  }`}
                >
                  <span className="uppercase tracking-wider">{fmt} Tour Pool</span>
                  {matchCount > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isSelectedTab
                          ? 'bg-black/20 text-black font-bold'
                          : 'bg-[#070a0e] text-[#8b97a3]'
                      }`}
                    >
                      {matchCount}M
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isSelectedTab
                        ? 'bg-black text-[#ffe9a8] font-bold'
                        : check.valid
                        ? 'bg-[#3fca86]/20 text-[#3fca86] border border-[#3fca86]/40'
                        : 'bg-[#ff3d7f]/20 text-[#ff5470] border border-[#ff3d7f]/40'
                    }`}
                  >
                    {check.valid && <Check className="w-3 h-3" />}
                    {fmtIds.length}/{fmtTarget}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-[#8b97a3] font-mono">
            {activeFormat} Pool Available: <strong className="text-white">{activePool.length} Players</strong>
          </div>
        </div>

        {/* Active Format Squad Cap & Composition Bar */}
        <div className="bg-[#10151c] px-4 sm:px-5 py-3 border-b border-[#1e2733] space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Target Size Cap Buttons (11-20, Default 15) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="dugout-kicker text-[10px] text-[#e2b64a]">
                {activeFormat} Tour Squad Size:
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {[11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => handleSetFormatTargetSize(sz)}
                    className={`w-6 h-6 rounded text-[11px] font-mono font-bold transition cursor-pointer ${
                      activeTargetSize === sz
                        ? 'bg-[#e2b64a] text-black font-black shadow-xs'
                        : 'bg-[#070a0e] text-[#8b97a3] hover:text-white border border-[#1e2733]'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
              <span
                className={`font-mono font-bold ml-1 ${
                  activeSelectedIds.length >= 11 && activeSelectedIds.length <= 20
                    ? 'text-[#3fca86]'
                    : 'text-[#ff5470]'
                }`}
              >
                ({activeSelectedIds.length} / {activeTargetSize} selected)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoSelectFormat}
                className="px-3 py-1.5 rounded-xl bg-[#070a0e] hover:bg-[#161d27] border border-[#e2b64a]/40 text-[11px] font-bold text-[#ffe9a8] transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#e2b64a]" />
                <span>Auto-Select Best {activeTargetSize} ({activeFormat})</span>
              </button>
            </div>
          </div>

          {/* Composition & Leadership Summary */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#1e2733]/80 text-[11px]">
            <div className="flex flex-wrap items-center gap-3 font-mono text-[#c3ccd6]">
              <span>
                Batters: <strong className="text-white">{batterCount}</strong>
              </span>
              <span>•</span>
              <span>
                Keepers:{' '}
                <strong className={wkCount > 0 ? 'text-[#3fca86]' : 'text-[#ff5470]'}>
                  {wkCount}
                </strong>
              </span>
              <span>•</span>
              <span>
                All-Rounders: <strong className="text-white">{allRounderCount}</strong>
              </span>
              <span>•</span>
              <span>
                Pace: <strong className="text-white">{paceCount}</strong>
              </span>
              <span>•</span>
              <span>
                Spin: <strong className="text-white">{spinCount}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono">
              <span>
                {activeFormat} Capt:{' '}
                <strong className="text-[#ffe9a8]">
                  {activePool.find((p) => p.id === activeCaptainId)?.shortName || 'Select C'}
                </strong>
              </span>
              <span>•</span>
              <span>
                VC:{' '}
                <strong className="text-[#8fb2d9]">
                  {activePool.find((p) => p.id === activeViceCaptainId)?.shortName || 'Select VC'}
                </strong>
              </span>
            </div>
          </div>

          {statusMessage && (
            <div className="text-[11px] px-3 py-1.5 rounded-lg bg-[#e2b64a]/15 border border-[#e2b64a]/40 text-[#ffe9a8] flex items-center justify-between">
              <span>{statusMessage}</span>
              <button
                onClick={() => setStatusMessage(null)}
                className="font-bold hover:opacity-80 cursor-pointer ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {!isFormatSquadValid(activeFormat).valid && (
            <div className="flex items-center gap-1.5 text-[#ff5470] bg-[#ff3d7f]/15 border border-[#ff3d7f]/40 px-3 py-1.5 rounded-lg text-[11px] font-semibold">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                {activeFormat} Tour Squad: {isFormatSquadValid(activeFormat).reason}
              </span>
            </div>
          )}
        </div>

        {/* Role Filters & Search Bar */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-[#1e2733] bg-[#070a0e] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(
              ['ALL', 'BATTER', 'ALL_ROUNDER', 'WICKETKEEPER_BATTER', 'BOWLER'] as const
            ).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition cursor-pointer ${
                  roleFilter === r
                    ? 'bg-[#e2b64a] text-black'
                    : 'bg-[#10151c] text-[#8b97a3] hover:text-white border border-[#1e2733]'
                }`}
              >
                {r === 'WICKETKEEPER_BATTER' ? 'Keepers' : r.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#8b97a3] absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder={`Search ${activeFormat} pool...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#10151c] border border-[#1e2733] pl-8 pr-3 py-1 rounded-lg text-xs text-white placeholder-[#556375] focus:outline-none focus:border-[#e2b64a]"
            />
          </div>
        </div>

        {/* Format Selection Pool Player Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredPool.map((player) => {
              const isSelected = activeSelectedIds.includes(player.id);
              const isCap = activeCaptainId === player.id;
              const isVC = activeViceCaptainId === player.id;
              const isWK = player.isWicketKeeper || player.role === 'WICKETKEEPER_BATTER';
              const fmtRating = getFormatRating(player, activeFormat);
              const granularRole = getGranularPlayerRole(player);

              return (
                <div
                  key={player.id}
                  onClick={() => togglePlayerInFormat(player.id)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-[#101d18] border-[#3fca86]/60 shadow-xs'
                      : 'bg-[#10151c] border-[#1e2733] hover:border-[#33404f]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected
                          ? 'bg-[#3fca86] text-black'
                          : 'bg-[#070a0e] border border-[#1e2733] text-transparent'
                      }`}
                    >
                      {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-white truncate">
                          {player.name}
                        </span>
                        {isCap && isSelected && (
                          <span className="text-[9px] bg-[#e2b64a] text-black px-1.5 py-0.2 rounded font-black uppercase">
                            C
                          </span>
                        )}
                        {isVC && isSelected && !isCap && (
                          <span className="text-[9px] bg-[#8fb2d9]/20 text-[#8fb2d9] border border-[#8fb2d9]/40 px-1.5 py-0.2 rounded font-bold font-mono uppercase">
                            VC
                          </span>
                        )}
                        {isWK && (
                          <span className="text-[9px] bg-[#3fca86]/20 text-[#3fca86] border border-[#3fca86]/40 px-1.5 py-0.2 rounded font-bold font-mono uppercase">
                            WK
                          </span>
                        )}
                        {player.isInjured && (
                          <span className="text-[9px] bg-[#ff3d7f]/20 text-[#ff5470] border border-[#ff3d7f]/40 px-1.5 py-0.2 rounded font-bold uppercase">
                            INJ
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#8b97a3] mt-0.5 font-mono truncate">
                        {granularRole.replace(/_/g, ' ')} •{' '}
                        <span className="text-[#ffe9a8] font-bold">
                          {activeFormat} RTG: {fmtRating}
                        </span>{' '}
                        • {player.battingHand === 'LEFT_HAND' ? 'LHB' : 'RHB'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSelected && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCaptains((prev) => ({ ...prev, [activeFormat]: player.id }));
                          }}
                          title={`Set as ${activeFormat} Tour Captain`}
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase cursor-pointer border ${
                            isCap
                              ? 'bg-[#e2b64a] text-black border-[#e2b64a]'
                              : 'bg-[#070a0e] text-[#8b97a3] hover:text-white border-[#1e2733]'
                          }`}
                        >
                          C
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViceCaptains((prev) => ({ ...prev, [activeFormat]: player.id }));
                          }}
                          title={`Set as ${activeFormat} Tour Vice-Captain`}
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase cursor-pointer border ${
                            isVC && !isCap
                              ? 'bg-[#8fb2d9]/25 text-[#8fb2d9] border-[#8fb2d9]'
                              : 'bg-[#070a0e] text-[#8b97a3] hover:text-white border-[#1e2733]'
                          }`}
                        >
                          VC
                        </button>
                      </>
                    )}
                    <span className="text-[10px] font-mono text-[#8b97a3] ml-1">
                      Fit {100 - (player.workloadFatigue || 0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1e2733] bg-[#10151c] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            {tourFormats.map((fmt) => {
              const check = isFormatSquadValid(fmt);
              return (
                <span
                  key={fmt}
                  onClick={() => setActiveFormat(fmt)}
                  className={`px-2.5 py-1 rounded-lg border cursor-pointer flex items-center gap-1 ${
                    check.valid
                      ? 'bg-[#070a0e] border-[#3fca86]/40 text-[#3fca86]'
                      : 'bg-[#070a0e] border-[#ff3d7f]/40 text-[#ff5470]'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>
                    {fmt}: {(formatSquads[fmt] || []).length} Players
                  </span>
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#8b97a3] hover:text-white bg-[#070a0e] border border-[#1e2733] transition cursor-pointer uppercase"
            >
              Cancel
            </button>

            {nextFormatInTour && (
              <button
                onClick={() => setActiveFormat(nextFormatInTour)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#ffe9a8] bg-[#070a0e] hover:bg-[#161d27] border border-[#e2b64a]/50 transition cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
              >
                <span>Next: {nextFormatInTour} Pool</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              disabled={!allTourFormatsValid}
              onClick={handleConfirmAllTourFormats}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 ${
                allTourFormatsValid
                  ? 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black shadow-lg cursor-pointer hover:brightness-110'
                  : 'bg-[#070a0e] text-[#556375] border border-[#1e2733] cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>
                Confirm &amp; Announce {tourFormats.length > 1 ? 'All Format Squads' : `${tourFormats[0]} Tour Squad`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
