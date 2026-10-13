import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ChartThemeTokens {
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tooltipSubtext: string;
  tooltipShadow: string;
  actual: string;
  forecast: string;
  fitted: string;
  rolling: string;
  trend: string;
  confidenceFill: string;
  confidenceStroke: string;
  zeroLine: string;
}

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  chartTheme: ChartThemeTokens;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('chronos_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    // Default to system preference or dark
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem('chronos_theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
  };

  const isDark = theme === 'dark';

  const chartTheme: ChartThemeTokens = useMemo(() => {
    if (isDark) {
      return {
        grid: 'rgba(255, 255, 255, 0.07)',
        axis: '#64748b',
        tooltipBg: 'rgba(15, 23, 42, 0.96)',
        tooltipBorder: 'rgba(255, 255, 255, 0.12)',
        tooltipText: '#f8fafc',
        tooltipSubtext: '#94a3b8',
        tooltipShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
        actual: '#3b82f6',
        forecast: '#06b6d4',
        fitted: '#10b981',
        rolling: '#f59e0b',
        trend: '#10b981',
        confidenceFill: 'rgba(6, 182, 212, 0.16)',
        confidenceStroke: '#06b6d4',
        zeroLine: '#475569'
      };
    } else {
      return {
        grid: 'rgba(0, 0, 0, 0.06)',
        axis: '#94a3b8',
        tooltipBg: '#ffffff',
        tooltipBorder: '#e2e8f0',
        tooltipText: '#0f172a',
        tooltipSubtext: '#64748b',
        tooltipShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        actual: '#2563eb',
        forecast: '#0891b2',
        fitted: '#059669',
        rolling: '#d97706',
        trend: '#059669',
        confidenceFill: 'rgba(8, 145, 178, 0.14)',
        confidenceStroke: '#0891b2',
        zeroLine: '#cbd5e1'
      };
    }
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme, chartTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
