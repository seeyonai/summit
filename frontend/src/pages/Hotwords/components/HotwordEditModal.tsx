import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import HotwordEditForm from './HotwordEditForm';
import type { Hotword, HotwordUpdate } from '@/types';

interface HotwordEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotword: Hotword | null;
  onSubmit: (hotword: HotwordUpdate) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string;
}

function HotwordEditModal({ open, onOpenChange, hotword, onSubmit, onCancel, isLoading, error }: HotwordEditModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>编辑热词</DialogTitle>
          <DialogDescription>修改热词的内容或启用状态</DialogDescription>
        </DialogHeader>
        {hotword && (
          <HotwordEditForm hotword={hotword} onSubmit={onSubmit} onCancel={onCancel} isLoading={isLoading} error={error} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default HotwordEditModal;
