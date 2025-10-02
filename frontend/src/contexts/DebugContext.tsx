import React, { createContext, useContext, useEffect, useState } from 'react';

interface DebugContextType {
  debugMode: boolean;
  toggleDebugMode: () => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

function DebugProvider({ children }: { children: React.ReactNode }) {
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    const savedDebugMode = localStorage.getItem('debug-mode');
    if (savedDebugMode) {
      setDebugMode(savedDebugMode === 'true');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('debug-mode', debugMode.toString());
  }, [debugMode]);

  function toggleDebugMode() {
    setDebugMode(prev => !prev);
  }

  return (
    <DebugContext.Provider value={{ debugMode, toggleDebugMode }}>
      {children}
    </DebugContext.Provider>
  );
}

function useDebug() {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}

export { DebugProvider, useDebug };
export type { DebugContextType };