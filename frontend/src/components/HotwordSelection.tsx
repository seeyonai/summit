import React, { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import type { Hotword } from '@/types';
import SearchInput from '@/components/SearchInput';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { XIcon } from 'lucide-react';

interface HotwordSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selectedHotwords: string[], useAll: boolean) => void;
  currentHotwords?: string[];
}

const HotwordSelection: React.FC<HotwordSelectionProps> = ({
  isOpen,
  onClose,
  onApply,
  currentHotwords = []
}) => {
  const [hotwords, setHotwords] = useState<Hotword[]>([]);
  const [selectedHotwords, setSelectedHotwords] = useState<Set<string>>(new Set());
  const [useAllHotwords, setUseAllHotwords] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Fetch hotwords
  const fetchHotwords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<Hotword[]>(`/api/hotwords`);
      setHotwords(data);
      
      // Auto-select hotwords that match current hotwords
      const currentWordSet = new Set(currentHotwords);
      const autoSelected = new Set<string>();
      data.forEach((hotword: Hotword) => {
        if (currentWordSet.has(hotword.word)) {
          autoSelected.add(hotword._id);
        }
      });
      setSelectedHotwords(autoSelected);
    } catch (err) {
      console.error('Failed to fetch hotwords:', err);
    } finally {
      setLoading(false);
    }
  }, [currentHotwords]);

  useEffect(() => {
    if (isOpen) {
      fetchHotwords();
    }
  }, [isOpen, fetchHotwords]);

  const handleHotwordToggle = (hotwordId: string) => {
    const newSelected = new Set(selectedHotwords);
    if (newSelected.has(hotwordId)) {
      newSelected.delete(hotwordId);
    } else {
      newSelected.add(hotwordId);
    }
    setSelectedHotwords(newSelected);
  };

  const handleSelectAll = () => {
    const newSelected = new Set(selectedHotwords);
    hotwords.forEach(hw => newSelected.add(hw._id));
    setSelectedHotwords(newSelected);
  };

  const handleClearAll = () => {
    setSelectedHotwords(new Set());
  };

  const handleApply = () => {
    if (useAllHotwords) {
      // Apply all active hotwords
      const allHotwordTexts = hotwords.map(hw => hw.word);
      onApply(allHotwordTexts, true);
    } else {
      // Apply selected hotwords
      const selectedHotwordTexts = hotwords
        .filter(hw => selectedHotwords.has(hw._id))
        .map(hw => hw.word);
      onApply(selectedHotwordTexts, false);
    }
    onClose();
  };

  const filteredHotwords = hotwords.filter(hotword =>
    hotword.word.toLowerCase().includes(searchTerm.toLowerCase())
  );

  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-border">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              选择热词
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <XIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <SearchInput
              className="flex-1 min-w-[200px]"
              placeholder="搜索热词..."
              value={searchTerm}
              onChange={setSearchTerm}
            />

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="bg-primary/10 text-primary hover:bg-primary/20"
              >
                全选
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
              >
                清空
              </Button>
            </div>
          </div>

          {/* Use All Hotwords Toggle */}
          <div className="mt-4 flex items-center space-x-2">
            <Checkbox
              id="useAllHotwords"
              checked={useAllHotwords}
              onCheckedChange={(checked) => setUseAllHotwords(checked === true)}
            />
            <Label htmlFor="useAllHotwords" className="text-sm font-medium text-foreground">
              使用所有热词（忽略选择）
            </Label>
          </div>
        </div>

        {/* Hotwords List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredHotwords.map(hotword => (
                <label
                  key={hotword._id}
                  className={`flex items-center p-2 border rounded-lg cursor-pointer transition-colors ${
                    selectedHotwords.has(hotword._id) || useAllHotwords
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <Checkbox
                    checked={selectedHotwords.has(hotword._id) || useAllHotwords}
                    onCheckedChange={() => handleHotwordToggle(hotword._id)}
                    disabled={useAllHotwords}
                    className="mr-2"
                  />
                  <span className={`text-sm ${useAllHotwords ? 'text-primary' : 'text-foreground'}`}>
                    {hotword.word}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              已选择 {useAllHotwords ? hotwords.length : selectedHotwords.size} 个热词
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
              >
                取消
              </Button>
              <Button
                onClick={handleApply}
                disabled={selectedHotwords.size === 0 && !useAllHotwords}
              >
                应用
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotwordSelection;
