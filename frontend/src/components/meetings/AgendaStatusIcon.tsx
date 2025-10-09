import { CheckCircle2, Clock, AlertCircle, Calendar, PlayCircle, SkipForward, PauseCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgendaItemStatus } from '@base/types';

interface AgendaStatusIconProps {
  status: AgendaItemStatus;
  isActive?: boolean;
  className?: string;
}

function AgendaStatusIcon({ status, isActive = false, className }: AgendaStatusIconProps) {
  const getIconAndColor = () => {
    switch (status) {
      case 'completed':
        return { Icon: CheckCircle2, color: 'text-success' };
      case 'in_progress':
        return { Icon: PlayCircle, color: 'text-primary' };
      case 'scheduled':
        return { Icon: Calendar, color: 'text-primary' };
      case 'skipped':
        return { Icon: SkipForward, color: 'text-warning' };
      case 'deferred':
        return { Icon: PauseCircle, color: 'text-warning' };
      case 'cancelled':
        return { Icon: XCircle, color: 'text-destructive' };
      case 'draft':
      default:
        return { Icon: Clock, color: 'text-muted-foreground' };
    }
  };

  const { Icon, color } = getIconAndColor();

  if (isActive) {
    return (
      <div className="relative">
        <Icon className={cn('w-5 h-5', color, className)} />
        <div className={cn('absolute inset-0 w-5 h-5 rounded-full animate-ping opacity-15', color.replace('text-', 'bg-'))} />
      </div>
    );
  }

  return <Icon className={cn('w-5 h-5', color, className)} />;
}

export default AgendaStatusIcon;
