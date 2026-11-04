import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Award,
  Shield,
  HelpCircle,
  BarChart2,
} from 'lucide-react';
import {
  CareerSave,
  MatchFormat,
  Player,
  PlayerRankingCategory,
  PlayerRankingEntry,
  TeamRankingEntry,
} from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import {
  getSortedTeamRankingEntries,
  computeAllPlayerRankings,
} from '../../engine/rankingEngine';

interface RankingsViewProps {
  career?: CareerSave;
  onSelectPlayer: (player: Player) => void;
}

export const RankingsView: React.FC<RankingsViewProps> = ({ career, onSelectPlayer }) => {
  const [selectedFormat, setSelectedFormat] = useState<MatchFormat>('TEST');
  const [activeTab, setActiveTab] = useState<'TEAMS' | 'PLAYERS'>('TEAMS');
  const [playerCategory, setPlayerCategory] = useState<PlayerRankingCategory>('BATTER');
  const [minInningsFilter, setMinInningsFilter] = useState<number>(1);
  const [showMethodologyModal, setShowMethodologyModal] = useState<boolean>(false);

  const userTeamId = career?.selectedTeamId || 'IND';

  // 1. Team Rankings for active format
  const teamEntries: TeamRankingEntry[] = useMemo(() => {
    if (!career?.teamRankings) return [];
    return getSortedTeamRankingEntries(career.teamRankings, selectedFormat);
  }, [career?.teamRankings, selectedFormat]);

  const leaderTeam = teamEntries[0];
  const userEntryIndex = teamEntries.findIndex((e) => e.teamId === userTeamId);
  const userEntry = userEntryIndex >= 0 ? teamEntries[userEntryIndex] : null;
  const nextTargetEntry = userEntryIndex > 0 ? teamEntries[userEntryIndex - 1] : null;
  const ptsDifferenceToNext =
    userEntry && nextTargetEntry ? nextTargetEntry.rating - userEntry.rating : 0;

  // 2. Real SVG Ranking Progression Chart from historical snapshots
  const snapshots = useMemo(() => {
    const hist = career?.rankingHistory || [];
    return hist.slice(-10); // last 10 snapshots
  }, [career?.rankingHistory]);

  const userHistoricalData = useMemo(() => {
    return snapshots.map((s) => {
      const entry = s.rankings[selectedFormat]?.find((r) => r.teamId === userTeamId);
      return {
        date: s.date,
        position: entry?.position || 5,
        rating: entry?.rating || 100,
      };
    });
  }, [snapshots, selectedFormat, userTeamId]);

  // 3. Player Rankings computed dynamically from actual stats with minimum eligibility filter
  const allPlayerRankings = useMemo(() => {
    if (!career) return null;
    return career.playerRankings || computeAllPlayerRankings(career);
  }, [career]);

  const displayedPlayerRankings: PlayerRankingEntry[] = useMemo(() => {
    if (!allPlayerRankings?.rankings) return [];
    const list = allPlayerRankings.rankings[selectedFormat]?.[playerCategory] || [];
    return list.filter((p: PlayerRankingEntry) => (p.matchesPlayed || 0) >= minInningsFilter);
  }, [allPlayerRankings, selectedFormat, playerCategory, minInningsFilter]);

  return (
    <div className="space-y-4 select-none pb-8 text-slate-200">
      {/* Top Banner: Format Toggle & Info */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-[#151d29] border border-[#1e293b] flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-white tracking-wide">
                ICM Official World Cricket Rankings
              </h1>
              <span className="text-[10px] bg-[#142646] text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-emerald-900/60 font-bold">
                Ratings Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Deterministic rating model reflecting international match results, opponent strength and decay
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
                {fmt}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowMethodologyModal(true)}
            title="View Rating Methodology"
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-[#151d29] border border-[#1e293b] flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Methodology</span>
          </button>
        </div>
      </div>

      {/* Primary Tabs: Team Rankings vs Player Rankings */}
      <div className="flex items-center space-x-2 border-b border-[#1e293b] pb-2 text-xs">
        <button
          onClick={() => setActiveTab('TEAMS')}
          className={`px-3 py-1.5 rounded font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'TEAMS'
              ? 'bg-[#151d29] text-emerald-400 border border-[#1e293b]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>National Team Rankings</span>
        </button>
        <button
          onClick={() => setActiveTab('PLAYERS')}
          className={`px-3 py-1.5 rounded font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'PLAYERS'
              ? 'bg-[#151d29] text-emerald-400 border border-[#1e293b]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Player Rankings ({selectedFormat})</span>
        </button>
      </div>

      {activeTab === 'TEAMS' ? (
        <div className="space-y-4">
          {/* Key Metrics Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            {/* World #1 Card */}
            <div className="bg-[#111827] border border-[#1e293b] p-3 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  #1 Ranked Nation
                </span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xl">{leaderTeam?.flagEmoji}</span>
                  <span className="text-sm font-bold text-white">{leaderTeam?.name}</span>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-emerald-400 font-bold text-base">{leaderTeam?.rating}</span>
                <span className="text-[10px] text-slate-400 block">Rating Pts</span>
              </div>
            </div>

            {/* User Country Position */}
            <div className="bg-[#111827] border border-[#1e293b] p-3 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Your Nation Position
                </span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xl">{userEntry?.flagEmoji}</span>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    #{userEntry?.position || '-'}
                  </span>
                  <span className="text-xs text-white font-medium">{userEntry?.name}</span>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-white font-bold text-base">{userEntry?.rating || '-'}</span>
                <span className="text-[10px] text-slate-400 block">Rating Pts</span>
              </div>
            </div>

            {/* Gap to Next Rank */}
            <div className="bg-[#111827] border border-[#1e293b] p-3 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Gap to Next Rank
                </span>
                <div className="mt-1">
                  {nextTargetEntry ? (
                    <span className="text-sm font-bold text-amber-300">
                      {ptsDifferenceToNext > 0 ? `${ptsDifferenceToNext} pts behind` : 'Tied'}
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-emerald-400">Top of World</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 font-mono">
                  {nextTargetEntry ? `Target: #${nextTargetEntry.position} ${nextTargetEntry.code}` : 'Lead Defended'}
                </span>
              </div>
            </div>

            {/* Movement / Trend */}
            <div className="bg-[#111827] border border-[#1e293b] p-3 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Recent Trend
                </span>
                <div className="flex items-center space-x-1.5 mt-1 font-mono text-sm">
                  {userEntry && userEntry.previousPosition > userEntry.position ? (
                    <span className="text-emerald-400 font-bold flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" /> +{userEntry.previousPosition - userEntry.position} Places
                    </span>
                  ) : userEntry && userEntry.previousPosition < userEntry.position ? (
                    <span className="text-rose-400 font-bold flex items-center">
                      <TrendingDown className="w-4 h-4 mr-1" /> -{userEntry.position - userEntry.previousPosition} Places
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center">
                      <Minus className="w-4 h-4 mr-1" /> Steady
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right font-mono text-[10px] text-slate-400">
                Prev: #{userEntry?.previousPosition || userEntry?.position}
              </div>
            </div>
          </div>

          {/* Real SVG Ranking Progression Chart from Snapshots */}
          {userHistoricalData.length > 1 && (
            <div className="bg-[#111827] border border-[#1e293b] p-3.5 rounded-lg space-y-2">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
                  {userEntry?.name} {selectedFormat} Rating History Progression
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Saved snapshots: {userHistoricalData.length} records
                </span>
              </div>

              {/* Simple Clean Responsive SVG Line Chart */}
              <div className="h-28 w-full pt-2">
                {(() => {
                  const minRating = Math.min(...userHistoricalData.map((d) => d.rating)) - 5;
                  const maxRating = Math.max(...userHistoricalData.map((d) => d.rating)) + 5;
                  const range = Math.max(10, maxRating - minRating);
                  const width = 600;
                  const height = 90;
                  const padding = 20;

                  const points = userHistoricalData.map((d, idx) => {
                    const x = padding + (idx / (userHistoricalData.length - 1)) * (width - 2 * padding);
                    const y = height - padding - ((d.rating - minRating) / range) * (height - 2 * padding);
                    return { x, y, date: d.date, rating: d.rating, position: d.position };
                  });

                  const pathStr = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

                  return (
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                      {/* Grid Lines */}
                      <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#1e293b" strokeDasharray="3 3" />
                      <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#1e293b" strokeDasharray="3 3" />
                      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#1e293b" />

                      {/* Line */}
                      <path d={pathStr} fill="none" stroke="#10b981" strokeWidth="2.5" />

                      {/* Data Points */}
                      {points.map((p, idx) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r="4" fill="#0b0e14" stroke="#10b981" strokeWidth="2" />
                          <text
                            x={p.x}
                            y={p.y - 8}
                            textAnchor="middle"
                            fill="#e2e8f0"
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {p.rating}
                          </text>
                        </g>
                      ))}
                    </svg>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Full National Team Rankings Table */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg overflow-hidden">
            <div className="p-3 bg-[#151d29] border-b border-[#1e293b] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Official {selectedFormat} Table Standings
              </span>
              <span className="text-[10px] text-slate-400 font-mono">10 Full ICC Members</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0e131d] text-slate-400 font-mono text-[10px] uppercase border-b border-[#1e293b]">
                  <tr>
                    <th className="py-2.5 px-3 text-center">Pos</th>
                    <th className="py-2.5 px-3">Country</th>
                    <th className="py-2.5 px-3 text-center">Matches</th>
                    <th className="py-2.5 px-3 text-center">Points</th>
                    <th className="py-2.5 px-3 text-right">Rating</th>
                    <th className="py-2.5 px-3 text-center">Movement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]/60">
                  {teamEntries.map((entry) => {
                    const isUser = entry.teamId === userTeamId;
                    const movement = entry.previousPosition - entry.position;

                    return (
                      <tr
                        key={entry.teamId}
                        className={`transition ${
                          isUser ? 'bg-[#142646]/40 hover:bg-[#142646]/60' : 'hover:bg-[#151d29]'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          <span
                            className={`w-6 h-6 rounded inline-flex items-center justify-center ${
                              entry.position === 1
                                ? 'bg-amber-950 text-amber-300 border border-amber-700/60 font-black'
                                : entry.position <= 3
                                ? 'bg-[#151d29] text-emerald-400 border border-[#1e293b]'
                                : 'text-slate-400'
                            }`}
                          >
                            {entry.position}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-base">{entry.flagEmoji}</span>
                            <span className={`font-semibold ${isUser ? 'text-emerald-300' : 'text-white'}`}>
                              {entry.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">({entry.code})</span>
                            {isUser && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                                MANAGED
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                          {entry.matches}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                          {entry.points}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white text-sm">
                          {entry.rating}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {movement > 0 ? (
                            <span className="text-emerald-400 font-bold inline-flex items-center">
                              <TrendingUp className="w-3 h-3 mr-0.5" /> +{movement}
                            </span>
                          ) : movement < 0 ? (
                            <span className="text-rose-400 font-bold inline-flex items-center">
                              <TrendingDown className="w-3 h-3 mr-0.5" /> {movement}
                            </span>
                          ) : (
                            <span className="text-slate-500 inline-flex items-center">
                              <Minus className="w-3 h-3 mr-0.5" /> 0
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Player Rankings Section (9 Tables: Format x Category) */
        <div className="space-y-4">
          {/* Sub-Category Filter & Minimum Eligibility Slider */}
          <div className="bg-[#111827] border border-[#1e293b] p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            {/* Category Toggle */}
            <div className="flex bg-[#151d29] p-0.5 rounded border border-[#1e293b]">
              {(['BATTER', 'BOWLER', 'ALL_ROUNDER'] as PlayerRankingCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setPlayerCategory(cat)}
                  className={`px-3 py-1 font-bold rounded transition cursor-pointer ${
                    playerCategory === cat
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat.replace(/_/g, ' ')}S
                </button>
              ))}
            </div>

            {/* Minimum Eligibility Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-medium text-[11px]">Minimum Matches:</span>
              <div className="flex items-center space-x-1">
                {[0, 1, 3, 5, 10].map((count) => (
                  <button
                    key={count}
                    onClick={() => setMinInningsFilter(count)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                      minInningsFilter === count
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-[#151d29] text-slate-400 hover:text-white border border-[#1e293b]'
                    }`}
                  >
                    {count}+
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Player Rankings Table */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg overflow-hidden">
            <div className="p-3 bg-[#151d29] border-b border-[#1e293b] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Top International {selectedFormat} {playerCategory}s
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {displayedPlayerRankings.length} Players Qualified
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0e131d] text-slate-400 font-mono text-[10px] uppercase border-b border-[#1e293b]">
                  <tr>
                    <th className="py-2.5 px-3 text-center">Rank</th>
                    <th className="py-2.5 px-3">Player</th>
                    <th className="py-2.5 px-3">Country</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3 text-center">Matches</th>
                    <th className="py-2.5 px-3 text-center">Stats Snapshot</th>
                    <th className="py-2.5 px-3 text-right">Rating</th>
                    <th className="py-2.5 px-3 text-center">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]/60">
                  {displayedPlayerRankings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400">
                        No players meet the qualification criteria for this category.
                      </td>
                    </tr>
                  ) : (
                    displayedPlayerRankings.slice(0, 25).map((entry) => {
                      const isUserPlayer = entry.countryId === userTeamId;
                      const movement = entry.movement;

                      return (
                        <tr
                          key={entry.playerId}
                          className={`transition ${
                            isUserPlayer ? 'bg-[#142646]/30 hover:bg-[#142646]/50' : 'hover:bg-[#151d29]'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center font-mono font-bold">
                            <span
                              className={`w-6 h-6 rounded inline-flex items-center justify-center ${
                                entry.rank === 1
                                  ? 'bg-amber-950 text-amber-300 border border-amber-700/60 font-black'
                                  : entry.rank <= 3
                                  ? 'bg-[#151d29] text-emerald-400 border border-[#1e293b]'
                                  : 'text-slate-400'
                              }`}
                            >
                              {entry.rank}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              onClick={() => {
                                const p = career?.emergingPlayers?.find((x) => x.id === entry.playerId);
                                if (p) onSelectPlayer(p);
                              }}
                              className="font-bold text-white hover:text-emerald-400 cursor-pointer"
                            >
                              {entry.playerName}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-slate-300">{entry.countryName}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            {entry.category}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                            {entry.matchesPlayed}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-300">
                            {entry.highlightStats || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                            {entry.rating}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            {movement > 0 ? (
                              <span className="text-emerald-400 font-bold inline-flex items-center">
                                <TrendingUp className="w-3 h-3 mr-0.5" /> +{movement}
                              </span>
                            ) : movement < 0 ? (
                              <span className="text-rose-400 font-bold inline-flex items-center">
                                <TrendingDown className="w-3 h-3 mr-0.5" /> {movement}
                              </span>
                            ) : (
                              <span className="text-slate-500 inline-flex items-center">
                                <Minus className="w-3 h-3 mr-0.5" /> 0
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Methodology Modal */}
      {showMethodologyModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5 max-w-lg w-full space-y-3.5 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                ICM Official Rating Methodology
              </h3>
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-300 leading-relaxed">
              The ICM International Rating System is a deterministic in-game model separate from tournament standings:
            </p>

            <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
              <li>
                <strong>Opponent Strength:</strong> Wins against higher-rated nations earn larger rating bonuses; losses against lower-ranked teams incur heavier penalties.
              </li>
              <li>
                <strong>Format-Specific Scaling:</strong> Test matches possess longer cycles, while T20Is fluctuate more dynamically reflecting format volatility.
              </li>
              <li>
                <strong>Decay &amp; Recency:</strong> Performance points decay steadily each season to ensure current form outweighs distant historical triumphs.
              </li>
              <li>
                <strong>Player Rankings:</strong> Weighted composite of batting average, strike rate, wicket haul frequency and economy rates in each isolated format.
              </li>
            </ul>

            <div className="pt-2 border-t border-[#1e293b] text-right">
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
