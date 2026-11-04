import React, { useState } from 'react';
import {
  UserCheck,
  Shield,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Crown,
  Lock,
  Briefcase,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  CareerSave,
  Player,
  MatchFormat,
  FormatSquadConfig,
} from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { getEffectivePlayersByCountry } from '../../data/squads';
import { getGranularPlayerRole } from '../../store/careerStore';

interface TeamSelectionViewProps {
  career: CareerSave;
  onUpdateSquadXI: (format: MatchFormat, xiIds: string[]) => void;
  onSetCaptain?: (format: MatchFormat, playerId: string) => void;
  onSetViceCaptain?: (format: MatchFormat, playerId: string) => void;
  onSetWicketKeeper?: (format: MatchFormat, playerId: string) => void;
  onSelectPlayer: (player: Player) => void;
  onOpenTourSelection?: (tourId: string) => void;
  onNavigateToMatchPreparation?: () => void;
}

export const TeamSelectionView: React.FC<TeamSelectionViewProps> = ({
  career,
  onUpdateSquadXI,
  onSetCaptain,
  onSetViceCaptain,
  onSetWicketKeeper,
  onSelectPlayer,
  onOpenTourSelection,
  onNavigateToMatchPreparation,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<MatchFormat>('TEST');
  const team = INTERNATIONAL_TEAMS.find((t) => t.id === career.selectedTeamId);
  const nationalPool = getEffectivePlayersByCountry(career.selectedTeamId, career, true);

  const formatConfig: FormatSquadConfig =
    career.formatSquads?.[selectedFormat] || {
      format: selectedFormat,
      targetSquadSize: 18,
      squadPlayerIds: nationalPool.slice(0, 18).map((p) => p.id),
      playingXI: nationalPool.slice(0, 11).map((p) => p.id),
      battingOrder: nationalPool.slice(0, 11).map((p) => p.id),
      captainId: nationalPool[0]?.id || '',
      viceCaptainId: nationalPool[1]?.id || '',
      wicketKeeperId: nationalPool[2]?.id || '',
      reservePlayerIds: [],
      wicketKeeperOptions: [],
      bowlingRotation: [],
      isConfirmed: true,
    };

  const currentXIIds = formatConfig.playingXI || [];
  const squadIds = formatConfig.squadPlayerIds || [];

  // Playing XI in designated batting order
  const playingXI = currentXIIds
    .map((id) => nationalPool.find((p) => p.id === id))
    .filter((p): p is Player => p !== undefined);

  // Available squad players not currently in the Playing XI
  const benchPlayers = squadIds
    .filter((id) => !currentXIIds.includes(id))
    .map((id) => nationalPool.find((p) => p.id === id))
    .filter((p): p is Player => p !== undefined);

  // Reorder Batting Lineup
  const handleMoveOrder = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentXIIds.length) return;

    const newXI = [...currentXIIds];
    const temp = newXI[index];
    newXI[index] = newXI[targetIdx];
    newXI[targetIdx] = temp;

    onUpdateSquadXI(selectedFormat, newXI);
  };

  // Swap Player from Bench into XI
  const handleSwapWithBench = (xiPlayerId: string, benchPlayerId: string) => {
    const newXI = currentXIIds.map((id) => (id === xiPlayerId ? benchPlayerId : id));
    onUpdateSquadXI(selectedFormat, newXI);
  };

  // Balance Warnings
  const warnings: string[] = [];
  const wkInXI = playingXI.some(
    (p) =>
      p.id === formatConfig.wicketKeeperId ||
      p.isWicketKeeper ||
      p.role === 'WICKETKEEPER_BATTER'
  );
  if (!wkInXI) {
    warnings.push('CRITICAL: No designated wicketkeeper selected in the Playing XI!');
  }
  const bowlingOptions = playingXI.filter(
    (p) => p.role === 'BOWLER' || p.role === 'ALL_ROUNDER'
  );
  if (bowlingOptions.length < 5) {
    warnings.push(
      `WARNING: Only ${bowlingOptions.length} bowling options in XI (at least 5 recommended for full overs).`
    );
  }
  if (playingXI.length !== 11) {
    warnings.push(`INCOMPLETE: Exactly 11 players required for match day (${playingXI.length}/11 selected).`);
  }

  // Active tour requiring touring party
  const activeTour = career.tours?.find(
    (t) =>
      (t.hostTeamId === career.selectedTeamId || t.visitingTeamId === career.selectedTeamId) &&
      t.status !== 'COMPLETED'
  );

  return (
    <div className="space-y-4 select-none pb-8 text-slate-200">
      {/* Top Banner: Format Tabs & Tour Squad Link */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-[#151d29] border border-[#1e293b] flex items-center justify-center text-2xl">
            {team?.flagEmoji || '🏏'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-white tracking-wide">
                Match Playing XI &amp; Batting Order
              </h1>
              <span className="text-[10px] bg-[#142646] text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-emerald-900/60 font-bold">
                Tier 3 Selection
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Configure designated 11 players, batting order 1–11, wicketkeeper and bowling attack
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Format Tabs */}
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
                {fmt} Lineup
              </button>
            ))}
          </div>

          {activeTour && onOpenTourSelection && (
            <button
              onClick={() => onOpenTourSelection(activeTour.id)}
              className="bg-[#151d29] hover:bg-[#1f2c42] text-amber-300 border border-amber-900/50 text-xs font-semibold px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1.5"
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-400" />
              <span>Tour Squad</span>
            </button>
          )}
        </div>
      </div>

      {/* Warnings Bar */}
      {warnings.length > 0 && (
        <div className="space-y-1">
          {warnings.map((w, idx) => (
            <div
              key={idx}
              className="text-xs text-amber-300 bg-amber-950/30 border border-amber-900/50 p-2.5 rounded flex items-center gap-2"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Grid: Playing XI (Order 1–11) + Squad Bench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Playing XI Column (7 cols) */}
        <div className="lg:col-span-7 bg-[#111827] border border-[#1e293b] rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              {selectedFormat} Playing XI ({playingXI.length}/11)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Use arrows to adjust batting positions
            </span>
          </div>

          <div className="space-y-1.5">
            {playingXI.map((player, idx) => {
              const role = getGranularPlayerRole(player);
              const isCap = player.id === formatConfig.captainId;
              const isVC = player.id === formatConfig.viceCaptainId;
              const isWK = player.id === formatConfig.wicketKeeperId;

              return (
                <div
                  key={player.id}
                  className="bg-[#151d29] border border-[#1e293b] p-2 rounded flex items-center justify-between text-xs hover:border-slate-600 transition"
                >
                  <div className="flex items-center space-x-2.5">
                    {/* Batting Position Badge */}
                    <span className="w-5 h-5 rounded bg-[#10243d] text-emerald-400 font-mono font-bold text-[11px] flex items-center justify-center border border-emerald-900/50">
                      {idx + 1}
                    </span>

                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span
                          onClick={() => onSelectPlayer(player)}
                          className="font-bold text-white hover:text-emerald-400 cursor-pointer"
                        >
                          {player.name}
                        </span>
                        {isCap && (
                          <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                            C
                          </span>
                        )}
                        {isVC && (
                          <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800">
                            VC
                          </span>
                        )}
                        {isWK && (
                          <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                            WK
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {role.replace(/_/g, ' ')} • {player.battingHand === 'LEFT_HAND' ? 'LHB' : 'RHB'} •{' '}
                        {player.bowlingStyle?.replace(/_/g, ' ') || 'None'}
                      </div>
                    </div>
                  </div>

                  {/* Rating / Form / Reorder Controls */}
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-mono font-bold text-xs">
                      {Math.round((player.testRating + player.odiRating + player.t20Rating) / 3)}
                    </span>

                    <div className="flex items-center space-x-0.5">
                      <button
                        onClick={() => handleMoveOrder(idx, 'UP')}
                        disabled={idx === 0}
                        aria-label={`Move ${player.name} up`}
                        className={`p-1 rounded text-slate-400 hover:text-white transition cursor-pointer ${
                          idx === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#1e293b]'
                        }`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveOrder(idx, 'DOWN')}
                        disabled={idx === playingXI.length - 1}
                        aria-label={`Move ${player.name} down`}
                        className={`p-1 rounded text-slate-400 hover:text-white transition cursor-pointer ${
                          idx === playingXI.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#1e293b]'
                        }`}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Available Squad Bench Column (5 cols) */}
        <div className="lg:col-span-5 bg-[#111827] border border-[#1e293b] rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              Squad Reserves / Bench ({benchPlayers.length} Players)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Available to swap</span>
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {benchPlayers.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                All selected format squad players are in the Playing XI.
              </p>
            ) : (
              benchPlayers.map((player) => {
                const role = getGranularPlayerRole(player);
                return (
                  <div
                    key={player.id}
                    className="bg-[#151d29] border border-[#1e293b] p-2 rounded flex items-center justify-between text-xs"
                  >
                    <div>
                      <div
                        onClick={() => onSelectPlayer(player)}
                        className="font-medium text-white hover:text-emerald-400 cursor-pointer"
                      >
                        {player.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {role.replace(/_/g, ' ')} • {Math.round((player.testRating + player.odiRating + player.t20Rating) / 3)} OVR
                      </div>
                    </div>

                    <div className="text-right">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleSwapWithBench(e.target.value, player.id);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                        className="bg-[#111827] border border-[#1e293b] text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer focus:outline-none"
                      >
                        <option value="" disabled>
                          Swap into XI...
                        </option>
                        {playingXI.map((p, pIdx) => (
                          <option key={p.id} value={p.id} className="text-slate-200">
                            #{pIdx + 1} {p.shortName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
