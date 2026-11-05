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
  ChevronRight,
  Crown,
} from 'lucide-react';
import { CareerSave, Player, MatchFormat, FormatSquadConfig } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { getCombinedFormatStats, getEffectivePlayersByCountry } from '../../data/squads';
import { CountryFlag } from '../common/CountryFlag';
import { PlayerAvatar } from '../common/PlayerAvatar';

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
  const nationalPool = getEffectivePlayersByCountry(career.selectedTeamId, career, true);

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
    <div className="space-y-5 select-none pb-8 text-[#e8edf2]">
      {/* Unified National Head Coach & Management Header */}
      <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e2733] pb-4 mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-[#10151c] border border-[#1e2733] flex items-center justify-center text-4xl shadow-md">
              <CountryFlag countryCode={team?.code || ''} size="lg" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="dugout-kicker text-[11px] text-[#e2b64a]">National Headquarters</span>
                <span className="text-xs bg-[#10151c] text-[#8fb2d9] border border-[#1e2733] font-mono px-2 py-0.5 rounded-full font-bold">
                  {team?.code}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mt-0.5">
                {team?.name} National Team
              </h1>
              <p className="text-xs text-[#8b97a3] mt-1">
                Head Coach: <strong className="text-white">{career.manager.name}</strong> • Unified Supreme Selector Across All Formats
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeTour && onOpenTourSelection && (
              <button
                onClick={() => onOpenTourSelection(activeTour.id)}
                className="bg-[#10151c] hover:bg-[#161d27] text-[#c3ccd6] border border-[#1e2733] hover:border-[#e2b64a] text-xs font-bold px-3.5 py-2.5 rounded-xl transition cursor-pointer flex items-center space-x-2 uppercase tracking-wider"
              >
                <Briefcase className="w-3.5 h-3.5 text-[#e2b64a]" />
                <span>Tour Squad Selection</span>
              </button>
            )}

            <button
              onClick={() => onNavigateToSquad(activeFormat)}
              className="btn-gold flex items-center space-x-2 text-xs py-2.5 px-4"
            >
              <span>Configure Playing XI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Support Staff Directory */}
        <div className="bg-[#10151c] border border-[#1e2733] p-4 rounded-xl">
          <span className="dugout-kicker text-[10px] text-[#8b97a3] block mb-2.5">
            National Coaching &amp; Support Staff (Shared Performance Staff)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
            <div className="bg-[#070a0e] p-2.5 rounded-lg border border-[#1e2733]">
              <span className="dugout-kicker text-[9px] text-[#8b97a3] block mb-0.5">Test Assistant</span>
              <span className="text-white font-bold truncate block">{career.supportStaff?.testAssistantCoach || 'Asst Coach'}</span>
            </div>
            <div className="bg-[#070a0e] p-2.5 rounded-lg border border-[#1e2733]">
              <span className="dugout-kicker text-[9px] text-[#8b97a3] block mb-0.5">Batting Coach</span>
              <span className="text-white font-bold truncate block">{career.supportStaff?.battingCoach || 'Batting Coach'}</span>
            </div>
            <div className="bg-[#070a0e] p-2.5 rounded-lg border border-[#1e2733]">
              <span className="dugout-kicker text-[9px] text-[#8b97a3] block mb-0.5">Pace Bowling</span>
              <span className="text-white font-bold truncate block">{career.supportStaff?.bowlingCoach || 'Bowling Coach'}</span>
            </div>
            <div className="bg-[#070a0e] p-2.5 rounded-lg border border-[#1e2733]">
              <span className="dugout-kicker text-[9px] text-[#8b97a3] block mb-0.5">Spin Bowling</span>
              <span className="text-white font-bold truncate block">{career.supportStaff?.spinCoach || 'Spin Consultant'}</span>
            </div>
            <div className="bg-[#070a0e] p-2.5 rounded-lg border border-[#1e2733]">
              <span className="dugout-kicker text-[9px] text-[#8b97a3] block mb-0.5">Fielding Coach</span>
              <span className="text-white font-bold truncate block">{career.supportStaff?.fieldingCoach || 'Fielding Coach'}</span>
            </div>
            <div className="bg-[#070a0e] p-2.5 rounded-lg border border-[#1e2733]">
              <span className="dugout-kicker text-[9px] text-[#8b97a3] block mb-0.5">Fitness &amp; S&amp;C</span>
              <span className="text-white font-bold truncate block">{career.supportStaff?.fitnessCoach || 'Physiotherapist'}</span>
            </div>
            <div className="bg-[#070a0e] p-2.5 rounded-lg border border-[#1e2733]">
              <span className="dugout-kicker text-[9px] text-[#8b97a3] block mb-0.5">T20 Specialist</span>
              <span className="text-white font-bold truncate block">{career.supportStaff?.t20Consultant || 'T20 Consultant'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Format Team Tabs */}
      <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-5 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e2733] pb-4">
          <div className="flex items-center space-x-2">
            {(['TEST', 'ODI', 'T20I'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setActiveFormat(fmt)}
                className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                  activeFormat === fmt
                    ? 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black shadow-md'
                    : 'bg-[#10151c] text-[#8b97a3] hover:text-white border border-[#1e2733]'
                }`}
              >
                {fmt === 'TEST' ? '🔴 Test Team' : fmt === 'ODI' ? '⚪ ODI Team' : '🔵 T20I Team'}
              </button>
            ))}
          </div>

          <span className="text-xs text-[#8b97a3] font-mono">
            Format Pool: <strong className="text-white">{formatConfig.squadPlayerIds.length}</strong> players • Starting XI: <strong className="text-[#3fca86]">{playingXI.length}/11</strong>
          </span>
        </div>

        {/* Format Leadership Trio in Dugout Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Format Captain */}
          <div
            onClick={() => captain && onSelectPlayer(captain)}
            className="bg-[#10151c] border border-[#1e2733] hover:border-[#e2b64a] p-4 rounded-xl cursor-pointer transition shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="dugout-kicker text-[10px] text-[#e2b64a]">
                {activeFormat} Captain
              </span>
              <span className="text-[10px] bg-[#e2b64a] text-black font-black px-2 py-0.5 rounded uppercase tracking-wider">
                LEADER
              </span>
            </div>
            <div className="flex items-center space-x-3 mt-3">
              <PlayerAvatar player={captain} size="md" />
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-[#e2b64a] transition-colors">{captain?.name}</h3>
                <span className="text-xs text-[#8b97a3] block font-mono mt-0.5">
                  Rating: <strong className="text-white">{activeFormat === 'TEST' ? captain?.testRating : activeFormat === 'ODI' ? captain?.odiRating : captain?.t20Rating}</strong> • Form: <strong className="text-[#3fca86]">{captain?.attributes.currentForm}%</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Format Vice Captain */}
          <div
            onClick={() => viceCaptain && onSelectPlayer(viceCaptain)}
            className="bg-[#10151c] border border-[#1e2733] hover:border-[#8fb2d9] p-4 rounded-xl cursor-pointer transition shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="dugout-kicker text-[10px] text-[#8fb2d9]">
                {activeFormat} Vice-Captain
              </span>
              <span className="text-[10px] bg-[#8fb2d9]/20 text-[#8fb2d9] font-bold border border-[#8fb2d9]/40 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                VC
              </span>
            </div>
            <div className="flex items-center space-x-3 mt-3">
              <PlayerAvatar player={viceCaptain} size="md" />
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-[#8fb2d9] transition-colors">{viceCaptain?.name}</h3>
                <span className="text-xs text-[#8b97a3] block font-mono mt-0.5">
                  Rating: <strong className="text-white">{activeFormat === 'TEST' ? viceCaptain?.testRating : activeFormat === 'ODI' ? viceCaptain?.odiRating : viceCaptain?.t20Rating}</strong> • Form: <strong className="text-[#3fca86]">{viceCaptain?.attributes.currentForm}%</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Format Wicketkeeper */}
          <div
            onClick={() => wicketKeeper && onSelectPlayer(wicketKeeper)}
            className="bg-[#10151c] border border-[#1e2733] hover:border-[#3fca86] p-4 rounded-xl cursor-pointer transition shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="dugout-kicker text-[10px] text-[#3fca86]">
                {activeFormat} Wicketkeeper
              </span>
              <span className="text-[10px] bg-[#3fca86]/20 text-[#3fca86] font-bold border border-[#3fca86]/40 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                WK
              </span>
            </div>
            <div className="flex items-center space-x-3 mt-3">
              <PlayerAvatar player={wicketKeeper} size="md" />
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-[#3fca86] transition-colors">{wicketKeeper?.name}</h3>
                <span className="text-xs text-[#8b97a3] block font-mono mt-0.5">
                  Catches: <strong className="text-white">{wicketKeeper ? getCombinedFormatStats(wicketKeeper, activeFormat).catches : 0}</strong> • Stumpings: <strong className="text-white">{wicketKeeper ? getCombinedFormatStats(wicketKeeper, activeFormat).stumpings : 0}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Playing XI Lineup for Active Format */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="dugout-kicker text-xs text-white flex items-center space-x-2">
              <Shield className="w-4 h-4 text-[#e2b64a]" />
              <span>{activeFormat} Match-Day Playing XI (Batting Order)</span>
            </h3>
            <button
              onClick={() => onNavigateToSquad(activeFormat)}
              className="text-xs text-[#e2b64a] hover:text-[#ffe9a8] font-bold uppercase tracking-wider transition"
            >
              Modify Lineup &amp; Orders &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {playingXI.map((player, idx) => {
              const rating = activeFormat === 'TEST' ? player.testRating : activeFormat === 'ODI' ? player.odiRating : player.t20Rating;
              const isCap = player.id === formatConfig.captainId;
              const isVC = player.id === formatConfig.viceCaptainId;
              const isWK = player.id === formatConfig.wicketKeeperId || player.isWicketKeeper;

              return (
                <div
                  key={player.id}
                  onClick={() => onSelectPlayer(player)}
                  className="bg-[#10151c] border border-[#1e2733] hover:border-[#e2b64a]/60 p-3 rounded-xl flex items-center justify-between cursor-pointer transition group"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-lg bg-[#070a0e] border border-[#1e2733] text-xs font-mono font-black text-[#e2b64a] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <PlayerAvatar player={player} size="sm" />
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm font-bold text-white group-hover:text-[#e2b64a] transition-colors">{player.name}</span>
                        {isCap && (
                          <span className="text-[10px] bg-[#e2b64a] text-black font-black px-1.5 py-0.2 rounded uppercase">
                            C
                          </span>
                        )}
                        {isVC && (
                          <span className="text-[10px] bg-[#8fb2d9]/20 text-[#8fb2d9] border border-[#8fb2d9]/40 font-bold px-1.5 py-0.2 rounded uppercase font-mono">
                            VC
                          </span>
                        )}
                        {isWK && (
                          <span className="text-[10px] bg-[#3fca86]/20 text-[#3fca86] border border-[#3fca86]/40 font-bold px-1.5 py-0.2 rounded uppercase font-mono">
                            WK
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#8b97a3] block font-mono">
                        {player.role.replace('_', ' ')} • Rating: <strong className="text-white">{rating}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Fatigue indicator */}
                  <div className="text-right">
                    <span className="dugout-kicker text-[9px] text-[#8b97a3] block mb-0.5">Workload</span>
                    <div className="flex items-center space-x-1.5">
                      <div className="w-14 h-1.5 bg-[#070a0e] border border-[#1e2733] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${(player.workloadFatigue || 0) > 60 ? 'bg-[#ff5470]' : (player.workloadFatigue || 0) > 30 ? 'bg-[#e2b64a]' : 'bg-[#3fca86]'}`}
                          style={{ width: `${Math.min(100, player.workloadFatigue || 10)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#c3ccd6]">{player.workloadFatigue || 10}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Format Squad Reserves */}
        {squadReserves.length > 0 && (
          <div className="pt-4 border-t border-[#1e2733]">
            <h4 className="dugout-kicker text-xs text-[#8b97a3] mb-3">
              {activeFormat} Touring Squad Reserves ({squadReserves.length} players)
            </h4>
            <div className="flex flex-wrap gap-2.5">
              {squadReserves.map((player) => (
                <div
                  key={player.id}
                  onClick={() => onSelectPlayer(player)}
                  className="bg-[#10151c] hover:bg-[#161d27] border border-[#1e2733] hover:border-[#8fb2d9] px-3.5 py-2 rounded-xl text-xs cursor-pointer flex items-center space-x-2.5 transition"
                >
                  <PlayerAvatar player={player} size="xs" />
                  <span className="font-bold text-[#e8edf2]">{player.name}</span>
                  <span className="text-[#8b97a3] font-mono text-[11px]">{player.role.slice(0, 3)}</span>
                  <span className="text-[#ffe9a8] font-mono font-bold text-[11px]">
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
