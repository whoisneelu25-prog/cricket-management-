import React, { useState } from 'react';
import {
  Trophy,
  Award,
  FileText,
  ArrowRight,
  CheckCircle2,
  Calendar,
  MapPin,
  Activity,
  AlertTriangle,
  Newspaper,
  Shield,
  Users,
} from 'lucide-react';
import { CareerSave, Match, Player } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { getEffectivePlayer } from '../../data/squads';
import { determineMatchOutcome, computeMatchResult } from '../../engine/matchEngine';
import { sortTournamentTable } from '../../engine/tournamentEngine';
import { getNextUserMatchInfo } from '../../store/careerStore';
import { ScorecardModal } from './ScorecardModal';

interface PostMatchSummaryViewProps {
  match: Match;
  career?: CareerSave;
  onContinueToDashboard: () => void;
  onPrepareNextMatch: (nextMatchId: string) => void;
  onSelectPlayer?: (player: Player) => void;
}

export const PostMatchSummaryView: React.FC<PostMatchSummaryViewProps> = ({
  match,
  career,
  onContinueToDashboard,
  onPrepareNextMatch,
  onSelectPlayer,
}) => {
  const [showFullScorecard, setShowFullScorecard] = useState(false);

  const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.homeTeamId);
  const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === match.awayTeamId);
  const outcome = determineMatchOutcome(match);
  const winnerTeam = outcome.winnerTeamId
    ? INTERNATIONAL_TEAMS.find((t) => t.id === outcome.winnerTeamId)
    : undefined;

  const userTeamId = career?.selectedTeamId || match.userTeamId;
  const userWon = outcome.winnerTeamId === userTeamId;
  const isDrawOrTie = outcome.isDraw || outcome.isTie;

  // Next match preview info
  const nextInfo = career ? getNextUserMatchInfo(career) : null;
  const nextMatch =
    nextInfo?.nextMatch && nextInfo.nextMatch.id !== match.id
      ? nextInfo.nextMatch
      : career?.fixtures.find(
          (f) =>
            f.id !== match.id &&
            f.status !== 'COMPLETED' &&
            f.status !== 'DRAW' &&
            f.status !== 'TIE'
        );

  const nextOppId = nextMatch
    ? nextMatch.homeTeamId === userTeamId
      ? nextMatch.awayTeamId
      : nextMatch.homeTeamId
    : null;
  const nextOppTeam = nextOppId ? INTERNATIONAL_TEAMS.find((t) => t.id === nextOppId) : null;

  // Related Tour / Series Score
  const relatedTour =
    career && match.tourId ? career.tours.find((t) => t.id === match.tourId) : undefined;
  const seriesState = relatedTour?.series?.[match.format];

  // Related Tournament Standings
  const compId = match.tournamentId || match.competitionId;
  const relatedTournament =
    career && compId
      ? career.tournamentEditions?.find(
          (t) =>
            t.id === compId ||
            (t.competitionType === 'WTC' && match.format === 'TEST' && !match.tournamentId)
        )
      : undefined;

  const topStandings = relatedTournament
    ? sortTournamentTable(relatedTournament.table, Boolean(relatedTournament.rules.usePCT)).slice(
        0,
        4
      )
    : [];

  // Player performance & fatigue/injury updates for user XI
  const userXIIds = match.homeTeamId === userTeamId ? match.homeXI : match.awayXI;
  const userPlayerUpdates = (userXIIds || []).slice(0, 6).map((pId) => {
    const eff = getEffectivePlayer(pId, career);
    let runs = 0;
    let balls = 0;
    let wkts = 0;
    let runsConceded = 0;
    match.innings.forEach((inn) => {
      const b = inn.batters.find((x) => x.playerId === pId);
      if (b) {
        runs += b.runs;
        balls += b.balls;
      }
      const bw = inn.bowlers.find((x) => x.playerId === pId);
      if (bw) {
        wkts += bw.wickets;
        runsConceded += bw.runs;
      }
    });
    return {
      player: eff,
      runs,
      balls,
      wkts,
      runsConceded,
    };
  });

  // Match news report
  const matchNews = career?.news.find((n) => n.id === `news_user_match_${match.id}`) || career?.news[0];

  return (
    <div className="space-y-5 select-none animate-in fade-in duration-150">
      {/* 1. Official Match Result Hero Banner */}
      <div
        className={`border rounded-xl p-5 sm:p-6 shadow-xl bg-gradient-to-r ${
          userWon
            ? 'from-emerald-950/80 via-[#10232b] to-[#121824] border-emerald-600/50'
            : isDrawOrTie
            ? 'from-[#162136] via-[#121b2d] to-[#121824] border-sky-700/50'
            : 'from-[#221624] via-[#161c2e] to-[#121824] border-slate-700'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50 font-mono">
                {match.format} OFFICIAL RESULT
              </span>
              <span className="text-xs text-slate-300 font-semibold">
                {match.seriesName || 'International Match'}
              </span>
              <span className="text-xs text-slate-400 font-mono">• {match.venue} ({match.date})</span>
              <span className="text-[10px] bg-sky-950/80 text-sky-300 border border-sky-800/50 px-2 py-0.5 rounded font-mono">
                Result Saved Permanently
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {match.resultText || computeMatchResult(match).resultText}
            </h1>

            <p className="text-xs text-slate-300">
              {winnerTeam
                ? `Winning Nation: ${winnerTeam.flagEmoji} ${winnerTeam.name} • ${match.resultText || computeMatchResult(match).resultText}`
                : `Outcome: ${match.resultText || (outcome.isTie ? 'Match Tied' : 'Match Drawn')}`}
            </p>
          </div>

          {/* Player of the Match Badge */}
          {match.playerOfTheMatch && (
            <div className="bg-[#0d1422]/90 border border-amber-500/40 rounded-xl p-4 flex items-center gap-3.5 min-w-[260px] shadow-md">
              <div className="w-11 h-11 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                  Player of the Match
                </span>
                <span className="text-sm font-black text-white block">
                  {match.playerOfTheMatch.playerName}
                </span>
                <span className="text-[11px] text-slate-300 font-mono block mt-0.5">
                  {match.playerOfTheMatch.reason}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Three Distinct Post-Match Action Controls (Phase 5 Non-Negotiable Requirement) */}
      <div className="bg-[#121a2b] border border-emerald-700/40 rounded-xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Match Completion Actions — Choose Next Step
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Career Date: {career?.currentDate} (Calendar Paused for Your Decision)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* ACTION 1: CONTINUE */}
          <button
            onClick={onContinueToDashboard}
            className="bg-[#18243a] hover:bg-[#20304d] border border-sky-600/50 rounded-lg p-4 text-left transition cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-sky-400">
                  1. Continue
                </span>
                <CheckCircle2 className="w-4 h-4 text-sky-400 group-hover:scale-110 transition" />
              </div>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Keep saved match result, updated player stats, rankings &amp; standings, and return to the Career Dashboard without skipping calendar days.
              </p>
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-white">
              <span>Return to Career Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>

          {/* ACTION 2: END MATCH / VIEW FULL SCORECARD */}
          <button
            onClick={() => setShowFullScorecard(true)}
            className="bg-[#18243a] hover:bg-[#20304d] border border-amber-600/50 rounded-lg p-4 text-left transition cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  2. End Match / View Full Scorecard
                </span>
                <FileText className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
              </div>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Inspect complete batting, bowling, extras, partnerships &amp; fall of wickets across all {match.innings.length} innings, with option to return to dashboard.
              </p>
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-white">
              <span>Open Official Multi-Innings Scorecard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>

          {/* ACTION 3: NEXT MATCH */}
          <button
            disabled={!nextMatch}
            onClick={() => nextMatch && onPrepareNextMatch(nextMatch.id)}
            className="bg-emerald-700/25 hover:bg-emerald-600/35 disabled:opacity-50 border border-emerald-500/60 rounded-lg p-4 text-left transition cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  3. Next Match
                </span>
                <Calendar className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
              </div>
              {nextMatch ? (
                <div className="mt-1.5 space-y-0.5 text-xs">
                  <div className="font-bold text-white">
                    vs {nextOppTeam?.flagEmoji} {nextOppTeam?.name || nextOppId} ({nextMatch.format})
                  </div>
                  <div className="text-[11px] text-slate-300 truncate">
                    {nextMatch.seriesName}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    {nextMatch.date} • {nextMatch.venue}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-300 mt-1.5">
                  All immediate season fixtures completed. Return to Dashboard and advance calendar to generate next tour/tournament fixtures.
                </p>
              )}
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-300">
              <span>{nextMatch ? 'Open Pre-Match Preparation' : 'Advance Calendar on Dashboard'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      </div>

      {/* 3. All Innings Scorecard Summaries + Partnerships + FOW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {match.innings.map((inn, idx) => {
          const topBatters = [...inn.batters]
            .sort((a, b) => b.runs - a.runs || a.balls - b.balls)
            .slice(0, 3);
          const topBowlers = [...inn.bowlers]
            .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)
            .slice(0, 3);
          const bestPartnership =
            inn.fallOfWickets && inn.fallOfWickets.length > 0
              ? [...inn.fallOfWickets].sort((a, b) => b.partnershipRuns - a.partnershipRuns)[0]
              : null;

          return (
            <div
              key={idx}
              className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
                <div>
                  <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                    Innings {inn.inningsNumber}
                  </span>
                  <h3 className="text-sm font-bold text-white">{inn.battingTeamName}</h3>
                </div>
                <div className="text-right font-mono">
                  <span className="text-lg font-black text-white">
                    {inn.totalRuns}/{inn.wickets}
                    {inn.isDeclared ? 'd' : ''}
                  </span>
                  <span className="text-xs text-slate-400 block">
                    ({inn.completedOvers}.{inn.ballsInCurrentOver} ov)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Top Batters
                  </span>
                  {topBatters.map((b) => (
                    <div key={b.playerId} className="flex items-center justify-between font-mono">
                      <span className="font-sans text-slate-200 truncate pr-1">
                        {b.playerName}
                        {!b.dismissal ? '*' : ''}
                      </span>
                      <span className="font-bold text-white shrink-0">
                        {b.runs} <span className="text-slate-400 font-normal">({b.balls})</span>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Top Bowlers
                  </span>
                  {topBowlers.map((bw) => (
                    <div key={bw.playerId} className="flex items-center justify-between font-mono">
                      <span className="font-sans text-slate-200 truncate pr-1">
                        {bw.playerName}
                      </span>
                      <span className="font-bold text-emerald-400 shrink-0">
                        {bw.wickets}/{bw.runs}{' '}
                        <span className="text-slate-400 font-normal">({bw.overs}.{bw.ballsThisOver})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-[#1f293d] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
                {bestPartnership && (
                  <span>
                    Best Stand: <strong className="text-slate-200">{bestPartnership.partnershipRuns}</strong> ({bestPartnership.partnershipBalls}b, Wkt {bestPartnership.wicketNumber})
                  </span>
                )}
                {inn.fallOfWickets.length > 0 && (
                  <span>
                    Last Wkt: {inn.fallOfWickets[inn.fallOfWickets.length - 1].score}/
                    {inn.fallOfWickets[inn.fallOfWickets.length - 1].wicketNumber}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Series Score / Tournament Standings + Squad Performance & Injury Report + Match News */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Series / Tournament Context */}
        <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-[#1f293d] pb-2">
            <Trophy className="w-3.5 h-3.5" /> Series &amp; Championship Context
          </h4>

          {relatedTour && seriesState && (
            <div className="bg-[#182234] border border-[#243247] p-3 rounded space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                {relatedTour.name} ({match.format} Series)
              </span>
              <div className="text-base font-black text-white font-mono">
                {relatedTour.hostTeamId} {seriesState.homeWins} – {seriesState.awayWins}{' '}
                {relatedTour.visitingTeamId}
                {'draws' in seriesState && seriesState.draws ? ` (${seriesState.draws} Draw)` : ''}
              </div>
              <span className="text-[11px] text-emerald-400 block">
                {seriesState.matchesPlayed} of {seriesState.matchCount} matches completed
              </span>
            </div>
          )}

          {relatedTournament && topStandings.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-300 block">
                {relatedTournament.name} Standings (Top 4)
              </span>
              <div className="divide-y divide-[#1f293d] border border-[#243247] rounded overflow-hidden text-xs font-mono">
                {topStandings.map((row, i) => (
                  <div
                    key={row.teamId}
                    className="bg-[#182234] px-2.5 py-1.5 flex items-center justify-between"
                  >
                    <span className="font-sans font-bold text-white">
                      #{i + 1} {row.teamName}
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {relatedTournament.rules.usePCT
                        ? `${row.pointsPercentage || 0}% PCT`
                        : `${row.points} pts`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!relatedTour && !relatedTournament && (
            <p className="text-xs text-slate-400">
              Standalone international fixture recorded in ICC team rankings.
            </p>
          )}
        </div>

        {/* Squad Performance, Form & Fitness Updates */}
        <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 border-b border-[#1f293d] pb-2">
            <Activity className="w-3.5 h-3.5" /> Squad Performance &amp; Fitness Report
          </h4>

          <div className="space-y-1.5">
            {userPlayerUpdates.map(({ player, runs, balls, wkts, runsConceded }) => {
              if (!player) return null;
              return (
                <div
                  key={player.id}
                  onClick={() => onSelectPlayer && onSelectPlayer(player)}
                  className="bg-[#182234] hover:bg-[#202d44] border border-[#243247] px-2.5 py-1.5 rounded flex items-center justify-between text-xs cursor-pointer transition"
                >
                  <div>
                    <span className="font-bold text-white">{player.shortName}</span>
                    {player.isInjured && (
                      <span className="ml-1.5 text-[9px] bg-rose-950 text-rose-300 px-1 rounded font-bold">
                        INJURED ({player.injuryDaysRemaining}d)
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-slate-300 flex items-center gap-2">
                    {balls > 0 && <span>{runs}({balls})</span>}
                    {wkts > 0 && <span className="text-emerald-400">{wkts}/{runsConceded}</span>}
                    <span className="text-slate-400">Fat {player.workloadFatigue || 15}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Official Match News Dispatch */}
        <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 border-b border-[#1f293d] pb-2">
              <Newspaper className="w-3.5 h-3.5" /> Press &amp; Media Dispatch
            </h4>
            {matchNews ? (
              <div className="bg-[#182234] border border-[#243247] p-3 rounded space-y-1.5">
                <span className="text-[10px] font-mono text-emerald-400 block">
                  {matchNews.timestamp}
                </span>
                <h5 className="text-xs font-bold text-white leading-snug">{matchNews.title}</h5>
                <p className="text-[11px] text-slate-300 leading-relaxed">{matchNews.summary}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Match press dispatch filed to Career News.</p>
            )}
          </div>

          {career && (
            <div className="bg-[#182234] border border-[#243247] p-2.5 rounded flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 font-sans">Manager Record:</span>
              <span className="text-white font-bold">
                {career.manager.matchesManaged}P • {career.manager.matchesWon}W •{' '}
                {career.manager.matchesLost}L • {career.manager.matchesDrawn}D
              </span>
            </div>
          )}
        </div>
      </div>

      {showFullScorecard && (
        <ScorecardModal
          match={match}
          onClose={() => setShowFullScorecard(false)}
          onReturnToDashboard={onContinueToDashboard}
        />
      )}
    </div>
  );
};

