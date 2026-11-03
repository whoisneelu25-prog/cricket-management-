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
} from 'lucide-react';
import { CareerSave, Match, MatchFormat, CalendarEvent } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';

interface FixturesViewProps {
  career: CareerSave;
  onSelectMatch: (matchId: string) => void;
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
  onAdvanceToNextMatch,
  onOpenTourSelection,
}) => {
  const [viewType, setViewType] = useState<CalendarViewType>('UPCOMING');
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
      list = list.filter((m) => m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS');
      list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    } else if (viewType === 'COMPLETED') {
      list = list.filter((m) => m.status === 'COMPLETED' || m.status === 'DRAW' || m.status === 'TIE');
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
    <div className="space-y-4 select-none animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            International Cricket Calendar & Global Schedule
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Current Date: <span className="text-emerald-400 font-bold font-mono">{career.currentDate}</span> • Multi-Year Dynamic Scheduling System
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onAdvanceToNextMatch && (
            <button
              onClick={onAdvanceToNextMatch}
              className="bg-[#182234] hover:bg-[#202d42] text-slate-200 border border-[#243247] text-xs font-bold px-3 py-2 rounded transition cursor-pointer flex items-center space-x-1.5 shadow"
            >
              <FastForward className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate to Next Match</span>
            </button>
          )}
        </div>
      </div>

      {/* 7 Required Calendar View Selector Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-[#1f293d]">
        {[
          { id: 'UPCOMING', label: 'Upcoming Fixtures' },
          { id: 'COMPLETED', label: 'Completed Results' },
          { id: 'MONTHLY', label: 'Monthly Calendar' },
          { id: 'ANNUAL', label: 'Annual Calendar' },
          { id: 'COUNTRY', label: 'Country Calendar' },
          { id: 'FORMAT', label: 'Format-Specific' },
          { id: 'TOURNAMENTS', label: 'ICC Tournaments' },
          { id: 'EVENTS', label: 'Rest & Training Days' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewType(tab.id as CalendarViewType)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              viewType === tab.id
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-[#121824] text-slate-400 hover:text-white border border-[#1f293d]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* View-Specific Secondary Filter Bars */}
      {viewType === 'MONTHLY' && (
        <div className="flex items-center space-x-2 bg-[#121824] p-3 rounded-lg border border-[#1f293d]">
          <span className="text-xs text-slate-400 font-semibold">Select Month:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-[#182234] border border-[#243247] text-white text-xs font-mono font-bold px-3 py-1.5 rounded outline-none cursor-pointer"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      )}

      {viewType === 'ANNUAL' && (
        <div className="flex items-center space-x-2 bg-[#121824] p-3 rounded-lg border border-[#1f293d]">
          <span className="text-xs text-slate-400 font-semibold">Select Year:</span>
          {['2026', '2027', '2028'].map((yr) => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-3 py-1 rounded text-xs font-mono font-bold cursor-pointer transition ${
                selectedYear === yr
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#182234] text-slate-400 hover:text-white border border-[#243247]'
              }`}
            >
              Season {yr}
            </button>
          ))}
        </div>
      )}

      {viewType === 'COUNTRY' && (
        <div className="flex items-center space-x-2 bg-[#121824] p-3 rounded-lg border border-[#1f293d] overflow-x-auto">
          <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Filter Country (22 Nations):</span>
          <select
            value={selectedCountryId}
            onChange={(e) => setSelectedCountryId(e.target.value)}
            className="bg-[#182234] border border-[#243247] text-white text-xs font-bold px-3 py-1.5 rounded outline-none cursor-pointer"
          >
            {INTERNATIONAL_TEAMS.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.id})
              </option>
            ))}
          </select>
        </div>
      )}

      {viewType === 'FORMAT' && (
        <div className="flex items-center space-x-2 bg-[#121824] p-3 rounded-lg border border-[#1f293d]">
          <span className="text-xs text-slate-400 font-semibold">Filter Match Format:</span>
          {(['ALL', 'TEST', 'ODI', 'T20I'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setSelectedFormat(fmt)}
              className={`px-3 py-1 rounded text-xs font-mono font-bold cursor-pointer transition ${
                selectedFormat === fmt
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#182234] text-slate-400 hover:text-white border border-[#243247]'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      )}

      {/* EVENTS VIEW (Rest Days, Training Days, Travel, Squad Deadlines) */}
      {viewType === 'EVENTS' ? (
        <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-bold text-white mb-3">
            Scheduled Squad Periods, Rest Days & Announcement Deadlines
          </h4>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="bg-[#182234] border border-[#243247] p-3 rounded-lg flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        ev.type === 'USER_MATCH' || ev.type === 'WORLD_MATCH'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                          : ev.type === 'REST_DAY'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800/40'
                          : ev.type === 'TRAINING_DAY'
                          ? 'bg-purple-950 text-purple-400 border border-purple-800/40'
                          : ev.type === 'TRAVEL_DAY'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                          : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                      }`}
                    >
                      {ev.type.replace('_', ' ')}
                    </span>
                    <span className="font-bold text-white">{ev.title}</span>
                    <span className="text-slate-400 font-mono text-[11px]">{ev.date}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{ev.description}</p>
                </div>

                {ev.isSimulated && (
                  <span className="text-[10px] text-slate-500 font-mono">Passed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* FIXTURES LIST VIEW */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Showing {filteredMatches.length} International Fixtures</span>
            <span>Worldwide Multi-Format Sync</span>
          </div>

          {filteredMatches.length > 0 ? (
            filteredMatches.map((fixture) => {
              const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === fixture.homeTeamId);
              const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === fixture.awayTeamId);
              const isCompleted = fixture.status === 'COMPLETED' || fixture.status === 'DRAW' || fixture.status === 'TIE';
              const isLive = fixture.status === 'IN_PROGRESS';
              const inn1 = fixture.innings[0];
              const inn2 = fixture.innings[1];
              const isUserFixture =
                fixture.homeTeamId === career.selectedTeamId || fixture.awayTeamId === career.selectedTeamId;

              return (
                <div
                  key={fixture.id}
                  className={`bg-[#121824] border rounded-lg p-4 transition ${
                    isLive
                      ? 'border-emerald-500 shadow-md bg-[#131d2c]'
                      : isCompleted
                      ? 'border-[#1f293d] opacity-90'
                      : 'border-[#1f293d] hover:border-[#2f3f5a]'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                          {fixture.format}
                        </span>
                        <span className="text-xs font-bold text-white">{fixture.seriesName}</span>
                        <span className="text-xs text-slate-400 font-mono">Date: {fixture.date || 'TBD'}</span>
                        {isUserFixture && (
                          <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-1.5 py-0.2 rounded font-mono border border-emerald-700/50">
                            USER MATCH
                          </span>
                        )}
                        {fixture.competitionId && (
                          <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded font-mono border border-amber-800/40">
                            {fixture.competitionId.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{fixture.venue}</span>
                        <span>•</span>
                        <span className="text-slate-300">Pitch: {fixture.pitch.name}</span>
                        <span>•</span>
                        <span className="text-slate-300">Weather: {fixture.weather.description || fixture.weather.type}</span>
                      </div>

                      {/* Teams & Scores */}
                      <div className="flex items-center space-x-3 pt-1">
                        <span className="text-sm font-bold text-white">
                          {homeTeam?.name || fixture.homeTeamId}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">vs</span>
                        <span className="text-sm font-bold text-white">
                          {awayTeam?.name || fixture.awayTeamId}
                        </span>
                      </div>

                      {/* Completed Score Line */}
                      {isCompleted && inn1 && (
                        <div className="text-xs font-mono font-bold text-slate-200 pt-1">
                          <span>
                            {inn1.battingTeamId}: {inn1.totalRuns}/{inn1.wickets} ({inn1.completedOvers}.{inn1.ballsInCurrentOver} ov)
                          </span>
                          {inn2 && (
                            <span className="ml-3">
                              vs {inn2.battingTeamId}: {inn2.totalRuns}/{inn2.wickets} ({inn2.completedOvers}.{inn2.ballsInCurrentOver} ov)
                            </span>
                          )}
                          <p className="text-[11px] text-emerald-400 font-sans mt-0.5">{fixture.resultText}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 self-start md:self-center">
                      {isCompleted ? (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-3 py-1.5 rounded flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Final Result</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => onSelectMatch(fixture.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded transition cursor-pointer flex items-center space-x-1.5 shadow"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>{isLive ? 'Resume Match' : 'Match Centre'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-8 text-center text-slate-500 text-xs">
              No international fixtures match the selected view criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
