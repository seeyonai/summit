import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { apiService } from '@/services/api';
import type { SegmentationModelInfo, SegmentationRequest, SegmentationResponse, SpeakerSegment } from '@/types';

type Segment = SpeakerSegment;
type SegmentationResult = SegmentationResponse;

const SegmentationAnalysis: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordingFile, setRecordingFile] = useState<string>('');
  const [oracleNumSpeakers, setOracleNumSpeakers] = useState<number | null>(null);
  const [modelInfo, setModelInfo] = useState<SegmentationModelInfo | null>(null);
  const [modelInfoLoading, setModelInfoLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SegmentationResult | null>(null);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'upload' | 'recording'>('upload');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;

    const loadModelInfo = async () => {
      try {
        const info = await apiService.getSegmentationModelInfo();
        if (isMounted) {
          setModelInfo(info);
        }
      } catch (err) {
        console.error('Failed to fetch segmentation model info:', err);
      } finally {
        if (isMounted) {
          setModelInfoLoading(false);
        }
      }
    };

    loadModelInfo();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleAnalyzeUpload = async () => {
    if (!selectedFile) {
      setError('请选择一个文件进行分析');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const hasHint = typeof oracleNumSpeakers === 'number' && !Number.isNaN(oracleNumSpeakers);
      const result = await apiService.uploadAndSegment(
        selectedFile,
        hasHint ? { oracleNumSpeakers } : {}
      );

      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生错误');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeRecording = async () => {
    const trimmedPath = recordingFile.trim();
    if (!trimmedPath) {
      setError('请输入录音文件名');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const request: SegmentationRequest = {
        audioFilePath: trimmedPath,
      };

      if (typeof oracleNumSpeakers === 'number' && !Number.isNaN(oracleNumSpeakers)) {
        request.oracleNumSpeakers = oracleNumSpeakers;
      }

      const result = await apiService.analyzeSegmentation(request);

      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生错误');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const getSpeakerColor = (speakerIndex: number | undefined): string => {
    const colors = [
      'bg-blue-100 border-blue-300 text-blue-800',
      'bg-green-100 border-green-300 text-green-800',
      'bg-purple-100 border-purple-300 text-purple-800',
      'bg-pink-100 border-pink-300 text-pink-800',
      'bg-yellow-100 border-yellow-300 text-yellow-800',
    ];
    const safeIndex = speakerIndex !== undefined ? Math.max(0, speakerIndex) % colors.length : 0;
    return colors[safeIndex];
  };

  const getDuration = (segments: Segment[]): number => {
    if (segments.length === 0) return 0;
    return Math.max(...segments.map(s => s.endTime)) - Math.min(...segments.map(s => s.startTime));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight gradient-text">说话人分割分析</h1>
        <p className="text-muted-foreground text-lg">Speaker Diarization - 自动识别不同说话人</p>
      </div>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="text-base font-semibold">模型信息</CardTitle>
          <CardDescription>
            {modelInfoLoading
              ? '模型信息加载中...'
              : modelInfo
                ? modelInfo.description
                : '无法获取模型信息'}
          </CardDescription>
        </CardHeader>
        {modelInfo && (
          <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">模型: {modelInfo.model}</Badge>
            <Badge variant="secondary">版本: {modelInfo.modelRevision}</Badge>
            <Badge variant={modelInfo.available ? 'default' : 'destructive'}>
              {modelInfo.available ? '可用' : '不可用'}
            </Badge>
            <span>任务: {modelInfo.task}</span>
          </CardContent>
        )}
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upload' | 'recording')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            上传音频文件
          </TabsTrigger>
          <TabsTrigger value="recording" className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            分析录音文件
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                上传音频文件
              </CardTitle>
              <CardDescription>
                选择音频文件进行说话人分割分析
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload" className="text-sm font-medium">选择音频文件</Label>
                <div className="relative">
                  <input
                    id="file-upload"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".wav,.mp3,.flac,.m4a"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <span className={selectedFile ? "text-foreground" : "text-muted-foreground"}>
                      {selectedFile ? selectedFile.name : "点击选择音频文件或拖拽到此处"}
                    </span>
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    已选择: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="speaker-count" className="text-sm font-medium">预估说话人数 (可选)</Label>
                <Input
                  id="speaker-count"
                  type="number"
                  min="1"
                  max="10"
                  value={oracleNumSpeakers || ''}
                  onChange={(e) => setOracleNumSpeakers(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="留空自动检测"
                />
              </div>

              <Button 
                onClick={handleAnalyzeUpload} 
                disabled={loading || !selectedFile}
                className="w-full transition-all duration-300 hover:shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    分析中...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    开始分析
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recording" className="space-y-4">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                分析录音文件
              </CardTitle>
              <CardDescription>
                分析已录制的音频文件
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recording-file" className="text-sm font-medium">录音文件名</Label>
                <Input
                  id="recording-file"
                  type="text"
                  value={recordingFile}
                  onChange={(e) => setRecordingFile(e.target.value)}
                  placeholder="例如: recording_123456_20250901_123456.wav"
                />
                <p className="text-sm text-muted-foreground">
                  文件应位于 recordings/ 目录中
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="speaker-count-recording" className="text-sm font-medium">预估说话人数 (可选)</Label>
                <Input
                  id="speaker-count-recording"
                  type="number"
                  min="1"
                  max="10"
                  value={oracleNumSpeakers || ''}
                  onChange={(e) => setOracleNumSpeakers(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="留空自动检测"
                />
              </div>

              <Button 
                onClick={handleAnalyzeRecording}
                disabled={loading || !recordingFile.trim()}
                className="w-full transition-all duration-300 hover:shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    分析中...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    开始分析
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive" className="animate-slide-up">
          <AlertTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            错误
          </AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {results && (
        <div className="space-y-6">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="status-indicator success">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  分析结果
                </div>
              </CardTitle>
              <CardDescription>
                说话人分割分析结果摘要
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg border border-border/50 transition-all duration-300 hover:shadow-sm">
                  <div className="text-sm text-muted-foreground mb-1">检测到的说话人数</div>
                  <div className="text-2xl font-bold gradient-text">
                    {results.segments.length > 0 
                      ? Math.max(...results.segments.map(s => s.speakerIndex)) + 1 
                      : 0}
                  </div>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg border border-border/50 transition-all duration-300 hover:shadow-sm">
                  <div className="text-sm text-muted-foreground mb-1">片段数量</div>
                  <div className="text-2xl font-bold gradient-text">{results.segments.length}</div>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg border border-border/50 transition-all duration-300 hover:shadow-sm">
                  <div className="text-sm text-muted-foreground mb-1">总时长</div>
                  <div className="text-2xl font-bold gradient-text">
                    {formatTime(getDuration(results.segments))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                说话人片段
              </CardTitle>
              <CardDescription>
                详细的说话人分割片段列表
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
                {results.segments.map((segment, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getSpeakerColor(segment.speakerIndex)} transition-all duration-300 hover:shadow-sm hover:scale-[1.02]`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="speaker-badge">
                          说话人 {segment.speakerIndex + 1}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          片段 {index + 1}
                        </span>
                      </div>
                      <div className="text-sm font-medium">
                        {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      时长: {formatTime(segment.endTime - segment.startTime)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                时间轴
              </CardTitle>
              <CardDescription>
                可视化显示说话人时间分布
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="h-12 bg-muted/50 rounded-full overflow-hidden border border-border/50">
                  {results.segments.map((segment, index) => {
                    const totalDuration = getDuration(results.segments);
                    const left = ((segment.startTime - Math.min(...results.segments.map(s => s.startTime))) / totalDuration) * 100;
                    const width = ((segment.endTime - segment.startTime) / totalDuration) * 100;
                    
                    return (
                      <div
                        key={index}
                        className={`absolute h-full timeline-segment ${getSpeakerColor(segment.speakerIndex).replace('border-', 'bg-').replace('300', '400')} border-l border-r border-border/50`}
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                        }}
                        title={`说话人 ${segment.speakerIndex + 1}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`}
                      >
                        <div className="text-xs font-medium px-1 truncate h-full flex items-center justify-center text-white drop-shadow-sm">
                          S{segment.speakerIndex + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(Math.min(...results.segments.map(s => s.startTime)))}</span>
                  <span>{formatTime(Math.max(...results.segments.map(s => s.endTime)))}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SegmentationAnalysis;
