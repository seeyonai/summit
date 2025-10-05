import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Meeting, MeetingRecordingOrderItem, Recording } from '@/types';
import RecordingListItem from '@/components/RecordingListItem';
import StatisticsCard from '@/components/StatisticsCard';
import { formatDuration } from '@/utils/formatHelpers';
import { apiService } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileAudioIcon,
  ClockIcon,
  MicIcon,
  EyeIcon,
  Disc3Icon,
  GripVerticalIcon,
  Loader2Icon
} from 'lucide-react';

type RecordingOrderEntry = {
  recordingId: string;
  index: number;
  enabled: boolean;
};

type OrderedRecording = {
  entry: RecordingOrderEntry;
  recording: Recording;
};

type DropPosition = 'before' | 'after' | 'end';

const toRecordingId = (value: MeetingRecordingOrderItem['recordingId']): string => {
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
  order: MeetingRecordingOrderItem[] | undefined
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
        .filter((value): value is NonNullable<typeof value> => value !== null)
    : [];

  const existingIds = new Set(sanitized.map((entry) => entry ? toRecordingId(entry.recordingId) : '').filter(Boolean));

  const missing = recordings
    .filter((recording) => !existingIds.has(recording._id))
    .map((recording, idx) => ({
      recordingId: recording._id,
      index: sanitized.length + idx,
      enabled: true,
    }));

  return [...sanitized, ...missing]
    .sort((a, b) => (a?.index || 0) - (b?.index || 0))
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

  const sourceIndex = entries.findIndex((entry) => toRecordingId(entry.recordingId) === sourceId);
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
    let targetIndex = updated.findIndex((entry) => toRecordingId(entry.recordingId) === targetId);
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
    && entries.every((entry, idx) => toRecordingId(entry.recordingId) === toRecordingId(reordered[idx]?.recordingId || ''));

  return unchanged ? entries : reordered;
};

interface MeetingRecordingsProps {
  meeting: Meeting;
  onViewTranscript: () => void;
}

function MeetingRecordings({ meeting, onViewTranscript }: MeetingRecordingsProps) {
  const [recordingsState, setRecordingsState] = useState<Recording[]>(() => meeting.recordings || []);
  const [concatenatedRecordingState, setConcatenatedRecordingState] = useState<Recording | null | undefined>(() => meeting.concatenatedRecording);

  const [orderEntries, setOrderEntries] = useState<RecordingOrderEntry[]>(() =>
    normalizeRecordingOrder(
      (meeting.recordings || []).filter((recording) => recording.source !== 'concatenated'),
      meeting.recordingOrder
    )
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConcatenating, setIsConcatenating] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [recordingPendingRemoval, setRecordingPendingRemoval] = useState<Recording | null>(null);
  const [shouldDeleteRecordingFile, setShouldDeleteRecordingFile] = useState(false);
  const [isRemovingRecording, setIsRemovingRecording] = useState(false);
  const pendingRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    setRecordingsState(meeting.recordings || []);
  }, [meeting.recordings]);

  useEffect(() => {
    setConcatenatedRecordingState(meeting.concatenatedRecording);
  }, [meeting.concatenatedRecording]);

  const originalRecordings = useMemo(
    () => recordingsState.filter((recording) => recording.source !== 'concatenated'),
    [recordingsState]
  );

  useEffect(() => {
    setOrderEntries(normalizeRecordingOrder(originalRecordings, meeting.recordingOrder));
  }, [originalRecordings, meeting.recordingOrder]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const recordingMap = useMemo(
    () => new Map(originalRecordings.map((recording) => [recording._id, recording])),
    [originalRecordings]
  );

  const orderedItems = useMemo<OrderedRecording[]>(() => {
    if (orderEntries.length === 0) {
      return originalRecordings.map((recording, idx) => ({
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
        const recording = recordingMap.get(toRecordingId(entry.recordingId));
        if (!recording) {
          return null;
        }
        return { entry, recording };
      })
      .filter((value): value is OrderedRecording => value !== null);
  }, [orderEntries, recordingMap, originalRecordings]);

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
      recordingId: toRecordingId(entry.recordingId),
      index: idx,
      enabled: entry.enabled !== false,
    })) as { recordingId: string; index: number; enabled: boolean; }[];

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

  const handleConcatenateRecordings = useCallback(async () => {
    if (!meeting._id || isConcatenating) {
      return;
    }

    if (isMountedRef.current) {
      setIsConcatenating(true);
    }

    try {
      const result = await apiService.concatenateMeetingRecordings(meeting._id);
      if (!isMountedRef.current) {
        return;
      }

      const updatedMeeting = result?.meeting;
      if (updatedMeeting) {
        setConcatenatedRecordingState(updatedMeeting.concatenatedRecording);
        const nextRecordings = updatedMeeting.recordings || [];
        setRecordingsState(nextRecordings);
        setOrderEntries(normalizeRecordingOrder(
          nextRecordings.filter((recording) => recording.source !== 'concatenated'),
          updatedMeeting.recordingOrder
        ));
        return;
      }

      if (result?.recording) {
        setConcatenatedRecordingState(result.recording);
        setRecordingsState((prev) => {
          const filtered = prev.filter((recording) => recording.source !== 'concatenated');
          const nextRecordings = [...filtered, result.recording];
          setOrderEntries(normalizeRecordingOrder(
            nextRecordings.filter((recording) => recording.source !== 'concatenated'),
            meeting.recordingOrder
          ));
          return nextRecordings;
        });
      }
    } catch (error) {
      console.error('Failed to concatenate recordings', error);
    } finally {
      if (isMountedRef.current) {
        setIsConcatenating(false);
      }
    }
  }, [meeting._id, meeting.recordingOrder, isConcatenating]);

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

  const clearRemovalState = useCallback(() => {
    setRecordingPendingRemoval(null);
    setShouldDeleteRecordingFile(false);
  }, []);

  const handleDialogOpenChange = useCallback((nextOpen: boolean) => {
    if (isRemovingRecording) {
      return;
    }
    if (!nextOpen) {
      clearRemovalState();
    }
    setRemoveDialogOpen(nextOpen);
  }, [clearRemovalState, isRemovingRecording]);

  const handleRequestRemoveRecording = useCallback((recording: Recording) => {
    setRecordingPendingRemoval(recording);
    setShouldDeleteRecordingFile(false);
    setRemoveDialogOpen(true);
  }, []);

  const handleConfirmRemoveRecording = useCallback(async () => {
    if (!meeting._id || !recordingPendingRemoval || isRemovingRecording) {
      return;
    }

    const recordingId = recordingPendingRemoval._id;
    if (!recordingId) {
      return;
    }

    if (isMountedRef.current) {
      setIsRemovingRecording(true);
    }

    try {
      const updatedMeeting = await apiService.removeRecordingFromMeeting(meeting._id, recordingId);

      if (shouldDeleteRecordingFile) {
        try {
          await apiService.deleteRecording(recordingId);
        } catch (error) {
          console.error('Failed to delete recording file', error);
        }
      }

      if (!isMountedRef.current) {
        return;
      }

      if (updatedMeeting) {
        const nextRecordings = updatedMeeting.recordings || [];
        setRecordingsState(nextRecordings);
        setConcatenatedRecordingState(updatedMeeting.concatenatedRecording);
        const nextOriginals = nextRecordings.filter((recording) => recording.source !== 'concatenated');
        const normalized = normalizeRecordingOrder(nextOriginals, updatedMeeting.recordingOrder);
        setOrderEntries(normalized);
        if (normalized.length !== orderEntries.length) {
          persistOrder(normalized, orderEntries);
        }
      } else {
        setRecordingsState((prev) => prev.filter((recording) => recording._id !== recordingId));
        setOrderEntries((prev) => {
          const filtered = prev.filter((entry) => toRecordingId(entry.recordingId) !== recordingId);
          if (filtered.length === prev.length) {
            return prev;
          }
          const normalized = filtered.map((entry, idx) => ({
            ...entry,
            index: idx,
          }));
          persistOrder(normalized, prev);
          return normalized;
        });
      }

      setRemoveDialogOpen(false);
      clearRemovalState();
    } catch (error) {
      console.error('Failed to remove recording from meeting', error);
    } finally {
      if (isMountedRef.current) {
        setIsRemovingRecording(false);
      }
    }
  }, [
    meeting._id,
    recordingPendingRemoval,
    isRemovingRecording,
    shouldDeleteRecordingFile,
    orderEntries,
    persistOrder,
    clearRemovalState,
  ]);

  return (
    <>
      <div className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatisticsCard
            icon={<MicIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
            label="录音总数"
            value={originalRecordings.length}
            description={`${originalRecordings.length} 个录音文件`}
        />

        <StatisticsCard
          icon={<ClockIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
          label="总时长"
          value={formatDuration(originalRecordings.reduce<number>((acc, r) => acc + (r.duration || 0), 0))}
          description="累计录音时长 (mm:ss)"
        />

        <StatisticsCard
          icon={<FileAudioIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
          label="已转录"
          value={originalRecordings.filter((r) => Boolean(r.transcription)).length}
          description={`共 ${originalRecordings.length} 个录音`}
        />

        <StatisticsCard
          icon={<Disc3Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
          label="拼接状态"
          value={originalRecordings.length > 1 ?
            concatenatedRecordingState ? '已拼接' : '未拼接' :
            '-'}
          description={originalRecordings.length > 1 ?
            concatenatedRecordingState ? '可查看完整转录' : '多个录音可拼接' : '单个录音无需拼接'}
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold">录音管理</h3>
          <Button
            onClick={handleConcatenateRecordings}
            disabled={isConcatenating || originalRecordings.length < 2}
            className="sm:w-auto"
          >
            {isConcatenating && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
            拼接录音文件
          </Button>
        </div>

        {concatenatedRecordingState && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-primary">已拼接</h4>
              <Button onClick={onViewTranscript} variant="outline" size="sm">
                <EyeIcon className="w-4 h-4 mr-2" />
                查看完整转录
              </Button>
            </div>
            <RecordingListItem
              recording={concatenatedRecordingState}
              actions={{
                onDelete: () => handleRequestRemoveRecording(concatenatedRecordingState),
              }}
            />
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h4 className="text-base font-semibold">原始文件</h4>
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <GripVerticalIcon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground/80">{entry.index + 1}</span>
                  </div>
                  <div className={`flex-1 ${entry.enabled ? '' : 'opacity-60'}`}>
                    <RecordingListItem
                      recording={recording}
                      className="shadow-none border-none bg-transparent hover:shadow-none p-0"
                      actions={{
                        onDelete: () => handleRequestRemoveRecording(recording),
                      }}
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
      </div>

      <Dialog open={removeDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>移除录音</DialogTitle>
            <DialogDescription>
              {recordingPendingRemoval ? `确定要将「${recordingPendingRemoval.originalFileName || recordingPendingRemoval._id}」从当前会议中移除吗？` : '确定要移除此录音与会议的关联吗？'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              你可以仅解除关联，或同时删除该录音文件。
            </p>
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-muted-foreground/40 p-3">
              <Checkbox
                id="delete-recording-file"
                checked={shouldDeleteRecordingFile}
                onCheckedChange={(value) => setShouldDeleteRecordingFile(value === true)}
                disabled={isRemovingRecording}
              />
              <Label htmlFor="delete-recording-file" className="text-sm">
                同时删除录音源文件
              </Label>
            </div>
            {shouldDeleteRecordingFile && (
              <p className="text-xs text-destructive">
                文件删除后不可恢复，请谨慎操作。
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={isRemovingRecording}>
              取消
            </Button>
            <Button
              variant={shouldDeleteRecordingFile ? 'destructive' : 'default'}
              onClick={handleConfirmRemoveRecording}
              disabled={isRemovingRecording}
            >
              {isRemovingRecording && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              {shouldDeleteRecordingFile ? '移除并删除' : '仅解除关联'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MeetingRecordings;
