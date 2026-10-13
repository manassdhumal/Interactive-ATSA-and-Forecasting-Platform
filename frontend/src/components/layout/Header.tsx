import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { Database, Filter, Calendar, Activity, Sun, Moon } from 'lucide-react';

export const Header: React.FC = () => {
  const { datasets, selectedDataset, selectedTarget, setSelectedDataset, setSelectedTarget } = useApp();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="h-16 bg-[var(--bg-header)] backdrop-blur-xl border-b border-[var(--border-subtle)] px-6 flex items-center justify-between sticky top-0 z-20 transition-colors duration-200">
      <div className="flex items-center gap-3">
        {/* Active Dataset Selector */}
        <div className="flex items-center gap-2 bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 shadow-xs transition-colors">
          <Database className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Dataset
          </span>
          <select
            className="bg-transparent text-[var(--text-primary)] text-xs font-semibold focus:outline-none cursor-pointer pr-1"
            value={selectedDataset?.id || ''}
            onChange={(e) => {
              const found = datasets.find(d => d.id === e.target.value);
              if (found) setSelectedDataset(found);
            }}
          >
            {datasets.map((d) => (
              <option
                key={d.id}
                value={d.id}
                className={isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}
              >
                {d.name} {d.is_sample ? '(Sample)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Target Series Selector */}
        {selectedDataset && (
          <div className="flex items-center gap-2 bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 shadow-xs transition-colors">
            <Filter className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
            <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              Target
            </span>
            <select
              className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer font-mono ${
                isDark ? 'text-cyan-300' : 'text-blue-600'
              }`}
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
            >
              {selectedDataset.numeric_cols.map((col) => (
                <option
                  key={col}
                  value={col}
                  className={isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}
                >
                  {col}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Dataset quick badge & metadata pill */}
        {selectedDataset && (
          <div className="hidden md:flex items-center gap-2.5 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <span className="text-[11px] font-mono">
                {selectedDataset.date_range[0]?.slice(0, 10)} → {selectedDataset.date_range[1]?.slice(0, 10)}
              </span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${
              isDark
                ? 'bg-blue-950/30 border-blue-500/30 text-blue-300'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              <Activity className="w-3.5 h-3.5" />
              <span className="font-mono font-bold">{selectedDataset.total_rows}</span>
              <span className="text-[11px] opacity-80">obs</span>
            </div>
          </div>
        )}

        {/* Light / Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme mode"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
            isDark
              ? 'bg-slate-800/80 hover:bg-slate-700 text-amber-300 border-slate-700'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
          }`}
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline text-[11px] font-medium text-slate-200">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline text-[11px] font-medium text-slate-700">Dark</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
