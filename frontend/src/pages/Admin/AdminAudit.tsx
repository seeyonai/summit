import React, { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, apiUrl } from '@/services/api';
import { toast } from 'sonner';

function AdminAudit() {
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [loadingClear, setLoadingClear] = useState(false);

  const handleDownload = async () => {
    setLoadingDownload(true);
    try {
      const endpoint = apiUrl('/api/admin/audit/logs');
      const headers: Record<string, string> = {};
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Ignore storage access errors
      }
      const response = await fetch(endpoint, { headers });
      if (!response.ok) {
        const text = await response.text().catch(() => '下载失败');
        throw new Error(text || '下载失败');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `audit-log-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success('审计日志下载成功');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '下载失败');
    } finally {
      setLoadingDownload(false);
    }
  };

  const handleClear = async () => {
    setLoadingClear(true);
    try {
      await api('/api/admin/audit/logs', { method: 'DELETE' });
    } catch {
      // 错误提示由 api 帮助函数统一处理
    } finally {
      setLoadingClear(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-semibold mb-2">审计日志管理</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          下载或清空系统审计日志。日志以 JSON Lines 格式记录关键操作事件，包含操作类型、时间戳、执行用户与结果状态。
        </p>
      </div>
      <div className="bg-card border border-border rounded-xl p-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            下载日志
          </h2>
          <p className="text-sm text-muted-foreground">
            导出当前审计日志文件，便于合规审查或安全分析。
          </p>
        </div>
        <Button
          onClick={handleDownload}
          disabled={loadingDownload}
        >
          {loadingDownload ? '正在下载...' : '下载审计日志'}
        </Button>

        <div className="pt-6 border-t border-border space-y-2">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            清空日志
          </h2>
          <p className="text-sm text-muted-foreground">
            清空操作将无法撤销，请确保已完成必要的备份或归档。
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={handleClear}
          disabled={loadingClear}
        >
          {loadingClear ? '正在清空...' : '清空审计日志'}
        </Button>
      </div>
    </div>
  );
}

export default AdminAudit;
