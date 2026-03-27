import { useState, useEffect, createContext, useContext } from 'react';

export type ColorTheme = 'blue' | 'teal' | 'purple' | 'rose' | 'orange' | 'emerald';

interface ThemeContextType {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const COLOR_THEMES: { id: ColorTheme; name: string; hue: number }[] = [
  { id: 'blue', name: 'Azul', hue: 217 },
  { id: 'teal', name: 'Teal', hue: 173 },
  { id: 'purple', name: 'Púrpura', hue: 262 },
  { id: 'rose', name: 'Rosa', hue: 350 },
  { id: 'orange', name: 'Naranja', hue: 25 },
  { id: 'emerald', name: 'Esmeralda', hue: 160 },
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('color-theme') as ColorTheme) || 'blue';
    }
    return 'blue';
  });

  const [isDark, setIsDarkState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dark-mode') === 'true';
    }
    return false;
  });

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme);
    localStorage.setItem('color-theme', theme);
  };

  const setIsDark = (dark: boolean) => {
    setIsDarkState(dark);
    localStorage.setItem('dark-mode', String(dark));
  };

  const toggleDark = () => setIsDark(!isDark);

  useEffect(() => {
    const root = document.documentElement;
    
    // Apply dark mode
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Apply color theme
    root.setAttribute('data-theme', colorTheme);
  }, [colorTheme, isDark]);

  return (
    <ThemeContext.Provider value={{ colorTheme, setColorTheme, isDark, setIsDark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
