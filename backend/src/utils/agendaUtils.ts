import type { AgendaItem, AgendaItemStatus } from '../types';

type AgendaItemInput = Omit<AgendaItem, 'status'> & {
  status?: AgendaItemStatus | string | null;
};

const LEGACY_STATUS_MAP: Record<string, AgendaItemStatus> = {
  resolved: 'completed',
  ongoing: 'in_progress',
  pending: 'scheduled',
};

const VALID_STATUSES: AgendaItemStatus[] = [
  'draft',
  'scheduled',
  'in_progress',
  'skipped',
  'completed',
  'deferred',
  'cancelled',
];

const DEFAULT_STATUS: AgendaItemStatus = 'scheduled';

const normalizeAgendaStatus = (status?: AgendaItemInput['status']): AgendaItemStatus => {
  if (!status || typeof status !== 'string') {
    return DEFAULT_STATUS;
  }

  const normalized = status.trim().toLowerCase();
  const matched = VALID_STATUSES.find((candidate) => candidate === normalized);
  if (matched) {
    return matched;
  }

  const legacyMatch = LEGACY_STATUS_MAP[normalized as keyof typeof LEGACY_STATUS_MAP];
  if (legacyMatch) {
    return legacyMatch;
  }

  return DEFAULT_STATUS;
};

export const normalizeAgendaItems = (
  agenda?: Array<AgendaItemInput | null | undefined> | null,
): AgendaItem[] | undefined => {
  if (!Array.isArray(agenda)) {
    return undefined;
  }

  if (agenda.length === 0) {
    return [];
  }

  return agenda
    .map((item, index) => {
      if (!item) {
        return null;
      }

      const { status, ...rest } = item;
      const order = typeof rest.order === 'number' ? rest.order : index + 1;

      const normalized: AgendaItem = {
        ...rest,
        order,
        status: normalizeAgendaStatus(status),
      };

      return normalized;
    })
    .filter((item): item is AgendaItem => item !== null)
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({
      ...item,
      order: index + 1,
    }));
};
