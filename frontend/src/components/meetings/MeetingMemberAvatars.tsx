import React from 'react';
import { type UserListItem } from '@/services/users';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UsersIcon } from 'lucide-react';

interface MeetingMemberAvatarsProps {
  ownerUser: UserListItem | null;
  memberUsers: UserListItem[];
  maxVisible?: number;
  loading?: boolean;
  onOpenMemberEditor?: () => void;
}

function MeetingMemberAvatars({
  ownerUser,
  memberUsers,
  maxVisible = 5,
  loading = false,
  onOpenMemberEditor
}: MeetingMemberAvatarsProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-pulse flex gap-1">
          <div className="w-8 h-8 bg-muted rounded-full"></div>
          <div className="w-8 h-8 bg-muted rounded-full"></div>
          <div className="w-8 h-8 bg-muted rounded-full"></div>
        </div>
      </div>
    );
  }

  const allUsers = ownerUser ? [ownerUser, ...memberUsers] : memberUsers;
  const visibleUsers = allUsers.slice(0, maxVisible);
  const remainingCount = allUsers.length - maxVisible;

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || 'U';
  };

  const getAvatarBackgroundClass = (user: UserListItem, isOwner: boolean) => {
    if (isOwner) {
      return 'bg-gradient-to-br from-amber-400/20 to-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300/50';
    }

    // Generate different background colors for regular members based on their name/email
    const colors = [
      'from-blue-400/20 to-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300/50',
      'from-green-400/20 to-green-500/20 text-green-700 dark:text-green-300 border-green-300/50',
      'from-purple-400/20 to-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-300/50',
      'from-pink-400/20 to-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-300/50',
      'from-indigo-400/20 to-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-300/50',
      'from-teal-400/20 to-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-300/50',
      'from-cyan-400/20 to-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-300/50',
      'from-emerald-400/20 to-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300/50',
    ];

    const index = (user.name || user.email).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return `bg-gradient-to-br ${colors[index]}`;
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center -space-x-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={onOpenMemberEditor}>
        {visibleUsers.map((user, index) => (
          <div key={user._id} className="relative group">
            <Avatar className="w-8 h-8 border-2 ring-1 ring-muted/20">
              <AvatarFallback
                className={`text-xs font-medium border ${getAvatarBackgroundClass(user, user._id === ownerUser?._id)}`}
              >
                {getInitials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover border rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
              <div className="font-medium">{user.name || user.email}</div>
              <div className="text-muted-foreground">{user.email}</div>
              {user._id === ownerUser?._id && (
                <div className="text-amber-600 dark:text-amber-400 font-medium">
                  所有者
                </div>
              )}
            </div>
          </div>
        ))}

        {remainingCount > 0 && (
          <div className="relative group">
            <Avatar className="w-8 h-8 border-2 border-background ring-1 ring-muted/20 bg-muted/50">
              <AvatarFallback className="text-xs text-muted-foreground">
                +{remainingCount}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover border rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
              <div className="font-medium">还有 {remainingCount} 位成员</div>
            </div>
          </div>
        )}
      </div>

      {allUsers.length > 0 && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <UsersIcon className="w-4 h-4" />
          <span className="text-sm">{allUsers.length}</span>
        </div>
      )}
    </div>
  );
}

export default MeetingMemberAvatars;