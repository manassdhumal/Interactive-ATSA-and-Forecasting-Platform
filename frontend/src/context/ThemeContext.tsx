import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

export type ThemeMode = 'dark' | 'midnight' | 'aurora' | 'sunset' | 'light';

export interface ThemeOption {
  id: ThemeMode;
  label: string;
  description: string;
  isDark: boolean;
  actualColor: string;
  forecastColor: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    label: 'Chronos Dark',
    description: 'Sapphire actuals with crimson forecast trajectory',
    isDark: true,
    actualColor: '#3b82f6',
    forecastColor: '#f43f5e'
  },
  {
    id: 'midnight',
    label: 'Midnight Quant',
    description: 'Indigo series with electric cyan forecast cone',
    isDark: true,
    actualColor: '#818cf8',
    forecastColor: '#22d3ee'
  },
  {
    id: 'aurora',
    label: 'Aurora Borealis',
    description: 'Emerald actuals with neon violet projections',
    isDark: true,
    actualColor: '#10b981',
    forecastColor: '#c084fc'
  },
  {
    id: 'sunset',
    label: 'Solar Horizon',
    description: 'Amber observations with coral-rose horizon',
    isDark: true,
    actualColor: '#f59e0b',
    forecastColor: '#fb7185'
  },
  {
    id: 'light',
    label: 'Daylight Clean',
    description: 'High-contrast editorial light theme',
    isDark: false,
    actualColor: '#2563eb',
    forecastColor: '#e11d48'
  }
];

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
  brushStroke: string;
  brushFill: string;
}

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  chartTheme: ChartThemeTokens;
  themeOptions: ThemeOption[];
}

const VALID_THEMES: ThemeMode[] = ['dark', 'midnight', 'aurora', 'sunset', 'light'];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('chronos_theme') as ThemeMode | null;
    if (saved && VALID_THEMES.includes(saved)) return saved;
    // Default to system preference or dark
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  });

  const isDark = theme !== 'light';

  useEffect(() => {
    localStorage.setItem('chronos_theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    root.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
  };

  const chartTheme: ChartThemeTokens = useMemo(() => {
    switch (theme) {
      case 'midnight':
        return {
          grid: 'rgba(129, 140, 248, 0.08)',
          axis: '#64748b',
          tooltipBg: 'rgba(10, 14, 28, 0.96)',
          tooltipBorder: 'rgba(129, 140, 248, 0.22)',
          tooltipText: '#f8fafc',
          tooltipSubtext: '#94a3b8',
          tooltipShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)',
          actual: '#818cf8',
          forecast: '#22d3ee',
          fitted: '#34d399',
          rolling: '#f59e0b',
          trend: '#34d399',
          confidenceFill: 'rgba(34, 211, 238, 0.18)',
          confidenceStroke: '#22d3ee',
          zeroLine: '#475569',
          brushStroke: '#818cf8',
          brushFill: '#0a0e1c'
        };
      case 'aurora':
        return {
          grid: 'rgba(16, 185, 129, 0.08)',
          axis: '#64748b',
          tooltipBg: 'rgba(9, 20, 22, 0.96)',
          tooltipBorder: 'rgba(16, 185, 129, 0.22)',
          tooltipText: '#f0fdf4',
          tooltipSubtext: '#94a3b8',
          tooltipShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)',
          actual: '#10b981',
          forecast: '#c084fc',
          fitted: '#38bdf8',
          rolling: '#facc15',
          trend: '#38bdf8',
          confidenceFill: 'rgba(192, 132, 252, 0.18)',
          confidenceStroke: '#c084fc',
          zeroLine: '#475569',
          brushStroke: '#10b981',
          brushFill: '#091416'
        };
      case 'sunset':
        return {
          grid: 'rgba(251, 113, 133, 0.08)',
          axis: '#78716c',
          tooltipBg: 'rgba(24, 13, 20, 0.96)',
          tooltipBorder: 'rgba(251, 113, 133, 0.22)',
          tooltipText: '#fff1f2',
          tooltipSubtext: '#a8a29e',
          tooltipShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)',
          actual: '#f59e0b',
          forecast: '#fb7185',
          fitted: '#2dd4bf',
          rolling: '#a78bfa',
          trend: '#2dd4bf',
          confidenceFill: 'rgba(251, 113, 133, 0.18)',
          confidenceStroke: '#fb7185',
          zeroLine: '#57534e',
          brushStroke: '#f59e0b',
          brushFill: '#180d14'
        };
      case 'light':
        return {
          grid: 'rgba(0, 0, 0, 0.06)',
          axis: '#94a3b8',
          tooltipBg: '#ffffff',
          tooltipBorder: '#e2e8f0',
          tooltipText: '#0f172a',
          tooltipSubtext: '#64748b',
          tooltipShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          actual: '#2563eb',
          forecast: '#e11d48',
          fitted: '#059669',
          rolling: '#d97706',
          trend: '#059669',
          confidenceFill: 'rgba(225, 29, 72, 0.14)',
          confidenceStroke: '#e11d48',
          zeroLine: '#cbd5e1',
          brushStroke: '#2563eb',
          brushFill: '#f1f5f9'
        };
      case 'dark':
      default:
        return {
          grid: 'rgba(255, 255, 255, 0.07)',
          axis: '#64748b',
          tooltipBg: 'rgba(15, 23, 42, 0.96)',
          tooltipBorder: 'rgba(255, 255, 255, 0.12)',
          tooltipText: '#f8fafc',
          tooltipSubtext: '#94a3b8',
          tooltipShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
          actual: '#3b82f6',
          forecast: '#f43f5e',
          fitted: '#10b981',
          rolling: '#f59e0b',
          trend: '#10b981',
          confidenceFill: 'rgba(244, 63, 94, 0.16)',
          confidenceStroke: '#f43f5e',
          zeroLine: '#475569',
          brushStroke: '#3b82f6',
          brushFill: '#0f172a'
        };
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme, chartTheme, themeOptions: THEME_OPTIONS }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
