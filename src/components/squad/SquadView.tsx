import React, { useState } from 'react';
import {
  Users,
  Shield,
  Award,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  Filter,
  Activity,
  Heart,
  Search,
  Sparkles,
  Briefcase
} from 'lucide-react';
import { CareerSave, Player, PlayerRole, MatchFormat, FormatSquadConfig } from '../../types/cricket';
import { getPlayersByCountry } from '../../data/squads';

interface SquadViewProps {
  career: CareerSave;
  onUpdateSquadXI: (format: MatchFormat, xiIds: string[]) => void;
  onSetCaptain: (format: MatchFormat, playerId: string) => void;
  onSetViceCaptain: (format: MatchFormat, playerId: string) => void;
  onSetWicketKeeper: (format: MatchFormat, playerId: string) => void;
  onSelectPlayer: (player: Player) => void;
  onOpenTourSelection?: (tourId: string) => void;
}

export const SquadView: React.FC<SquadViewProps> = ({
  career,
  onUpdateSquadXI,
  onSetCaptain,
  onSetViceCaptain,
  onSetWicketKeeper,
  onSelectPlayer,
  onOpenTourSelection,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<MatchFormat>('TEST');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fullNationalPool = getPlayersByCountry(career.selectedTeamId);

  // Format config
  const formatConfig: FormatSquadConfig = career.formatSquads?.[selectedFormat] || {
    format: selectedFormat,
    squadPlayerIds: fullNationalPool.slice(0, 16).map((p) => p.id),
    playingXI: fullNationalPool.slice(0, 11).map((p) => p.id),
    battingOrder: fullNationalPool.slice(0, 11).map((p) => p.id),
    captainId: fullNationalPool[0]?.id || '',
    viceCaptainId: fullNationalPool[1]?.id || '',
    wicketKeeperId: fullNationalPool[2]?.id || '',
    bowlingRotation: [],
  };

  const currentXIIds = formatConfig.playingXI || [];

  // Playing XI list preserved in batting order
  const playingXI = currentXIIds
    .map((id) => fullNationalPool.find((p) => p.id === id))
    .filter((p): p is Player => p !== undefined);

  // Reserves
  const reserves = fullNationalPool.filter((p) => !currentXIIds.includes(p.id));

  // Balance Warnings
  const warnings: string[] = [];
  const wkInXI = playingXI.some(
    (p) => p.id === formatConfig.wicketKeeperId || p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER'
  );
  if (!wkInXI) {
    warnings.push('CRITICAL: No designated wicketkeeper selected in the Playing XI!');
  }

  const bowlersInXI = playingXI.filter((p) => p.role === 'BOWLER' || p.role === 'ALL_ROUNDER');
  if (bowlersInXI.length < 4) {
    warnings.push('WARNING: Insufficient bowling options (less than 4 bowlers/all-rounders in XI).');
  }

  if (playingXI.length < 11) {
    warnings.push(`INCOMPLETE: You have only selected ${playingXI.length}/11 players for your match lineup.`);
  }

  // Handlers for XI adjustment
  const handleTogglePlayerInXI = (player: Player) => {
    if (currentXIIds.includes(player.id)) {
      // Remove from XI
      const nextXI = currentXIIds.filter((id) => id !== player.id);
      onUpdateSquadXI(selectedFormat, nextXI);
    } else {
      // Add to XI (max 11)
      if (currentXIIds.length >= 11) {
        alert('Playing XI already has 11 players. Remove a player before adding a new one.');
        return;
      }
      const nextXI = [...currentXIIds, player.id];
      onUpdateSquadXI(selectedFormat, nextXI);
    }
  };

  const handleMoveBattingOrder = (index: number, direction: 'UP' | 'DOWN') => {
    const newXI = [...currentXIIds];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newXI.length) return;

    const temp = newXI[index];
    newXI[index] = newXI[targetIdx];
    newXI[targetIdx] = temp;

    onUpdateSquadXI(selectedFormat, newXI);
  };

  // Filtered pool list for the selector
  const filteredSquad = fullNationalPool.filter((p) => {
    if (roleFilter !== 'ALL' && p.role !== roleFilter) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const activeTour = career.tours?.find((t) => t.status === 'IN_PROGRESS' || t.status === 'UPCOMING') || career.tours?.[0];

  return (
    <div className="space-y-4 select-none animate-in fade-in duration-150">
      {/* Top Controls: Format Selection & Tour Announcement Link */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-emerald-950 text-emerald-400 font-bold border border-emerald-800 px-2 py-0.5 rounded font-mono uppercase">
              Format Squad Manager
            </span>
            <span className="text-xs text-slate-400">
              Select independent lineup, captain & wicketkeeper for each format
            </span>
          </div>
          <h2 className="text-xl font-black text-white mt-1">
            {career.selectedTeamId} National Team Selection & Batting Order
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {activeTour && onOpenTourSelection && (
            <button
              onClick={() => onOpenTourSelection(activeTour.id)}
              className="bg-[#182234] hover:bg-[#243247] text-amber-300 border border-amber-600/40 text-xs font-bold px-3 py-2 rounded transition cursor-pointer flex items-center space-x-1.5"
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-400" />
              <span>Announce Tour Squad</span>
            </button>
          )}

          {/* Format Tabs */}
          <div className="flex items-center space-x-1 bg-[#182234] p-1 rounded-lg border border-[#243247]">
            {(['TEST', 'ODI', 'T20I'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
                  selectedFormat === fmt
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Warnings & Notices */}
      {warnings.length > 0 && (
        <div className="space-y-1.5">
          {warnings.map((w, idx) => (
            <div
              key={idx}
              className="bg-amber-950/40 border border-amber-800/60 text-amber-200 px-3.5 py-2 rounded-lg text-xs flex items-center space-x-2"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Grid: Playing XI & Order (Left 5 cols) vs Player Pool (Right 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Active Match-Day Playing XI */}
        <div className="lg:col-span-6 bg-[#121824] border border-[#1f293d] rounded-lg p-4 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5 mb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>{selectedFormat} Playing XI ({playingXI.length}/11)</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  Batting order determines entry to the crease
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              {playingXI.map((player, index) => {
                const designatedCapId = formatConfig.captainId && playingXI.some((p) => p.id === formatConfig.captainId)
                  ? formatConfig.captainId
                  : playingXI[0]?.id;
                const designatedVCId = formatConfig.viceCaptainId && playingXI.some((p) => p.id === formatConfig.viceCaptainId)
                  ? formatConfig.viceCaptainId
                  : (playingXI[1]?.id || playingXI[0]?.id);
                const designatedWkId = formatConfig.wicketKeeperId && playingXI.some((p) => p.id === formatConfig.wicketKeeperId)
                  ? formatConfig.wicketKeeperId
                  : playingXI.find((p) => p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER')?.id;

                const isCap = player.id === designatedCapId;
                const isVC = player.id === designatedVCId && !isCap;
                const isWK = player.id === designatedWkId;
                const rating = selectedFormat === 'TEST' ? player.testRating : selectedFormat === 'ODI' ? player.odiRating : player.t20Rating;

                return (
                  <div
                    key={player.id}
                    className="bg-[#182234] border border-[#243247] hover:border-slate-500 rounded p-2 flex items-center justify-between transition group"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-[#121824] border border-[#243247] text-[10px] font-mono font-bold text-slate-400 flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => onSelectPlayer(player)}
                            className="text-xs font-bold text-white hover:text-emerald-400 text-left cursor-pointer"
                          >
                            {player.name}
                          </button>
                          {isCap && (
                            <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-800 font-bold px-1 rounded">
                              C
                            </span>
                          )}
                          {isVC && (
                            <span className="text-[9px] bg-slate-800 text-slate-300 border border-slate-700 font-bold px-1 rounded">
                              VC
                            </span>
                          )}
                          {isWK && (
                            <span className="text-[9px] bg-sky-950 text-sky-300 border border-sky-800 font-bold px-1 rounded">
                              WK
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {player.role.replace('_', ' ')} • {rating} RTG • Fatigue: {player.workloadFatigue || 10}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {/* Reorder Buttons */}
                      <button
                        disabled={index === 0}
                        onClick={() => handleMoveBattingOrder(index, 'UP')}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={index === playingXI.length - 1}
                        onClick={() => handleMoveBattingOrder(index, 'DOWN')}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Set C / VC / WK */}
                      <button
                        onClick={() => onSetCaptain(selectedFormat, player.id)}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                          isCap ? 'bg-amber-600 text-white' : 'bg-[#121824] text-slate-400 hover:text-white'
                        }`}
                        title="Make Format Captain"
                      >
                        C
                      </button>
                      <button
                        onClick={() => onSetViceCaptain(selectedFormat, player.id)}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                          isVC ? 'bg-slate-500 text-white' : 'bg-[#121824] text-slate-400 hover:text-white'
                        }`}
                        title="Make Format Vice-Captain"
                      >
                        VC
                      </button>
                      <button
                        onClick={() => onSetWicketKeeper(selectedFormat, player.id)}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                          isWK ? 'bg-sky-600 text-white' : 'bg-[#121824] text-slate-400 hover:text-white'
                        }`}
                        title="Make Designated Keeper"
                      >
                        WK
                      </button>

                      {/* Remove from XI */}
                      <button
                        onClick={() => handleTogglePlayerInXI(player)}
                        className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer ml-1"
                        title="Remove from XI"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: National Squad Reserves Pool */}
        <div className="lg:col-span-6 bg-[#121824] border border-[#1f293d] rounded-lg p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1f293d] pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Available Player Pool</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Click + to add to {selectedFormat} Playing XI
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search player..."
                className="bg-[#182234] border border-[#243247] rounded pl-8 pr-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-36"
              />
            </div>
          </div>

          {/* Role Filters */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1">
            {['ALL', 'BATTER', 'ALL_ROUNDER', 'WICKETKEEPER_BATTER', 'BOWLER'].map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                  roleFilter === role
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-[#182234] text-slate-400 hover:text-white'
                }`}
              >
                {role === 'WICKETKEEPER_BATTER' ? 'WK' : role.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Player Cards */}
          <div className="max-h-[500px] overflow-y-auto space-y-1.5 pr-1">
            {filteredSquad.map((player) => {
              const inXI = currentXIIds.includes(player.id);
              const rating = selectedFormat === 'TEST' ? player.testRating : selectedFormat === 'ODI' ? player.odiRating : player.t20Rating;

              return (
                <div
                  key={player.id}
                  className={`border rounded p-2 flex items-center justify-between transition ${
                    inXI
                      ? 'bg-[#182234]/50 border-emerald-900/50 opacity-60'
                      : 'bg-[#182234] border-[#243247] hover:border-slate-500'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => onSelectPlayer(player)}
                        className="text-xs font-bold text-white hover:text-emerald-400 text-left cursor-pointer"
                      >
                        {player.name}
                      </button>
                      <span className="text-[10px] bg-[#121824] text-slate-300 border border-[#243247] px-1 rounded font-mono">
                        {player.role.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                      Ratings: {player.testRating} Test / {player.odiRating} ODI / {player.t20Rating} T20 • Fatigue: {player.workloadFatigue || 10}%
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {rating}
                    </span>

                    <button
                      onClick={() => handleTogglePlayerInXI(player)}
                      className={`text-xs px-2 py-1 rounded font-bold transition cursor-pointer ${
                        inXI
                          ? 'bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      {inXI ? 'Remove' : '+ Add XI'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
