import React, { useState } from 'react';
import { Shield, Trophy, Check, ArrowRight, ArrowLeft, Users, Sparkles } from 'lucide-react';
import { MatchFormat, CareerSave } from '../../types/cricket';
import { INTERNATIONAL_TEAMS } from '../../data/teams';
import { getDefaultPlayingXI, getPlayersByCountry } from '../../data/squads';
import { createNewCareerSave } from '../../store/careerStore';

interface NewCareerWizardProps {
  onStartCareer: (newSave: CareerSave) => void;
  onCancel: () => void;
}

export const NewCareerWizard: React.FC<NewCareerWizardProps> = ({ onStartCareer, onCancel }) => {
  const [step, setStep] = useState<number>(1);

  // Step 1: Manager Profile
  const [managerName, setManagerName] = useState('Rahul Dravid');
  const [nationality, setNationality] = useState('India');
  const [preferredFormat, setPreferredFormat] = useState<MatchFormat>('T20I');
  const [coachingExp, setCoachingExp] = useState<'CLUB' | 'DOMESTIC' | 'INTERNATIONAL'>('INTERNATIONAL');
  const [managementStyle, setManagementStyle] = useState<'TACTICAL' | 'MAN_MANAGER' | 'AGGRESSIVE' | 'ANALYTICAL'>('TACTICAL');

  // Step 2: Country Selection
  const [selectedCountryId, setSelectedCountryId] = useState('IND');

  // Step 3: Difficulty
  const [difficulty, setDifficulty] = useState<'BEGINNER' | 'NORMAL' | 'PROFESSIONAL' | 'EXPERT'>('NORMAL');

  const selectedTeam = INTERNATIONAL_TEAMS.find((t) => t.id === selectedCountryId) || INTERNATIONAL_TEAMS[0];

  const handleFinish = () => {
    const initialSave = createNewCareerSave(
      managerName || 'Head Coach',
      selectedCountryId,
      preferredFormat,
      coachingExp,
      managementStyle
    );

    initialSave.saveName = `${selectedTeam.name} Career (${managerName})`;
    initialSave.manager.difficulty = difficulty;
    initialSave.manager.nationality = nationality || selectedTeam.name;

    onStartCareer(initialSave);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-200 flex flex-col justify-center items-center p-4 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#121824] border border-[#1f293d] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#182234] border-b border-[#243247] p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
              New Career Setup • Step {step} of 3
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {step === 1 && 'Manager Profile & Philosophy'}
              {step === 2 && 'Select Your National Team'}
              {step === 3 && 'Career Difficulty & Launch'}
            </h1>
          </div>

          <button
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded hover:bg-[#243247] transition cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-[#0d131f] h-1.5 flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto max-h-[70vh]">
          {/* STEP 1: MANAGER PROFILE */}
          {step === 1 && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Manager / Head Coach Name</label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full bg-[#182234] border border-[#243247] rounded p-2.5 text-sm text-white focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Nationality</label>
                  <input
                    type="text"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full bg-[#182234] border border-[#243247] rounded p-2 text-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Preferred Cricket Format</label>
                  <select
                    value={preferredFormat}
                    onChange={(e) => setPreferredFormat(e.target.value as MatchFormat)}
                    className="w-full bg-[#182234] border border-[#243247] rounded p-2 text-white focus:border-emerald-500"
                  >
                    <option value="T20I">Twenty20 International (T20I)</option>
                    <option value="ODI">One Day International (ODI)</option>
                    <option value="TEST">Test Cricket (5-Day)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Coaching Background</label>
                  <select
                    value={coachingExp}
                    onChange={(e) => setCoachingExp(e.target.value as any)}
                    className="w-full bg-[#182234] border border-[#243247] rounded p-2 text-white focus:border-emerald-500"
                  >
                    <option value="INTERNATIONAL">Former International Player / Veteran</option>
                    <option value="DOMESTIC">Experienced Domestic Championship Coach</option>
                    <option value="CLUB">Rising Tactical Specialist</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Management Philosophy</label>
                  <select
                    value={managementStyle}
                    onChange={(e) => setManagementStyle(e.target.value as any)}
                    className="w-full bg-[#182234] border border-[#243247] rounded p-2 text-white focus:border-emerald-500"
                  >
                    <option value="TACTICAL">Tactical & Strategic Planning</option>
                    <option value="AGGRESSIVE">Aggressive & Fearless (Bazball Style)</option>
                    <option value="MAN_MANAGER">Player Morale & Leadership Focused</option>
                    <option value="ANALYTICAL">Data-Driven & Analytics Focus</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: NATION SELECTION */}
          {step === 2 && (
            <div className="space-y-4">
              <span className="text-xs text-slate-400 block">
                Select from the 12 elite Full Member ICC nations:
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
                {INTERNATIONAL_TEAMS.map((team) => {
                  const isSelected = selectedCountryId === team.id;

                  return (
                    <div
                      key={team.id}
                      onClick={() => setSelectedCountryId(team.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                          : 'bg-[#182234] border-[#243247] hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{team.flagEmoji}</span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold bg-[#0d131f] px-1 rounded">
                          #{team.worldRankings.T20I} T20
                        </span>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white leading-tight">{team.name}</h3>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                          Test #{team.worldRankings.TEST} • ODI #{team.worldRankings.ODI}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Country Profile Callout */}
              <div className="bg-[#182234] border border-[#243247] p-4 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Selected Nation Profile</span>
                  <h4 className="text-sm font-bold text-white mt-0.5">
                    {selectedTeam.flagEmoji} {selectedTeam.name}
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Major Honours: {selectedTeam.historicalAchievements.slice(0, 2).join(' • ')}
                  </p>
                </div>

                <div className="text-right font-mono">
                  <span className="text-emerald-400 font-bold block text-sm">
                    {selectedTeam.ratingPoints.T20I} Rating Points
                  </span>
                  <span className="text-slate-400 text-[10px]">ICC Rank: #{selectedTeam.worldRankings.TEST} Test</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DIFFICULTY & LAUNCH */}
          {step === 3 && (
            <div className="space-y-4 text-xs">
              <span className="text-slate-400 block">
                Choose your career difficulty setting:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'BEGINNER', title: 'Beginner', desc: 'Forgiving board confidence, high player fitness recovery, relaxed tournament targets.' },
                  { id: 'NORMAL', title: 'Normal (Standard)', desc: 'Balanced opposition tactical AI, standard board expectations, realistic fatigue.' },
                  { id: 'PROFESSIONAL', title: 'Professional', desc: 'Aggressive opponent captaincy, strict board review, demanding series targets.' },
                  { id: 'EXPERT', title: 'Expert (Hardcore)', desc: 'Unforgiving board scrutiny, relentless opposition bowlers, intense injury risk.' },
                ].map((diff) => (
                  <div
                    key={diff.id}
                    onClick={() => setDifficulty(diff.id as any)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition ${
                      difficulty === diff.id
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                        : 'bg-[#182234] border-[#243247] hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-white">{diff.title}</h4>
                      {difficulty === diff.id && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{diff.desc}</p>
                  </div>
                ))}
              </div>

              {/* Final Overview Card */}
              <div className="bg-[#182234] border border-[#243247] p-4 rounded-lg mt-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                  Career Blueprint Summary
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-300">
                  <div>Manager: <strong className="text-white">{managerName}</strong></div>
                  <div>Nation: <strong className="text-white">{selectedTeam.name}</strong></div>
                  <div>Difficulty: <strong className="text-emerald-400">{difficulty}</strong></div>
                  <div>Format: <strong className="text-white">{preferredFormat}</strong></div>
                  <div>Style: <strong className="text-white">{managementStyle}</strong></div>
                  <div>Squad Size: <strong className="text-emerald-400">15 Players</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Nav */}
        <div className="bg-[#182234] border-t border-[#243247] p-4 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white px-4 py-2 rounded bg-[#243247] hover:bg-[#334155] transition cursor-pointer font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center space-x-1.5 text-xs text-white px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 transition cursor-pointer font-bold shadow active:scale-95"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center space-x-1.5 text-xs text-white px-6 py-2 rounded bg-emerald-600 hover:bg-emerald-500 transition cursor-pointer font-bold shadow-lg active:scale-95"
            >
              <span>Start International Career</span>
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
