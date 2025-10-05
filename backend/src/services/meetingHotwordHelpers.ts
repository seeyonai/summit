import { ObjectId } from 'mongodb';
import { getCollection } from '../config/database';
import { COLLECTIONS, MeetingDocument } from '../types/documents';
import { mergeHotwordLists, normalizeHotwords } from '../utils/hotwordUtils';

const resolveMeetingId = (meetingId: string | ObjectId): ObjectId => {
  if (meetingId instanceof ObjectId) {
    return meetingId;
  }
  if (!ObjectId.isValid(meetingId)) {
    throw new Error('Invalid meeting id');
  }
  return new ObjectId(meetingId);
};

export const mergeHotwordsIntoMeeting = async (
  meetingId: string | ObjectId,
  values: unknown,
): Promise<void> => {
  const normalized = normalizeHotwords(values);
  if (!normalized || normalized.length === 0) {
    return;
  }

  const id = resolveMeetingId(meetingId);
  const collection = getCollection<MeetingDocument>(COLLECTIONS.MEETINGS);
  const meeting = await collection.findOne({ _id: id }, { projection: { hotwords: 1 } as any });
  if (!meeting) {
    return;
  }

  const { merged, changed } = mergeHotwordLists(Array.isArray(meeting.hotwords) ? meeting.hotwords : [], normalized);

  if (!changed) {
    return;
  }

  await collection.updateOne(
    { _id: id },
    {
      $set: {
        hotwords: merged,
        updatedAt: new Date(),
      },
    },
  );
};
