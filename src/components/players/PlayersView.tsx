import React, { useState, useMemo } from 'react';
import {
  Search,
  Users,
  Shield,
  Filter,
  CheckCircle2,
  Award,
  ChevronRight,
  TrendingUp,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { CareerSave, Player, MatchFormat } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { ALL_PLAYERS, getEffectivePlayer } from '../../data/squads';
import { getGranularPlayerRole } from '../../store/careerStore';
import { CountryFlag } from '../common/CountryFlag';
import { PlayerAvatar } from '../common/PlayerAvatar';

interface PlayersViewProps {
  career: CareerSave;
  onSelectPlayer: (player: Player) => void;
}

export const PlayersView: React.FC<PlayersViewProps> = ({ career, onSelectPlayer }) => {
  const [selectedCountry, setSelectedCountry] = useState<string>(career.selectedTeamId);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [formatMembershipFilter, setFormatMembershipFilter] = useState<'ALL' | 'TEST' | 'ODI' | 'T20I'>('ALL');

  // Combined active international player pool
  const allEffectivePlayers: Player[] = useMemo(() => {
    const combined = [...ALL_PLAYERS, ...(career.emergingPlayers || [])];
    return combined
      .map((p) => getEffectivePlayer(p, career) || p)
      .filter((p) => p.gender !== 'FEMALE' && p.status !== 'RETIRED');
  }, [career]);

  // Squad membership checks for managed nation
  const userFormatSquads = career.formatSquads;
  const testSquadSet = useMemo(() => new Set(userFormatSquads?.TEST?.squadPlayerIds || []), [userFormatSquads]);
  const odiSquadSet = useMemo(() => new Set(userFormatSquads?.ODI?.squadPlayerIds || []), [userFormatSquads]);
  const t20SquadSet = useMemo(() => new Set(userFormatSquads?.T20I?.squadPlayerIds || []), [userFormatSquads]);

  const filteredPlayers = useMemo(() => {
    return allEffectivePlayers.filter((p) => {
      if (selectedCountry !== 'ALL' && p.countryId !== selectedCountry) return false;

      const role = getGranularPlayerRole(p);
      if (roleFilter !== 'ALL' && role !== roleFilter) return false;

      if (formatMembershipFilter === 'TEST' && !testSquadSet.has(p.id)) return false;
      if (formatMembershipFilter === 'ODI' && !odiSquadSet.has(p.id)) return false;
      if (formatMembershipFilter === 'T20I' && !t20SquadSet.has(p.id)) return false;

      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [allEffectivePlayers, selectedCountry, roleFilter, formatMembershipFilter, searchQuery, testSquadSet, odiSquadSet, t20SquadSet]);

  const viewedTeam = INTERNATIONAL_TEAMS.find((t) => t.id === selectedCountry);

  return (
    <div className="space-y-4 select-none pb-8 text-[#e8edf2]">
      {/* Top Banner: Scouting & International Registry in Dugout Style */}
      <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#10151c] border border-[#1e2733] flex items-center justify-center text-[#e2b64a] shadow-inner">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="dugout-kicker text-[11px] text-[#e2b64a]">Global Scouting</span>
              <span className="text-[10px] bg-[#10151c] text-[#8fb2d9] font-mono px-2 py-0.5 rounded-full border border-[#1e2733] font-bold">
                {allEffectivePlayers.length} Active Records
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase mt-0.5">
              International Player Registry
            </h1>
            <p className="text-xs text-[#8b97a3] mt-0.5">
              Scout domestic and international talent, inspect attributes, career milestones and format squad allocations
            </p>
          </div>
        </div>

        {/* Country Selector */}
        <div className="flex items-center space-x-2.5 bg-[#10151c] border border-[#1e2733] px-3.5 py-2 rounded-xl text-xs">
          <span className="dugout-kicker text-[10px] text-[#8b97a3]">Nation:</span>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="bg-transparent text-white font-bold focus:outline-none cursor-pointer tracking-wide"
          >
            <option value={career.selectedTeamId} className="bg-[#070a0e] text-[#ffe9a8]">
              ★ {INTERNATIONAL_TEAMS.find((t) => t.id === career.selectedTeamId)?.name} (Managed)
            </option>
            <option value="ALL" className="bg-[#070a0e] text-white">
              All International Nations
            </option>
            {INTERNATIONAL_TEAMS.filter((t) => t.id !== career.selectedTeamId).map((t) => (
              <option key={t.id} value={t.id} className="bg-[#070a0e] text-[#c3ccd6]">
                {t.name} ({t.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Strip: Search + Role + Format Squad Badges */}
      <div className="bg-[#070a0e] border border-[#1e2733] p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[#10151c] border border-[#1e2733] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#e2b64a] cursor-pointer tracking-wider font-semibold"
          >
            <option value="ALL">All Roles</option>
            <option value="OPENING_BATTER">Opening Batter</option>
            <option value="MIDDLE_ORDER_BATTER">Middle Order</option>
            <option value="WICKETKEEPER_BATTER">Wicketkeeper</option>
            <option value="ALL_ROUNDER">All-Rounder</option>
            <option value="FAST_BOWLER">Fast Bowler</option>
            <option value="SPIN_BOWLER">Spin Bowler</option>
          </select>

          {/* Format Membership Filter (for managed nation) */}
          {selectedCountry === career.selectedTeamId && (
            <div className="flex bg-[#10151c] p-1 rounded-lg border border-[#1e2733]">
              {(['ALL', 'TEST', 'ODI', 'T20I'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormatMembershipFilter(fmt)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition cursor-pointer ${
                    formatMembershipFilter === fmt
                      ? 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black shadow-sm'
                      : 'text-[#8b97a3] hover:text-white'
                  }`}
                >
                  {fmt === 'ALL' ? 'All National' : `${fmt} Squad`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#8b97a3] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by player name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#10151c] border border-[#1e2733] pl-9 pr-3 py-2 rounded-lg text-xs text-white placeholder-[#556375] focus:outline-none focus:border-[#e2b64a]"
          />
        </div>
      </div>

      {/* Players Data Table */}
      <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 bg-[#10151c] border-b border-[#1e2733] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="dugout-kicker text-xs text-[#e2b64a]">Player Registry</span>
            <span className="text-[11px] font-mono font-bold text-[#c3ccd6]">
              ({filteredPlayers.length} Profiles)
            </span>
          </div>
          <span className="text-[10px] text-[#8b97a3] font-mono uppercase tracking-wider">
            Click row for detailed attributes &amp; stats
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#070a0e] text-[#8b97a3] font-mono text-[10px] uppercase border-b border-[#1e2733] tracking-wider">
              <tr>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-2">Nation</th>
                <th className="py-3 px-2">Role</th>
                <th className="py-3 px-2">Style</th>
                <th className="py-3 px-2 text-center">Age</th>
                <th className="py-3 px-2 text-center">Rating</th>
                <th className="py-3 px-2 text-center">Form</th>
                <th className="py-3 px-2 text-center">Fitness</th>
                <th className="py-3 px-4">Squad Allocations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2733]">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#8b97a3]">
                    No players found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredPlayers.slice(0, 60).map((player) => {
                  const role = getGranularPlayerRole(player);
                  const isTest = testSquadSet.has(player.id);
                  const isOdi = odiSquadSet.has(player.id);
                  const isT20 = t20SquadSet.has(player.id);
                  const nation = INTERNATIONAL_TEAMS.find((t) => t.id === player.countryId);
                  const avgRating = Math.round((player.testRating + player.odiRating + player.t20Rating) / 3);

                  return (
                    <tr
                      key={player.id}
                      onClick={() => onSelectPlayer(player)}
                      className="hover:bg-[#10151c] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <PlayerAvatar player={player} size="sm" />
                          <div>
                            <div className="font-bold text-white group-hover:text-[#e2b64a] transition-colors flex items-center gap-1.5">
                              <span>{player.name}</span>
                              {player.isInjured && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#ff3d7f]/20 text-[#ff5470] border border-[#ff3d7f]/40 uppercase tracking-wider">
                                  INJ
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#8b97a3] font-mono">
                              #{player.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 font-mono text-[#c3ccd6]">
                        <div className="flex items-center space-x-1.5">
                          <CountryFlag countryCode={nation?.code || player.countryId} size="xs" />
                          <span>{nation?.code || player.countryId}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10151c] border border-[#1e2733] text-[#c3ccd6] uppercase tracking-wider">
                          {role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-[#8b97a3] text-[11px]">
                        <span className="text-white font-medium">{player.battingHand === 'LEFT_HAND' ? 'LHB' : 'RHB'}</span> •{' '}
                        <span>{player.bowlingStyle?.replace(/_/g, ' ') || 'None'}</span>
                      </td>
                      <td className="py-3 px-2 text-center font-mono text-[#c3ccd6]">
                        {player.age || 26}
                      </td>
                      <td className="py-3 px-2 text-center font-mono font-bold text-white">
                        <span className="text-[#ffe9a8] font-black">{avgRating}</span>
                      </td>
                      <td className="py-3 px-2 text-center font-mono font-bold">
                        <span
                          className={`${
                            (player.currentForm || player.attributes?.currentForm || 75) >= 80
                              ? 'text-[#3fca86]'
                              : (player.currentForm || player.attributes?.currentForm || 75) >= 60
                              ? 'text-[#8fb2d9]'
                              : 'text-[#ff5470]'
                          }`}
                        >
                          {player.currentForm || player.attributes?.currentForm || 75}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center font-mono font-bold">
                        <span
                          className={`${
                            (player.fitness || 90) >= 85
                              ? 'text-[#3fca86]'
                              : (player.fitness || 90) >= 70
                              ? 'text-[#e2b64a]'
                              : 'text-[#ff5470]'
                          }`}
                        >
                          {player.fitness || 90}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          {isTest && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ff3d7f]/20 text-[#ff5470] border border-[#ff3d7f]/40 font-mono tracking-wider">
                              TEST
                            </span>
                          )}
                          {isOdi && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#8fb2d9]/20 text-[#8fb2d9] border border-[#8fb2d9]/40 font-mono tracking-wider">
                              ODI
                            </span>
                          )}
                          {isT20 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#3fca86]/20 text-[#3fca86] border border-[#3fca86]/40 font-mono tracking-wider">
                              T20I
                            </span>
                          )}
                          {!isTest && !isOdi && !isT20 && (
                            <span className="text-[10px] text-[#556375] font-mono uppercase tracking-wider">
                              National Pool
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
