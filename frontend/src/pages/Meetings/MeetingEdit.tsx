import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiService } from '@/services/api';
import type { Meeting, MeetingStatus } from '@/types';
import {
  SaveIcon,
  AlertCircleIcon
} from 'lucide-react';

function MeetingEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    status: 'scheduled' as MeetingStatus,
    scheduledStart: '',
    participants: '',
    hotwords: ''
  });

  useEffect(() => {
    if (!id) return;
    
    const fetchMeeting = async () => {
      try {
        setLoading(true);
        const data = await apiService.getMeeting(id);
        setMeeting(data);
        
        // Initialize form with current meeting data
        setFormData({
          title: data.title || '',
          summary: data.summary || '',
          status: data.status || 'scheduled',
          scheduledStart: data.scheduledStart ? new Date(data.scheduledStart).toISOString().slice(0, 16) : '',
          participants: data.participants?.toString() || '',
          hotwords: Array.isArray(data.hotwords) ? data.hotwords.join(', ') : ''
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load meeting');
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [id]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id || !meeting) return;

    try {
      setSaving(true);

      const hotwordTokens = formData.hotwords
        .split(/[，,]/u)
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      const updateData = {
        _id: meeting._id,
        title: formData.title || undefined,
        summary: formData.summary || undefined,
        status: formData.status || undefined,
        scheduledStart: formData.scheduledStart ? new Date(formData.scheduledStart) : undefined,
        participants: formData.participants ? parseInt(formData.participants) : undefined,
        hotwords: hotwordTokens
      };

      await apiService.updateMeeting(id, updateData);
      
      // Navigate back to meeting detail page
      navigate(`/meetings/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update meeting');
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/meetings/${id}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>会议未找到</AlertTitle>
            <AlertDescription>请求的会议不存在或已被删除。</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                编辑会议
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                修改会议信息和设置
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>保存失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>会议信息</CardTitle>
            <CardDescription>
              编辑会议的基本信息和设置
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">会议标题 *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="输入会议标题"
                  required
                />
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <Label htmlFor="summary">会议摘要</Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => handleInputChange('summary', e.target.value)}
                  placeholder="输入会议摘要或描述"
                  rows={3}
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">会议状态</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择会议状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">已排期</SelectItem>
                    <SelectItem value="in_progress">进行中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="failed">失败</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Scheduled Start */}
              <div className="space-y-2">
                <Label htmlFor="scheduledStart">开始时间</Label>
                <Input
                  id="scheduledStart"
                  type="datetime-local"
                  value={formData.scheduledStart}
                  onChange={(e) => handleInputChange('scheduledStart', e.target.value)}
                />
              </div>

              {/* Participants */}
              <div className="space-y-2">
                <Label htmlFor="participants">参与人数</Label>
                <Input
                  id="participants"
                  type="number"
                  min="0"
                  value={formData.participants}
                  onChange={(e) => handleInputChange('participants', e.target.value)}
                  placeholder="输入参与人数"
                />
              </div>

              {/* Hotwords */}
              <div className="space-y-2">
                <Label htmlFor="hotwords">热词（使用逗号分隔）</Label>
                <Input
                  id="hotwords"
                  value={formData.hotwords}
                  onChange={(e) => handleInputChange('hotwords', e.target.value)}
                  placeholder="输入热词，使用逗号分隔。"
                />
                <p className="text-sm text-muted-foreground">
                  成员加入会议或录音关联后，系统会自动合并他们的姓名、别名和公开热词，无需重复填写。
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  取消
                </Button>
                <Button type="submit" disabled={saving || !formData.title.trim()}>
                  {saving ? (
                    <>
                      <div className="animate-spin w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full"></div>
                      保存中...
                    </>
                  ) : (
                    <>
                      <SaveIcon className="w-4 h-4 mr-2" />
                      保存更改
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default MeetingEdit;
