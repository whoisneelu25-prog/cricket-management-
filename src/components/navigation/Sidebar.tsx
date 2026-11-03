import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Database,
  Calendar,
  Radio,
  Trophy,
  BarChart3,
  TrendingUp,
  Newspaper,
  Award,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { MainNavigationTab } from '../../store/careerStore';

interface SidebarProps {
  activeTab: MainNavigationTab;
  onSelectTab: (tab: MainNavigationTab) => void;
  isMatchActive: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: MainNavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isMatchActive,
  isCollapsed,
  onToggleCollapse,
}) => {
  const navItems: NavItem[] = [
    { id: 'DASHBOARD', label: 'Home Dashboard', icon: LayoutDashboard },
    { id: 'MY_TEAM', label: 'My Team', icon: Users },
    { id: 'SQUAD_MANAGEMENT', label: 'Squad & Lineup', icon: UserCheck },
    { id: 'MATCH_CENTRE', label: 'Match Centre', icon: Radio, badge: isMatchActive ? 'LIVE' : undefined, badgeColor: 'bg-rose-600' },
    { id: 'FIXTURES', label: 'Fixtures & Tours', icon: Calendar },
    { id: 'PLAYER_DATABASE', label: 'Player Database', icon: Database },
    { id: 'TOURNAMENTS', label: 'Tournaments', icon: Trophy },
    { id: 'RANKINGS', label: 'ICC Rankings', icon: TrendingUp },
    { id: 'STATISTICS', label: 'Statistics & Records', icon: BarChart3 },
    { id: 'NEWS', label: 'News Centre', icon: Newspaper },
    { id: 'CAREER_HISTORY', label: 'Career & Honours', icon: Award },
    { id: 'SETTINGS', label: 'Settings & Saves', icon: Settings },
  ];

  return (
    <aside
      className={`bg-[#0e131d] border-r border-[#1f293d] flex flex-col transition-all duration-200 select-none ${
        isCollapsed ? 'w-16' : 'w-56 md:w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 border-b border-[#1f293d] flex items-center justify-between px-3.5">
        {!isCollapsed && (
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="w-7 h-7 rounded bg-emerald-600 flex items-center justify-center font-black text-white text-xs tracking-wider shadow">
              ICM
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white tracking-wider uppercase leading-none">
                Cricket Manager
              </span>
              <span className="text-[10px] text-emerald-400 font-mono tracking-tight font-medium">
                PRO EDITION
              </span>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center font-black text-white text-xs mx-auto shadow">
            ICM
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#182234] transition hidden md:block"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              aria-label={item.label}
              className={`w-full flex items-center rounded text-xs font-medium transition cursor-pointer group ${
                isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 space-x-3'
              } ${
                isActive
                  ? 'bg-emerald-600 text-white font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-[#182234]'
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                }`}
              />
              {!isCollapsed && (
                <span className="truncate text-left flex-1">{item.label}</span>
              )}
              {!isCollapsed && item.badge && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-white animate-pulse ${
                    item.badgeColor || 'bg-emerald-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#1f293d] text-[11px] text-slate-500 text-center">
        {!isCollapsed ? (
          <p className="truncate">International Cricket Manager v4.0</p>
        ) : (
          <span className="font-mono text-[10px]">v4</span>
        )}
      </div>
    </aside>
  );
};
