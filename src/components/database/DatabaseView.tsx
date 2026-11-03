import React, { useState, useMemo } from 'react';
import { Database, Search, Filter, Shield, Award, Users, CheckCircle, Globe, Sparkles, Download, AlertTriangle, FileJson, ChevronDown, ChevronUp } from 'lucide-react';
import { Player, PlayerRole, MatchFormat } from '../../types/cricket';
import { ALL_PLAYERS } from '../../data/squads';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import {
  downloadDatabaseExportZip,
  downloadSingleExportFile,
  generateDatabaseValidationReport,
} from '../../engine/databaseExport';

interface DatabaseViewProps {
  onSelectPlayer: (player: Player) => void;
}

const EXPORT_FILE_LIST = [
  { file: '01_countries.json', label: '1. Countries' },
  { file: '02_all_players.json', label: '2. All Players' },
  { file: '03_test_squads.json', label: '3. Test Squads' },
  { file: '04_odi_squads.json', label: '4. ODI Squads' },
  { file: '05_t20i_squads.json', label: '5. T20I Squads' },
  { file: '06_captains_and_vice_captains.json', label: '6. Captains & VCs' },
  { file: '07_player_roles_and_styles.json', label: '7. Roles & Styles' },
  { file: '08_tour_squads.json', label: '8. Tour Squads' },
  { file: '09_current_playing_xis.json', label: '9. Playing XIs' },
  { file: '10_fixtures_and_tours.json', label: '10. Fixtures & Tours' },
  { file: '11_validation_report.json', label: '11. Validation Report (.JSON)' },
  { file: '11_validation_report.md', label: '11. Validation Report (.MD)' },
];

export const DatabaseView: React.FC<DatabaseViewProps> = ({ onSelectPlayer }) => {
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'ACTIVE' | 'LEGENDS' | 'WOMEN' | 'ASSOCIATES'>('ALL');
  const [selectedFormat, setSelectedFormat] = useState<MatchFormat>('TEST');
  const [sortBy, setSortBy] = useState<'RATING' | 'RUNS' | 'WICKETS' | 'AGE'>('RATING');
  const [showAuditPanel, setShowAuditPanel] = useState(true);

  const validationReport = useMemo(() => generateDatabaseValidationReport(), []);

  const filteredPlayers = ALL_PLAYERS.filter((p) => {
    if (selectedCountry !== 'ALL' && p.countryId !== selectedCountry) return false;
    if (selectedRole !== 'ALL' && p.role !== selectedRole) return false;
    if (selectedCategory === 'LEGENDS' && p.status !== 'LEGEND') return false;
    if (selectedCategory === 'ACTIVE' && p.status !== 'ACTIVE') return false;
    if (selectedCategory === 'WOMEN' && p.gender !== 'FEMALE') return false;
    if (selectedCategory === 'ASSOCIATES' && (p.countryId === 'IND' || p.countryId === 'AUS' || p.countryId === 'ENG' || p.countryId === 'RSA' || p.countryId === 'PAK' || p.countryId === 'NZL')) return false;

    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.countryName.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Sort
  filteredPlayers.sort((a, b) => {
    if (sortBy === 'RATING') {
      const rA = selectedFormat === 'TEST' ? a.testRating : selectedFormat === 'ODI' ? a.odiRating : a.t20Rating;
      const rB = selectedFormat === 'TEST' ? b.testRating : selectedFormat === 'ODI' ? b.odiRating : b.t20Rating;
      return rB - rA;
    }
    if (sortBy === 'RUNS') {
      return (b.stats[selectedFormat]?.runs || 0) - (a.stats[selectedFormat]?.runs || 0);
    }
    if (sortBy === 'WICKETS') {
      return (b.stats[selectedFormat]?.wickets || 0) - (a.stats[selectedFormat]?.wickets || 0);
    }
    if (sortBy === 'AGE') {
      return a.age - b.age;
    }
    return 0;
  });

  return (
    <div className="space-y-4 select-none animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            Large International Player Database & Export Center
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified international cricketers, career records, legends, women icons, and complete JSON/ZIP export suite.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => downloadDatabaseExportZip('ICM_Database_Export.zip')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Full Database (.ZIP)</span>
          </button>

          <button
            onClick={() => setShowAuditPanel(!showAuditPanel)}
            className="bg-[#182234] hover:bg-[#202d42] border border-[#243247] text-amber-300 text-xs font-bold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Validation Report ({validationReport.summary.totalIssuesFound} Findings)</span>
            {showAuditPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <div className="flex items-center space-x-2 text-xs font-mono bg-[#182234] border border-[#243247] px-3 py-2 rounded-lg">
            <span className="text-slate-400">Records:</span>
            <span className="text-emerald-400 font-bold">{ALL_PLAYERS.length} Players</span>
          </div>
        </div>
      </div>

      {/* Expandable Database Export & Validation Audit Panel */}
      {showAuditPanel && (
        <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1f293d] pb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileJson className="w-4 h-4 text-sky-400" />
                Database Export Package (10 JSON Datasets + Validation Report)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Download the complete ZIP bundle or click any individual JSON export below. Existing game data is unmodified.
              </p>
            </div>
            <a
              href="/ICM_Database_Export.zip"
              download="ICM_Database_Export.zip"
              className="text-xs font-mono text-sky-400 hover:text-sky-300 underline"
            >
              Direct Link: /ICM_Database_Export.zip
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {EXPORT_FILE_LIST.map((item) => (
              <button
                key={item.file}
                onClick={() => downloadSingleExportFile(item.file)}
                className="bg-[#182234] hover:bg-[#223049] border border-[#243247] text-left p-2 rounded text-[11px] transition cursor-pointer flex flex-col justify-between"
              >
                <span className="font-bold text-white truncate">{item.label}</span>
                <span className="font-mono text-[10px] text-sky-400 truncate mt-1">{item.file}</span>
              </button>
            ))}
          </div>

          {/* Audit Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-xs pt-1">
            <div className="bg-[#182234] border border-[#243247] p-2.5 rounded">
              <span className="text-[10px] text-slate-400 uppercase block">Active Men</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{validationReport.summary.activeMalePlayers} / {validationReport.summary.totalPlayers}</span>
            </div>
            <div className="bg-[#182234] border border-[#243247] p-2.5 rounded">
              <span className="text-[10px] text-slate-400 uppercase block">Legends/Retired/Women</span>
              <span className="text-sm font-bold text-amber-300 font-mono">
                {validationReport.summary.legendPlayers + validationReport.summary.retiredPlayers + validationReport.summary.activeFemalePlayers} Mixed
              </span>
            </div>
            <div className="bg-[#182234] border border-[#243247] p-2.5 rounded">
              <span className="text-[10px] text-slate-400 uppercase block">Duplicate Checks</span>
              <span className="text-sm font-bold text-white font-mono">{validationReport.summary.byCategory.duplicatePlayers} Collisions</span>
            </div>
            <div className="bg-[#182234] border border-[#243247] p-2.5 rounded">
              <span className="text-[10px] text-slate-400 uppercase block">Missing Roster Issues</span>
              <span className="text-sm font-bold text-rose-400 font-mono">{validationReport.summary.byCategory.missingPlayers} Gaps</span>
            </div>
            <div className="bg-[#182234] border border-[#243247] p-2.5 rounded">
              <span className="text-[10px] text-slate-400 uppercase block">Country / Pool Issues</span>
              <span className="text-sm font-bold text-amber-400 font-mono">{validationReport.summary.byCategory.countryAssignments} Flags</span>
            </div>
            <div className="bg-[#182234] border border-[#243247] p-2.5 rounded">
              <span className="text-[10px] text-slate-400 uppercase block">Lineup Inconsistencies</span>
              <span className="text-sm font-bold text-rose-400 font-mono">{validationReport.summary.byCategory.formatLineupInconsistencies} Issues</span>
            </div>
          </div>

          {/* Country Roster Status Table */}
          <div className="overflow-x-auto border border-[#1f293d] rounded">
            <table className="w-full text-left text-[11px] font-mono">
              <thead className="bg-[#182234] text-slate-400 border-b border-[#243247]">
                <tr>
                  <th className="p-2">Country</th>
                  <th className="p-2 text-center">In Teams Table</th>
                  <th className="p-2 text-center">Total DB</th>
                  <th className="p-2 text-center">Active Men</th>
                  <th className="p-2 text-center">Non-Active / Women</th>
                  <th className="p-2 text-center">Active Men Eligible (TEST / ODI / T20I)</th>
                  <th className="p-2 text-center">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f293d]">
                {validationReport.countryRosterAudit.map((row) => (
                  <tr key={row.countryId} className="hover:bg-[#182234]/40">
                    <td className="p-2 font-sans font-bold text-white">{row.countryName} ({row.countryId})</td>
                    <td className="p-2 text-center">{row.inInternationalTeamsTable ? 'YES' : 'NO'}</td>
                    <td className="p-2 text-center text-white">{row.totalPlayersInDb}</td>
                    <td className="p-2 text-center text-emerald-400 font-bold">{row.activeMenCount}</td>
                    <td className="p-2 text-center text-amber-300">{row.legendsCount + row.retiredCount + row.activeWomenCount}</td>
                    <td className="p-2 text-center">
                      {row.activeMenEligibleCounts.TEST} / {row.activeMenEligibleCounts.ODI} / {row.activeMenEligibleCounts.T20I}
                    </td>
                    <td className="p-2 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          row.status === 'COMPLETE'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : row.status === 'EMPTY_ROSTER'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'All Players' },
          { id: 'ACTIVE', label: 'Active Internationals' },
          { id: 'LEGENDS', label: 'Historical Legends' },
          { id: 'WOMEN', label: "Women's Cricket Icons" },
          { id: 'ASSOCIATES', label: 'Associate Standouts' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              selectedCategory === cat.id
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-[#182234] text-slate-400 hover:text-white border border-[#243247]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Filters Toolbar */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by player or nation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#182234] border border-[#243247] text-xs text-white rounded pl-8 pr-2.5 py-1.5 focus:border-emerald-500"
            />
          </div>

          {/* Country Filter */}
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="bg-[#182234] border border-[#243247] text-xs text-slate-200 rounded px-2.5 py-1.5 focus:border-emerald-500"
          >
            <option value="ALL">All Nations</option>
            {INTERNATIONAL_TEAMS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-[#182234] border border-[#243247] text-xs text-slate-200 rounded px-2.5 py-1.5 focus:border-emerald-500"
          >
            <option value="ALL">All Roles</option>
            <option value="BATTER">Batter</option>
            <option value="BOWLER">Bowler</option>
            <option value="ALL_ROUNDER">All-Rounder</option>
            <option value="WICKETKEEPER_BATTER">Wicketkeeper</option>
          </select>

          {/* Format */}
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value as MatchFormat)}
            className="bg-[#182234] border border-[#243247] text-xs text-slate-200 rounded px-2.5 py-1.5 focus:border-emerald-500 font-mono"
          >
            <option value="TEST">Stats Format: Test Cricket</option>
            <option value="ODI">Stats Format: One Day Int</option>
            <option value="T20I">Stats Format: T20 International</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#182234] border border-[#243247] text-xs text-slate-200 rounded px-2.5 py-1.5 focus:border-emerald-500"
          >
            <option value="RATING">Sort by Overall Rating</option>
            <option value="RUNS">Sort by Total Runs</option>
            <option value="WICKETS">Sort by Total Wickets</option>
            <option value="AGE">Sort by Age</option>
          </select>
        </div>
      </div>

      {/* Players Table */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#182234] text-slate-400 font-semibold border-b border-[#243247]">
              <tr>
                <th className="p-3">Player Name</th>
                <th className="p-3">Nation</th>
                <th className="p-3">Role & Style</th>
                <th className="p-3">Format Eligibility</th>
                <th className="p-3 text-center font-mono">Rating</th>
                <th className="p-3 text-right font-mono">Matches</th>
                <th className="p-3 text-right font-mono">Runs</th>
                <th className="p-3 text-right font-mono">Avg</th>
                <th className="p-3 text-right font-mono">Wkts</th>
                <th className="p-3 text-center">Data Source</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#243247] font-mono">
              {filteredPlayers.map((player) => {
                const team = INTERNATIONAL_TEAMS.find((t) => t.id === player.countryId);
                const stats = player.stats[selectedFormat] || { matches: 0, runs: 0, average: 0, wickets: 0 };
                const rating =
                  selectedFormat === 'TEST'
                    ? player.testRating
                    : selectedFormat === 'ODI'
                    ? player.odiRating
                    : player.t20Rating;

                return (
                  <tr
                    key={player.id}
                    className="hover:bg-[#182234]/60 transition cursor-pointer"
                    onClick={() => onSelectPlayer(player)}
                  >
                    <td className="p-3 font-sans font-bold text-white flex items-center space-x-2">
                      <span>{player.name}</span>
                      {player.status === 'LEGEND' && (
                        <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-800 px-1 rounded font-bold">
                          LEGEND
                        </span>
                      )}
                      {player.gender === 'FEMALE' && (
                        <span className="text-[9px] bg-pink-950 text-pink-300 border border-pink-800 px-1 rounded font-bold">
                          WOMEN
                        </span>
                      )}
                      {player.isCaptain && (
                        <span className="text-[9px] bg-amber-500 text-black px-1 rounded font-bold">
                          C
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-sans text-slate-300">
                      <span className="mr-1.5">{team?.flagEmoji || '🏏'}</span>
                      {player.countryName}
                    </td>
                    <td className="p-3 font-sans text-slate-300">
                      <span className="text-emerald-400 font-medium block">{player.role.replace('_', ' ')}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {player.battingHand === 'RIGHT_HAND' ? 'RHB' : 'LHB'} • {player.bowlingStyle.replace('RIGHT_ARM_', 'RA ').replace('LEFT_ARM_', 'LA ')}
                      </span>
                    </td>
                    <td className="p-3 font-sans">
                      <div className="flex items-center space-x-1">
                        <span className={`text-[9px] px-1 rounded font-mono font-bold ${player.formatEligibility?.TEST ? 'bg-red-950 text-red-300 border border-red-800' : 'opacity-20 bg-slate-800 text-slate-500'}`}>
                          TEST
                        </span>
                        <span className={`text-[9px] px-1 rounded font-mono font-bold ${player.formatEligibility?.ODI ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'opacity-20 bg-slate-800 text-slate-500'}`}>
                          ODI
                        </span>
                        <span className={`text-[9px] px-1 rounded font-mono font-bold ${player.formatEligibility?.T20I ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'opacity-20 bg-slate-800 text-slate-500'}`}>
                          T20I
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-400">
                      {rating}
                    </td>
                    <td className="p-3 text-right text-slate-300">{stats.matches}</td>
                    <td className="p-3 text-right font-bold text-white">{stats.runs}</td>
                    <td className="p-3 text-right text-emerald-400">{stats.average.toFixed(1)}</td>
                    <td className="p-3 text-right font-bold text-white">{stats.wickets}</td>
                    <td className="p-3 text-center text-[10px] text-slate-400 font-mono">
                      {player.sourceMeta?.source || 'Verified'}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPlayer(player);
                        }}
                        className="text-xs bg-[#243247] hover:bg-[#334155] text-white px-2 py-1 rounded transition cursor-pointer"
                      >
                        Profile
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
