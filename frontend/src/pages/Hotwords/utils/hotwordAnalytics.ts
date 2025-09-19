export interface HotwordAnalytics {
  totalHotwords: number;
  activeHotwords: number;
  inactiveHotwords: number;
  recentlyAdded: number;
  averageLength: number;
  mostCommonLength: number;
}

export const getHotwordAnalytics = (hotwords: Hotword[]): HotwordAnalytics => {
  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const total = hotwords.length;
  const active = hotwords.filter(h => h.isActive).length;
  const inactive = total - active;
  const recentlyAdded = hotwords.filter(h => 
    new Date(h.createdAt) > lastWeek
  ).length;

  const lengths = hotwords.map(h => h.word.length);
  const averageLength = lengths.length > 0 
    ? lengths.reduce((sum, len) => sum + len, 0) / lengths.length 
    : 0;

  const lengthCounts = lengths.reduce((acc, len) => {
    acc[len] = (acc[len] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const mostCommonLength = Object.entries(lengthCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 0;

  return {
    totalHotwords: total,
    activeHotwords: active,
    inactiveHotwords: inactive,
    recentlyAdded: recentlyAdded,
    averageLength: Math.round(averageLength * 10) / 10,
    mostCommonLength: parseInt(mostCommonLength.toString()),
  };
};

export const getHotwordSuggestions = (existingHotwords: Hotword[], text: string): string[] => {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2);

  const existingWords = new Set(
    existingHotwords.map(h => h.word.toLowerCase())
  );

  return [...new Set(words)]
    .filter(word => !existingWords.has(word))
    .slice(0, 10);
};