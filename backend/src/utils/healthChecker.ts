import { exec } from 'child_process';
import { promisify } from 'util';
import { ensureTrailingSlash } from './httpClient';
import { TRANSCRIPTION_SERVICE_BASE } from '../services/RecordingService';
import { SEGMENTATION_SERVICE_URL } from '../services/SegmentationService';
import { ALIGNER_SERVICE_URL } from '../services/AlignerService';
import { debug } from './logger';

const execAsync = promisify(exec);

interface Service {
  name: string;
  url: string;
  port: number;
}

interface ServiceHealth extends Service {
  status: string;
}

interface HealthCheckResult {
  services: ServiceHealth[];
  ffmpegInstalled: boolean;
  allHealthy: boolean;
}

const SERVICES: Service[] = [
  {
    name: 'Echo Voices',
    url: ensureTrailingSlash(SEGMENTATION_SERVICE_URL),
    port: 2593,
  },
  {
    name: 'Echo Vault',
    url: ensureTrailingSlash(TRANSCRIPTION_SERVICE_BASE),
    port: 2594,
  },
  {
    name: 'Echo Aligner',
    url: ensureTrailingSlash(ALIGNER_SERVICE_URL),
    port: 2595,
  },
];

async function checkServiceHealth(service: Service): Promise<string> {
  try {
    const response = await fetch(`${service.url}health`);
    if (response.ok) {
      const healthStatus = await response.json();
      debug(`${service.name} health check:`, healthStatus);

      return typeof healthStatus === 'object'
        && healthStatus !== null
        && 'status' in healthStatus
        && healthStatus.status === 'healthy' ? '✓ Ready' : '✗ Not Ready';
    }
    return '✗ Not Ready';
  } catch (error) {
    console.error(`Error getting ${service.name} health check status:`, error);
    return '✗ Not Ready';
  }
}

async function checkFfmpegInstalled(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch (error) {
    console.error('FFmpeg is not installed or not in PATH:', error);
    return false;
  }
}

export async function checkAllServices(): Promise<HealthCheckResult> {
  const healthPromises = SERVICES.map(async (service) => ({
    ...service,
    status: await checkServiceHealth(service),
  }));

  const [services, ffmpegInstalled] = await Promise.all([
    Promise.all(healthPromises),
    checkFfmpegInstalled(),
  ]);

  const allHealthy = services.every(service => service.status === '✓ Ready') && ffmpegInstalled;

  return { services, ffmpegInstalled, allHealthy };
}

export function generateHealthTable(healthResult: HealthCheckResult, apiPort: number): Array<{ Endpoint: string; URL: string; Status: string }> {
  const { services, ffmpegInstalled } = healthResult;

  const tableData = [
    { Endpoint: 'Health check', URL: `http://localhost:${apiPort}/health`, Status: '✓ Ready' },
    { Endpoint: 'Database', URL: 'MongoDB', Status: '✓ Connected' },
    { Endpoint: 'FFmpeg', URL: 'System binary', Status: ffmpegInstalled ? '✓ Installed' : '✗ Not Installed' },
    { Endpoint: 'Live Recorder WebSocket', URL: `ws://localhost:${apiPort}/ws/live-recorder`, Status: '✓ Ready' },
    ...services.map(service => ({
      Endpoint: service.name,
      URL: service.url,
      Status: service.status,
    })),
  ];

  // Configure console.table to show without index column
  console.table(tableData, ['Endpoint', 'URL', 'Status']);

  return tableData;
}
