import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import type { Server as HttpServer } from 'http';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { getFilesBaseDir, resolveWithinBase } from '../utils/filePaths';
import { getCollection } from '../config/database';
import { COLLECTIONS, RecordingDocument } from '../types/documents';
import { debug, debugWarn } from '../utils/logger';

interface ActiveRecording {
  id: string; // ephemeral session id
  chunks: Buffer[];
  startTime: Date;
  ws: WebSocket;
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
    this.wss.on('connection', (ws: WebSocket) => {
      debug('New WebSocket connection for live recorder');
      debug('WebSocket connected from client on port 2591');

      const recordingId = uuidv4();

      const activeRecording: ActiveRecording = {
        id: recordingId,
        chunks: [],
        startTime: new Date(),
        ws
      };

      this.activeRecordings.set(recordingId, activeRecording);

      // Send ready message to client
      ws.send(JSON.stringify({
        type: 'ready',
        message: '准备接收音频数据',
        recordingId
      }));

      ws.on('message', (data: Buffer) => {
        this.handleAudioChunk(recordingId, data);
      });

      ws.on('close', () => {
        debug('WebSocket disconnected from client on port 2591');
        this.handleConnectionClose(recordingId);
      });

      ws.on('error', (error: Error) => {
        console.error(`WebSocket error for recording ${recordingId}:`, error);
        debug('WebSocket connection failed from client on port 2591');
        this.handleConnectionClose(recordingId);
      });

      ws.send(JSON.stringify({
        type: 'ready',
        message: '准备接收音频数据'
      }));
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

      // Create Recording document in database first to get ID
      let insertedId: string | null = null;
      try {
        const collection = await getCollection<RecordingDocument>(COLLECTIONS.RECORDINGS);
        const now = new Date();
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
        insertedId = result.insertedId.toHexString();
        debug(`Recording document created with ID: ${insertedId}`);
      } catch (dbError) {
        console.error('Error creating Recording document:', dbError);
      }

      // Persist file to disk using <_id>.<ext>
      if (insertedId) {
        const filesDir = getFilesBaseDir();
        if (!fs.existsSync(filesDir)) {
          fs.mkdirSync(filesDir, { recursive: true });
        }
        const storedName = `${insertedId}.wav`;
        const fullPath = resolveWithinBase(filesDir, storedName);
        fs.writeFileSync(fullPath, wavBuffer);
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
