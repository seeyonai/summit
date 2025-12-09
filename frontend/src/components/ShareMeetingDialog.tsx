import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import UserPicker from '@/components/UserPicker';
import useMeetingMembers from '@/hooks/useMeetingMembers';
import { apiService } from '@/services/api';
import { type UserListItem } from '@/services/users';
import type { Meeting } from '@/types';
import { ShareIcon, AlertTriangleIcon, CrownIcon, UsersIcon, EyeIcon, XIcon } from 'lucide-react';

interface ShareMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: Meeting;
  onViewerAdded?: () => void;
}

function ShareMeetingDialog({ open, onOpenChange, meeting, onViewerAdded }: ShareMeetingDialogProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [pendingUser, setPendingUser] = useState<UserListItem | null>(null);
  const viewersListRef = useRef<HTMLDivElement>(null);
  const prevViewerCountRef = useRef(0);

  const { ownerUser, memberUsers, viewerUsers } = useMeetingMembers({
    meetingId: meeting._id,
    ownerId: meeting.ownerId,
    members: meeting.members,
    viewers: meeting.viewers,
  });

  // Scroll to bottom of viewers list when a new viewer is added
  useEffect(() => {
    if (viewerUsers.length > prevViewerCountRef.current && viewersListRef.current) {
      viewersListRef.current.scrollTop = viewersListRef.current.scrollHeight;
    }
    prevViewerCountRef.current = viewerUsers.length;
  }, [viewerUsers.length]);

  const isReadyToShare = meeting.status === 'completed' && !!meeting.finalTranscript;

  const handleSelectUser = async (user: UserListItem) => {
    if (!isReadyToShare) {
      setPendingUser(user);
      setShowWarning(true);
      return;
    }
    await addViewerAndRefresh(user);
  };

  const addViewerAndRefresh = async (user: UserListItem) => {
    await apiService.addMeetingViewer(meeting._id, user._id);
    onViewerAdded?.();
  };

  const removeViewer = async (userId: string) => {
    await apiService.removeMeetingViewer(meeting._id, userId);
    onViewerAdded?.();
  };

  const handleConfirmAddViewer = async () => {
    if (pendingUser) {
      await addViewerAndRefresh(pendingUser);
      setPendingUser(null);
    }
    setShowWarning(false);
  };

  const handleCancelWarning = () => {
    setPendingUser(null);
    setShowWarning(false);
  };

  // Build marked users for the picker
  const markedUsers: { userId: string; label: string }[] = [];
  if (meeting.ownerId) {
    markedUsers.push({ userId: meeting.ownerId, label: '所有者' });
  }
  (meeting.members || []).forEach((id) => {
    markedUsers.push({ userId: id, label: '成员' });
  });
  (meeting.viewers || []).forEach((id) => {
    markedUsers.push({ userId: id, label: '查阅者' });
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShareIcon className="w-5 h-5" />
              分享会议
            </DialogTitle>
            <DialogDescription>
              添加查阅者以分享会议记录。查阅者仅可查看"记录"和"AI 分析"。
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6 py-4">
            {/* Left side: Input and Alert */}
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">添加查阅者</div>
                <UserPicker
                  placeholder="通过邮箱/姓名搜索用户并添加"
                  markedUsers={markedUsers}
                  onSelect={handleSelectUser}
                />
              </div>

              {!isReadyToShare && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <AlertTriangleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium">提示</p>
                    <p className="text-amber-700 dark:text-amber-300">
                      该会议尚未完成或暂无会议记录。查阅者可能无法查看完整内容。
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right side: Users */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto">
              {/* Owner and Members */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <UsersIcon className="w-4 h-4" />
                  会议成员 ({(ownerUser ? 1 : 0) + memberUsers.length})
                </div>
                <div className="space-y-1">
                  {ownerUser && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                      <CrownIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <span className="text-sm flex-1 truncate">{ownerUser.name || ownerUser.email}</span>
                      <span className="text-xs text-muted-foreground">所有者</span>
                    </div>
                  )}
                  {memberUsers.map((user) => (
                    <div key={user._id} className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                      <UsersIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="text-sm flex-1 truncate">{user.name || user.email}</span>
                      <span className="text-xs text-muted-foreground">成员</span>
                    </div>
                  ))}
                  {!ownerUser && memberUsers.length === 0 && (
                    <div className="text-sm text-muted-foreground px-3 py-2">暂无成员</div>
                  )}
                </div>
              </div>

              {/* Viewers */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <EyeIcon className="w-4 h-4" />
                  查阅者 ({viewerUsers.length})
                </div>
                <div ref={viewersListRef} className="space-y-1 max-h-40 overflow-y-auto">
                  {viewerUsers.map((user) => (
                    <div key={user._id} className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                      <EyeIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm flex-1 truncate">{user.name || user.email}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={() => removeViewer(user._id)}>
                        <XIcon className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  {viewerUsers.length === 0 && (
                    <div className="text-sm text-muted-foreground px-3 py-2">暂无查阅者</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认添加查阅者</AlertDialogTitle>
            <AlertDialogDescription>
              该会议尚未完成或暂无会议记录。查阅者将无法查看完整内容。是否仍要添加查阅者？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelWarning}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAddViewer}>继续添加</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ShareMeetingDialog;
