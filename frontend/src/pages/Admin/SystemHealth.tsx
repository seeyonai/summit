import React, { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, CheckCircle2, XCircle, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { Badge } from '@/components/ui/badge';

interface ServiceEntry {
  Endpoint: string;
  URL: string;
  Status: string;
}

interface HealthResponse {
  services: ServiceEntry[];
  allHealthy: boolean;
}

function SystemHealth() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api<HealthResponse>('/api/admin/health');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isHealthy = (status: string) => status.includes('✓');

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            系统健康状态
          </h1>
          <p className="text-sm text-muted-foreground mt-1">查看各服务和依赖项的运行状态</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {data && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${data.allHealthy ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
          {data.allHealthy ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{data.allHealthy ? '所有服务运行正常' : '部分服务异常，请检查'}</span>
        </div>
      )}

      {error && <div className="text-destructive text-sm">{error}</div>}

      <div className="border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1.5fr_auto] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b">
          <div>服务</div>
          <div>地址</div>
          <div>状态</div>
        </div>
        {loading && !data && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">加载中...</div>
        )}
        {data?.services.map((svc) => (
          <div key={svc.Endpoint} className="grid grid-cols-[1fr_1.5fr_auto] gap-4 px-5 py-3.5 border-b last:border-b-0 items-center hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Server className="w-4 h-4 text-muted-foreground shrink-0" />
              {svc.Endpoint}
            </div>
            <div className="text-sm text-muted-foreground font-mono truncate" title={svc.URL}>{svc.URL}</div>
            <Badge variant={isHealthy(svc.Status) ? 'default' : 'destructive'} className={isHealthy(svc.Status) ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' : ''}>
              {svc.Status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SystemHealth;
