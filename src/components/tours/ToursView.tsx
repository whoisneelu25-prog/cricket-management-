import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Calendar,
  Trophy,
  Users,
  MapPin,
  CheckCircle2,
  Clock,
  Play,
  Shield,
  Award,
  ChevronRight,
  UserCheck,
  TrendingUp,
  FileText,
  Plus,
  AlertTriangle,
  Plane,
  RotateCcw,
} from 'lucide-react';
import { CareerSave, Match, MatchFormat, Player, Tour, TourType } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { getEffectivePlayersByCountry } from '../../data/squads';
import {
  computeTourDetailedStatistics,
  getTourProgressionStage,
  scheduleCustomInternationalTour,
  validateCustomTourSchedule,
} from '../../engine/tourEngine';

interface ToursViewProps {
  career: CareerSave;
  onNavigateToMatch?: (matchId: string) => void;
  onInspectScorecard?: (match: Match) => void;
  onOpenTourSelection?: (tourId: string) => void;
  onUpdateSquadXI?: (format: MatchFormat, xiPlayerIds: string[]) => void;
  onSelectPlayer?: (player: Player) => void;
  onCareerUpdated?: (updated: CareerSave) => void;
}

export const ToursView: React.FC<ToursViewProps> = ({
  career,
  onNavigateToMatch,
  onInspectScorecard,
  onOpenTourSelection,
  onUpdateSquadXI,
  onSelectPlayer,
  onCareerUpdated,
}) => {
  const tours = career.tours || [];
  const [selectedTourId, setSelectedTourId] = useState<string>(
    career.currentTourId || (tours[0]?.id || '')
  );
  const [activeFormatFilter, setActiveFormatFilter] = useState<'ALL' | 'TEST' | 'ODI' | 'T20I'>('ALL');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Custom Tour Scheduling Form State
  const [customHost, setCustomHost] = useState(career.selectedTeamId);
  const [customVisitor, setCustomVisitor] = useState(
    INTERNATIONAL_TEAMS.find((t) => t.id !== career.selectedTeamId)?.id || 'AUS'
  );
  const [customTourType, setCustomTourType] = useState<TourType>('MULTI_FORMAT');
  const [customStartDate, setCustomStartDate] = useState('2027-04-10');
  const [customTestCount, setCustomTestCount] = useState(2);
  const [customOdiCount, setCustomOdiCount] = useState(3);
  const [customT20Count, setCustomT20Count] = useState(3);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const activeTour = tours.find((t) => t.id === selectedTourId) || tours[0];
  const allMatches: Match[] = [...(career.fixtures || []), ...(career.worldFixtures || [])];
  const tourMatches = activeTour ? allMatches.filter((m) => m.tourId === activeTour.id) : [];

  const hostTeam = INTERNATIONAL_TEAMS.find((t) => t.id === activeTour?.hostTeamId);
  const visitingTeam = INTERNATIONAL_TEAMS.find((t) => t.id === activeTour?.visitingTeamId);
  const isUserInvolved =
    activeTour &&
    (activeTour.hostTeamId === career.selectedTeamId || activeTour.visitingTeamId === career.selectedTeamId);
  const isUserHome = activeTour?.hostTeamId === career.selectedTeamId;

  // Filter matches by format if selected
  const displayedMatches = tourMatches.filter(
    (m) => activeFormatFilter === 'ALL' || m.format === activeFormatFilter
  );

  // Real Completed-Match Statistics
  const tourStats = useMemo(() => {
    if (!activeTour) return null;
    return computeTourDetailedStatistics(activeTour, allMatches);
  }, [activeTour, allMatches]);

  // 10-step progression stage
  const progression = useMemo(() => {
    if (!activeTour) return { stageIndex: 1, label: 'Tour Scheduled' };
    return getTourProgressionStage(activeTour, tourMatches, career.currentDate || '2026-11-15');
  }, [activeTour, tourMatches, career.currentDate]);

  const progressionStages = [
    { step: 1, label: 'Tour Scheduled' },
    { step: 2, label: 'Selection Window' },
    { step: 3, label: 'Squad Deadline' },
    { step: 4, label: 'Announcement' },
    { step: 5, label: 'Pre-Tour Camp' },
    { step: 6, label: 'First Match Day' },
    { step: 7, label: 'Series In Progress' },
    { step: 8, label: 'Deciding Fixtures' },
    { step: 9, label: 'Series Concluded' },
    { step: 10, label: 'Trophy & Review' },
  ];

  // Schedule Custom Tour Submit Handler
  const handleCreateCustomTour = () => {
    setScheduleError(null);
    const seriesConfig = {
      tests: customTestCount,
      odis: customOdiCount,
      t20is: customT20Count,
    };

    const validation = validateCustomTourSchedule(
      career,
      customHost,
      customVisitor,
      customStartDate,
      seriesConfig
    );

    if (!validation.valid) {
      setScheduleError(validation.errors?.[0] || 'Invalid tour parameters.');
      return;
    }

    const { updatedCareer, createdTour } = scheduleCustomInternationalTour(
      career,
      customHost,
      customVisitor,
      customStartDate,
      seriesConfig
    );

    if (onCareerUpdated) {
      onCareerUpdated(updatedCareer);
    }
    if (createdTour) {
      setSelectedTourId(createdTour.id);
    }
    setShowScheduleModal(false);
  };

  return (
    <div className="space-y-4 select-none pb-8 text-slate-200">
      {/* Top Banner: Header + Schedule Tour CTA */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-[#151d29] border border-[#1e293b] flex items-center justify-center text-emerald-400">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-white tracking-wide">
                Bilateral International Tours &amp; Series
              </h1>
              <span className="text-[10px] bg-[#142646] text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-emerald-900/60 font-bold">
                Tours Hub
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Multi-format bilateral series, independent format trophies, touring squad management and real tour records
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="bg-[#10b981] hover:bg-[#059669] text-[#0b0e14] text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule New Tour</span>
          </button>
        </div>
      </div>

      {/* Tour Selector Horizontal Strip */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
        {tours.map((t) => {
          const isSelected = t.id === activeTour?.id;
          const userIn = t.hostTeamId === career.selectedTeamId || t.visitingTeamId === career.selectedTeamId;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTourId(t.id)}
              className={`px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 border ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-[#111827] text-slate-400 hover:text-white border-[#1e293b]'
              }`}
            >
              <span>{t.name}</span>
              {userIn && (
                <span className="bg-emerald-950 text-emerald-300 font-mono text-[9px] px-1 py-0.2 rounded border border-emerald-800">
                  MY NATION
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTour && (
        <div className="space-y-4">
          {/* Active Tour Overview & 10-Step Progression Tracker */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e293b] pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#152336] text-emerald-400 border border-emerald-900/60 font-mono">
                    {activeTour.tourType || 'BILATERAL_TOUR'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {activeTour.startDate} → {activeTour.endDate}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">{activeTour.name}</h2>
                <p className="text-xs text-slate-400">
                  Host: <strong className="text-white">{hostTeam?.name || activeTour.hostTeamId}</strong> • Visitor:{' '}
                  <strong className="text-white">{visitingTeam?.name || activeTour.visitingTeamId}</strong>
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Status</span>
                  <span
                    className={`font-mono font-bold text-xs ${
                      activeTour.status === 'COMPLETED'
                        ? 'text-emerald-400'
                        : activeTour.status === 'IN_PROGRESS'
                        ? 'text-sky-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {activeTour.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {isUserInvolved && onOpenTourSelection && (
                  <button
                    onClick={() => onOpenTourSelection(activeTour.id)}
                    className="bg-[#151d29] hover:bg-[#1f2c42] text-emerald-400 border border-emerald-900/60 text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{activeTour.squadAnnounced ? 'Tour Squad' : 'Announce Squad'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* 10-Step Progression Tracker */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Tour Progression Lifecycle (Stage {progression.stageIndex}/10: {progression.label})
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5">
                {progressionStages.map((st) => {
                  const isCurrent = st.step === progression.stageIndex;
                  const isDone = st.step < progression.stageIndex;
                  return (
                    <div
                      key={st.step}
                      className={`p-1.5 rounded text-center border transition text-[10px] ${
                        isCurrent
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold'
                          : isDone
                          ? 'bg-[#151d29] border-emerald-900/40 text-slate-400 font-medium'
                          : 'bg-[#0e131d] border-[#1e293b] text-slate-600'
                      }`}
                    >
                      <span className="font-mono block text-[9px]">Step {st.step}</span>
                      <span className="truncate block mt-0.5">{st.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Independent Per-Format Series Standings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(['TEST', 'ODI', 'T20I'] as MatchFormat[]).map((fmt) => {
              const series = activeTour.series?.[fmt];
              if (!series) return null;
              const matchCount = series.matchCount || 0;
              const matchesPlayed = series.matchesPlayed || 0;
              const homeWins = series.homeWins || 0;
              const awayWins = series.awayWins || 0;
              const drawsOrTies = 'draws' in series ? (series as any).draws : 'ties' in series ? (series as any).ties : 0;
              const isConcluded = matchesPlayed >= matchCount;
              const winner = homeWins > awayWins ? activeTour.hostTeamId : awayWins > homeWins ? activeTour.visitingTeamId : 'Drawn';

              return (
                <div
                  key={fmt}
                  className="bg-[#111827] border border-[#1e293b] rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
                    <span className="text-xs font-bold font-mono text-emerald-400">
                      {fmt} SERIES
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {matchCount} Match{matchCount > 1 ? 'es' : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{activeTour.hostTeamId}</span>
                      <span className="text-xl font-bold font-mono text-emerald-400">
                        {homeWins}
                      </span>
                    </div>
                    <div className="text-center font-mono text-slate-500 text-[11px]">
                      {drawsOrTies > 0 ? `${drawsOrTies} ${fmt === 'TEST' ? 'Draws' : 'Ties'}` : 'VS'}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-white block">{activeTour.visitingTeamId}</span>
                      <span className="text-xl font-bold font-mono text-emerald-400">
                        {awayWins}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 font-medium border-t border-[#1e293b] pt-1 text-center">
                    {isConcluded
                      ? winner === 'Drawn'
                        ? 'Series Drawn'
                        : `Series Winner: ${winner}`
                      : `${matchesPlayed}/${matchCount} Completed`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real Tour Statistics (Computed strictly from completed tour matches) */}
          {tourStats && tourStats.matchesPlayed > 0 && (
            <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Official Tour Honors &amp; Statistical Leaders
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  From {tourStats.matchesPlayed} Completed Tour Matches
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Top Run Scorer */}
                <div className="bg-[#151d29] p-3 rounded border border-[#1e293b]">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                    Top Run Scorer
                  </span>
                  {tourStats.leadingRunScorer ? (
                    <div className="mt-1">
                      <span className="font-bold text-white block text-sm">
                        {tourStats.leadingRunScorer.playerName}
                      </span>
                      <span className="text-emerald-400 font-mono text-[11px]">
                        {tourStats.leadingRunScorer.runs} runs (avg{' '}
                        {tourStats.leadingRunScorer.average.toFixed(1)})
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500 mt-1 block">No batting data</span>
                  )}
                </div>

                {/* Top Wicket Taker */}
                <div className="bg-[#151d29] p-3 rounded border border-[#1e293b]">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                    Top Wicket Taker
                  </span>
                  {tourStats.leadingWicketTaker ? (
                    <div className="mt-1">
                      <span className="font-bold text-white block text-sm">
                        {tourStats.leadingWicketTaker.playerName}
                      </span>
                      <span className="text-sky-400 font-mono text-[11px]">
                        {tourStats.leadingWicketTaker.wickets} wickets (avg{' '}
                        {tourStats.leadingWicketTaker.average.toFixed(1)}, econ {tourStats.leadingWicketTaker.economy.toFixed(1)})
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500 mt-1 block">No bowling data</span>
                  )}
                </div>

                {/* Best Innings Performance */}
                <div className="bg-[#151d29] p-3 rounded border border-[#1e293b]">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                    Best Batting Performance
                  </span>
                  {tourStats.bestBattingPerformance ? (
                    <div className="mt-1">
                      <span className="font-bold text-white block text-sm">
                        {tourStats.bestBattingPerformance.playerName}
                      </span>
                      <span className="text-amber-400 font-mono text-[11px]">
                        {tourStats.bestBattingPerformance.runs} runs ({tourStats.bestBattingPerformance.description})
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500 mt-1 block">None recorded</span>
                  )}
                </div>

                {/* Player of the Series */}
                <div className="bg-[#151d29] p-3 rounded border border-[#1e293b]">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                    Player of the Series
                  </span>
                  {tourStats.playerOfTheSeries ? (
                    <div className="mt-1">
                      <span className="font-bold text-white block text-sm">
                        {tourStats.playerOfTheSeries.playerName}
                      </span>
                      <span className="text-emerald-400 text-[11px] block mt-0.5">
                        {tourStats.playerOfTheSeries.reason}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500 mt-1 block">Decided at tour conclusion</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tour Fixtures & Results List */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                Tour Fixture Schedule ({tourMatches.length} Matches)
              </span>

              {/* Format Filter */}
              <div className="flex bg-[#151d29] p-0.5 rounded border border-[#1e293b] text-[10px]">
                {(['ALL', 'TEST', 'ODI', 'T20I'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setActiveFormatFilter(fmt)}
                    className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                      activeFormatFilter === fmt
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              {displayedMatches.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No fixtures match the selected filter.
                </p>
              ) : (
                displayedMatches.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      if (m.status === 'COMPLETED' && onInspectScorecard) {
                        onInspectScorecard(m);
                      } else if (onNavigateToMatch && (m.status === 'IN_PROGRESS' || m.status === 'READY')) {
                        onNavigateToMatch(m.id);
                      }
                    }}
                    className="bg-[#151d29] hover:bg-[#1a2538] border border-[#1e293b] p-2.5 rounded flex items-center justify-between text-xs cursor-pointer transition"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#10243d] text-emerald-400 border border-emerald-900/50">
                        {m.format}
                      </span>
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{m.homeTeamId} vs {m.awayTeamId}</span>
                          <span className="text-slate-400 font-normal text-[11px]">
                            ({m.matchNumber ? `Match ${m.matchNumber}` : 'Fixture'})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {m.venue} • {m.date}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-mono text-[11px] font-bold block ${
                          m.status === 'COMPLETED'
                            ? 'text-emerald-400'
                            : m.status === 'IN_PROGRESS'
                            ? 'text-rose-400 animate-pulse'
                            : 'text-slate-300'
                        }`}
                      >
                        {m.resultText || m.status.replace(/_/g, ' ')}
                      </span>
                      {m.status === 'COMPLETED' && (
                        <span className="text-[10px] text-slate-500 hover:text-emerald-400">
                          Inspect Scorecard →
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Custom Tour Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5 max-w-lg w-full space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Schedule Custom International Tour
              </h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {scheduleError && (
              <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800 text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{scheduleError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Host Nation</label>
                <select
                  value={customHost}
                  onChange={(e) => setCustomHost(e.target.value)}
                  className="w-full bg-[#151d29] border border-[#1e293b] rounded p-2 text-white focus:outline-none"
                >
                  {INTERNATIONAL_TEAMS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Visiting Nation</label>
                <select
                  value={customVisitor}
                  onChange={(e) => setCustomVisitor(e.target.value)}
                  className="w-full bg-[#151d29] border border-[#1e293b] rounded p-2 text-white focus:outline-none"
                >
                  {INTERNATIONAL_TEAMS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Tour Type</label>
                <select
                  value={customTourType}
                  onChange={(e) => setCustomTourType(e.target.value as TourType)}
                  className="w-full bg-[#151d29] border border-[#1e293b] rounded p-2 text-white focus:outline-none"
                >
                  <option value="MULTI_FORMAT">Multi-Format Bilateral</option>
                  <option value="TEST_ONLY">Test Match Series Only</option>
                  <option value="WHITE_BALL_ONLY">White-Ball (ODI/T20I) Only</option>
                  <option value="NEUTRAL_VENUE">Neutral Venue Bilateral</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-[#151d29] border border-[#1e293b] rounded p-2 text-white focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Match Counts Config */}
            <div className="bg-[#151d29] p-3 rounded border border-[#1e293b] space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Format Match Counts
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Test Matches</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={customTestCount}
                    onChange={(e) => setCustomTestCount(Number(e.target.value))}
                    className="w-full bg-[#111827] border border-[#1e293b] rounded p-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">ODIs</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={customOdiCount}
                    onChange={(e) => setCustomOdiCount(Number(e.target.value))}
                    className="w-full bg-[#111827] border border-[#1e293b] rounded p-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">T20Is</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={customT20Count}
                    onChange={(e) => setCustomT20Count(Number(e.target.value))}
                    className="w-full bg-[#111827] border border-[#1e293b] rounded p-1.5 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#1e293b]">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded bg-[#151d29] border border-[#1e293b] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomTour}
                className="text-xs font-bold text-[#0b0e14] px-4 py-1.5 rounded bg-[#10b981] hover:bg-[#059669] cursor-pointer shadow-sm"
              >
                Validate &amp; Schedule Tour
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
