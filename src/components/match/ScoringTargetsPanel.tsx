import React, { useState } from 'react';
import { CustomScoringTarget, PhaseScoringTargets, Match } from '../../types/cricket';
import { evaluateScoringTargetProgress } from '../../engine/tacticalEngine';
import { Target, TrendingUp, Plus } from 'lucide-react';

interface ScoringTargetsPanelProps {
  match: Match;
  onUpdateCustomTargets: (targets: CustomScoringTarget[]) => void;
  onUpdatePhaseTargets: (phaseTargets: PhaseScoringTargets) => void;
}

export const ScoringTargetsPanel: React.FC<ScoringTargetsPanelProps> = ({
  match,
  onUpdateCustomTargets,
  onUpdatePhaseTargets,
}) => {
  const currentInnings = match.innings[match.currentInningsIndex] || match.innings[0];
  const phaseTargets = match.phaseScoringTargets;
  const customTargets = match.customScoringTargets || [];

  const [newTargetOver, setNewTargetOver] = useState<number>(
    Math.min(
      match.format === 'T20I' ? 20 : match.format === 'ODI' ? 50 : 80,
      Math.floor(currentInnings.completedOvers + 10)
    )
  );
  const [newTargetScore, setNewTargetScore] = useState<number>(currentInnings.totalRuns + 60);
  const [newTargetLabel, setNewTargetLabel] = useState<string>('Milestone Target');

  const handleAddCustomTarget = () => {
    if (newTargetOver <= currentInnings.completedOvers || newTargetScore <= currentInnings.totalRuns) {
      return;
    }
    const newTarget: CustomScoringTarget = {
      id: `target_${Date.now()}`,
      targetScore: newTargetScore,
      targetOver: newTargetOver,
      label: newTargetLabel,
    };
    onUpdateCustomTargets([...customTargets, newTarget]);
  };

  const handleRemoveTarget = (id: string) => {
    onUpdateCustomTargets(customTargets.filter((t) => t.id !== id));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AHEAD_OF_PLAN':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
      case 'ON_TRACK':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/40';
      case 'BEHIND_PLAN':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/40';
      case 'TARGET_ACHIEVED':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/40';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  const overallEval = evaluateScoringTargetProgress(
    currentInnings.totalRuns,
    currentInnings.completedOvers,
    currentInnings.ballsInCurrentOver,
    currentInnings.wickets,
    customTargets,
    match.format,
    match.allocatedOversPerInnings
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-5">
      {/* Format Phase Targets (ODI & T20I) */}
      {phaseTargets && (match.format === 'ODI' || match.format === 'T20I') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              {match.format} Phase Scoring Milestones
            </h4>
            <span className="text-[11px] text-slate-400">
              Current: {currentInnings.completedOvers}.{currentInnings.ballsInCurrentOver} ovs •{' '}
              {currentInnings.totalRuns}/{currentInnings.wickets}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Powerplay */}
            {phaseTargets.powerplayTarget && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    {phaseTargets.powerplayTarget.label || 'Powerplay Phase'}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    By Over {phaseTargets.powerplayTarget.targetOver}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-400">Target Score:</span>
                  <span className="font-bold text-white tabular-nums">
                    {phaseTargets.powerplayTarget.targetScore} runs
                  </span>
                </div>

                <div className="pt-1 flex justify-end">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      currentInnings.totalRuns >= phaseTargets.powerplayTarget.targetScore
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                        : currentInnings.completedOvers < phaseTargets.powerplayTarget.targetOver
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}
                  >
                    {currentInnings.totalRuns >= phaseTargets.powerplayTarget.targetScore
                      ? 'ACHIEVED'
                      : currentInnings.completedOvers < phaseTargets.powerplayTarget.targetOver
                      ? 'IN PROGRESS'
                      : 'MISSED'}
                  </span>
                </div>
              </div>
            )}

            {/* Middle Phase */}
            {phaseTargets.middlePhaseTarget && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    {phaseTargets.middlePhaseTarget.label || 'Middle Phase'}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    By Over {phaseTargets.middlePhaseTarget.targetOver}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-400">Target Score:</span>
                  <span className="font-bold text-white tabular-nums">
                    {phaseTargets.middlePhaseTarget.targetScore} runs
                  </span>
                </div>

                <div className="pt-1 flex justify-end">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      currentInnings.totalRuns >= phaseTargets.middlePhaseTarget.targetScore
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                        : currentInnings.completedOvers < phaseTargets.middlePhaseTarget.targetOver
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}
                  >
                    {currentInnings.totalRuns >= phaseTargets.middlePhaseTarget.targetScore
                      ? 'ACHIEVED'
                      : currentInnings.completedOvers < phaseTargets.middlePhaseTarget.targetOver
                      ? 'IN PROGRESS'
                      : 'MISSED'}
                  </span>
                </div>
              </div>
            )}

            {/* Death Phase */}
            {phaseTargets.deathPhaseTarget && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    {phaseTargets.deathPhaseTarget.label || 'Death Phase'}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    By Over {phaseTargets.deathPhaseTarget.targetOver}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-400">Target Score:</span>
                  <span className="font-bold text-white tabular-nums">
                    {phaseTargets.deathPhaseTarget.targetScore} runs
                  </span>
                </div>

                <div className="pt-1 flex justify-end">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      currentInnings.totalRuns >= phaseTargets.deathPhaseTarget.targetScore
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                        : currentInnings.completedOvers < phaseTargets.deathPhaseTarget.targetOver
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}
                  >
                    {currentInnings.totalRuns >= phaseTargets.deathPhaseTarget.targetScore
                      ? 'ACHIEVED'
                      : currentInnings.completedOvers < phaseTargets.deathPhaseTarget.targetOver
                      ? 'IN PROGRESS'
                      : 'MISSED'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Innings Scoring Targets */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
            <Target className="w-4 h-4 text-sky-400" />
            Custom Innings Milestones
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">
            Overall Status:{' '}
            <strong className={getStatusBadge(overallEval.status)}>{overallEval.status.replace(/_/g, ' ')}</strong>
          </span>
        </div>

        {/* Existing Custom Targets List */}
        {customTargets.length > 0 ? (
          <div className="space-y-2">
            {customTargets.map((target) => {
              const runsNeeded = Math.max(0, target.targetScore - currentInnings.totalRuns);
              const oversRemaining = Math.max(
                0,
                target.targetOver - (currentInnings.completedOvers + currentInnings.ballsInCurrentOver / 6)
              );
              const rrr = oversRemaining > 0 ? runsNeeded / oversRemaining : 0;
              const isAchieved = currentInnings.totalRuns >= target.targetScore;

              return (
                <div
                  key={target.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{target.label || 'Target'}: {target.targetScore} runs</span>
                      <span className="text-slate-400 font-normal">by Over {target.targetOver}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {isAchieved
                        ? 'Target achieved!'
                        : `Need ${runsNeeded} runs in ${oversRemaining.toFixed(1)} overs (Req RR: ${rrr.toFixed(2)})`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        isAchieved
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                          : oversRemaining > 0
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      }`}
                    >
                      {isAchieved ? 'ACHIEVED' : oversRemaining > 0 ? 'ACTIVE' : 'EXPIRED'}
                    </span>
                    <button
                      onClick={() => handleRemoveTarget(target.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Remove Target"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic bg-slate-950 p-3 rounded-lg border border-slate-800/60">
            No active custom scoring targets set. Add a milestone below to dynamically calibrate batter urgency.
          </p>
        )}

        {/* Add New Milestone Form */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span>Label:</span>
            <input
              type="text"
              value={newTargetLabel}
              onChange={(e) => setNewTargetLabel(e.target.value)}
              className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span>Score:</span>
            <input
              type="number"
              value={newTargetScore}
              onChange={(e) => setNewTargetScore(Number(e.target.value))}
              className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span>Over:</span>
            <input
              type="number"
              value={newTargetOver}
              onChange={(e) => setNewTargetOver(Number(e.target.value))}
              className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
            />
          </div>

          <button
            onClick={handleAddCustomTarget}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition ml-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Set Target
          </button>
        </div>
      </div>
    </div>
  );
};
