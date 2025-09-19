import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, CheckCircle, AlertCircle, Zap } from 'lucide-react';

const HotwordInfo: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          使用说明
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">提高识别准确率</span>
                <Badge variant="secondary">核心功能</Badge>
              </div>
              <p className="text-sm text-gray-600">
                热词可以显著提高特定词汇在语音识别中的准确率，特别适用于专业术语、产品名称等。
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">批量使用</span>
                <Badge variant="secondary">灵活配置</Badge>
              </div>
              <p className="text-sm text-gray-600">
                在转录录音时可以选择使用全部热词或选择性使用，满足不同场景的需求。
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">状态管理</span>
                <Badge variant="secondary">智能控制</Badge>
              </div>
              <p className="text-sm text-gray-600">
                停用的热词不会在转录时使用，但保留在数据库中，方便后续重新启用。
              </p>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">最佳实践</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 添加常用的专业术语和产品名称</li>
              <li>• 定期清理不再使用的热词</li>
              <li>• 对于特定项目，可以创建专用的热词列表</li>
              <li>• 合理使用启用/禁用状态管理热词生命周期</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HotwordInfo;