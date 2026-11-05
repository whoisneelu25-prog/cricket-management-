import React, { useState } from 'react';
import { CustomFieldLayout, CustomFieldPosition, FieldPosition, MatchFormat } from '../../types/cricket';
import {
  STANDARD_FIELD_COORDINATES,
  getStandardFieldPresets,
  validateCustomFieldLayout,
} from '../../engine/tacticalEngine';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface InteractiveFieldEditorProps {
  currentLayout?: CustomFieldLayout;
  format: MatchFormat;
  completedOvers?: number;
  allocatedOvers?: number;
  isPowerplay?: boolean;
  powerplayPhase?: 'POWERPLAY_1' | 'POWERPLAY_2' | 'POWERPLAY_3';
  onSaveLayout: (layout: CustomFieldLayout) => void;
  onClose?: () => void;
}

export const InteractiveFieldEditor: React.FC<InteractiveFieldEditorProps> = ({
  currentLayout,
  format,
  completedOvers = 10,
  allocatedOvers = 50,
  onSaveLayout,
  onClose,
}) => {
  const presets = getStandardFieldPresets('bowler_active', [], 'wk_active');
  const defaultLayout = currentLayout || presets.BALANCED_STANDARD;

  const [layoutName, setLayoutName] = useState(defaultLayout.name || 'Custom Field');
  const [positions, setPositions] = useState<CustomFieldPosition[]>(defaultLayout.positions);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('CUSTOM');
  const [draggedFielderIndex, setDraggedFielderIndex] = useState<number | null>(null);

  const validation = validateCustomFieldLayout(
    {
      id: currentLayout?.id || 'custom_layout',
      name: layoutName,
      positions,
      isLegal: true,
    },
    format,
    completedOvers,
    allocatedOvers
  );

  const handleSelectPreset = (key: string) => {
    const selected = presets[key as keyof typeof presets];
    if (selected) {
      setSelectedPresetKey(key);
      setLayoutName(selected.name);
      setPositions([...selected.positions]);
    }
  };

  const handleFieldClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggedFielderIndex === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const clampedX = Math.max(5, Math.min(95, x));
    const clampedY = Math.max(5, Math.min(95, y));

    // Distance from center (50, 50)
    const dist = Math.sqrt((clampedX - 50) ** 2 + (clampedY - 50) ** 2);
    const isDeep = dist > 28;
    const isLegSide = clampedX > 50;

    const updated = [...positions];
    updated[draggedFielderIndex] = {
      ...updated[draggedFielderIndex],
      x: clampedX,
      y: clampedY,
      isDeep,
      isLegSide,
    };
    setPositions(updated);
    setDraggedFielderIndex(null);
  };

  const handleSave = () => {
    const savedLayout: CustomFieldLayout = {
      id: `layout_${Date.now()}`,
      name: layoutName,
      positions,
      isLegal: validation.isLegal,
      validationErrors: validation.errors,
    };
    onSaveLayout(savedLayout);
    if (onClose) onClose();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl max-w-4xl w-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Tactical Field Placement Editor
          </h3>
          <p className="text-xs text-slate-400">
            Configure 10 fielders (9 outfielders + 1 Wicketkeeper) and validate ICC circle restrictions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {validation.isLegal ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-400 text-xs font-semibold">
              <CheckCircle className="w-3.5 h-3.5" />
              Legal Field Layout
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 border border-rose-500/40 rounded-full text-rose-400 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              Illegal Layout ({validation.errors.length})
            </div>
          )}
        </div>
      </div>

      {/* Preset selection bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs font-semibold text-slate-400 self-center mr-1">Presets:</span>
        {Object.entries(presets).map(([k, p]) => (
          <button
            key={k}
            onClick={() => handleSelectPreset(k)}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
              selectedPresetKey === k
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* SVG Cricket Field (Left) */}
        <div className="md:col-span-7 flex flex-col items-center">
          <div className="relative w-80 h-80 bg-emerald-950/40 rounded-full border-2 border-emerald-600/50 shadow-inner overflow-hidden select-none">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full cursor-crosshair"
              onClick={handleFieldClick}
            >
              {/* Outer boundary */}
              <circle cx="50" cy="50" r="48" fill="#042f2e" fillOpacity="0.4" stroke="#059669" strokeWidth="1" />
              {/* 30 yard circle (radius 28) */}
              <circle
                cx="50"
                cy="50"
                r="28"
                fill="none"
                stroke="#10b981"
                strokeWidth="0.8"
                strokeDasharray="2 2"
              />
              {/* Pitch */}
              <rect x="47.5" y="38" width="5" height="24" fill="#92400e" fillOpacity="0.8" rx="0.5" />
              {/* Stumps */}
              <line x1="48" y1="40" x2="52" y2="40" stroke="#fef08a" strokeWidth="0.8" />
              <line x1="48" y1="60" x2="52" y2="60" stroke="#fef08a" strokeWidth="0.8" />

              {/* Fielder markers */}
              {positions.map((f, i) => {
                const isSelected = draggedFielderIndex === i;
                const isWK = f.position === 'WICKETKEEPER';

                return (
                  <g
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDraggedFielderIndex(i);
                    }}
                    className="cursor-pointer transition-transform hover:scale-125"
                  >
                    <circle
                      cx={f.x}
                      cy={f.y}
                      r={isSelected ? 3.5 : 2.5}
                      fill={
                        isSelected
                          ? '#f59e0b'
                          : isWK
                          ? '#38bdf8'
                          : f.isDeep
                          ? '#a855f7'
                          : '#10b981'
                      }
                      stroke="#0f172a"
                      strokeWidth="0.6"
                    />
                    <text
                      x={f.x}
                      y={f.y + 4.5}
                      fontSize="2.4"
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontWeight="bold"
                    >
                      {isWK ? 'WK' : i + 1}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <p className="text-[11px] text-slate-400 mt-2 text-center">
            Click any numbered fielder on the pitch, then click anywhere on the grass to reposition them.
          </p>
        </div>

        {/* Fielder Positions List & Validation (Right) */}
        <div className="md:col-span-5 flex flex-col justify-between">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-300">
              Active Fielders (9 Outfielders + 1 WK)
            </h4>

            <div className="max-h-56 overflow-y-auto space-y-1 pr-1 border border-slate-800 rounded-lg p-2 bg-slate-950/40">
              {positions.map((f, i) => (
                <div
                  key={i}
                  onClick={() => setDraggedFielderIndex(i)}
                  className={`flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer border ${
                    draggedFielderIndex === i
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                      {f.position === 'WICKETKEEPER' ? 'WK' : i + 1}
                    </span>
                    <span className="font-medium">{f.position.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    ({f.x}, {f.y}) {f.isDeep ? 'Deep' : 'Ring'} • {f.isLegSide ? 'Leg' : 'Off'}
                  </span>
                </div>
              ))}
            </div>

            {/* Validation Violations List */}
            {validation.errors.length > 0 && (
              <div className="bg-rose-950/30 border border-rose-800/40 rounded-lg p-2 space-y-1">
                {validation.errors.map((err, i) => (
                  <p key={i} className="text-[11px] text-rose-300 flex items-start gap-1">
                    <span className="text-rose-400">•</span> {err}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 mt-4">
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!validation.isLegal}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                validation.isLegal
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              Apply Field Tactics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
