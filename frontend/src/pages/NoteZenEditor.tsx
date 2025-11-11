import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { XIcon, SettingsIcon, SaveIcon, ZapIcon } from 'lucide-react';
import type { NoteStatus } from '@/types';
import ProofingEditor from '@/components/Note/ProofingEditor';
import { apiService } from '@/services/api';
import { useMentions, type MentionContext, type MentionUser } from '@/hooks/useMentions';
import MentionDropdown from '@/components/Note/MentionDropdown';
import useMeetingMembers from '@/hooks/useMeetingMembers';
import { useNoteDetail } from '@/hooks/useNoteDetail';

type AutoSaveStatus = 'saved' | 'saving' | 'unsaved' | 'idle';

function NoteZenEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const meetingId = searchParams.get('meetingId') || undefined;
  const mode = id ? 'edit' : 'create';

  const { note, loading: loadingNote } = useNoteDetail(id);

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
    users?: MentionUser[];
  } | null>(null);
  const [meetingData, setMeetingData] = useState<{ ownerId?: string; members?: string[] }>({ ownerId: undefined, members: [] });

  // Fetch meeting members
  const { memberUsers, ownerUser } = useMeetingMembers({
    meetingId: meetingId || '',
    ownerId: meetingData.ownerId,
    members: meetingData.members || [],
  });

  // Mention context for the mention dropdown
  const mentionContext: MentionContext = {
    users: systemContext?.users,
    speakers: systemContext?.speakerNames,
    hotwords: systemContext?.hotwords,
    tags: ['#todo', '#decision'],  // Always available, even without meeting context
  };

  console.log('[NoteZenEditor] Mention context:', mentionContext);
  console.log('[NoteZenEditor] Meeting ID:', meetingId);
  console.log('[NoteZenEditor] Enabled:', !!meetingId);

  // Mention feature hook
  const {
    textareaRef,
    mentionState,
    suggestions,
    selectedIndex,
    handleSelect,
    textareaProps,
  } = useMentions({
    value: formData.content,
    onChange: (value) => handleFieldChange('content', value),
    context: mentionContext,
    enabled: true,  // Always enabled (hashtags work without meeting context)
  });

  console.log('[NoteZenEditor] Mention state:', mentionState);
  console.log('[NoteZenEditor] Suggestions:', suggestions);

  // Initialize form data from existing note
  useEffect(() => {
    if (mode === 'edit' && note) {
      setFormData({
        title: note.title || '',
        content: note.content || '',
        status: note.status || 'draft',
        tags: note.tags || [],
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
  }, [mode, note]);

  // Fetch meeting context if meetingId is provided
  useEffect(() => {
    if (meetingId) {
      apiService.getMeeting(meetingId)
        .then((meeting) => {
          const speakerNames = meeting.recordings
            ?.flatMap((r) => r.speakerNames?.map((s) => s.name) || [])
            .filter(Boolean) || [];

          setMeetingData({
            ownerId: meeting.ownerId,
            members: meeting.members || [],
          });

          setSystemContext({
            hotwords: meeting.hotwords || [],
            speakerNames: Array.from(new Set(speakerNames)),
            users: [],
          });
        })
        .catch((err) => {
          console.error('Failed to fetch meeting context:', err);
          setSystemContext(null);
        });
    } else {
      setSystemContext(null);
      setMeetingData({ ownerId: undefined, members: [] });
    }
  }, [meetingId]);

  // Update systemContext with user data when memberUsers/ownerUser change
  useEffect(() => {
    if (systemContext && (memberUsers.length > 0 || ownerUser)) {
      const allUsers: MentionUser[] = [];

      if (ownerUser) {
        allUsers.push({
          _id: ownerUser._id,
          name: ownerUser.name || ownerUser.email,
          aliases: ownerUser.aliases ? ownerUser.aliases.split(',').map(a => a.trim()).filter(Boolean) : [],
          email: ownerUser.email,
        });
      }

      memberUsers.forEach(user => {
        allUsers.push({
          _id: user._id,
          name: user.name || user.email,
          aliases: user.aliases ? user.aliases.split(',').map(a => a.trim()).filter(Boolean) : [],
          email: user.email,
        });
      });

      setSystemContext(prev => ({
        ...prev!,
        users: allUsers,
      }));
    }
  }, [memberUsers, ownerUser, systemContext?.hotwords, systemContext?.speakerNames]);

  // Auto-save handler
  const handleAutoSave = useCallback(async () => {
    if (autoSaveStatus === 'saving' || !formData.title.trim()) return;

    try {
      setAutoSaveStatus('saving');
      setError(null);

      if (mode === 'create') {
        const response = await apiService.createNote({ ...formData, meetingId });
        // Redirect to edit mode after first save
        navigate(`/notes/${response._id}/zen${meetingId ? `?meetingId=${meetingId}` : ''}`, { replace: true });
      } else {
        await apiService.updateNote(id!, { ...formData, _id: id });
      }

      setAutoSaveStatus('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
      setAutoSaveStatus('unsaved');
    }
  }, [formData, autoSaveStatus, mode, id, meetingId, navigate]);

  // Auto-save effect with debounce (only for edit mode)
  useEffect(() => {
    if (mode === 'create') return;
    if (!formData.title.trim()) return;

    if (autoSaveStatus !== 'idle' && autoSaveStatus !== 'saving') {
      setAutoSaveStatus('unsaved');
    }

    if (autoSaveTimer.current) {
      window.clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = window.setTimeout(() => {
      handleAutoSave();
    }, 2000);

    return () => {
      if (autoSaveTimer.current) {
        window.clearTimeout(autoSaveTimer.current);
      }
    };
  }, [formData.title, formData.content, formData.status, formData.tags, mode, handleAutoSave, autoSaveStatus]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }

      // Cmd/Ctrl + S for manual save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleAutoSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAutoSave]);

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
      handleAutoSave().then(() => {
        if (id) {
          navigate(`/notes/${id}`);
        } else {
          navigate('/notes');
        }
      });
    } else {
      if (id) {
        navigate(`/notes/${id}`);
      } else {
        navigate('/notes');
      }
    }
  };

  const getStatusBadge = () => {
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

  if (loadingNote && mode === 'edit') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-fade-in">
      {/* Minimal Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background">
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
          <div className="relative">
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
                {...textareaProps}
                placeholder="开始书写..."
                value={formData.content}
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

            {/* Mention Dropdown */}
            <MentionDropdown
              isOpen={mentionState.isOpen}
              suggestions={suggestions}
              selectedIndex={selectedIndex}
              query={mentionState.query}
              coords={mentionState.cursorCoords}
              onSelect={handleSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default NoteZenEditor;
