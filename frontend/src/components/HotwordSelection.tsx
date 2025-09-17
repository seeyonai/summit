import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { Hotword } from '@/types';

const HOTWORD_BACKEND_URL = (location.protocol === 'https:' ? 'https://' : 'http://') + 'localhost:2591';

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
  const [selectedHotwords, setSelectedHotwords] = useState<Set<number>>(new Set());
  const [useAllHotwords, setUseAllHotwords] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Fetch hotwords
  const fetchHotwords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${HOTWORD_BACKEND_URL}/api/hotwords`);
      if (!response.ok) {
        throw new Error('Failed to fetch hotwords');
      }
      
      const data = await response.json();
      setHotwords(data);
      
      // Auto-select hotwords that match current hotwords
      const currentWordSet = new Set(currentHotwords);
      const autoSelected = new Set<number>();
      data.forEach((hotword: Hotword) => {
        if (currentWordSet.has(hotword.word)) {
          autoSelected.add(hotword.id);
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

  const handleHotwordToggle = (hotwordId: number) => {
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
    hotwords.forEach(hw => newSelected.add(hw.id));
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
        .filter(hw => selectedHotwords.has(hw.id))
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              选择热词
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="搜索热词..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                全选
              </button>
              <button
                onClick={handleClearAll}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                清除
              </button>
            </div>
          </div>

          {/* Use All Hotwords Toggle */}
          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="useAllHotwords"
              checked={useAllHotwords}
              onChange={(e) => setUseAllHotwords(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="useAllHotwords" className="text-sm font-medium text-gray-700">
              使用所有热词 ({hotwords.length} 个)
            </label>
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
                  key={hotword.id}
                  className={`flex items-center p-2 border rounded-lg cursor-pointer transition-colors ${
                    selectedHotwords.has(hotword.id) || useAllHotwords
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedHotwords.has(hotword.id) || useAllHotwords}
                    onChange={() => handleHotwordToggle(hotword.id)}
                    disabled={useAllHotwords}
                    className="mr-2"
                  />
                  <span className={`text-sm ${useAllHotwords ? 'text-blue-700' : 'text-gray-900'}`}>
                    {hotword.word}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              已选择 {useAllHotwords ? hotwords.length : selectedHotwords.size} 个热词
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleApply}
                disabled={selectedHotwords.size === 0 && !useAllHotwords}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                应用
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotwordSelection;
