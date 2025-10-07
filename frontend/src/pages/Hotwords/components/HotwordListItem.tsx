import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions } from '@/components/ui/item';
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
    <Item variant="outline" size="default">
      <ItemMedia variant="icon">
        <Checkbox
          checked={hotword.isActive}
          onCheckedChange={() => onToggleActive(hotword)}
          disabled={isLoading || readOnly}
        />
      </ItemMedia>

      <ItemContent>
        <ItemTitle>
          {hotword.word}
          <div className="flex items-center gap-2 ml-2">
            <Badge variant={hotword.isActive ? 'default' : 'secondary'}>
              {hotword.isActive ? '启用' : '禁用'}
            </Badge>
            {hotword.isPublic && (
              <Badge variant="secondary">公开</Badge>
            )}
          </div>
        </ItemTitle>
        <ItemDescription>
          创建时间: {new Date(hotword.createdAt).toLocaleDateString()}
        </ItemDescription>
      </ItemContent>

      <ItemActions>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onEdit(hotword)}
          disabled={isLoading || readOnly}
        >
          <Edit className="w-5 h-5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-red-600 hover:text-red-700 hover:bg-destructive"
          onClick={() => onDelete(hotword._id)}
          disabled={isLoading || readOnly}
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      </ItemActions>
    </Item>
  );
}

export default HotwordListItem;
