/**
 * Format a date to a localized string
 * @param date - Date object, string, or undefined
 * @param locale - Locale string (default: 'zh-CN')
 * @returns Formatted date string or '-' if no date
 */
export function formatDate(date: Date | string | undefined, locale = 'zh-CN'): string {
  if (!date) return '-';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) return '-';
  
  return dateObj.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date to a short date string
 * @param date - Date object, string, or undefined
 * @param locale - Locale string (default: 'zh-CN')
 * @returns Formatted short date string
 */
export function formatShortDate(date: Date | string | undefined, locale = 'zh-CN'): string {
  if (!date) return '-';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) return '-';
  
  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 * @param date - Date to compare
 * @returns Relative time string
 */
export function getRelativeTime(date: Date | string): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (Math.abs(diffDay) > 7) {
    return formatShortDate(dateObj);
  }

  if (diffDay > 0) return `${diffDay}天后`;
  if (diffDay < 0) return `${Math.abs(diffDay)}天前`;
  if (diffHour > 0) return `${diffHour}小时后`;
  if (diffHour < 0) return `${Math.abs(diffHour)}小时前`;
  if (diffMin > 0) return `${diffMin}分钟后`;
  if (diffMin < 0) return `${Math.abs(diffMin)}分钟前`;
  
  return '刚刚';
}

/**
 * Check if two dates are on the same day
 * @param first - First date to compare
 * @param second - Second date to compare
 * @returns True if both dates are on the same day
 */
export function isSameDay(first: Date, second: Date): boolean {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}
