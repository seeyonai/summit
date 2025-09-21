import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Target, TrendingUp, Clock, Users, PlusIcon, FolderOpenIcon } from 'lucide-react';
import type { HotwordAnalytics } from '@/pages/Hotwords/utils/hotwordAnalytics';

interface HotwordHeaderProps {
  stats: HotwordAnalytics;
  onCreate: () => void;
}

function HotwordHeader({ stats, onCreate }: HotwordHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/90 to-blue-600/90 p-8 text-white shadow-xl">
      <div className="absolute inset-0 bg-black/10" />
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">热词</h1>
            <p className="text-blue-100 text-lg">集中维护识别热词，提升语音识别准确率</p>
          </div>
          <Button onClick={onCreate} size="lg" className="bg-white text-blue-600 hover:bg-blue-50 transition-all duration-300 shadow-lg">
            <PlusIcon className="w-5 h-5 mr-2" />
            添加热词
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">总热词数</p>
                <p className="text-white text-2xl font-bold">{stats.totalHotwords}</p>
              </div>
              <FolderOpenIcon className="w-8 h-8 text-blue-200" />
            </div>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">活跃率</p>
                <p className="text-white text-2xl font-bold">
                  {stats.totalHotwords > 0 ? Math.round((stats.activeHotwords / stats.totalHotwords) * 100) : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-300" />
            </div>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">本周新增</p>
                <p className="text-white text-2xl font-bold">{stats.recentlyAdded}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-200" />
            </div>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">平均长度</p>
                <p className="text-white text-2xl font-bold">{stats.averageLength}</p>
              </div>
              <Users className="w-8 h-8 text-purple-200" />
            </div>
          </Card>
        </div>
      </div>

      <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
    </div>
  );
}

export default HotwordHeader;
