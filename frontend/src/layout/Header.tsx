import React from 'react';
import { Navigation } from './Navigation';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onToggleRecordingPanel: () => void;
  isRecording: boolean;
  showRecordingPanel: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleRecordingPanel,
  isRecording,
  showRecordingPanel
}) => {
  return (
    <header className="bg-background border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                  <path d="M12 4c-4.41 0-8 3.59-8 8s3.59 8 8 8 8-3.59 8-8-3.59-8-8-8zm-2 13l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" opacity="0.3"/>
                  <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.6"/>
                </svg>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-background"></div>
              </div>
              <h1 className="text-2xl font-bold gradient-text">Summit AI</h1>
            </div>
            <Navigation />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleRecordingPanel}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-200 hover:shadow-sm"
            >
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-muted-foreground'}`}></div>
              {showRecordingPanel ? '隐藏' : '显示'}录音面板
            </button>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};