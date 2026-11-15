#!/usr/bin/env node
/**
 * Semak kunci Supabase dalam .env / .env.local tanpa mencetak nilai kunci.
 * Guna: npm run check:keys
 *
 * - Kunci publishable (browser) diuji ke REST; 401 "permission denied" adalah
 *   jangkaan kerana RLS menolak peranan anon, bukan tanda kunci tidak sah.
 * - Kunci secret (server/CLI sahaja) diuji sama; "Unregistered API key" bermaksud
 *   kunci itu telah dirotasi dan perlu diganti dari Supabase Dashboard.
 */
import { existsSync, readFileSync } from 'node:fs';

const readEnv = file => {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter(line => line && !line.trim().startsWith('#') && line.includes('='))
      .map(line => {
        const index = line.indexOf('=');
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      })
  );
};

const env = { ...readEnv('.env'), ...readEnv('.env.local') };
const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const publishable = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY;
const secret = env.SUPABASE_SECRET_KEY;

const mask = key => (key ? `${key.slice(0, 15)}...${key.slice(-4)} (${key.length})` : '(tiada)');

const probe = async key => {
  const response = await fetch(`${url}/rest/v1/ar_rahnu_organizations?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  let body = '';
  try {
    body = await response.text();
  } catch {
    body = '';
  }
  return { status: response.status, body };
};

const classify = ({ status, body }) => {
  if (/unregistered api key/i.test(body)) return 'TIDAK SAH (unregistered)';
  if (/invalid api key|no api key found/i.test(body)) return 'TIDAK SAH (kunci ditolak)';
  if (/permission denied|row-level security/i.test(body)) return 'SAH (RLS menolak anon seperti dijangka)';
  if (status === 200) return 'SAH';
  if (status === 401) return 'TIDAK SAH (401)';
  return `respons tidak dijangka (HTTP ${status})`;
};

const run = async () => {
  if (!url) {
    console.error('VITE_SUPABASE_URL tidak dijumpai dalam .env.');
    process.exitCode = 1;
    return;
  }
  console.log(`Projek : ${new URL(url).host}`);

  if (!publishable) {
    console.error('VITE_SUPABASE_ANON_KEY tidak dijumpai.');
    process.exitCode = 1;
  } else {
    const result = await probe(publishable);
    const verdict = classify(result);
    console.log(`Publishable : ${mask(publishable)} -> ${verdict}`);
    if (!verdict.startsWith('SAH')) {
      console.error('  Ganti VITE_SUPABASE_ANON_KEY dengan publishable key dari Supabase Dashboard > Project Settings > API Keys.');
      process.exitCode = 1;
    }
  }

  if (secret) {
    const result = await probe(secret);
    const verdict = classify(result);
    console.log(`Secret      : ${mask(secret)} -> ${verdict}`);
    if (!verdict.startsWith('SAH')) {
      console.log('  Kunci secret hanya digunakan oleh alat tempatan/CLI; aplikasi browser tidak memerlukannya.');
      console.log('  Ganti SUPABASE_SECRET_KEY dengan secret key terkini jika anda mahu menjalankan semakan admin dari mesin ini.');
    }
  } else {
    console.log('Secret      : (tiada) - tidak diperlukan oleh aplikasi browser.');
  }

  const functionsResponse = await fetch(`${url}/functions/v1/user-admin`, {
    method: 'POST',
    headers: {
      apikey: publishable,
      Authorization: `Bearer ${publishable}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: 'Functions' })
  });
  const functionsBody = await functionsResponse.text();
  const deployed = /current session is invalid|session|auth/i.test(functionsBody) || functionsResponse.status === 401;
  console.log(`Fungsi user-admin : ${deployed ? 'boleh dicapai' : `respons tidak dijangka (HTTP ${functionsResponse.status})`}`);
  if (!deployed) {
    console.log(`  ${functionsBody.slice(0, 200)}`);
    process.exitCode = 1;
  }
};

run().catch(error => {
  console.error('Semakan kunci gagal:', error.message);
  process.exitCode = 1;
});
