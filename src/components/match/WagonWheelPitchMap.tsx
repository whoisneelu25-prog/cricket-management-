import React, { useState } from 'react';
import { WagonWheelShot, PitchMapDelivery, Match } from '../../types/cricket';

interface WagonWheelPitchMapProps {
  match: Match;
  selectedPlayerId?: string;
}

export const WagonWheelPitchMap: React.FC<WagonWheelPitchMapProps> = ({
  match,
  selectedPlayerId,
}) => {
  const [activeTab, setActiveTab] = useState<'WAGON_WHEEL' | 'PITCH_MAP'>('WAGON_WHEEL');
  const [filterRuns, setFilterRuns] = useState<'ALL' | 'BOUNDARIES' | 'DOTS'>('ALL');

  const wagonShots: WagonWheelShot[] = match.wagonWheelDeliveries || [];
  const pitchDeliveries: PitchMapDelivery[] = match.pitchMapDeliveries || [];

  const filteredShots = wagonShots.filter((s) => {
    if (selectedPlayerId && s.strikerId !== selectedPlayerId) return false;
    if (filterRuns === 'BOUNDARIES') return s.runs >= 4;
    if (filterRuns === 'DOTS') return s.runs === 0;
    return true;
  });

  const filteredDeliveries = pitchDeliveries.filter((d) => {
    if (selectedPlayerId && d.bowlerId !== selectedPlayerId && d.strikerId !== selectedPlayerId) {
      return false;
    }
    return true;
  });

  // Calculate runs by zone for summary
  const zoneRuns: Record<string, number> = {};
  filteredShots.forEach((s) => {
    zoneRuns[s.zone] = (zoneRuns[s.zone] || 0) + s.runs;
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('WAGON_WHEEL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'WAGON_WHEEL'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/40'
            }`}
          >
            Wagon Wheel ({filteredShots.length})
          </button>
          <button
            onClick={() => setActiveTab('PITCH_MAP')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'PITCH_MAP'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/40'
            }`}
          >
            Pitch Map ({filteredDeliveries.length})
          </button>
        </div>

        {activeTab === 'WAGON_WHEEL' && (
          <div className="flex gap-1 text-[11px]">
            <button
              onClick={() => setFilterRuns('ALL')}
              className={`px-2 py-0.5 rounded ${filterRuns === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterRuns('BOUNDARIES')}
              className={`px-2 py-0.5 rounded ${filterRuns === 'BOUNDARIES' ? 'bg-amber-500/30 text-amber-300' : 'text-slate-400'}`}
            >
              4s & 6s
            </button>
            <button
              onClick={() => setFilterRuns('DOTS')}
              className={`px-2 py-0.5 rounded ${filterRuns === 'DOTS' ? 'bg-slate-700 text-slate-300' : 'text-slate-400'}`}
            >
              Dots
            </button>
          </div>
        )}
      </div>

      {activeTab === 'WAGON_WHEEL' ? (
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* SVG Wagon Wheel */}
          <div className="relative w-64 h-64 shrink-0 bg-emerald-950/20 rounded-full border border-emerald-800/40 p-2 shadow-inner">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {/* Outer boundary */}
              <circle cx="100" cy="100" r="95" fill="#064e3b" fillOpacity="0.25" stroke="#059669" strokeWidth="2" strokeDasharray="4 2" />
              {/* 30 yard circle */}
              <circle cx="100" cy="100" r="50" fill="none" stroke="#10b981" strokeWidth="1" strokeOpacity="0.4" />
              {/* Pitch rectangle */}
              <rect x="96" y="85" width="8" height="30" fill="#d97706" fillOpacity="0.4" rx="1" />

              {/* Sector radial dividing lines */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                <line
                  key={i}
                  x1="100"
                  y1="100"
                  x2={100 + 95 * Math.sin((angle * Math.PI) / 180)}
                  y2={100 - 95 * Math.cos((angle * Math.PI) / 180)}
                  stroke="#10b981"
                  strokeWidth="0.5"
                  strokeOpacity="0.2"
                />
              ))}

              {/* Shot Vectors */}
              {filteredShots.map((shot, idx) => {
                const rad = (shot.angleDegrees * Math.PI) / 180;
                const distanceRatio = Math.min(92, Math.max(20, (shot.distanceMeters / 90) * 92));
                const endX = 100 + distanceRatio * Math.sin(rad);
                const endY = 100 - distanceRatio * Math.cos(rad);

                let strokeColor = '#94a3b8'; // grey for singles/dots
                let strokeWidth = '1.5';
                if (shot.runs === 4) {
                  strokeColor = '#38bdf8'; // sky blue for four
                  strokeWidth = '2';
                } else if (shot.runs >= 6) {
                  strokeColor = '#f59e0b'; // amber for six
                  strokeWidth = '2.5';
                } else if (shot.runs === 0) {
                  strokeColor = '#64748b';
                  strokeWidth = '1';
                }

                return (
                  <g key={idx}>
                    <line
                      x1="100"
                      y1="100"
                      x2={endX}
                      y2={endY}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeOpacity={0.8}
                      strokeLinecap="round"
                    />
                    <circle cx={endX} cy={endY} r={shot.runs >= 4 ? 3 : 2} fill={strokeColor} />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Zones Summary */}
          <div className="flex-1 w-full text-xs space-y-1">
            <h4 className="text-slate-300 font-semibold mb-2 flex items-center justify-between">
              <span>Scoring Distribution</span>
              <span className="text-[10px] text-slate-400">Total Shots: {filteredShots.length}</span>
            </h4>
            <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
              {['COVER', 'POINT', 'THIRD_MAN', 'FINE_LEG', 'SQUARE_LEG', 'MID_WICKET', 'LONG_ON', 'LONG_OFF'].map(
                (zone) => {
                  const runs = zoneRuns[zone] || 0;
                  return (
                    <div
                      key={zone}
                      className="flex items-center justify-between bg-slate-800/60 px-2 py-1.5 rounded border border-slate-700/50"
                    >
                      <span className="text-slate-400 font-medium">{zone.replace('_', ' ')}</span>
                      <span className="font-bold text-emerald-400 tabular-nums">{runs} r</span>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Pitch Map 2D representation */}
          <div className="relative w-44 h-72 shrink-0 bg-amber-950/30 rounded-lg border-2 border-amber-800/60 p-3 shadow-inner">
            <svg viewBox="0 0 100 200" className="w-full h-full">
              {/* Pitch corridor */}
              <rect x="10" y="10" width="80" height="180" fill="#78350f" fillOpacity="0.4" rx="2" />
              {/* Popping Crease & Stumps (Batting end, bottom) */}
              <line x1="15" y1="170" x2="85" y2="170" stroke="#f8fafc" strokeWidth="1.5" />
              <rect x="44" y="171" width="12" height="3" fill="#fbbf24" rx="1" />

              {/* Bowling Crease (Top) */}
              <line x1="20" y1="30" x2="80" y2="30" stroke="#f8fafc" strokeWidth="1" strokeOpacity="0.6" />

              {/* Length Zones Bands */}
              {/* Yorker: 155 - 170 */}
              <rect x="12" y="155" width="76" height="15" fill="#ef4444" fillOpacity="0.15" />
              <text x="14" y="165" fontSize="5" fill="#fca5a5">Yorker</text>

              {/* Full: 125 - 155 */}
              <rect x="12" y="125" width="76" height="30" fill="#3b82f6" fillOpacity="0.15" />
              <text x="14" y="137" fontSize="5" fill="#93c5fd">Full</text>

              {/* Good Length: 90 - 125 */}
              <rect x="12" y="90" width="76" height="35" fill="#10b981" fillOpacity="0.2" />
              <text x="14" y="105" fontSize="5" fill="#6ee7b7">Good Length</text>

              {/* Back of Length: 60 - 90 */}
              <rect x="12" y="60" width="76" height="30" fill="#f59e0b" fillOpacity="0.15" />
              <text x="14" y="73" fontSize="5" fill="#fcd34d">Back of Length</text>

              {/* Short: 30 - 60 */}
              <rect x="12" y="30" width="76" height="30" fill="#8b5cf6" fillOpacity="0.15" />
              <text x="14" y="45" fontSize="5" fill="#c4b5fd">Short / Bouncer</text>

              {/* Delivery landing dots */}
              {filteredDeliveries.map((del, i) => {
                // del.xCm is -150cm to +150cm -> map to 15 to 85
                const cx = 50 + (del.xCm / 150) * 32;
                // del.yMeters is 0m to 20m -> map 170 down to 30
                const cy = 170 - (del.yMeters / 20) * 140;

                const dotColor = del.isWicket ? '#ef4444' : del.runs >= 4 ? '#f59e0b' : '#38bdf8';

                return (
                  <circle
                    key={i}
                    cx={Math.max(14, Math.min(86, cx))}
                    cy={Math.max(25, Math.min(175, cy))}
                    r={del.isWicket ? 3.5 : 2.5}
                    fill={dotColor}
                    stroke="#0f172a"
                    strokeWidth="0.8"
                  />
                );
              })}
            </svg>
          </div>

          {/* Pitch Map Legend & Stats */}
          <div className="flex-1 text-xs space-y-2">
            <h4 className="text-slate-300 font-semibold mb-2">Delivery Line & Length Map</h4>
            <div className="space-y-1.5 text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span>Good Length (High pressure & edge risk)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                <span>Full Length (Driveable / LBW zone)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                <span>Back of length / Short (Cut & Pull zone)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                <span>Yorker (Blockhole defense / bowled)</span>
              </div>
            </div>
            <div className="mt-3 p-2 bg-slate-800/60 rounded border border-slate-700/60 text-slate-300">
              <span className="text-slate-400">Deliveries Logged: </span>
              <span className="font-bold text-white tabular-nums">{filteredDeliveries.length} balls</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
