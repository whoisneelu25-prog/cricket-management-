import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  FileText,
  MapPin,
  Trophy,
  Layers,
  Wind,
  CheckCircle2,
  Users,
  Sparkles,
} from 'lucide-react';
import { CareerSave, Match, MatchFormat, CalendarEvent } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { isPreMatchStatus, isTerminalMatchStatus } from '../../engine/matchEngine';
import { CountryFlag } from '../common/CountryFlag';

interface MonthlyCalendarViewProps {
  career: CareerSave;
  allMatches?: Match[];
  onSelectMatch: (matchId: string) => void;
  onInspectScorecard?: (match: Match) => void;
  onOpenMatchPreparation?: (matchId: string) => void;
  onAdvanceToNextMatch?: () => void;
  onOpenTourSelection?: (tourId: string) => void;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface CalendarDayCell {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  matches: Match[];
  events: CalendarEvent[];
}

export const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({
  career,
  allMatches: propMatches,
  onSelectMatch,
  onInspectScorecard,
  onOpenMatchPreparation,
  onAdvanceToNextMatch,
}) => {
  // Parse career current date as initial view month/year
  const initialYear = career.currentDate ? parseInt(career.currentDate.slice(0, 4), 10) : 2026;
  const initialMonth = career.currentDate ? parseInt(career.currentDate.slice(5, 7), 10) : 11;

  const [currentYear, setCurrentYear] = useState<number>(initialYear);
  const [currentMonth, setCurrentMonth] = useState<number>(initialMonth); // 1 - 12
  const [selectedDate, setSelectedDate] = useState<string>(career.currentDate || '2026-11-15');
  const [formatFilter, setFormatFilter] = useState<MatchFormat | 'ALL'>('ALL');
  const [onlyUserMatches, setOnlyUserMatches] = useState<boolean>(false);

  // Combine user fixtures and world fixtures
  const allMatches: Match[] = useMemo(() => {
    return propMatches || [...career.fixtures, ...(career.worldFixtures || [])];
  }, [propMatches, career.fixtures, career.worldFixtures]);

  const allEvents: CalendarEvent[] = useMemo(() => {
    return career.calendar || [];
  }, [career.calendar]);

  // Index matches by date: YYYY-MM-DD -> Match[]
  const matchesByDate = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of allMatches) {
      if (!m.date) continue;
      if (formatFilter !== 'ALL' && m.format !== formatFilter) continue;
      if (onlyUserMatches && m.homeTeamId !== career.selectedTeamId && m.awayTeamId !== career.selectedTeamId) {
        continue;
      }
      const existing = map.get(m.date) || [];
      existing.push(m);
      map.set(m.date, existing);
    }
    return map;
  }, [allMatches, formatFilter, onlyUserMatches, career.selectedTeamId]);

  // Index calendar events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of allEvents) {
      if (!ev.date) continue;
      const existing = map.get(ev.date) || [];
      existing.push(ev);
      map.set(ev.date, existing);
    }
    return map;
  }, [allEvents]);

  // Available seasons in dataset
  const availableYears = useMemo(() => {
    const years = new Set<number>([2026, 2027, 2028, 2029, 2030, initialYear]);
    allMatches.forEach((m) => {
      if (m.date && m.date.length >= 4) {
        const y = parseInt(m.date.slice(0, 4), 10);
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [allMatches, initialYear]);

  // Build the 35 or 42 days grid for the selected month
  const calendarGrid = useMemo<CalendarDayCell[]>(() => {
    // Note: JS Date month is 0-indexed (0 to 11)
    const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

    const cells: CalendarDayCell[] = [];

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDateObj = new Date(currentYear, currentMonth - 2, dayNum);
      const y = prevDateObj.getFullYear();
      const m = String(prevDateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      cells.push({
        date: dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === career.currentDate,
        matches: matchesByDate.get(dateStr) || [],
        events: eventsByDate.get(dateStr) || [],
      });
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const m = String(currentMonth).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      const dateStr = `${currentYear}-${m}-${d}`;
      cells.push({
        date: dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === career.currentDate,
        matches: matchesByDate.get(dateStr) || [],
        events: eventsByDate.get(dateStr) || [],
      });
    }

    // 3. Next month leading days (fill row up to 35 or 42)
    const totalFilled = cells.length;
    const targetTotal = totalFilled <= 35 ? 35 : 42;
    const remaining = targetTotal - totalFilled;
    for (let day = 1; day <= remaining; day++) {
      const nextDateObj = new Date(currentYear, currentMonth, day);
      const y = nextDateObj.getFullYear();
      const m = String(nextDateObj.getMonth() + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      cells.push({
        date: dateStr,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: dateStr === career.currentDate,
        matches: matchesByDate.get(dateStr) || [],
        events: eventsByDate.get(dateStr) || [],
      });
    }

    return cells;
  }, [currentYear, currentMonth, matchesByDate, eventsByDate, career.currentDate]);

  // Selected date fixtures
  const selectedDateMatches = useMemo(() => {
    return matchesByDate.get(selectedDate) || [];
  }, [matchesByDate, selectedDate]);

  const selectedDateEvents = useMemo(() => {
    return eventsByDate.get(selectedDate) || [];
  }, [eventsByDate, selectedDate]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToToday = () => {
    const today = career.currentDate || '2026-11-15';
    const y = parseInt(today.slice(0, 4), 10);
    const m = parseInt(today.slice(5, 7), 10);
    setCurrentYear(y);
    setCurrentMonth(m);
    setSelectedDate(today);
  };

  return (
    <div className="space-y-5 text-[#e8edf2] select-none">
      {/* 1. Calendar Header & Controls in Dugout Styling */}
      <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#10151c] border border-[#1e2733] flex items-center justify-center text-[#e2b64a] shadow-inner shrink-0">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#e2b64a] font-display">
                International Calendar
              </span>
              <span className="text-[10px] bg-[#10151c] text-[#8fb2d9] font-mono px-2 py-0.5 rounded-full border border-[#1e2733] font-bold">
                Today: {career.currentDate}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-display mt-0.5">
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </h1>
            <p className="text-xs text-[#8b97a3] font-sans">
              Worldwide match schedule across Test, ODI, T20I and ICC Tournaments
            </p>
          </div>
        </div>

        {/* Navigation Buttons and Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Format quick filters */}
          <div className="bg-[#10151c] border border-[#1e2733] p-1 rounded-xl flex items-center gap-1 text-xs">
            {(['ALL', 'TEST', 'ODI', 'T20I'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormatFilter(fmt)}
                className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] transition cursor-pointer ${
                  formatFilter === fmt
                    ? 'btn-gold shadow-sm'
                    : 'text-[#8b97a3] hover:text-white'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* User matches only toggle */}
          <button
            onClick={() => setOnlyUserMatches((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display border transition cursor-pointer flex items-center gap-1.5 ${
              onlyUserMatches
                ? 'bg-[#e2b64a] text-black border-[#e2b64a]'
                : 'bg-[#10151c] text-[#8b97a3] hover:text-white border-[#1e2733]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>My Matches</span>
          </button>

          {/* Month Steppers */}
          <div className="flex items-center gap-1 bg-[#10151c] border border-[#1e2733] p-1 rounded-xl">
            <button
              onClick={handlePrevMonth}
              title="Previous Month"
              className="p-1.5 hover:bg-[#1e2733] text-[#c3ccd6] hover:text-white rounded-lg transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoToToday}
              className="px-2.5 py-1 text-xs font-bold text-[#e2b64a] hover:text-[#ffe9a8] font-display transition cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              title="Next Month"
              className="p-1.5 hover:bg-[#1e2733] text-[#c3ccd6] hover:text-white rounded-lg transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Year selector */}
          <select
            value={currentYear}
            onChange={(e) => setCurrentYear(parseInt(e.target.value, 10))}
            className="bg-[#10151c] border border-[#1e2733] text-[#ffe9a8] font-mono font-bold text-xs px-3 py-2 rounded-xl outline-none cursor-pointer"
          >
            {availableYears.map((y) => (
              <option key={y} value={y} className="bg-[#070a0e] text-white">
                Year {y}
              </option>
            ))}
          </select>

          {onAdvanceToNextMatch && (
            <button
              onClick={onAdvanceToNextMatch}
              className="bg-[#10151c] hover:bg-[#161d27] text-[#ffe9a8] hover:text-white border border-[#e2b64a]/50 text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5 font-display shadow"
            >
              <Clock className="w-3.5 h-3.5 text-[#e2b64a]" />
              <span className="hidden sm:inline">Advance to Match</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Monthly Calendar 7-Column Grid */}
      <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl shadow-2xl overflow-hidden">
        {/* Weekday Column Headers */}
        <div className="grid grid-cols-7 border-b border-[#1e2733] bg-[#000000]/70 text-center text-xs font-black uppercase tracking-wider font-display py-2.5 text-[#8b97a3]">
          {WEEKDAYS.map((day, idx) => (
            <div key={day} className={`py-1 ${idx === 0 || idx === 6 ? 'text-[#c3ccd6]' : ''}`}>
              <span className="hidden md:inline">{day}</span>
              <span className="md:hidden">{day.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        {/* 7-Column Calendar Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[#1e2733]/60 bg-[#070a0e]">
          {calendarGrid.map((cell) => {
            const isSelected = cell.date === selectedDate;
            const hasUserMatch = cell.matches.some(
              (m) => m.homeTeamId === career.selectedTeamId || m.awayTeamId === career.selectedTeamId
            );

            return (
              <div
                key={cell.date}
                onClick={() => setSelectedDate(cell.date)}
                className={`min-h-[96px] sm:min-h-[120px] p-1.5 sm:p-2 transition-all cursor-pointer flex flex-col justify-between relative group ${
                  !cell.isCurrentMonth
                    ? 'bg-[#000000]/40 text-[#495462]'
                    : 'bg-[#070a0e] text-[#e8edf2] hover:bg-[#10151c]/70'
                } ${
                  isSelected
                    ? 'ring-2 ring-[#e2b64a] bg-[#10151c] z-10'
                    : ''
                }`}
              >
                {/* Day Header (Number + Badges) */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-mono font-black rounded-full w-6 h-6 flex items-center justify-center ${
                      cell.isToday
                        ? 'bg-[#e2b64a] text-black font-extrabold shadow'
                        : isSelected
                        ? 'bg-[#1e2733] text-[#ffe9a8]'
                        : cell.isCurrentMonth
                        ? 'text-white'
                        : 'text-[#556375]'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  <div className="flex items-center gap-1">
                    {hasUserMatch && (
                      <span
                        title="Your national match scheduled"
                        className="w-2 h-2 rounded-full bg-[#e2b64a] animate-pulse"
                      />
                    )}
                    {cell.matches.length > 0 && (
                      <span className="text-[9px] font-mono text-[#8b97a3] font-bold hidden sm:inline">
                        {cell.matches.length} {cell.matches.length === 1 ? 'match' : 'matches'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Fixture Snippets inside Date Cell */}
                <div className="space-y-1 overflow-hidden flex-1">
                  {cell.matches.slice(0, 2).map((fixture) => {
                    const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === fixture.homeTeamId);
                    const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === fixture.awayTeamId);
                    const isUserM =
                      fixture.homeTeamId === career.selectedTeamId ||
                      fixture.awayTeamId === career.selectedTeamId;
                    const isDone = isTerminalMatchStatus(fixture.status);
                    const isLive = fixture.status === 'IN_PROGRESS';

                    return (
                      <div
                        key={fixture.id}
                        className={`p-1 rounded text-[10px] leading-tight border transition flex flex-col gap-0.5 ${
                          isUserM
                            ? 'bg-[#192231] border-[#e2b64a]/60 text-white font-bold shadow-sm'
                            : isLive
                            ? 'bg-[#2c2412] border-[#e2b64a] text-[#ffe9a8]'
                            : isDone
                            ? 'bg-[#10151c]/90 border-[#1e2733] text-[#8b97a3]'
                            : 'bg-[#10151c] border-[#1e2733] text-[#c3ccd6]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-[8px] font-mono font-black px-1 rounded uppercase ${
                              fixture.format === 'TEST'
                                ? 'bg-[#ff5470]/20 text-[#ff5470]'
                                : fixture.format === 'ODI'
                                ? 'bg-[#8fb2d9]/20 text-[#8fb2d9]'
                                : 'bg-[#3fca86]/20 text-[#3fca86]'
                            }`}
                          >
                            {fixture.format}
                          </span>

                          <span className="text-[9px] font-mono text-[#8b97a3] truncate">
                            {fixture.venue ? fixture.venue.split(',')[0].slice(0, 10) : ''}
                          </span>
                        </div>

                        {/* Matchup with Flags */}
                        <div className="flex items-center justify-between font-mono text-[9px] pt-0.5 truncate">
                          <span className="flex items-center gap-1 truncate">
                            <CountryFlag countryCode={homeTeam?.code || fixture.homeTeamId} size="xs" />
                            <span className="truncate">{homeTeam?.code || fixture.homeTeamId}</span>
                          </span>
                          <span className="text-[#8b97a3] text-[8px] px-0.5 font-sans">v</span>
                          <span className="flex items-center gap-1 truncate">
                            <CountryFlag countryCode={awayTeam?.code || fixture.awayTeamId} size="xs" />
                            <span className="truncate">{awayTeam?.code || fixture.awayTeamId}</span>
                          </span>
                        </div>

                        {isDone && fixture.innings[0] && (
                          <div className="text-[8px] font-mono text-[#3fca86] truncate">
                            {fixture.resultText || 'Completed'}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {cell.matches.length > 2 && (
                    <div className="text-[9px] font-mono text-[#e2b64a] font-bold text-center py-0.5 bg-[#10151c] rounded border border-[#1e2733]">
                      +{cell.matches.length - 2} more
                    </div>
                  )}

                  {/* Rest / Event Marker if no match */}
                  {cell.matches.length === 0 && cell.events.length > 0 && (
                    <div className="text-[9px] text-[#8fb2d9] font-sans truncate px-1 py-0.5 bg-[#10151c]/60 rounded">
                      {cell.events[0].title}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Selected Date Detail Panel (Inspector) */}
      <div className="bg-[#070a0e] border border-[#1e2733] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1e2733] pb-3 gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-[#10151c] border border-[#1e2733] flex items-center justify-center text-[#e2b64a]">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#8b97a3] font-display">
                Date Details
              </span>
              <h3 className="text-base sm:text-lg font-black text-white font-display">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-[#8b97a3]">
              {selectedDateMatches.length} {selectedDateMatches.length === 1 ? 'Match' : 'Matches'} Scheduled
            </span>
          </div>
        </div>

        {/* Fixtures list for the selected date */}
        {selectedDateMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedDateMatches.map((fixture) => {
              const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === fixture.homeTeamId);
              const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === fixture.awayTeamId);
              const isCompleted = isTerminalMatchStatus(fixture.status);
              const isLive = fixture.status === 'IN_PROGRESS';
              const isUserFixture =
                fixture.homeTeamId === career.selectedTeamId || fixture.awayTeamId === career.selectedTeamId;
              const inn1 = fixture.innings[0];
              const inn2 = fixture.innings[1];

              return (
                <div
                  key={fixture.id}
                  className={`bg-[#10151c] border rounded-xl p-4 space-y-3 transition shadow-md ${
                    isUserFixture
                      ? 'border-[#e2b64a]/80 shadow-[#e2b64a]/5'
                      : isLive
                      ? 'border-[#3fca86]'
                      : 'border-[#1e2733]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[9px] font-black font-mono px-2 py-0.5 rounded uppercase ${
                          fixture.format === 'TEST'
                            ? 'bg-[#ff5470]/20 text-[#ff5470] border border-[#ff5470]/40'
                            : fixture.format === 'ODI'
                            ? 'bg-[#8fb2d9]/20 text-[#8fb2d9] border border-[#8fb2d9]/40'
                            : 'bg-[#3fca86]/20 text-[#3fca86] border border-[#3fca86]/40'
                        }`}
                      >
                        {fixture.format}
                      </span>
                      {isUserFixture && (
                        <span className="text-[9px] font-black bg-[#e2b64a] text-black px-1.5 py-0.5 rounded font-display uppercase tracking-wider">
                          YOUR MATCH
                        </span>
                      )}
                      {fixture.competitionId && (
                        <span className="text-[9px] font-mono text-[#ffe9a8] bg-[#070a0e] px-1.5 py-0.5 rounded border border-[#1e2733] uppercase">
                          {fixture.competitionId.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-mono text-[#8b97a3]">
                      {isLive ? (
                        <span className="text-[#e2b64a] font-bold animate-pulse">● LIVE</span>
                      ) : isCompleted ? (
                        <span className="text-[#3fca86] font-bold">COMPLETED</span>
                      ) : (
                        <span>SCHEDULED</span>
                      )}
                    </span>
                  </div>

                  {/* Series & Venue */}
                  <div>
                    <h4 className="text-xs font-bold text-white truncate font-display">
                      {fixture.seriesName || `${fixture.format} International Match`}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-[#8b97a3] mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#e2b64a]" />
                        <span>{fixture.venue}</span>
                      </span>
                      <span>•</span>
                      <span>Pitch: {typeof fixture.pitch === 'string' ? fixture.pitch : fixture.pitch?.name || 'Standard'}</span>
                    </div>
                  </div>

                  {/* Teams Lineup */}
                  <div className="bg-[#070a0e] border border-[#1e2733] rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CountryFlag countryCode={homeTeam?.code || fixture.homeTeamId} size="sm" />
                      <div>
                        <span className="font-bold text-sm text-white block">{homeTeam?.name || fixture.homeTeamId}</span>
                        {inn1 && inn1.battingTeamId === fixture.homeTeamId && (
                          <span className="text-[11px] font-mono text-[#e2b64a] font-bold">
                            {inn1.totalRuns}/{inn1.wickets} ({inn1.completedOvers}.{inn1.ballsInCurrentOver} ov)
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold text-[#8b97a3]">vs</span>

                    <div className="flex items-center space-x-2 text-right">
                      <div>
                        <span className="font-bold text-sm text-white block">{awayTeam?.name || fixture.awayTeamId}</span>
                        {inn2 && inn2.battingTeamId === fixture.awayTeamId && (
                          <span className="text-[11px] font-mono text-[#e2b64a] font-bold">
                            {inn2.totalRuns}/{inn2.wickets} ({inn2.completedOvers}.{inn2.ballsInCurrentOver} ov)
                          </span>
                        )}
                      </div>
                      <CountryFlag countryCode={awayTeam?.code || fixture.awayTeamId} size="sm" />
                    </div>
                  </div>

                  {/* Result text if done */}
                  {isCompleted && fixture.resultText && (
                    <p className="text-xs font-bold text-[#3fca86] font-display">
                      {fixture.resultText}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#1e2733]">
                    {isCompleted ? (
                      <button
                        onClick={() => onInspectScorecard && onInspectScorecard(fixture)}
                        className="text-xs font-bold text-[#8fb2d9] hover:text-white bg-[#070a0e] hover:bg-[#161d27] border border-[#1e2733] px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Scorecard</span>
                      </button>
                    ) : isUserFixture ? (
                      <div className="flex items-center gap-2">
                        {!isLive && onOpenMatchPreparation && (
                          <button
                            onClick={() => onOpenMatchPreparation(fixture.id)}
                            className="bg-[#070a0e] hover:bg-[#161d27] text-[#c3ccd6] hover:text-white border border-[#1e2733] hover:border-[#e2b64a] font-bold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer"
                          >
                            Prepare XI
                          </button>
                        )}
                        <button
                          onClick={() => onSelectMatch(fixture.id)}
                          className="btn-gold flex items-center space-x-1.5 text-xs py-1.5 px-3.5 rounded-lg cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-black" />
                          <span>{isLive ? 'Resume Match' : 'Match Centre'}</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-[#8b97a3] bg-[#070a0e] px-2.5 py-1 rounded border border-[#1e2733]">
                        AI Fixture
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-[#10151c] border border-[#1e2733] rounded-xl text-[#8b97a3] text-xs">
            <p className="font-sans font-medium text-slate-300">
              No international matches scheduled on this date.
            </p>
            {selectedDateEvents.length > 0 ? (
              <div className="mt-2 text-[#e2b64a] text-xs font-mono font-bold">
                {selectedDateEvents.map((ev) => ev.title).join(' • ')}
              </div>
            ) : (
              <p className="text-[11px] text-[#556375] mt-1 font-mono">
                Squad recovery, tactical briefing &amp; optional nets training period.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
