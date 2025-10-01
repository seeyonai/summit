import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { Hotword, HotwordCreate, HotwordUpdate } from '@/types';
import { api } from '@/services/api';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';

const HotwordManagement: React.FC = () => {
  const [hotwords, setHotwords] = useState<Hotword[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Form states
  const [newHotword, setNewHotword] = useState<HotwordCreate>({
    word: ''
  });
  
  const [editingHotword, setEditingHotword] = useState<Hotword | null>(null);
  const [editForm, setEditForm] = useState<HotwordUpdate | undefined>();

  // Fetch hotwords
  const fetchHotwords = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await api<Hotword[]>(API_ENDPOINTS.BACKEND.HOTWORDS);
      setHotwords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch hotwords');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotwords();
  }, []);

  // Create hotword
  const handleCreateHotword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newHotword.word.trim()) {
      setError('请输入热词');
      return;
    }

    try {
      await api(API_ENDPOINTS.BACKEND.HOTWORDS, {
        method: 'POST',
        body: JSON.stringify(newHotword),
      });

      setSuccess('热词创建成功');
      setNewHotword({ word: '' });
      fetchHotwords();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建热词失败');
    }
  };

  // Update hotword
  const handleUpdateHotword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingHotword) return;

    try {
      await api(API_ENDPOINTS.BACKEND.HOTWORD_DETAIL(editingHotword._id), {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });

      setSuccess('热词更新成功');
      setEditingHotword(null);
      setEditForm(undefined);
      fetchHotwords();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新热词失败');
    }
  };

  // Delete hotword
  const handleDeleteHotword = async (hotwordId: string) => {
    if (!confirm('确定要删除这个热词吗？')) {
      return;
    }

    try {
      await api(API_ENDPOINTS.BACKEND.HOTWORD_DETAIL(hotwordId), { method: 'DELETE' });

      setSuccess('热词删除成功');
      fetchHotwords();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除热词失败');
    }
  };

  // Start editing
  const startEditing = (hotword: Hotword) => {
    setEditingHotword(hotword);
    setEditForm({
      _id: hotword._id,
      word: hotword.word
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingHotword(null);
    setEditForm(undefined);
  };

  // Clear messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editForm?._id) {
      return;
    }
    setEditForm({...editForm, word: e.target.value});
  }
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">热词</h1>
        <p className="text-muted-foreground">管理语音识别中的热词，提高识别准确率</p>
      </div>

      {success && (
        <Alert>
          <AlertTitle>成功</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

  
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>添加热词</CardTitle>
            <CardDescription>
              创建新的热词以提高语音识别准确率
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateHotword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hotword">热词 *</Label>
                <Input
                  id="hotword"
                  value={newHotword.word}
                  onChange={(e) => setNewHotword({...newHotword, word: e.target.value})}
                  placeholder="输入热词"
                  required
                />
              </div>
              
              <Button type="submit" disabled={loading} className="w-full">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  添加热词
                </div>
              </Button>
            </form>
          </CardContent>
        </Card>

        {editingHotword && (
          <Card>
            <CardHeader>
              <CardTitle>编辑热词</CardTitle>
              <CardDescription>
                修改现有热词的信息
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateHotword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-hotword">热词</Label>
                  <Input
                    id="edit-hotword"
                    value={editForm?.word || ''}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading} className="flex-1">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      保存
                    </div>
                  </Button>
                  <Button type="button" onClick={cancelEditing} variant="outline" className="flex-1">
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>热词列表 ({hotwords.length} 个)</CardTitle>
          <CardDescription>
            当前筛选条件下的热词列表
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : hotwords.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">暂无热词</h3>
              <p className="text-muted-foreground">添加热词可以提高语音识别的准确率</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {hotwords.map(hotword => (
                <div
                  key={hotword._id}
                  className={`p-3 border rounded-lg ${
                    hotword.isActive 
                      ? 'border-success/30 bg-success/10' 
                      : 'border-border bg-muted'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{hotword.word}</span>
                        {!hotword.isActive && (
                          <Badge variant="outline">已停用</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        创建时间: {new Date(hotword.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex gap-1 ml-2">
                      <Button
                        onClick={() => startEditing(hotword)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                      
                      <Button
                        onClick={() => handleDeleteHotword(hotword._id)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
          <CardDescription>
            了解如何使用热词管理功能
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">识别准确率</Badge>
              <span className="text-sm">热词可以提高特定词汇的语音识别准确率</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">批量使用</Badge>
              <span className="text-sm">在转录录音时可以选择使用全部热词或选择性使用</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">状态管理</Badge>
              <span className="text-sm">停用的热词不会在转录时使用，但保留在数据库中</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HotwordManagement;
