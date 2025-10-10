import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import type { Server as HttpServer, IncomingMessage } from 'http';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { getCollection } from '../config/database';
import { COLLECTIONS, RecordingDocument } from '../types/documents';
import { debug, debugWarn } from '../utils/logger';
import { getFilesBaseDir, resolveWithinBase } from '../utils/filePaths';
import { writeEncryptedFile } from '../utils/audioEncryption';
import { buildRecordingFilename } from '../utils/recordingHelpers';

interface ActiveRecording {
  id: string; // ephemeral session id
  chunks: Buffer[];
  startTime: Date;
  ws: WebSocket;
  documentId?: ObjectId;
}

export class LiveRecorderService {
  private wss: WebSocketServer;
  private activeRecordings: Map<string, ActiveRecording> = new Map();

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/live-recorder'
    });

    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers() {
    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      void this.initializeConnection(ws, request);
    });
  }

  private async initializeConnection(ws: WebSocket, request?: IncomingMessage) {
    debug('New WebSocket connection for live recorder');
    debug('WebSocket connected from client on port 2591');

    const sessionId = uuidv4();
    let documentId: ObjectId | undefined;
    let recordingIdForClient: string | undefined;

    if (request?.url) {
      try {
        const parsedUrl = new URL(request.url, 'http://localhost');
        const requestedRecordingId = parsedUrl.searchParams.get('recordingId');

        if (requestedRecordingId && ObjectId.isValid(requestedRecordingId)) {
          documentId = new ObjectId(requestedRecordingId);
          recordingIdForClient = requestedRecordingId;
        }
      } catch (error) {
        debugWarn('Failed to parse WebSocket request URL for live recorder', error as Error);
      }
    }

    const activeRecording: ActiveRecording = {
      id: sessionId,
      chunks: [],
      startTime: new Date(),
      ws,
      documentId
    };

    this.activeRecordings.set(sessionId, activeRecording);

    const readyPayload: Record<string, unknown> = {
      type: 'ready',
      message: '准备接收音频数据',
      recordingId: recordingIdForClient ?? sessionId
    };

    ws.send(JSON.stringify(readyPayload));

    ws.on('message', (data: Buffer | string) => {
      // Handle text messages (control messages like stop)
      if (typeof data === 'string' || (Buffer.isBuffer(data) && data.length < 1000)) {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'stop') {
            debug(`Received stop message for recording session ${sessionId}`);
            this.handleConnectionClose(sessionId);
            return;
          }
        } catch (e) {
          // Not JSON, treat as audio
        }
      }
      // Handle binary audio data
      this.handleAudioChunk(sessionId, data as Buffer);
    });

    ws.on('close', () => {
      debug('WebSocket disconnected from client on port 2591');
      this.handleConnectionClose(sessionId);
    });

    ws.on('error', (error: Error) => {
      console.error(`WebSocket error for recording session ${sessionId}:`, error);
      debug('WebSocket connection failed from client on port 2591');
      this.handleConnectionClose(sessionId);
    });
  }

  private handleAudioChunk(recordingId: string, chunk: Buffer) {
    const recording = this.activeRecordings.get(recordingId);
    if (!recording) {
      debugWarn(`Received chunk for unknown recording: ${recordingId}`);
      return;
    }

    try {
      debug(`Received audio chunk for recording ${recordingId}: ${chunk.length} bytes`);
      recording.chunks.push(chunk);
      
      // Send acknowledgment
      recording.ws.send(JSON.stringify({
        type: 'chunk_received',
        chunkSize: chunk.length,
        totalChunks: recording.chunks.length
      }));
    } catch (error) {
      console.error(`Error handling audio chunk for recording ${recordingId}:`, error);
      recording.ws.send(JSON.stringify({
        type: 'error',
        message: '音频数据处理失败'
      }));
    }
  }

  private handleConnectionClose(recordingId: string) {
    const recording = this.activeRecordings.get(recordingId);
    if (!recording) return;

    debug(`WebSocket connection closed for recording: ${recordingId}`);
    debug(`Total chunks received: ${recording.chunks.length}`);

    if (recording.chunks.length > 0) {
      this.saveRecording(recording);
    } else {
      debug(`No audio chunks received for recording ${recordingId}, skipping save`);
      this.activeRecordings.delete(recordingId);
    }
  }

  private async saveRecording(recording: ActiveRecording) {
    try {
      debug(`Starting to save recording session ${recording.id}`);
      
      // Concatenate all audio chunks
      const audioBuffer = Buffer.concat(recording.chunks);
      
      // Create WAV header for PCM 16-bit mono audio at 16kHz (matching reference)
      const sampleRate = 16000;
      const bitsPerSample = 16;
      const channels = 1;
      const byteRate = sampleRate * channels * bitsPerSample / 8;
      const blockAlign = channels * bitsPerSample / 8;
      
      const numSamples = audioBuffer.length / 2; // 16-bit = 2 bytes per sample
      
      // Create WAV header using reference implementation
      const wavHeader = this.writeWavHeader(
        audioBuffer,
        numSamples,
        channels,
        sampleRate,
        byteRate,
        blockAlign,
        bitsPerSample
      );
      
      // Combine header and audio data
      const wavBuffer = Buffer.concat([wavHeader, audioBuffer]);
      
      const duration = Math.floor((Date.now() - recording.startTime.getTime()) / 1000);

      // Create or update Recording document in database
      let insertedId: string | null = null;
      try {
        const collection = await getCollection<RecordingDocument>(COLLECTIONS.RECORDINGS);
        const now = new Date();
        let targetObjectId = recording.documentId ?? null;

        if (targetObjectId) {
          const updateResult = await collection.updateOne(
            { _id: targetObjectId },
            {
              $set: {
                duration,
                fileSize: wavBuffer.length,
                source: 'live',
                sampleRate: 16000,
                channels: 1,
                format: 'wav',
                updatedAt: now
              }
            }
          );

          if (updateResult.matchedCount === 0) {
            debugWarn(`Recording document ${targetObjectId.toHexString()} not found for session ${recording.id}, creating new document`);
            targetObjectId = null;
          } else {
            insertedId = targetObjectId.toHexString();
            debug(`Recording document updated with ID: ${insertedId}`);
          }
        }

        if (!targetObjectId) {
          const recordingObjectId = new ObjectId();
          const recordingDocument: RecordingDocument = {
            _id: recordingObjectId,
            // originalFileName not set for live recordings
            duration,
            fileSize: wavBuffer.length,
            source: 'live',
            sampleRate: 16000,
            channels: 1,
            format: 'wav',
            createdAt: now,
            updatedAt: now
          };

          const result = await collection.insertOne(recordingDocument);
          targetObjectId = result.insertedId;
          insertedId = targetObjectId.toHexString();
          debug(`Recording document created with ID: ${insertedId}`);
        }
      } catch (dbError) {
        console.error('Error creating Recording document:', dbError);
      }

      // Persist file to disk using <_id>.<ext>
      if (insertedId) {
        const filesDir = getFilesBaseDir();
        if (!fs.existsSync(filesDir)) {
          fs.mkdirSync(filesDir, { recursive: true });
        }
        const storedName = buildRecordingFilename(insertedId, 'wav');
        const fullPath = resolveWithinBase(filesDir, storedName);
        try {
          await writeEncryptedFile(fullPath, wavBuffer);
          debug(`Recording saved: ${storedName} (${wavBuffer.length} bytes, ${duration}s)`);

          // Send completion message with id-based download URL
          recording.ws.send(JSON.stringify({
            type: 'recording_saved',
            recordingId: insertedId,
            downloadUrl: `/files/${insertedId}`,
            duration,
            chunksCount: recording.chunks.length,
            fileSize: wavBuffer.length
          }));
        } catch (fileError) {
          console.error('Failed to persist encrypted live recording:', fileError);
          recording.ws.send(JSON.stringify({ type: 'error', message: '无法保存录音文件' }));
        }
      } else {
        recording.ws.send(JSON.stringify({ type: 'error', message: '无法保存录音记录' }));
      }
      
      // Clean up
      this.activeRecordings.delete(recording.id);
      
    } catch (error) {
      console.error(`Error saving recording ${recording.id}:`, error);
      
      try {
        recording.ws.send(JSON.stringify({
          type: 'error',
          message: '录音保存失败'
        }));
      } catch (wsError) {
        console.error('Error sending error message:', wsError);
      }
      
      this.activeRecordings.delete(recording.id);
    }
  }

  public stopRecording(recordingId: string) {
    const recording = this.activeRecordings.get(recordingId);
    if (recording) {
      recording.ws.close();
    }
  }

  private writeWavHeader(buffer: Buffer, numSamples: number, numChannels: number, sampleRate: number, byteRate: number, blockAlign: number, bitsPerSample: number): Buffer {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + buffer.length, 4); // File size
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Format chunk size
    header.writeUInt16LE(1, 20); // PCM format
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(buffer.length, 40); // Data chunk size
    return header;
  }

  public getActiveRecordings() {
    return Array.from(this.activeRecordings.values()).map(r => ({
      id: r.id,
      startTime: r.startTime,
      chunksCount: r.chunks.length
    }));
  }
}
