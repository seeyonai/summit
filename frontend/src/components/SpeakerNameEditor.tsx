import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PencilIcon, SaveIcon, XIcon, RotateCcwIcon, UsersIcon } from 'lucide-react';
import type { SpeakerName } from '@base/types';
import { cn } from '../lib/utils';

interface SpeakerNameEditorProps {
  speakerIndices: number[];
  currentSpeakerNames?: SpeakerName[];
  onSave: (speakerNames: SpeakerName[]) => Promise<void>;
  disabled?: boolean;
}

function SpeakerNameEditor({ speakerIndices, currentSpeakerNames = [], onSave, disabled = false }: SpeakerNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize edited names from current speaker names
  const [editedNames, setEditedNames] = useState<Record<number, string>>(() => {
    const initialNames: Record<number, string> = {};
    currentSpeakerNames.forEach(({ index, name }) => {
      if (typeof index === 'number' && name) {
        initialNames[index] = name;
      }
    });
    return initialNames;
  });

  // Update edited names when currentSpeakerNames changes AND we're not editing
  useEffect(() => {
    if (!isEditing && !saving) {
      const updatedNames: Record<number, string> = {};
      currentSpeakerNames.forEach(({ index, name }) => {
        if (typeof index === 'number' && name) {
          updatedNames[index] = name;
        }
      });
      setEditedNames(updatedNames);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSpeakerNames]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset to current values
    const resetNames: Record<number, string> = {};
    currentSpeakerNames.forEach(({ index, name }) => {
      if (typeof index === 'number' && name) {
        resetNames[index] = name;
      }
    });
    setEditedNames(resetNames);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Convert edited names to SpeakerName array, filtering out empty values
      const speakerNames: SpeakerName[] = speakerIndices
        .map(index => ({
          index,
          name: editedNames[index]?.trim() || ''
        }))
        .filter(entry => entry.name.length > 0);

      await onSave(speakerNames);

      // Update local state to match what was saved
      const savedNames: Record<number, string> = {};
      speakerNames.forEach(({ index, name }) => {
        savedNames[index] = name;
      });
      setEditedNames(savedNames);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save speaker names:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleNameChange = (index: number, name: string) => {
    setEditedNames(prev => ({
      ...prev,
      [index]: name
    }));
  };

  const handleReset = (index: number) => {
    setEditedNames(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  const getDisplayName = (index: number): string => {
    return editedNames[index] || `说话人 ${index + 1}`;
  };

  const speakerColors = [
    'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    'border-green-500 bg-green-50 dark:bg-green-900/20',
    'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
    'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UsersIcon className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-medium text-foreground">说话人名称</h4>
          <Badge variant="secondary">{speakerIndices.length} 人</Badge>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleSave} disabled={saving} size="sm" variant="default">
                <SaveIcon className="w-3 h-3 mr-1" />
                保存
              </Button>
              <Button onClick={handleCancel} disabled={saving} size="sm" variant="outline">
                <XIcon className="w-3 h-3 mr-1" />
                取消
              </Button>
            </>
          ) : (
            <Button onClick={handleEdit} disabled={disabled} size="sm" variant="outline">
              <PencilIcon className="w-3 h-3 mr-1" />
              编辑名称
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {speakerIndices.map(index => {
          const colorClass = speakerColors[index % speakerColors.length];
          const displayName = getDisplayName(index);
          const hasCustomName = Boolean(editedNames[index]);

          return (
            <Card key={index} className={`p-3 border-l-4 ${colorClass}`}>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-muted to-card rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-foreground">{index + 1}</span>
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={editedNames[index] || ''}
                        onChange={(e) => handleNameChange(index, e.target.value)}
                        placeholder={`说话人 ${index + 1}`}
                        className="h-8 text-sm"
                        disabled={saving}
                      />
                      {hasCustomName && (
                        <Button onClick={() => handleReset(index)} disabled={saving} size="sm" variant="ghost" className="h-8 px-2">
                          <RotateCcwIcon className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className={cn("text-sm font-medium text-foreground", hasCustomName ? "" : "text-muted-foreground")}>{displayName}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default SpeakerNameEditor;
