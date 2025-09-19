import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiService } from '@/services/api';
import HotwordSelection from '@/components/HotwordSelection';
import type { Recording } from '@/types';
import {
  MicIcon,
  FileTextIcon,
  UsersIcon,
  SparklesIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  FileAudioIcon,
  ActivityIcon
} from 'lucide-react';

interface RecordingOverviewProps {
  recording: Recording;
  onRefresh: () => Promise<void>;
  setSuccess: (message: string) => void;
  setError: (message: string) => void;
}

function RecordingOverview({ recording, onRefresh, setSuccess, setError }: RecordingOverviewProps) {
  const [transcribing, setTranscribing] = useState(false);
  const [segmenting, setSegmenting] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [showHotwordSelection, setShowHotwordSelection] = useState(false);

  const generateTranscription = async () => {
    try {
      setTranscribing(true);
      const { message } = await apiService.transcribeRecording(recording._id);
      await onRefresh();
      setSuccess(message || '转录生成成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setTranscribing(false);
    }
  };

  const runSpeakerSegmentation = async (oracleNumSpeakers?: number) => {
    try {
      setSegmenting(true);
      const hasHint = typeof oracleNumSpeakers === 'number' && !Number.isNaN(oracleNumSpeakers);
      const { message } = await apiService.segmentRecording(
        recording._id,
        hasHint ? { oracleNumSpeakers } : {}
      );
      await onRefresh();
      setSuccess(message || '说话人分离完成');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSegmenting(false);
    }
  };

  const polishTranscription = async () => {
    try {
      setPolishing(true);
      const { message } = await apiService.polishRecording(recording._id);
      await onRefresh();
      setSuccess(message || '转录优化成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPolishing(false);
    }
  };

  const handleHotwordTranscribe = () => {
    setShowHotwordSelection(false);
    generateTranscription();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderSpeakerTimeline = () => {
    if (!recording?.speakerSegments || recording.speakerSegments.length === 0) {
      return null;
    }

    const maxTime = Math.max(...recording.speakerSegments.map(s => s.endTime));
    const speakerColors = [
      'bg-gradient-to-r from-blue-500/30 to-blue-600/30',
      'bg-gradient-to-r from-green-500/30 to-green-600/30',
      'bg-gradient-to-r from-yellow-500/30 to-yellow-600/30',
      'bg-gradient-to-r from-purple-500/30 to-purple-600/30',
      'bg-gradient-to-r from-pink-500/30 to-pink-600/30'
    ];
    
    return (
      <div className="space-y-4">
        <div className="relative h-20 bg-gray-100 rounded-xl overflow-hidden">
          {recording.speakerSegments.map((segment, index) => {
            const left = (segment.startTime / maxTime) * 100;
            const width = ((segment.endTime - segment.startTime) / maxTime) * 100;
            const colorClass = speakerColors[segment.speakerIndex % speakerColors.length];
            
            return (
              <div
                key={index}
                className={`absolute top-0 h-full ${colorClass} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
                title={`说话人 ${segment.speakerIndex + 1}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`}
              />
            );
          })}
          <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
            <span className="text-xs text-gray-600 bg-white/80 px-2 py-1 rounded">0:00</span>
            <span className="text-xs text-gray-600 bg-white/80 px-2 py-1 rounded">{formatTime(maxTime)}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(recording.speakerSegments.map(s => s.speakerIndex))).map(speakerIndex => (
            <Badge
              key={speakerIndex}
              className={`${speakerColors[speakerIndex % speakerColors.length]} text-white`}
            >
              <UsersIcon className="w-3 h-3 mr-1" />
              说话人 {speakerIndex + 1}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">转录状态</p>
                <p className="text-2xl font-bold">
                  {recording.transcription ? '已完成' : '未转录'}
                </p>
              </div>
              {recording.transcription ? (
                <CheckCircleIcon className="w-8 h-8 text-green-500" />
              ) : (
                <AlertCircleIcon className="w-8 h-8 text-gray-400" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">说话人数</p>
                <p className="text-2xl font-bold">
                  {recording.numSpeakers || (recording.speakerSegments ? new Set(recording.speakerSegments.map(s => s.speakerIndex)).size : 0)}
                </p>
              </div>
              <UsersIcon className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">音频格式</p>
                <p className="text-2xl font-bold">{recording.format || 'WAV'}</p>
              </div>
              <FileAudioIcon className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">采样率</p>
                <p className="text-2xl font-bold">
                  {recording.sampleRate ? `${recording.sampleRate / 1000}k` : '-'}
                </p>
              </div>
              <ActivityIcon className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
          <CardDescription>对录音执行智能处理操作</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              onClick={generateTranscription}
              disabled={transcribing || !!recording.transcription}
              variant="outline"
              className="h-auto flex-col py-4"
            >
              <MicIcon className="w-6 h-6 mb-2" />
              <span>{transcribing ? '转录中...' : '生成转录'}</span>
            </Button>
            
            <Button
              onClick={() => setShowHotwordSelection(true)}
              disabled={transcribing}
              variant="outline"
              className="h-auto flex-col py-4"
            >
              <FileTextIcon className="w-6 h-6 mb-2" />
              <span>热词转录</span>
            </Button>
            
            <Button
              onClick={() => runSpeakerSegmentation()}
              disabled={segmenting}
              variant="outline"
              className="h-auto flex-col py-4"
            >
              <UsersIcon className="w-6 h-6 mb-2" />
              <span>{segmenting ? '分析中...' : '说话人分离'}</span>
            </Button>
            
            <Button
              onClick={polishTranscription}
              disabled={polishing || !recording.transcription}
              variant="outline"
              className="h-auto flex-col py-4"
            >
              <SparklesIcon className="w-6 h-6 mb-2" />
              <span>{polishing ? '优化中...' : 'AI优化'}</span>
            </Button>
          </div>
          
          {/* Quick Speaker Segmentation Options */}
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => runSpeakerSegmentation(2)}
              disabled={segmenting}
              variant="outline"
              size="sm"
            >
              2人对话
            </Button>
            <Button
              onClick={() => runSpeakerSegmentation(3)}
              disabled={segmenting}
              variant="outline"
              size="sm"
            >
              3人会议
            </Button>
            <Button
              onClick={() => runSpeakerSegmentation(4)}
              disabled={segmenting}
              variant="outline"
              size="sm"
            >
              4人讨论
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Speaker Timeline */}
      {recording.speakerSegments && recording.speakerSegments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>说话人时间线</CardTitle>
            <CardDescription>可视化展示不同说话人的发言时段</CardDescription>
          </CardHeader>
          <CardContent>
            {renderSpeakerTimeline()}
          </CardContent>
        </Card>
      )}

      {/* Hotword Selection Modal */}
      {showHotwordSelection && (
        <HotwordSelection
          isOpen={showHotwordSelection}
          onClose={() => setShowHotwordSelection(false)}
          onApply={handleHotwordTranscribe}
          currentHotwords={recording.transcription ? [recording.transcription] : []}
        />
      )}
    </div>
  );
}

export default RecordingOverview;
