import React, { useState } from 'react';
import { Player } from '../../types/cricket';
import { getPlayerHeadshotUrl } from '../../data/headshots';
import { CountryFlag } from './CountryFlag';

interface PlayerAvatarProps {
  player: Player;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showFlag?: boolean;
  showRoleBadge?: boolean;
  className?: string;
  onClick?: () => void;
}

const SIZE_STYLES = {
  xs: {
    container: 'w-6 h-6 text-[10px]',
    flag: 'xs' as const,
    icon: 'text-[9px]',
  },
  sm: {
    container: 'w-8 h-8 text-xs',
    flag: 'xs' as const,
    icon: 'text-[10px]',
  },
  md: {
    container: 'w-10 h-10 text-sm',
    flag: 'sm' as const,
    icon: 'text-xs',
  },
  lg: {
    container: 'w-14 h-14 text-base font-bold',
    flag: 'sm' as const,
    icon: 'text-sm',
  },
  xl: {
    container: 'w-20 h-20 text-xl font-black',
    flag: 'md' as const,
    icon: 'text-base',
  },
};

function getInitials(name: string): string {
  if (!name) return 'CR';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getRoleColors(role: string): { bg: string; text: string; label: string } {
  switch (role) {
    case 'BATSMAN':
      return {
        bg: 'from-amber-600 to-amber-900 border-amber-500/40',
        text: 'text-amber-200',
        label: 'BAT',
      };
    case 'BOWLER':
      return {
        bg: 'from-emerald-600 to-teal-900 border-emerald-500/40',
        text: 'text-emerald-200',
        label: 'BOWL',
      };
    case 'ALL_ROUNDER':
      return {
        bg: 'from-purple-600 to-indigo-900 border-purple-500/40',
        text: 'text-purple-200',
        label: 'AR',
      };
    case 'WICKET_KEEPER':
      return {
        bg: 'from-sky-600 to-blue-900 border-sky-500/40',
        text: 'text-sky-200',
        label: 'WK',
      };
    default:
      return {
        bg: 'from-slate-700 to-slate-900 border-slate-600',
        text: 'text-slate-200',
        label: 'CR',
      };
  }
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  size = 'md',
  showFlag = true,
  showRoleBadge = false,
  className = '',
  onClick,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const headshotUrl = getPlayerHeadshotUrl(player.id);
  const sizeConfig = SIZE_STYLES[size] || SIZE_STYLES.md;
  const roleConfig = getRoleColors(player.role);
  const initials = getInitials(player.shortName || player.name);

  const showPhoto = Boolean(headshotUrl) && !imageFailed;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex shrink-0 select-none ${onClick ? 'cursor-pointer hover:opacity-90 transition' : ''} ${className}`}
    >
      <div
        className={`${sizeConfig.container} rounded-full overflow-hidden border flex items-center justify-center font-bold tracking-wider shadow-inner ${
          showPhoto ? 'bg-slate-900 border-slate-700' : `bg-gradient-to-br ${roleConfig.bg} text-white`
        }`}
      >
        {showPhoto ? (
          <img
            src={headshotUrl}
            alt={player.name}
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
        ) : (
          <span className="drop-shadow-sm font-semibold">{initials}</span>
        )}
      </div>

      {/* Country Flag Badge */}
      {showFlag && player.countryId && (
        <div className="absolute -bottom-1 -right-1 z-10 filter drop-shadow">
          <CountryFlag
            countryCode={player.countryId}
            size={sizeConfig.flag}
            className="border border-slate-900 shadow-md"
          />
        </div>
      )}

      {/* Role Badge Indicator */}
      {showRoleBadge && (
        <span
          className={`absolute -top-1 -right-1 px-1 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-slate-950/90 border border-slate-700 ${roleConfig.text}`}
        >
          {roleConfig.label}
        </span>
      )}
    </div>
  );
};
