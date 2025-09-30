import type { Hotword, HotwordCreate, HotwordUpdate } from '@/types';

export interface HotwordFormData {
  word: string;
}

export interface HotwordValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateHotword = (word: string): HotwordValidationResult => {
  const errors: string[] = [];

  if (!word || word.trim().length === 0) {
    errors.push('热词不能为空');
  }

  if (word.trim().length > 50) {
    errors.push('热词长度不能超过50个字符');
  }

  if (word.trim().length < 1) {
    errors.push('热词长度不能少于1个字符');
  }

  if (!(/^[\u4e00-\u9fa5a-zA-Z0-9\s\-_]+$/).test(word.trim())) {
    errors.push('热词只能包含中文、英文、数字、空格、连字符和下划线');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const sanitizeHotword = (word: string): string => {
  return word.trim().replace(/\s+/g, ' ');
};

export const formatHotwordForDisplay = (hotword: Hotword): {
  word: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastModified: string;
} => {
  return {
    word: hotword.word,
    status: hotword.isActive ? 'active' : 'inactive',
    createdAt: new Date(hotword.createdAt).toLocaleDateString('zh-CN'),
    lastModified: hotword.updatedAt
      ? new Date(hotword.updatedAt).toLocaleDateString('zh-CN')
      : new Date(hotword.createdAt).toLocaleDateString('zh-CN'),
  };
};

export const filterHotwords = (
  hotwords: Hotword[],
  searchTerm: string,
  statusFilter?: 'all' | 'active' | 'inactive'
): Hotword[] => {
  let filtered = hotwords;

  if (statusFilter && statusFilter !== 'all') {
    filtered = filtered.filter(h =>
      statusFilter === 'active' ? h.isActive : !h.isActive
    );
  }

  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(h => h.word.toLowerCase().includes(term));
  }

  return filtered;
};

export const sortHotwords = (
  hotwords: Hotword[],
  sortBy: 'word' | 'createdAt' | 'status' = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc'
): Hotword[] => {
  return [...hotwords].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'word':
        comparison = a.word.localeCompare(b.word, 'zh-CN');
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'status':
        comparison = a.isActive === b.isActive ? 0 : (a.isActive ? -1 : 1);
        break;
      default:
        comparison = 0;
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
};

export const exportHotwords = (hotwords: Hotword[]): string => {
  const data = hotwords.map(h => ({
    word: h.word,
    isActive: h.isActive ? '是' : '否',
    createdAt: new Date(h.createdAt).toLocaleString('zh-CN'),
    updatedAt: h.updatedAt
      ? new Date(h.updatedAt).toLocaleString('zh-CN')
      : '-',
  }));

  const headers = ['热词', '启用状态', '创建时间', '最后修改'];
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header as keyof typeof row];
        return typeof value === 'string' && value.includes(',')
          ? `"${value}"`
          : value;
      }).join(',')
    ),
  ].join('\n');

  return csvContent;
};

export type { Hotword, HotwordCreate, HotwordUpdate };
