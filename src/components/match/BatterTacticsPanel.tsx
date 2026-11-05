import React, { useState } from 'react';
import {
  BattingAggression,
  BattingApproach,
  BowlingTactic,
  FieldPreset,
  IndividualBatterInstruction,
  CustomScoringTarget,
  PhaseScoringTargets,
  Match,
} from '../../types/cricket';
import { getPlayerById } from '../../engine/matchEngine';
import { evaluateScoringTargetProgress } from '../../engine/tacticalEngine';
import { Flame, User, Target, Check, Plus, Trash2 } from 'lucide-react';

interface BatterTacticsPanelProps {
  match: Match;
  onUpdateTactics: (
    battingAggression: BattingAggression,
    bowlingTactic: BowlingTactic,
    fieldPreset: FieldPreset
  ) => void;
  onUpdateInstruction: (instruction: IndividualBatterInstruction) => void;
  onUpdateCustomTargets?: (targets: CustomScoringTarget[]) => void;
  onUpdatePhaseTargets?: (phaseTargets: PhaseScoringTargets) => void;
}

const TEAM_APPROACH_OPTIONS: {
  id: BattingAggression;
  label: string;
  desc: string;
}[] = [
  {
    id: 'DEFENSIVE',
    label: 'Defensive',
    desc: 'Prioritise protecting wickets.',
  },
  {
    id: 'BALANCED',
    label: 'Balanced',
    desc: 'Balance scoring and wicket preservation.',
  },
  {
    id: 'ATTACKING',
    label: 'Aggressive',
    desc: 'Look for more scoring opportunities and accept calculated risks.',
  },
  {
    id: 'SMASH',
    label: 'Smash',
    desc: 'Prioritise attacking shots and boundaries with greater dismissal risk.',
  },
];

const INDIVIDUAL_BATTER_APPROACH_OPTIONS: {
  id: BattingApproach;
  label: string;
  desc: string;
}[] = [
  {
    id: 'DEFENSIVE',
    label: 'Defensive',
    desc: 'Prioritise protecting wickets.',
  },
  {
    id: 'BALANCED',
    label: 'Balanced',
    desc: 'Balance scoring and wicket preservation.',
  },
  {
    id: 'AGGRESSIVE',
    label: 'Aggressive',
    desc: 'Look for more scoring opportunities and accept calculated risks.',
  },
  {
    id: 'SMASH',
    label: 'Smash',
    desc: 'Prioritise attacking shots and boundaries with greater dismissal risk.',
  },
];

export const BatterTacticsPanel: React.FC<BatterTacticsPanelProps> = ({
  match,
  onUpdateTactics,
  onUpdateInstruction,
  onUpdateCustomTargets,
  onUpdatePhaseTargets,
}) => {
  const currentInnings = match.innings[match.currentInningsIndex] || match.innings[0];
  const striker = currentInnings?.currentStrikerId ? getPlayerById(currentInnings.currentStrikerId) : null;
  const nonStriker = currentInnings?.currentNonStrikerId ? getPlayerById(currentInnings.currentNonStrikerId) : null;

  // Selected active batter (Striker by default)
  const [selectedBatterId, setSelectedBatterId] = useState<string>(striker?.id || '');
  const activeBatter = (selectedBatterId === nonStriker?.id ? nonStriker : striker) || striker || nonStriker;

  // Custom target creation state
  const [customOver, setCustomOver] = useState<number>(
    Math.min(
      match.format === 'T20I' ? 20 : match.format === 'ODI' ? 50 : 80,
      Math.floor(currentInnings.completedOvers + 10)
    )
  );
  const [customScore, setCustomScore] = useState<number>(currentInnings.totalRuns + 45);

  const currentTeamApproach: BattingAggression = match.userTactics?.battingAggression || 'BALANCED';

  // Current individual approach for the active batter
  const currentInstruction: IndividualBatterInstruction =
    (activeBatter && match.individualBatterInstructions?.[activeBatter.id]) || {
      playerId: activeBatter?.id || '',
      approach: 'BALANCED',
      shotSelection: 'LOOK_FOR_BOUNDARIES',
    };

  const handleTeamApproachChange = (app: BattingAggression) => {
    onUpdateTactics(
      app,
      match.userTactics?.bowlingTactic || 'BALANCED_CONTAIN',
      match.userTactics?.fieldPreset || 'BALANCED_STANDARD'
    );
  };

  const handleIndividualApproachChange = (app: BattingApproach) => {
    if (!activeBatter) return;
    onUpdateInstruction({
      playerId: activeBatter.id,
      approach: app,
      shotSelection: currentInstruction.shotSelection || 'LOOK_FOR_BOUNDARIES',
    });
  };

  // Target helpers
  const customTargets = match.customScoringTargets || [];
  const phaseTargets = match.phaseScoringTargets;

  const handleAddCustomTarget = () => {
    if (customOver <= currentInnings.completedOvers || customScore <= currentInnings.totalRuns) {
      return;
    }
    const newTarget: CustomScoringTarget = {
      id: `target_${Date.now()}`,
      targetScore: customScore,
      targetOver: customOver,
      label: `Over ${customOver} Milestone`,
    };
    if (onUpdateCustomTargets) {
      onUpdateCustomTargets([...customTargets, newTarget]);
    }
  };

  const handleRemoveCustomTarget = (id: string) => {
    if (onUpdateCustomTargets) {
      onUpdateCustomTargets(customTargets.filter((t) => t.id !== id));
    }
  };

  const handlePhaseTargetChange = (phase: 'powerplay' | 'middle' | 'death', score: number) => {
    if (!phaseTargets || !onUpdatePhaseTargets) return;
    const updated: PhaseScoringTargets = { ...phaseTargets };
    if (phase === 'powerplay' && updated.powerplayTarget) {
      updated.powerplayTarget = { ...updated.powerplayTarget, targetScore: score };
    } else if (phase === 'middle' && updated.middlePhaseTarget) {
      updated.middlePhaseTarget = { ...updated.middlePhaseTarget, targetScore: score };
    } else if (phase === 'death' && updated.deathPhaseTarget) {
      updated.deathPhaseTarget = { ...updated.deathPhaseTarget, targetScore: score };
    }
    onUpdatePhaseTargets(updated);
  };

  // Evaluate active targets
  const targetEval = evaluateScoringTargetProgress(
    currentInnings.totalRuns,
    currentInnings.completedOvers,
    currentInnings.ballsInCurrentOver,
    currentInnings.wickets,
    customTargets,
    match.format,
    match.allocatedOversPerInnings
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AHEAD_OF_PLAN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Ahead</span>;
      case 'ON_TRACK':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">On Track</span>;
      case 'BEHIND_PLAN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Behind</span>;
      case 'TARGET_ACHIEVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">Achieved</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#0b101b] border border-[#1b263b] rounded-xl p-5 shadow-2xl space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-[#1b263b] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">Batting Settings</h3>
            <p className="text-xs text-slate-400">In-match tactical controls for your national team</p>
          </div>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#131d30] border border-[#22314d] text-emerald-400 font-semibold">
          {currentInnings.battingTeamName} Batting
        </span>
      </div>

      {/* 2.A: TEAM BATTING APPROACH */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <span>A. Team Batting Approach</span>
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">Applies to the entire team</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {TEAM_APPROACH_OPTIONS.map((opt) => {
            const isActive = currentTeamApproach === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleTeamApproachChange(opt.id)}
                className={`p-3 rounded-lg text-left transition cursor-pointer border ${
                  isActive
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                    : 'bg-[#121a2c] border-[#1f2c45] text-slate-300 hover:border-slate-600 hover:bg-[#162138]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${isActive ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {opt.label}
                  </span>
                  {isActive && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2.B: INDIVIDUAL BATTER APPROACH */}
      <div className="space-y-3 border-t border-[#1b263b] pt-5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span>B. Individual Batter Approach</span>
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">Select batter to assign custom approach</span>
        </div>

        {/* Batter Selection Tabs (Striker vs Non-Striker) */}
        <div className="flex flex-wrap gap-2">
          {striker && (
            <button
              onClick={() => setSelectedBatterId(striker.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                activeBatter?.id === striker.id
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                  : 'bg-[#121a2c] border-[#1f2c45] text-slate-300 hover:text-white'
              }`}
            >
              <span>{striker.shortName}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30 text-emerald-200">* Striker</span>
            </button>
          )}

          {nonStriker && (
            <button
              onClick={() => setSelectedBatterId(nonStriker.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                activeBatter?.id === nonStriker.id
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                  : 'bg-[#121a2c] border-[#1f2c45] text-slate-300 hover:text-white'
              }`}
            >
              <span>{nonStriker.shortName}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30 text-slate-300">Non-Striker</span>
            </button>
          )}
        </div>

        {/* Individual Approach 4 Options */}
        {activeBatter && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            {INDIVIDUAL_BATTER_APPROACH_OPTIONS.map((opt) => {
              const isActive = (currentInstruction.approach || 'BALANCED') === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleIndividualApproachChange(opt.id)}
                  className={`p-3 rounded-lg text-left transition cursor-pointer border ${
                    isActive
                      ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                      : 'bg-[#121a2c] border-[#1f2c45] text-slate-300 hover:border-slate-600 hover:bg-[#162138]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${isActive ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {opt.label}
                    </span>
                    {isActive && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2.C: SCORING TARGETS */}
      <div className="space-y-4 border-t border-[#1b263b] pt-5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>C. Scoring Targets & Innings Progression</span>
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">
            Current: {currentInnings.completedOvers}.{currentInnings.ballsInCurrentOver} ovs • {currentInnings.totalRuns}/{currentInnings.wickets}
          </span>
        </div>

        {/* Format Specific Phase Targets for ODI & T20I */}
        {phaseTargets && (match.format === 'ODI' || match.format === 'T20I') && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Powerplay Target */}
            {phaseTargets.powerplayTarget && (
              <div className="bg-[#121a2c] p-3 rounded-lg border border-[#1f2c45] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    {match.format === 'T20I' ? 'Powerplay (Ovs 1–6)' : 'Powerplay 1 (Ovs 1–10)'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-[#0e1626] px-1.5 py-0.5 rounded">
                    By Ov {phaseTargets.powerplayTarget.targetOver}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Target Runs:</span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={phaseTargets.powerplayTarget.targetScore}
                    onChange={(e) => handlePhaseTargetChange('powerplay', parseInt(e.target.value) || 0)}
                    className="w-20 bg-[#0b101b] border border-[#243555] rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#1b263b] font-mono text-slate-400">
                  <span>
                    Rem: {Math.max(0, phaseTargets.powerplayTarget.targetScore - currentInnings.totalRuns)}r in{' '}
                    {Math.max(0, phaseTargets.powerplayTarget.targetOver - currentInnings.completedOvers)} ovs
                  </span>
                  {currentInnings.completedOvers < phaseTargets.powerplayTarget.targetOver &&
                    getStatusBadge(
                      currentInnings.totalRuns >=
                        (phaseTargets.powerplayTarget.targetScore / phaseTargets.powerplayTarget.targetOver) *
                          currentInnings.completedOvers
                        ? 'AHEAD_OF_PLAN'
                        : 'BEHIND_PLAN'
                    )}
                </div>
              </div>
            )}

            {/* Middle Phase Target */}
            {phaseTargets.middlePhaseTarget && (
              <div className="bg-[#121a2c] p-3 rounded-lg border border-[#1f2c45] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    {match.format === 'T20I' ? 'Middle Overs (Ovs 7–15)' : 'Middle Phase (Ovs 11–40)'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-[#0e1626] px-1.5 py-0.5 rounded">
                    By Ov {phaseTargets.middlePhaseTarget.targetOver}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Target Runs:</span>
                  <input
                    type="number"
                    min="1"
                    max="600"
                    value={phaseTargets.middlePhaseTarget.targetScore}
                    onChange={(e) => handlePhaseTargetChange('middle', parseInt(e.target.value) || 0)}
                    className="w-20 bg-[#0b101b] border border-[#243555] rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#1b263b] font-mono text-slate-400">
                  <span>
                    Rem: {Math.max(0, phaseTargets.middlePhaseTarget.targetScore - currentInnings.totalRuns)}r in{' '}
                    {Math.max(0, phaseTargets.middlePhaseTarget.targetOver - currentInnings.completedOvers)} ovs
                  </span>
                  {currentInnings.completedOvers < phaseTargets.middlePhaseTarget.targetOver &&
                    getStatusBadge(
                      currentInnings.totalRuns >=
                        (phaseTargets.middlePhaseTarget.targetScore / phaseTargets.middlePhaseTarget.targetOver) *
                          currentInnings.completedOvers
                        ? 'AHEAD_OF_PLAN'
                        : 'BEHIND_PLAN'
                    )}
                </div>
              </div>
            )}

            {/* Death Phase Target */}
            {phaseTargets.deathPhaseTarget && (
              <div className="bg-[#121a2c] p-3 rounded-lg border border-[#1f2c45] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    {match.format === 'T20I' ? 'Death Overs (Ovs 16–20)' : 'Death Phase (Ovs 41–50)'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-[#0e1626] px-1.5 py-0.5 rounded">
                    By Ov {phaseTargets.deathPhaseTarget.targetOver}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Target Runs:</span>
                  <input
                    type="number"
                    min="1"
                    max="600"
                    value={phaseTargets.deathPhaseTarget.targetScore}
                    onChange={(e) => handlePhaseTargetChange('death', parseInt(e.target.value) || 0)}
                    className="w-20 bg-[#0b101b] border border-[#243555] rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#1b263b] font-mono text-slate-400">
                  <span>
                    Rem: {Math.max(0, phaseTargets.deathPhaseTarget.targetScore - currentInnings.totalRuns)}r in{' '}
                    {Math.max(0, phaseTargets.deathPhaseTarget.targetOver - currentInnings.completedOvers)} ovs
                  </span>
                  {currentInnings.completedOvers < phaseTargets.deathPhaseTarget.targetOver &&
                    getStatusBadge(
                      currentInnings.totalRuns >=
                        (phaseTargets.deathPhaseTarget.targetScore / phaseTargets.deathPhaseTarget.targetOver) *
                          currentInnings.completedOvers
                        ? 'AHEAD_OF_PLAN'
                        : 'BEHIND_PLAN'
                    )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom / Milestone Target Setter & Active List */}
        <div className="bg-[#121a2c] p-3.5 rounded-lg border border-[#1f2c45] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-200">
              {match.format === 'TEST' ? 'Set Test Milestone Target' : 'Add Custom Over Milestone'}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span>Target Score:</span>
                <input
                  type="number"
                  min="1"
                  value={customScore}
                  onChange={(e) => setCustomScore(parseInt(e.target.value) || 0)}
                  className="w-16 bg-[#0b101b] border border-[#243555] rounded px-2 py-0.5 text-xs text-white font-mono"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span>by Over:</span>
                <input
                  type="number"
                  min={currentInnings.completedOvers + 1}
                  value={customOver}
                  onChange={(e) => setCustomOver(parseInt(e.target.value) || 0)}
                  className="w-14 bg-[#0b101b] border border-[#243555] rounded px-2 py-0.5 text-xs text-white font-mono"
                />
              </div>
              <button
                onClick={handleAddCustomTarget}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Active Custom Targets List */}
          {customTargets.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#1b263b]">
              {customTargets.map((target) => {
                const runsRemaining = Math.max(0, target.targetScore - currentInnings.totalRuns);
                const oversRemaining = Math.max(0, target.targetOver - currentInnings.completedOvers);
                const isPassed = currentInnings.completedOvers >= target.targetOver;
                const isAchieved = currentInnings.totalRuns >= target.targetScore;
                const status = isAchieved
                  ? 'TARGET_ACHIEVED'
                  : isPassed
                  ? 'BEHIND_PLAN'
                  : currentInnings.totalRuns >= (target.targetScore / target.targetOver) * currentInnings.completedOvers
                  ? 'AHEAD_OF_PLAN'
                  : 'BEHIND_PLAN';

                return (
                  <div
                    key={target.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-[#0b101b] border border-[#1b263b] text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">
                        {target.targetScore} runs by Over {target.targetOver}
                      </span>
                      <span className="text-[11px] text-slate-400">({target.label})</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-300 text-[11px]">
                        Rem: <strong className="text-white">{runsRemaining}r</strong> in {oversRemaining} ovs
                      </span>
                      {getStatusBadge(status)}
                      <button
                        onClick={() => handleRemoveCustomTarget(target.id)}
                        className="text-slate-500 hover:text-rose-400 transition cursor-pointer p-0.5"
                        title="Remove Target"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
