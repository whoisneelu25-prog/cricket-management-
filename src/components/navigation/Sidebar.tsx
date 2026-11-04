import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Sliders,
  Calendar,
  Plane,
  Trophy,
  TrendingUp,
  Search,
  Activity,
  Newspaper,
  History,
  Settings,
  Radio,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { MainNavigationTab } from '../../store/careerStore';

interface SidebarProps {
  activeTab: MainNavigationTab;
  onSelectTab: (tab: MainNavigationTab) => void;
  isMatchActive: boolean;
  isMatchReady?: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: MainNavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  sectionHeader?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isMatchActive,
  isMatchReady,
  isCollapsed,
  onToggleCollapse,
}) => {
  // 13 Official Navigation Hubs + Live Match Centre
  const navItems: NavItem[] = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard, sectionHeader: 'Overview' },
    { id: 'SQUAD_MANAGEMENT', label: 'Squad', icon: Users, sectionHeader: 'Team Management' },
    { id: 'TEAM_SELECTION', label: 'Team Selection', icon: UserCheck },
    { id: 'TACTICS', label: 'Tactics', icon: Sliders },
    { id: 'FIXTURES', label: 'Fixtures', icon: Calendar, sectionHeader: 'Schedule & Tours' },
    { id: 'TOURS', label: 'Tours', icon: Plane },
    { id: 'TOURNAMENTS', label: 'Competitions', icon: Trophy },
    { id: 'RANKINGS', label: 'Rankings', icon: TrendingUp, sectionHeader: 'Scouting & Intel' },
    { id: 'PLAYERS', label: 'Players', icon: Search },
    { id: 'STATISTICS', label: 'Statistics', icon: Activity },
    { id: 'NEWS', label: 'News', icon: Newspaper, sectionHeader: 'Archive' },
    { id: 'CAREER_HISTORY', label: 'History', icon: History },
    { id: 'SETTINGS', label: 'Settings', icon: Settings, sectionHeader: 'System' },
  ];

  return (
    <aside
      className={`bg-[#0b0e14] border-r border-[#1e293b] flex flex-col transition-all duration-200 select-none z-30 ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 bg-[#0e131d] border-b border-[#1e293b] flex items-center justify-between px-3">
        {!isCollapsed ? (
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-md bg-[#10b981] flex items-center justify-center font-black text-[#0b0e14] text-xs tracking-wider shadow-sm">
              ICM
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-100 tracking-wider uppercase leading-none">
                Cricket Manager
              </span>
              <span className="text-[10px] text-emerald-400 font-mono tracking-tight font-medium mt-0.5">
                PRO 2026/27
              </span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-md bg-[#10b981] flex items-center justify-center font-black text-[#0b0e14] text-xs mx-auto shadow-sm">
            ICM
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#1a2232] transition hidden md:block"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Live / Match Centre Pinned Action */}
      <div className="p-2 border-b border-[#1e293b]/70 bg-[#0e1420]">
        <button
          onClick={() => onSelectTab('MATCH_CENTRE')}
          title="Match Centre"
          className={`w-full flex items-center rounded-md text-xs font-semibold transition cursor-pointer ${
            isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 space-x-2.5'
          } ${
            activeTab === 'MATCH_CENTRE'
              ? 'bg-rose-950/70 border border-rose-500/50 text-rose-300 shadow-sm'
              : isMatchActive
              ? 'bg-rose-950/40 border border-rose-600/40 text-rose-200 hover:bg-rose-900/50'
              : isMatchReady
              ? 'bg-emerald-950/40 border border-emerald-600/40 text-emerald-200 hover:bg-emerald-900/50'
              : 'bg-[#151d29] border border-[#233147] text-slate-300 hover:text-white hover:bg-[#1b2535]'
          }`}
        >
          <Radio
            className={`w-4 h-4 flex-shrink-0 ${
              isMatchActive ? 'text-rose-400 animate-pulse' : isMatchReady ? 'text-emerald-400' : 'text-slate-400'
            }`}
          />
          {!isCollapsed && (
            <div className="flex items-center justify-between flex-1">
              <span className="truncate">Match Centre</span>
              {isMatchActive && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-600 text-white animate-pulse">
                  LIVE
                </span>
              )}
              {!isMatchActive && isMatchReady && (
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                  TODAY
                </span>
              )}
            </div>
          )}
        </button>
      </div>

      {/* Primary 13 Nav Items */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <React.Fragment key={item.id}>
              {/* Optional Section Header (when expanded) */}
              {!isCollapsed && item.sectionHeader && (
                <div className="pt-2.5 pb-1 px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  {item.sectionHeader}
                </div>
              )}

              <button
                onClick={() => onSelectTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                aria-label={item.label}
                className={`w-full flex items-center rounded-md text-xs font-medium transition cursor-pointer group ${
                  isCollapsed ? 'justify-center p-2.5 my-0.5' : 'px-3 py-2 space-x-3'
                } ${
                  isActive
                    ? 'bg-[#142646] text-emerald-300 font-semibold border-l-2 border-[#10b981] shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#151d29]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-emerald-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate text-left flex-1">{item.label}</span>}
                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded text-white ${
                      item.badgeColor || 'bg-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Footer / Build info */}
      <div className="p-2.5 border-t border-[#1e293b] text-center text-[10px] text-slate-400 font-mono">
        {!isCollapsed ? (
          <div className="flex items-center justify-between px-1">
            <span>ICC Approved Rules</span>
            <span className="text-emerald-400 font-bold">v3.0</span>
          </div>
        ) : (
          <span className="text-emerald-400 font-bold">v3</span>
        )}
      </div>
    </aside>
  );
};
