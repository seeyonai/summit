import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import type { Meeting } from '@/types';
import {
  CheckCircleIcon,
  CircleIcon,
  SparklesIcon,
  TargetIcon,
  TrendingUpIcon,
  ClockIcon,
  AlertCircleIcon,
  LightbulbIcon
} from 'lucide-react';

interface MeetingTasksProps {
  meeting: Meeting;
  onGenerateAdvice: (todo: { id?: string; text: string; completed?: boolean }) => void;
  generatingAdvice: Record<string, boolean>;
}

function MeetingTasks({ meeting, onGenerateAdvice, generatingAdvice }: MeetingTasksProps) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
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
    high: 'bg-badge-destructive',
    medium: 'bg-badge-warning',
    low: 'bg-badge-success'
  };

  const priorityIcons = {
    high: AlertCircleIcon,
    medium: ClockIcon,
    low: CheckCircleIcon
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总任务数</p>
                <p className="text-2xl font-bold">{todos.length}</p>
              </div>
              <TargetIcon className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已完成</p>
                <p className="text-2xl font-bold text-success">{completedCount}</p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">待处理</p>
                <p className="text-2xl font-bold text-warning">{pendingCount}</p>
              </div>
              <CircleIcon className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">完成率</p>
                <p className="text-2xl font-bold">{completionRate.toFixed(0)}%</p>
              </div>
              <TrendingUpIcon className="w-8 h-8 text-accent" />
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
              <span className="text-muted-foreground">开始</span>
              <span className="font-medium text-foreground">{completionRate.toFixed(1)}% 完成</span>
              <span className="text-muted-foreground">完成</span>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <AlertCircleIcon className="w-6 h-6 text-destructive" />
                </div>
                <p className="text-sm text-muted-foreground">高优先级</p>
                <p className="font-semibold">{todos.filter(t => t.priority === 'high').length}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <ClockIcon className="w-6 h-6 text-warning" />
                </div>
                <p className="text-sm text-muted-foreground">中优先级</p>
                <p className="font-semibold">{todos.filter(t => t.priority === 'medium').length}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircleIcon className="w-6 h-6 text-success" />
                </div>
                <p className="text-sm text-muted-foreground">低优先级</p>
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
                        ? 'bg-muted border-border' 
                        : 'bg-background hover:shadow-md border-border hover:border-primary'
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
                            todo.completed ? 'text-muted-foreground line-through' : 'text-foreground'
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
                          <p className="text-sm text-muted-foreground mb-1">
                            负责人: {todo.assignee}
                          </p>
                        )}
                        {todo.dueDate && (
                          <p className="text-sm text-muted-foreground">
                            截止日期: {new Date(todo.dueDate).toLocaleDateString('zh-CN')}
                          </p>
                        )}
                      </div>
                      {!todo.completed && (
                        <Button
                          onClick={() => onGenerateAdvice(todo)}
                          disabled={!!(todo.id && generatingAdvice[todo.id])}
                          variant="outline"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {todo.id && generatingAdvice[todo.id] ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-2" />
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
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <TargetIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-2">
                {filter === 'all' ? '暂无任务' : 
                 filter === 'completed' ? '暂无已完成的任务' : '暂无待处理的任务'}
              </p>
              <p className="text-sm text-muted-foreground">
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
              <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border border-primary/30">
                <div className="flex items-center gap-3 mb-3">
                  <LightbulbIcon className="w-6 h-6 text-primary" />
                  <h4 className="font-semibold text-foreground">效率建议</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {completionRate < 30 
                    ? '任务完成率较低，建议优先处理高优先级任务'
                    : completionRate < 70
                    ? '任务进展良好，继续保持当前节奏'
                    : '任务完成率优秀，即将完成所有任务'}
                </p>
              </div>
              
              <div className="p-4 bg-gradient-to-br from-success/10 to-success/10 rounded-lg border border-success/30">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUpIcon className="w-6 h-6 text-success" />
                  <h4 className="font-semibold text-foreground">进度预测</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  按当前进度，预计还需要 {Math.ceil(pendingCount / Math.max(completedCount, 1))} 个工作日完成所有任务
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MeetingTasks;
