import React, { useState } from 'react';
import { BarChart3, Award, Flame, Target } from 'lucide-react';
import { MatchFormat, Player } from '../../types/cricket';
import { ALL_PLAYERS } from '../../data/squads';

interface StatisticsViewProps {
  onSelectPlayer: (player: Player) => void;
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({ onSelectPlayer }) => {
  const [format, setFormat] = useState<MatchFormat>('TEST');

  // Calculate true statistical leaderboards
  const mostRuns = [...ALL_PLAYERS].sort((a, b) => b.stats[format].runs - a.stats[format].runs).slice(0, 8);
  const mostWickets = [...ALL_PLAYERS].sort((a, b) => b.stats[format].wickets - a.stats[format].wickets).slice(0, 8);
  const highestScores = [...ALL_PLAYERS].sort((a, b) => b.stats[format].highestScore - a.stats[format].highestScore).slice(0, 8);
  const mostCenturies = [...ALL_PLAYERS].sort((a, b) => b.stats[format].centuries - a.stats[format].centuries).slice(0, 8);

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

        {/* Format Selector */}
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

      {/* 4-Quadrant Leaderboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most Runs Card */}
        <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4">
          <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Award className="w-4 h-4" /> Most Career Runs ({format})
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Top Batsmen</span>
          </div>

          <div className="space-y-1.5">
            {mostRuns.map((player, idx) => (
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
                  <span className="font-bold text-white block text-sm">{player.stats[format].runs}</span>
                  <span className="text-[10px] text-emerald-400">Avg {player.stats[format].average.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Wickets Card */}
        <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4">
          <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Target className="w-4 h-4" /> Most Career Wickets ({format})
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Top Bowlers</span>
          </div>

          <div className="space-y-1.5">
            {mostWickets.map((player, idx) => (
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
                  <span className="font-bold text-white block text-sm">{player.stats[format].wickets}</span>
                  <span className="text-[10px] text-amber-400">Avg {player.stats[format].bowlingAverage.toFixed(1)}</span>
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
            {highestScores.map((player, idx) => (
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
                    {player.stats[format].highestScore}{player.stats[format].highestScoreNotOut ? '*' : ''}
                  </span>
                  <span className="text-[10px] text-slate-400">SR {player.stats[format].strikeRate.toFixed(1)}</span>
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
            {mostCenturies.map((player, idx) => (
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
                  <span className="font-bold text-purple-400 block text-sm">{player.stats[format].centuries}</span>
                  <span className="text-[10px] text-slate-400">Fifties: {player.stats[format].fifties}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
