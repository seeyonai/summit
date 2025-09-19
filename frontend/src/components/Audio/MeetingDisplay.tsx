import React, { useState, useEffect } from 'react';
import MeetingHeader from './MeetingHeader';
import LeftPanel from './LeftPanel/LeftPanel';
import TranscriptArea from './TranscriptArea/TranscriptArea';
import StatusBar from './StatusBar';
import MinimalModeToggle from './MinimalModeToggle';
import AiActionsDialog from './AiActionsDialog';
import SettingsDialog from './SettingsDialog';
import { useMeetingTheme } from './useMeetingTheme';

interface MeetingDisplayProps {
  isVisible: boolean;
  isRecording: boolean;
  partialText: string;
  finalText: string;
  recordingTime: number;
  isConnected: boolean;
  onStopRecording: () => void;
  onExitFullscreen: () => void;
  initialTitle: string;
  initialAgenda: string;
}

const MeetingDisplay: React.FC<MeetingDisplayProps> = ({
  isVisible,
  isRecording,
  partialText,
  finalText,
  recordingTime,
  isConnected,
  onStopRecording,
  onExitFullscreen,
  initialTitle,
  initialAgenda
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showAgenda, setShowAgenda] = useState(true);
  const [showTranscript, setShowTranscript] = useState(true);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMinimalMode, setIsMinimalMode] = useState(false);
  
  const { isDarkMode, setIsDarkMode, themeClasses, toggleTheme } = useMeetingTheme();

  useEffect(() => {
    if (isRecording && !isPaused) {
      const interval = setInterval(() => {
        setPulseAnimation(prev => !prev);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isRecording, isPaused]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAIAction = (option: string) => {
    setSelectedOption(option);
    setIsDialogOpen(false);
    // TODO: Implement actual AI functionality for each option
    console.log(`AI action selected: ${option}`);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 10, 50));
  };

  const resetZoom = () => {
    setZoomLevel(100);
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-50 ${themeClasses.background}`}>
      <div className="h-full flex flex-col">
        {/* Enhanced Header */}
        {!isMinimalMode && (
          <MeetingHeader
            isRecording={isRecording}
            isPaused={isPaused}
            recordingTime={recordingTime}
            isConnected={isConnected}
            zoomLevel={zoomLevel}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={resetZoom}
            onEnterMinimal={() => setIsMinimalMode(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onExitFullscreen={onExitFullscreen}
            title={initialTitle}
            darkModeTextClasses={themeClasses.text.primary}
            themeClasses={themeClasses}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Enhanced Left Panel */}
          {!isMinimalMode && (
            <LeftPanel
              title={initialTitle}
              agenda={initialAgenda}
              showAgenda={showAgenda}
              isDarkMode={isDarkMode}
              onPauseToggle={() => setIsPaused(!isPaused)}
              isPaused={isPaused}
              isRecording={isRecording}
              onStopRecording={onStopRecording}
              onOpenAIDialog={() => setIsDialogOpen(true)}
              themeClasses={themeClasses}
            />
          )}

          {/* Enhanced Right Panel - Transcription */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <TranscriptArea
              showTranscript={showTranscript}
              showGroupChat={showGroupChat}
              partialText={partialText}
              finalText={finalText}
              themeClasses={themeClasses}
              zoomLevel={zoomLevel}
              pulseAnimation={pulseAnimation}
            />

            {/* Enhanced Status bar */}
            {!isMinimalMode && (
              <StatusBar
                isConnected={isConnected}
                themeClasses={themeClasses}
              />
            )}
          </div>
        </div>
        
        {/* Floating Minimal Mode Toggle */}
        {isMinimalMode && (
          <MinimalModeToggle
            isDarkMode={isDarkMode}
            onExitMinimal={() => setIsMinimalMode(false)}
            themeClasses={themeClasses}
          />
        )}
        
        {/* Enhanced AI Dialog */}
        <AiActionsDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onActionSelect={handleAIAction}
          themeClasses={themeClasses}
        />
        
        {/* Settings Dialog */}
        <SettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          showAgenda={showAgenda}
          onToggleAgenda={setShowAgenda}
          showTranscript={showTranscript}
          onToggleTranscript={setShowTranscript}
          showGroupChat={showGroupChat}
          onToggleGroupChat={setShowGroupChat}
          isMinimalMode={isMinimalMode}
          onToggleMinimalMode={setIsMinimalMode}
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={resetZoom}
          themeClasses={themeClasses}
        />
      </div>
    </div>
  );
};

export default MeetingDisplay;