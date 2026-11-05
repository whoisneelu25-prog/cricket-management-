import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Play,
  CheckCircle2,
  Clock,
  Shield,
  MapPin,
  Globe,
  FastForward,
  Briefcase,
  Filter,
  Layers,
  ChevronLeft,
  ChevronRight,
  Trophy,
  FileText,
  Sparkles,
} from 'lucide-react';
import { CareerSave, Match, MatchFormat, CalendarEvent } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { isPreMatchStatus, isTerminalMatchStatus } from '../../engine/matchEngine';
import { CountryFlag } from '../common/CountryFlag';
import { MonthlyCalendarView } from './MonthlyCalendarView';

interface FixturesViewProps {
  career: CareerSave;
  onSelectMatch: (matchId: string) => void;
  onInspectScorecard?: (match: Match) => void;
  onOpenMatchPreparation?: (matchId: string) => void;
  onAdvanceToNextMatch?: () => void;
  onOpenTourSelection?: (tourId: string) => void;
}

export type CalendarViewType =
  | 'UPCOMING'
  | 'COMPLETED'
  | 'MONTHLY'
  | 'ANNUAL'
  | 'COUNTRY'
  | 'FORMAT'
  | 'TOURNAMENTS'
  | 'EVENTS';

export const FixturesView: React.FC<FixturesViewProps> = ({
  career,
  onSelectMatch,
  onInspectScorecard,
  onOpenMatchPreparation,
  onAdvanceToNextMatch,
  onOpenTourSelection,
}) => {
  const [viewType, setViewType] = useState<CalendarViewType>('MONTHLY');
  const [selectedCountryId, setSelectedCountryId] = useState<string>(career.selectedTeamId);
  const [selectedFormat, setSelectedFormat] = useState<MatchFormat | 'ALL'>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11'); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  // All matches across user and world
  const allMatches: Match[] = useMemo(() => {
    return [...career.fixtures, ...(career.worldFixtures || [])];
  }, [career.fixtures, career.worldFixtures]);

  // Calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return career.calendar || [];
  }, [career.calendar]);

  // Filtered matches depending on active viewType and sub-filters
  const filteredMatches = useMemo(() => {
    let list = [...allMatches];

    if (viewType === 'UPCOMING') {
      list = list.filter((m) => isPreMatchStatus(m.status) || m.status === 'IN_PROGRESS');
      list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    } else if (viewType === 'COMPLETED') {
      list = list.filter((m) => isTerminalMatchStatus(m.status));
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    } else if (viewType === 'MONTHLY') {
      list = list.filter((m) => m.date && m.date.startsWith(selectedMonth));
      list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    } else if (viewType === 'ANNUAL') {
      list = list.filter((m) => m.date && m.date.startsWith(selectedYear));
      list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    } else if (viewType === 'COUNTRY') {
      list = list.filter((m) => m.homeTeamId === selectedCountryId || m.awayTeamId === selectedCountryId);
      list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    } else if (viewType === 'FORMAT') {
      if (selectedFormat !== 'ALL') {
        list = list.filter((m) => m.format === selectedFormat);
      }
      list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    } else if (viewType === 'TOURNAMENTS') {
      list = list.filter((m) => !!m.tournamentId || !!m.competitionId);
      list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    }

    return list;
  }, [allMatches, viewType, selectedCountryId, selectedFormat, selectedMonth, selectedYear]);

  // Unique months available in fixtures
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allMatches.forEach((m) => {
      if (m.date && m.date.length >= 7) {
        months.add(m.date.substring(0, 7));
      }
    });
    return Array.from(months).sort();
  }, [allMatches]);

  return (
    <div className="space-y-5 select-none pb-8 text-[#e8edf2]">
      {/* Header in Dugout Style */}
      <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#10151c] border border-[#1e2733] flex items-center justify-center text-[#e2b64a] shadow-inner">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="dugout-kicker text-[11px] text-[#e2b64a]">Schedule &amp; Fixtures</span>
              <span className="text-[10px] bg-[#10151c] text-[#8fb2d9] font-mono px-2 py-0.5 rounded-full border border-[#1e2733] font-bold">
                {career.currentDate}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-0.5">
              Global International Calendar
            </h1>
            <p className="text-xs text-[#8b97a3] mt-0.5">
              Multi-Year Dynamic Scheduling System across Test, ODI, T20I and ICC Tournaments
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {onAdvanceToNextMatch && (
            <button
              onClick={onAdvanceToNextMatch}
              className="bg-[#10151c] hover:bg-[#161d27] text-[#c3ccd6] hover:text-white border border-[#1e2733] hover:border-[#e2b64a] text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center space-x-2 shadow uppercase tracking-wider"
            >
              <FastForward className="w-3.5 h-3.5 text-[#e2b64a]" />
              <span>Simulate to Next Match</span>
            </button>
          )}
        </div>
      </div>

      {/* Calendar View Selector Tabs in Dugout Pill Bar */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-[#1e2733]">
        {[
          { id: 'UPCOMING', label: 'Upcoming Fixtures' },
          { id: 'COMPLETED', label: 'Completed Results' },
          { id: 'MONTHLY', label: 'Monthly Calendar' },
          { id: 'ANNUAL', label: 'Annual Calendar' },
          { id: 'COUNTRY', label: 'Country Schedule' },
          { id: 'FORMAT', label: 'Format-Specific' },
          { id: 'TOURNAMENTS', label: 'ICC Tournaments' },
          { id: 'EVENTS', label: 'Rest & Training Days' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewType(tab.id as CalendarViewType)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer uppercase tracking-wider ${
              viewType === tab.id
                ? 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black shadow-sm font-extrabold'
                : 'bg-[#070a0e] text-[#8b97a3] hover:text-white border border-[#1e2733]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* View-Specific Secondary Filter Bars */}
      {viewType === 'ANNUAL' && (
        <div className="flex items-center space-x-2.5 bg-[#070a0e] p-4 rounded-xl border border-[#1e2733] overflow-x-auto">
          <span className="dugout-kicker text-xs text-[#8b97a3]">Select Season:</span>
          {Array.from(
            new Set([
              '2026',
              '2027',
              '2028',
              ...allMatches.map((m) => (m.date || '').slice(0, 4)).filter((y) => y.length === 4),
            ])
          )
            .sort()
            .map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition uppercase tracking-wider ${
                  selectedYear === yr
                    ? 'bg-[#e2b64a] text-black font-black'
                    : 'bg-[#10151c] text-[#8b97a3] hover:text-white border border-[#1e2733]'
                }`}
              >
                Season {yr}
              </button>
            ))}
        </div>
      )}

      {viewType === 'COUNTRY' && (
        <div className="flex items-center space-x-3 bg-[#070a0e] p-4 rounded-xl border border-[#1e2733] overflow-x-auto">
          <span className="dugout-kicker text-xs text-[#8b97a3] whitespace-nowrap">Nation:</span>
          <select
            value={selectedCountryId}
            onChange={(e) => setSelectedCountryId(e.target.value)}
            className="bg-[#10151c] border border-[#1e2733] text-white text-xs font-bold px-3 py-1.5 rounded-lg outline-none cursor-pointer tracking-wider"
          >
            {INTERNATIONAL_TEAMS.map((team) => (
              <option key={team.id} value={team.id} className="bg-[#070a0e]">
                {team.name} ({team.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {viewType === 'FORMAT' && (
        <div className="flex items-center space-x-2.5 bg-[#070a0e] p-4 rounded-xl border border-[#1e2733]">
          <span className="dugout-kicker text-xs text-[#8b97a3]">Format:</span>
          {(['ALL', 'TEST', 'ODI', 'T20I'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setSelectedFormat(fmt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition uppercase tracking-wider ${
                selectedFormat === fmt
                  ? 'bg-gradient-to-r from-[#ffe9a8] to-[#e0ab3a] text-black'
                  : 'bg-[#10151c] text-[#8b97a3] hover:text-white border border-[#1e2733]'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      )}

      {/* MONTHLY CALENDAR GRID VIEW */}
      {viewType === 'MONTHLY' ? (
        <MonthlyCalendarView
          career={career}
          allMatches={allMatches}
          onSelectMatch={onSelectMatch}
          onInspectScorecard={onInspectScorecard}
          onOpenMatchPreparation={onOpenMatchPreparation}
        />
      ) : viewType === 'EVENTS' ? (
        <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-5 space-y-3 shadow-xl">
          <h4 className="dugout-kicker text-xs text-[#e2b64a] mb-3">
            Scheduled Squad Periods, Rest Days &amp; Announcement Deadlines
          </h4>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="bg-[#10151c] border border-[#1e2733] hover:border-[#8fb2d9]/60 p-3.5 rounded-xl flex items-center justify-between text-xs transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        ev.type === 'USER_MATCH' || ev.type === 'WORLD_MATCH'
                          ? 'bg-[#3fca86]/20 text-[#3fca86] border border-[#3fca86]/40'
                          : ev.type === 'REST_DAY'
                          ? 'bg-[#8fb2d9]/20 text-[#8fb2d9] border border-[#8fb2d9]/40'
                          : ev.type === 'TRAINING_DAY'
                          ? 'bg-[#e2b64a]/20 text-[#ffe9a8] border border-[#e2b64a]/40'
                          : ev.type === 'TRAVEL_DAY'
                          ? 'bg-[#ffe9a8]/10 text-[#ffe9a8] border border-[#ffe9a8]/30'
                          : 'bg-[#ff3d7f]/20 text-[#ff5470] border border-[#ff3d7f]/40'
                      }`}
                    >
                      {ev.type.replace('_', ' ')}
                    </span>
                    <span className="font-bold text-white text-sm">{ev.title}</span>
                    <span className="text-[#8b97a3] font-mono text-[11px]">{ev.date}</span>
                  </div>
                  <p className="text-[11px] text-[#c3ccd6]">{ev.description}</p>
                </div>

                {ev.isSimulated && (
                  <span className="text-[10px] text-[#556375] font-mono uppercase tracking-wider">Passed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* FIXTURES LIST VIEW */
        <div className="space-y-3.5">
          <div className="flex items-center justify-between text-xs text-[#8b97a3] px-1">
            <span className="dugout-kicker text-[10px] text-[#8b97a3]">
              Showing {filteredMatches.length} International Fixtures
            </span>
            <span className="text-[10px] font-mono text-[#556375] uppercase">
              Worldwide Multi-Format Sync
            </span>
          </div>

          {filteredMatches.length > 0 ? (
            filteredMatches.map((fixture) => {
              const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === fixture.homeTeamId);
              const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === fixture.awayTeamId);
              const isCompleted = isTerminalMatchStatus(fixture.status);
              const isLive = fixture.status === 'IN_PROGRESS';
              const inn1 = fixture.innings[0];
              const inn2 = fixture.innings[1];
              const isUserFixture =
                fixture.homeTeamId === career.selectedTeamId || fixture.awayTeamId === career.selectedTeamId;

              return (
                <div
                  key={fixture.id}
                  className={`bg-[#070a0e] border rounded-2xl p-4 sm:p-5 transition-all shadow-md ${
                    isLive
                      ? 'border-[#e2b64a] shadow-[#e2b64a]/10 bg-gradient-to-r from-[#10151c] to-[#070a0e]'
                      : isCompleted
                      ? 'border-[#1e2733] opacity-90'
                      : 'border-[#1e2733] hover:border-[#33404f]'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded uppercase tracking-wider ${
                          fixture.format === 'TEST'
                            ? 'bg-[#ff3d7f]/20 text-[#ff5470] border border-[#ff3d7f]/40'
                            : fixture.format === 'ODI'
                            ? 'bg-[#8fb2d9]/20 text-[#8fb2d9] border border-[#8fb2d9]/40'
                            : 'bg-[#3fca86]/20 text-[#3fca86] border border-[#3fca86]/40'
                        }`}>
                          {fixture.format}
                        </span>
                        <span className="text-xs font-bold text-white">{fixture.seriesName}</span>
                        <span className="text-xs text-[#8b97a3] font-mono">Date: <strong className="text-white">{fixture.date || 'TBD'}</strong></span>
                        {isUserFixture && (
                          <span className="text-[10px] bg-[#e2b64a] text-black font-black px-2 py-0.5 rounded uppercase tracking-wider">
                            YOUR MATCH
                          </span>
                        )}
                        {fixture.competitionId && (
                          <span className="text-[10px] bg-[#10151c] text-[#ffe9a8] px-2 py-0.5 rounded font-mono border border-[#1e2733] uppercase">
                            {fixture.competitionId.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#8b97a3]">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#e2b64a]" />
                          <span>{fixture.venue}</span>
                        </div>
                        <span>•</span>
                        <span>Pitch: <strong className="text-[#c3ccd6]">{typeof fixture.pitch === 'string' ? fixture.pitch : fixture.pitch.name}</strong></span>
                        <span>•</span>
                        <span>Weather: <strong className="text-[#c3ccd6]">{typeof fixture.weather === 'string' ? fixture.weather : fixture.weather.description || fixture.weather.type}</strong></span>
                      </div>

                      {/* Teams & Scores */}
                      <div className="flex items-center space-x-3 pt-1">
                        <div className="flex items-center space-x-2">
                          <CountryFlag countryCode={homeTeam?.code || ''} size="xs" />
                          <span className="text-base font-black text-white uppercase tracking-tight">
                            {homeTeam?.name || fixture.homeTeamId}
                          </span>
                        </div>
                        <span className="text-xs text-[#8b97a3] font-mono uppercase font-bold">vs</span>
                        <div className="flex items-center space-x-2">
                          <CountryFlag countryCode={awayTeam?.code || ''} size="xs" />
                          <span className="text-base font-black text-white uppercase tracking-tight">
                            {awayTeam?.name || fixture.awayTeamId}
                          </span>
                        </div>
                      </div>

                      {/* Completed Score Line */}
                      {isCompleted && inn1 && (
                        <div className="text-xs font-mono font-bold text-[#c3ccd6] pt-1">
                          <span>
                            {inn1.battingTeamId}: <strong className="text-white">{inn1.totalRuns}/{inn1.wickets}</strong> ({inn1.completedOvers}.{inn1.ballsInCurrentOver} ov)
                          </span>
                          {inn2 && (
                            <span className="ml-3">
                              vs {inn2.battingTeamId}: <strong className="text-white">{inn2.totalRuns}/{inn2.wickets}</strong> ({inn2.completedOvers}.{inn2.ballsInCurrentOver} ov)
                            </span>
                          )}
                          <p className="text-xs text-[#3fca86] font-sans font-bold mt-1">{fixture.resultText}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2.5 self-start md:self-center">
                      {isCompleted ? (
                        <button
                          onClick={() => onInspectScorecard && onInspectScorecard(fixture)}
                          className="text-xs font-bold text-[#8fb2d9] bg-[#10151c] hover:bg-[#161d27] border border-[#1e2733] hover:border-[#8fb2d9] px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5 uppercase tracking-wider"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Scorecard</span>
                        </button>
                      ) : isUserFixture ? (
                        <div className="flex items-center gap-2">
                          {!isLive && onOpenMatchPreparation && (
                            <button
                              onClick={() => onOpenMatchPreparation(fixture.id)}
                              className="bg-[#10151c] hover:bg-[#161d27] text-[#c3ccd6] hover:text-white border border-[#1e2733] hover:border-[#e2b64a] font-bold text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer uppercase tracking-wider"
                            >
                              Prepare XI
                            </button>
                          )}
                          <button
                            onClick={() => onSelectMatch(fixture.id)}
                            className="btn-gold flex items-center space-x-2 text-xs py-2.5 px-4"
                          >
                            <Play className="w-3.5 h-3.5 fill-black" />
                            <span>{isLive ? 'Resume Match' : 'Match Centre'}</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-[#8b97a3] bg-[#10151c] border border-[#1e2733] px-3 py-1.5 rounded-xl uppercase tracking-wider">
                          AI Simulation
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-12 text-center text-[#8b97a3] text-xs">
              No international fixtures match the selected view criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
