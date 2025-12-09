'use client';

import * as React from 'react';
import { Check, UsersIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useMeetings } from '@/hooks/useMeetings';
import { useAuth } from '@/contexts/AuthContext';
import type { Meeting } from '@/types';

interface MeetingPickerProps {
  selectedMeeting: Meeting | null;
  onMeetingSelect: (meeting: Meeting | null) => void;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}

interface MeetingPickerContentProps {
  selectedMeeting: Meeting | null;
  onMeetingSelect: (meeting: Meeting) => void;
  onDisassociate: () => void;
}

function MeetingPickerContent({ selectedMeeting, onMeetingSelect, onDisassociate }: MeetingPickerContentProps) {
  const { meetings, loading } = useMeetings();
  const { user: currentUser } = useAuth();

  // Filter and sort meetings: exclude completed and viewer-only meetings, sort in_progress first, then scheduled (oldest first)
  const filteredMeetings = React.useMemo(() => {
    return meetings
      .filter((m) => {
        // Exclude completed meetings
        if (m.status === 'completed') return false;
        // Exclude meetings where user is only a viewer (not owner or member)
        if (currentUser) {
          const isOwner = m.ownerId === currentUser._id;
          const isMember = (m.members || []).includes(currentUser._id);
          const isViewer = (m.viewers || []).includes(currentUser._id);
          const isAdmin = currentUser.role === 'admin';
          // If user is only a viewer (not owner, member, or admin), exclude
          if (isViewer && !isOwner && !isMember && !isAdmin) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by status priority
        const statusOrder = { in_progress: 0, scheduled: 1 };
        const priorityA = statusOrder[a.status as keyof typeof statusOrder] ?? 999;
        const priorityB = statusOrder[b.status as keyof typeof statusOrder] ?? 999;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // Within same status, sort by oldest first (scheduledStart)
        const dateA = a.scheduledStart ? new Date(a.scheduledStart).getTime() : 0;
        const dateB = b.scheduledStart ? new Date(b.scheduledStart).getTime() : 0;
        return dateA - dateB;
      });
  }, [meetings, currentUser]);

  return (
    <PopoverContent className="w-80 p-0" align="start">
      <Command>
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">选择会议</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">将录音关联到会议</p>
        </div>
        <CommandInput placeholder="搜索会议..." className="border-0 focus:ring-0" />
        <CommandList>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="sm" />
              <span className="ml-2 text-xs text-gray-500">加载中...</span>
            </div>
          ) : filteredMeetings.length === 0 ? (
            <CommandEmpty>暂无可用会议</CommandEmpty>
          ) : (
            <CommandGroup>
              {selectedMeeting && (
                <div className="px-2 py-2 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">当前关联</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{selectedMeeting.title}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onDisassociate}
                      className="flex-shrink-0 h-auto p-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      取消关联
                    </Button>
                  </div>
                </div>
              )}
              {filteredMeetings.map((meeting) => (
                <CommandItem
                  key={meeting._id}
                  value={`${meeting.title} ${meeting._id}`}
                  onSelect={() => onMeetingSelect(meeting)}
                  className="flex items-start gap-2 p-3 cursor-pointer"
                >
                  <Check className={cn('mt-1.5 h-4 w-4 flex-shrink-0', selectedMeeting?._id === meeting._id ? 'opacity-100' : 'opacity-0')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{meeting.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={meeting.status === 'completed' ? 'default' : meeting.status === 'in_progress' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {meeting.status === 'completed' ? '已完成' : meeting.status === 'in_progress' ? '进行中' : '已排期'}
                      </Badge>
                      {meeting.scheduledStart && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(meeting.scheduledStart).toLocaleDateString('zh-CN')}
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </PopoverContent>
  );
}

function MeetingPicker({ selectedMeeting, onMeetingSelect, onOpenChange, disabled }: MeetingPickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleMeetingSelect = React.useCallback(
    (meeting: Meeting) => {
      onMeetingSelect(meeting);
      setOpen(false);
      onOpenChange?.(false);
    },
    [onMeetingSelect, onOpenChange]
  );

  const handleDisassociate = React.useCallback(() => {
    onMeetingSelect(null);
    setOpen(false);
    onOpenChange?.(false);
  }, [onMeetingSelect, onOpenChange]);

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      onOpenChange?.(newOpen);
    },
    [onOpenChange]
  );

  return (
    <Popover open={open && !disabled} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-10 h-10 rounded-full p-0 justify-center items-center transition-colors',
            selectedMeeting
              ? 'bg-gray-700 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200'
              : 'bg-gray-700/10 hover:bg-gray-700/20 border border-gray-700/20'
          )}
          disabled={disabled}
        >
          <UsersIcon className={cn('w-5 h-5', selectedMeeting ? 'text-white dark:text-gray-700 stroke-[2.5]' : 'text-gray-700 dark:text-gray-400')} />
        </Button>
      </PopoverTrigger>
      {open && <MeetingPickerContent selectedMeeting={selectedMeeting} onMeetingSelect={handleMeetingSelect} onDisassociate={handleDisassociate} />}
    </Popover>
  );
}

export default MeetingPicker;
