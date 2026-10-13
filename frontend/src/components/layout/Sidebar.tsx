import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard, Database, LineChart, Activity,
  GitCompare, Compass, FileText, ChevronDown, ChevronRight,
  Cpu
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const [modelsOpen, setModelsOpen] = useState(true);
  const { isDark } = useTheme();

  const navItemClass = ({ isActive }: { isActive: boolean }) => {
    if (isActive) {
      return isDark
        ? 'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-xs'
        : 'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-xs';
    }
    return isDark
      ? 'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition'
      : 'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition';
  };

  const subNavItemClass = ({ isActive }: { isActive: boolean }) => {
    if (isActive) {
      return isDark
        ? 'flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-lg text-[11px] font-semibold text-cyan-300 bg-cyan-950/40 border border-cyan-500/30'
        : 'flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-lg text-[11px] font-semibold text-blue-700 bg-blue-50/80 border border-blue-200';
    }
    return isDark
      ? 'flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 transition'
      : 'flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 transition';
  };

  return (
    <aside className="w-60 min-w-[15rem] bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col h-screen sticky top-0 z-30 transition-colors duration-200">
      {/* Brand Header */}
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
          <Activity className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-extrabold tracking-tight text-[var(--text-primary)]">
              CHRONOS
            </h1>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-cyan-300 border border-blue-500/20 font-mono">
              ATSA
            </span>
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] font-medium">Time Series Platform</p>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <div className="px-3 pt-1 pb-1 text-[10px] font-bold tracking-wider text-[var(--text-tertiary)] uppercase">
          Workspaces
        </div>
        <NavLink to="/" className={navItemClass}>
          <LayoutDashboard className="w-4 h-4 text-blue-500" />
          <span>Overview</span>
        </NavLink>
        <NavLink to="/datasets" className={navItemClass}>
          <Database className="w-4 h-4 text-emerald-500" />
          <span>Datasets & Hub</span>
        </NavLink>
        <NavLink to="/explore" className={navItemClass}>
          <LineChart className="w-4 h-4 text-cyan-500" />
          <span>Exploratory Analysis</span>
        </NavLink>
        <NavLink to="/statistical-tests" className={navItemClass}>
          <Activity className="w-4 h-4 text-violet-500" />
          <span>Tests & Stationarity</span>
        </NavLink>

        <div className="pt-3 px-3 pb-1 text-[10px] font-bold tracking-wider text-[var(--text-tertiary)] uppercase">
          Model Zoo
        </div>

        {/* Expandable Models Menu */}
        <div>
          <button
            onClick={() => setModelsOpen(!modelsOpen)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
              isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Cpu className="w-4 h-4 text-amber-500" />
              <span>ATSA Models</span>
            </div>
            {modelsOpen ? (
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            )}
          </button>

          {modelsOpen && (
            <div className={`mt-0.5 space-y-0.5 ml-3 pl-1 border-l ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <NavLink to="/models/naive" className={subNavItemClass}>
                <span>Naive Benchmark</span>
              </NavLink>
              <NavLink to="/models/linear_trend" className={subNavItemClass}>
                <span>Linear Trend</span>
              </NavLink>
              <NavLink to="/models/ses" className={subNavItemClass}>
                <span>SES Exponential</span>
              </NavLink>
              <NavLink to="/models/holt" className={subNavItemClass}>
                <span>Holt's Linear Trend</span>
              </NavLink>
              <NavLink to="/models/holt_winters" className={subNavItemClass}>
                <span>Holt-Winters Seasonal</span>
              </NavLink>
              <NavLink to="/models/ar" className={subNavItemClass}>
                <span>AR(p) Autoregressive</span>
              </NavLink>
              <NavLink to="/models/ma" className={subNavItemClass}>
                <span>MA(q) Moving Average</span>
              </NavLink>
              <NavLink to="/models/arma" className={subNavItemClass}>
                <span>ARMA(p, q)</span>
              </NavLink>
              <NavLink to="/models/arima" className={subNavItemClass}>
                <span>ARIMA(p, d, q)</span>
              </NavLink>
              <NavLink to="/models/sarima" className={subNavItemClass}>
                <span>SARIMA Multiplicative</span>
              </NavLink>
            </div>
          )}
        </div>

        <div className="pt-3 px-3 pb-1 text-[10px] font-bold tracking-wider text-[var(--text-tertiary)] uppercase">
          Evaluation
        </div>

        <NavLink to="/model-comparison" className={navItemClass}>
          <GitCompare className="w-4 h-4 text-fuchsia-500" />
          <span>Model Comparison</span>
        </NavLink>
        <NavLink to="/forecast" className={navItemClass}>
          <Compass className="w-4 h-4 text-sky-500" />
          <span>Forecast Horizon</span>
        </NavLink>
        <NavLink to="/reports" className={navItemClass}>
          <FileText className="w-4 h-4 text-rose-500" />
          <span>Reports & Hub</span>
        </NavLink>
      </div>

      {/* Minimal Footer */}
      <div className="p-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Python Engine
          </span>
          <span className="font-mono text-[10px] opacity-75">
            FastAPI 3.12
          </span>
        </div>
      </div>
    </aside>
  );
};
