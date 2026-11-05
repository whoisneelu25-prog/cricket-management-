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
  Sparkles,
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
import { CountryFlag } from '../common/CountryFlag';

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
    <div className="space-y-5 select-none pb-8 text-[#e8edf2]">
      {/* Top Banner: Format Toggle & Info */}
      <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#10151c] border border-[#1e2733] flex items-center justify-center text-[#e2b64a] shadow-inner">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="dugout-kicker text-[11px] text-[#e2b64a]">World Standings</span>
              <span className="text-[10px] bg-[#10151c] text-[#8fb2d9] font-mono px-2 py-0.5 rounded-full border border-[#1e2733] font-bold">
                Dynamic Ratings
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-0.5">
              ICC Official World Cricket Rankings
            </h1>
            <p className="text-xs text-[#8b97a3] mt-0.5">
              Deterministic rating model reflecting international results, opponent strength and decay
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Format Tabs */}
          <div className="flex bg-[#10151c] p-1 rounded-xl border border-[#1e2733]">
            {(['TEST', 'ODI', 'T20I'] as MatchFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider transition cursor-pointer ${
                  selectedFormat === fmt
                    ? 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black shadow-sm font-extrabold'
                    : 'text-[#8b97a3] hover:text-white'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowMethodologyModal(true)}
            title="View Rating Methodology"
            className="text-xs text-[#8b97a3] hover:text-white px-3 py-2 rounded-xl bg-[#10151c] border border-[#1e2733] hover:border-[#8fb2d9] flex items-center gap-1.5 cursor-pointer uppercase font-semibold transition"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#e2b64a]" />
            <span className="hidden sm:inline">Methodology</span>
          </button>
        </div>
      </div>

      {/* Primary Tabs: Team Rankings vs Player Rankings */}
      <div className="flex items-center space-x-2 border-b border-[#1e2733] pb-3 text-xs">
        <button
          onClick={() => setActiveTab('TEAMS')}
          className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-2 uppercase tracking-wider ${
            activeTab === 'TEAMS'
              ? 'bg-[#10151c] text-[#e2b64a] border border-[#e2b64a]/40 shadow-xs'
              : 'text-[#8b97a3] hover:text-white border border-transparent'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>National Team Rankings</span>
        </button>
        <button
          onClick={() => setActiveTab('PLAYERS')}
          className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-2 uppercase tracking-wider ${
            activeTab === 'PLAYERS'
              ? 'bg-[#10151c] text-[#e2b64a] border border-[#e2b64a]/40 shadow-xs'
              : 'text-[#8b97a3] hover:text-white border border-transparent'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Player Rankings ({selectedFormat})</span>
        </button>
      </div>

      {activeTab === 'TEAMS' ? (
        <div className="space-y-5">
          {/* Key Metrics Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            {/* World #1 Card */}
            <div className="bg-[#10151c] border border-[#e2b64a]/40 p-4 rounded-xl flex items-center justify-between shadow-xs">
              <div>
                <span className="dugout-kicker text-[10px] text-[#e2b64a] block mb-1">
                  World #1 Nation
                </span>
                <div className="flex items-center space-x-2.5 mt-1">
                  <CountryFlag countryCode={leaderTeam?.code || ''} size="sm" />
                  <span className="text-sm font-black text-white uppercase">{leaderTeam?.name}</span>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-[#ffe9a8] font-black text-xl">{leaderTeam?.rating}</span>
                <span className="dugout-kicker text-[9px] text-[#8b97a3] block">Rating Pts</span>
              </div>
            </div>

            {/* User Country Position */}
            <div className="bg-[#10151c] border border-[#1e2733] p-4 rounded-xl flex items-center justify-between shadow-xs">
              <div>
                <span className="dugout-kicker text-[10px] text-[#8fb2d9] block mb-1">
                  Your Nation Position
                </span>
                <div className="flex items-center space-x-2.5 mt-1">
                  <CountryFlag countryCode={userEntry?.code || ''} size="sm" />
                  <span className="text-lg font-black font-mono text-[#e2b64a]">
                    #{userEntry?.position || '-'}
                  </span>
                  <span className="text-xs text-white font-bold">{userEntry?.name}</span>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-white font-black text-xl">{userEntry?.rating || '-'}</span>
                <span className="dugout-kicker text-[9px] text-[#8b97a3] block">Rating Pts</span>
              </div>
            </div>

            {/* Gap to Next Rank */}
            <div className="bg-[#10151c] border border-[#1e2733] p-4 rounded-xl flex items-center justify-between shadow-xs">
              <div>
                <span className="dugout-kicker text-[10px] text-[#8b97a3] block mb-1">
                  Gap to Next Rank
                </span>
                <div className="mt-1">
                  {nextTargetEntry ? (
                    <span className="text-sm font-bold text-[#ffe9a8]">
                      {ptsDifferenceToNext > 0 ? `${ptsDifferenceToNext} pts behind` : 'Tied'}
                    </span>
                  ) : (
                    <span className="text-sm font-black text-[#3fca86] uppercase">Top of World</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[#8b97a3] font-mono">
                  {nextTargetEntry ? `Target: #${nextTargetEntry.position} ${nextTargetEntry.code}` : 'Rank 1 Crown'}
                </span>
              </div>
            </div>

            {/* Movement / Trend */}
            <div className="bg-[#10151c] border border-[#1e2733] p-4 rounded-xl flex items-center justify-between shadow-xs">
              <div>
                <span className="dugout-kicker text-[10px] text-[#8b97a3] block mb-1">
                  Recent Trend
                </span>
                <div className="flex items-center space-x-1.5 mt-1 font-mono text-sm">
                  {userEntry && userEntry.previousPosition > userEntry.position ? (
                    <span className="text-[#3fca86] font-bold flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" /> +{userEntry.previousPosition - userEntry.position} Places
                    </span>
                  ) : userEntry && userEntry.previousPosition < userEntry.position ? (
                    <span className="text-[#ff5470] font-bold flex items-center">
                      <TrendingDown className="w-4 h-4 mr-1" /> -{userEntry.position - userEntry.previousPosition} Places
                    </span>
                  ) : (
                    <span className="text-[#8b97a3] flex items-center">
                      <Minus className="w-4 h-4 mr-1" /> Steady
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right font-mono text-[10px] text-[#8b97a3]">
                Prev: #{userEntry?.previousPosition || userEntry?.position}
              </div>
            </div>
          </div>

          {/* Real SVG Ranking Progression Chart from Snapshots */}
          {userHistoricalData.length > 1 && (
            <div className="bg-[#070a0e] border border-[#1e2733] p-5 rounded-2xl space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#1e2733] pb-3">
                <span className="dugout-kicker text-xs text-[#e2b64a] flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#e2b64a]" />
                  {userEntry?.name} {selectedFormat} Rating History Progression
                </span>
                <span className="text-[10px] text-[#8b97a3] font-mono uppercase tracking-wider">
                  Saved snapshots: {userHistoricalData.length} records
                </span>
              </div>

              {/* Clean Responsive SVG Line Chart */}
              <div className="h-32 w-full pt-2">
                {(() => {
                  const minRating = Math.min(...userHistoricalData.map((d) => d.rating)) - 5;
                  const maxRating = Math.max(...userHistoricalData.map((d) => d.rating)) + 5;
                  const range = Math.max(10, maxRating - minRating);
                  const width = 600;
                  const height = 100;
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
                      <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#1e2733" strokeDasharray="3 3" />
                      <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#1e2733" strokeDasharray="3 3" />
                      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#1e2733" />

                      {/* Line */}
                      <path d={pathStr} fill="none" stroke="#e2b64a" strokeWidth="2.5" />

                      {/* Data Points */}
                      {points.map((p, idx) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r="4.5" fill="#070a0e" stroke="#e2b64a" strokeWidth="2.5" />
                          <text
                            x={p.x}
                            y={p.y - 8}
                            textAnchor="middle"
                            fill="#ffe9a8"
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

          {/* Full National Team Rankings Table in Dugout Style */}
          <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-[#10151c] border-b border-[#1e2733] flex items-center justify-between">
              <span className="dugout-kicker text-xs text-[#e2b64a]">
                Official {selectedFormat} Championship Standings
              </span>
              <span className="text-[10px] text-[#8b97a3] font-mono uppercase tracking-wider">
                Full ICC Test &amp; White-Ball Nations
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#070a0e] text-[#8b97a3] font-mono text-[10px] uppercase border-b border-[#1e2733] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 text-center">Pos</th>
                    <th className="py-3 px-4">Country</th>
                    <th className="py-3 px-3 text-center">Matches</th>
                    <th className="py-3 px-3 text-center">Points</th>
                    <th className="py-3 px-4 text-right">Rating</th>
                    <th className="py-3 px-4 text-center">Movement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2733]">
                  {teamEntries.map((entry) => {
                    const isUser = entry.teamId === userTeamId;
                    const movement = entry.previousPosition - entry.position;

                    return (
                      <tr
                        key={entry.teamId}
                        className={`transition-colors ${
                          isUser ? 'bg-[#e2b64a]/10 hover:bg-[#e2b64a]/15 font-semibold' : 'hover:bg-[#10151c]'
                        }`}
                      >
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          <span
                            className={`w-7 h-7 rounded-lg inline-flex items-center justify-center ${
                              entry.position === 1
                                ? 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black font-black shadow-sm'
                                : entry.position <= 3
                                ? 'bg-[#10151c] text-[#8fb2d9] border border-[#1e2733]'
                                : 'text-[#8b97a3]'
                            }`}
                          >
                            {entry.position}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2.5">
                            <CountryFlag countryCode={entry.code} size="xs" />
                            <span className={`font-bold ${isUser ? 'text-[#ffe9a8]' : 'text-white'}`}>
                              {entry.name}
                            </span>
                            <span className="text-[10px] font-mono text-[#8b97a3]">({entry.code})</span>
                            {isUser && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-[#e2b64a] text-black uppercase tracking-wider">
                                MANAGED
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-[#c3ccd6]">
                          {entry.matches}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-[#c3ccd6]">
                          {entry.points}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-white text-base">
                          <span className={entry.position === 1 ? 'text-[#ffe9a8]' : 'text-white'}>
                            {entry.rating}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          {movement > 0 ? (
                            <span className="text-[#3fca86] font-bold inline-flex items-center">
                              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{movement}
                            </span>
                          ) : movement < 0 ? (
                            <span className="text-[#ff5470] font-bold inline-flex items-center">
                              <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> {movement}
                            </span>
                          ) : (
                            <span className="text-[#556375] inline-flex items-center">
                              <Minus className="w-3.5 h-3.5 mr-0.5" /> 0
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
          <div className="bg-[#070a0e] border border-[#1e2733] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            {/* Category Toggle */}
            <div className="flex bg-[#10151c] p-1 rounded-xl border border-[#1e2733]">
              {(['BATTER', 'BOWLER', 'ALL_ROUNDER'] as PlayerRankingCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setPlayerCategory(cat)}
                  className={`px-3.5 py-1.5 font-bold rounded-lg transition cursor-pointer uppercase tracking-wider ${
                    playerCategory === cat
                      ? 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black shadow-sm font-extrabold'
                      : 'text-[#8b97a3] hover:text-white'
                  }`}
                >
                  {cat.replace(/_/g, ' ')}S
                </button>
              ))}
            </div>

            {/* Minimum Eligibility Filter */}
            <div className="flex items-center space-x-2.5">
              <span className="dugout-kicker text-[10px] text-[#8b97a3]">Minimum Matches:</span>
              <div className="flex items-center space-x-1">
                {[0, 1, 3, 5, 10].map((count) => (
                  <button
                    key={count}
                    onClick={() => setMinInningsFilter(count)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition cursor-pointer ${
                      minInningsFilter === count
                        ? 'bg-[#e2b64a] text-black font-black'
                        : 'bg-[#10151c] text-[#8b97a3] hover:text-white border border-[#1e2733]'
                    }`}
                  >
                    {count}+
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Player Rankings Table */}
          <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-[#10151c] border-b border-[#1e2733] flex items-center justify-between">
              <span className="dugout-kicker text-xs text-[#e2b64a]">
                Top International {selectedFormat} {playerCategory}s
              </span>
              <span className="text-[10px] text-[#8b97a3] font-mono uppercase tracking-wider">
                {displayedPlayerRankings.length} Players Qualified
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#070a0e] text-[#8b97a3] font-mono text-[10px] uppercase border-b border-[#1e2733] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 text-center">Rank</th>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-3">Country</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3 text-center">Matches</th>
                    <th className="py-3 px-3 text-center">Stats Snapshot</th>
                    <th className="py-3 px-4 text-right">Rating</th>
                    <th className="py-3 px-4 text-center">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2733]">
                  {displayedPlayerRankings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#8b97a3]">
                        No players meet the qualification criteria for this category.
                      </td>
                    </tr>
                  ) : (
                    displayedPlayerRankings.slice(0, 30).map((entry) => {
                      const isUserPlayer = entry.countryId === userTeamId;
                      const movement = entry.movement;

                      return (
                        <tr
                          key={entry.playerId}
                          className={`transition-colors ${
                            isUserPlayer ? 'bg-[#e2b64a]/10 hover:bg-[#e2b64a]/15' : 'hover:bg-[#10151c]'
                          }`}
                        >
                          <td className="py-3 px-4 text-center font-mono font-bold">
                            <span
                              className={`w-7 h-7 rounded-lg inline-flex items-center justify-center ${
                                entry.rank === 1
                                  ? 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black font-black shadow-sm'
                                  : entry.rank <= 3
                                  ? 'bg-[#10151c] text-[#8fb2d9] border border-[#1e2733]'
                                  : 'text-[#8b97a3]'
                              }`}
                            >
                              {entry.rank}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              onClick={() => {
                                const p = career?.emergingPlayers?.find((x) => x.id === entry.playerId);
                                if (p) onSelectPlayer(p);
                              }}
                              className="font-bold text-white hover:text-[#e2b64a] cursor-pointer"
                            >
                              {entry.playerName}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-[#c3ccd6]">{entry.countryName}</span>
                          </td>
                          <td className="py-3 px-3 text-[#8b97a3] text-[11px] uppercase font-mono">
                            {entry.category}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-[#c3ccd6]">
                            {entry.matchesPlayed}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-[11px] text-[#ffe9a8] font-bold">
                            {entry.highlightStats || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-white text-base">
                            <span className={entry.rank === 1 ? 'text-[#ffe9a8]' : 'text-white'}>
                              {entry.rating}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            {movement > 0 ? (
                              <span className="text-[#3fca86] font-bold inline-flex items-center">
                                <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{movement}
                              </span>
                            ) : movement < 0 ? (
                              <span className="text-[#ff5470] font-bold inline-flex items-center">
                                <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> {movement}
                              </span>
                            ) : (
                              <span className="text-[#556375] inline-flex items-center">
                                <Minus className="w-3.5 h-3.5 mr-0.5" /> 0
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
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
          <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-xs text-[#e8edf2]">
            <div className="flex items-center justify-between border-b border-[#1e2733] pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wide">
                <HelpCircle className="w-4 h-4 text-[#e2b64a]" />
                ICM Official Rating Methodology
              </h3>
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="text-[#8b97a3] hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-[#c3ccd6] leading-relaxed">
              The ICM International Rating System is a deterministic in-game model separate from tournament standings:
            </p>

            <ul className="list-disc pl-5 space-y-2 text-[#c3ccd6]">
              <li>
                <strong className="text-white">Opponent Strength:</strong> Wins against higher-rated nations earn larger rating bonuses; losses against lower-ranked teams incur heavier penalties.
              </li>
              <li>
                <strong className="text-white">Format-Specific Scaling:</strong> Test matches possess longer cycles, while T20Is fluctuate more dynamically reflecting format volatility.
              </li>
              <li>
                <strong className="text-white">Decay &amp; Recency:</strong> Performance points decay steadily each season to ensure current form outweighs distant historical triumphs.
              </li>
              <li>
                <strong className="text-white">Player Rankings:</strong> Weighted composite of batting average, strike rate, wicket haul frequency and economy rates in each isolated format.
              </li>
            </ul>

            <div className="pt-3 border-t border-[#1e2733] text-right">
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="btn-gold px-5 py-2 text-xs"
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
