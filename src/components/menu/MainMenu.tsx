import React from 'react';
import { Play, PlusCircle, Trophy, Shield, ArrowRight, Activity, Calendar, Radio } from 'lucide-react';
import { CareerSave } from '../../types/cricket';

interface MainMenuProps {
  onNewCareer: () => void;
  onContinueCareer: () => void;
  onQuickMatch: () => void;
  savedCareer: CareerSave | null;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onNewCareer,
  onContinueCareer,
  onQuickMatch,
  savedCareer,
}) => {
  return (
    <div className="min-h-screen bg-[#070c18] flex flex-col justify-between p-6 sm:p-12 text-slate-200 select-none relative overflow-hidden">
      {/* Stadium Emerald & Deep Blue Radial Atmosphere */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:28px_28px]" />

      {/* Top Brand Bar */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-emerald-950/40 border border-emerald-400/30">
            ICM
          </div>
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-widest text-emerald-400 block">
              INTERNATIONAL SIMULATION
            </span>
            <span className="text-base font-extrabold text-white tracking-wide">
              CRICKET MANAGER 2026
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono text-slate-300">
          <span className="bg-[#0f1b32] border border-[#1b3058] px-3 py-1.5 rounded-lg text-emerald-400 font-bold shadow-sm">
            2026 ENGINE
          </span>
          <span className="bg-[#0f1b32] border border-[#1b3058] px-3 py-1.5 rounded-lg hidden sm:inline text-sky-400 font-medium">
            TEST • ODI • T20I
          </span>
        </div>
      </div>

      {/* Hero Central Content */}
      <div className="max-w-3xl my-auto z-10 py-12">
        <div className="inline-flex items-center space-x-2.5 bg-gradient-to-r from-emerald-950/90 to-sky-950/80 border border-emerald-500/40 px-3.5 py-1.5 rounded-full text-xs font-medium text-emerald-300 mb-5 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Complete Tour Calendar • Multi-Format Series • Realistic Ball Engine</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1] uppercase font-sans">
          Manage Your Nation.<br />
          Master The Conditions.<br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
            Win World Championships.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 mt-5 max-w-2xl leading-relaxed">
          Step into the dual shoes of National Team Manager and Head Coach. Select international tour squads, balance workload and player development, adjust real-time tactical fields, and experience authentic Test, ODI, and T20 World Cup cricket.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap gap-4 items-center">
          {savedCareer && (
            <button
              onClick={onContinueCareer}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm px-7 py-3.5 rounded-xl shadow-lg shadow-emerald-950/50 transition cursor-pointer flex items-center space-x-2.5 active:scale-95 border border-emerald-400/40"
            >
              <Play className="w-4 h-4 fill-current text-white" />
              <span>Continue Career ({savedCareer.selectedTeamId})</span>
            </button>
          )}

          <button
            onClick={onNewCareer}
            className="bg-[#0f1b32] hover:bg-[#152646] text-white border border-[#1d3560] hover:border-emerald-400 font-bold text-sm px-6 py-3.5 rounded-xl shadow transition cursor-pointer flex items-center space-x-2.5 active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>New International Career</span>
          </button>

          <button
            onClick={onQuickMatch}
            className="bg-[#0f1b32] hover:bg-[#152646] text-sky-300 border border-[#1d3560] hover:border-sky-400 font-bold text-sm px-5 py-3.5 rounded-xl shadow transition cursor-pointer flex items-center space-x-2.5 active:scale-95"
          >
            <Activity className="w-4 h-4 text-sky-400" />
            <span>Quick Match Exhibition</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#162744] pt-5 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 z-10 gap-2">
        <p className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          12 Full Member ICC Nations • Test, ODI & T20I International Cricket
        </p>
        <p className="font-mono text-[11px] text-slate-500">World Test Championship • ODI & T20 World Cups</p>
      </div>
    </div>
  );
};
