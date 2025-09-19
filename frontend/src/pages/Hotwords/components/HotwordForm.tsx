import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, AlertCircle } from 'lucide-react';
import type { HotwordCreate } from '@/types';

interface HotwordFormProps {
  onSubmit: (hotword: HotwordCreate) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

const HotwordForm: React.FC<HotwordFormProps> = ({ onSubmit, isLoading = false, error }) => {
  const [word, setWord] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!word.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ word: word.trim() });
      setWord('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus size={20} />
          添加新热词
        </CardTitle>
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
            <Input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="输入热词..."
              disabled={isLoading || isSubmitting}
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={!word.trim() || isLoading || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? '添加中...' : '添加热词'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default HotwordForm;