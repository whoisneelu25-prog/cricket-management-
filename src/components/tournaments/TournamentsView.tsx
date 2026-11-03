import React, { useState } from 'react';
import {
  Trophy,
  Award,
  Shield,
  ChevronRight,
  Calendar,
  Landmark,
  CheckCircle2,
  Play,
  Layers,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { CareerSave, Match, TournamentEdition, TournamentTableEntry } from '../../types/cricket';
import { INITIAL_TOURNAMENTS } from '../../data/tournaments';
import { INITIAL_TOURNAMENT_EDITIONS } from '../../data/tournamentData';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { sortTournamentTable } from '../../engine/tournamentEngine';

interface TournamentsViewProps {
  career?: CareerSave;
  onSelectMatch?: (matchId: string) => void;
}

export const TournamentsView: React.FC<TournamentsViewProps> = ({ career, onSelectMatch }) => {
  const tournamentEditions: TournamentEdition[] =
    career?.tournamentEditions && career.tournamentEditions.length > 0
      ? career.tournamentEditions
      : INITIAL_TOURNAMENT_EDITIONS;

  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(
    tournamentEditions[0]?.id || 'wtc_2025_27'
  );
  const [activeTabSubView, setActiveTabSubView] = useState<'STANDINGS' | 'FIXTURES' | 'HISTORY'>('STANDINGS');

  const currentEdition =
    tournamentEditions.find((t) => t.id === selectedTournamentId) || tournamentEditions[0];

  // All matches
  const allMatches: Match[] = [
    ...(career?.fixtures || []),
    ...(career?.worldFixtures || []),
  ];

  // Filter matches belonging to this tournament edition
  const tournamentMatches = allMatches.filter(
    (m) =>
      m.tournamentId === currentEdition.id ||
      m.competitionId === currentEdition.id ||
      m.competitionId === currentEdition.competitionType ||
      (currentEdition.competitionType === 'WTC' && m.format === 'TEST' && !m.tourId?.includes('ashes'))
  );

  const completedMatches = tournamentMatches.filter(
    (m) => m.status === 'COMPLETED' || m.status === 'DRAW' || m.status === 'TIE'
  );

  // Sorted live table
  const sortedTable = sortTournamentTable(currentEdition.table, !!currentEdition.rules.usePCT);
  const finalist1 = sortedTable[0];
  const finalist2 = sortedTable[1];

  return (
    <div className="space-y-4 select-none animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            ICC Major Tournaments & Championships
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            World Test Championship, ICC Cricket World Cup, T20 World Cup, Champions Trophy & Asia Cup.
          </p>
        </div>

        {/* Tournament Edition Switcher */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 bg-[#182234] border border-[#243247] p-1 rounded-lg">
          {tournamentEditions.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTournamentId(t.id)}
              className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedTournamentId === t.id
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.competitionType} ({t.year})
            </button>
          ))}
        </div>
      </div>

      {/* Tournament Info Banner */}
      <div className="bg-gradient-to-r from-[#121824] via-[#162133] to-[#121824] border border-[#1f293d] rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-black px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                {currentEdition.format}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Cycle: {currentEdition.season} ({currentEdition.cycleLengthYears} Years)
              </span>
              <span className="text-xs text-amber-400 font-bold">
                {currentEdition.status.replace('_', ' ')}
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mt-1">{currentEdition.name}</h3>
            <p className="text-xs text-slate-300 max-w-2xl mt-1">{currentEdition.description}</p>
          </div>

          {currentEdition.competitionType === 'WTC' && (
            <div className="bg-[#0b0f17]/80 border border-amber-500/30 p-3.5 rounded-xl text-center min-w-[200px]">
              <Landmark className="w-6 h-6 text-amber-400 mx-auto mb-1" />
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                Grand Final Venue
              </span>
              <span className="text-xs font-bold text-white">Lord's, London</span>
              <span className="text-[10px] text-emerald-400 block mt-1 font-mono">
                Top 2 Qualify for Neutral Standalone Final
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sub-nav: Standings vs Fixtures vs History */}
      <div className="flex items-center space-x-2 border-b border-[#1f293d] pb-2 text-xs">
        <button
          onClick={() => setActiveTabSubView('STANDINGS')}
          className={`px-3.5 py-1.5 font-bold rounded cursor-pointer transition ${
            activeTabSubView === 'STANDINGS'
              ? 'bg-emerald-600 text-white shadow'
              : 'bg-[#182234] text-slate-400 hover:text-white border border-[#243247]'
          }`}
        >
          Points Table & Standings
        </button>
        <button
          onClick={() => setActiveTabSubView('FIXTURES')}
          className={`px-3.5 py-1.5 font-bold rounded cursor-pointer transition flex items-center space-x-1.5 ${
            activeTabSubView === 'FIXTURES'
              ? 'bg-emerald-600 text-white shadow'
              : 'bg-[#182234] text-slate-400 hover:text-white border border-[#243247]'
          }`}
        >
          <span>Matches & Results</span>
          <span className="bg-[#243247] text-slate-300 font-mono text-[10px] px-1.5 py-0.2 rounded">
            {tournamentMatches.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTabSubView('HISTORY')}
          className={`px-3.5 py-1.5 font-bold rounded cursor-pointer transition ${
            activeTabSubView === 'HISTORY'
              ? 'bg-emerald-600 text-white shadow'
              : 'bg-[#182234] text-slate-400 hover:text-white border border-[#243247]'
          }`}
        >
          Past Champions ({currentEdition.pastChampions?.length || 0})
        </button>
      </div>

      {/* STANDINGS VIEW */}
      {activeTabSubView === 'STANDINGS' && (
        <div className="space-y-4">
          {/* Top 2 Qualification Card for WTC */}
          {currentEdition.competitionType === 'WTC' && finalist1 && finalist2 && (
            <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-2">
                Projected WTC Lord's Final Qualification Status
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-[#182234] border border-[#243247] p-3 rounded flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-amber-400 font-mono">#1</span>
                    <span className="text-sm font-bold text-white">{finalist1.teamName}</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    {finalist1.pointsPercentage}% PCT ({finalist1.points} pts)
                  </span>
                </div>
                <div className="bg-[#182234] border border-[#243247] p-3 rounded flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-slate-300 font-mono">#2</span>
                    <span className="text-sm font-bold text-white">{finalist2.teamName}</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    {finalist2.pointsPercentage}% PCT ({finalist2.points} pts)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Standings Table */}
          <div className="bg-[#121824] border border-[#1f293d] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#182234] text-slate-400 text-[11px] uppercase font-mono border-b border-[#1f293d]">
                  <tr>
                    <th className="p-3 text-center">Pos</th>
                    <th className="p-3">Team</th>
                    <th className="p-3 text-center">P</th>
                    <th className="p-3 text-center">W</th>
                    <th className="p-3 text-center">L</th>
                    {currentEdition.format === 'TEST' ? (
                      <th className="p-3 text-center">D</th>
                    ) : (
                      <th className="p-3 text-center">T</th>
                    )}
                    <th className="p-3 text-center">Pts</th>
                    {currentEdition.rules.usePCT ? (
                      <th className="p-3 text-center text-emerald-400 font-bold">PCT (%)</th>
                    ) : (
                      <th className="p-3 text-center text-emerald-400 font-bold">NRR</th>
                    )}
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f293d]">
                  {sortedTable.map((row, idx) => {
                    const isQualifying = idx < (currentEdition.competitionType === 'WTC' ? 2 : 4);
                    return (
                      <tr
                        key={row.teamId}
                        className={`hover:bg-[#182234]/60 transition ${
                          isQualifying ? 'bg-[#182234]/20' : ''
                        }`}
                      >
                        <td className="p-3 text-center font-bold font-mono">
                          <span
                            className={`w-5 h-5 rounded inline-flex items-center justify-center ${
                              idx === 0
                                ? 'bg-amber-500/20 text-amber-400 font-black'
                                : idx === 1
                                ? 'bg-slate-500/20 text-slate-300 font-bold'
                                : 'text-slate-500'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-white">{row.teamName}</span>
                          <span className="text-[10px] text-slate-400 font-mono ml-2">({row.teamId})</span>
                        </td>
                        <td className="p-3 text-center font-mono text-slate-300">{row.played}</td>
                        <td className="p-3 text-center font-mono text-emerald-400 font-bold">{row.won}</td>
                        <td className="p-3 text-center font-mono text-rose-400">{row.lost}</td>
                        <td className="p-3 text-center font-mono text-slate-400">
                          {currentEdition.format === 'TEST' ? row.drawn : row.tied}
                        </td>
                        <td className="p-3 text-center font-mono text-white font-black">{row.points}</td>
                        <td className="p-3 text-center font-mono text-emerald-400 font-black">
                          {currentEdition.rules.usePCT
                            ? `${row.pointsPercentage || 0}%`
                            : row.netRunRate !== undefined
                            ? (row.netRunRate > 0 ? `+${row.netRunRate}` : `${row.netRunRate}`)
                            : '-'}
                        </td>
                        <td className="p-3 text-center">
                          {isQualifying ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                              Qualified
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">In Contention</span>
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
      )}

      {/* FIXTURES VIEW */}
      {activeTabSubView === 'FIXTURES' && (
        <div className="space-y-3">
          {tournamentMatches.length > 0 ? (
            tournamentMatches.map((m) => {
              const isCompleted = m.status === 'COMPLETED' || m.status === 'DRAW' || m.status === 'TIE';
              const inn1 = m.innings[0];
              const inn2 = m.innings[1];

              return (
                <div
                  key={m.id}
                  className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                        {m.format}
                      </span>
                      <span className="text-xs font-bold text-white">{m.seriesName}</span>
                      <span className="text-slate-400 font-mono text-xs">{m.date}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{m.venue}</span>
                    </div>

                    <div className="text-xs font-bold text-white">
                      {m.homeTeamId} vs {m.awayTeamId}
                    </div>

                    {isCompleted && inn1 && (
                      <div className="text-xs font-mono font-bold text-slate-200">
                        <span>
                          {inn1.battingTeamId}: {inn1.totalRuns}/{inn1.wickets}
                        </span>
                        {inn2 && (
                          <span className="ml-2">
                            vs {inn2.battingTeamId}: {inn2.totalRuns}/{inn2.wickets}
                          </span>
                        )}
                        <p className="text-[11px] text-emerald-400 font-sans mt-0.5">{m.resultText}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    {isCompleted ? (
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/40">
                        Completed
                      </span>
                    ) : (
                      onSelectMatch && (
                        <button
                          onClick={() => onSelectMatch(m.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded transition cursor-pointer flex items-center space-x-1"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>Match Centre</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-8 text-center text-slate-500 text-xs">
              No tournament fixtures currently scheduled. Advance calendar to generate upcoming rounds.
            </div>
          )}
        </div>
      )}

      {/* HISTORY VIEW */}
      {activeTabSubView === 'HISTORY' && (
        <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-5 space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1f293d] pb-3">
            <Award className="w-4 h-4 text-amber-400" />
            Past Champions & Final Results
          </h4>

          <table className="w-full text-xs text-left">
            <thead className="bg-[#182234] text-slate-400 text-[11px] uppercase font-mono">
              <tr>
                <th className="p-2.5">Year</th>
                <th className="p-2.5">Host</th>
                <th className="p-2.5">Champion</th>
                <th className="p-2.5">Runner-Up</th>
                <th className="p-2.5 text-right">Final Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f293d]">
              {currentEdition.pastChampions?.map((pc, idx) => (
                <tr key={idx} className="hover:bg-[#182234]/50 transition">
                  <td className="p-2.5 font-bold font-mono text-white">{pc.year}</td>
                  <td className="p-2.5 text-slate-300">{pc.host}</td>
                  <td className="p-2.5 font-bold text-amber-400">{pc.winner}</td>
                  <td className="p-2.5 text-slate-400">{pc.runnerUp}</td>
                  <td className="p-2.5 text-right font-mono text-slate-300">{pc.finalResult}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
