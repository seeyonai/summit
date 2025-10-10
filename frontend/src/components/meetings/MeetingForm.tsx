import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SaveIcon, AlertCircleIcon, InfoIcon, UsersIcon } from 'lucide-react';
import AgendaEditor from './AgendaEditor';
import MeetingMembers from '@/components/MeetingMembers';
import type { Meeting, MeetingCreate, MeetingUpdate, MeetingStatus, AgendaItem } from '@/types';

interface MeetingFormProps {
  mode: 'create' | 'edit';
  variant?: 'scheduled' | 'quick'; // only for create mode
  initialData?: Partial<Meeting>;
  meetingId?: string; // for edit mode to support members tab
  onSubmit: (data: MeetingCreate | MeetingUpdate) => Promise<void>;
  onCancel: () => void;
  onMembersChanged?: () => void;
  loading?: boolean;
  error?: string | null;
  initialTab?: string;
}

function getTomorrow9AM() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow;
}

function formatDateTimeLocal(date: Date | string) {
  const dateObj = date instanceof Date ? date : new Date(date);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function MeetingForm({
  mode,
  variant = 'scheduled',
  initialData,
  meetingId,
  onSubmit,
  onCancel,
  onMembersChanged,
  loading = false,
  error = null,
  initialTab = 'info'
}: MeetingFormProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    status: 'scheduled' as MeetingStatus,
    scheduledStart: '',
    hotwords: '',
    agenda: [] as AgendaItem[]
  });

  // Initialize form with initial data
  useEffect(() => {
    if (mode === 'create') {
      setFormData({
        title: '',
        summary: '',
        status: variant === 'quick' ? 'in_progress' : 'scheduled',
        scheduledStart: variant === 'scheduled' ? formatDateTimeLocal(getTomorrow9AM()) : formatDateTimeLocal(new Date()),
        hotwords: '',
        agenda: []
      });
      return;
    }

    const scheduledStart = initialData?.scheduledStart;
    const scheduledStartValue = scheduledStart ? formatDateTimeLocal(scheduledStart) : '';
    const hotwordsArray = initialData?.hotwords ?? [];
    const agendaItems = initialData?.agenda ?? [];

    setFormData({
      title: initialData?.title || '',
      summary: initialData?.summary || '',
      status: initialData?.status || 'scheduled',
      scheduledStart: scheduledStartValue,
      hotwords: hotwordsArray.join(', '),
      agenda: agendaItems
    });
  }, [mode, variant, initialData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAgendaChange = (agenda: AgendaItem[]) => {
    setFormData(prev => ({ ...prev, agenda }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hotwordTokens = formData.hotwords
      .split(/[，,]/u)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (mode === 'create') {
      const submitData: MeetingCreate = {
        title: formData.title || undefined,
        summary: formData.summary || undefined,
        status: formData.status || undefined,
        scheduledStart: formData.scheduledStart ? new Date(formData.scheduledStart) : undefined,
        hotwords: hotwordTokens,
        agenda: formData.agenda.length > 0 ? formData.agenda : undefined
      };
      await onSubmit(submitData);
      return;
    }

    const targetId = initialData?._id ?? meetingId;
    if (!targetId) {
      console.error('Missing meeting identifier for update');
      return;
    }

    const submitData: MeetingUpdate = {
      _id: targetId,
      title: formData.title || undefined,
      summary: formData.summary || undefined,
      status: formData.status || undefined,
      scheduledStart: formData.scheduledStart ? new Date(formData.scheduledStart) : undefined,
      hotwords: hotwordTokens,
      agenda: formData.agenda.length > 0 ? formData.agenda : undefined
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <InfoIcon className="w-4 h-4" />
            会议信息
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2" disabled={mode === 'create'}>
            <UsersIcon className="w-4 h-4" />
            成员
          </TabsTrigger>
          <TabsTrigger value="agenda" className="flex items-center gap-2">
            议程
            {formData.agenda.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                {formData.agenda.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Meeting Info Tab */}
        <TabsContent value="info" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription>
                {mode === 'create' ? '填写新会议的基本信息' : '编辑会议的基本信息'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">会议标题 *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="输入会议标题"
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>

              {/* Status - only show in edit mode */}
              {mode === 'edit' && (
                <div className="space-y-2">
                  <Label htmlFor="status">会议状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                    disabled={loading}
                  >
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
              )}

              {/* Scheduled Start */}
              {(mode === 'create' && variant === 'scheduled') || mode === 'edit' ? (
                <div className="space-y-2">
                  <Label htmlFor="scheduledStart">开始时间</Label>
                  <Input
                    id="scheduledStart"
                    type="datetime-local"
                    value={formData.scheduledStart}
                    onChange={(e) => handleInputChange('scheduledStart', e.target.value)}
                    disabled={loading}
                  />
                </div>
              ) : null}

              {/* Hotwords */}
              <div className="space-y-2">
                <Label htmlFor="hotwords">热词（使用逗号分隔）</Label>
                <Input
                  id="hotwords"
                  value={formData.hotwords}
                  onChange={(e) => handleInputChange('hotwords', e.target.value)}
                  placeholder="输入热词，使用逗号分隔"
                  disabled={loading}
                />
                <p className="text-sm text-muted-foreground">
                  成员加入会议或录音关联后，系统会自动合并他们的姓名、别名和公开热词，无需重复填写。
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-6">
          {mode === 'edit' && meetingId ? (
            <Card>
              <CardHeader>
                <CardTitle>成员管理</CardTitle>
                <CardDescription>
                  管理会议的所有者和成员，控制访问权限
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MeetingMembers
                  meetingId={meetingId}
                  ownerId={initialData?.ownerId}
                  members={initialData?.members}
                  onChanged={onMembersChanged}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>请先创建会议后再添加成员</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Agenda Tab */}
        <TabsContent value="agenda" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>会议议程</CardTitle>
              <CardDescription>
                设置会议的讨论议程，可以跟踪每个议题的状态
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgendaEditor
                agenda={formData.agenda}
                onChange={handleAgendaChange}
                disabled={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          取消
        </Button>
        <Button
          type="submit"
          disabled={loading || !isFormValid}
        >
          {loading ? (
            <>
              <div className="animate-spin w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full"></div>
              {mode === 'create' ? '创建中...' : '保存中...'}
            </>
          ) : (
            <>
              <SaveIcon className="w-4 h-4 mr-2" />
              {mode === 'create' ? '创建会议' : '保存更改'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default MeetingForm;
