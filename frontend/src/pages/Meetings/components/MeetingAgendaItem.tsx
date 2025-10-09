import { useState } from 'react';
import { UserIcon } from 'lucide-react';
import type { AgendaItem } from '@/types';
import type { UserListItem } from '@/services/users';
import AgendaStatusIcon from '@/components/meetings/AgendaStatusIcon';

interface MeetingAgendaItemProps {
  item: AgendaItem;
  status: 'active' | 'pending';
  ownerCache: Record<string, UserListItem>;
  onClick?: (item: AgendaItem) => void;
  secondaryAction?: React.ReactNode;
}

function MeetingAgendaItem({
  item,
  status,
  ownerCache,
  onClick,
  secondaryAction
}: MeetingAgendaItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click from propagating when clicking the secondary action
    if (e.defaultPrevented) return;
    if (onClick) {
      onClick(item);
    }
  };

  return (
    <div
      className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
        status === 'active'
          ? 'bg-primary/5 border border-primary/30 hover:bg-primary/15'
          : 'bg-transparent border-none hover:bg-muted/40'
      }`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Click to make this the current agenda item"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <AgendaStatusIcon status={item.status} isActive={status === 'active'} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium ${
            status === 'active' ? 'text-foreground' : 'text-muted-foreground'
          }`}>
            {item.text}
          </h3>
          {item.ownerId && ownerCache[item.ownerId] && (
            <div className="flex items-center gap-1 text-xs mt-1.5 text-muted-foreground">
              <UserIcon className="w-3 h-3" />
              {ownerCache[item.ownerId].name || ownerCache[item.ownerId].email}
            </div>
          )}
        </div>
        {secondaryAction && (
          <div
            className={`flex-shrink-0 ml-2 transition-opacity duration-200 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={(e) => e.preventDefault()}
          >
            {secondaryAction}
          </div>
        )}
      </div>
    </div>
  );
}

export default MeetingAgendaItem;
