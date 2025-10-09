import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ButtonGroup } from '@/components/ui/button-group';
import { Input } from '@/components/ui/input';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Meeting, OrganizedSpeech } from '@/types';
import {
  FileTextIcon,
  CopyIcon,
  DownloadIcon,
  MessageSquareIcon,
  UsersIcon,
  HashIcon,
  EyeIcon,
  CodeIcon,
  SearchIcon,
  XIcon,
  MaximizeIcon
} from 'lucide-react';
import AnnotatedMarkdown from '@/components/AnnotatedMarkdown';
import markdownDocx, { Packer } from 'markdown-docx';
import StatisticsCard from '@/components/StatisticsCard';
import TranscriptUploadDialog from './TranscriptUploadDialog';
import FullscreenMarkdownViewer from './FullscreenMarkdownViewer';
import { apiService } from '@/services/api';

interface MeetingTranscriptProps {
  meeting: Meeting;
  onMeetingUpdate?: (meeting: Meeting) => void;
}

function MeetingTranscript({ meeting, onMeetingUpdate }: MeetingTranscriptProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'text' | 'markdown'>('text');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const exportTranscript = async (format: 'txt' | 'docx') => {
    if (!meeting.finalTranscript) return;

    try {
      const content = meeting.finalTranscript;
      
      if (format === 'docx') {
        // Convert markdown to DOCX
        const doc = await markdownDocx(content);
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${meeting.title}_transcript.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Export as plain text
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${meeting.title}_transcript.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
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

  const handleTranscriptAdd = async (content: string, filename?: string) => {
    if (!content.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiService.updateMeetingTranscript(meeting._id, content.trim());

      if (response.success && onMeetingUpdate) {
        onMeetingUpdate(response.meeting);
      }
    } catch (error) {
      console.error('Failed to save transcript:', error);
      // Error is already handled by the API service with toast notification
    } finally {
      setIsSaving(false);
    }
  };

  const sourceRecordings = (meeting.recordings || []).filter((recording) => recording.source !== 'concatenated');

  // Analyze speaker segments if available
  const speakerStats = sourceRecordings.reduce((acc, recording) => {
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
  const combinedOrganizedSpeeches: OrganizedSpeech[] | undefined = sourceRecordings.reduce<OrganizedSpeech[]>((acc, recording) => {
    if (recording.organizedSpeeches && recording.organizedSpeeches.length > 0) {
      return acc.concat(recording.organizedSpeeches);
    }
    return acc;
  }, []);

  // Also check meeting's concatenated recording
  const concatenatedRecordingSpeeches = meeting.concatenatedRecording?.organizedSpeeches || [];

  const allOrganizedSpeeches = [...(combinedOrganizedSpeeches || []), ...concatenatedRecordingSpeeches];

  // Highlight search matches in text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() 
        ? `<mark class="bg-yellow-200 dark:bg-yellow-900/50 text-foreground rounded px-0.5">${part}</mark>`
        : part
    ).join('');
  };

  // Get highlighted transcript for text view
  const highlightedTranscript = useMemo(() => {
    if (!meeting.finalTranscript || !searchQuery.trim()) {
      return meeting.finalTranscript;
    }
    return highlightText(meeting.finalTranscript, searchQuery);
  }, [meeting.finalTranscript, searchQuery]);

  // Count matches
  const matchCount = useMemo(() => {
    if (!meeting.finalTranscript || !searchQuery.trim()) return 0;
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return (meeting.finalTranscript.match(regex) || []).length;
  }, [meeting.finalTranscript, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Text Statistics */}
      {meeting.finalTranscript && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <StatisticsCard
            icon={<FileTextIcon className="w-4 h-4 text-primary" />}
            label="字符数"
            value={meeting.finalTranscript.length.toLocaleString()}
            description="文本中的字符总数"
          />
          <StatisticsCard
            icon={<HashIcon className="w-4 h-4 text-accent" />}
            label="词数"
            value={meeting.finalTranscript.split(/\s+/).filter(Boolean).length.toLocaleString()}
            description="按空白分隔统计"
          />
          <StatisticsCard
            icon={<MessageSquareIcon className="w-4 h-4 text-success" />}
            label="句数"
            value={meeting.finalTranscript.split(/[。！？.!?]+/).filter(s => s.trim()).length.toLocaleString()}
            description="按句号/问号/感叹号划分"
          />
        </div>
      )}

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
      <Card className="relative">
        <CardHeader className="pb-0">
          <div className="space-y-4">
            <div className="pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>会议记录</CardTitle>
                  <CardDescription>完整的会议文字记录</CardDescription>
                </div>
                {meeting.finalTranscript && (
                  <div className="flex gap-2">
                  <ButtonGroup>
                    <Button onClick={() => setViewMode('text')} variant={viewMode === 'text' ? 'default' : 'outline'}>
                      <FileTextIcon className="w-4 h-4 mr-2" />
                      文本
                    </Button>
                    <Button onClick={() => setViewMode('markdown')} variant={viewMode === 'markdown' ? 'default' : 'outline'}>
                      <EyeIcon className="w-4 h-4 mr-2" />
                      预览
                    </Button>
                  </ButtonGroup>
                  <Button onClick={() => setIsFullscreen(true)} variant="outline">
                    <MaximizeIcon className="w-4 h-4 mr-2" />
                    全屏
                  </Button>
                  <Button onClick={copyToClipboard} variant="outline">
                    <CopyIcon className="w-4 h-4 mr-2" />
                    复制
                  </Button>
                  <Select onValueChange={(value) => exportTranscript(value as 'txt' | 'docx')}>
                    <SelectTrigger className="w-[180px]">
                      <DownloadIcon className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="导出" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="txt">文本文件 (.txt)</SelectItem>
                      <SelectItem value="docx">Word 文档 (.docx)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                )}
                {meeting.finalTranscript && (
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="text" placeholder="搜索会议记录..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-20" />
                    {searchQuery && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {matchCount} 个匹配
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="h-6 w-6 p-0">
                          <XIcon className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {meeting.finalTranscript ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-muted/30 to-muted/50 rounded-xl p-6 border border-border/50">
                {viewMode === 'text' ? (
                  <div className="prose max-w-none">
                    {searchQuery ? (
                      <div className="text-foreground whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: highlightedTranscript || '' }} />
                    ) : (
                      <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                        {meeting.finalTranscript}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <AnnotatedMarkdown content={searchQuery ? highlightedTranscript || '' : meeting.finalTranscript} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileTextIcon className="w-12 h-12" />
                </EmptyMedia>
                <EmptyTitle>暂无会议转录</EmptyTitle>
                <EmptyDescription>会议结束后将自动生成转录内容</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={!meeting.recordings || meeting.recordings.length === 0}
                  >
                    根据录音转录
                  </Button>
                  <Button onClick={() => setIsUploadDialogOpen(true)}>
                    手工添加...
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <TranscriptUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onTranscriptAdd={handleTranscriptAdd}
        isSaving={isSaving}
      />

      {/* Fullscreen Markdown Viewer */}
      {isFullscreen && meeting.finalTranscript && (
        <FullscreenMarkdownViewer
          content={meeting.finalTranscript}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
}

export default MeetingTranscript;
