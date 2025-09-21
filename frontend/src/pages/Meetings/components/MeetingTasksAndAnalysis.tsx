import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { apiService } from '@/services/api';
import type { Meeting } from '@/types';
import {
  CheckCircleIcon,
  CircleIcon,
  SparklesIcon,
  TargetIcon,
  TrendingUpIcon,
  ClockIcon,
  AlertCircleIcon,
  LightbulbIcon,
  UsersIcon,
  CalendarIcon,
  BrainIcon,
  RefreshCwIcon,
  AlertTriangleIcon
} from 'lucide-react';

interface MeetingTasksAndAnalysisProps {
  meeting: Meeting;
  onGenerateAdvice: (todo: any) => void;
  generatingAdvice: Record<string, boolean>;
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

function MeetingTasksAndAnalysis({ meeting, onGenerateAdvice, generatingAdvice, onAnalysisComplete }: MeetingTasksAndAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'analysis'>('tasks');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');

  // Task filtering logic
  const todos = meeting.parsedTodos || [];
  const filteredTodos = todos.filter(todo => {
    if (filter === 'completed') return todo.completed;
    if (filter === 'pending') return !todo.completed;
    return true;
  });

  const completedCount = todos.filter(t => t.completed).length;
  const pendingCount = todos.length - completedCount;
  const completionRate = todos.length > 0 ? (completedCount / todos.length) * 100 : 0;

  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-green-100 text-green-800 border-green-300'
  };

  const priorityIcons = {
    high: AlertCircleIcon,
    medium: ClockIcon,
    low: CheckCircleIcon
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

  const handleExtractAnalysis = useCallback(async () => {
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
  }, [meeting._id, meeting.finalTranscript, onAnalysisComplete]);

  const canAnalyze = !!meeting.finalTranscript;
  const hasIssues = analysisData?.disputedIssues && analysisData.disputedIssues.length > 0;
  const hasTodos = analysisData?.todos && analysisData.todos.length > 0;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b">
        <Button
          variant={activeTab === 'tasks' ? 'default' : 'ghost'}
          className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-white"
          onClick={() => setActiveTab('tasks')}
        >
          <TargetIcon className="w-4 h-4 mr-2" />
          任务管理
        </Button>
        <Button
          variant={activeTab === 'analysis' ? 'default' : 'ghost'}
          className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-white ml-2"
          onClick={() => setActiveTab('analysis')}
        >
          <BrainIcon className="w-4 h-4 mr-2" />
          AI分析
        </Button>
      </div>

      {/* Tasks Tab Content */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">总任务数</p>
                    <p className="text-2xl font-bold">{todos.length}</p>
                  </div>
                  <TargetIcon className="w-8 h-8 text-indigo-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">已完成</p>
                    <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                  </div>
                  <CheckCircleIcon className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">待处理</p>
                    <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
                  </div>
                  <CircleIcon className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">完成率</p>
                    <p className="text-2xl font-bold">{completionRate.toFixed(0)}%</p>
                  </div>
                  <TrendingUpIcon className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>任务进度</CardTitle>
              <CardDescription>整体任务完成情况</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={completionRate} className="h-4" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">开始</span>
                  <span className="font-medium text-gray-900">{completionRate.toFixed(1)}% 完成</span>
                  <span className="text-gray-600">完成</span>
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <AlertCircleIcon className="w-6 h-6 text-red-600" />
                    </div>
                    <p className="text-sm text-gray-600">高优先级</p>
                    <p className="font-semibold">{todos.filter(t => t.priority === 'high').length}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <ClockIcon className="w-6 h-6 text-yellow-600" />
                    </div>
                    <p className="text-sm text-gray-600">中优先级</p>
                    <p className="font-semibold">{todos.filter(t => t.priority === 'medium').length}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircleIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-600">低优先级</p>
                    <p className="font-semibold">{todos.filter(t => t.priority === 'low').length}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task List */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>任务列表</CardTitle>
                  <CardDescription>会议相关的待办事项</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                  >
                    全部
                  </Button>
                  <Button
                    variant={filter === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('pending')}
                  >
                    待处理
                  </Button>
                  <Button
                    variant={filter === 'completed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('completed')}
                  >
                    已完成
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTodos.length > 0 ? (
                <div className="space-y-3">
                  {filteredTodos.map((todo) => {
                    const PriorityIcon = priorityIcons[todo.priority || 'low'];
                    return (
                      <div
                        key={todo.id}
                        className={`group p-4 rounded-lg border-2 transition-all duration-200 ${
                          todo.completed 
                            ? 'bg-gray-50 border-gray-200' 
                            : 'bg-white hover:shadow-md border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={todo.completed}
                            disabled
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <p className={`font-medium ${
                                todo.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                              }`}>
                                {todo.text}
                              </p>
                              {todo.priority && (
                                <Badge 
                                  variant="outline" 
                                  className={priorityColors[todo.priority]}
                                >
                                  <PriorityIcon className="w-3 h-3 mr-1" />
                                  {todo.priority === 'high' ? '高' : 
                                   todo.priority === 'medium' ? '中' : '低'}
                                </Badge>
                              )}
                            </div>
                            {todo.assignee && (
                              <p className="text-sm text-gray-600 mb-1">
                                负责人: {todo.assignee}
                              </p>
                            )}
                            {todo.dueDate && (
                              <p className="text-sm text-gray-600">
                                截止日期: {new Date(todo.dueDate).toLocaleDateString('zh-CN')}
                              </p>
                            )}
                          </div>
                          {!todo.completed && (
                            <Button
                              onClick={() => onGenerateAdvice(todo)}
                              disabled={generatingAdvice[todo.id]}
                              variant="outline"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {generatingAdvice[todo.id] ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-600 mr-2" />
                                  生成中...
                                </>
                              ) : (
                                <>
                                  <SparklesIcon className="w-4 h-4 mr-2" />
                                  AI建议
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TargetIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-2">
                    {filter === 'all' ? '暂无任务' : 
                     filter === 'completed' ? '暂无已完成的任务' : '暂无待处理的任务'}
                  </p>
                  <p className="text-sm text-gray-400">
                    任务将从会议转录中自动提取
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Task Insights */}
          {todos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>任务洞察</CardTitle>
                <CardDescription>基于任务数据的分析和建议</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-indigo-50/20 to-purple-50/20 rounded-lg border border-indigo-200/50">
                    <div className="flex items-center gap-3 mb-3">
                      <LightbulbIcon className="w-6 h-6 text-indigo-600" />
                      <h4 className="font-semibold text-gray-900">效率建议</h4>
                    </div>
                    <p className="text-sm text-gray-700">
                      {completionRate < 30 
                        ? '任务完成率较低，建议优先处理高优先级任务'
                        : completionRate < 70
                        ? '任务进展良好，继续保持当前节奏'
                        : '任务完成率优秀，即将完成所有任务'}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-green-50/20 to-emerald-50/20 rounded-lg border border-green-200/50">
                    <div className="flex items-center gap-3 mb-3">
                      <TrendingUpIcon className="w-6 h-6 text-green-600" />
                      <h4 className="font-semibold text-gray-900">进度预测</h4>
                    </div>
                    <p className="text-sm text-gray-700">
                      按当前进度，预计还需要 {Math.ceil(pendingCount / Math.max(completedCount, 1))} 个工作日完成所有任务
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Analysis Tab Content */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          {/* Analysis Controls */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BrainIcon className="w-5 h-5 text-indigo-600" />
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
                    <div className="p-4 bg-gradient-to-br from-indigo-50/20 to-purple-50/20 rounded-lg border border-indigo-200/50">
                      <div className="flex items-center gap-3">
                        <TargetIcon className="w-6 h-6 text-indigo-600" />
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
                                <TargetIcon className="w-4 h-4 text-indigo-600" />
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
      )}
    </div>
  );
}

export default MeetingTasksAndAnalysis;