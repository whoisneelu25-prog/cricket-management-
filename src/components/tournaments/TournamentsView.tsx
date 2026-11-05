import React, { useState } from 'react';
import {
  Trophy,
  Award,
  Landmark,
  Play,
  MapPin,
  FileText,
  Crown,
  Sparkles,
} from 'lucide-react';
import { CareerSave, Match, TournamentEdition, TournamentTableEntry } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { INITIAL_TOURNAMENT_EDITIONS } from '../../data/tournamentData';
import { sortTournamentTable } from '../../engine/tournamentEngine';
import { isTerminalMatchStatus } from '../../engine/matchEngine';
import { CountryFlag } from '../common/CountryFlag';

interface TournamentsViewProps {
  career?: CareerSave;
  onSelectMatch?: (matchId: string) => void;
  onInspectScorecard?: (match: Match) => void;
}

export const TournamentsView: React.FC<TournamentsViewProps> = ({
  career,
  onSelectMatch,
  onInspectScorecard,
}) => {
  const tournamentEditions: TournamentEdition[] =
    career?.tournamentEditions && career.tournamentEditions.length > 0
      ? career.tournamentEditions
      : INITIAL_TOURNAMENT_EDITIONS;

  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(
    tournamentEditions[0]?.id || 'wtc_2025_27'
  );
  const [activeTabSubView, setActiveTabSubView] = useState<'STANDINGS' | 'FIXTURES' | 'HISTORY'>(
    'STANDINGS'
  );

  const currentEdition =
    tournamentEditions.find((t) => t.id === selectedTournamentId) || tournamentEditions[0];

  const allMatches: Match[] = [
    ...(career?.fixtures || []),
    ...(career?.worldFixtures || []),
  ];

  // Filter matches belonging to this tournament edition
  const tournamentMatches = allMatches
    .filter(
      (m) =>
        m.tournamentId === currentEdition.id ||
        m.competitionId === currentEdition.id ||
        (currentEdition.competitionType === 'WTC' &&
          m.competitionId === 'WTC' &&
          m.format === 'TEST')
    )
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const knockoutMatches = tournamentMatches.filter(
    (m) => m.stage === 'SEMI_FINAL' || m.stage === 'FINAL'
  );

  // Sorted live table
  const sortedTable = sortTournamentTable(
    currentEdition.table,
    Boolean(currentEdition.rules.usePCT)
  );
  const finalist1 = sortedTable[0];
  const finalist2 = sortedTable[1];

  const renderTable = (
    rows: TournamentTableEntry[],
    qualifyCount: number,
    title?: string
  ) => (
    <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl overflow-hidden shadow-2xl">
      {title && (
        <div className="bg-[#10151c] border-b border-[#1e2733] px-5 py-3.5 flex items-center justify-between">
          <span className="dugout-kicker text-xs text-[#e2b64a]">
            {title}
          </span>
          <span className="text-[10px] font-mono text-[#8b97a3] uppercase tracking-wider">
            Top {qualifyCount} Qualify
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#070a0e] text-[#8b97a3] text-[10px] uppercase font-mono border-b border-[#1e2733] tracking-wider">
            <tr>
              <th className="py-3 px-4 text-center">Pos</th>
              <th className="py-3 px-4">Team</th>
              <th className="py-3 px-3 text-center">P</th>
              <th className="py-3 px-3 text-center">W</th>
              <th className="py-3 px-3 text-center">L</th>
              {currentEdition.format === 'TEST' ? (
                <th className="py-3 px-3 text-center">D</th>
              ) : (
                <th className="py-3 px-3 text-center">T</th>
              )}
              <th className="py-3 px-3 text-center">Pts</th>
              {currentEdition.rules.usePCT ? (
                <th className="py-3 px-4 text-center text-[#e2b64a] font-bold">PCT (%)</th>
              ) : (
                <th className="py-3 px-4 text-center text-[#e2b64a] font-bold">NRR</th>
              )}
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2733]">
            {rows.map((row, idx) => {
              const isQualifying = idx < qualifyCount;
              const isUserRow = row.teamId === career?.selectedTeamId;
              const teamData = INTERNATIONAL_TEAMS.find((t) => t.id === row.teamId);

              return (
                <tr
                  key={row.teamId}
                  className={`hover:bg-[#10151c] transition-colors ${
                    isUserRow
                      ? 'bg-[#e2b64a]/10 hover:bg-[#e2b64a]/15 font-semibold'
                      : isQualifying
                      ? 'bg-[#10151c]/40'
                      : ''
                  }`}
                >
                  <td className="py-3 px-4 text-center font-bold font-mono">
                    <span
                      className={`w-7 h-7 rounded-lg inline-flex items-center justify-center ${
                        idx === 0
                          ? 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black font-black shadow-xs'
                          : idx === 1
                          ? 'bg-[#10151c] text-[#8fb2d9] border border-[#1e2733] font-bold'
                          : 'text-[#8b97a3]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2.5">
                      <CountryFlag countryCode={teamData?.code || row.teamId} size="xs" />
                      <span className={`font-bold ${isUserRow ? 'text-[#ffe9a8]' : 'text-white'}`}>{row.teamName}</span>
                      <span className="text-[10px] text-[#8b97a3] font-mono">
                        ({row.teamId})
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-[#c3ccd6]">{row.played}</td>
                  <td className="py-3 px-3 text-center font-mono text-[#3fca86] font-bold">
                    {row.won}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-[#ff5470]">{row.lost}</td>
                  <td className="py-3 px-3 text-center font-mono text-[#8b97a3]">
                    {currentEdition.format === 'TEST' ? row.drawn : row.tied}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-white font-black">
                    {row.points}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-[#ffe9a8] font-black text-sm">
                    {currentEdition.rules.usePCT
                      ? `${row.pointsPercentage || 0}%`
                      : row.netRunRate !== undefined
                      ? row.netRunRate > 0
                        ? `+${row.netRunRate.toFixed(3)}`
                        : `${row.netRunRate.toFixed(3)}`
                      : '0.000'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {currentEdition.winnerTeamId === row.teamId ? (
                      <span className="text-[10px] font-black text-black bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] px-2.5 py-0.5 rounded uppercase tracking-wider shadow-sm">
                        CHAMPION
                      </span>
                    ) : isQualifying && row.played > 0 ? (
                      <span className="text-[10px] font-bold text-[#3fca86] bg-[#3fca86]/20 px-2 py-0.5 rounded border border-[#3fca86]/40 uppercase tracking-wider">
                        Qualifying Zone
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#556375] font-mono uppercase tracking-wider">
                        {row.played > 0 ? 'In Contention' : 'Scheduled'}
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
  );

  return (
    <div className="space-y-5 select-none pb-8 text-[#e8edf2]">
      {/* Header in Dugout Style */}
      <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#10151c] border border-[#1e2733] flex items-center justify-center text-[#e2b64a] shadow-inner">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="dugout-kicker text-[11px] text-[#e2b64a]">ICC Competitions</span>
              <span className="text-[10px] bg-[#10151c] text-[#8fb2d9] font-mono px-2 py-0.5 rounded-full border border-[#1e2733] font-bold">
                Championships
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-0.5">
              ICC Major Tournaments
            </h1>
            <p className="text-xs text-[#8b97a3] mt-0.5">
              Live standings, Net Run Rate, WTC Points Percentage, Knockout Brackets &amp; Champions
            </p>
          </div>
        </div>

        {/* Tournament Edition Switcher */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 bg-[#10151c] border border-[#1e2733] p-1.5 rounded-xl">
          {tournamentEditions.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTournamentId(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer uppercase tracking-wider ${
                selectedTournamentId === t.id
                  ? 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black shadow-sm font-extrabold'
                  : 'text-[#8b97a3] hover:text-white'
              }`}
            >
              {t.competitionType} ({t.year})
            </button>
          ))}
        </div>
      </div>

      {/* Tournament Info Banner */}
      <div className="bg-gradient-to-r from-[#10151c] via-[#070a0e] to-[#10151c] border border-[#1e2733] rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded uppercase tracking-wider ${
                currentEdition.format === 'TEST'
                  ? 'bg-[#ff3d7f]/20 text-[#ff5470] border border-[#ff3d7f]/40'
                  : currentEdition.format === 'ODI'
                  ? 'bg-[#8fb2d9]/20 text-[#8fb2d9] border border-[#8fb2d9]/40'
                  : 'bg-[#3fca86]/20 text-[#3fca86] border border-[#3fca86]/40'
              }`}>
                {currentEdition.format}
              </span>
              <span className="text-xs text-[#8b97a3] font-mono">
                Cycle: <strong className="text-white">{currentEdition.season}</strong> • Host:{' '}
                <strong className="text-white">
                  {INTERNATIONAL_TEAMS.find((t) => t.id === currentEdition.hostCountryId)?.name ||
                    currentEdition.hostCountryId ||
                    'Multi-Nation'}
                </strong>
              </span>
              <span className="text-xs text-[#e2b64a] font-bold uppercase tracking-wider font-mono">
                {currentEdition.status.replace(/_/g, ' ')}
                {currentEdition.currentStage ? ` (${currentEdition.currentStage.replace(/_/g, ' ')})` : ''}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-1.5">{currentEdition.name}</h3>
            <p className="text-xs text-[#c3ccd6] max-w-2xl mt-1 leading-relaxed">{currentEdition.description}</p>

            {/* Champion & Honours Ribbon if Completed */}
            {currentEdition.winnerTeamId && (
              <div className="mt-3.5 flex flex-wrap items-center gap-3 text-xs bg-[#e2b64a]/10 border border-[#e2b64a]/40 p-3 rounded-xl shadow-xs">
                <span className="font-black text-[#ffe9a8] flex items-center gap-1.5 uppercase tracking-wide">
                  <Crown className="w-4 h-4 text-[#e2b64a]" />
                  Champion:{' '}
                  {currentEdition.table.find((r) => r.teamId === currentEdition.winnerTeamId)?.teamName ||
                    currentEdition.winnerTeamId}
                </span>
                {currentEdition.playerOfTheTournament && (
                  <span className="text-[#8b97a3] font-mono">
                    • POTT: <strong className="text-white">{currentEdition.playerOfTheTournament.playerName}</strong>
                  </span>
                )}
                {currentEdition.leadingRunScorer && (
                  <span className="text-[#8b97a3] font-mono">
                    • Top Run Scorer:{' '}
                    <strong className="text-[#3fca86]">
                      {currentEdition.leadingRunScorer.playerName} ({currentEdition.leadingRunScorer.runs})
                    </strong>
                  </span>
                )}
                {currentEdition.leadingWicketTaker && (
                  <span className="text-[#8b97a3] font-mono">
                    • Top Wicket Taker:{' '}
                    <strong className="text-[#8fb2d9]">
                      {currentEdition.leadingWicketTaker.playerName} ({currentEdition.leadingWicketTaker.wickets})
                    </strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {currentEdition.competitionType === 'WTC' && (
            <div className="bg-[#070a0e] border border-[#e2b64a]/30 p-4 rounded-xl text-center min-w-[220px] shadow-sm">
              <Landmark className="w-6 h-6 text-[#e2b64a] mx-auto mb-1" />
              <span className="dugout-kicker text-[10px] text-[#8b97a3] block">
                Grand Final Venue
              </span>
              <span className="text-sm font-black text-white block mt-0.5">Lord&apos;s, London</span>
              <span className="text-[10px] text-[#3fca86] block mt-1 font-mono">
                Cutoff: {currentEdition.cutoffDate || '2027-06-01'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sub-nav: Standings vs Fixtures vs History */}
      <div className="flex items-center space-x-2 border-b border-[#1e2733] pb-3 text-xs">
        <button
          onClick={() => setActiveTabSubView('STANDINGS')}
          className={`px-4 py-2 font-bold rounded-xl cursor-pointer transition uppercase tracking-wider ${
            activeTabSubView === 'STANDINGS'
              ? 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black shadow-sm font-extrabold'
              : 'bg-[#070a0e] text-[#8b97a3] hover:text-white border border-[#1e2733]'
          }`}
        >
          Points Table &amp; Knockouts
        </button>
        <button
          onClick={() => setActiveTabSubView('FIXTURES')}
          className={`px-4 py-2 font-bold rounded-xl cursor-pointer transition flex items-center space-x-2 uppercase tracking-wider ${
            activeTabSubView === 'FIXTURES'
              ? 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black shadow-sm font-extrabold'
              : 'bg-[#070a0e] text-[#8b97a3] hover:text-white border border-[#1e2733]'
          }`}
        >
          <span>Matches &amp; Results</span>
          <span className="bg-[#10151c] text-[#8fb2d9] font-mono text-[10px] px-2 py-0.5 rounded-full border border-[#1e2733]">
            {tournamentMatches.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTabSubView('HISTORY')}
          className={`px-4 py-2 font-bold rounded-xl cursor-pointer transition uppercase tracking-wider ${
            activeTabSubView === 'HISTORY'
              ? 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black shadow-sm font-extrabold'
              : 'bg-[#070a0e] text-[#8b97a3] hover:text-white border border-[#1e2733]'
          }`}
        >
          Past Champions ({currentEdition.pastChampions?.length || 0})
        </button>
      </div>

      {/* STANDINGS VIEW */}
      {activeTabSubView === 'STANDINGS' && (
        <div className="space-y-5">
          {/* Knockout Bracket Cards if Semi-Finals / Final Exist */}
          {knockoutMatches.length > 0 && (
            <div className="bg-[#070a0e] border border-[#e2b64a]/40 rounded-2xl p-5 space-y-3.5 shadow-xl">
              <span className="dugout-kicker text-xs text-[#e2b64a] block">
                Official Knockout Stage Bracket
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {knockoutMatches.map((km) => {
                  const done = isTerminalMatchStatus(km.status);
                  const isUserKm = km.homeTeamId === career?.selectedTeamId || km.awayTeamId === career?.selectedTeamId;
                  return (
                    <div
                      key={km.id}
                      className="bg-[#10151c] border border-[#1e2733] hover:border-[#8fb2d9] p-4 rounded-xl flex flex-col justify-between gap-3 text-xs transition shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-[#ffe9a8]">
                          <span className="uppercase font-bold">{km.stage?.replace('_', ' ')}</span>
                          <span>{km.date}</span>
                        </div>
                        <div className="font-black text-white text-base mt-1.5 uppercase tracking-wide">
                          {km.homeTeamId} vs {km.awayTeamId}
                        </div>
                        <p className="text-[11px] text-[#8b97a3] mt-1">
                          {done ? km.resultText : km.venue}
                        </p>
                      </div>
                      <div>
                        {done ? (
                          <button
                            onClick={() => onInspectScorecard && onInspectScorecard(km)}
                            className="text-[11px] font-bold text-[#8fb2d9] bg-[#070a0e] border border-[#1e2733] hover:border-[#8fb2d9] px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Scorecard</span>
                          </button>
                        ) : isUserKm && onSelectMatch ? (
                          <button
                            onClick={() => onSelectMatch(km.id)}
                            className="btn-gold text-[11px] px-3.5 py-1.5"
                          >
                            Play Knockout
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-[#8b97a3] uppercase tracking-wider">
                            Scheduled AI Knockout
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top 2 Qualification Card for WTC */}
          {currentEdition.competitionType === 'WTC' && finalist1 && finalist2 && (
            <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-5 shadow-xl">
              <span className="dugout-kicker text-xs text-[#e2b64a] block mb-3">
                WTC Lord&apos;s Final Qualification Race (Top 2 by PCT%)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-[#10151c] border border-[#e2b64a]/50 p-4 rounded-xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-lg bg-[#e2b64a] text-black font-black text-xs font-mono flex items-center justify-center">1</span>
                    <span className="text-base font-black text-white">{finalist1.teamName}</span>
                  </div>
                  <span className="text-sm font-black text-[#ffe9a8] font-mono">
                    {finalist1.pointsPercentage || 0}% PCT ({finalist1.points} pts)
                  </span>
                </div>
                <div className="bg-[#10151c] border border-[#8fb2d9]/40 p-4 rounded-xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-lg bg-[#10151c] text-[#8fb2d9] border border-[#1e2733] font-bold text-xs font-mono flex items-center justify-center">2</span>
                    <span className="text-base font-black text-white">{finalist2.teamName}</span>
                  </div>
                  <span className="text-sm font-black text-[#8fb2d9] font-mono">
                    {finalist2.pointsPercentage || 0}% PCT ({finalist2.points} pts)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Multi-Group Tables vs Single League Table */}
          {currentEdition.groups && currentEdition.groups.length > 0 ? (
            <div className="space-y-5">
              {currentEdition.groups.map((grp) => {
                const grpRows = sortTournamentTable(
                  currentEdition.table.filter((r) => grp.teamIds.includes(r.teamId)),
                  false
                );
                const hasSemiFinals =
                  currentEdition.competitionType !== 'WTC' &&
                  currentEdition.competitionType !== 'TRI_SERIES';
                const qualPerGrp =
                  currentEdition.rules.qualifiersPerGroup ||
                  (hasSemiFinals ? 2 : 1);
                return (
                  <div key={grp.id}>
                    {renderTable(grpRows, qualPerGrp, grp.name)}
                  </div>
                );
              })}
            </div>
          ) : (
            renderTable(
              sortedTable,
              currentEdition.rules.totalQualifiers ||
                (currentEdition.competitionType !== 'WTC' &&
                currentEdition.competitionType !== 'TRI_SERIES'
                  ? 4
                  : 2)
            )
          )}
        </div>
      )}

      {/* FIXTURES VIEW */}
      {activeTabSubView === 'FIXTURES' && (
        <div className="space-y-3">
          {tournamentMatches.length > 0 ? (
            tournamentMatches.map((m) => {
              const isCompleted = isTerminalMatchStatus(m.status);
              const isUserFixture =
                m.homeTeamId === career?.selectedTeamId ||
                m.awayTeamId === career?.selectedTeamId;
              const inn1 = m.innings[0];
              const inn2 = m.innings[1];

              return (
                <div
                  key={m.id}
                  className="bg-[#070a0e] border border-[#1e2733] hover:border-[#8fb2d9]/60 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded uppercase tracking-wider ${
                        m.format === 'TEST'
                          ? 'bg-[#ff3d7f]/20 text-[#ff5470] border border-[#ff3d7f]/40'
                          : m.format === 'ODI'
                          ? 'bg-[#8fb2d9]/20 text-[#8fb2d9] border border-[#8fb2d9]/40'
                          : 'bg-[#3fca86]/20 text-[#3fca86] border border-[#3fca86]/40'
                      }`}>
                        {m.format}
                      </span>
                      <span className="text-xs font-bold text-white">{m.seriesName}</span>
                      {m.stage && (
                        <span className="text-[10px] font-mono bg-[#10151c] text-[#ffe9a8] px-2 py-0.5 rounded border border-[#1e2733] uppercase">
                          {m.stage.replace(/_/g, ' ')}
                        </span>
                      )}
                      <span className="text-[#8b97a3] font-mono text-xs">{m.date}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-[#8b97a3]">
                      <MapPin className="w-3.5 h-3.5 text-[#e2b64a]" />
                      <span>{m.venue}</span>
                    </div>

                    <div className="text-sm font-black text-white uppercase tracking-tight">
                      {m.homeTeamId} vs {m.awayTeamId}
                    </div>

                    {isCompleted && inn1 && (
                      <div className="text-xs font-mono font-bold text-[#c3ccd6] pt-1">
                        <span>
                          {inn1.battingTeamId}: <strong className="text-white">{inn1.totalRuns}/{inn1.wickets}</strong>
                        </span>
                        {inn2 && (
                          <span className="ml-3">
                            vs {inn2.battingTeamId}: <strong className="text-white">{inn2.totalRuns}/{inn2.wickets}</strong>
                          </span>
                        )}
                        <p className="text-xs text-[#3fca86] font-sans font-bold mt-1">
                          {m.resultText}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    {isCompleted ? (
                      <button
                        onClick={() => onInspectScorecard && onInspectScorecard(m)}
                        className="text-xs font-bold text-[#8fb2d9] bg-[#10151c] hover:bg-[#161d27] px-3.5 py-2 rounded-xl border border-[#1e2733] hover:border-[#8fb2d9] cursor-pointer flex items-center gap-1.5 uppercase tracking-wider transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Scorecard</span>
                      </button>
                    ) : isUserFixture && onSelectMatch ? (
                      <button
                        onClick={() => onSelectMatch(m.id)}
                        className="btn-gold flex items-center space-x-2 text-xs py-2.5 px-4"
                      >
                        <Play className="w-3.5 h-3.5 fill-black" />
                        <span>Match Centre</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-mono text-[#8b97a3] bg-[#10151c] border border-[#1e2733] px-3 py-1.5 rounded-xl uppercase tracking-wider">
                        AI Fixture
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-12 text-center text-[#8b97a3] text-xs">
              No tournament fixtures currently scheduled. Advance calendar to generate upcoming rounds.
            </div>
          )}
        </div>
      )}

      {/* HISTORY VIEW */}
      {activeTabSubView === 'HISTORY' && (
        <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1e2733] pb-3">
            <h4 className="dugout-kicker text-xs text-[#e2b64a] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#e2b64a]" />
              Past Champions &amp; Final Results
            </h4>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-[#070a0e] text-[#8b97a3] text-[10px] uppercase font-mono border-b border-[#1e2733] tracking-wider">
              <tr>
                <th className="py-3 px-3">Year</th>
                <th className="py-3 px-3">Host</th>
                <th className="py-3 px-3">Champion</th>
                <th className="py-3 px-3">Runner-Up</th>
                <th className="py-3 px-3 text-right">Final Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2733]">
              {currentEdition.pastChampions?.map((pc, idx) => (
                <tr key={idx} className="hover:bg-[#10151c] transition-colors">
                  <td className="py-3 px-3 font-bold font-mono text-white">{pc.year}</td>
                  <td className="py-3 px-3 text-[#c3ccd6]">{pc.host}</td>
                  <td className="py-3 px-3 font-black text-[#ffe9a8]">{pc.winner}</td>
                  <td className="py-3 px-3 text-[#8b97a3]">{pc.runnerUp}</td>
                  <td className="py-3 px-3 text-right font-mono text-[#c3ccd6]">{pc.finalResult}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
