import http from 'http';
import https from 'https';
import { randomUUID } from 'crypto';
import { debug, debugWarn } from './logger';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface HttpRequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: Buffer | string;
  expectedStatus?: number[];
  timeoutMs?: number;
}

export interface JsonRequestOptions extends Omit<HttpRequestOptions, 'body'> {
  body?: unknown;
}

export interface MultipartFileField {
  fieldName: string;
  filename: string;
  contentType: string;
  buffer: Buffer;
}

export class HttpError extends Error {
  status: number;
  body: string;

  constructor(status: number, message: string, body: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

export function ensureTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

function selectTransport(protocol: string) {
  return protocol === 'https:' ? https : http;
}

export async function httpRequest(targetUrl: string, options: HttpRequestOptions = {}): Promise<{ status: number; data: Buffer }> {
  const url = new URL(targetUrl);
  const transport = selectTransport(url.protocol);
  const requestOptions: http.RequestOptions = {
    method: options.method || 'GET',
    hostname: url.hostname,
    port: url.port,
    path: `${url.pathname}${url.search}`,
    headers: options.headers || {},
  };

  const body = typeof options.body === 'string' ? Buffer.from(options.body, 'utf8') : options.body;

  return new Promise((resolve, reject) => {
    debug('HTTP request', { method: requestOptions.method, url: targetUrl });
    const req = transport.request(requestOptions, (res) => {
      const chunks: Buffer[] = [];

      res.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      res.on('end', () => {
        const data = Buffer.concat(chunks);
        const status = res.statusCode || 0;
        const expectedStatuses = options.expectedStatus || [200, 201, 202, 204];

        if (!expectedStatuses.includes(status)) {
          debugWarn('HTTP error response', { url: targetUrl, status, bytes: data.length });
          reject(new HttpError(status, `Request to ${targetUrl} failed with status ${status}`, data.toString('utf8')));
          return;
        }

        debug('HTTP response', { url: targetUrl, status, bytes: data.length });
        resolve({ status, data });
      });
    });

    req.on('error', (error) => {
      debugWarn('HTTP request error', { url: targetUrl, message: (error as Error).message });
      reject(error);
    });

    req.setTimeout(options.timeoutMs || DEFAULT_TIMEOUT_MS, () => {
      req.destroy(new Error(`Request to ${targetUrl} timed out`));
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

export async function requestJson<T>(targetUrl: string, options: JsonRequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...options.headers,
  };

  let bodyBuffer: Buffer | undefined;

  if (typeof options.body !== 'undefined') {
    const json = JSON.stringify(options.body);
    bodyBuffer = Buffer.from(json, 'utf8');
    headers['Content-Length'] = Buffer.byteLength(json).toString(10);
  } else if (options.method === 'POST' || options.method === 'PUT') {
    headers['Content-Length'] = headers['Content-Length'] || '0';
  }

  const response = await httpRequest(targetUrl, {
    method: options.method,
    headers,
    body: bodyBuffer,
    expectedStatus: options.expectedStatus,
    timeoutMs: options.timeoutMs,
  });

  if (response.data.length === 0) {
    return {} as T;
  }

  try {
    return JSON.parse(response.data.toString('utf8')) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON response from ${targetUrl}: ${(error as Error).message}`);
  }
}

export async function uploadMultipart<T>(targetUrl: string, file: MultipartFileField, fields?: Record<string, string>): Promise<T> {
  const boundary = `----SummitBoundary${randomUUID()}`;
  const CRLF = '\r\n';
  const parts: Buffer[] = [];

  if (fields) {
    Object.entries(fields).forEach(([key, value]) => {
      parts.push(Buffer.from(`--${boundary}${CRLF}`
        + `Content-Disposition: form-data; name="${key}"${CRLF}${CRLF}`
        + `${value}${CRLF}`, 'utf8'));
    });
  }

  parts.push(Buffer.from(`--${boundary}${CRLF}`
    + `Content-Disposition: form-data; name="${file.fieldName}"; filename="${file.filename}"${CRLF}`
    + `Content-Type: ${file.contentType}${CRLF}${CRLF}`, 'utf8'));
  parts.push(file.buffer);
  parts.push(Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf8'));

  const body = Buffer.concat(parts);
  const headers = {
    Accept: 'application/json',
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': body.byteLength.toString(10),
  };

  const response = await httpRequest(targetUrl, {
    method: 'POST',
    headers,
    body,
    expectedStatus: [200],
  });

  if (response.data.length === 0) {
    return {} as T;
  }

  try {
    return JSON.parse(response.data.toString('utf8')) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON response from ${targetUrl}: ${(error as Error).message}`);
  }
}
