import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Database, LineChart, Activity,
  GitCompare, Compass, FileText, ChevronDown, ChevronRight,
  Cpu, Sparkles
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const [modelsOpen, setModelsOpen] = useState(true);

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
      isActive
        ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/10 text-blue-300 border border-blue-500/40 shadow-lg shadow-blue-500/10 font-semibold'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 hover:border hover:border-slate-800'
    }`;

  const subNavItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 pl-8 pr-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
      isActive
        ? 'text-cyan-300 bg-cyan-950/40 font-semibold border border-cyan-500/30 shadow-sm'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
    }`;

  return (
    <aside className="w-64 min-w-[16rem] bg-[#080d19]/80 backdrop-blur-xl border-r border-slate-800/80 flex flex-col h-screen sticky top-0 z-30 shadow-2xl">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Activity className="w-5 h-5" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#090d16]"></span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-extrabold tracking-tight text-white font-sans">
              CHRONOS
            </h1>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
              PRO
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Time Series Intelligence</p>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        <div className="px-3 pb-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          Workspaces
        </div>
        <NavLink to="/" className={navItemClass}>
          <LayoutDashboard className="w-4 h-4 text-blue-400" />
          <span>Overview Dashboard</span>
        </NavLink>
        <NavLink to="/datasets" className={navItemClass}>
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Data Ingestion & Hub</span>
        </NavLink>
        <NavLink to="/explore" className={navItemClass}>
          <LineChart className="w-4 h-4 text-cyan-400" />
          <span>Exploratory Analytics</span>
        </NavLink>
        <NavLink to="/statistical-tests" className={navItemClass}>
          <Activity className="w-4 h-4 text-violet-400" />
          <span>Hypothesis & Tests</span>
        </NavLink>

        <div className="pt-4 px-3 pb-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          Model Zoo
        </div>

        {/* Expandable Models Menu */}
        <div>
          <button
            onClick={() => setModelsOpen(!modelsOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>ATSA Algorithms</span>
            </div>
            {modelsOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {modelsOpen && (
            <div className="mt-1 space-y-0.5 border-l border-slate-800/80 ml-4 pl-1">
              <NavLink to="/models/naive" className={subNavItemClass}>
                <span>Naive Benchmark</span>
              </NavLink>
              <NavLink to="/models/linear_trend" className={subNavItemClass}>
                <span>Linear Trend Regression</span>
              </NavLink>
              <NavLink to="/models/ses" className={subNavItemClass}>
                <span>Simple Exp Smoothing (SES)</span>
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
                <span>SARIMA Multiplicative</span>
              </NavLink>
            </div>
          )}
        </div>

        <div className="pt-4 px-3 pb-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          Insights
        </div>

        <NavLink to="/model-comparison" className={navItemClass}>
          <GitCompare className="w-4 h-4 text-fuchsia-400" />
          <span>Comparison Lab</span>
        </NavLink>
        <NavLink to="/forecast" className={navItemClass}>
          <Compass className="w-4 h-4 text-sky-400" />
          <span>Forecast Horizon</span>
        </NavLink>
        <NavLink to="/reports" className={navItemClass}>
          <FileText className="w-4 h-4 text-rose-400" />
          <span>Documentation Hub</span>
        </NavLink>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Python Engine
          </span>
          <span className="font-mono text-cyan-400 text-[10px] bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/30">
            FastAPI 3.12
          </span>
        </div>
      </div>
    </aside>
  );
};
