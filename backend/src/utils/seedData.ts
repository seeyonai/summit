import { getCollection, COLLECTIONS, MeetingDocument, HotwordDocument, RecordingDocument } from '../types/mongodb';
import { ObjectId } from 'mongodb';
import { Meeting, Hotword, Recording, RecordingCreate, SpeakerSegment, MeetingCreate, HotwordCreate } from '../types';

export interface SeedData {
  meetings: Array<MeetingCreate & { recordings?: RecordingCreate[] }>;
  hotwords: HotwordCreate[];
  recordings: RecordingCreate[];
}

export class DataSeeder {
  private mockData: SeedData = {
    meetings: [
      {
        title: '产品规划会议',
        description: '讨论下季度产品功能和路线图',
        status: 'completed',
        scheduledStart: new Date('2024-01-15T09:00:00'),
        recordings: [
          {
            filePath: '/recordings/product-meeting.wav',
            filename: 'product-meeting.wav',
            duration: 6400,
            fileSize: 1024000,
            transcription: '会议记录：讨论了Q2产品功能优先级，确定了用户界面改进计划。',
            verbatimTranscript: '[逐字稿示例]\n嗯... 会议记录：讨论了Q2产品功能优先级，确定了用户界面改进计划。',
            speakerSegments: [
              { startTime: 0.08, endTime: 23.84, speakerIndex: 0 },
              { startTime: 24.12, endTime: 32.19, speakerIndex: 1 },
              { startTime: 32.47, endTime: 34.7, speakerIndex: 1 }
            ],
            numSpeakers: 2,
            sampleRate: 16000,
            channels: 1,
            format: 'wav',
          }
        ],
        finalTranscript: '会议记录：讨论了Q2产品功能优先级，确定了用户界面改进计划。',
        parsedTodos: [
          {
            text: '完成用户界面设计稿',
            completed: true,
            priority: 'high',
            category: '设计',
            dueDate: '2024-01-25'
          },
          {
            text: '准备产品需求文档',
            completed: false,
            priority: 'high',
            category: '产品',
            dueDate: '2024-01-30'
          },
          {
            text: '与开发团队讨论技术实现',
            completed: false,
            priority: 'medium',
            category: '开发',
            dueDate: '2024-02-05'
          }
        ],
        participants: 8,
        discussionPoints: []
      },
      {
        title: '技术架构评审',
        description: '新系统架构设计评审会议',
        status: 'in_progress',
        scheduledStart: new Date('2024-01-16T14:00:00'),
        recordings: [
          {
            filePath: '/recordings/tech-review.wav',
            filename: 'tech-review.wav',
            duration: 3200,
            fileSize: 512000,
            transcription: '技术架构评审会议记录...',
            verbatimTranscript: '[逐字稿示例]\n嗯... 技术架构评审会议记录...',
            speakerSegments: [
              { startTime: 0.08, endTime: 23.84, speakerIndex: 0 },
              { startTime: 24.12, endTime: 32.19, speakerIndex: 1 },
              { startTime: 32.47, endTime: 34.7, speakerIndex: 1 }
            ],
            numSpeakers: 2,
            sampleRate: 16000,
            channels: 1,
            format: 'wav'
          }
        ],
        finalTranscript: '技术架构评审会议记录',
        parsedTodos: [
          {
            text: '完成架构图绘制',
            completed: true,
            priority: 'high',
            category: '技术'
          },
          {
            text: '编写技术文档',
            completed: false,
            priority: 'medium',
            category: '文档'
          }
        ],
        participants: 5,
        discussionPoints: []
      },
      {
        title: '团队周会',
        description: '本周工作总结和下周计划',
        status: 'scheduled',
        scheduledStart: new Date('2024-01-17T10:00:00'),
        parsedTodos: [
          {
            text: '准备周会PPT',
            completed: false,
            priority: 'low',
            category: '会议'
          }
        ],
        participants: 12,
        discussionPoints: []
      }
    ],
    hotwords: [
      {
        word: '产品',
        isActive: true
      },
      {
        word: '技术',
        isActive: true
      },
      {
        word: '设计',
        isActive: true
      },
      {
        word: '开发',
        isActive: true
      },
      {
        word: '测试',
        isActive: true
      }
    ],
    recordings: [
      {
        filePath: '/recordings/meeting1.wav',
        filename: 'meeting1.wav',
        duration: 5400,
        fileSize: 43200000,
        transcription: '今天我们讨论了第四季度的产品策略...',
        verbatimTranscript: '[逐字稿示例]\n嗯... 今天我们讨论了第四季度的产品策略...',
        speakerSegments: [
          { startTime: 0.08, endTime: 23.84, speakerIndex: 0 },
          { startTime: 24.12, endTime: 32.19, speakerIndex: 1 },
          { startTime: 32.47, endTime: 34.7, speakerIndex: 1 }
        ],
        numSpeakers: 2,
        sampleRate: 16000,
        channels: 1,
        format: 'wav'
      }
    ]
  };

  async seedData(): Promise<void> {
    try {
      console.log('🌱 Starting data seeding...');

      await this.seedMeetings();
      await this.seedHotwords();
      await this.seedRecordings();

      console.log('✅ Data seeding completed successfully');
    } catch (error) {
      console.error('❌ Error during data seeding:', error);
      throw error;
    }
  }

  private async seedMeetings(): Promise<void> {
    const collection = getCollection<MeetingDocument>(COLLECTIONS.MEETINGS);

    console.log('📋 Seeding meetings...');

    for (const meeting of this.mockData.meetings) {
      const { recordings, ...meetingData } = meeting;
      // Delete existing meeting
      await collection.deleteOne({ title: meetingData.title });
      const result = await collection.insertOne({
        ...meetingData,
        _id: new ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`📋 Seeded meeting ${meetingData.title}`);
      if (Array.isArray(recordings)) {
        const meetingId = result.insertedId;
        const recordingCollection = getCollection<RecordingDocument>(COLLECTIONS.RECORDINGS);
        for (const recording of recordings) {
          const recordingData = {
            ...recording,
            _id: new ObjectId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            meetingId,
          };
          await recordingCollection.insertOne(recordingData);
          console.log(`🎵 Seeded recording ${recording.filename}`);
        }
      }
    }

    console.log(`📋 Seeded ${this.mockData.meetings.length} meetings`);
  }

  private async seedHotwords(): Promise<void> {
    const collection = getCollection<HotwordDocument>(COLLECTIONS.HOTWORDS);

    console.log('🔥 Seeding hotwords...');

    for (const hotword of this.mockData.hotwords) {
      const hotwordData = {
        word: hotword.word,
        isActive: hotword.isActive,
        _id: new ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await collection.deleteOne({ word: hotword.word });
      await collection.insertOne(hotwordData);
      console.log(`🔥 Seeded hotword ${hotword.word}`);
    }

    console.log(`🔥 Seeded ${this.mockData.hotwords.length} hotwords`);
  }

  private async seedRecordings(): Promise<void> {
    const collection = getCollection<RecordingDocument>(COLLECTIONS.RECORDINGS);

    console.log('🎵 Seeding recordings...');

    for (const recording of this.mockData.recordings) {
      const recordingData = {
        ...recording,
        _id: new ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await collection.deleteOne({ filename: recording.filename });
      await collection.insertOne(recordingData);
      console.log(`🎵 Seeded recording ${recording.filename}`);
    }
    console.log(`🎵 Seeded ${this.mockData.recordings.length} recordings`);
  }

  async clearAllData(): Promise<void> {
    try {
      console.log('🧹 Clearing all data...');

      const meetingsCollection = getCollection<MeetingDocument>(COLLECTIONS.MEETINGS);
      const hotwordsCollection = getCollection<HotwordDocument>(COLLECTIONS.HOTWORDS);
      const recordingsCollection = getCollection<RecordingDocument>(COLLECTIONS.RECORDINGS);

      await meetingsCollection.deleteMany({});
      await hotwordsCollection.deleteMany({});
      await recordingsCollection.deleteMany({});

      console.log('🧹 All data cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing data:', error);
      throw error;
    }
  }

  async getDataCounts(): Promise<{ meetings: number; hotwords: number; recordings: number }> {
    const meetingsCollection = getCollection<MeetingDocument>(COLLECTIONS.MEETINGS);
    const hotwordsCollection = getCollection<HotwordDocument>(COLLECTIONS.HOTWORDS);
    const recordingsCollection = getCollection<RecordingDocument>(COLLECTIONS.RECORDINGS);

    const [meetings, hotwords, recordings] = await Promise.all([
      meetingsCollection.countDocuments(),
      hotwordsCollection.countDocuments(),
      recordingsCollection.countDocuments()
    ]);

    return { meetings, hotwords, recordings };
  }
}
