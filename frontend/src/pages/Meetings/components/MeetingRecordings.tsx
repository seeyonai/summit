import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Meeting, MeetingRecordingOrderItem, Recording } from '@/types';
import RecordingListItem from '@/components/RecordingListItem';
import StatisticsCard from '@/components/StatisticsCard';
import { formatDuration } from '@/utils/formatHelpers';
import { apiService } from '@/services/api';
import {
  FileAudioIcon,
  ClockIcon,
  MicIcon,
  EyeIcon,
  Disc3Icon,
  GripVerticalIcon,
  Loader2Icon
} from 'lucide-react';

type RecordingOrderEntry = MeetingRecordingOrderItem;

type OrderedRecording = {
  entry: RecordingOrderEntry;
  recording: Recording;
};

type DropPosition = 'before' | 'after' | 'end';

const toRecordingId = (value: RecordingOrderEntry['recordingId']): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value.toString === 'function') {
    return value.toString();
  }
  return '';
};

const normalizeRecordingOrder = (
  recordings: Recording[],
  order: RecordingOrderEntry[] | undefined
): RecordingOrderEntry[] => {
  if (!Array.isArray(recordings) || recordings.length === 0) {
    return [];
  }

  const recordingMap = new Map<string, Recording>(
    recordings.map((recording) => [recording._id, recording])
  );

  const sanitized = Array.isArray(order)
    ? order
        .map((entry, idx) => {
          if (!entry) {
            return null;
          }
          const recordingId = toRecordingId(entry.recordingId);
          if (!recordingId || !recordingMap.has(recordingId)) {
            return null;
          }
          return {
            recordingId,
            index: typeof entry.index === 'number' ? entry.index : idx,
            enabled: entry.enabled !== false,
          } satisfies RecordingOrderEntry;
        })
        .filter((value): value is RecordingOrderEntry => value !== null)
    : [];

  const existingIds = new Set(sanitized.map((entry) => entry.recordingId));

  const missing = recordings
    .filter((recording) => !existingIds.has(recording._id))
    .map((recording, idx) => ({
      recordingId: recording._id,
      index: sanitized.length + idx,
      enabled: true,
    }));

  return [...sanitized, ...missing]
    .sort((a, b) => a.index - b.index)
    .map((entry, idx) => ({
      ...entry,
      index: idx,
    }));
};

const reorderOrderEntries = (
  entries: RecordingOrderEntry[],
  sourceId: string,
  targetId: string | null,
  position: DropPosition
): RecordingOrderEntry[] => {
  if (!sourceId) {
    return entries;
  }

  const sourceIndex = entries.findIndex((entry) => entry.recordingId === sourceId);
  if (sourceIndex === -1) {
    return entries;
  }

  const updated = entries.slice();
  const [moved] = updated.splice(sourceIndex, 1);
  if (!moved) {
    return entries;
  }

  if (position === 'end' || targetId === null) {
    updated.push(moved);
  } else {
    let targetIndex = updated.findIndex((entry) => entry.recordingId === targetId);
    if (targetIndex === -1) {
      updated.push(moved);
    } else {
      if (position === 'after') {
        targetIndex += 1;
      }
      updated.splice(targetIndex, 0, moved);
    }
  }

  const reordered = updated.map((entry, idx) => ({
    ...entry,
    index: idx,
  }));

  const unchanged = entries.length === reordered.length
    && entries.every((entry, idx) => entry.recordingId === reordered[idx]?.recordingId);

  return unchanged ? entries : reordered;
};

interface MeetingRecordingsProps {
  meeting: Meeting;
  onViewTranscript: () => void;
}

function MeetingRecordings({ meeting, onViewTranscript }: MeetingRecordingsProps) {
  const recordings = meeting.recordings || [];
  const combinedRecording = meeting.combinedRecording;

  const [orderEntries, setOrderEntries] = useState<RecordingOrderEntry[]>(() =>
    normalizeRecordingOrder(recordings, meeting.recordingOrder)
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const pendingRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    setOrderEntries(normalizeRecordingOrder(recordings, meeting.recordingOrder));
  }, [recordings, meeting.recordingOrder]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const recordingMap = useMemo(
    () => new Map(recordings.map((recording) => [recording._id, recording])),
    [recordings]
  );

  const orderedItems = useMemo<OrderedRecording[]>(() => {
    if (orderEntries.length === 0) {
      return recordings.map((recording, idx) => ({
        entry: {
          recordingId: recording._id,
          index: idx,
          enabled: true,
        },
        recording,
      }));
    }

    return orderEntries
      .map((entry) => {
        const recording = recordingMap.get(entry.recordingId);
        if (!recording) {
          return null;
        }
        return { entry, recording };
      })
      .filter((value): value is OrderedRecording => value !== null);
  }, [orderEntries, recordingMap, recordings]);

  const persistOrder = useCallback((nextOrder: RecordingOrderEntry[], fallback: RecordingOrderEntry[]) => {
    if (!meeting._id) {
      return;
    }

    const requestId = pendingRequestIdRef.current + 1;
    pendingRequestIdRef.current = requestId;

    if (isMountedRef.current) {
      setIsSaving(true);
    }

    const payload = nextOrder.map((entry, idx) => ({
      recordingId: entry.recordingId,
      index: idx,
      enabled: entry.enabled !== false,
    }));

    apiService
      .updateMeeting(meeting._id, { recordingOrder: payload })
      .catch((error) => {
        console.error('Failed to update recording order', error);
        if (pendingRequestIdRef.current === requestId && isMountedRef.current) {
          setOrderEntries(fallback);
        }
      })
      .finally(() => {
        if (pendingRequestIdRef.current === requestId && isMountedRef.current) {
          setIsSaving(false);
        }
      });
  }, [meeting._id]);

  const applyReorder = useCallback((sourceId: string, targetId: string | null, position: DropPosition) => {
    if (!sourceId) {
      return;
    }
    setOrderEntries((prev) => {
      const next = reorderOrderEntries(prev, sourceId, targetId, position);
      if (next === prev) {
        return prev;
      }
      persistOrder(next, prev);
      return next;
    });
  }, [persistOrder]);

  const handleDragStart = useCallback((event: React.DragEvent<HTMLLIElement>, recordingId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', recordingId);
    setDraggingId(recordingId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (!draggingId) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, [draggingId]);

  const handleDropOnItem = useCallback((event: React.DragEvent<HTMLLIElement>, targetId: string) => {
    if (!draggingId) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const { top, height } = event.currentTarget.getBoundingClientRect();
    const position: DropPosition = event.clientY > top + height / 2 ? 'after' : 'before';
    applyReorder(draggingId, targetId, position);
    setDraggingId(null);
  }, [applyReorder, draggingId]);

  const handleDropToEnd = useCallback((event: React.DragEvent<HTMLElement>) => {
    if (!draggingId) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    applyReorder(draggingId, null, 'end');
    setDraggingId(null);
  }, [applyReorder, draggingId]);

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatisticsCard
          icon={<MicIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
          label="录音总数"
          value={recordings.length}
          description={`${recordings.length} 个录音文件`}
        />

        <StatisticsCard
          icon={<ClockIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
          label="总时长"
          value={formatDuration(recordings.reduce<number>((acc, r) => acc + (r.duration || 0), 0))}
          description="累计录音时长 (mm:ss)"
        />

        <StatisticsCard
          icon={<FileAudioIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
          label="已转录"
          value={recordings.filter((r) => Boolean(r.transcription)).length}
          description={`共 ${recordings.length} 个录音`}
        />

        <StatisticsCard
          icon={<Disc3Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
          label="合并状态"
          value={recordings.length > 1 ?
            combinedRecording ? '已合并' : '未合并' :
            '-'}
          description={recordings.length > 1 ?
            combinedRecording ? '可查看完整转录' : '多个录音可合并' : '单个录音无需合并'}
        />
      </div>

      {/* Combined Recording */}
      {combinedRecording && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">合并录音</h3>
            <Button onClick={onViewTranscript} variant="outline" size="sm">
              <EyeIcon className="w-4 h-4 mr-2" />
              查看完整转录
            </Button>
          </div>
          <RecordingCard 
            recording={combinedRecording} 
            variant="combined"
            showMeetingInfo={false}
          />
        </div>
      )}

      {/* Individual Recordings */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold">录音文件</h3>
          {(orderedItems.length > 1 || isSaving) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {orderedItems.length > 1 && (
                <span>拖动左侧图标调整播放顺序</span>
              )}
              {isSaving && (
                <span className="inline-flex items-center gap-1 text-muted-foreground/80">
                  <Loader2Icon className="h-3 w-3 animate-spin" />
                  保存中…
                </span>
              )}
            </div>
          )}
        </div>
        {orderedItems.length > 0 ? (
          <ul className="space-y-3">
            {orderedItems.map(({ entry, recording }) => (
              <li
                key={recording._id}
                draggable
                onDragStart={(event) => handleDragStart(event, recording._id)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(event) => handleDropOnItem(event, recording._id)}
                className={`flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-3 shadow-sm transition ${
                  draggingId === recording._id ? 'border-primary bg-primary/10' : 'hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"
                  >
                    <GripVerticalIcon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground/80">{entry.index + 1}</span>
                </div>
                <div className={`flex-1 ${entry.enabled ? '' : 'opacity-60'}`}>
                  <RecordingListItem
                    recording={recording}
                    className="shadow-none border-none bg-transparent hover:shadow-none p-0"
                  />
                </div>
              </li>
            ))}
            {draggingId && orderedItems.length > 0 && (
              <li
                key="dropzone-end"
                onDragOver={handleDragOver}
                onDrop={handleDropToEnd}
                className="flex h-12 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/40 text-xs text-muted-foreground"
              >
                拖放到此处可排到最后
              </li>
            )}
          </ul>
        ) : (
          <Card className="p-12">
            <div className="text-center">
              <MicIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">暂无录音</p>
              <p className="text-sm text-muted-foreground">
                会议进行中可以开始录音
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default MeetingRecordings;
