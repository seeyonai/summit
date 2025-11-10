import { Badge } from '@/components/ui/badge';
import type { NoteStatus } from '@/types';
import { FileEditIcon, CheckCircleIcon } from 'lucide-react';

interface NoteStatusBadgeProps {
  status: NoteStatus;
  showIcon?: boolean;
}

function getStatusColor(status: NoteStatus) {
  switch (status) {
    case 'draft':
      return 'bg-muted text-muted-foreground';
    case 'final':
      return 'bg-success/10 dark:bg-success/20 text-success dark:text-success/80';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getStatusText(status: NoteStatus) {
  switch (status) {
    case 'draft':
      return '草稿';
    case 'final':
      return '定稿';
    default:
      return status;
  }
}

function getStatusIcon(status: NoteStatus) {
  switch (status) {
    case 'draft':
      return FileEditIcon;
    case 'final':
      return CheckCircleIcon;
    default:
      return FileEditIcon;
  }
}

function NoteStatusBadge({ status, showIcon = true }: NoteStatusBadgeProps) {
  const StatusIcon = getStatusIcon(status);

  return (
    <Badge variant="outline" className={getStatusColor(status)}>
      {showIcon && <StatusIcon className="w-3 h-3 mr-1" />}
      {getStatusText(status)}
    </Badge>
  );
}

export default NoteStatusBadge;
