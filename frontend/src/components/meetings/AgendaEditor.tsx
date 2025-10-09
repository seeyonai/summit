import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { TrashIcon, PlusIcon, GripVerticalIcon, ChevronUpIcon, ChevronDownIcon, XIcon } from 'lucide-react';
import UserPicker from '@/components/UserPicker';
import type { AgendaItem } from '@/types';
import type { UserListItem } from '@/services/users';
import { useAgendaOwners } from '@/hooks/useAgenda';

interface AgendaEditorProps {
  agenda?: AgendaItem[];
  onChange: (agenda: AgendaItem[]) => void;
  disabled?: boolean;
}

function AgendaEditor({ agenda = [], onChange, disabled = false }: AgendaEditorProps) {
  const [items, setItems] = useState<AgendaItem[]>(() => agenda.map(item => ({ ...item })));
  const { ownerCache } = useAgendaOwners(agenda);

  useEffect(() => {
    setItems(agenda.map(item => ({ ...item })));
  }, [agenda]);

  
  const addItem = () => {
    const newItem: AgendaItem = {
      order: items.length + 1,
      text: '',
      status: 'draft'
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    onChange(newItems);
  };

  const updateItem = (index: number, field: keyof AgendaItem, value: string) => {
    const newItems = [...items];
    const currentItem = newItems[index];

    // Create updated item, preserving all other properties
    newItems[index] = {
      ...currentItem,
      [field]: value,
      order: index + 1 // Ensure order is preserved
    };

    // Update order numbers for all items
    newItems.forEach((item, i) => {
      item.order = i + 1;
    });

    setItems(newItems);
    onChange(newItems);
  };

  const setOwner = (index: number, user: UserListItem) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      ownerId: user._id
    };
    setItems(newItems);
    onChange(newItems);
  };

  const clearOwner = (index: number) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      ownerId: undefined
    };
    setItems(newItems);
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    // Update order numbers
    newItems.forEach((item, i) => {
      item.order = i + 1;
    });
    setItems(newItems);
    onChange(newItems);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === items.length - 1)
    ) {
      return; // Can't move further
    }

    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // Swap items
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];

    // Update order numbers
    newItems.forEach((item, i) => {
      item.order = i + 1;
    });

    setItems(newItems);
    onChange(newItems);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">议程项目</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={disabled}
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          添加议程
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>暂无议程项目</p>
            <p className="text-sm mt-1">点击"添加议程"开始创建</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <Card key={index} className="relative">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center justify-center gap-1 mt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveItem(index, 'up')}
                      disabled={disabled || index === 0}
                      className="w-6 h-6 p-0"
                    >
                      <ChevronUpIcon className="w-3 h-3" />
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground w-6 text-center">
                      {item.order}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveItem(index, 'down')}
                      disabled={disabled || index === items.length - 1}
                      className="w-6 h-6 p-0"
                    >
                      <ChevronDownIcon className="w-3 h-3" />
                    </Button>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Input
                        value={item.text}
                        onChange={(e) => updateItem(index, 'text', e.target.value)}
                        placeholder="输入议程内容..."
                        disabled={disabled}
                        className="flex-1"
                      />
                      <Select
                        value={item.status}
                        onValueChange={(value) => updateItem(index, 'status', value as AgendaItem['status'])}
                        disabled={disabled}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">草稿</SelectItem>
                          <SelectItem value="scheduled">已排期</SelectItem>
                          <SelectItem value="in_progress">进行中</SelectItem>
                          <SelectItem value="skipped">已跳过</SelectItem>
                          <SelectItem value="completed">已完成</SelectItem>
                          <SelectItem value="deferred">已推迟</SelectItem>
                          <SelectItem value="cancelled">已取消</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={disabled}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <Textarea
                        value={item.description || ''}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="添加详细描述（可选）..."
                        disabled={disabled}
                        rows={2}
                        className="resize-none"
                      />

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">负责人</Label>
                        {item.ownerId && ownerCache[item.ownerId] ? (
                          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                            <span className="text-sm flex-1">
                              {ownerCache[item.ownerId].name || ownerCache[item.ownerId].email}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => clearOwner(index)}
                              disabled={disabled}
                              className="h-6 w-6 p-0"
                            >
                              <XIcon className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <UserPicker
                            placeholder="搜索并选择负责人"
                            onSelect={(user) => setOwner(index, user)}
                            disabled={disabled}
                            className="w-full"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        <p>• 议程项目会自动编号排序</p>
        <p>• 使用上下箭头按钮可以重新排序议程项目</p>
        <p>• 可以添加详细描述和指定负责人</p>
        <p>• 可以设置每个议程项目的状态：待讨论、进行中、已完成</p>
      </div>
    </div>
  );
}

export default AgendaEditor;
