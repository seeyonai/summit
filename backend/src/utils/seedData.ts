/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

import { ObjectId } from 'mongodb';
import { getCollection } from '../config/database';
import { COLLECTIONS, MeetingDocument, HotwordDocument, RecordingDocument } from '../types/documents';
import { RecordingCreate, MeetingCreate, HotwordCreate } from '../types';
import { normalizeAgendaItems } from './agendaUtils';

const isMeetingDocumentCandidate = (value: unknown): value is MeetingDocument => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<MeetingDocument>;
  return candidate._id instanceof ObjectId
    && typeof candidate.title === 'string'
    && typeof candidate.status === 'string'
    && candidate.createdAt instanceof Date;
};

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
        agenda: [
          { order: 1, text: '回顾上季度产品表现', status: 'completed' },
          { order: 2, text: '讨论下季度产品功能优先级', status: 'completed' },
          { order: 3, text: '确定用户界面改进计划', status: 'completed' },
          { order: 4, text: '分配产品需求文档任务', status: 'completed' }
        ],
        summary: '讨论下季度产品功能和路线图',
        status: 'completed',
        scheduledStart: new Date('2024-01-15T09:00:00'),
        recordings: [
          {
            originalFileName: 'product-meeting.wav',
            duration: 6400,
            fileSize: 1024000,
            transcription: '会议记录：讨论了Q2产品功能优先级，确定了用户界面改进计划。',
            verbatimTranscript: '[逐字稿示例]\n嗯... 会议记录：讨论了Q2产品功能优先级，确定了用户界面改进计划。',
            speakerSegments: [
              { startTime: 0.08, endTime: 23.84, speakerIndex: 0 },
              { startTime: 24.12, endTime: 32.19, speakerIndex: 1 },
              { startTime: 32.47, endTime: 34.7, speakerIndex: 1 }
            ],
            timeStampedNotes: [
              { timestamp: 15.2, text: '重要决策点：用户界面改进计划已确定' },
              { timestamp: 28.7, text: '需要在下周五之前完成产品需求文档' }
            ],
            numSpeakers: 2,
            sampleRate: 16000,
            channels: 1,
            format: 'wav',
          },
          {
            originalFileName: 'product-meeting-2.wav',
            duration: 4800,
            fileSize: 768000,
            transcription: '后续会议记录：进一步讨论了产品需求文档的细节和实施计划。',
            verbatimTranscript: '[逐字稿示例]\n嗯... 后续会议记录：进一步讨论了产品需求文档的细节和实施计划。',
            speakerSegments: [
              { startTime: 0.05, endTime: 18.42, speakerIndex: 0 },
              { startTime: 18.75, endTime: 25.33, speakerIndex: 1 },
              { startTime: 25.61, endTime: 30.15, speakerIndex: 2 }
            ],
            timeStampedNotes: [
              { timestamp: 12.3, text: '确定了产品需求文档的负责人' },
              { timestamp: 22.8, text: '制定了实施时间表' }
            ],
            numSpeakers: 3,
            sampleRate: 16000,
            channels: 1,
            format: 'wav',
          }
        ],
        finalTranscript: '会议记录：讨论了Q2产品功能优先级，确定了用户界面改进计划。',
        todos: [
          {
            text: '完成用户界面设计稿',
            completed: true,
            priority: 'high',
            dueDate: '2024-01-25'
          },
          {
            text: '准备产品需求文档',
            completed: false,
            priority: 'high',
            dueDate: '2024-01-30'
          },
          {
            text: '与开发团队讨论技术实现',
            completed: false,
            priority: 'medium',
            dueDate: '2024-02-05'
          }
        ],
        disputedIssues: [
          {
            text: '是否应该优先开发移动端应用而不是Web端'
          },
          {
            text: '产品功能发布的时间节点存在分歧'
          }
        ]
      },
      {
        title: '技术架构评审',
        agenda: [
          { order: 1, text: '介绍新系统架构设计', status: 'in_progress' },
          { order: 2, text: '讨论微服务设计方案', status: 'completed' },
          { order: 3, text: '评审数据库选型', status: 'completed' },
          { order: 4, text: '确定技术实施路线图', status: 'scheduled' }
        ],
        summary: '新系统架构设计评审会议',
        status: 'in_progress',
        scheduledStart: new Date('2024-01-16T14:00:00'),
        recordings: [
          {
            originalFileName: 'tech-review.wav',
            duration: 3200,
            fileSize: 512000,
            transcription: '技术架构评审会议记录...',
            verbatimTranscript: '[逐字稿示例]\n嗯... 技术架构评审会议记录...',
            speakerSegments: [
              { startTime: 0.08, endTime: 23.84, speakerIndex: 0 },
              { startTime: 24.12, endTime: 32.19, speakerIndex: 1 },
              { startTime: 32.47, endTime: 34.7, speakerIndex: 1 }
            ],
            timeStampedNotes: [
              { timestamp: 10.5, text: '架构师提出新的微服务设计方案' },
              { timestamp: 18.3, text: '团队讨论了数据库选型问题' }
            ],
            numSpeakers: 2,
            sampleRate: 16000,
            channels: 1,
            format: 'wav'
          }
        ],
        finalTranscript: '技术架构评审会议记录',
        todos: [
          {
            text: '完成架构图绘制',
            completed: true,
            priority: 'high',
          },
          {
            text: '编写技术文档',
            completed: false,
            priority: 'medium',
          }
        ],
        disputedIssues: [
          {
            text: '微服务架构与单体架构的选型争议'
          }
        ]
      },
      {
        title: '团队周会',
        agenda: [
          { order: 1, text: '本周工作总结', status: 'scheduled' },
          { order: 2, text: '下周工作计划', status: 'scheduled' },
          { order: 3, text: '问题与解决方案讨论', status: 'scheduled' }
        ],
        summary: '本周工作总结和下周计划',
        status: 'scheduled',
        scheduledStart: new Date('2024-01-17T10:00:00'),
        todos: [
          {
            text: '准备周会PPT',
            completed: false,
            priority: 'low',
          }
        ],
        disputedIssues: []
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
        originalFileName: 'meeting1.wav',
        duration: 5400,
        fileSize: 43200000,
        transcription: '今天我们讨论了第四季度的产品策略...',
        verbatimTranscript: '[逐字稿示例]\n嗯... 今天我们讨论了第四季度的产品策略...',
        speakerSegments: [
          { startTime: 0.08, endTime: 23.84, speakerIndex: 0 },
          { startTime: 24.12, endTime: 32.19, speakerIndex: 1 },
          { startTime: 32.47, endTime: 34.7, speakerIndex: 1 }
        ],
        timeStampedNotes: [
          { timestamp: 5.2, text: '会议开始，主持人介绍议程' },
          { timestamp: 12.8, text: '产品部门汇报了市场调研结果' },
          { timestamp: 25.4, text: '讨论了预算分配问题' }
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
      delete (meetingData as { concatenatedRecording?: unknown }).concatenatedRecording;
      // Delete existing meeting
      await collection.deleteOne({ title: meetingData.title });
      const meetingIds = [
        '507f1f77bcf86cd799439011', // Product planning meeting ID
        '507f1f77bcf86cd799439012', // Technical architecture review meeting ID
        '507f1f77bcf86cd799439013'  // Team weekly meeting ID
      ];
      const meetingId = meetingIds[this.mockData.meetings.indexOf(meeting)];
      
      const now = new Date();
      const meetingDocument: Omit<MeetingDocument, '_id'> = {
        ...meetingData,
        agenda: normalizeAgendaItems(meetingData.agenda),
        createdAt: now,
        updatedAt: now,
        recordings: [],
      };

      const documentToInsert = {
        ...meetingDocument,
        _id: new ObjectId(meetingId),
      };

      if (!isMeetingDocumentCandidate(documentToInsert)) {
        throw new Error('Invalid meeting document payload during seeding');
      }

      const result = await collection.insertOne(documentToInsert);
      console.log(`📋 Seeded meeting ${meetingData.title}`);
      if (Array.isArray(recordings)) {
        const meetingId = result.insertedId;
        const recordingCollection = getCollection<RecordingDocument>(COLLECTIONS.RECORDINGS);
        for (const recording of recordings) {
          const { originalFileName } = recording;
          if (originalFileName) {
            await recordingCollection.deleteMany({ originalFileName });
          }
          const recordingIds = [
            '507f1f77bcf86cd799439014', // Product meeting recording 1
            '507f1f77bcf86cd799439015', // Product meeting recording 2
            '507f1f77bcf86cd799439016'  // Technical review recording
          ];
          
          const recordingData = {
            ...recording,
            _id: new ObjectId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            meetingId,
          };
          
          // For recordings associated with meetings, use a predictable ID
          if (meeting.title === '产品规划会议' && originalFileName === 'product-meeting.wav') {
            recordingData._id = new ObjectId(recordingIds[0]);
          } else if (meeting.title === '产品规划会议' && originalFileName === 'product-meeting-2.wav') {
            recordingData._id = new ObjectId(recordingIds[1]);
          } else if (meeting.title === '技术架构评审' && originalFileName === 'tech-review.wav') {
            recordingData._id = new ObjectId(recordingIds[2]);
          }

          await recordingCollection.insertOne(recordingData);
          console.log(`🎵 Seeded recording ${originalFileName ?? '<unknown>'}`);
        }
      }
    }

    console.log(`📋 Seeded ${this.mockData.meetings.length} meetings`);
  }

  private async seedHotwords(): Promise<void> {
    const collection = getCollection<HotwordDocument>(COLLECTIONS.HOTWORDS);

    console.log('🔥 Seeding hotwords...');

    const hotwordIds = [
      '507f1f77bcf86cd799439018', // Product hotword
      '507f1f77bcf86cd799439019', // Technical hotword
      '507f1f77bcf86cd79943901a', // Design hotword
      '507f1f77bcf86cd79943901b', // Development hotword
      '507f1f77bcf86cd79943901c'  // Test hotword
    ];
    
    for (const hotword of this.mockData.hotwords) {
      const hotwordData = {
        word: hotword.word,
        isActive: hotword.isActive,
        _id: new ObjectId(hotwordIds[this.mockData.hotwords.indexOf(hotword)]),
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: true,
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

    const standaloneRecordingIds = [
      '507f1f77bcf86cd799439017' // Standalone meeting1 recording
    ];
    
    for (const recording of this.mockData.recordings) {
      const recordingData = {
        ...recording,
        _id: new ObjectId(standaloneRecordingIds[0]),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const { originalFileName } = recording;
      if (originalFileName) {
        await collection.deleteMany({ originalFileName });
      }
      await collection.insertOne(recordingData);
      console.log(`🎵 Seeded recording ${originalFileName ?? '<unknown>'}`);
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
