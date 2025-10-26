import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { X, Pause, Square, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { apiService } from '@/services/api';
import type { Meeting } from '@/types';
import MeetingPicker from './MeetingPicker';
import { useAuth } from '../../contexts/AuthContext';

interface FloatingRecordingPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

function FloatingRecordingPanel({ isVisible, onClose }: FloatingRecordingPanelProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isPaused, setIsPaused] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [displayTime, setDisplayTime] = useState(0);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedRecordingId, setSavedRecordingId] = useState<string | null>(null);
  const [savedFilename, setSavedFilename] = useState<string | null>(null);
  
  // Drag functionality state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  
  const { isRecording, recordingTime, startRecording, stopRecording } = useAudioRecording({
    onRecordingComplete: async (data) => {
      // Extract filename from download URL
      const urlParts = data.downloadUrl.split('/');
      const recordingId = urlParts[urlParts.length - 1];
      const filename = recordingId || 'recording';
      
      setSavedRecordingId(recordingId);
      setSavedFilename(filename);
      setIsSaving(false);
      
      if (selectedMeeting) {
        try {
          await apiService.addRecordingToMeeting(selectedMeeting._id, recordingId);
        } catch (error) {
          console.error('Failed to associate recording with meeting:', error);
        }
      }
    }
  });
  
  // Update display time only when not paused
  React.useEffect(() => {
    if (isRecording && !isPaused) {
      setDisplayTime(recordingTime);
    }
  }, [isRecording, isPaused, recordingTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    startRecording();
    setIsPaused(false);
    setDisplayTime(0);
  };

  const handleStopClick = () => {
    setShowStopDialog(true);
  };

  const handleConfirmStop = () => {
    setIsSaving(true);
    stopRecording();
    setIsPaused(false);
  };

  const handleCloseDialog = () => {
    setShowStopDialog(false);
    setIsSaving(false);
    setSavedRecordingId(null);
    setSavedFilename(null);
    setDisplayTime(0);
  };

  const handleContinueRecording = () => {
    setShowStopDialog(false);
    setIsSaving(false);
    setSavedRecordingId(null);
    setSavedFilename(null);
    setDisplayTime(0);
    startRecording();
  };

  const handleViewRecording = () => {
    if (savedRecordingId) {
      navigate(`/recordings/${savedRecordingId}`);
      handleCloseDialog();
      onClose();
    }
  };

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
    // Note: Audio recording continues in background, only UI timer pauses
  };

  
  // Drag functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't start dragging if clicking on buttons or interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Get panel dimensions (approximate)
    const panelWidth = 300; // Approximate width
    const panelHeight = 100; // Approximate height
    
    // Constrain to viewport bounds with smaller margins
    const constrainedX = Math.max(-viewportWidth/2 + panelWidth/2 - 20, Math.min(viewportWidth/2 - panelWidth/2 + 20, newX));
    const constrainedY = Math.max(-viewportHeight + panelHeight + 10, Math.min(-10, newY));
    
    setPosition({ x: constrainedX, y: constrainedY });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isVisible || !user) return null;

  return (
    <TooltipProvider>
      <div 
        ref={panelRef}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 group"
        style={{
          transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
      <div 
        className="relative backdrop-blur-sm bg-white/20 dark:bg-gray-800 rounded-full shadow-2xl border border-border/90 dark:border-gray-700 px-4 py-3 flex items-center gap-3 select-none"
        onMouseDown={handleMouseDown}
      >
        {!isRecording ? (
          // STOPPED STATE: Big red button with mic icon
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleStartRecording}
                  className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 ring-4 ring-red-500/20 flex items-center justify-center transition-all"
                >
                  <div className="w-6 h-6 bg-white rounded-full" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>开始录音</p>
              </TooltipContent>
            </Tooltip>

            {/* Meeting Picker */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <MeetingPicker
                    selectedMeeting={selectedMeeting}
                    onMeetingSelect={setSelectedMeeting}
                    disabled={isRecording}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{selectedMeeting ? '已关联会议' : '关联到会议'}</p>
              </TooltipContent>
            </Tooltip>

            {/* Close Button (stopped state) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>关闭录音面板</p>
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          // RECORDING/PAUSED STATE: Blue stop button, pause/play button, timer
          <>
            {/* Stop Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleStopClick}
                  className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 ring-4 ring-blue-500/20 flex items-center justify-center transition-all"
                >
                  <Square className="w-5 h-5 text-white fill-white" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>停止录音</p>
              </TooltipContent>
            </Tooltip>

            {/* Pause Button (blinking when paused) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleTogglePause}
                  className={`w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors ${
                    isPaused ? 'animate-pulse' : ''
                  }`}
                >
                  <Pause className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isPaused ? '恢复计时' : '暂停计时'}</p>
              </TooltipContent>
            </Tooltip>
            {/* Timer (blinking when paused) */}
            <div className={`flex items-center gap-1 text-sm font-mono text-gray-700 dark:text-gray-300 ${isPaused ? 'animate-pulse' : ''}`}>
              <span>{formatTime(displayTime)}</span>
            </div>
          </>
        )}
      </div>


      {/* Stop Confirmation Modal */}
      {showStopDialog && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {!savedRecordingId ? (isSaving ? '正在保存录音' : '停止录音') : '录音已保存'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {!savedRecordingId
                ? isSaving
                  ? '请稍候，正在处理您的录音文件...'
                  : '确定要停止当前录音吗？录音将被保存。'
                : '您的录音已成功保存，可以查看详情或继续录制新的录音。'}
            </p>
          </div>

          {/* Content */}
          <div className="px-4 py-4">
            {isSaving && (
              <div className="flex flex-col items-center justify-center py-6">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">处理中...</p>
              </div>
            )}

            {savedRecordingId && savedFilename && (
              <div className="flex flex-col items-center justify-center py-4">
                <CheckCircle2 className="w-10 h-10 text-green-500 mb-3" />
                <button
                  onClick={handleViewRecording}
                  className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors w-full"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex-1 text-left">
                    {savedFilename}
                  </span>
                  <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                </button>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">点击文件名查看详情</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 flex gap-2">
            {!savedRecordingId && !isSaving && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowStopDialog(false)}
                  className="flex-1 h-9 text-sm"
                >
                  取消
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmStop}
                  className="flex-1 h-9 text-sm"
                >
                  确认停止
                </Button>
              </>
            )}
            {savedRecordingId && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  className="flex-1 h-9 text-sm"
                >
                  关闭
                </Button>
                {/* <Button
                  type="button"
                  onClick={handleContinueRecording}
                  className="flex-1 h-9 text-sm"
                >
                  继续录音
                </Button> */}
              </>
            )}
          </div>
        </div>
      )}
      </div>
    </TooltipProvider>
  );
}

export default FloatingRecordingPanel;
