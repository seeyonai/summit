import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { FileTextIcon, EyeIcon, XIcon, SaveIcon, Loader2Icon } from 'lucide-react';
import AnnotatedMarkdown from '@/components/AnnotatedMarkdown';

interface TranscriptEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onSave: (content: string) => Promise<void>;
}

function TranscriptEditorDialog({ open, onOpenChange, content, onSave }: TranscriptEditorDialogProps) {
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [editContent, setEditContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEditContent(content);
      setViewMode('edit');
    }
  }, [open, content]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editContent);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">编辑会议记录</h2>
          <ButtonGroup>
            <Button onClick={() => setViewMode('edit')} variant={viewMode === 'edit' ? 'default' : 'outline'} size="sm">
              <FileTextIcon className="w-4 h-4 mr-2" />
              编辑
            </Button>
            <Button onClick={() => setViewMode('preview')} variant={viewMode === 'preview' ? 'default' : 'outline'} size="sm">
              <EyeIcon className="w-4 h-4 mr-2" />
              预览
            </Button>
          </ButtonGroup>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2Icon className="w-4 h-4 mr-2 animate-spin" /> : <SaveIcon className="w-4 h-4 mr-2" />}
            保存
          </Button>
          <Button onClick={handleClose} variant="ghost" size="icon">
            <XIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="h-[calc(100vh-73px)] overflow-auto p-6">
        {viewMode === 'edit' ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-full min-h-[calc(100vh-120px)] p-6 bg-muted/30 border border-border rounded-xl text-foreground leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
            placeholder="输入会议记录内容..."
            autoFocus
          />
        ) : (
          <div className="max-w-4xl mx-auto bg-muted/30 rounded-xl p-6 border border-border/50">
            <AnnotatedMarkdown content={editContent} />
          </div>
        )}
      </div>
    </div>
  );
}

export default TranscriptEditorDialog;
