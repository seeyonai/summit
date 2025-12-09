import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ButtonGroup } from '@/components/ui/button-group';
import { Input } from '@/components/ui/input';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Meeting, OrganizedSpeech } from '@/types';
import {
  FileTextIcon,
  CopyIcon,
  DownloadIcon,
  MessageSquareIcon,
  UsersIcon,
  HashIcon,
  EyeIcon,
  SearchIcon,
  XIcon,
  MaximizeIcon,
  MessageSquareTextIcon,
  RefreshCwIcon,
} from 'lucide-react';
import AnnotatedMarkdown from '@/components/AnnotatedMarkdown';
import markdownDocx, { Packer } from 'markdown-docx';
import StatisticsCard from '@/components/StatisticsCard';
import TranscriptUploadDialog from './TranscriptUploadDialog';
import FullscreenMarkdownViewer from './FullscreenMarkdownViewer';
import TranscriptChatPanel from './TranscriptChat/TranscriptChatPanel';
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isGeneratingFromRecordings, setIsGeneratingFromRecordings] = useState(false);
  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false);

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

  const exportComprehensiveDocx = async () => {
    if (!meeting.finalTranscript || allOrganizedSpeeches.length === 0) return;

    try {
      // Build comprehensive markdown document
      let markdown = `# ${meeting.title}\n\n`;

      // Add meeting metadata
      if (meeting.scheduledStart) {
        const date = new Date(meeting.scheduledStart);
        markdown += `**会议时间：** ${date.toLocaleString('zh-CN')}\n\n`;
      }

      // Calculate total duration from recordings
      const totalDuration = sourceRecordings.reduce((sum, recording) => sum + (recording.duration || 0), 0);
      if (totalDuration > 0) {
        const hours = Math.floor(totalDuration / 3600);
        const minutes = Math.floor((totalDuration % 3600) / 60);
        const seconds = Math.floor(totalDuration % 60);
        const durationStr = hours > 0 ? `${hours}小时${minutes}分${seconds}秒` : `${minutes}分${seconds}秒`;
        markdown += `**会议时长：** ${durationStr}\n\n`;
      }

      if (meeting.members && meeting.members.length > 0) {
        markdown += `**参与人数：** ${meeting.members.length}人\n\n`;
      }

      markdown += '---\n\n';

      // Add organized speeches
      markdown += '## 发言整理\n\n';

      const sortedSpeeches = allOrganizedSpeeches.sort((a, b) => a.startTime - b.startTime);

      sortedSpeeches.forEach((speech, index) => {
        const minutes = Math.floor(speech.startTime / 60);
        const seconds = Math.floor(speech.startTime % 60);
        const endMinutes = Math.floor(speech.endTime / 60);
        const endSeconds = Math.floor(speech.endTime % 60);

        markdown += `### 发言人 ${speech.speakerIndex + 1} (${minutes}:${seconds.toString().padStart(2, '0')} - ${endMinutes}:${endSeconds.toString().padStart(2, '0')})\n\n`;

        if (speech.polishedText) {
          markdown += `**整理内容：**\n\n${speech.polishedText}\n\n`;
        }

        if (speech.rawText) {
          markdown += `**原始内容：**\n\n${speech.rawText}\n\n`;
        }

        if (index < sortedSpeeches.length - 1) {
          markdown += '---\n\n';
        }
      });

      markdown += '\n---\n\n';

      // Add full transcript
      markdown += '## 完整会议记录\n\n';
      markdown += meeting.finalTranscript;

      // Convert to DOCX
      const doc = await markdownDocx(markdown);
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meeting.title}_完整会议记录.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Comprehensive export failed:', err);
    }
  };

  const handleGenerateTranscriptFromRecordings = async () => {
    if (!meeting.recordings || meeting.recordings.length === 0) {
      return;
    }

    setIsGeneratingFromRecordings(true);
    try {
      const response = await apiService.generateMeetingFinalTranscript(meeting._id);
      if (response.success && response.finalTranscript && onMeetingUpdate) {
        onMeetingUpdate({
          ...meeting,
          finalTranscript: response.finalTranscript,
        });
      }
    } catch (error) {
      console.error('Failed to generate transcript from recordings:', error);
    } finally {
      setIsGeneratingFromRecordings(false);
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

  const handleTranscriptAdd = async (content: string) => {
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
      recording.speakerSegments.forEach((segment) => {
        const speakerId = `speaker_${segment.speakerIndex}`;
        if (!acc[speakerId]) {
          acc[speakerId] = {
            index: segment.speakerIndex,
            segments: 0,
            totalDuration: 0,
          };
        }
        acc[speakerId].segments++;
        acc[speakerId].totalDuration += segment.endTime - segment.startTime;
      });
    }
    return acc;
  }, {} as Record<string, { index: number; segments: number; totalDuration: number }>);

  const speakerColors = ['bg-badge-info', 'bg-badge-success', 'bg-badge-warning', 'bg-badge-accent', 'bg-badge-primary'];

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
    return parts
      .map((part) =>
        part.toLowerCase() === query.toLowerCase()
          ? `<mark class="bg-yellow-200 dark:bg-yellow-900/50 text-foreground rounded px-0.5">${part}</mark>`
          : part
      )
      .join('');
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
            value={meeting.finalTranscript
              .split(/[。！？.!?]+/)
              .filter((s) => s.trim())
              .length.toLocaleString()}
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="w-5 h-5" />
                  发言整理
                </CardTitle>
                <CardDescription>按发言人整理的会议发言内容</CardDescription>
              </div>
              {meeting.finalTranscript && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={exportComprehensiveDocx} variant="outline" size="sm">
                        <DownloadIcon className="w-4 h-4 mr-2" />
                        导出完整记录
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>导出包含会议信息、发言整理和完整记录的文档</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
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
                          <Badge className={speakerColorClass}>发言人 {speech.speakerIndex + 1}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {minutes}:{seconds.toString().padStart(2, '0')} - {endMinutes}:{endSeconds.toString().padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {speech.polishedText && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">整理内容：</p>
                            <p className="leading-relaxed">{speech.polishedText}</p>
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
                    <TooltipProvider>
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button onClick={() => setIsFullscreen(true)} variant="outline" size="icon">
                            <MaximizeIcon className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>全屏</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button onClick={copyToClipboard} variant="outline" size="icon">
                            <CopyIcon className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>复制</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => setIsRegenerateDialogOpen(true)}
                            variant="outline"
                            size="icon"
                            disabled={isGeneratingFromRecordings || !meeting.recordings || meeting.recordings.length === 0}
                          >
                            <RefreshCwIcon className={`w-4 h-4 ${isGeneratingFromRecordings ? 'animate-spin' : ''}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isGeneratingFromRecordings ? '生成中...' : '重新生成'}</p>
                        </TooltipContent>
                      </Tooltip>
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
                    </TooltipProvider>
                  </div>
                )}
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="搜索会议记录..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-20"
                  />
                  {searchQuery && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{matchCount} 个匹配</span>
                      <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="h-6 w-6 p-0">
                        <XIcon className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>

                <Button onClick={() => setIsChatOpen(true)} variant="outline">
                  <MessageSquareTextIcon className="w-4 h-4 mr-2" />
                  与记录对话
                </Button>
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
                      <div
                        className="text-foreground whitespace-pre-wrap leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: highlightedTranscript || '' }}
                      />
                    ) : (
                      <p className="text-foreground whitespace-pre-wrap leading-relaxed">{meeting.finalTranscript}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <AnnotatedMarkdown content={searchQuery ? highlightedTranscript || '' : meeting.finalTranscript} />
                  </div>
                )}
                {/* AI Warning */}
                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 dark:text-amber-400 text-sm">⚠️</span>
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <p className="font-medium mb-1">AI生成内容警告</p>
                      <p className="text-amber-700 dark:text-amber-300">
                        此文件可能包含由人工智能生成的内容，AI系统可能会产生错误。请仔细核对重要信息，不应完全依赖AI生成的内容做出重要决策。
                      </p>
                    </div>
                  </div>
                </div>
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
                    disabled={isGeneratingFromRecordings || !meeting.recordings || meeting.recordings.length === 0}
                    onClick={handleGenerateTranscriptFromRecordings}
                  >
                    {isGeneratingFromRecordings ? '生成中...' : '根据录音转录'}
                  </Button>
                  <Button onClick={() => setIsUploadDialogOpen(true)}>手工添加...</Button>
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
        <FullscreenMarkdownViewer content={meeting.finalTranscript} onClose={() => setIsFullscreen(false)} />
      )}

      {/* Transcript Chat Panel */}
      {meeting.finalTranscript && (
        <TranscriptChatPanel open={isChatOpen} onOpenChange={setIsChatOpen} meetingId={meeting._id} meetingTitle={meeting.title} />
      )}

      {/* Re-generate Confirmation Dialog */}
      <AlertDialog open={isRegenerateDialogOpen} onOpenChange={setIsRegenerateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重新生成会议记录？</AlertDialogTitle>
            <AlertDialogDescription>
              这将根据会议录音重新生成完整的会议记录。当前的记录内容将被覆盖，此操作无法撤销。确定要继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsRegenerateDialogOpen(false);
                handleGenerateTranscriptFromRecordings();
              }}
            >
              确定重新生成
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MeetingTranscript;
