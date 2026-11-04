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
    <div className="space-y-4 select-none pb-8 text-slate-200">
      {/* Top Banner: Country Switcher & Format Tabs */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-[#151d29] border border-[#1e293b] flex items-center justify-center text-2xl">
            {viewedTeam?.flagEmoji || '🏏'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-white tracking-wide">
                {viewedTeam?.name} National Squad
              </h1>
              {isReadOnly ? (
                <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Read-Only AI Squad
                </span>
              ) : (
                <span className="text-[10px] bg-[#142646] text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-emerald-900/60 font-bold">
                  Managed Nation
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Tier 2: Format-specific national squad pool selection & leadership
            </p>
          </div>
        </div>

        {/* Format Tabs & Country Inspector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Format Selector */}
          <div className="flex bg-[#151d29] p-0.5 rounded border border-[#1e293b]">
            {(['TEST', 'ODI', 'T20I'] as MatchFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-3 py-1 text-xs font-bold rounded transition cursor-pointer ${
                  selectedFormat === fmt
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* Inspect other national squads (strictly read-only) */}
          <div className="flex items-center space-x-1.5 bg-[#151d29] border border-[#1e293b] px-2 py-1 rounded text-xs">
            <span className="text-slate-400 text-[11px]">Inspect:</span>
            <select
              value={viewedCountryId}
              onChange={(e) => setViewedCountryId(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value={career.selectedTeamId} className="bg-[#111827]">
                ★ {userTeam?.name} (Managed)
              </option>
              {INTERNATIONAL_TEAMS.filter((t) => t.id !== career.selectedTeamId).map((t) => (
                <option key={t.id} value={t.id} className="bg-[#111827]">
                  {t.name} (AI)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Squad Size & Composition Bar */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Size Selector */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-semibold text-slate-300">
              {selectedFormat} Squad Size:
            </span>
            {!isReadOnly ? (
              <div className="flex items-center space-x-1">
                {[15, 16, 17, 18, 19, 20].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => handleSetTargetSize(sz)}
                    className={`w-6 h-6 rounded text-xs font-mono font-bold transition cursor-pointer ${
                      targetSize === sz
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#151d29] text-slate-400 hover:text-white border border-[#1e293b]'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            ) : (
              <span className="font-mono font-bold text-white">{targetSize}</span>
            )}
            <span className="text-slate-500 font-mono">
              ({squadPlayers.length} / {targetSize} selected)
            </span>
          </div>

          {/* Action Buttons: Reset & Confirm */}
          {!isReadOnly && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-[#151d29] border border-[#1e293b] transition cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset</span>
              </button>
              <button
                onClick={handleConfirmSquad}
                className={`text-xs font-bold px-3 py-1 rounded transition cursor-pointer flex items-center gap-1.5 ${
                  formatConfig.isConfirmed
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-[#10b981] hover:bg-[#059669] text-[#0b0e14]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{formatConfig.isConfirmed ? 'Squad Confirmed' : 'Confirm Squad'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Balance Composition Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          <div className="bg-[#151d29] p-2 rounded border border-[#1e293b]">
            <span className="text-[10px] text-slate-400 block uppercase">Batters</span>
            <span className="text-white font-mono font-bold text-sm">{battersCount}</span>
          </div>
          <div className="bg-[#151d29] p-2 rounded border border-[#1e293b]">
            <span className="text-[10px] text-slate-400 block uppercase">Wicketkeepers</span>
            <span
              className={`font-mono font-bold text-sm ${
                wkCount === 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {wkCount}
            </span>
          </div>
          <div className="bg-[#151d29] p-2 rounded border border-[#1e293b]">
            <span className="text-[10px] text-slate-400 block uppercase">All-Rounders</span>
            <span className="text-white font-mono font-bold text-sm">{arCount}</span>
          </div>
          <div className="bg-[#151d29] p-2 rounded border border-[#1e293b]">
            <span className="text-[10px] text-slate-400 block uppercase">Fast Bowlers</span>
            <span className="text-white font-mono font-bold text-sm">{paceCount}</span>
          </div>
          <div className="bg-[#151d29] p-2 rounded border border-[#1e293b]">
            <span className="text-[10px] text-slate-400 block uppercase">Spin Bowlers</span>
            <span className="text-white font-mono font-bold text-sm">{spinCount}</span>
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

      {/* Selected Format Squad Table */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            Selected {selectedFormat} Squad ({squadPlayers.length} Players)
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Cap: {fullNationalPool.find((p) => p.id === formatConfig.captainId)?.shortName || 'None'} • WK:{' '}
            {fullNationalPool.find((p) => p.id === formatConfig.wicketKeeperId)?.shortName || 'None'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#151d29] text-slate-400 font-mono text-[10px] uppercase border-b border-[#1e293b]">
              <tr>
                <th className="py-2 px-2.5">Player</th>
                <th className="py-2 px-2">Role</th>
                <th className="py-2 px-2">Style</th>
                <th className="py-2 px-2 text-center">Rating</th>
                <th className="py-2 px-2 text-center">Form</th>
                <th className="py-2 px-2 text-center">Fitness</th>
                <th className="py-2 px-2">Leadership</th>
                {!isReadOnly && <th className="py-2 px-2 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/60">
              {squadPlayers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-slate-400">
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
                    <tr key={player.id} className="hover:bg-[#151d29] transition">
                      <td className="py-2 px-2.5">
                        <div
                          onClick={() => onSelectPlayer(player)}
                          className="font-semibold text-white hover:text-emerald-400 cursor-pointer flex items-center gap-1.5"
                        >
                          <span>{player.name}</span>
                          {player.isInjured && (
                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                              INJ
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-slate-300">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#151d29] border border-[#1e293b]">
                          {role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-slate-400 text-[11px]">
                        {player.battingHand === 'LEFT_HAND' ? 'LHB' : 'RHB'} •{' '}
                        {player.bowlingStyle?.replace(/_/g, ' ') || 'None'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-white">
                        {Math.round((player.testRating + player.odiRating + player.t20Rating) / 3)}
                      </td>
                      <td className="py-2 px-2 text-center font-mono">
                        <span
                          className={`${
                            (player.currentForm || player.attributes?.currentForm || 75) >= 80
                              ? 'text-emerald-400 font-bold'
                              : (player.currentForm || player.attributes?.currentForm || 75) >= 60
                              ? 'text-slate-300'
                              : 'text-rose-400'
                          }`}
                        >
                          {player.currentForm || player.attributes?.currentForm || 75}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center font-mono">
                        <span
                          className={`${
                            (player.fitness || 90) >= 85
                              ? 'text-emerald-400'
                              : (player.fitness || 90) >= 70
                              ? 'text-amber-400'
                              : 'text-rose-400 font-bold'
                          }`}
                        >
                          {player.fitness || 90}%
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center space-x-1">
                          {isCap && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-0.5">
                              <Crown className="w-3 h-3" /> C
                            </span>
                          )}
                          {isVC && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                              VC
                            </span>
                          )}
                          {isWK && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                              WK
                            </span>
                          )}
                        </div>
                      </td>
                      {!isReadOnly && (
                        <td className="py-2 px-2 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {!isCap && (
                              <button
                                onClick={() => handleAssignCaptain(player)}
                                title="Make Captain"
                                className="text-[10px] text-amber-300 hover:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/50 cursor-pointer"
                              >
                                Make C
                              </button>
                            )}
                            {!isVC && !isCap && (
                              <button
                                onClick={() => handleAssignViceCaptain(player.id)}
                                title="Make Vice-Captain"
                                className="text-[10px] text-sky-300 hover:bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-900/50 cursor-pointer"
                              >
                                VC
                              </button>
                            )}
                            {!isWK && (player.isWicketKeeper || player.role === 'WICKETKEEPER_BATTER') && (
                              <button
                                onClick={() => handleAssignWicketKeeper(player.id)}
                                title="Assign Wicketkeeper"
                                className="text-[10px] text-purple-300 hover:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-900/50 cursor-pointer"
                              >
                                WK
                              </button>
                            )}
                            <button
                              onClick={() => handleRemovePlayer(player)}
                              title="Drop from Squad"
                              className="text-[10px] text-rose-400 hover:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-900/50 cursor-pointer"
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

      {/* Reserves Section */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-3.5 space-y-2.5">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            Format Standby Reserves ({reservePlayers.length} Players)
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Available for quick call-up</span>
        </div>

        {reservePlayers.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">
            No standby reserves selected for {selectedFormat}. Add players as reserves from the pool below.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {reservePlayers.map((player) => (
              <div
                key={player.id}
                className="bg-[#151d29] border border-[#1e293b] p-2 rounded flex items-center justify-between text-xs"
              >
                <div>
                  <div
                    onClick={() => onSelectPlayer(player)}
                    className="font-medium text-white hover:text-emerald-400 cursor-pointer truncate"
                  >
                    {player.name}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {getGranularPlayerRole(player).replace(/_/g, ' ')} • {Math.round((player.testRating + player.odiRating + player.t20Rating) / 3)}
                  </span>
                </div>
                {!isReadOnly && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handlePromoteReserve(player.id)}
                      title="Promote to Squad"
                      className="text-[10px] text-emerald-400 hover:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-900/60 cursor-pointer"
                    >
                      Promote
                    </button>
                    <button
                      onClick={() => handleToggleReserve(player.id)}
                      title="Remove from Reserves"
                      className="text-[10px] text-slate-400 hover:text-white px-1 py-0.5 rounded cursor-pointer"
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

      {/* National Selection Pool with 9 Granular Filters */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-3.5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#1e293b] pb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            National Selection Pool ({filteredPool.length} Eligible Players Available)
          </span>

          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search player name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#151d29] border border-[#1e293b] pl-8 pr-3 py-1 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* 9 Filter Controls Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 text-[11px]">
          {/* 1. Role */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Role</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full bg-[#151d29] border border-[#1e293b] rounded p-1 text-white focus:outline-none cursor-pointer"
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
            <label className="text-[10px] text-slate-400 block mb-0.5">Batting</label>
            <select
              value={filterBattingStyle}
              onChange={(e) => setFilterBattingStyle(e.target.value)}
              className="w-full bg-[#151d29] border border-[#1e293b] rounded p-1 text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Styles</option>
              <option value="RHB">Right Hand</option>
              <option value="LHB">Left Hand</option>
            </select>
          </div>

          {/* 3. Bowling Style */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Bowling</label>
            <select
              value={filterBowlingStyle}
              onChange={(e) => setFilterBowlingStyle(e.target.value)}
              className="w-full bg-[#151d29] border border-[#1e293b] rounded p-1 text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Bowling</option>
              <option value="FAST">Pace / Fast</option>
              <option value="SPIN">Spin / Slow</option>
            </select>
          </div>

          {/* 4. Age */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Age</label>
            <select
              value={filterAge}
              onChange={(e) => setFilterAge(e.target.value)}
              className="w-full bg-[#151d29] border border-[#1e293b] rounded p-1 text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Ages</option>
              <option value="U25">Under 25</option>
              <option value="25_32">25 - 32</option>
              <option value="O32">Over 32</option>
            </select>
          </div>

          {/* 5. Form */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Form</label>
            <select
              value={filterForm}
              onChange={(e) => setFilterForm(e.target.value)}
              className="w-full bg-[#151d29] border border-[#1e293b] rounded p-1 text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Form</option>
              <option value="HIGH">High (80+)</option>
              <option value="MED">Med (60-79)</option>
              <option value="LOW">Low (&lt;60)</option>
            </select>
          </div>

          {/* 6. Fitness */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Fitness</label>
            <select
              value={filterFitness}
              onChange={(e) => setFilterFitness(e.target.value)}
              className="w-full bg-[#151d29] border border-[#1e293b] rounded p-1 text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Fitness</option>
              <option value="HIGH">Fit (85%+)</option>
              <option value="MED">Fair (70-84%)</option>
              <option value="LOW">Tired (&lt;70%)</option>
            </select>
          </div>

          {/* 7. Experience */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Experience</label>
            <select
              value={filterExperience}
              onChange={(e) => setFilterExperience(e.target.value)}
              className="w-full bg-[#151d29] border border-[#1e293b] rounded p-1 text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Exp</option>
              <option value="DEBUT">Debut (0-5)</option>
              <option value="REGULAR">Regular (6-30)</option>
              <option value="VETERAN">Veteran (30+)</option>
            </select>
          </div>

          {/* 8. Availability */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Availability</label>
            <select
              value={filterAvailability}
              onChange={(e) => setFilterAvailability(e.target.value)}
              className="w-full bg-[#151d29] border border-[#1e293b] rounded p-1 text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="INJURED">Injured Only</option>
            </select>
          </div>

          {/* 9. Rating */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Rating</label>
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="w-full bg-[#151d29] border border-[#1e293b] rounded p-1 text-white focus:outline-none cursor-pointer"
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
            <thead className="bg-[#151d29] text-slate-400 font-mono text-[10px] uppercase border-b border-[#1e293b] sticky top-0">
              <tr>
                <th className="py-2 px-2.5">Player</th>
                <th className="py-2 px-2">Role</th>
                <th className="py-2 px-2">Style</th>
                <th className="py-2 px-2 text-center">Age</th>
                <th className="py-2 px-2 text-center">Rating</th>
                <th className="py-2 px-2 text-center">Form</th>
                <th className="py-2 px-2 text-center">Fitness</th>
                {!isReadOnly && <th className="py-2 px-2 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/60">
              {filteredPool.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-slate-400">
                    No eligible players match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredPool.map((player) => {
                  const role = getGranularPlayerRole(player);
                  return (
                    <tr key={player.id} className="hover:bg-[#151d29] transition">
                      <td className="py-2 px-2.5">
                        <div
                          onClick={() => onSelectPlayer(player)}
                          className="font-medium text-white hover:text-emerald-400 cursor-pointer flex items-center gap-1.5"
                        >
                          <span>{player.name}</span>
                          {player.isInjured && (
                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                              INJ
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-slate-300">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#151d29] border border-[#1e293b]">
                          {role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-slate-400 text-[11px]">
                        {player.battingHand === 'LEFT_HAND' ? 'LHB' : 'RHB'} •{' '}
                        {player.bowlingStyle?.replace(/_/g, ' ') || 'None'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-300">
                        {player.age || 26}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-white">
                        {Math.round((player.testRating + player.odiRating + player.t20Rating) / 3)}
                      </td>
                      <td className="py-2 px-2 text-center font-mono">
                        <span
                          className={`${
                            (player.currentForm || player.attributes?.currentForm || 75) >= 80
                              ? 'text-emerald-400 font-bold'
                              : (player.currentForm || player.attributes?.currentForm || 75) >= 60
                              ? 'text-slate-300'
                              : 'text-rose-400'
                          }`}
                        >
                          {player.currentForm || player.attributes?.currentForm || 75}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center font-mono">
                        <span
                          className={`${
                            (player.fitness || 90) >= 85
                              ? 'text-emerald-400'
                              : (player.fitness || 90) >= 70
                              ? 'text-amber-400'
                              : 'text-rose-400 font-bold'
                          }`}
                        >
                          {player.fitness || 90}%
                        </span>
                      </td>
                      {!isReadOnly && (
                        <td className="py-2 px-2 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleAddPlayer(player.id)}
                              className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-0.5 rounded cursor-pointer"
                            >
                              + Squad
                            </button>
                            <button
                              onClick={() => handleToggleReserve(player.id)}
                              className="text-[10px] bg-[#151d29] hover:bg-[#1f2c42] text-slate-300 border border-[#1e293b] px-1.5 py-0.5 rounded cursor-pointer"
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                {confirmModal.title}
              </h3>
              <button
                onClick={() =>
                  setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} })
                }
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{confirmModal.message}</p>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#1e293b]">
              <button
                onClick={() =>
                  setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} })
                }
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded bg-[#151d29] border border-[#1e293b] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="text-xs font-bold text-white px-3.5 py-1.5 rounded bg-rose-600 hover:bg-rose-500 cursor-pointer shadow-sm"
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
