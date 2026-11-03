import React, { useState, useEffect } from 'react';
import {
  CareerSave,
  Match,
  MatchFormat,
  Player,
  BattingAggression,
  BowlingTactic,
  FieldPreset,
  FormatSquadConfig
} from './types/cricket';
import {
  MainNavigationTab,
  loadSavedCareerFromStorage,
  saveCareerToStorage,
  clearCareerStorage,
  createNewCareerSave,
  advanceToNextMatchDate,
  takeSquadRestDay,
  announceTourSquad,
  assignPlayerTrainingFocus,
  applyUserMatchResult,
  updateSquadXI,
  setFormatCaptain,
  setFormatViceCaptain,
  setFormatWicketKeeper,
} from './store/careerStore';
import { TrainingFocus } from './engine/playerDevelopmentEngine';
import { INTERNATIONAL_TEAMS } from './data/teams';
import { ALL_PLAYERS } from './data/squads';
import { TopBar } from './components/navigation/TopBar';
import { Sidebar } from './components/navigation/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { SquadView } from './components/squad/SquadView';
import { MyTeamView } from './components/team/MyTeamView';
import { DatabaseView } from './components/database/DatabaseView';
import { FixturesView } from './components/fixtures/FixturesView';
import { MatchCentreView } from './components/match/MatchCentreView';
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
} from './engine/matchEngine';

export default function App() {
  const [career, setCareer] = useState<CareerSave | null>(null);
  const [viewState, setViewState] = useState<'MAIN_MENU' | 'NEW_CAREER' | 'IN_GAME'>('MAIN_MENU');
  const [activeTab, setActiveTab] = useState<MainNavigationTab>('DASHBOARD');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTourIdForModal, setSelectedTourIdForModal] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  // Initialize or check auto-start
  useEffect(() => {
    const saved = loadSavedCareerFromStorage();
    const urlParams = new URLSearchParams(window.location.search);
    const autostart = urlParams.get('autostart') === '1';

    if (saved) {
      setCareer(saved);
      if (autostart) {
        setViewState('IN_GAME');
      }
    } else if (autostart) {
      // Auto-start with India for headless testing
      const autoCareer = createNewCareerSave('Rahul Dravid', 'IND', 'TEST', 'INTERNATIONAL', 'TACTICAL');
      setCareer(autoCareer);
      saveCareerToStorage(autoCareer);
      setViewState('IN_GAME');
    }
  }, []);

  // Quick Match from Main Menu (sets up exhibition career)
  const handleStartQuickMatch = () => {
    const quickCareer = createNewCareerSave('Head Coach', 'IND', 'T20I', 'INTERNATIONAL', 'AGGRESSIVE');
    quickCareer.saveName = 'Exhibition International Campaign';
    setCareer(quickCareer);
    saveCareerToStorage(quickCareer);
    setViewState('IN_GAME');
    setActiveTab('DASHBOARD');
  };

  // Active match resolution
  const activeMatch = career?.fixtures.find((f) => f.id === activeMatchId) || career?.fixtures[0];

  // Helper to update active match in career store
  const updateActiveMatch = (updated: Match) => {
    if (!career) return;
    if (updated.status === 'COMPLETED' || updated.status === 'DRAW' || updated.status === 'TIE') {
      const nextCareer = applyUserMatchResult(career, updated);
      setCareer(nextCareer);
      saveCareerToStorage(nextCareer);
    } else {
      const updatedFixtures = career.fixtures.map((f) => (f.id === updated.id ? updated : f));
      const nextCareer: CareerSave = {
        ...career,
        fixtures: updatedFixtures,
        savedAt: new Date().toISOString(),
      };
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

  // Match Simulation Step Handlers
  const handleSimulateBall = () => {
    if (!activeMatch) return;
    const next = stepMatchBall(activeMatch);
    updateActiveMatch(next);
  };

  const handleSimulateOver = () => {
    if (!activeMatch) return;
    const next = stepMatchOver(activeMatch);
    updateActiveMatch(next);
  };

  const handleSimulateInnings = () => {
    if (!activeMatch) return;
    const next = stepMatchInnings(activeMatch);
    updateActiveMatch(next);
  };

  const handleSimulateMatch = () => {
    if (!activeMatch) return;
    const next = simulateFullMatch(activeMatch);
    updateActiveMatch(next);
  };

  const handleDeclareInnings = () => {
    if (!activeMatch) return;
    const next = declareInnings(activeMatch);
    updateActiveMatch(next);
  };

  const handleFollowOnDecision = (enforce: boolean) => {
    if (!activeMatch) return;
    const next = {
      ...activeMatch,
      followOnEnforced: enforce,
    };
    updateActiveMatch(next);
  };

  const handleUpdateTactics = (
    battingAggression: BattingAggression,
    bowlingTactic: BowlingTactic,
    fieldPreset: FieldPreset
  ) => {
    if (!activeMatch) return;
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

  const handleStartMatchWithToss = (choice: 'BAT' | 'BOWL') => {
    if (!activeMatch) return;
    const userTeamId = career?.selectedTeamId || activeMatch.homeTeamId;
    const opponentTeamId = activeMatch.homeTeamId === userTeamId ? activeMatch.awayTeamId : activeMatch.homeTeamId;

    const userTeam = INTERNATIONAL_TEAMS.find((t) => t.id === userTeamId);
    const oppTeam = INTERNATIONAL_TEAMS.find((t) => t.id === opponentTeamId);

    const battingTeamId = choice === 'BAT' ? userTeamId : opponentTeamId;
    const battingTeamName = choice === 'BAT' ? userTeam?.name || 'Home' : oppTeam?.name || 'Away';
    const bowlingTeamId = choice === 'BAT' ? opponentTeamId : userTeamId;
    const bowlingTeamName = choice === 'BAT' ? oppTeam?.name || 'Away' : userTeam?.name || 'Home';

    const battingXI = battingTeamId === activeMatch.homeTeamId ? activeMatch.homeXI : activeMatch.awayXI;
    const bowlingXI = bowlingTeamId === activeMatch.homeTeamId ? activeMatch.homeXI : activeMatch.awayXI;

    const innings1 = createInitialInningsState(
      1,
      battingTeamId,
      battingTeamName,
      bowlingTeamId,
      bowlingTeamName,
      battingXI,
      bowlingXI
    );

    const startedMatch: Match = {
      ...activeMatch,
      status: 'IN_PROGRESS',
      tossWinnerId: userTeamId,
      tossChoice: choice,
      currentInningsIndex: 0,
      innings: [innings1],
    };

    updateActiveMatch(startedMatch);
  };

  // Format-Specific Squad Management Updates
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

  // Calendar Progression Handler
  const handleAdvanceToNextMatch = () => {
    if (!career) return;
    const nextCareer = advanceToNextMatchDate(career);
    setCareer(nextCareer);
    saveCareerToStorage(nextCareer);
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

  // RENDER: VIEW STATES
  if (viewState === 'MAIN_MENU') {
    return (
      <MainMenu
        onNewCareer={() => setViewState('NEW_CAREER')}
        onContinueCareer={() => setViewState('IN_GAME')}
        onQuickMatch={handleStartQuickMatch}
        onOpenDatabase={() => {
          handleStartQuickMatch();
          setActiveTab('PLAYER_DATABASE');
        }}
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
          setViewState('IN_GAME');
          setActiveTab('DASHBOARD');
        }}
        onCancel={() => setViewState('MAIN_MENU')}
      />
    );
  }

  return (
    <div className="flex h-screen bg-[#0b0f17] text-slate-200 overflow-hidden select-none font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        isMatchActive={activeMatch?.status === 'IN_PROGRESS'}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <TopBar
          career={career}
          onOpenSaveModal={() => setActiveTab('SETTINGS')}
          onQuickSave={handleQuickSave}
        />

        {/* Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0b0f17]">
          {activeTab === 'DASHBOARD' && career && (
            <DashboardView
              career={career}
              onNavigateToMatch={(matchId) => {
                setActiveMatchId(matchId);
                setActiveTab('MATCH_CENTRE');
              }}
              onNavigateToSquad={() => setActiveTab('SQUAD_MANAGEMENT')}
              onNavigateToNews={() => setActiveTab('NEWS')}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
              onAdvanceToNextMatch={handleAdvanceToNextMatch}
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
                setActiveMatchId(matchId);
                setActiveTab('MATCH_CENTRE');
              }}
              onOpenTourSelection={(tourId) => setSelectedTourIdForModal(tourId)}
              onUpdateSquadXI={handleUpdateSquadXI}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
            />
          )}

          {activeTab === 'RIVALRIES' && career && (
            <RivalriesView
              career={career}
              onNavigateToMatch={(matchId) => {
                setActiveMatchId(matchId);
                setActiveTab('MATCH_CENTRE');
              }}
            />
          )}

          {activeTab === 'MATCH_CENTRE' && activeMatch && (
            <MatchCentreView
              match={activeMatch}
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
            />
          )}

          {activeTab === 'FIXTURES' && career && (
            <FixturesView
              career={career}
              onSelectMatch={(matchId) => {
                setActiveMatchId(matchId);
                setActiveTab('MATCH_CENTRE');
              }}
              onAdvanceToNextMatch={handleAdvanceToNextMatch}
              onOpenTourSelection={(tourId) => setSelectedTourIdForModal(tourId)}
            />
          )}

          {activeTab === 'PLAYER_DATABASE' && (
            <DatabaseView onSelectPlayer={(p) => setSelectedPlayer(p)} />
          )}

          {activeTab === 'TOURNAMENTS' && (
            <TournamentsView
              career={career || undefined}
              onSelectMatch={(matchId) => {
                setActiveMatchId(matchId);
                setActiveTab('MATCH_CENTRE');
              }}
            />
          )}

          {activeTab === 'RANKINGS' && (
            <RankingsView onSelectPlayer={(p) => setSelectedPlayer(p)} />
          )}

          {activeTab === 'STATISTICS' && (
            <StatisticsView onSelectPlayer={(p) => setSelectedPlayer(p)} />
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
                saveCareerToStorage(save);
              }}
              onResetCareer={handleResetCareer}
              onImportPlayerDataset={handleImportPlayerDataset}
            />
          )}
        </main>
      </div>

      {/* Global Player Profile Dialog Modal */}
      {selectedPlayer && (
        <PlayerProfileModal
          player={selectedPlayer}
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
