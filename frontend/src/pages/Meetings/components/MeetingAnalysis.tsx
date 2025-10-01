import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiService } from '@/services/api';
import type { Meeting } from '@/types';
import {
  BrainIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  RefreshCwIcon,
  TargetIcon,
  UsersIcon,
  CalendarIcon,
  LightbulbIcon
} from 'lucide-react';

interface MeetingAnalysisProps {
  meeting: Meeting;
  onAnalysisComplete?: () => void;
}

interface AnalysisData {
  disputedIssues: Array<{
    id: string;
    text: string;
    severity: 'low' | 'medium' | 'high';
    parties: string[];
  }>;
  todos: Array<{
    id: string;
    text: string;
    completed: boolean;
    assignee?: string;
    dueDate?: string;
    priority: 'low' | 'medium' | 'high';
    category?: string;
  }>;
  metadata: {
    totalChunks: number;
    processingTime: string;
  };
}

function MeetingAnalysis({ meeting, onAnalysisComplete }: MeetingAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExtractAnalysis = async () => {
    if (!meeting.finalTranscript) {
      setError('会议必须有最终转录才能进行分析');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await apiService.extractTranscriptAnalysis(meeting._id);
      if (result.success) {
        setAnalysisData(result.data);
        onAnalysisComplete?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getSeverityIcon = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return AlertTriangleIcon;
      case 'medium': return ClockIcon;
      case 'low': return CheckCircleIcon;
    }
  };

  const getPriorityColor = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getPriorityIcon = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return AlertTriangleIcon;
      case 'medium': return ClockIcon;
      case 'low': return CheckCircleIcon;
    }
  };

  const canAnalyze = !!meeting.finalTranscript;
  const hasIssues = analysisData?.disputedIssues && analysisData.disputedIssues.length > 0;
  const hasTodos = analysisData?.todos && analysisData.todos.length > 0;

  return (
    <div className="space-y-6">
      {/* Analysis Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BrainIcon className="w-5 h-5 text-blue-600" />
                AI 转录分析
              </CardTitle>
              <CardDescription>
                使用 AI 从会议转录中提取争议问题和任务
              </CardDescription>
            </div>
            <Button
              onClick={handleExtractAnalysis}
              disabled={!canAnalyze || isAnalyzing}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCwIcon className="w-4 h-4 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <BrainIcon className="w-4 h-4" />
                  开始分析
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!canAnalyze && (
            <Alert>
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                此会议还没有最终转录。请先生成最终转录后再进行分析。
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {analysisData && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-50/20 to-purple-50/20 rounded-lg border border-blue-200/50">
                  <div className="flex items-center gap-3">
                    <TargetIcon className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">分析状态</p>
                      <p className="font-semibold text-gray-900">已完成</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gradient-to-br from-green-50/20 to-emerald-50/20 rounded-lg border border-green-200/50">
                  <div className="flex items-center gap-3">
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">发现问题</p>
                      <p className="font-semibold text-gray-900">{analysisData.disputedIssues.length} 个争议</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gradient-to-br from-blue-50/20 to-cyan-50/20 rounded-lg border border-blue-200/50">
                  <div className="flex items-center gap-3">
                    <LightbulbIcon className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">提取任务</p>
                      <p className="font-semibold text-gray-900">{analysisData.todos.length} 个任务</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p>处理了 {analysisData.metadata.totalChunks} 个文本块，耗时 {new Date(analysisData.metadata.processingTime).toLocaleTimeString('zh-CN')}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisData && (
        <>
          {/* Disputed Issues */}
          {hasIssues && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangleIcon className="w-5 h-5" />
                  争议问题 ({analysisData.disputedIssues.length})
                </CardTitle>
                <CardDescription>
                  从会议转录中识别出的争议点和讨论焦点
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisData.disputedIssues.map((issue) => {
                    const SeverityIcon = getSeverityIcon(issue.severity);
                    return (
                      <div
                        key={issue.id}
                        className="p-4 border-2 rounded-lg transition-all duration-200 hover:shadow-md"
                        style={{ borderColor: issue.severity === 'high' ? '#ef4444' : issue.severity === 'medium' ? '#f59e0b' : '#10b981' }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            issue.severity === 'high' ? 'bg-red-100' :
                            issue.severity === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                          }`}>
                            <SeverityIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-medium text-gray-900">{issue.text}</p>
                              <Badge 
                                variant="outline" 
                                className={getSeverityColor(issue.severity)}
                              >
                                <SeverityIcon className="w-3 h-3 mr-1" />
                                {issue.severity === 'high' ? '高' : 
                                 issue.severity === 'medium' ? '中' : '低'}
                              </Badge>
                            </div>
                            
                            {issue.parties.length > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                <UsersIcon className="w-4 h-4 text-gray-500" />
                                <p className="text-sm text-gray-600">
                                  涉及方: {issue.parties.join(', ')}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Extracted Todos */}
          {hasTodos && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <LightbulbIcon className="w-5 h-5" />
                  提取的任务 ({analysisData.todos.length})
                </CardTitle>
                <CardDescription>
                  从会议讨论中识别的行动项和待办事项
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisData.todos.map((todo) => {
                    const PriorityIcon = getPriorityIcon(todo.priority);
                    return (
                      <div
                        key={todo.id}
                        className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-6 h-6 mt-1">
                            <TargetIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-medium text-gray-900">{todo.text}</p>
                              {todo.priority && (
                                <Badge 
                                  variant="outline" 
                                  className={getPriorityColor(todo.priority)}
                                >
                                  <PriorityIcon className="w-3 h-3 mr-1" />
                                  {todo.priority === 'high' ? '高' : 
                                   todo.priority === 'medium' ? '中' : '低'}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              {todo.assignee && (
                                <div className="flex items-center gap-1">
                                  <UsersIcon className="w-4 h-4" />
                                  <span>负责人: {todo.assignee}</span>
                                </div>
                              )}
                              
                              {todo.dueDate && (
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="w-4 h-4" />
                                  <span>截止: {new Date(todo.dueDate).toLocaleDateString('zh-CN')}</span>
                                </div>
                              )}
                              
                              {todo.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {todo.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Results */}
          {!hasIssues && !hasTodos && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BrainIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-2">
                    暂未发现争议问题或任务
                  </p>
                  <p className="text-sm text-gray-400">
                    可能转录内容中未包含明显的争议点或行动项
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default MeetingAnalysis;