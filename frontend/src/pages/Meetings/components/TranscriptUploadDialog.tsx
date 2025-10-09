import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileTextIcon,
  UploadIcon,
  ClipboardIcon,
  XIcon,
  AlertCircleIcon,
  CheckCircleIcon
} from 'lucide-react';
import mammoth from 'mammoth';

interface TranscriptUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTranscriptAdd: (content: string, filename?: string) => void;
  isSaving?: boolean;
}

const ACCEPTED_FILE_TYPES = {
  'text/plain': ['.txt'],
  'text/markdown': ['.md', '.markdown'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function TranscriptUploadDialog({ open, onOpenChange, onTranscriptAdd, isSaving = false }: TranscriptUploadDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('文件大小不能超过 10MB');
      return false;
    }

    const isValidType = Object.keys(ACCEPTED_FILE_TYPES).some(type => {
      if (file.type === type) return true;
      const extensions = ACCEPTED_FILE_TYPES[type as keyof typeof ACCEPTED_FILE_TYPES];
      return extensions.some(ext => file.name.toLowerCase().endsWith(ext));
    });

    if (!isValidType) {
      setErrorMessage('仅支持 TXT、MD、MARKDOWN、DOCX 格式的文件');
      return false;
    }

    return true;
  };

  const processFile = async (file: File) => {
    if (!validateFile(file)) {
      setUploadStatus('error');
      return;
    }

    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      const content = await readFileContent(file);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Add a small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 500));

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus('success');

      // Call the callback after a short delay to show success state
      setTimeout(() => {
        onTranscriptAdd(content, file.name);
        resetDialog();
      }, 1000);

    } catch (error) {
      setErrorMessage('文件读取失败，请重试');
      setUploadStatus('error');
      console.error('File processing error:', error);
    }
  };

  const readFileContent = async (file: File): Promise<string> => {
    try {
      // Handle DOCX files with mammoth.js
      if (file.name.toLowerCase().endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });

        if (result.messages && result.messages.length > 0) {
          console.warn('DOCX parsing warnings:', result.messages);
        }

        return result.value;
      }

      // Handle text files (TXT, MD, MARKDOWN)
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          const content = e.target?.result as string;
          resolve(content);
        };

        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };

        reader.readAsText(file, 'UTF-8');
      });
    } catch (error) {
      console.error('Error reading file:', error);
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPastedText(text);

      // Focus the textarea after pasting
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (error) {
      setErrorMessage('无法访问剪贴板，请手动粘贴内容');
      console.error('Clipboard error:', error);
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) {
      setErrorMessage('请输入或粘贴转录内容');
      return;
    }

    onTranscriptAdd(pastedText.trim(), '剪贴板内容');
    resetDialog();
  };

  const resetDialog = () => {
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
    setPastedText('');
    setDragActive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (uploadStatus === 'uploading' || isSaving) return;
    onOpenChange(false);
    resetDialog();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="w-5 h-5" />
            添加会议转录
          </DialogTitle>
          <DialogDescription>
            上传文件或粘贴文本内容作为会议转录记录
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tab Selection */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={activeTab === 'file' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('file')}
              className="flex-1"
            >
              <UploadIcon className="w-4 h-4 mr-2" />
              文件上传
            </Button>
            <Button
              variant={activeTab === 'paste' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('paste')}
              className="flex-1"
            >
              <ClipboardIcon className="w-4 h-4 mr-2" />
              剪贴板粘贴
            </Button>
          </div>

          {activeTab === 'file' ? (
            /* File Upload Tab */
            <div className="space-y-4">
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                } ${uploadStatus === 'uploading' ? 'pointer-events-none opacity-50' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={Object.values(ACCEPTED_FILE_TYPES).flat().join(',')}
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploadStatus === 'uploading'}
                />

                {uploadStatus === 'idle' && (
                  <>
                    <UploadIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold mb-2">拖拽文件到此处或点击选择</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      支持 TXT、MD、MARKDOWN、DOCX 格式，最大 10MB
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {Object.entries(ACCEPTED_FILE_TYPES).map(([type, extensions]) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {extensions.join(', ')}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}

                {uploadStatus === 'uploading' && (
                  <div className="space-y-4">
                    <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <h3 className="font-semibold">正在读取文件...</h3>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}

                {uploadStatus === 'success' && !isSaving && (
                  <div className="space-y-4">
                    <CheckCircleIcon className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <h3 className="font-semibold text-green-600">文件读取成功！</h3>
                  </div>
                )}

                {uploadStatus === 'success' && isSaving && (
                  <div className="space-y-4">
                    <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <h3 className="font-semibold">正在保存转录内容...</h3>
                    <Progress value={95} className="w-full" />
                  </div>
                )}

                {uploadStatus === 'error' && (
                  <div className="space-y-4">
                    <AlertCircleIcon className="w-12 h-12 mx-auto mb-4 text-destructive" />
                    <h3 className="font-semibold text-destructive">读取失败</h3>
                  </div>
                )}
              </div>

              {errorMessage && uploadStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertCircleIcon className="w-4 h-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            /* Paste Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">转录内容</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePasteFromClipboard}
                  className="flex items-center gap-2"
                >
                  <ClipboardIcon className="w-4 h-4" />
                  从剪贴板粘贴
                </Button>
              </div>

              <Textarea
                ref={textareaRef}
                placeholder="请在此处输入或粘贴会议转录内容..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="min-h-[200px] resize-none"
              />

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{pastedText.length} 个字符</span>
                {pastedText.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPastedText('')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <XIcon className="w-4 h-4 mr-1" />
                    清空
                  </Button>
                )}
              </div>

              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircleIcon className="w-4 h-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Dialog Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={uploadStatus === 'uploading' || isSaving}>
              取消
            </Button>
            {activeTab === 'paste' && (
              <Button onClick={handlePasteSubmit} disabled={!pastedText.trim() || isSaving}>
                {isSaving ? '保存中...' : '添加转录'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TranscriptUploadDialog;