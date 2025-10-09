import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { AgendaItemStatus } from '@base/types';
import AgendaStatusBadge from './AgendaStatusBadge';

interface AgendaStatusMenuProps {
  currentStatus: AgendaItemStatus;
  onStatusChange: (newStatus: AgendaItemStatus) => void;
  disabled?: boolean;
}

function AgendaStatusMenu({
  currentStatus,
  onStatusChange,
  disabled = false
}: AgendaStatusMenuProps) {
  const statusOptions: { value: AgendaItemStatus; label: string }[] = [
    { value: 'draft', label: '草稿' },
    { value: 'scheduled', label: '已排期' },
    { value: 'in_progress', label: '进行中' },
    { value: 'skipped', label: '已跳过' },
    { value: 'completed', label: '已完成' },
    { value: 'deferred', label: '已推迟' },
    { value: 'cancelled', label: '已取消' }
  ];

  const availableOptions = statusOptions.filter(option => option.value !== currentStatus);

  const handleStatusChange = (newStatus: string) => {
    onStatusChange(newStatus as AgendaItemStatus);
  };

  if (availableOptions.length === 0) {
    return (
      <AgendaStatusBadge
        status={currentStatus}
        size="sm"
        showIcon={false}
        className="text-xs px-2 py-1"
      />
    );
  }

  return (
    <Select value={currentStatus} onValueChange={handleStatusChange} disabled={disabled}>
      <SelectTrigger className="w-24 h-6 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-xs">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default AgendaStatusMenu;