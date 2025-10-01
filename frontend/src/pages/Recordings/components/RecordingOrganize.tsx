import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Recording, OrganizedSpeech } from '@/types';
import { apiService } from '@/services/api';
import { UsersIcon, ClockIcon, SparklesIcon } from 'lucide-react';

interface RecordingOrganizeProps {
  recording: Recording;
  setSuccess: (message: string) => void;
  setError: (message: string) => void;
  onRefresh?: () => void;
}

function RecordingOrganize({ recording, setSuccess, setError, onRefresh }: RecordingOrganizeProps) {
  const [loading, setLoading] = useState(false);
  const [speeches, setSpeeches] = useState<OrganizedSpeech[] | null>(null);

  const borderColors = [
    'border-blue-500',
    'border-green-500',
    'border-yellow-500',
    'border-purple-500',
    'border-pink-500'
  ];

  const badgeColors = [
    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300'
  ];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const load = async () => {
    try {
      setLoading(true);
      const { speeches: data, message } = await apiService.organizeRecording(recording._id);
      setSpeeches(data);
      if (message) setSuccess(message);
      // Refresh parent recording data to sync the organizedSpeeches field
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '组织失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recording?._id) {
      if (recording?.organizedSpeeches?.length) {
        setSpeeches(recording.organizedSpeeches);
      }
      // Only auto-load if there's no existing organized data
      // This prevents re-running on tab switches
    }
  }, [recording?._id, recording?.organizedSpeeches]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>整理发言</CardTitle>
              <CardDescription>将说话人分段与文本对齐并润色，生成结构化对话</CardDescription>
            </div>
            <Button onClick={load} disabled={loading} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? '整理中...' : (
                <>
                  <SparklesIcon className="w-4 h-4 mr-2" />
                  重新整理
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!speeches || speeches.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">{loading ? '请稍候...' : '暂无整理结果'}</div>
          ) : (
            <div className="space-y-4">
              {speeches.map((s, idx) => {
                const colorIdx = Math.abs(s.speakerIndex) % borderColors.length;
                const borderClass = borderColors[colorIdx];
                const badgeClass = badgeColors[colorIdx];
                return (
                  <div key={`${s.speakerIndex}-${s.startTime}-${idx}`} className={`p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 ${borderClass}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={badgeClass}>
                        <UsersIcon className="w-3 h-3 mr-1" /> 说话人 {s.speakerIndex + 1}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <ClockIcon className="w-3 h-3" />
                        <span>{formatTime(s.startTime)} - {formatTime(s.endTime)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-gray-900 dark:text-gray-100 leading-7">
                    {s.polishedText}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default RecordingOrganize;


