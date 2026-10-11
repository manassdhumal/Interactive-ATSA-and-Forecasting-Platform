import React from 'react';
import { useApp } from '../../context/AppContext';
import { Database, Filter, Calendar, Activity } from 'lucide-react';

export const Header: React.FC = () => {
  const { datasets, selectedDataset, selectedTarget, setSelectedDataset, setSelectedTarget } = useApp();

  return (
    <header className="h-14 bg-[#0d1322] border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-6">
        {/* Active Dataset Selector */}
        <div className="flex items-center gap-2 text-xs">
          <Database className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400">Dataset:</span>
          <select
            className="bg-slate-900 border border-slate-700/80 rounded-md px-2.5 py-1 text-slate-200 text-xs font-medium focus:outline-none focus:border-blue-500"
            value={selectedDataset?.id || ''}
            onChange={(e) => {
              const found = datasets.find(d => d.id === e.target.value);
              if (found) setSelectedDataset(found);
            }}
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.is_sample ? '(Sample)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Target Series Selector */}
        {selectedDataset && (
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Target Series:</span>
            <select
              className="bg-slate-900 border border-slate-700/80 rounded-md px-2.5 py-1 text-slate-200 text-xs font-medium focus:outline-none focus:border-blue-500"
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
            >
              {selectedDataset.numeric_cols.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Dataset quick badge */}
      {selectedDataset && (
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Range:</span>
            <span className="text-slate-300 font-mono">
              {selectedDataset.date_range[0]?.slice(0, 10)} → {selectedDataset.date_range[1]?.slice(0, 10)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>Obs:</span>
            <span className="text-blue-300 font-mono font-medium">{selectedDataset.total_rows}</span>
          </div>
        </div>
      )}
    </header>
  );
};
