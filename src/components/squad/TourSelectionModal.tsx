import React, { useState } from 'react';
import { X, Check, Shield, Users, AlertCircle, Award, Sparkles } from 'lucide-react';
import { Player, Tour } from '../../types/cricket';
import { getPlayersByCountry } from '../../data/squads';

interface TourSelectionModalProps {
  tour: Tour;
  countryId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tourId: string, playerIds: string[]) => void;
}

export const TourSelectionModal: React.FC<TourSelectionModalProps> = ({
  tour,
  countryId,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const nationalPool = getPlayersByCountry(countryId);

  // Prepopulate with tour's existing squad or top 16 players
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (tour.tourSquadIds && tour.tourSquadIds.length >= 11) {
      return [...tour.tourSquadIds];
    }
    return nationalPool.slice(0, 16).map((p) => p.id);
  });

  const [roleFilter, setRoleFilter] = useState<'ALL' | 'BATTER' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKETKEEPER_BATTER'>('ALL');

  if (!isOpen) return null;

  const togglePlayer = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((pId) => pId !== id));
    } else {
      if (selectedIds.length >= 20) {
        alert('Maximum squad size for an international tour is 20 players.');
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedPlayers = nationalPool.filter((p) => selectedIds.includes(p.id));
  const wkCount = selectedPlayers.filter((p) => p.isWicketKeeper || p.role === 'WICKETKEEPER_BATTER').length;
  const batterCount = selectedPlayers.filter((p) => p.role === 'BATTER').length;
  const allRounderCount = selectedPlayers.filter((p) => p.role === 'ALL_ROUNDER').length;
  const bowlerCount = selectedPlayers.filter((p) => p.role === 'BOWLER').length;

  const filteredPool = nationalPool.filter((p) => {
    if (roleFilter !== 'ALL' && p.role !== roleFilter) return false;
    return true;
  });

  const canConfirm = selectedIds.length >= 15 && selectedIds.length <= 20 && wkCount >= 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="bg-[#121824] border border-[#243247] w-full max-w-4xl max-h-[90vh] rounded-xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1f293d] flex items-center justify-between bg-[#182234]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-emerald-950 text-emerald-400 font-bold border border-emerald-800 px-2 py-0.5 rounded font-mono uppercase">
                National Selection Panel
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Deadline: {tour.squadSelectionDeadline}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white mt-1">
              Select Official Touring Party: {tour.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#243247] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Squad Balance Status Bar */}
        <div className="bg-[#0e141f] p-3 sm:p-4 border-b border-[#1f293d] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-slate-400 block font-semibold text-[10px] uppercase">Squad Size</span>
              <span className={`font-mono font-bold text-sm ${selectedIds.length >= 15 && selectedIds.length <= 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {selectedIds.length} / 20 <span className="text-[10px] font-normal text-slate-400">(Min: 15)</span>
              </span>
            </div>
            <div className="h-6 w-px bg-[#243247]" />
            <div>
              <span className="text-slate-400 block font-semibold text-[10px] uppercase">Composition</span>
              <span className="text-slate-200 font-mono">
                {batterCount} Bat • {allRounderCount} AR • {wkCount} WK • {bowlerCount} Bowl
              </span>
            </div>
          </div>

          {wkCount === 0 && (
            <div className="flex items-center space-x-1.5 text-rose-400 bg-rose-950/40 border border-rose-800/60 px-2.5 py-1 rounded">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Must include at least 1 Wicketkeeper</span>
            </div>
          )}
        </div>

        {/* Role Filters */}
        <div className="px-4 py-2 border-b border-[#1f293d] bg-[#121824] flex items-center space-x-2 overflow-x-auto">
          {(['ALL', 'BATTER', 'ALL_ROUNDER', 'WICKETKEEPER_BATTER', 'BOWLER'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                roleFilter === r
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-[#182234] text-slate-400 hover:text-white'
              }`}
            >
              {r === 'WICKETKEEPER_BATTER' ? 'Keepers' : r.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Player List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredPool.map((player) => {
              const isSelected = selectedIds.includes(player.id);
              return (
                <div
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  className={`p-3 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-950/30 border-emerald-600/70'
                      : 'bg-[#182234] border-[#243247] hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-emerald-600 text-white' : 'border border-slate-600 text-transparent'
                      }`}
                    >
                      {isSelected ? <Check className="w-4 h-4" /> : null}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm font-bold text-white">{player.name}</span>
                        {player.isCaptain && (
                          <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800 px-1 rounded font-bold">
                            C
                          </span>
                        )}
                        {player.isWicketKeeper && (
                          <span className="text-[10px] bg-sky-950 text-sky-400 border border-sky-800 px-1 rounded font-bold">
                            WK
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 font-mono">
                        {player.role.replace('_', ' ')} • Ratings: {player.testRating} Test / {player.odiRating} ODI / {player.t20Rating} T20
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono text-slate-300">
                      Fatigue: {player.workloadFatigue}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1f293d] bg-[#182234] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            disabled={!canConfirm}
            onClick={() => {
              if (canConfirm) {
                onConfirm(tour.id, selectedIds);
                onClose();
              }
            }}
            className={`px-5 py-2.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
              canConfirm
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Confirm & Announce Tour Squad</span>
          </button>
        </div>
      </div>
    </div>
  );
};
