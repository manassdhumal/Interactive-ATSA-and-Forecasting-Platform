import React, { useState } from 'react';
import { Info, HelpCircle, ChevronDown, ChevronUp, Sparkles, CheckCircle2 } from 'lucide-react';

export interface ExplanationItem {
  badge?: string;
  badgeColor?: 'blue' | 'amber' | 'emerald' | 'rose' | 'purple' | 'cyan' | 'slate';
  label?: string;
  text: string;
}

export interface ChartExplanationProps {
  title?: string;
  summary: string;
  items?: ExplanationItem[];
  takeaway?: string;
  formula?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

const badgeColorMap: Record<string, string> = {
  blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  slate: 'bg-slate-700/30 text-slate-300 border-slate-600/30',
};

export const ChartExplanation: React.FC<ChartExplanationProps> = ({
  title = "How to Read & Interpret This Graph",
  summary,
  items,
  takeaway,
  formula,
  collapsible = false,
  defaultExpanded = true,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      className={`mt-4 rounded-xl border border-white/8 bg-slate-900/40 backdrop-blur-md p-4 text-xs transition-all duration-200 ${className}`}
    >
      <div
        className={`flex items-center justify-between ${
          collapsible ? 'cursor-pointer select-none' : ''
        }`}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Info className="h-3 w-3" />
          </div>
          <h4 className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
            {title}
            <span className="text-[10px] font-normal text-slate-400">
              (Visual Guide)
            </span>
          </h4>
        </div>

        {collapsible && (
          <button
            type="button"
            className="text-slate-400 hover:text-white transition p-1"
            aria-label="Toggle explanation"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {(!collapsible || isExpanded) && (
        <div className="mt-2.5 space-y-2.5 text-slate-300 text-[11px] leading-relaxed">
          <p className="text-slate-300 font-normal">
            {summary}
          </p>

          {formula && (
            <div className="rounded-lg bg-black/40 border border-white/5 px-3 py-1.5 font-mono text-[11px] text-cyan-300 overflow-x-auto">
              <span className="text-slate-500 select-none mr-2 font-sans text-[10px] uppercase tracking-wider">Formula:</span>
              {formula}
            </div>
          )}

          {items && items.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
              {items.map((item, idx) => {
                const colorClass = item.badgeColor
                  ? badgeColorMap[item.badgeColor] || badgeColorMap.slate
                  : badgeColorMap.slate;

                return (
                  <div
                    key={idx}
                    className="flex items-start gap-2 bg-slate-950/40 p-2 rounded-lg border border-white/5"
                  >
                    {item.badge ? (
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border whitespace-nowrap shrink-0 mt-0.5 ${colorClass}`}
                      >
                        {item.badge}
                      </span>
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                    )}
                    <div>
                      {item.label && (
                        <span className="font-semibold text-slate-200 mr-1">
                          {item.label}:
                        </span>
                      )}
                      <span className="text-slate-300">{item.text}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {takeaway && (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-emerald-950/25 border border-emerald-500/20 p-2.5 text-[11px] text-emerald-200">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-emerald-300 mr-1">Key Takeaway:</span>
                <span>{takeaway}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
