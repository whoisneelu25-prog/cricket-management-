import React, { useState } from 'react';
import { X, Award, FileText, ChevronRight } from 'lucide-react';
import { Match, InningsState } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { getPlayerById } from '../../engine/matchEngine';

interface ScorecardModalProps {
  match: Match;
  onClose: () => void;
  onReturnToDashboard?: () => void;
}

export const ScorecardModal: React.FC<ScorecardModalProps> = ({
  match,
  onClose,
  onReturnToDashboard,
}) => {
  const [activeInningsIdx, setActiveInningsIdx] = useState(0);

  const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.homeTeamId);
  const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.awayTeamId);
  const isTest = match.format === 'TEST';

  const superOverList =
    match.superOverPlayed && match.superOverInnings && match.superOverInnings.length > 0
      ? match.superOverInnings
      : [];
  const allInningsTabs: Array<{ innings: InningsState; isSuperOver: boolean }> = [
    ...match.innings.map((inn) => ({ innings: inn, isSuperOver: false })),
    ...superOverList.map((inn) => ({ innings: inn, isSuperOver: true })),
  ];

  const activeEntry = allInningsTabs[activeInningsIdx] || allInningsTabs[0];
  const currentInnings = activeEntry?.innings;
  const isViewingSuperOver = Boolean(activeEntry?.isSuperOver);

  // Test Match Totals, Lead/Deficit & Target Summary (strictly for TEST format)
  const homeMatchRuns = isTest
    ? match.innings
        .filter((i) => i.battingTeamId === match.homeTeamId)
        .reduce((s, i) => s + i.totalRuns, 0)
    : 0;
  const awayMatchRuns = isTest
    ? match.innings
        .filter((i) => i.battingTeamId === match.awayTeamId)
        .reduce((s, i) => s + i.totalRuns, 0)
    : 0;

  const getTestLeadTargetSummary = (): string => {
    if (!isTest || match.innings.length === 0) return '';
    const inn1 = match.innings[0];
    const inn2 = match.innings[1];
    const inn3 = match.innings[2];
    const inn4 = match.innings[3];
    if (inn4) {
      const rem = Math.max(0, (inn4.targetRuns || 0) - inn4.totalRuns);
      return inn4.isCompleted
        ? `4th Innings Target: ${inn4.targetRuns} (${inn4.battingTeamName} scored ${inn4.totalRuns}/${inn4.wickets})`
        : `4th Innings Target: ${inn4.targetRuns} — ${inn4.battingTeamName} need ${rem} more runs`;
    }
    if (inn3) {
      if (match.followOnEnforced) {
        const diff = inn2.totalRuns + inn3.totalRuns - inn1.totalRuns;
        return diff < 0
          ? `${inn3.battingTeamName} (f/o) trail by ${Math.abs(diff)} runs`
          : `${inn3.battingTeamName} (f/o) lead by ${diff} runs`;
      }
      const lead = inn1.totalRuns + inn3.totalRuns - inn2.totalRuns;
      return lead >= 0
        ? `${inn3.battingTeamName} overall lead: ${lead} runs`
        : `${inn3.battingTeamName} trail by ${Math.abs(lead)} runs`;
    }
    if (inn2) {
      const diff = inn2.totalRuns - inn1.totalRuns;
      return diff >= 0
        ? `${inn2.battingTeamName} 1st-innings lead: ${diff} runs`
        : `${inn2.battingTeamName} trail by ${Math.abs(diff)} runs`;
    }
    return `${inn1.battingTeamName} 1st Innings: ${inn1.totalRuns}/${inn1.wickets}`;
  };

  const didNotBatNames =
    currentInnings && !isViewingSuperOver
      ? (currentInnings.battingTeamId === match.homeTeamId ? match.homeXI : match.awayXI)
          .filter((id) => !currentInnings.batters.some((b) => b.playerId === id))
          .map((id) => getPlayerById(id).shortName)
      : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="bg-[#111827] border border-[#243247] w-full max-w-4xl max-h-[92vh] rounded-lg shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="bg-[#182234] border-b border-[#243247] p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800/40 font-mono font-bold px-2 py-0.5 rounded">
                {match.format}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                {homeTeam?.name} vs {awayTeam?.name} — Official Scorecard
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {match.venue} • {match.resultText || 'Match in progress'}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close scorecard"
            className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-[#243247] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Test Match Multi-Innings Totals, Lead/Target & Conditions Summary (TEST only) */}
        {isTest && match.innings.length > 0 && (
          <div className="bg-[#0e1525] border-b border-[#243247] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-300">
                <strong className="text-white">{homeTeam?.name || match.homeTeamId} Total:</strong> {homeMatchRuns}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-300">
                <strong className="text-white">{awayTeam?.name || match.awayTeamId} Total:</strong> {awayMatchRuns}
              </span>
              {match.followOnEnforced && (
                <span className="bg-amber-950 text-amber-300 border border-amber-800/50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  Follow-On Enforced
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-emerald-400 font-semibold">{getTestLeadTargetSummary()}</span>
              {match.pitchWear !== undefined && (
                <span className="text-slate-400">
                  • Pitch Wear {Math.round(match.pitchWear)}% • Day {match.dayNumber}/5
                </span>
              )}
            </div>
          </div>
        )}

        {/* Innings Tabs (including Super Over Scorecards when played) */}
        {allInningsTabs.length > 0 && (
          <div className="bg-[#151c2c] border-b border-[#243247] px-4 py-2 flex flex-wrap items-center gap-2">
            {allInningsTabs.map(({ innings: inn, isSuperOver }, idx) => {
              const soPrefix = isSuperOver
                ? (match.superOverRounds || 1) > 1
                  ? `Super Over #${inn.superOverNumber || 1}: `
                  : 'Super Over: '
                : isTest
                ? `Inn ${inn.inningsNumber}: `
                : '';
              return (
                <button
                  key={idx}
                  onClick={() => setActiveInningsIdx(idx)}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                    activeInningsIdx === idx
                      ? isSuperOver
                        ? 'bg-amber-600 text-white shadow'
                        : 'bg-emerald-600 text-white shadow'
                      : isSuperOver
                      ? 'text-amber-300 hover:text-white bg-amber-950/40 border border-amber-800/40'
                      : 'text-slate-400 hover:text-white hover:bg-[#1f293d]'
                  }`}
                >
                  {soPrefix}
                  {inn.battingTeamName} ({inn.totalRuns}/{inn.wickets}
                  {isTest && inn.isDeclared ? 'd' : ''} in {inn.completedOvers}.{inn.ballsInCurrentOver} ov)
                </button>
              );
            })}
          </div>
        )}

        {/* Scorecard Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {currentInnings ? (
            <>
              {/* Batting Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
                    {currentInnings.battingTeamName} Innings (Batting)
                  </h3>
                  <span className="text-xs font-mono font-bold text-white">
                    {currentInnings.totalRuns}/{currentInnings.wickets}
                    {isTest && currentInnings.isDeclared ? 'd' : ''} ({currentInnings.completedOvers}.{currentInnings.ballsInCurrentOver} Overs)
                  </span>
                </div>

                <div className="overflow-x-auto border border-[#243247] rounded">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#182234] text-slate-400 font-semibold border-b border-[#243247]">
                      <tr>
                        <th className="p-2.5">Batter</th>
                        <th className="p-2.5">Dismissal</th>
                        <th className="p-2.5 text-right font-mono">R</th>
                        <th className="p-2.5 text-right font-mono">B</th>
                        <th className="p-2.5 text-right font-mono">4s</th>
                        <th className="p-2.5 text-right font-mono">6s</th>
                        <th className="p-2.5 text-right font-mono">SR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#243247] font-mono">
                      {currentInnings.batters.map((b) => (
                        <tr key={b.playerId} className="hover:bg-[#182234]/40">
                          <td className="p-2.5 font-sans font-bold text-white">
                            {b.playerName}
                            {b.isCurrentStriker && <span className="text-emerald-400 ml-1">*</span>}
                          </td>
                          <td className="p-2.5 font-sans text-slate-400 text-[11px]">
                            {b.dismissal ? b.dismissal.description : 'not out'}
                          </td>
                          <td className="p-2.5 text-right font-bold text-white">{b.runs}</td>
                          <td className="p-2.5 text-right text-slate-400">{b.balls}</td>
                          <td className="p-2.5 text-right text-slate-400">{b.fours}</td>
                          <td className="p-2.5 text-right text-slate-400">{b.sixes}</td>
                          <td className="p-2.5 text-right text-emerald-400">{b.strikeRate.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Did Not Bat / Yet to Bat */}
                {didNotBatNames.length > 0 && (
                  <div className="text-[11px] bg-[#131a29] border border-[#243247] px-2.5 py-1.5 rounded mt-2 text-slate-400">
                    <strong className="text-slate-300">
                      {currentInnings.isCompleted ? 'Did not bat: ' : 'Yet to bat: '}
                    </strong>
                    {didNotBatNames.join(', ')}
                  </div>
                )}

                {/* Extras summary */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-[#151c2c] border border-[#243247] p-2.5 rounded mt-2 text-slate-300 font-mono">
                  <span>
                    Extras: <strong className="text-white">{currentInnings.extras.total}</strong> (w {currentInnings.extras.wides}, nb {currentInnings.extras.noBalls}, b {currentInnings.extras.byes}, lb {currentInnings.extras.legByes}
                    {(currentInnings.extras.penalty || 0) > 0 ? `, p ${currentInnings.extras.penalty}` : ''})
                  </span>
                  <span>
                    Total: <strong className="text-white">{currentInnings.totalRuns}/{currentInnings.wickets}{isTest && currentInnings.isDeclared ? 'd' : ''}</strong> ({currentInnings.completedOvers}.{currentInnings.ballsInCurrentOver} ov, RR {((currentInnings.totalRuns / Math.max(1, currentInnings.completedOvers * 6 + currentInnings.ballsInCurrentOver)) * 6).toFixed(2)})
                  </span>
                </div>
              </div>

              {/* Bowling Table */}
              <div>
                <h3 className="text-xs uppercase font-bold text-amber-400 tracking-wider mb-2">
                  {currentInnings.bowlingTeamName} Bowling
                </h3>

                <div className="overflow-x-auto border border-[#243247] rounded">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#182234] text-slate-400 font-semibold border-b border-[#243247]">
                      <tr>
                        <th className="p-2.5">Bowler</th>
                        <th className="p-2.5 text-right font-mono">O</th>
                        <th className="p-2.5 text-right font-mono">M</th>
                        <th className="p-2.5 text-right font-mono">R</th>
                        <th className="p-2.5 text-right font-mono">W</th>
                        <th className="p-2.5 text-right font-mono">Econ</th>
                        <th className="p-2.5 text-right font-mono">Dots</th>
                        {isTest ? (
                          <>
                            <th className="p-2.5 text-right font-mono">Wd</th>
                            <th className="p-2.5 text-right font-mono">Nb</th>
                          </>
                        ) : (
                          <th className="p-2.5 text-right font-mono">Wd/Nb</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#243247] font-mono">
                      {currentInnings.bowlers.map((bw) => (
                        <tr key={bw.playerId} className="hover:bg-[#182234]/40">
                          <td className="p-2.5 font-sans font-bold text-white">{bw.playerName}</td>
                          <td className="p-2.5 text-right">{bw.overs}.{bw.ballsThisOver}</td>
                          <td className="p-2.5 text-right text-slate-400">{bw.maidens}</td>
                          <td className="p-2.5 text-right text-slate-300">{bw.runs}</td>
                          <td className="p-2.5 text-right font-bold text-emerald-400">{bw.wickets}</td>
                          <td className="p-2.5 text-right text-slate-300">{bw.economy.toFixed(2)}</td>
                          <td className="p-2.5 text-right text-slate-400">{bw.dots}</td>
                          {isTest ? (
                            <>
                              <td className="p-2.5 text-right text-slate-400">{bw.wides}</td>
                              <td className="p-2.5 text-right text-slate-400">{bw.noBalls}</td>
                            </>
                          ) : (
                            <td className="p-2.5 text-right text-slate-400">{bw.wides}/{bw.noBalls}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fall of Wickets */}
              {currentInnings.fallOfWickets.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">
                    Fall of Wickets
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs font-mono">
                    {currentInnings.fallOfWickets.map((fow, i) => (
                      <span
                        key={i}
                        className="bg-[#182234] border border-[#243247] px-2.5 py-1 rounded text-slate-300"
                      >
                        <strong className="text-emerald-400">{fow.score}/{fow.wicketNumber}</strong> ({fow.batterName}, {fow.overs} ov)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Partnerships (from Fall of Wickets + Unbroken Stand) */}
              {(currentInnings.fallOfWickets.length > 0 || currentInnings.totalRuns > 0) && (
                <div>
                  <h3 className="text-xs uppercase font-bold text-sky-400 tracking-wider mb-2">
                    Innings Partnerships
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs font-mono">
                    {currentInnings.fallOfWickets.map((fow, i) => (
                      <span
                        key={i}
                        className="bg-[#182234] border border-[#243247] px-2.5 py-1 rounded text-slate-300"
                      >
                        Wkt {fow.wicketNumber}: <strong className="text-white">{fow.partnershipRuns}</strong> ({fow.partnershipBalls}b, {fow.batterName})
                      </span>
                    ))}
                    {currentInnings.wickets < (isViewingSuperOver ? 2 : 10) && (() => {
                      const prevScore = currentInnings.fallOfWickets.length > 0
                        ? currentInnings.fallOfWickets[currentInnings.fallOfWickets.length - 1].score
                        : 0;
                      const unbroken = Math.max(0, currentInnings.totalRuns - prevScore);
                      const totalBatBalls = currentInnings.batters.reduce((s, b) => s + b.balls, 0);
                      const unbrokenBalls = Math.max(0, totalBatBalls - (currentInnings.lastWicketLegalBalls || 0));
                      return unbroken > 0 || unbrokenBalls > 0 ? (
                        <span className="bg-[#182234] border border-emerald-800/40 px-2.5 py-1 rounded text-emerald-300">
                          Unbroken: <strong>{unbroken}*</strong> ({unbrokenBalls}b)
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}

              {/* Player of the Match if complete */}
              {match.playerOfTheMatch && (
                <div className="bg-emerald-950/40 border border-emerald-800/60 p-3 rounded flex items-center space-x-3">
                  <Award className="w-6 h-6 text-amber-400 flex-shrink-0" />
                  <div>
                    <span className="text-[11px] text-amber-400 uppercase font-bold tracking-wider block">
                      Player of the Match
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      {match.playerOfTheMatch.playerName}
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {match.playerOfTheMatch.reason}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10 text-slate-400 text-sm">
              Innings has not commenced yet.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#182234] border-t border-[#243247] p-3 sm:p-4 flex items-center justify-between text-xs text-slate-400">
          <span>Official ICC Match Protocol Scorecard</span>
          <div className="flex items-center gap-2">
            {onReturnToDashboard && (
              <button
                onClick={() => {
                  onClose();
                  onReturnToDashboard();
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded transition cursor-pointer font-bold flex items-center gap-1"
              >
                <span>Return to Dashboard</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="bg-[#243247] hover:bg-[#334155] text-white px-4 py-1.5 rounded transition cursor-pointer font-medium"
            >
              Close Scorecard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
