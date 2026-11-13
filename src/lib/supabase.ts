import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const nativeFetch = globalThis.fetch.bind(globalThis);

const deviceIdStorageKey = 'ar_rahnu_audit_device_id';

const generateAuditId = (): string => {
  try {
    return crypto.randomUUID();
  } catch {
    return `dev-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`;
  }
};

const resolveAuditDeviceId = (): string => {
  try {
    const existing = window.localStorage.getItem(deviceIdStorageKey);
    if (existing) return existing;
    const generated = generateAuditId();
    window.localStorage.setItem(deviceIdStorageKey, generated);
    return generated;
  } catch {
    return generateAuditId();
  }
};

const auditDeviceId = typeof window === 'undefined' ? '' : resolveAuditDeviceId();

const auditFetch: typeof fetch = (input, init) => {
  const request = new Request(input, init);
  // Hanya REST PostgREST membaca header ini melalui trigger audit; endpoint Auth
  // dan Edge Function mempunyai senarai CORS sendiri yang tidak membenarkannya.
  if (auditDeviceId && request.url.includes('/rest/v1/') && !request.headers.has('x-audit-device-id')) {
    request.headers.set('x-audit-device-id', auditDeviceId);
  }
  return nativeFetch(request);
};

export const supabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: { fetch: auditFetch },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;