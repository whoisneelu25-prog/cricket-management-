import React, { useState } from 'react';
import {
  Play,
  Calendar,
  Trophy,
  Shield,
  TrendingUp,
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Users,
  FastForward,
  Globe,
  Briefcase,
  FileText,
  Clock,
  Newspaper,
  Sliders,
  ChevronRight,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { CareerSave, Match, Player } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { getEffectivePlayersByCountry } from '../../data/squads';
import { getNextUserMatchInfo } from '../../store/careerStore';
import { CalendarAdvanceMode, CalendarAdvancementResult } from '../../engine/worldSimulation';
import { isTerminalMatchStatus } from '../../engine/matchEngine';
import { sortTournamentTable } from '../../engine/tournamentEngine';

interface DashboardViewProps {
  career: CareerSave;
  calendarAlert?: CalendarAdvancementResult | null;
  onDismissCalendarAlert?: () => void;
  onNavigateToMatch: (matchId: string) => void;
  onOpenMatchPreparation: (matchId: string) => void;
  onInspectScorecard: (match: Match) => void;
  onNavigateToSquad: () => void;
  onNavigateToNews: () => void;
  onNavigateToTournaments?: () => void;
  onSelectPlayer: (player: Player) => void;
  onAdvanceCalendar: (mode: CalendarAdvanceMode) => void;
  onRestSquadDay?: () => void;
  onOpenTourSelection?: (tourId: string) => void;
  onNavigateToRankings?: () => void;
  onNavigateToFixtures?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  career,
  calendarAlert,
  onDismissCalendarAlert,
  onNavigateToMatch,
  onOpenMatchPreparation,
  onInspectScorecard,
  onNavigateToSquad,
  onNavigateToNews,
  onNavigateToTournaments,
  onSelectPlayer,
  onAdvanceCalendar,
  onRestSquadDay,
  onOpenTourSelection,
  onNavigateToRankings,
  onNavigateToFixtures,
}) => {
  const [resultsFilter, setResultsFilter] = useState<'USER' | 'ALL'>('USER');

  const team = INTERNATIONAL_TEAMS.find((t) => t.id === career.selectedTeamId);
  const squad = getEffectivePlayersByCountry(career.selectedTeamId, career, true);

  const nextInfo = getNextUserMatchInfo(career);
  const nextMatch = nextInfo.nextMatch;
  const userIsHome = nextMatch ? nextMatch.homeTeamId === career.selectedTeamId : true;
  const oppTeamId = nextMatch
    ? userIsHome
      ? nextMatch.awayTeamId
      : nextMatch.homeTeamId
    : null;
  const opponent = oppTeamId
    ? INTERNATIONAL_TEAMS.find((t) => t.id === oppTeamId)
    : null;

  // Live Rankings Info for User's Country
  const getRankingCardData = (fmt: 'TEST' | 'ODI' | 'T20I') => {
    const liveState = career.teamRankings?.[career.selectedTeamId];
    const rank = liveState?.worldRankings?.[fmt] || team?.worldRankings[fmt] || 5;
    const rating = liveState?.ratingPoints?.[fmt] || 100;
    const prevRank = liveState?.previousRankings?.[fmt] || rank;
    const movement = prevRank - rank; // positive = gained positions

    return { rank, rating, movement };
  };

  const testRanking = getRankingCardData('TEST');
  const odiRanking = getRankingCardData('ODI');
  const t20Ranking = getRankingCardData('T20I');

  // Squad availability, injuries & workload
  const injuredPlayers = squad.filter((p) => p.isInjured);
  const availablePlayers = squad.filter((p) => !p.isInjured);
  const fitCount = availablePlayers.length;
  const avgFitness = Math.round(
    squad.reduce((sum, p) => sum + (p.fitness || 90), 0) / (squad.length || 1)
  );

  // Recent Form (last 5 user matches)
  const recentUserCompleted = [...(career.fixtures || [])]
    .filter((f) => isTerminalMatchStatus(f.status))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const recentFormPills = recentUserCompleted.slice(0, 5).map((m) => {
    const isWin =
      (m.winnerTeamId === career.selectedTeamId) ||
      (m.resultText && m.resultText.toLowerCase().includes(team?.name?.toLowerCase() || ''));
    const isTieOrDraw = m.status === 'DRAW' || m.status === 'TIE';
    if (isWin) return { text: 'W', bg: 'bg-emerald-600 text-white' };
    if (isTieOrDraw) return { text: 'D', bg: 'bg-slate-600 text-white' };
    return { text: 'L', bg: 'bg-rose-600 text-white' };
  });

  // Upcoming 5 User Fixtures
  const upcomingFixtures = [...(career.fixtures || [])]
    .filter((f) => !isTerminalMatchStatus(f.status))
    .slice(0, 5);

  // Recent Results (User or All)
  const allCompletedMatches = [
    ...(career.fixtures || []).filter((f) => isTerminalMatchStatus(f.status)),
    ...(career.worldFixtures || []).filter((f) => isTerminalMatchStatus(f.status)),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const displayedResults =
    resultsFilter === 'USER'
      ? recentUserCompleted.slice(0, 5)
      : allCompletedMatches.slice(0, 5);

  const teamMorale = career.teamMorale ?? 80;

  return (
    <div className="space-y-4 select-none pb-8 text-slate-200">
      {/* 1. Calendar Advancement Control Bar */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-[#151d29] border border-emerald-900/60 px-3 py-1.5 rounded flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">
                Career Date
              </span>
              <span className="text-sm font-bold font-mono text-white">
                {career.currentDate}
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            Managing <strong className="text-white">{team?.name}</strong> •{' '}
            <span className="text-emerald-400 font-medium">International Pro Tour</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onAdvanceCalendar('ONE_DAY')}
            className="bg-[#151d29] hover:bg-[#1c2738] text-slate-200 border border-[#26354a] text-xs font-semibold px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>+1 Day</span>
          </button>
          <button
            onClick={() => onAdvanceCalendar('ONE_WEEK')}
            className="bg-[#151d29] hover:bg-[#1c2738] text-slate-200 border border-[#26354a] text-xs font-semibold px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5"
          >
            <FastForward className="w-3.5 h-3.5 text-slate-400" />
            <span>+1 Week</span>
          </button>
          <button
            onClick={() => onAdvanceCalendar('NEXT_EVENT')}
            className="bg-[#151d29] hover:bg-[#1c2738] text-amber-300 border border-amber-900/50 text-xs font-semibold px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Next Event</span>
          </button>
          <button
            onClick={() => onAdvanceCalendar('NEXT_MATCH')}
            className="bg-[#10b981] hover:bg-[#059669] text-[#0b0e14] text-xs font-bold px-3.5 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <FastForward className="w-3.5 h-3.5 fill-current" />
            <span>Advance to Next Match</span>
          </button>

          {onRestSquadDay && (
            <button
              onClick={onRestSquadDay}
              title="Rest squad (-15% fatigue)"
              className="bg-[#151d29] hover:bg-[#1c2738] text-emerald-400 border border-emerald-900/60 text-xs font-medium px-2.5 py-1.5 rounded transition cursor-pointer"
            >
              Rest Squad
            </button>
          )}
        </div>
      </div>

      {/* Calendar Alert Toast */}
      {calendarAlert && calendarAlert.pausedReason !== 'TARGET_REACHED' && (
        <div className="bg-[#1c1b18] border border-amber-500/50 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold uppercase text-amber-300 tracking-wider mr-2">
                Action Required — {calendarAlert.pausedReason.replace(/_/g, ' ')}:
              </span>
              <span className="text-slate-200">{calendarAlert.pausedMessage}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {calendarAlert.pausedReason === 'TOUR_SQUAD_DEADLINE' &&
              calendarAlert.targetTourId &&
              onOpenTourSelection && (
                <button
                  onClick={() => onOpenTourSelection(calendarAlert.targetTourId!)}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3 py-1 rounded cursor-pointer"
                >
                  Select Tour Squad
                </button>
              )}
            {calendarAlert.pausedReason === 'USER_MATCH_TODAY' &&
              calendarAlert.targetMatchId && (
                <button
                  onClick={() => onOpenMatchPreparation(calendarAlert.targetMatchId!)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1 rounded cursor-pointer"
                >
                  Prepare Match XI
                </button>
              )}
            {onDismissCalendarAlert && (
              <button
                onClick={onDismissCalendarAlert}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Top Nation Overview Banner */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-lg bg-[#151d29] border border-[#1e293b] flex items-center justify-center text-3xl shadow-sm">
            {team?.flagEmoji || '🏏'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white tracking-wide">{team?.name}</h1>
              <span className="text-[10px] bg-[#142646] text-emerald-400 font-mono px-2 py-0.5 rounded font-bold border border-emerald-900/60">
                {team?.code}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Head Coach: <span className="text-slate-200 font-semibold">{career.manager.name}</span> • Record:{' '}
              <span className="text-white font-mono font-medium">
                {career.manager.matchesManaged}M ({career.manager.matchesWon}W {career.manager.matchesLost}L {career.manager.matchesDrawn}D)
              </span>
            </p>
          </div>
        </div>

        {/* Board Confidence & Team Morale */}
        <div className="flex items-center space-x-4 bg-[#151d29] border border-[#1e293b] px-4 py-2 rounded-lg">
          <div>
            <div className="flex justify-between items-center text-[11px] text-slate-400 gap-3 mb-1">
              <span>Board Confidence:</span>
              <span className="font-mono font-bold text-emerald-400">
                {career.manager.boardConfidence}%
              </span>
            </div>
            <div className="w-28 bg-[#1e293b] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full"
                style={{ width: `${Math.min(100, career.manager.boardConfidence)}%` }}
              />
            </div>
          </div>

          <div className="border-l border-[#1e293b] pl-4">
            <div className="flex justify-between items-center text-[11px] text-slate-400 gap-3 mb-1">
              <span>Team Morale:</span>
              <span className="font-mono font-bold text-sky-400">
                {teamMorale}%
              </span>
            </div>
            <div className="w-28 bg-[#1e293b] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full"
                style={{ width: `${Math.min(100, teamMorale)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Next Match Hero Card & Team Overview Panel (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Next Match Card (7 columns) */}
        <div className="lg:col-span-7 bg-[#111827] border border-[#1e293b] rounded-lg p-4 flex flex-col justify-between">
          <div>
            {/* Header / Format & Timing */}
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5 mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Next Match
                </span>
                {nextMatch && (
                  <span className="text-[10px] bg-[#142646] text-emerald-300 border border-emerald-900/60 px-1.5 py-0.5 rounded font-mono font-bold">
                    {nextMatch.format}
                  </span>
                )}
                {nextMatch?.lineupConfirmed && (
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                )}
              </div>

              {nextMatch && (
                <div className="text-xs font-mono">
                  <span className="bg-[#151d29] text-amber-300 border border-[#1e293b] px-2 py-0.5 rounded font-bold">
                    {nextInfo.daysRemaining === 0
                      ? 'TODAY'
                      : `${nextInfo.daysRemaining}d to go`}
                  </span>
                </div>
              )}
            </div>

            {nextMatch ? (
              <div className="space-y-3">
                {/* Matchup Banner */}
                <div className="flex items-center justify-between bg-[#151d29] border border-[#1e293b] p-3.5 rounded-lg">
                  {/* Home / Away */}
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{team?.flagEmoji}</span>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                        {userIsHome ? 'Home' : 'Away'}
                      </span>
                      <h3 className="text-base font-bold text-white">{team?.name}</h3>
                    </div>
                  </div>

                  <div className="text-center px-2">
                    <span className="text-xs font-mono font-bold text-slate-300 bg-[#0e131d] px-2.5 py-1 rounded border border-[#1e293b]">
                      VS
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono block mt-1">
                      {nextInfo.seriesScoreText || nextMatch.seriesName}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-right">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                        {userIsHome ? 'Visitor' : 'Host'}
                      </span>
                      <h3 className="text-base font-bold text-white">
                        {opponent?.name || oppTeamId}
                      </h3>
                    </div>
                    <span className="text-3xl">{opponent?.flagEmoji || '🏏'}</span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-[#151d29] p-2 rounded border border-[#1e293b]">
                    <span className="text-[10px] text-slate-400 block uppercase">Series</span>
                    <span className="text-white font-medium truncate block mt-0.5">
                      {nextMatch.seriesName || 'Bilateral Series'}
                    </span>
                  </div>
                  <div className="bg-[#151d29] p-2 rounded border border-[#1e293b]">
                    <span className="text-[10px] text-slate-400 block uppercase">Venue</span>
                    <span className="text-white font-medium truncate block mt-0.5">
                      {nextMatch.venue?.split(',')[0]}
                    </span>
                  </div>
                  <div className="bg-[#151d29] p-2 rounded border border-[#1e293b]">
                    <span className="text-[10px] text-slate-400 block uppercase">Date</span>
                    <span className="text-emerald-300 font-mono font-bold block mt-0.5">
                      {nextMatch.date}
                    </span>
                  </div>
                  <div className="bg-[#151d29] p-2 rounded border border-[#1e293b]">
                    <span className="text-[10px] text-slate-400 block uppercase">Status</span>
                    <span className="text-sky-300 font-mono font-medium block mt-0.5">
                      {nextMatch.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#151d29] border border-[#1e293b] rounded-lg p-5 text-center text-xs text-slate-400">
                No immediate fixtures scheduled. Advance the calendar to generate the next international tour.
              </div>
            )}
          </div>

          {/* Action CTAs */}
          {nextMatch && (
            <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between gap-3">
              <div className="text-xs text-slate-400 font-mono">
                Squad available: <span className="text-white font-bold">{fitCount} fit</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onOpenMatchPreparation(nextMatch.id)}
                  className="bg-[#151d29] hover:bg-[#1c2738] text-white border border-[#26354a] font-bold text-xs px-3.5 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Prepare for Match</span>
                </button>

                {nextInfo.daysRemaining === 0 && (
                  <button
                    onClick={() => onNavigateToMatch(nextMatch.id)}
                    className="bg-[#10b981] hover:bg-[#059669] text-[#0b0e14] font-black text-xs px-4 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play Match</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Team Overview Panel (5 columns) */}
        <div className="lg:col-span-5 bg-[#111827] border border-[#1e293b] rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" /> Team Overview & Fitness
              </span>
              <button
                onClick={onNavigateToSquad}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
              >
                Manage Squad →
              </button>
            </div>

            <div className="space-y-3">
              {/* Availability & Fitness Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[#151d29] p-2 rounded border border-[#1e293b]">
                  <span className="text-[10px] text-slate-400 block uppercase">Squad Fit</span>
                  <span className="text-white font-mono font-bold text-sm">
                    {fitCount}/{squad.length}
                  </span>
                </div>
                <div className="bg-[#151d29] p-2 rounded border border-[#1e293b]">
                  <span className="text-[10px] text-slate-400 block uppercase">Avg Fitness</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">
                    {avgFitness}%
                  </span>
                </div>
                <div className="bg-[#151d29] p-2 rounded border border-[#1e293b]">
                  <span className="text-[10px] text-slate-400 block uppercase">Team Morale</span>
                  <span className="text-sky-400 font-mono font-bold text-sm">
                    {teamMorale}%
                  </span>
                </div>
              </div>

              {/* Recent Form Pills */}
              <div className="bg-[#151d29] p-2.5 rounded border border-[#1e293b] flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">Recent Form (Last 5):</span>
                <div className="flex items-center space-x-1.5">
                  {recentFormPills.length > 0 ? (
                    recentFormPills.map((p, idx) => (
                      <span
                        key={idx}
                        className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center font-mono ${p.bg}`}
                      >
                        {p.text}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No recent matches</span>
                  )}
                </div>
              </div>

              {/* Injured List */}
              <div className="bg-[#151d29] p-2.5 rounded border border-[#1e293b]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-300">Injury List</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {injuredPlayers.length} Injured
                  </span>
                </div>
                {injuredPlayers.length === 0 ? (
                  <p className="text-xs text-emerald-400">✓ No injuries reported. Full squad available.</p>
                ) : (
                  <div className="space-y-1">
                    {injuredPlayers.slice(0, 3).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => onSelectPlayer(p)}
                        className="flex items-center justify-between text-xs p-1 rounded bg-[#111827] hover:bg-[#1a2538] cursor-pointer transition"
                      >
                        <span className="font-medium text-rose-300 truncate">{p.shortName}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {p.injuryType || 'Injury'} ({p.injuryDaysRemaining || 7}d)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Team Rankings Cards (Test, ODI, T20I) */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-4">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> ICC World Team Rankings
          </span>
          {onNavigateToRankings && (
            <button
              onClick={onNavigateToRankings}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
            >
              Full Rankings Table →
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Test Card */}
          <div className="bg-[#151d29] border border-[#1e293b] rounded p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Test Rankings
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-bold font-mono text-white">#{testRanking.rank}</span>
                <span className="text-xs font-mono text-emerald-400">{testRanking.rating} pts</span>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-xs font-mono">
              {testRanking.movement > 0 ? (
                <span className="text-emerald-400 flex items-center font-bold">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{testRanking.movement}
                </span>
              ) : testRanking.movement < 0 ? (
                <span className="text-rose-400 flex items-center font-bold">
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> {testRanking.movement}
                </span>
              ) : (
                <span className="text-slate-500 flex items-center">
                  <Minus className="w-3.5 h-3.5 mr-0.5" /> 0
                </span>
              )}
            </div>
          </div>

          {/* ODI Card */}
          <div className="bg-[#151d29] border border-[#1e293b] rounded p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                ODI Rankings
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-bold font-mono text-white">#{odiRanking.rank}</span>
                <span className="text-xs font-mono text-sky-400">{odiRanking.rating} pts</span>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-xs font-mono">
              {odiRanking.movement > 0 ? (
                <span className="text-emerald-400 flex items-center font-bold">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{odiRanking.movement}
                </span>
              ) : odiRanking.movement < 0 ? (
                <span className="text-rose-400 flex items-center font-bold">
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> {odiRanking.movement}
                </span>
              ) : (
                <span className="text-slate-500 flex items-center">
                  <Minus className="w-3.5 h-3.5 mr-0.5" /> 0
                </span>
              )}
            </div>
          </div>

          {/* T20I Card */}
          <div className="bg-[#151d29] border border-[#1e293b] rounded p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                T20I Rankings
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-bold font-mono text-white">#{t20Ranking.rank}</span>
                <span className="text-xs font-mono text-emerald-400">{t20Ranking.rating} pts</span>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-xs font-mono">
              {t20Ranking.movement > 0 ? (
                <span className="text-emerald-400 flex items-center font-bold">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{t20Ranking.movement}
                </span>
              ) : t20Ranking.movement < 0 ? (
                <span className="text-rose-400 flex items-center font-bold">
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> {t20Ranking.movement}
                </span>
              ) : (
                <span className="text-slate-500 flex items-center">
                  <Minus className="w-3.5 h-3.5 mr-0.5" /> 0
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Upcoming Fixtures & Recent Results (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Fixtures (Next 5) */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-4">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Upcoming Fixtures (Next 5)
            </span>
            {onNavigateToFixtures && (
              <button
                onClick={onNavigateToFixtures}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
              >
                All Fixtures →
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {upcomingFixtures.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No upcoming fixtures scheduled.</p>
            ) : (
              upcomingFixtures.map((m) => {
                const oppId = m.homeTeamId === career.selectedTeamId ? m.awayTeamId : m.homeTeamId;
                const opp = INTERNATIONAL_TEAMS.find((t) => t.id === oppId);
                return (
                  <div
                    key={m.id}
                    className="p-2 rounded bg-[#151d29] border border-[#1e293b] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#10243d] text-emerald-400 border border-emerald-900/40">
                        {m.format}
                      </span>
                      <span className="font-semibold text-white">
                        vs {opp?.name || oppId}
                      </span>
                    </div>
                    <div className="text-right font-mono text-[11px]">
                      <span className="text-slate-300">{m.date}</span>
                      <span className="text-slate-500 mx-1">•</span>
                      <span className="text-slate-400">{m.venue?.split(',')[0]}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Results (Last 5 with Scorecard inspection) */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-4">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5 mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" /> Recent Results
              </span>
              <div className="flex items-center bg-[#151d29] p-0.5 rounded border border-[#1e293b] text-[10px]">
                <button
                  onClick={() => setResultsFilter('USER')}
                  className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                    resultsFilter === 'USER'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  My Team
                </button>
                <button
                  onClick={() => setResultsFilter('ALL')}
                  className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                    resultsFilter === 'ALL'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  World
                </button>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Click for Scorecard</span>
          </div>

          <div className="space-y-1.5">
            {displayedResults.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No completed matches found.</p>
            ) : (
              displayedResults.map((m) => (
                <div
                  key={m.id}
                  onClick={() => onInspectScorecard(m)}
                  className="p-2 rounded bg-[#151d29] hover:bg-[#1a2538] border border-[#1e293b] flex items-center justify-between text-xs cursor-pointer transition group"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">
                        {m.homeTeamId} vs {m.awayTeamId}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">
                        {m.format}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
                      {m.resultText || 'Match finished'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-400 block">{m.date}</span>
                    <span className="text-[10px] text-emerald-400 group-hover:underline">View →</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 6. News & Notifications Wire */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-4">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Newspaper className="w-3.5 h-3.5 text-sky-400" /> News &amp; Notification Feed
          </span>
          <button
            onClick={onNavigateToNews}
            className="text-[11px] text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
          >
            All News →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(career.news || []).slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="bg-[#151d29] border border-[#1e293b] p-3 rounded space-y-1 text-xs"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="text-emerald-400 uppercase font-semibold">
                  {item.category.replace('_', ' ')}
                </span>
                <span>{item.timestamp}</span>
              </div>
              <h4 className="font-bold text-white leading-snug">{item.title}</h4>
              <p className="text-[11px] text-slate-400 line-clamp-2">{item.summary}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
