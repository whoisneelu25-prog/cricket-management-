import React, { useState } from 'react';
import {
  Trophy,
  Shield,
  Calendar,
  Award,
  History,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Play,
  Flame,
  Info,
} from 'lucide-react';
import { CareerSave, Match, RivalryCompetition } from '../../types/cricket';
import { INITIAL_ASHES_COMPETITION, INITIAL_BGT_COMPETITION } from '../../data/tournamentData';
import { INTERNATIONAL_TEAMS } from '../../data/teams';

interface RivalriesViewProps {
  career: CareerSave;
  onNavigateToMatch?: (matchId: string) => void;
}

export const RivalriesView: React.FC<RivalriesViewProps> = ({ career, onNavigateToMatch }) => {
  const [activeRivalry, setActiveRivalry] = useState<'ASHES' | 'BORDER_GAVASKAR'>('ASHES');

  const ashes: RivalryCompetition = career.ashes || INITIAL_ASHES_COMPETITION;
  const bgt: RivalryCompetition = career.borderGavaskar || INITIAL_BGT_COMPETITION;

  const currentComp = activeRivalry === 'ASHES' ? ashes : bgt;
  const isAshes = activeRivalry === 'ASHES';

  const team1 = INTERNATIONAL_TEAMS.find((t) => t.id === currentComp.team1Id);
  const team2 = INTERNATIONAL_TEAMS.find((t) => t.id === currentComp.team2Id);
  const trophyHolderTeam = INTERNATIONAL_TEAMS.find((t) => t.id === currentComp.currentTrophyHolder);

  // Find all matches for this rivalry across career
  const allMatches: Match[] = [...career.fixtures, ...(career.worldFixtures || [])];
  const rivalryMatches = allMatches.filter(
    (m) =>
      m.competitionId === currentComp.id ||
      m.tourId === currentComp.currentTourId ||
      (m.format === 'TEST' &&
        ((m.homeTeamId === currentComp.team1Id && m.awayTeamId === currentComp.team2Id) ||
          (m.homeTeamId === currentComp.team2Id && m.awayTeamId === currentComp.team1Id)))
  );

  const completedMatches = rivalryMatches.filter(
    (m) => m.status === 'COMPLETED' || m.status === 'DRAW' || m.status === 'TIE'
  );
  const upcomingMatches = rivalryMatches.filter((m) => m.status === 'SCHEDULED');

  return (
    <div className="space-y-4 select-none animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            Special Test Cricket Rivalries
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Dedicated historic Test competitions featuring official trophy retention rules, historical archives, and player honours.
          </p>
        </div>

        {/* Rivalry Switcher */}
        <div className="flex items-center space-x-1.5 bg-[#182234] border border-[#243247] p-1 rounded-lg">
          <button
            onClick={() => setActiveRivalry('ASHES')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              activeRivalry === 'ASHES'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>The Ashes (AUS vs ENG)</span>
          </button>

          <button
            onClick={() => setActiveRivalry('BORDER_GAVASKAR')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              activeRivalry === 'BORDER_GAVASKAR'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Border-Gavaskar (IND vs AUS)</span>
          </button>
        </div>
      </div>

      {/* Hero Trophy Banner */}
      <div className="bg-gradient-to-r from-[#121824] via-[#182234] to-[#121824] border border-[#1f293d] rounded-lg p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/40">
                {currentComp.format} CRICKET EXCLUSIVE
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {currentComp.matchesInSeries}-Test Series • Edition {currentComp.currentEditionYear}
              </span>
            </div>

            <h3 className="text-2xl font-black text-white tracking-wide">{currentComp.name}</h3>

            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              {isAshes
                ? 'The oldest and most prestigious rivalry in cricket. Five traditional Test matches alternating between Australia and England. In the event of a drawn series (e.g. 2–2), the current trophy holder retains the urn.'
                : 'The pinnacle of Test cricket between India and Australia. Alternates hosting between India and Australia with high tactical intensity. Drawn series result in the previous champion retaining the prestigious trophy.'}
            </p>
          </div>

          {/* Current Holder Trophy Card */}
          <div className="bg-[#0b0f17]/90 border border-amber-500/30 p-4 rounded-xl text-center min-w-[220px] shadow-lg">
            <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-1 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Current Trophy Holder
            </span>
            <span className="text-base font-black text-amber-400 tracking-wider">
              {trophyHolderTeam?.name || currentComp.currentTrophyHolder}
            </span>
            <div className="mt-2 pt-2 border-t border-[#1f293d] text-[11px] text-slate-400">
              Rule: <span className="text-white font-semibold">Retains on Draw</span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Series Score & Standings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Team 1 Score */}
        <div className="bg-[#121824] border border-[#1f293d] p-5 rounded-lg text-center space-y-1">
          <span className="text-xs font-bold text-slate-400">{team1?.name}</span>
          <div className="text-4xl font-black text-white font-mono">{currentComp.currentScore.team1Wins}</div>
          <span className="text-[11px] text-emerald-400 font-semibold">Wins</span>
        </div>

        {/* Drawn & Remaining */}
        <div className="bg-[#121824] border border-[#1f293d] p-5 rounded-lg text-center space-y-1">
          <span className="text-xs font-bold text-slate-400">Drawn Tests</span>
          <div className="text-4xl font-black text-slate-300 font-mono">{currentComp.currentScore.draws}</div>
          <span className="text-[11px] text-slate-400 font-mono">
            {upcomingMatches.length} Remaining of {currentComp.matchesInSeries}
          </span>
        </div>

        {/* Team 2 Score */}
        <div className="bg-[#121824] border border-[#1f293d] p-5 rounded-lg text-center space-y-1">
          <span className="text-xs font-bold text-slate-400">{team2?.name}</span>
          <div className="text-4xl font-black text-white font-mono">{currentComp.currentScore.team2Wins}</div>
          <span className="text-[11px] text-emerald-400 font-semibold">Wins</span>
        </div>
      </div>

      {/* Series Matches and Historical Archive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Test Matches in Current Edition */}
        <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-5 space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1f293d] pb-3">
            <Calendar className="w-4 h-4 text-emerald-400" />
            Current {currentComp.matchesInSeries}-Test Series Schedule & Results
          </h4>

          {rivalryMatches.length > 0 ? (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {rivalryMatches.map((m, idx) => {
                const isCompleted = m.status === 'COMPLETED' || m.status === 'DRAW' || m.status === 'TIE';
                return (
                  <div
                    key={m.id}
                    className="bg-[#182234] border border-[#243247] p-3 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white font-mono">{m.seriesName}</span>
                        <span className="text-slate-400 font-mono text-[11px]">{m.date}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{m.venue}</span>
                      </div>
                      {isCompleted && (
                        <p className="text-emerald-400 font-medium text-[11px] mt-0.5">{m.resultText}</p>
                      )}
                    </div>

                    <div>
                      {isCompleted ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                          Finished
                        </span>
                      ) : (
                        onNavigateToMatch && (
                          <button
                            onClick={() => onNavigateToMatch(m.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-2.5 py-1 rounded transition cursor-pointer flex items-center space-x-1"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>Play</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              No Test matches scheduled for this rivalry in the immediate calendar window.
            </div>
          )}
        </div>

        {/* Historical Archive Card */}
        <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-5 space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1f293d] pb-3">
            <History className="w-4 h-4 text-amber-400" />
            Verified Historical Series Archive
          </h4>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#182234] text-slate-400 text-[11px] uppercase font-mono">
                <tr>
                  <th className="p-2.5">Edition</th>
                  <th className="p-2.5">Host</th>
                  <th className="p-2.5">Winner / Outcome</th>
                  <th className="p-2.5 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f293d]">
                {currentComp.historicalEditions.map((ed, idx) => (
                  <tr key={idx} className="hover:bg-[#182234]/60 transition">
                    <td className="p-2.5 font-bold text-white font-mono">{ed.year}</td>
                    <td className="p-2.5 text-slate-300">{ed.host}</td>
                    <td className="p-2.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-amber-300">{ed.winner}</span>
                        {ed.holderRetained && (
                          <span className="text-[9px] bg-amber-950 text-amber-400 px-1 rounded border border-amber-800/40">
                            RETAINED
                          </span>
                        )}
                      </div>
                      {ed.playerOfTheSeries && (
                        <span className="text-[10px] text-slate-400 block">POTS: {ed.playerOfTheSeries}</span>
                      )}
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-300 font-bold">{ed.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
