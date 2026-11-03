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
  Flame,
  CheckCircle2,
  Users,
  FastForward,
  Globe,
  Briefcase
} from 'lucide-react';
import { CareerSave, Player } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { ALL_PLAYERS, getPlayersByCountry } from '../../data/squads';

interface DashboardViewProps {
  career: CareerSave;
  onNavigateToMatch: (matchId: string) => void;
  onNavigateToSquad: () => void;
  onNavigateToNews: () => void;
  onSelectPlayer: (player: Player) => void;
  onAdvanceToNextMatch?: () => void;
  onRestSquadDay?: () => void;
  onOpenTourSelection?: (tourId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  career,
  onNavigateToMatch,
  onNavigateToSquad,
  onNavigateToNews,
  onSelectPlayer,
  onAdvanceToNextMatch,
  onRestSquadDay,
  onOpenTourSelection,
}) => {
  const team = INTERNATIONAL_TEAMS.find((t) => t.id === career.selectedTeamId);
  const squad = getPlayersByCountry(career.selectedTeamId);
  const nextMatch = career.fixtures.find((f) => f.status !== 'COMPLETED');
  const opponent = nextMatch
    ? INTERNATIONAL_TEAMS.find((t) => t.id === (nextMatch.homeTeamId === career.selectedTeamId ? nextMatch.awayTeamId : nextMatch.homeTeamId))
    : null;

  // Format Captains
  const testConfig = career.formatSquads?.TEST;
  const odiConfig = career.formatSquads?.ODI;
  const t20Config = career.formatSquads?.T20I;

  const testCaptain = squad.find((p) => p.id === testConfig?.captainId) || squad[0];
  const odiCaptain = squad.find((p) => p.id === odiConfig?.captainId) || squad[0];
  const t20Captain = squad.find((p) => p.id === t20Config?.captainId) || squad[0];

  // Active or upcoming tour
  const activeTour = career.tours?.find((t) => t.status === 'IN_PROGRESS' || t.status === 'UPCOMING') || career.tours?.[0];

  // Completed world fixtures
  const recentWorldResults = (career.worldFixtures || [])
    .filter((f) => f.status === 'COMPLETED')
    .slice(0, 3);

  // Key performers
  const keyPlayers = squad.slice(0, 4);

  return (
    <div className="space-y-5 select-none animate-in fade-in duration-150">
      {/* Top Banner: Unified Head Coach & Board Profile */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-lg bg-[#182234] border border-[#243247] flex items-center justify-center text-4xl shadow-md">
            {team?.flagEmoji || '🏏'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-white tracking-wide">{team?.name}</h1>
              <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800/50 font-mono px-2 py-0.5 rounded font-bold">
                {team?.code}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Head Coach: <span className="text-slate-200 font-bold">{career.manager.name}</span> • Style: <span className="text-emerald-400 font-medium">{career.manager.managementStyle}</span> • Board Confidence: <span className="text-amber-400 font-bold">{career.manager.boardConfidence}%</span>
            </p>
          </div>
        </div>

        {/* Global ICC Rankings */}
        <div className="flex items-center space-x-2 sm:space-x-3 bg-[#182234] border border-[#243247] p-2.5 rounded-md">
          <div className="text-center px-2 border-r border-[#243247]">
            <span className="text-[10px] uppercase text-slate-400 block font-semibold">Test</span>
            <span className="text-base font-bold font-mono text-emerald-400">#{team?.worldRankings.TEST}</span>
          </div>
          <div className="text-center px-2 border-r border-[#243247]">
            <span className="text-[10px] uppercase text-slate-400 block font-semibold">ODI</span>
            <span className="text-base font-bold font-mono text-emerald-400">#{team?.worldRankings.ODI}</span>
          </div>
          <div className="text-center px-2">
            <span className="text-[10px] uppercase text-slate-400 block font-semibold">T20I</span>
            <span className="text-base font-bold font-mono text-emerald-400">#{team?.worldRankings.T20I}</span>
          </div>
        </div>
      </div>

      {/* 3 Format Captains Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={() => testCaptain && onSelectPlayer(testCaptain)}
          className="bg-[#121824] border border-[#1f293d] hover:border-amber-500/60 p-3 rounded-lg flex items-center justify-between cursor-pointer transition"
        >
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              🔴 Test Captain
            </span>
            <span className="text-sm font-bold text-white block mt-0.5">{testCaptain?.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">Rating: {testCaptain?.testRating}</span>
          </div>
          <Shield className="w-5 h-5 text-amber-400/60" />
        </div>

        <div
          onClick={() => odiCaptain && onSelectPlayer(odiCaptain)}
          className="bg-[#121824] border border-[#1f293d] hover:border-sky-500/60 p-3 rounded-lg flex items-center justify-between cursor-pointer transition"
        >
          <div>
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
              ⚪ ODI Captain
            </span>
            <span className="text-sm font-bold text-white block mt-0.5">{odiCaptain?.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">Rating: {odiCaptain?.odiRating}</span>
          </div>
          <Shield className="w-5 h-5 text-sky-400/60" />
        </div>

        <div
          onClick={() => t20Captain && onSelectPlayer(t20Captain)}
          className="bg-[#121824] border border-[#1f293d] hover:border-emerald-500/60 p-3 rounded-lg flex items-center justify-between cursor-pointer transition"
        >
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
              🔵 T20I Captain
            </span>
            <span className="text-sm font-bold text-white block mt-0.5">{t20Captain?.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">Rating: {t20Captain?.t20Rating}</span>
          </div>
          <Shield className="w-5 h-5 text-emerald-400/60" />
        </div>
      </div>

      {/* Grid: Next Fixture Showcase + Active Tour Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Next Match Showcase Card (2 columns) */}
        <div className="lg:col-span-2 bg-[#121824] border border-[#1f293d] rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1f293d] pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Next Official Fixture</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-[#182234] text-slate-300 border border-[#243247] px-2 py-0.5 rounded font-mono">
                  {nextMatch ? nextMatch.format : 'OFF-SEASON'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {nextMatch?.date || career.currentDate}
                </span>
              </div>
            </div>

            {nextMatch ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-[#182234] border border-[#243247] p-4 rounded-lg">
                  {/* Home Team */}
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">
                      {INTERNATIONAL_TEAMS.find((t) => t.id === nextMatch.homeTeamId)?.flagEmoji}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {INTERNATIONAL_TEAMS.find((t) => t.id === nextMatch.homeTeamId)?.name}
                      </h3>
                      <span className="text-xs text-slate-400 font-mono">Home</span>
                    </div>
                  </div>

                  <span className="text-lg font-black text-slate-500 px-3">VS</span>

                  {/* Away Team */}
                  <div className="flex items-center space-x-3 text-right">
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {INTERNATIONAL_TEAMS.find((t) => t.id === nextMatch.awayTeamId)?.name}
                      </h3>
                      <span className="text-xs text-slate-400 font-mono">Visitor</span>
                    </div>
                    <span className="text-3xl">
                      {INTERNATIONAL_TEAMS.find((t) => t.id === nextMatch.awayTeamId)?.flagEmoji}
                    </span>
                  </div>
                </div>

                {/* Match Venue & Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-[#182234] p-2.5 rounded border border-[#243247]">
                    <span className="text-[10px] text-slate-400 block font-semibold">Venue</span>
                    <span className="text-white font-medium truncate block">{nextMatch.venue}</span>
                  </div>
                  <div className="bg-[#182234] p-2.5 rounded border border-[#243247]">
                    <span className="text-[10px] text-slate-400 block font-semibold">Pitch</span>
                    <span className="text-white font-medium truncate block">{nextMatch.pitch.name}</span>
                  </div>
                  <div className="bg-[#182234] p-2.5 rounded border border-[#243247]">
                    <span className="text-[10px] text-slate-400 block font-semibold">Weather</span>
                    <span className="text-white font-medium truncate block">{nextMatch.weather.description}</span>
                  </div>
                  <div className="bg-[#182234] p-2.5 rounded border border-[#243247]">
                    <span className="text-[10px] text-slate-400 block font-semibold">Status</span>
                    <span className="text-emerald-400 font-medium font-mono">{nextMatch.status}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                No upcoming fixtures scheduled for current season.
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-[#1f293d] flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={onNavigateToSquad}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Review Format Lineup</span>
            </button>

            <div className="flex items-center space-x-2">
              {onRestSquadDay && (
                <button
                  onClick={onRestSquadDay}
                  title="Advance 1 calendar day to reduce squad fatigue by 15% and simulate world matches"
                  className="bg-[#182234] hover:bg-[#202d42] text-slate-300 border border-[#243247] text-xs font-semibold px-3 py-2 rounded transition cursor-pointer flex items-center space-x-1.5"
                >
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  <span>Rest Day (-15% Fatigue)</span>
                </button>
              )}

              {onAdvanceToNextMatch && (
                <button
                  onClick={onAdvanceToNextMatch}
                  className="bg-[#182234] hover:bg-[#202d42] text-slate-200 border border-[#243247] text-xs font-bold px-3 py-2 rounded transition cursor-pointer flex items-center space-x-1.5"
                >
                  <FastForward className="w-3.5 h-3.5 text-amber-400" />
                  <span>Simulate Ahead</span>
                </button>
              )}

              {nextMatch && (
                <button
                  onClick={() => onNavigateToMatch(nextMatch.id)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2 rounded shadow transition cursor-pointer flex items-center space-x-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Take the Field</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Tour Card & World Cricket Feed */}
        <div className="space-y-4">
          {/* Active Tour Card */}
          {activeTour && (
            <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  Active International Tour
                </span>
                <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.5 rounded font-mono font-bold">
                  {activeTour.status}
                </span>
              </div>
              <h3 className="text-sm font-black text-white">{activeTour.name}</h3>
              <p className="text-xs text-slate-400 font-mono">
                Duration: {activeTour.startDate} to {activeTour.endDate}
              </p>

              <div className="bg-[#182234] p-2.5 rounded border border-[#243247] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Tour Squad</span>
                  <span className="text-white font-bold font-mono">
                    {activeTour.squadAnnounced ? `${activeTour.tourSquadIds.length} Players Confirmed` : 'Pending Selection'}
                  </span>
                </div>
                {onOpenTourSelection && (
                  <button
                    onClick={() => onOpenTourSelection(activeTour.id)}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded cursor-pointer"
                  >
                    {activeTour.squadAnnounced ? 'Modify' : 'Announce'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* World Matches Ticker */}
          <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center space-x-1">
                <Globe className="w-3.5 h-3.5" />
                <span>World Cricket Results</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Simulated</span>
            </div>

            {recentWorldResults.length > 0 ? (
              <div className="space-y-2">
                {recentWorldResults.map((wm) => (
                  <div key={wm.id} className="bg-[#182234] p-2 rounded border border-[#243247] text-xs">
                    <div className="flex items-center justify-between text-slate-300 font-bold">
                      <span>{wm.homeTeamId} vs {wm.awayTeamId}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">{wm.format}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {wm.resultText || 'Match concluded'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">
                Advance calendar dates to simulate world matches between other nations.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
