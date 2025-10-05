import type { SpeakerName } from "@/types";

export type SpeakerNameMap = Record<number, string>;

export const buildSpeakerNameMap = (speakerNames?: SpeakerName[]): SpeakerNameMap => {
  if (!speakerNames || speakerNames.length === 0) {
    return {};
  }

  return speakerNames.reduce<SpeakerNameMap>((accumulator, entry) => {
    const trimmedName = entry.name?.trim();
    if (typeof entry.index === 'number' && trimmedName) {
      accumulator[entry.index] = trimmedName;
    }
    return accumulator;
  }, {});
};

export const getSpeakerDisplayName = (
  speakerIndex: number,
  speakerNameMap: SpeakerNameMap,
  fallbackPrefix = '说话人'
): string => {
  const displayName = speakerNameMap[speakerIndex];
  if (displayName && displayName.trim()) {
    return displayName.trim();
  }

  return `${fallbackPrefix} ${speakerIndex + 1}`;
};
