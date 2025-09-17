import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const backendScheme = location.protocol === 'https:' ? 'https://' : 'http://';
const BACKEND_BASE_URL = `${backendScheme}localhost:2591`;
const OFFLINE_BACKEND_URL = BACKEND_BASE_URL;
const RECORDINGS_BASE_URL = BACKEND_BASE_URL;

interface TranscriptionResult {
  text: string;
  processing_time: number;
  audio_duration?: number;
  file_size?: number;
}

interface RecordingFile {
  filename: string;
  size: number;
  created: string;
  url: string;
}

const OfflineTranscription: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordingFile, setRecordingFile] = useState<string>('');
  const [hotword, setHotword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'upload' | 'recording'>('upload');
  const [recordings, setRecordings] = useState<RecordingFile[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available recordings
  const fetchRecordings = async () => {
    setLoadingRecordings(true);
    try {
      // This is a mock implementation - in a real app, you'd have an endpoint to list recordings
      // For now, we'll simulate with some example recordings
      const mockRecordings: RecordingFile[] = [
        {
          filename: 'recording_20240101_120000.wav',
          size: 1024000,
          created: '2024-01-01 12:00:00',
          url: `${RECORDINGS_BASE_URL}/recordings/recording_20240101_120000.wav`
        }
      ];
      setRecordings(mockRecordings);
    } catch (err) {
      console.error('Failed to fetch recordings:', err);
    } finally {
      setLoadingRecordings(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'recording') {
      fetchRecordings();
    }
  }, [activeTab]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleUploadAndTranscribe = async () => {
    if (!selectedFile) {
      setError('请选择一个音频文件');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (hotword.trim()) {
        formData.append('hotword', hotword.trim());
      }

      const response = await fetch(`${OFFLINE_BACKEND_URL}/api/offline/upload-transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '转录失败');
      }

      const result: TranscriptionResult = await response.json();
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '转录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordingTranscribe = async () => {
    if (!recordingFile) {
      setError('请选择一个录音文件');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const requestBody: {
        audioFilePath: string;
        hotword?: string;
      } = {
        audioFilePath: recordingFile
      };

      if (hotword.trim()) {
        requestBody.hotword = hotword.trim();
      }

      const response = await fetch(`${OFFLINE_BACKEND_URL}/api/offline/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '转录失败');
      }

      const result: TranscriptionResult = await response.json();
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '转录失败');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">离线语音转录</h1>
        <p className="text-muted-foreground">上传音频文件进行高质量的离线转录</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upload' | 'recording')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">上传文件转录</TabsTrigger>
          <TabsTrigger value="recording">录音文件转录</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>上传音频文件</CardTitle>
              <CardDescription>
                选择音频文件进行离线转录
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-select">选择音频文件</Label>
                <input
                  id="file-select"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="audio/*,.wav,.mp3,.flac,.m4a,.mp4,.aac,.ogg"
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                >
                  选择音频文件
                </Button>
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    已选择: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="hotword-upload">热词（可选）</Label>
                <Textarea
                  id="hotword-upload"
                  value={hotword}
                  onChange={(e) => setHotword(e.target.value)}
                  placeholder="输入热词，用空格分隔，如：致远互联 知识中台"
                  className="min-h-[60px]"
                />
              </div>

              <Button 
                onClick={handleUploadAndTranscribe}
                disabled={!selectedFile || loading}
                className="w-full"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    转录中...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    开始转录
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recording" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>选择录音文件</CardTitle>
              <CardDescription>
                从已录制的音频文件中选择进行转录
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingRecordings ? (
                <div className="flex justify-center items-center py-4">
                  <LoadingSpinner size="md" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="recording-select">选择录音文件</Label>
                  <Select value={recordingFile} onValueChange={setRecordingFile}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择录音文件" />
                    </SelectTrigger>
                    <SelectContent>
                      {recordings.map((recording) => (
                        <SelectItem key={recording.filename} value={recording.filename}>
                          {recording.filename} ({formatFileSize(recording.size)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="hotword-recording">热词（可选）</Label>
                <Textarea
                  id="hotword-recording"
                  value={hotword}
                  onChange={(e) => setHotword(e.target.value)}
                  placeholder="输入热词，用空格分隔，如：致远互联 知识中台"
                  className="min-h-[60px]"
                />
              </div>

              <Button 
                onClick={handleRecordingTranscribe}
                disabled={!recordingFile || loading}
                className="w-full"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    转录中...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    开始转录
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>转录结果</CardTitle>
            <CardDescription>
              音频文件的转录文本和相关信息
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="whitespace-pre-wrap text-sm">
                {results.text}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">处理时间</div>
                <div className="text-lg font-bold text-blue-800">
                  {results.processing_time.toFixed(2)} 秒
                </div>
              </div>
              
              {results.audio_duration && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">音频时长</div>
                  <div className="text-lg font-bold text-green-800">
                    {formatDuration(results.audio_duration)}
                  </div>
                </div>
              )}
              
              {results.file_size && (
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">文件大小</div>
                  <div className="text-lg font-bold text-purple-800">
                    {formatFileSize(results.file_size)}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => {
                  const text = results.text;
                  navigator.clipboard.writeText(text).then(() => {
                    alert('已复制到剪贴板！');
                  });
                }}
                variant="outline"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  复制文本
                </div>
              </Button>
              
              <Button
                onClick={() => {
                  const blob = new Blob([results.text], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `transcription_${new Date().getTime()}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  下载文本
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
          <CardDescription>
            了解如何使用离线转录功能
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">格式支持</Badge>
              <span className="text-sm">WAV、MP3、FLAC、M4A、MP4、AAC、OGG</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">热词功能</Badge>
              <span className="text-sm">提高特定词汇的识别准确率</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">转录结果</Badge>
              <span className="text-sm">支持复制和下载</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">录音文件</Badge>
              <span className="text-sm">可处理之前录制的音频</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OfflineTranscription;
