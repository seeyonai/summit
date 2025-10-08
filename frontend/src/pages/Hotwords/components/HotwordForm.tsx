import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, AlertCircle } from 'lucide-react';
import type { HotwordCreate } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface HotwordFormProps {
  onSubmit: (hotword: HotwordCreate) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

const HotwordForm: React.FC<HotwordFormProps> = ({ onSubmit, isLoading = false, error }) => {
  const [word, setWord] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!word.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: HotwordCreate = { word: word.trim() };
      if (user?.role === 'admin') {
        payload.isPublic = isPublic;
      }
      await onSubmit(payload);
      setWord('');
      setIsPublic(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
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
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            disabled={isLoading || isSubmitting}
            className="rounded"
          />
          <label htmlFor="isPublic" className="text-sm font-medium">
            设为公开（所有人只读）
          </label>
        </div>

        <Button
          type="submit"
          disabled={!word.trim() || isLoading || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? '添加中...' : '添加热词'}
        </Button>
      </form>
    </div>
  );
};

export default HotwordForm;
