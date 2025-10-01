import React from 'react';
import { Navigation } from './Navigation';
import { ThemeToggle } from './ThemeToggle';
import UserMenu from '@/components/UserMenu';
import { useRecordingPanel } from '@/contexts/RecordingPanelContext';
import { useAuth } from '@/contexts/AuthContext';

export const Header: React.FC<{
  isRecording: boolean;
}> = ({ isRecording }) => {
  const { toggleFloatingPanel, showFloatingPanel } = useRecordingPanel();
  const { user } = useAuth();
  return (
    <header className="bg-background border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src="/logo-rectangle.png"
                  alt="Summit AI"
                  className="h-8 w-auto"
                />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-background"></div>
              </div>
              <h1 className="text-2xl gradient-text" style={{ fontFamily: 'Impact, "Arial Narrow", "Helvetica Neue Condensed"' }}>Summit AI</h1>
            </div>
            <Navigation />
          </div>
          <div className="flex items-center space-x-2">
            {user && (
              <button
                onClick={toggleFloatingPanel}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-200 hover:shadow-sm"
              >
                <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-600 animate-recording-pulse' : 'bg-muted-foreground'}`}></div>
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
