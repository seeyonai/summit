import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Meeting } from '@/types';
import RecordingCard from '@/components/RecordingCard';
import StatisticsCard from '@/components/StatisticsCard';
import { formatDuration } from '@/utils/formatHelpers';
import {
  FileAudioIcon,
  ClockIcon,
  MicIcon,
  LinkIcon,
  EyeIcon,
  Disc3Icon
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
          description="累计录音时长"
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
          value={combinedRecording ? '已合并' : '未合并'}
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
        <h3 className="text-lg font-semibold">录音文件</h3>
        {recordings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recordings.map((recording) => (
              <RecordingCard 
                key={recording._id} 
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
