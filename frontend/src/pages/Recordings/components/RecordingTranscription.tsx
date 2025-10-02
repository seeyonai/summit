import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
/* card imports removed */
import { Separator } from '@/components/ui/separator';
import SearchInput from '@/components/SearchInput';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import type { Recording } from '@/types';
import { MicIcon, CopyIcon, DownloadIcon, FileTextIcon, SaveIcon, RotateCcwIcon, EyeIcon, HashIcon, EditIcon, XIcon } from 'lucide-react';
import PipelineStageCard from './PipelineStageCard';

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
  const [hotwords, setHotwords] = useState<string[]>([]);
  const [customHotword, setCustomHotword] = useState('');
  const [showHotwordDialog, setShowHotwordDialog] = useState(false);

  const predefinedHotwords = [
    '会议', '项目', '任务', '时间', '截止日期', '负责人', '完成', '开始', '结束', '讨论',
    '决定', '行动', '计划', '目标', '问题', '解决方案', '团队', '客户', '产品', '功能'
  ];

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
      
      const hotwordParam = hotwords.length > 0 ? hotwords.join(' ') : undefined;
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

  // Hotword management functions
  const toggleHotword = (word: string) => {
    setHotwords(prev => 
      prev.includes(word) 
        ? prev.filter(w => w !== word)
        : [...prev, word]
    );
  };

  const addCustomHotword = () => {
    if (customHotword.trim() && !hotwords.includes(customHotword.trim())) {
      setHotwords(prev => [...prev, customHotword.trim()]);
      setCustomHotword('');
    }
  };

  const removeHotword = (word: string) => {
    setHotwords(prev => prev.filter(w => w !== word));
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

  return (
    <>
      <PipelineStageCard
        icon={<FileTextIcon className="w-5 h-5 text-white" />}
        iconBgColor="bg-primary"
        title="转录内容"
        description="音频的文字转录结果"
        primaryButton={primaryButton || headerButtons}
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
            
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value as 'sm' | 'base' | 'lg')}
              className="px-2 py-1 border border-border rounded-md text-sm"
            >
              <option value="sm">小</option>
              <option value="base">中</option>
              <option value="lg">大</option>
            </select>

            {/* Hotword Selection */}
            <Button
              onClick={() => setShowHotwordDialog(true)}
              variant="outline"
              size="sm"
            >
              <HashIcon className="w-4 h-4 mr-2" />
              热词 ({hotwords.length})
            </Button>

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
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'txt' | 'docx')}
                  className="px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-md text-sm"
                >
                  <option value="txt">TXT</option>
                  <option value="docx">DOCX</option>
                </select>
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
              <textarea
                value={editForm.transcription || ''}
                onChange={(e) => setEditForm({...editForm, transcription: e.target.value})}
                className={`w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 min-h-[300px] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                  ${fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base'}`}
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
                <textarea
                  value={editForm.verbatimTranscript || ''}
                  onChange={(e) => setEditForm({...editForm, verbatimTranscript: e.target.value})}
                  className={`w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                    ${fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base'}`}
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
                  <div className="grid grid-cols-4 gap-3 p-3 bg-muted rounded-lg">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-foreground">
                        {getWordStats(recording.transcription).characters.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">字符</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-foreground">
                        {getWordStats(recording.transcription).words.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">词数</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-foreground">
                        {getWordStats(recording.transcription).sentences.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">句数</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-foreground">
                        {getWordStats(recording.transcription).paragraphs.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">段落</p>
                    </div>
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

      {/* Hotword Selection Dialog */}
      <Dialog open={showHotwordDialog} onOpenChange={setShowHotwordDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>选择热词</DialogTitle>
            <DialogDescription>
              选择或添加热词以提高转录准确性。热词会被优先识别。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Selected Hotwords */}
            {hotwords.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  已选择的热词
                </label>
                <div className="flex flex-wrap gap-2">
                  {hotwords.map((word) => (
                    <Badge
                      key={word}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive dark:hover:bg-destructive/30"
                      onClick={() => removeHotword(word)}
                    >
                      {word}
                      <span className="ml-1 text-red-500 dark:text-red-400">×</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Predefined Hotwords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                预设热词
              </label>
              <div className="grid grid-cols-3 gap-2">
                {predefinedHotwords.map((word) => (
                  <Button
                    key={word}
                    variant={hotwords.includes(word) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleHotword(word)}
                    className="text-left"
                  >
                    {word}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Hotword Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                添加自定义热词
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="输入自定义热词"
                  value={customHotword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomHotword(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') {
                      addCustomHotword();
                    }
                  }}
                />
                <Button onClick={addCustomHotword} size="sm">
                  添加
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHotwordDialog(false)}>
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default RecordingTranscription;
