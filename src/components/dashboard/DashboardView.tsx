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
  Clock,
  Sliders,
  TrendingDown,
  Minus,
  MapPin,
  Flame,
} from 'lucide-react';
import { CareerSave, Match, Player } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { getEffectivePlayersByCountry } from '../../data/squads';
import { getNextUserMatchInfo } from '../../store/careerStore';
import { CalendarAdvanceMode, CalendarAdvancementResult } from '../../engine/worldSimulation';
import { isTerminalMatchStatus } from '../../engine/matchEngine';
import { CountryFlag } from '../common/CountryFlag';

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
      m.winnerTeamId === career.selectedTeamId ||
      (m.resultText && m.resultText.toLowerCase().includes(team?.name?.toLowerCase() || ''));
    const isTieOrDraw = m.status === 'DRAW' || m.status === 'TIE';
    if (isWin) return { text: 'W', bg: 'bg-[#3fca86] text-[#070a0e] font-black' };
    if (isTieOrDraw) return { text: 'D', bg: 'bg-[#8fb2d9] text-[#070a0e] font-bold' };
    return { text: 'L', bg: 'bg-[#ff5470] text-white font-black' };
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

  // Stadium image for hero backdrop
  const stadiumImage =
    nextMatch?.format === 'TEST'
      ? '/assets/stadiums/jaitley-day.jpg'
      : '/assets/stadiums/chepauk-night.jpg';

  return (
    <div className="space-y-5 select-none pb-10 text-[#e8edf2] max-w-7xl mx-auto">
      {/* 1. Calendar Advancement Control Bar */}
      <div className="bg-[#070a0e] border border-[#1e2733] rounded-xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="bg-[#10151c] border border-[#e2b64a]/30 px-3 py-1.5 rounded-lg flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-[#e2b64a]" />
            <div>
              <span className="text-[9.5px] uppercase font-extrabold tracking-widest text-[#8b97a3] block font-display leading-tight">
                Current Date
              </span>
              <span className="text-sm font-bold font-mono text-white">
                {career.currentDate}
              </span>
            </div>
          </div>
          <div className="text-xs text-[#8b97a3]">
            Managing <strong className="text-white font-display">{team?.name}</strong> •{' '}
            <span className="text-[#e2b64a] font-semibold">2026/27 International Cycle</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onAdvanceCalendar('ONE_DAY')}
            className="bg-[#10151c] hover:bg-[#151d29] text-[#c3ccd6] hover:text-white border border-[#1e2733] hover:border-[#33404f] text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-[#8b97a3]" />
            <span>+1 Day</span>
          </button>
          <button
            onClick={() => onAdvanceCalendar('ONE_WEEK')}
            className="bg-[#10151c] hover:bg-[#151d29] text-[#c3ccd6] hover:text-white border border-[#1e2733] hover:border-[#33404f] text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
          >
            <FastForward className="w-3.5 h-3.5 text-[#8b97a3]" />
            <span>+1 Week</span>
          </button>
          <button
            onClick={() => onAdvanceCalendar('NEXT_EVENT')}
            className="bg-[#10151c] hover:bg-[#151d29] text-[#ffe9a8] border border-[#e2b64a]/40 text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-[#e2b64a]" />
            <span>Next Event</span>
          </button>
          <button
            onClick={() => onAdvanceCalendar('NEXT_MATCH')}
            className="btn-gold text-xs px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <FastForward className="w-3.5 h-3.5 fill-current" />
            <span>Simulate to Next Match</span>
          </button>

          {onRestSquadDay && (
            <button
              onClick={onRestSquadDay}
              title="Rest squad (-15% fatigue)"
              className="bg-[#10151c] hover:bg-[#151d29] text-[#3fca86] border border-[#3fca86]/40 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition cursor-pointer"
            >
              Rest Squad
            </button>
          )}
        </div>
      </div>

      {/* Calendar Alert Toast */}
      {calendarAlert && calendarAlert.pausedReason !== 'TARGET_REACHED' && (
        <div className="bg-[#10151c] border-2 border-[#e2b64a] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#e2b64a] shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-extrabold uppercase text-[#ffe9a8] tracking-widest font-display mr-2">
                Managerial Action Required — {calendarAlert.pausedReason.replace(/_/g, ' ')}:
              </span>
              <span className="text-[#e8edf2] font-medium">{calendarAlert.pausedMessage}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {calendarAlert.pausedReason === 'TOUR_SQUAD_DEADLINE' &&
              calendarAlert.targetTourId &&
              onOpenTourSelection && (
                <button
                  onClick={() => onOpenTourSelection(calendarAlert.targetTourId!)}
                  className="btn-gold text-xs px-3.5 py-1.5 rounded-lg cursor-pointer"
                >
                  Select Tour Squad
                </button>
              )}
            {calendarAlert.pausedReason === 'USER_MATCH_TODAY' &&
              calendarAlert.targetMatchId && (
                <button
                  onClick={() => onOpenMatchPreparation(calendarAlert.targetMatchId!)}
                  className="btn-gold text-xs px-3.5 py-1.5 rounded-lg cursor-pointer"
                >
                  Prepare Match XI
                </button>
              )}
            {onDismissCalendarAlert && (
              <button
                onClick={onDismissCalendarAlert}
                className="text-[#8b97a3] hover:text-white text-xs px-2.5 py-1.5 rounded hover:bg-[#1e2733] cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. PROMINENT NEXT INTERNATIONAL MATCH HERO STAGE */}
      <div className="relative rounded-2xl overflow-hidden border border-[#1e2733] shadow-2xl bg-[#070a0e]">
        {/* Stadium Background Photo with Scrim Gradients */}
        <div className="absolute inset-0 z-0">
          <img
            src={stadiumImage}
            alt="Stadium Atmosphere"
            className="w-full h-full object-cover object-center filter brightness-[0.45] saturate-[0.85] contrast-[1.1]"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          {/* Dual wash scrims inspired by .v2-mt-wash-a / .v2-mt-wash-b */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#000000] via-[#000000]/85 to-[#000000]/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070a0e] via-transparent to-[#000000]/70" />
        </div>

        {/* Content Layer */}
        <div className="relative z-10 p-5 sm:p-7 space-y-5">
          {/* Top Kicker Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2733]/80 pb-3">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e2b64a] animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#e2b64a] font-display">
                Next International Fixture
              </span>
              {nextMatch && (
                <span className="text-[10px] bg-[#2c2412] text-[#ffe9a8] border border-[#e2b64a]/50 px-2 py-0.5 rounded font-mono font-extrabold">
                  {nextMatch.format}
                </span>
              )}
              {nextMatch?.lineupConfirmed && (
                <span className="text-[10px] bg-[#0e2c1d] text-[#3fca86] border border-[#3fca86]/50 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Playing XI Ready
                </span>
              )}
            </div>

            {nextMatch && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-[#10151c]/90 text-[#ffe9a8] border border-[#e2b64a]/40 px-2.5 py-1 rounded-lg">
                  {nextInfo.daysRemaining === 0 ? 'MATCH DAY TODAY' : `${nextInfo.daysRemaining} Days Remaining`}
                </span>
              </div>
            )}
          </div>

          {nextMatch ? (
            <div className="space-y-4">
              {/* Matchup Header with Giant Typography */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
                {/* Home / User Country */}
                <div className="flex items-center space-x-4">
                  <CountryFlag
                    countryCode={team?.code || career.selectedTeamId}
                    size="lg"
                    className="border-2 border-[#1e2733] shadow-xl"
                  />
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#3fca86] font-bold block">
                      {userIsHome ? 'Host Nation' : 'Touring Nation'}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
                      {team?.name}
                    </h2>
                    <span className="text-xs text-[#8b97a3] font-mono">
                      Rating: {team?.ratingPoints[nextMatch.format] || 100} pts
                    </span>
                  </div>
                </div>

                {/* VS Badge & Series Context */}
                <div className="text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-[#10151c] border-2 border-[#e2b64a]/40 flex items-center justify-center font-display font-black text-xs text-[#ffe9a8] mx-auto shadow-lg">
                    VS
                  </div>
                  <span className="text-[11px] text-[#e2b64a] font-mono font-bold block mt-2">
                    {nextInfo.seriesScoreText || nextMatch.seriesName || 'Bilateral Series'}
                  </span>
                </div>

                {/* Away / Opponent Country */}
                <div className="flex items-center space-x-4 text-right">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#8fb2d9] font-bold block">
                      {userIsHome ? 'Opponent / Visitor' : 'Opponent / Host'}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
                      {opponent?.name || oppTeamId}
                    </h2>
                    <span className="text-xs text-[#8b97a3] font-mono">
                      Rating: {opponent?.ratingPoints[nextMatch.format] || 95} pts
                    </span>
                  </div>
                  <CountryFlag
                    countryCode={opponent?.code || oppTeamId || ''}
                    size="lg"
                    className="border-2 border-[#1e2733] shadow-xl"
                  />
                </div>
              </div>

              {/* Match Venue, Pitch & Conditions Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-[#10151c]/90 border border-[#1e2733] p-2.5 rounded-xl">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8b97a3] block font-display">
                    Venue
                  </span>
                  <span className="text-xs font-bold text-white truncate block mt-0.5">
                    {nextMatch.venue || 'International Ground'}
                  </span>
                </div>
                <div className="bg-[#10151c]/90 border border-[#1e2733] p-2.5 rounded-xl">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8b97a3] block font-display">
                    Scheduled Date
                  </span>
                  <span className="text-xs font-mono font-bold text-[#ffe9a8] block mt-0.5">
                    {nextMatch.date}
                  </span>
                </div>
                <div className="bg-[#10151c]/90 border border-[#1e2733] p-2.5 rounded-xl">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8b97a3] block font-display">
                    Pitch Conditions
                  </span>
                  <span className="text-xs font-semibold text-[#8fb2d9] block mt-0.5">
                    {typeof nextMatch.pitch === 'string' ? nextMatch.pitch : nextMatch.pitch?.name || nextMatch.pitch?.type || 'Standard'} Surface
                  </span>
                </div>
                <div className="bg-[#10151c]/90 border border-[#1e2733] p-2.5 rounded-xl">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8b97a3] block font-display">
                    Weather Outlook
                  </span>
                  <span className="text-xs font-semibold text-[#3fca86] block mt-0.5">
                    {typeof nextMatch.weather === 'string' ? nextMatch.weather : nextMatch.weather?.description || nextMatch.weather?.type || 'Clear'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-[#8b97a3] font-mono">
                  Squad Readiness: <strong className="text-white">{fitCount} Players Match-Fit</strong>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => onOpenMatchPreparation(nextMatch.id)}
                    className="bg-[#10151c] hover:bg-[#1a2330] text-[#e8edf2] hover:text-white border border-[#1e2733] hover:border-[#e2b64a]/60 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-md"
                  >
                    <Sliders className="w-4 h-4 text-[#e2b64a]" />
                    <span>Prepare Match XI & Orders</span>
                  </button>

                  {nextInfo.daysRemaining === 0 && (
                    <button
                      onClick={() => onNavigateToMatch(nextMatch.id)}
                      className="btn-gold text-xs px-5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-lg active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Take the Field (Play)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#10151c]/80 border border-[#1e2733] rounded-xl p-8 text-center text-xs text-[#8b97a3]">
              No international fixtures currently active. Advance calendar or view Tours schedule.
            </div>
          )}
        </div>
      </div>

      {/* 3. ICC RANKINGS & SQUAD HEALTH SECTION (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ICC World Rankings Status (7 Columns) */}
        <div className="lg:col-span-7 bg-[#070a0e] border border-[#1e2733] rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1e2733] pb-3 mb-4">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#e8edf2] flex items-center gap-2 font-display">
                <Trophy className="w-4 h-4 text-[#e2b64a]" /> ICC Official Team Rankings
              </span>
              {onNavigateToRankings && (
                <button
                  onClick={onNavigateToRankings}
                  className="text-[11px] text-[#e2b64a] hover:text-[#ffe9a8] font-bold cursor-pointer font-display"
                >
                  Full Tables →
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Test Ranking */}
              <div className="bg-[#10151c] border border-[#1e2733] p-3 rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8b97a3] font-display">
                    Test Cricket
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#070a0e] text-[#8fb2d9] border border-[#1e2733]">
                    {testRanking.rating} pts
                  </span>
                </div>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white font-display">
                    #{testRanking.rank}
                  </span>
                  <span className="text-xs text-[#8b97a3] font-display">in the World</span>
                </div>
                <div className="text-[10px] font-mono text-[#3fca86] flex items-center gap-1">
                  {testRanking.movement > 0 ? (
                    <>
                      <TrendingUp className="w-3 h-3" /> +{testRanking.movement} places
                    </>
                  ) : testRanking.movement < 0 ? (
                    <>
                      <TrendingDown className="w-3 h-3 text-[#ff5470]" />{' '}
                      <span className="text-[#ff5470]">{testRanking.movement}</span>
                    </>
                  ) : (
                    <>
                      <Minus className="w-3 h-3 text-[#8b97a3]" /> Stable
                    </>
                  )}
                </div>
              </div>

              {/* ODI Ranking */}
              <div className="bg-[#10151c] border border-[#1e2733] p-3 rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8b97a3] font-display">
                    One-Day Int.
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#070a0e] text-[#8fb2d9] border border-[#1e2733]">
                    {odiRanking.rating} pts
                  </span>
                </div>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white font-display">
                    #{odiRanking.rank}
                  </span>
                  <span className="text-xs text-[#8b97a3] font-display">in the World</span>
                </div>
                <div className="text-[10px] font-mono text-[#3fca86] flex items-center gap-1">
                  {odiRanking.movement > 0 ? (
                    <>
                      <TrendingUp className="w-3 h-3" /> +{odiRanking.movement} places
                    </>
                  ) : (
                    <>
                      <Minus className="w-3 h-3 text-[#8b97a3]" /> Stable
                    </>
                  )}
                </div>
              </div>

              {/* T20I Ranking */}
              <div className="bg-[#10151c] border border-[#1e2733] p-3 rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8b97a3] font-display">
                    Twenty20 Int.
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#070a0e] text-[#8fb2d9] border border-[#1e2733]">
                    {t20Ranking.rating} pts
                  </span>
                </div>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white font-display">
                    #{t20Ranking.rank}
                  </span>
                  <span className="text-xs text-[#8b97a3] font-display">in the World</span>
                </div>
                <div className="text-[10px] font-mono text-[#3fca86] flex items-center gap-1">
                  {t20Ranking.movement > 0 ? (
                    <>
                      <TrendingUp className="w-3 h-3" /> +{t20Ranking.movement} places
                    </>
                  ) : (
                    <>
                      <Minus className="w-3 h-3 text-[#8b97a3]" /> Stable
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent International Form Strip */}
          <div className="mt-4 pt-3 border-t border-[#1e2733] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8b97a3]">Recent Form (Last 5):</span>
            <div className="flex items-center space-x-1.5">
              {recentFormPills.length > 0 ? (
                recentFormPills.map((p, idx) => (
                  <span
                    key={idx}
                    className={`w-6 h-6 rounded-md text-[10px] flex items-center justify-center font-mono ${p.bg}`}
                  >
                    {p.text}
                  </span>
                ))
              ) : (
                <span className="text-xs text-[#8b97a3]">No completed fixtures</span>
              )}
            </div>
          </div>
        </div>

        {/* Squad Workload & Availability (5 Columns) */}
        <div className="lg:col-span-5 bg-[#070a0e] border border-[#1e2733] rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1e2733] pb-3 mb-4">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#e8edf2] flex items-center gap-2 font-display">
                <Users className="w-4 h-4 text-[#3fca86]" /> Squad Health & Workload
              </span>
              <button
                onClick={onNavigateToSquad}
                className="text-[11px] text-[#e2b64a] hover:text-[#ffe9a8] font-bold cursor-pointer font-display"
              >
                Squad Hub →
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="bg-[#10151c] p-2.5 rounded-xl border border-[#1e2733]">
                  <span className="text-[9.5px] text-[#8b97a3] uppercase font-extrabold tracking-wider block font-display">
                    Fit / Total
                  </span>
                  <span className="text-base font-black text-white font-mono mt-0.5 block">
                    {fitCount}/{squad.length}
                  </span>
                </div>
                <div className="bg-[#10151c] p-2.5 rounded-xl border border-[#1e2733]">
                  <span className="text-[9.5px] text-[#8b97a3] uppercase font-extrabold tracking-wider block font-display">
                    Avg Fitness
                  </span>
                  <span className="text-base font-black text-[#3fca86] font-mono mt-0.5 block">
                    {avgFitness}%
                  </span>
                </div>
                <div className="bg-[#10151c] p-2.5 rounded-xl border border-[#1e2733]">
                  <span className="text-[9.5px] text-[#8b97a3] uppercase font-extrabold tracking-wider block font-display">
                    Morale
                  </span>
                  <span className="text-base font-black text-[#8fb2d9] font-mono mt-0.5 block">
                    {teamMorale}%
                  </span>
                </div>
              </div>

              {/* Injured List */}
              <div className="bg-[#10151c] p-3 rounded-xl border border-[#1e2733]">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-[#e8edf2] font-display">Medical Room</span>
                  <span className="text-[10px] text-[#ff5470] font-mono font-bold">
                    {injuredPlayers.length} Injured
                  </span>
                </div>
                {injuredPlayers.length > 0 ? (
                  <div className="space-y-1.5 max-h-24 overflow-y-auto">
                    {injuredPlayers.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => onSelectPlayer(p)}
                        className="flex items-center justify-between text-xs bg-[#070a0e] p-2 rounded-lg border border-[#1e2733] cursor-pointer hover:border-[#ff5470]/50 transition"
                      >
                        <span className="font-bold text-white">{p.name}</span>
                        <span className="text-[10px] text-[#ff5470] font-mono">
                          {p.injuryDaysRemaining ? `${Math.ceil(p.injuryDaysRemaining / 7)}w out` : '1w out'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-[#3fca86] font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Full squad match-fit and ready for selection.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e2733] flex items-center justify-between text-xs text-[#8b97a3]">
            <span>National Pool: {squad.length} Players</span>
            <span className="font-mono text-[#ffe9a8]">All Capped</span>
          </div>
        </div>
      </div>

      {/* 4. RECENT MATCH RESULTS & UPCOMING FIXTURES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Results (7 Columns) */}
        <div className="lg:col-span-7 bg-[#070a0e] border border-[#1e2733] rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-[#1e2733] pb-3 mb-4">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#e8edf2] flex items-center gap-2 font-display">
              <Activity className="w-4 h-4 text-[#e2b64a]" /> Recent Match Results
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setResultsFilter('USER')}
                className={`text-[10px] font-bold px-2 py-0.5 rounded transition ${
                  resultsFilter === 'USER'
                    ? 'bg-[#2c2412] text-[#ffe9a8] border border-[#e2b64a]/50'
                    : 'text-[#8b97a3] hover:text-white'
                }`}
              >
                My Country
              </button>
              <button
                onClick={() => setResultsFilter('ALL')}
                className={`text-[10px] font-bold px-2 py-0.5 rounded transition ${
                  resultsFilter === 'ALL'
                    ? 'bg-[#2c2412] text-[#ffe9a8] border border-[#e2b64a]/50'
                    : 'text-[#8b97a3] hover:text-white'
                }`}
              >
                All World
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {displayedResults.length > 0 ? (
              displayedResults.map((m) => (
                <div
                  key={m.id}
                  onClick={() => onInspectScorecard(m)}
                  className="bg-[#10151c] border border-[#1e2733] hover:border-[#e2b64a]/50 rounded-xl p-3 flex items-center justify-between text-xs cursor-pointer transition shadow-sm"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-[10px] font-extrabold font-mono px-1.5 py-0.5 rounded bg-[#070a0e] text-[#8fb2d9] border border-[#1e2733]">
                      {m.format}
                    </span>
                    <div className="flex items-center space-x-2">
                      <CountryFlag countryCode={m.homeTeamId} size="xs" />
                      <span className="font-bold text-white">{m.homeTeamId}</span>
                      <span className="text-[#8b97a3] text-[11px]">vs</span>
                      <span className="font-bold text-white">{m.awayTeamId}</span>
                      <CountryFlag countryCode={m.awayTeamId} size="xs" />
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-[#e8edf2] block truncate max-w-[240px]">
                      {m.resultText || 'Match Completed'}
                    </span>
                    <span className="text-[10px] text-[#8b97a3] font-mono">{m.date}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-[#8b97a3] text-center py-6">
                No recent matches completed yet.
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Fixtures Schedule (5 Columns) */}
        <div className="lg:col-span-5 bg-[#070a0e] border border-[#1e2733] rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1e2733] pb-3 mb-4">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#e8edf2] flex items-center gap-2 font-display">
                <Calendar className="w-4 h-4 text-[#e2b64a]" /> Upcoming Fixtures
              </span>
              {onNavigateToFixtures && (
                <button
                  onClick={onNavigateToFixtures}
                  className="text-[11px] text-[#e2b64a] hover:text-[#ffe9a8] font-bold cursor-pointer font-display"
                >
                  Full Schedule →
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {upcomingFixtures.length > 0 ? (
                upcomingFixtures.map((f) => (
                  <div
                    key={f.id}
                    className="bg-[#10151c] border border-[#1e2733] rounded-xl p-2.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#070a0e] text-[#ffe9a8] border border-[#e2b64a]/30">
                        {f.format}
                      </span>
                      <div className="font-semibold text-[#e8edf2]">
                        {f.homeTeamId === career.selectedTeamId ? `vs ${f.awayTeamId}` : `@ ${f.homeTeamId}`}
                      </div>
                    </div>
                    <div className="text-right font-mono text-[11px] text-[#8fb2d9]">
                      {f.date}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-[#8b97a3] text-center py-6">
                  No upcoming bilateral fixtures scheduled.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e2733] text-right">
            <button
              onClick={onNavigateToNews}
              className="text-[11px] text-[#8b97a3] hover:text-white transition cursor-pointer"
            >
              Latest International Press & Wire →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
