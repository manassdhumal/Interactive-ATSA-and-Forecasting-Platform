import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp, Sparkles, BookOpen } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

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

export const ChartExplanation: React.FC<ChartExplanationProps> = ({
  title = "How to Read & Interpret This Graph",
  summary,
  items,
  takeaway,
  formula,
  collapsible = true,
  defaultExpanded = true,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { isDark } = useTheme();

  const getBadgeClass = (color?: string) => {
    switch (color) {
      case 'blue':
        return isDark
          ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
          : 'bg-blue-50 text-blue-700 border-blue-200';
      case 'amber':
        return isDark
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          : 'bg-amber-50 text-amber-800 border-amber-200';
      case 'emerald':
        return isDark
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'rose':
        return isDark
          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          : 'bg-rose-50 text-rose-700 border-rose-200';
      case 'purple':
        return isDark
          ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
          : 'bg-purple-50 text-purple-700 border-purple-200';
      case 'cyan':
        return isDark
          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
          : 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return isDark
          ? 'bg-slate-800 text-slate-300 border-slate-700'
          : 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div
      className={`mt-4 rounded-xl border transition-all duration-200 ${
        isDark
          ? 'bg-slate-900/50 border-slate-800/80 text-slate-300'
          : 'bg-slate-50/80 border-slate-200 text-slate-700'
      } ${className}`}
    >
      <div
        className={`px-4 py-3 flex items-center justify-between ${
          collapsible ? 'cursor-pointer select-none' : ''
        }`}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-lg border ${
              isDark
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25'
                : 'bg-blue-50 text-blue-600 border-blue-200'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4
              className={`font-semibold text-xs flex items-center gap-2 ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              {title}
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                }`}
              >
                Guide
              </span>
            </h4>
          </div>
        </div>

        {collapsible && (
          <button
            type="button"
            className={`p-1 rounded-md transition ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
            aria-label="Toggle explanation"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {(!collapsible || isExpanded) && (
        <div className={`px-4 pb-4 pt-1 space-y-3 text-[11px] leading-relaxed border-t ${
          isDark ? 'border-slate-800/60' : 'border-slate-200/60'
        }`}>
          <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>
            {summary}
          </p>

          {formula && (
            <div
              className={`rounded-lg border px-3 py-2 font-mono text-[11px] overflow-x-auto flex items-center gap-2 ${
                isDark
                  ? 'bg-slate-950/60 border-slate-800 text-cyan-300'
                  : 'bg-white border-slate-200 text-blue-700'
              }`}
            >
              <span className={`font-sans text-[10px] uppercase font-semibold tracking-wider select-none shrink-0 ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Formula:
              </span>
              <span>{formula}</span>
            </div>
          )}

          {items && items.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-0.5">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition ${
                    isDark
                      ? 'bg-slate-950/40 border-slate-800/80'
                      : 'bg-white border-slate-200/80 shadow-xs'
                  }`}
                >
                  {item.badge ? (
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border whitespace-nowrap shrink-0 mt-0.5 ${getBadgeClass(
                        item.badgeColor
                      )}`}
                    >
                      {item.badge}
                    </span>
                  ) : (
                    <span
                      className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${
                        isDark ? 'bg-cyan-400' : 'bg-blue-500'
                      }`}
                    />
                  )}
                  <div>
                    {item.label && (
                      <span
                        className={`font-semibold mr-1 ${
                          isDark ? 'text-slate-200' : 'text-slate-800'
                        }`}
                      >
                        {item.label}:
                      </span>
                    )}
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                      {item.text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {takeaway && (
            <div
              className={`flex items-start gap-2 rounded-lg border p-2.5 text-[11px] ${
                isDark
                  ? 'bg-emerald-950/20 border-emerald-500/25 text-emerald-200'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <Sparkles
                className={`h-4 w-4 mt-0.5 shrink-0 ${
                  isDark ? 'text-emerald-400' : 'text-emerald-600'
                }`}
              />
              <div>
                <span
                  className={`font-semibold mr-1 ${
                    isDark ? 'text-emerald-300' : 'text-emerald-800'
                  }`}
                >
                  Key Takeaway:
                </span>
                <span>{takeaway}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
