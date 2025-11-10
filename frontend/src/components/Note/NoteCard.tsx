import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/date';
import type { Note } from '@/types';
import { FileTextIcon, TagIcon, LinkIcon, DownloadIcon, TrashIcon, MoreVertical } from 'lucide-react';
import NoteStatusBadge from './NoteStatusBadge';

interface NoteCardProps {
  note: Note;
  onDelete: (id: string, e?: React.MouseEvent) => void;
  onExport?: (id: string, e?: React.MouseEvent) => void;
}

function NoteCard({ note, onDelete, onExport }: NoteCardProps) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card
      className="group hover:shadow-md transition-all duration-300 cursor-pointer border-border dark:border-border overflow-hidden"
      onClick={() => navigate(`/notes/${note._id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              {note.title}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              {formatDate(note.createdAt)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <NoteStatusBadge status={note.status} />
            <div className="relative">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                    }}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 w-32 rounded-md border border-border bg-popover shadow-md">
                    {onExport && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md h-auto justify-start"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          onExport(note._id, e);
                        }}
                      >
                        <DownloadIcon className="h-4 w-4" />
                        导出
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md h-auto justify-start"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onDelete(note._id, e);
                      }}
                    >
                      <TrashIcon className="h-4 w-4" />
                      删除
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col min-h-[120px]">
        {/* Note Content Preview */}
        <div className="py-3 rounded-lg mb-4 border-t border-border dark:border-border">
          {note.content ? (
            <p className="text-xs text-muted-foreground dark:text-muted-foreground line-clamp-3">
              {note.content}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground dark:text-muted-foreground italic">
              暂无内容
            </p>
          )}
        </div>

        {/* Spacer to push content to bottom */}
        <div className="flex-1" />

        {/* Note Info */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {note.meeting && (
            <div className="flex items-center gap-1 text-muted-foreground dark:text-muted-foreground col-span-2">
              <LinkIcon className="w-3 h-3" />
              <span className="truncate">{note.meeting.title}</span>
            </div>
          )}
          {note.tags && note.tags.length > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground dark:text-muted-foreground col-span-2">
              <TagIcon className="w-3 h-3" />
              <div className="flex gap-1 flex-wrap">
                {note.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                    {tag}
                  </Badge>
                ))}
                {note.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    +{note.tags.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
          {!note.meeting && (!note.tags || note.tags.length === 0) && (
            <div className="flex items-center gap-1 text-muted-foreground dark:text-muted-foreground">
              <FileTextIcon className="w-3 h-3" />
              <span>{note.content ? `${note.content.length} 字` : '0 字'}</span>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}

export default NoteCard;
