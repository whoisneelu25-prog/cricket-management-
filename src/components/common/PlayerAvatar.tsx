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
    badge: 'text-[7px] px-1',
  },
  sm: {
    container: 'w-8 h-8 text-xs',
    flag: 'xs' as const,
    badge: 'text-[8px] px-1',
  },
  md: {
    container: 'w-10 h-10 text-sm',
    flag: 'sm' as const,
    badge: 'text-[9px] px-1.5',
  },
  lg: {
    container: 'w-14 h-14 text-base font-bold',
    flag: 'sm' as const,
    badge: 'text-[10px] px-2',
  },
  xl: {
    container: 'w-20 h-20 text-xl font-black',
    flag: 'md' as const,
    badge: 'text-xs px-2.5',
  },
};

function getInitials(name: string): string {
  if (!name) return 'CR';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getRoleBadge(role: string): { label: string; text: string; border: string; bg: string } {
  switch (role) {
    case 'BATSMAN':
      return {
        label: 'BAT',
        text: 'text-[#ffe9a8]',
        border: 'border-[#e2b64a]/50',
        bg: 'bg-[#2c2412]/90',
      };
    case 'BOWLER':
      return {
        label: 'BOWL',
        text: 'text-[#3fca86]',
        border: 'border-[#3fca86]/50',
        bg: 'bg-[#0e2c1d]/90',
      };
    case 'ALL_ROUNDER':
      return {
        label: 'AR',
        text: 'text-[#8fb2d9]',
        border: 'border-[#8fb2d9]/50',
        bg: 'bg-[#10151c]/90',
      };
    case 'WICKET_KEEPER':
      return {
        label: 'WK',
        text: 'text-amber-300',
        border: 'border-amber-400/50',
        bg: 'bg-amber-950/90',
      };
    default:
      return {
        label: 'CR',
        text: 'text-[#c3ccd6]',
        border: 'border-[#1e2733]',
        bg: 'bg-[#070a0e]/90',
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
  const roleConfig = getRoleBadge(player.role);
  const initials = getInitials(player.shortName || player.name);

  const showPhoto = Boolean(headshotUrl) && !imageFailed;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex shrink-0 select-none ${onClick ? 'cursor-pointer hover:opacity-95 hover:scale-[1.02] transition' : ''} ${className}`}
    >
      <div
        className={`${sizeConfig.container} rounded-xl overflow-hidden border border-[#1e2733] flex items-center justify-center font-bold tracking-wider shadow-lg ${
          showPhoto
            ? 'bg-[#070a0e]'
            : 'bg-gradient-to-br from-[#10151c] via-[#070a0e] to-[#000000] text-[#e8edf2]'
        }`}
        style={{
          boxShadow: showPhoto ? '0 2px 10px rgba(0,0,0,0.7)' : 'inset 0 0 12px rgba(226,182,74,0.08)',
        }}
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
          <span className="font-extrabold text-[#ffe9a8] tracking-widest drop-shadow-sm">
            {initials}
          </span>
        )}
      </div>

      {/* Country Flag Badge */}
      {showFlag && player.countryId && (
        <div className="absolute -bottom-1 -right-1 z-10 filter drop-shadow">
          <CountryFlag
            countryCode={player.countryId}
            size={sizeConfig.flag}
            className="border border-[#1e2733] shadow-md"
          />
        </div>
      )}

      {/* Role Badge Indicator */}
      {showRoleBadge && (
        <span
          className={`absolute -top-1 -right-1 rounded font-black uppercase tracking-wider border shadow-md font-sans ${sizeConfig.badge} ${roleConfig.text} ${roleConfig.border} ${roleConfig.bg}`}
        >
          {roleConfig.label}
        </span>
      )}
    </div>
  );
};
