import { useState, useEffect } from 'react';

interface ThemeClasses {
  background: string;
  header: string;
  sidebar: string;
  card: string;
  cardInner: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
    accent: string;
  };
  transcriptArea: string;
  statusBar: string;
}

export const useMeetingTheme = (initialDarkMode?: boolean) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (initialDarkMode !== undefined) {
      return initialDarkMode;
    }
    const saved = localStorage.getItem('meetingDisplay-theme');
    return saved ? saved === 'dark' : true; // default to dark
  });

  useEffect(() => {
    localStorage.setItem('meetingDisplay-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const themeClasses: ThemeClasses = {
    background: isDarkMode 
      ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' 
      : 'bg-gradient-to-br from-gray-50 via-white to-gray-100',
    header: isDarkMode 
      ? 'bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700/50' 
      : 'bg-gradient-to-r from-white to-gray-50 border-gray-200',
    sidebar: isDarkMode 
      ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-slate-700/50' 
      : 'bg-gradient-to-b from-gray-50 to-white border-gray-200',
    card: isDarkMode 
      ? 'bg-slate-800/50 border-slate-700/50' 
      : 'bg-white/80 border-gray-200',
    cardInner: isDarkMode 
      ? 'bg-slate-900/50 border-slate-700/30' 
      : 'bg-gray-50/50 border-gray-200/50',
    text: {
      primary: isDarkMode ? 'text-white' : 'text-gray-900',
      secondary: isDarkMode ? 'text-slate-300' : 'text-gray-600',
      muted: isDarkMode ? 'text-slate-400' : 'text-gray-500',
      accent: isDarkMode ? 'text-blue-400' : 'text-blue-600'
    },
    transcriptArea: isDarkMode 
      ? 'bg-gradient-to-b from-slate-900/50 to-slate-950/50' 
      : 'bg-gradient-to-b from-gray-50/50 to-white/50',
    statusBar: isDarkMode 
      ? 'bg-slate-900/80 border-slate-700/50' 
      : 'bg-white/60 border-gray-200'
  };

  return {
    isDarkMode,
    setIsDarkMode,
    themeClasses,
    toggleTheme
  };
};
