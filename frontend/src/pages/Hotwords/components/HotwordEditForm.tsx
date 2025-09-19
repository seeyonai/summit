import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Save, X, AlertCircle } from 'lucide-react';
import type { Hotword, HotwordUpdate } from '@/types';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!word.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ 
        _id: hotword._id, 
        word: word.trim(),
        isActive 
      });
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
              placeholder="输入热词..."
              disabled={isLoading || isSubmitting}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isLoading || isSubmitting}
              className="rounded"
            />
            <label htmlFor="isActive" className="text-sm font-medium">
              启用状态
            </label>
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? '启用' : '禁用'}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={!word.trim() || isLoading || isSubmitting}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
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