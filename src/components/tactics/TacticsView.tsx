import React, { useState } from 'react';
import {
  Sliders,
  Shield,
  Zap,
  Target,
  CheckCircle2,
} from 'lucide-react';
import {
  CareerSave,
  MatchFormat,
  MatchTactics,
  BattingAggression,
  BowlingTactic,
  FieldPreset,
} from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { updateFormatDefaultTactics } from '../../store/careerStore';

interface TacticsViewProps {
  career: CareerSave;
  onCareerUpdated?: (updated: CareerSave) => void;
}

export const TacticsView: React.FC<TacticsViewProps> = ({
  career,
  onCareerUpdated,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<MatchFormat>('TEST');
  const team = INTERNATIONAL_TEAMS.find((t) => t.id === career.selectedTeamId);

  const currentTactics: MatchTactics =
    career.formatSquads?.[selectedFormat]?.defaultTactics || {
      battingAggression: selectedFormat === 'TEST' ? 'DEFENSIVE' : selectedFormat === 'ODI' ? 'BALANCED' : 'ATTACKING',
      bowlingTactic: selectedFormat === 'TEST' ? 'ATTACKING_FULL' : 'BALANCED_CONTAIN',
      fieldPreset: selectedFormat === 'TEST' ? 'ATTACKING_SLIPS' : 'BALANCED_STANDARD',
    };

  const [battingAggression, setBattingAggression] = useState<BattingAggression>(currentTactics.battingAggression);
  const [bowlingTactic, setBowlingTactic] = useState<BowlingTactic>(currentTactics.bowlingTactic);
  const [fieldPreset, setFieldPreset] = useState<FieldPreset>(currentTactics.fieldPreset);
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveTactics = () => {
    const updatedTactics: MatchTactics = {
      battingAggression,
      bowlingTactic,
      fieldPreset,
    };
    const updated = updateFormatDefaultTactics(career, selectedFormat, updatedTactics);
    if (onCareerUpdated) {
      onCareerUpdated(updated);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-4 select-none pb-8 text-slate-200">
      {/* Top Banner: Format Tabs */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-[#151d29] border border-[#1e293b] flex items-center justify-center text-2xl">
            {team?.flagEmoji || '🏏'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-white tracking-wide">
                Tactical Framework &amp; Coaching Setup
              </h1>
              <span className="text-[10px] bg-[#142646] text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-emerald-900/60 font-bold">
                Philosophy
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Set team gameplay identity, tempo, bowling guidelines and fielding presets per format
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Format Selector */}
          <div className="flex bg-[#151d29] p-0.5 rounded border border-[#1e293b]">
            {(['TEST', 'ODI', 'T20I'] as MatchFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => {
                  setSelectedFormat(fmt);
                  const tac = career.formatSquads?.[fmt]?.defaultTactics;
                  if (tac) {
                    setBattingAggression(tac.battingAggression);
                    setBowlingTactic(tac.bowlingTactic);
                    setFieldPreset(tac.fieldPreset);
                  }
                }}
                className={`px-3 py-1 text-xs font-bold rounded transition cursor-pointer ${
                  selectedFormat === fmt
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {fmt} Tactics
              </button>
            ))}
          </div>

          <button
            onClick={handleSaveTactics}
            className="bg-[#10b981] hover:bg-[#059669] text-[#0b0e14] text-xs font-bold px-3.5 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            {isSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sliders className="w-3.5 h-3.5" />}
            <span>{isSaved ? 'Tactics Saved' : 'Apply Tactics'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Batting Approach, Bowling Plan & Fielding Presets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Batting Tempo & Aggression */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Batting Aggression &amp; Tempo
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Governs boundary targeting, risk tolerance and scoring rate across standard overs.
          </p>

          <div className="space-y-2">
            {[
              { id: 'BLOCK', label: 'Block-out / Stone Wall', desc: 'Preserve wickets at all costs. Minimal risks taken.' },
              { id: 'DEFENSIVE', label: 'Defensive / Patient', desc: 'Classic rotational play. Punish loose balls only.' },
              { id: 'BALANCED', label: 'Balanced International Standard', desc: 'Equal balance between strike rotation and risk.' },
              { id: 'ATTACKING', label: 'Attacking / High Tempo', desc: 'Look for regular boundary options and put bowlers under pressure.' },
              { id: 'SMASH', label: 'Maximum Intent / Express', desc: 'Explosive all-out attack. Higher wicket risk.' },
            ].map((opt) => (
              <div
                key={opt.id}
                onClick={() => setBattingAggression(opt.id as BattingAggression)}
                className={`p-2.5 rounded border text-xs cursor-pointer transition ${
                  battingAggression === opt.id
                    ? 'bg-[#142646] border-emerald-500 text-white font-semibold'
                    : 'bg-[#151d29] border-[#1e293b] text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="font-bold text-white">{opt.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bowling Line & Length Attack Strategy */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Bowling Target &amp; Lengths
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Dictates primary delivery focus and plans against top order and middle order.
          </p>

          <div className="space-y-2">
            {[
              { id: 'ATTACKING_FULL', label: 'Corridor of Uncertainty / Full', desc: '4th stump line on good length inducing edges to slips.' },
              { id: 'TIGHT_DEFENSIVE', label: 'Stump-to-Stump / Tight Off', desc: 'Direct attack targeting LBW and bowled dismissals.' },
              { id: 'BALANCED_CONTAIN', label: 'Balanced Contain & Rotate', desc: 'Disciplined international lengths with dot-ball pressure.' },
              { id: 'BOUNCER_SHORT', label: 'Aggressive Short Pitch Barrage', desc: 'Enforce bodyline lengths and challenge batters physically.' },
              { id: 'YORKER_DEATH', label: 'Yorkers & Slower Variations', desc: 'Blockhole targeting and pace changes for death-overs control.' },
              { id: 'FLIGHT_SPIN', label: 'Flight & Turn Variations', desc: 'Deceptive drift and turn inviting false attacking strokes.' },
            ].map((opt) => (
              <div
                key={opt.id}
                onClick={() => setBowlingTactic(opt.id as BowlingTactic)}
                className={`p-2.5 rounded border text-xs cursor-pointer transition ${
                  bowlingTactic === opt.id
                    ? 'bg-[#10243d] border-sky-500 text-white font-semibold'
                    : 'bg-[#151d29] border-[#1e293b] text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="font-bold text-white">{opt.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Fielding Presets & Attack Balance */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Fielding Presets &amp; Balance
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Arranges fielders between catchers in the cordon and boundary protection.
          </p>

          <div className="space-y-2">
            {[
              { id: 'ATTACKING_SLIPS', label: 'Attacking Cordon (3+ Slips)', desc: 'Heavy catcher concentration for seam and swing.' },
              { id: 'BALANCED_STANDARD', label: 'Balanced Standard Ring', desc: '2 slips, tight inner ring and sweeper cover.' },
              { id: 'DEFENSIVE_BOUNDARY', label: 'Boundary Containment', desc: 'Deep protection on the ropes to restrict boundaries.' },
              { id: 'RING_INNER', label: 'Ring Inner (Save Single)', desc: 'Close-in ring stopping quick singles.' },
              { id: 'DEATH_PROTECT', label: 'Death Protect', desc: 'Strategic boundary positions for death-overs boundaries.' },
            ].map((opt) => (
              <div
                key={opt.id}
                onClick={() => setFieldPreset(opt.id as FieldPreset)}
                className={`p-2.5 rounded border text-xs cursor-pointer transition ${
                  fieldPreset === opt.id
                    ? 'bg-[#1a1c38] border-purple-500 text-white font-semibold'
                    : 'bg-[#151d29] border-[#1e293b] text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="font-bold text-white">{opt.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
