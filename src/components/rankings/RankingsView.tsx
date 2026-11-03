import React, { useState } from 'react';
import { TrendingUp, Award, Shield, Users } from 'lucide-react';
import { MatchFormat, Player } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { ALL_PLAYERS } from '../../data/squads';

interface RankingsViewProps {
  onSelectPlayer: (player: Player) => void;
}

export const RankingsView: React.FC<RankingsViewProps> = ({ onSelectPlayer }) => {
  const [format, setFormat] = useState<MatchFormat>('TEST');
  const [category, setCategory] = useState<'TEAMS' | 'BATTERS' | 'BOWLERS' | 'ALL_ROUNDERS'>('TEAMS');

  // Sorted teams by format
  const sortedTeams = [...INTERNATIONAL_TEAMS].sort((a, b) => {
    return b.ratingPoints[format] - a.ratingPoints[format];
  });

  // Sorted players by format and category
  const topBatters = [...ALL_PLAYERS]
    .filter((p) => p.role === 'BATTER' || p.role === 'WICKETKEEPER_BATTER')
    .sort((a, b) => {
      const rA = format === 'TEST' ? a.testRating : format === 'ODI' ? a.odiRating : a.t20Rating;
      const rB = format === 'TEST' ? b.testRating : format === 'ODI' ? b.odiRating : b.t20Rating;
      return rB - rA;
    })
    .slice(0, 10);

  const topBowlers = [...ALL_PLAYERS]
    .filter((p) => p.role === 'BOWLER')
    .sort((a, b) => {
      const rA = format === 'TEST' ? a.testRating : format === 'ODI' ? a.odiRating : a.t20Rating;
      const rB = format === 'TEST' ? b.testRating : format === 'ODI' ? b.odiRating : b.t20Rating;
      return rB - rA;
    })
    .slice(0, 10);

  const topAllRounders = [...ALL_PLAYERS]
    .filter((p) => p.role === 'ALL_ROUNDER')
    .sort((a, b) => {
      const rA = format === 'TEST' ? a.testRating : format === 'ODI' ? a.odiRating : a.t20Rating;
      const rB = format === 'TEST' ? b.testRating : format === 'ODI' ? b.odiRating : b.t20Rating;
      return rB - rA;
    })
    .slice(0, 10);

  return (
    <div className="space-y-4 select-none animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Official ICC Global Rankings
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Men’s International Team and Player rankings across Test, ODI, and T20I formats.
          </p>
        </div>

        {/* Format Toggle */}
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

      {/* Category Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#1f293d] pb-2 text-xs">
        {[
          { id: 'TEAMS', label: 'Team Rankings' },
          { id: 'BATTERS', label: 'Top Batters' },
          { id: 'BOWLERS', label: 'Top Bowlers' },
          { id: 'ALL_ROUNDERS', label: 'Top All-Rounders' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id as any)}
            className={`px-3 py-1.5 rounded font-semibold transition cursor-pointer ${
              category === cat.id
                ? 'bg-[#182234] text-emerald-400 border border-[#243247]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content Table */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg overflow-hidden">
        {category === 'TEAMS' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#182234] text-slate-400 font-semibold border-b border-[#243247]">
                <tr>
                  <th className="p-3 text-center">Rank</th>
                  <th className="p-3">Nation</th>
                  <th className="p-3 text-right font-mono">Rating Points</th>
                  <th className="p-3 text-right font-mono">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#243247] font-mono">
                {sortedTeams.map((team, idx) => (
                  <tr key={team.id} className="hover:bg-[#182234]/50">
                    <td className="p-3 text-center font-bold text-slate-400">
                      {idx === 0 && <span className="text-amber-400 mr-1">👑</span>}
                      #{idx + 1}
                    </td>
                    <td className="p-3 font-sans font-bold text-white flex items-center space-x-2">
                      <span className="text-lg">{team.flagEmoji}</span>
                      <span>{team.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({team.code})</span>
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-400">
                      {team.ratingPoints[format]}
                    </td>
                    <td className="p-3 text-right text-slate-400 font-sans">
                      {idx < 2 ? 'Championship Leader' : 'Full Member'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#182234] text-slate-400 font-semibold border-b border-[#243247]">
                <tr>
                  <th className="p-3 text-center">Rank</th>
                  <th className="p-3">Player</th>
                  <th className="p-3">Nation</th>
                  <th className="p-3 text-center font-mono">Rating Index</th>
                  <th className="p-3 text-right font-mono">Runs / Wkts</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#243247] font-mono">
                {(category === 'BATTERS' ? topBatters : category === 'BOWLERS' ? topBowlers : topAllRounders).map((player, idx) => {
                  const rating = format === 'TEST' ? player.testRating : format === 'ODI' ? player.odiRating : player.t20Rating;
                  const stats = player.stats[format];

                  return (
                    <tr
                      key={player.id}
                      className="hover:bg-[#182234]/50 transition cursor-pointer"
                      onClick={() => onSelectPlayer(player)}
                    >
                      <td className="p-3 text-center font-bold text-slate-400">
                        {idx === 0 && <span className="text-amber-400 mr-1">★</span>}
                        #{idx + 1}
                      </td>
                      <td className="p-3 font-sans font-bold text-white flex items-center space-x-2">
                        <span>{player.name}</span>
                        {player.isCaptain && (
                          <span className="text-[9px] bg-amber-500 text-black px-1 rounded font-bold">
                            C
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-sans text-slate-300">{player.countryName}</td>
                      <td className="p-3 text-center font-bold text-emerald-400">{rating}</td>
                      <td className="p-3 text-right text-slate-200">
                        {stats.runs} runs / {stats.wickets} wkts
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPlayer(player);
                          }}
                          className="text-xs bg-[#243247] hover:bg-[#334155] text-white px-2 py-1 rounded transition cursor-pointer"
                        >
                          Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
