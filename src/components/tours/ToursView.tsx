import React, { useState } from 'react';
import {
  Briefcase,
  Calendar,
  Trophy,
  Users,
  MapPin,
  CheckCircle2,
  Clock,
  Play,
  Shield,
  Award,
  ChevronRight,
  UserCheck,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { CareerSave, Match, MatchFormat, Player, Tour } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { ALL_PLAYERS, getEffectivePlayer, getEffectivePlayersByCountry } from '../../data/squads';
import { isTerminalMatchStatus } from '../../engine/matchEngine';

interface ToursViewProps {
  career: CareerSave;
  onNavigateToMatch?: (matchId: string) => void;
  onInspectScorecard?: (match: Match) => void;
  onOpenTourSelection?: (tourId: string) => void;
  onUpdateSquadXI?: (format: MatchFormat, xiPlayerIds: string[]) => void;
  onSelectPlayer?: (player: Player) => void;
}

export const ToursView: React.FC<ToursViewProps> = ({
  career,
  onNavigateToMatch,
  onInspectScorecard,
  onOpenTourSelection,
  onUpdateSquadXI,
  onSelectPlayer,
}) => {
  const tours = career.tours || [];
  const [selectedTourId, setSelectedTourId] = useState<string>(
    career.currentTourId || (tours[0]?.id || '')
  );
  const [activeFormatFilter, setActiveFormatFilter] = useState<'ALL' | 'TEST' | 'ODI' | 'T20I'>('ALL');
  const [editingFormatXI, setEditingFormatXI] = useState<MatchFormat | null>(null);

  const activeTour = tours.find((t) => t.id === selectedTourId) || tours[0];
  const allMatches: Match[] = [...career.fixtures, ...(career.worldFixtures || [])];
  const tourMatches = activeTour ? allMatches.filter((m) => m.tourId === activeTour.id) : [];

  const hostTeam = INTERNATIONAL_TEAMS.find((t) => t.id === activeTour?.hostTeamId);
  const visitingTeam = INTERNATIONAL_TEAMS.find((t) => t.id === activeTour?.visitingTeamId);
  const isUserInvolved =
    activeTour &&
    (activeTour.hostTeamId === career.selectedTeamId || activeTour.visitingTeamId === career.selectedTeamId);
  const isUserHome = activeTour?.hostTeamId === career.selectedTeamId;

  // Filter matches by format if selected
  const displayedMatches = tourMatches.filter(
    (m) => activeFormatFilter === 'ALL' || m.format === activeFormatFilter
  );

  // Available national squad players for playing XI adjustments
  const nationalPlayers = getEffectivePlayersByCountry(career.selectedTeamId, career, true);

  return (
    <div className="space-y-4 select-none animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-400" />
            Bilateral International Tours & Series Hub
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage multi-format international tours, inspect schedules, configure touring parties, and select match-by-match playing XIs.
          </p>
        </div>

        {activeTour && isUserInvolved && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOpenTourSelection && onOpenTourSelection(activeTour.id)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded transition cursor-pointer flex items-center space-x-1.5 shadow"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{activeTour.squadAnnounced ? 'Modify Tour Squad' : 'Select Tour Squad'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Tour Selector Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {tours.map((t) => {
          const isSelected = t.id === activeTour?.id;
          const userIn = t.hostTeamId === career.selectedTeamId || t.visitingTeamId === career.selectedTeamId;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTourId(t.id)}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 border ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                  : 'bg-[#121824] text-slate-400 hover:text-white border-[#1f293d]'
              }`}
            >
              <span>{t.name}</span>
              {userIn && (
                <span className="bg-emerald-950 text-emerald-300 font-mono text-[10px] px-1 py-0.2 rounded border border-emerald-800/60">
                  MY NATION
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTour && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Column: Active Tour Overview & Schedule */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tour Hero Card */}
            <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1f293d] pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                      {isUserInvolved ? (isUserHome ? 'HOME TOUR' : 'AWAY TOUR') : 'INTERNATIONAL TOUR'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {activeTour.startDate} to {activeTour.endDate}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">{activeTour.name}</h3>
                  <p className="text-xs text-slate-400">
                    Host: <span className="text-white font-semibold">{hostTeam?.name || activeTour.hostTeamId}</span> • Visiting: <span className="text-white font-semibold">{visitingTeam?.name || activeTour.visitingTeamId}</span>
                  </p>
                </div>

                <div className="bg-[#0e131d] border border-[#1f293d] p-3 rounded text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Tour Status
                  </span>
                  <span className={`text-xs font-black ${activeTour.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {activeTour.status.replace('_', ' ')}
                  </span>
                  {activeTour.resultText && (
                    <p className="text-[11px] text-slate-300 mt-1 max-w-xs">{activeTour.resultText}</p>
                  )}
                </div>
              </div>

              {/* Formats Included Breakdown */}
              <div className="grid grid-cols-3 gap-3 pt-4">
                {(['TEST', 'ODI', 'T20I'] as MatchFormat[]).map((fmt) => {
                  const s = activeTour.series[fmt];
                  if (!s) return null;
                  return (
                    <div key={fmt} className="bg-[#182234] border border-[#243247] p-3 rounded text-center">
                      <span className="text-[11px] font-black text-emerald-400 font-mono">{fmt}</span>
                      <div className="text-lg font-bold text-white mt-0.5">
                        {s.homeWins} – {s.awayWins}
                        {fmt === 'TEST' && (s as any).draws !== undefined && (s as any).draws > 0 && (
                          <span className="text-xs text-slate-400 font-normal"> ({(s as any).draws}D)</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {s.matchesPlayed} / {s.matchCount} Matches Played
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Match Schedule List */}
            <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  Official Match Schedule ({tourMatches.length} Fixtures)
                </h4>

                <div className="flex items-center space-x-1 bg-[#182234] border border-[#243247] p-0.5 rounded text-xs">
                  {(['ALL', 'TEST', 'ODI', 'T20I'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setActiveFormatFilter(fmt)}
                      className={`px-2.5 py-1 rounded font-semibold cursor-pointer transition ${
                        activeFormatFilter === fmt ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {displayedMatches.map((m) => {
                  const isCompleted = isTerminalMatchStatus(m.status);
                  const isLive = m.status === 'IN_PROGRESS';
                  const isUserFixture =
                    m.homeTeamId === career.selectedTeamId || m.awayTeamId === career.selectedTeamId;
                  const inn1 = m.innings[0];
                  const inn2 = m.innings[1];

                  return (
                    <div
                      key={m.id}
                      className={`border rounded-lg p-3.5 transition ${
                        isLive
                          ? 'bg-[#162338] border-emerald-500 shadow'
                          : isCompleted
                          ? 'bg-[#151c2a] border-[#222f47]'
                          : 'bg-[#182234] border-[#243247] hover:border-[#334663]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-[#0b0f17] text-emerald-400 border border-emerald-900/60">
                              {m.format}
                            </span>
                            <span className="text-xs font-bold text-white">{m.seriesName}</span>
                            <span className="text-[11px] text-slate-400 font-mono">Date: {m.date}</span>
                          </div>

                          <div className="flex items-center space-x-2 text-xs text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>{m.venue}</span>
                            <span>•</span>
                            <span className="text-slate-300">Pitch: {m.pitch.name}</span>
                          </div>

                          {/* Scores if played */}
                          {isCompleted && inn1 && (
                            <div className="text-xs font-mono font-bold text-slate-200 mt-1">
                              <span>
                                {inn1.battingTeamId}: {inn1.totalRuns}/{inn1.wickets} ({inn1.completedOvers}.{inn1.ballsInCurrentOver} ov)
                              </span>
                              {inn2 && (
                                <span className="ml-3">
                                  vs {inn2.battingTeamId}: {inn2.totalRuns}/{inn2.wickets} ({inn2.completedOvers}.{inn2.ballsInCurrentOver} ov)
                                </span>
                              )}
                              <p className="text-[11px] text-emerald-400 font-sans mt-0.5">{m.resultText}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 self-start sm:self-center">
                          {isCompleted ? (
                            <button
                              onClick={() => onInspectScorecard && onInspectScorecard(m)}
                              className="text-[11px] font-bold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-700/50 px-2.5 py-1.5 rounded transition cursor-pointer flex items-center space-x-1"
                            >
                              <FileText className="w-3 h-3 text-emerald-400" />
                              <span>View Scorecard</span>
                            </button>
                          ) : isUserFixture && onNavigateToMatch ? (
                            <button
                              onClick={() => onNavigateToMatch(m.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded transition cursor-pointer flex items-center space-x-1"
                            >
                              <Play className="w-3 h-3 fill-white" />
                              <span>{isLive ? 'Resume Match' : 'Match Centre'}</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400 bg-[#121824] border border-[#243247] px-2.5 py-1 rounded">
                              AI Fixture
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar Column: Tour Squad & Playing XI Selector */}
          <div className="space-y-4">
            {/* Tour Squad Card */}
            <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Official Touring Party ({activeTour.tourSquadIds?.length || 0})
                </h4>
                {isUserInvolved && (
                  <button
                    onClick={() => onOpenTourSelection && onOpenTourSelection(activeTour.id)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold transition cursor-pointer"
                  >
                    Edit Squad
                  </button>
                )}
              </div>

              {activeTour.tourSquadIds && activeTour.tourSquadIds.length > 0 ? (
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {activeTour.tourSquadIds.map((pId) => {
                    const player = getEffectivePlayer(pId, career) || ALL_PLAYERS.find((p) => p.id === pId);
                    if (!player) return null;
                    const isWk = player.isWicketKeeper || player.role === 'WICKETKEEPER_BATTER';
                    return (
                      <div
                        key={pId}
                        onClick={() => onSelectPlayer && onSelectPlayer(player)}
                        className="bg-[#182234] hover:bg-[#202d42] border border-[#243247] p-2 rounded flex items-center justify-between text-xs cursor-pointer transition"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white">{player.shortName}</span>
                          {isWk && (
                            <span className="text-[9px] bg-amber-950 text-amber-400 border border-amber-800/40 px-1 rounded font-bold">
                              WK
                            </span>
                          )}
                        </div>
                        <span className="text-slate-400 font-mono text-[11px]">{player.role.replace('_', ' ')}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs">
                  <p>Tour squad has not been finalized yet.</p>
                  {isUserInvolved && (
                    <button
                      onClick={() => onOpenTourSelection && onOpenTourSelection(activeTour.id)}
                      className="mt-2 text-emerald-400 underline font-bold"
                    >
                      Announce 15-20 Player Squad
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Match-by-Match Playing XI Customizer */}
            {isUserInvolved && (
              <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    Match-by-Match Playing XI
                  </h4>
                </div>

                <p className="text-xs text-slate-400">
                  Select and rotate players between matches to balance workload fatigue and tactical matchups.
                </p>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {(['TEST', 'ODI', 'T20I'] as MatchFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setEditingFormatXI(editingFormatXI === fmt ? null : fmt)}
                      className={`p-2 rounded text-xs font-bold border transition cursor-pointer text-center ${
                        editingFormatXI === fmt
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                          : 'bg-[#182234] text-slate-300 border-[#243247] hover:border-[#354763]'
                      }`}
                    >
                      {fmt} Lineup ({career.formatSquads[fmt].playingXI.length})
                    </button>
                  ))}
                </div>

                {editingFormatXI && (
                  <div className="bg-[#0e131d] border border-[#1f293d] p-3 rounded-lg space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{editingFormatXI} Starting XI</span>
                      <span className="text-[10px] text-emerald-400 font-mono">11 Players Active</span>
                    </div>

                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {career.formatSquads[editingFormatXI].playingXI.map((pId, idx) => {
                        const player = ALL_PLAYERS.find((p) => p.id === pId);
                        if (!player) return null;
                        return (
                          <div
                            key={pId}
                            className="bg-[#182234] p-1.5 rounded flex items-center justify-between text-xs"
                          >
                            <span className="text-slate-300">
                              <span className="text-slate-500 font-mono mr-1.5">{idx + 1}.</span>
                              {player.shortName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{player.role}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
