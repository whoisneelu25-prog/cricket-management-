import React from 'react';
import { Award, Trophy, Shield, TrendingUp, CheckCircle, BarChart3 } from 'lucide-react';
import { CareerSave } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';

interface CareerHistoryViewProps {
  career: CareerSave;
}

export const CareerHistoryView: React.FC<CareerHistoryViewProps> = ({ career }) => {
  const team = INTERNATIONAL_TEAMS.find((t) => t.id === career.selectedTeamId);
  const totalMatches = career.manager.matchesManaged;
  const winRate = totalMatches > 0 ? ((career.manager.matchesWon / totalMatches) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-4 select-none animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Manager Career History & Honours
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Lifetime management statistics, trophy cabinet, win ratios, and national board evaluations.
          </p>
        </div>

        <span className="text-xs font-mono font-bold bg-[#182234] border border-[#243247] px-3 py-1.5 rounded text-amber-400">
          Reputation: {career.manager.reputation}/100
        </span>
      </div>

      {/* Manager Summary Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#121824] border border-[#1f293d] p-4 rounded-lg text-center">
          <span className="text-[11px] text-slate-400 uppercase font-medium block">Matches Managed</span>
          <span className="text-2xl font-bold font-mono text-white mt-1 block">{totalMatches}</span>
        </div>
        <div className="bg-[#121824] border border-[#1f293d] p-4 rounded-lg text-center">
          <span className="text-[11px] text-slate-400 uppercase font-medium block">Victories</span>
          <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">{career.manager.matchesWon}</span>
        </div>
        <div className="bg-[#121824] border border-[#1f293d] p-4 rounded-lg text-center">
          <span className="text-[11px] text-slate-400 uppercase font-medium block">Win Percentage</span>
          <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">{winRate}%</span>
        </div>
        <div className="bg-[#121824] border border-[#1f293d] p-4 rounded-lg text-center">
          <span className="text-[11px] text-slate-400 uppercase font-medium block">Board Confidence</span>
          <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">{career.manager.boardConfidence}%</span>
        </div>
      </div>

      {/* Trophy Cabinet & National Team Honours */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-5">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          National Trophy Cabinet & Historical Honours ({team?.name})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {(career.manager.trophies || []).map((trophy, idx) => (
            <div
              key={`mgr_${idx}`}
              className="bg-emerald-950/30 border border-emerald-700/50 p-3.5 rounded-lg flex items-start space-x-3"
            >
              <div className="w-8 h-8 rounded bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white leading-tight">{trophy}</h4>
                <span className="text-[10px] text-emerald-400 mt-0.5 block">Won Under Your Tenure</span>
              </div>
            </div>
          ))}
          {team?.historicalAchievements.map((trophy, idx) => (
            <div
              key={idx}
              className="bg-[#182234] border border-[#243247] p-3.5 rounded-lg flex items-start space-x-3"
            >
              <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white leading-tight">{trophy}</h4>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Official ICC Silverware</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Board Mandate & Expectations Status */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-5">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          Current Board Review & Contract Terms
        </h3>

        <div className="space-y-2 text-xs">
          <div className="bg-[#182234] border border-[#243247] p-3 rounded flex items-center justify-between">
            <span className="text-slate-300">Management Philosophy Alignment</span>
            <span className="font-bold text-emerald-400 font-mono">EXEMPLARY ({career.manager.managementStyle})</span>
          </div>
          <div className="bg-[#182234] border border-[#243247] p-3 rounded flex items-center justify-between">
            <span className="text-slate-300">Coaching Contract Security</span>
            <span className="font-bold text-emerald-400 font-mono">SECURE (3 Seasons Remaining)</span>
          </div>
          <div className="bg-[#182234] border border-[#243247] p-3 rounded flex items-center justify-between">
            <span className="text-slate-300">Squad Morale & Dressing Room Atmosphere</span>
            <span className="font-bold text-emerald-400 font-mono">UNIFIED & FOCUSED</span>
          </div>
        </div>
      </div>
    </div>
  );
};
