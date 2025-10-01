import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Meeting, OrganizedSpeech } from '@/types';
import {
  FileTextIcon,
  CopyIcon,
  DownloadIcon,
  MessageSquareIcon,
  UsersIcon
} from 'lucide-react';

interface MeetingTranscriptProps {
  meeting: Meeting;
}

function MeetingTranscript({ meeting }: MeetingTranscriptProps) {
  const [exportFormat, setExportFormat] = useState<'txt' | 'docx'>('txt');

  const exportTranscript = async () => {
    if (!meeting.finalTranscript) return;

    try {
      const content = meeting.finalTranscript;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meeting.title}_transcript.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const copyToClipboard = async () => {
    if (!meeting.finalTranscript) return;

    try {
      await navigator.clipboard.writeText(meeting.finalTranscript);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Analyze speaker segments if available
  const speakerStats = meeting.recordings?.reduce((acc, recording) => {
    if (recording.speakerSegments) {
      recording.speakerSegments.forEach(segment => {
        const speakerId = `speaker_${segment.speakerIndex}`;
        if (!acc[speakerId]) {
          acc[speakerId] = {
            index: segment.speakerIndex,
            segments: 0,
            totalDuration: 0
          };
        }
        acc[speakerId].segments++;
        acc[speakerId].totalDuration += (segment.endTime - segment.startTime);
      });
    }
    return acc;
  }, {} as Record<string, { index: number; segments: number; totalDuration: number }>);

  const speakerColors = [
    'bg-badge-info',
    'bg-badge-success',
    'bg-badge-warning',
    'bg-badge-accent',
    'bg-badge-primary'
  ];

  // Combine organized speeches from all recordings
  const combinedOrganizedSpeeches: OrganizedSpeech[] | undefined = meeting.recordings?.reduce<OrganizedSpeech[]>((acc, recording) => {
    if (recording.organizedSpeeches && recording.organizedSpeeches.length > 0) {
      return acc.concat(recording.organizedSpeeches);
    }
    return acc;
  }, []);

  // Also check meeting's combined recording
  const combinedRecordingSpeeches = meeting.combinedRecording?.organizedSpeeches || [];

  const allOrganizedSpeeches = [...(combinedOrganizedSpeeches || []), ...combinedRecordingSpeeches];

  return (
    <div className="space-y-6">
      {/* Organized Speeches */}
      {allOrganizedSpeeches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              发言整理
            </CardTitle>
            <CardDescription>按发言人整理的会议发言内容</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allOrganizedSpeeches
                .sort((a, b) => a.startTime - b.startTime)
                .map((speech, index) => {
                  const speakerColorClass = speakerColors[speech.speakerIndex % speakerColors.length];
                  const minutes = Math.floor(speech.startTime / 60);
                  const seconds = Math.floor(speech.startTime % 60);
                  const endMinutes = Math.floor(speech.endTime / 60);
                  const endSeconds = Math.floor(speech.endTime % 60);
                  
                  return (
                    <div key={index} className="border border-border rounded-lg p-4 hover:bg-muted transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Badge className={speakerColorClass}>
                            发言人 {speech.speakerIndex + 1}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {minutes}:{seconds.toString().padStart(2, '0')} - {endMinutes}:{endSeconds.toString().padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {speech.polishedText && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">整理内容：</p>
                            <p className="text-gray-900 leading-relaxed">{speech.polishedText}</p>
                          </div>
                        )}
                        {speech.rawText && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">原始内容：</p>
                            <p className="text-muted-foreground text-sm leading-relaxed italic">{speech.rawText}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcript Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>会议记录</CardTitle>
              <CardDescription>完整的会议文字记录</CardDescription>
            </div>
            {meeting.finalTranscript && (
              <div className="flex gap-2">
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="sm"
                >
                  <CopyIcon className="w-4 h-4 mr-2" />
                  复制
                </Button>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'txt' | 'docx')}
                  className="px-3 py-1 border border-border rounded-md text-sm"
                >
                  <option value="txt">TXT</option>
                  <option value="docx">DOCX</option>
                </select>
                <Button
                  onClick={exportTranscript}
                  variant="outline"
                  size="sm"
                >
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  导出
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {meeting.finalTranscript ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-muted/30 to-muted/50 rounded-xl p-6 border border-border/50">
                <div className="prose max-w-none">
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                    {meeting.finalTranscript}
                  </p>
                </div>
              </div>
              
              {/* Text Statistics */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {meeting.finalTranscript.length}
                  </p>
                  <p className="text-sm text-muted-foreground">字符数</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {meeting.finalTranscript.split(/\s+/).length}
                  </p>
                  <p className="text-sm text-muted-foreground">词数</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {meeting.finalTranscript.split(/[。！？.!?]+/).filter(s => s.trim()).length}
                  </p>
                  <p className="text-sm text-muted-foreground">句数</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileTextIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">暂无会议转录</p>
              <p className="text-sm text-muted-foreground">
                会议结束后将自动生成转录内容
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Speaker Statistics */}
      {speakerStats && Object.keys(speakerStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>发言人统计</CardTitle>
            <CardDescription>会议中各发言人的参与情况</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(Object.values(speakerStats) as Array<{ index: number; segments: number; totalDuration: number }>).map((speaker) => {
                const minutes = Math.floor(speaker.totalDuration / 60);
                const seconds = Math.floor(speaker.totalDuration % 60);
                return (
                  <div key={speaker.index} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-chart-4/30 to-chart-5/30 rounded-full flex items-center justify-center text-foreground font-semibold">
                        {speaker.index + 1}
                      </div>
                      <div>
                        <p className="font-medium">发言人 {speaker.index + 1}</p>
                        <p className="text-sm text-muted-foreground">{speaker.segments} 个发言片段</p>
                      </div>
                    </div>
                    <Badge className={speakerColors[speaker.index % speakerColors.length]}>
                      {minutes}分{seconds}秒
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disputed Issues */}
      {meeting.disputedIssues && meeting.disputedIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>争议问题</CardTitle>
            <CardDescription>需要进一步讨论或解决的问题</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {meeting.disputedIssues.map((issue, index) => (
                <div key={index} className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                  <div className="flex items-start gap-3">
                    <MessageSquareIcon className="w-5 h-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <p className="text-foreground font-medium">{issue.text}</p>
                      {issue.resolved && (
                        <Badge className="mt-2 bg-badge-success">已解决</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MeetingTranscript;
