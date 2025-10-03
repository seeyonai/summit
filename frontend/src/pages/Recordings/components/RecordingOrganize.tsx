import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Recording, OrganizedSpeech } from '@/types';
import { apiService } from '@/services/api';
import { UsersIcon, ClockIcon, SparklesIcon, PencilIcon, SaveIcon, XIcon } from 'lucide-react';
import PipelineStageCard from './PipelineStageCard';
import { buildSpeakerNameMap, getSpeakerDisplayName } from '@/utils/speakerNames';

interface RecordingOrganizeProps {
  recording: Recording;
  setSuccess: (message: string) => void;
  setError: (message: string) => void;
  onRefresh?: () => void;
}

function RecordingOrganize({ recording, setSuccess, setError, onRefresh }: RecordingOrganizeProps) {
  const [loading, setLoading] = useState(false);
  const [speeches, setSpeeches] = useState<OrganizedSpeech[] | undefined>(recording.organizedSpeeches);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedSpeech, setEditedSpeech] = useState<OrganizedSpeech | null>(null);
  const [saving, setSaving] = useState(false);
  const speakerNames = recording.speakerNames;
  const speakerNameMap = useMemo(() => buildSpeakerNameMap(speakerNames), [speakerNames]);

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
    'bg-purple-100 text-accent dark:bg-purple-900/40 dark:text-accent',
    'bg-pink-100 text-accent dark:bg-pink-900/40 dark:text-accent'
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

  const handleEdit = (index: number, speech: OrganizedSpeech) => {
    setEditingIndex(index);
    setEditedSpeech({ ...speech });
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditedSpeech(null);
  };

  const handleSave = async () => {
    if (!editedSpeech || editingIndex === null || !speeches) return;

    try {
      setSaving(true);
      const updatedSpeeches = [...speeches];
      updatedSpeeches[editingIndex] = editedSpeech;

      await apiService.updateRecording(recording._id, {
        organizedSpeeches: updatedSpeeches
      });

      setSpeeches(updatedSpeeches);
      setEditingIndex(null);
      setEditedSpeech(null);
      setSuccess('发言已更新');

      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const empty = !speeches || speeches.length === 0;
  const primaryButton = (
    <Button
      onClick={load}
      disabled={loading || !recording.alignmentItems || !recording.transcription || !recording.speakerSegments}
      size={empty ? 'lg' : 'sm'}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          整理中...
        </>
      ) : (
        <>
          <SparklesIcon className="w-4 h-4 mr-2" />
          {empty ? '开始整理' : '重新整理'}
        </>
      )}
    </Button>
  );

  return (
    <PipelineStageCard
      icon={<SparklesIcon className="w-5 h-5 text-white" />}
      title="整理发言"
      description="将说话人分段与文本对齐并润色，生成结构化对话"
      primaryButton={primaryButton}
      isEmpty={empty}
      emptyIcon={<SparklesIcon className="w-12 h-12" />}
      emptyMessage={loading ? '请稍候...' : '暂无整理结果'}
    >
      <div className="space-y-4">
        {speeches?.map((s, idx) => {
          const isEditing = editingIndex === idx;
          const displaySpeech = isEditing ? editedSpeech! : s;
          const colorIdx = Math.abs(displaySpeech.speakerIndex) % borderColors.length;
          const borderClass = borderColors[colorIdx];
          const badgeClass = badgeColors[colorIdx];
          
          return (
            <div key={`${s.speakerIndex}-${s.startTime}-${idx}`} className={`p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 ${borderClass}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">说话人</span>
                      <Input
                        type="number"
                        min="0"
                        value={editedSpeech!.speakerIndex}
                        onChange={(e) => setEditedSpeech({ ...editedSpeech!, speakerIndex: parseInt(e.target.value) || 0 })}
                        className="w-20 h-7 text-sm"
                      />
                    </div>
                  ) : (
                    <Badge className={badgeClass}>
                      <UsersIcon className="w-3 h-3 mr-1" /> {getSpeakerDisplayName(displaySpeech.speakerIndex, speakerNameMap)}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                    <ClockIcon className="w-3 h-3" />
                    <span>{formatTime(displaySpeech.startTime)} - {formatTime(displaySpeech.endTime)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button onClick={handleSave} disabled={saving} size="sm" variant="default" className="h-7">
                        <SaveIcon className="w-3 h-3 mr-1" />
                        保存
                      </Button>
                      <Button onClick={handleCancel} disabled={saving} size="sm" variant="outline" className="h-7">
                        <XIcon className="w-3 h-3 mr-1" />
                        取消
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => handleEdit(idx, s)} size="sm" variant="ghost" className="h-7">
                      <PencilIcon className="w-3 h-3 mr-1" />
                      编辑
                    </Button>
                  )}
                </div>
              </div>
              {isEditing ? (
                <Textarea
                  value={editedSpeech!.polishedText}
                  onChange={(e) => setEditedSpeech({ ...editedSpeech!, polishedText: e.target.value })}
                  className="min-h-[100px] text-gray-900 dark:text-gray-100 leading-7"
                  disabled={saving}
                />
              ) : (
                <div className="text-gray-900 dark:text-gray-100 leading-7">
                  {displaySpeech.polishedText}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PipelineStageCard>
  );
}

export default RecordingOrganize;
