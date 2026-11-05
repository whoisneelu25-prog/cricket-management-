import React, { useState, useEffect, useMemo } from 'react';
import {
  CareerSave,
  Match,
  MatchFormat,
  Player,
  BattingAggression,
  BowlingTactic,
  FieldPreset,
  IndividualBatterInstruction,
  IndividualBowlingPlan,
  CustomScoringTarget,
  PhaseScoringTargets,
  CustomFieldLayout,
  TeamBattingGamePlan,
} from './types/cricket';
import {
  MainNavigationTab,
  loadSavedCareerFromStorage,
  saveCareerToStorage,
  clearCareerStorage,
  createNewCareerSave,
  advanceCareerTime,
  advanceToNextMatchDate,
  takeSquadRestDay,
  announceTourSquad,
  assignPlayerTrainingFocus,
  applyUserMatchResult,
  updateSquadXI,
  setFormatCaptain,
  setFormatViceCaptain,
  setFormatWicketKeeper,
  confirmMatchPreparationLineup,
} from './store/careerStore';
import {
  CalendarAdvanceMode,
  CalendarAdvancementResult,
  simulateWorldMatchesUntil,
} from './engine/worldSimulation';
import { TrainingFocus } from './engine/playerDevelopmentEngine';
import { INTERNATIONAL_TEAMS } from './data/teams';
import { ALL_PLAYERS, getDefaultPlayingXI, getDefaultWicketKeeperId, getDefaultCaptainId } from './data/squads';
import { PitchBackground } from './components/common/PitchBackground';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { TopBar } from './components/navigation/TopBar';
import { Sidebar } from './components/navigation/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { SquadView } from './components/squad/SquadView';
import { TeamSelectionView } from './components/team/TeamSelectionView';
import { TacticsView } from './components/tactics/TacticsView';
import { PlayersView } from './components/players/PlayersView';
import { MyTeamView } from './components/team/MyTeamView';
import { FixturesView } from './components/fixtures/FixturesView';
import { MatchCentreView } from './components/match/MatchCentreView';
import { MatchPreparationModal } from './components/match/MatchPreparationModal';
import { ScorecardModal } from './components/match/ScorecardModal';
import { TournamentsView } from './components/tournaments/TournamentsView';
import { RankingsView } from './components/rankings/RankingsView';
import { StatisticsView } from './components/statistics/StatisticsView';
import { NewsView } from './components/news/NewsView';
import { CareerHistoryView } from './components/career/CareerHistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { PlayerProfileModal } from './components/players/PlayerProfileModal';
import { TourSelectionModal } from './components/squad/TourSelectionModal';
import { ToursView } from './components/tours/ToursView';
import { RivalriesView } from './components/rivalries/RivalriesView';
import { PlayerDevelopmentView } from './components/development/PlayerDevelopmentView';
import { MainMenu } from './components/menu/MainMenu';
import { NewCareerWizard } from './components/career/NewCareerWizard';
import {
  stepMatchBall,
  stepMatchOver,
  stepMatchInnings,
  simulateFullMatch,
  createInitialInningsState,
  declareInnings,
  resolveFollowOnDecision,
  takeNewBallInTestMatch,
  getMatchSeed,
  isPreMatchStatus,
  isTerminalMatchStatus,
  withCareerSimulationContext,
  ensureMatchTacticalSystemsInitialized,
  updateIndividualBatterInstruction,
  updateIndividualBowlingPlan,
  updateCustomScoringTargets,
  updatePhaseScoringTargets,
  updateActiveFieldLayout,
  updateTeamBattingGamePlan,
} from './engine/matchEngine';
import {
  DEFAULT_TEST_OVERS_PER_DAY,
  DEFAULT_NEW_BALL_OVERS,
  createInitialTestWeather,
  getInitialTestPitchWear,
} from './engine/testCricketEngine';
import { createWhiteBallConditions } from './engine/whiteBallEngine';

export default function App() {
  const [career, setCareer] = useState<CareerSave | null>(null);
  const [viewState, setViewState] = useState<'MAIN_MENU' | 'NEW_CAREER' | 'IN_GAME'>('MAIN_MENU');
  const [activeTab, setActiveTab] = useState<MainNavigationTab>('DASHBOARD');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTourIdForModal, setSelectedTourIdForModal] = useState<string | null>(null);
  const [prepMatchId, setPrepMatchId] = useState<string | null>(null);
  const [inspectedScorecardMatch, setInspectedScorecardMatch] = useState<Match | null>(null);
  const [calendarAlert, setCalendarAlert] = useState<CalendarAdvancementResult | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  // Initialize or check auto-start
  useEffect(() => {
    const saved = loadSavedCareerFromStorage();
    const urlParams = new URLSearchParams(window.location.search);
    const autostart = urlParams.get('autostart') === '1';

    if (saved) {
      setCareer(saved);
      setActiveMatchId(saved.activeMatchId || null);
      if (autostart) {
        setViewState('IN_GAME');
      }
    } else if (autostart) {
      const autoCareer = createNewCareerSave(
        'Rahul Dravid',
        'IND',
        'TEST',
        'INTERNATIONAL',
        'TACTICAL'
      );
      setCareer(autoCareer);
      saveCareerToStorage(autoCareer);
      setViewState('IN_GAME');
    }
  }, []);

  // Quick Match from Main Menu (sets up exhibition career and jumps straight to match)
  const handleStartQuickMatch = () => {
    const quickCareer = createNewCareerSave(
      'Head Coach',
      'IND',
      'T20I',
      'INTERNATIONAL',
      'AGGRESSIVE'
    );
    quickCareer.saveName = 'Exhibition International Campaign';
    const firstMatch =
      quickCareer.fixtures.find((f) => !isTerminalMatchStatus(f.status)) ||
      quickCareer.fixtures[0];
    if (firstMatch) {
      firstMatch.date = quickCareer.currentDate;
      firstMatch.status = 'READY';
      firstMatch.lineupConfirmed = true;
      quickCareer.activeMatchId = firstMatch.id;
      setActiveMatchId(firstMatch.id);
    }
    setCareer(quickCareer);
    saveCareerToStorage(quickCareer);
    setViewState('IN_GAME');
    setActiveTab('MATCH_CENTRE');
  };

  // Active match resolution (strictly user fixtures only, prioritizing active and pending matches)
  const activeMatch: Match | undefined = useMemo(() => {
    if (!career) return undefined;
    const targetId = activeMatchId || career.activeMatchId;
    if (targetId) {
      const matchById = career.fixtures.find((f) => f.id === targetId);
      if (matchById) {
        return matchById;
      }
    }
    const inProgress = career.fixtures.find((f) => f.status === 'IN_PROGRESS');
    if (inProgress) return inProgress;
    const nextPending = career.fixtures.find((f) => !isTerminalMatchStatus(f.status));
    return nextPending || career.fixtures[0];
  }, [career, activeMatchId]);

  // Helper to update active match in career store
  const updateActiveMatch = (updated: Match, baseCareer: CareerSave | null = career) => {
    if (!baseCareer) return;
    if (isTerminalMatchStatus(updated.status)) {
      const applied = applyUserMatchResult(baseCareer, updated);
      const updatedFixtures = applied.fixtures.map((f) =>
        f.id === updated.id ? { ...updated, statsRecorded: true } : f
      );
      const nextCareer: CareerSave = {
        ...applied,
        activeMatchId: updated.id,
        fixtures: updatedFixtures,
        savedAt: new Date().toISOString(),
      };
      setActiveMatchId(updated.id);
      setCareer(nextCareer);
      saveCareerToStorage(nextCareer);
    } else {
      const updatedFixtures = baseCareer.fixtures.map((f) =>
        f.id === updated.id ? updated : f
      );
      const nextCareer: CareerSave = {
        ...baseCareer,
        activeMatchId: updated.id,
        fixtures: updatedFixtures,
        savedAt: new Date().toISOString(),
      };
      setActiveMatchId(updated.id);
      setCareer(nextCareer);
      saveCareerToStorage(nextCareer);
    }
  };

  const handleUpdateTrainingFocus = (playerId: string, focus: TrainingFocus) => {
    if (!career) return;
    const nextCareer = assignPlayerTrainingFocus(career, playerId, focus);
    setCareer(nextCareer);
    saveCareerToStorage(nextCareer);
  };

  // Match Simulation Step Handlers (wrapped in career simulation context)
  const handleSimulateBall = () => {
    if (!activeMatch || !career || isTerminalMatchStatus(activeMatch.status)) return;
    const next = withCareerSimulationContext(career, () => stepMatchBall(activeMatch));
    updateActiveMatch(next);
  };

  const handleSimulateOver = () => {
    if (!activeMatch || !career || isTerminalMatchStatus(activeMatch.status)) return;
    const next = withCareerSimulationContext(career, () => stepMatchOver(activeMatch));
    updateActiveMatch(next);
  };

  const handleSimulateInnings = () => {
    if (!activeMatch || !career || isTerminalMatchStatus(activeMatch.status)) return;
    const next = withCareerSimulationContext(career, () => stepMatchInnings(activeMatch));
    updateActiveMatch(next);
  };

  const handleSimulateMatch = () => {
    if (!activeMatch || !career || isTerminalMatchStatus(activeMatch.status)) return;
    let workingCareer = career;
    if (activeMatch.date && activeMatch.date > workingCareer.currentDate) {
      workingCareer = simulateWorldMatchesUntil(workingCareer, activeMatch.date).updatedCareer;
    }
    const targetMatch =
      workingCareer.fixtures.find((f) => f.id === activeMatch.id) || activeMatch;
    const next = withCareerSimulationContext(workingCareer, () =>
      simulateFullMatch(targetMatch)
    );
    updateActiveMatch(next, workingCareer);
  };

  const handleDeclareInnings = () => {
    if (!activeMatch || !career || isTerminalMatchStatus(activeMatch.status)) return;
    const next = withCareerSimulationContext(career, () => declareInnings(activeMatch));
    updateActiveMatch(next);
  };

  const handleFollowOnDecision = (enforce: boolean) => {
    if (!activeMatch || !career || isTerminalMatchStatus(activeMatch.status)) return;
    const next = withCareerSimulationContext(career, () =>
      resolveFollowOnDecision(activeMatch, enforce)
    );
    updateActiveMatch(next);
  };

  const handleTakeNewBall = () => {
    if (!activeMatch || isTerminalMatchStatus(activeMatch.status)) return;
    const next = takeNewBallInTestMatch(activeMatch);
    updateActiveMatch(next);
  };

  const handleUpdateTactics = (
    battingAggression: BattingAggression,
    bowlingTactic: BowlingTactic,
    fieldPreset: FieldPreset
  ) => {
    if (!activeMatch || isTerminalMatchStatus(activeMatch.status)) return;
    const next: Match = {
      ...activeMatch,
      userTactics: {
        battingAggression,
        bowlingTactic,
        fieldPreset,
      },
    };
    updateActiveMatch(next);
  };

  const handleChangeBowler = (bowlerId: string) => {
    if (!activeMatch || !activeMatch.innings[activeMatch.currentInningsIndex]) return;
    const currentInn = activeMatch.innings[activeMatch.currentInningsIndex];
    const nextInn = {
      ...currentInn,
      currentBowlerId: bowlerId,
    };
    const nextInningsList = [...activeMatch.innings];
    nextInningsList[activeMatch.currentInningsIndex] = nextInn;
    updateActiveMatch({
      ...activeMatch,
      innings: nextInningsList,
    });
  };

  const handleUpdateBatterInstruction = (instruction: IndividualBatterInstruction) => {
    if (!activeMatch || isTerminalMatchStatus(activeMatch.status)) return;
    const next = updateIndividualBatterInstruction(activeMatch, instruction);
    updateActiveMatch(next);
  };

  const handleUpdateBowlingPlan = (plan: IndividualBowlingPlan) => {
    if (!activeMatch || isTerminalMatchStatus(activeMatch.status)) return;
    const next = updateIndividualBowlingPlan(activeMatch, plan);
    updateActiveMatch(next);
  };

  const handleUpdateCustomTargets = (targets: CustomScoringTarget[]) => {
    if (!activeMatch || isTerminalMatchStatus(activeMatch.status)) return;
    const next = updateCustomScoringTargets(activeMatch, targets);
    updateActiveMatch(next);
  };

  const handleUpdatePhaseTargets = (targets: PhaseScoringTargets) => {
    if (!activeMatch || isTerminalMatchStatus(activeMatch.status)) return;
    const next = updatePhaseScoringTargets(activeMatch, targets);
    updateActiveMatch(next);
  };

  const handleUpdateFieldLayout = (layout: CustomFieldLayout) => {
    if (!activeMatch || isTerminalMatchStatus(activeMatch.status)) return;
    const next = updateActiveFieldLayout(activeMatch, layout);
    updateActiveMatch(next);
  };

  const handleUpdateGamePlan = (plan: TeamBattingGamePlan) => {
    if (!activeMatch || isTerminalMatchStatus(activeMatch.status) || !career) return;
    const next = updateTeamBattingGamePlan(activeMatch, career.selectedTeamId, plan);
    updateActiveMatch(next);
  };

  const handleStartMatchWithToss = (choice: 'BAT' | 'BOWL', tossWinnerId?: string) => {
    if (!activeMatch || !career) return;
    // Never allow completed or non-user matches to be started
    if (!isPreMatchStatus(activeMatch.status)) return;
    if (
      activeMatch.homeTeamId !== career.selectedTeamId &&
      activeMatch.awayTeamId !== career.selectedTeamId
    ) {
      return;
    }

    // Sync world calendar up to match date if needed so global cricket progresses alongside
    let workingCareer = career;
    if (activeMatch.date && activeMatch.date > workingCareer.currentDate) {
      workingCareer = simulateWorldMatchesUntil(workingCareer, activeMatch.date).updatedCareer;
    }
    const freshMatch =
      workingCareer.fixtures.find((f) => f.id === activeMatch.id) || activeMatch;

    const userTeamId = workingCareer.selectedTeamId;
    const opponentTeamId =
      freshMatch.homeTeamId === userTeamId ? freshMatch.awayTeamId : freshMatch.homeTeamId;

    const actualTossWinnerId = tossWinnerId || userTeamId;
    const isUserWinner = actualTossWinnerId === userTeamId;

    const battingTeamId = isUserWinner
      ? choice === 'BAT'
        ? userTeamId
        : opponentTeamId
      : choice === 'BAT'
      ? opponentTeamId
      : userTeamId;

    const bowlingTeamId = battingTeamId === userTeamId ? opponentTeamId : userTeamId;

    const userTeam = INTERNATIONAL_TEAMS.find((t) => t.id === userTeamId);
    const oppTeam = INTERNATIONAL_TEAMS.find((t) => t.id === opponentTeamId);

    const battingTeamName =
      battingTeamId === userTeamId ? userTeam?.name || 'Home' : oppTeam?.name || 'Away';
    const bowlingTeamName =
      bowlingTeamId === userTeamId ? userTeam?.name || 'Home' : oppTeam?.name || 'Away';

    let battingXI =
      battingTeamId === freshMatch.homeTeamId ? freshMatch.homeXI : freshMatch.awayXI;
    let bowlingXI =
      bowlingTeamId === freshMatch.homeTeamId ? freshMatch.homeXI : freshMatch.awayXI;

    if (!battingXI || battingXI.length < 11) {
      battingXI = getDefaultPlayingXI(battingTeamId, freshMatch.format);
    }
    if (!bowlingXI || bowlingXI.length < 11) {
      bowlingXI = getDefaultPlayingXI(bowlingTeamId, freshMatch.format);
    }

    let bowlingWkId =
      bowlingTeamId === freshMatch.homeTeamId
        ? freshMatch.homeWicketKeeperId
        : freshMatch.awayWicketKeeperId;
    if (!bowlingWkId) {
      bowlingWkId = getDefaultWicketKeeperId(bowlingTeamId, freshMatch.format);
    }

    let bowlingOptions =
      bowlingTeamId === freshMatch.homeTeamId
        ? freshMatch.homeBowlingOptions
        : freshMatch.awayBowlingOptions;
    if (!bowlingOptions || bowlingOptions.length === 0) {
      bowlingOptions = bowlingXI.filter((id) => id !== bowlingWkId).slice(-5);
    }

    const innings1 = withCareerSimulationContext(workingCareer, () =>
      createInitialInningsState(
        1,
        battingTeamId,
        battingTeamName,
        bowlingTeamId,
        bowlingTeamName,
        battingXI,
        bowlingXI,
        undefined,
        {
          format: freshMatch.format,
          pitch: freshMatch.pitch,
          weather: freshMatch.weather,
          bowlingWicketKeeperId: bowlingWkId,
          allocatedOvers: freshMatch.allocatedOversPerInnings,
          seed: getMatchSeed(freshMatch, 11),
          nominatedBowlerIds: bowlingOptions,
        }
      )
    );

    const finalHomeXI = freshMatch.homeTeamId === battingTeamId ? battingXI : bowlingXI;
    const finalAwayXI = freshMatch.awayTeamId === battingTeamId ? battingXI : bowlingXI;

    const startedMatch: Match = ensureMatchTacticalSystemsInitialized({
      ...freshMatch,
      status: 'IN_PROGRESS',
      userTeamId,
      isUserMatch: true,
      tossWinnerId: actualTossWinnerId,
      tossChoice: choice,
      homeXI: finalHomeXI,
      awayXI: finalAwayXI,
      homeCaptainId:
        freshMatch.homeCaptainId ||
        finalHomeXI[0] ||
        getDefaultCaptainId(freshMatch.homeTeamId, freshMatch.format),
      awayCaptainId:
        freshMatch.awayCaptainId ||
        finalAwayXI[0] ||
        getDefaultCaptainId(freshMatch.awayTeamId, freshMatch.format),
      homeWicketKeeperId:
        freshMatch.homeTeamId === bowlingTeamId
          ? bowlingWkId
          : freshMatch.homeWicketKeeperId ||
            getDefaultWicketKeeperId(freshMatch.homeTeamId, freshMatch.format),
      awayWicketKeeperId:
        freshMatch.awayTeamId === bowlingTeamId
          ? bowlingWkId
          : freshMatch.awayWicketKeeperId ||
            getDefaultWicketKeeperId(freshMatch.awayTeamId, freshMatch.format),
      currentInningsIndex: 0,
      innings: [innings1],
      ...(freshMatch.format === 'TEST'
        ? {
            dayNumber: 1,
            sessionNumber: 1 as const,
            oversBowledToday: 0,
            oversPerDay: freshMatch.oversPerDay ?? DEFAULT_TEST_OVERS_PER_DAY,
            newBallOversThreshold:
              freshMatch.newBallOversThreshold ?? DEFAULT_NEW_BALL_OVERS,
            pitchWear: freshMatch.pitchWear ?? getInitialTestPitchWear(freshMatch.pitch),
            dynamicWeather:
              freshMatch.dynamicWeather ??
              createInitialTestWeather(freshMatch.weather, getMatchSeed(freshMatch, 9)),
            sessionBreakStatus: undefined,
          }
        : {
            whiteBallConditions:
              freshMatch.whiteBallConditions ??
              createWhiteBallConditions(freshMatch, getMatchSeed(freshMatch, 5)),
          }),
    });

    updateActiveMatch(startedMatch, workingCareer);
  };

  // Format-Specific Squad Management Updates (Single-Country Guarded in Store)
  const handleUpdateSquadXI = (format: MatchFormat, xiIds: string[]) => {
    if (!career) return;
    const nextCareer = updateSquadXI(career, format, xiIds);
    setCareer(nextCareer);
    saveCareerToStorage(nextCareer);
  };

  const handleSetCaptain = (format: MatchFormat, playerId: string) => {
    if (!career) return;
    const nextCareer = setFormatCaptain(career, format, playerId);
    setCareer(nextCareer);
    saveCareerToStorage(nextCareer);
  };

  const handleSetViceCaptain = (format: MatchFormat, playerId: string) => {
    if (!career) return;
    const nextCareer = setFormatViceCaptain(career, format, playerId);
    setCareer(nextCareer);
    saveCareerToStorage(nextCareer);
  };

  const handleSetWicketKeeper = (format: MatchFormat, playerId: string) => {
    if (!career) return;
    const nextCareer = setFormatWicketKeeper(career, format, playerId);
    setCareer(nextCareer);
    saveCareerToStorage(nextCareer);
  };

  // Pre-Match Lineup Confirmation Handler
  const handleConfirmMatchLineup = (
    matchId: string,
    lineup: {
      playingXI: string[];
      captainId: string;
      wicketKeeperId: string;
      bowlingRotation?: string[];
    }
  ): CareerSave => {
    if (!career) throw new Error('No active career');
    const nextCareer = confirmMatchPreparationLineup(career, matchId, lineup);
    setCareer(nextCareer);
    saveCareerToStorage(nextCareer);
    return nextCareer;
  };

  const handleStartPreparedMatch = (
    preparedCareer: CareerSave,
    matchId: string,
    needsAdvance: boolean
  ) => {
    let workingCareer = preparedCareer;
    const targetMatch = workingCareer.fixtures.find((f) => f.id === matchId);
    if (needsAdvance && targetMatch?.date && targetMatch.date > workingCareer.currentDate) {
      const sim = simulateWorldMatchesUntil(workingCareer, targetMatch.date);
      workingCareer = sim.updatedCareer;
      setCareer(workingCareer);
      saveCareerToStorage(workingCareer);
    }
    setPrepMatchId(null);
    setActiveMatchId(matchId);
    setActiveTab('MATCH_CENTRE');
  };

  // Controlled 4-Mode Calendar Advancement Handler
  const handleAdvanceCalendar = (mode: CalendarAdvanceMode) => {
    if (!career) return;
    const result = advanceCareerTime(career, mode);
    setCareer(result.updatedCareer);
    saveCareerToStorage(result.updatedCareer);
    setCalendarAlert(result);
  };

  // Legacy Advance to Next Match Date Handler (for FixturesView button)
  const handleAdvanceToNextMatch = () => {
    if (!career) return;
    const result = advanceCareerTime(career, 'NEXT_MATCH');
    setCareer(result.updatedCareer);
    saveCareerToStorage(result.updatedCareer);
    setCalendarAlert(result);
  };

  // Rest & Recovery Day Handler
  const handleRestSquadDay = () => {
    if (!career) return;
    const nextCareer = takeSquadRestDay(career);
    setCareer(nextCareer);
    saveCareerToStorage(nextCareer);
  };

  // Tour Squad Selection Handler
  const handleConfirmTourSquad = (tourId: string, playerIds: string[]) => {
    if (!career) return;
    const nextCareer = announceTourSquad(career, tourId, playerIds);
    setCareer(nextCareer);
    saveCareerToStorage(nextCareer);
  };

  // Dataset Import Handler
  const handleImportPlayerDataset = (newPlayers: Player[]) => {
    if (!career) return;
    newPlayers.forEach((p) => {
      if (!ALL_PLAYERS.some((existing) => existing.id === p.id)) {
        ALL_PLAYERS.push(p);
      }
    });

    const nextCareer: CareerSave = {
      ...career,
      dataProvenance: {
        ...career.dataProvenance,
        playerCount: ALL_PLAYERS.length,
        lastDatabaseUpdate: new Date().toISOString().split('T')[0],
      },
      savedAt: new Date().toISOString(),
    };
    setCareer(nextCareer);
    saveCareerToStorage(nextCareer);
  };

  const handleQuickSave = () => {
    if (!career) return;
    saveCareerToStorage(career);
  };

  const handleResetCareer = () => {
    clearCareerStorage();
    setCareer(null);
    setViewState('MAIN_MENU');
  };

  // Selected tour for modal
  const activeTourForModal = career?.tours?.find((t) => t.id === selectedTourIdForModal);
  const prepMatch = prepMatchId
    ? career?.fixtures.find((f) => f.id === prepMatchId)
    : undefined;

  // RENDER: VIEW STATES
  if (viewState === 'MAIN_MENU') {
    return (
      <MainMenu
        onNewCareer={() => setViewState('NEW_CAREER')}
        onContinueCareer={() => setViewState('IN_GAME')}
        onQuickMatch={handleStartQuickMatch}
        savedCareer={career}
      />
    );
  }

  if (viewState === 'NEW_CAREER') {
    return (
      <NewCareerWizard
        onStartCareer={(newSave) => {
          setCareer(newSave);
          saveCareerToStorage(newSave);
          setCalendarAlert(null);
          setActiveMatchId(newSave.fixtures[0]?.id || null);
          setViewState('IN_GAME');
          setActiveTab('DASHBOARD');
        }}
        onCancel={() => setViewState('MAIN_MENU')}
      />
    );
  }

  return (
    <div className="flex h-screen bg-[#000000] text-[#e8edf2] overflow-hidden select-none font-sans relative">
      {/* Dugout SVG Pitch Background underlay */}
      <PitchBackground />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        isMatchActive={activeMatch?.status === 'IN_PROGRESS'}
        isMatchReady={career?.fixtures.some((f) => f.date === career.currentDate && f.status !== 'COMPLETED')}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        selectedTeam={career ? INTERNATIONAL_TEAMS.find((t) => t.id === career.selectedTeamId) : undefined}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Top Header */}
        <TopBar
          career={career}
          onOpenSaveModal={() => setActiveTab('SETTINGS')}
          onQuickSave={handleQuickSave}
          onSelectTab={(tab) => setActiveTab(tab)}
        />

        {/* Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#000000]/60 backdrop-blur-[1px]">
          <ErrorBoundary onReset={() => setActiveTab('DASHBOARD')}>
            {activeTab === 'DASHBOARD' && career && (
            <DashboardView
              career={career}
              calendarAlert={calendarAlert}
              onDismissCalendarAlert={() => setCalendarAlert(null)}
              onNavigateToMatch={(matchId) => {
                setActiveMatchId(matchId);
                setActiveTab('MATCH_CENTRE');
              }}
              onOpenMatchPreparation={(matchId) => setPrepMatchId(matchId)}
              onInspectScorecard={(m) => setInspectedScorecardMatch(m)}
              onNavigateToSquad={() => setActiveTab('SQUAD_MANAGEMENT')}
              onNavigateToNews={() => setActiveTab('NEWS')}
              onNavigateToTournaments={() => setActiveTab('TOURNAMENTS')}
              onNavigateToRankings={() => setActiveTab('RANKINGS')}
              onNavigateToFixtures={() => setActiveTab('FIXTURES')}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
              onAdvanceCalendar={handleAdvanceCalendar}
              onRestSquadDay={handleRestSquadDay}
              onOpenTourSelection={(tourId) => setSelectedTourIdForModal(tourId)}
            />
          )}

          {activeTab === 'MY_TEAM' && career && (
            <MyTeamView
              career={career}
              onNavigateToSquad={() => setActiveTab('SQUAD_MANAGEMENT')}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
              onOpenTourSelection={(tourId) => setSelectedTourIdForModal(tourId)}
            />
          )}

          {activeTab === 'SQUAD_MANAGEMENT' && career && (
            <SquadView
              career={career}
              onUpdateSquadXI={handleUpdateSquadXI}
              onSetCaptain={handleSetCaptain}
              onSetViceCaptain={handleSetViceCaptain}
              onSetWicketKeeper={handleSetWicketKeeper}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
              onOpenTourSelection={(tourId) => setSelectedTourIdForModal(tourId)}
              onCareerUpdated={(updated) => {
                setCareer(updated);
                saveCareerToStorage(updated);
              }}
            />
          )}

          {activeTab === 'TEAM_SELECTION' && career && (
            <TeamSelectionView
              career={career}
              onUpdateSquadXI={handleUpdateSquadXI}
              onSetCaptain={handleSetCaptain}
              onSetViceCaptain={handleSetViceCaptain}
              onSetWicketKeeper={handleSetWicketKeeper}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
              onOpenTourSelection={(tourId) => setSelectedTourIdForModal(tourId)}
              onNavigateToMatchPreparation={() => {
                const nextM = career.fixtures.find((f) => f.status !== 'COMPLETED');
                if (nextM) setPrepMatchId(nextM.id);
              }}
            />
          )}

          {activeTab === 'TACTICS' && career && (
            <TacticsView
              career={career}
              onCareerUpdated={(updated) => {
                setCareer(updated);
                saveCareerToStorage(updated);
              }}
            />
          )}

          {activeTab === 'PLAYERS' && career && (
            <PlayersView
              career={career}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
            />
          )}

          {activeTab === 'PLAYER_DEVELOPMENT' && career && (
            <PlayerDevelopmentView
              career={career}
              onUpdateTrainingFocus={handleUpdateTrainingFocus}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
              onRestSquadDay={handleRestSquadDay}
              onCareerUpdated={(updated) => {
                setCareer(updated);
                saveCareerToStorage(updated);
              }}
            />
          )}

          {activeTab === 'TOURS' && career && (
            <ToursView
              career={career}
              onNavigateToMatch={(matchId) => {
                const isUserM = career.fixtures.some((f) => f.id === matchId);
                if (!isUserM) return;
                setActiveMatchId(matchId);
                setActiveTab('MATCH_CENTRE');
              }}
              onInspectScorecard={(m) => setInspectedScorecardMatch(m)}
              onOpenTourSelection={(tourId) => setSelectedTourIdForModal(tourId)}
              onUpdateSquadXI={handleUpdateSquadXI}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
              onCareerUpdated={(updated) => {
                setCareer(updated);
                saveCareerToStorage(updated);
              }}
            />
          )}

          {activeTab === 'RIVALRIES' && career && (
            <RivalriesView
              career={career}
              onNavigateToMatch={(matchId) => {
                const isUserM = career.fixtures.some((f) => f.id === matchId);
                if (!isUserM) return;
                setActiveMatchId(matchId);
                setActiveTab('MATCH_CENTRE');
              }}
              onInspectScorecard={(m) => setInspectedScorecardMatch(m)}
            />
          )}

          {activeTab === 'MATCH_CENTRE' && activeMatch && (
            <MatchCentreView
              key={activeMatch.id}
              match={activeMatch}
              career={career || undefined}
              onSimulateBall={handleSimulateBall}
              onSimulateOver={handleSimulateOver}
              onSimulateInnings={handleSimulateInnings}
              onSimulateMatch={handleSimulateMatch}
              onUpdateTactics={handleUpdateTactics}
              onChangeBowler={handleChangeBowler}
              onStartMatchWithToss={handleStartMatchWithToss}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
              onDeclareInnings={handleDeclareInnings}
              onFollowOnDecision={handleFollowOnDecision}
              onTakeNewBall={handleTakeNewBall}
              onContinueToDashboard={() => {
                const nextPending = career?.fixtures.find((f) => !isTerminalMatchStatus(f.status));
                if (nextPending) setActiveMatchId(nextPending.id);
                setActiveTab('DASHBOARD');
              }}
              onPrepareNextMatch={(nextMatchId) => {
                setActiveMatchId(nextMatchId);
                setPrepMatchId(nextMatchId);
                setActiveTab('DASHBOARD');
              }}
              onOpenMatchPreparation={(matchId) => setPrepMatchId(matchId)}
              onUpdateBatterInstruction={handleUpdateBatterInstruction}
              onUpdateBowlingPlan={handleUpdateBowlingPlan}
              onUpdateCustomTargets={handleUpdateCustomTargets}
              onUpdatePhaseTargets={handleUpdatePhaseTargets}
              onUpdateFieldLayout={handleUpdateFieldLayout}
              onUpdateGamePlan={handleUpdateGamePlan}
            />
          )}

          {activeTab === 'MATCH_CENTRE' && !activeMatch && (
            <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-8 max-w-xl mx-auto my-12 text-center text-white">
              <h3 className="text-xl font-bold font-display">No Active Match in Progress</h3>
              <p className="text-xs text-[#8b97a3] mt-2 font-sans">
                You do not currently have a match loaded. Select an upcoming fixture or start a new tour series.
              </p>
              <button
                onClick={() => setActiveTab('DASHBOARD')}
                className="btn-gold mt-6 text-xs px-6 py-2.5 rounded-xl cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          )}

          {activeTab === 'FIXTURES' && career && (
            <FixturesView
              career={career}
              onSelectMatch={(matchId) => {
                const isUserM = career.fixtures.some((f) => f.id === matchId);
                if (!isUserM) return;
                setActiveMatchId(matchId);
                setActiveTab('MATCH_CENTRE');
              }}
              onInspectScorecard={(m) => setInspectedScorecardMatch(m)}
              onOpenMatchPreparation={(matchId) => setPrepMatchId(matchId)}
              onAdvanceToNextMatch={handleAdvanceToNextMatch}
              onOpenTourSelection={(tourId) => setSelectedTourIdForModal(tourId)}
            />
          )}

          {activeTab === 'TOURNAMENTS' && (
            <TournamentsView
              career={career || undefined}
              onSelectMatch={(matchId) => {
                if (!career?.fixtures.some((f) => f.id === matchId)) return;
                setActiveMatchId(matchId);
                setActiveTab('MATCH_CENTRE');
              }}
              onInspectScorecard={(m) => setInspectedScorecardMatch(m)}
            />
          )}

          {activeTab === 'RANKINGS' && (
            <RankingsView
              career={career || undefined}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
            />
          )}

          {activeTab === 'STATISTICS' && (
            <StatisticsView
              career={career || undefined}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
            />
          )}

          {activeTab === 'NEWS' && career && <NewsView news={career.news} />}

          {activeTab === 'CAREER_HISTORY' && career && (
            <CareerHistoryView career={career} />
          )}

          {activeTab === 'SETTINGS' && career && (
            <SettingsView
              career={career}
              onSave={handleQuickSave}
              onLoadCustomSave={(save) => {
                setCareer(save);
                setActiveMatchId(save.activeMatchId || null);
                saveCareerToStorage(save);
              }}
              onResetCareer={handleResetCareer}
              onImportPlayerDataset={handleImportPlayerDataset}
            />
          )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Pre-Match Preparation Modal */}
      {prepMatch && career && (
        <MatchPreparationModal
          career={career}
          match={prepMatch}
          onClose={() => setPrepMatchId(null)}
          onConfirmLineup={handleConfirmMatchLineup}
          onStartPreparedMatch={handleStartPreparedMatch}
        />
      )}

      {/* Global Scorecard Inspection Modal (User & AI Completed Matches) */}
      {inspectedScorecardMatch && (
        <ScorecardModal
          match={inspectedScorecardMatch}
          onClose={() => setInspectedScorecardMatch(null)}
        />
      )}

      {/* Global Player Profile Dialog Modal */}
      {selectedPlayer && (
        <PlayerProfileModal
          player={selectedPlayer}
          career={career || undefined}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      {/* Tour Selection Modal */}
      {activeTourForModal && career && (
        <TourSelectionModal
          tour={activeTourForModal}
          countryId={career.selectedTeamId}
          isOpen={true}
          onClose={() => setSelectedTourIdForModal(null)}
          onConfirm={handleConfirmTourSquad}
        />
      )}
    </div>
  );
}
