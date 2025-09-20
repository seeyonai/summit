import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download, Upload } from 'lucide-react';
import type { Hotword } from '@/types';
import { exportHotwords } from '@/pages/Hotwords/utils/hotwordUtils';

interface HotwordBulkActionsProps {
  hotwords: Hotword[];
  onImport: (file: File) => Promise<void>;
  onExport: () => void;
  error?: string;
  isLoading?: boolean;
}

const HotwordBulkActions: React.FC<HotwordBulkActionsProps> = ({
  hotwords,
  onImport,
  onExport,
  error,
  isLoading = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      alert('请上传 CSV 或 TXT 格式的文件');
      return;
    }

    await onImport(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onExport}
          disabled={hotwords.length === 0}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          导出热词 ({hotwords.length})
        </Button>

        <label className="flex-1">
          <Button
            variant="outline"
            className="w-full flex items-center gap-2"
            disabled={isLoading}
          >
            <Upload className="h-4 w-4" />
            {isLoading ? '导入中...' : '导入热词'}
          </Button>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFileInput}
            className="hidden"
            disabled={isLoading}
          />
        </label>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">
          拖拽文件到此处或点击上方按钮上传
        </p>
        <p className="text-xs text-gray-500 mt-1">
          支持 CSV 和 TXT 格式，每行一个热词
        </p>
      </div>
    </div>
  );
};

export default HotwordBulkActions;