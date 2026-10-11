import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Database, LineChart, Activity,
  Layers, GitCompare, Compass, FileText, ChevronDown, ChevronRight,
  TrendingUp, Sliders, Cpu
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const [modelsOpen, setModelsOpen] = useState(true);

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
    }`;

  const subNavItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 pl-9 pr-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
      isActive
        ? 'text-cyan-400 bg-cyan-950/40 font-semibold'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
    }`;

  return (
    <aside className="w-64 min-w-[16rem] bg-[#090d16] border-r border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
            CHRONOS
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">ATSA</span>
          </h1>
          <p className="text-[11px] text-slate-400">Forecasting & Analytics</p>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Core Workspaces
        </div>
        <NavLink to="/" className={navItemClass}>
          <LayoutDashboard className="w-4 h-4 text-blue-400" />
          <span>Overview Dashboard</span>
        </NavLink>
        <NavLink to="/datasets" className={navItemClass}>
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Data Management</span>
        </NavLink>
        <NavLink to="/explore" className={navItemClass}>
          <LineChart className="w-4 h-4 text-cyan-400" />
          <span>Explore Data</span>
        </NavLink>
        <NavLink to="/statistical-tests" className={navItemClass}>
          <Activity className="w-4 h-4 text-violet-400" />
          <span>Statistical Tests</span>
        </NavLink>

        <div className="pt-4 px-3 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Model Engineering
        </div>

        {/* Expandable Models Menu */}
        <div>
          <button
            onClick={() => setModelsOpen(!modelsOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>Time Series Models</span>
            </div>
            {modelsOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {modelsOpen && (
            <div className="mt-1 space-y-0.5 border-l border-slate-800 ml-4 pl-1">
              <NavLink to="/models/naive" className={subNavItemClass}>
                <span>Naive Baselines</span>
              </NavLink>
              <NavLink to="/models/linear_trend" className={subNavItemClass}>
                <span>Linear Trend</span>
              </NavLink>
              <NavLink to="/models/ses" className={subNavItemClass}>
                <span>Simple Exp. Smoothing (SES)</span>
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
                <span>ARMA(p, q) Process</span>
              </NavLink>
              <NavLink to="/models/arima" className={subNavItemClass}>
                <span>ARIMA(p, d, q)</span>
              </NavLink>
              <NavLink to="/models/sarima" className={subNavItemClass}>
                <span>SARIMA Seasonal</span>
              </NavLink>
            </div>
          )}
        </div>

        <NavLink to="/model-comparison" className={navItemClass}>
          <GitCompare className="w-4 h-4 text-fuchsia-400" />
          <span>Model Comparison Lab</span>
        </NavLink>
        <NavLink to="/forecast" className={navItemClass}>
          <Compass className="w-4 h-4 text-sky-400" />
          <span>Forecast Explorer</span>
        </NavLink>
        <NavLink to="/reports" className={navItemClass}>
          <FileText className="w-4 h-4 text-rose-400" />
          <span>Reports & Exports</span>
        </NavLink>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Python Engine Active
          </span>
          <span className="font-mono text-slate-400">v1.0</span>
        </div>
      </div>
    </aside>
  );
};
