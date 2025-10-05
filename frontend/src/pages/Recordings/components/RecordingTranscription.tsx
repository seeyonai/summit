import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import SearchInput from '@/components/SearchInput';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
/* tooltip and tabs imports removed */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiService } from '@/services/api';
import StatisticsCard from '@/components/StatisticsCard';
import type { Recording } from '@/types';
import { MicIcon, CopyIcon, DownloadIcon, FileTextIcon, SaveIcon, RotateCcwIcon, EyeIcon, HashIcon, EditIcon, XIcon, MessageSquareIcon } from 'lucide-react';
import PipelineStageCard from './PipelineStageCard';
import HotwordSelection from '@/components/HotwordSelection';

interface RecordingTranscriptionProps {
  recording: Recording;
  isEditing: boolean;
  editForm: { transcription?: string; verbatimTranscript?: string };
  setEditForm: (form: { transcription?: string; verbatimTranscript?: string }) => void;
  onRefresh: () => Promise<void>;
  setSuccess: (message: string) => void;
  setError: (message: string) => void;
  onEditToggle: () => void;
}

function RecordingTranscription({
  recording,
  isEditing,
  editForm,
  setEditForm,
  onRefresh,
  setSuccess,
  setError,
  onEditToggle
}: RecordingTranscriptionProps) {
  const [transcribing, setTranscribing] = useState(false);
  const [exportFormat, setExportFormat] = useState<'txt' | 'docx' | 'pdf' | 'srt'>('txt');
  const [searchTerm, setSearchTerm] = useState('');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const autoSaveTimer = useRef<number | null>(null);
  const [viewMode, setViewMode] = useState<'formatted' | 'plain' | 'timeline'>('formatted');
  const [showRedoConfirm, setShowRedoConfirm] = useState(false);
  const [selectedHotwords, setSelectedHotwords] = useState<string[]>(recording.hotwords ?? []);
  const [showHotwordSelection, setShowHotwordSelection] = useState(false);

  useEffect(() => {
    setSelectedHotwords(recording.hotwords ?? []);
  }, [recording.hotwords]);

  const generateTranscription = async () => {
    try {
      setTranscribing(true);
      setTranscriptionProgress(0);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setTranscriptionProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 20;
        });
      }, 1000);
      
      const hotwordParam = selectedHotwords.length > 0 ? selectedHotwords.join(' ') : undefined;
      const { message } = await apiService.transcribeRecording(recording._id, hotwordParam);
      
      clearInterval(progressInterval);
      setTranscriptionProgress(100);
      await onRefresh();
      setSuccess(message || '转录生成成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setTranscribing(false);
      setTimeout(() => setTranscriptionProgress(0), 2000);
    }
  };

  const exportTranscription = async () => {
    if (!recording.transcription) return;

    try {
      let content = recording.transcription;
      let mimeType = 'text/plain';
      let fileExtension = exportFormat;

      switch (exportFormat) {
        case 'txt':
          mimeType = 'text/plain';
          break;
        case 'docx':
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          // For DOCX, we'll create a simple HTML document that Word can open
          content = `<html><body><pre>${content}</pre></body></html>`;
          fileExtension = 'docx';
          break;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const base = (recording as any).originalFileName || `${recording._id}.${recording.format || 'wav'}`;
      const name = base.replace(/\.[^.]+$/, '');
      a.download = `${name}_transcription.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess(`转录已导出为 ${exportFormat.toUpperCase()} 格式`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const copyToClipboard = async () => {
    if (!recording.transcription) return;

    try {
      await navigator.clipboard.writeText(recording.transcription);
      setSuccess('转录已复制到剪贴板');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleAutoSave = useCallback(async () => {
    if (!isEditing || autoSaveStatus === 'saving') return;

    try {
      setAutoSaveStatus('saving');
      // Here you would implement the actual save API call
      // await apiService.updateRecording(recording._id, editForm);
      setAutoSaveStatus('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setAutoSaveStatus('unsaved');
    }
  }, [isEditing, autoSaveStatus, setError]);

  // Auto-save functionality
  useEffect(() => {
    if (!isEditing) return;

    setAutoSaveStatus('unsaved');
    
    if (autoSaveTimer.current) {
      window.clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = window.setTimeout(() => {
      handleAutoSave();
    }, 2000);

    return () => {
      if (autoSaveTimer.current) {
        window.clearTimeout(autoSaveTimer.current);
      }
    };
  }, [editForm.transcription, editForm.verbatimTranscript, isEditing, handleAutoSave]);

  // Note: Alignment UI moved to RecordingAlignment component

  // Search functionality
  const highlightSearchTerm = (text: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-warning/30 text-foreground px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  // Deprecated local playback toggle - replaced by alignment-aware seek (now in RecordingAlignment)

  // Format text based on view mode
  const formatText = (text: string) => {
    if (viewMode === 'plain') return text;
    
    // Simple formatting for better readability
    return text
      .split('\n')
      .map(paragraph => paragraph.trim())
      .filter(p => p.length > 0)
      .join('\n\n');
  };

  // Word count statistics
  const getWordStats = (text: string) => {
    if (!text) return { characters: 0, words: 0, sentences: 0, paragraphs: 0 };
    
    return {
      characters: text.length,
      words: text.split(/\s+/).filter(word => word.length > 0).length,
      sentences: text.split(/[。！？.!?]+/).filter(s => s.trim().length > 0).length,
      paragraphs: text.split('\n\n').filter(p => p.trim().length > 0).length
    };
  };

  // Redo transcript functionality
  const handleRedoTranscription = async () => {
    setShowRedoConfirm(false);
    await generateTranscription();
  };

  const handleHotwordsApply = async (words: string[], useAll: boolean) => {
    const appliedHotwords = useAll
      ? words.filter(Boolean)
      : Array.from(new Set(words.filter(Boolean)));
    const currentHotwords = selectedHotwords;

    if (
      appliedHotwords.length === currentHotwords.length &&
      appliedHotwords.every((word, index) => word === currentHotwords[index])
    ) {
      return;
    }

    setSelectedHotwords(appliedHotwords);

    try {
      await apiService.updateRecording(recording._id, { hotwords: appliedHotwords });
      await onRefresh();
      setSuccess('热词已更新');
    } catch (err) {
      setSelectedHotwords(currentHotwords);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const headerButtons = isEditing ? (
    <>
      <Badge variant={autoSaveStatus === 'saved' ? 'default' : autoSaveStatus === 'saving' ? 'secondary' : 'destructive'}>
        {autoSaveStatus === 'saved' ? '已保存' : autoSaveStatus === 'saving' ? '保存中...' : '未保存'}
      </Badge>
      <Button onClick={handleAutoSave} variant="outline" size="sm" disabled={autoSaveStatus === 'saving'}>
        <SaveIcon className="w-4 h-4 mr-2" />
        手动保存
      </Button>
      <Button onClick={onEditToggle} variant="outline" size="sm">
        <XIcon className="w-4 h-4 mr-2" />
        完成
      </Button>
    </>
  ) : (
    <Button onClick={onEditToggle} variant="outline" size="sm">
      <EditIcon className="w-4 h-4 mr-2" />
      编辑
    </Button>
  );

  const primaryButton = !recording.transcription ? (
    <Button
      onClick={generateTranscription}
      disabled={transcribing}
      className="bg-primary hover:bg-primary/90 text-primary-foreground"
    >
      {transcribing ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          转录中...
        </>
      ) : (
        <>
          <MicIcon className="w-4 h-4 mr-2" />
          开始转录
        </>
      )}
    </Button>
  ) : null;

  const basePrimaryControl = primaryButton ?? headerButtons;

  const hotwordButton = (
    <Button
      onClick={() => setShowHotwordSelection(true)}
      variant="outline"
      size="sm"
    >
      <HashIcon className="w-4 h-4 mr-2" />
      选择热词
      {selectedHotwords.length > 0 && (
        <span className="ml-1">({selectedHotwords.length})</span>
      )}
    </Button>
  );

  const combinedPrimaryControls = (
    <div className="flex items-center gap-2">
      {basePrimaryControl}
      {hotwordButton}
    </div>
  );

  return (
    <>
      <PipelineStageCard
        icon={<FileTextIcon className="w-5 h-5 text-white" />}
        title="转录内容"
        description="音频的文字转录结果"
        primaryButton={combinedPrimaryControls}
        isEmpty={!recording.transcription}
        emptyIcon={<MicIcon className="w-12 h-12" />}
        emptyMessage="暂无转录内容"
      >
      <div className="space-y-4">
        {/* Action Bar */}
        <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <SearchInput
              className="flex-1 min-w-[200px]"
              placeholder="搜索转录内容..."
              value={searchTerm}
              onChange={setSearchTerm}
            />

            {/* View Controls */}
            <Button
              onClick={() => setViewMode(viewMode === 'formatted' ? 'plain' : 'formatted')}
              variant="outline"
              size="sm"
            >
              <EyeIcon className="w-4 h-4 mr-2" />
              {viewMode === 'formatted' ? '纯文本' : '格式化'}
            </Button>
            {/* Alignment actions moved to 对齐 tab */}
            
            <Select value={fontSize} onValueChange={(value: 'sm' | 'base' | 'lg') => setFontSize(value)}>
              <SelectTrigger className="w-[80px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">小</SelectItem>
                <SelectItem value="base">中</SelectItem>
                <SelectItem value="lg">大</SelectItem>
              </SelectContent>
            </Select>

            {/* Export Controls */}
            {recording.transcription && !isEditing && (
              <>
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="sm"
                >
                  <CopyIcon className="w-4 h-4 mr-2" />
                  复制
                </Button>
                <Select value={exportFormat} onValueChange={(value: 'txt' | 'docx') => setExportFormat(value)}>
                  <SelectTrigger className="w-[100px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="txt">TXT</SelectItem>
                    <SelectItem value="docx">DOCX</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={exportTranscription}
                  variant="outline"
                  size="sm"
                >
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  导出
                </Button>
                <Button
                  onClick={() => setShowRedoConfirm(true)}
                  variant="outline"
                  size="sm"
                  disabled={transcribing}
                >
                  <RotateCcwIcon className="w-4 h-4 mr-2" />
                  重新转录
                </Button>
              </>
            )}
        </div>

        {selectedHotwords.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>已选择热词:</span>
            {selectedHotwords.map((word) => (
              <Badge key={word} variant="secondary">
                {word}
              </Badge>
            ))}
          </div>
        )}

        {/* Transcription Progress */}
        {transcribing && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">转录进度</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{Math.round(transcriptionProgress)}%</span>
            </div>
            <Progress value={transcriptionProgress} className="w-full h-2" />
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4 mt-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">转录文本</label>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {getWordStats(editForm.transcription || '').words} 词 · {getWordStats(editForm.transcription || '').characters} 字符
                </div>
              </div>
              <Textarea
                value={editForm.transcription || ''}
                onChange={(e) => setEditForm({...editForm, transcription: e.target.value})}
                className={`min-h-[300px] ${fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base'}`}
                placeholder="输入转录文本"
              />
            </div>
              
            {recording.verbatimTranscript && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">逐字稿</label>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {getWordStats(editForm.verbatimTranscript || '').words} 词 · {getWordStats(editForm.verbatimTranscript || '').characters} 字符
                  </div>
                </div>
                <Textarea
                  value={editForm.verbatimTranscript || ''}
                  onChange={(e) => setEditForm({...editForm, verbatimTranscript: e.target.value})}
                  className={`min-h-[200px] ${fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base'}`}
                  placeholder="输入逐字稿"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 mt-4">
                {/* Transcription Display */}
                <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-gray-800 dark:text-gray-200 whitespace-pre-wrap 
                  ${fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base'}`}>
                  {recording.transcription && (searchTerm
                    ? highlightSearchTerm(formatText(recording.transcription))
                    : formatText(recording.transcription)
                  )}
                </div>
                
                {recording.verbatimTranscript && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">逐字稿</h4>
                    <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-gray-800 dark:text-gray-200 whitespace-pre-wrap border border-gray-200 dark:border-gray-700
                      ${fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base'}`}>
                      {searchTerm ? highlightSearchTerm(recording.verbatimTranscript) : recording.verbatimTranscript}
                    </div>
                  </div>
                )}
                
                {/* Word Statistics */}
                {recording.transcription && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted rounded-lg">
                    <StatisticsCard
                      icon={<FileTextIcon className="w-4 h-4 text-primary" />}
                      label="字符"
                      value={getWordStats(recording.transcription).characters.toLocaleString()}
                      description="文本中的字符总数"
                    />
                    <StatisticsCard
                      icon={<HashIcon className="w-4 h-4 text-accent" />}
                      label="词数"
                      value={getWordStats(recording.transcription).words.toLocaleString()}
                      description="按空白分隔统计"
                    />
                    <StatisticsCard
                      icon={<MessageSquareIcon className="w-4 h-4 text-success" />}
                      label="句数"
                      value={getWordStats(recording.transcription).sentences.toLocaleString()}
                      description="按句号/问号/感叹号划分"
                    />
                    <StatisticsCard
                      icon={<FileTextIcon className="w-4 h-4 text-foreground" />}
                      label="段落"
                      value={getWordStats(recording.transcription).paragraphs.toLocaleString()}
                      description="按空行划分"
                    />
                  </div>
                )}
          </div>
        )}
      </div>
    </PipelineStageCard>

      {/* Dialogs outside the card */}
      {/* Redo Transcript Confirmation Dialog */}
      <Dialog open={showRedoConfirm} onOpenChange={setShowRedoConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认重新转录</DialogTitle>
            <DialogDescription>
              您确定要重新生成转录内容吗？这将覆盖当前的转录结果，此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRedoConfirm(false)}>
              取消
            </Button>
            <Button onClick={handleRedoTranscription} disabled={transcribing}>
              {transcribing ? '处理中...' : '确认重做'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HotwordSelection
        isOpen={showHotwordSelection}
        onClose={() => setShowHotwordSelection(false)}
        onApply={handleHotwordsApply}
        currentHotwords={selectedHotwords}
      />
    </>
  );
}

export default RecordingTranscription;
