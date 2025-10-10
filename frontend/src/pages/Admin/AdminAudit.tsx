import React, { useMemo, useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { api, apiUrl } from '@/services/api';
import { toast } from 'sonner';

function AdminAudit() {
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [loadingClear, setLoadingClear] = useState(false);
  const guideContent = useMemo(() => `### 审计日志使用说明

1. **下载日志**：点击下方“下载审计日志”按钮，获取最新的 JSON Lines 文件，每一行代表一条事件。
2. **选择查看方式**：使用任何文本编辑器或日志查看工具（如 VS Code、Logtail、jq）打开文件，按行浏览。
3. **定位关键事件**：
   - 搜索 \`access_denied\` 可快速发现权限拦截。
   - 搜索 \`failure\` 或 \`error\` 聚焦异常或失败的操作。
   - 对比 \`actorId\` / \`actorRole\`，确认执行人和身份。

### 常见字段说明
- \`timestamp\`：UTC 时间戳，表示事件发生的准确时间。
- \`action\`：规范化动作名称（如 \`recording_delete\`），帮助分组统计。
- \`status\`：事件结果，常见取值：\`success\`、\`failure\`、\`access_denied\`、\`error\`。
- \`resource/resourceId\`：被操作的资源类型及其唯一标识。
- \`details\`：可选的补充信息（如文件范围、记录数等），用于还原上下文。

### 排查建议
- 先过滤出 \`status !== "success"\` 的行，快速定位异常。
- 如果同一资源出现多次操作，按 \`timestamp\` 排序即可重建操作序列。
- 将日志导入可视化工具（如 Excel、Grafana Loki）时，保持 JSON 按行解析以避免格式丢失。`, []);

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
      <details className="bg-muted/20 border border-border rounded-xl">
        <summary className="px-6 py-4 cursor-pointer select-none text-sm font-semibold text-foreground flex items-center justify-between">
          <span>审计日志使用说明</span>
          <span className="text-xs text-muted-foreground font-normal">展开查看指南</span>
        </summary>
        <div className="px-6 pb-6">
          <div className="prose prose-sm max-w-none text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {guideContent}
            </ReactMarkdown>
          </div>
        </div>
      </details>
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
