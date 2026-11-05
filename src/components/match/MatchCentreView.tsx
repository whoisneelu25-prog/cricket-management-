import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Target,
  Bot,
} from 'lucide-react';
import {
  CareerSave,
  Match,
  MatchFormat,
  BattingAggression,
  BattingApproach,
  BowlingTactic,
  BowlingIntention,
  ShotSelection,
  FieldPreset,
  Player,
  IndividualBatterInstruction,
  IndividualBowlingPlan,
  CustomScoringTarget,
  PhaseScoringTargets,
  CustomFieldLayout,
  TeamBattingGamePlan,
} from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { ALL_PLAYERS, getEffectivePlayer } from '../../data/squads';
import { CountryFlag } from '../common/CountryFlag';
import { PlayerAvatar } from '../common/PlayerAvatar';
import { StadiumBackground } from '../common/StadiumBackground';
import { ScorecardModal } from './ScorecardModal';
import { PostMatchSummaryView } from './PostMatchSummaryView';
import { WagonWheelPitchMap } from './WagonWheelPitchMap';
import { BatterTacticsPanel } from './BatterTacticsPanel';
import { BowlingTacticsPanel } from './BowlingTacticsPanel';
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
  onStartMatchWithToss: (choice: 'BAT' | 'BOWL', tossWinnerId?: string) => void;
  onSelectPlayer: (player: Player) => void;
  onDeclareInnings?: () => void;
  onFollowOnDecision?: (enforce: boolean) => void;
  onTakeNewBall?: () => void;
  onContinueToDashboard?: () => void;
  onPrepareNextMatch?: (nextMatchId: string) => void;
  onOpenMatchPreparation?: (matchId: string) => void;
  onUpdateBatterInstruction?: (instruction: IndividualBatterInstruction) => void;
  onUpdateBowlingPlan?: (plan: IndividualBowlingPlan) => void;
  onUpdateCustomTargets?: (targets: CustomScoringTarget[]) => void;
  onUpdatePhaseTargets?: (phaseTargets: PhaseScoringTargets) => void;
  onUpdateFieldLayout?: (layout: CustomFieldLayout) => void;
  onUpdateGamePlan?: (plan: TeamBattingGamePlan) => void;
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
  onUpdateBatterInstruction,
  onUpdateBowlingPlan,
  onUpdateCustomTargets,
  onUpdatePhaseTargets,
  onUpdateFieldLayout,
  onUpdateGamePlan,
}) => {
  const [showScorecard, setShowScorecard] = useState(false);
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [tacticalTab, setTacticalTab] = useState<
    'SCOREBOARD' | 'BATTING' | 'BOWLING' | 'INTELLIGENCE'
  >('SCOREBOARD');
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const commentaryScrollRef = useRef<HTMLDivElement | null>(null);

  // Interactive Coin Toss State
  const [tossCaller, setTossCaller] = useState<'USER' | 'CPU'>('USER');
  const [tossCall, setTossCall] = useState<'HEADS' | 'TAILS'>('HEADS');
  const [isFlippingCoin, setIsFlippingCoin] = useState(false);
  const [coinLanding, setCoinLanding] = useState<'HEADS' | 'TAILS' | null>(null);
  const [tossWinnerTeamId, setTossWinnerTeamId] = useState<string | null>(null);
  const [cpuDecision, setCpuDecision] = useState<'BAT' | 'BOWL' | null>(null);

  const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.homeTeamId);
  const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.awayTeamId);

  const currentInnings = match.innings[match.currentInningsIndex] || match.innings[0];
  const isMatchFinished = isTerminalMatchStatus(match.status);
  const userTeamId = career?.selectedTeamId || match.userTeamId;
  const oppTeamId = match.homeTeamId === userTeamId ? match.awayTeamId : match.homeTeamId;
  const userTeam = match.homeTeamId === userTeamId ? homeTeam : awayTeam;
  const oppTeam = match.homeTeamId === userTeamId ? awayTeam : homeTeam;

  const userCaptainId = match.homeTeamId === userTeamId ? match.homeCaptainId : match.awayCaptainId;
  const oppCaptainId = match.homeTeamId === userTeamId ? match.awayCaptainId : match.homeCaptainId;
  const userCaptain = userCaptainId
    ? getEffectivePlayer(userCaptainId, career) || getPlayerById(userCaptainId)
    : null;
  const oppCaptain = oppCaptainId
    ? getEffectivePlayer(oppCaptainId, career) || getPlayerById(oppCaptainId)
    : null;

  const handleFlipCoin = () => {
    if (isFlippingCoin) return;
    setIsFlippingCoin(true);
    setCoinLanding(null);
    setTossWinnerTeamId(null);
    setCpuDecision(null);

    const targetOutcome: 'HEADS' | 'TAILS' = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
    const effectiveCallerCall: 'HEADS' | 'TAILS' =
      tossCaller === 'USER' ? tossCall : Math.random() < 0.5 ? 'HEADS' : 'TAILS';

    setTimeout(() => {
      const callerWon = effectiveCallerCall === targetOutcome;
      const winnerId = callerWon
        ? tossCaller === 'USER'
          ? userTeamId
          : oppTeamId
        : tossCaller === 'USER'
        ? oppTeamId
        : userTeamId;

      setCoinLanding(targetOutcome);
      setTossWinnerTeamId(winnerId);

      if (winnerId !== userTeamId) {
        // Local rule-based AI decision based on match format, pitch conditions, and weather
        const pitchType = typeof match.pitch === 'object' ? match.pitch?.type : 'BALANCED';
        const weatherType = typeof match.weather === 'object' ? match.weather?.type : 'CLEAR';
        let decision: 'BAT' | 'BOWL' = 'BAT';

        if (match.format === 'TEST') {
          // In Tests, captains overwhelmingly bat first unless seamer wicket with heavy overcast swing
          if (pitchType === 'GREEN_SEAMER' || weatherType === 'RAIN_RISK' || weatherType === 'OVERCAST_SWING') {
            decision = Math.random() < 0.65 ? 'BOWL' : 'BAT';
          } else {
            decision = 'BAT';
          }
        } else {
          // In ODI / T20I: overcast/dew conditions favor bowling first
          if (weatherType === 'OVERCAST_SWING' || weatherType === 'RAIN_RISK' || pitchType === 'GREEN_SEAMER') {
            decision = 'BOWL';
          } else if (pitchType === 'BATTER_PARADISE' || pitchType === 'DUSTBOWL_SPIN') {
            decision = 'BAT';
          } else {
            decision = Math.random() < 0.55 ? 'BOWL' : 'BAT';
          }
        }
        setCpuDecision(decision);
      }

      setIsFlippingCoin(false);
    }, 850);
  };

  const handleResetToss = () => {
    setCoinLanding(null);
    setTossWinnerTeamId(null);
    setCpuDecision(null);
  };
  const needsUserFollowOnChoice =
    match.format === 'TEST' &&
    (match.awaitingFollowOnDecision ||
      (match.isFollowOnEligible && match.followOnEnforced === undefined)) &&
    match.innings[0]?.battingTeamId === userTeamId;

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

  const isUserBatting = currentInnings?.battingTeamId === userTeamId;
  const isUserBowling = currentInnings?.bowlingTeamId === userTeamId;

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

  // Win / Momentum Probability calculation for Dugout WL Bar (hook called unconditionally)
  const battingWinProb = useMemo(() => {
    if (isMatchFinished) {
      if (match.winnerTeamId === currentInnings?.battingTeamId) return 100;
      if (match.winnerTeamId) return 0;
      return 50;
    }
    const wktsLeft = 10 - (currentInnings?.wickets || 0);
    if (currentInnings?.targetRuns) {
      const needed = currentInnings.targetRuns - currentInnings.totalRuns;
      if (needed <= 0) return 100;
      if (wktsLeft <= 0) return 0;
      const rrr = requiredRunRate ? parseFloat(requiredRunRate) : 6.0;
      const crr = currentRunRate ? parseFloat(currentRunRate) : 6.0;
      const raw = Math.round(50 + (crr - rrr) * 8 + (wktsLeft - 5) * 6);
      return Math.max(5, Math.min(95, raw));
    }
    const crr = currentRunRate ? parseFloat(currentRunRate) : 5.0;
    const base = match.format === 'T20I' ? 8.0 : match.format === 'ODI' ? 5.5 : 3.2;
    const raw = Math.round(50 + (crr - base) * 6 + (wktsLeft - 5) * 4);
    return Math.max(10, Math.min(90, raw));
  }, [currentInnings, isMatchFinished, match.winnerTeamId, requiredRunRate, currentRunRate, match.format]);

  // Dedicated Post-Match Completion Screen when match ends (Phase 5)
  if (isMatchFinished) {
    return (
      <div className="relative min-h-[700px] select-none">
        <StadiumBackground
          venue={match.venue}
          hostCountryId={match.homeTeamId}
          format={match.format}
          overlayOpacity={0.65}
          showCaption={true}
        />
        <div className="relative z-10">
          <PostMatchSummaryView
            match={match}
            career={career}
            onContinueToDashboard={() => onContinueToDashboard && onContinueToDashboard()}
            onPrepareNextMatch={(nextId) => onPrepareNextMatch && onPrepareNextMatch(nextId)}
            onSelectPlayer={onSelectPlayer}
          />
        </div>
      </div>
    );
  }

  // Coin Toss View if match not yet started
  if (isPreMatchStatus(match.status)) {
    return (
      <div className="relative min-h-[700px] flex items-center justify-center p-3 sm:p-6 select-none">
        <StadiumBackground
          venue={match.venue}
          hostCountryId={match.homeTeamId}
          format={match.format}
          overlayOpacity={0.6}
          showCaption={true}
        />
        <div className="relative z-10 match-panel-main rounded-2xl p-6 sm:p-10 max-w-2xl mx-auto my-8 text-center select-none shadow-2xl animate-in zoom-in-95 duration-200">
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
          {match.venue} • Pitch:{' '}
          <span className="text-emerald-400 font-medium">
            {typeof match.pitch === 'string' ? match.pitch : match.pitch?.name || 'Standard'}
          </span>{' '}
          • Weather:{' '}
          <span className="text-amber-300 font-medium">
            {typeof match.weather === 'string'
              ? match.weather
              : (match.weather?.type || 'CLEAR').replace('_', ' ')}
          </span>
        </p>

        <div className="my-8 bg-[#141f36] border border-slate-800 p-5 rounded-xl flex items-center justify-around shadow-inner">
          <div className="flex flex-col items-center">
            <div className="mb-2">
              <CountryFlag countryCode={homeTeam?.code || ''} size="lg" />
            </div>
            <h4 className="font-bold text-sm text-white">{homeTeam?.name}</h4>
            <span className="text-[10px] text-slate-400 font-mono mt-1">
              Captain: {(getEffectivePlayer(match.homeCaptainId, career) || getPlayerById(match.homeCaptainId)).shortName}
            </span>
          </div>

          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-3 py-1 rounded border border-slate-700">
            VS
          </span>

          <div className="flex flex-col items-center">
            <div className="mb-2">
              <CountryFlag countryCode={awayTeam?.code || ''} size="lg" />
            </div>
            <h4 className="font-bold text-sm text-white">{awayTeam?.name}</h4>
            <span className="text-[10px] text-slate-400 font-mono mt-1">
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
                      <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">{(p.role || 'ALL_ROUNDER').replace('_', ' ')}</span>
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
                      <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">{(p.role || 'ALL_ROUNDER').replace('_', ' ')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Dugout Coin Toss Chamber */}
        <div className="space-y-4 pt-3 border-t border-[#1e2733]">
          {/* Toss Step 1: Selection & Flip */}
          {tossWinnerTeamId === null && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#10151c] p-3 rounded-xl border border-[#1e2733]">
                <div className="text-left">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8b97a3] font-display block">
                    Coin Call Duty
                  </span>
                  <span className="text-xs text-[#e8edf2] font-semibold">
                    Who calls Heads or Tails in the air?
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#070a0e] p-1 rounded-lg border border-[#1e2733]">
                  <button
                    type="button"
                    onClick={() => {
                      setTossCaller('USER');
                      handleResetToss();
                    }}
                    className={`text-xs px-3 py-1.5 rounded-md font-display font-bold transition cursor-pointer ${
                      tossCaller === 'USER'
                        ? 'bg-[#e2b64a] text-black shadow'
                        : 'text-[#8b97a3] hover:text-white'
                    }`}
                  >
                    I Will Call ({userCaptain?.shortName || 'You'})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTossCaller('CPU');
                      handleResetToss();
                    }}
                    className={`text-xs px-3 py-1.5 rounded-md font-display font-bold transition cursor-pointer ${
                      tossCaller === 'CPU'
                        ? 'bg-[#e2b64a] text-black shadow'
                        : 'text-[#8b97a3] hover:text-white'
                    }`}
                  >
                    Opponent Calls ({oppCaptain?.shortName || oppTeam?.name || 'CPU'})
                  </button>
                </div>
              </div>

              {/* Call choice selection */}
              {tossCaller === 'USER' ? (
                <div className="bg-[#0e141f] p-3.5 rounded-xl border border-[#1e2733] space-y-2">
                  <span className="text-[11px] font-bold text-[#c3ccd6] block">
                    Select your call before the coin is flipped:
                  </span>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setTossCall('HEADS')}
                      className={`text-xs px-5 py-2 rounded-xl font-bold font-display border cursor-pointer transition ${
                        tossCall === 'HEADS'
                          ? 'bg-[#2c2412] text-[#ffe9a8] border-[#e2b64a] shadow-lg shadow-[#e2b64a]/20 scale-105'
                          : 'bg-[#10151c] text-[#8b97a3] border-[#1e2733] hover:text-white'
                      }`}
                    >
                      🪙 HEADS
                    </button>
                    <button
                      type="button"
                      onClick={() => setTossCall('TAILS')}
                      className={`text-xs px-5 py-2 rounded-xl font-bold font-display border cursor-pointer transition ${
                        tossCall === 'TAILS'
                          ? 'bg-[#2c2412] text-[#ffe9a8] border-[#e2b64a] shadow-lg shadow-[#e2b64a]/20 scale-105'
                          : 'bg-[#10151c] text-[#8b97a3] border-[#1e2733] hover:text-white'
                      }`}
                    >
                      🪙 TAILS
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0e141f] p-3.5 rounded-xl border border-[#1e2733] text-center">
                  <span className="text-xs text-[#c3ccd6]">
                    Opposition Captain <strong>{oppCaptain?.shortName || oppTeam?.name}</strong> will call in the air when you toss the coin.
                  </span>
                </div>
              )}

              {/* Coin flip button & visual */}
              <div className="py-2 flex flex-col items-center justify-center space-y-3">
                <div
                  className={`w-16 h-16 rounded-full border-2 border-[#e2b64a] bg-gradient-to-tr from-[#e0ab3a] via-[#ffe9a8] to-[#e0ab3a] text-black font-black font-display flex items-center justify-center shadow-xl shadow-[#e2b64a]/25 text-sm select-none ${
                    isFlippingCoin ? 'animate-spin' : ''
                  }`}
                >
                  {isFlippingCoin ? 'ICM' : tossCall}
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleFlipCoin}
                    disabled={isFlippingCoin}
                    className="btn-gold text-xs px-8 py-2.5 rounded-xl shadow-xl cursor-pointer font-display font-bold flex items-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    <Coins className="w-4 h-4" />
                    <span>{isFlippingCoin ? 'Coin in the Air...' : 'Flip the Coin'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toss Step 2: Coin Landed & Decision */}
          {tossWinnerTeamId !== null && (
            <div className="space-y-4 animate-in zoom-in-95 duration-200">
              <div className="p-4 bg-gradient-to-r from-[#10151c] via-[#1a2330] to-[#10151c] border-2 border-[#e2b64a] rounded-xl text-center shadow-xl">
                <div className="inline-flex items-center gap-2 bg-[#2c2412] px-3 py-1 rounded-full border border-[#e2b64a]/50 text-xs font-bold text-[#ffe9a8] mb-2 font-display">
                  <span>Coin Result: <strong>{coinLanding}</strong></span>
                </div>

                {tossWinnerTeamId === userTeamId ? (
                  <div className="space-y-3">
                    <h3 className="text-base font-extrabold text-[#3fca86] font-display flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-5 h-5 text-[#3fca86]" />
                      <span>{userTeam?.name || 'Your Team'} Won the Toss!</span>
                    </h3>
                    <p className="text-xs text-[#c3ccd6] max-w-md mx-auto">
                      As Captain {userCaptain?.shortName ? `(${userCaptain.shortName})` : ''}, choose whether to bat first or bowl first:
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => onStartMatchWithToss('BAT', userTeamId)}
                        className="btn-gold text-xs px-7 py-2.5 rounded-xl shadow-lg cursor-pointer transition active:scale-95 flex items-center space-x-2 font-display font-bold"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Bat First</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onStartMatchWithToss('BOWL', userTeamId)}
                        className="bg-[#10151c] hover:bg-[#1a2330] text-[#ffe9a8] hover:text-white border border-[#e2b64a]/50 font-display font-bold text-xs px-7 py-2.5 rounded-xl shadow-lg cursor-pointer transition active:scale-95 flex items-center space-x-2"
                      >
                        <Shield className="w-4 h-4 text-[#e2b64a]" />
                        <span>Bowl First</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="text-base font-extrabold text-[#8fb2d9] font-display">
                      {oppTeam?.name || 'Opposition'} Won the Toss!
                    </h3>
                    <p className="text-xs text-[#e8edf2] max-w-md mx-auto">
                      {oppCaptain?.shortName || oppTeam?.name} has elected to{' '}
                      <strong className="text-[#ffe9a8] uppercase underline">
                        {cpuDecision === 'BAT' ? 'Bat First' : 'Bowl First'}
                      </strong>
                      . Your team will{' '}
                      <strong className="text-[#3fca86] uppercase underline">
                        {cpuDecision === 'BAT' ? 'Bowl First' : 'Bat First'}
                      </strong>
                      .
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => onStartMatchWithToss(cpuDecision || 'BAT', oppTeamId)}
                        className="btn-gold text-xs px-8 py-2.5 rounded-xl shadow-xl cursor-pointer transition active:scale-95 flex items-center space-x-2 font-display font-bold"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Take the Field &amp; Start Match</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleResetToss}
                  className="text-[11px] text-[#8b97a3] hover:text-[#e8edf2] underline cursor-pointer"
                >
                  Flip Again
                </button>
              </div>
            </div>
          )}
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
    <div className="relative space-y-4 select-none animate-in fade-in duration-150 max-w-7xl mx-auto pb-8">
      {/* Stadium Backdrop with Dynamic Venue Mapping */}
      <StadiumBackground
        venue={match.venue}
        hostCountryId={match.homeTeamId}
        format={match.format}
        overlayOpacity={0.55}
        showCaption={true}
      />

      {/* 1. Broadcast Match Header */}
      <div className="match-panel-main rounded-2xl p-4 sm:p-5 shadow-2xl relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1e2733] gap-2">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="text-xs font-black uppercase tracking-wider bg-[#2c2412] text-[#ffe9a8] border border-[#e2b64a]/50 px-2.5 py-0.5 rounded font-display">
              {match.format}
            </span>

            {/* Test Cricket Day & Session HUD */}
            {match.format === 'TEST' && (
              <>
                <span className="text-xs font-bold bg-[#10151c] text-[#ffe9a8] border border-[#e2b64a]/40 px-2 py-0.5 rounded font-mono flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-[#e2b64a]" />
                  <span>
                    Day {match.dayNumber}/5 • {sessionLabel} ({match.oversBowledToday || 0}/{match.oversPerDay || 90} Ov)
                  </span>
                </span>
                <span className="text-[11px] font-bold bg-[#10151c] text-[#8fb2d9] border border-[#1e2733] px-2 py-0.5 rounded font-mono">
                  ~{testOversRemaining} Ov Remaining
                </span>
                {match.sessionBreakStatus && (
                  <span className="text-[11px] font-black bg-[#2c2412] text-[#ffe9a8] border border-[#e2b64a]/60 px-2 py-0.5 rounded font-mono uppercase">
                    {match.sessionBreakStatus.replace('_', ' ')}
                  </span>
                )}
              </>
            )}

            {/* White-ball Powerplay & Free Hit HUD */}
            {ppInfo && ppInfo.phase !== 'NONE' && (
              <span className="text-[11px] font-bold bg-[#10151c] text-[#8fb2d9] border border-[#1e2733] px-2 py-0.5 rounded font-mono">
                {ppInfo.description}
              </span>
            )}
            {match.format !== 'TEST' && currentInnings?.isFreeHit && (
              <span className="text-[11px] font-black uppercase tracking-wider bg-[#ff5470] text-white px-2.5 py-0.5 rounded font-mono animate-pulse shadow">
                FREE HIT!
              </span>
            )}
            {match.tossWinnerId && (
              <span className="text-[11px] font-mono text-[#8b97a3] bg-[#10151c] px-2 py-0.5 rounded border border-[#1e2733] hidden md:inline">
                Toss: {match.tossWinnerId} chose to {match.tossChoice || 'BAT'}
              </span>
            )}

            <span className="text-xs text-[#c3ccd6] font-semibold font-display">
              {match.seriesName || 'International Bilateral Series'}
            </span>
            <span className="text-[#33404f] hidden sm:inline">•</span>
            <span className="text-xs text-[#8b97a3] hidden sm:inline">{match.venue}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowScorecard(true)}
              className="flex items-center space-x-1.5 text-xs bg-[#10151c]/80 hover:bg-[#1a2330] text-[#e8edf2] border border-[#1e2733] hover:border-[#33404f] px-3.5 py-1.5 rounded-lg transition cursor-pointer font-semibold font-display shadow"
            >
              <FileText className="w-3.5 h-3.5 text-[#e2b64a]" />
              <span>Full Scorecard</span>
            </button>
          </div>
        </div>

        {/* Live Score Display Banner (Giant Dugout Typography) */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Main Batting Team Score (7 cols) */}
          <div className="md:col-span-7 flex items-center space-x-4">
            <CountryFlag
              countryCode={
                currentInnings?.battingTeamId === homeTeam?.id
                  ? homeTeam?.code || ''
                  : awayTeam?.code || ''
              }
              size="lg"
              className="border-2 border-[#1e2733] shadow-lg shrink-0"
            />

            <div className="space-y-1">
              <div className="flex items-baseline space-x-3">
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white font-display tracking-tight drop-shadow-md">
                  {currentInnings?.totalRuns}/{currentInnings?.wickets}
                </h2>
                <span className="text-lg sm:text-xl font-display text-[#8fb2d9] font-bold">
                  ({currentInnings?.completedOvers}.{currentInnings?.ballsInCurrentOver}
                  {match.format !== 'TEST' && Number.isFinite(allocatedInningsOvers)
                    ? `/${allocatedInningsOvers}`
                    : ''}{' '}
                  ov)
                </span>
                {currentInnings?.isDeclared && (
                  <span className="text-xs bg-[#2c2412] text-[#ffe9a8] border border-[#e2b64a] px-2 py-0.5 rounded font-bold font-mono">
                    d
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <span className="font-extrabold text-[#e2b64a] font-display">
                  {currentInnings?.battingTeamName} ({currentInnings?.inningsNumber}
                  {currentInnings?.inningsNumber === 1 ? 'st' : currentInnings?.inningsNumber === 2 ? 'nd' : currentInnings?.inningsNumber === 3 ? 'rd' : 'th'} Inn)
                </span>
                <span className="text-[#33404f]">•</span>
                <span className="text-[#8b97a3] font-mono">
                  CRR: <strong className="text-white">{currentRunRate}</strong>
                </span>
                {requiredRunRate && (
                  <>
                    <span className="text-[#33404f]">•</span>
                    <span className="text-[#ffe9a8] font-mono font-bold">
                      RRR: <strong className="text-[#e2b64a]">{requiredRunRate}</strong>
                    </span>
                  </>
                )}
              </div>

              {/* Dugout Momentum / Win Probability Bar */}
              <div className="flex items-center gap-2 pt-1.5 max-w-md">
                <span className="text-[10px] font-mono font-bold text-[#e2b64a] shrink-0 font-display">
                  {currentInnings?.battingTeamName?.split(' ')[0]} {battingWinProb}%
                </span>
                <div className="flex-1 h-2 bg-[#10151c] rounded-full overflow-hidden flex border border-[#1e2733]">
                  <div
                    className="h-full bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] transition-all duration-500 rounded-l-full"
                    style={{ width: `${battingWinProb}%` }}
                  />
                  <div
                    className="h-full bg-[#ff3d7f] transition-all duration-500 rounded-r-full flex-1"
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-[#ff3d7f] shrink-0 font-display">
                  {currentInnings?.bowlingTeamName?.split(' ')[0]} {100 - battingWinProb}%
                </span>
              </div>
            </div>
          </div>

          {/* Match Status / Target Banner (5 cols) */}
          <div className="md:col-span-5 match-panel-secondary p-3.5 rounded-xl flex flex-col justify-center shadow-inner">
            {isMatchFinished ? (
              <div className="text-center">
                <span className="text-[10px] uppercase font-extrabold text-[#3fca86] tracking-widest block font-display">
                  Match Completed
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5 font-display">{match.resultText}</h4>
                {match.playerOfTheMatch && (
                  <span className="text-[11px] text-[#ffe9a8] block mt-1 font-mono">
                    POTM: {match.playerOfTheMatch.playerName} ({match.playerOfTheMatch.reason})
                  </span>
                )}
                <button
                  onClick={() => setShowScorecard(true)}
                  className="mt-2 text-xs btn-gold px-3 py-1 rounded-lg cursor-pointer transition shadow"
                >
                  View Final Scorecard & Awards
                </button>
              </div>
            ) : currentInnings?.targetRuns ? (
              <div className="text-right">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8b97a3] uppercase font-bold tracking-wider font-display">Target Score:</span>
                  <span className="text-lg font-black font-mono text-[#ffe9a8]">{currentInnings.targetRuns}</span>
                </div>
                <p className="text-xs text-[#e2b64a] mt-1 font-semibold">
                  Need {Math.max(0, currentInnings.targetRuns - currentInnings.totalRuns)} runs
                  {match.format !== 'TEST' ? (
                    <span>
                      {' '}
                      from {whiteBallBallsRemaining} balls • {10 - (currentInnings?.wickets ?? 0)} wkts in hand
                    </span>
                  ) : (
                    <span> ({10 - (currentInnings?.wickets ?? 0)} wkts in hand • ~{testOversRemaining} ov left)</span>
                  )}
                </p>
              </div>
            ) : match.format === 'TEST' && match.currentInningsIndex === 1 && match.innings[0] ? (
              <div className="text-right text-xs">
                <span className="text-[#8b97a3] uppercase font-bold tracking-wider block font-display">1st Innings Status</span>
                <span className="text-[#e8edf2] mt-0.5 font-black font-mono text-sm">
                  {(currentInnings?.totalRuns ?? 0) < (match.innings[0]?.totalRuns ?? 0)
                    ? `Trail by ${(match.innings[0]?.totalRuns ?? 0) - (currentInnings?.totalRuns ?? 0)} runs`
                    : `Lead by ${(currentInnings?.totalRuns ?? 0) - (match.innings[0]?.totalRuns ?? 0)} runs`}
                </span>
              </div>
            ) : match.format === 'TEST' && match.currentInningsIndex === 2 && match.innings[1] ? (
              <div className="text-right text-xs">
                <span className="text-[#8b97a3] uppercase font-bold tracking-wider block font-display">Lead / Deficit</span>
                <span className="text-[#e8edf2] mt-0.5 font-black font-mono text-sm">
                  {match.followOnEnforced
                    ? (match.innings[1]?.totalRuns ?? 0) + (currentInnings?.totalRuns ?? 0) < (match.innings[0]?.totalRuns ?? 0)
                      ? `Trail by ${(match.innings[0]?.totalRuns ?? 0) - ((match.innings[1]?.totalRuns ?? 0) + (currentInnings?.totalRuns ?? 0))} runs (f/o)`
                      : `Lead by ${((match.innings[1]?.totalRuns ?? 0) + (currentInnings?.totalRuns ?? 0)) - (match.innings[0]?.totalRuns ?? 0)} runs (f/o)`
                    : `Overall Lead: ${(match.innings[0]?.totalRuns ?? 0) + (currentInnings?.totalRuns ?? 0) - (match.innings[1]?.totalRuns ?? 0)} runs`}
                </span>
              </div>
            ) : (
              <div className="text-right text-xs">
                <span className="text-[#8b97a3] uppercase font-bold tracking-wider block font-display">1st Innings in Progress</span>
                <span className="text-[#c3ccd6] mt-1 block">
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
                  {typeof match.pitch === 'string' ? match.pitch : match.pitch?.name || 'Standard'} • Wear {Math.round(match.pitchWear || 10)}%
                </span>
              </div>

              <div className="bg-[#182234]/80 border border-[#243247] px-2.5 py-1.5 rounded flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1 font-sans">
                  <Wind className="w-3.5 h-3.5 text-sky-400" /> Weather:
                </span>
                <span className="text-slate-200 font-bold">
                  {(match.dynamicWeather?.condition || (typeof match.weather === 'string' ? match.weather : match.weather?.type || 'CLEAR')).replace('_', ' ')} •{' '}
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
                  {typeof match.pitch === 'string' ? match.pitch : match.pitch?.name || 'Standard'}
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
                  {(typeof match.weather === 'string' ? match.weather : match.weather?.type || 'CLEAR').replace('_', ' ')}
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
                {((typeof match.weather === 'string' ? match.weather : match.weather?.type) === 'RAIN_RISK' ||
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

        {/* Innings Break Banner when an innings completes but match continues */}
        {currentInnings.isCompleted && !isMatchFinished && !needsUserFollowOnChoice && (
          <div className="mt-4 p-4 bg-gradient-to-r from-[#10151c] via-[#161d28] to-[#070a0e] border-2 border-[#e2b64a]/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl animate-in fade-in">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-[#ffe9a8] flex items-center gap-1.5 font-display">
                <CheckCircle className="w-4 h-4 text-[#e2b64a]" />
                Innings {match.currentInningsIndex + 1} Concluded: {currentInnings.battingTeamName} {currentInnings.totalRuns}/{currentInnings.wickets} ({currentInnings.completedOvers}.{currentInnings.ballsInCurrentOver} ov)
              </span>
              <p className="text-xs text-[#c3ccd6]">
                {match.format !== 'TEST' && match.currentInningsIndex === 0 ? (
                  <span>
                    Target for <strong>{currentInnings.bowlingTeamName}</strong>:{' '}
                    <strong className="text-[#ffe9a8] font-mono text-sm">{currentInnings.totalRuns + 1} runs</strong>{' '}
                    from {allocatedInningsOvers} overs.
                  </span>
                ) : match.format === 'TEST' ? (
                  <span>
                    {match.currentInningsIndex === 0
                      ? `${currentInnings.bowlingTeamName} will bat in their 1st Innings.`
                      : match.currentInningsIndex === 1
                      ? `1st Innings Lead: ${Math.abs((match.innings[0]?.totalRuns || 0) - currentInnings.totalRuns)} runs.`
                      : `Target chase approaching in 4th Innings.`}
                  </span>
                ) : (
                  <span>Ready to start the next innings.</span>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={onSimulateBall}
                className="btn-gold text-xs px-5 py-2.5 rounded-xl font-bold font-display shadow-lg cursor-pointer flex items-center space-x-1.5 active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Innings {match.currentInningsIndex + 2} ▶</span>
              </button>
            </div>
          </div>
        )}

        {/* Recent Balls Strip */}
        <div className="mt-4 pt-3 border-t border-[#1e2733] flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-[#8b97a3] font-extrabold flex items-center gap-1.5 font-display">
            <Activity className="w-3.5 h-3.5 text-[#e2b64a]" /> Recent Deliveries:
          </span>

          <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
            {currentInnings?.recentBalls.slice(0, 12).map((ball, idx) => {
              let dotClass = '';
              let label = `${ball.runsOffBat}`;

              if (ball.extras.wides > 0) {
                dotClass = 'boundary';
                label = 'Wd';
              } else if (ball.extras.noBalls > 0) {
                dotClass = 'boundary';
                label = 'Nb';
              } else if (ball.extras.byes > 0) {
                label = `B${ball.extras.byes}`;
              } else if (ball.extras.legByes > 0) {
                label = `Lb${ball.extras.legByes}`;
              } else if (ball.isWicket) {
                dotClass = 'wicket';
                label = 'W';
              } else if (ball.runsOffBat === 4) {
                dotClass = 'boundary';
                label = '4';
              } else if (ball.runsOffBat === 6) {
                dotClass = 'six';
                label = '6';
              } else if (ball.runsOffBat === 0) {
                label = '•';
              }

              return (
                <span key={idx} className={`dugout-dot ${dotClass}`}>
                  <span>{label}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tactical Center Tab Navigation */}
      <div className="match-panel-main rounded-xl p-1.5 flex flex-wrap items-center gap-2 shadow-lg relative z-10">
        <button
          onClick={() => setTacticalTab('SCOREBOARD')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer font-display ${
            tacticalTab === 'SCOREBOARD'
              ? 'btn-gold shadow-md'
              : 'text-[#8b97a3] hover:text-white hover:bg-[#10151c]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Match Flow & Scoreboard</span>
        </button>

        {isUserBatting && (
          <button
            onClick={() => setTacticalTab('BATTING')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer font-display ${
              tacticalTab === 'BATTING'
                ? 'btn-gold shadow-md'
                : 'text-[#8b97a3] hover:text-white hover:bg-[#10151c]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Batting Plans</span>
          </button>
        )}

        {isUserBowling && (
          <button
            onClick={() => setTacticalTab('BOWLING')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer font-display ${
              tacticalTab === 'BOWLING'
                ? 'btn-gold shadow-md'
                : 'text-[#8b97a3] hover:text-white hover:bg-[#10151c]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Bowling & Spells</span>
          </button>
        )}

        <button
          onClick={() => setTacticalTab('INTELLIGENCE')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer font-display ${
            tacticalTab === 'INTELLIGENCE'
              ? 'btn-gold shadow-md'
              : 'text-[#8b97a3] hover:text-white hover:bg-[#10151c]'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Match Intelligence</span>
        </button>
      </div>

      {/* Tab Panels */}
      {tacticalTab === 'BATTING' && (
        <BatterTacticsPanel
          match={match}
          onUpdateTactics={onUpdateTactics}
          onUpdateInstruction={(instruction) =>
            onUpdateBatterInstruction && onUpdateBatterInstruction(instruction)
          }
          onUpdateCustomTargets={onUpdateCustomTargets}
          onUpdatePhaseTargets={onUpdatePhaseTargets}
        />
      )}

      {tacticalTab === 'BOWLING' && (
        <BowlingTacticsPanel
          match={match}
          onUpdateTactics={onUpdateTactics}
          onUpdateBowlingPlan={(plan) =>
            onUpdateBowlingPlan && onUpdateBowlingPlan(plan)
          }
          onChangeBowler={onChangeBowler}
        />
      )}

      {tacticalTab === 'INTELLIGENCE' && <WagonWheelPitchMap match={match} />}

      {/* 2. Interactive Batters & Bowler Status Bar */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 relative z-10 ${tacticalTab !== 'SCOREBOARD' ? 'hidden' : ''}`}>
        {/* Active Batters (7 cols) */}
        <div className="lg:col-span-7 match-panel-main rounded-2xl p-4 sm:p-5 shadow-xl">
          <h3 className="text-xs uppercase font-extrabold text-[#8b97a3] tracking-widest mb-3 flex flex-wrap items-center justify-between gap-2 font-display">
            <div className="flex items-center gap-2">
              <span className="text-white">Batters at the Crease</span>
              <span className="text-[10px] font-mono text-[#ffe9a8] bg-[#10151c] px-2 py-0.5 rounded border border-[#e2b64a]/30 normal-case font-bold">
                Partnership: {currentPartnershipRuns}* ({currentPartnershipBalls}b)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {!isUserBatting && (
                <span className="text-[10px] font-mono text-[#8b97a3] bg-[#10151c] px-2 py-0.5 rounded border border-[#1e2733]">
                  AI Approach: {match.aiTactics?.battingAggression || 'BALANCED'}
                </span>
              )}
              {match.format === 'TEST' &&
                isUserBatting &&
                !isMatchFinished &&
                match.currentInningsIndex < 3 &&
                onDeclareInnings && (
                  <button
                    onClick={() => setShowDeclareModal(true)}
                    className="bg-[#2c2412] hover:bg-[#453718] text-[#ffe9a8] border border-[#e2b64a]/50 font-bold text-[10px] px-2.5 py-0.5 rounded transition cursor-pointer flex items-center space-x-1"
                  >
                    <Flag className="w-3 h-3 text-[#e2b64a]" />
                    <span>Declare Innings</span>
                  </button>
                )}
              <span className="text-[10px] text-[#e2b64a] font-mono font-bold">* On Strike</span>
            </div>
          </h3>

          <div className="space-y-2">
            {[striker, nonStriker].map((batter) => {
              if (!batter) return null;
              const playerObj = getPlayerById(batter.playerId);
              return (
                <div
                  key={batter.playerId}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                    batter.isCurrentStriker
                      ? 'bg-[#10151c] border-[#e2b64a]/60 shadow-lg'
                      : 'bg-[#10151c]/60 border-[#1e2733]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {playerObj && <PlayerAvatar player={playerObj} size="xs" showFlag={false} />}
                    <div>
                      <span className="font-bold text-white text-sm font-display flex items-center gap-1.5">
                        {batter.playerName} {batter.isCurrentStriker && <strong className="text-[#e2b64a]">*</strong>}
                      </span>
                      {batter.isCurrentStriker && (
                        <span className="text-[9px] uppercase font-extrabold text-[#e2b64a] font-display tracking-widest">
                          On Strike
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 font-mono">
                    <div className="text-right">
                      <span className="text-base font-black text-white">{batter.runs}</span>
                      <span className="text-[#8b97a3] text-[11px]"> ({batter.balls}b)</span>
                    </div>
                    <span className="text-[#8b97a3] text-[11px] hidden sm:inline">
                      {batter.fours}x4, {batter.sixes}x6
                    </span>
                    <span className="text-[#3fca86] font-bold text-xs w-12 text-right">
                      SR {(batter.strikeRate ?? 0).toFixed(1)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Bowler (5 cols) */}
        <div className="lg:col-span-5 match-panel-main rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs uppercase font-extrabold text-white tracking-widest font-display">
                  Current Bowler
                </h3>
                {!isUserBowling && (
                  <span className="text-[10px] font-mono text-[#8b97a3] bg-[#10151c] px-2 py-0.5 rounded border border-[#1e2733]">
                    AI Plan: {(match.aiTactics?.bowlingTactic || 'BALANCED_CONTAIN').replace('_', ' ')}
                  </span>
                )}
              </div>
              {/* Bowler change dropdown for user if bowling */}
              {isUserBowling && !isMatchFinished && (
                <select
                  value={currentInnings?.currentBowlerId}
                  onChange={(e) => onChangeBowler(e.target.value)}
                  className="bg-[#10151c] border border-[#1e2733] text-[11px] text-[#e8edf2] rounded-lg px-2 py-1 focus:border-[#e2b64a] cursor-pointer"
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
              <div className="bg-[#10151c] border border-[#1e2733] p-3 rounded-xl flex items-center justify-between text-xs font-mono shadow-inner">
                <div className="flex items-center space-x-3">
                  {getPlayerById(activeBowler.playerId) && (
                    <PlayerAvatar player={getPlayerById(activeBowler.playerId)!} size="xs" showFlag={false} />
                  )}
                  <div>
                    <h4 className="font-bold text-white text-sm font-display">{activeBowler.playerName}</h4>
                    <span className="text-[10px] text-[#8b97a3] font-sans">
                      {activeBowler.overs}.{activeBowler.ballsThisOver} Overs Bowled (
                      {match.format === 'TEST'
                        ? `Spell: ${currentInnings?.bowlerSpellOvers?.[activeBowler.playerId] || 0} ov`
                        : `Quota: ${activeBowlerEffectiveQuota} Max`}
                      )
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-white">
                    <span className="text-[#3fca86]">{activeBowler.wickets}</span> - {activeBowler.runs}
                  </div>
                  <span className="text-[10px] text-[#8b97a3]">
                    Econ: {(activeBowler.economy ?? 0).toFixed(2)} • Maidens: {activeBowler.maidens ?? 0} • Dots: {activeBowler.dots ?? 0}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Captaincy Tactics & Match Simulation Controls (Side-by-Side) */}
      {!isMatchFinished && (
        <div className="match-panel-main rounded-2xl p-4 sm:p-5 shadow-2xl relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Captain's Tactical Orders (7 cols) */}
            <div className="md:col-span-7 space-y-3">
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#8b97a3] block flex items-center justify-between font-display">
                <span className="flex items-center gap-1.5 text-white">
                  <Shield className="w-3.5 h-3.5 text-[#e2b64a]" /> Captain’s Tactical Orders
                  {isUserBatting && <span className="text-[#e2b64a] font-mono text-[10px]">(Your Team Batting)</span>}
                  {isUserBowling && <span className="text-[#8fb2d9] font-mono text-[10px]">(Your Team Bowling)</span>}
                </span>
                {isUserBatting && (
                  <button
                    onClick={() => setTacticalTab('BATTING')}
                    className="text-[10px] text-[#e2b64a] hover:text-[#ffe9a8] font-bold cursor-pointer font-display"
                  >
                    Full Targets & Plans →
                  </button>
                )}
                {isUserBowling && (
                  <button
                    onClick={() => setTacticalTab('BOWLING')}
                    className="text-[10px] text-[#e2b64a] hover:text-[#ffe9a8] font-bold cursor-pointer font-display"
                  >
                    Full Squad & Spells →
                  </button>
                )}
              </span>

              {(() => {
                const effectiveUserTactics = match.userTactics || {
                  battingAggression: 'BALANCED' as BattingAggression,
                  bowlingTactic: 'BALANCED_CONTAIN' as BowlingTactic,
                  fieldPreset: 'BALANCED_STANDARD' as FieldPreset,
                };

                return isUserBatting ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Batting Aggression */}
                    <div>
                      <label className="text-[10px] text-[#8b97a3] uppercase font-bold tracking-wider block mb-1 font-display">
                        Team Batting Approach
                      </label>
                      <select
                        value={effectiveUserTactics.battingAggression}
                        onChange={(e) =>
                          onUpdateTactics(
                            e.target.value as BattingAggression,
                            effectiveUserTactics.bowlingTactic,
                            effectiveUserTactics.fieldPreset
                          )
                        }
                        className="w-full bg-[#10151c] border border-[#1e2733] text-xs text-white rounded-lg p-2 focus:border-[#e2b64a] cursor-pointer"
                      >
                        {match.format === 'TEST' && (
                          <option value="BLOCK">Block / Stone-wall</option>
                        )}
                        <option value="DEFENSIVE">Defensive (Protect Wickets)</option>
                        <option value="BALANCED">Balanced (Standard Flow)</option>
                        <option value="ATTACKING">Aggressive (Scoring Intent)</option>
                        <option value="SMASH">Smash (Maximum Attack)</option>
                      </select>
                    </div>

                    {/* Active Striker Approach */}
                    <div>
                      <label className="text-[10px] text-[#8b97a3] uppercase font-bold tracking-wider block mb-1 font-display">
                        Active Batter ({striker?.playerName ? striker.playerName.split(' ').pop() : 'Striker'})
                      </label>
                      <select
                        value={
                          striker
                            ? match.individualBatterInstructions?.[striker.playerId]?.approach ||
                              effectiveUserTactics.battingAggression
                            : effectiveUserTactics.battingAggression
                        }
                        onChange={(e) => {
                          if (striker && onUpdateBatterInstruction) {
                            const app = e.target.value as BattingApproach;
                            onUpdateBatterInstruction({
                              playerId: striker.playerId,
                              approach: app,
                              shotSelection:
                                app === 'SMASH' || app === 'AGGRESSIVE'
                                  ? 'LOOK_FOR_BOUNDARIES'
                                  : app === 'DEFENSIVE' || (app as string) === 'BLOCK'
                                  ? 'AVOID_RISKY_SHOTS'
                                  : 'PLAY_STRAIGHT',
                            });
                          }
                        }}
                        className="w-full bg-[#10151c] border border-[#1e2733] text-xs text-white rounded-lg p-2 focus:border-[#e2b64a] cursor-pointer"
                      >
                        {match.format === 'TEST' && (
                          <option value="BLOCK">Block (Stone-wall)</option>
                        )}
                        <option value="DEFENSIVE">Defensive (Anchor)</option>
                        <option value="BALANCED">Balanced (Normal)</option>
                        <option value="ATTACKING">Aggressive (Attack)</option>
                        <option value="SMASH">Smash (Boundary Intent)</option>
                      </select>
                    </div>
                  </div>
                ) : isUserBowling ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Bowling Strategy */}
                    <div>
                      <label className="text-[10px] text-[#8b97a3] uppercase font-bold tracking-wider block mb-1 font-display">
                        Team Bowling Strategy
                      </label>
                      <select
                        value={effectiveUserTactics.bowlingTactic}
                        onChange={(e) =>
                          onUpdateTactics(
                            effectiveUserTactics.battingAggression,
                            e.target.value as BowlingTactic,
                            effectiveUserTactics.fieldPreset
                          )
                        }
                        className="w-full bg-[#10151c] border border-[#1e2733] text-xs text-white rounded-lg p-2 focus:border-[#e2b64a] cursor-pointer"
                      >
                        <option value="TIGHT_DEFENSIVE">Tight Good Length</option>
                        <option value="BALANCED_CONTAIN">Balanced Stump-to-Stump</option>
                        <option value="ATTACKING_FULL">Attacking Full &amp; Swinging</option>
                        <option value="BOUNCER_SHORT">Short Pitch / Slower Cutter</option>
                        <option value="YORKER_DEATH">Death Bowling Yorkers</option>
                        <option value="FLIGHT_SPIN">Flight &amp; Spin Trap</option>
                      </select>
                    </div>

                  {/* Active Bowler Plan */}
                  <div>
                    <label className="text-[10px] text-[#8b97a3] uppercase font-bold tracking-wider block mb-1 font-display">
                      Bowler Plan ({activeBowler?.playerName ? activeBowler.playerName.split(' ').pop() : 'Active'})
                    </label>
                    <select
                      value={
                        activeBowler
                          ? match.individualBowlingPlans?.[activeBowler.playerId]?.intention || 'BUILD_PRESSURE'
                          : 'BUILD_PRESSURE'
                      }
                      onChange={(e) => {
                        if (activeBowler && onUpdateBowlingPlan) {
                          const intent = e.target.value as BowlingIntention;
                          let line: any = 'FOURTH_STUMP';
                          let length: any = 'GOOD_LENGTH';
                          if (intent === 'TARGET_STUMPS') {
                            line = 'MIDDLE_STUMP';
                            length = 'FULL';
                          } else if (intent === 'RESTRICT_BOUNDARIES') {
                            line = 'MIDDLE_STUMP';
                            length = 'YORKER';
                          } else if (intent === 'FORCE_MISTAKES') {
                            line = 'BODY_LINE';
                            length = 'SHORT';
                          }
                          onUpdateBowlingPlan({
                            bowlerId: activeBowler.playerId,
                            line,
                            length,
                            intention: intent,
                            targetBatterId: currentInnings?.currentStrikerId,
                          });
                        }
                      }}
                      className="w-full bg-[#10151c] border border-[#1e2733] text-xs text-white rounded-lg p-2 focus:border-[#e2b64a] cursor-pointer"
                    >
                      <option value="BUILD_PRESSURE">Standard Containment</option>
                      <option value="TARGET_STUMPS">Attack the Stumps</option>
                      <option value="OUTSIDE_OFF_CONTAINMENT">Outside-off Channel</option>
                      <option value="FORCE_MISTAKES">Short-pitch Pressure</option>
                      <option value="RESTRICT_BOUNDARIES">Death Yorkers / Full</option>
                      <option value="ATTACK_WICKETS">Wicket-taking Search</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="bg-[#10151c] border border-[#1e2733] rounded-xl p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Bot className="w-4 h-4 text-[#8fb2d9]" />
                    <div>
                      <span className="text-white font-bold block text-xs font-display">Opposition Innings In Progress</span>
                      <span className="text-[#8b97a3] text-[10px]">
                        Tactical decisions are managed automatically by the local AI Opposition Manager.
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#070a0e] border border-[#1e2733] text-[#8fb2d9] text-[10px] font-mono">
                    AI Auto
                  </span>
                </div>
              );})()}
            </div>

            {/* Simulation Controls (5 cols in Dugout styling) */}
            <div className="md:col-span-5 match-panel-secondary p-3.5 rounded-xl flex flex-col justify-center space-y-2.5 shadow-inner">
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#e2b64a] block text-center font-display">
                Match Simulation Controls
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={onSimulateBall}
                  className="btn-gold text-xs py-2 rounded-lg shadow-md transition cursor-pointer flex items-center justify-center space-x-1 active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{currentInnings.isCompleted && !isMatchFinished ? 'Next Inn' : 'Ball'}</span>
                </button>

                <button
                  onClick={onSimulateOver}
                  className="bg-[#070a0e] hover:bg-[#1a2330] text-white font-bold text-xs py-2 rounded-lg border border-[#1e2733] hover:border-[#33404f] transition cursor-pointer flex items-center justify-center space-x-1 active:scale-95 font-display"
                >
                  <FastForward className="w-3.5 h-3.5 text-[#8fb2d9]" />
                  <span>Over</span>
                </button>

                <button
                  onClick={onSimulateInnings}
                  className="bg-[#070a0e] hover:bg-[#1a2330] text-white font-bold text-xs py-2 rounded-lg border border-[#1e2733] hover:border-[#33404f] transition cursor-pointer flex items-center justify-center space-x-1 active:scale-95 font-display"
                >
                  <SkipForward className="w-3.5 h-3.5 text-[#8fb2d9]" />
                  <span>Innings</span>
                </button>

                <button
                  onClick={onSimulateMatch}
                  className="bg-[#070a0e] hover:bg-[#2c2412] text-[#ffe9a8] font-bold text-xs py-2 rounded-lg border border-[#e2b64a]/40 transition cursor-pointer flex items-center justify-center space-x-1 active:scale-95 font-display"
                >
                  <Flame className="w-3.5 h-3.5 text-[#e2b64a]" />
                  <span>Match</span>
                </button>
              </div>

              {/* Auto Broadcast Stream Button */}
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className={`w-full py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1.5 font-display ${
                  isAutoPlaying
                    ? 'bg-[#ff5470] text-white animate-pulse'
                    : 'bg-[#070a0e] text-[#ffe9a8] hover:text-white border border-[#e2b64a]/40 hover:border-[#e2b64a]'
                }`}
              >
                <span>{isAutoPlaying ? 'Pause Live Stream' : '▶ Auto Broadcast Stream (Continuous)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Live Ball-by-Ball Commentary Feed */}
      <div className="match-panel-main rounded-2xl p-4 sm:p-5 relative z-10 shadow-xl">
        <h3 className="text-xs uppercase font-extrabold text-white tracking-widest mb-3 flex items-center gap-2 font-display">
          <Activity className="w-3.5 h-3.5 text-[#e2b64a]" />
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
                className="p-2.5 rounded-xl bg-[#10151c] border border-[#1e2733] flex items-start space-x-3 shadow-sm"
              >
                <span className="font-mono font-bold text-[#e2b64a] bg-[#070a0e] px-2 py-0.5 rounded-lg border border-[#1e2733] shrink-0">
                  {ball.overNumber}.{ball.ballInOver}
                </span>
                <p className="text-[#e8edf2] flex-1 leading-relaxed">
                  {ball.commentary}
                </p>
                <span
                  className={`font-mono font-black text-xs px-2 py-0.5 rounded-lg border shrink-0 ${
                    ball.isWicket
                      ? 'bg-[#331420] text-[#ff5470] border-[#ff5470]/50'
                      : ball.runsOffBat >= 4
                      ? 'bg-[#2c2412] text-[#ffe9a8] border-[#e2b64a]/50'
                      : 'bg-[#070a0e] text-[#8fb2d9] border-[#1e2733]'
                  }`}
                >
                  {ball.isWicket ? 'W' : ball.totalRuns}
                </span>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-[#8b97a3]">
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
