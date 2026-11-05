import React from 'react';
import { DRSReviewState, DRSReviewType, Match } from '../../types/cricket';
import { Eye, Check, X, AlertCircle, Volume2 } from 'lucide-react';

interface DRSReviewModalProps {
  match: Match;
  activeReview?: DRSReviewState;
  onExecuteDRS?: (reviewType: DRSReviewType) => void;
  onClose: () => void;
}

export const DRSReviewModal: React.FC<DRSReviewModalProps> = ({
  match,
  activeReview,
  onExecuteDRS,
  onClose,
}) => {
  const currentInnings = match.innings[match.currentInningsIndex] || match.innings[0];
  const reviewsRemaining = match.drsReviewsRemaining || { home: 2, away: 2 };
  const userTeamId = match.userTeamId || match.homeTeamId;
  const isUserHome = userTeamId === match.homeTeamId;
  const userRemaining = isUserHome ? reviewsRemaining.home : reviewsRemaining.away;

  // The latest review from history or active
  const review = activeReview || match.activeDRSReview || (match.drsHistory && match.drsHistory[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-100">
        {/* Header - Broadcast TV Graphics Style */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-5 py-3 border-b border-indigo-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black tracking-wider text-white text-xs shadow-md">
              DRS
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide uppercase text-white">
                Decision Review System
              </h3>
              <p className="text-[10px] text-indigo-300 font-mono tracking-wider">
                THIRD UMPIRE PROTOCOL • ICC CERTIFIED
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-300">Reviews Left:</span>
            <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700 text-indigo-300 font-bold">
              {userRemaining}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {review ? (
            <div className="space-y-4">
              {/* Top summary card */}
              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Review Requested
                  </span>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{review.reviewType === 'LBW' ? 'LBW Ball Tracking' : 'UltraEdge Snickometer'}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Over {review.overNumber}.{review.ballInOver}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    On-Field Decision
                  </span>
                  <div
                    className={`text-sm font-black px-2 py-0.5 rounded text-center ${
                      review.originalDecision === 'OUT'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {review.originalDecision}
                  </div>
                </div>
              </div>

              {/* Graphic Simulation for LBW Ball Tracking */}
              {review.reviewType === 'LBW' && review.ballTracking && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>BALL TRACKING ANALYSIS</span>
                    <span className="text-[10px] font-mono text-emerald-400">HAWK-EYE 3D</span>
                  </div>

                  {/* 3 Step Matrix: Pitching, Impact, Wickets */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {/* Pitching */}
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                        Pitching
                      </span>
                      <span
                        className={`font-black text-xs ${
                          review.ballTracking.pitching === 'IN_LINE'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {review.ballTracking.pitching.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Impact */}
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                        Impact
                      </span>
                      <span
                        className={`font-black text-xs ${
                          review.ballTracking.impact === 'IN_LINE'
                            ? 'text-emerald-400'
                            : review.ballTracking.impact === 'UMPIRES_CALL'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {review.ballTracking.impact.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Wickets */}
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                        Wickets
                      </span>
                      <span
                        className={`font-black text-xs ${
                          review.ballTracking.wickets === 'HITTING'
                            ? 'text-emerald-400'
                            : review.ballTracking.wickets === 'UMPIRES_CALL'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {review.ballTracking.wickets.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Graphic Wickets Projection */}
                  <div className="relative h-20 bg-emerald-950/20 border border-emerald-800/40 rounded-lg flex items-center justify-center overflow-hidden">
                    {/* Stumps illustration */}
                    <div className="flex items-end gap-1.5 h-14">
                      <div className="w-1.5 h-12 bg-amber-400 rounded-t" />
                      <div className="w-1.5 h-12 bg-amber-400 rounded-t" />
                      <div className="w-1.5 h-12 bg-amber-400 rounded-t" />
                    </div>
                    {/* Bails */}
                    <div className="absolute top-3 w-8 h-1 bg-amber-300" />

                    {/* Projected ball line */}
                    <div
                      className={`absolute w-3 h-3 rounded-full shadow-lg ${
                        review.ballTracking.wickets === 'HITTING'
                          ? 'bg-rose-500 animate-ping'
                          : review.ballTracking.wickets === 'UMPIRES_CALL'
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ top: '35%', left: '50%', transform: 'translate(-50%, -50%)' }}
                    />
                  </div>
                </div>
              )}

              {/* Graphic Simulation for UltraEdge / Snicko */}
              {review.reviewType === 'CAUGHT_BEHIND' && review.ultraEdge && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                      ULTRA-EDGE SOUND WAVE
                    </span>
                    <span className="text-[10px] font-mono text-sky-400">ACOUSTIC SENSOR</span>
                  </div>

                  {/* Soundwave Oscilloscope Display */}
                  <div className="h-16 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center px-4 relative overflow-hidden">
                    <svg viewBox="0 0 300 60" className="w-full h-full">
                      <path
                        d={
                          review.ultraEdge.hasSpike
                            ? 'M0,30 L60,30 L90,28 L110,32 L130,29 L140,5 L145,55 L150,2 L155,58 L160,30 L180,31 L210,29 L300,30'
                            : 'M0,30 L50,30 L80,31 L110,29 L140,31 L150,30 L160,31 L190,29 L230,30 L300,30'
                        }
                        fill="none"
                        stroke={review.ultraEdge.hasSpike ? '#38bdf8' : '#64748b'}
                        strokeWidth="2"
                      />
                    </svg>
                  </div>

                  <div className="text-center font-bold text-xs">
                    {review.ultraEdge.hasSpike ? (
                      <span className="text-sky-400">DEFLECTION DETECTED ON BAT EDGE</span>
                    ) : (
                      <span className="text-slate-400">NO SPIKE DETECTED • GAP BETWEEN BAT AND BALL</span>
                    )}
                  </div>
                </div>
              )}

              {/* Final Verdict Banner */}
              <div
                className={`p-3 rounded-xl text-center border font-black text-base tracking-wider ${
                  review.finalDecision === 'OUT'
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                    : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                }`}
              >
                FINAL VERDICT: {review.finalDecision}
                <div className="text-xs font-semibold mt-0.5 text-slate-300">
                  {review.outcome === 'DECISION_OVERTURNED'
                    ? 'Decision Overturned'
                    : review.outcome === 'UMPIRES_CALL'
                    ? "Umpire's Call • Original Decision Stands"
                    : 'Decision Upheld'}
                </div>
              </div>

              {/* Retention Status */}
              <div className="flex items-center justify-between text-xs px-2 text-slate-400">
                <span>ICC Review Status:</span>
                <span
                  className={`font-bold ${
                    review.retained ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {review.retained ? '✓ Review Retained' : '✗ Review Lost'}
                </span>
              </div>
            </div>
          ) : (
            /* Review Request Trigger Mode */
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Request a Decision Review for the last delivery. You have{' '}
                <span className="font-bold text-white">{userRemaining}</span> review(s) remaining.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onExecuteDRS && onExecuteDRS('LBW')}
                  disabled={userRemaining <= 0}
                  className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-xs font-bold text-white mb-1">Review LBW</div>
                  <div className="text-[11px] text-slate-400">
                    Hawk-Eye ball tracking for line, impact, and stumps.
                  </div>
                </button>

                <button
                  onClick={() => onExecuteDRS && onExecuteDRS('CAUGHT_BEHIND')}
                  disabled={userRemaining <= 0}
                  className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-xs font-bold text-white mb-1">Review Caught Behind</div>
                  <div className="text-[11px] text-slate-400">
                    UltraEdge sound wave for bat edge or glove deflection.
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
          >
            Close DRS
          </button>
        </div>
      </div>
    </div>
  );
};
