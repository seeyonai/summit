import { promises as fs, constants as fsConstants } from 'fs';
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import { ObjectId } from 'mongodb';
import meetingService from './MeetingService';
import recordingService from './RecordingService';
import { Meeting, Recording } from '../types';
import { getFilesBaseDir, resolveWithinBase, makeRelativeToBase } from '../utils/filePaths';

interface CombineResult {
  meeting: Meeting;
  combinedRecording: Recording;
}

interface ExportResult {
  format: string;
  filename: string;
  filePath: string;
}

interface ExportOptions {
  bitrate?: string;
  outputBasename?: string;
}

type RecordingLike = {
  filename: string;
  filePath?: string;
};

class AudioProcessingService {
  private recordingsDir: string;

  constructor() {
    this.recordingsDir = getFilesBaseDir();
  }

  async combineMeetingRecordings(meetingId: string, filenames: string[], outputFilename?: string): Promise<CombineResult> {
    if (!Array.isArray(filenames) || filenames.length === 0) {
      throw new Error('Recording order cannot be empty');
    }

    const meeting = await this.requireMeeting(meetingId);
    const recordings = await recordingService.getRecordingsByMeetingId(meetingId);
    const lookup = new Map<string, RecordingLike>();

    if (Array.isArray(meeting.recordings)) {
      meeting.recordings
        .filter((record): record is Recording => Boolean(record && record.filename && typeof record.filename === 'string'))
        .forEach((record) => {
          lookup.set(record.filename, {
            filename: record.filename,
            filePath: record.filePath,
          });
        });
    }

    recordings.forEach((recording) => {
      lookup.set(recording.filename, {
        filename: recording.filename,
        filePath: recording.filePath,
      });
    });

    const absolutePaths = await Promise.all(
      filenames.map(async (name) => {
        const record = lookup.get(name);

        if (!record) {
          throw new Error(`Recording ${name} not found for meeting`);
        }

        const absolute = await this.resolveRecordingPath(record);
        await this.assertFileReadable(absolute);
        return absolute;
      })
    );

    const safeOutputName = this.buildOutputFilename(outputFilename || this.defaultCombinedName(meetingId));
    const outputAbsolutePath = this.resolveWithinRecordingsDir(safeOutputName);

    let previousCombinedPath: string | null = null;
    if (meeting.combinedRecording) {
      try {
        previousCombinedPath = await this.resolveRecordingPath(meeting.combinedRecording);
      } catch (error) {
        previousCombinedPath = null;
      }
    }

    await this.ensureDirectoryExists(this.recordingsDir);

    const { listFilePath, tempDir } = await this.createConcatListFile(absolutePaths);

    try {
      await this.runFfmpeg([
        '-y',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        listFilePath,
        '-c',
        'copy',
        outputAbsolutePath,
      ]);
    } finally {
      await this.disposeTempFiles(tempDir);
    }

    if (previousCombinedPath && previousCombinedPath !== outputAbsolutePath) {
      await this.removeFileIfExists(previousCombinedPath);
    }

    const combinedRecording = await this.buildRecordingMetadata(safeOutputName, outputAbsolutePath);
    const updatedMeeting = await meetingService.updateCombinedRecording(meetingId, combinedRecording);

    if (!updatedMeeting) {
      throw new Error(`Meeting not found after updating combined recording (ID: ${meetingId})`);
    }

    return {
      meeting: updatedMeeting,
      combinedRecording,
    };
  }

  async exportCombinedRecording(meetingId: string, formats: string[], options: ExportOptions = {}): Promise<ExportResult[]> {
    if (!Array.isArray(formats) || formats.length === 0) {
      throw new Error('At least one target format is required');
    }

    const meeting = await this.requireMeeting(meetingId);
    const sourceRecording = meeting.combinedRecording;

    if (!sourceRecording) {
      throw new Error('Meeting does not have a combined recording to export');
    }

    const sourceAbsolute = await this.resolveRecordingPath(sourceRecording);
    await this.assertFileReadable(sourceAbsolute);

    const baseName = options.outputBasename || this.stripExtension(sourceRecording.filename || `meeting-${meetingId}`);
    const results: ExportResult[] = [];

    for (const format of formats) {
      const normalizedFormat = this.normalizeFormat(format);
      const targetFilename = `${baseName}.${normalizedFormat}`;
      const safeTargetFilename = this.buildOutputFilename(targetFilename);
      const targetAbsolute = this.resolveWithinRecordingsDir(safeTargetFilename);

      const args = ['-y', '-i', sourceAbsolute, ...this.codecArgs(normalizedFormat, options.bitrate), targetAbsolute];
      await this.runFfmpeg(args);

      results.push({
        format: normalizedFormat,
        filename: safeTargetFilename,
        filePath: `/files/${safeTargetFilename}`,
      });
    }

    return results;
  }

  private async requireMeeting(meetingId: string): Promise<Meeting> {
    const meeting = await meetingService.getMeetingById(meetingId);
    if (!meeting) {
      throw new Error(`Meeting not found (ID: ${meetingId})`);
    }
    return meeting;
  }

  private defaultCombinedName(meetingId: string): string {
    const timestamp = Date.now();
    return `meeting-${meetingId}-combined-${timestamp}.wav`;
  }

  private stripExtension(filename: string): string {
    const extension = path.extname(filename);
    if (!extension) {
      return filename;
    }
    return filename.slice(0, -extension.length);
  }

  private normalizeFormat(format: string): string {
    return format.replace(/^\./, '').toLowerCase();
  }

  private codecArgs(format: string, bitrate?: string): string[] {
    const args: string[] = [];

    switch (format) {
      case 'mp3':
        args.push('-codec:a', 'libmp3lame');
        if (bitrate) {
          args.push('-b:a', bitrate);
        }
        break;
      case 'aac':
      case 'm4a':
        args.push('-codec:a', 'aac');
        if (bitrate) {
          args.push('-b:a', bitrate);
        }
        break;
      case 'wav':
        args.push('-codec:a', 'pcm_s16le');
        break;
      case 'flac':
        args.push('-codec:a', 'flac');
        break;
      case 'ogg':
      case 'oga':
        args.push('-codec:a', 'libvorbis');
        if (bitrate) {
          args.push('-b:a', bitrate);
        }
        break;
      default:
        if (bitrate) {
          args.push('-b:a', bitrate);
        }
        break;
    }

    return args;
  }

  private buildOutputFilename(candidate: string): string {
    const base = path.basename(candidate);
    const normalized = base.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!normalized) {
      throw new Error('Invalid output filename');
    }
    return normalized;
  }

  private resolveWithinRecordingsDir(filename: string): string {
    return resolveWithinBase(this.recordingsDir, filename);
  }

  private async buildRecordingMetadata(filename: string, absolutePath: string): Promise<Recording> {
    const now = new Date();
    const stats = await fs.stat(absolutePath);
    const probe = await this.probeAudio(absolutePath).catch(() => null);

    return {
      _id: new ObjectId(), // Keep ObjectId for the Recording type
      filename,
      filePath: `/files/${filename}`,
      createdAt: now,
      updatedAt: now,
      duration: probe?.duration,
      fileSize: stats.size,
      transcription: undefined,
      verbatimTranscript: undefined,
      speakerSegments: undefined,
      numSpeakers: undefined,
      sampleRate: probe?.sampleRate,
      channels: probe?.channels,
      format: probe?.format,
      externalId: undefined,
      source: undefined,
    };
  }

  private async probeAudio(absolutePath: string): Promise<{ duration?: number; sampleRate?: number; channels?: number; format?: string; }> {
    const args = ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', absolutePath];
    const { stdout } = await this.runProcess('ffprobe', args);
    const payload = JSON.parse(stdout);
    const format = payload.format || {};
    const audioStream = Array.isArray(payload.streams)
      ? payload.streams.find((stream: Record<string, unknown>) => stream.codec_type === 'audio')
      : undefined;

    const duration = format.duration ? Number(format.duration) : undefined;
    const sampleRate = audioStream?.sample_rate ? Number(audioStream.sample_rate) : undefined;
    const channels = audioStream?.channels ? Number(audioStream.channels) : undefined;
    const formatName = format.format_name ? String(format.format_name) : undefined;

    return {
      duration: Number.isFinite(duration) ? duration : undefined,
      sampleRate: Number.isFinite(sampleRate) ? sampleRate : undefined,
      channels: Number.isFinite(channels) ? channels : undefined,
      format: formatName,
    };
  }

  private async assertFileReadable(absolutePath: string): Promise<void> {
    await fs.access(absolutePath, fsConstants.R_OK);
  }

  private async ensureDirectoryExists(directoryPath: string): Promise<void> {
    await fs.mkdir(directoryPath, { recursive: true });
  }

  private async createConcatListFile(absolutePaths: string[]): Promise<{ listFilePath: string; tempDir: string }> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'summit-combine-'));
    const listFilePath = path.join(tempDir, 'inputs.txt');
    const content = absolutePaths
      .map((absolutePath) => `file "${this.escapeForConcatList(absolutePath)}"`)
      .join('\n');
    await fs.writeFile(listFilePath, content, 'utf8');
    return { listFilePath, tempDir };
  }

  private escapeForConcatList(absolutePath: string): string {
    return absolutePath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private async disposeTempFiles(tempDir: string): Promise<void> {
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  private async removeFileIfExists(absolutePath: string): Promise<void> {
    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private async resolveRecordingPath(recording: RecordingLike): Promise<string> {
    const candidate = recording.filePath || recording.filename;
    if (!candidate) {
      throw new Error('Recording does not define a filename');
    }

    const relative = makeRelativeToBase(this.recordingsDir, candidate);
    const normalizedRelative = path.normalize(relative).replace(/^[/\\]+/, '');
    const absolute = this.resolveWithinRecordingsDir(normalizedRelative);
    return absolute;
  }

  private async runFfmpeg(args: string[]): Promise<void> {
    await this.runProcess('ffmpeg', args);
  }

  private async runProcess(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        reject(error);
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`${command} exited with code ${code}: ${stderr.trim()}`));
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }
}

const audioProcessingService = new AudioProcessingService();

export type { CombineResult, ExportResult };
export default audioProcessingService;
