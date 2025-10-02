import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeColors {
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  updateColors: (colors: Partial<ThemeColors>) => void;
  resetColors: () => void;
}

const defaultColors: ThemeColors = {
  primary: '200 35% 41%',
  primaryForeground: '210 40% 98%',
  accent: '208 50% 50%',
  accentForeground: '0 0% 98%',
};

const ColorThemeContext = createContext<ThemeContextType | undefined>(undefined);

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslToHex(hsl: string): string {
  const matches = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!matches) return '#000000';

  const [_, h, s, l] = matches.map(Number);
  const hDecimal = l / 100;
  const a = (s * Math.min(hDecimal, 1 - hDecimal)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = hDecimal - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };

  return `#${f(0)}${f(8)}${f(4)}`;
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colors, setColors] = useState<ThemeColors>(defaultColors);

  useEffect(() => {
    const savedColors = localStorage.getItem('theme-colors');
    if (savedColors) {
      try {
        const parsed = JSON.parse(savedColors);
        setColors({ ...defaultColors, ...parsed });
      } catch (error) {
        console.error('Failed to parse saved theme colors:', error);
      }
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    // Set CSS variables for light theme
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-foreground', colors.primaryForeground);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--accent-foreground', colors.accentForeground);

    // Set CSS variables for dark theme
    root.style.setProperty('--chart-1', colors.primary);
    root.style.setProperty('--ring', colors.primary);

    localStorage.setItem('theme-colors', JSON.stringify(colors));
  }, [colors]);

  function updateColors(newColors: Partial<ThemeColors>) {
    setColors(prev => ({ ...prev, ...newColors }));
  }

  function resetColors() {
    setColors(defaultColors);
  }

  return (
    <ColorThemeContext.Provider value={{ colors, updateColors, resetColors }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

function useColorTheme() {
  const context = useContext(ColorThemeContext);
  if (context === undefined) {
    throw new Error('useColorTheme must be used within a ColorThemeProvider');
  }
  return context;
}

export { ThemeProvider as ColorThemeProvider, useColorTheme, hexToHsl, hslToHex };
export type { ThemeColors, ThemeContextType };