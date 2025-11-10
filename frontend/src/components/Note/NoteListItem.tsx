import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions } from '@/components/ui/item';
import type { Note } from '@/types';
import { formatDate } from '@/utils/date';
import { FileTextIcon, LinkIcon, DownloadIcon, TrashIcon, TagIcon } from 'lucide-react';
import NoteStatusBadge from './NoteStatusBadge';

interface NoteListItemProps {
  note: Note;
  actions?: {
    onExport?: (note: Note, e?: React.MouseEvent) => void;
    onDelete?: (note: Note, e?: React.MouseEvent) => void;
  };
  onClick?: (note: Note) => void;
  className?: string;
}

function NoteListItem({ note, actions = {}, onClick, className = '' }: NoteListItemProps) {
  const handleCardClick = () => {
    if (onClick) {
      onClick(note);
    }
  };

  const handleAction = (actionFn?: (note: Note, e?: React.MouseEvent) => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (actionFn) {
      actionFn(note, e);
    }
  };

  return (
    <Item variant="outline" className={className} onClick={handleCardClick}>
      {/* Icon as Media */}
      <ItemMedia variant="icon">
        <FileTextIcon className="w-5 h-5 text-muted-foreground" />
      </ItemMedia>

      {/* Note Content */}
      <ItemContent>
        <ItemTitle>
          {note.title}
          <NoteStatusBadge status={note.status} showIcon={false} />
          {note.meeting && (
            <Badge
              variant="outline"
              className={
                note.meeting.status === 'completed'
                  ? 'bg-green-500/10 text-green-600 border-green-500/20'
                  : note.meeting.status === 'in_progress'
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : note.meeting.status === 'scheduled'
                  ? 'bg-muted text-muted-foreground border-border'
                  : 'bg-destructive/10 text-destructive border-destructive/20'
              }
            >
              <LinkIcon className="w-3 h-3 mr-1" />
              {note.meeting.title}
            </Badge>
          )}
        </ItemTitle>

        <ItemDescription>
          <div className="flex items-center gap-4 mb-2">
            <span className="text-xs text-muted-foreground">
              {formatDate(note.createdAt)}
            </span>
            {note.tags && note.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <TagIcon className="w-3 h-3" />
                <span className="text-xs text-muted-foreground">
                  {note.tags.slice(0, 2).join(', ')}
                  {note.tags.length > 2 && ` +${note.tags.length - 2}`}
                </span>
              </div>
            )}
          </div>

          {note.content && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {note.content}
            </p>
          )}
        </ItemDescription>
      </ItemContent>

      {/* Actions */}
      <ItemActions>
        {actions.onExport && (
          <Button size="sm" variant="ghost" onClick={handleAction(actions.onExport)}>
            <DownloadIcon className="w-4 h-4" />
          </Button>
        )}

        {actions.onDelete && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
            onClick={handleAction(actions.onDelete)}
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        )}
      </ItemActions>
    </Item>
  );
}

export default NoteListItem;
