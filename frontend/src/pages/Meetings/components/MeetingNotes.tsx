import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import NoteCard from '@/components/Note/NoteCard';
import NoteForm from '@/components/Note/NoteForm';
import NoteFormZenMode from '@/components/Note/NoteFormZenMode';
import { apiService } from '@/services/api';
import type { Meeting, NoteCreate } from '@/types';
import { PlusIcon, FileTextIcon, ZapIcon } from 'lucide-react';

interface MeetingNotesProps {
  meeting: Meeting;
  onRefresh?: () => void;
}

function MeetingNotes({ meeting, onRefresh }: MeetingNotesProps) {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showZenMode, setShowZenMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const notes = meeting.notes || [];

  const openCreateModal = () => {
    setCreateError(null);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateError(null);
  };

  const createNote = async (noteData: NoteCreate) => {
    try {
      setCreating(true);
      setCreateError(null);

      const createdNote = await apiService.createNote(noteData);

      // Associate the note with this meeting
      if (createdNote._id) {
        await apiService.associateNoteWithMeeting(createdNote._id, meeting._id);
      }

      if (onRefresh) {
        onRefresh();
      }
      closeCreateModal();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error creating note');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClick = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeletingNoteId(id);
  };

  const confirmDelete = async () => {
    if (!deletingNoteId) return;

    try {
      await apiService.deleteNote(deletingNoteId);
      if (onRefresh) {
        onRefresh();
      }
      setDeletingNoteId(null);
    } catch (err) {
      console.error('Error deleting note:', err);
      setDeletingNoteId(null);
    }
  };

  const handleExport = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await apiService.exportNote(id);
    } catch (err) {
      console.error('Error exporting note:', err);
    }
  };

  const handleZenModeSave = async (noteData: NoteCreate) => {
    try {
      const createdNote = await apiService.createNote(noteData);

      // Associate the note with this meeting
      if (createdNote._id) {
        await apiService.associateNoteWithMeeting(createdNote._id, meeting._id);
      }

      if (onRefresh) {
        onRefresh();
      }
      // Don't close zen mode - let user continue writing
    } catch (err) {
      console.error('Error creating note in zen mode:', err);
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>会议速记</CardTitle>
              <CardDescription>管理与此会议相关的速记和笔记</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={openCreateModal}>
                <PlusIcon className="w-4 h-4 mr-2" />
                新建速记
              </Button>
              <Button onClick={() => setShowZenMode(true)} variant="outline">
                <ZapIcon className="w-4 h-4 mr-2" />
                专注模式
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileTextIcon />
                </EmptyMedia>
                <EmptyTitle>暂无速记</EmptyTitle>
                <EmptyDescription>
                  点击"新建速记"为此会议创建速记笔记
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex gap-2">
                  <Button onClick={openCreateModal}>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    新建速记
                  </Button>
                  <Button onClick={() => setShowZenMode(true)} variant="outline">
                    <ZapIcon className="w-4 h-4 mr-2" />
                    专注模式
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notes.map((note) => (
                <NoteCard
                  key={note._id}
                  note={note}
                  onDelete={handleDeleteClick}
                  onExport={handleExport}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Note Modal */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          if (!open) {
            closeCreateModal();
            return;
          }
          setShowCreateModal(true);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <NoteForm
            mode="create"
            onSubmit={createNote}
            onCancel={closeCreateModal}
            loading={creating}
            error={createError}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingNoteId !== null} onOpenChange={(open) => !open && setDeletingNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除这条速记吗？此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Zen Mode */}
      <NoteFormZenMode
        isOpen={showZenMode}
        onClose={() => setShowZenMode(false)}
        mode="create"
        onSave={handleZenModeSave}
        meetingId={meeting._id}
      />
    </div>
  );
}

export default MeetingNotes;
