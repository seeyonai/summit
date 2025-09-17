// File size and format utilities

export const formatFileSize = (bytes: number): string => {
  if (!bytes) return '未知大小';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let fileSize = bytes;
  
  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024;
    unitIndex++;
  }
  
  return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
};

export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

export const isAudioFile = (filename: string): boolean => {
  const audioExtensions = ['wav', 'mp3', 'flac', 'm4a', 'aac', 'ogg', 'wma'];
  const extension = getFileExtension(filename).toLowerCase();
  return audioExtensions.includes(extension);
};

export const formatAudioDuration = (seconds: number): string => {
  if (!seconds) return '未知时长';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const generateFileName = (prefix: string, extension: string): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}_${timestamp}.${extension}`;
};

export const sanitizeFileName = (filename: string): string => {
  return filename.replace(/[<>:"/\\|?*]/g, '_').trim();
};

// Re-export formatDuration from dateHelpers for backward compatibility
export const formatDuration = (seconds: number): string => {
  if (!seconds) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Re-export formatDate from dateHelpers for backward compatibility
export const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '-';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};