import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export interface TimeZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onSelectPreset?: (count: number) => void;
  currentCount?: number;
  totalCount?: number;
  presets?: { label: string; count: number }[];
  className?: string;
}

export const TimeZoomControls: React.FC<TimeZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onReset,
  onSelectPreset,
  currentCount,
  totalCount,
  presets = [
    { label: '30d', count: 30 },
    { label: '90d', count: 90 },
    { label: '180d', count: 180 },
    { label: 'All', count: 0 },
  ],
  className = '',
}) => {
  const { isDark } = useTheme();

  return (
    <div className={`flex flex-wrap items-center gap-1.5 text-xs select-none ${className}`}>
      {/* Zoom In / Out Buttons */}
      <div className={`flex items-center rounded-lg border p-0.5 ${
        isDark ? 'bg-slate-900 border-slate-700/80' : 'bg-slate-100 border-slate-200'
      }`}>
        <button
          type="button"
          onClick={onZoomIn}
          title="Zoom In (narrow time window)"
          className={`p-1 rounded-md transition cursor-pointer ${
            isDark
              ? 'hover:bg-slate-800 text-slate-300 hover:text-white'
              : 'hover:bg-white text-slate-600 hover:text-slate-900 shadow-2xs'
          }`}
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          title="Zoom Out (widen time window)"
          className={`p-1 rounded-md transition cursor-pointer ${
            isDark
              ? 'hover:bg-slate-800 text-slate-300 hover:text-white'
              : 'hover:bg-white text-slate-600 hover:text-slate-900 shadow-2xs'
          }`}
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onReset}
          title="Reset to Full Time Range"
          className={`p-1 rounded-md transition cursor-pointer ${
            isDark
              ? 'hover:bg-slate-800 text-slate-300 hover:text-white'
              : 'hover:bg-white text-slate-600 hover:text-slate-900 shadow-2xs'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Preset Pill Buttons */}
      {presets && onSelectPreset && (
        <div className={`hidden sm:flex items-center rounded-lg border p-0.5 ${
          isDark ? 'bg-slate-900 border-slate-700/80' : 'bg-slate-100 border-slate-200'
        }`}>
          {presets.map((p) => {
            const isActive = currentCount === p.count || (p.count === 0 && currentCount === totalCount);
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => onSelectPreset(p.count)}
                className={`px-2 py-0.5 text-[10px] font-mono font-medium rounded-md transition cursor-pointer ${
                  isActive
                    ? isDark
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-white text-blue-700 font-semibold shadow-2xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Range Indicator */}
      {currentCount !== undefined && totalCount !== undefined && (
        <span className="text-[10px] font-mono text-[var(--text-tertiary)] hidden md:inline ml-1">
          {currentCount > 0 ? `${currentCount} / ${totalCount} pts` : `${totalCount} pts`}
        </span>
      )}
    </div>
  );
};
