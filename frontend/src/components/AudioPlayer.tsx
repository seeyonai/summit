import React, { useRef, useMemo } from 'react';
import { RadioIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Recording } from '@/types';
import { fileUrlFor } from '@/utils/apiHelpers';
import { buildSpeakerNameMap, getSpeakerDisplayName } from '@/utils/speakerNames';

interface AudioPlayerProps {
  recording: Recording;
  showFilename?: boolean;
  timestamps?: { time: number; label: string }[];
  onTimestampClick?: (time: number) => void;
}


function AudioPlayer({ recording, onTimestampClick, showFilename = true }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const speakerNames = recording.speakerNames;
  const speakerNameMap = useMemo(() => buildSpeakerNameMap(speakerNames), [speakerNames]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      if (onTimestampClick) {
        onTimestampClick(time);
      }
    }
  };

  const displayName = (recording as any).originalFileName || `${(recording as any)._id}.${(recording as any).format || 'wav'}`;

  return (
    <div className="">
      {showFilename && <h2 className="text-lg font-semibold text-gray-900 mb-4">{displayName}</h2>}
      <div className="space-y-4">
        <audio
          ref={audioRef}
          controls
          className="w-full"
        >
          <source src={fileUrlFor((recording as any)._id)} type="audio/wav" />
          您的浏览器不支持音频播放
        </audio>

        {/* Speaker Segments */}
        {recording.speakerSegments && recording.speakerSegments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RadioIcon className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-gray-700">说话人分段</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {recording.speakerSegments.map((segment, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSeek(segment.startTime)}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs hover:bg-green-200 transition-colors h-auto"
                >
                  {getSpeakerDisplayName(segment.speakerIndex, speakerNameMap)}: {formatTime(segment.startTime)}-{formatTime(segment.endTime)}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Timestamped Notes */}
        {recording.timeStampedNotes && recording.timeStampedNotes.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">时间戳笔记</h3>
            <div className="space-y-2">
              {recording.timeStampedNotes.map((note, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSeek(note.timestamp)}
                    className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs hover:bg-yellow-300 transition-colors flex-shrink-0 h-auto"
                  >
                    {formatTime(note.timestamp)}
                  </Button>
                  <p className="text-sm text-gray-700 flex-1">{note.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default AudioPlayer;
