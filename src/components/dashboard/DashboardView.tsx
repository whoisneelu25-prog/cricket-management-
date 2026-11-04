import React from 'react';
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
}) => {
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

  // Live Team Rankings for user's country
  const getLiveRank = (fmt: 'TEST' | 'ODI' | 'T20I') => {
    const liveRank = career.teamRankings?.[career.selectedTeamId]?.worldRankings?.[fmt];
    if (liveRank) return liveRank;
    return team?.worldRankings[fmt] || '-';
  };

  // Format Captains
  const testCaptain =
    squad.find((p) => p.id === career.formatSquads?.TEST?.captainId) || squad[0];
  const odiCaptain =
    squad.find((p) => p.id === career.formatSquads?.ODI?.captainId) || squad[0];
  const t20Captain =
    squad.find((p) => p.id === career.formatSquads?.T20I?.captainId) || squad[0];

  // Squad availability & injuries
  const injuredPlayers = squad.filter((p) => p.isInjured);
  const fatiguedPlayers = squad.filter((p) => (p.workloadFatigue || 0) >= 65 && !p.isInjured);
  const fitCount = squad.length - injuredPlayers.length;

  // User's active or upcoming tour requiring squad announcement
  const userTours = (career.tours || []).filter(
    (t) =>
      (t.hostTeamId === career.selectedTeamId || t.visitingTeamId === career.selectedTeamId) &&
      t.status !== 'COMPLETED'
  );
  const activeTour = userTours[0];

  // Active tournament involving user (or current major tournament)
  const activeTournament =
    nextInfo.activeTournament ||
    (career.tournamentEditions || []).find(
      (t) =>
        t.status === 'IN_PROGRESS' &&
        t.table.some((r) => r.teamId === career.selectedTeamId)
    ) ||
    career.tournamentEditions?.[0];

  const tournamentPreviewRows = activeTournament
    ? sortTournamentTable(activeTournament.table, Boolean(activeTournament.rules.usePCT)).slice(0, 4)
    : [];

  // Recent User Results + Recent World AI Results
  const recentUserResults = [...(career.fixtures || [])]
    .filter((f) => isTerminalMatchStatus(f.status))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 3);

  const recentWorldResults = [...(career.worldFixtures || [])]
    .filter((f) => isTerminalMatchStatus(f.status))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 5);

  const currentSeasonYear = (career.currentDate || '2026-11-15').slice(0, 4);

  return (
    <div className="space-y-5 select-none animate-in fade-in duration-150">
      {/* 1. Controlled Calendar Advancement Bar (Phase 10) */}
      <div className="bg-gradient-to-r from-[#0e1729] via-[#132038] to-[#0e1729] border border-[#243552] rounded-xl p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#09101d] border border-emerald-800/50 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">
                Career Date • Season {currentSeasonYear}
              </span>
              <span className="text-sm font-black font-mono text-white">
                {career.currentDate}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-300">
            <span className="text-emerald-400 font-bold">Single-Country Control:</span> Managing{' '}
            <strong className="text-white">{team?.name}</strong> •{' '}
            <span className="text-slate-400">
              {Object.keys(career.aiTeams || {}).length} AI National Boards Active
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onAdvanceCalendar('ONE_DAY')}
            className="bg-[#18253d] hover:bg-[#223454] text-slate-200 border border-[#2c4066] text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
          >
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>+1 Day</span>
          </button>

          <button
            onClick={() => onAdvanceCalendar('ONE_WEEK')}
            className="bg-[#18253d] hover:bg-[#223454] text-slate-200 border border-[#2c4066] text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
          >
            <FastForward className="w-3.5 h-3.5 text-sky-400" />
            <span>+1 Week</span>
          </button>

          <button
            onClick={() => onAdvanceCalendar('NEXT_EVENT')}
            className="bg-[#18253d] hover:bg-[#223454] text-amber-300 border border-amber-700/50 text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Next Event</span>
          </button>

          <button
            onClick={() => onAdvanceCalendar('NEXT_MATCH')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow transition cursor-pointer flex items-center gap-1"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>Advance to Next Match</span>
          </button>

          {onRestSquadDay && (
            <button
              onClick={onRestSquadDay}
              title="Advance 1 day with dedicated recovery (-15% fatigue)"
              className="bg-[#142236] hover:bg-[#1c304c] text-emerald-300 border border-emerald-800/50 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition cursor-pointer"
            >
              Rest (-15% Fat)
            </button>
          )}
        </div>
      </div>

      {/* Calendar Decision Pause Alert Toast */}
      {calendarAlert && calendarAlert.pausedReason !== 'TARGET_REACHED' && (
        <div className="bg-amber-950/60 border border-amber-600/60 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-black uppercase text-amber-300 tracking-wider mr-2">
                Calendar Paused — {calendarAlert.pausedReason.replace(/_/g, ' ')}:
              </span>
              <span className="text-slate-200">{calendarAlert.pausedMessage}</span>
              {calendarAlert.simulatedMatches.length > 0 && (
                <span className="text-emerald-400 font-mono ml-2">
                  ({calendarAlert.simulatedMatches.length} global matches simulated)
                </span>
              )}
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
            {calendarAlert.pausedReason === 'INJURY_IN_XI' && (
              <button
                onClick={onNavigateToSquad}
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-3 py-1 rounded cursor-pointer"
              >
                Replace Injured Player
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

      {/* 2. Top Banner: Head Coach Profile & Live ICC Rankings */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-15 h-15 rounded-xl bg-[#182234] border border-[#243247] flex items-center justify-center text-4xl shadow-md">
            {team?.flagEmoji || '🏏'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-wide">{team?.name}</h1>
              <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800/50 font-mono px-2 py-0.5 rounded font-bold">
                {team?.code} • MANAGED NATION
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Head Coach: <span className="text-slate-200 font-bold">{career.manager.name}</span> • Record:{' '}
              <span className="text-white font-mono font-bold">
                {career.manager.matchesManaged}P {career.manager.matchesWon}W {career.manager.matchesLost}L {career.manager.matchesDrawn}D
              </span>{' '}
              • Board Confidence: <span className="text-emerald-400 font-bold">{career.manager.boardConfidence}%</span>
            </p>
          </div>
        </div>

        {/* Live ICC Rankings */}
        <div className="flex items-center space-x-2 sm:space-x-3 bg-[#182234] border border-[#243247] p-2.5 rounded-lg">
          <div className="text-center px-2.5 border-r border-[#243247]">
            <span className="text-[10px] uppercase text-slate-400 block font-semibold">Test Rank</span>
            <span className="text-base font-bold font-mono text-emerald-400">#{getLiveRank('TEST')}</span>
          </div>
          <div className="text-center px-2.5 border-r border-[#243247]">
            <span className="text-[10px] uppercase text-slate-400 block font-semibold">ODI Rank</span>
            <span className="text-base font-bold font-mono text-sky-400">#{getLiveRank('ODI')}</span>
          </div>
          <div className="text-center px-2.5">
            <span className="text-[10px] uppercase text-slate-400 block font-semibold">T20I Rank</span>
            <span className="text-base font-bold font-mono text-emerald-400">#{getLiveRank('T20I')}</span>
          </div>
        </div>
      </div>

      {/* 3. Prominent NEXT MATCH Hero Card (Phase 6) + Squad Availability & Tour Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Next Match Card (8 columns) */}
        <div className="lg:col-span-8 bg-[#121824] border border-[#22324d] rounded-xl p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex flex-wrap items-center justify-between border-b border-[#1f293d] pb-3 mb-4 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Next International Commitment
                </span>
                {nextMatch && (
                  <span className="text-[11px] font-bold bg-sky-950 text-sky-300 border border-sky-800/50 px-2 py-0.5 rounded font-mono">
                    {nextInfo.locationLabel}
                  </span>
                )}
                {nextMatch?.lineupConfirmed && (
                  <span className="text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> READY
                  </span>
                )}
              </div>

              {nextMatch && (
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded font-bold">
                    {nextMatch.format}
                  </span>
                  <span className="bg-[#182234] text-amber-300 border border-[#243247] px-2.5 py-0.5 rounded font-bold">
                    {nextInfo.daysRemaining === 0
                      ? 'MATCH DAY TODAY'
                      : `${nextInfo.daysRemaining} Day${nextInfo.daysRemaining === 1 ? '' : 's'} Remaining`}
                  </span>
                </div>
              )}
            </div>

            {nextMatch ? (
              <div className="space-y-4">
                {/* Teams Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#162033] border border-[#263754] p-4 rounded-xl gap-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-4xl">{team?.flagEmoji}</span>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                        Your Nation ({userIsHome ? 'Home' : 'Away'})
                      </span>
                      <h3 className="text-lg font-black text-white">{team?.name}</h3>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="text-xs font-mono font-bold text-slate-300 bg-[#0d1422] px-3 py-1 rounded border border-[#263754]">
                      {nextMatch.matchNumber ? `MATCH ${nextMatch.matchNumber}` : nextMatch.stage || 'VS'}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-mono block mt-1.5 font-semibold">
                      {nextInfo.seriesScoreText}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 sm:text-right justify-end">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                        Opponent ({userIsHome ? 'Visitor' : 'Host'})
                      </span>
                      <h3 className="text-lg font-black text-white">
                        {opponent?.name || oppTeamId}
                      </h3>
                    </div>
                    <span className="text-4xl">{opponent?.flagEmoji || '🏏'}</span>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-[#182234] p-2.5 rounded-lg border border-[#243247]">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                      Series / Competition
                    </span>
                    <span className="text-white font-bold truncate block mt-0.5">
                      {nextMatch.seriesName || 'International Bilateral'}
                    </span>
                  </div>
                  <div className="bg-[#182234] p-2.5 rounded-lg border border-[#243247]">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                      Stadium Venue
                    </span>
                    <span className="text-white font-medium truncate block mt-0.5">
                      {nextMatch.venue}
                    </span>
                  </div>
                  <div className="bg-[#182234] p-2.5 rounded-lg border border-[#243247]">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                      Scheduled Date
                    </span>
                    <span className="text-emerald-300 font-mono font-bold block mt-0.5">
                      {nextMatch.date}
                    </span>
                  </div>
                  <div className="bg-[#182234] p-2.5 rounded-lg border border-[#243247]">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                      Match Lifecycle
                    </span>
                    <span className="text-sky-300 font-mono font-bold block mt-0.5">
                      {nextMatch.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#162033] border border-[#243247] rounded-xl p-6 text-center space-y-2">
                <h3 className="text-sm font-bold text-white">
                  Current Window Clear — International Off-Season / Preparation Period
                </h3>
                <p className="text-xs text-slate-400 max-w-lg mx-auto">
                  All immediate fixtures for {team?.name} are complete. Use the Calendar Advancement controls above to advance into the next international season and automatically generate upcoming tours and ICC tournaments.
                </p>
              </div>
            )}
          </div>

          {/* Next Match Action Footer */}
          <div className="mt-5 pt-4 border-t border-[#1f293d] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={onNavigateToSquad}
                className="text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer font-semibold"
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>National Squads ({fitCount}/{squad.length} Fit)</span>
              </button>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 font-mono text-[11px]">
                Captains: {testCaptain?.shortName} (Test) / {odiCaptain?.shortName} (ODI) / {t20Captain?.shortName} (T20I)
              </span>
            </div>

            {nextMatch && (
              <div className="flex flex-wrap items-center gap-2.5">
                {nextMatch.status === 'IN_PROGRESS' ? (
                  <button
                    onClick={() => onNavigateToMatch(nextMatch.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-lg transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume Match in Progress</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onOpenMatchPreparation(nextMatch.id)}
                      className="bg-sky-600 hover:bg-sky-500 text-white font-black text-xs px-4 py-2.5 rounded-lg shadow transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>PREPARE FOR NEXT MATCH</span>
                    </button>

                    {nextInfo.daysRemaining === 0 && (
                      <button
                        onClick={() => onNavigateToMatch(nextMatch.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2.5 rounded-lg shadow transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>PLAY MATCH NOW</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Squad Availability, Injuries & Upcoming Tour Announcements */}
        <div className="lg:col-span-4 space-y-4">
          {/* Tour & Squad Deadline Card */}
          {activeTour && (
            <div className="bg-[#121824] border border-[#1f293d] rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" /> Upcoming / Active Tour
                </span>
                <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800/50 px-1.5 py-0.5 rounded font-mono font-bold">
                  {activeTour.status}
                </span>
              </div>
              <h3 className="text-sm font-black text-white">{activeTour.name}</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {activeTour.startDate} → {activeTour.endDate} • Deadline: {activeTour.squadSelectionDeadline}
              </p>

              <div className="bg-[#182234] p-2.5 rounded-lg border border-[#243247] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Touring Party</span>
                  <span className="text-white font-bold font-mono">
                    {activeTour.squadAnnounced
                      ? `${activeTour.tourSquadIds.length} Players Confirmed`
                      : 'Awaiting Announcement'}
                  </span>
                </div>
                {onOpenTourSelection && (
                  <button
                    onClick={() => onOpenTourSelection(activeTour.id)}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded cursor-pointer"
                  >
                    {activeTour.squadAnnounced ? 'Review' : 'Announce'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Medical & Workload Availability Card */}
          <div className="bg-[#121824] border border-[#1f293d] rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" /> Medical &amp; Availability Report
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {fitCount} Fit / {injuredPlayers.length} Injured
              </span>
            </div>

            {injuredPlayers.length > 0 ? (
              <div className="space-y-1.5">
                {injuredPlayers.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => onSelectPlayer(p)}
                    className="bg-rose-950/30 border border-rose-900/50 px-2.5 py-1.5 rounded flex items-center justify-between text-xs cursor-pointer"
                  >
                    <span className="font-bold text-rose-200">{p.shortName}</span>
                    <span className="text-[10px] font-mono text-rose-300">
                      {p.injuryType || 'Injured'} ({p.injuryDaysRemaining}d)
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-400 font-medium">
                ✓ Full national selection pool fit and available.
              </p>
            )}

            {fatiguedPlayers.length > 0 && (
              <p className="text-[11px] text-amber-300 font-mono">
                Workload Watch: {fatiguedPlayers.slice(0, 3).map((p) => `${p.shortName} (${p.workloadFatigue}%)`).join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 4. Bottom 3-Column Live World Grid: Recent Results (Clickable Scorecards) | Active Tournament | Live Global News */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* World & User Recent Results */}
        <div className="bg-[#121824] border border-[#1f293d] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Recent International Results
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Click for Scorecard</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {[...recentUserResults, ...recentWorldResults].slice(0, 6).map((m) => (
              <div
                key={m.id}
                onClick={() => onInspectScorecard(m)}
                className="bg-[#182234] hover:bg-[#213049] border border-[#243247] p-2.5 rounded-lg text-xs cursor-pointer transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span>{m.homeTeamId} vs {m.awayTeamId}</span>
                    {m.isUserMatch && (
                      <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1 rounded border border-emerald-800/50">
                        MY TEAM
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">{m.format} • {m.date}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[11px] text-slate-300 truncate pr-2">
                    {m.resultText || 'Match completed'}
                  </p>
                  <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 shrink-0" />
                </div>
              </div>
            ))}

            {recentUserResults.length === 0 && recentWorldResults.length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">
                No completed matches yet on {career.currentDate}. Advance the calendar to watch global fixtures unfold.
              </p>
            )}
          </div>
        </div>

        {/* Active Tournament Standings Snapshot */}
        <div className="bg-[#121824] border border-[#1f293d] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> {activeTournament?.name || 'ICC Championship'}
            </span>
            {onNavigateToTournaments && (
              <button
                onClick={onNavigateToTournaments}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-bold cursor-pointer"
              >
                Full Table →
              </button>
            )}
          </div>

          {activeTournament && tournamentPreviewRows.length > 0 ? (
            <div className="divide-y divide-[#1f293d] border border-[#243247] rounded-lg overflow-hidden text-xs font-mono">
              {tournamentPreviewRows.map((row, idx) => (
                <div
                  key={row.teamId}
                  className={`px-3 py-2 flex items-center justify-between ${
                    row.teamId === career.selectedTeamId ? 'bg-emerald-950/30' : 'bg-[#182234]'
                  }`}
                >
                  <div className="font-sans">
                    <span className="font-mono text-slate-400 mr-2">#{idx + 1}</span>
                    <span className="font-bold text-white">{row.teamName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 mr-2">{row.played}P</span>
                    <span className="text-emerald-400 font-bold">
                      {activeTournament.rules.usePCT
                        ? `${row.pointsPercentage || 0}%`
                        : `${row.points} pts`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">
              Tournament standings update automatically from live match results.
            </p>
          )}
        </div>

        {/* Important Global Cricket News */}
        <div className="bg-[#121824] border border-[#1f293d] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Newspaper className="w-3.5 h-3.5" /> World Cricket Wire
            </span>
            <button
              onClick={onNavigateToNews}
              className="text-[11px] text-sky-400 hover:text-sky-300 font-bold cursor-pointer"
            >
              All News →
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {(career.news || []).slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="bg-[#182234] border border-[#243247] p-2.5 rounded-lg space-y-1 text-xs"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="text-emerald-400 uppercase">{item.category.replace('_', ' ')}</span>
                  <span>{item.timestamp}</span>
                </div>
                <h4 className="font-bold text-white leading-snug">{item.title}</h4>
                <p className="text-[11px] text-slate-400 line-clamp-2">{item.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
