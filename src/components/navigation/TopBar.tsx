import React from 'react';
import {
  Trophy,
  Calendar,
  Save,
  Shield,
  Clock,
  Sparkles
} from 'lucide-react';
import { CareerSave } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';

interface TopBarProps {
  career: CareerSave | null;
  onOpenSaveModal: () => void;
  onQuickSave: () => void;
  hasUnsavedChanges?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  career,
  onOpenSaveModal,
  onQuickSave,
  hasUnsavedChanges,
}) => {
  if (!career) return null;

  const team = INTERNATIONAL_TEAMS.find((t) => t.id === career.selectedTeamId);
  const nextFixture = career.fixtures.find((f) => f.status !== 'COMPLETED');

  return (
    <header className="h-14 bg-gradient-to-r from-[#091322] via-[#0c182e] to-[#08101e] border-b border-[#152542] flex items-center justify-between px-4 sm:px-6 select-none z-20">
      {/* Left: Nation & Manager Badge */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="flex items-center space-x-2 bg-[#0e1b32] border border-[#1b325c] px-3 py-1 rounded-lg shadow-sm">
          <span className="text-xl" role="img" aria-label={team?.name || 'Country'}>
            {team?.flagEmoji || '🏏'}
          </span>
          <span className="text-sm font-bold text-white tracking-wide">
            {team?.name || 'National Team'}
          </span>
          <span className="text-xs bg-[#142646] text-emerald-400 font-mono px-1.5 py-0.5 rounded font-bold border border-emerald-900/60">
            {team?.code}
          </span>
        </div>

        <div className="hidden md:flex items-center space-x-2 text-xs text-slate-300">
          <span className="text-slate-400 font-medium">Head Coach:</span>
          <span className="text-white font-bold">{career.manager.name}</span>
          <span className="text-slate-500">•</span>
          <span className="text-sky-300 font-mono flex items-center gap-1 bg-[#0e1b32] border border-[#1b325c] px-2 py-0.5 rounded">
            <Shield className="w-3 h-3 text-sky-400" />
            {career.manager.coachingExperience}
          </span>
        </div>
      </div>

      {/* Center: Next Scheduled Event / Format */}
      <div className="hidden lg:flex items-center space-x-3 text-xs bg-[#081020] border border-[#152847] px-3.5 py-1.5 rounded-lg shadow-inner">
        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-slate-400">Date:</span>
        <span className="text-white font-mono font-bold">{career.currentDate}</span>
        {nextFixture && (
          <>
            <span className="text-slate-600">|</span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700/60 font-mono">
              {nextFixture.format}
            </span>
            <span className="text-slate-200 truncate max-w-[240px] font-medium">
              vs {nextFixture.homeTeamId === career.selectedTeamId ? nextFixture.awayTeamId : nextFixture.homeTeamId} ({nextFixture.venue.split(',')[0]})
            </span>
          </>
        )}
      </div>

      {/* Right: Board Confidence, Trophies & Quick Save */}
      <div className="flex items-center space-x-3">
        {/* Board Confidence Gauge */}
        <div className="hidden sm:flex items-center space-x-2 bg-[#0e1b32] border border-[#1b325c] px-3 py-1 rounded-lg">
          <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Board:</span>
          <span
            className={`text-xs font-mono font-bold ${
              career.manager.boardConfidence >= 75
                ? 'text-emerald-400'
                : career.manager.boardConfidence >= 50
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {career.manager.boardConfidence}%
          </span>
        </div>

        {/* Quick Save Button */}
        <button
          onClick={onQuickSave}
          title="Quick Save Career"
          aria-label="Quick Save Career"
          className="flex items-center space-x-1.5 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-3.5 py-1.5 rounded-lg transition cursor-pointer shadow-sm active:scale-95 border border-emerald-400/30"
        >
          <Save className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Save</span>
        </button>
      </div>
    </header>
  );
};
