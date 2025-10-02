import React from 'react';
import { Navigation } from './Navigation';
import { ThemeToggle } from './ThemeToggle';
import UserMenu from '@/components/UserMenu';
import AppLogo from '@/components/AppLogo';
import { useRecordingPanel } from '@/contexts/RecordingPanelContext';
import { useAuth } from '@/contexts/AuthContext';

export const Header: React.FC<{
  isRecording: boolean;
}> = ({ isRecording }) => {
  const { toggleFloatingPanel, showFloatingPanel } = useRecordingPanel();
  const { user } = useAuth();
  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <AppLogo />
            <Navigation />
          </div>
          <div className="flex items-center space-x-2">
            {user && (
              <button
                onClick={toggleFloatingPanel}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-200 hover:shadow-sm"
              >
                <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-destructive animate-recording-pulse' : 'bg-muted-foreground'}`}></div>
                {showFloatingPanel ? '隐藏' : '显示'}录音面板
              </button>
            )}
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
};
