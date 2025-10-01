import React, { createContext, useContext, useState, ReactNode } from 'react';

interface RecordingPanelContextType {
  showFloatingPanel: boolean;
  isPanelMinimized: boolean;
  isFullscreen: boolean;
  toggleFloatingPanel: () => void;
  minimizePanel: () => void;
  maximizePanel: () => void;
  closePanel: () => void;
  toggleFullscreen: () => void;
  exitFullscreen: () => void;
  enterFullscreen: () => void;
}

const RecordingPanelContext = createContext<RecordingPanelContextType | undefined>(undefined);

export function RecordingPanelProvider({ children }: { children: ReactNode }) {
  const [showFloatingPanel, setShowFloatingPanel] = useState(false);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFloatingPanel = () => {
    setShowFloatingPanel(!showFloatingPanel);
  };

  const minimizePanel = () => {
    setIsPanelMinimized(true);
  };

  const maximizePanel = () => {
    setIsPanelMinimized(false);
  };

  const closePanel = () => {
    setShowFloatingPanel(false);
    setIsPanelMinimized(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const exitFullscreen = () => {
    setIsFullscreen(false);
  };

  const enterFullscreen = () => {
    setIsFullscreen(true);
  };

  return (
    <RecordingPanelContext.Provider value={{
      showFloatingPanel,
      isPanelMinimized,
      isFullscreen,
      toggleFloatingPanel,
      minimizePanel,
      maximizePanel,
      closePanel,
      toggleFullscreen,
      exitFullscreen,
      enterFullscreen
    }}>
      {children}
    </RecordingPanelContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRecordingPanel() {
  const context = useContext(RecordingPanelContext);
  if (!context) {
    throw new Error('useRecordingPanel must be used within a RecordingPanelProvider');
  }
  return context;
}