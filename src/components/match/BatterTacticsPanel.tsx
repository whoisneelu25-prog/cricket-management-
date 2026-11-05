import React, { useState } from 'react';
import {
  BattingApproach,
  ShotSelection,
  BowlerTargetAction,
  SituationalInstruction,
  IndividualBatterInstruction,
  TeamBattingGamePlan,
  GeneralGamePlan,
  TestGamePlan,
  ODIGamePlan,
  T20IGamePlan,
  Match,
} from '../../types/cricket';
import { getPlayerById } from '../../engine/matchEngine';
import { PlayerAvatar } from '../common/PlayerAvatar';
import { Zap, Shield, Target, Flame } from 'lucide-react';

interface BatterTacticsPanelProps {
  match: Match;
  onUpdateInstruction: (instruction: IndividualBatterInstruction) => void;
  onUpdateGamePlan: (plan: TeamBattingGamePlan) => void;
}

const APPROACH_OPTIONS: { id: BattingApproach; label: string; desc: string; icon: string }[] = [
  { id: 'VERY_DEFENSIVE', label: 'Very Defensive', desc: 'Dead bat, prioritize survival', icon: '🛡️' },
  { id: 'DEFENSIVE', label: 'Defensive', desc: 'Patient accumulation, minimize risk', icon: '🔒' },
  { id: 'BALANCED', label: 'Balanced', desc: 'Standard match rhythm, rotate strike', icon: '⚖️' },
  { id: 'POSITIVE', label: 'Positive', desc: 'Intent to score, punish bad balls', icon: '✨' },
  { id: 'AGGRESSIVE', label: 'Aggressive', desc: 'Calculated aerial risks & boundary hunt', icon: '⚡' },
  { id: 'SMASH', label: 'Smash', desc: 'Maximum aggression & boundary intent (high risk)', icon: '💥' },
];

const SHOT_SELECTION_OPTIONS: { id: ShotSelection; label: string }[] = [
  { id: 'PLAY_STRAIGHT', label: 'Play Straight with the V' },
  { id: 'TARGET_OFF', label: 'Target Off Side Corridor' },
  { id: 'TARGET_LEG', label: 'Target Leg Side / On Side' },
  { id: 'ALONG_GROUND', label: 'Keep Shots Along The Ground' },
  { id: 'LOOK_FOR_BOUNDARIES', label: 'Look For Boundary Opportunities' },
  { id: 'ROTATE_STRIKE', label: 'Rotate Strike & Quick Singles' },
  { id: 'AVOID_RISKY_SHOTS', label: 'Avoid Risky Cross-Bat Shots' },
  { id: 'ATTACK_SPIN', label: 'Attack Spin Bowling (Sweeps / Charges)' },
  { id: 'ATTACK_PACE', label: 'Attack Fast Bowling (Punches / Pulls)' },
  { id: 'PLAY_LATE_PACE', label: 'Play Late Under The Eyes' },
];

const BOWLER_TARGET_OPTIONS: { id: BowlerTargetAction; label: string }[] = [
  { id: 'ATTACK', label: 'Attack Bowler' },
  { id: 'DEFEND', label: 'Defend / Respect Bowler' },
  { id: 'ROTATE_STRIKE', label: 'Rotate Strike Away From Bowler' },
  { id: 'TARGET_WEAKNESS', label: 'Target Bowler Fatigue / Inaccuracy' },
];

const SITUATIONAL_OPTIONS: { id: SituationalInstruction; label: string }[] = [
  { id: 'PROTECT_WICKET', label: 'Protect Wicket (Consolidate)' },
  { id: 'BUILD_PARTNERSHIP', label: 'Build Partnership Steadily' },
  { id: 'ACCELERATE', label: 'Accelerate Scoring Rate' },
  { id: 'SURVIVE_SESSION', label: 'Survive Session To Break / Stumps' },
  { id: 'ATTACK_POWERPLAY', label: 'Attack Powerplay Restrictions' },
  { id: 'TARGET_DEATH', label: 'Explode in Death Overs' },
  { id: 'PRESERVE_WICKETS', label: 'Preserve Wickets For Late Surge' },
];

export const BatterTacticsPanel: React.FC<BatterTacticsPanelProps> = ({
  match,
  onUpdateInstruction,
  onUpdateGamePlan,
}) => {
  const currentInnings = match.innings[match.currentInningsIndex] || match.innings[0];
  const striker = currentInnings?.currentStrikerId ? getPlayerById(currentInnings.currentStrikerId) : null;
  const nonStriker = currentInnings?.currentNonStrikerId ? getPlayerById(currentInnings.currentNonStrikerId) : null;

  const [activeBatterId, setActiveBatterId] = useState<string>(striker?.id || '');
  const activeBatter = activeBatterId === striker?.id ? striker : nonStriker;

  const currentInstruction: IndividualBatterInstruction =
    (activeBatter && match.individualBatterInstructions?.[activeBatter.id]) || {
      playerId: activeBatter?.id || '',
      approach: 'BALANCED',
      shotSelection: 'PLAY_STRAIGHT',
      situationalInstruction: 'BUILD_PARTNERSHIP',
    };

  const isHome = match.userTeamId === match.homeTeamId;
  const currentPlan = (isHome ? match.teamBattingGamePlans?.home : match.teamBattingGamePlans?.away) || 'BALANCED_BATTING';

  const isTest = match.format === 'TEST';
  const baselineSuccess = isTest ? 40 : 60;
  const baselineFailure = isTest ? 60 : 40;

  const handleApproachChange = (approach: BattingApproach) => {
    if (!activeBatter) return;
    onUpdateInstruction({
      ...currentInstruction,
      playerId: activeBatter.id,
      approach,
    });
  };

  const handleShotSelectionChange = (shotSelection: ShotSelection) => {
    if (!activeBatter) return;
    onUpdateInstruction({
      ...currentInstruction,
      playerId: activeBatter.id,
      shotSelection,
    });
  };

  const handleBowlerActionChange = (action: BowlerTargetAction) => {
    if (!activeBatter) return;
    onUpdateInstruction({
      ...currentInstruction,
      playerId: activeBatter.id,
      bowlerInstruction: {
        action,
        targetBowlerId: currentInnings?.currentBowlerId,
      },
    });
  };

  const handleSituationalChange = (situationalInstruction: SituationalInstruction) => {
    if (!activeBatter) return;
    onUpdateInstruction({
      ...currentInstruction,
      playerId: activeBatter.id,
      situationalInstruction,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-5">
      {/* Batters Selector Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          {striker && (
            <button
              onClick={() => setActiveBatterId(striker.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition ${
                activeBatterId === striker.id
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <PlayerAvatar player={striker} size="xs" showFlag={false} />
              <span>{striker.shortName} ★ (Striker)</span>
            </button>
          )}

          {nonStriker && (
            <button
              onClick={() => setActiveBatterId(nonStriker.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition ${
                activeBatterId === nonStriker.id
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <PlayerAvatar player={nonStriker} size="xs" showFlag={false} />
              <span>{nonStriker.shortName} (Non-Striker)</span>
            </button>
          )}
        </div>

        {/* Aggression Calibration Pill */}
        <div className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400">
          Format Baseline ({match.format}):{' '}
          <span className="text-emerald-400 font-bold">{baselineSuccess}% S</span> /{' '}
          <span className="text-rose-400 font-bold">{baselineFailure}% F</span>
        </div>
      </div>

      {activeBatter && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Batting Approach Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Batting Intent & Approach
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {APPROACH_OPTIONS.map((opt) => {
                const isSelected = currentInstruction.approach === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleApproachChange(opt.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-left transition ${
                      isSelected
                        ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{opt.icon}</span>
                      <div>
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div className="text-[10px] text-slate-400">{opt.desc}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specific Instruction Selectors */}
          <div className="space-y-4">
            {/* Shot Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-sky-400" />
                Targeted Shot Selection
              </label>
              <select
                value={currentInstruction.shotSelection}
                onChange={(e) => handleShotSelectionChange(e.target.value as ShotSelection)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {SHOT_SELECTION_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bowler Target Action */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                Bowler-Specific Action
              </label>
              <select
                value={currentInstruction.bowlerInstruction?.action || 'DEFEND'}
                onChange={(e) => handleBowlerActionChange(e.target.value as BowlerTargetAction)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {BOWLER_TARGET_OPTIONS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Situational Instruction */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Situational Match Order
              </label>
              <select
                value={currentInstruction.situationalInstruction || 'BUILD_PARTNERSHIP'}
                onChange={(e) => handleSituationalChange(e.target.value as SituationalInstruction)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {SITUATIONAL_OPTIONS.map((si) => (
                  <option key={si.id} value={si.id}>
                    {si.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Team Batting Game Plan */}
      <div className="pt-3 border-t border-slate-800">
        <h4 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
          Team Batting Strategy ({match.format})
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block mb-1">Overall Batting Philosophy:</span>
            <select
              value={currentPlan}
              onChange={(e) => onUpdateGamePlan(e.target.value as TeamBattingGamePlan)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="DEFENSIVE_ACCUMULATION">Defensive Accumulation</option>
              <option value="BALANCED_BATTING">Balanced Batting</option>
              <option value="POSITIVE_CRICKET">Positive Cricket</option>
              <option value="AGGRESSIVE_BATTING">Aggressive Batting</option>
              <option value="SMASH">Smash / Power Hitting</option>
              <option value="ALL_OUT_ATTACK">All Out Attack</option>
              <option value="BUILD_PARTNERSHIPS">Build Partnerships</option>
              <option value="PROTECT_WICKETS">Protect Wickets</option>
              <option value="ACCELERATE_SCORING">Accelerate Scoring</option>
            </select>
          </div>

          <div>
            <span className="text-slate-400 block mb-1">Format-Specific Tactical Role:</span>
            {match.format === 'TEST' && (
              <select
                value={currentPlan}
                onChange={(e) => onUpdateGamePlan(e.target.value as TeamBattingGamePlan)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="BUILD_LONG_INNINGS">Build Long Test Innings</option>
                <option value="OCCUPY_CREASE">Occupy Crease (Bat For Time)</option>
                <option value="COUNTERATTACK">Counterattack Pressure</option>
                <option value="ATTACK_SPINNERS">Attack Opposition Spinners</option>
                <option value="BAT_FOR_DRAW">Bat For Draw</option>
                <option value="ACCELERATE_DECLARATION">Accelerate For Declaration</option>
              </select>
            )}

            {match.format === 'ODI' && (
              <select
                value={currentPlan}
                onChange={(e) => onUpdateGamePlan(e.target.value as TeamBattingGamePlan)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="CONSERVATIVE_OPENING">Conservative Opening (Solid Start)</option>
                <option value="POWERPLAY_AGGRESSION">Powerplay 1 Aggression</option>
                <option value="MIDDLE_ACCUMULATION">Middle Overs Accumulation</option>
                <option value="ACCELERATE_30_OVERS">Accelerate After 30 Overs</option>
                <option value="DEATH_OVER_ATTACK">Death Overs Attack</option>
                <option value="CONTROLLED_CHASE">Controlled Run Chase</option>
              </select>
            )}

            {match.format === 'T20I' && (
              <select
                value={currentPlan}
                onChange={(e) => onUpdateGamePlan(e.target.value as TeamBattingGamePlan)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="POWERPLAY_ATTACK">Powerplay 1-6 Over Attack</option>
                <option value="MIDDLE_ROTATION">Middle Overs Strike Rotation</option>
                <option value="DEATH_ACCELERATION">Death Overs Finish</option>
                <option value="ALL_OUT_ATTACK">All Out Boundary Attack</option>
                <option value="DEFEND_LOW_TARGET">Defend Low Target</option>
              </select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
