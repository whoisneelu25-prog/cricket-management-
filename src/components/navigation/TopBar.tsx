import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Save,
  Shield,
  Bell,
  CheckCircle2,
  AlertCircle,
  Award,
  ChevronDown,
  Info,
  TrendingUp,
  X,
} from 'lucide-react';
import { CareerSave, NotificationItem } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { CountryFlag } from '../common/CountryFlag';

interface TopBarProps {
  career: CareerSave | null;
  onOpenSaveModal: () => void;
  onQuickSave: () => void;
  hasUnsavedChanges?: boolean;
  onSelectTab?: (tab: any) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  career,
  onOpenSaveModal,
  onQuickSave,
  hasUnsavedChanges = false,
  onSelectTab,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!career) return null;

  const team = INTERNATIONAL_TEAMS.find((t) => t.id === career.selectedTeamId);
  const notifications = career.notifications || [];
  const unreadCount = notifications.filter((n) => !n.read).length;
  const nextFixture = career.fixtures?.find((f) => f.status !== 'COMPLETED');

  // Season formatting
  const seasonLabel = '2026/27 Season';

  return (
    <header className="h-14 bg-[#0b0e14] border-b border-[#1e293b] flex items-center justify-between px-3 md:px-5 select-none z-20">
      {/* Left: Nation & Coach Profile */}
      <div className="flex items-center space-x-3 md:space-x-4">
        {/* Country Badge */}
        <div className="flex items-center space-x-2 bg-[#111827] border border-[#1e293b] px-2.5 py-1 rounded shadow-sm">
          <CountryFlag countryCode={team?.code || career.selectedTeamId} size="sm" />
          <span className="text-xs font-bold text-slate-100 tracking-wide">
            {team?.name || 'National Team'}
          </span>
          <span className="text-[10px] bg-[#152336] text-emerald-400 font-mono px-1.5 py-0.5 rounded font-bold border border-emerald-900/50">
            {team?.code || career.selectedTeamId}
          </span>
        </div>

        {/* Current Date & Season */}
        <div className="hidden sm:flex items-center space-x-2 text-xs bg-[#111827] border border-[#1e293b] px-2.5 py-1 rounded">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-100 font-mono font-bold">{career.currentDate}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300 font-medium text-[11px]">{seasonLabel}</span>
        </div>

        {/* Manager/Coach Info */}
        <div className="hidden lg:flex items-center space-x-2 text-xs text-slate-400">
          <span className="text-slate-300">Head Coach:</span>
          <span className="text-white font-semibold">{career.manager.name}</span>
          <span className="text-emerald-400 font-mono text-[10px] bg-[#142646] px-1.5 py-0.5 rounded border border-emerald-900/40">
            {career.manager.coachingExperience}
          </span>
        </div>
      </div>

      {/* Center: Next Match Snapshot (desktop) */}
      {nextFixture && (
        <div className="hidden xl:flex items-center space-x-2 text-xs bg-[#111827] border border-[#1e293b] px-3 py-1 rounded">
          <span className="text-slate-300 text-[11px]">Next:</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-mono">
            {nextFixture.format}
          </span>
          <span className="text-slate-200 font-medium truncate max-w-[200px]">
            vs {nextFixture.homeTeamId === career.selectedTeamId ? nextFixture.awayTeamId : nextFixture.homeTeamId}
          </span>
          <span className="text-slate-300 text-[11px]">({nextFixture.date})</span>
        </div>
      )}

      {/* Right Controls: Notifications, Board Confidence, Save Status & Action */}
      <div className="flex items-center space-x-2.5">
        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-[#151d29] border border-[#1e293b] transition relative cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#111827] border border-[#1e293b] rounded-lg shadow-xl z-50 overflow-hidden text-xs">
              <div className="p-2.5 bg-[#0e131d] border-b border-[#1e293b] flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-emerald-400" />
                  Notifications & Alerts
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {notifications.length} Total
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[#1e293b]/60">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-slate-300">No active notifications</div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 hover:bg-[#151d29] transition ${
                        !n.read ? 'bg-[#142646]/30' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-200 truncate">{n.title}</span>
                        <span className="text-[10px] text-slate-300 font-mono">{n.date}</span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
              {onSelectTab && (
                <div className="p-2 bg-[#0e131d] border-t border-[#1e293b] text-center">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      onSelectTab('NEWS');
                    }}
                    className="text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold"
                  >
                    View All News & Updates →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Board Confidence Indicator */}
        <div
          className="relative"
          ref={profileRef}
        >
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-label="Board Confidence & Career Info"
            className="flex items-center space-x-1.5 bg-[#111827] border border-[#1e293b] px-2.5 py-1 rounded text-xs hover:border-slate-600 transition cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400 text-[11px] hidden md:inline">Board:</span>
            <span
              className={`font-mono font-bold ${
                career.manager.boardConfidence >= 75
                  ? 'text-emerald-400'
                  : career.manager.boardConfidence >= 50
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {career.manager.boardConfidence}%
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-[#111827] border border-[#1e293b] rounded-lg shadow-xl z-50 p-3 text-xs space-y-2.5">
              <div className="border-b border-[#1e293b] pb-2">
                <div className="font-bold text-white text-sm">{career.manager.name}</div>
                <div className="text-slate-400 text-[11px]">
                  Managing {team?.name || career.selectedTeamId} ({career.manager.coachingExperience})
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Board Confidence:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {career.manager.boardConfidence}%
                  </span>
                </div>
                <div className="w-full bg-[#1e293b] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, career.manager.boardConfidence)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-slate-300 pt-1">
                  <span>Team Morale:</span>
                  <span className="font-mono font-bold text-sky-400">
                    {career.teamMorale ?? 80}%
                  </span>
                </div>
              </div>
              <div className="border-t border-[#1e293b] pt-2 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Total Matches:</span>
                <span className="font-mono text-white font-bold">{career.archivedMatches?.length || 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* Save Status Badge */}
        <div className="hidden sm:flex items-center space-x-1 text-[11px] text-slate-400 px-2 py-1 rounded bg-[#111827] border border-[#1e293b]">
          {hasUnsavedChanges ? (
            <>
              <AlertCircle className="w-3 h-3 text-amber-400" />
              <span className="text-amber-400 font-medium">Unsaved</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-slate-400">Saved</span>
            </>
          )}
        </div>

        {/* Quick Save Action Button */}
        <button
          onClick={onQuickSave}
          title="Save Career Progress"
          aria-label="Save Career Progress"
          className="flex items-center space-x-1.5 text-xs bg-[#10b981] hover:bg-[#059669] text-[#0b0e14] font-bold px-3 py-1.5 rounded transition cursor-pointer active:scale-95 shadow-sm"
        >
          <Save className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Save</span>
        </button>
      </div>
    </header>
  );
};
