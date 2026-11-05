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
  Award,
} from 'lucide-react';
import { CareerSave, Match, Player } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { getEffectivePlayersByCountry, getEffectivePlayer } from '../../data/squads';
import { selectAIPlayingXIForMatch } from '../../engine/aiTeamEngine';
import { getNextUserMatchInfo } from '../../store/careerStore';
import { CountryFlag } from '../common/CountryFlag';
import { PlayerAvatar } from '../common/PlayerAvatar';

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

  const activeTour = match.tourId
    ? career.tours.find((t) => t.id === match.tourId)
    : undefined;

  // Format-specific tour squad IDs
  const formatSquadIds = useMemo(() => {
    const tourFmtIds = activeTour?.squadAnnounced
      ? activeTour.formatSquads?.[match.format] || activeTour.tourSquadIds
      : undefined;
    if (tourFmtIds && tourFmtIds.length >= 11) {
      return tourFmtIds;
    }
    const savedFmtIds = career.formatSquads[match.format]?.squadPlayerIds;
    if (savedFmtIds && savedFmtIds.length >= 11) {
      return savedFmtIds;
    }
    return undefined;
  }, [activeTour, career.formatSquads, match.format]);

  const [poolMode, setPoolMode] = useState<'TOUR_SQUAD' | 'NATIONAL_POOL'>(
    formatSquadIds ? 'TOUR_SQUAD' : 'NATIONAL_POOL'
  );

  const eligiblePool = useMemo(() => {
    const all = getEffectivePlayersByCountry(userTeamId, career, true);
    const scoped =
      poolMode === 'TOUR_SQUAD' && formatSquadIds
        ? all.filter((p) => formatSquadIds.includes(p.id))
        : all;
    const healthyScoped = scoped.filter((p) => !p.isInjured);
    const effectiveList = healthyScoped.length >= 11 ? scoped : all;

    return [...effectiveList].sort((a, b) => {
      const aElig = a.formatEligibility?.[match.format] ? 1 : 0;
      const bElig = b.formatEligibility?.[match.format] ? 1 : 0;
      if (bElig !== aElig) return bElig - aElig;
      const rA =
        match.format === 'TEST' ? a.testRating : match.format === 'ODI' ? a.odiRating : a.t20Rating;
      const rB =
        match.format === 'TEST' ? b.testRating : match.format === 'ODI' ? b.odiRating : b.t20Rating;
      return rB - rA;
    });
  }, [userTeamId, career, match.format, poolMode, formatSquadIds]);

  const initialUserXI = useMemo(() => {
    const matchXI = userIsHome ? match.homeXI : match.awayXI;
    if (matchXI && matchXI.length === 11) {
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
    const fmtCfg = career.formatSquads[match.format];
    const formatXI =
      fmtCfg?.battingOrder?.length === 11
        ? fmtCfg.battingOrder
        : fmtCfg?.playingXI || [];
    if (formatXI.length === 11) {
      const healthyFmt = formatXI.filter((id) => {
        const p = getEffectivePlayer(id, career);
        return p && !p.isInjured && (!formatSquadIds || formatSquadIds.includes(id));
      });
      if (healthyFmt.length === 11) return healthyFmt;
    }
    return eligiblePool.filter((p) => !p.isInjured).slice(0, 11).map((p) => p.id);
  }, [match, userIsHome, career, eligiblePool, formatSquadIds]);

  const [playingXI, setPlayingXI] = useState<string[]>(initialUserXI);
  const [captainId, setCaptainId] = useState<string>(() => {
    const matchCap = userIsHome ? match.homeCaptainId : match.awayCaptainId;
    if (matchCap && initialUserXI.includes(matchCap)) return matchCap;
    const tourCap = activeTour?.captains?.[match.format];
    if (tourCap && initialUserXI.includes(tourCap)) return tourCap;
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
  const [selectedBowlerIds, setSelectedBowlerIds] = useState<string[]>(() => {
    const matchBowl = userIsHome ? match.homeBowlingOptions : match.awayBowlingOptions;
    const baseBowl =
      matchBowl && matchBowl.length > 0
        ? matchBowl
        : career.formatSquads[match.format]?.bowlingRotation || [];
    const validSaved = baseBowl.filter(
      (id) => initialUserXI.includes(id) && id !== wicketKeeperId
    );
    if (validSaved.length >= 4) return validSaved;
    return initialUserXI.filter((id) => {
      if (id === wicketKeeperId) return false;
      const p = getEffectivePlayer(id, career);
      return p?.role === 'BOWLER' || p?.role === 'ALL_ROUNDER';
    });
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

  const effectiveSelectedBowlerIds = selectedBowlerIds.filter(
    (id) => playingXI.includes(id) && id !== wicketKeeperId
  );
  const bowlingOptions = xiPlayers.filter((p) => effectiveSelectedBowlerIds.includes(p.id));
  const injuredInXI = xiPlayers.filter((p) => p.isInjured);
  const hasWK = xiPlayers.some(
    (p) =>
      p.id === wicketKeeperId ||
      p.isWicketKeeper ||
      p.role === 'WICKETKEEPER_BATTER'
  );

  const canConfirm = playingXI.length === 11 && injuredInXI.length === 0;

  const handleToggleBowlerOption = (playerId: string) => {
    if (playerId === wicketKeeperId) return;
    setSavedNotice(false);
    setSelectedBowlerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const handleToggleXI = (player: Player) => {
    setSavedNotice(false);
    if (playingXI.includes(player.id)) {
      const next = playingXI.filter((id) => id !== player.id);
      setPlayingXI(next);
      setSelectedBowlerIds((prev) => prev.filter((id) => id !== player.id));
      if (captainId === player.id && next[0]) setCaptainId(next[0]);
      if (wicketKeeperId === player.id && next[0]) setWicketKeeperId(next[0]);
    } else {
      if (player.isInjured) return;
      if (playingXI.length >= 11) return;
      const next = [...playingXI, player.id];
      setPlayingXI(next);
      let nextWk = wicketKeeperId;
      if (!wicketKeeperId && (player.isWicketKeeper || player.role === 'WICKETKEEPER_BATTER')) {
        nextWk = player.id;
        setWicketKeeperId(player.id);
      }
      if (
        player.id !== nextWk &&
        (player.role === 'BOWLER' || player.role === 'ALL_ROUNDER')
      ) {
        setSelectedBowlerIds((prev) => (prev.includes(player.id) ? prev : [...prev, player.id]));
      }
    }
  };

  const handleMoveOrder = (index: number, direction: 'UP' | 'DOWN') => {
    if (direction === 'UP' && index === 0) return;
    if (direction === 'DOWN' && index === playingXI.length - 1) return;
    setSavedNotice(false);
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    const next = [...playingXI];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    setPlayingXI(next);
  };

  const handleSaveAndConfirm = (): CareerSave | null => {
    if (!canConfirm) return null;
    const finalBowlers =
      effectiveSelectedBowlerIds.length >= 4
        ? effectiveSelectedBowlerIds
        : xiPlayers
            .filter((p) => p.id !== wicketKeeperId && (p.role === 'BOWLER' || p.role === 'ALL_ROUNDER'))
            .map((p) => p.id);

    const updatedCareer = onConfirmLineup(match.id, {
      playingXI,
      captainId,
      wicketKeeperId,
      bowlingRotation: finalBowlers,
    });
    setSavedNotice(true);
    return updatedCareer;
  };

  const handleStartNow = () => {
    const updatedCareer = handleSaveAndConfirm();
    if (!updatedCareer) return;
    onStartPreparedMatch(updatedCareer, match.id, daysRemaining > 0);
  };

  const filteredPool = eligiblePool.filter((p) => {
    if (roleFilter === 'ALL') return true;
    if (roleFilter === 'BAT') return p.role === 'BATTER';
    if (roleFilter === 'BOWL') return p.role === 'BOWLER';
    if (roleFilter === 'AR') return p.role === 'ALL_ROUNDER';
    if (roleFilter === 'WK') return p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER';
    return true;
  });

  const stadiumPhoto =
    match.format === 'TEST'
      ? '/assets/stadiums/jaitley-day.jpg'
      : '/assets/stadiums/chepauk-night.jpg';

  return (
    <div className="fixed inset-0 z-50 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in">
      <div className="bg-[#070a0e] border border-[#1e2733] w-full max-w-6xl max-h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#e8edf2]">
        {/* Header with Stadium Banner Underlay */}
        <div className="relative overflow-hidden border-b border-[#1e2733] p-5 sm:p-6">
          <div className="absolute inset-0 z-0">
            <img
              src={stadiumPhoto}
              alt="Stadium Backdrop"
              className="w-full h-full object-cover object-center filter brightness-[0.3] saturate-[0.8]"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070a0e] via-[#070a0e]/90 to-[#070a0e]/60" />
          </div>

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-[#2c2412] text-[#ffe9a8] border border-[#e2b64a]/50 px-2.5 py-0.5 rounded font-display">
                  {match.format} MATCH PREPARATION
                </span>
                <span className="text-[10px] font-extrabold bg-[#10151c] text-[#8fb2d9] border border-[#1e2733] px-2 py-0.5 rounded font-mono">
                  {locationLabel}
                </span>
                <span className="text-[10px] font-mono text-[#8b97a3] bg-[#070a0e] px-2 py-0.5 rounded border border-[#1e2733]">
                  {daysRemaining === 0 ? 'MATCH DAY TODAY' : `In ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'} (${match.date})`}
                </span>
                {savedNotice && (
                  <span className="text-[10px] font-bold bg-[#0e2c1d] text-[#3fca86] border border-[#3fca86]/50 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3 h-3" /> Lineup Confirmed
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 mt-1 font-display">
                <span className="flex items-center gap-2">
                  <CountryFlag countryCode={userTeam?.code || userTeamId} size="md" />
                  {userTeam?.name}
                </span>
                <span className="text-[#e2b64a] text-sm font-bold font-mono">VS</span>
                <span className="flex items-center gap-2">
                  <CountryFlag countryCode={oppTeam?.code || oppTeamId} size="md" />
                  {oppTeam?.name}
                </span>
              </h2>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[#8b97a3]">
                <span className="flex items-center gap-1.5 text-[#e8edf2] font-semibold">
                  <Trophy className="w-3.5 h-3.5 text-[#e2b64a]" />
                  {match.seriesName || 'International Fixture'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#3fca86]" />
                  {match.venue}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close match preparation"
              className="text-[#8b97a3] hover:text-white p-2 rounded-lg bg-[#10151c] border border-[#1e2733] hover:border-[#33404f] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Pitch, Weather & Opposition Scouting */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#10151c] border border-[#1e2733] p-3 rounded-xl">
              <span className="text-[10px] font-extrabold uppercase text-[#e2b64a] tracking-wider flex items-center gap-1.5 font-display">
                <Layers className="w-3.5 h-3.5" /> Pitch Surface Report
              </span>
              <div className="text-sm font-bold text-white mt-1 font-display">{match.pitch.name}</div>
              <div className="flex items-center gap-3 text-[11px] text-[#8b97a3] font-mono mt-1">
                <span>Pace: <strong className="text-white">{match.pitch.paceBonus >= 0 ? `+${match.pitch.paceBonus}` : match.pitch.paceBonus}</strong></span>
                <span>Spin: <strong className="text-white">{match.pitch.spinBonus >= 0 ? `+${match.pitch.spinBonus}` : match.pitch.spinBonus}</strong></span>
                <span>Wear: <strong className="text-white">{match.pitch.wearFactor}</strong></span>
              </div>
            </div>

            <div className="bg-[#10151c] border border-[#1e2733] p-3 rounded-xl">
              <span className="text-[10px] font-extrabold uppercase text-[#8fb2d9] tracking-wider flex items-center gap-1.5 font-display">
                <CloudSun className="w-3.5 h-3.5" /> Overhead Weather
              </span>
              <div className="text-sm font-bold text-white mt-1 font-display">
                {match.weather.type.replace(/_/g, ' ')}
              </div>
              <p className="text-[11px] text-[#8b97a3] mt-1 truncate">
                {match.weather.description} (Swing {match.weather.swingBonus >= 0 ? `+${match.weather.swingBonus}` : match.weather.swingBonus})
              </p>
            </div>

            <div className="bg-[#10151c] border border-[#1e2733] p-3 rounded-xl">
              <span className="text-[10px] font-extrabold uppercase text-[#3fca86] tracking-wider flex items-center gap-1.5 font-display">
                <Activity className="w-3.5 h-3.5" /> Opponent Intelligence
              </span>
              <div className="text-sm font-bold text-white mt-1 font-display">
                {oppTeam?.name} ({oppStrategy.replace('_', ' ')})
              </div>
              <p className="text-[11px] text-[#8b97a3] mt-1 truncate font-mono">
                Capt: {getEffectivePlayer(oppAIConfig.captainId, career)?.shortName || 'TBA'} • WK: {getEffectivePlayer(oppAIConfig.wicketKeeperId, career)?.shortName || 'TBA'}
              </p>
            </div>
          </div>

          {/* Validation Alerts */}
          {(playingXI.length !== 11 || injuredInXI.length > 0 || !hasWK || bowlingOptions.length < 4) && (
            <div className="space-y-2">
              {playingXI.length !== 11 && (
                <div className="bg-[#2c2412] border border-[#e2b64a]/50 text-[#ffe9a8] px-3.5 py-2 rounded-xl text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#e2b64a] shrink-0" />
                  <span>Select exactly 11 players to finalize your Playing XI ({playingXI.length}/11 selected).</span>
                </div>
              )}
              {injuredInXI.length > 0 && (
                <div className="bg-[#331420] border border-[#ff5470]/50 text-[#ff5470] px-3.5 py-2 rounded-xl text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#ff5470] shrink-0" />
                  <span>Injured player(s) in XI: {injuredInXI.map((p) => p.shortName).join(', ')}. Replace before taking the field.</span>
                </div>
              )}
              {!hasWK && (
                <div className="bg-[#10151c] border border-[#e2b64a]/30 text-[#ffe9a8] px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#e2b64a] shrink-0" />
                  <span>Advisory: Designate a specialist wicketkeeper (WK) in your Playing XI.</span>
                </div>
              )}
            </div>
          )}

          {/* 3-Column Squad Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Playing XI List (5 Columns) */}
            <div className="lg:col-span-5 bg-[#10151c] border border-[#1e2733] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1e2733] pb-2.5">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#e2b64a] flex items-center gap-2 font-display">
                    <Shield className="w-4 h-4" />
                    <span>{userTeam?.name} Playing XI ({playingXI.length}/11)</span>
                  </h3>
                  <span className="text-[10px] text-[#8b97a3] font-mono">
                    Batting Slots 1–11 • Bowlers: <strong className="text-white">{bowlingOptions.length}</strong>
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
                      className="bg-[#070a0e] border border-[#1e2733] hover:border-[#33404f] rounded-xl p-2.5 flex items-center justify-between text-xs transition shadow-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-[#10151c] border border-[#1e2733] text-[10px] font-mono font-bold text-[#8fb2d9] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <PlayerAvatar player={p} size="xs" showFlag={false} />
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white truncate font-display">{p.shortName}</span>
                            {isC && (
                              <span className="text-[8.5px] bg-[#2c2412] text-[#ffe9a8] border border-[#e2b64a]/50 px-1 rounded font-black font-mono">
                                C
                              </span>
                            )}
                            {isWK && (
                              <span className="text-[8.5px] bg-amber-950 text-amber-300 border border-amber-400/50 px-1 rounded font-black font-mono">
                                WK
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#8b97a3] font-mono">
                            {p.role} • {rtg} RTG
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleMoveOrder(idx, 'UP')}
                          disabled={idx === 0}
                          className="p-1 text-[#8b97a3] hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move Up Order"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveOrder(idx, 'DOWN')}
                          disabled={idx === xiPlayers.length - 1}
                          className="p-1 text-[#8b97a3] hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move Down Order"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSavedNotice(false);
                            setCaptainId(p.id);
                          }}
                          className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                            isC ? 'bg-[#2c2412] text-[#ffe9a8] border border-[#e2b64a]' : 'bg-[#10151c] text-[#8b97a3] hover:text-white'
                          }`}
                          title="Set as Captain"
                        >
                          C
                        </button>
                        <button
                          onClick={() => {
                            setSavedNotice(false);
                            setWicketKeeperId(p.id);
                            setSelectedBowlerIds((prev) => prev.filter((id) => id !== p.id));
                          }}
                          className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                            isWK ? 'bg-amber-950 text-amber-300 border border-amber-400' : 'bg-[#10151c] text-[#8b97a3] hover:text-white'
                          }`}
                          title="Set as Wicketkeeper"
                        >
                          WK
                        </button>
                        <button
                          disabled={isWK}
                          onClick={() => handleToggleBowlerOption(p.id)}
                          className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold cursor-pointer disabled:opacity-30 ${
                            effectiveSelectedBowlerIds.includes(p.id)
                              ? 'bg-[#0e2c1d] text-[#3fca86] border border-[#3fca86]'
                              : 'bg-[#10151c] text-[#8b97a3] hover:text-white'
                          }`}
                          title="Nominate Bowler"
                        >
                          BOWL
                        </button>
                        <button
                          onClick={() => handleToggleXI(p)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[#331420] text-[#ff5470] border border-[#ff5470]/40 hover:bg-[#ff5470]/20 font-bold cursor-pointer ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Eligible Squad Pool (4 Columns) */}
            <div className="lg:col-span-4 bg-[#10151c] border border-[#1e2733] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1e2733] pb-2.5">
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#8fb2d9] flex items-center gap-2 font-display">
                  <Users className="w-4 h-4" /> Available Pool ({filteredPool.length})
                </span>
                {formatSquadIds && (
                  <button
                    onClick={() =>
                      setPoolMode((prev) =>
                        prev === 'TOUR_SQUAD' ? 'NATIONAL_POOL' : 'TOUR_SQUAD'
                      )
                    }
                    className="text-[10px] text-[#e2b64a] hover:underline font-mono"
                  >
                    {poolMode === 'TOUR_SQUAD' ? 'Tour Squad' : 'National Pool'}
                  </button>
                )}
              </div>

              {/* Role Filter Tabs */}
              <div className="flex items-center gap-1 bg-[#070a0e] p-1 rounded-lg border border-[#1e2733] text-[10px] font-bold">
                {(['ALL', 'BAT', 'BOWL', 'AR', 'WK'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`flex-1 py-1 rounded transition cursor-pointer ${
                      roleFilter === r
                        ? 'bg-[#2c2412] text-[#ffe9a8] border border-[#e2b64a]/50'
                        : 'text-[#8b97a3] hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 max-h-[330px] overflow-y-auto pr-1">
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
                      onClick={() => !inXI && handleToggleXI(p)}
                      className={`p-2 rounded-xl border flex items-center justify-between text-xs transition ${
                        inXI
                          ? 'bg-[#070a0e]/50 border-[#1e2733]/40 opacity-40 cursor-default'
                          : p.isInjured
                          ? 'bg-[#331420]/30 border-[#ff5470]/30 opacity-60 cursor-not-allowed'
                          : 'bg-[#070a0e] border-[#1e2733] hover:border-[#e2b64a]/50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <PlayerAvatar player={p} size="xs" showFlag={false} />
                        <div className="truncate">
                          <span className="font-bold text-white block truncate font-display">{p.shortName}</span>
                          <span className="text-[10px] text-[#8b97a3] font-mono">
                            {p.role} • {rtg} RTG
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {inXI ? (
                          <span className="text-[10px] text-[#3fca86] font-mono font-bold">In XI</span>
                        ) : p.isInjured ? (
                          <span className="text-[10px] text-[#ff5470] font-mono">Injured</span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleXI(p);
                            }}
                            className="text-[10px] bg-[#2c2412] hover:bg-[#453718] text-[#ffe9a8] border border-[#e2b64a]/50 px-2 py-0.5 rounded font-extrabold cursor-pointer"
                          >
                            + Select
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Opponent Projected Lineup (3 Columns) */}
            <div className="lg:col-span-3 bg-[#10151c] border border-[#1e2733] rounded-xl p-4 space-y-3">
              <div className="border-b border-[#1e2733] pb-2.5">
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#3fca86] flex items-center gap-2 font-display">
                  <Activity className="w-4 h-4" /> {oppTeam?.code} Projected XI
                </span>
                <span className="text-[10px] text-[#8b97a3] block mt-0.5">
                  AI Tactical Setup & Bowlers
                </span>
              </div>

              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {oppAIConfig.playingXI.map((id, idx) => {
                  const p = getEffectivePlayer(id, career);
                  const isC = id === oppAIConfig.captainId;
                  const isWK = id === oppAIConfig.wicketKeeperId;
                  const isBowl = oppAIConfig.bowlingRotation?.includes(id);

                  return (
                    <div
                      key={id}
                      className="bg-[#070a0e] border border-[#1e2733] rounded-lg p-2 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[9px] font-mono text-[#8b97a3]">{idx + 1}.</span>
                        <span className="font-semibold text-[#e8edf2] truncate">{p?.shortName || id}</span>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[8px] shrink-0">
                        {isC && <span className="px-1 rounded bg-[#2c2412] text-[#ffe9a8] font-bold">C</span>}
                        {isWK && <span className="px-1 rounded bg-amber-950 text-amber-300 font-bold">WK</span>}
                        {isBowl && <span className="px-1 rounded bg-[#0e2c1d] text-[#3fca86]">BOWL</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="bg-[#10151c] border-t border-[#1e2733] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#8b97a3] font-mono">
            Lineup Status:{' '}
            <strong className={canConfirm ? 'text-[#3fca86]' : 'text-[#ff5470]'}>
              {canConfirm ? '11 Valid Players Designated' : 'Incomplete Lineup'}
            </strong>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSaveAndConfirm}
              disabled={!canConfirm}
              className="bg-[#070a0e] hover:bg-[#1a2330] text-[#ffe9a8] border border-[#e2b64a]/50 disabled:opacity-40 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer shadow-md"
            >
              Save Lineup Configuration
            </button>

            <button
              onClick={handleStartNow}
              disabled={!canConfirm}
              className="btn-gold disabled:opacity-40 text-xs px-5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-lg active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{daysRemaining === 0 ? 'Take the Field (Start Match)' : 'Simulate & Start Match'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
