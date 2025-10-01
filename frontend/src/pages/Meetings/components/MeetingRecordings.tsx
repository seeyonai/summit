import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Meeting } from '@/types';
import RecordingCard from '@/components/RecordingCard';
import { formatDuration } from '@/utils/formatHelpers';
import {
  FileAudioIcon,
  ClockIcon,
  MicIcon,
  LinkIcon,
  EyeIcon
} from 'lucide-react';

interface MeetingRecordingsProps {
  meeting: Meeting;
  onViewTranscript: () => void;
}

function MeetingRecordings({ meeting, onViewTranscript }: MeetingRecordingsProps) {
  const recordings = meeting.recordings || [];
  const combinedRecording = meeting.combinedRecording;

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">录音总数</p>
                <p className="text-2xl font-bold">{recordings.length}</p>
              </div>
              <MicIcon className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总时长</p>
                <p className="text-2xl font-bold">
                  {formatDuration(recordings.reduce<number>((acc, r) => acc + (r.duration || 0), 0))}
                </p>
              </div>
              <ClockIcon className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已转录</p>
                <p className="text-2xl font-bold">
                  {recordings.filter((r) => Boolean(r.transcription)).length}
                </p>
              </div>
              <FileAudioIcon className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">合并状态</p>
                <p className="text-2xl font-bold">
                  {combinedRecording ? '已合并' : '未合并'}
                </p>
              </div>
              <LinkIcon className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>
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
        <h3 className="text-lg font-semibold">录音文件</h3>
        {recordings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recordings.map((recording) => (
              <RecordingCard 
                key={recording.filename} 
                recording={recording}
                showMeetingInfo={false}
              />
            ))}
          </div>
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
