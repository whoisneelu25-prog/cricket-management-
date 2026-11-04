import React, { useState } from 'react';
import {
  X,
  Award,
  Shield,
  Zap,
  Activity,
  Heart,
  Star,
  Target,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { CareerSave, Player, MatchFormat, GranularPlayerRole } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { getCombinedFormatStats, getEffectivePlayer } from '../../data/squads';
import { getGranularPlayerRole } from '../../store/careerStore';

interface PlayerProfileModalProps {
  player: Player | null;
  career?: CareerSave;
  onClose: () => void;
}

type StatsTab = MatchFormat | 'OVERALL';

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  player: rawPlayer,
  career,
  onClose,
}) => {
  const [selectedTab, setSelectedTab] = useState<StatsTab>('TEST');

  if (!rawPlayer) return null;

  const player = getEffectivePlayer(rawPlayer, career) || rawPlayer;
  const team = INTERNATIONAL_TEAMS.find((t) => t.id === player.countryId);
  const granularRole: GranularPlayerRole = getGranularPlayerRole(player);

  // Format Squad Membership Checks
  const userFormatSquads = career?.formatSquads;
  const inTestSquad = Boolean(userFormatSquads?.TEST?.squadPlayerIds?.includes(player.id));
  const inOdiSquad = Boolean(userFormatSquads?.ODI?.squadPlayerIds?.includes(player.id));
  const inT20Squad = Boolean(userFormatSquads?.T20I?.squadPlayerIds?.includes(player.id));

  // Attribute Color Helper
  const getRatingColor = (val: number) => {
    if (val >= 90) return 'text-emerald-400 bg-emerald-500';
    if (val >= 80) return 'text-emerald-300 bg-emerald-600';
    if (val >= 70) return 'text-amber-400 bg-amber-500';
    return 'text-slate-400 bg-slate-600';
  };

  // Compile Stats for Current Tab (Test, ODI, T20I, or Overall)
  const getStatsForTab = (tab: StatsTab) => {
    if (tab === 'OVERALL') {
      const test = getCombinedFormatStats(player, 'TEST');
      const odi = getCombinedFormatStats(player, 'ODI');
      const t20 = getCombinedFormatStats(player, 'T20I');

      const totalMatches = test.matches + odi.matches + t20.matches;
      const totalInnings = test.innings + odi.innings + t20.innings;
      const totalNO = test.notOuts + odi.notOuts + t20.notOuts;
      const totalRuns = test.runs + odi.runs + t20.runs;
      const totalDismissals = Math.max(1, totalInnings - totalNO);
      const overallAvg = totalRuns / totalDismissals;
      const total100s = test.centuries + odi.centuries + t20.centuries;
      const total50s = test.fifties + odi.fifties + t20.fifties;

      const totalWickets = test.wickets + odi.wickets + t20.wickets;
      const totalRunsConceded = test.runsConceded + odi.runsConceded + t20.runsConceded;
      const bowlingAvg = totalWickets > 0 ? totalRunsConceded / totalWickets : 0;
      const total5w = test.fiveWicketHauls + odi.fiveWicketHauls + t20.fiveWicketHauls;

      return {
        combined: {
          matches: totalMatches,
          innings: totalInnings,
          notOuts: totalNO,
          runs: totalRuns,
          average: overallAvg,
          centuries: total100s,
          fifties: total50s,
          highestScore: Math.max(test.highestScore, odi.highestScore, t20.highestScore),
          wickets: totalWickets,
          bowlingAverage: bowlingAvg,
          fiveWicketHauls: total5w,
        },
        historical: {
          matches: (player.stats?.TEST?.matches || 0) + (player.stats?.ODI?.matches || 0) + (player.stats?.T20I?.matches || 0),
          runs: (player.stats?.TEST?.runs || 0) + (player.stats?.ODI?.runs || 0) + (player.stats?.T20I?.runs || 0),
          wickets: (player.stats?.TEST?.wickets || 0) + (player.stats?.ODI?.wickets || 0) + (player.stats?.T20I?.wickets || 0),
        },
        simulated: {
          matches: (player.simulatedStats?.TEST?.matches || 0) + (player.simulatedStats?.ODI?.matches || 0) + (player.simulatedStats?.T20I?.matches || 0),
          runs: (player.simulatedStats?.TEST?.runs || 0) + (player.simulatedStats?.ODI?.runs || 0) + (player.simulatedStats?.T20I?.runs || 0),
          wickets: (player.simulatedStats?.TEST?.wickets || 0) + (player.simulatedStats?.ODI?.wickets || 0) + (player.simulatedStats?.T20I?.wickets || 0),
        },
      };
    }

    const fmtStats = getCombinedFormatStats(player, tab);
    const hist = player.stats?.[tab];
    const sim = player.simulatedStats?.[tab];

    return {
      combined: fmtStats,
      historical: {
        matches: hist?.matches || 0,
        runs: hist?.runs || 0,
        wickets: hist?.wickets || 0,
        average: hist?.average || 0,
      },
      simulated: {
        matches: sim?.matches || 0,
        runs: sim?.runs || 0,
        wickets: sim?.wickets || 0,
        average: sim?.average || 0,
      },
    };
  };

  const currentStats = getStatsForTab(selectedTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs select-none">
      <div className="bg-[#111827] border border-[#1e293b] w-full max-w-4xl max-h-[92vh] rounded-lg shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header: Nation + Granular Role + Format Squad Badges */}
        <div className="bg-[#0e131d] border-b border-[#1e293b] p-4 flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-full bg-[#151d29] border border-emerald-500/50 flex items-center justify-center text-2xl shadow-inner">
              {team?.flagEmoji || '🏏'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">{player.name}</h2>
                <span className="text-[10px] bg-[#142646] text-emerald-400 font-mono px-2 py-0.5 rounded font-bold border border-emerald-900/60">
                  {granularRole.replace(/_/g, ' ')}
                </span>
                {player.isCaptain && (
                  <span className="text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded">
                    Captain
                  </span>
                )}
                {player.isWicketKeeper && (
                  <span className="text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded">
                    WK
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                <span>{player.countryName}</span>
                <span>•</span>
                <span>Age: {player.age}</span>
                <span>•</span>
                <span>Bat: {player.battingHand === 'LEFT_HAND' ? 'Left-hand bat' : 'Right-hand bat'}</span>
                <span>•</span>
                <span>Bowl: {player.bowlingStyle}</span>
              </div>

              {/* Format Squad Membership Badges */}
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[10px] text-slate-400 font-mono">Format Squad:</span>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    inTestSquad
                      ? 'bg-red-950 text-red-300 border border-red-800/60'
                      : 'bg-[#151d29] text-slate-600 border border-[#1e293b]'
                  }`}
                >
                  TEST SQUAD
                </span>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    inOdiSquad
                      ? 'bg-sky-950 text-sky-300 border border-sky-800/60'
                      : 'bg-[#151d29] text-slate-600 border border-[#1e293b]'
                  }`}
                >
                  ODI SQUAD
                </span>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    inT20Squad
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                      : 'bg-[#151d29] text-slate-600 border border-[#1e293b]'
                  }`}
                >
                  T20I SQUAD
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#151d29] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Format Skill Ratings & Vitals */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs text-center">
            <div className="bg-[#151d29] border border-[#1e293b] p-2.5 rounded">
              <span className="text-[10px] text-slate-400 uppercase block">Test Rating</span>
              <span className="text-xl font-bold text-white font-mono">{player.testRating}</span>
            </div>
            <div className="bg-[#151d29] border border-[#1e293b] p-2.5 rounded">
              <span className="text-[10px] text-slate-400 uppercase block">ODI Rating</span>
              <span className="text-xl font-bold text-white font-mono">{player.odiRating}</span>
            </div>
            <div className="bg-[#151d29] border border-[#1e293b] p-2.5 rounded">
              <span className="text-[10px] text-slate-400 uppercase block">T20I Rating</span>
              <span className="text-xl font-bold text-white font-mono">{player.t20Rating}</span>
            </div>
            <div className="bg-[#151d29] border border-[#1e293b] p-2.5 rounded">
              <span className="text-[10px] text-slate-400 uppercase block">Form</span>
              <span className="text-xl font-bold text-emerald-400 font-mono">{player.currentForm || player.attributes.currentForm}%</span>
            </div>
            <div className="bg-[#151d29] border border-[#1e293b] p-2.5 rounded">
              <span className="text-[10px] text-slate-400 uppercase block">Fitness</span>
              <span className="text-xl font-bold text-sky-400 font-mono">{player.fitness || player.attributes.fitness}%</span>
            </div>
          </div>

          {/* Physical & Mental Attributes Breakdown */}
          <div className="bg-[#151d29] border border-[#1e293b] rounded-lg p-3.5 space-y-3">
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-400" /> Physical &amp; Mental Attributes (0–100)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Batting Attributes */}
              <div className="space-y-1.5 bg-[#111827] p-2.5 rounded border border-[#1e293b]">
                <span className="font-semibold text-emerald-400 block border-b border-[#1e293b] pb-1 text-[11px]">
                  Batting Craft
                </span>
                {[
                  { label: 'Technique', val: player.attributes.technique },
                  { label: 'Defense', val: player.attributes.defense },
                  { label: 'Power Hitting', val: player.attributes.powerHitting },
                  { label: 'Against Pace', val: player.attributes.againstPace },
                  { label: 'Against Spin', val: player.attributes.againstSpin },
                ].map((attr) => (
                  <div key={attr.label} className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">{attr.label}</span>
                    <span className="font-mono font-bold text-white">{attr.val}</span>
                  </div>
                ))}
              </div>

              {/* Bowling Attributes */}
              <div className="space-y-1.5 bg-[#111827] p-2.5 rounded border border-[#1e293b]">
                <span className="font-semibold text-sky-400 block border-b border-[#1e293b] pb-1 text-[11px]">
                  Bowling Craft
                </span>
                {[
                  { label: 'Pace / Turn', val: Math.max(player.attributes.pace, player.attributes.spin) },
                  { label: 'Accuracy', val: player.attributes.accuracy },
                  { label: 'Variation', val: player.attributes.variation },
                  { label: 'Death Bowling', val: player.attributes.deathBowling },
                  { label: 'Wicket-Taking', val: player.attributes.wicketTaking },
                ].map((attr) => (
                  <div key={attr.label} className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">{attr.label}</span>
                    <span className="font-mono font-bold text-white">{attr.val}</span>
                  </div>
                ))}
              </div>

              {/* Mental & Physical */}
              <div className="space-y-1.5 bg-[#111827] p-2.5 rounded border border-[#1e293b]">
                <span className="font-semibold text-purple-400 block border-b border-[#1e293b] pb-1 text-[11px]">
                  Physical &amp; Mental
                </span>
                {[
                  { label: 'Mental Strength', val: player.attributes.mentalStrength },
                  { label: 'Discipline', val: player.attributes.stamina },
                  { label: 'Pressure Handling', val: player.attributes.leadership },
                  { label: 'Fielding', val: player.attributes.fielding },
                  { label: 'Stamina', val: player.attributes.stamina },
                ].map((attr) => (
                  <div key={attr.label} className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">{attr.label}</span>
                    <span className="font-mono font-bold text-white">{attr.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4 Statistics Tabs: Test | ODI | T20I | Overall */}
          <div className="bg-[#151d29] border border-[#1e293b] rounded-lg p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e293b] pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" /> Career Statistics Profile
              </span>

              {/* 4 Tab Selector */}
              <div className="flex bg-[#111827] p-0.5 rounded border border-[#1e293b]">
                {(['TEST', 'ODI', 'T20I', 'OVERALL'] as StatsTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                      selectedTab === tab
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab === 'OVERALL' ? 'Overall Career' : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Historical Baseline vs Simulated vs Combined Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-[#111827] p-2.5 rounded border border-[#1e293b]">
                <span className="text-[10px] text-slate-400 block uppercase">Historical Baseline</span>
                <div className="mt-1 font-mono text-[11px] text-slate-300">
                  <span>{currentStats.historical.matches} Matches</span> •{' '}
                  <span className="text-emerald-400">{currentStats.historical.runs} Runs</span> •{' '}
                  <span className="text-sky-400">{currentStats.historical.wickets} Wkts</span>
                </div>
              </div>

              <div className="bg-[#111827] p-2.5 rounded border border-[#1e293b]">
                <span className="text-[10px] text-slate-400 block uppercase">Simulated in Career</span>
                <div className="mt-1 font-mono text-[11px] text-slate-300">
                  <span>{currentStats.simulated.matches} Matches</span> •{' '}
                  <span className="text-emerald-400">{currentStats.simulated.runs} Runs</span> •{' '}
                  <span className="text-sky-400">{currentStats.simulated.wickets} Wkts</span>
                </div>
              </div>

              <div className="bg-[#111827] p-2.5 rounded border border-emerald-900/50 bg-emerald-950/20">
                <span className="text-[10px] text-emerald-400 block uppercase font-bold">Combined Total</span>
                <div className="mt-1 font-mono text-[11px] text-white font-bold">
                  <span>{currentStats.combined.matches} Matches</span> •{' '}
                  <span className="text-emerald-300">{currentStats.combined.runs} Runs</span> •{' '}
                  <span className="text-sky-300">{currentStats.combined.wickets || 0} Wkts</span>
                </div>
              </div>
            </div>

            {/* Detailed Stats Snapshot Table */}
            <div className="overflow-x-auto pt-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#111827] text-slate-400 font-mono text-[10px] uppercase border-b border-[#1e293b]">
                  <tr>
                    <th className="py-2 px-2.5">Category</th>
                    <th className="py-2 px-2 text-center">Innings</th>
                    <th className="py-2 px-2 text-center">Runs</th>
                    <th className="py-2 px-2 text-center">Avg</th>
                    <th className="py-2 px-2 text-center">100s / 50s</th>
                    <th className="py-2 px-2 text-center">Wickets</th>
                    <th className="py-2 px-2 text-center">Bowl Avg</th>
                    <th className="py-2 px-2 text-center">5w Hauls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]/60 font-mono">
                  <tr>
                    <td className="py-2 px-2.5 text-white font-semibold font-sans">
                      {selectedTab === 'OVERALL' ? 'All Formats Combined' : `${selectedTab} Record`}
                    </td>
                    <td className="py-2 px-2 text-center text-slate-300">{currentStats.combined.innings}</td>
                    <td className="py-2 px-2 text-center font-bold text-white">{currentStats.combined.runs}</td>
                    <td className="py-2 px-2 text-center text-emerald-400 font-bold">
                      {(currentStats.combined.average || 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-center text-slate-300">
                      {currentStats.combined.centuries} / {currentStats.combined.fifties}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-white">
                      {currentStats.combined.wickets || 0}
                    </td>
                    <td className="py-2 px-2 text-center text-sky-400 font-bold">
                      {currentStats.combined.bowlingAverage ? currentStats.combined.bowlingAverage.toFixed(2) : '-'}
                    </td>
                    <td className="py-2 px-2 text-center text-slate-300">
                      {currentStats.combined.fiveWicketHauls || 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
