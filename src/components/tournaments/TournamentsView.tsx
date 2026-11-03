import React, { useState } from 'react';
import { Trophy, Award, Shield, ChevronRight, Calendar, Landmark, CheckCircle2 } from 'lucide-react';
import { Tournament, INITIAL_TOURNAMENTS } from '../../data/tournaments';
import { CareerSave, Match } from '../../types/cricket';
import { computeTournamentTable } from '../../engine/worldSimulation';
import { INTERNATIONAL_TEAMS } from '../../data/teams';

interface TournamentsViewProps {
  career?: CareerSave;
  onSelectMatch?: (matchId: string) => void;
}

export const TournamentsView: React.FC<TournamentsViewProps> = ({ career, onSelectMatch }) => {
  const [selectedTournamentId, setSelectedTournamentId] = useState('wtc_2025');
  const [activeTabSubView, setActiveTabSubView] = useState<'STANDINGS' | 'FIXTURES'>('STANDINGS');

  const baseTournament = INITIAL_TOURNAMENTS.find((t) => t.id === selectedTournamentId) || INITIAL_TOURNAMENTS[0];

  // All completed and upcoming matches across career
  const allMatches: Match[] = [
    ...(career?.fixtures || []),
    ...(career?.worldFixtures || []),
  ];

  // Calculate live table if career is present
  const table = career
    ? computeTournamentTable(baseTournament.table, baseTournament.format, allMatches)
    : baseTournament.table;

  // Filter matches belonging to this tournament format
  const tournamentMatches = allMatches.filter((m) => m.format === baseTournament.format);
  const completedTournamentMatches = tournamentMatches.filter((m) => m.status === 'COMPLETED' || m.status === 'DRAW' || m.status === 'TIE');
  const upcomingTournamentMatches = tournamentMatches.filter((m) => m.status === 'SCHEDULED');

  // Top 2 Finalists
  const finalist1 = table[0];
  const finalist2 = table[1];

  return (
    <div className="space-y-4 select-none animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            International Championship Tournaments
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Official ICC tournament points tables, live Net Run Rates, and World Test Championship PCT% standings.
          </p>
        </div>

        {/* Tournament Switcher */}
        <div className="flex items-center bg-[#182234] border border-[#243247] p-1 rounded space-x-1">
          {INITIAL_TOURNAMENTS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTournamentId(t.id)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
                selectedTournamentId === t.id
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.name.replace('ICC Men’s ', '').replace('ICC World ', 'WTC ').replace('ICC Cricket ', 'CWC ')}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-nav: Standings vs Fixtures */}
      <div className="flex items-center space-x-2 border-b border-[#1f293d] pb-2 text-xs">
        <button
          onClick={() => setActiveTabSubView('STANDINGS')}
          className={`px-3 py-1.5 font-bold rounded cursor-pointer transition ${
            activeTabSubView === 'STANDINGS'
              ? 'bg-[#182234] text-emerald-400 border border-[#243247]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Points Table & Standings
        </button>
        <button
          onClick={() => setActiveTabSubView('FIXTURES')}
          className={`px-3 py-1.5 font-bold rounded cursor-pointer transition flex items-center space-x-1.5 ${
            activeTabSubView === 'FIXTURES'
              ? 'bg-[#182234] text-emerald-400 border border-[#243247]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Tournament Matches</span>
          <span className="bg-[#243247] text-slate-300 font-mono text-[10px] px-1.5 py-0.2 rounded">
            {tournamentMatches.length}
          </span>
        </button>
      </div>

      {activeTabSubView === 'STANDINGS' && (
        <>
          {/* ICC WTC Lord's Final Special Feature Card */}
          {baseTournament.format === 'TEST' && finalist1 && finalist2 && (
            <div className="bg-gradient-to-r from-[#121b2d] via-[#10222e] to-[#121b2d] border border-amber-500/30 rounded-lg p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-amber-950/80 text-amber-300 border border-amber-600/40 text-[10px] uppercase font-bold px-2 py-0.5 rounded font-mono flex items-center space-x-1">
                      <Landmark className="w-3 h-3" />
                      <span>Lord's WTC Final Qualification</span>
                    </span>
                    <span className="text-xs text-slate-400 font-mono">June 2025 • London, England</span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1">
                    The Pinnacle of Test Cricket at Lord's
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    The top two nations in the World Test Championship cycle standings qualify to contest the one-off Final at the Home of Cricket. Standings are ranked strictly by Points Percentage (PCT%).
                  </p>
                </div>

                {/* Matchup preview box */}
                <div className="bg-[#182234]/90 border border-amber-500/30 p-3 rounded-lg flex items-center space-x-4 min-w-[280px] justify-between">
                  <div className="text-center flex-1">
                    <span className="text-2xl block">{finalist1.flagEmoji}</span>
                    <span className="text-xs font-bold text-white block mt-0.5">{finalist1.teamName}</span>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">{finalist1.pointsPercentage?.toFixed(1)}% PCT</span>
                  </div>

                  <div className="text-center px-2">
                    <span className="text-[10px] font-bold uppercase text-amber-400 bg-amber-950/60 border border-amber-700/50 px-2 py-0.5 rounded">
                      FINAL
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1 font-mono">Lord's</span>
                  </div>

                  <div className="text-center flex-1">
                    <span className="text-2xl block">{finalist2.flagEmoji}</span>
                    <span className="text-xs font-bold text-white block mt-0.5">{finalist2.teamName}</span>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">{finalist2.pointsPercentage?.toFixed(1)}% PCT</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Standings Table */}
          <div className="bg-[#121824] border border-[#1f293d] rounded-lg overflow-hidden">
            <div className="p-3 bg-[#182234] border-b border-[#243247] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {baseTournament.name} — Standings
                </span>
                <span className="text-xs text-slate-400 ml-2 font-mono">({baseTournament.season})</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {baseTournament.format === 'TEST' ? '12 pts / Win • 4 pts / Draw • 6 pts / Tie' : '2 pts / Win • 1 pt / Tie'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#141d2c] text-slate-400 font-semibold border-b border-[#243247]">
                  <tr>
                    <th className="p-3 text-center">Pos</th>
                    <th className="p-3">Team</th>
                    <th className="p-3 text-right font-mono">Pld</th>
                    <th className="p-3 text-right font-mono">Won</th>
                    <th className="p-3 text-right font-mono">Lost</th>
                    <th className="p-3 text-right font-mono">Drawn</th>
                    {baseTournament.format === 'TEST' ? (
                      <>
                        <th className="p-3 text-right font-mono">Pts</th>
                        <th className="p-3 text-right font-mono text-emerald-400 font-bold">PCT (%)</th>
                        <th className="p-3 text-center">Status</th>
                      </>
                    ) : (
                      <>
                        <th className="p-3 text-right font-mono">Pts</th>
                        <th className="p-3 text-right font-mono text-emerald-400 font-bold">NRR</th>
                        <th className="p-3 text-center">Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#243247] font-mono">
                  {table.map((row, index) => {
                    const isTop2 = index < 2;
                    const isUserTeam = career && career.selectedTeamId === row.teamId;

                    return (
                      <tr
                        key={row.teamId}
                        className={`transition ${
                          isUserTeam
                            ? 'bg-emerald-950/40 border-l-4 border-l-emerald-500 font-bold'
                            : isTop2
                            ? 'bg-amber-950/15'
                            : 'hover:bg-[#182234]/50'
                        }`}
                      >
                        <td className="p-3 text-center font-bold text-slate-400">
                          {isTop2 && <span className="text-amber-400 mr-1">★</span>}
                          {index + 1}
                        </td>
                        <td className="p-3 font-sans font-bold text-white flex items-center space-x-2">
                          <span className="text-base">{row.flagEmoji}</span>
                          <span>{row.teamName}</span>
                          {isUserTeam && (
                            <span className="text-[10px] bg-emerald-900/60 text-emerald-300 border border-emerald-600/40 px-1.5 py-0.2 rounded font-mono">
                              YOU
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right text-slate-300">{row.played}</td>
                        <td className="p-3 text-right text-emerald-400 font-bold">{row.won}</td>
                        <td className="p-3 text-right text-rose-400">{row.lost}</td>
                        <td className="p-3 text-right text-slate-400">{row.drawn}</td>
                        <td className="p-3 text-right font-bold text-white">{row.points}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">
                          {baseTournament.format === 'TEST'
                            ? `${row.pointsPercentage?.toFixed(2)}%`
                            : `${row.netRunRate && row.netRunRate > 0 ? '+' : ''}${row.netRunRate?.toFixed(3)}`}
                        </td>
                        <td className="p-3 text-center">
                          {isTop2 ? (
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-600/50 px-2 py-0.5 rounded font-sans">
                              {baseTournament.format === 'TEST' ? "Lord's Final Zone" : "Semi-Final Zone"}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-sans">In Contention</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTabSubView === 'FIXTURES' && (
        <div className="space-y-4">
          {/* Completed matches */}
          <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Completed Matches ({completedTournamentMatches.length})</span>
            </h3>

            {completedTournamentMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {completedTournamentMatches.map((m) => {
                  const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === m.homeTeamId);
                  const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === m.awayTeamId);

                  return (
                    <div
                      key={m.id}
                      onClick={() => onSelectMatch && onSelectMatch(m.id)}
                      className="bg-[#182234] border border-[#243247] p-3 rounded-lg hover:border-emerald-500/50 transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
                        <span>{m.date || 'Completed'}</span>
                        <span className="bg-[#243247] text-emerald-400 px-2 py-0.5 rounded font-bold">
                          {m.format}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm font-bold text-white mb-2">
                        <div className="flex items-center space-x-2">
                          <span>{homeTeam?.flagEmoji}</span>
                          <span>{homeTeam?.name}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-normal">vs</span>
                        <div className="flex items-center space-x-2">
                          <span>{awayTeam?.name}</span>
                          <span>{awayTeam?.flagEmoji}</span>
                        </div>
                      </div>

                      <p className="text-xs text-emerald-400 font-medium">
                        {m.resultText || 'Match concluded'}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-3">
                No tournament matches completed yet this season. Simulate upcoming fixtures to see results.
              </p>
            )}
          </div>

          {/* Upcoming matches */}
          <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Upcoming Scheduled Matches ({upcomingTournamentMatches.length})</span>
            </h3>

            {upcomingTournamentMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {upcomingTournamentMatches.map((m) => {
                  const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === m.homeTeamId);
                  const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === m.awayTeamId);

                  return (
                    <div
                      key={m.id}
                      onClick={() => onSelectMatch && onSelectMatch(m.id)}
                      className="bg-[#182234] border border-[#243247] p-3 rounded-lg hover:border-amber-500/50 transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
                        <span>{m.date || 'TBD'}</span>
                        <span className="bg-[#243247] text-amber-400 px-2 py-0.5 rounded font-bold">
                          {m.format}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm font-bold text-white mb-1">
                        <div className="flex items-center space-x-2">
                          <span>{homeTeam?.flagEmoji}</span>
                          <span>{homeTeam?.name}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-normal">vs</span>
                        <div className="flex items-center space-x-2">
                          <span>{awayTeam?.name}</span>
                          <span>{awayTeam?.flagEmoji}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 font-mono">
                        Venue: {m.venue}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-3">
                All scheduled matches for this cycle have completed.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
