import type { LucideIcon } from 'lucide-react';
import { RadioIcon, UploadIcon, MergeIcon, HelpCircleIcon } from 'lucide-react';

export type RecordingSource = 'live' | 'upload' | 'concatenated' | undefined;

export const getSourceIcon = (source?: RecordingSource): LucideIcon => {
  switch (source) {
    case 'live':
      return RadioIcon;
    case 'upload':
      return UploadIcon;
    case 'concatenated':
      return MergeIcon;
    default:
      return HelpCircleIcon;
  }
};

export const getSourceLabel = (source?: RecordingSource): string => {
  switch (source) {
    case 'live':
      return '实时录制';
    case 'upload':
      return '上传文件';
    case 'concatenated':
      return '拼接录音';
    default:
      return '未知来源';
  }
};
