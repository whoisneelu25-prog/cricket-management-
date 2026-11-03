import React, { useState } from 'react';
import {
  TrendingUp,
  Dumbbell,
  HeartPulse,
  AlertTriangle,
  Award,
  ChevronRight,
  Shield,
  Zap,
  Activity,
  History,
  Info,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { CareerSave, Player } from '../../types/cricket';
import { ALL_PLAYERS, getPlayersByCountry } from '../../data/squads';
import {
  TrainingFocus,
  calculateOverallAbility,
  processSquadTrainingDay,
  getDefaultTrainingFocus,
} from '../../engine/playerDevelopmentEngine';

interface PlayerDevelopmentViewProps {
  career: CareerSave;
  onUpdateTrainingFocus?: (playerId: string, focus: TrainingFocus) => void;
  onSelectPlayer?: (player: Player) => void;
  onRestSquadDay?: () => void;
  onCareerUpdated?: (updatedCareer: CareerSave) => void;
}

export const PlayerDevelopmentView: React.FC<PlayerDevelopmentViewProps> = ({
  career,
  onUpdateTrainingFocus,
  onSelectPlayer,
  onRestSquadDay,
  onCareerUpdated,
}) => {
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'BATTER' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKETKEEPER_BATTER'>('ALL');
  const [selectedPlayerForHistory, setSelectedPlayerForHistory] = useState<Player | null>(null);
  const [trainingFlashMessage, setTrainingFlashMessage] = useState<string | null>(null);

  // Retrieve national players and merge with career.playerOverrides
  const basePlayers = getPlayersByCountry(career.selectedTeamId);
  const players: Player[] = basePlayers.map((p) => {
    const override = career.playerOverrides?.[p.id];
    const trainingFocus = (career.playerTrainingFocus?.[p.id] as TrainingFocus) || p.trainingFocus || getDefaultTrainingFocus(p);
    if (!override) {
      return {
        ...p,
        trainingFocus,
        potential: p.potential || Math.min(96, calculateOverallAbility(p) + (p.age <= 23 ? 12 : p.age <= 28 ? 6 : 2)),
        fitness: p.fitness ?? p.attributes.fitness ?? 85,
        currentForm: p.currentForm ?? p.attributes.currentForm ?? 80,
        workloadFatigue: p.workloadFatigue ?? 15,
      };
    }
    return {
      ...p,
      ...override,
      trainingFocus,
      attributes: { ...p.attributes, ...(override.attributes || {}) },
      potential: override.potential || p.potential || 85,
      fitness: override.fitness ?? override.attributes?.fitness ?? p.fitness ?? 85,
      currentForm: override.currentForm ?? override.attributes?.currentForm ?? p.currentForm ?? 80,
      workloadFatigue: override.workloadFatigue ?? p.workloadFatigue ?? 15,
    };
  });

  const filteredPlayers = players.filter((p) => roleFilter === 'ALL' || p.role === roleFilter);

  // Handle local focus change
  const handleFocusChange = (playerId: string, focus: TrainingFocus) => {
    if (onUpdateTrainingFocus) {
      onUpdateTrainingFocus(playerId, focus);
    }
  };

  // Run focused training drills immediately
  const handleRunTrainingSession = () => {
    const assignments: Record<string, TrainingFocus> = {};
    players.forEach((p) => {
      assignments[p.id] = p.trainingFocus || 'AUTO';
    });

    const result = processSquadTrainingDay(players, assignments, false, career.currentDate);

    // Update career state with changes
    const updatedOverrides = { ...(career.playerOverrides || {}) };
    result.updatedPlayers.forEach((up) => {
      updatedOverrides[up.id] = {
        attributes: up.attributes,
        potential: up.potential,
        fitness: up.fitness,
        currentForm: up.currentForm,
        workloadFatigue: up.workloadFatigue,
        isInjured: up.isInjured,
        injuryType: up.injuryType,
        injuryDaysRemaining: up.injuryDaysRemaining,
        injurySeverity: up.injurySeverity,
        developmentFeedback: up.developmentFeedback,
        developmentHistory: up.developmentHistory,
        testRating: up.testRating,
        odiRating: up.odiRating,
        t20Rating: up.t20Rating,
      };
    });

    const updatedCareer: CareerSave = {
      ...career,
      playerOverrides: updatedOverrides,
    };

    if (onCareerUpdated) {
      onCareerUpdated(updatedCareer);
    }

    setTrainingFlashMessage(
      `Training session complete! ${result.changes.length} attribute improvements recorded across squad.`
    );
    setTimeout(() => setTrainingFlashMessage(null), 5000);
  };

  return (
    <div className="space-y-4 select-none animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Player Development & High Performance Centre
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor squad potential vs current ability, configure daily training regimes, and manage workload fatigue to prevent injuries.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onRestSquadDay && (
            <button
              onClick={onRestSquadDay}
              className="bg-[#182234] hover:bg-[#202d42] text-slate-200 border border-[#243247] text-xs font-bold px-3 py-2 rounded transition cursor-pointer flex items-center space-x-1.5"
            >
              <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
              <span>Squad Recovery Rest Day</span>
            </button>
          )}

          <button
            onClick={handleRunTrainingSession}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded transition cursor-pointer flex items-center space-x-1.5 shadow"
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Run Squad Training Drills</span>
          </button>
        </div>
      </div>

      {trainingFlashMessage && (
        <div className="bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between animate-in fade-in">
          <span>{trainingFlashMessage}</span>
          <button onClick={() => setTrainingFlashMessage(null)} className="text-emerald-400 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Role Filters */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(['ALL', 'BATTER', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER_BATTER'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              roleFilter === r
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-[#121824] text-slate-400 hover:text-white border border-[#1f293d]'
            }`}
          >
            {r === 'ALL' ? 'All Squad' : r.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Squad Development Table */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#182234] text-slate-400 text-[11px] uppercase font-mono border-b border-[#1f293d]">
              <tr>
                <th className="p-3">Player</th>
                <th className="p-3 text-center">Role / Age</th>
                <th className="p-3 text-center">Current Ability</th>
                <th className="p-3 text-center">Potential</th>
                <th className="p-3 text-center">Form</th>
                <th className="p-3 text-center">Workload Fatigue</th>
                <th className="p-3 text-center">Injury Status</th>
                <th className="p-3 text-center">Training Focus</th>
                <th className="p-3 text-center">Development Feedback</th>
                <th className="p-3 text-right">Drill Log</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f293d]">
              {filteredPlayers.map((p) => {
                const currentAbility = calculateOverallAbility(p);
                const potential = p.potential || currentAbility;
                const fatigue = p.workloadFatigue || 15;
                const isInjured = p.isInjured;
                const feedback = p.developmentFeedback || 'Developing steadily';

                return (
                  <tr key={p.id} className="hover:bg-[#182234]/50 transition">
                    {/* Player Name */}
                    <td className="p-3">
                      <div
                        onClick={() => onSelectPlayer && onSelectPlayer(p)}
                        className="cursor-pointer group flex items-center space-x-2"
                      >
                        <span className="font-bold text-white group-hover:text-emerald-400 transition">
                          {p.shortName}
                        </span>
                        {p.isCaptain && (
                          <span className="text-[9px] bg-emerald-950 text-emerald-400 px-1 rounded border border-emerald-800/40">
                            C
                          </span>
                        )}
                        {(p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER') && (
                          <span className="text-[9px] bg-amber-950 text-amber-400 px-1 rounded border border-amber-800/40">
                            WK
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{p.name}</span>
                    </td>

                    {/* Role & Age */}
                    <td className="p-3 text-center">
                      <span className="text-slate-300 font-mono">{p.role.replace('_', ' ')}</span>
                      <span className="text-[10px] text-slate-500 block font-mono">Age {p.age}</span>
                    </td>

                    {/* Current Ability */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <span className="text-sm font-black text-white font-mono">{currentAbility}</span>
                        <div className="w-12 bg-[#0b0f17] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, currentAbility)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Potential */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <span className="text-sm font-black text-amber-400 font-mono">{potential}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {potential > currentAbility ? `(+${potential - currentAbility})` : '(Peak)'}
                        </span>
                      </div>
                    </td>

                    {/* Form */}
                    <td className="p-3 text-center">
                      <span className="font-mono font-bold text-slate-200">{p.currentForm || 80}/100</span>
                    </td>

                    {/* Workload Fatigue Meter */}
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center">
                        <span
                          className={`font-mono font-bold text-xs ${
                            fatigue >= 75
                              ? 'text-rose-400'
                              : fatigue >= 50
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {fatigue}%
                        </span>
                        <div className="w-16 bg-[#0b0f17] h-1.5 rounded-full overflow-hidden mt-0.5">
                          <div
                            className={`h-full rounded-full ${
                              fatigue >= 75
                                ? 'bg-rose-500'
                                : fatigue >= 50
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, fatigue)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Injury Status */}
                    <td className="p-3 text-center">
                      {isInjured ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/40 px-2 py-0.5 rounded flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            <span>{p.injuryType || 'Injured'}</span>
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                            {p.injuryDaysRemaining || 7} days remaining
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-2 py-0.5 rounded">
                          Healthy
                        </span>
                      )}
                    </td>

                    {/* Training Focus Selector */}
                    <td className="p-3 text-center">
                      <select
                        value={p.trainingFocus || 'AUTO'}
                        onChange={(e) => handleFocusChange(p.id, e.target.value as TrainingFocus)}
                        className="bg-[#182234] border border-[#243247] text-slate-200 text-xs font-semibold rounded px-2 py-1 outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="AUTO">Auto (Role)</option>
                        <option value="BATTING">Batting</option>
                        <option value="BOWLING">Bowling</option>
                        <option value="FIELDING">Fielding</option>
                        <option value="FITNESS">Fitness</option>
                      </select>
                    </td>

                    {/* Head Coach Feedback */}
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          feedback === 'Improving'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800/50'
                            : feedback === 'At peak performance'
                            ? 'bg-amber-950 text-amber-300 border-amber-800/50'
                            : feedback === 'Declining'
                            ? 'bg-rose-950 text-rose-300 border-rose-800/50'
                            : 'bg-[#182234] text-slate-300 border-[#243247]'
                        }`}
                      >
                        {feedback}
                      </span>
                    </td>

                    {/* Drill Log Modal Trigger */}
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedPlayerForHistory(p)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-bold transition cursor-pointer flex items-center justify-end space-x-1"
                      >
                        <History className="w-3 h-3" />
                        <span>Log ({p.developmentHistory?.length || 0})</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill Progression History Dialog Modal */}
      {selectedPlayerForHistory && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121824] border border-[#1f293d] rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-400" />
                  Development History: {selectedPlayerForHistory.name}
                </h3>
                <span className="text-xs text-slate-400">
                  Focus: {selectedPlayerForHistory.trainingFocus || 'AUTO'} • Age: {selectedPlayerForHistory.age}
                </span>
              </div>
              <button
                onClick={() => setSelectedPlayerForHistory(null)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {selectedPlayerForHistory.developmentHistory && selectedPlayerForHistory.developmentHistory.length > 0 ? (
                selectedPlayerForHistory.developmentHistory.map((item, idx) => (
                  <div key={idx} className="bg-[#182234] border border-[#243247] p-2.5 rounded text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                      <span>{item.date}</span>
                      <span className="text-emerald-400 font-bold">
                        {item.change > 0 ? `+${item.change}` : item.change} {item.attribute}
                      </span>
                    </div>
                    <p className="text-slate-200">{item.message}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No previous training sessions logged yet. Run training drills or simulate calendar dates to observe development gains.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#1f293d] flex justify-end">
              <button
                onClick={() => setSelectedPlayerForHistory(null)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

