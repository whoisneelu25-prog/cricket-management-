import React from 'react';
import { Play, PlusCircle, Database, HelpCircle, Trophy, Shield, ArrowRight, Activity, Download } from 'lucide-react';
import { CareerSave } from '../../types/cricket';
import { downloadDatabaseExportZip } from '../../engine/databaseExport';

interface MainMenuProps {
  onNewCareer: () => void;
  onContinueCareer: () => void;
  onQuickMatch: () => void;
  onOpenDatabase: () => void;
  savedCareer: CareerSave | null;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onNewCareer,
  onContinueCareer,
  onQuickMatch,
  onOpenDatabase,
  savedCareer,
}) => {
  return (
    <div className="min-h-screen bg-[#0b0f17] flex flex-col justify-between p-6 sm:p-12 text-slate-200 select-none relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Top Brand Bar */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-emerald-600 flex items-center justify-center font-black text-white text-base shadow-lg">
            ICM
          </div>
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-widest text-emerald-400 block">
              INTERNATIONAL SIMULATION
            </span>
            <span className="text-sm font-bold text-white tracking-wide">
              CRICKET MANAGER
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
          <span className="bg-[#182234] border border-[#243247] px-2.5 py-1 rounded">v4.0 BUILD</span>
          <span className="bg-[#182234] border border-[#243247] px-2.5 py-1 rounded hidden sm:inline">OFFLINE-FIRST ENGINE</span>
        </div>
      </div>

      {/* Hero Central Content */}
      <div className="max-w-3xl my-auto z-10 py-12">
        <div className="inline-flex items-center space-x-2 bg-emerald-950/80 border border-emerald-800/60 px-3 py-1 rounded-full text-xs font-medium text-emerald-400 mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Professional International Cricket Management & Captaincy Simulator</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight uppercase font-sans">
          Manage Your Nation.<br />
          Control The Game.<br />
          <span className="text-emerald-400">Create History.</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 mt-4 max-w-2xl leading-relaxed">
          Step into the dual shoes of National Team Manager and On-Field Captain. Select squads, optimize batting orders, set field cordons, execute bowling changes, and compete across Test, ODI, and T20 World Championships.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap gap-3.5 items-center">
          {savedCareer && (
            <button
              onClick={onContinueCareer}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-3 rounded-lg shadow-lg transition cursor-pointer flex items-center space-x-2 active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Continue Career ({savedCareer.selectedTeamId})</span>
            </button>
          )}

          <button
            onClick={onNewCareer}
            className="bg-[#182234] hover:bg-[#202e44] text-white border border-[#243247] hover:border-emerald-500 font-bold text-sm px-6 py-3 rounded-lg shadow transition cursor-pointer flex items-center space-x-2 active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>New Career</span>
          </button>

          <button
            onClick={onQuickMatch}
            className="bg-[#182234] hover:bg-[#202e44] text-amber-300 border border-[#243247] hover:border-amber-500 font-bold text-sm px-5 py-3 rounded-lg shadow transition cursor-pointer flex items-center space-x-2 active:scale-95"
          >
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Quick T20 Exhibition</span>
          </button>

          <button
            onClick={onOpenDatabase}
            className="text-xs text-slate-300 hover:text-white bg-[#182234] border border-[#243247] px-4 py-3 rounded-lg transition cursor-pointer flex items-center space-x-1.5"
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Player Database & Audit</span>
          </button>

          <button
            onClick={() => downloadDatabaseExportZip('ICM_Database_Export.zip')}
            className="text-xs text-sky-300 hover:text-white bg-sky-950/70 hover:bg-sky-900 border border-sky-800 px-4 py-3 rounded-lg transition cursor-pointer flex items-center space-x-1.5 font-bold"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Download Full Database (.ZIP)</span>
          </button>
        </div>
      </div>

      {/* Footer System Specs */}
      <div className="border-t border-[#1f293d] pt-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 z-10 gap-2">
        <p>12 Full Member ICC Nations • Test, ODI & T20 Rules • Realistic Ball-by-Ball Engine</p>
        <p className="font-mono text-[11px]">Single Player • Zero External Latency</p>
      </div>
    </div>
  );
};
