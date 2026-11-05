import React from 'react';
import {
  LayoutDashboard,
  Flag,
  Users,
  Search,
  Calendar,
  Plane,
  Trophy,
  TrendingUp,
  Activity,
  Newspaper,
  History,
  Settings,
  Radio,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { MainNavigationTab } from '../../store/careerStore';
import { Team } from '../../types/cricket';
import { CountryFlag } from '../common/CountryFlag';

interface SidebarProps {
  activeTab: MainNavigationTab;
  onSelectTab: (tab: MainNavigationTab) => void;
  isMatchActive: boolean;
  isMatchReady?: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  selectedTeam?: Team;
}

interface NavItem {
  id: MainNavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  sectionHeader?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isMatchActive,
  isMatchReady,
  isCollapsed,
  onToggleCollapse,
  selectedTeam,
}) => {
  // Navigation structure requested in Phase 3
  const navItems: NavItem[] = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard, sectionHeader: 'Overview' },
    { id: 'MY_TEAM', label: 'My Country', icon: Flag, sectionHeader: 'National Squad' },
    { id: 'SQUAD_MANAGEMENT', label: 'Squad Management', icon: Users },
    { id: 'PLAYERS', label: 'Player Database', icon: Search },
    { id: 'FIXTURES', label: 'Fixtures', icon: Calendar, sectionHeader: 'Tours & Matches' },
    { id: 'TOURS', label: 'Tours', icon: Plane },
    { id: 'TOURNAMENTS', label: 'Tournaments', icon: Trophy },
    { id: 'RANKINGS', label: 'Rankings', icon: TrendingUp, sectionHeader: 'Intelligence' },
    { id: 'STATISTICS', label: 'Statistics', icon: Activity },
    { id: 'NEWS', label: 'News', icon: Newspaper, sectionHeader: 'Career & System' },
    { id: 'CAREER_HISTORY', label: 'Career', icon: History },
    { id: 'SETTINGS', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`bg-[#070a0e] border-r border-[#1e2733] flex flex-col transition-all duration-200 select-none z-30 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 bg-[#000000] border-b border-[#1e2733] flex items-center justify-between px-3">
        {!isCollapsed ? (
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ffe9a8] to-[#e0ab3a] flex items-center justify-center font-black text-[#070a0e] text-xs shadow-md">
              ICM
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-[#e8edf2] tracking-wider uppercase leading-none font-display">
                Cricket Manager
              </span>
              <span className="text-[10px] text-[#e2b64a] font-mono tracking-tight font-bold mt-0.5">
                INTERNATIONAL PRO
              </span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ffe9a8] to-[#e0ab3a] flex items-center justify-center font-black text-[#070a0e] text-xs mx-auto shadow-md">
            ICM
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="text-[#8b97a3] hover:text-[#e8edf2] p-1 rounded hover:bg-[#10151c] transition hidden md:block cursor-pointer"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Selected National Team Card */}
      {selectedTeam && !isCollapsed && (
        <div className="p-2.5 mx-2 my-2 bg-[#10151c] border border-[#1e2733] rounded-xl flex items-center space-x-2.5 shadow-sm">
          <CountryFlag countryCode={selectedTeam.code} size="md" className="border border-[#1e2733]" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#e2b64a] block font-display">
              National Board
            </span>
            <span className="text-xs font-bold text-[#e8edf2] truncate block">
              {selectedTeam.name}
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#070a0e] text-[#8fb2d9] border border-[#1e2733]">
            {selectedTeam.code}
          </span>
        </div>
      )}

      {/* Live / Match Centre Pinned Action */}
      <div className="p-2 border-b border-[#1e2733] bg-[#000000]/60">
        <button
          onClick={() => onSelectTab('MATCH_CENTRE')}
          title="Match Centre"
          className={`w-full flex items-center rounded-lg text-xs font-bold transition cursor-pointer ${
            isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 space-x-2.5'
          } ${
            activeTab === 'MATCH_CENTRE'
              ? 'bg-[#10151c] border-2 border-[#e2b64a] text-[#ffe9a8] shadow-lg'
              : isMatchActive
              ? 'bg-[#ff5470]/15 border border-[#ff5470]/50 text-[#ff5470] hover:bg-[#ff5470]/25'
              : isMatchReady
              ? 'bg-[#e2b64a]/15 border border-[#e2b64a]/50 text-[#e2b64a] hover:bg-[#e2b64a]/25'
              : 'bg-[#10151c] border border-[#1e2733] text-[#c3ccd6] hover:text-[#e8edf2] hover:border-[#33404f]'
          }`}
        >
          <Radio
            className={`w-4 h-4 flex-shrink-0 ${
              isMatchActive
                ? 'text-[#ff5470] animate-pulse'
                : isMatchReady
                ? 'text-[#e2b64a]'
                : 'text-[#8b97a3]'
            }`}
          />
          {!isCollapsed && (
            <div className="flex items-center justify-between flex-1">
              <span className="truncate font-display tracking-wide">Match Centre</span>
              {isMatchActive && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#ff5470] text-white animate-pulse">
                  LIVE
                </span>
              )}
              {!isMatchActive && isMatchReady && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#e2b64a] text-[#070a0e]">
                  READY
                </span>
              )}
            </div>
          )}
        </button>
      </div>

      {/* Main Navigation Items */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <React.Fragment key={item.id}>
              {/* Section Header */}
              {!isCollapsed && item.sectionHeader && (
                <div className="pt-3 pb-1 px-2.5 text-[9.5px] font-extrabold uppercase tracking-widest text-[#8b97a3] font-display">
                  {item.sectionHeader}
                </div>
              )}

              <button
                onClick={() => onSelectTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                aria-label={item.label}
                className={`w-full flex items-center rounded-lg text-xs font-semibold transition cursor-pointer group ${
                  isCollapsed ? 'justify-center p-2.5 my-0.5' : 'px-3 py-2 space-x-3'
                } ${
                  isActive
                    ? 'bg-[#10151c] text-[#ffe9a8] font-bold border-l-2 border-[#e2b64a] shadow-sm'
                    : 'text-[#8b97a3] hover:text-[#e8edf2] hover:bg-[#10151c]/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition ${
                    isActive ? 'text-[#e2b64a]' : 'text-[#8b97a3] group-hover:text-[#e8edf2]'
                  }`}
                />
                {!isCollapsed && (
                  <span className="truncate text-left flex-1 font-display tracking-tight">
                    {item.label}
                  </span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Footer / Status */}
      <div className="p-2.5 border-t border-[#1e293b] text-center text-[10px] text-[#8b97a3] font-mono bg-[#000000]">
        {!isCollapsed ? (
          <div className="flex items-center justify-between px-1">
            <span className="text-[#8b97a3]">Simulation Engine</span>
            <span className="text-[#e2b64a] font-bold">ICC Pro</span>
          </div>
        ) : (
          <span className="text-[#e2b64a] font-bold">PRO</span>
        )}
      </div>
    </aside>
  );
};
