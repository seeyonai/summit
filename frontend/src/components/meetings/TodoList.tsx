import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Sparkles, Calendar, Target, ChevronRight } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { cn } from '@/lib/utils';
import { formatShortDate } from '@/utils/date';

interface Todo {
  id?: string;
  text: string;
  completed?: boolean;
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
}

interface TodoListProps {
  todos: Todo[];
  onGenerateAdvice?: (todo: Todo) => void;
  generatingAdvice?: Record<string, boolean>;
  className?: string;
}

function TodoList({ todos, onGenerateAdvice, generatingAdvice = {}, className }: TodoListProps) {
  const [expandedTodos, setExpandedTodos] = useState<Set<string>>(new Set());

  if (!todos || todos.length === 0) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">暂无待办事项</p>
        </CardContent>
      </Card>
    );
  }

  const toggleExpanded = (todoId: string) => {
    setExpandedTodos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(todoId)) {
        newSet.delete(todoId);
      } else {
        newSet.add(todoId);
      }
      return newSet;
    });
  };

  const completedCount = todos.filter(todo => todo.completed).length;
  const progressPercentage = (completedCount / todos.length) * 100;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/10 border-b">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/20">
                <Target className="w-5 h-5 text-primary" />
              </div>
              待办事项
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {completedCount}/{todos.length} 已完成
              </span>
            </CardTitle>
          </div>
          <CardDescription>从会议转录中提取的待办事项</CardDescription>
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary/30 to-primary/30 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {todos.map((todo, index) => {
            const todoId = todo.id || `todo-${index}`;
            const isExpanded = expandedTodos.has(todoId);
            const isGenerating = generatingAdvice[todoId];

            return (
              <div
                key={todoId}
                className={cn(
                  'group transition-all',
                  todo.completed 
                    ? 'bg-muted/30 hover:bg-muted/50' 
                    : 'hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/10'
                )}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleExpanded(todoId)}
                      className="flex-shrink-0 mt-0.5 transition-transform hover:scale-110"
                    >
                      {todo.completed ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm leading-relaxed break-words',
                        todo.completed && 'line-through text-muted-foreground'
                      )}>
                        {todo.text}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {todo.priority && (
                          <StatusBadge status={todo.priority} type="priority" size="sm" />
                        )}
                        {todo.dueDate && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatShortDate(todo.dueDate)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {onGenerateAdvice && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onGenerateAdvice(todo)}
                          disabled={isGenerating || todo.completed}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
                          title="生成AI建议"
                        >
                          {isGenerating ? (
                            <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      <button
                        onClick={() => toggleExpanded(todoId)}
                        className={cn(
                          'p-1 rounded transition-transform',
                          isExpanded && 'rotate-90'
                        )}
                      >
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 pl-8 space-y-2">
                      <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/10 border border-primary/30">
                        <p className="text-xs text-muted-foreground mb-1">任务详情</p>
                        <p className="text-sm">{todo.text}</p>
                        {onGenerateAdvice && !todo.completed && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onGenerateAdvice(todo)}
                            disabled={isGenerating}
                            className="mt-2 gap-1.5 text-xs hover:bg-primary/10 hover:text-primary hover:border-primary"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            获取AI建议
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default TodoList;
