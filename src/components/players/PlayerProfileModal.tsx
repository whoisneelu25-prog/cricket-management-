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
import { PlayerAvatar } from '../common/PlayerAvatar';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm select-none">
      <div className="bg-[#070a0e] border border-[#1e2733] w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#e8edf2]">
        {/* Header: Dugout dark banner with stadium wash */}
        <div className="relative bg-gradient-to-r from-[#10151c] to-[#070a0e] border-b border-[#1e2733] p-5 flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <PlayerAvatar player={player} size="lg" showFlag={true} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                  {player.name}
                </h2>
                <span className="text-[10px] bg-[#e2b64a]/10 text-[#e2b64a] font-mono px-2 py-0.5 rounded font-bold border border-[#e2b64a]/30 uppercase tracking-wider">
                  {granularRole.replace(/_/g, ' ')}
                </span>
                {player.isCaptain && (
                  <span className="text-[10px] font-bold bg-[#e2b64a] text-black px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">
                    Captain
                  </span>
                )}
                {player.isWicketKeeper && (
                  <span className="text-[10px] font-bold bg-[#8fb2d9]/20 text-[#8fb2d9] border border-[#8fb2d9]/40 px-2 py-0.5 rounded uppercase tracking-wider">
                    WK
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[#8b97a3]">
                <span className="font-semibold text-[#c3ccd6]">{player.countryName}</span>
                <span>•</span>
                <span>Age: <strong className="text-white">{player.age}</strong></span>
                <span>•</span>
                <span>Bat: <span className="text-white">{player.battingHand === 'LEFT_HAND' ? 'Left-hand' : 'Right-hand'}</span></span>
                <span>•</span>
                <span>Bowl: <span className="text-white">{player.bowlingStyle}</span></span>
              </div>

              {/* Format Squad Membership Badges */}
              <div className="flex items-center gap-1.5 mt-2.5">
                <span className="text-[10px] text-[#8b97a3] uppercase font-mono tracking-wider">Format Squads:</span>
                <span
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                    inTestSquad
                      ? 'bg-[#ff3d7f]/20 text-[#ff5470] border border-[#ff3d7f]/40'
                      : 'bg-[#10151c] text-[#556375] border border-[#1e2733]'
                  }`}
                >
                  TEST
                </span>
                <span
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                    inOdiSquad
                      ? 'bg-[#8fb2d9]/20 text-[#8fb2d9] border border-[#8fb2d9]/40'
                      : 'bg-[#10151c] text-[#556375] border border-[#1e2733]'
                  }`}
                >
                  ODI
                </span>
                <span
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                    inT20Squad
                      ? 'bg-[#3fca86]/20 text-[#3fca86] border border-[#3fca86]/40'
                      : 'bg-[#10151c] text-[#556375] border border-[#1e2733]'
                  }`}
                >
                  T20I
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[#8b97a3] hover:text-white p-2 rounded-lg hover:bg-[#10151c] border border-transparent hover:border-[#1e2733] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Format Skill Ratings & Vitals in Dugout Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="bg-[#10151c] border border-[#1e2733] p-3 rounded-xl shadow-xs">
              <span className="dugout-kicker text-[10px] text-[#8b97a3] block mb-1">Test Rating</span>
              <span className="text-2xl font-black text-white font-mono tracking-tight">{player.testRating}</span>
            </div>
            <div className="bg-[#10151c] border border-[#1e2733] p-3 rounded-xl shadow-xs">
              <span className="dugout-kicker text-[10px] text-[#8b97a3] block mb-1">ODI Rating</span>
              <span className="text-2xl font-black text-[#8fb2d9] font-mono tracking-tight">{player.odiRating}</span>
            </div>
            <div className="bg-[#10151c] border border-[#1e2733] p-3 rounded-xl shadow-xs">
              <span className="dugout-kicker text-[10px] text-[#8b97a3] block mb-1">T20I Rating</span>
              <span className="text-2xl font-black text-[#e2b64a] font-mono tracking-tight">{player.t20Rating}</span>
            </div>
            <div className="bg-[#10151c] border border-[#1e2733] p-3 rounded-xl shadow-xs">
              <span className="dugout-kicker text-[10px] text-[#8b97a3] block mb-1">Current Form</span>
              <span className="text-2xl font-black text-[#3fca86] font-mono tracking-tight">
                {player.currentForm || player.attributes.currentForm}%
              </span>
            </div>
            <div className="bg-[#10151c] border border-[#1e2733] p-3 rounded-xl shadow-xs col-span-2 sm:col-span-1">
              <span className="dugout-kicker text-[10px] text-[#8b97a3] block mb-1">Match Fitness</span>
              <span className="text-2xl font-black text-[#8fb2d9] font-mono tracking-tight">
                {player.fitness || player.attributes.fitness}%
              </span>
            </div>
          </div>

          {/* Physical & Mental Attributes Breakdown */}
          <div className="bg-[#10151c] border border-[#1e2733] rounded-xl p-4 space-y-4">
            <h3 className="dugout-kicker text-xs text-[#e2b64a] flex items-center gap-2">
              <Target className="w-3.5 h-3.5" /> Technical &amp; Mental Attributes (0–100)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Batting Attributes */}
              <div className="space-y-2 bg-[#070a0e] p-3 rounded-lg border border-[#1e2733]">
                <span className="font-bold text-[#e2b64a] block border-b border-[#1e2733] pb-1.5 uppercase tracking-wider text-[11px]">
                  Batting Craft
                </span>
                {[
                  { label: 'Technique', val: player.attributes.technique },
                  { label: 'Defense', val: player.attributes.defense },
                  { label: 'Power Hitting', val: player.attributes.powerHitting },
                  { label: 'Against Pace', val: player.attributes.againstPace },
                  { label: 'Against Spin', val: player.attributes.againstSpin },
                ].map((attr) => (
                  <div key={attr.label} className="flex items-center justify-between py-0.5">
                    <span className="text-[#8b97a3] text-[11px]">{attr.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#1e2733] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#e2b64a] to-[#ffe9a8] rounded-full"
                          style={{ width: `${Math.min(100, attr.val)}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-white w-6 text-right">{attr.val}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bowling Attributes */}
              <div className="space-y-2 bg-[#070a0e] p-3 rounded-lg border border-[#1e2733]">
                <span className="font-bold text-[#8fb2d9] block border-b border-[#1e2733] pb-1.5 uppercase tracking-wider text-[11px]">
                  Bowling Craft
                </span>
                {[
                  { label: 'Pace / Turn', val: Math.max(player.attributes.pace, player.attributes.spin) },
                  { label: 'Accuracy', val: player.attributes.accuracy },
                  { label: 'Variation', val: player.attributes.variation },
                  { label: 'Death Bowling', val: player.attributes.deathBowling },
                  { label: 'Wicket-Taking', val: player.attributes.wicketTaking },
                ].map((attr) => (
                  <div key={attr.label} className="flex items-center justify-between py-0.5">
                    <span className="text-[#8b97a3] text-[11px]">{attr.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#1e2733] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#8fb2d9] to-[#3fca86] rounded-full"
                          style={{ width: `${Math.min(100, attr.val)}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-white w-6 text-right">{attr.val}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mental & Physical */}
              <div className="space-y-2 bg-[#070a0e] p-3 rounded-lg border border-[#1e2733]">
                <span className="font-bold text-[#3fca86] block border-b border-[#1e2733] pb-1.5 uppercase tracking-wider text-[11px]">
                  Physical &amp; Mental
                </span>
                {[
                  { label: 'Mental Strength', val: player.attributes.mentalStrength },
                  { label: 'Discipline', val: player.attributes.stamina },
                  { label: 'Pressure Handling', val: player.attributes.leadership },
                  { label: 'Fielding', val: player.attributes.fielding },
                  { label: 'Stamina', val: player.attributes.stamina },
                ].map((attr) => (
                  <div key={attr.label} className="flex items-center justify-between py-0.5">
                    <span className="text-[#8b97a3] text-[11px]">{attr.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#1e2733] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#3fca86] to-[#e2b64a] rounded-full"
                          style={{ width: `${Math.min(100, attr.val)}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-white w-6 text-right">{attr.val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4 Statistics Tabs: Test | ODI | T20I | Overall */}
          <div className="bg-[#10151c] border border-[#1e2733] rounded-xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e2733] pb-3">
              <span className="dugout-kicker text-xs text-[#e2b64a] flex items-center gap-2">
                <Award className="w-3.5 h-3.5" /> Career Statistics Profile
              </span>

              {/* 4 Tab Selector */}
              <div className="flex bg-[#070a0e] p-1 rounded-lg border border-[#1e2733]">
                {(['TEST', 'ODI', 'T20I', 'OVERALL'] as StatsTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer uppercase tracking-wider ${
                      selectedTab === tab
                        ? 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black shadow-sm'
                        : 'text-[#8b97a3] hover:text-white'
                    }`}
                  >
                    {tab === 'OVERALL' ? 'Overall' : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Historical Baseline vs Simulated vs Combined Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#070a0e] p-3 rounded-lg border border-[#1e2733]">
                <span className="dugout-kicker text-[10px] text-[#8b97a3] block mb-1">Historical Baseline</span>
                <div className="mt-1 font-mono text-[11px] text-[#c3ccd6]">
                  <span>{currentStats.historical.matches} Matches</span> •{' '}
                  <span className="text-[#3fca86] font-bold">{currentStats.historical.runs} Runs</span> •{' '}
                  <span className="text-[#8fb2d9] font-bold">{currentStats.historical.wickets} Wkts</span>
                </div>
              </div>

              <div className="bg-[#070a0e] p-3 rounded-lg border border-[#1e2733]">
                <span className="dugout-kicker text-[10px] text-[#8b97a3] block mb-1">Career Simulation</span>
                <div className="mt-1 font-mono text-[11px] text-[#c3ccd6]">
                  <span>{currentStats.simulated.matches} Matches</span> •{' '}
                  <span className="text-[#3fca86] font-bold">{currentStats.simulated.runs} Runs</span> •{' '}
                  <span className="text-[#8fb2d9] font-bold">{currentStats.simulated.wickets} Wkts</span>
                </div>
              </div>

              <div className="bg-[#070a0e] p-3 rounded-lg border border-[#e2b64a]/30 bg-[#e2b64a]/5">
                <span className="dugout-kicker text-[10px] text-[#e2b64a] block mb-1 font-bold">Combined Career Total</span>
                <div className="mt-1 font-mono text-[11px] text-white font-bold">
                  <span>{currentStats.combined.matches} Matches</span> •{' '}
                  <span className="text-[#ffe9a8] font-bold">{currentStats.combined.runs} Runs</span> •{' '}
                  <span className="text-[#8fb2d9] font-bold">{currentStats.combined.wickets || 0} Wkts</span>
                </div>
              </div>
            </div>

            {/* Detailed Stats Snapshot Table */}
            <div className="overflow-x-auto pt-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#070a0e] text-[#8b97a3] font-mono text-[10px] uppercase border-b border-[#1e2733]">
                  <tr>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-2 text-center">Innings</th>
                    <th className="py-2.5 px-2 text-center">Runs</th>
                    <th className="py-2.5 px-2 text-center">Avg</th>
                    <th className="py-2.5 px-2 text-center">100s / 50s</th>
                    <th className="py-2.5 px-2 text-center">Wickets</th>
                    <th className="py-2.5 px-2 text-center">Bowl Avg</th>
                    <th className="py-2.5 px-2 text-center">5w Hauls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2733] font-mono">
                  <tr>
                    <td className="py-3 px-3 text-white font-bold font-sans">
                      {selectedTab === 'OVERALL' ? 'All Formats Combined' : `${selectedTab} Record`}
                    </td>
                    <td className="py-3 px-2 text-center text-[#c3ccd6]">{currentStats.combined.innings}</td>
                    <td className="py-3 px-2 text-center font-bold text-white">{currentStats.combined.runs}</td>
                    <td className="py-3 px-2 text-center text-[#3fca86] font-bold">
                      {(currentStats.combined.average || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-center text-[#c3ccd6]">
                      {currentStats.combined.centuries} / {currentStats.combined.fifties}
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-white">
                      {currentStats.combined.wickets || 0}
                    </td>
                    <td className="py-3 px-2 text-center text-[#8fb2d9] font-bold">
                      {currentStats.combined.bowlingAverage ? currentStats.combined.bowlingAverage.toFixed(2) : '-'}
                    </td>
                    <td className="py-3 px-2 text-center text-[#c3ccd6]">
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
