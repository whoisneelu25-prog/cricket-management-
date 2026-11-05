import React from 'react';
import {
  BowlingLine,
  BowlingLength,
  FastBowlingVariation,
  SpinBowlingVariation,
  BowlingIntention,
  IndividualBowlingPlan,
  BowlerSpellData,
  BowlerFatigueLevel,
  Match,
} from '../../types/cricket';
import { getPlayerById } from '../../engine/matchEngine';
import { getMaxOversPerBowler } from '../../engine/rules';
import { PlayerAvatar } from '../common/PlayerAvatar';

interface BowlingTacticsPanelProps {
  match: Match;
  onUpdateBowlingPlan: (plan: IndividualBowlingPlan) => void;
  onChangeBowler: (bowlerId: string) => void;
}

const LINE_OPTIONS: { id: BowlingLine; label: string }[] = [
  { id: 'FOURTH_STUMP', label: '4th / 5th Stump Channel (Corridor of Uncertainty)' },
  { id: 'OUTSIDE_OFF', label: 'Outside Off Stump' },
  { id: 'MIDDLE_STUMP', label: 'Middle Stump / Direct at Wickets' },
  { id: 'LEG_STUMP', label: 'Target Leg Stump Corridor' },
  { id: 'WIDE_OUTSIDE_OFF', label: 'Wide Line Outside Off' },
  { id: 'BODY_LINE', label: 'Bodyline / Rib Cage Channel' },
];

const LENGTH_OPTIONS: { id: BowlingLength; label: string }[] = [
  { id: 'GOOD_LENGTH', label: 'Good Length (Hard to drive / Edge zone)' },
  { id: 'FULL', label: 'Full Pitch (Encourage drive / LBW)' },
  { id: 'YORKER', label: 'Toe-Crushing Yorker Blockhole' },
  { id: 'BACK_OF_A_LENGTH', label: 'Back of a Length (Hit the deck)' },
  { id: 'SHORT', label: 'Short Pitch Delivery' },
  { id: 'BOUNCER', label: 'Aggressive Bouncer' },
];

const FAST_VARIATIONS: { id: FastBowlingVariation; label: string }[] = [
  { id: 'OUTSWING', label: 'Conventional Outswing' },
  { id: 'INSWING', label: 'Conventional Inswing' },
  { id: 'REVERSE_SWING', label: 'Late Reverse Swing' },
  { id: 'SLOWER_BALL', label: 'Deceptive Slower Ball' },
  { id: 'CUTTER', label: 'Off / Leg Cutter' },
  { id: 'YORKER', label: 'Spearing Yorker Attempt' },
  { id: 'BOUNCER', label: 'Fast Throat Bouncer' },
];

const SPIN_VARIATIONS: { id: SpinBowlingVariation; label: string }[] = [
  { id: 'OFF_BREAK', label: 'Standard Off-Break' },
  { id: 'LEG_BREAK', label: 'Classic Leg-Break' },
  { id: 'GOOGLY', label: 'Deceptive Googly (Wrong\'un)' },
  { id: 'TOP_SPINNER', label: 'Top Spinner (Extra bounce)' },
  { id: 'ARM_BALL', label: 'Fast Arm-Ball (Skids straight)' },
  { id: 'FLIGHTED', label: 'Generous Flight & Drift' },
  { id: 'FASTER_DELIVERY', label: 'Flat Faster Delivery' },
];

const INTENTION_OPTIONS: { id: BowlingIntention; label: string }[] = [
  { id: 'BUILD_PRESSURE', label: 'Build Dot-Ball Pressure (Maiden Intent)' },
  { id: 'ATTACK_WICKETS', label: 'Aggressive Wicket-Taking Attack' },
  { id: 'DEFEND_RUNS', label: 'Contain Runs & Squeeze Economy' },
  { id: 'FORCE_MISTAKES', label: 'Patience & Force Batter Error' },
  { id: 'TARGET_STUMPS', label: 'Direct Attack on Stumps (Bowled/LBW)' },
  { id: 'OUTSIDE_OFF_CONTAINMENT', label: 'Outside Off Containment' },
  { id: 'BODY_LINE_ATTACK', label: 'Aggressive Bodyline Attack' },
  { id: 'RESTRICT_BOUNDARIES', label: 'Restrict Boundary Hitting' },
];

export const BowlingTacticsPanel: React.FC<BowlingTacticsPanelProps> = ({
  match,
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

  const isSpinner = activeBowler?.bowlingStyle?.toLowerCase().includes('spin');
  const maxOvers = getMaxOversPerBowler(match.format);

  const bowlingTeamXI =
    currentInnings.bowlingTeamId === match.homeTeamId ? match.homeXI : match.awayXI;
  const spellDataMap = match.bowlerSpellData || {};

  const handleUpdate = (updates: Partial<IndividualBowlingPlan>) => {
    if (!activeBowler) return;
    onUpdateBowlingPlan({
      ...currentPlan,
      bowlerId: activeBowler.id,
      ...updates,
    });
  };

  const getFatigueColor = (fatigue?: BowlerFatigueLevel) => {
    switch (fatigue) {
      case 'LOW':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/40';
      case 'EXHAUSTED':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-5">
      {/* Active Bowler Tactical Setup */}
      {activeBowler ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <PlayerAvatar player={activeBowler} size="sm" showFlag={false} />
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{activeBowler.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {activeBowler.bowlingStyle || 'Right-arm Fast'}
                  </span>
                </h4>
                <p className="text-xs text-slate-400">Current Over Spell Controller</p>
              </div>
            </div>

            {/* Fatigue Indicator */}
            {spellDataMap[activeBowler.id] && (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Fatigue</span>
                <span
                  className={`text-xs font-black px-2 py-0.5 rounded ${getFatigueColor(
                    spellDataMap[activeBowler.id].fatigue
                  )}`}
                >
                  {spellDataMap[activeBowler.id].fatigue}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Target Line */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200">Line & Channel</label>
              <select
                value={currentPlan.line}
                onChange={(e) => handleUpdate({ line: e.target.value as BowlingLine })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              >
                {LINE_OPTIONS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Length */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200">Delivery Length</label>
              <select
                value={currentPlan.length}
                onChange={(e) => handleUpdate({ length: e.target.value as BowlingLength })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              >
                {LENGTH_OPTIONS.map((len) => (
                  <option key={len.id} value={len.id}>
                    {len.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Variations */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200">
                Primary Variation ({isSpinner ? 'Spin' : 'Pace'})
              </label>
              {isSpinner ? (
                <select
                  value={currentPlan.variation || 'OFF_BREAK'}
                  onChange={(e) =>
                    handleUpdate({ variation: e.target.value as SpinBowlingVariation })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  {SPIN_VARIATIONS.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={currentPlan.variation || 'OUTSWING'}
                  onChange={(e) =>
                    handleUpdate({ variation: e.target.value as FastBowlingVariation })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  {FAST_VARIATIONS.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Tactical Intention */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200">Tactical Spell Intention</label>
              <select
                value={currentPlan.intention}
                onChange={(e) => handleUpdate({ intention: e.target.value as BowlingIntention })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              >
                {INTENTION_OPTIONS.map((int) => (
                  <option key={int.id} value={int.id}>
                    {int.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 text-xs text-slate-400 bg-slate-950 rounded-lg">
          No active bowler selected. Select a bowler from the squad below.
        </div>
      )}

      {/* Squad Bowling Spells & Fatigue Management Table */}
      <div className="pt-3 border-t border-slate-800">
        <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
          <span>Bowling Rotation & Spell Workload</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {maxOvers ? `Format Cap: ${maxOvers} ov/bowler` : 'Unlimited Test Spells'}
          </span>
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-mono">
                <th className="py-1.5 px-2">Bowler</th>
                <th className="py-1.5 px-2">Spell Overs</th>
                <th className="py-1.5 px-2">Fatigue</th>
                <th className="py-1.5 px-2">Rest (Ovs)</th>
                <th className="py-1.5 px-2">Total Figures</th>
                <th className="py-1.5 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {bowlingTeamXI.map((playerId) => {
                const player = getPlayerById(playerId);
                if (!player) return null;
                const spell = spellDataMap[playerId];
                const bowlerFig = currentInnings.bowlers.find((b) => b.playerId === playerId);
                const oversBowled = bowlerFig ? `${bowlerFig.overs}.${bowlerFig.ballsThisOver}` : '0.0';
                const runsWickets = bowlerFig ? `${bowlerFig.runs}/${bowlerFig.wickets}` : '0/0';

                const isCurrent = activeBowler?.id === playerId;
                const hasQuotaLeft = maxOvers ? (bowlerFig?.overs || 0) < maxOvers : true;
                const canBowl = !isCurrent && hasQuotaLeft;

                return (
                  <tr key={playerId} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-2 font-medium text-white flex items-center gap-2">
                      <PlayerAvatar player={player} size="xs" showFlag={false} />
                      <span>{player.shortName}</span>
                      {isCurrent && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-slate-300 font-mono tabular-nums">
                      {spell ? `${spell.currentSpellOvers} ovs` : '0 ovs'}
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getFatigueColor(
                          spell?.fatigue
                        )}`}
                      >
                        {spell?.fatigue || 'LOW'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-slate-400 font-mono tabular-nums">
                      {spell?.restOversSinceLastSpell ?? 0}
                    </td>
                    <td className="py-2 px-2 text-slate-300 font-mono tabular-nums">
                      {oversBowled} ovs ({runsWickets})
                    </td>
                    <td className="py-2 px-2 text-right">
                      {canBowl ? (
                        <button
                          onClick={() => onChangeBowler(playerId)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/50 text-white rounded transition"
                        >
                          Bring On
                        </button>
                      ) : isCurrent ? (
                        <span className="text-[10px] text-slate-500 font-medium">Bowling</span>
                      ) : (
                        <span className="text-[10px] text-slate-600 font-medium">Maxed</span>
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
