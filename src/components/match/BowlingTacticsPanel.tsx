import React from 'react';
import {
  BattingAggression,
  BowlingTactic,
  FieldPreset,
  IndividualBowlingPlan,
  Match,
} from '../../types/cricket';
import { getPlayerById } from '../../engine/matchEngine';
import { getMaxOversPerBowler, getEffectiveMaxOversForBowler } from '../../engine/rules';
import { Shield, Check, Activity, AlertCircle } from 'lucide-react';

interface BowlingTacticsPanelProps {
  match: Match;
  onUpdateTactics: (
    battingAggression: BattingAggression,
    bowlingTactic: BowlingTactic,
    fieldPreset: FieldPreset
  ) => void;
  onUpdateBowlingPlan: (plan: IndividualBowlingPlan) => void;
  onChangeBowler: (bowlerId: string) => void;
}

const TEAM_BOWLING_APPROACH_OPTIONS: {
  id: BowlingTactic;
  label: string;
  desc: string;
}[] = [
  {
    id: 'TIGHT_DEFENSIVE',
    label: 'Defensive',
    desc: 'Prioritise controlling runs.',
  },
  {
    id: 'BALANCED_CONTAIN',
    label: 'Balanced',
    desc: 'Balance containment and wicket-taking.',
  },
  {
    id: 'ATTACKING_FULL',
    label: 'Aggressive',
    desc: 'Increase attacking intent.',
  },
  {
    id: 'ATTACKING_FULL', // Or specialized intention
    label: 'Attack for Wickets',
    desc: 'Prioritise dismissal opportunities while accepting greater scoring risk.',
  },
];

interface SimplePlanOption {
  key: string;
  label: string;
  desc: string;
  line: IndividualBowlingPlan['line'];
  length: IndividualBowlingPlan['length'];
  intention: IndividualBowlingPlan['intention'];
  isSpinnerOnly?: boolean;
  isPaceOnly?: boolean;
}

const SIMPLE_BOWLING_PLANS: SimplePlanOption[] = [
  {
    key: 'ATTACK_STUMPS',
    label: 'Attack the stumps',
    desc: 'Target middle stump & full length for bowled or LBW dismissals',
    line: 'MIDDLE_STUMP',
    length: 'FULL',
    intention: 'TARGET_STUMPS',
  },
  {
    key: 'OUTSIDE_OFF',
    label: 'Outside-off line',
    desc: 'Probe corridor of uncertainty on good length outside off stump',
    line: 'FOURTH_STUMP',
    length: 'GOOD_LENGTH',
    intention: 'OUTSIDE_OFF_CONTAINMENT',
  },
  {
    key: 'SHORT_PITCHED',
    label: 'Short-pitched attack where permitted',
    desc: 'Hostile short deliveries into the body to force hurried mistakes',
    line: 'BODY_LINE',
    length: 'SHORT',
    intention: 'FORCE_MISTAKES',
    isPaceOnly: true,
  },
  {
    key: 'YORKER_FULL',
    label: 'Yorker and full-length attack where appropriate',
    desc: 'Blockhole toe-crushers and full deliveries to restrict boundaries',
    line: 'MIDDLE_STUMP',
    length: 'YORKER',
    intention: 'RESTRICT_BOUNDARIES',
  },
  {
    key: 'SPIN_ATTACK',
    label: 'Spin attack where appropriate',
    desc: 'Flight and drift outside off stump to induce edge or stumping',
    line: 'OUTSIDE_OFF',
    length: 'FULL',
    intention: 'ATTACK_WICKETS',
    isSpinnerOnly: true,
  },
  {
    key: 'DEFENSIVE_LINE_LENGTH',
    label: 'Defensive line and length',
    desc: 'Disciplined good length and tight line to starve boundary opportunities',
    line: 'FOURTH_STUMP',
    length: 'GOOD_LENGTH',
    intention: 'DEFEND_RUNS',
  },
];

export const BowlingTacticsPanel: React.FC<BowlingTacticsPanelProps> = ({
  match,
  onUpdateTactics,
  onUpdateBowlingPlan,
  onChangeBowler,
}) => {
  const currentInnings = match.innings[match.currentInningsIndex] || match.innings[0];
  const activeBowler = currentInnings?.currentBowlerId
    ? getPlayerById(currentInnings.currentBowlerId)
    : null;

  const currentPlan: IndividualBowlingPlan =
    (activeBowler && match.individualBowlingPlans?.[activeBowler.id]) || {
      bowlerId: activeBowler?.id || '',
      line: 'FOURTH_STUMP',
      length: 'GOOD_LENGTH',
      intention: 'BUILD_PRESSURE',
    };

  const isSpinner = activeBowler?.bowlingStyle
    ? activeBowler.bowlingStyle.toLowerCase().includes('spin')
    : false;

  const currentBowlingTactic = match.userTactics?.bowlingTactic || 'BALANCED_CONTAIN';

  const bowlingTeamXI =
    currentInnings.bowlingTeamId === match.homeTeamId ? match.homeXI : match.awayXI;
  const bowlingWkId =
    currentInnings.bowlingTeamId === match.homeTeamId
      ? match.homeWicketKeeperId
      : match.awayWicketKeeperId;

  const spellDataMap = match.bowlerSpellData || {};
  const activeSpell = activeBowler ? spellDataMap[activeBowler.id] : null;

  // Filter suitable individual plans for active bowler
  const filteredPlans = SIMPLE_BOWLING_PLANS.filter((p) => {
    if (p.isSpinnerOnly && !isSpinner) return false;
    if (p.isPaceOnly && isSpinner) return false;
    return true;
  });

  const handleTeamApproachChange = (tactic: BowlingTactic, isAttackWickets = false) => {
    onUpdateTactics(
      match.userTactics?.battingAggression || 'BALANCED',
      tactic,
      match.userTactics?.fieldPreset || 'BALANCED_STANDARD'
    );
  };

  const handleSelectSimplePlan = (plan: SimplePlanOption) => {
    if (!activeBowler) return;
    onUpdateBowlingPlan({
      bowlerId: activeBowler.id,
      line: plan.line,
      length: plan.length,
      intention: plan.intention,
      targetBatterId: currentInnings?.currentStrikerId,
    });
  };

  const getFatigueBadge = (fatigue?: string) => {
    switch (fatigue) {
      case 'EXHAUSTED':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">Exhausted</span>;
      case 'HIGH':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">Tired</span>;
      case 'MEDIUM':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Moderate</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Fresh</span>;
    }
  };

  return (
    <div className="match-panel-main rounded-xl p-5 shadow-2xl space-y-6 relative z-10">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-[#1b263b] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">Bowling Settings</h3>
            <p className="text-xs text-slate-400">In-match tactical controls for your national team</p>
          </div>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#131d30] border border-[#22314d] text-emerald-400 font-semibold">
          {currentInnings.bowlingTeamName} Bowling
        </span>
      </div>

      {/* 3.D: CURRENT BOWLER & BOWLING MANAGEMENT */}
      {activeBowler && (
        <div className="bg-[#121a2c] p-4 rounded-lg border border-[#1f2c45] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b263b] pb-2.5">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Current Bowler</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{activeBowler.name || activeBowler.shortName}</span>
                <span className="text-xs text-slate-400">({activeBowler.bowlingStyle || 'Bowler'})</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">Overs Bowled</span>
                <span className="text-white font-bold">
                  {currentInnings.bowlers.find((b) => b.playerId === activeBowler.id)?.overs || 0}.{currentInnings.ballsInCurrentOver} ov
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Spell Length</span>
                <span className="text-emerald-400 font-bold">
                  {activeSpell?.currentSpellOvers || 0} overs
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Format Quota</span>
                <span className="text-slate-200">
                  {match.format === 'TEST'
                    ? 'Uncapped'
                    : `${getEffectiveMaxOversForBowler(
                        match.format,
                        activeBowler.id,
                        currentInnings.bowlers,
                        currentInnings.allocatedOvers ?? match.allocatedOversPerInnings
                      ) - (currentInnings.bowlers.find((b) => b.playerId === activeBowler.id)?.overs || 0)} left`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Fatigue</span>
                {getFatigueBadge(activeSpell?.fatigue)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3.B: TEAM BOWLING APPROACH */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            B. Team Bowling Approach
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">Sets collective bowling strategy</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {TEAM_BOWLING_APPROACH_OPTIONS.map((opt, idx) => {
            const isAttackForWickets = opt.label === 'Attack for Wickets';
            const isActive = isAttackForWickets
              ? currentBowlingTactic === 'ATTACKING_FULL' && idx === 3
              : currentBowlingTactic === opt.id && idx !== 3;

            return (
              <button
                key={`${opt.id}_${idx}`}
                onClick={() => handleTeamApproachChange(opt.id, isAttackForWickets)}
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

      {/* 3.C: INDIVIDUAL BOWLING PLAN */}
      {activeBowler && (
        <div className="space-y-3 border-t border-[#1b263b] pt-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>C. Individual Bowling Plan ({activeBowler.shortName})</span>
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              Delivery execution plan against active batter
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredPlans.map((plan) => {
              const isSelected =
                currentPlan.intention === plan.intention &&
                currentPlan.line === plan.line &&
                currentPlan.length === plan.length;

              return (
                <button
                  key={plan.key}
                  onClick={() => handleSelectSimplePlan(plan)}
                  className={`p-3 rounded-lg text-left transition cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                      : 'bg-[#121a2c] border-[#1f2c45] text-slate-300 hover:border-slate-600 hover:bg-[#162138]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${isSelected ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {plan.label}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{plan.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3.A: SELECT BOWLER FOR NEXT OVER */}
      <div className="space-y-3 border-t border-[#1b263b] pt-5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            A. Select Bowler For Next Over
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">Format restrictions strictly enforced</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1f2c45] text-[11px] text-slate-400 uppercase font-mono bg-[#121a2c]">
                <th className="py-2.5 px-3">Player</th>
                <th className="py-2.5 px-2">Style</th>
                <th className="py-2.5 px-2 text-center">Overs</th>
                <th className="py-2.5 px-2 text-center">Wkts</th>
                <th className="py-2.5 px-2 text-center">Econ</th>
                <th className="py-2.5 px-2 text-center">Fatigue</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b263b]">
              {bowlingTeamXI.map((id) => {
                const player = getPlayerById(id);
                const fig = currentInnings?.bowlers.find((b) => b.playerId === id);
                const overs = fig ? fig.overs : 0;
                const wkts = fig ? fig.wickets : 0;
                const runs = fig ? fig.runs : 0;
                const econ = fig ? fig.economy.toFixed(2) : overs > 0 ? (runs / overs).toFixed(2) : '-';

                const maxQuota =
                  match.format !== 'TEST'
                    ? getEffectiveMaxOversForBowler(
                        match.format,
                        id,
                        currentInnings?.bowlers || [],
                        currentInnings?.allocatedOvers ?? match.allocatedOversPerInnings
                      )
                    : Infinity;

                const isCurrent = id === currentInnings?.currentBowlerId;
                const isWk = id === bowlingWkId;
                const isExhausted = overs >= maxQuota;
                const isMidOver = (currentInnings?.ballsInCurrentOver || 0) > 0;
                const bowledLastOver =
                  currentInnings?.ballsInCurrentOver === 0 &&
                  id === currentInnings?.lastCompletedOverBowlerId;

                const spell = spellDataMap[id];
                const fatigue = spell?.fatigue;

                return (
                  <tr
                    key={id}
                    className={`transition hover:bg-[#121a2c] ${
                      isCurrent ? 'bg-emerald-950/20' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-semibold text-white">
                      <div className="flex items-center gap-1.5">
                        <span>{player.name || player.shortName}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Current
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-slate-400">{player.bowlingStyle || 'Bowler'}</td>
                    <td className="py-2 px-2 text-center font-mono text-slate-200">
                      {overs}
                      {match.format !== 'TEST' && <span className="text-slate-500 text-[10px]">/{maxQuota}</span>}
                    </td>
                    <td className="py-2 px-2 text-center font-mono font-bold text-white">{wkts}</td>
                    <td className="py-2 px-2 text-center font-mono text-slate-300">{econ}</td>
                    <td className="py-2 px-2 text-center">{getFatigueBadge(fatigue)}</td>
                    <td className="py-2 px-3 text-right">
                      {isCurrent ? (
                        <span className="text-[10px] text-emerald-400 font-mono">Active</span>
                      ) : isWk ? (
                        <span className="text-[10px] text-slate-500 font-mono">Wicketkeeper</span>
                      ) : isMidOver ? (
                        <span className="text-[10px] text-slate-500 font-mono">—</span>
                      ) : isExhausted ? (
                        <span className="text-[10px] text-rose-400 font-mono">Quota Full</span>
                      ) : bowledLastOver ? (
                        <span className="text-[10px] text-amber-400 font-mono">Bowled Last Over</span>
                      ) : (
                        <button
                          onClick={() => onChangeBowler(id)}
                          className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                        >
                          Select Bowler
                        </button>
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
  );
};
