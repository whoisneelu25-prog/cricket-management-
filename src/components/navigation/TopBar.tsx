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
    <header className="h-14 bg-[#111827] border-b border-[#1f293d] flex items-center justify-between px-4 sm:px-6 select-none z-20">
      {/* Left: Nation & Manager Badge */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="flex items-center space-x-2 bg-[#182234] border border-[#243247] px-2.5 py-1 rounded">
          <span className="text-xl" role="img" aria-label={team?.name || 'Country'}>
            {team?.flagEmoji || '🏏'}
          </span>
          <span className="text-sm font-semibold text-white tracking-wide">
            {team?.name || 'National Team'}
          </span>
          <span className="text-xs bg-[#243247] text-emerald-400 font-mono px-1.5 py-0.5 rounded font-medium">
            {team?.code}
          </span>
        </div>

        <div className="hidden md:flex items-center space-x-2 text-xs text-slate-400">
          <span className="text-slate-500">Manager:</span>
          <span className="text-slate-200 font-medium">{career.manager.name}</span>
          <span className="text-slate-600">•</span>
          <span className="text-amber-400 font-mono flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" />
            {career.manager.coachingExperience}
          </span>
        </div>
      </div>

      {/* Center: Next Scheduled Event / Format */}
      <div className="hidden lg:flex items-center space-x-3 text-xs bg-[#0b0f17] border border-[#1f293d] px-3 py-1 rounded">
        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-slate-400">Date:</span>
        <span className="text-slate-200 font-mono font-medium">{career.currentDate}</span>
        {nextFixture && (
          <>
            <span className="text-slate-600">|</span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
              {nextFixture.format}
            </span>
            <span className="text-slate-300 truncate max-w-[240px]">
              vs {nextFixture.homeTeamId === career.selectedTeamId ? nextFixture.awayTeamId : nextFixture.homeTeamId} ({nextFixture.venue.split(',')[0]})
            </span>
          </>
        )}
      </div>

      {/* Right: Board Confidence, Trophies & Quick Save */}
      <div className="flex items-center space-x-3">
        {/* Board Confidence Gauge */}
        <div className="hidden sm:flex items-center space-x-2 bg-[#182234] border border-[#243247] px-2.5 py-1 rounded">
          <span className="text-[11px] text-slate-400 uppercase font-medium tracking-wider">Board:</span>
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
          className="flex items-center space-x-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded transition cursor-pointer shadow-sm active:scale-95"
        >
          <Save className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Save</span>
        </button>
      </div>
    </header>
  );
};
