import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SaveIcon, AlertCircleIcon } from 'lucide-react';
import type { Note, NoteCreate, NoteUpdate, NoteStatus } from '@/types';

interface NoteFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<Note>;
  onSubmit: (data: NoteCreate | NoteUpdate) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

function NoteForm({ mode, initialData, onSubmit, onCancel, loading = false, error = null }: NoteFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    status: 'draft' as NoteStatus,
    tags: '',
  });

  // Initialize form with initial data
  useEffect(() => {
    if (mode === 'create') {
      setFormData({
        title: '',
        content: '',
        status: 'draft',
        tags: '',
      });
      return;
    }

    const tagsArray = initialData?.tags ?? [];

    setFormData({
      title: initialData?.title || '',
      content: initialData?.content || '',
      status: initialData?.status || 'draft',
      tags: tagsArray.join(', '),
    });
  }, [mode, initialData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tagTokens = formData.tags
      .split(/[，,]/u)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (mode === 'create') {
      const submitData: NoteCreate = {
        title: formData.title,
        content: formData.content,
        status: formData.status,
        tags: tagTokens.length > 0 ? tagTokens : undefined,
      };
      await onSubmit(submitData);
      return;
    }

    const targetId = initialData?._id;
    if (!targetId) {
      console.error('Missing note identifier for update');
      return;
    }

    const submitData: NoteUpdate = {
      _id: targetId,
      title: formData.title,
      content: formData.content,
      status: formData.status,
      tags: tagTokens.length > 0 ? tagTokens : undefined,
    };

    await onSubmit(submitData);
  };

  const isFormValid = formData.title.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>{mode === 'create' ? '创建失败' : '保存失败'}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>速记信息</CardTitle>
          <CardDescription>
            {mode === 'create' ? '填写速记内容' : '编辑速记内容'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">标题 *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="输入标题"
              disabled={loading}
              required
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">内容 *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="输入速记内容"
              rows={10}
              disabled={loading}
              required
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">状态</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="final">定稿</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">标签（使用逗号分隔）</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              placeholder="输入标签，使用逗号分隔"
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          取消
        </Button>
        <Button type="submit" disabled={loading || !isFormValid}>
          {loading ? (
            <>
              <div className="animate-spin w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full"></div>
              {mode === 'create' ? '创建中...' : '保存中...'}
            </>
          ) : (
            <>
              <SaveIcon className="w-4 h-4 mr-2" />
              {mode === 'create' ? '创建速记' : '保存更改'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default NoteForm;
