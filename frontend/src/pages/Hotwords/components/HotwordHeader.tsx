import React from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp, Clock, Users, PlusIcon, FolderOpenIcon } from 'lucide-react';
import type { HotwordAnalytics } from '@/utils/hotwords';
import PageHeader from '@/components/PageHeader';

interface HotwordHeaderProps {
  stats: HotwordAnalytics;
  onCreate: () => void;
}

function HotwordHeader({ stats, onCreate }: HotwordHeaderProps) {
  return (
    <PageHeader
      title="热词"
      subline="集中维护识别热词，提升语音识别准确率"
      actionButtons={
        <Button onClick={onCreate} size="lg" className="bg-white text-blue-600 hover:bg-blue-50 transition-all duration-300 shadow-lg">
          <PlusIcon className="w-5 h-5 mr-2" />
          添加热词
        </Button>
      }
    >
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <p className="stat-label">总热词数</p>
              <p className="stat-value">{stats.totalHotwords}</p>
            </div>
            <FolderOpenIcon className="stat-icon" />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <p className="stat-label">活跃率</p>
              <p className="stat-value">
                {stats.totalHotwords > 0 ? Math.round((stats.activeHotwords / stats.totalHotwords) * 100) : 0}%
              </p>
            </div>
            <TrendingUp className="stat-icon text-green-300" />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <p className="stat-label">本周新增</p>
              <p className="stat-value">{stats.recentlyAdded}</p>
            </div>
            <Clock className="stat-icon" />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <p className="stat-label">平均长度</p>
              <p className="stat-value">{stats.averageLength}</p>
            </div>
            <Users className="stat-icon text-purple-200" />
          </div>
        </div>
      </div>
    </PageHeader>
  );
}

export default HotwordHeader;
