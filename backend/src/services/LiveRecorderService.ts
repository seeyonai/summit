import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getFilesBaseDir, resolveWithinBase } from '../utils/filePaths';
import { getCollection } from '../config/database';
import { Recording } from '../types';
import { debug, debugWarn } from '../utils/logger';

interface ActiveRecording {
  id: string;
  filename: string;
  filePath: string;
  chunks: Buffer[];
  startTime: Date;
  ws: WebSocket;
}

export class LiveRecorderService {
  private wss: WebSocketServer;
  private activeRecordings: Map<string, ActiveRecording> = new Map();

  constructor(server: any) {
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
      const filename = `recording_${recordingId}.wav`;
      const filesDir = getFilesBaseDir();
      const filePath = resolveWithinBase(filesDir, filename);

      const activeRecording: ActiveRecording = {
        id: recordingId,
        filename,
        filePath,
        chunks: [],
        startTime: new Date(),
        ws
      };

      this.activeRecordings.set(recordingId, activeRecording);

      // Send ready message to client
      ws.send(JSON.stringify({
        type: 'ready',
        message: '准备接收音频数据',
        recordingId,
        filename
      }));

      ws.on('message', (data: Buffer) => {
        this.handleAudioChunk(recordingId, data);
      });

      ws.on('close', () => {
        debug('WebSocket disconnected from client on port 2591');
        this.handleConnectionClose(recordingId);
      });

      ws.on('error', (error) => {
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
      debug(`Starting to save recording ${recording.id} to ${recording.filePath}`);
      
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
      
      // Ensure directory exists
      const dir = path.dirname(recording.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Save file
      fs.writeFileSync(recording.filePath, wavBuffer);
      
      const duration = Math.floor((Date.now() - recording.startTime.getTime()) / 1000);
      
      // Send completion message
      recording.ws.send(JSON.stringify({
        type: 'recording_saved',
        filename: recording.filename,
        filePath: recording.filePath,
        downloadUrl: `/files/${recording.filename}`,
        duration,
        chunksCount: recording.chunks.length,
        fileSize: wavBuffer.length
      }));
      
      debug(`Recording saved: ${recording.filename} (${wavBuffer.length} bytes, ${duration}s)`);

      // Create Recording document in database
      try {
        const collection = await getCollection('recordings');
        const now = new Date();
        
        const recordingDocument: Omit<Recording, '_id'> = {
          filePath: recording.filePath,
          filename: recording.filename,
          duration,
          fileSize: wavBuffer.length,
          source: 'live',
          externalId: recording.id,
          sampleRate: 16000,
          channels: 1,
          format: 'wav',
          createdAt: now,
          updatedAt: now
        };

        const result = await collection.insertOne(recordingDocument);
        debug(`Recording document created with ID: ${result.insertedId}`);
      } catch (dbError) {
        console.error('Error creating Recording document:', dbError);
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
      filename: r.filename,
      startTime: r.startTime,
      chunksCount: r.chunks.length
    }));
  }
}
