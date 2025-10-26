import React, { useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download, Upload } from 'lucide-react';
import type { Hotword } from '@/types';

interface HotwordBulkActionsProps {
  hotwords: Hotword[];
  onImport: (file: File) => Promise<void>;
  onExport: () => Promise<void>;
  error?: string;
  isImporting?: boolean;
  isExporting?: boolean;
}

const HotwordBulkActions: React.FC<HotwordBulkActionsProps> = ({ hotwords, onImport, onExport, error, isImporting = false, isExporting = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [invalidFileError, setInvalidFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelection = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setInvalidFileError('请上传 CSV 或 TXT 格式的文件');
      return;
    }
    setSelectedFile(file);
  };

  const handleExportClick = () => {
    void onExport();
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
      handleFileSelection(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
      e.target.value = '';
    }
  };

  const handleImportClick = async () => {
    if (!selectedFile || isImporting) {
      return;
    }
    try {
      await onImport(selectedFile);
      setSelectedFile(null);
    } catch {
      // keep selected file for retry
    }
  };

  const handleSelectFileClick = () => {
    if (isImporting) {
      return;
    }
    fileInputRef.current?.click();
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
        <Button variant="outline" onClick={handleExportClick} disabled={hotwords.length === 0 || isExporting} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          {isExporting ? '导出中...' : `导出热词 (${hotwords.length})`}
        </Button>

        <Button variant="outline" className="flex-1 flex items-center gap-2" onClick={handleSelectFileClick} disabled={isImporting}>
          <Upload className="h-4 w-4" />
          {selectedFile ? '重新选择文件' : '选择文件'}
        </Button>

        <Button className="flex-1" onClick={handleImportClick} disabled={!selectedFile || isImporting}>
          {isImporting ? '导入中...' : '导入热词'}
        </Button>

        <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileInput} className="hidden" disabled={isImporting} />
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">拖拽文件到此处或点击上方按钮上传</p>
        <p className="text-xs text-gray-500 mt-1">支持 CSV 格式（使用逗号分隔）和 TXT 格式（每行一个热词）</p>
        {selectedFile && <p className="text-xs text-blue-600 mt-2">已选择文件：{selectedFile.name}</p>}
      </div>

      {/* Invalid File Error Dialog */}
      <AlertDialog open={invalidFileError !== null} onOpenChange={(open) => !open && setInvalidFileError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>文件格式错误</AlertDialogTitle>
            <AlertDialogDescription>{invalidFileError}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setInvalidFileError(null)}>确定</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HotwordBulkActions;
