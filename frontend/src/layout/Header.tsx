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
                <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L18 10L22 14H16L12 8L8 14H2L6 10L12 2Z" fill="currentColor" opacity="0.8"/>
                  <path d="M12 2L16 8L20 12H14L12 6L10 12H4L8 8L12 2Z" fill="currentColor" opacity="0.6"/>
                  <path d="M12 2L14 6L16 8H12L12 4L10 8H8L10 6L12 2Z" fill="currentColor"/>
                  <circle cx="12" cy="3" r="1" fill="currentColor" opacity="0.9"/>
                </svg>
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
