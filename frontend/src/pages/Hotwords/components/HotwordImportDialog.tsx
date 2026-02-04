import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle2, AlertCircle, FileText, Loader2 } from 'lucide-react';
import type { HotwordImportResponse } from '@/types';

interface HotwordImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File) => Promise<HotwordImportResponse>;
}

function HotwordImportDialog({ open, onOpenChange, onImport }: HotwordImportDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HotwordImportResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetState = () => {
    setIsDragging(false);
    setIsImporting(false);
    setError(null);
    setResult(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setError('请上传 CSV 或 TXT 格式的文件');
      return;
    }

    setError(null);
    setIsImporting(true);

    try {
      const importResult = await onImport(file);
      setResult(importResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败');
    } finally {
      setIsImporting(false);
    }
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
      void processFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      void processFile(files[0]);
      e.target.value = '';
    }
  };

  const handleSelectFileClick = () => {
    if (isImporting) return;
    fileInputRef.current?.click();
  };

  const summary = result?.summary ?? (result ? {
    total: result.created.length + (result.skipped?.length ?? 0) + (result.invalid?.length ?? 0) + (result.duplicates?.length ?? 0),
    created: result.created.length,
    skipped: result.skipped?.length ?? 0,
    invalid: result.invalid?.length ?? 0,
    duplicates: result.duplicates?.length ?? 0,
  } : null);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>批量导入热词</DialogTitle>
          <DialogDescription>支持 CSV 格式（逗号分隔）或 TXT 格式（每行一个热词）</DialogDescription>
        </DialogHeader>

        {!result && !isImporting && (
          <div
            onClick={handleSelectFileClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">点击选择文件或拖拽到此处</p>
            <p className="text-xs text-muted-foreground mt-1">支持 .csv 和 .txt 文件</p>
          </div>
        )}

        {isImporting && (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto h-10 w-10 text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">正在导入...</p>
          </div>
        )}

        {error && !result && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">导入失败</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {result && summary && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">导入完成</p>
                <p className="text-sm">成功导入 {summary.created} 个热词</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>总计</span>
                <span className="ml-auto font-medium">{summary.total}</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>新增</span>
                <span className="ml-auto font-medium">{summary.created}</span>
              </div>
              {summary.skipped > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span>跳过</span>
                  <span className="ml-auto font-medium">{summary.skipped}</span>
                </div>
              )}
              {summary.duplicates > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <span>重复</span>
                  <span className="ml-auto font-medium">{summary.duplicates}</span>
                </div>
              )}
              {summary.invalid > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span>无效</span>
                  <span className="ml-auto font-medium">{summary.invalid}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileInput} className="hidden" disabled={isImporting} />

        {result && (
          <DialogFooter>
            <Button onClick={() => handleOpenChange(false)}>完成</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default HotwordImportDialog;
