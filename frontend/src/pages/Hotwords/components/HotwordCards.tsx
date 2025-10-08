import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Trash2, AlertCircle } from 'lucide-react';
import type { Hotword } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface HotwordCardsProps {
  hotwords: Hotword[];
  onEdit: (hotword: Hotword) => void;
  onDelete: (hotwordId: string) => void;
  onToggleActive: (hotword: Hotword) => void;
  isLoading?: boolean;
}

const HotwordCards: React.FC<HotwordCardsProps> = ({ 
  hotwords, 
  onEdit, 
  onDelete, 
  onToggleActive, 
  isLoading = false 
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
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
                  <span className="font-medium font-serif text-2xl flex-grow">{hotword.word}</span>
                  <Badge variant={hotword.isActive ? 'outline' : 'secondary'} className="flex-shrink-0">
                    {hotword.isActive ? '启用' : '禁用'}
                  </Badge>
                  {hotword.isPublic && (
                    <Badge variant="secondary">公开</Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">是否启用:</label>
                <Checkbox
                  checked={hotword.isActive}
                  onCheckedChange={() => onToggleActive(hotword)}
                  disabled={isLoading || (!!hotword.isPublic && !isAdmin)}
                />
              </div>
              
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(hotword)}
                  disabled={isLoading || (!!hotword.isPublic && !isAdmin)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(hotword._id)}
                  disabled={isLoading || (!!hotword.isPublic && !isAdmin)}
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

export default HotwordCards;
