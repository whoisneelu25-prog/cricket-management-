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
} from 'lucide-react';
import { CareerSave, Player, MatchFormat } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { ALL_PLAYERS, getEffectivePlayer } from '../../data/squads';
import { getGranularPlayerRole } from '../../store/careerStore';

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
    <div className="space-y-4 select-none pb-8 text-slate-200">
      {/* Top Banner: Scouting & International Registry */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-[#151d29] border border-[#1e293b] flex items-center justify-center text-emerald-400">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-white tracking-wide">
                International Player Scouting &amp; Registry
              </h1>
              <span className="text-[10px] bg-[#142646] text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-emerald-900/60 font-bold">
                {allEffectivePlayers.length} Active Records
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Scout domestic and international talent, inspect attributes, career milestones and format squad allocations
            </p>
          </div>
        </div>

        {/* Country Selector */}
        <div className="flex items-center space-x-2 bg-[#151d29] border border-[#1e293b] px-3 py-1.5 rounded-lg text-xs">
          <span className="text-slate-400 text-[11px]">Nation:</span>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
          >
            <option value={career.selectedTeamId} className="bg-[#111827]">
              ★ {INTERNATIONAL_TEAMS.find((t) => t.id === career.selectedTeamId)?.name} (Managed)
            </option>
            <option value="ALL" className="bg-[#111827]">
              All International Nations
            </option>
            {INTERNATIONAL_TEAMS.filter((t) => t.id !== career.selectedTeamId).map((t) => (
              <option key={t.id} value={t.id} className="bg-[#111827]">
                {t.name} ({t.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Strip: Search + Role + Format Squad Badges */}
      <div className="bg-[#111827] border border-[#1e293b] p-3 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[#151d29] border border-[#1e293b] text-white px-2.5 py-1.5 rounded focus:outline-none cursor-pointer"
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
            <div className="flex bg-[#151d29] p-0.5 rounded border border-[#1e293b]">
              {(['ALL', 'TEST', 'ODI', 'T20I'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormatMembershipFilter(fmt)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                    formatMembershipFilter === fmt
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {fmt === 'ALL' ? 'All National' : `${fmt} Squad`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#151d29] border border-[#1e293b] pl-8 pr-3 py-1.5 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Players Data Table */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg overflow-hidden">
        <div className="p-3 bg-[#151d29] border-b border-[#1e293b] flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Player Registry ({filteredPlayers.length} Profiles)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Click player for detailed stats</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0e131d] text-slate-400 font-mono text-[10px] uppercase border-b border-[#1e293b]">
              <tr>
                <th className="py-2.5 px-3">Player</th>
                <th className="py-2.5 px-2">Nation</th>
                <th className="py-2.5 px-2">Role</th>
                <th className="py-2.5 px-2">Style</th>
                <th className="py-2.5 px-2 text-center">Age</th>
                <th className="py-2.5 px-2 text-center">Rating</th>
                <th className="py-2.5 px-2 text-center">Form</th>
                <th className="py-2.5 px-2 text-center">Fitness</th>
                <th className="py-2.5 px-3">Squad Memberships</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/60">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-400">
                    No players found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredPlayers.slice(0, 50).map((player) => {
                  const role = getGranularPlayerRole(player);
                  const isTest = testSquadSet.has(player.id);
                  const isOdi = odiSquadSet.has(player.id);
                  const isT20 = t20SquadSet.has(player.id);
                  const nation = INTERNATIONAL_TEAMS.find((t) => t.id === player.countryId);

                  return (
                    <tr
                      key={player.id}
                      onClick={() => onSelectPlayer(player)}
                      className="hover:bg-[#151d29] transition cursor-pointer"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white hover:text-emerald-400 flex items-center gap-1.5">
                          <span>{player.name}</span>
                          {player.isInjured && (
                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                              INJ
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-300">
                        {nation?.code || player.countryId}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#151d29] border border-[#1e293b] text-slate-300">
                          {role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-slate-400 text-[11px]">
                        {player.battingHand === 'LEFT_HAND' ? 'LHB' : 'RHB'} •{' '}
                        {player.bowlingStyle?.replace(/_/g, ' ') || 'None'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                        {player.age || 26}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-white">
                        {Math.round((player.testRating + player.odiRating + player.t20Rating) / 3)}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono">
                        <span
                          className={`${
                            (player.currentForm || player.attributes?.currentForm || 75) >= 80
                              ? 'text-emerald-400 font-bold'
                              : (player.currentForm || player.attributes?.currentForm || 75) >= 60
                              ? 'text-slate-300'
                              : 'text-rose-400'
                          }`}
                        >
                          {player.currentForm || player.attributes?.currentForm || 75}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono">
                        <span
                          className={`${
                            (player.fitness || 90) >= 85
                              ? 'text-emerald-400'
                              : (player.fitness || 90) >= 70
                              ? 'text-amber-400'
                              : 'text-rose-400 font-bold'
                          }`}
                        >
                          {player.fitness || 90}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-1">
                          {isTest && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-950/70 text-red-300 border border-red-800/60 font-mono">
                              TEST
                            </span>
                          )}
                          {isOdi && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-950/70 text-sky-300 border border-sky-800/60 font-mono">
                              ODI
                            </span>
                          )}
                          {isT20 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 font-mono">
                              T20I
                            </span>
                          )}
                          {!isTest && !isOdi && !isT20 && (
                            <span className="text-[10px] text-slate-500 font-mono">Selection Pool</span>
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
