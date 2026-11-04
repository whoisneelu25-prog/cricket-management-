import React, { useState, useMemo } from 'react';
import {
  X,
  Shield,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Play,
  FastForward,
  CloudSun,
  Layers,
  MapPin,
  Calendar,
  Trophy,
  Activity,
} from 'lucide-react';
import { CareerSave, Match, Player } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { getEffectivePlayersByCountry, getEffectivePlayer } from '../../data/squads';
import { selectAIPlayingXIForMatch } from '../../engine/aiTeamEngine';
import { getNextUserMatchInfo } from '../../store/careerStore';

interface MatchPreparationModalProps {
  career: CareerSave;
  match: Match;
  onClose: () => void;
  onConfirmLineup: (
    matchId: string,
    lineup: {
      playingXI: string[];
      captainId: string;
      wicketKeeperId: string;
      bowlingRotation?: string[];
    }
  ) => CareerSave;
  onStartPreparedMatch: (updatedCareer: CareerSave, matchId: string, needsAdvance: boolean) => void;
}

export const MatchPreparationModal: React.FC<MatchPreparationModalProps> = ({
  career,
  match,
  onClose,
  onConfirmLineup,
  onStartPreparedMatch,
}) => {
  const userTeamId = career.selectedTeamId;
  const userIsHome = match.homeTeamId === userTeamId;
  const oppTeamId = userIsHome ? match.awayTeamId : match.homeTeamId;

  const userTeam = INTERNATIONAL_TEAMS.find((t) => t.id === userTeamId);
  const oppTeam = INTERNATIONAL_TEAMS.find((t) => t.id === oppTeamId);

  const nextInfo = getNextUserMatchInfo(career);
  const curMs = new Date(career.currentDate || '2026-11-15').getTime();
  const matchMs = new Date(match.date || career.currentDate).getTime();
  const daysRemaining = Math.max(0, Math.round((matchMs - curMs) / (24 * 3600 * 1000)));

  let locationLabel: 'HOME' | 'AWAY' | 'NEUTRAL' = userIsHome ? 'HOME' : 'AWAY';
  const compId = match.tournamentId || match.competitionId;
  const activeTournament = compId
    ? career.tournamentEditions?.find((t) => t.id === compId)
    : undefined;
  if (
    activeTournament?.hostCountryId &&
    activeTournament.hostCountryId !== match.homeTeamId &&
    activeTournament.hostCountryId !== match.awayTeamId
  ) {
    locationLabel = 'NEUTRAL';
  }

  const eligiblePool = useMemo(() => {
    const all = getEffectivePlayersByCountry(userTeamId, career, true);
    return [...all].sort((a, b) => {
      const aElig = a.formatEligibility?.[match.format] ? 1 : 0;
      const bElig = b.formatEligibility?.[match.format] ? 1 : 0;
      if (bElig !== aElig) return bElig - aElig;
      const rA =
        match.format === 'TEST' ? a.testRating : match.format === 'ODI' ? a.odiRating : a.t20Rating;
      const rB =
        match.format === 'TEST' ? b.testRating : match.format === 'ODI' ? b.odiRating : b.t20Rating;
      return rB - rA;
    });
  }, [userTeamId, career, match.format]);

  const initialUserXI = useMemo(() => {
    const matchXI = userIsHome ? match.homeXI : match.awayXI;
    if (matchXI && matchXI.length === 11) {
      // Auto-replace injured players if any
      const healthyIds = matchXI.filter((id) => {
        const p = getEffectivePlayer(id, career);
        return p && !p.isInjured;
      });
      if (healthyIds.length === 11) return healthyIds;
      const replacements = eligiblePool
        .filter((p) => !p.isInjured && !healthyIds.includes(p.id))
        .slice(0, 11 - healthyIds.length)
        .map((p) => p.id);
      return [...healthyIds, ...replacements];
    }
    const formatXI = career.formatSquads[match.format]?.playingXI || [];
    if (formatXI.length === 11) return formatXI;
    return eligiblePool.filter((p) => !p.isInjured).slice(0, 11).map((p) => p.id);
  }, [match, userIsHome, career, eligiblePool]);

  const [playingXI, setPlayingXI] = useState<string[]>(initialUserXI);
  const [captainId, setCaptainId] = useState<string>(() => {
    const matchCap = userIsHome ? match.homeCaptainId : match.awayCaptainId;
    if (matchCap && initialUserXI.includes(matchCap)) return matchCap;
    const fmtCap = career.formatSquads[match.format]?.captainId;
    if (fmtCap && initialUserXI.includes(fmtCap)) return fmtCap;
    return initialUserXI[0] || '';
  });
  const [wicketKeeperId, setWicketKeeperId] = useState<string>(() => {
    const matchWk = userIsHome ? match.homeWicketKeeperId : match.awayWicketKeeperId;
    if (matchWk && initialUserXI.includes(matchWk)) return matchWk;
    const fmtWk = career.formatSquads[match.format]?.wicketKeeperId;
    if (fmtWk && initialUserXI.includes(fmtWk)) return fmtWk;
    const foundWk = initialUserXI.find((id) => {
      const p = getEffectivePlayer(id, career);
      return p?.isWicketKeeper || p?.role === 'WICKETKEEPER_BATTER';
    });
    return foundWk || initialUserXI[0] || '';
  });
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [savedNotice, setSavedNotice] = useState<boolean>(Boolean(match.lineupConfirmed));

  // Projected AI Opponent XI
  const oppAIConfig = useMemo(() => {
    return selectAIPlayingXIForMatch(
      oppTeamId,
      match.format,
      career,
      match.pitch,
      Boolean(match.tournamentId)
    );
  }, [oppTeamId, match.format, career, match.pitch, match.tournamentId]);

  const oppStrategy = career.aiTeams?.[oppTeamId]?.strategy || 'BALANCED';

  const xiPlayers: Player[] = playingXI
    .map((id) => eligiblePool.find((p) => p.id === id) || getEffectivePlayer(id, career))
    .filter((p): p is Player => Boolean(p));

  const bowlingOptions = xiPlayers.filter(
    (p) => p.role === 'BOWLER' || p.role === 'ALL_ROUNDER'
  );
  const injuredInXI = xiPlayers.filter((p) => p.isInjured);
  const hasWK = xiPlayers.some(
    (p) =>
      p.id === wicketKeeperId ||
      p.isWicketKeeper ||
      p.role === 'WICKETKEEPER_BATTER'
  );

  const canConfirm = playingXI.length === 11 && injuredInXI.length === 0;

  const handleToggleXI = (player: Player) => {
    setSavedNotice(false);
    if (playingXI.includes(player.id)) {
      const next = playingXI.filter((id) => id !== player.id);
      setPlayingXI(next);
      if (captainId === player.id && next[0]) setCaptainId(next[0]);
      if (wicketKeeperId === player.id && next[0]) setWicketKeeperId(next[0]);
    } else {
      if (player.isInjured) return;
      if (playingXI.length >= 11) return;
      const next = [...playingXI, player.id];
      setPlayingXI(next);
      if (!wicketKeeperId && (player.isWicketKeeper || player.role === 'WICKETKEEPER_BATTER')) {
        setWicketKeeperId(player.id);
      }
    }
  };

  const handleMoveOrder = (index: number, dir: 'UP' | 'DOWN') => {
    setSavedNotice(false);
    const target = dir === 'UP' ? index - 1 : index + 1;
    if (target < 0 || target >= playingXI.length) return;
    const copy = [...playingXI];
    const tmp = copy[index];
    copy[index] = copy[target];
    copy[target] = tmp;
    setPlayingXI(copy);
  };

  const handleConfirmOnly = () => {
    if (!canConfirm) return;
    onConfirmLineup(match.id, {
      playingXI,
      captainId: playingXI.includes(captainId) ? captainId : playingXI[0],
      wicketKeeperId: playingXI.includes(wicketKeeperId) ? wicketKeeperId : playingXI[0],
      bowlingRotation: bowlingOptions.map((b) => b.id),
    });
    setSavedNotice(true);
  };

  const handleConfirmAndPlay = () => {
    if (!canConfirm) return;
    const updatedCareer = onConfirmLineup(match.id, {
      playingXI,
      captainId: playingXI.includes(captainId) ? captainId : playingXI[0],
      wicketKeeperId: playingXI.includes(wicketKeeperId) ? wicketKeeperId : playingXI[0],
      bowlingRotation: bowlingOptions.map((b) => b.id),
    });
    onStartPreparedMatch(updatedCareer, match.id, daysRemaining > 0);
  };

  const filteredPool = eligiblePool.filter(
    (p) => roleFilter === 'ALL' || p.role === roleFilter
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/80 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="bg-[#0e1525] border border-[#243247] w-full max-w-6xl max-h-[94vh] rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#121d33] via-[#162642] to-[#121d33] border-b border-[#243247] p-4 sm:p-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-700/60 px-2.5 py-0.5 rounded font-mono">
                {match.format} PRE-MATCH PREPARATION
              </span>
              <span className="text-[11px] font-bold bg-sky-950 text-sky-300 border border-sky-800/50 px-2 py-0.5 rounded font-mono">
                {locationLabel}
              </span>
              <span className="text-[11px] font-mono text-slate-300 bg-[#0b101b] px-2 py-0.5 rounded border border-[#243247]">
                {daysRemaining === 0 ? 'MATCH DAY TODAY' : `In ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'} (${match.date})`}
              </span>
              {savedNotice && (
                <span className="text-[11px] font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Lineup Confirmed (READY)
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 mt-1">
              <span>{userTeam?.flagEmoji} {userTeam?.name}</span>
              <span className="text-slate-400 text-sm font-mono">vs</span>
              <span>{oppTeam?.flagEmoji} {oppTeam?.name}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-slate-200 font-semibold">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                {match.seriesName || 'International Fixture'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                {match.venue}
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-mono font-semibold">
                {nextInfo.nextMatch?.id === match.id ? nextInfo.seriesScoreText : match.stage || 'Official Fixture'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close match preparation"
            className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-[#243247] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Pitch, Weather & AI Opposition Report */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#131d31] border border-[#243247] p-3 rounded-lg">
              <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Pitch Surface Report
              </span>
              <div className="text-sm font-bold text-white mt-1">{match.pitch.name}</div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-1">
                <span>Pace: <strong className="text-slate-200">{match.pitch.paceBonus >= 0 ? `+${match.pitch.paceBonus}` : match.pitch.paceBonus}</strong></span>
                <span>Spin: <strong className="text-slate-200">{match.pitch.spinBonus >= 0 ? `+${match.pitch.spinBonus}` : match.pitch.spinBonus}</strong></span>
                <span>Wear: <strong className="text-slate-200">{match.pitch.wearFactor}</strong></span>
              </div>
            </div>

            <div className="bg-[#131d31] border border-[#243247] p-3 rounded-lg">
              <span className="text-[10px] font-bold uppercase text-sky-400 tracking-wider flex items-center gap-1.5">
                <CloudSun className="w-3.5 h-3.5" /> Overhead & Weather
              </span>
              <div className="text-sm font-bold text-white mt-1">
                {match.weather.type.replace(/_/g, ' ')} (Swing {match.weather.swingBonus >= 0 ? `+${match.weather.swingBonus}` : match.weather.swingBonus})
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                {match.weather.description}
              </p>
            </div>

            <div className="bg-[#131d31] border border-[#243247] p-3 rounded-lg">
              <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Opponent Scouting ({oppTeam?.code})
              </span>
              <div className="text-sm font-bold text-white mt-1">
                AI Philosophy: {oppStrategy.replace('_', ' ')}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                Capt: {getEffectivePlayer(oppAIConfig.captainId, career)?.shortName || 'TBA'} • WK: {getEffectivePlayer(oppAIConfig.wicketKeeperId, career)?.shortName || 'TBA'}
              </p>
            </div>
          </div>

          {/* Validation Alerts */}
          {(playingXI.length !== 11 || injuredInXI.length > 0 || !hasWK || bowlingOptions.length < 4) && (
            <div className="space-y-1.5">
              {playingXI.length !== 11 && (
                <div className="bg-amber-950/60 border border-amber-700/60 text-amber-200 px-3 py-2 rounded text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Select exactly 11 players to confirm your Playing XI (currently {playingXI.length}/11).</span>
                </div>
              )}
              {injuredInXI.length > 0 && (
                <div className="bg-rose-950/60 border border-rose-700/60 text-rose-200 px-3 py-2 rounded text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Injured player(s) in XI: {injuredInXI.map((p) => p.shortName).join(', ')}. Replace before confirming.</span>
                </div>
              )}
              {!hasWK && (
                <div className="bg-amber-950/40 border border-amber-800/50 text-amber-300 px-3 py-1.5 rounded text-xs flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Advisory: Designate a specialist wicketkeeper (WK) in your Playing XI.</span>
                </div>
              )}
              {bowlingOptions.length < 4 && (
                <div className="bg-amber-950/40 border border-amber-800/50 text-amber-300 px-3 py-1.5 rounded text-xs flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Advisory: Only {bowlingOptions.length} bowling options selected (5+ recommended).</span>
                </div>
              )}
            </div>
          )}

          {/* 3-Column Selector: User Playing XI (5) | Eligible Squad Pool (5) | Opponent Projected XI (2) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* User Playing XI & Batting Order */}
            <div className="lg:col-span-5 bg-[#121a2b] border border-[#243247] rounded-lg p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#243247] pb-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>{userTeam?.name} Playing XI ({playingXI.length}/11)</span>
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Bowling Options: <strong className="text-white">{bowlingOptions.length}</strong> • Batting Order 1–11
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {xiPlayers.map((p, idx) => {
                  const isC = p.id === captainId;
                  const isWK = p.id === wicketKeeperId;
                  const rtg =
                    match.format === 'TEST'
                      ? p.testRating
                      : match.format === 'ODI'
                      ? p.odiRating
                      : p.t20Rating;

                  return (
                    <div
                      key={p.id}
                      className="bg-[#182338] border border-[#273650] rounded p-2 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-[#0d1422] border border-[#273650] text-[10px] font-mono font-bold text-slate-400 flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-white truncate">{p.shortName}</span>
                            {isC && (
                              <span className="text-[9px] bg-amber-600 text-white px-1 rounded font-bold">
                                C
                              </span>
                            )}
                            {isWK && (
                              <span className="text-[9px] bg-sky-600 text-white px-1 rounded font-bold">
                                WK
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {p.role.replace('_', ' ')} • {rtg} RTG • Fat {p.workloadFatigue || 10}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleMoveOrder(idx, 'UP')}
                          disabled={idx === 0}
                          className="p-0.5 text-slate-400 hover:text-white disabled:opacity-25 cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveOrder(idx, 'DOWN')}
                          disabled={idx === xiPlayers.length - 1}
                          className="p-0.5 text-slate-400 hover:text-white disabled:opacity-25 cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSavedNotice(false);
                            setCaptainId(p.id);
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                            isC ? 'bg-amber-600 text-white' : 'bg-[#0e1525] text-slate-400 hover:text-white'
                          }`}
                          title="Assign Captain"
                        >
                          C
                        </button>
                        <button
                          onClick={() => {
                            setSavedNotice(false);
                            setWicketKeeperId(p.id);
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                            isWK ? 'bg-sky-600 text-white' : 'bg-[#0e1525] text-slate-400 hover:text-white'
                          }`}
                          title="Assign Wicketkeeper"
                        >
                          WK
                        </button>
                        <button
                          onClick={() => handleToggleXI(p)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/60 hover:bg-rose-900 font-bold cursor-pointer ml-0.5"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Available Format Squad Pool */}
            <div className="lg:col-span-4 bg-[#121a2b] border border-[#243247] rounded-lg p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#243247] pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>National Squad Pool ({eligiblePool.length})</span>
                </h3>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {['ALL', 'BATTER', 'ALL_ROUNDER', 'WICKETKEEPER_BATTER', 'BOWLER'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer whitespace-nowrap ${
                      roleFilter === r
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#182338] text-slate-400 hover:text-white'
                    }`}
                  >
                    {r === 'WICKETKEEPER_BATTER' ? 'WK' : r.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 max-h-[345px] overflow-y-auto pr-1">
                {filteredPool.map((p) => {
                  const inXI = playingXI.includes(p.id);
                  const rtg =
                    match.format === 'TEST'
                      ? p.testRating
                      : match.format === 'ODI'
                      ? p.odiRating
                      : p.t20Rating;

                  return (
                    <div
                      key={p.id}
                      className={`border rounded p-2 flex items-center justify-between text-xs ${
                        inXI
                          ? 'bg-[#182338]/40 border-emerald-900/40 opacity-60'
                          : p.isInjured
                          ? 'bg-rose-950/20 border-rose-900/40 opacity-75'
                          : 'bg-[#182338] border-[#273650]'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white truncate">{p.shortName}</span>
                          <span className="text-[9px] text-slate-400 font-mono bg-[#0e1525] px-1 rounded">
                            {p.role === 'WICKETKEEPER_BATTER' ? 'WK' : p.role.replace('_', ' ')}
                          </span>
                          {p.isInjured && (
                            <span className="text-[9px] bg-rose-950 text-rose-300 px-1 rounded font-bold">
                              INJ ({p.injuryDaysRemaining}d)
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {rtg} RTG • Form {p.currentForm ?? 80} • Fat {p.workloadFatigue || 10}%
                        </span>
                      </div>

                      <button
                        disabled={p.isInjured || (!inXI && playingXI.length >= 11)}
                        onClick={() => handleToggleXI(p)}
                        className={`text-[10px] px-2 py-1 rounded font-bold shrink-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                          inXI
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {inXI ? 'Remove' : '+ Select'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Opponent Projected XI (Read-only) */}
            <div className="lg:col-span-3 bg-[#121a2b] border border-[#243247] rounded-lg p-3.5 space-y-2.5">
              <div className="border-b border-[#243247] pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  {oppTeam?.name} Projected XI
                </h3>
                <span className="text-[10px] text-slate-400">AI Selection (Read-Only)</span>
              </div>

              <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
                {oppAIConfig.playingXI.map((id, idx) => {
                  const op = getEffectivePlayer(id, career);
                  if (!op) return null;
                  const isC = id === oppAIConfig.captainId;
                  const isWK = id === oppAIConfig.wicketKeeperId;
                  return (
                    <div
                      key={id}
                      className="bg-[#182338]/70 border border-[#243247] px-2 py-1.5 rounded flex items-center justify-between text-[11px]"
                    >
                      <span className="text-slate-200 truncate">
                        <span className="text-slate-500 font-mono mr-1">{idx + 1}.</span>
                        {op.shortName}
                        {isC && <strong className="ml-1 text-amber-400 text-[9px]">(C)</strong>}
                        {isWK && <strong className="ml-1 text-sky-400 text-[9px]">(WK)</strong>}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono shrink-0 ml-1">
                        {op.role === 'WICKETKEEPER_BATTER' ? 'WK' : op.role.slice(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#121a2b] border-t border-[#243247] p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white px-3 py-2 rounded border border-[#243247] bg-[#182338] cursor-pointer font-semibold"
          >
            Back to Dashboard
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              disabled={!canConfirm}
              onClick={handleConfirmOnly}
              className="bg-[#1b2a44] hover:bg-[#24385a] disabled:opacity-40 text-sky-300 border border-sky-700/50 font-bold text-xs px-4 py-2 rounded transition cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirm Lineup (Mark READY)</span>
            </button>

            <button
              disabled={!canConfirm}
              onClick={handleConfirmAndPlay}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs px-5 py-2 rounded shadow-lg transition cursor-pointer flex items-center gap-1.5"
            >
              {daysRemaining > 0 ? (
                <>
                  <FastForward className="w-3.5 h-3.5" />
                  <span>Confirm & Advance to Match Day ({daysRemaining}d)</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Confirm & Start Match Toss</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

