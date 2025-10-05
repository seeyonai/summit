import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Save, X, AlertCircle } from 'lucide-react';
import type { Hotword, HotwordUpdate } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface HotwordEditFormProps {
  hotword: Hotword;
  onSubmit: (hotword: HotwordUpdate) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string;
}

const HotwordEditForm: React.FC<HotwordEditFormProps> = ({ 
  hotword, 
  onSubmit, 
  onCancel, 
  isLoading = false, 
  error 
}) => {
  const [word, setWord] = useState(hotword.word);
  const [isActive, setIsActive] = useState(hotword.isActive);
  const [isPublic, setIsPublic] = useState(!!hotword.isPublic);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isReadOnlyPublic = hotword.isPublic && !isAdmin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!word.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: HotwordUpdate = { _id: hotword._id, word: word.trim(), isActive };
      if (isAdmin) payload.isPublic = isPublic;
      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>编辑热词</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">热词</label>
            <Input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              disabled={isLoading || isSubmitting || isReadOnlyPublic}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked === true)}
            />
            <Label htmlFor="isActive" className="text-sm font-medium">
              启用热词
            </Label>
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? '启用' : '禁用'}
            </Badge>
          </div>

          {isAdmin && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPublic"
                checked={isPublic}
                onCheckedChange={(checked) => setIsPublic(checked === true)}
              />
              <Label htmlFor="isPublic" className="text-sm font-medium">
                公开热词
              </Label>
              <Badge variant={isPublic ? 'default' : 'secondary'}>
                {isPublic ? '公开' : '私有'}
              </Badge>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={!word.trim() || isLoading || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default HotwordEditForm;
