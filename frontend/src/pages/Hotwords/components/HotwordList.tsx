import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, AlertCircle } from 'lucide-react';
import type { Hotword } from '@/types';

interface HotwordListProps {
  hotwords: Hotword[];
  onEdit: (hotword: Hotword) => void;
  onDelete: (hotwordId: string) => void;
  onToggleActive: (hotword: Hotword) => void;
  isLoading?: boolean;
}

const HotwordList: React.FC<HotwordListProps> = ({ 
  hotwords, 
  onEdit, 
  onDelete, 
  onToggleActive, 
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 animate-spin" />
            <span>加载中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hotwords.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">暂无热词</h3>
            <p className="text-sm">添加热词可以提高语音识别的准确率</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {hotwords.map((hotword) => (
        <Card key={hotword._id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-lg">{hotword.word}</span>
                  <Badge variant={hotword.isActive ? 'default' : 'secondary'}>
                    {hotword.isActive ? '启用' : '禁用'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-500">
                  创建时间: {new Date(hotword.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">状态:</label>
                <input
                  type="checkbox"
                  checked={hotword.isActive}
                  onChange={() => onToggleActive(hotword)}
                  disabled={isLoading}
                  className="rounded"
                />
              </div>
              
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(hotword)}
                  disabled={isLoading}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(hotword._id)}
                  disabled={isLoading}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default HotwordList;