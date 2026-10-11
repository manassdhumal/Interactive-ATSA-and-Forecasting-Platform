import React from 'react';
import { useApp } from '../../context/AppContext';
import { Database, Filter, Calendar, Activity, Zap } from 'lucide-react';

export const Header: React.FC = () => {
  const { datasets, selectedDataset, selectedTarget, setSelectedDataset, setSelectedTarget } = useApp();

  return (
    <header className="h-16 bg-[#080d19]/80 backdrop-blur-xl border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-20 shadow-md">
      <div className="flex items-center gap-4">
        {/* Active Dataset Selector */}
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 shadow-sm">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Dataset</span>
          <select
            className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer pr-1"
            value={selectedDataset?.id || ''}
            onChange={(e) => {
              const found = datasets.find(d => d.id === e.target.value);
              if (found) setSelectedDataset(found);
            }}
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id} className="bg-slate-900 text-slate-200">
                {d.name} {d.is_sample ? '(Sample)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Target Series Selector */}
        {selectedDataset && (
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 shadow-sm">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Target</span>
            <select
              className="bg-transparent text-cyan-300 text-xs font-semibold focus:outline-none cursor-pointer font-mono"
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
            >
              {selectedDataset.numeric_cols.map((col) => (
                <option key={col} value={col} className="bg-slate-900 text-slate-200">
                  {col}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Dataset quick badge & metadata pill */}
      {selectedDataset && (
        <div className="flex items-center gap-3 text-xs">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-[11px]">Interval:</span>
            <span className="font-mono text-[11px] text-cyan-300">
              {selectedDataset.date_range[0]?.slice(0, 10)} → {selectedDataset.date_range[1]?.slice(0, 10)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/30 border border-blue-500/30 text-blue-300">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono font-bold text-xs">{selectedDataset.total_rows}</span>
            <span className="text-[11px] text-slate-400">observations</span>
          </div>
        </div>
      )}
    </header>
  );
};
