import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  FastForward,
  SkipForward,
  Shield,
  Zap,
  Award,
  FileText,
  Activity,
  Wind,
  Layers,
  ChevronRight,
  Flame,
  CheckCircle,
  Coins,
  Clock,
  Flag,
  AlertCircle,
  Users,
} from 'lucide-react';
import {
  CareerSave,
  Match,
  MatchFormat,
  BattingAggression,
  BowlingTactic,
  FieldPreset,
  Player
} from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { ALL_PLAYERS, getEffectivePlayer } from '../../data/squads';
import { ScorecardModal } from './ScorecardModal';
import { PostMatchSummaryView } from './PostMatchSummaryView';
import {
  getPlayerById,
  isPreMatchStatus,
  isTerminalMatchStatus,
  getRemainingOversInTestMatch,
  getDeclarationStrategicContext,
} from '../../engine/matchEngine';
import {
  getPowerplayPhase,
  getMaxOversPerBowler,
  getMaxOversPerInnings,
  getEffectiveMaxOversForBowler,
} from '../../engine/rules';
import { DLS_SUPPORT_STATUS } from '../../engine/whiteBallEngine';

interface MatchCentreViewProps {
  match: Match;
  career?: CareerSave;
  onSimulateBall: () => void;
  onSimulateOver: () => void;
  onSimulateInnings: () => void;
  onSimulateMatch: () => void;
  onUpdateTactics: (aggression: BattingAggression, bowlingTactic: BowlingTactic, fieldPreset: FieldPreset) => void;
  onChangeBowler: (bowlerId: string) => void;
  onStartMatchWithToss: (choice: 'BAT' | 'BOWL') => void;
  onSelectPlayer: (player: Player) => void;
  onDeclareInnings?: () => void;
  onFollowOnDecision?: (enforce: boolean) => void;
  onTakeNewBall?: () => void;
  onContinueToDashboard?: () => void;
  onPrepareNextMatch?: (nextMatchId: string) => void;
  onOpenMatchPreparation?: (matchId: string) => void;
}

export const MatchCentreView: React.FC<MatchCentreViewProps> = ({
  match,
  career,
  onSimulateBall,
  onSimulateOver,
  onSimulateInnings,
  onSimulateMatch,
  onUpdateTactics,
  onChangeBowler,
  onStartMatchWithToss,
  onSelectPlayer,
  onDeclareInnings,
  onFollowOnDecision,
  onTakeNewBall,
  onContinueToDashboard,
  onPrepareNextMatch,
  onOpenMatchPreparation,
}) => {
  const [showScorecard, setShowScorecard] = useState(false);
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const commentaryScrollRef = useRef<HTMLDivElement | null>(null);

  const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.homeTeamId);
  const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.awayTeamId);

  const currentInnings = match.innings[match.currentInningsIndex] || match.innings[0];
  const isMatchFinished = isTerminalMatchStatus(match.status);
  const needsUserFollowOnChoice =
    match.format === 'TEST' &&
    (match.awaitingFollowOnDecision ||
      (match.isFollowOnEligible && match.followOnEnforced === undefined)) &&
    match.innings[0]?.battingTeamId === match.userTeamId;

  // Auto-play loop for smooth broadcast simulation
  useEffect(() => {
    if (isAutoPlaying && !isMatchFinished && !needsUserFollowOnChoice) {
      autoPlayTimerRef.current = setInterval(() => {
        onSimulateBall();
      }, 700);
    } else {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    }
    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isAutoPlaying, isMatchFinished, needsUserFollowOnChoice, onSimulateBall]);

  // Stop autoplay if match completed or user captaincy prompt requires input
  useEffect(() => {
    if (isMatchFinished || needsUserFollowOnChoice) {
      setIsAutoPlaying(false);
    }
  }, [isMatchFinished, needsUserFollowOnChoice]);

  // Auto-scroll commentary to newest ball
  useEffect(() => {
    if (commentaryScrollRef.current) {
      commentaryScrollRef.current.scrollTop = 0;
    }
  }, [currentInnings?.recentBalls]);

  // Striker and Non-Striker
  const striker = currentInnings?.batters.find((b) => b.isCurrentStriker);
  const nonStriker = currentInnings?.batters.find((b) => b.isCurrentNonStriker);

  // Active bowler
  const foundBowler = currentInnings?.bowlers.find((b) => b.playerId === currentInnings?.currentBowlerId);
  const currentBowlerPlayer = currentInnings?.currentBowlerId ? getPlayerById(currentInnings.currentBowlerId) : null;
  const activeBowler = foundBowler || (currentBowlerPlayer ? {
    playerId: currentBowlerPlayer.id,
    playerName: currentBowlerPlayer.shortName,
    overs: 0,
    ballsThisOver: 0,
    maidens: 0,
    runs: 0,
    wickets: 0,
    economy: 0,
    wides: 0,
    noBalls: 0,
    dots: 0,
  } : null);

  // Bowling team XI for bowler change dropdown
  const bowlingXI = currentInnings
    ? (currentInnings.bowlingTeamId === match.homeTeamId ? match.homeXI : match.awayXI)
    : [];

  const isUserBatting = currentInnings?.battingTeamId === match.userTeamId;
  const isUserBowling = currentInnings?.bowlingTeamId === match.userTeamId;

  // Allocated overs & Run Rate calculation
  const allocatedInningsOvers =
    match.format !== 'TEST'
      ? getMaxOversPerInnings(
          match.format,
          currentInnings?.allocatedOvers ?? match.allocatedOversPerInnings
        )
      : Infinity;
  const maxBallsInInnings =
    match.format !== 'TEST' && Number.isFinite(allocatedInningsOvers)
      ? allocatedInningsOvers * 6
      : 0;

  const totalBallsBowled = currentInnings
    ? currentInnings.completedOvers * 6 + currentInnings.ballsInCurrentOver
    : 0;
  const currentRunRate =
    totalBallsBowled > 0 ? ((currentInnings!.totalRuns / totalBallsBowled) * 6).toFixed(2) : '0.00';

  // Required Run Rate (if chasing in limited overs)
  let requiredRunRate: string | null = null;
  const whiteBallBallsRemaining =
    match.format !== 'TEST' ? Math.max(0, maxBallsInInnings - totalBallsBowled) : 0;
  if (currentInnings?.targetRuns && match.format !== 'TEST') {
    const runsNeeded = currentInnings.targetRuns - currentInnings.totalRuns;
    if (whiteBallBallsRemaining > 0 && runsNeeded > 0) {
      requiredRunRate = ((runsNeeded / whiteBallBallsRemaining) * 6).toFixed(2);
    } else {
      requiredRunRate = runsNeeded <= 0 ? '0.00' : '99.9';
    }
  }

  // Powerplay phase for white ball (handles shortened overs as well)
  const ppInfo = currentInnings
    ? getPowerplayPhase(
        match.format,
        currentInnings.completedOvers,
        currentInnings.allocatedOvers ?? match.allocatedOversPerInnings
      )
    : null;

  // Maximum quota per bowler (handles ICC shortened-innings dynamic distribution)
  const bowlingWkId =
    currentInnings?.bowlingTeamId === match.homeTeamId
      ? match.homeWicketKeeperId
      : match.awayWicketKeeperId;
  const maxOversPerBowler = getMaxOversPerBowler(
    match.format,
    currentInnings?.allocatedOvers ?? match.allocatedOversPerInnings
  );

  // Filter eligible bowlers for user bowling change (prevent consecutive overs & wicketkeeper bowling)
  const availableBowlersForChange = bowlingXI.map((id) => {
    const p = getPlayerById(id);
    const figures = currentInnings?.bowlers.find((b) => b.playerId === id);
    const oversBowled = figures ? figures.overs : 0;
    const effectiveQuota =
      match.format !== 'TEST'
        ? getEffectiveMaxOversForBowler(
            match.format,
            id,
            currentInnings?.bowlers || [],
            currentInnings?.allocatedOvers ?? match.allocatedOversPerInnings
          )
        : Infinity;
    const isExhausted = oversBowled >= effectiveQuota;
    const isCurrent = id === currentInnings?.currentBowlerId;
    const bowledJustCompletedOver =
      currentInnings?.ballsInCurrentOver === 0 && id === currentInnings?.lastCompletedOverBowlerId;
    const isWk = id === bowlingWkId;
    return {
      player: p,
      oversBowled,
      effectiveQuota,
      isExhausted,
      isCurrent,
      bowledJustCompletedOver,
      isWk,
    };
  });
  const activeBowlerEffectiveQuota =
    activeBowler && match.format !== 'TEST'
      ? getEffectiveMaxOversForBowler(
          match.format,
          activeBowler.playerId,
          currentInnings?.bowlers || [],
          currentInnings?.allocatedOvers ?? match.allocatedOversPerInnings
        )
      : maxOversPerBowler;

  // Current partnership runs & balls
  const prevWktScore =
    currentInnings && currentInnings.fallOfWickets.length > 0
      ? currentInnings.fallOfWickets[currentInnings.fallOfWickets.length - 1].score
      : 0;
  const currentPartnershipRuns = currentInnings ? Math.max(0, currentInnings.totalRuns - prevWktScore) : 0;
  const totalFacedInningsBalls = currentInnings
    ? currentInnings.batters.reduce((s, b) => s + b.balls, 0)
    : 0;
  const currentPartnershipBalls = currentInnings
    ? Math.max(0, totalFacedInningsBalls - (currentInnings.lastWicketLegalBalls || 0))
    : 0;

  const testOversRemaining = match.format === 'TEST' ? getRemainingOversInTestMatch(match) : 0;
  const declarationContext =
    match.format === 'TEST' && showDeclareModal ? getDeclarationStrategicContext(match) : null;

  // Dedicated Post-Match Completion Screen when match ends (Phase 5)
  if (isMatchFinished) {
    return (
      <PostMatchSummaryView
        match={match}
        career={career}
        onContinueToDashboard={() => onContinueToDashboard && onContinueToDashboard()}
        onPrepareNextMatch={(nextId) => onPrepareNextMatch && onPrepareNextMatch(nextId)}
        onSelectPlayer={onSelectPlayer}
      />
    );
  }

  // Coin Toss View if match not yet started
  if (isPreMatchStatus(match.status)) {
    return (
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-6 sm:p-10 max-w-2xl mx-auto my-8 text-center select-none shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/50 flex items-center justify-center mx-auto mb-4 text-amber-400">
          <Coins className="w-8 h-8" />
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800/40">
            {match.format} International
          </span>
          {match.lineupConfirmed && (
            <span className="text-xs font-bold uppercase tracking-wider text-sky-300 bg-sky-950/80 px-2.5 py-1 rounded border border-sky-800/40">
              Lineup READY
            </span>
          )}
        </div>

        <h2 className="text-2xl font-black text-white mt-3">The Coin Toss & Match Debut</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          {match.venue} • Pitch: <span className="text-emerald-400 font-medium">{match.pitch.name}</span> • Weather: <span className="text-amber-300 font-medium">{match.weather.type.replace('_', ' ')}</span>
        </p>

        <div className="my-8 bg-[#182234] border border-[#243247] p-5 rounded-lg flex items-center justify-around">
          <div className="text-center">
            <span className="text-4xl block mb-2">{homeTeam?.flagEmoji}</span>
            <h4 className="font-bold text-sm text-white">{homeTeam?.name}</h4>
            <span className="text-[10px] text-slate-400 font-mono">
              Captain: {(getEffectivePlayer(match.homeCaptainId, career) || getPlayerById(match.homeCaptainId)).shortName}
            </span>
          </div>

          <span className="text-xs font-mono font-bold text-slate-400 bg-[#0d131f] px-3 py-1 rounded border border-[#243247]">
            VS
          </span>

          <div className="text-center">
            <span className="text-4xl block mb-2">{awayTeam?.flagEmoji}</span>
            <h4 className="font-bold text-sm text-white">{awayTeam?.name}</h4>
            <span className="text-[10px] text-slate-400 font-mono">
              Captain: {(getEffectivePlayer(match.awayCaptainId, career) || getPlayerById(match.awayCaptainId)).shortName}
            </span>
          </div>
        </div>

        {/* Confirmed Playing XIs Preview */}
        <div className="mb-6 bg-[#0e141f] border border-[#1f293d] rounded-lg p-3 text-left">
          <div className="flex items-center justify-between border-b border-[#1f293d] pb-2 mb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Confirmed Match Lineups</span>
            </span>
            {onOpenMatchPreparation ? (
              <button
                onClick={() => onOpenMatchPreparation(match.id)}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
              >
                Adjust Playing XI &amp; Prep
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono">11 Players per side</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[11px] font-bold text-emerald-400 mb-1 flex items-center justify-between">
                <span>{homeTeam?.name} XI</span>
                <span className="text-[10px] text-slate-500 font-mono font-normal">Batting Order</span>
              </div>
              <div className="space-y-0.5">
                {(match.homeXI || []).map((id, idx) => {
                  const p = getEffectivePlayer(id, career) || getPlayerById(id);
                  const isC = id === match.homeCaptainId;
                  const isWk = id === match.homeWicketKeeperId;
                  return (
                    <div key={id} className="text-[11px] text-slate-300 flex items-center justify-between py-0.5 border-b border-[#182234]">
                      <span className="truncate">
                        <span className="text-slate-500 font-mono mr-1">{idx + 1}.</span>
                        {p.shortName}
                        {isC && <span className="ml-1 text-[9px] bg-amber-950 text-amber-300 px-1 rounded font-bold">C</span>}
                        {isWk && <span className="ml-1 text-[9px] bg-sky-950 text-sky-300 px-1 rounded font-bold">WK</span>}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">{p.role.replace('_', ' ')}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                <span>{awayTeam?.name} XI</span>
                <span className="text-[10px] text-slate-500 font-mono font-normal">Batting Order</span>
              </div>
              <div className="space-y-0.5">
                {(match.awayXI || []).map((id, idx) => {
                  const p = getEffectivePlayer(id, career) || getPlayerById(id);
                  const isC = id === match.awayCaptainId;
                  const isWk = id === match.awayWicketKeeperId;
                  return (
                    <div key={id} className="text-[11px] text-slate-300 flex items-center justify-between py-0.5 border-b border-[#182234]">
                      <span className="truncate">
                        <span className="text-slate-500 font-mono mr-1">{idx + 1}.</span>
                        {p.shortName}
                        {isC && <span className="ml-1 text-[9px] bg-amber-950 text-amber-300 px-1 rounded font-bold">C</span>}
                        {isWk && <span className="ml-1 text-[9px] bg-sky-950 text-sky-300 px-1 rounded font-bold">WK</span>}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">{p.role.replace('_', ' ')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-300 font-medium">
            As Captain, you have won the toss! Choose your match strategy:
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => onStartMatchWithToss('BAT')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-2.5 rounded shadow cursor-pointer transition active:scale-95 flex items-center space-x-2"
            >
              <span>Bat First</span>
            </button>
            <button
              onClick={() => onStartMatchWithToss('BOWL')}
              className="bg-[#243247] hover:bg-[#334155] text-white font-bold text-xs px-6 py-2.5 rounded border border-[#3b4d6a] shadow cursor-pointer transition active:scale-95 flex items-center space-x-2"
            >
              <span>Bowl First</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Session name in Test cricket
  const sessionLabel =
    match.sessionNumber === 1
      ? 'Morning Session'
      : match.sessionNumber === 2
      ? 'Afternoon Session'
      : 'Evening Session';

  return (
    <div className="space-y-4 select-none animate-in fade-in duration-150">
      {/* 1. Broadcast Match Header */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1f293d] gap-2">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded font-mono">
              {match.format}
            </span>

            {/* Test Cricket Day & Session HUD */}
            {match.format === 'TEST' && (
              <>
                <span className="text-xs font-bold bg-[#182234] text-amber-300 border border-amber-800/40 px-2 py-0.5 rounded font-mono flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    Day {match.dayNumber}/5 • {sessionLabel} ({match.oversBowledToday || 0}/{match.oversPerDay || 90} Ov)
                  </span>
                </span>
                <span className="text-[11px] font-bold bg-[#182234] text-sky-300 border border-sky-800/40 px-2 py-0.5 rounded font-mono">
                  ~{testOversRemaining} Ov Remaining
                </span>
                {match.sessionBreakStatus && (
                  <span className="text-[11px] font-black bg-amber-950 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded font-mono uppercase">
                    {match.sessionBreakStatus.replace('_', ' ')}
                  </span>
                )}
              </>
            )}

            {/* White-ball Powerplay & Free Hit HUD */}
            {ppInfo && ppInfo.phase !== 'NONE' && (
              <span className="text-[11px] font-bold bg-blue-950 text-blue-300 border border-blue-800/40 px-2 py-0.5 rounded font-mono">
                {ppInfo.description}
              </span>
            )}
            {match.format !== 'TEST' && currentInnings?.isFreeHit && (
              <span className="text-[11px] font-black uppercase tracking-wider bg-rose-600 text-white px-2.5 py-0.5 rounded font-mono animate-pulse shadow">
                FREE HIT!
              </span>
            )}
            {match.tossWinnerId && (
              <span className="text-[11px] font-mono text-slate-400 bg-[#182234] px-2 py-0.5 rounded border border-[#243247] hidden md:inline">
                Toss: {match.tossWinnerId} chose to {match.tossChoice || 'BAT'}
              </span>
            )}

            <span className="text-xs text-slate-300 font-medium">
              {match.seriesName || 'International Bilateral Series'}
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-xs text-slate-400 hidden sm:inline">{match.venue}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowScorecard(true)}
              className="flex items-center space-x-1.5 text-xs bg-[#182234] hover:bg-[#243247] text-slate-200 border border-[#243247] px-3 py-1.5 rounded transition cursor-pointer font-medium"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full Scorecard</span>
            </button>
          </div>
        </div>

        {/* Live Score Display Banner */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Main Batting Team Score (7 cols) */}
          <div className="md:col-span-7 flex items-center space-x-4">
            <div className="w-14 h-14 rounded-lg bg-[#182234] border border-[#243247] flex items-center justify-center text-3xl shadow">
              {currentInnings?.battingTeamId === homeTeam?.id ? homeTeam?.flagEmoji : awayTeam?.flagEmoji}
            </div>

            <div>
              <div className="flex items-baseline space-x-3">
                <h2 className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                  {currentInnings?.totalRuns}/{currentInnings?.wickets}
                </h2>
                <span className="text-base sm:text-lg font-mono text-slate-400 font-bold">
                  ({currentInnings?.completedOvers}.{currentInnings?.ballsInCurrentOver}
                  {match.format !== 'TEST' && Number.isFinite(allocatedInningsOvers)
                    ? `/${allocatedInningsOvers}`
                    : ''}{' '}
                  ov)
                </span>
                {currentInnings?.isDeclared && (
                  <span className="text-xs bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded font-bold font-mono">
                    d
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-3 text-xs mt-1">
                <span className="font-bold text-emerald-400">
                  {currentInnings?.battingTeamName} ({currentInnings?.inningsNumber}{currentInnings?.inningsNumber === 1 ? 'st' : currentInnings?.inningsNumber === 2 ? 'nd' : currentInnings?.inningsNumber === 3 ? 'rd' : 'th'} Inn)
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300 font-mono">
                  CRR: <strong className="text-white">{currentRunRate}</strong>
                </span>
                {requiredRunRate && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="text-amber-300 font-mono">
                      RRR: <strong className="text-amber-400">{requiredRunRate}</strong>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Match Status / Target Banner (5 cols) */}
          <div className="md:col-span-5 bg-[#182234] border border-[#243247] p-3 rounded-lg flex flex-col justify-center">
            {isMatchFinished ? (
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                  Match Completed
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5">{match.resultText}</h4>
                {match.playerOfTheMatch && (
                  <span className="text-[11px] text-amber-400 block mt-1 font-mono">
                    POTM: {match.playerOfTheMatch.playerName} ({match.playerOfTheMatch.reason})
                  </span>
                )}
                <button
                  onClick={() => setShowScorecard(true)}
                  className="mt-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1 rounded cursor-pointer transition shadow"
                >
                  View Final Scorecard & Awards
                </button>
              </div>
            ) : currentInnings?.targetRuns ? (
              <div className="text-right">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 uppercase font-medium">Target Score:</span>
                  <span className="text-base font-bold font-mono text-white">{currentInnings.targetRuns}</span>
                </div>
                <p className="text-xs text-emerald-400 mt-1 font-semibold">
                  Need {Math.max(0, currentInnings.targetRuns - currentInnings.totalRuns)} runs
                  {match.format !== 'TEST' ? (
                    <span>
                      {' '}
                      from {whiteBallBallsRemaining} balls • {10 - currentInnings.wickets} wkts in hand
                    </span>
                  ) : (
                    <span> ({10 - currentInnings.wickets} wkts in hand • ~{testOversRemaining} ov left)</span>
                  )}
                </p>
              </div>
            ) : match.format === 'TEST' && match.currentInningsIndex === 1 && match.innings[0] ? (
              <div className="text-right text-xs">
                <span className="text-slate-400 uppercase font-medium block">1st Innings Status</span>
                <span className="text-slate-200 mt-0.5 font-bold font-mono">
                  {currentInnings.totalRuns < match.innings[0].totalRuns
                    ? `Trail by ${match.innings[0].totalRuns - currentInnings.totalRuns} runs`
                    : `Lead by ${currentInnings.totalRuns - match.innings[0].totalRuns} runs`}
                </span>
              </div>
            ) : match.format === 'TEST' && match.currentInningsIndex === 2 && match.innings[1] ? (
              <div className="text-right text-xs">
                <span className="text-slate-400 uppercase font-medium block">Lead / Deficit</span>
                <span className="text-slate-200 mt-0.5 font-bold font-mono">
                  {match.followOnEnforced
                    ? match.innings[1].totalRuns + currentInnings.totalRuns < match.innings[0].totalRuns
                      ? `Trail by ${match.innings[0].totalRuns - (match.innings[1].totalRuns + currentInnings.totalRuns)} runs (f/o)`
                      : `Lead by ${match.innings[1].totalRuns + currentInnings.totalRuns - match.innings[0].totalRuns} runs (f/o)`
                    : `Overall Lead: ${match.innings[0].totalRuns + currentInnings.totalRuns - match.innings[1].totalRuns} runs`}
                </span>
              </div>
            ) : (
              <div className="text-right text-xs">
                <span className="text-slate-400 uppercase font-medium block">1st Innings in Progress</span>
                <span className="text-slate-300 mt-1 block">
                  {currentInnings?.bowlingTeamName} bowling
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Test All-Innings Summary & Live Pitch / Weather / Ball Age Conditions Bar */}
        {match.format === 'TEST' && (
          <div className="mt-3 pt-3 border-t border-[#1f293d] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <div className="flex flex-wrap items-center gap-1.5">
                {match.innings.map((inn, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-0.5 rounded border ${
                      idx === match.currentInningsIndex
                        ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300 font-bold'
                        : 'bg-[#182234] border-[#243247] text-slate-300'
                    }`}
                  >
                    Inn {inn.inningsNumber}: {inn.battingTeamName} {inn.totalRuns}/{inn.wickets}
                    {inn.isDeclared ? 'd' : ''}
                  </span>
                ))}
              </div>
              {match.lastInterruptionText && (
                <span className="text-amber-300 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded">
                  {match.lastInterruptionText}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono">
              <div className="bg-[#182234]/80 border border-[#243247] px-2.5 py-1.5 rounded flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1 font-sans">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" /> Pitch:
                </span>
                <span className="text-slate-200 font-bold">
                  {match.pitch.name} • Wear {Math.round(match.pitchWear || 10)}%
                </span>
              </div>

              <div className="bg-[#182234]/80 border border-[#243247] px-2.5 py-1.5 rounded flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1 font-sans">
                  <Wind className="w-3.5 h-3.5 text-sky-400" /> Weather:
                </span>
                <span className="text-slate-200 font-bold">
                  {(match.dynamicWeather?.condition || match.weather.type).replace('_', ' ')} •{' '}
                  {match.dynamicWeather ? `${match.dynamicWeather.temperatureC}°C • Cloud ${match.dynamicWeather.cloudCover}%` : 'Good Light'}
                </span>
              </div>

              <div className="bg-[#182234]/80 border border-[#243247] px-2.5 py-1.5 rounded flex items-center justify-between gap-2">
                <span className="text-slate-300">
                  Ball Age:{' '}
                  <strong className="text-white">
                    {currentInnings?.ballAgeOvers ?? currentInnings?.completedOvers ?? 0} ov
                  </strong>
                  {currentInnings?.newBallAvailable && (
                    <span className="ml-1.5 text-amber-300 font-bold">(New Ball Due!)</span>
                  )}
                </span>
                {isUserBowling && currentInnings?.newBallAvailable && onTakeNewBall && (
                  <button
                    onClick={onTakeNewBall}
                    className="bg-rose-700 hover:bg-rose-600 text-white font-sans font-bold text-[10px] px-2 py-0.5 rounded cursor-pointer transition shadow"
                  >
                    Take New Ball
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* White-Ball (ODI / T20I) Match Conditions, Ground Dimensions, Dew & DLS Status Bar */}
        {match.format !== 'TEST' && (
          <div className="mt-3 pt-3 border-t border-[#1f293d] space-y-2">
            {match.innings.length > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                <div className="flex flex-wrap items-center gap-1.5">
                  {match.innings.map((inn, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded border ${
                        idx === match.currentInningsIndex
                          ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300 font-bold'
                          : 'bg-[#182234] border-[#243247] text-slate-300'
                      }`}
                    >
                      Inn {inn.inningsNumber}: {inn.battingTeamName} {inn.totalRuns}/{inn.wickets} ({inn.completedOvers}.{inn.ballsInCurrentOver} ov)
                    </span>
                  ))}
                </div>
                {match.lastInterruptionText && (
                  <span className="text-amber-300 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded">
                    {match.lastInterruptionText}
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono">
              <div className="bg-[#182234]/80 border border-[#243247] px-2.5 py-1.5 rounded flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1 font-sans">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" /> Surface:
                </span>
                <span className="text-slate-200 font-bold truncate ml-1">
                  {match.pitch.name}
                  {match.whiteBallConditions
                    ? ` • Pace ${match.whiteBallConditions.surfacePace} • Spin ${match.whiteBallConditions.spinAssistance}`
                    : ''}
                </span>
              </div>

              <div className="bg-[#182234]/80 border border-[#243247] px-2.5 py-1.5 rounded flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1 font-sans">
                  <Wind className="w-3.5 h-3.5 text-sky-400" /> Overhead:
                </span>
                <span className="text-slate-200 font-bold truncate ml-1">
                  {match.weather.type.replace('_', ' ')}
                  {match.whiteBallConditions
                    ? ` • ${match.whiteBallConditions.temperatureC}°C • Hum ${match.whiteBallConditions.humidity}%`
                    : ''}
                </span>
              </div>

              <div className="bg-[#182234]/80 border border-[#243247] px-2.5 py-1.5 rounded flex items-center justify-between gap-2">
                <span className="text-slate-300 truncate">
                  {match.whiteBallConditions ? (
                    <>
                      Boundaries:{' '}
                      <strong className="text-white">
                        {match.whiteBallConditions.boundarySize} ({match.whiteBallConditions.avgBoundaryMeters}m)
                      </strong>
                      {match.currentInningsIndex === 1 && match.whiteBallConditions.dewFactor !== 'NONE' && (
                        <span className="ml-1.5 text-sky-300 font-bold">
                          • {match.whiteBallConditions.dewFactor} DEW
                        </span>
                      )}
                    </>
                  ) : (
                    <span>Format: {match.format} Standard Conditions</span>
                  )}
                </span>
                {(match.weather.type === 'RAIN_RISK' ||
                  allocatedInningsOvers < (match.format === 'T20I' ? 20 : 50)) &&
                  !DLS_SUPPORT_STATUS.supported && (
                    <span
                      title={DLS_SUPPORT_STATUS.explanation}
                      className="bg-amber-950 text-amber-300 border border-amber-800/60 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0"
                    >
                      DLS: UNSUPPORTED
                    </span>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* Follow-On Decision Prompt Card for Test Cricket */}
        {needsUserFollowOnChoice && match.innings[0] && match.innings[1] && (
          <div className="mt-4 p-4 bg-amber-950/80 border-2 border-amber-500/70 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in shadow-lg">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Captain’s Follow-On Decision Required (Lead: {match.innings[0].totalRuns - match.innings[1].totalRuns} Runs)
              </span>
              <p className="text-xs text-slate-200">
                {match.innings[1].battingTeamName} were dismissed for {match.innings[1].totalRuns} ({match.innings[1].completedOvers}.{match.innings[1].ballsInCurrentOver} ov), trailing your 1st-innings {match.innings[0].totalRuns} by{' '}
                <strong>{match.innings[0].totalRuns - match.innings[1].totalRuns} runs</strong>.
              </p>
              <p className="text-[11px] text-amber-200/80 font-mono">
                Match Context: Day {match.dayNumber}/5 • ~{testOversRemaining} overs remaining • Pitch Wear {Math.round(match.pitchWear || 25)}%
              </p>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => onFollowOnDecision && onFollowOnDecision(true)}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 py-2 rounded transition cursor-pointer shadow"
              >
                Enforce Follow-On
              </button>
              <button
                onClick={() => onFollowOnDecision && onFollowOnDecision(false)}
                className="bg-[#182234] hover:bg-[#24344f] text-slate-100 border border-[#364968] font-bold text-xs px-4 py-2 rounded transition cursor-pointer"
              >
                Bat Again
              </button>
            </div>
          </div>
        )}

        {/* Recent Balls Strip */}
        <div className="mt-4 pt-3 border-t border-[#1f293d] flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" /> Recent Deliveries:
          </span>

          <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
            {currentInnings?.recentBalls.slice(0, 12).map((ball, idx) => {
              let badgeColor = 'bg-[#182234] text-slate-300 border-[#243247]';
              let label = `${ball.runsOffBat}`;

              if (ball.extras.wides > 0) {
                badgeColor = 'bg-amber-950 text-amber-300 border-amber-800';
                label = 'Wd';
              } else if (ball.extras.noBalls > 0) {
                badgeColor = 'bg-amber-950 text-amber-300 border-amber-800';
                label = 'Nb';
              } else if (ball.extras.byes > 0) {
                badgeColor = 'bg-blue-950 text-blue-300 border-blue-800';
                label = `B${ball.extras.byes}`;
              } else if (ball.extras.legByes > 0) {
                badgeColor = 'bg-blue-950 text-blue-300 border-blue-800';
                label = `Lb${ball.extras.legByes}`;
              } else if (ball.isWicket) {
                badgeColor = 'bg-rose-900 text-rose-200 border-rose-700 font-black';
                label = 'W';
              } else if (ball.runsOffBat === 4) {
                badgeColor = 'bg-blue-900 text-blue-200 border-blue-700 font-bold';
                label = '4';
              } else if (ball.runsOffBat === 6) {
                badgeColor = 'bg-purple-900 text-purple-200 border-purple-700 font-bold';
                label = '6';
              } else if (ball.runsOffBat === 0) {
                badgeColor = 'bg-[#0d131f] text-slate-400 border-[#1f293d]';
                label = '•';
              }

              return (
                <span
                  key={idx}
                  className={`w-6 h-6 rounded flex items-center justify-center font-mono text-xs border ${badgeColor}`}
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Interactive Batters & Bowler Status Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Active Batters (7 cols) */}
        <div className="lg:col-span-7 bg-[#121824] border border-[#1f293d] rounded-lg p-4">
          <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span>Batters at the Crease</span>
              <span className="text-[10px] font-mono text-sky-300 bg-[#182234] px-2 py-0.5 rounded border border-[#243247] normal-case">
                Partnership: {currentPartnershipRuns}* ({currentPartnershipBalls}b)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {!isUserBatting && (
                <span className="text-[10px] font-mono text-slate-300 bg-[#182234] px-2 py-0.5 rounded border border-[#243247]">
                  AI Approach: {match.aiTactics.battingAggression}
                </span>
              )}
              {match.format === 'TEST' &&
                isUserBatting &&
                !isMatchFinished &&
                match.currentInningsIndex < 3 &&
                onDeclareInnings && (
                  <button
                    onClick={() => setShowDeclareModal(true)}
                    className="bg-amber-600/90 hover:bg-amber-500 text-white font-bold text-[10px] px-2.5 py-0.5 rounded transition cursor-pointer flex items-center space-x-1"
                  >
                    <Flag className="w-3 h-3" />
                    <span>Declare Innings</span>
                  </button>
                )}
              <span className="text-[10px] text-emerald-400 font-mono">* On Strike</span>
            </div>
          </h3>

          <div className="space-y-2">
            {[striker, nonStriker].map((batter) => {
              if (!batter) return null;
              return (
                <div
                  key={batter.playerId}
                  className={`p-2.5 rounded border flex items-center justify-between text-xs transition ${
                    batter.isCurrentStriker
                      ? 'bg-[#182234] border-emerald-500/60 shadow-xs'
                      : 'bg-[#182234]/60 border-[#243247]'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm">
                      {batter.playerName} {batter.isCurrentStriker && <strong className="text-emerald-400">*</strong>}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 font-mono">
                    <div className="text-right">
                      <span className="text-sm font-bold text-white">{batter.runs}</span>
                      <span className="text-slate-400 text-[11px]"> ({batter.balls}b)</span>
                    </div>
                    <span className="text-slate-400 text-[11px] hidden sm:inline">
                      {batter.fours}x4, {batter.sixes}x6
                    </span>
                    <span className="text-emerald-400 font-bold text-xs w-12 text-right">
                      SR {batter.strikeRate.toFixed(1)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Bowler (5 cols) */}
        <div className="lg:col-span-5 bg-[#121824] border border-[#1f293d] rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2.5 gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Current Bowler
                </h3>
                {!isUserBowling && (
                  <span className="text-[10px] font-mono text-slate-300 bg-[#182234] px-2 py-0.5 rounded border border-[#243247]">
                    AI Plan: {match.aiTactics.bowlingTactic.replace('_', ' ')}
                  </span>
                )}
              </div>
              {/* Bowler change dropdown for user if bowling */}
              {isUserBowling && !isMatchFinished && (
                <select
                  value={currentInnings?.currentBowlerId}
                  onChange={(e) => onChangeBowler(e.target.value)}
                  className="bg-[#182234] border border-[#243247] text-[11px] text-slate-200 rounded px-2 py-0.5 focus:outline-hidden cursor-pointer"
                >
                  {availableBowlersForChange.map(
                    ({
                      player,
                      oversBowled,
                      effectiveQuota,
                      isExhausted,
                      isCurrent,
                      bowledJustCompletedOver,
                      isWk,
                    }) => (
                      <option
                        key={player.id}
                        value={player.id}
                        disabled={isExhausted || isCurrent || bowledJustCompletedOver || isWk}
                      >
                        {player.shortName} ({oversBowled}/
                        {effectiveQuota === Infinity ? '∞' : effectiveQuota} ov)
                        {isCurrent
                          ? ' [Current]'
                          : isWk
                          ? ' [WK]'
                          : bowledJustCompletedOver
                          ? ' [Bowled Last Over]'
                          : isExhausted
                          ? ' [Quota Done]'
                          : ''}
                      </option>
                    )
                  )}
                </select>
              )}
            </div>

            {activeBowler && (
              <div className="bg-[#182234] border border-[#243247] p-2.5 rounded flex items-center justify-between text-xs font-mono">
                <div>
                  <h4 className="font-bold text-white text-sm font-sans">{activeBowler.playerName}</h4>
                  <span className="text-[10px] text-slate-400 font-sans">
                    {activeBowler.overs}.{activeBowler.ballsThisOver} Overs Bowled (
                    {match.format === 'TEST'
                      ? `Spell: ${currentInnings?.bowlerSpellOvers?.[activeBowler.playerId] || 0} ov`
                      : `Quota: ${activeBowlerEffectiveQuota} Max`}
                    )
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-white">
                    <span className="text-emerald-400">{activeBowler.wickets}</span> - {activeBowler.runs}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Econ: {activeBowler.economy.toFixed(2)} • Maidens: {activeBowler.maidens} • Dots: {activeBowler.dots}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Captaincy Tactics & Match Simulation Controls */}
      {!isMatchFinished && (
        <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Captain's Tactical Orders (7 cols) */}
            <div className="md:col-span-7 space-y-3">
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> Captain’s Tactical Orders
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Batting Aggression */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Batting Approach</label>
                  <select
                    value={match.userTactics.battingAggression}
                    onChange={(e) =>
                      onUpdateTactics(
                        e.target.value as BattingAggression,
                        match.userTactics.bowlingTactic,
                        match.userTactics.fieldPreset
                      )
                    }
                    className="w-full bg-[#182234] border border-[#243247] text-xs text-white rounded p-1.5 focus:border-emerald-500 cursor-pointer"
                  >
                    {match.format === 'TEST' && (
                      <option value="BLOCK">Block / Stone-wall</option>
                    )}
                    <option value="DEFENSIVE">Defensive</option>
                    <option value="BALANCED">Balanced</option>
                    <option value="ATTACKING">Aggressive</option>
                    <option value="SMASH">All-Out Attack</option>
                  </select>
                </div>

                {/* Bowling Tactic */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Bowling Strategy</label>
                  <select
                    value={match.userTactics.bowlingTactic}
                    onChange={(e) =>
                      onUpdateTactics(
                        match.userTactics.battingAggression,
                        e.target.value as BowlingTactic,
                        match.userTactics.fieldPreset
                      )
                    }
                    className="w-full bg-[#182234] border border-[#243247] text-xs text-white rounded p-1.5 focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="TIGHT_DEFENSIVE">Tight Good Length</option>
                    <option value="BALANCED_CONTAIN">Balanced Stump-to-Stump</option>
                    <option value="ATTACKING_FULL">Attacking Full &amp; Swinging</option>
                    <option value="BOUNCER_SHORT">Short Pitch / Slower Cutter</option>
                    <option value="YORKER_DEATH">Death Bowling Yorkers</option>
                    <option value="FLIGHT_SPIN">Flight &amp; Spin Trap</option>
                  </select>
                </div>

                {/* Field Presets */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">
                    Field Placement
                    {ppInfo && ppInfo.phase !== 'NONE'
                      ? ` (Max ${ppInfo.maxFieldersOutsideCircle} Out)`
                      : ''}
                  </label>
                  <select
                    value={match.userTactics.fieldPreset}
                    onChange={(e) =>
                      onUpdateTactics(
                        match.userTactics.battingAggression,
                        match.userTactics.bowlingTactic,
                        e.target.value as FieldPreset
                      )
                    }
                    className="w-full bg-[#182234] border border-[#243247] text-xs text-white rounded p-1.5 focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="BALANCED_STANDARD">Balanced Standard</option>
                    <option value="ATTACKING_SLIPS">Attacking Slips Cordon</option>
                    <option value="RING_INNER">Inner 30-Yard Ring</option>
                    <option
                      value="DEFENSIVE_BOUNDARY"
                      disabled={ppInfo?.phase === 'MANDATORY_PP1'}
                    >
                      Deep Boundary Ring{ppInfo?.phase === 'MANDATORY_PP1' ? ' (PP1 Restricted)' : ''}
                    </option>
                    <option
                      value="DEATH_PROTECT"
                      disabled={ppInfo?.phase === 'MANDATORY_PP1'}
                    >
                      Death Protection{ppInfo?.phase === 'MANDATORY_PP1' ? ' (PP1 Restricted)' : ''}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Simulation Controls (5 cols) */}
            <div className="md:col-span-5 bg-[#182234] border border-[#243247] p-3 rounded-lg flex flex-col justify-center space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block text-center">
                Match Simulation Controls
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  onClick={onSimulateBall}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded shadow transition cursor-pointer flex items-center justify-center space-x-1 active:scale-95"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Ball</span>
                </button>

                <button
                  onClick={onSimulateOver}
                  className="bg-[#243247] hover:bg-[#334155] text-white font-bold text-xs py-2 rounded border border-[#3b4d6a] transition cursor-pointer flex items-center justify-center space-x-1 active:scale-95"
                >
                  <FastForward className="w-3 h-3" />
                  <span>Over</span>
                </button>

                <button
                  onClick={onSimulateInnings}
                  className="bg-[#243247] hover:bg-[#334155] text-white font-bold text-xs py-2 rounded border border-[#3b4d6a] transition cursor-pointer flex items-center justify-center space-x-1 active:scale-95"
                >
                  <SkipForward className="w-3 h-3" />
                  <span>Innings</span>
                </button>

                <button
                  onClick={onSimulateMatch}
                  className="bg-[#243247] hover:bg-[#334155] text-amber-300 font-bold text-xs py-2 rounded border border-amber-800/40 transition cursor-pointer flex items-center justify-center space-x-1 active:scale-95"
                >
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>Match</span>
                </button>
              </div>

              {/* Auto Broadcast Play Button */}
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className={`w-full py-1 rounded text-xs font-semibold transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                  isAutoPlaying
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-[#0d131f] text-slate-300 hover:text-white border border-[#243247]'
                }`}
              >
                <span>{isAutoPlaying ? 'Pause Live Broadcast' : '▶ Auto Broadcast Stream (Continuous)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Live Ball-by-Ball Commentary Feed */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4">
        <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          Ball-by-Ball Commentary Feed
        </h3>

        <div
          ref={commentaryScrollRef}
          className="space-y-2 max-h-56 overflow-y-auto pr-2 text-xs"
        >
          {currentInnings?.recentBalls.length ? (
            currentInnings.recentBalls.map((ball, i) => (
              <div
                key={i}
                className="p-2.5 rounded bg-[#182234] border border-[#243247] flex items-start space-x-3"
              >
                <span className="font-mono font-bold text-emerald-400 bg-[#0d131f] px-2 py-0.5 rounded border border-[#243247] flex-shrink-0">
                  {ball.overNumber}.{ball.ballInOver}
                </span>
                <p className="text-slate-200 flex-1 leading-relaxed">
                  {ball.commentary}
                </p>
                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[#0d131f] text-white border border-[#243247]">
                  {ball.isWicket ? 'W' : ball.totalRuns}
                </span>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-slate-400">
              Deliveries will appear here as the match progresses.
            </div>
          )}
        </div>
      </div>

      {/* Strategic Declaration Confirmation Modal */}
      {showDeclareModal && declarationContext && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#121824] border border-amber-500/40 rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white uppercase tracking-wide">
                  Declare Test Innings?
                </h3>
              </div>
              <span className="text-[11px] font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-700/40">
                Innings #{match.currentInningsIndex + 1}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-[#182234] border border-[#243247] rounded p-2.5">
                <span className="text-[10px] uppercase text-slate-400 block">Current Score</span>
                <span className="text-sm font-black font-mono text-white">
                  {declarationContext.scoreText}
                </span>
              </div>
              <div className="bg-[#182234] border border-[#243247] rounded p-2.5">
                <span className="text-[10px] uppercase text-slate-400 block">Overs Faced</span>
                <span className="text-sm font-bold font-mono text-slate-200">
                  {declarationContext.oversFacedText}
                </span>
              </div>
              <div className="bg-[#182234] border border-[#243247] rounded p-2.5 col-span-2">
                <span className="text-[10px] uppercase text-slate-400 block">Lead / Deficit Position</span>
                <span className="text-xs font-bold text-emerald-400">
                  {declarationContext.leadOrDeficitText}
                </span>
              </div>
              <div className="bg-[#182234] border border-[#243247] rounded p-2.5 col-span-2">
                <span className="text-[10px] uppercase text-slate-400 block">Opponent Previous Score</span>
                <span className="text-xs font-mono text-slate-200">
                  {declarationContext.opponentPreviousScoreText}
                </span>
              </div>
              <div className="bg-[#182234] border border-[#243247] rounded p-2.5 col-span-2">
                <span className="text-[10px] uppercase text-slate-400 block">Time Remaining</span>
                <span className="text-xs font-mono text-sky-300">
                  {declarationContext.daysSessionsRemainingText}
                </span>
              </div>
            </div>

            <div className="bg-[#0d131f] border border-[#243247] rounded-lg p-3 text-xs text-slate-300 leading-relaxed">
              <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">
                Strategic Consequences
              </span>
              {declarationContext.strategicConsequences}
            </div>

            {!declarationContext.allowed && declarationContext.reason && (
              <div className="bg-rose-950/50 border border-rose-500/40 rounded-lg p-2.5 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{declarationContext.reason}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1f293d]">
              <button
                onClick={() => setShowDeclareModal(false)}
                className="bg-[#182234] hover:bg-[#243247] text-slate-300 font-bold text-xs px-4 py-2 rounded border border-[#243247] transition cursor-pointer"
              >
                Cancel & Keep Batting
              </button>
              <button
                disabled={!declarationContext.allowed}
                onClick={() => {
                  if (onDeclareInnings && declarationContext.allowed) {
                    onDeclareInnings();
                    setShowDeclareModal(false);
                  }
                }}
                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs px-4 py-2 rounded shadow transition cursor-pointer flex items-center gap-1.5"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Confirm Declaration</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Scorecard Modal */}
      {showScorecard && (
        <ScorecardModal match={match} onClose={() => setShowScorecard(false)} />
      )}
    </div>
  );
};
