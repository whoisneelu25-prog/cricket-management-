import React, { useState } from 'react';
import { Calendar, Play, CheckCircle2, Clock, Shield, MapPin, Globe, FastForward, Briefcase } from 'lucide-react';
import { CareerSave, Match } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';

interface FixturesViewProps {
  career: CareerSave;
  onSelectMatch: (matchId: string) => void;
  onAdvanceToNextMatch?: () => void;
  onOpenTourSelection?: (tourId: string) => void;
}

export const FixturesView: React.FC<FixturesViewProps> = ({
  career,
  onSelectMatch,
  onAdvanceToNextMatch,
  onOpenTourSelection,
}) => {
  const [subTab, setSubTab] = useState<'MY_FIXTURES' | 'WORLD_CALENDAR' | 'TOURS'>('MY_FIXTURES');

  return (
    <div className="space-y-4 select-none animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            International Fixtures, Calendar & Tours
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Current Calendar Date: <span className="text-emerald-400 font-bold font-mono">{career.currentDate}</span> • Season 2026-2027
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onAdvanceToNextMatch && (
            <button
              onClick={onAdvanceToNextMatch}
              className="bg-[#182234] hover:bg-[#202d42] text-slate-200 border border-[#243247] text-xs font-bold px-3 py-2 rounded transition cursor-pointer flex items-center space-x-1.5"
            >
              <FastForward className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate to Next Match</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#1f293d] pb-2">
        <button
          onClick={() => setSubTab('MY_FIXTURES')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            subTab === 'MY_FIXTURES'
              ? 'bg-emerald-600 text-white shadow'
              : 'bg-[#182234] text-slate-400 hover:text-white border border-[#243247]'
          }`}
        >
          My Nation's Fixtures ({career.fixtures.length})
        </button>

        <button
          onClick={() => setSubTab('WORLD_CALENDAR')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
            subTab === 'WORLD_CALENDAR'
              ? 'bg-emerald-600 text-white shadow'
              : 'bg-[#182234] text-slate-400 hover:text-white border border-[#243247]'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Full World Calendar & Results ({(career.worldFixtures || []).length})</span>
        </button>

        <button
          onClick={() => setSubTab('TOURS')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
            subTab === 'TOURS'
              ? 'bg-emerald-600 text-white shadow'
              : 'bg-[#182234] text-slate-400 hover:text-white border border-[#243247]'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Bilateral Tours ({(career.tours || []).length})</span>
        </button>
      </div>

      {/* MY FIXTURES TAB */}
      {subTab === 'MY_FIXTURES' && (
        <div className="space-y-3">
          {career.fixtures.map((fixture) => {
            const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === fixture.homeTeamId);
            const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === fixture.awayTeamId);
            const isCompleted = fixture.status === 'COMPLETED';
            const isLive = fixture.status === 'IN_PROGRESS';

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
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{fixture.venue}</span>
                      <span>•</span>
                      <span className="text-slate-300">Pitch: {fixture.pitch.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2 text-right">
                      <div>
                        <span className="text-xs font-bold text-white block">{homeTeam?.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Home</span>
                      </div>
                      <span className="text-2xl">{homeTeam?.flagEmoji}</span>
                    </div>

                    <span className="text-xs font-mono font-bold text-slate-500 bg-[#0d131f] px-2 py-1 rounded border border-[#243247]">
                      VS
                    </span>

                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{awayTeam?.flagEmoji}</span>
                      <div>
                        <span className="text-xs font-bold text-white block">{awayTeam?.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Away</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 min-w-[160px]">
                    {isCompleted ? (
                      <div className="text-right">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase block">
                          Final Result
                        </span>
                        <span className="text-xs text-white font-medium block">
                          {fixture.resultText}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => onSelectMatch(fixture.id)}
                        className={`text-xs px-4 py-2 rounded font-bold shadow transition cursor-pointer flex items-center space-x-1.5 active:scale-95 ${
                          isLive
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
                            : 'bg-[#182234] hover:bg-emerald-600 hover:text-white text-slate-200 border border-[#243247]'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isLive ? 'Resume Match' : 'Play Match'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WORLD CALENDAR TAB */}
      {subTab === 'WORLD_CALENDAR' && (
        <div className="space-y-3">
          {(career.worldFixtures || []).map((fixture) => {
            const homeTeam = INTERNATIONAL_TEAMS.find((t) => t.id === fixture.homeTeamId);
            const awayTeam = INTERNATIONAL_TEAMS.find((t) => t.id === fixture.awayTeamId);
            const isCompleted = fixture.status === 'COMPLETED';

            return (
              <div
                key={fixture.id}
                className="bg-[#121824] border border-[#1f293d] rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center space-x-3">
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-[#182234] text-slate-300 border border-[#243247]">
                    {fixture.format}
                  </span>
                  <div>
                    <span className="font-bold text-white block">
                      {homeTeam?.name} ({homeTeam?.flagEmoji}) vs {awayTeam?.name} ({awayTeam?.flagEmoji})
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {fixture.venue} • Scheduled: {fixture.date}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  {isCompleted ? (
                    <div>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase block">Completed</span>
                      <span className="text-slate-200">{fixture.resultText}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 font-mono italic">
                      Scheduled for simulation
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TOURS TAB */}
      {subTab === 'TOURS' && (
        <div className="space-y-3">
          {(career.tours || []).map((tour) => {
            const host = INTERNATIONAL_TEAMS.find((t) => t.id === tour.hostTeamId);
            const visitor = INTERNATIONAL_TEAMS.find((t) => t.id === tour.visitingTeamId);

            return (
              <div
                key={tour.id}
                className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1f293d] pb-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-amber-950 text-amber-400 font-bold border border-amber-800 px-2 py-0.5 rounded font-mono uppercase">
                        {tour.status}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {tour.startDate} to {tour.endDate}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">{tour.name}</h3>
                  </div>

                  {onOpenTourSelection && (
                    <button
                      onClick={() => onOpenTourSelection(tour.id)}
                      className="bg-[#182234] hover:bg-[#202d42] border border-[#243247] text-white text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer self-start sm:self-auto"
                    >
                      {tour.squadAnnounced ? 'Edit Tour Squad' : 'Announce Squad'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-[#182234] p-2 rounded border border-[#243247]">
                    <span className="text-[10px] text-slate-400 block font-semibold">Host Nation</span>
                    <span className="text-white font-bold">{host?.name} ({host?.flagEmoji})</span>
                  </div>
                  <div className="bg-[#182234] p-2 rounded border border-[#243247]">
                    <span className="text-[10px] text-slate-400 block font-semibold">Visiting Nation</span>
                    <span className="text-white font-bold">{visitor?.name} ({visitor?.flagEmoji})</span>
                  </div>
                  <div className="bg-[#182234] p-2 rounded border border-[#243247]">
                    <span className="text-[10px] text-slate-400 block font-semibold">Tour Squad Status</span>
                    <span className={`font-bold font-mono ${tour.squadAnnounced ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {tour.squadAnnounced ? `${tour.tourSquadIds.length} Players Confirmed` : 'Selection Pending'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
