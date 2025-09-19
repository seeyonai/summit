import { useRef } from 'react';
import { DownloadIcon } from 'lucide-react';
import type { Recording as BaseRecording } from '@base/types';
import { apiUrl } from '@/services/api';

interface AudioPlayerProps {
  recording: BaseRecording;
  timestamps?: { time: number; label: string }[];
  onTimestampClick?: (time: number) => void;
}


const AudioPlayer: React.FC<AudioPlayerProps> = ({ recording, onTimestampClick }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      if (onTimestampClick) {
        onTimestampClick(time);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{recording.filename}</h2>
      <div className="space-y-4">
        <audio 
          ref={audioRef}
          controls 
          className="w-full"
        >
          <source src={apiUrl(`/recordings/${recording.filename}`)} type="audio/wav" />
          您的浏览器不支持音频播放
        </audio>
        
        {/* Speaker Segments */}
        {recording.speakerSegments && recording.speakerSegments.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">说话人分段</h3>
            <div className="flex flex-wrap gap-2">
              {recording.speakerSegments.map((segment, index) => (
                <button
                  key={index}
                  onClick={() => handleSeek(segment.startTime)}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs hover:bg-green-200 transition-colors"
                >
                  说话人{segment.speakerIndex + 1}: {formatTime(segment.startTime)}-{formatTime(segment.endTime)}
                </button>
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
                  <button
                    onClick={() => handleSeek(note.timestamp)}
                    className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs hover:bg-yellow-300 transition-colors flex-shrink-0"
                  >
                    {formatTime(note.timestamp)}
                  </button>
                  <p className="text-sm text-gray-700 flex-1">{note.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-4">
          <a
            href={apiUrl(`/recordings/${recording.filename}`)}
            download
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
          >
            <DownloadIcon className="h-4 w-4" />
            <span>下载录音文件</span>
          </a>
          <span className="text-sm text-gray-500">
            时长: {recording.duration ? formatTime(recording.duration) : '未知'}
          </span>
          <span className="text-sm text-gray-500">
            大小: {formatFileSize(recording.fileSize)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
