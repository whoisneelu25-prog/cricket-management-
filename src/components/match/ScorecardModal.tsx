import React, { useState } from 'react';
import { X, Award, FileText, ChevronRight } from 'lucide-react';
import { Match, InningsState } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';

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

  const currentInnings = match.innings[activeInningsIdx] || match.innings[0];

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

        {/* Innings Tabs */}
        {match.innings.length > 0 && (
          <div className="bg-[#151c2c] border-b border-[#243247] px-4 py-2 flex items-center space-x-2">
            {match.innings.map((inn, idx) => (
              <button
                key={idx}
                onClick={() => setActiveInningsIdx(idx)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                  activeInningsIdx === idx
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-[#1f293d]'
                }`}
              >
                {inn.battingTeamName} ({inn.totalRuns}/{inn.wickets} in {inn.completedOvers}.{inn.ballsInCurrentOver} ov)
              </button>
            ))}
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
                    {currentInnings.totalRuns}/{currentInnings.wickets} ({currentInnings.completedOvers}.{currentInnings.ballsInCurrentOver} Overs)
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

                {/* Extras summary */}
                <div className="flex items-center justify-between text-xs bg-[#151c2c] border border-[#243247] p-2.5 rounded mt-2 text-slate-300 font-mono">
                  <span>
                    Extras: <strong className="text-white">{currentInnings.extras.total}</strong> (w {currentInnings.extras.wides}, nb {currentInnings.extras.noBalls}, b {currentInnings.extras.byes}, lb {currentInnings.extras.legByes})
                  </span>
                  <span>
                    Total: <strong className="text-white">{currentInnings.totalRuns}/{currentInnings.wickets}</strong> ({currentInnings.completedOvers}.{currentInnings.ballsInCurrentOver} ov, RR {((currentInnings.totalRuns / Math.max(1, currentInnings.completedOvers * 6 + currentInnings.ballsInCurrentOver)) * 6).toFixed(2)})
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
                        <th className="p-2.5 text-right font-mono">Wd/Nb</th>
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
                          <td className="p-2.5 text-right text-slate-400">{bw.wides}/{bw.noBalls}</td>
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
                    {currentInnings.wickets < 10 && (() => {
                      const prevScore = currentInnings.fallOfWickets.length > 0
                        ? currentInnings.fallOfWickets[currentInnings.fallOfWickets.length - 1].score
                        : 0;
                      const unbroken = Math.max(0, currentInnings.totalRuns - prevScore);
                      return unbroken > 0 ? (
                        <span className="bg-[#182234] border border-emerald-800/40 px-2.5 py-1 rounded text-emerald-300">
                          Unbroken: <strong>{unbroken}*</strong>
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
