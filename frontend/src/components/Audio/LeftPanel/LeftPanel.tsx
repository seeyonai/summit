import React from 'react';
import MeetingInfoCard from './MeetingInfoCard';
import ControlPanelCard from './ControlPanelCard';
import QuickActionsCard from './QuickActionsCard';

interface LeftPanelProps {
  title: string;
  agenda: string;
  showAgenda: boolean;
  onPauseToggle: () => void;
  isPaused: boolean;
  isRecording: boolean;
  onStopRecording: () => void;
  onOpenAIDialog: () => void;
  themeClasses: {
    sidebar: string;
    card: string;
    cardInner: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
  };
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  title,
  agenda,
  showAgenda,
  onPauseToggle,
  isPaused,
  isRecording,
  onStopRecording,
  onOpenAIDialog,
  themeClasses
}) => {
  return (
    <div className={`w-96 ${themeClasses.sidebar} border-r flex flex-col`}>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <MeetingInfoCard 
          title={title}
          agenda={agenda}
          showAgenda={showAgenda}
          themeClasses={themeClasses}
        />
        <ControlPanelCard 
          isRecording={isRecording}
          isPaused={isPaused}
          onPauseToggle={onPauseToggle}
          onStopRecording={onStopRecording}
          themeClasses={themeClasses}
        />
        <QuickActionsCard 
          onOpenAIDialog={onOpenAIDialog}
          themeClasses={themeClasses}
        />
      </div>
    </div>
  );
};

export default LeftPanel;
