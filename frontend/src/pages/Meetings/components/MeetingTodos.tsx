import { Badge } from '@/components/ui/badge';
import { CheckCircleIcon, CircleIcon, UserIcon, CalendarIcon } from 'lucide-react';
import type { Todo } from '@/types/index';

interface MeetingTodosProps {
  todos: Todo[];
}

function MeetingTodos({ todos }: MeetingTodosProps) {

  const getPriorityColor = (priority?: string | null) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive/10 text-destructive border border-destructive/30';
      case 'medium':
        return 'bg-warning/10 text-warning border border-warning/30';
      case 'low':
        return 'bg-success/10 text-success border border-success/30';
      default:
        return 'bg-muted text-muted-foreground border border-border';
    }
  };

  const getPriorityText = (priority?: string | null) => {
    switch (priority) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {todos.map((todo, index) => (
          <div key={index} className="hover:shadow-md transition-shadow">
            <div className="pb-3">
              <div className="flex items-start gap-3 mb-2">
                {todo.completed ? (
                  <CheckCircleIcon className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                ) : (
                  <CircleIcon className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className={`text-base font-medium ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {todo.text}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center ml-8">
                {todo.priority && (
                  <Badge className={getPriorityColor(todo.priority)}>
                    优先级: {getPriorityText(todo.priority)}
                  </Badge>
                )}

                {todo.assignee && (
                  <Badge variant="outline">
                    <UserIcon className="w-3 h-3 mr-1" />
                    {todo.assignee}
                  </Badge>
                )}

                {todo.dueDate && (
                  <Badge variant="outline">
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {todo.dueDate}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MeetingTodos;
