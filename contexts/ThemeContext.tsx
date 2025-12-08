import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 主题类型定义
export type ThemeName = 'default' | 'christmas' | 'cyberpunk' | 'ocean';

export interface ThemeColors {
  // 主色调
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // 强调色
  accent: string;
  accentLight: string;
  
  // 背景色
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgPanel: string;
  
  // 文字颜色
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  // 边框颜色
  border: string;
  borderLight: string;
  
  // 渐变
  gradientStart: string;
  gradientMiddle: string;
  gradientEnd: string;
  
  // 特殊效果
  glow: string;
  shadow: string;
}

export interface ThemeDecorations {
  // 装饰性元素
  snowflakes?: boolean;
  particles?: boolean;
  sparkles?: boolean;
  
  // 背景效果
  backgroundPattern?: string;
  backgroundAnimation?: string;
  
  // 图标/装饰物
  decorations?: string[];
}

export interface Theme {
  name: ThemeName;
  displayName: string;
  icon: string;
  colors: ThemeColors;
  decorations: ThemeDecorations;
}

// 默认主题
const defaultTheme: Theme = {
  name: 'default',
  displayName: '默认',
  icon: '🎨',
  colors: {
    primary: '#6366f1',
    primaryLight: '#818cf8',
    primaryDark: '#4f46e5',
    accent: '#14b8a6',
    accentLight: '#2dd4bf',
    bgPrimary: '#030712',
    bgSecondary: '#111827',
    bgTertiary: '#1f2937',
    bgPanel: 'rgba(0, 0, 0, 0.4)',
    textPrimary: '#f9fafb',
    textSecondary: '#d1d5db',
    textMuted: '#6b7280',
    border: 'rgba(255, 255, 255, 0.1)',
    borderLight: 'rgba(255, 255, 255, 0.05)',
    gradientStart: '#6366f1',
    gradientMiddle: '#8b5cf6',
    gradientEnd: '#a855f7',
    glow: 'rgba(99, 102, 241, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.5)',
  },
  decorations: {
    snowflakes: false,
    particles: false,
    sparkles: false,
  }
};

// 圣诞主题 🎄
const christmasTheme: Theme = {
  name: 'christmas',
  displayName: '圣诞节',
  icon: '🎄',
  colors: {
    primary: '#dc2626', // 红色
    primaryLight: '#ef4444',
    primaryDark: '#b91c1c',
    accent: '#16a34a', // 绿色
    accentLight: '#22c55e',
    bgPrimary: '#0f172a', // 深蓝夜空
    bgSecondary: '#1e293b',
    bgTertiary: '#334155',
    bgPanel: 'rgba(15, 23, 42, 0.6)',
    textPrimary: '#f8fafc',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: 'rgba(255, 255, 255, 0.15)',
    borderLight: 'rgba(255, 255, 255, 0.08)',
    gradientStart: '#dc2626',
    gradientMiddle: '#16a34a',
    gradientEnd: '#eab308',
    glow: 'rgba(220, 38, 38, 0.4)',
    shadow: 'rgba(0, 0, 0, 0.6)',
  },
  decorations: {
    snowflakes: true,
    particles: true,
    sparkles: true,
    decorations: ['🎄', '⭐', '🎁', '❄️', '🔔', '🎅'],
  }
};

// 赛博朋克主题
const cyberpunkTheme: Theme = {
  name: 'cyberpunk',
  displayName: '赛博朋克',
  icon: '🌃',
  colors: {
    primary: '#f0abfc', // 粉紫
    primaryLight: '#f5d0fe',
    primaryDark: '#e879f9',
    accent: '#22d3ee', // 青色
    accentLight: '#67e8f9',
    bgPrimary: '#0c0a1d',
    bgSecondary: '#1a1631',
    bgTertiary: '#2d2555',
    bgPanel: 'rgba(12, 10, 29, 0.7)',
    textPrimary: '#fdf4ff',
    textSecondary: '#e9d5ff',
    textMuted: '#a78bfa',
    border: 'rgba(240, 171, 252, 0.2)',
    borderLight: 'rgba(240, 171, 252, 0.1)',
    gradientStart: '#f0abfc',
    gradientMiddle: '#22d3ee',
    gradientEnd: '#fcd34d',
    glow: 'rgba(240, 171, 252, 0.6)',
    shadow: 'rgba(0, 0, 0, 0.7)',
  },
  decorations: {
    snowflakes: false,
    particles: true,
    sparkles: true,
    backgroundPattern: 'grid',
  }
};

// 海洋主题
const oceanTheme: Theme = {
  name: 'ocean',
  displayName: '深海',
  icon: '🌊',
  colors: {
    primary: '#0ea5e9',
    primaryLight: '#38bdf8',
    primaryDark: '#0284c7',
    accent: '#06b6d4',
    accentLight: '#22d3ee',
    bgPrimary: '#0c1929',
    bgSecondary: '#0f2942',
    bgTertiary: '#164e63',
    bgPanel: 'rgba(12, 25, 41, 0.6)',
    textPrimary: '#f0f9ff',
    textSecondary: '#bae6fd',
    textMuted: '#7dd3fc',
    border: 'rgba(14, 165, 233, 0.2)',
    borderLight: 'rgba(14, 165, 233, 0.1)',
    gradientStart: '#0ea5e9',
    gradientMiddle: '#06b6d4',
    gradientEnd: '#14b8a6',
    glow: 'rgba(14, 165, 233, 0.5)',
    shadow: 'rgba(0, 20, 40, 0.6)',
  },
  decorations: {
    snowflakes: false,
    particles: true,
    sparkles: false,
    backgroundAnimation: 'waves',
  }
};

// 所有可用主题
export const themes: Record<ThemeName, Theme> = {
  default: defaultTheme,
  christmas: christmasTheme,
  cyberpunk: cyberpunkTheme,
  ocean: oceanTheme,
};

// Context
interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
  allThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Provider
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('app_theme');
    // 检查是否是12月，如果是默认使用圣诞主题
    const now = new Date();
    if (!saved && now.getMonth() === 11) { // 11 = December
      return 'christmas';
    }
    return (saved as ThemeName) || 'default';
  });

  const theme = themes[themeName];

  const setTheme = (name: ThemeName) => {
    setThemeName(name);
    localStorage.setItem('app_theme', name);
  };

  // 应用CSS变量
  useEffect(() => {
    const root = document.documentElement;
    const colors = theme.colors;
    
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-primary-light', colors.primaryLight);
    root.style.setProperty('--color-primary-dark', colors.primaryDark);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-accent-light', colors.accentLight);
    root.style.setProperty('--color-bg-primary', colors.bgPrimary);
    root.style.setProperty('--color-bg-secondary', colors.bgSecondary);
    root.style.setProperty('--color-bg-tertiary', colors.bgTertiary);
    root.style.setProperty('--color-bg-panel', colors.bgPanel);
    root.style.setProperty('--color-text-primary', colors.textPrimary);
    root.style.setProperty('--color-text-secondary', colors.textSecondary);
    root.style.setProperty('--color-text-muted', colors.textMuted);
    root.style.setProperty('--color-border', colors.border);
    root.style.setProperty('--color-border-light', colors.borderLight);
    root.style.setProperty('--color-gradient-start', colors.gradientStart);
    root.style.setProperty('--color-gradient-middle', colors.gradientMiddle);
    root.style.setProperty('--color-gradient-end', colors.gradientEnd);
    root.style.setProperty('--color-glow', colors.glow);
    root.style.setProperty('--color-shadow', colors.shadow);
    
    // 设置主题类名
    root.className = `theme-${themeName}`;
  }, [theme, themeName]);

  const value: ThemeContextValue = {
    theme,
    themeName,
    setTheme,
    allThemes: Object.values(themes),
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// 雪花装饰组件
export const SnowfallEffect: React.FC = () => {
  const { theme } = useTheme();
  
  if (!theme.decorations.snowflakes) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="snowflake absolute text-white opacity-80"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${8 + Math.random() * 10}s`,
            fontSize: `${8 + Math.random() * 12}px`,
          }}
        >
          ❄
        </div>
      ))}
      <style>{`
        @keyframes snowfall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .snowflake {
          animation: snowfall linear infinite;
        }
      `}</style>
    </div>
  );
};

// 主题选择器组件
export const ThemeSelector: React.FC<{ className?: string }> = ({ className }) => {
  const { themeName, setTheme, allThemes } = useTheme();
  
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      {allThemes.map((t) => (
        <button
          key={t.name}
          onClick={() => setTheme(t.name)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
            themeName === t.name
              ? 'bg-white/20 ring-2 ring-white/40 scale-110'
              : 'bg-white/5 hover:bg-white/10 hover:scale-105'
          }`}
          title={t.displayName}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
};
