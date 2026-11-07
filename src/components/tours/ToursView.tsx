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
  Sparkles,
} from 'lucide-react';
import { CareerSave, Match, MatchFormat, Player, Tour, TourType } from '../../types/cricket';
import { INTERNATIONAL_TEAMS, CORE_12_TEAMS } from '../../data/teams';
import { getEffectivePlayersByCountry } from '../../data/squads';
import {
  computeTourDetailedStatistics,
  getTourProgressionStage,
  scheduleCustomInternationalTour,
  validateCustomTourSchedule,
} from '../../engine/tourEngine';
import { CountryFlag } from '../common/CountryFlag';

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
    { step: 1, label: 'Scheduled' },
    { step: 2, label: 'Selection' },
    { step: 3, label: 'Deadline' },
    { step: 4, label: 'Announced' },
    { step: 5, label: 'Pre-Camp' },
    { step: 6, label: 'First Match' },
    { step: 7, label: 'In Progress' },
    { step: 8, label: 'Deciders' },
    { step: 9, label: 'Concluded' },
    { step: 10, label: 'Trophy' },
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
    <div className="space-y-5 select-none pb-8 text-[#e8edf2]">
      {/* Top Banner: Header + Schedule Tour CTA in Dugout Style */}
      <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#10151c] border border-[#1e2733] flex items-center justify-center text-[#e2b64a] shadow-inner">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="dugout-kicker text-[11px] text-[#e2b64a]">Bilateral Series</span>
              <span className="text-[10px] bg-[#10151c] text-[#8fb2d9] font-mono px-2 py-0.5 rounded-full border border-[#1e2733] font-bold">
                Tours Hub
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-0.5">
              International Tours &amp; Trophies
            </h1>
            <p className="text-xs text-[#8b97a3] mt-0.5">
              Multi-format bilateral series, independent trophies, touring squad management and series honors
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="btn-gold flex items-center gap-1.5 text-xs py-2.5 px-4"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Schedule New Tour</span>
          </button>
        </div>
      </div>

      {/* Tour Selector Horizontal Strip */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
        {tours.map((t) => {
          const isSelected = t.id === activeTour?.id;
          const userIn = t.hostTeamId === career.selectedTeamId || t.visitingTeamId === career.selectedTeamId;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTourId(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-2 border uppercase tracking-wider ${
                isSelected
                  ? 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black border-transparent shadow-sm font-extrabold'
                  : 'bg-[#070a0e] text-[#8b97a3] hover:text-white border-[#1e2733]'
              }`}
            >
              <span>{t.name}</span>
              {userIn && (
                <span className="bg-[#10151c] text-[#ffe9a8] font-mono text-[9px] px-1.5 py-0.2 rounded border border-[#1e2733]">
                  MY NATION
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTour && (
        <div className="space-y-5">
          {/* Active Tour Overview & 10-Step Progression Tracker */}
          <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e2733] pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#10151c] text-[#e2b64a] border border-[#1e2733] font-mono uppercase tracking-wider">
                    {activeTour.tourType || 'BILATERAL_TOUR'}
                  </span>
                  <span className="text-xs text-[#8b97a3] font-mono">
                    {activeTour.startDate} → {activeTour.endDate}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-1">{activeTour.name}</h2>
                <div className="flex items-center space-x-3 text-xs text-[#8b97a3] mt-1">
                  <div className="flex items-center space-x-1.5">
                    <CountryFlag countryCode={hostTeam?.code || ''} size="xs" />
                    <span>Host: <strong className="text-white">{hostTeam?.name || activeTour.hostTeamId}</strong></span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center space-x-1.5">
                    <CountryFlag countryCode={visitingTeam?.code || ''} size="xs" />
                    <span>Visitor: <strong className="text-white">{visitingTeam?.name || activeTour.visitingTeamId}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="dugout-kicker text-[10px] text-[#8b97a3] block mb-0.5">Series Status</span>
                  <span
                    className={`font-mono font-black text-xs uppercase tracking-wider ${
                      activeTour.status === 'COMPLETED'
                        ? 'text-[#3fca86]'
                        : activeTour.status === 'IN_PROGRESS'
                        ? 'text-[#8fb2d9]'
                        : 'text-[#e2b64a]'
                    }`}
                  >
                    {activeTour.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {isUserInvolved && onOpenTourSelection && (
                  <button
                    onClick={() => onOpenTourSelection(activeTour.id)}
                    className="bg-[#10151c] hover:bg-[#161d27] text-[#e2b64a] border border-[#1e2733] hover:border-[#e2b64a] text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{activeTour.squadAnnounced ? 'Tour Squad' : 'Announce Squad'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* 10-Step Progression Tracker */}
            <div className="space-y-2">
              <span className="dugout-kicker text-[10px] text-[#8b97a3] block">
                Tour Progression Lifecycle (Stage {progression.stageIndex}/10: {progression.label})
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5">
                {progressionStages.map((st) => {
                  const isCurrent = st.step === progression.stageIndex;
                  const isDone = st.step < progression.stageIndex;
                  return (
                    <div
                      key={st.step}
                      className={`p-2 rounded-xl text-center border transition text-[10px] ${
                        isCurrent
                          ? 'bg-[#e2b64a]/10 border-[#e2b64a] text-[#ffe9a8] font-bold shadow-xs'
                          : isDone
                          ? 'bg-[#10151c] border-[#3fca86]/40 text-[#3fca86] font-medium'
                          : 'bg-[#070a0e] border-[#1e2733] text-[#556375]'
                      }`}
                    >
                      <span className="font-mono block text-[9px] uppercase">Step {st.step}</span>
                      <span className="truncate block mt-0.5">{st.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Independent Per-Format Series Standings in Dugout Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
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
                  className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-4 space-y-3 shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-[#1e2733] pb-2">
                    <span className="dugout-kicker text-xs text-[#e2b64a]">
                      {fmt} SERIES
                    </span>
                    <span className="text-[10px] font-mono text-[#8b97a3] uppercase">
                      {matchCount} Match{matchCount > 1 ? 'es' : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1">
                    <div>
                      <span className="font-bold text-white block uppercase tracking-wide">{activeTour.hostTeamId}</span>
                      <span className="text-2xl font-black font-mono text-white mt-0.5 block">
                        {homeWins}
                      </span>
                    </div>
                    <div className="text-center font-mono text-[#8b97a3] text-xs">
                      {drawsOrTies > 0 ? `${drawsOrTies} ${fmt === 'TEST' ? 'Draws' : 'Ties'}` : 'VS'}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-white block uppercase tracking-wide">{activeTour.visitingTeamId}</span>
                      <span className="text-2xl font-black font-mono text-white mt-0.5 block">
                        {awayWins}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#c3ccd6] font-medium border-t border-[#1e2733] pt-2 text-center uppercase tracking-wider">
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

          {/* Real Tour Statistics */}
          {tourStats && tourStats.matchesPlayed > 0 && (
            <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#1e2733] pb-3">
                <span className="dugout-kicker text-xs text-[#e2b64a] flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#e2b64a]" />
                  Official Tour Honors &amp; Statistical Leaders
                </span>
                <span className="text-[10px] text-[#8b97a3] font-mono uppercase tracking-wider">
                  From {tourStats.matchesPlayed} Completed Tour Matches
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Top Run Scorer */}
                <div className="bg-[#10151c] p-3.5 rounded-xl border border-[#1e2733]">
                  <span className="dugout-kicker text-[10px] text-[#8b97a3] block mb-1">
                    Top Run Scorer
                  </span>
                  {tourStats.leadingRunScorer ? (
                    <div className="mt-1">
                      <span className="font-black text-white block text-sm">
                        {tourStats.leadingRunScorer.playerName}
                      </span>
                      <span className="text-[#3fca86] font-mono font-bold text-[11px] mt-0.5 block">
                        {tourStats.leadingRunScorer.runs} runs (avg{' '}
                        {tourStats.leadingRunScorer.average.toFixed(1)})
                      </span>
                    </div>
                  ) : (
                    <span className="text-[#556375] mt-1 block">No batting data</span>
                  )}
                </div>

                {/* Top Wicket Taker */}
                <div className="bg-[#10151c] p-3.5 rounded-xl border border-[#1e2733]">
                  <span className="dugout-kicker text-[10px] text-[#8b97a3] block mb-1">
                    Top Wicket Taker
                  </span>
                  {tourStats.leadingWicketTaker ? (
                    <div className="mt-1">
                      <span className="font-black text-white block text-sm">
                        {tourStats.leadingWicketTaker.playerName}
                      </span>
                      <span className="text-[#8fb2d9] font-mono font-bold text-[11px] mt-0.5 block">
                        {tourStats.leadingWicketTaker.wickets} wickets (avg{' '}
                        {tourStats.leadingWicketTaker.average.toFixed(1)})
                      </span>
                    </div>
                  ) : (
                    <span className="text-[#556375] mt-1 block">No bowling data</span>
                  )}
                </div>

                {/* Best Innings Performance */}
                <div className="bg-[#10151c] p-3.5 rounded-xl border border-[#1e2733]">
                  <span className="dugout-kicker text-[10px] text-[#8b97a3] block mb-1">
                    Best Batting Knock
                  </span>
                  {tourStats.bestBattingPerformance ? (
                    <div className="mt-1">
                      <span className="font-black text-white block text-sm">
                        {tourStats.bestBattingPerformance.playerName}
                      </span>
                      <span className="text-[#ffe9a8] font-mono font-bold text-[11px] mt-0.5 block">
                        {tourStats.bestBattingPerformance.runs} runs ({tourStats.bestBattingPerformance.description})
                      </span>
                    </div>
                  ) : (
                    <span className="text-[#556375] mt-1 block">None recorded</span>
                  )}
                </div>

                {/* Player of the Series */}
                <div className="bg-[#10151c] p-3.5 rounded-xl border border-[#1e2733]">
                  <span className="dugout-kicker text-[10px] text-[#e2b64a] block mb-1">
                    Player of the Series
                  </span>
                  {tourStats.playerOfTheSeries ? (
                    <div className="mt-1">
                      <span className="font-black text-white block text-sm">
                        {tourStats.playerOfTheSeries.playerName}
                      </span>
                      <span className="text-[#3fca86] text-[11px] font-semibold block mt-0.5">
                        {tourStats.playerOfTheSeries.reason}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[#556375] mt-1 block">Awarded at tour conclusion</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tour Fixtures & Results List */}
          <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1e2733] pb-3">
              <span className="dugout-kicker text-xs text-[#e2b64a] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#e2b64a]" />
                Tour Fixture Schedule ({tourMatches.length} Matches)
              </span>

              {/* Format Filter */}
              <div className="flex bg-[#10151c] p-1 rounded-xl border border-[#1e2733] text-[10px]">
                {(['ALL', 'TEST', 'ODI', 'T20I'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setActiveFormatFilter(fmt)}
                    className={`px-3 py-1 rounded-lg font-bold uppercase tracking-wider transition cursor-pointer ${
                      activeFormatFilter === fmt
                        ? 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black shadow-xs'
                        : 'text-[#8b97a3] hover:text-white'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {displayedMatches.length === 0 ? (
                <p className="text-xs text-[#8b97a3] py-8 text-center">
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
                    className="bg-[#10151c] hover:bg-[#161d27] border border-[#1e2733] hover:border-[#8fb2d9] p-3 rounded-xl flex items-center justify-between text-xs cursor-pointer transition group"
                  >
                    <div className="flex items-center space-x-3.5">
                      <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                        m.format === 'TEST'
                          ? 'bg-[#ff3d7f]/20 text-[#ff5470] border border-[#ff3d7f]/40'
                          : m.format === 'ODI'
                          ? 'bg-[#8fb2d9]/20 text-[#8fb2d9] border border-[#8fb2d9]/40'
                          : 'bg-[#3fca86]/20 text-[#3fca86] border border-[#3fca86]/40'
                      }`}>
                        {m.format}
                      </span>
                      <div>
                        <div className="font-bold text-white group-hover:text-[#e2b64a] transition-colors flex items-center gap-2">
                          <span>{m.homeTeamId} vs {m.awayTeamId}</span>
                          <span className="text-[#8b97a3] font-normal text-[11px]">
                            ({m.matchNumber ? `Match ${m.matchNumber}` : 'Fixture'})
                          </span>
                        </div>
                        <div className="text-[11px] text-[#8b97a3] mt-0.5">
                          {m.venue} • {m.date}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-mono text-xs font-bold block ${
                          m.status === 'COMPLETED'
                            ? 'text-[#3fca86]'
                            : m.status === 'IN_PROGRESS'
                            ? 'text-[#ff5470] animate-pulse'
                            : 'text-[#c3ccd6]'
                        }`}
                      >
                        {m.resultText || m.status.replace(/_/g, ' ')}
                      </span>
                      {m.status === 'COMPLETED' && (
                        <span className="text-[10px] text-[#8b97a3] hover:text-[#e2b64a] uppercase font-semibold">
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

      {/* Schedule Custom Tour Modal in Dugout Style */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
          <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-xs text-[#e8edf2]">
            <div className="flex items-center justify-between border-b border-[#1e2733] pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wide">
                <Plus className="w-4 h-4 text-[#e2b64a]" />
                Schedule Custom International Tour
              </h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-[#8b97a3] hover:text-white"
              >
                ✕
              </button>
            </div>

            {scheduleError && (
              <div className="p-3 rounded-xl bg-[#ff3d7f]/20 border border-[#ff3d7f]/40 text-[#ff5470] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{scheduleError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="dugout-kicker text-[9px] text-[#8b97a3] block mb-1">Host Nation</label>
                <select
                  value={customHost}
                  onChange={(e) => setCustomHost(e.target.value)}
                  className="w-full bg-[#10151c] border border-[#1e2733] rounded-xl p-2 text-white focus:outline-none focus:border-[#e2b64a]"
                >
                  {CORE_12_TEAMS.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#070a0e]">
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="dugout-kicker text-[9px] text-[#8b97a3] block mb-1">Visiting Nation</label>
                <select
                  value={customVisitor}
                  onChange={(e) => setCustomVisitor(e.target.value)}
                  className="w-full bg-[#10151c] border border-[#1e2733] rounded-xl p-2 text-white focus:outline-none focus:border-[#e2b64a]"
                >
                  {CORE_12_TEAMS.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#070a0e]">
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="dugout-kicker text-[9px] text-[#8b97a3] block mb-1">Tour Type</label>
                <select
                  value={customTourType}
                  onChange={(e) => setCustomTourType(e.target.value as TourType)}
                  className="w-full bg-[#10151c] border border-[#1e2733] rounded-xl p-2 text-white focus:outline-none focus:border-[#e2b64a]"
                >
                  <option value="MULTI_FORMAT" className="bg-[#070a0e]">Multi-Format Bilateral</option>
                  <option value="TEST_ONLY" className="bg-[#070a0e]">Test Match Series Only</option>
                  <option value="WHITE_BALL_ONLY" className="bg-[#070a0e]">White-Ball (ODI/T20I) Only</option>
                  <option value="NEUTRAL_VENUE" className="bg-[#070a0e]">Neutral Venue Bilateral</option>
                </select>
              </div>

              <div>
                <label className="dugout-kicker text-[9px] text-[#8b97a3] block mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-[#10151c] border border-[#1e2733] rounded-xl p-2 text-white focus:outline-none focus:border-[#e2b64a] font-mono"
                />
              </div>
            </div>

            {/* Match Counts Config */}
            <div className="bg-[#10151c] p-3.5 rounded-xl border border-[#1e2733] space-y-2">
              <span className="dugout-kicker text-[9px] text-[#8b97a3] block">
                Format Match Counts
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-[#8b97a3] block mb-1">Test Matches</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={customTestCount}
                    onChange={(e) => setCustomTestCount(Number(e.target.value))}
                    className="w-full bg-[#070a0e] border border-[#1e2733] rounded-lg p-2 text-white font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8b97a3] block mb-1">ODIs</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={customOdiCount}
                    onChange={(e) => setCustomOdiCount(Number(e.target.value))}
                    className="w-full bg-[#070a0e] border border-[#1e2733] rounded-lg p-2 text-white font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8b97a3] block mb-1">T20Is</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={customT20Count}
                    onChange={(e) => setCustomT20Count(Number(e.target.value))}
                    className="w-full bg-[#070a0e] border border-[#1e2733] rounded-lg p-2 text-white font-mono text-center font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#1e2733]">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-xs text-[#8b97a3] hover:text-white px-3.5 py-2 rounded-xl bg-[#10151c] border border-[#1e2733] cursor-pointer uppercase font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomTour}
                className="btn-gold px-4 py-2 text-xs"
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
