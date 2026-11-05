import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Save,
  Shield,
  Bell,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { CareerSave } from '../../types/cricket';
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

  const seasonLabel = '2026/27 International Season';

  return (
    <header className="h-14 bg-[#070a0e]/90 backdrop-blur-md border-b border-[#1e2733] flex items-center justify-between px-3 md:px-5 select-none z-20">
      {/* Left: Nation & Coach Profile */}
      <div className="flex items-center space-x-3 md:space-x-4">
        {/* Country Badge */}
        <div className="flex items-center space-x-2 bg-[#10151c] border border-[#1e2733] px-2.5 py-1 rounded-lg shadow-sm">
          <CountryFlag countryCode={team?.code || career.selectedTeamId} size="sm" />
          <span className="text-xs font-bold text-[#e8edf2] tracking-wide font-display">
            {team?.name || 'National Team'}
          </span>
          <span className="text-[10px] bg-[#070a0e] text-[#e2b64a] font-mono px-1.5 py-0.5 rounded font-extrabold border border-[#e2b64a]/30">
            {team?.code || career.selectedTeamId}
          </span>
        </div>

        {/* Current Date & Season */}
        <div className="hidden sm:flex items-center space-x-2 text-xs bg-[#10151c] border border-[#1e2733] px-2.5 py-1 rounded-lg">
          <Calendar className="w-3.5 h-3.5 text-[#e2b64a]" />
          <span className="text-[#e8edf2] font-mono font-bold">{career.currentDate}</span>
          <span className="text-[#8b97a3]">•</span>
          <span className="text-[#8fb2d9] font-medium text-[11px] font-display">{seasonLabel}</span>
        </div>

        {/* Manager/Coach Info */}
        <div className="hidden lg:flex items-center space-x-2 text-xs text-[#8b97a3]">
          <span className="text-[#c3ccd6]">Head Coach:</span>
          <span className="text-white font-bold font-display">{career.manager.name}</span>
          <span className="text-[#e2b64a] font-mono text-[10px] bg-[#2c2412] px-1.5 py-0.5 rounded border border-[#e2b64a]/40">
            {career.manager.coachingExperience}
          </span>
        </div>
      </div>

      {/* Center: Next Match Snapshot (desktop) */}
      {nextFixture && (
        <div className="hidden xl:flex items-center space-x-2 text-xs bg-[#10151c] border border-[#1e2733] px-3 py-1 rounded-lg">
          <span className="text-[#8b97a3] text-[11px] font-display font-bold uppercase tracking-wider">Next:</span>
          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#2c2412] text-[#ffe9a8] border border-[#e2b64a]/40 font-mono">
            {nextFixture.format}
          </span>
          <span className="text-[#e8edf2] font-semibold truncate max-w-[200px]">
            vs {nextFixture.homeTeamId === career.selectedTeamId ? nextFixture.awayTeamId : nextFixture.homeTeamId}
          </span>
          <span className="text-[#8fb2d9] text-[11px] font-mono">({nextFixture.date})</span>
        </div>
      )}

      {/* Right Controls: Notifications, Board Confidence, Save Status & Action */}
      <div className="flex items-center space-x-2.5">
        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            className="p-2 rounded-lg bg-[#10151c] border border-[#1e2733] text-[#c3ccd6] hover:text-white hover:border-[#33404f] transition cursor-pointer relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#ff5470] text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center border-2 border-[#070a0e]">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#070a0e] border border-[#1e2733] rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="p-3 bg-[#10151c] border-b border-[#1e2733] flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-display">
                  Inbox Notifications
                </span>
                <span className="text-[10px] text-[#e2b64a] font-mono font-bold">
                  {unreadCount} Unread
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[#1e2733]">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#8b97a3]">No new notifications</div>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <div key={n.id} className="p-3 hover:bg-[#10151c] transition text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#e8edf2]">{n.title}</span>
                        <span className="text-[10px] text-[#8fb2d9] font-mono">{n.date}</span>
                      </div>
                      <p className="text-[#8b97a3] text-[11px] leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
              {onSelectTab && (
                <div className="p-2 bg-[#10151c] border-t border-[#1e2733] text-center">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      onSelectTab('NEWS');
                    }}
                    className="text-[#e2b64a] hover:text-[#ffe9a8] text-[11px] font-bold cursor-pointer font-display"
                  >
                    View All News & Updates →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Board Confidence Indicator */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-label="Board Confidence & Career Info"
            className="flex items-center space-x-1.5 bg-[#10151c] border border-[#1e2733] px-2.5 py-1 rounded-lg text-xs hover:border-[#33404f] transition cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-[#e2b64a]" />
            <span className="text-[#8b97a3] text-[11px] hidden md:inline font-display">Board:</span>
            <span
              className={`font-mono font-bold ${
                career.manager.boardConfidence >= 75
                  ? 'text-[#3fca86]'
                  : career.manager.boardConfidence >= 50
                  ? 'text-[#e2b64a]'
                  : 'text-[#ff5470]'
              }`}
            >
              {career.manager.boardConfidence}%
            </span>
            <ChevronDown className="w-3 h-3 text-[#8b97a3]" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-[#070a0e] border border-[#1e2733] rounded-xl shadow-2xl z-50 p-3 text-xs space-y-2.5">
              <div className="border-b border-[#1e2733] pb-2">
                <div className="font-bold text-white text-sm font-display">{career.manager.name}</div>
                <div className="text-[#8b97a3] text-[11px]">
                  Managing {team?.name || career.selectedTeamId} ({career.manager.coachingExperience})
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[#c3ccd6]">
                  <span>Board Confidence:</span>
                  <span className="font-mono font-bold text-[#3fca86]">
                    {career.manager.boardConfidence}%
                  </span>
                </div>
                <div className="w-full bg-[#10151c] h-1.5 rounded-full overflow-hidden border border-[#1e2733]">
                  <div
                    className="bg-[#3fca86] h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, career.manager.boardConfidence)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[#c3ccd6] pt-1">
                  <span>Team Morale:</span>
                  <span className="font-mono font-bold text-[#8fb2d9]">
                    {career.teamMorale ?? 80}%
                  </span>
                </div>
              </div>
              <div className="border-t border-[#1e2733] pt-2 text-[11px] text-[#8b97a3] flex items-center justify-between">
                <span>Total Matches:</span>
                <span className="font-mono text-white font-bold">{career.archivedMatches?.length || 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* Save Status Badge */}
        <div className="hidden sm:flex items-center space-x-1 text-[11px] text-[#8b97a3] px-2 py-1 rounded-lg bg-[#10151c] border border-[#1e2733]">
          {hasUnsavedChanges ? (
            <>
              <AlertCircle className="w-3 h-3 text-[#e2b64a]" />
              <span className="text-[#e2b64a] font-medium font-mono">Unsaved</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 text-[#3fca86]" />
              <span className="text-[#8b97a3] font-mono">Saved</span>
            </>
          )}
        </div>

        {/* Quick Save Action Button */}
        <button
          onClick={onQuickSave}
          title="Save Career Progress"
          aria-label="Save Career Progress"
          className="flex items-center space-x-1.5 text-xs bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] hover:brightness-110 text-[#070a0e] font-extrabold px-3 py-1.5 rounded-lg transition cursor-pointer active:scale-95 shadow-md font-display"
        >
          <Save className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">Save</span>
        </button>
      </div>
    </header>
  );
};
