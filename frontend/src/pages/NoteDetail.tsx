import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNoteDetail } from '@/hooks/useNoteDetail';
import { apiService } from '@/services/api';
import { formatDate } from '@/utils/date';
import BackButton from '@/components/BackButton';
import NoteForm from '@/components/Note/NoteForm';
import NoteFormZenMode from '@/components/Note/NoteFormZenMode';
import NoteStatusBadge from '@/components/Note/NoteStatusBadge';
import AssociateNoteWithMeetingDialog from '@/components/Note/AssociateNoteWithMeetingDialog';
import { EditIcon, TrashIcon, DownloadIcon, LinkIcon, Link2OffIcon, CalendarIcon, TagIcon, AlertCircleIcon, ZapIcon } from 'lucide-react';
import type { NoteUpdate } from '@/types';

function NoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { note, loading, error, refresh, deleteNote } = useNoteDetail(id);
  const [isEditing, setIsEditing] = useState(false);
  const [showZenMode, setShowZenMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssociateDialog, setShowAssociateDialog] = useState(false);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setSaveError(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setSaveError(null);
  }, []);

  const handleSave = useCallback(async (data: NoteUpdate) => {
    try {
      setSaving(true);
      setSaveError(null);
      await apiService.updateNote(id!, data);
      setIsEditing(false);
      refresh();
      setSuccess('速记已更新');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }, [id, refresh]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteNote();
      navigate('/notes');
    } catch (err) {
      console.error('Error deleting note:', err);
      setShowDeleteDialog(false);
    }
  }, [deleteNote, navigate]);

  const handleExport = useCallback(async () => {
    if (!id) return;
    try {
      await apiService.exportNote(id);
      setSuccess('导出成功');
    } catch (err) {
      console.error('Error exporting note:', err);
    }
  }, [id]);

  const handleAssociateSuccess = useCallback(() => {
    refresh();
    setSuccess('已关联到会议');
  }, [refresh]);

  const handleAssociateError = useCallback((error: string) => {
    console.error('Association error:', error);
  }, []);

  const handleDisassociate = useCallback(async () => {
    if (!id) return;
    try {
      await apiService.disassociateNoteFromMeeting(id);
      refresh();
      setSuccess('已解除会议关联');
    } catch (err) {
      console.error('Error disassociating note:', err);
    }
  }, [id, refresh]);

  const handleZenModeSave = useCallback(async (data: NoteUpdate) => {
    try {
      await apiService.updateNote(id!, data);
      await refresh({ background: true });
      // Don't close zen mode - let user continue editing
      setSuccess('速记已更新');
    } catch (err) {
      console.error('Error saving note in zen mode:', err);
      throw err;
    }
  }, [id, refresh]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/20 via-background/20 to-muted/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/20 via-background/20 to-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>{error || '速记不存在'}</AlertDescription>
          </Alert>
          <BackButton url="/notes" className="mt-4">返回速记列表</BackButton>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <BackButton url="/notes" variant="ghost" className="mb-4" onClick={handleCancelEdit}>
          返回
        </BackButton>
        <NoteForm
          mode="edit"
          initialData={note}
          onSubmit={handleSave}
          onCancel={handleCancelEdit}
          loading={saving}
          error={saveError}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-6">
      {/* Success Alert */}
      {success && (
        <Alert className="bg-success/10 border-success/20">
          <AlertDescription className="text-success">{success}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="mb-8">
        <BackButton url="/notes" variant="ghost" className="mb-4">返回</BackButton>

        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground dark:text-foreground">
                {note.title}
              </h1>
              <NoteStatusBadge status={note.status} />
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                <span>创建于 {formatDate(note.createdAt)}</span>
              </div>
              {note.updatedAt && note.updatedAt !== note.createdAt && (
                <div className="flex items-center gap-1">
                  <span>更新于 {formatDate(note.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setShowZenMode(true)} variant="outline" size="sm">
              <ZapIcon className="w-4 h-4 mr-2" />
              专注编辑
            </Button>
            <Button onClick={handleEdit} variant="outline" size="sm">
              <EditIcon className="w-4 h-4 mr-2" />
              编辑
            </Button>
            <Button onClick={handleExport} variant="outline" size="sm">
              <DownloadIcon className="w-4 h-4 mr-2" />
              导出
            </Button>
            <Button onClick={() => setShowDeleteDialog(true)} variant="outline" size="sm" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 border-destructive/20">
              <TrashIcon className="w-4 h-4 mr-2" />
              删除
            </Button>
          </div>
        </div>
      </div>

      {/* Meeting Association */}
      {note.meeting ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                关联会议
              </span>
              <Button onClick={handleDisassociate} variant="ghost" size="sm">
                <Link2OffIcon className="w-4 h-4 mr-2" />
                解除关联
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
              onClick={() => navigate(`/meetings/${note.meeting!._id}`)}
            >
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">{note.meeting.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={note.meeting.status === 'completed' ? 'default' :
                            note.meeting.status === 'in_progress' ? 'secondary' :
                            note.meeting.status === 'scheduled' ? 'outline' : 'destructive'}
                    className={
                      note.meeting.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      note.meeting.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                      note.meeting.status === 'scheduled' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                      'bg-destructive dark:bg-destructive/30 text-red-700 dark:text-red-400'
                    }
                  >
                    {note.meeting.status === 'completed' ? '已完成' :
                     note.meeting.status === 'in_progress' ? '进行中' :
                     note.meeting.status === 'scheduled' ? '已排期' : '已取消'}
                  </Badge>
                  {note.meeting.createdAt && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(note.meeting.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              关联会议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">尚未关联到任何会议</p>
              <Button onClick={() => setShowAssociateDialog(true)} variant="outline">
                <LinkIcon className="w-4 h-4 mr-2" />
                关联到会议
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TagIcon className="w-4 h-4" />
              标签
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {note.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">内容</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-sm font-normal text-foreground">
              {note.content}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条速记吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Associate Note Dialog */}
      {showAssociateDialog && note && (
        <AssociateNoteWithMeetingDialog
          isOpen={showAssociateDialog}
          onClose={() => setShowAssociateDialog(false)}
          note={note}
          onSuccess={handleAssociateSuccess}
          onError={handleAssociateError}
        />
      )}

      {/* Zen Mode */}
      {note && (
        <NoteFormZenMode
          isOpen={showZenMode}
          onClose={() => setShowZenMode(false)}
          mode="edit"
          initialData={note}
          onSave={handleZenModeSave}
        />
      )}
    </div>
  );
}

export default NoteDetail;
