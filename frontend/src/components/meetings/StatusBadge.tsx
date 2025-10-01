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
      className: 'bg-badge-success shadow-sm',
      dotClass: 'bg-success animate-pulse',
    },
    completed: {
      label: '已完成',
      className: 'bg-badge-muted',
      dotClass: 'bg-muted-foreground',
    },
    scheduled: {
      label: '已排期',
      className: 'bg-badge-info',
      dotClass: 'bg-primary',
    },
    failed: {
      label: '失败',
      className: 'bg-badge-destructive',
      dotClass: 'bg-destructive',
    },
  },
  agenda: {
    resolved: {
      label: '已完成',
      className: 'bg-gradient-to-r from-green-500/5 to-emerald-500/5 text-green-700 border-green-500/20',
      dotClass: 'bg-green-500',
    },
    ongoing: {
      label: '进行中',
      className: 'bg-gradient-to-r from-primary/5 to-accent/5 text-primary border-primary/20',
      dotClass: 'bg-primary animate-pulse',
    },
    pending: {
      label: '待处理',
      className: 'bg-gradient-to-r from-yellow-500/5 to-amber-500/5 text-yellow-700 border-yellow-500/20',
      dotClass: 'bg-yellow-500',
    },
  },
  priority: {
    high: {
      label: '高优先级',
      className: 'bg-gradient-to-r from-destructive/5 to-rose-500/5 text-destructive border-destructive/30',
      dotClass: 'bg-destructive',
    },
    medium: {
      label: '中优先级',
      className: 'bg-gradient-to-r from-yellow-500/5 to-amber-500/5 text-yellow-700 border-yellow-500/30',
      dotClass: 'bg-yellow-500',
    },
    low: {
      label: '低优先级',
      className: 'bg-gradient-to-r from-green-500/5 to-emerald-500/5 text-green-700 border-green-500/30',
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
  const typeConfig = statusConfig[type] as Record<string, { label: string; className: string; dotClass: string }>;
  const currentStatusConfig = typeConfig[status];

  if (!currentStatusConfig) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 font-medium transition-all hover:shadow-md',
        currentStatusConfig.className,
        sizeClasses[size],
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', currentStatusConfig.dotClass)} />
      {currentStatusConfig.label}
    </Badge>
  );
}

export default StatusBadge;
