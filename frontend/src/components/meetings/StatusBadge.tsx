import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type MeetingStatus = 'in_progress' | 'completed' | 'scheduled' | 'failed';
export type AgendaStatus = 'resolved' | 'ongoing' | 'pending';
export type TodoPriority = 'high' | 'medium' | 'low';

interface StatusBadgeProps {
  status: MeetingStatus | AgendaStatus | TodoPriority;
  type?: 'meeting' | 'agenda' | 'priority';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  meeting: {
    in_progress: {
      label: '进行中',
      className: 'bg-gradient-to-r from-green-50/20 to-emerald-50/20 text-green-700 border-green-200/50 shadow-sm',
      dotClass: 'bg-green-500 animate-pulse',
    },
    completed: {
      label: '已完成',
      className: 'bg-gradient-to-r from-gray-50/20 to-slate-50/20 text-gray-700 border-gray-200/50',
      dotClass: 'bg-gray-400',
    },
    scheduled: {
      label: '已安排',
      className: 'bg-gradient-to-r from-blue-50/20 to-sky-50/20 text-blue-700 border-blue-200/50',
      dotClass: 'bg-blue-500',
    },
    failed: {
      label: '失败',
      className: 'bg-gradient-to-r from-red-50/20 to-rose-50/20 text-red-700 border-red-200/50',
      dotClass: 'bg-red-500',
    },
  },
  agenda: {
    resolved: {
      label: '已完成',
      className: 'bg-gradient-to-r from-green-50/20 to-emerald-50/20 text-green-700 border-green-200/50',
      dotClass: 'bg-green-500',
    },
    ongoing: {
      label: '进行中',
      className: 'bg-gradient-to-r from-blue-50/20 to-sky-50/20 text-blue-700 border-blue-200/50',
      dotClass: 'bg-blue-500 animate-pulse',
    },
    pending: {
      label: '待处理',
      className: 'bg-gradient-to-r from-yellow-50/20 to-amber-50/20 text-yellow-700 border-yellow-200/50',
      dotClass: 'bg-yellow-500',
    },
  },
  priority: {
    high: {
      label: '高优先级',
      className: 'bg-gradient-to-r from-red-50/20 to-rose-50/20 text-red-700 border-red-300/50',
      dotClass: 'bg-red-500',
    },
    medium: {
      label: '中优先级',
      className: 'bg-gradient-to-r from-yellow-50/20 to-amber-50/20 text-yellow-700 border-yellow-300/50',
      dotClass: 'bg-yellow-500',
    },
    low: {
      label: '低优先级',
      className: 'bg-gradient-to-r from-green-50/20 to-emerald-50/20 text-green-700 border-green-300/50',
      dotClass: 'bg-green-500',
    },
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-base px-3 py-1',
};

function StatusBadge({ status, type = 'meeting', className, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[type][status as keyof typeof statusConfig[typeof type]];
  
  if (!config) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 font-medium transition-all hover:shadow-md',
        config.className,
        sizeClasses[size],
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dotClass)} />
      {config.label}
    </Badge>
  );
}

export default StatusBadge;
