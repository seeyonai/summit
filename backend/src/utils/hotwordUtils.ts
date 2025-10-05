export const splitHotwordString = (value: string): string[] => {
  return value
    .split(/[\s]*[，、,][\s]*/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
};

export const normalizeHotwords = (input: unknown): string[] | undefined => {
  if (input === null || input === undefined) {
    return undefined;
  }

  if (Array.isArray(input)) {
    const result = input.reduce<string[]>((list, entry) => {
      if (typeof entry !== 'string') {
        return list;
      }
      const trimmed = entry.trim();
      if (trimmed.length > 0) {
        list.push(trimmed);
      }
      return list;
    }, []);
    return result;
  }

  if (typeof input === 'string') {
    const tokens = splitHotwordString(input);
    return tokens.length > 0 ? tokens : [];
  }

  return undefined;
};

export const mergeHotwordLists = (base: string[] | undefined, additions: string[] | undefined): {
  merged: string[];
  changed: boolean;
} => {
  const existing = Array.isArray(base) ? base.slice() : [];
  const extra = Array.isArray(additions) ? additions : [];

  if (extra.length === 0) {
    return { merged: existing, changed: false };
  }

  const seen = new Set(existing);
  let changed = false;

  extra.forEach((word) => {
    if (!seen.has(word)) {
      seen.add(word);
      existing.push(word);
      changed = true;
    }
  });

  return { merged: existing, changed };
};
