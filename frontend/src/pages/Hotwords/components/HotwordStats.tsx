import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Clock, Target } from 'lucide-react';
import type { HotwordAnalytics } from '@/utils/hotwords';

interface HotwordStatsProps {
  analytics: HotwordAnalytics;
}

const HotwordStats: React.FC<HotwordStatsProps> = ({ analytics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">总热词数</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.totalHotwords}</div>
          <p className="text-xs text-muted-foreground">
            {analytics.activeHotwords} 个启用中
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">活跃率</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {analytics.totalHotwords > 0 
              ? Math.round((analytics.activeHotwords / analytics.totalHotwords) * 100)
              : 0
            }%
          </div>
          <p className="text-xs text-muted-foreground">
            {analytics.inactiveHotwords} 个已停用
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">本周新增</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.recentlyAdded}</div>
          <p className="text-xs text-muted-foreground">
            最近7天内添加
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">平均长度</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.averageLength}</div>
          <p className="text-xs text-muted-foreground">
            最常见: {analytics.mostCommonLength} 字符
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HotwordStats;
