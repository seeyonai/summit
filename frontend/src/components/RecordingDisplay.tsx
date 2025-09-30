import React, { useState } from 'react';
import { apiUrl } from '@/services/api';
import type { Recording } from '@/types';

interface RecordingDisplayProps {
  recording: Recording;
  onGenerateVerbatim?: (recordingId: string) => void;
  onPolishTranscript?: (recordingId: string) => void;
  onOfflineTranscribe?: (recordingId: string, currentHotwords?: string[]) => void;
  isGeneratingVerbatim?: boolean;
  isPolishing?: boolean;
  isOfflineTranscribing?: boolean;
}

const RecordingDisplay: React.FC<RecordingDisplayProps> = ({
  recording,
  onGenerateVerbatim,
  onPolishTranscript,
  onOfflineTranscribe,
  isGeneratingVerbatim = false,
  isPolishing = false,
  isOfflineTranscribing = false
}) => {
  const [activeTab, setActiveTab] = useState<'transcript' | 'verbatim' | 'segments'>('transcript');

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

  const renderSpeakerSegments = () => {
    if (!recording.speakerSegments || recording.speakerSegments.length === 0) {
      return (
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-gray-500">暂无说话人分离结果</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {recording.speakerSegments.map((segment, index) => (
          <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                {segment.speakerIndex + 1}
              </div>
            </div>
            <div className="flex-grow">
              <div className="text-sm text-gray-600">
                {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
              </div>
              <div className="text-xs text-gray-500">
                时长: {formatTime(segment.endTime - segment.startTime)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Recording Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{recording.filename}</h3>
          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
            {recording.duration && (
              <span>时长: {formatTime(recording.duration)}</span>
            )}
            {recording.fileSize && (
              <span>大小: {formatFileSize(recording.fileSize)}</span>
            )}
            {recording.sampleRate && (
              <span>采样率: {recording.sampleRate}Hz</span>
            )}
            {recording.numSpeakers && (
              <span>说话人数: {recording.numSpeakers}</span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <audio controls className="w-48">
            <source src={fileUrlFor(recording.filePath)} type="audio/wav" />
            您的浏览器不支持音频播放
          </audio>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2 mb-4">
        {!recording.verbatimTranscript && onGenerateVerbatim && (
          <button
            onClick={() => onGenerateVerbatim(recording._id)}
            disabled={isGeneratingVerbatim}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingVerbatim ? '生成中...' : '生成逐字稿'}
          </button>
        )}
        {recording.transcription && onPolishTranscript && (
          <button
            onClick={() => onPolishTranscript(recording._id)}
            disabled={isPolishing}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPolishing ? '优化中...' : 'AI优化转录'}
          </button>
        )}
        {onOfflineTranscribe && (
          <button
            onClick={() => onOfflineTranscribe(recording._id, recording.transcription ? [recording.transcription] : [])}
            disabled={isOfflineTranscribing}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isOfflineTranscribing ? '离线转录中...' : '离线转录'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('transcript')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'transcript'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            转录文本
          </button>
          <button
            onClick={() => setActiveTab('verbatim')}
            disabled={!recording.verbatimTranscript}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'verbatim'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } ${!recording.verbatimTranscript ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            逐字稿
          </button>
          <button
            onClick={() => setActiveTab('segments')}
            disabled={!recording.speakerSegments}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'segments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } ${!recording.speakerSegments ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            说话人分离
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'transcript' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">转录文本</h4>
            {recording.transcription ? (
              <p className="text-blue-900 whitespace-pre-wrap">{recording.transcription}</p>
            ) : (
              <p className="text-blue-700 italic">暂无转录文本</p>
            )}
          </div>
        )}

        {activeTab === 'verbatim' && recording.verbatimTranscript && (
          <div className="bg-blue-50 border border-purple-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-purple-800 mb-2">逐字稿</h4>
            <p className="text-purple-900 whitespace-pre-wrap">{recording.verbatimTranscript}</p>
          </div>
        )}

        {activeTab === 'segments' && renderSpeakerSegments()}
      </div>
    </div>
  );
};

export default RecordingDisplay;
