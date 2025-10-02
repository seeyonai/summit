import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, PauseCircle, PlayCircle, X } from 'lucide-react';

interface ControlPanelCardProps {
  isRecording: boolean;
  isPaused: boolean;
  onPauseToggle: () => void;
  onStopRecording: () => void;
  themeClasses: {
    card: string;
    text: {
      primary: string;
      secondary: string;
    };
  };
  isDarkMode?: boolean;
}

const ControlPanelCard: React.FC<ControlPanelCardProps> = ({
  isRecording,
  isPaused,
  onPauseToggle,
  onStopRecording,
  themeClasses,
  isDarkMode = true
}) => {
  return (
    <Card className={`${themeClasses.card} backdrop-blur-sm`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-green-400" />
          <h3 className={`text-lg font-semibold ${themeClasses.text.primary}`}>控制面板</h3>
        </div>
        <div className="space-y-3">
          <Button
            onClick={onPauseToggle}
            disabled={!isRecording}
            className={`w-full ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'} transition-all`}
          >
            {isPaused ? (
              <><PlayCircle className="w-4 h-4 mr-2" />继续录音</>
            ) : (
              <><PauseCircle className="w-4 h-4 mr-2" />暂停录音</>
            )}
          </Button>
          <Button
            onClick={onStopRecording}
            disabled={!isRecording}
            className="w-full bg-destructive/90 hover:bg-destructive text-white transition-all shadow-lg hover:shadow-red-500/25"
          >
            <X className="w-4 h-4 mr-2" />
            停止录音
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ControlPanelCard;
