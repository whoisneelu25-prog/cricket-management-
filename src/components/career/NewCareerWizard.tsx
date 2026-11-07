import React, { useState } from 'react';
import { Shield, Trophy, Check, ArrowRight, ArrowLeft, Users, Sparkles, Zap, Award, Target, UserCheck } from 'lucide-react';
import { MatchFormat, CareerSave } from '../../types/cricket';
import { INTERNATIONAL_TEAMS, CORE_12_TEAMS } from '../../data/teams';
import { CoachPreset, FAMOUS_COACH_PRESETS } from '../../data/coaches';
import { createNewCareerSave } from '../../store/careerStore';

interface NewCareerWizardProps {
  onStartCareer: (newSave: CareerSave) => void;
  onCancel: () => void;
}

export const NewCareerWizard: React.FC<NewCareerWizardProps> = ({ onStartCareer, onCancel }) => {
  const [step, setStep] = useState<number>(1);

  // Coach Selection Mode: Preset vs Custom
  const [selectedCoachId, setSelectedCoachId] = useState<string>('gambhir');

  // Step 1: Manager Profile fields
  const [managerName, setManagerName] = useState('Gautam Gambhir');
  const [nationality, setNationality] = useState('India');
  const [preferredFormat, setPreferredFormat] = useState<MatchFormat>('T20I');
  const [coachingExp, setCoachingExp] = useState<'CLUB' | 'DOMESTIC' | 'INTERNATIONAL' | 'FRANCHISE' | 'ACADEMY'>('FRANCHISE');
  const [managementStyle, setManagementStyle] = useState<'TACTICAL' | 'MAN_MANAGER' | 'AGGRESSIVE' | 'ANALYTICAL' | 'FITNESS' | 'DISCIPLINARIAN'>('AGGRESSIVE');
  const [coachPerk, setCoachPerk] = useState('High-Pressure Intent: +12% boundary hitting under pressure');

  // Step 2: Country Selection
  const [selectedCountryId, setSelectedCountryId] = useState('IND');

  // Step 3: Difficulty
  const [difficulty, setDifficulty] = useState<'BEGINNER' | 'NORMAL' | 'PROFESSIONAL' | 'EXPERT'>('NORMAL');

  const selectedTeam = INTERNATIONAL_TEAMS.find((t) => t.id === selectedCountryId) || INTERNATIONAL_TEAMS[0];

  const handleSelectPreset = (preset: CoachPreset) => {
    setSelectedCoachId(preset.id);
    setManagerName(preset.name);
    setNationality(preset.nationality);
    setPreferredFormat(preset.preferredFormat);
    setCoachingExp(preset.coachingExp);
    setManagementStyle(preset.managementStyle);
    setCoachPerk(`${preset.perkTitle}: ${preset.perkDescription}`);
    if (preset.countryId && INTERNATIONAL_TEAMS.some((t) => t.id === preset.countryId)) {
      setSelectedCountryId(preset.countryId);
    }
  };

  const handleSelectCustom = () => {
    setSelectedCoachId('custom');
    setManagerName('Head Coach');
    setCoachPerk('Custom Tactical Balance: Flexible adaptation across all formats');
  };

  const handleFinish = () => {
    const initialSave = createNewCareerSave(
      managerName || 'Head Coach',
      selectedCountryId,
      preferredFormat,
      coachingExp,
      managementStyle,
      selectedCoachId,
      coachPerk
    );

    initialSave.saveName = `${selectedTeam.name} Career (${managerName})`;
    initialSave.manager.difficulty = difficulty;
    initialSave.manager.nationality = nationality || selectedTeam.name;

    onStartCareer(initialSave);
  };

  return (
    <div className="min-h-screen bg-[#070c18] text-slate-200 flex flex-col justify-center items-center p-4 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[#0c1527] border border-[#1a2b4c] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header with Green and Blue Stadium Theme */}
        <div className="bg-gradient-to-r from-[#0d1c38] via-[#0e2244] to-[#0a1830] border-b border-[#1c335a] p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-black text-white text-sm shadow">
              ICM
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                New International Career • Step {step} of 3
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {step === 1 && 'Choose Your Head Coach & Philosophy'}
                {step === 2 && 'Select Your National Team'}
                {step === 3 && 'Career Difficulty & Launch'}
              </h1>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded bg-[#132038] hover:bg-[#1a2c4e] border border-[#1e3256] transition cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-[#081020] h-1.5 flex">
          <div
            className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto max-h-[72vh]">
          {/* STEP 1: EXPANDED COACH CHOICES & PRESETS */}
          {step === 1 && (
            <div className="space-y-6 text-xs">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Select Head Coach Preset or Create Custom
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    {selectedCoachId === 'custom' ? 'Custom Coach Selected' : 'Famous Coach Selected'}
                  </span>
                </div>

                {/* Famous Coaches Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {FAMOUS_COACH_PRESETS.map((preset) => {
                    const isSelected = selectedCoachId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gradient-to-br from-emerald-950/70 via-slate-900 to-sky-950/60 border-emerald-400 shadow-lg ring-1 ring-emerald-400 scale-[1.02]'
                            : 'bg-[#101b30] border-[#1b2c4c] hover:border-emerald-500/60 hover:bg-[#13223d]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xl">{preset.avatar}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-bold">
                              {preset.preferredFormat}
                            </span>
                          </div>
                          <h3 className="font-bold text-white text-sm leading-snug">{preset.name}</h3>
                          <p className="text-[10px] text-slate-300 font-medium mt-0.5">{preset.tagline}</p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-[#1a2d4f]">
                          <span className="text-[9px] uppercase font-bold text-emerald-400 block tracking-wider">
                            Perk: {preset.perkTitle}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5 line-clamp-2">
                            {preset.perkDescription}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Custom Coach Option */}
                  <div
                    onClick={handleSelectCustom}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      selectedCoachId === 'custom'
                        ? 'bg-gradient-to-br from-emerald-950/70 via-slate-900 to-sky-950/60 border-emerald-400 shadow-lg ring-1 ring-emerald-400 scale-[1.02]'
                        : 'bg-[#101b30] border-[#1b2c4c] hover:border-emerald-500/60 hover:bg-[#13223d]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xl">🧢</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-400 border border-sky-800/60 font-bold">
                          CUSTOM
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-sm leading-snug">Custom Head Coach</h3>
                      <p className="text-[10px] text-slate-300 font-medium mt-0.5">Design your own profile & philosophy</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#1a2d4f]">
                      <span className="text-[9px] uppercase font-bold text-sky-400 block tracking-wider">
                        Personalized Strategy
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Customize name, experience, nationality & philosophy below.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coach Customization Details Panel */}
              <div className="bg-[#101b30] border border-[#1b2c4c] p-4 sm:p-5 rounded-xl space-y-4">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Coach Details & Tactical Philosophy
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Head Coach Name</label>
                    <input
                      type="text"
                      disabled={selectedCoachId !== 'custom'}
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      placeholder="Enter manager name..."
                      className="w-full bg-[#0b1322] border border-[#1e3256] rounded-lg p-2.5 text-sm text-white focus:border-emerald-500 focus:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Nationality</label>
                    <input
                      type="text"
                      disabled={selectedCoachId !== 'custom'}
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className="w-full bg-[#0b1322] border border-[#1e3256] rounded-lg p-2.5 text-sm text-white focus:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Preferred Cricket Format</label>
                    <select
                      disabled={selectedCoachId !== 'custom'}
                      value={preferredFormat}
                      onChange={(e) => setPreferredFormat(e.target.value as MatchFormat)}
                      className="w-full bg-[#0b1322] border border-[#1e3256] rounded-lg p-2 text-white focus:border-emerald-500 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="T20I">Twenty20 International (T20I)</option>
                      <option value="ODI">One Day International (ODI)</option>
                      <option value="TEST">Test Cricket (5-Day)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Coaching Background</label>
                    <select
                      disabled={selectedCoachId !== 'custom'}
                      value={coachingExp}
                      onChange={(e) => setCoachingExp(e.target.value as any)}
                      className="w-full bg-[#0b1322] border border-[#1e3256] rounded-lg p-2 text-white focus:border-emerald-500 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="INTERNATIONAL">Former International Player / Legend</option>
                      <option value="FRANCHISE">Global Franchise Tournament Champion</option>
                      <option value="DOMESTIC">First-Class Domestic Championship Coach</option>
                      <option value="ACADEMY">National High Performance Academy Director</option>
                      <option value="CLUB">Rising Tactical Specialist</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Management Philosophy</label>
                    <select
                      disabled={selectedCoachId !== 'custom'}
                      value={managementStyle}
                      onChange={(e) => setManagementStyle(e.target.value as any)}
                      className="w-full bg-[#0b1322] border border-[#1e3256] rounded-lg p-2 text-white focus:border-emerald-500 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="AGGRESSIVE">Aggressive & Fearless (Bazball Style)</option>
                      <option value="TACTICAL">Tactical & Strategic Planning</option>
                      <option value="MAN_MANAGER">Player Morale & Leadership Focused</option>
                      <option value="ANALYTICAL">Data-Driven & Analytics Focus</option>
                      <option value="FITNESS">Elite Conditioning & High Work Ethic</option>
                      <option value="DISCIPLINARIAN">Strict Technical Discipline</option>
                    </select>
                  </div>
                </div>

                {/* Active Coach Perk Banner */}
                <div className="bg-gradient-to-r from-emerald-950/60 to-sky-950/60 border border-emerald-700/40 p-3 rounded-lg flex items-center space-x-3">
                  <div className="w-8 h-8 rounded bg-emerald-600/30 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                      Active Coach Perk Bonus
                    </span>
                    <span className="text-xs text-slate-200 font-medium">
                      {coachPerk}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: NATION SELECTION */}
          {step === 2 && (
            <div className="space-y-4">
              <span className="text-xs text-slate-400 block">
                Select from the 12 elite Full Member ICC nations to manage:
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
                {CORE_12_TEAMS.map((team) => {
                  const isSelected = selectedCountryId === team.id;

                  return (
                    <div
                      key={team.id}
                      onClick={() => setSelectedCountryId(team.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gradient-to-br from-emerald-950/80 to-sky-950/60 border-emerald-400 shadow-lg ring-1 ring-emerald-400 scale-[1.02]'
                          : 'bg-[#101b30] border-[#1b2c4c] hover:border-slate-400 hover:bg-[#13223d]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{team.flagEmoji}</span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold bg-[#081020] px-1.5 py-0.5 rounded border border-emerald-900/50">
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
              <div className="bg-[#101b30] border border-[#1b2c4c] p-4 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Selected Nation Profile</span>
                  <h4 className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
                    <span>{selectedTeam.flagEmoji}</span>
                    <span>{selectedTeam.name}</span>
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
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      difficulty === diff.id
                        ? 'bg-gradient-to-br from-emerald-950/70 to-sky-950/60 border-emerald-400 shadow-md ring-1 ring-emerald-400'
                        : 'bg-[#101b30] border-[#1b2c4c] hover:border-slate-500'
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
              <div className="bg-[#101b30] border border-[#1b2c4c] p-4 rounded-xl mt-4 space-y-3">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                  Career Blueprint Summary
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-slate-300">
                  <div>Manager: <strong className="text-white block">{managerName}</strong></div>
                  <div>Nation: <strong className="text-white block">{selectedTeam.name}</strong></div>
                  <div>Difficulty: <strong className="text-emerald-400 block">{difficulty}</strong></div>
                  <div>Preferred Format: <strong className="text-white block">{preferredFormat}</strong></div>
                  <div>Philosophy: <strong className="text-white block">{managementStyle}</strong></div>
                  <div>Perk: <strong className="text-emerald-400 block truncate">{coachPerk.split(':')[0]}</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Nav */}
        <div className="bg-[#0b1322] border-t border-[#1b2c4c] p-4 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white px-4 py-2 rounded-lg bg-[#14223a] hover:bg-[#1a2e4e] border border-[#1e3358] transition cursor-pointer font-medium"
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
              className="flex items-center space-x-1.5 text-xs text-white px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition cursor-pointer font-bold shadow-md active:scale-95"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center space-x-1.5 text-xs text-white px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition cursor-pointer font-bold shadow-lg active:scale-95"
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
