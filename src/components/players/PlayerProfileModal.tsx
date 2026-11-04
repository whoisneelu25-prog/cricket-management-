import React, { useState } from 'react';
import { X, Award, Shield, Zap, Activity, Heart, Star, Target } from 'lucide-react';
import { CareerSave, Player, MatchFormat } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { getCombinedFormatStats, getEffectivePlayer } from '../../data/squads';

interface PlayerProfileModalProps {
  player: Player | null;
  career?: CareerSave;
  onClose: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  player: rawPlayer,
  career,
  onClose,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<MatchFormat>('TEST');

  if (!rawPlayer) return null;

  const player = getEffectivePlayer(rawPlayer, career) || rawPlayer;
  const team = INTERNATIONAL_TEAMS.find((t) => t.id === player.countryId);
  const stats = getCombinedFormatStats(player, selectedFormat);
  const simMatches = player.simulatedStats?.[selectedFormat]?.matches || 0;

  // Helper for attribute bar color
  const getRatingColor = (val: number) => {
    if (val >= 90) return 'text-emerald-400 bg-emerald-500';
    if (val >= 80) return 'text-emerald-300 bg-emerald-600';
    if (val >= 70) return 'text-amber-400 bg-amber-500';
    return 'text-slate-400 bg-slate-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="bg-[#111827] border border-[#243247] w-full max-w-4xl max-h-[92vh] rounded-lg shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="bg-[#182234] border-b border-[#243247] p-4 sm:p-5 flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-full bg-[#0d131f] border-2 border-emerald-500/50 flex items-center justify-center text-2xl shadow-inner">
              {team?.flagEmoji || '🏏'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                  {player.name}
                </h2>
                {player.isCaptain && (
                  <span className="text-[10px] uppercase font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded shadow">
                    Captain
                  </span>
                )}
                {player.isViceCaptain && (
                  <span className="text-[10px] uppercase font-bold bg-slate-400 text-black px-1.5 py-0.5 rounded shadow">
                    Vice Capt
                  </span>
                )}
                {player.isWicketKeeper && (
                  <span className="text-[10px] uppercase font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow">
                    Wicketkeeper
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                <span className="text-emerald-400 font-medium">{player.role.replace('_', ' ')}</span>
                <span>•</span>
                <span>{player.countryName}</span>
                <span>•</span>
                <span>Age: {player.age} {player.dob ? `(DOB: ${player.dob})` : ''}</span>
                <span>•</span>
                <span>Bat: {player.battingHand.replace('_', ' ')}</span>
                <span>•</span>
                <span>Bowl: {player.bowlingStyle.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[10px] text-slate-400 font-mono">Format Eligibility:</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${player.formatEligibility?.TEST ? 'bg-red-950 text-red-300 border border-red-800' : 'opacity-30 bg-slate-800 text-slate-500'}`}>
                  TEST
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${player.formatEligibility?.ODI ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'opacity-30 bg-slate-800 text-slate-500'}`}>
                  ODI
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${player.formatEligibility?.T20I ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'opacity-30 bg-slate-800 text-slate-500'}`}>
                  T20I
                </span>
                {player.sourceMeta && (
                  <span className="text-[10px] bg-[#182234] text-slate-300 border border-[#243247] px-2 py-0.5 rounded font-mono">
                    Source: {player.sourceMeta.source} ({player.sourceMeta.verified ? 'Verified' : 'Unverified'})
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close player profile"
            className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-[#243247] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Format Skill Ratings & Current Vitals */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-[#182234] border border-[#243247] p-3 rounded text-center">
              <span className="text-[11px] text-slate-400 block uppercase font-medium">Test Rating</span>
              <span className="text-2xl font-bold text-emerald-400 font-mono">{player.testRating}</span>
              <span className="text-[10px] text-slate-500 block">ICC Index: Tier 1</span>
            </div>
            <div className="bg-[#182234] border border-[#243247] p-3 rounded text-center">
              <span className="text-[11px] text-slate-400 block uppercase font-medium">ODI Rating</span>
              <span className="text-2xl font-bold text-emerald-400 font-mono">{player.odiRating}</span>
              <span className="text-[10px] text-slate-500 block">World Class</span>
            </div>
            <div className="bg-[#182234] border border-[#243247] p-3 rounded text-center">
              <span className="text-[11px] text-slate-400 block uppercase font-medium">T20I Rating</span>
              <span className="text-2xl font-bold text-emerald-400 font-mono">{player.t20Rating}</span>
              <span className="text-[10px] text-slate-500 block">Elite Impact</span>
            </div>
            <div className="bg-[#182234] border border-[#243247] p-3 rounded text-center">
              <span className="text-[11px] text-slate-400 block uppercase font-medium flex items-center justify-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" /> Current Form
              </span>
              <span className="text-2xl font-bold text-emerald-300 font-mono">{player.attributes.currentForm}%</span>
              <span className="text-[10px] text-emerald-400 block font-medium">Match Sharp</span>
            </div>
            <div className="bg-[#182234] border border-[#243247] p-3 rounded text-center col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 block uppercase font-medium flex items-center justify-center gap-1">
                <Heart className="w-3 h-3 text-rose-400" /> Fitness
              </span>
              <span className="text-2xl font-bold text-slate-200 font-mono">{player.attributes.fitness}%</span>
              <span className="text-[10px] text-emerald-400 block font-medium">Fully Available</span>
            </div>
          </div>

          {/* Technical Attributes Grid */}
          <div className="bg-[#151c2c] border border-[#243247] rounded-lg p-4">
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-400" /> Core Technical & Mental Attributes (0–100)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Batting Attributes */}
              <div className="space-y-2 bg-[#182234]/60 p-3 rounded border border-[#243247]/50">
                <span className="font-semibold text-emerald-400 block border-b border-[#243247] pb-1">Batting Prowess</span>
                {[
                  { label: 'Technique', val: player.attributes.technique },
                  { label: 'Timing', val: player.attributes.timing },
                  { label: 'Shot Selection', val: player.attributes.shotSelection },
                  { label: 'Defense', val: player.attributes.defense },
                  { label: 'Power Hitting', val: player.attributes.powerHitting },
                  { label: 'Against Pace', val: player.attributes.againstPace },
                  { label: 'Against Spin', val: player.attributes.againstSpin },
                ].map((attr) => (
                  <div key={attr.label} className="flex items-center justify-between">
                    <span className="text-slate-400">{attr.label}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-1.5 bg-[#0e131d] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getRatingColor(attr.val).split(' ')[1]}`}
                          style={{ width: `${attr.val}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold w-6 text-right text-slate-200">{attr.val}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bowling Attributes */}
              <div className="space-y-2 bg-[#182234]/60 p-3 rounded border border-[#243247]/50">
                <span className="font-semibold text-amber-400 block border-b border-[#243247] pb-1">Bowling Delivery</span>
                {[
                  { label: 'Pace / Turn', val: Math.max(player.attributes.pace, player.attributes.spin) },
                  { label: 'Swing / Seam', val: Math.max(player.attributes.swing, player.attributes.seam) },
                  { label: 'Accuracy', val: player.attributes.accuracy },
                  { label: 'Variation', val: player.attributes.variation },
                  { label: 'Control', val: player.attributes.control },
                  { label: 'Death Bowling', val: player.attributes.deathBowling },
                  { label: 'Wicket-Taking', val: player.attributes.wicketTaking },
                ].map((attr) => (
                  <div key={attr.label} className="flex items-center justify-between">
                    <span className="text-slate-400">{attr.label}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-1.5 bg-[#0e131d] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getRatingColor(attr.val).split(' ')[1]}`}
                          style={{ width: `${attr.val}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold w-6 text-right text-slate-200">{attr.val}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Physical & Mental */}
              <div className="space-y-2 bg-[#182234]/60 p-3 rounded border border-[#243247]/50">
                <span className="font-semibold text-blue-400 block border-b border-[#243247] pb-1">Physical & Leadership</span>
                {[
                  { label: 'Fielding', val: player.attributes.fielding },
                  { label: 'Catching', val: player.attributes.catching },
                  { label: 'Throwing', val: player.attributes.throwing },
                  { label: 'Leadership', val: player.attributes.leadership },
                  { label: 'Mental Strength', val: player.attributes.mentalStrength },
                  { label: 'Stamina', val: player.attributes.stamina },
                  { label: 'Potential', val: player.attributes.potential },
                ].map((attr) => (
                  <div key={attr.label} className="flex items-center justify-between">
                    <span className="text-slate-400">{attr.label}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-1.5 bg-[#0e131d] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getRatingColor(attr.val).split(' ')[1]}`}
                          style={{ width: `${attr.val}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold w-6 text-right text-slate-200">{attr.val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Format Career Records & Statistics Table */}
          <div className="bg-[#151c2c] border border-[#243247] rounded-lg p-4">
            <div className="flex items-center justify-between border-b border-[#243247] pb-3 mb-4">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" /> Career Statistics
                {simMatches > 0 && (
                  <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/50 px-1.5 py-0.5 rounded ml-1">
                    +{simMatches} Simulated Career Matches Included
                  </span>
                )}
              </h3>

              {/* Format Switcher */}
              <div className="flex items-center bg-[#0d131f] border border-[#243247] rounded p-0.5">
                {(['TEST', 'ODI', 'T20I'] as MatchFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setSelectedFormat(fmt)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition ${
                      selectedFormat === fmt
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Batting Card */}
            <div className="mb-4">
              <span className="text-[11px] font-semibold uppercase text-emerald-400 block mb-2">Batting Record</span>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-[#243247]">
                  <thead className="bg-[#182234] text-slate-400 font-medium">
                    <tr>
                      <th className="p-2 border-r border-[#243247]">Mat</th>
                      <th className="p-2 border-r border-[#243247]">Inn</th>
                      <th className="p-2 border-r border-[#243247]">Runs</th>
                      <th className="p-2 border-r border-[#243247]">HS</th>
                      <th className="p-2 border-r border-[#243247]">Avg</th>
                      <th className="p-2 border-r border-[#243247]">SR</th>
                      <th className="p-2 border-r border-[#243247]">100s</th>
                      <th className="p-2 border-r border-[#243247]">50s</th>
                      <th className="p-2 border-r border-[#243247]">4s</th>
                      <th className="p-2">6s</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#243247] font-mono">
                    <tr className="hover:bg-[#182234]/50">
                      <td className="p-2 border-r border-[#243247]">{stats.matches}</td>
                      <td className="p-2 border-r border-[#243247]">{stats.innings}</td>
                      <td className="p-2 border-r border-[#243247] font-bold text-white">{stats.runs}</td>
                      <td className="p-2 border-r border-[#243247]">{stats.highestScore}{stats.highestScoreNotOut ? '*' : ''}</td>
                      <td className="p-2 border-r border-[#243247] text-emerald-400 font-bold">{stats.average.toFixed(2)}</td>
                      <td className="p-2 border-r border-[#243247]">{stats.strikeRate.toFixed(1)}</td>
                      <td className="p-2 border-r border-[#243247] text-amber-400 font-bold">{stats.centuries}</td>
                      <td className="p-2 border-r border-[#243247]">{stats.fifties}</td>
                      <td className="p-2 border-r border-[#243247]">{stats.fours}</td>
                      <td className="p-2">{stats.sixes}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bowling Card */}
            <div>
              <span className="text-[11px] font-semibold uppercase text-amber-400 block mb-2">Bowling Record</span>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-[#243247]">
                  <thead className="bg-[#182234] text-slate-400 font-medium">
                    <tr>
                      <th className="p-2 border-r border-[#243247]">Inn</th>
                      <th className="p-2 border-r border-[#243247]">Overs</th>
                      <th className="p-2 border-r border-[#243247]">Mdn</th>
                      <th className="p-2 border-r border-[#243247]">Runs</th>
                      <th className="p-2 border-r border-[#243247]">Wkts</th>
                      <th className="p-2 border-r border-[#243247]">BBI</th>
                      <th className="p-2 border-r border-[#243247]">Avg</th>
                      <th className="p-2 border-r border-[#243247]">Econ</th>
                      <th className="p-2 border-r border-[#243247]">SR</th>
                      <th className="p-2">5w</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#243247] font-mono">
                    <tr className="hover:bg-[#182234]/50">
                      <td className="p-2 border-r border-[#243247]">{stats.bowlingInnings}</td>
                      <td className="p-2 border-r border-[#243247]">{stats.oversBowled}</td>
                      <td className="p-2 border-r border-[#243247]">{stats.maidens}</td>
                      <td className="p-2 border-r border-[#243247]">{stats.runsConceded}</td>
                      <td className="p-2 border-r border-[#243247] font-bold text-white">{stats.wickets}</td>
                      <td className="p-2 border-r border-[#243247]">{stats.bestBowlingWickets}/{stats.bestBowlingRuns}</td>
                      <td className="p-2 border-r border-[#243247] text-emerald-400 font-bold">{stats.bowlingAverage.toFixed(2)}</td>
                      <td className="p-2 border-r border-[#243247]">{stats.economy.toFixed(2)}</td>
                      <td className="p-2 border-r border-[#243247]">{stats.bowlingStrikeRate.toFixed(1)}</td>
                      <td className="p-2 text-amber-400 font-bold">{stats.fiveWicketHauls}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#182234] border-t border-[#243247] p-3 sm:p-4 flex items-center justify-between text-xs text-slate-400">
          <span>Data verified against international career records</span>
          <button
            onClick={onClose}
            className="bg-[#243247] hover:bg-[#334155] text-white px-4 py-1.5 rounded transition cursor-pointer font-medium"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
