import React from 'react';
import type { MeetingWithRecordings } from '@/types';

interface FinalTranscriptProps {
  meeting: MeetingWithRecordings;
  onGenerateFinalTranscript?: (meetingId: string) => void;
  isGenerating?: boolean;
}

const FinalTranscript: React.FC<FinalTranscriptProps> = ({
  meeting,
  onGenerateFinalTranscript,
  isGenerating = false
}) => {
  const hasRecordings = meeting.recordings && meeting.recordings.length > 0;
  const hasTranscripts = hasRecordings && meeting.recordings.some(r => r.transcription);
  
  const formatDuration = (recordings = meeting.recordings) => {
    const duration = Math.floor(recordings.reduce((total, recording) => {
      return total + (recording.duration || 0);
    }, 0));

    if (duration <= 0) {
      return '-';
    }

    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds}秒`;
    } else {
      return `${seconds}秒`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">会议纪要</h3>
        {hasTranscripts && onGenerateFinalTranscript && (
          <button
            onClick={() => onGenerateFinalTranscript(meeting._id)}
            disabled={isGenerating}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>生成中...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>AI生成会议纪要</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Meeting Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">会议时长:</span>
            <span className="ml-2 text-gray-600">
              {formatDuration()}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">录音数量:</span>
            <span className="ml-2 text-gray-600">
              {hasRecordings ? meeting.recordings.length : 0} 个
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">状态:</span>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
              meeting.status === 'completed' ? 'bg-green-100 text-green-800' :
              meeting.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              meeting.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {meeting.status === 'completed' ? '已完成' :
               meeting.status === 'in_progress' ? '进行中' :
               meeting.status === 'scheduled' ? '已排期' : '失败'}
            </span>
          </div>
        </div>
      </div>

      {/* Final Transcript */}
      <div className="space-y-4">
        {meeting.finalTranscript ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-green-800">AI优化会议纪要</h4>
              <div className="flex items-center space-x-2">
                <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-green-600">已优化</span>
              </div>
            </div>
            <div className="prose prose-sm max-w-none">
              <div className="text-green-900 whitespace-pre-wrap">{meeting.finalTranscript}</div>
            </div>
          </div>
        ) : hasTranscripts ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-yellow-800">原始转录内容</h4>
              <div className="flex items-center space-x-2">
                <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm text-yellow-600">待优化</span>
              </div>
            </div>
            <div className="space-y-3">
              {meeting.recordings?.filter(r => r.transcription).map((recording, index) => (
                <div key={(recording._id && recording._id.toString()) || index} className="bg-white bg-opacity-50 rounded p-3">
                  <h5 className="text-sm font-medium text-yellow-700 mb-1">
                    录音 {index + 1}: {recording.filename}
                  </h5>
                  <p className="text-yellow-800 text-sm whitespace-pre-wrap">
                    {recording.transcription}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h4 className="text-lg font-medium text-gray-700 mb-2">暂无会议纪要</h4>
            <p className="text-gray-500 text-sm">
              {hasRecordings 
                ? '请先生成录音的转录文本，然后使用AI生成会议纪要'
                : '请先添加会议录音并生成转录文本'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinalTranscript;
