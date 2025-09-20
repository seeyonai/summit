import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import HotwordForm from './HotwordForm';
import type { HotwordCreate } from '@/types';

interface HotwordCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (hotword: HotwordCreate) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

function HotwordCreateModal({ open, onOpenChange, onSubmit, isLoading, error }: HotwordCreateModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>创建新热词</DialogTitle>
          <DialogDescription>输入热词以提升识别效果</DialogDescription>
        </DialogHeader>
        <HotwordForm onSubmit={onSubmit} isLoading={isLoading} error={error} />
      </DialogContent>
    </Dialog>
  );
}

export default HotwordCreateModal;
