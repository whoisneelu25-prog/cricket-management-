import React, { useState, useMemo } from 'react';
import { BarChart3, Award, Flame, Target } from 'lucide-react';
import { CareerSave, MatchFormat, Player } from '../../types/cricket';
import { ALL_PLAYERS, createEmptyFormatStats, getCombinedFormatStats, getEffectivePlayer } from '../../data/squads';

interface StatisticsViewProps {
  career?: CareerSave;
  onSelectPlayer: (player: Player) => void;
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({ career, onSelectPlayer }) => {
  const [format, setFormat] = useState<MatchFormat>('TEST');
  const [scope, setScope] = useState<'COMBINED' | 'SIMULATED'>('COMBINED');

  const entries = useMemo(() => {
    const combined = [...ALL_PLAYERS, ...(career?.emergingPlayers || [])];
    return combined
      .filter((p) => p.gender !== 'FEMALE')
      .map((p) => {
        const eff = getEffectivePlayer(p, career) || p;
        const st =
          scope === 'SIMULATED'
            ? eff.simulatedStats?.[format] || createEmptyFormatStats()
            : getCombinedFormatStats(eff, format);
        return { player: eff, st };
      });
  }, [career, format, scope]);

  const mostRuns = useMemo(
    () => [...entries].sort((a, b) => b.st.runs - a.st.runs).slice(0, 8),
    [entries]
  );
  const mostWickets = useMemo(
    () => [...entries].sort((a, b) => b.st.wickets - a.st.wickets).slice(0, 8),
    [entries]
  );
  const highestScores = useMemo(
    () => [...entries].sort((a, b) => b.st.highestScore - a.st.highestScore).slice(0, 8),
    [entries]
  );
  const mostCenturies = useMemo(
    () => [...entries].sort((a, b) => b.st.centuries - a.st.centuries).slice(0, 8),
    [entries]
  );

  return (
    <div className="space-y-4 select-none animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            International Cricket Records & Statistics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            All-time career milestones and records across verified international cricket history.
          </p>
        </div>

        {/* Scope + Format Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[#182234] border border-[#243247] p-1 rounded space-x-1">
            <button
              onClick={() => setScope('COMBINED')}
              className={`px-2.5 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
                scope === 'COMBINED'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All-Time + Career
            </button>
            <button
              onClick={() => setScope('SIMULATED')}
              className={`px-2.5 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
                scope === 'SIMULATED'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Active Career Only
            </button>
          </div>

          <div className="flex items-center bg-[#182234] border border-[#243247] p-1 rounded space-x-1">
            {(['TEST', 'ODI', 'T20I'] as MatchFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
                  format === fmt
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

      {/* 4-Quadrant Leaderboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most Runs Card */}
        <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4">
          <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Award className="w-4 h-4" /> Most Runs ({format})
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Top Batters</span>
          </div>

          <div className="space-y-1.5">
            {mostRuns.map(({ player, st }, idx) => (
              <div
                key={player.id}
                onClick={() => onSelectPlayer(player)}
                className="p-2 rounded bg-[#182234] hover:bg-[#202e44] border border-[#243247] flex items-center justify-between text-xs cursor-pointer transition"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-4 text-center font-mono font-bold text-slate-400">{idx + 1}</span>
                  <div>
                    <span className="font-bold text-white block">{player.name}</span>
                    <span className="text-[10px] text-slate-400">{player.countryName}</span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold text-white block text-sm">{st.runs}</span>
                  <span className="text-[10px] text-emerald-400">Avg {st.average.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Wickets Card */}
        <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4">
          <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Target className="w-4 h-4" /> Most Wickets ({format})
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Top Bowlers</span>
          </div>

          <div className="space-y-1.5">
            {mostWickets.map(({ player, st }, idx) => (
              <div
                key={player.id}
                onClick={() => onSelectPlayer(player)}
                className="p-2 rounded bg-[#182234] hover:bg-[#202e44] border border-[#243247] flex items-center justify-between text-xs cursor-pointer transition"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-4 text-center font-mono font-bold text-slate-400">{idx + 1}</span>
                  <div>
                    <span className="font-bold text-white block">{player.name}</span>
                    <span className="text-[10px] text-slate-400">{player.countryName}</span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold text-white block text-sm">{st.wickets}</span>
                  <span className="text-[10px] text-amber-400">Avg {st.bowlingAverage.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Highest Individual Scores */}
        <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4">
          <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4" /> Highest Individual Innings
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">High Scores</span>
          </div>

          <div className="space-y-1.5">
            {highestScores.map(({ player, st }, idx) => (
              <div
                key={player.id}
                onClick={() => onSelectPlayer(player)}
                className="p-2 rounded bg-[#182234] hover:bg-[#202e44] border border-[#243247] flex items-center justify-between text-xs cursor-pointer transition"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-4 text-center font-mono font-bold text-slate-400">{idx + 1}</span>
                  <div>
                    <span className="font-bold text-white block">{player.name}</span>
                    <span className="text-[10px] text-slate-400">{player.countryName}</span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold text-white block text-sm">
                    {st.highestScore}{st.highestScoreNotOut ? '*' : ''}
                  </span>
                  <span className="text-[10px] text-slate-400">SR {st.strikeRate.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Centuries */}
        <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4">
          <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Award className="w-4 h-4" /> Most International Centuries
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Centuries</span>
          </div>

          <div className="space-y-1.5">
            {mostCenturies.map(({ player, st }, idx) => (
              <div
                key={player.id}
                onClick={() => onSelectPlayer(player)}
                className="p-2 rounded bg-[#182234] hover:bg-[#202e44] border border-[#243247] flex items-center justify-between text-xs cursor-pointer transition"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-4 text-center font-mono font-bold text-slate-400">{idx + 1}</span>
                  <div>
                    <span className="font-bold text-white block">{player.name}</span>
                    <span className="text-[10px] text-slate-400">{player.countryName}</span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold text-purple-400 block text-sm">{st.centuries}</span>
                  <span className="text-[10px] text-slate-400">Fifties: {st.fifties}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
