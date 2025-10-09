import { CheckCircle2, Clock, AlertCircle, Calendar, PlayCircle, SkipForward, PauseCircle, XCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { cn } from '@/lib/utils';
import type { AgendaItemStatus } from '@base/types';

interface AgendaStatusBadgeProps {
  status: AgendaItemStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

function AgendaStatusBadge({
  status,
  size = 'sm',
  showIcon = true,
  className
}: AgendaStatusBadgeProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'in_progress':
        return <PlayCircle className="w-4 h-4 text-primary animate-pulse" />;
      case 'scheduled':
        return <Calendar className="w-4 h-4 text-primary" />;
      case 'skipped':
        return <SkipForward className="w-4 h-4 text-warning" />;
      case 'deferred':
        return <PauseCircle className="w-4 h-4 text-warning" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-success/20 text-success';
      case 'in_progress':
        return 'bg-primary/20 text-primary';
      case 'scheduled':
        return 'bg-primary/10 text-primary';
      case 'skipped':
        return 'bg-warning/20 text-warning';
      case 'deferred':
        return 'bg-warning/20 text-warning';
      case 'cancelled':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted/20 text-muted-foreground';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'in_progress':
        return '进行中';
      case 'scheduled':
        return '已排期';
      case 'skipped':
        return '已跳过';
      case 'deferred':
        return '已推迟';
      case 'cancelled':
        return '已取消';
      default:
        return '草稿';
    }
  };

  if (size === 'sm' && showIcon) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {getStatusIcon()}
        <StatusBadge status={status} type="agenda" size="sm" />
      </div>
    );
  }

  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-xs font-medium",
      getStatusColor(),
      className
    )}>
      {showIcon && getStatusIcon()}
      {getStatusText()}
    </span>
  );
}

export default AgendaStatusBadge;