import React, { useState } from 'react';
import {
  Users,
  Shield,
  Trophy,
  Award,
  Activity,
  Heart,
  ArrowRight,
  Briefcase,
  UserCheck,
  Zap,
  ChevronRight
} from 'lucide-react';
import { CareerSave, Player, MatchFormat, FormatSquadConfig } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { getPlayersByCountry } from '../../data/squads';

interface MyTeamViewProps {
  career: CareerSave;
  onNavigateToSquad: (format?: MatchFormat) => void;
  onSelectPlayer: (player: Player) => void;
  onUpdateFormatSquad?: (format: MatchFormat, partialConfig: Partial<FormatSquadConfig>) => void;
  onOpenTourSelection?: (tourId: string) => void;
}

export const MyTeamView: React.FC<MyTeamViewProps> = ({
  career,
  onNavigateToSquad,
  onSelectPlayer,
  onUpdateFormatSquad,
  onOpenTourSelection,
}) => {
  const [activeFormat, setActiveFormat] = useState<MatchFormat>('TEST');
  const team = INTERNATIONAL_TEAMS.find((t) => t.id === career.selectedTeamId);
  const nationalPool = getPlayersByCountry(career.selectedTeamId);

  // Active format squad config
  const formatConfig = career.formatSquads?.[activeFormat] || {
    format: activeFormat,
    squadPlayerIds: nationalPool.slice(0, 16).map((p) => p.id),
    playingXI: nationalPool.slice(0, 11).map((p) => p.id),
    battingOrder: nationalPool.slice(0, 11).map((p) => p.id),
    captainId: nationalPool[0]?.id || '',
    viceCaptainId: nationalPool[1]?.id || '',
    wicketKeeperId: nationalPool[2]?.id || '',
    bowlingRotation: [],
  };

  const captain = nationalPool.find((p) => p.id === formatConfig.captainId) || nationalPool[0];
  const viceCaptain = nationalPool.find((p) => p.id === formatConfig.viceCaptainId) || nationalPool[1];
  const wicketKeeper = nationalPool.find((p) => p.id === formatConfig.wicketKeeperId) || nationalPool[2];

  const playingXI = formatConfig.playingXI
    .map((id) => nationalPool.find((p) => p.id === id))
    .filter((p): p is Player => p !== undefined);

  const squadReserves = formatConfig.squadPlayerIds
    .filter((id) => !formatConfig.playingXI.includes(id))
    .map((id) => nationalPool.find((p) => p.id === id))
    .filter((p): p is Player => p !== undefined);

  const activeTour = career.tours?.find((t) => t.status === 'IN_PROGRESS' || t.status === 'UPCOMING') || career.tours?.[0];

  return (
    <div className="space-y-5 select-none animate-in fade-in duration-150">
      {/* Unified National Head Coach & Management Header */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1f293d] pb-4 mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-lg bg-[#182234] border border-[#243247] flex items-center justify-center text-4xl shadow-md">
              {team?.flagEmoji}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black text-white">{team?.name} National Team</h1>
                <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono px-2 py-0.5 rounded font-bold">
                  {team?.code}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Head Coach: <span className="text-white font-bold">{career.manager.name}</span> • Unified Leader Across All Formats
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeTour && onOpenTourSelection && (
              <button
                onClick={() => onOpenTourSelection(activeTour.id)}
                className="bg-[#182234] hover:bg-[#243247] text-slate-200 border border-[#243247] text-xs font-bold px-3 py-2 rounded transition cursor-pointer flex items-center space-x-1.5"
              >
                <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                <span>Tour Squad Selection</span>
              </button>
            )}

            <button
              onClick={() => onNavigateToSquad(activeFormat)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded shadow transition cursor-pointer flex items-center space-x-1.5"
            >
              <span>Configure Playing XI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Support Staff Directory */}
        <div className="bg-[#0e141f] border border-[#1f293d] p-3 rounded-lg">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
            National Coaching & Support Staff (Shared Across Formats)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
            <div className="bg-[#182234] p-2 rounded border border-[#243247]">
              <span className="text-[10px] text-slate-400 block font-medium">Test Assistant</span>
              <span className="text-white font-bold truncate block">{career.supportStaff?.testAssistantCoach || 'Asst Coach'}</span>
            </div>
            <div className="bg-[#182234] p-2 rounded border border-[#243247]">
              <span className="text-[10px] text-slate-400 block font-medium">Batting Coach</span>
              <span className="text-white font-bold truncate block">{career.supportStaff?.battingCoach || 'Batting Coach'}</span>
            </div>
            <div className="bg-[#182234] p-2 rounded border border-[#243247]">
              <span className="text-[10px] text-slate-400 block font-medium">Pace Bowling</span>
              <span className="text-white font-bold truncate block">{career.supportStaff?.bowlingCoach || 'Bowling Coach'}</span>
            </div>
            <div className="bg-[#182234] p-2 rounded border border-[#243247]">
              <span className="text-[10px] text-slate-400 block font-medium">Spin Bowling</span>
              <span className="text-white font-bold truncate block">{career.supportStaff?.spinCoach || 'Spin Consultant'}</span>
            </div>
            <div className="bg-[#182234] p-2 rounded border border-[#243247]">
              <span className="text-[10px] text-slate-400 block font-medium">Fielding Coach</span>
              <span className="text-white font-bold truncate block">{career.supportStaff?.fieldingCoach || 'Fielding Coach'}</span>
            </div>
            <div className="bg-[#182234] p-2 rounded border border-[#243247]">
              <span className="text-[10px] text-slate-400 block font-medium">Fitness & S&C</span>
              <span className="text-white font-bold truncate block">{career.supportStaff?.fitnessCoach || 'Physiotherapist'}</span>
            </div>
            <div className="bg-[#182234] p-2 rounded border border-[#243247]">
              <span className="text-[10px] text-slate-400 block font-medium">T20 Specialist</span>
              <span className="text-white font-bold truncate block">{career.supportStaff?.t20Consultant || 'T20 Consultant'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Format Team Tabs */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
          <div className="flex items-center space-x-2">
            {(['TEST', 'ODI', 'T20I'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setActiveFormat(fmt)}
                className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                  activeFormat === fmt
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-[#182234] text-slate-400 hover:text-white border border-[#243247]'
                }`}
              >
                {fmt === 'TEST' ? '🔴 Test Team' : fmt === 'ODI' ? '⚪ ODI Team' : '🔵 T20I Team'}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">
            Format Squad: {formatConfig.squadPlayerIds.length} players • Match XI: {playingXI.length}/11
          </span>
        </div>

        {/* Format Leadership Trio */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Format Captain */}
          <div
            onClick={() => captain && onSelectPlayer(captain)}
            className="bg-[#182234] border border-[#243247] hover:border-amber-500/80 p-4 rounded-lg cursor-pointer transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                {activeFormat} Captain
              </span>
              <span className="text-[10px] bg-amber-950 text-amber-300 font-bold border border-amber-800 px-1.5 py-0.2 rounded font-mono">
                LEADER
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">{captain?.name}</h3>
            <span className="text-xs text-slate-400 block mt-0.5 font-mono">
              Rating: {activeFormat === 'TEST' ? captain?.testRating : activeFormat === 'ODI' ? captain?.odiRating : captain?.t20Rating} • Form: {captain?.attributes.currentForm}%
            </span>
          </div>

          {/* Format Vice Captain */}
          <div
            onClick={() => viceCaptain && onSelectPlayer(viceCaptain)}
            className="bg-[#182234] border border-[#243247] hover:border-slate-400 p-4 rounded-lg cursor-pointer transition"
          >
            <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider block">
              {activeFormat} Vice-Captain
            </span>
            <h3 className="text-base font-bold text-white mt-1">{viceCaptain?.name}</h3>
            <span className="text-xs text-slate-400 block mt-0.5 font-mono">
              Rating: {activeFormat === 'TEST' ? viceCaptain?.testRating : activeFormat === 'ODI' ? viceCaptain?.odiRating : viceCaptain?.t20Rating} • Form: {viceCaptain?.attributes.currentForm}%
            </span>
          </div>

          {/* Format Wicketkeeper */}
          <div
            onClick={() => wicketKeeper && onSelectPlayer(wicketKeeper)}
            className="bg-[#182234] border border-[#243247] hover:border-emerald-500/80 p-4 rounded-lg cursor-pointer transition"
          >
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
              {activeFormat} Designated Wicketkeeper
            </span>
            <h3 className="text-base font-bold text-white mt-1">{wicketKeeper?.name}</h3>
            <span className="text-xs text-slate-400 block mt-0.5 font-mono">
              Catches: {wicketKeeper?.stats[activeFormat]?.catches || 0} • Stumpings: {wicketKeeper?.stats[activeFormat]?.stumpings || 0}
            </span>
          </div>
        </div>

        {/* Current Playing XI Lineup for Active Format */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>{activeFormat} Match-Day Playing XI (Batting Order)</span>
            </h3>
            <button
              onClick={() => onNavigateToSquad(activeFormat)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              Modify Lineup & Orders &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {playingXI.map((player, idx) => {
              const rating = activeFormat === 'TEST' ? player.testRating : activeFormat === 'ODI' ? player.odiRating : player.t20Rating;
              const isCap = player.id === formatConfig.captainId;
              const isVC = player.id === formatConfig.viceCaptainId;
              const isWK = player.id === formatConfig.wicketKeeperId || player.isWicketKeeper;

              return (
                <div
                  key={player.id}
                  onClick={() => onSelectPlayer(player)}
                  className="bg-[#182234] border border-[#243247] hover:border-slate-500 p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-5 h-5 rounded-full bg-[#121824] border border-[#243247] text-[11px] font-mono font-bold text-slate-300 flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm font-bold text-white">{player.name}</span>
                        {isCap && (
                          <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 font-bold px-1 rounded">
                            C
                          </span>
                        )}
                        {isVC && (
                          <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-bold px-1 rounded">
                            VC
                          </span>
                        )}
                        {isWK && (
                          <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 font-bold px-1 rounded">
                            WK
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 block font-mono">
                        {player.role.replace('_', ' ')} • Rating: {rating}
                      </span>
                    </div>
                  </div>

                  {/* Fatigue indicator */}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Workload</span>
                    <div className="flex items-center space-x-1">
                      <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${player.workloadFatigue > 60 ? 'bg-rose-500' : player.workloadFatigue > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, player.workloadFatigue || 10)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{player.workloadFatigue || 10}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Format Squad Reserves */}
        {squadReserves.length > 0 && (
          <div className="pt-3 border-t border-[#1f293d]">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              {activeFormat} Touring Squad Reserves ({squadReserves.length} players)
            </h4>
            <div className="flex flex-wrap gap-2">
              {squadReserves.map((player) => (
                <div
                  key={player.id}
                  onClick={() => onSelectPlayer(player)}
                  className="bg-[#182234] hover:bg-[#202d42] border border-[#243247] px-3 py-1.5 rounded-lg text-xs cursor-pointer flex items-center space-x-2"
                >
                  <span className="font-bold text-slate-200">{player.name}</span>
                  <span className="text-slate-400 font-mono text-[11px]">{player.role.slice(0, 3)}</span>
                  <span className="text-emerald-400 font-mono font-bold text-[11px]">
                    {activeFormat === 'TEST' ? player.testRating : activeFormat === 'ODI' ? player.odiRating : player.t20Rating}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
