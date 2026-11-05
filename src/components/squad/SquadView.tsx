import React, { useState } from 'react';
import {
  Users,
  Shield,
  AlertTriangle,
  Search,
  CheckCircle2,
  Lock,
  ChevronDown,
  UserPlus,
  UserMinus,
  Crown,
  Award,
  Sparkles,
  RefreshCw,
  Plus,
  X,
  Filter,
} from 'lucide-react';
import {
  CareerSave,
  Player,
  MatchFormat,
  FormatSquadConfig,
  GranularPlayerRole,
} from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import {
  inspectNationalTeamSquad,
  getGranularPlayerRole,
  addPlayerToFormatSquad,
  removePlayerFromFormatSquad,
  toggleFormatReservePlayer,
  promoteReserveToFormatSquad,
  replaceInjuredPlayerInFormatSquad,
  resetFormatSquadSelection,
  confirmFormatSquad,
  setFormatCaptain,
  setFormatViceCaptain,
  setFormatWicketKeeper,
  setFormatTargetSquadSize,
} from '../../store/careerStore';

interface SquadViewProps {
  career: CareerSave;
  onUpdateSquadXI?: (format: MatchFormat, xiIds: string[]) => void;
  onSetCaptain?: (format: MatchFormat, playerId: string) => void;
  onSetViceCaptain?: (format: MatchFormat, playerId: string) => void;
  onSetWicketKeeper?: (format: MatchFormat, playerId: string) => void;
  onSelectPlayer: (player: Player) => void;
  onOpenTourSelection?: (tourId: string) => void;
  onCareerUpdated?: (updated: CareerSave) => void;
}

export const SquadView: React.FC<SquadViewProps> = ({
  career,
  onUpdateSquadXI,
  onSetCaptain,
  onSetViceCaptain,
  onSetWicketKeeper,
  onSelectPlayer,
  onOpenTourSelection,
  onCareerUpdated,
}) => {
  const [viewedCountryId, setViewedCountryId] = useState<string>(career.selectedTeamId);
  const [selectedFormat, setSelectedFormat] = useState<MatchFormat>('TEST');

  // 9 Granular Filters for National Selection Pool
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterBattingStyle, setFilterBattingStyle] = useState<string>('ALL');
  const [filterBowlingStyle, setFilterBowlingStyle] = useState<string>('ALL');
  const [filterAge, setFilterAge] = useState<string>('ALL');
  const [filterForm, setFilterForm] = useState<string>('ALL');
  const [filterFitness, setFilterFitness] = useState<string>('ALL');
  const [filterExperience, setFilterExperience] = useState<string>('ALL');
  const [filterAvailability, setFilterAvailability] = useState<string>('ALL');
  const [filterRating, setFilterRating] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Confirmation Modal State (for captain changes or dropping senior players)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const inspection = inspectNationalTeamSquad(career, viewedCountryId, selectedFormat);
  const isReadOnly = inspection.isReadOnly;
  const fullNationalPool = inspection.players;
  const formatConfig: FormatSquadConfig = inspection.formatConfig;

  const viewedTeam = INTERNATIONAL_TEAMS.find((t) => t.id === viewedCountryId);
  const userTeam = INTERNATIONAL_TEAMS.find((t) => t.id === career.selectedTeamId);

  // Squad and Reserve lists
  const squadPlayerIds = formatConfig.squadPlayerIds || [];
  const reservePlayerIds = formatConfig.reservePlayerIds || [];
  const targetSize = formatConfig.targetSquadSize || (selectedFormat === 'TEST' ? 18 : 16);

  const squadPlayers = squadPlayerIds
    .map((id) => fullNationalPool.find((p) => p.id === id))
    .filter((p): p is Player => p !== undefined);

  const reservePlayers = reservePlayerIds
    .map((id) => fullNationalPool.find((p) => p.id === id))
    .filter((p): p is Player => p !== undefined);

  // Helper to dispatch career updates
  const handleUpdate = (updated: CareerSave) => {
    if (onCareerUpdated) {
      onCareerUpdated(updated);
    }
  };

  // Composition metrics
  const battersCount = squadPlayers.filter((p) => {
    const role = getGranularPlayerRole(p);
    return role === 'OPENING_BATTER' || role === 'MIDDLE_ORDER_BATTER' || role === 'BATTER';
  }).length;
  const wkCount = squadPlayers.filter(
    (p) => p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER' || p.id === formatConfig.wicketKeeperId
  ).length;
  const arCount = squadPlayers.filter((p) => p.role === 'ALL_ROUNDER').length;
  const paceCount = squadPlayers.filter((p) => {
    if (p.role !== 'BOWLER' && p.role !== 'ALL_ROUNDER') return false;
    const style = (p.bowlingStyle || '').toUpperCase();
    return style.includes('FAST') || style.includes('MEDIUM');
  }).length;
  const spinCount = squadPlayers.filter((p) => {
    if (p.role !== 'BOWLER' && p.role !== 'ALL_ROUNDER') return false;
    const style = (p.bowlingStyle || '').toUpperCase();
    return style.includes('SPIN') || style.includes('BREAK') || style.includes('SLOW');
  }).length;

  // Non-destructive balance warnings
  const warnings: string[] = [];
  if (!isReadOnly) {
    if (squadPlayers.length < targetSize) {
      warnings.push(`Squad is below target: ${squadPlayers.length}/${targetSize} selected.`);
    } else if (squadPlayers.length > targetSize) {
      warnings.push(`Squad exceeds target: ${squadPlayers.length}/${targetSize} selected.`);
    }
    if (wkCount === 0) {
      warnings.push('CRITICAL: No recognized wicketkeeper in format squad.');
    }
    if (paceCount < 3 && selectedFormat !== 'T20I') {
      warnings.push('Recommendation: Select at least 3 pace bowlers for Test/ODI balance.');
    }
    if (spinCount === 0) {
      warnings.push('Recommendation: Consider at least 1 specialist spin option.');
    }
  }

  // Action Handlers
  const handleAddPlayer = (playerId: string) => {
    if (isReadOnly) return;
    const { updatedCareer } = addPlayerToFormatSquad(career, selectedFormat, playerId);
    handleUpdate(updatedCareer);
  };

  const handleRemovePlayer = (player: Player) => {
    if (isReadOnly) return;
    const overallRating = Math.round((player.testRating + player.odiRating + player.t20Rating) / 3);
    const isSenior = overallRating >= 85 || (player.stats?.TEST?.matches || 0) >= 40;
    const isCaptain = player.id === formatConfig.captainId;

    if (isSenior || isCaptain) {
      setConfirmModal({
        isOpen: true,
        title: isCaptain ? 'Remove Team Captain?' : 'Drop Senior International?',
        message: isCaptain
          ? `${player.name} is the current ${selectedFormat} Captain. Dropping them will require assigning a new captain.`
          : `${player.name} is a key senior player with a rating of ${overallRating}. Are you sure you want to drop them from the ${selectedFormat} squad?`,
        onConfirm: () => {
          const { updatedCareer } = removePlayerFromFormatSquad(career, selectedFormat, player.id);
          handleUpdate(updatedCareer);
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        },
      });
      return;
    }

    const { updatedCareer } = removePlayerFromFormatSquad(career, selectedFormat, player.id);
    handleUpdate(updatedCareer);
  };

  const handleToggleReserve = (playerId: string) => {
    if (isReadOnly) return;
    const updated = toggleFormatReservePlayer(career, selectedFormat, playerId);
    handleUpdate(updated);
  };

  const handlePromoteReserve = (playerId: string) => {
    if (isReadOnly) return;
    const { updatedCareer } = promoteReserveToFormatSquad(career, selectedFormat, playerId);
    handleUpdate(updatedCareer);
  };

  const handleAssignCaptain = (player: Player) => {
    if (isReadOnly) return;
    if (formatConfig.captainId && formatConfig.captainId !== player.id) {
      const currentCap = fullNationalPool.find((p) => p.id === formatConfig.captainId);
      setConfirmModal({
        isOpen: true,
        title: 'Change Team Captain',
        message: `Replace ${currentCap?.name || 'current captain'} with ${player.name} as ${selectedFormat} Captain? This decision affects team leadership.`,
        onConfirm: () => {
          if (onSetCaptain) onSetCaptain(selectedFormat, player.id);
          const updated = setFormatCaptain(career, selectedFormat, player.id);
          handleUpdate(updated);
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        },
      });
      return;
    }
    if (onSetCaptain) onSetCaptain(selectedFormat, player.id);
    const updated = setFormatCaptain(career, selectedFormat, player.id);
    handleUpdate(updated);
  };

  const handleAssignViceCaptain = (playerId: string) => {
    if (isReadOnly) return;
    if (onSetViceCaptain) onSetViceCaptain(selectedFormat, playerId);
    const updated = setFormatViceCaptain(career, selectedFormat, playerId);
    handleUpdate(updated);
  };

  const handleAssignWicketKeeper = (playerId: string) => {
    if (isReadOnly) return;
    if (onSetWicketKeeper) onSetWicketKeeper(selectedFormat, playerId);
    const updated = setFormatWicketKeeper(career, selectedFormat, playerId);
    handleUpdate(updated);
  };

  const handleSetTargetSize = (size: number) => {
    if (isReadOnly) return;
    const updated = setFormatTargetSquadSize(career, selectedFormat, size);
    handleUpdate(updated);
  };

  const handleReset = () => {
    if (isReadOnly) return;
    setConfirmModal({
      isOpen: true,
      title: 'Reset Format Squad',
      message: `Reset ${selectedFormat} squad to default national selection? All custom selections for ${selectedFormat} will revert.`,
      onConfirm: () => {
        const updated = resetFormatSquadSelection(career, selectedFormat);
        handleUpdate(updated);
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
      },
    });
  };

  const handleConfirmSquad = () => {
    if (isReadOnly) return;
    const updated = confirmFormatSquad(career, selectedFormat);
    handleUpdate(updated);
  };

  // 9 Filters Logic
  const filteredPool = fullNationalPool.filter((p) => {
    // Exclude players already in squad or reserves
    if (squadPlayerIds.includes(p.id) || reservePlayerIds.includes(p.id)) {
      return false;
    }

    const role = getGranularPlayerRole(p);
    if (filterRole !== 'ALL' && role !== filterRole) return false;

    if (filterBattingStyle !== 'ALL') {
      if (filterBattingStyle === 'RHB' && p.battingHand !== 'RIGHT_HAND') return false;
      if (filterBattingStyle === 'LHB' && p.battingHand !== 'LEFT_HAND') return false;
    }

    if (filterBowlingStyle !== 'ALL') {
      const bowl = (p.bowlingStyle || '').toUpperCase();
      if (filterBowlingStyle === 'FAST' && !bowl.includes('FAST') && !bowl.includes('MEDIUM')) return false;
      if (filterBowlingStyle === 'SPIN' && !bowl.includes('SPIN') && !bowl.includes('BREAK') && !bowl.includes('SLOW')) return false;
    }

    const age = p.age || 26;
    if (filterAge === 'U25' && age >= 25) return false;
    if (filterAge === '25_32' && (age < 25 || age > 32)) return false;
    if (filterAge === 'O32' && age <= 32) return false;

    const form = p.currentForm || p.attributes?.currentForm || 75;
    if (filterForm === 'HIGH' && form < 80) return false;
    if (filterForm === 'MED' && (form < 60 || form >= 80)) return false;
    if (filterForm === 'LOW' && form >= 60) return false;

    const fit = p.fitness || p.attributes?.fitness || 90;
    if (filterFitness === 'HIGH' && fit < 85) return false;
    if (filterFitness === 'MED' && (fit < 70 || fit >= 85)) return false;
    if (filterFitness === 'LOW' && fit >= 70) return false;

    const testCaps = p.stats?.TEST?.matches || 0;
    const odiCaps = p.stats?.ODI?.matches || 0;
    const t20Caps = p.stats?.T20I?.matches || 0;
    const totalCaps = testCaps + odiCaps + t20Caps;
    if (filterExperience === 'DEBUT' && totalCaps > 5) return false;
    if (filterExperience === 'REGULAR' && (totalCaps <= 5 || totalCaps > 30)) return false;
    if (filterExperience === 'VETERAN' && totalCaps <= 30) return false;

    if (filterAvailability === 'AVAILABLE' && p.isInjured) return false;
    if (filterAvailability === 'INJURED' && !p.isInjured) return false;

    const rating = Math.round((p.testRating + p.odiRating + p.t20Rating) / 3);
    if (filterRating === '85+' && rating < 85) return false;
    if (filterRating === '75_84' && (rating < 75 || rating >= 85)) return false;
    if (filterRating === 'U75' && rating >= 75) return false;

    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-4 select-none pb-8 text-[#e8edf2]">
      {/* Top Banner: Country Switcher & Format Tabs in Dugout Style */}
      <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#10151c] border border-[#1e2733] flex items-center justify-center text-3xl shadow-md">
            {viewedTeam?.flagEmoji || '🏏'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="dugout-kicker text-[11px] text-[#e2b64a]">Squad Roster</span>
              {isReadOnly ? (
                <span className="text-[10px] bg-[#10151c] text-[#8b97a3] font-mono px-2 py-0.5 rounded-full border border-[#1e2733] flex items-center gap-1 font-bold">
                  <Lock className="w-3 h-3" /> Read-Only AI Squad
                </span>
              ) : (
                <span className="text-[10px] bg-[#e2b64a]/10 text-[#e2b64a] font-mono px-2 py-0.5 rounded-full border border-[#e2b64a]/30 font-bold uppercase tracking-wider">
                  Managed Nation
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-0.5">
              {viewedTeam?.name} National Squad
            </h1>
            <p className="text-xs text-[#8b97a3] mt-0.5">
              Tier 2: Format-specific national squad pool selection, tour reserves &amp; leadership
            </p>
          </div>
        </div>

        {/* Format Tabs & Country Inspector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Format Selector */}
          <div className="flex bg-[#10151c] p-1 rounded-xl border border-[#1e2733]">
            {(['TEST', 'ODI', 'T20I'] as MatchFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider transition cursor-pointer ${
                  selectedFormat === fmt
                    ? 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black shadow-sm'
                    : 'text-[#8b97a3] hover:text-white'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* Inspect other national squads (strictly read-only) */}
          <div className="flex items-center space-x-2 bg-[#10151c] border border-[#1e2733] px-3 py-1.5 rounded-xl text-xs">
            <span className="dugout-kicker text-[10px] text-[#8b97a3]">Inspect:</span>
            <select
              value={viewedCountryId}
              onChange={(e) => setViewedCountryId(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer tracking-wide"
            >
              <option value={career.selectedTeamId} className="bg-[#070a0e] text-[#ffe9a8]">
                ★ {userTeam?.name} (Managed)
              </option>
              {INTERNATIONAL_TEAMS.filter((t) => t.id !== career.selectedTeamId).map((t) => (
                <option key={t.id} value={t.id} className="bg-[#070a0e] text-[#c3ccd6]">
                  {t.name} (AI)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Squad Size & Composition Bar in Dugout Style */}
      <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Size Selector */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="dugout-kicker text-[11px] text-[#e2b64a]">
              {selectedFormat} Squad Cap:
            </span>
            {!isReadOnly ? (
              <div className="flex items-center space-x-1">
                {[15, 16, 17, 18, 19, 20].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => handleSetTargetSize(sz)}
                    className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      targetSize === sz
                        ? 'bg-[#e2b64a] text-black shadow-sm font-black'
                        : 'bg-[#10151c] text-[#8b97a3] hover:text-white border border-[#1e2733]'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            ) : (
              <span className="font-mono font-bold text-white text-sm">{targetSize}</span>
            )}
            <span className="text-[#8b97a3] font-mono text-xs">
              ({squadPlayers.length} / {targetSize} selected)
            </span>
          </div>

          {/* Action Buttons: Reset & Confirm */}
          {!isReadOnly && (
            <div className="flex items-center space-x-2.5">
              <button
                onClick={handleReset}
                className="text-xs text-[#8b97a3] hover:text-white px-3 py-1.5 rounded-xl bg-[#10151c] border border-[#1e2733] hover:border-[#8fb2d9] transition cursor-pointer flex items-center gap-1.5 uppercase tracking-wider font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              <button
                onClick={handleConfirmSquad}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 uppercase tracking-wider shadow-sm ${
                  formatConfig.isConfirmed
                    ? 'bg-[#3fca86]/20 text-[#3fca86] border border-[#3fca86]/40'
                    : 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black font-extrabold hover:brightness-110'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{formatConfig.isConfirmed ? 'Squad Confirmed' : 'Confirm Squad'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Balance Composition Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center text-xs">
          <div className="bg-[#10151c] p-2.5 rounded-xl border border-[#1e2733]">
            <span className="dugout-kicker text-[10px] text-[#8b97a3] block mb-0.5">Batters</span>
            <span className="text-white font-mono font-black text-base">{battersCount}</span>
          </div>
          <div className="bg-[#10151c] p-2.5 rounded-xl border border-[#1e2733]">
            <span className="dugout-kicker text-[10px] text-[#8b97a3] block mb-0.5">Wicketkeepers</span>
            <span
              className={`font-mono font-black text-base ${
                wkCount === 0 ? 'text-[#ff5470]' : 'text-[#3fca86]'
              }`}
            >
              {wkCount}
            </span>
          </div>
          <div className="bg-[#10151c] p-2.5 rounded-xl border border-[#1e2733]">
            <span className="dugout-kicker text-[10px] text-[#8b97a3] block mb-0.5">All-Rounders</span>
            <span className="text-white font-mono font-black text-base">{arCount}</span>
          </div>
          <div className="bg-[#10151c] p-2.5 rounded-xl border border-[#1e2733]">
            <span className="dugout-kicker text-[10px] text-[#8b97a3] block mb-0.5">Fast Bowlers</span>
            <span className="text-white font-mono font-black text-base">{paceCount}</span>
          </div>
          <div className="bg-[#10151c] p-2.5 rounded-xl border border-[#1e2733]">
            <span className="dugout-kicker text-[10px] text-[#8b97a3] block mb-0.5">Spin Bowlers</span>
            <span className="text-white font-mono font-black text-base">{spinCount}</span>
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-1">
            {warnings.map((w, idx) => (
              <div
                key={idx}
                className="text-xs text-amber-300 bg-amber-950/30 border border-amber-900/50 p-2 rounded flex items-center gap-2"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Format Squad Table in Dugout Style */}
      <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e2733] pb-3">
          <span className="dugout-kicker text-xs text-[#e2b64a] flex items-center gap-2">
            <Users className="w-4 h-4" />
            Selected {selectedFormat} Squad ({squadPlayers.length} Players)
          </span>
          <span className="text-[11px] text-[#8b97a3] font-mono">
            Cap: <strong className="text-white">{fullNationalPool.find((p) => p.id === formatConfig.captainId)?.shortName || 'None'}</strong> • WK:{' '}
            <strong className="text-white">{fullNationalPool.find((p) => p.id === formatConfig.wicketKeeperId)?.shortName || 'None'}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#10151c] text-[#8b97a3] font-mono text-[10px] uppercase border-b border-[#1e2733] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Player</th>
                <th className="py-2.5 px-2">Role</th>
                <th className="py-2.5 px-2">Style</th>
                <th className="py-2.5 px-2 text-center">Rating</th>
                <th className="py-2.5 px-2 text-center">Form</th>
                <th className="py-2.5 px-2 text-center">Fitness</th>
                <th className="py-2.5 px-2">Leadership</th>
                {!isReadOnly && <th className="py-2.5 px-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2733]">
              {squadPlayers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#8b97a3]">
                    No players in {selectedFormat} squad. Select from the national pool below.
                  </td>
                </tr>
              ) : (
                squadPlayers.map((player) => {
                  const role = getGranularPlayerRole(player);
                  const isCap = player.id === formatConfig.captainId;
                  const isVC = player.id === formatConfig.viceCaptainId;
                  const isWK = player.id === formatConfig.wicketKeeperId;

                  return (
                    <tr key={player.id} className="hover:bg-[#10151c] transition-colors">
                      <td className="py-2.5 px-3">
                        <div
                          onClick={() => onSelectPlayer(player)}
                          className="font-bold text-white hover:text-[#e2b64a] cursor-pointer flex items-center gap-2"
                        >
                          <span>{player.name}</span>
                          {player.isInjured && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#ff3d7f]/20 text-[#ff5470] border border-[#ff3d7f]/40 uppercase tracking-wider">
                              INJ
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-[#c3ccd6]">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10151c] border border-[#1e2733] uppercase">
                          {role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-[#8b97a3] text-[11px]">
                        <span className="text-white font-medium">{player.battingHand === 'LEFT_HAND' ? 'LHB' : 'RHB'}</span> •{' '}
                        <span>{player.bowlingStyle?.replace(/_/g, ' ') || 'None'}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-black text-white">
                        <span className="text-[#ffe9a8]">{Math.round((player.testRating + player.odiRating + player.t20Rating) / 3)}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold">
                        <span
                          className={`${
                            (player.currentForm || player.attributes?.currentForm || 75) >= 80
                              ? 'text-[#3fca86]'
                              : (player.currentForm || player.attributes?.currentForm || 75) >= 60
                              ? 'text-[#8fb2d9]'
                              : 'text-[#ff5470]'
                          }`}
                        >
                          {player.currentForm || player.attributes?.currentForm || 75}%
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold">
                        <span
                          className={`${
                            (player.fitness || 90) >= 85
                              ? 'text-[#3fca86]'
                              : (player.fitness || 90) >= 70
                              ? 'text-[#e2b64a]'
                              : 'text-[#ff5470]'
                          }`}
                        >
                          {player.fitness || 90}%
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center space-x-1.5">
                          {isCap && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#e2b64a] text-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                              <Crown className="w-3 h-3" /> C
                            </span>
                          )}
                          {isVC && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#8fb2d9]/20 text-[#8fb2d9] border border-[#8fb2d9]/40 uppercase tracking-wider font-mono">
                              VC
                            </span>
                          )}
                          {isWK && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#3fca86]/20 text-[#3fca86] border border-[#3fca86]/40 uppercase tracking-wider font-mono">
                              WK
                            </span>
                          )}
                        </div>
                      </td>
                      {!isReadOnly && (
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {!isCap && (
                              <button
                                onClick={() => handleAssignCaptain(player)}
                                title="Make Captain"
                                className="text-[10px] text-[#ffe9a8] hover:bg-[#e2b64a]/20 px-2 py-0.5 rounded border border-[#e2b64a]/30 cursor-pointer uppercase font-bold"
                              >
                                Make C
                              </button>
                            )}
                            {!isVC && !isCap && (
                              <button
                                onClick={() => handleAssignViceCaptain(player.id)}
                                title="Make Vice-Captain"
                                className="text-[10px] text-[#8fb2d9] hover:bg-[#8fb2d9]/20 px-2 py-0.5 rounded border border-[#8fb2d9]/30 cursor-pointer uppercase font-bold"
                              >
                                VC
                              </button>
                            )}
                            {!isWK && (player.isWicketKeeper || player.role === 'WICKETKEEPER_BATTER') && (
                              <button
                                onClick={() => handleAssignWicketKeeper(player.id)}
                                title="Assign Wicketkeeper"
                                className="text-[10px] text-[#3fca86] hover:bg-[#3fca86]/20 px-2 py-0.5 rounded border border-[#3fca86]/30 cursor-pointer uppercase font-bold"
                              >
                                WK
                              </button>
                            )}
                            <button
                              onClick={() => handleRemovePlayer(player)}
                              title="Drop from Squad"
                              className="text-[10px] text-[#ff5470] hover:bg-[#ff3d7f]/20 px-2 py-0.5 rounded border border-[#ff3d7f]/30 cursor-pointer uppercase font-bold"
                            >
                              Drop
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reserves Section in Dugout Style */}
      <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1e2733] pb-3">
          <span className="dugout-kicker text-xs text-[#8fb2d9] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#8fb2d9]" />
            Format Standby Reserves ({reservePlayers.length} Players)
          </span>
          <span className="text-[10px] text-[#8b97a3] font-mono uppercase tracking-wider">Available for quick call-up</span>
        </div>

        {reservePlayers.length === 0 ? (
          <p className="text-xs text-[#8b97a3] py-3">
            No standby reserves selected for {selectedFormat}. Add players as reserves from the pool below.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {reservePlayers.map((player) => (
              <div
                key={player.id}
                className="bg-[#10151c] border border-[#1e2733] hover:border-[#8fb2d9]/60 p-2.5 rounded-xl flex items-center justify-between text-xs transition"
              >
                <div>
                  <div
                    onClick={() => onSelectPlayer(player)}
                    className="font-bold text-white hover:text-[#8fb2d9] cursor-pointer truncate"
                  >
                    {player.name}
                  </div>
                  <span className="text-[10px] text-[#8b97a3] font-mono">
                    {getGranularPlayerRole(player).replace(/_/g, ' ')} • <strong className="text-white">{Math.round((player.testRating + player.odiRating + player.t20Rating) / 3)}</strong>
                  </span>
                </div>
                {!isReadOnly && (
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handlePromoteReserve(player.id)}
                      title="Promote to Squad"
                      className="text-[10px] text-[#3fca86] hover:bg-[#3fca86]/20 px-2 py-0.5 rounded border border-[#3fca86]/40 cursor-pointer font-bold uppercase"
                    >
                      Promote
                    </button>
                    <button
                      onClick={() => handleToggleReserve(player.id)}
                      title="Remove from Reserves"
                      className="text-[10px] text-[#8b97a3] hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* National Selection Pool with 9 Granular Filters in Dugout Style */}
      <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1e2733] pb-3">
          <span className="dugout-kicker text-xs text-[#e2b64a] flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#e2b64a]" />
            National Selection Pool ({filteredPool.length} Eligible Players Available)
          </span>

          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-[#8b97a3] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search player name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#10151c] border border-[#1e2733] pl-8 pr-3 py-1.5 rounded-lg text-xs text-white placeholder-[#556375] focus:outline-none focus:border-[#e2b64a]"
            />
          </div>
        </div>

        {/* 9 Filter Controls Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 text-[11px]">
          {/* 1. Role */}
          <div>
            <label className="dugout-kicker text-[9px] text-[#8b97a3] block mb-1">Role</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full bg-[#10151c] border border-[#1e2733] rounded-lg p-1.5 text-white focus:outline-none focus:border-[#e2b64a] cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="OPENING_BATTER">Opening</option>
              <option value="MIDDLE_ORDER_BATTER">Middle Order</option>
              <option value="WICKETKEEPER_BATTER">Wicketkeeper</option>
              <option value="ALL_ROUNDER">All-Rounder</option>
              <option value="FAST_BOWLER">Fast Bowler</option>
              <option value="SPIN_BOWLER">Spin Bowler</option>
            </select>
          </div>

          {/* 2. Batting Style */}
          <div>
            <label className="dugout-kicker text-[9px] text-[#8b97a3] block mb-1">Batting</label>
            <select
              value={filterBattingStyle}
              onChange={(e) => setFilterBattingStyle(e.target.value)}
              className="w-full bg-[#10151c] border border-[#1e2733] rounded-lg p-1.5 text-white focus:outline-none focus:border-[#e2b64a] cursor-pointer"
            >
              <option value="ALL">All Styles</option>
              <option value="RHB">Right Hand</option>
              <option value="LHB">Left Hand</option>
            </select>
          </div>

          {/* 3. Bowling Style */}
          <div>
            <label className="dugout-kicker text-[9px] text-[#8b97a3] block mb-1">Bowling</label>
            <select
              value={filterBowlingStyle}
              onChange={(e) => setFilterBowlingStyle(e.target.value)}
              className="w-full bg-[#10151c] border border-[#1e2733] rounded-lg p-1.5 text-white focus:outline-none focus:border-[#e2b64a] cursor-pointer"
            >
              <option value="ALL">All Bowling</option>
              <option value="FAST">Pace / Fast</option>
              <option value="SPIN">Spin / Slow</option>
            </select>
          </div>

          {/* 4. Age */}
          <div>
            <label className="dugout-kicker text-[9px] text-[#8b97a3] block mb-1">Age</label>
            <select
              value={filterAge}
              onChange={(e) => setFilterAge(e.target.value)}
              className="w-full bg-[#10151c] border border-[#1e2733] rounded-lg p-1.5 text-white focus:outline-none focus:border-[#e2b64a] cursor-pointer"
            >
              <option value="ALL">All Ages</option>
              <option value="U25">Under 25</option>
              <option value="25_32">25 - 32</option>
              <option value="O32">Over 32</option>
            </select>
          </div>

          {/* 5. Form */}
          <div>
            <label className="dugout-kicker text-[9px] text-[#8b97a3] block mb-1">Form</label>
            <select
              value={filterForm}
              onChange={(e) => setFilterForm(e.target.value)}
              className="w-full bg-[#10151c] border border-[#1e2733] rounded-lg p-1.5 text-white focus:outline-none focus:border-[#e2b64a] cursor-pointer"
            >
              <option value="ALL">All Form</option>
              <option value="HIGH">High (80+)</option>
              <option value="MED">Med (60-79)</option>
              <option value="LOW">Low (&lt;60)</option>
            </select>
          </div>

          {/* 6. Fitness */}
          <div>
            <label className="dugout-kicker text-[9px] text-[#8b97a3] block mb-1">Fitness</label>
            <select
              value={filterFitness}
              onChange={(e) => setFilterFitness(e.target.value)}
              className="w-full bg-[#10151c] border border-[#1e2733] rounded-lg p-1.5 text-white focus:outline-none focus:border-[#e2b64a] cursor-pointer"
            >
              <option value="ALL">All Fitness</option>
              <option value="HIGH">Fit (85%+)</option>
              <option value="MED">Fair (70-84%)</option>
              <option value="LOW">Tired (&lt;70%)</option>
            </select>
          </div>

          {/* 7. Experience */}
          <div>
            <label className="dugout-kicker text-[9px] text-[#8b97a3] block mb-1">Experience</label>
            <select
              value={filterExperience}
              onChange={(e) => setFilterExperience(e.target.value)}
              className="w-full bg-[#10151c] border border-[#1e2733] rounded-lg p-1.5 text-white focus:outline-none focus:border-[#e2b64a] cursor-pointer"
            >
              <option value="ALL">All Exp</option>
              <option value="DEBUT">Debut (0-5)</option>
              <option value="REGULAR">Regular (6-30)</option>
              <option value="VETERAN">Veteran (30+)</option>
            </select>
          </div>

          {/* 8. Availability */}
          <div>
            <label className="dugout-kicker text-[9px] text-[#8b97a3] block mb-1">Availability</label>
            <select
              value={filterAvailability}
              onChange={(e) => setFilterAvailability(e.target.value)}
              className="w-full bg-[#10151c] border border-[#1e2733] rounded-lg p-1.5 text-white focus:outline-none focus:border-[#e2b64a] cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="INJURED">Injured Only</option>
            </select>
          </div>

          {/* 9. Rating */}
          <div>
            <label className="dugout-kicker text-[9px] text-[#8b97a3] block mb-1">Rating</label>
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="w-full bg-[#10151c] border border-[#1e2733] rounded-lg p-1.5 text-white focus:outline-none focus:border-[#e2b64a] cursor-pointer"
            >
              <option value="ALL">All Ratings</option>
              <option value="85+">Elite (85+)</option>
              <option value="75_84">Good (75-84)</option>
              <option value="U75">Under 75</option>
            </select>
          </div>
        </div>

        {/* Pool Table */}
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#10151c] text-[#8b97a3] font-mono text-[10px] uppercase border-b border-[#1e2733] sticky top-0 tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Player</th>
                <th className="py-2.5 px-2">Role</th>
                <th className="py-2.5 px-2">Style</th>
                <th className="py-2.5 px-2 text-center">Age</th>
                <th className="py-2.5 px-2 text-center">Rating</th>
                <th className="py-2.5 px-2 text-center">Form</th>
                <th className="py-2.5 px-2 text-center">Fitness</th>
                {!isReadOnly && <th className="py-2.5 px-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2733]">
              {filteredPool.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#8b97a3]">
                    No eligible players match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredPool.map((player) => {
                  const role = getGranularPlayerRole(player);
                  return (
                    <tr key={player.id} className="hover:bg-[#10151c] transition-colors">
                      <td className="py-2.5 px-3">
                        <div
                          onClick={() => onSelectPlayer(player)}
                          className="font-bold text-white hover:text-[#e2b64a] cursor-pointer flex items-center gap-2"
                        >
                          <span>{player.name}</span>
                          {player.isInjured && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#ff3d7f]/20 text-[#ff5470] border border-[#ff3d7f]/40 uppercase tracking-wider">
                              INJ
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-[#c3ccd6]">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10151c] border border-[#1e2733] uppercase">
                          {role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-[#8b97a3] text-[11px]">
                        <span className="text-white font-medium">{player.battingHand === 'LEFT_HAND' ? 'LHB' : 'RHB'}</span> •{' '}
                        <span>{player.bowlingStyle?.replace(/_/g, ' ') || 'None'}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-[#c3ccd6]">
                        {player.age || 26}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-black text-white">
                        <span className="text-[#ffe9a8]">{Math.round((player.testRating + player.odiRating + player.t20Rating) / 3)}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold">
                        <span
                          className={`${
                            (player.currentForm || player.attributes?.currentForm || 75) >= 80
                              ? 'text-[#3fca86]'
                              : (player.currentForm || player.attributes?.currentForm || 75) >= 60
                              ? 'text-[#8fb2d9]'
                              : 'text-[#ff5470]'
                          }`}
                        >
                          {player.currentForm || player.attributes?.currentForm || 75}%
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold">
                        <span
                          className={`${
                            (player.fitness || 90) >= 85
                              ? 'text-[#3fca86]'
                              : (player.fitness || 90) >= 70
                              ? 'text-[#e2b64a]'
                              : 'text-[#ff5470]'
                          }`}
                        >
                          {player.fitness || 90}%
                        </span>
                      </td>
                      {!isReadOnly && (
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleAddPlayer(player.id)}
                              className="text-[10px] bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider cursor-pointer shadow-xs hover:brightness-110"
                            >
                              + Squad
                            </button>
                            <button
                              onClick={() => handleToggleReserve(player.id)}
                              className="text-[10px] bg-[#10151c] hover:bg-[#161d27] text-[#c3ccd6] border border-[#1e2733] hover:border-[#8fb2d9] px-2 py-1 rounded-md cursor-pointer uppercase font-semibold"
                            >
                              Reserve
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
          <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-[#e8edf2]">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2 uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-[#e2b64a]" />
                {confirmModal.title}
              </h3>
              <button
                onClick={() =>
                  setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} })
                }
                className="text-[#8b97a3] hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#c3ccd6] leading-relaxed">{confirmModal.message}</p>
            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#1e2733]">
              <button
                onClick={() =>
                  setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} })
                }
                className="text-xs text-[#8b97a3] hover:text-white px-3.5 py-2 rounded-xl bg-[#10151c] border border-[#1e2733] cursor-pointer uppercase font-bold"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="text-xs font-black text-white px-4 py-2 rounded-xl bg-[#ff3d7f] hover:bg-[#ff5470] cursor-pointer shadow-sm uppercase tracking-wider"
              >
                Confirm Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
