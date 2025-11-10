import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { XIcon, SettingsIcon, SaveIcon, ZapIcon } from 'lucide-react';
import type { Note, NoteCreate, NoteUpdate, NoteStatus } from '@/types';
import ProofingEditor from './ProofingEditor';
import { apiService } from '@/services/api';

interface NoteFormZenModeProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialData?: Partial<Note>;
  onSave: (data: NoteCreate | NoteUpdate) => Promise<void>;
  meetingId?: string;
}

type AutoSaveStatus = 'saved' | 'saving' | 'unsaved' | 'idle';

function NoteFormZenMode({ isOpen, onClose, mode, initialData, onSave, meetingId }: NoteFormZenModeProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    status: 'draft' as NoteStatus,
    tags: [] as string[],
  });

  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const autoSaveTimer = useRef<number | null>(null);
  const [customization, setCustomization] = useState({
    fontSize: 16,
    lineHeight: 1.6,
    maxWidth: 800,
  });
  const [proofingEnabled, setProofingEnabled] = useState(false);
  const [systemContext, setSystemContext] = useState<{
    hotwords?: string[];
    speakerNames?: string[];
  } | null>(null);

  // Initialize form data
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFormData({
          title: initialData.title || '',
          content: initialData.content || '',
          status: initialData.status || 'draft',
          tags: initialData.tags || [],
        });
        setAutoSaveStatus('saved');
      } else {
        setFormData({
          title: '',
          content: '',
          status: 'draft',
          tags: [],
        });
        setAutoSaveStatus('idle');
      }
      setError(null);
    }
  }, [isOpen, mode, initialData]);

  // Fetch meeting context if meetingId is provided
  useEffect(() => {
    if (isOpen && meetingId) {
      apiService.getMeeting(meetingId)
        .then((meeting) => {
          const speakerNames = meeting.recordings
            ?.flatMap((r) => r.speakerNames?.map((s) => s.name) || [])
            .filter(Boolean) || [];

          setSystemContext({
            hotwords: meeting.hotwords || [],
            speakerNames: Array.from(new Set(speakerNames)), // Remove duplicates
          });
        })
        .catch((err) => {
          console.error('Failed to fetch meeting context:', err);
          setSystemContext(null);
        });
    } else {
      setSystemContext(null);
    }
  }, [isOpen, meetingId]);

  // Auto-save handler
  const handleAutoSave = useCallback(async () => {
    if (autoSaveStatus === 'saving' || !formData.title.trim()) return;

    try {
      setAutoSaveStatus('saving');
      setError(null);

      const payload = mode === 'create'
        ? { ...formData, meetingId } as NoteCreate
        : { ...formData, _id: initialData?._id } as NoteUpdate;

      await onSave(payload);
      setAutoSaveStatus('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
      setAutoSaveStatus('unsaved');
    }
  }, [formData, autoSaveStatus, mode, initialData, onSave, meetingId]);

  // Auto-save effect with debounce (only for edit mode)
  useEffect(() => {
    if (!isOpen) return;

    // Only auto-save in edit mode to avoid creating duplicate notes
    if (mode === 'create') {
      return;
    }

    // Don't auto-save if title is empty
    if (!formData.title.trim()) {
      return;
    }

    // Mark as unsaved when content changes
    if (autoSaveStatus !== 'idle' && autoSaveStatus !== 'saving') {
      setAutoSaveStatus('unsaved');
    }

    // Clear existing timer
    if (autoSaveTimer.current) {
      window.clearTimeout(autoSaveTimer.current);
    }

    // Set new timer for auto-save (2 seconds)
    autoSaveTimer.current = window.setTimeout(() => {
      handleAutoSave();
    }, 2000);

    return () => {
      if (autoSaveTimer.current) {
        window.clearTimeout(autoSaveTimer.current);
      }
    };
  }, [formData.title, formData.content, formData.status, formData.tags, isOpen, mode, handleAutoSave, autoSaveStatus]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }

      // Cmd/Ctrl + S for manual save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleAutoSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleAutoSave]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTagsChange = (value: string) => {
    const tags = value
      .split(/[,，]/)
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    handleFieldChange('tags', tags);
  };

  const handleManualSave = async () => {
    await handleAutoSave();
  };

  const handleClose = () => {
    // Auto-save before closing if there are unsaved changes
    if (autoSaveStatus === 'unsaved' && formData.title.trim()) {
      handleAutoSave().then(() => onClose());
    } else {
      onClose();
    }
  };

  const getStatusBadge = () => {
    // In create mode, auto-save is disabled
    if (mode === 'create') {
      return <Badge variant="secondary" className="text-xs">手动保存</Badge>;
    }

    switch (autoSaveStatus) {
      case 'saved':
        return <Badge variant="default" className="bg-success/10 text-success border-success/20">已保存</Badge>;
      case 'saving':
        return <Badge variant="secondary">保存中...</Badge>;
      case 'unsaved':
        return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">未保存</Badge>;
      default:
        return null;
    }
  };

  const wordCount = formData.content.length;
  const charCount = formData.content.replace(/\s/g, '').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-fade-in">
      {/* Minimal Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {mode === 'create' ? '新建速记' : '编辑速记'} - 专注模式
          </h2>
          {getStatusBadge()}
          {mode === 'create' && (
            <span className="text-xs text-muted-foreground">
              按 Cmd/Ctrl+S 或点击"创建"保存
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Word Count */}
          <span className="text-xs text-muted-foreground">
            {wordCount} 字 · {charCount} 字符
          </span>

          {/* Settings Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <SettingsIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="p-3 space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">字体大小</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button variant="outline" size="sm" onClick={() => setCustomization(prev => ({ ...prev, fontSize: Math.max(12, prev.fontSize - 2) }))}>-</Button>
                    <span className="text-sm flex-1 text-center">{customization.fontSize}px</span>
                    <Button variant="outline" size="sm" onClick={() => setCustomization(prev => ({ ...prev, fontSize: Math.min(24, prev.fontSize + 2) }))}>+</Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">行高</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button variant="outline" size="sm" onClick={() => setCustomization(prev => ({ ...prev, lineHeight: Math.max(1.2, prev.lineHeight - 0.2) }))}>-</Button>
                    <span className="text-sm flex-1 text-center">{customization.lineHeight.toFixed(1)}</span>
                    <Button variant="outline" size="sm" onClick={() => setCustomization(prev => ({ ...prev, lineHeight: Math.min(2.4, prev.lineHeight + 0.2) }))}>+</Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">宽度</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button variant="outline" size="sm" onClick={() => setCustomization(prev => ({ ...prev, maxWidth: Math.max(600, prev.maxWidth - 100) }))}>-</Button>
                    <span className="text-sm flex-1 text-center">{customization.maxWidth}px</span>
                    <Button variant="outline" size="sm" onClick={() => setCustomization(prev => ({ ...prev, maxWidth: Math.min(1200, prev.maxWidth + 100) }))}>+</Button>
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Proofing Toggle */}
          <div className="flex items-center gap-2 px-3 py-1 border rounded-md">
            <ZapIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">AI校对</span>
            <Switch
              checked={proofingEnabled}
              onCheckedChange={setProofingEnabled}
            />
          </div>

          {/* Manual Save Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualSave}
            disabled={autoSaveStatus === 'saving' || !formData.title.trim()}
          >
            <SaveIcon className="w-4 h-4 mr-2" />
            {mode === 'create' ? '创建' : '保存'}
          </Button>

          {/* Close Button */}
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <XIcon className="w-4 h-4 mr-2" />
            退出
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="px-6 py-3 bg-destructive/10 border-b border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="mx-auto py-12 px-8 space-y-6 transition-all duration-200"
          style={{ maxWidth: `${customization.maxWidth}px` }}
        >
          {/* Title Input */}
          <Input
            type="text"
            placeholder="标题..."
            value={formData.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            className={cn(
              "border-none bg-transparent px-0 text-4xl font-bold placeholder:text-muted-foreground/40",
              "focus-visible:ring-0 focus-visible:ring-offset-0"
            )}
            style={{ fontSize: `${customization.fontSize * 1.5}px` }}
          />

          {/* Metadata Row */}
          <div className="flex items-center gap-4">
            <Select value={formData.status} onValueChange={(value) => handleFieldChange('status', value as NoteStatus)}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="final">定稿</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="text"
              placeholder="标签 (用逗号分隔)"
              value={formData.tags.join(', ')}
              onChange={(e) => handleTagsChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Content Editor */}
          {proofingEnabled ? (
            <ProofingEditor
              value={formData.content}
              onChange={(value) => handleFieldChange('content', value)}
              meetingId={meetingId}
              enabled={proofingEnabled}
              systemContext={systemContext || undefined}
              className={cn(
                "min-h-[60vh] border-none bg-transparent px-0 resize-none",
                "focus-visible:ring-0 focus-visible:ring-offset-0",
                "placeholder:text-muted-foreground/40"
              )}
            />
          ) : (
            <Textarea
              placeholder="开始书写..."
              value={formData.content}
              onChange={(e) => handleFieldChange('content', e.target.value)}
              className={cn(
                "min-h-[60vh] border-none bg-transparent px-0 resize-none",
                "focus-visible:ring-0 focus-visible:ring-offset-0",
                "placeholder:text-muted-foreground/40"
              )}
              style={{
                fontSize: `${customization.fontSize}px`,
                lineHeight: customization.lineHeight,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default NoteFormZenMode;
