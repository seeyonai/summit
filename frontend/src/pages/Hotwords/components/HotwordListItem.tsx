import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import type { Hotword } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface HotwordListItemProps {
  hotword: Hotword;
  onEdit: (hotword: Hotword) => void;
  onDelete: (id: string) => void;
  onToggleActive: (hotword: Hotword) => void;
  isLoading?: boolean;
}

function HotwordListItem({ hotword, onEdit, onDelete, onToggleActive, isLoading = false }: HotwordListItemProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isOwner = hotword.ownerId ? hotword.ownerId === user?._id : isAdmin;
  const readOnly = (!!hotword.isPublic && !isAdmin) || (!isOwner && !isAdmin);
  return (
    <div className="group bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 p-4">
      <div className="flex items-center gap-4">
        {/* Switch */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hotword.isActive}
            onChange={() => onToggleActive(hotword)}
            disabled={isLoading || readOnly}
            className="w-5 h-5 rounded"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{hotword.word}</h3>
            <Badge variant={hotword.isActive ? 'default' : 'secondary'}>
              {hotword.isActive ? '启用' : '禁用'}
            </Badge>
            {hotword.isPublic && (
              <Badge variant="secondary">公开</Badge>
            )}
          </div>
          <div className="text-sm text-gray-600">
            创建时间: {new Date(hotword.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(hotword)}
            disabled={isLoading || readOnly}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-destructive"
            onClick={() => onDelete(hotword._id)}
            disabled={isLoading || readOnly}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default HotwordListItem;
