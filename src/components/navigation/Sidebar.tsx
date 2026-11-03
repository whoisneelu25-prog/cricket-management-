import React from 'react';
import {
  LayoutDashboard,
  UserCheck,
  Calendar,
  Radio,
  Trophy,
  Newspaper,
  Settings,
  ChevronLeft,
  ChevronRight,
  Briefcase,
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
  matchTabs?: MainNavigationTab[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isMatchActive,
  isCollapsed,
  onToggleCollapse,
}) => {
  // Streamlined 7 Core Operational Hubs (No clutter, No database in menu)
  const navItems: NavItem[] = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'SQUAD_MANAGEMENT',
      label: 'Squad & Lineup',
      icon: UserCheck,
      matchTabs: ['SQUAD_MANAGEMENT', 'MY_TEAM', 'PLAYER_DEVELOPMENT'],
    },
    {
      id: 'MATCH_CENTRE',
      label: 'Match Centre',
      icon: Radio,
      badge: isMatchActive ? 'LIVE' : undefined,
      badgeColor: 'bg-rose-500',
    },
    {
      id: 'TOURS',
      label: 'Tours & Series',
      icon: Briefcase,
      matchTabs: ['TOURS', 'RIVALRIES'],
    },
    { id: 'TOURNAMENTS', label: 'Tournaments & WTC', icon: Trophy },
    { id: 'FIXTURES', label: 'Calendar & Fixtures', icon: Calendar },
    {
      id: 'NEWS',
      label: 'News & Records',
      icon: Newspaper,
      matchTabs: ['NEWS', 'RANKINGS', 'STATISTICS', 'CAREER_HISTORY'],
    },
  ];

  return (
    <aside
      className={`bg-[#090f1d] border-r border-[#152542] flex flex-col transition-all duration-200 select-none ${
        isCollapsed ? 'w-16' : 'w-56 md:w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 bg-[#080d1a] border-b border-[#152542] flex items-center justify-between px-3.5">
        {!isCollapsed && (
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-black text-white text-xs tracking-wider shadow-md border border-emerald-400/30">
              ICM
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white tracking-wider uppercase leading-none">
                Cricket Manager
              </span>
              <span className="text-[10px] text-emerald-400 font-mono tracking-tight font-medium">
                PRO 2026
              </span>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-black text-white text-xs mx-auto shadow-md border border-emerald-400/30">
            ICM
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-[#14233c] transition hidden md:block"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary Nav List (Streamlined & Clean) */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id || (item.matchTabs && item.matchTabs.includes(activeTab));

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              aria-label={item.label}
              className={`w-full flex items-center rounded-lg text-xs font-medium transition cursor-pointer group ${
                isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 space-x-3'
              } ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-950/70 via-[#10243d] to-sky-950/40 text-emerald-300 font-semibold border-l-2 border-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-[#111e35]'
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${
                  isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-emerald-400'
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

      {/* Settings Action Button */}
      <div className="px-2 pb-2">
        <button
          onClick={() => onSelectTab('SETTINGS')}
          title={isCollapsed ? 'Settings & Saves' : undefined}
          aria-label="Settings & Saves"
          className={`w-full flex items-center rounded-lg text-xs font-medium transition cursor-pointer group ${
            isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 space-x-3'
          } ${
            activeTab === 'SETTINGS'
              ? 'bg-[#10243d] text-emerald-300 font-semibold border-l-2 border-emerald-400'
              : 'text-slate-400 hover:text-slate-100 hover:bg-[#111e35]'
          }`}
        >
          <Settings
            className={`w-4 h-4 flex-shrink-0 ${
              activeTab === 'SETTINGS' ? 'text-emerald-400' : 'text-slate-400 group-hover:text-emerald-400'
            }`}
          />
          {!isCollapsed && <span className="truncate text-left flex-1">Settings & Saves</span>}
        </button>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#152542] text-[11px] text-slate-500 text-center">
        {!isCollapsed ? (
          <p className="truncate text-slate-400 font-mono text-[10px]">ICM Pro Edition • 2026 Engine</p>
        ) : (
          <span className="font-mono text-[10px] text-emerald-400">2026</span>
        )}
      </div>
    </aside>
  );
};
