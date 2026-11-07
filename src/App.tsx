import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Home, Compass, ChevronRight } from 'lucide-react';
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
  TourFormatSquadAnnouncement,
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
import { ALL_PLAYERS, getDefaultPlayingXI, getDefaultWicketKeeperId, getDefaultCaptainId, getEffectivePlayer } from './data/squads';
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
  getPlayerById,
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

const UI_VIEW_STATE_STORAGE_KEY = 'icm_ui_view_state';
const UI_ACTIVE_TAB_STORAGE_KEY = 'icm_ui_active_tab';

const TAB_LABELS: Record<MainNavigationTab, string> = {
  DASHBOARD: 'Dashboard',
  MY_TEAM: 'National Team',
  SQUAD_MANAGEMENT: 'Squad & Pool',
  TEAM_SELECTION: 'Lineup Builder',
  PLAYER_DEVELOPMENT: 'Training & Fitness',
  TACTICS: 'Team Tactics',
  PLAYERS: 'Player Database',
  MATCH_CENTRE: 'Match Centre',
  FIXTURES: 'Fixtures & Calendar',
  TOURS: 'Tour Hub',
  RIVALRIES: 'Historic Rivalries',
  TOURNAMENTS: 'ICC Tournaments',
  RANKINGS: 'ICC Rankings',
  STATISTICS: 'Career Statistics',
  NEWS: 'Media & Press',
  CAREER_HISTORY: 'Coach Profile',
  SETTINGS: 'Settings',
};

const RELATED_TABS_MAP: Record<MainNavigationTab, MainNavigationTab[]> = {
  DASHBOARD: ['MATCH_CENTRE', 'SQUAD_MANAGEMENT', 'TOURS', 'FIXTURES'],
  MY_TEAM: ['SQUAD_MANAGEMENT', 'TEAM_SELECTION', 'PLAYER_DEVELOPMENT', 'TACTICS'],
  SQUAD_MANAGEMENT: ['TEAM_SELECTION', 'TOURS', 'PLAYER_DEVELOPMENT', 'PLAYERS'],
  TEAM_SELECTION: ['SQUAD_MANAGEMENT', 'TACTICS', 'MATCH_CENTRE', 'FIXTURES'],
  PLAYER_DEVELOPMENT: ['SQUAD_MANAGEMENT', 'MY_TEAM', 'PLAYERS', 'FIXTURES'],
  TACTICS: ['TEAM_SELECTION', 'SQUAD_MANAGEMENT', 'MATCH_CENTRE', 'MY_TEAM'],
  PLAYERS: ['SQUAD_MANAGEMENT', 'RANKINGS', 'STATISTICS', 'PLAYER_DEVELOPMENT'],
  MATCH_CENTRE: ['TEAM_SELECTION', 'TACTICS', 'FIXTURES', 'TOURS'],
  FIXTURES: ['MATCH_CENTRE', 'TOURS', 'TOURNAMENTS', 'SQUAD_MANAGEMENT'],
  TOURS: ['SQUAD_MANAGEMENT', 'FIXTURES', 'MATCH_CENTRE', 'RIVALRIES'],
  RIVALRIES: ['TOURS', 'FIXTURES', 'RANKINGS', 'STATISTICS'],
  TOURNAMENTS: ['FIXTURES', 'RANKINGS', 'STATISTICS', 'TOURS'],
  RANKINGS: ['STATISTICS', 'TOURNAMENTS', 'PLAYERS', 'RIVALRIES'],
  STATISTICS: ['RANKINGS', 'PLAYERS', 'CAREER_HISTORY', 'TOURNAMENTS'],
  NEWS: ['DASHBOARD', 'FIXTURES', 'TOURS', 'RANKINGS'],
  CAREER_HISTORY: ['MY_TEAM', 'STATISTICS', 'RANKINGS', 'SETTINGS'],
  SETTINGS: ['DASHBOARD', 'CAREER_HISTORY', 'MY_TEAM'],
};

const VALID_TABS = new Set<MainNavigationTab>(Object.keys(TAB_LABELS) as MainNavigationTab[]);

export default function App() {
  const [career, setCareer] = useState<CareerSave | null>(() => loadSavedCareerFromStorage());
  const [viewState, setViewState] = useState<'MAIN_MENU' | 'NEW_CAREER' | 'IN_GAME'>(() => {
    const savedCareer = loadSavedCareerFromStorage();
    const storedView = localStorage.getItem(UI_VIEW_STATE_STORAGE_KEY);
    if (savedCareer && storedView !== 'MAIN_MENU' && storedView !== 'NEW_CAREER') {
      return 'IN_GAME';
    }
    if (storedView === 'NEW_CAREER') {
      return 'NEW_CAREER';
    }
    return 'MAIN_MENU';
  });
  const [activeTab, setActiveTab] = useState<MainNavigationTab>(() => {
    const storedTab = localStorage.getItem(UI_ACTIVE_TAB_STORAGE_KEY) as MainNavigationTab | null;
    if (storedTab && VALID_TABS.has(storedTab)) {
      return storedTab;
    }
    return 'DASHBOARD';
  });
  const [tabHistory, setTabHistory] = useState<MainNavigationTab[]>([]);
  const [isSidebarDrawerOpen, setIsSidebarDrawerOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTourIdForModal, setSelectedTourIdForModal] = useState<string | null>(null);
  const [selectedTourInitialFormat, setSelectedTourInitialFormat] = useState<MatchFormat | undefined>(undefined);
  const [prepMatchId, setPrepMatchId] = useState<string | null>(null);
  const [inspectedScorecardMatch, setInspectedScorecardMatch] = useState<Match | null>(null);
  const [calendarAlert, setCalendarAlert] = useState<CalendarAdvancementResult | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(() => {
    const savedCareer = loadSavedCareerFromStorage();
    return savedCareer?.activeMatchId || null;
  });

  const navigateToTab = useCallback(
    (nextTab: MainNavigationTab) => {
      setIsSidebarDrawerOpen(false);
      setActiveTab((prevTab) => {
        if (prevTab !== nextTab) {
          setTabHistory((hist) => [...hist.slice(-14), prevTab]);
        }
        return nextTab;
      });
    },
    []
  );

  const handleGoBackTab = useCallback(() => {
    setIsSidebarDrawerOpen(false);
    setTabHistory((hist) => {
      if (hist.length === 0) {
        setActiveTab('DASHBOARD');
        return hist;
      }
      const nextHist = [...hist];
      const previous = nextHist.pop() || 'DASHBOARD';
      setActiveTab(previous);
      return nextHist;
    });
  }, []);

  // Persist current viewState and activeTab across browser refreshes
  useEffect(() => {
    try {
      localStorage.setItem(UI_VIEW_STATE_STORAGE_KEY, viewState);
    } catch {
      // Ignore storage quota issues
    }
  }, [viewState]);

  useEffect(() => {
    try {
      localStorage.setItem(UI_ACTIVE_TAB_STORAGE_KEY, activeTab);
    } catch {
      // Ignore storage quota issues
    }
  }, [activeTab]);

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
    } else if (!saved && viewState === 'IN_GAME') {
      setViewState('MAIN_MENU');
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
    // Prevent mid-over bowler changes — only allow changing bowler at the start of a new over
    if ((currentInn.ballsInCurrentOver || 0) > 0) return;
    const candidate = getEffectivePlayer(bowlerId, career || undefined) || getPlayerById(bowlerId);
    // Never allow specialist batters or wicketkeepers to bowl
    if (
      !candidate ||
      (candidate.role !== 'BOWLER' && candidate.role !== 'ALL_ROUNDER')
    ) {
      return;
    }
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

    const filterEligibleBowlers = (xiIds: string[], wkId: string | undefined, preferred?: string[]) => {
      const genuine = xiIds.filter((id) => {
        if (id === wkId) return false;
        const p = getEffectivePlayer(id, workingCareer) || getPlayerById(id);
        return p?.role === 'BOWLER' || p?.role === 'ALL_ROUNDER';
      });
      if (preferred && preferred.length > 0) {
        const nom = genuine.filter((id) => preferred.includes(id));
        if (nom.length > 0) return nom;
      }
      return genuine;
    };

    const finalHomeXI = freshMatch.homeTeamId === battingTeamId ? battingXI : bowlingXI;
    const finalAwayXI = freshMatch.awayTeamId === battingTeamId ? battingXI : bowlingXI;

    const finalHomeWkId =
      freshMatch.homeTeamId === bowlingTeamId
        ? bowlingWkId
        : freshMatch.homeWicketKeeperId ||
          getDefaultWicketKeeperId(freshMatch.homeTeamId, freshMatch.format);
    const finalAwayWkId =
      freshMatch.awayTeamId === bowlingTeamId
        ? bowlingWkId
        : freshMatch.awayWicketKeeperId ||
          getDefaultWicketKeeperId(freshMatch.awayTeamId, freshMatch.format);

    const userSavedRotation = workingCareer.formatSquads[freshMatch.format]?.bowlingRotation;
    const finalHomeBowlingOptions = filterEligibleBowlers(
      finalHomeXI,
      finalHomeWkId,
      freshMatch.homeBowlingOptions && freshMatch.homeBowlingOptions.length > 0
        ? freshMatch.homeBowlingOptions
        : freshMatch.homeTeamId === userTeamId
        ? userSavedRotation
        : undefined
    );
    const finalAwayBowlingOptions = filterEligibleBowlers(
      finalAwayXI,
      finalAwayWkId,
      freshMatch.awayBowlingOptions && freshMatch.awayBowlingOptions.length > 0
        ? freshMatch.awayBowlingOptions
        : freshMatch.awayTeamId === userTeamId
        ? userSavedRotation
        : undefined
    );

    const bowlingOptions =
      bowlingTeamId === freshMatch.homeTeamId ? finalHomeBowlingOptions : finalAwayBowlingOptions;

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
      homeWicketKeeperId: finalHomeWkId,
      awayWicketKeeperId: finalAwayWkId,
      homeBowlingOptions: finalHomeBowlingOptions,
      awayBowlingOptions: finalAwayBowlingOptions,
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
    navigateToTab('MATCH_CENTRE');
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
  const handleConfirmTourSquad = (
    tourId: string,
    squadData: string[] | TourFormatSquadAnnouncement
  ) => {
    if (!career) return;
    const nextCareer = announceTourSquad(career, tourId, squadData);
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

  const isSidebarHidden = activeTab !== 'DASHBOARD';
  const previousTab = tabHistory.length > 0 ? tabHistory[tabHistory.length - 1] : 'DASHBOARD';
  const relatedTabs = RELATED_TABS_MAP[activeTab] || [];

  const handleMarkNotificationRead = (notificationId: string) => {
    if (!career) return;
    const updatedNews = career.news.map((n) =>
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    const nextCareer: CareerSave = {
      ...career,
      news: updatedNews,
      savedAt: new Date().toISOString(),
    };
    setCareer(nextCareer);
    saveCareerToStorage(nextCareer);
  };

  return (
    <div className="flex h-screen bg-[#000000] text-[#e8edf2] overflow-hidden select-none font-sans relative">
      {/* Dugout SVG Pitch Background underlay */}
      <PitchBackground />

      {/* Sidebar Navigation — Auto-disappears when entering any section outside Dashboard */}
      {!isSidebarHidden && (
        <Sidebar
          activeTab={activeTab}
          onSelectTab={navigateToTab}
          isMatchActive={activeMatch?.status === 'IN_PROGRESS'}
          isMatchReady={career?.fixtures.some((f) => f.date === career.currentDate && f.status !== 'COMPLETED')}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          selectedTeam={career ? INTERNATIONAL_TEAMS.find((t) => t.id === career.selectedTeamId) : undefined}
        />
      )}

      {/* Slide-Over Sidebar Drawer when inside a section and user clicks Menu */}
      {isSidebarHidden && isSidebarDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setIsSidebarDrawerOpen(false)}
          />
          <div className="relative z-10 h-full shadow-2xl">
            <Sidebar
              activeTab={activeTab}
              onSelectTab={navigateToTab}
              isMatchActive={activeMatch?.status === 'IN_PROGRESS'}
              isMatchReady={career?.fixtures.some((f) => f.date === career.currentDate && f.status !== 'COMPLETED')}
              isCollapsed={false}
              onToggleCollapse={() => setIsSidebarDrawerOpen(false)}
              selectedTeam={career ? INTERNATIONAL_TEAMS.find((t) => t.id === career.selectedTeamId) : undefined}
            />
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Top Header */}
        <TopBar
          career={career}
          onOpenSaveModal={() => navigateToTab('SETTINGS')}
          onQuickSave={handleQuickSave}
          onSelectTab={navigateToTab}
          onMarkNotificationRead={handleMarkNotificationRead}
          isSidebarHidden={isSidebarHidden}
          isSidebarDrawerOpen={isSidebarDrawerOpen}
          onToggleSidebarDrawer={() => setIsSidebarDrawerOpen((prev) => !prev)}
        />

        {/* Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#000000]/60 backdrop-blur-[1px]">
          {activeTab !== 'DASHBOARD' && (
            <div className="mb-4 bg-[#070a0e]/95 border border-[#1e2733] rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5 shadow-md">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleGoBackTab}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10151c] hover:bg-[#1a222d] border border-[#1e2733] hover:border-[#e2b64a]/50 text-xs font-bold text-white transition-all cursor-pointer"
                  title={`Back to ${TAB_LABELS[previousTab]}`}
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#e2b64a]" />
                  <span>Back</span>
                </button>

                <button
                  onClick={() => navigateToTab('DASHBOARD')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#10151c]/70 hover:bg-[#1a222d] border border-[#1e2733] text-xs font-semibold text-[#c3ccd6] hover:text-white transition-all cursor-pointer"
                  title="Dashboard"
                >
                  <Home className="w-3.5 h-3.5 text-[#3fca86]" />
                  <span>Dashboard</span>
                </button>

                <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#8b97a3]">
                  <ChevronRight className="w-3.5 h-3.5 text-[#33404f]" />
                  <span className="px-2.5 py-1 rounded-md bg-[#e2b64a]/15 border border-[#e2b64a]/35 text-[#ffe9a8] font-bold">
                    {TAB_LABELS[activeTab]}
                  </span>
                </div>
              </div>

              {relatedTabs.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {relatedTabs.map((relTab) => (
                    <button
                      key={relTab}
                      onClick={() => navigateToTab(relTab)}
                      className="px-2.5 py-1 rounded-lg bg-[#10151c] hover:bg-[#e2b64a]/15 border border-[#1e2733] hover:border-[#e2b64a]/45 text-xs font-semibold text-[#c3ccd6] hover:text-[#ffe9a8] transition-all cursor-pointer"
                    >
                      {TAB_LABELS[relTab]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <ErrorBoundary onReset={() => navigateToTab('DASHBOARD')}>
            {activeTab === 'DASHBOARD' && career && (
            <DashboardView
              career={career}
              calendarAlert={calendarAlert}
              onDismissCalendarAlert={() => setCalendarAlert(null)}
              onNavigateToMatch={(matchId) => {
                setActiveMatchId(matchId);
                navigateToTab('MATCH_CENTRE');
              }}
              onOpenMatchPreparation={(matchId) => setPrepMatchId(matchId)}
              onInspectScorecard={(m) => setInspectedScorecardMatch(m)}
              onNavigateToSquad={() => navigateToTab('SQUAD_MANAGEMENT')}
              onNavigateToNews={() => navigateToTab('NEWS')}
              onNavigateToTournaments={() => navigateToTab('TOURNAMENTS')}
              onNavigateToRankings={() => navigateToTab('RANKINGS')}
              onNavigateToFixtures={() => navigateToTab('FIXTURES')}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
              onAdvanceCalendar={handleAdvanceCalendar}
              onRestSquadDay={handleRestSquadDay}
              onOpenTourSelection={(tourId) => {
                setSelectedTourInitialFormat(undefined);
                setSelectedTourIdForModal(tourId);
              }}
            />
          )}

          {activeTab === 'MY_TEAM' && career && (
            <MyTeamView
              career={career}
              onNavigateToSquad={() => navigateToTab('SQUAD_MANAGEMENT')}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
              onOpenTourSelection={(tourId) => {
                setSelectedTourInitialFormat(undefined);
                setSelectedTourIdForModal(tourId);
              }}
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
              onOpenTourSelection={(tourId) => {
                setSelectedTourInitialFormat(undefined);
                setSelectedTourIdForModal(tourId);
              }}
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
              onOpenTourSelection={(tourId) => {
                setSelectedTourInitialFormat(undefined);
                setSelectedTourIdForModal(tourId);
              }}
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
                navigateToTab('MATCH_CENTRE');
              }}
              onInspectScorecard={(m) => setInspectedScorecardMatch(m)}
              onOpenTourSelection={(tourId, fmt) => {
                setSelectedTourIdForModal(tourId);
                setSelectedTourInitialFormat(fmt);
              }}
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
                navigateToTab('MATCH_CENTRE');
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
                navigateToTab('DASHBOARD');
              }}
              onPrepareNextMatch={(nextMatchId) => {
                setActiveMatchId(nextMatchId);
                setPrepMatchId(nextMatchId);
                navigateToTab('DASHBOARD');
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
                onClick={() => navigateToTab('DASHBOARD')}
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
                navigateToTab('MATCH_CENTRE');
              }}
              onInspectScorecard={(m) => setInspectedScorecardMatch(m)}
              onOpenMatchPreparation={(matchId) => setPrepMatchId(matchId)}
              onAdvanceToNextMatch={handleAdvanceToNextMatch}
              onOpenTourSelection={(tourId) => {
                setSelectedTourInitialFormat(undefined);
                setSelectedTourIdForModal(tourId);
              }}
            />
          )}

          {activeTab === 'TOURNAMENTS' && (
            <TournamentsView
              career={career || undefined}
              onSelectMatch={(matchId) => {
                if (!career?.fixtures.some((f) => f.id === matchId)) return;
                setActiveMatchId(matchId);
                navigateToTab('MATCH_CENTRE');
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
          onOpenTourSelection={(tourId, fmt) => {
            setSelectedTourIdForModal(tourId);
            setSelectedTourInitialFormat(fmt);
          }}
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
          career={career}
          initialFormat={selectedTourInitialFormat}
          isOpen={true}
          onClose={() => {
            setSelectedTourIdForModal(null);
            setSelectedTourInitialFormat(undefined);
          }}
          onConfirm={handleConfirmTourSquad}
        />
      )}
    </div>
  );
}
