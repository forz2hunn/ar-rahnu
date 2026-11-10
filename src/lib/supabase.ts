import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let trafficCaptureEnabled = false;
let trafficClient: SupabaseClient<any, 'public', 'public', any, any> | null = null;
const nativeFetch = globalThis.fetch.bind(globalThis);
const sensitiveFieldPattern = /(password|token|secret|authorization|cookie|email|phone|otp|credential|api.?key|service.?role|access.?key|nric|identity|passport|full.?name|first.?name|last.?name|address)/i;
const trafficPayloadLimit = 8 * 1024;
const telemetryPaths = [
  '/rest/v1/ar_rahnu_traffic_events',
  '/rest/v1/rpc/ar_rahnu_record_traffic_event'
];

export const setTrafficCaptureEnabled = (enabled: boolean) => {
  trafficCaptureEnabled = enabled;
};

const sanitizePayload = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitizePayload);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      sensitiveFieldPattern.test(key) ? '[REDACTED]' : sanitizePayload(item)
    ]));
  }
  if (typeof value === 'string') return value.length > 2048 ? `${value.slice(0, 2048)}…[TRUNCATED]` : value;
  return value;
};

const readJsonPayload = async (message: Request | Response) => {
  if (!message.headers.get('content-type')?.toLowerCase().includes('json')) return null;
  const body = message.clone().body;
  if (!body) return null;
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > 64 * 1024) {
      await reader.cancel();
      return { _omitted: 'Body exceeds 64 KB capture limit' };
    }
    chunks.push(value);
  }
  const text = new TextDecoder().decode(
    chunks.reduce((combined, chunk) => {
      const next = new Uint8Array(combined.length + chunk.length);
      next.set(combined);
      next.set(chunk, combined.length);
      return next;
    }, new Uint8Array())
  );
  if (!text) return null;
  const payload = sanitizePayload(JSON.parse(text));
  return JSON.stringify(payload).length <= trafficPayloadLimit
    ? payload
    : { _omitted: 'Sanitized payload exceeds 8 KB' };
};

const recordTraffic = async (
  request: Request,
  response: Response | null,
  status: number,
  durationMs: number,
) => {
  if (!trafficClient) return;
  try {
    const url = new URL(request.url);
    const isAuthRequest = url.pathname.startsWith('/auth/v1/');
    const [requestPayload, responsePayload] = isAuthRequest
      ? [null, null]
      : await Promise.all([
          readJsonPayload(request).catch(() => null),
          response ? readJsonPayload(response).catch(() => null) : Promise.resolve(null)
        ]);
    const { error } = await trafficClient.rpc('ar_rahnu_record_traffic_event', {
      p_method: request.method.toUpperCase(),
      p_request_path: url.pathname,
      p_host: url.host,
      p_status: status,
      p_duration_ms: Math.min(Math.round(durationMs), 600000),
      p_request_payload: requestPayload,
      p_response_payload: responsePayload
    });
    if (error) console.warn('Traffic inspector event was not recorded:', error.message);
  } catch (error) {
    console.warn('Traffic inspector event could not be recorded:', error);
  }
};

const inspectableFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init);
  const requestUrl = new URL(request.url);
  const isInspectable = trafficCaptureEnabled &&
    supabaseUrl &&
    requestUrl.origin === new URL(supabaseUrl).origin &&
    !requestUrl.pathname.startsWith('/auth/v1/') &&
    !telemetryPaths.some(path => requestUrl.pathname.startsWith(path));
  if (!isInspectable) return nativeFetch(request);

  const startedAt = performance.now();
  const inspectionRequest = request.clone();
  try {
    const response = await nativeFetch(request);
    void recordTraffic(inspectionRequest, response.clone(), response.status, performance.now() - startedAt);
    return response;
  } catch (error) {
    void recordTraffic(inspectionRequest, null, 0, performance.now() - startedAt);
    throw error;
  }
};

export const supabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: { fetch: inspectableFetch },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

trafficClient = supabaseClient;
