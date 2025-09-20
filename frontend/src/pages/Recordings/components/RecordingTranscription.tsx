import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import {
  MicIcon,
  CopyIcon,
  DownloadIcon,
  SearchIcon,
  FileTextIcon,
  FileIcon,
  SaveIcon,
  RotateCcwIcon,
  EyeIcon,
  EditIcon,
  Volume2Icon
} from 'lucide-react';

interface RecordingTranscriptionProps {
  recording: Recording;
  isEditing: boolean;
  editForm: { transcription?: string; verbatimTranscript?: string };
  setEditForm: (form: { transcription?: string; verbatimTranscript?: string }) => void;
  onRefresh: () => Promise<void>;
  setSuccess: (message: string) => void;
  setError: (message: string) => void;
}

function RecordingTranscription({
  recording,
  isEditing,
  editForm,
  setEditForm,
  onRefresh,
  setSuccess,
  setError
}: RecordingTranscriptionProps) {
  const [transcribing, setTranscribing] = useState(false);
  const [exportFormat, setExportFormat] = useState<'txt' | 'docx'>('txt');
  const [searchTerm, setSearchTerm] = useState('');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const [viewMode, setViewMode] = useState<'formatted' | 'plain'>('formatted');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showRedoConfirm, setShowRedoConfirm] = useState(false);

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
      
      const { message } = await apiService.transcribeRecording(recording._id);
      
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
          fileExtension = 'doc';
          break;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recording.filename.replace('.wav', '')}_transcription.${fileExtension}`;
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

  // Auto-save functionality
  useEffect(() => {
    if (!isEditing) return;

    setAutoSaveStatus('unsaved');
    
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(() => {
      handleAutoSave();
    }, 2000);

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [editForm.transcription, editForm.verbatimTranscript, isEditing]);

  const handleAutoSave = async () => {
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
  };

  // Search functionality
  const highlightSearchTerm = (text: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-black px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  // Audio playback functionality
  const toggleAudioPlayback = () => {
    if (!audioRef.current) {
      // For now, we'll just simulate audio playback
      setIsPlaying(!isPlaying);
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileTextIcon className="w-5 h-5" />
                转录内容
              </CardTitle>
              <CardDescription>音频的文字转录结果</CardDescription>
            </div>
            {isEditing && (
              <div className="flex items-center gap-2">
                <Badge variant={autoSaveStatus === 'saved' ? 'default' : autoSaveStatus === 'saving' ? 'secondary' : 'destructive'}>
                  {autoSaveStatus === 'saved' ? '已保存' : autoSaveStatus === 'saving' ? '保存中...' : '未保存'}
                </Badge>
                <Button
                  onClick={handleAutoSave}
                  variant="outline"
                  size="sm"
                  disabled={autoSaveStatus === 'saving'}
                >
                  <SaveIcon className="w-4 h-4 mr-2" />
                  手动保存
                </Button>
              </div>
            )}
          </div>

          {/* Enhanced Action Bar */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="搜索转录内容..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setViewMode(viewMode === 'formatted' ? 'plain' : 'formatted')}
                variant="outline"
                size="sm"
              >
                <EyeIcon className="w-4 h-4 mr-2" />
                {viewMode === 'formatted' ? '纯文本' : '格式化'}
              </Button>
              
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as 'sm' | 'base' | 'lg')}
                className="px-2 py-1 border border-gray-200 rounded-md text-sm"
              >
                <option value="sm">小</option>
                <option value="base">中</option>
                <option value="lg">大</option>
              </select>
            </div>

            {/* Audio Controls */}
            {recording.transcription && (
              <Button
                onClick={toggleAudioPlayback}
                variant="outline"
                size="sm"
              >
                <Volume2Icon className="w-4 h-4 mr-2" />
                {isPlaying ? '暂停' : '播放'}
              </Button>
            )}

            {/* Export Controls */}
            {recording.transcription && !isEditing && (
              <div className="flex items-center gap-2">
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
                  className="px-2 py-1 border border-gray-200 rounded-md text-sm"
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
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            {/* Transcription Progress */}
            {transcribing && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">转录进度</span>
                  <span className="text-sm font-medium">{Math.round(transcriptionProgress)}%</span>
                </div>
                <Progress value={transcriptionProgress} className="w-full" />
              </div>
            )}

            {/* Enhanced Editing Interface */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">转录文本</label>
                  <div className="text-xs text-gray-500">
                    {getWordStats(editForm.transcription || '').words} 词 · {getWordStats(editForm.transcription || '').characters} 字符
                  </div>
                </div>
                <textarea
                  value={editForm.transcription || ''}
                  onChange={(e) => setEditForm({...editForm, transcription: e.target.value})}
                  className={`w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[300px] focus:outline-none focus:ring-2 focus:ring-blue-500 
                    ${fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base'}`}
                  placeholder="输入转录文本"
                />
              </div>
              
              {recording.verbatimTranscript && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">逐字稿</label>
                    <div className="text-xs text-gray-500">
                      {getWordStats(editForm.verbatimTranscript || '').words} 词 · {getWordStats(editForm.verbatimTranscript || '').characters} 字符
                    </div>
                  </div>
                  <textarea
                    value={editForm.verbatimTranscript || ''}
                    onChange={(e) => setEditForm({...editForm, verbatimTranscript: e.target.value})}
                    className={`w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500 
                      ${fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base'}`}
                    placeholder="输入逐字稿"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Transcription Progress */}
            {transcribing && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">转录进度</span>
                  <span className="text-sm font-medium">{Math.round(transcriptionProgress)}%</span>
                </div>
                <Progress value={transcriptionProgress} className="w-full" />
              </div>
            )}

            {recording.transcription ? (
              <>
                {/* Enhanced Transcription Display */}
                <div className="prose max-w-none">
                  <div className={`bg-gray-50 rounded-lg p-6 text-gray-800 whitespace-pre-wrap 
                    ${fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base'}`}>
                    {searchTerm ? highlightSearchTerm(formatText(recording.transcription)) : formatText(recording.transcription)}
                  </div>
                </div>
                
                {recording.verbatimTranscript && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">逐字稿</h4>
                      <div className={`bg-purple-50 rounded-lg p-6 text-purple-900 whitespace-pre-wrap 
                        ${fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base'}`}>
                        {searchTerm ? highlightSearchTerm(recording.verbatimTranscript) : recording.verbatimTranscript}
                      </div>
                    </div>
                  </>
                )}
                
                {/* Enhanced Word Statistics */}
                <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {getWordStats(recording.transcription).characters}
                    </p>
                    <p className="text-sm text-gray-600">字符数</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {getWordStats(recording.transcription).words}
                    </p>
                    <p className="text-sm text-gray-600">词数</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {getWordStats(recording.transcription).sentences}
                    </p>
                    <p className="text-sm text-gray-600">句数</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {getWordStats(recording.transcription).paragraphs}
                    </p>
                    <p className="text-sm text-gray-600">段落数</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <MicIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">暂无转录内容</p>
                <Button
                  onClick={generateTranscription}
                  disabled={transcribing}
                  className="flex items-center gap-2"
                >
                  {transcribing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      转录中...
                    </>
                  ) : (
                    <>
                      <MicIcon className="w-4 h-4" />
                      开始转录
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
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
    </Card>
  );
}

export default RecordingTranscription;
