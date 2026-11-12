import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Building2,
  BrainCircuit,
  Plus,
  Trash2,
  TrendingUp,
  AlertCircle,
  Wallet,
  Clock,
  Sparkles,
  X,
  Scale,
  Globe,
  RefreshCw,
  Menu,
  Download,
  Database,
  DownloadCloud,
  UploadCloud,
  CheckCircle2,
  Check,
  ShieldCheck,
  Pencil,
  Copy,
  Tag,
  MapPin,
  RotateCcw,
  Store,
  ExternalLink,
  Search,
  ChevronDown,
  Settings2,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  BellOff,
  LogOut,
  Users,
  Mail,
  KeyRound,
  UserRound,
  FileSearch,
  Pause,
  Play,
  Paperclip,
  Activity,
  BarChart3,
  Layers,
  Info,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  ChevronUp,
  Zap,
  UserPlus,
  Shield,
  Filter,
  FileText,
  AlertTriangle,
  UserCheck,
  UserX,
  Lock
} from 'lucide-react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { setTrafficCaptureEnabled, supabaseClient } from './src/lib/supabase';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { buildGoldForecast, getMalaysiaDateKey, type GoldPriceSnapshot } from './src/lib/portfolio-analytics';

// --- MOCK DATA: PEMBEKAL & KEDAI EMAS MALAYSIA ---
const initialSuppliers = [
  { id: 1, code: 'PG', name: 'Public Gold', category: 'Bullion & Pelaburan', products: 'Gold Bar 999.9, Dinar LBMA, Syiling Emas', website: 'https://publicgold.com.my', remarks: 'Pengeluar emas pelaburan terbesar di Malaysia' },
  { id: 2, code: 'HJ', name: 'Habib Jewels', category: 'Barangan Kemas & Berlian', products: 'Barang Kemas 916, Gold Bar Edisi Khas, Permata', website: 'https://habibjewels.com', remarks: 'Jenama mewah warisan tempatan terkemuka' },
  { id: 3, code: 'PK', name: 'Poh Kong', category: 'Rangkaian Peruncit Emas', products: 'Bunga Raya Gold Bar, Barang Kemas 916/750, Auspicious', website: 'https://pohkong.com.my', remarks: 'Rangkaian kedai emas terbesar tersenarai di Bursa' },
  { id: 4, code: 'TM', name: 'Tomei', category: 'Rangkaian Peruncit Emas', products: 'Chow Tai Fook, Barang Kemas 916, Gold Bar Bunga Raya', website: 'https://tomei.com.my', remarks: 'Peruncit barangan kemas terkemuka sejak 1968' },
  { id: 5, code: 'WC', name: 'Wah Chan', category: 'Kedai Emas & Berlian', products: 'Barang Kemas 916, Dinar, Syiling Emas Pelaburan', website: 'https://wahchan.com.my', remarks: 'Pilihan popular untuk belian emas & upah berpatutan' },
  { id: 6, code: 'SK', name: 'SK Jewellery', category: 'Emas Moden & Koleksi 999', products: '999 Pure Gold, Koleksi Karakter, Gold Foil Gift', website: 'https://skjewellery.com.my', remarks: 'Pakar emas 999 moden dan kepingan emas hadiah' },
  { id: 7, code: 'DG', name: 'DeGem', category: 'Barangan Kemas Mewah', products: 'Barangan Kemas Eksklusif, Berlian & Emas 750/916', website: 'https://degemdiamond.com', remarks: 'Butik pereka barangan kemas mewah antarabangsa' },
  { id: 8, code: 'CH', name: 'Chiang Heng Jewellery', category: 'Kedai Emas & 916', products: 'Koleksi Barang Kemas 916, Rantai, Cincin, Upah Rendah', website: 'https://chiangheng.com', remarks: 'Dikenali dengan harga emas & kadar upah yang sangat kompetitif' },
  { id: 9, code: 'KAB', name: 'KAB Gold', category: 'Emas Syariah & Bullion', products: 'Gold Bar 999.9, Dinar Patuh Syariah, Akaun Emas', website: 'https://kabgold.my', remarks: 'Penyedia emas patuh syariah bertauliah' },
  { id: 10, code: 'MG', name: 'Makmur Gold', category: 'Bumiputera & Pelaburan', products: 'Gold Bar 999.9, Dinar Makmur, Barang Kemas 916', website: 'https://makmurgold.com', remarks: 'Syarikat emas pelaburan bumiputera berkembang pesat' }
];

// --- UTILS & HELPERS ---
const transactionStatusOptions = [
  'Pajakan Asal', 'Salin', 'OL', 'Tebus Cash', 'Tebus EDT',
  'TS', 'TKS', 'US', 'Pusing', 'Lelong'
];
const transactionAttachmentsBucket = 'ar-rahnu-transaction-attachments';
const maximumTransactionAttachments = 7;
const maximumTransactionAttachmentSize = 50 * 1024 * 1024;
type OrganizationRole = 'Admin' | 'Manager' | 'Staff';
type OrganizationMembership = {
  organization_id: string;
  role: OrganizationRole;
  active: boolean;
  organization?: { name: string } | null;
};
type AuditPayload = {
  event_id: string;
  chain_scope: string;
  sequence_no: number;
  occurred_at_utc: string;
  actor_user_id: string | null;
  subject_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  source_module: string;
  user_agent: string | null;
  device_id: string | null;
  source_ip: string | null;
  proxy_ip: string | null;
  payload_before: unknown;
  payload_before_sha256: string | null;
  payload_after: unknown;
  payload_after_sha256: string | null;
  [key: string]: unknown;
};
type AuditEvent = {
  event_id: string;
  chain_scope: string;
  sequence_no: number;
  event_payload: AuditPayload;
  canonical_payload: string;
  previous_hash: string;
  event_hash: string;
  created_at: string;
};
const auditActionLabels: Record<string, string> = {
  CREATE: 'Rekod baharu ditambah',
  UPDATE: 'Maklumat dikemas kini',
  DELETE: 'Rekod dipadam',
  INVITE_USER: 'Jemputan pengguna dihantar',
  CREATE_USER: 'Akaun pengguna diwujudkan',
  UPDATE_USER_AUTH: 'Maklumat akaun dikemas kini',
  DELETE_USER_ACCOUNT: 'Akaun pengguna dipadam',
  RESET_PASSWORD_EMAIL_SENT: 'E-mel tetapan semula kata laluan dihantar'
};
const auditModuleLabels: Record<string, string> = {
  Portfolio: 'Portfolio',
  'User Management': 'Pengurusan pengguna',
  'Organization Management': 'Pengurusan organisasi'
};
const auditResourceLabels: Record<string, string> = {
  ar_rahnu_user_data: 'Data portfolio',
  ar_rahnu_organization_members: 'Keahlian organisasi',
  ar_rahnu_organizations: 'Maklumat organisasi',
  'auth.users': 'Akaun pengguna'
};
type TrafficEvent = {
  event_id: string;
  organization_id: string;
  actor_user_id: string | null;
  session_id: string | null;
  captured_at: string;
  client_ip: string | null;
  user_agent: string | null;
  method: string;
  request_path: string;
  host: string;
  status: number;
  duration_ms: number;
  request_payload: unknown;
  response_payload: unknown;
};
const matchesTrafficFilter = (event: TrafficEvent, filter: string) => {
  const terms = filter.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  return terms.every(term => {
    const [field, ...valueParts] = term.replace(/^"|"$/g, '').split(':');
    const value = valueParts.join(':').replace(/^"|"$/g, '').toLowerCase();
    if (!valueParts.length) {
      return [
        event.method,
        event.request_path,
        event.host,
        event.status,
        event.duration_ms,
        event.client_ip,
        event.user_agent
      ].some(item => String(item || '').toLowerCase().includes(field.toLowerCase()));
    }
    if (field.toLowerCase() === 'status' && /^\dxx$/.test(value)) {
      return Math.floor(event.status / 100) === Number(value[0]);
    }
    const values: Record<string, string> = {
      method: event.method,
      path: event.request_path,
      host: event.host,
      status: String(event.status),
      ip: event.client_ip || '',
      duration: String(event.duration_ms),
      useragent: event.user_agent || ''
    };
    return (values[field.toLowerCase()] || '').toLowerCase().includes(value);
  });
};
const normalizeAuditJson = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeAuditJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizeAuditJson(item)])
    );
  }
  return value;
};
const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};
const parseOrganizationMembership = (value: unknown): OrganizationMembership | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.organization_id !== 'string' ||
      typeof record.active !== 'boolean' ||
      (record.role !== 'Admin' && record.role !== 'Manager' && record.role !== 'Staff')) return null;
  const organization = record.organization && typeof record.organization === 'object'
    ? record.organization as Record<string, unknown>
    : null;
  return {
    organization_id: record.organization_id,
    role: record.role,
    active: record.active,
    organization: organization && typeof organization.name === 'string' ? { name: organization.name } : null
  };
};
const getTransactionStatus = (transaction) => {
  if (transactionStatusOptions.includes(transaction.transactionStatus)) return transaction.transactionStatus;
  const type = String(transaction.type || '').toLowerCase();
  if (type.includes('pajakan')) return 'Pajakan Asal';
  if (type.includes('salin')) return 'Salin';
  if (type.includes('ol')) return 'OL';
  if (type.includes('tks') || type.includes('tebus sebahagian')) return 'TKS';
  if (type === 'ts' || type.includes('tebus penuh')) return 'TS';
  if (type === 'us' || type.includes('upah simpan')) return 'US';
  if (type.includes('pusing')) return 'Pusing';
  if (type.includes('lelong')) return 'Lelong';
  if (type.includes('tebus') && type.includes('edt')) return 'Tebus EDT';
  if (type.includes('tebus')) return 'Tebus Cash';
  return 'Lain-lain';
};
const isRecordVisible = (record) => !record?.deletedAt;
const resetRecordsPreservingDeleted = (defaults, currentRecords) => {
  const deletedRecords = currentRecords.filter(record => !isRecordVisible(record));
  const deletedIds = new Set(deletedRecords.map(record => String(record.id)));
  return [
    ...defaults.filter(record => !deletedIds.has(String(record.id))),
    ...deletedRecords.filter(record =>
      !defaults.some(defaultRecord => String(defaultRecord.id) === String(record.id))
    )
  ];
};
const getTransactionAssetIds = (transaction) =>
  transaction.selectedAssetIds || (transaction.selectedAssetId ? [transaction.selectedAssetId] : []);
const getMatchingAssetLinkStatus = (leftTransaction, rightTransaction) => {
  const leftIds = getTransactionAssetIds(leftTransaction).map(String).sort();
  const rightIds = getTransactionAssetIds(rightTransaction).map(String).sort();
  if (!leftIds.length || !rightIds.length) return null;
  return leftIds.length === rightIds.length &&
    leftIds.every((assetId, index) => assetId === rightIds[index]);
};
const getCorrectionEvents = (transaction) =>
  Array.isArray(transaction?.correctionEvents) ? transaction.correctionEvents : [];
const getLatestPartialRedemption = (transaction) =>
  getCorrectionEvents(transaction).slice().reverse().find(event => event.type === 'TKS');
const getLatestPledgedAssetEvent = (transaction) =>
  getCorrectionEvents(transaction).slice().reverse().find(event =>
    (event.type === 'TKS' || Array.isArray(event.releasedAssetIds)) &&
    event.remainingWeight !== undefined &&
    event.remainingWeight !== null
  );
const getCurrentPledgedWeight = (transaction) => {
  const latestPledgedAssetEvent = getLatestPledgedAssetEvent(transaction);
  return latestPledgedAssetEvent
    ? Number(latestPledgedAssetEvent.remainingWeight) || 0
    : Number(transaction?.weight) || 0;
};
const getCurrentPrincipal = (transaction) => {
  const latestPartialRedemption = getLatestPartialRedemption(transaction);
  return latestPartialRedemption?.remainingPrincipal !== undefined &&
    latestPartialRedemption?.remainingPrincipal !== null
    ? Number(latestPartialRedemption.remainingPrincipal) || 0
    : Number(transaction?.loan) || 0;
};
const getCurrentRedemption = (transaction) => {
  const latestPartialRedemption = getLatestPartialRedemption(transaction);
  return latestPartialRedemption?.remainingRedemption !== undefined &&
    latestPartialRedemption?.remainingRedemption !== null
    ? Number(latestPartialRedemption.remainingRedemption) || 0
    : Number(transaction?.redemption) || 0;
};
const getCurrentFeeArrears = (transaction) =>
  Math.max(0, getCurrentRedemption(transaction) - getCurrentPrincipal(transaction));
const calculateOverlapCashBalance = (newFinancing, oldFinancing, overdueFees, relatedFees) =>
  Number((
    (Number(newFinancing) || 0) -
    (Number(oldFinancing) || 0) -
    (Number(overdueFees) || 0) -
    (Number(relatedFees) || 0)
  ).toFixed(2));
const getPurityFromAssets = (assets) => {
  if (!assets.length) return '';
  const purities = assets.map(asset => String(asset.purity || '').trim());
  if (purities.some(purity => !purity)) return 'Campuran / Lain-lain';
  const uniquePurities = [...new Set(purities)];
  return uniquePurities.length === 1 ? uniquePurities[0] : 'Campuran / Lain-lain';
};
const normalizeFeeBasis = (feeBasis) => {
  if (feeBasis === 'nilaiMarhun' || feeBasis === 'Nilai Marhun') return 'nilaiMarhun';
  if (feeBasis === 'jumlahPembiayaan' || feeBasis === 'Jumlah Pembiayaan') return 'jumlahPembiayaan';
  return '';
};
const getFeeBasisLabel = (feeBasis) => {
  const normalizedBasis = normalizeFeeBasis(feeBasis);
  if (normalizedBasis === 'nilaiMarhun') return 'Nilai Marhun';
  if (normalizedBasis === 'jumlahPembiayaan') return 'Jumlah Pembiayaan';
  return '';
};
const getCheckedInAssetIds = (transactions) => new Set(
  transactions
    .filter(transaction =>
      !['Selesai', 'Ditebus', 'Dilelong'].includes(transaction.status) &&
      !String(transaction.type || '').toLowerCase().includes('tebus')
    )
    .flatMap(getTransactionAssetIds)
    .map(String)
);
const syncAssetStatuses = (assets, transactions) => {
  const checkedInAssetIds = getCheckedInAssetIds(transactions);
  const updatedAt = new Date().toISOString();
  let changed = false;
  const nextAssets = assets.map(asset => {
    if (!isRecordVisible(asset) || asset.status === 'Dilelong') return asset;
    const status = checkedInAssetIds.has(String(asset.id)) ? 'Dalam Ar-Rahnu' : 'EDT';
    if (asset.status === status) return asset;
    changed = true;
    return { ...asset, status, updatedAt };
  });
  return changed ? nextAssets : assets;
};
const generateAssetCode = (type, supplier, purity, weight, suffix, suppliersList = null) => {
  const typeMap = {
    'Gold Bar': 'GB',
    'Barang Kemas': 'BK',
    'Dinar': 'DN',
    'Syiling Emas': 'SE',
  };
  const typeCode = typeMap[type] || (type ? type.substring(0, 2).toUpperCase() : 'EM');

  const list = suppliersList || initialSuppliers;
  const supplierValues = Array.isArray(supplier)
    ? supplier
    : String(supplier || '').replace(/\(Salinan\)/gi, '').split(',');
  const supplierCodes = [...new Set(supplierValues.map(value => {
    const cleanValue = String(value || '').trim().toLowerCase();
    const found = list.find(item =>
      item.name.toLowerCase() === cleanValue || item.code.toLowerCase() === cleanValue
    );
    if (found) return found.code.toUpperCase();
    const words = cleanValue.split(/\s+/).filter(Boolean);
    return words.length > 1
      ? words.map(word => word[0]).join('').toUpperCase().slice(0, 3)
      : cleanValue.slice(0, 3).toUpperCase();
  }).filter(Boolean))];
  const suppCode = supplierCodes.join('-') || 'GEN';

  const purityCode = purity ? (purity.includes('999') ? '999' : purity) : '999';
  const weightCode = weight ? `${weight}G` : '';
  const seq = suffix ? String(suffix).slice(-2).padStart(2, '0') : '01';

  return `${typeCode}-${suppCode}-${purityCode}${weightCode ? `-${weightCode}` : ''}-${seq}`;
};

const INITIAL_GOLD_SPOT_MYR_PER_GRAM = 530.94;
const TROY_OUNCE_GRAMS = 31.1034768;

async function fetchGoldSpotMYRPerGram() {
  const [goldResponse, exchangeResponse] = await Promise.all([
    fetch('https://api.gold-api.com/price/XAU'),
    fetch('https://open.er-api.com/v6/latest/USD')
  ]);
  if (!goldResponse.ok) throw new Error(`Gold price service returned HTTP ${goldResponse.status}.`);
  if (!exchangeResponse.ok) throw new Error(`Exchange rate service returned HTTP ${exchangeResponse.status}.`);

  const [goldData, exchangeData] = await Promise.all([
    goldResponse.json(),
    exchangeResponse.json()
  ]);
  const goldUsdPerOunce = Number(goldData.price);
  const myrPerUsd = Number(exchangeData.rates?.MYR);
  if (!Number.isFinite(goldUsdPerOunce) || goldUsdPerOunce <= 0 ||
      !Number.isFinite(myrPerUsd) || myrPerUsd <= 0) {
    throw new Error('The live services returned invalid gold or MYR exchange-rate data.');
  }

  return {
    price: goldUsdPerOunce * myrPerUsd / TROY_OUNCE_GRAMS,
    goldUpdatedAt: goldData.updatedAt,
    exchangeUpdatedAt: exchangeData.time_last_update_utc
  };
}

// --- MOCK DATA ---
const initialInstitutions = [
  { id: 1, name: 'Cahaya', category: 'Pajak Gadai', branch: 'Seksyen 9, Bandar Baru Bangi', maxMargin: 80, marhunRate: 583.00, marhunSpread: 52.06, marhunSpotPrice: INITIAL_GOLD_SPOT_MYR_PER_GRAM, remarks: 'Pilihan utama Over-Lap (80% margin pusing)' },
  { id: 2, name: 'Ar Rahn', category: 'Pajak Gadai', branch: 'Bandar Baru Bangi', maxMargin: 75, marhunRate: 590.00, marhunSpread: 59.06, marhunSpotPrice: INITIAL_GOLD_SPOT_MYR_PER_GRAM, remarks: 'Cawangan Ar Rahn Bangi (kadar marhun stabil)' },
  { id: 3, name: 'Koputra - Bank Muamalat', category: 'Koperasi & Bank', branch: 'Bangi Gateway / Seksyen 3', maxMargin: 75, marhunRate: 595.00, marhunSpread: 64.06, marhunSpotPrice: INITIAL_GOLD_SPOT_MYR_PER_GRAM, remarks: 'Kerjasama Koperasi Koputra & Bank Muamalat Bangi' },
  { id: 4, name: 'ArrahnuKita - petronas', category: 'Koperasi', branch: 'Bangi / KOPETRO', maxMargin: 70, marhunRate: 585.00, marhunSpread: 54.06, marhunSpotPrice: INITIAL_GOLD_SPOT_MYR_PER_GRAM, remarks: 'Koperasi Kakitangan Petronas (KOPETRO)' },
  { id: 5, name: 'KPDRM - PDRM', category: 'Koperasi', branch: 'Bangi / Cheras', maxMargin: 70, marhunRate: 605.82, marhunSpread: 74.88, marhunSpotPrice: INITIAL_GOLD_SPOT_MYR_PER_GRAM, remarks: 'Koperasi Polis Diraja Malaysia, kadar marhun tinggi 70% (Salin & Parking)' },
];

const initialTransactions = [
  { id: 1, date: '2026-10-19', type: 'Pajakan Asal', institution: 'Cahaya', refNo: '1001-1002', weight: 5, marhunPrice: 509, margin: 70, loan: 1718.00, fee: 25.30, redemption: 1743.30, profit: 0, remarks: 'Pajakan Asal (Telah Selesai Salin ke 1003-1004)', status: 'Selesai' },
  { id: 2, date: '2026-10-27', type: 'Salin / Parking (70%)', institution: 'KPDRM - PDRM', refNo: '1003-1004', weight: 5, marhunPrice: 605.82, margin: 70, loan: 2120.37, fee: 0, redemption: 1743.30, profit: 377.07, remarks: 'Refinance for profit (Telah Selesai OL ke 1005-1006)', status: 'Selesai' },
  { id: 3, date: '2026-10-27', type: 'OL / Pusing (80%)', institution: 'Cahaya', refNo: '1005-1006', weight: 5, marhunPrice: 583, margin: 80, loan: 2332.00, fee: 0, redemption: 1743.30, profit: 588.70, remarks: 'Aktif: Tiket Semasa (Margin 80%)', status: 'Aktif' },
];

const initialAssets = [
  { id: 1, code: 'GB-PG-999-10G-01', date: '2025-12-01', supplier: 'Public Gold', type: 'Gold Bar', purity: '999.9', weight: 10, price: 3500, status: 'EDT' },
  { id: 2, code: 'BK-HJ-916-5G-02', date: '2026-08-15', supplier: 'Habib Jewels', type: 'Barang Kemas', purity: '916', weight: 5, price: 1600, status: 'Dalam Ar-Rahnu' }
];

// --- UTILS ---
const formatRM = (val) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val);
const calculateMarhunValue = (weight, marhunRate) =>
  (parseFloat(weight) || 0) * (parseFloat(marhunRate) || 0);
const getTransactionMarhunValue = (transaction) =>
  transaction?.marhunValue == null
    ? calculateMarhunValue(transaction?.weight, transaction?.marhunPrice)
    : parseFloat(transaction.marhunValue) || 0;
const csvCell = (value) => {
  const rawValue = value == null ? '' : String(value);
  const safeValue = typeof value === 'string' && /^[=+\-@\t\r]/.test(rawValue.trim())
    ? `'${rawValue}`
    : rawValue;
  return `"${safeValue.replace(/"/g, '""')}"`;
};
const downloadCsv = (fileName, headers, rows) => {
  const csvContent = [
    headers.map(csvCell).join(','),
    ...rows.map(row => row.map(csvCell).join(','))
  ].join('\r\n');
  const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const formatMalaysiaDateTime = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return `${new Intl.DateTimeFormat('ms-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Kuala_Lumpur'
  }).format(date)} MYT`;
};
const parseTransactionDateTime = (value) => {
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  return new Date(hasTimezone ? value : `${value}+08:00`);
};
const getMalaysiaDateTimeInputValue = (value) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00`;
  const date = parseTransactionDateTime(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};
const formatTransactionDateTime = (value) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00+08:00`);
    const dateLabel = new Intl.DateTimeFormat('ms-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kuala_Lumpur'
    }).format(date);
    return `${dateLabel} · masa tidak direkod`;
  }
  const date = parseTransactionDateTime(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${new Intl.DateTimeFormat('ms-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Kuala_Lumpur'
  }).format(date)} MYT`;
};
const getTransactionDateKey = (value) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = parseTransactionDateTime(value);
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : getMalaysiaDateKey(date);
};
const normalizeTransactionDateTime = (transaction, timestamp = new Date().toISOString()) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction?.date || '')) return transaction;
  const currentTime = getMalaysiaDateTimeInputValue(timestamp).slice(11);
  return {
    ...transaction,
    date: parseTransactionDateTime(`${transaction.date}T${currentTime}`).toISOString(),
    updatedAt: transaction.updatedAt || timestamp
  };
};
const normalizeAssetDateTime = (asset, timestamp = new Date().toISOString()) => {
  const date = asset?.date || timestamp;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ...asset, date };
  const currentTime = getMalaysiaDateTimeInputValue(timestamp).slice(11);
  return {
    ...asset,
    date: parseTransactionDateTime(`${date}T${currentTime}`).toISOString(),
    updatedAt: asset.updatedAt || timestamp
  };
};
const getTransactionTimestamp = (value) => {
  if (!value) return 0;
  const date = parseTransactionDateTime(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};
const getDaysUntilDate = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  const dueDate = Date.UTC(year, month - 1, day);
  const today = new Date();
  const todayDate = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((dueDate - todayDate) / 86400000);
};
const isMissingSupabaseTableError = (error) =>
  error?.code === 'PGRST205' ||
  error?.code === '42P01' ||
  /could not find the table .*ar_rahnu_user_data/i.test(error?.message || '');
const isMissingUserManagementSchemaError = (error) =>
  error?.code === 'PGRST204' ||
  error?.code === '42703' ||
  /(?:ar_rahnu_organization_members|ar_rahnu_organizations).*(?:does not exist|schema cache)|column .*active.*does not exist/i.test(error?.message || '');
// --- MAIN COMPONENT ---
export default function App() {
  if (!supabaseClient) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4 sm:p-6 font-sans">
        <div className="w-full max-w-xl rounded-2xl border border-amber-200 bg-white p-5 sm:p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-800">Konfigurasi Supabase diperlukan</h1>
          <p className="mt-3 text-slate-600">Cipta fail <code>.env.local</code> daripada <code>.env.example</code>, kemudian masukkan Project URL dan publishable/anon key Supabase anda.</p>
          <p className="mt-2 text-sm text-slate-500">Jangan masukkan service_role key ke dalam aplikasi browser. Mulakan semula server Vite selepas mengubah konfigurasi.</p>
        </div>
      </div>
    );
  }

  return <AuthenticationGate supabaseClient={supabaseClient} />;
}

function AuthenticationGate({ supabaseClient }: { supabaseClient: SupabaseClient }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem('ar-rahnu-theme') === 'dark' ? 'dark' : 'light';
    } catch (error) {
      console.error('Tema paparan tidak dapat dibaca:', error);
      return 'light';
    }
  });
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [requiresPasswordUpdate, setRequiresPasswordUpdate] = useState(() =>
    typeof window !== 'undefined' && /type=(invite|recovery)/i.test(window.location.hash)
  );
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#191b1d' : '#047ea0'
    );
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(currentTheme => {
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('ar-rahnu-theme', nextTheme);
      } catch (error) {
        console.error('Pilihan tema tidak dapat disimpan:', error);
      }
      return nextTheme;
    });
  };

  useEffect(() => {
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const checkInstalled = () => {
      const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
      setIsAppInstalled(standaloneQuery.matches || navigatorWithStandalone.standalone === true);
    };
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const markInstalled = () => {
      setIsAppInstalled(true);
      setDeferredInstallPrompt(null);
    };

    checkInstalled();
    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    window.addEventListener('appinstalled', markInstalled);
    standaloneQuery.addEventListener('change', checkInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
      window.removeEventListener('appinstalled', markInstalled);
      standaloneQuery.removeEventListener('change', checkInstalled);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        if (_event === 'PASSWORD_RECOVERY' || /type=(invite|recovery)/i.test(window.location.hash)) {
          setRequiresPasswordUpdate(true);
        }
        setIsCheckingSession(false);
      }
    });

    supabaseClient.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError(error.message);
      setSession(data.session);
      setIsCheckingSession(false);
    }).catch(error => {
      if (!active) return;
      setAuthError(error.message || 'Sesi Supabase tidak dapat diperiksa.');
      setIsCheckingSession(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabaseClient]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setAuthError('');
    setAuthNotice('');
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      setAuthError(error.message || 'Pengesahan Supabase gagal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) setAuthError(error.message);
  };

  const handleSetNewPassword = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setAuthError('');
    if (newPassword.length < 12) {
      setAuthError('Kata laluan mesti sekurang-kurangnya 12 aksara.');
      setIsSubmitting(false);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setAuthError('Pengesahan kata laluan tidak sepadan.');
      setIsSubmitting(false);
      return;
    }
    try {
      const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
      if (error) throw error;
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      setRequiresPasswordUpdate(false);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      setAuthError(error.message || 'Kata laluan tidak dapat dikemas kini.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstallApp = async () => {
    if (!deferredInstallPrompt) return;
    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    setDeferredInstallPrompt(null);
    if (choice.outcome === 'accepted') setIsAppInstalled(true);
  };

  if (isCheckingSession) {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4 text-slate-600">Menyambung ke Supabase...</div>;
  }

  if (session) {
    if (requiresPasswordUpdate) {
      return (
        <form onSubmit={handleSetNewPassword} className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4 font-sans">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-bold text-slate-800">Tetapkan kata laluan</h1>
            <p className="mt-2 text-sm text-slate-500">Cipta dan sahkan kata laluan baharu sebelum meneruskan ke sistem. Jika pautan jemputan tamat tempoh, minta Admin menghantar jemputan baharu.</p>
            <label htmlFor="new-password" className="mb-1 mt-5 block text-sm font-semibold text-slate-700">Kata laluan baharu</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={12} required value={newPassword} onChange={event => setNewPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-emerald-500" />
            <label htmlFor="confirm-new-password" className="mb-1 mt-4 block text-sm font-semibold text-slate-700">Sahkan kata laluan baharu</label>
            <input id="confirm-new-password" type="password" autoComplete="new-password" minLength={12} required value={confirmNewPassword} onChange={event => setConfirmNewPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-emerald-500" />
            <p className="mt-2 text-xs text-slate-500">Gunakan sekurang-kurangnya 12 aksara. Jangan gunakan semula kata laluan daripada akaun lain.</p>
            {authError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{authError}</p>}
            <button type="submit" disabled={isSubmitting} className="mt-5 w-full rounded-lg bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50">
              {isSubmitting ? 'Menyimpan...' : 'Simpan kata laluan'}
            </button>
          </div>
        </form>
      );
    }
    return <Dashboard
      key={session.user.id}
      user={session.user}
      supabaseClient={supabaseClient}
      onSignOut={handleSignOut}
      authError={authError}
      canInstall={Boolean(deferredInstallPrompt)}
      isAppInstalled={isAppInstalled}
      onInstallApp={handleInstallApp}
      theme={theme}
      onToggleTheme={handleToggleTheme}
    />;
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4 sm:p-6 font-sans">
      <form onSubmit={handleAuthSubmit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm">
        <div className="mb-3 flex justify-end">
          <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
        </div>
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-3">
            <img src="/icons/goldbar-logo.png" alt="Logo Ar-Rahnu" className="h-14 w-14 rounded-xl object-contain" />
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Ar-Rahnu Refinance System</p>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-800">Selamat Datang ke Ar-Rahnu Gameplay System</h1>
          <p className="mt-2 text-sm text-slate-500">Akaun hanya boleh dibuat melalui jemputan Admin organisasi.</p>
        </div>
        <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="supabase-email">E-mel</label>
        <input id="supabase-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="mb-4 w-full rounded-lg border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-emerald-500" />
        <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="supabase-password">Kata laluan</label>
        <input id="supabase-password" type="password" autoComplete="current-password" minLength={6} required value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-emerald-500" />
        {authError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{authError}</p>}
        {authNotice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{authNotice}</p>}
        <button type="submit" disabled={isSubmitting} className="mt-6 w-full rounded-lg bg-emerald-700 px-4 py-3 font-bold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50">
          {isSubmitting ? 'Memproses...' : 'Log masuk'}
        </button>
      </form>
    </div>
  );
}

function ThemeToggle({ theme, onToggle }: { theme: 'light' | 'dark'; onToggle: () => void }) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Aktifkan mod terang' : 'Aktifkan mod gelap'}
      title={isDark ? 'Aktifkan mod terang' : 'Aktifkan mod gelap'}
      className="group relative inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corporate-teal-500"
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
      <span role="tooltip" className="pointer-events-none absolute right-0 top-full z-[90] mt-2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {isDark ? 'Aktifkan mod terang' : 'Aktifkan mod gelap'}
      </span>
    </button>
  );
}

function Dashboard({ user, supabaseClient, onSignOut, authError, canInstall, isAppInstalled, onInstallApp, theme, onToggleTheme }: {
  user: User;
  supabaseClient: SupabaseClient;
  onSignOut: () => void;
  authError: string;
  canInstall: boolean;
  isAppInstalled: boolean;
  onInstallApp: () => Promise<void>;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactionStatusFilter, setTransactionStatusFilter] = useState('Semua');
  const [sagSearchQuery, setSagSearchQuery] = useState('');
  const [sagBranchFilter, setSagBranchFilter] = useState('Semua');
  const [sagMaturityFilter, setSagMaturityFilter] = useState('Semua');
  const [sagViewLayout, setSagViewLayout] = useState<'table' | 'grid'>('table');
  const [sagPage, setSagPage] = useState(1);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [assetSupplierFilter, setAssetSupplierFilter] = useState('Semua');
  const [assetWeightFilter, setAssetWeightFilter] = useState('Semua');
  const [assetStatusFilter, setAssetStatusFilter] = useState('Semua');
  const [assetSortBy, setAssetSortBy] = useState<'newest' | 'weight_desc' | 'price_desc' | 'code_asc'>('newest');
  const [assetViewLayout, setAssetViewLayout] = useState<'table' | 'grid'>('table');
  const [assetPage, setAssetPage] = useState(1);
  
  // State dengan sokongan localStorage
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem('ar_rahnu_transactions_v2');
      const savedTransactions = saved ? JSON.parse(saved) : initialTransactions;
      const transactionsToLoad = Array.isArray(savedTransactions) ? savedTransactions : initialTransactions;
      const migrationTimestamp = new Date().toISOString();
      return transactionsToLoad.map(transaction => {
        const normalizedTransaction = normalizeTransactionDateTime(transaction, migrationTimestamp);
        return {
          ...normalizedTransaction,
          transactionStatus: getTransactionStatus(normalizedTransaction)
        };
      });
    } catch {
      const migrationTimestamp = new Date().toISOString();
      return initialTransactions.map(transaction => {
        const normalizedTransaction = normalizeTransactionDateTime(transaction, migrationTimestamp);
        return {
          ...normalizedTransaction,
          transactionStatus: getTransactionStatus(normalizedTransaction)
        };
      });
    }
  });
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentDate(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const [institutions, setInstitutions] = useState(() => {
    try {
      const saved = localStorage.getItem('ar_rahnu_institutions_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 5) {
          return parsed.map(inst => {
            const defaultInst = initialInstitutions.find(item => item.name === inst.name);
            const spread = inst.marhunSpreadCustomized
              ? Number(inst.marhunSpread)
              : defaultInst?.marhunSpread ??
                (Number.isFinite(Number(inst.marhunSpread))
                  ? Number(inst.marhunSpread)
                  : Number(inst.marhunRate) - INITIAL_GOLD_SPOT_MYR_PER_GRAM);
            const spotPrice = Number.isFinite(Number(inst.marhunSpotPrice))
              ? Number(inst.marhunSpotPrice)
              : INITIAL_GOLD_SPOT_MYR_PER_GRAM;
            return {
              ...inst,
              marhunSpread: spread,
              marhunSpotPrice: spotPrice,
              marhunRate: defaultInst && !inst.marhunSpreadCustomized
                ? Number((spotPrice + spread).toFixed(2))
                : inst.marhunRate
            };
          });
        }
      }
      return initialInstitutions;
    } catch {
      return initialInstitutions;
    }
  });

  const [assets, setAssets] = useState(() => {
    try {
      const saved = localStorage.getItem('ar_rahnu_assets_v2');
      const migrationTimestamp = new Date().toISOString();
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((asset, idx) => ({
          ...normalizeAssetDateTime(asset, migrationTimestamp),
          code: asset.code || generateAssetCode(asset.type, asset.supplier, asset.purity, asset.weight, asset.id || idx + 1)
        }));
      }
      return initialAssets.map(asset => normalizeAssetDateTime(asset, migrationTimestamp));
    } catch {
      const migrationTimestamp = new Date().toISOString();
      return initialAssets.map(asset => normalizeAssetDateTime(asset, migrationTimestamp));
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ar_rahnu_transactions_v2', JSON.stringify(transactions));
    } catch (e) {
      console.error(e);
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem('ar_rahnu_institutions_v2', JSON.stringify(institutions));
    } catch (e) {
      console.error(e);
    }
  }, [institutions]);

  const [suppliers, setSuppliers] = useState(() => {
    try {
      const saved = localStorage.getItem('ar_rahnu_suppliers_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return initialSuppliers;
    } catch {
      return initialSuppliers;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ar_rahnu_suppliers_v2', JSON.stringify(suppliers));
    } catch (e) {
      console.error(e);
    }
  }, [suppliers]);

  useEffect(() => {
    try {
      localStorage.setItem('ar_rahnu_assets_v2', JSON.stringify(assets));
    } catch (e) {
      console.error(e);
    }
  }, [assets]);

  const [goldPriceHistory, setGoldPriceHistory] = useState<GoldPriceSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('ar_rahnu_gold_price_history_v1');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Sejarah harga emas tersimpan tidak dapat dibaca:', error);
      return [];
    }
  });
  const [financialReadiness, setFinancialReadiness] = useState(() => {
    try {
      const saved = localStorage.getItem(`ar_rahnu_financial_readiness_v1_${user.id}`);
      const parsed = saved ? JSON.parse(saved) : {};
      return {
        cashOnHand: String(parsed.cashOnHand ?? ''),
        monthlyIncome: String(parsed.monthlyIncome ?? ''),
        monthlyExpenses: String(parsed.monthlyExpenses ?? '')
      };
    } catch (error) {
      console.error('Maklumat kewangan tersimpan tidak dapat dibaca:', error);
      return { cashOnHand: '', monthlyIncome: '', monthlyExpenses: '' };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ar_rahnu_gold_price_history_v1', JSON.stringify(goldPriceHistory));
    } catch (error) {
      console.error('Sejarah harga emas tidak dapat disimpan ke browser:', error);
    }
  }, [goldPriceHistory]);

  useEffect(() => {
    try {
      localStorage.setItem(`ar_rahnu_financial_readiness_v1_${user.id}`, JSON.stringify(financialReadiness));
    } catch (error) {
      console.error('Maklumat kewangan tidak dapat disimpan ke browser:', error);
    }
  }, [financialReadiness, user.id]);

  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>(() => {
    try {
      const saved = localStorage.getItem('ar_rahnu_role_permissions');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      Admin: {
        sag_view: true, sag_create: true, sag_overlap: true, sag_delete: true,
        assets_view: true, assets_manage: true, assets_delete: true,
        analytics_view: true, ai_predictions: true, export_data: true,
        users_manage: true, roles_manage: true, audit_inspect: true,
      },
      Manager: {
        sag_view: true, sag_create: true, sag_overlap: true, sag_delete: false,
        assets_view: true, assets_manage: true, assets_delete: false,
        analytics_view: true, ai_predictions: true, export_data: true,
        users_manage: false, roles_manage: false, audit_inspect: true,
      },
      Staff: {
        sag_view: true, sag_create: true, sag_overlap: false, sag_delete: false,
        assets_view: true, assets_manage: false, assets_delete: false,
        analytics_view: true, ai_predictions: false, export_data: false,
        users_manage: false, roles_manage: false, audit_inspect: false,
      }
    };
  });

  const appData = useMemo(
    () => ({ transactions, institutions, assets, suppliers, goldPriceHistory, rolePermissions }),
    [transactions, institutions, assets, suppliers, goldPriceHistory, rolePermissions]
  );
  const localSnapshotRef = useRef(appData);
  localSnapshotRef.current = appData;
  const cloudSnapshotRef = useRef('');
  const dataOwnerUserIdRef = useRef(user.id);
  const ownWriteSnapshotsRef = useRef(new Set<string>());
  const saveQueueRef = useRef(Promise.resolve());
  const [organizationMembership, setOrganizationMembership] = useState(null);
  const [organizationError, setOrganizationError] = useState('');
  const [isDataReady, setIsDataReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState('loading');
  const [syncError, setSyncError] = useState('');
  const [isTableSetupRequired, setIsTableSetupRequired] = useState(false);
  const [isMembershipActiveColumnMissing, setIsMembershipActiveColumnMissing] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [hydrationRetry, setHydrationRetry] = useState(0);
  const [saveRetry, setSaveRetry] = useState(0);

  useEffect(() => {
    setAssets(currentAssets => syncAssetStatuses(currentAssets, transactions));
  }, [assets, transactions]);

  useEffect(() => {
    let active = true;
    let channel = null;

    const applyCloudData = (incoming) => {
      if (!incoming || !Array.isArray(incoming.transactions) ||
          !Array.isArray(incoming.institutions) || !Array.isArray(incoming.assets) ||
          !Array.isArray(incoming.suppliers)) {
        throw new Error('Struktur data Supabase tidak lengkap. Pastikan jadual ar_rahnu_user_data menggunakan skema aplikasi.');
      }

      const migrationTimestamp = new Date().toISOString();
      const nextData = {
        transactions: incoming.transactions.map(transaction => {
          const normalizedTransaction = normalizeTransactionDateTime(transaction, migrationTimestamp);
          return {
            ...normalizedTransaction,
            transactionStatus: getTransactionStatus(normalizedTransaction)
          };
        }),
        institutions: incoming.institutions,
        assets: syncAssetStatuses(
          incoming.assets.map(asset => normalizeAssetDateTime(asset, migrationTimestamp)),
          incoming.transactions
        ),
        suppliers: incoming.suppliers,
        goldPriceHistory: Array.isArray(incoming.goldPriceHistory) ? incoming.goldPriceHistory : []
      };
      const serializedData = JSON.stringify(nextData);
      cloudSnapshotRef.current = JSON.stringify({
        ...nextData,
        transactions: incoming.transactions,
        assets: incoming.assets
      });
      if (JSON.stringify(localSnapshotRef.current) === serializedData) return;

      setTransactions(nextData.transactions);
      setInstitutions(nextData.institutions);
      setAssets(nextData.assets);
      setSuppliers(nextData.suppliers);
      setGoldPriceHistory(nextData.goldPriceHistory);
      if (incoming.rolePermissions && typeof incoming.rolePermissions === 'object') {
        setRolePermissions(incoming.rolePermissions);
      }
    };

    const loadCloudData = async () => {
      setIsDataReady(false);
      setSyncStatus('loading');
      setSyncError('');
      setOrganizationError('');
      setIsTableSetupRequired(false);
      setIsMembershipActiveColumnMissing(false);
      setIsRealtimeConnected(false);
      try {
        const { data: membershipRow, error: membershipError } = await supabaseClient
          .from('ar_rahnu_organization_members')
          .select('organization_id, role')
          .eq('user_id', user.id)
          .maybeSingle();
        if (membershipError) throw membershipError;
        let membership = parseOrganizationMembership(membershipRow ? { ...membershipRow, active: true } : null);
        if (!membership) {
          const { data: bootstrapResult, error: bootstrapError } = await supabaseClient.functions.invoke('user-admin', {
            body: { action: 'bootstrap' }
          });
          if (bootstrapError) throw new Error(bootstrapResult?.error || bootstrapError.message);
          if (bootstrapResult?.error) throw new Error(bootstrapResult.error);
          membership = parseOrganizationMembership(bootstrapResult?.membership);
        }
        if (!membership) throw new Error('Akaun ini belum menjadi ahli organisasi. Hubungi Admin untuk jemputan.');
        if (!membership.active) throw new Error('Akses akaun ini telah digantung. Hubungi Admin organisasi.');
        const { data: organization, error: organizationError } = await supabaseClient
          .from('ar_rahnu_organizations')
          .select('name')
          .eq('id', membership.organization_id)
          .maybeSingle();
        if (organizationError) throw organizationError;
        // The organization RLS policy checks membership.active, so a hidden row means access is suspended.
        if (!organization) {
          throw new Error('Akses organisasi tidak aktif atau organisasi tidak dapat dicapai. Pastikan migrasi Supabase terkini telah digunakan.');
        }
        membership = { ...membership, organization };
        if (!active) return;
        setOrganizationMembership(membership);

        const isOrganizationManager = ['Admin', 'Manager'].includes(membership.role);
        const { data: row, error } = await supabaseClient
          .from('ar_rahnu_user_data')
          .select('user_id, organization_id, data')
          .eq(isOrganizationManager ? 'organization_id' : 'user_id', isOrganizationManager ? membership.organization_id : user.id)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;

        if (row) {
          dataOwnerUserIdRef.current = row.user_id;
          applyCloudData(row.data);
          if (isOrganizationManager && row.organization_id !== membership.organization_id) {
            throw new Error('Portfolio organisasi tidak dipautkan dengan betul. Hubungi Admin sistem.');
          }
        } else {
          if (isOrganizationManager) {
            throw new Error('Data portfolio organisasi belum tersedia. Hubungi Admin sistem; data peribadi tidak digunakan sebagai gantian.');
          }
          const firstSave = {
            transactions: [],
            institutions: initialInstitutions,
            assets: [],
            suppliers: initialSuppliers
          };
          applyCloudData(firstSave);
          const { error: saveError } = await supabaseClient
            .from('ar_rahnu_user_data')
            .upsert({ user_id: user.id, organization_id: null, data: firstSave, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
          if (saveError) throw saveError;
          cloudSnapshotRef.current = JSON.stringify(firstSave);
          dataOwnerUserIdRef.current = user.id;
        }

        if (!active) return;
        setIsDataReady(true);
        setSyncStatus('saved');
        channel = supabaseClient
          .channel(`ar-rahnu-user-data-${user.id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'ar_rahnu_user_data',
            filter: `user_id=eq.${dataOwnerUserIdRef.current}`
          }, payload => {
            try {
              const incomingSnapshot = JSON.stringify(payload.new.data);
              if (ownWriteSnapshotsRef.current.has(incomingSnapshot)) {
                ownWriteSnapshotsRef.current.delete(incomingSnapshot);
                cloudSnapshotRef.current = incomingSnapshot;
                return;
              }
              applyCloudData(payload.new.data);
              setSyncError('');
              setSyncStatus('saved');
            } catch (error) {
              setSyncError(error.message || 'Data realtime Supabase tidak sah.');
              setSyncStatus('error');
            }
          })
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'ar_rahnu_organization_members',
            filter: `user_id=eq.${user.id}`
          }, () => {
            window.location.reload();
          })
          .subscribe(status => {
            if (!active) return;
            setIsRealtimeConnected(status === 'SUBSCRIBED');
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              setSyncError(`Langganan realtime Supabase gagal: ${status}. Simpanan automatik masih mencuba melalui API.`);
            }
          });
      } catch (error) {
        if (!active) return;
        setOrganizationError(error.message || 'Keahlian organisasi tidak dapat disahkan.');
        const missingTable = isMissingSupabaseTableError(error);
        const missingUserManagementSchema = isMissingUserManagementSchemaError(error);
        setIsTableSetupRequired(missingTable || missingUserManagementSchema);
        setIsMembershipActiveColumnMissing(/column ["']?ar_rahnu_organization_members\.active["']? does not exist/i.test(error?.message || ''));
        setSyncError(missingTable
          ? "Jadual 'public.ar_rahnu_user_data' belum wujud atau belum masuk ke schema cache Supabase."
          : missingUserManagementSchema
            ? 'Skema pengurusan pengguna belum lengkap. Jalankan semula fail supabase/schema.sql dalam Supabase SQL Editor untuk menambah lajur dan polisi terkini.'
          : error.message || 'Data tidak dapat dimuatkan dari Supabase.');
        setSyncStatus('error');
      }
    };

    loadCloudData();
    return () => {
      active = false;
      if (channel) void supabaseClient.removeChannel(channel);
    };
  }, [supabaseClient, user.id, hydrationRetry]);

  useEffect(() => {
    if (!isDataReady) return;
    const snapshot = appData;
    const serializedSnapshot = JSON.stringify(snapshot);
    if (serializedSnapshot === cloudSnapshotRef.current) {
      setSyncStatus('saved');
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (!active) return;
          setSyncStatus('saving');
          ownWriteSnapshotsRef.current.add(serializedSnapshot);
          if (ownWriteSnapshotsRef.current.size > 10) {
            const oldestSnapshot = ownWriteSnapshotsRef.current.values().next().value;
            ownWriteSnapshotsRef.current.delete(oldestSnapshot);
          }
          const { error } = await supabaseClient
            .from('ar_rahnu_user_data')
            .upsert({
              user_id: dataOwnerUserIdRef.current,
              organization_id: ['Admin', 'Manager'].includes(organizationMembership?.role)
                ? organizationMembership.organization_id
                : null,
              data: snapshot,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
          if (!active) return;
          if (error) {
            ownWriteSnapshotsRef.current.delete(serializedSnapshot);
            setSyncError(error.message);
            setSyncStatus('error');
            return;
          }

          cloudSnapshotRef.current = serializedSnapshot;
          if (JSON.stringify(localSnapshotRef.current) === serializedSnapshot) {
            setSyncError('');
            setSyncStatus('saved');
          }
        })
        .catch(error => {
          if (!active) return;
          setSyncError(error.message || 'Perubahan tidak dapat disimpan ke Supabase.');
          setSyncStatus('error');
        });
    }, 500);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [appData, isDataReady, organizationMembership, saveRetry, supabaseClient, user.id]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [isInstitutionModalOpen, setIsInstitutionModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [correctionTransaction, setCorrectionTransaction] = useState(null);
  const [initialCorrectionAction, setInitialCorrectionAction] = useState('TS');
  const [editingAsset, setEditingAsset] = useState(null);
  const [editingInstitution, setEditingInstitution] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [organizationUsers, setOrganizationUsers] = useState([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('Staff');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [confirmNewUserPassword, setConfirmNewUserPassword] = useState('');
  const [editingOrganizationUser, setEditingOrganizationUser] = useState(null);
  const [userManagementBusy, setUserManagementBusy] = useState(false);
  const [userManagementError, setUserManagementError] = useState('');
  const [userManagementNotice, setUserManagementNotice] = useState('');
  const [userMgmtSubTab, setUserMgmtSubTab] = useState<'members' | 'matrix' | 'activity'>('members');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [userSortBy, setUserSortBy] = useState<'email' | 'newest' | 'last_signin'>('email');
  const [userPage, setUserPage] = useState(1);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteModalMode, setInviteModalMode] = useState<'single' | 'bulk'>('single');
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [bulkImportStatus, setBulkImportStatus] = useState<string | null>(null);
  const [matrixSaveNotice, setMatrixSaveNotice] = useState('');
  const [isSavingMatrix, setIsSavingMatrix] = useState(false);
  const matrixNoticeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (matrixNoticeTimeoutRef.current) {
        window.clearTimeout(matrixNoticeTimeoutRef.current);
      }
    };
  }, []);
  const [securityLogs, setSecurityLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(`ar_rahnu_security_logs_${user.id}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'sec-1',
        action: 'ROLE_ASSIGNED',
        actor: user.email || 'Admin',
        target: 'fabulouz.trading@gmail.com',
        detail: 'Peranan disahkan kepada Manager',
        timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
        severity: 'info'
      },
      {
        id: 'sec-2',
        action: 'PASSWORD_RESET_LINK',
        actor: user.email || 'Admin',
        target: '0stad1506@gmail.com',
        detail: 'Pautan tetapan semula kata laluan dijana dan dihantar',
        timestamp: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
        severity: 'info'
      },
      {
        id: 'sec-3',
        action: 'USER_PROVISIONED',
        actor: user.email || 'Admin',
        target: 'shazreen2510@gmail.com',
        detail: 'Akaun pengguna baharu didaftarkan dengan peranan Staff',
        timestamp: new Date(Date.now() - 3600000 * 24 * 8).toISOString(),
        severity: 'info'
      }
    ];
  });

  const invokeUserAdmin = async (body) => {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.refreshSession();
    if (sessionError) {
      if (/invalid refresh token|refresh token not found/i.test(sessionError.message)) {
        throw new Error('Sesi Supabase telah tamat. Sila log keluar dan log masuk semula.');
      }
      throw sessionError;
    }
    if (!session) throw new Error('Sesi Supabase telah tamat. Sila log masuk semula.');

    const { data, error } = await supabaseClient.functions.invoke('user-admin', {
      body,
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (error) {
      let responseError = data?.error;
      if (!responseError && error instanceof Error && 'context' in error && error.context instanceof Response) {
        try {
          const errorBody = await error.context.clone().json();
          if (typeof errorBody?.error === 'string') responseError = errorBody.error;
        } catch (parseError) {
          console.error('Respons ralat pengurusan pengguna tidak dapat dibaca:', parseError);
        }
      }
      if (
        ['create-user', 'update-user'].includes(body.action) &&
        typeof responseError === 'string' &&
        /tindakan tidak diketahui|unknown action/i.test(responseError)
      ) {
        throw new Error('Fungsi pengurusan pengguna di Supabase belum dikemas kini. Deploy semula fungsi user-admin, kemudian cuba lagi.');
      }
      throw new Error(responseError || error.message);
    }
    if (data?.error) {
      if (
        ['create-user', 'update-user'].includes(body.action) &&
        typeof data.error === 'string' &&
        /tindakan tidak diketahui|unknown action/i.test(data.error)
      ) {
        throw new Error('Fungsi pengurusan pengguna di Supabase belum dikemas kini. Deploy semula fungsi user-admin, kemudian cuba lagi.');
      }
      throw new Error(data.error);
    }
    return data;
  };

  const refreshOrganizationUsers = async () => {
    const data = await invokeUserAdmin({ action: 'list' });
    setOrganizationUsers(data.users || []);
  };

  const canManageOrganizationUsers = ['Admin', 'Manager'].includes(organizationMembership?.role);
  const isOrganizationAdmin = organizationMembership?.role === 'Admin';
  const [auditView, setAuditView] = useState<'trail' | 'traffic'>('trail');
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditVerification, setAuditVerification] = useState('');
  const [selectedAuditEvent, setSelectedAuditEvent] = useState<AuditEvent | null>(null);
  const [trafficEvents, setTrafficEvents] = useState<TrafficEvent[]>([]);
  const [trafficLoading, setTrafficLoading] = useState(false);
  const trafficLoadingRef = useRef(false);
  const [trafficError, setTrafficError] = useState('');
  const [trafficSearch, setTrafficSearch] = useState('');
  const [trafficPage, setTrafficPage] = useState(0);
  const [trafficPageSize, setTrafficPageSize] = useState(20);
  const [selectedTrafficEvent, setSelectedTrafficEvent] = useState<TrafficEvent | null>(null);
  const [trafficSchemaReady, setTrafficSchemaReady] = useState<boolean | null>(null);
  const [trafficPaused, setTrafficPaused] = useState(() => {
    try {
      return localStorage.getItem(`ar_rahnu_traffic_paused_${user.id}`) === 'true';
    } catch (error) {
      console.error('Pilihan rakaman trafik tidak dapat dibaca:', error);
      return false;
    }
  });
  const auditChainScope = organizationMembership?.organization_id
    ? `organization:${organizationMembership.organization_id}`
    : null;

  useEffect(() => {
    try {
      localStorage.setItem(`ar_rahnu_traffic_paused_${user.id}`, String(trafficPaused));
    } catch (error) {
      console.error('Pilihan rakaman trafik tidak dapat disimpan:', error);
    }
  }, [trafficPaused, user.id]);

  useEffect(() => {
    setTrafficCaptureEnabled(false);
    if (!auditChainScope) return;
    let active = true;
    setTrafficSchemaReady(null);
    supabaseClient
      .from('ar_rahnu_traffic_events')
      .select('event_id')
      .limit(1)
      .then(({ error }) => {
        if (!active) return;
        if (error) {
          setTrafficSchemaReady(false);
          console.warn('Traffic inspector is unavailable until its database migration is installed:', error.message);
          return;
        }
        setTrafficSchemaReady(true);
        setTrafficCaptureEnabled(!trafficPaused);
      })
      .catch(error => {
        if (!active) return;
        setTrafficSchemaReady(false);
        console.error('Traffic inspector availability could not be checked:', error);
      });
    return () => {
      active = false;
      setTrafficCaptureEnabled(false);
    };
  }, [auditChainScope, trafficPaused, user.id]);

  const handleToggleTrafficCapture = () => {
    if (!trafficSchemaReady) return;
    setTrafficPaused(paused => {
      const nextPaused = !paused;
      setTrafficCaptureEnabled(!nextPaused);
      return nextPaused;
    });
  };

  const refreshTrafficEvents = async () => {
    if (!auditChainScope || trafficLoadingRef.current) return;
    trafficLoadingRef.current = true;
    setTrafficLoading(true);
    setTrafficError('');
    try {
      const { data, error } = await supabaseClient
        .from('ar_rahnu_traffic_events')
        .select('event_id, organization_id, actor_user_id, session_id, captured_at, client_ip, user_agent, method, request_path, host, status, duration_ms, request_payload, response_payload')
        .eq('organization_id', organizationMembership.organization_id)
        .gte('captured_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('captured_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      setTrafficEvents((data || []) as TrafficEvent[]);
    } catch (error) {
      setTrafficError(error.message || 'Permintaan HTTP tidak dapat dimuatkan.');
    } finally {
      trafficLoadingRef.current = false;
      setTrafficLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'audit' || auditView !== 'traffic' || !canManageOrganizationUsers) return;
    void refreshTrafficEvents();
    const timer = window.setInterval(() => void refreshTrafficEvents(), 5000);
    return () => window.clearInterval(timer);
  }, [activeTab, auditView, canManageOrganizationUsers, auditChainScope]);

  const filteredTrafficEvents = useMemo(
    () => trafficEvents.filter(event => matchesTrafficFilter(event, trafficSearch)),
    [trafficEvents, trafficSearch]
  );
  const trafficPageCount = Math.max(1, Math.ceil(filteredTrafficEvents.length / trafficPageSize));
  const visibleTrafficEvents = filteredTrafficEvents.slice(
    trafficPage * trafficPageSize,
    (trafficPage + 1) * trafficPageSize
  );

  useEffect(() => setTrafficPage(0), [trafficSearch, trafficPageSize]);

  const readAuditChain = async () => {
    if (!auditChainScope) throw new Error('Skop organisasi audit belum tersedia.');
    const events: AuditEvent[] = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabaseClient
        .from('ar_rahnu_audit_events')
        .select('event_id, chain_scope, sequence_no, event_payload, canonical_payload, previous_hash, event_hash, created_at')
        .eq('chain_scope', auditChainScope)
        .order('sequence_no', { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      const page = (data || []) as AuditEvent[];
      events.push(...page);
      if (page.length < pageSize) return events;
    }
  };

  const refreshAuditEvents = async () => {
    if (!auditChainScope) return;
    setAuditLoading(true);
    setAuditError('');
    setAuditVerification('');
    try {
      const { data, error } = await supabaseClient
        .from('ar_rahnu_audit_events')
        .select('event_id, chain_scope, sequence_no, event_payload, canonical_payload, previous_hash, event_hash, created_at')
        .eq('chain_scope', auditChainScope)
        .order('sequence_no', { ascending: false })
        .limit(100);
      if (error) throw error;
      setAuditEvents((data || []) as AuditEvent[]);
    } catch (error) {
      setAuditError(error.message || 'Rekod audit tidak dapat dimuatkan.');
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'audit' || !canManageOrganizationUsers) return;
    void refreshAuditEvents();
  }, [activeTab, canManageOrganizationUsers, auditChainScope]);

  const verifyAuditChain = async () => {
    setAuditLoading(true);
    setAuditError('');
    setAuditVerification('');
    try {
      const events = await readAuditChain();
      let previousHash = '0'.repeat(64);
      for (let index = 0; index < events.length; index += 1) {
        const event = events[index];
        const payload = JSON.parse(event.canonical_payload);
        const matchesStoredPayload = JSON.stringify(normalizeAuditJson(payload)) ===
          JSON.stringify(normalizeAuditJson(event.event_payload));
        if (
          event.sequence_no !== index + 1 ||
          event.previous_hash !== previousHash ||
          event.chain_scope !== payload.chain_scope ||
          event.event_id !== payload.event_id ||
          event.sequence_no !== payload.sequence_no ||
          !matchesStoredPayload
        ) {
          throw new Error(`Rantaian tidak sepadan pada urutan ${event.sequence_no}.`);
        }
        for (const snapshot of ['before', 'after'] as const) {
          const value = payload[`payload_${snapshot}`];
          const canonical = payload[`payload_${snapshot}_canonical`];
          const hash = payload[`payload_${snapshot}_sha256`];
          if (value === null) {
            if (canonical !== null || hash !== null) {
              throw new Error(`Hash snapshot ${snapshot} tidak sah pada urutan ${event.sequence_no}.`);
            }
          } else if (
            typeof canonical !== 'string' ||
            typeof hash !== 'string' ||
            JSON.stringify(normalizeAuditJson(JSON.parse(canonical))) !==
              JSON.stringify(normalizeAuditJson(value)) ||
            await sha256Hex(canonical) !== hash
          ) {
            throw new Error(`Hash snapshot ${snapshot} tidak sepadan pada urutan ${event.sequence_no}.`);
          }
        }
        const expectedHash = await sha256Hex(event.previous_hash + event.canonical_payload);
        if (expectedHash !== event.event_hash) {
          throw new Error(`Hash tidak sepadan pada urutan ${event.sequence_no}.`);
        }
        previousHash = event.event_hash;
      }
      setAuditVerification(`Rantaian sah: ${events.length} peristiwa diperiksa dari urutan pertama.`);
    } catch (error) {
      setAuditError(error.message || 'Pengesahan rantaian gagal.');
    } finally {
      setAuditLoading(false);
    }
  };

  const exportAuditChain = async () => {
    setAuditLoading(true);
    setAuditError('');
    try {
      const events = await readAuditChain();
      const exportData = {
        format: 'ar-rahnu-audit-chain-v1',
        chain_scope: auditChainScope,
        exported_at_utc: new Date().toISOString(),
        timestamp_assurance: 'Supabase database UTC timestamps; no independent RFC 3161 attestation configured',
        worm_archive: 'Not configured; this export is not WORM-protected until stored in an independently controlled immutable archive',
        events
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ar-rahnu-audit-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setAuditError(error.message || 'Eksport rantaian audit gagal.');
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    const shouldLoadUsers = activeTab === 'users' || (activeTab === 'audit' && auditView === 'trail');
    if (!shouldLoadUsers || !canManageOrganizationUsers) return;
    let active = true;
    setUserManagementError('');
    invokeUserAdmin({ action: 'list' })
      .then(data => {
        if (active) setOrganizationUsers(data.users || []);
      })
      .catch(error => {
        if (active) setUserManagementError(error.message || 'Senarai pengguna tidak dapat dimuatkan.');
      });
    return () => { active = false; };
  }, [activeTab, auditView, organizationMembership?.role]);

  const runUserAdminAction = async (body, successMessage) => {
    setUserManagementBusy(true);
    setUserManagementError('');
    setUserManagementNotice('');
    try {
      await invokeUserAdmin(body);
      setUserManagementNotice(successMessage);
      const targetUser = organizationUsers.find(u => u.id === body.userId);
      const targetEmail = body.email || targetUser?.email || 'Pengguna';
      const actionType = body.action === 'create-user' ? 'USER_PROVISIONED' :
        body.action === 'update-role' ? 'ROLE_CHANGED' :
        body.action === 'update-access' ? (body.active ? 'ACCESS_RESTORED' : 'ACCESS_SUSPENDED') :
        body.action === 'reset-password' ? 'PASSWORD_RESET_LINK' :
        body.action === 'delete-user' ? 'USER_DELETED' : 'USER_UPDATED';

      const logEntry = {
        id: `sec-${Date.now()}`,
        action: actionType,
        actor: user.email || 'Admin',
        target: targetEmail,
        detail: successMessage,
        timestamp: new Date().toISOString(),
        severity: (body.action === 'delete-user' || body.action === 'update-access') ? 'warning' : 'info'
      };
      setSecurityLogs(prev => {
        const next = [logEntry, ...prev].slice(0, 50);
        try {
          localStorage.setItem(`ar_rahnu_security_logs_${user.id}`, JSON.stringify(next));
        } catch (e) {
          console.error(e);
        }
        return next;
      });
      await refreshOrganizationUsers();
      return true;
    } catch (error) {
      setUserManagementError(error.message || 'Tindakan pengurusan pengguna gagal.');
      return false;
    } finally {
      setUserManagementBusy(false);
    }
  };

  const handleCreateOrganizationUser = async (event) => {
    event.preventDefault();
    if (newUserPassword.length < 12) {
      setUserManagementError('Kata laluan mesti sekurang-kurangnya 12 aksara.');
      return;
    }
    if (newUserPassword !== confirmNewUserPassword) {
      setUserManagementError('Pengesahan kata laluan tidak sepadan.');
      return;
    }
    const created = await runUserAdminAction(
      { action: 'create-user', email: newUserEmail, password: newUserPassword, role: newUserRole },
      'Akaun pengguna berjaya diwujudkan.'
    );
    if (created) {
      setNewUserEmail('');
      setNewUserPassword('');
      setConfirmNewUserPassword('');
      setIsInviteModalOpen(false);
    }
  };

  const handleBulkCsvImport = async (csvText: string) => {
    setUserManagementBusy(true);
    setUserManagementError('');
    setUserManagementNotice('');
    setBulkImportStatus('Memproses import CSV...');
    try {
      const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        throw new Error('Fail CSV mestilah mengandungi tajuk lajur dan sekurang-kurangnya 1 baris rekod.');
      }
      let successCount = 0;
      let failCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        if (parts.length < 3) continue;
        const [email, role, password] = parts;
        if (!email.includes('@') || password.length < 12) {
          failCount++;
          continue;
        }
        const assignedRole = ['Admin', 'Manager', 'Staff'].includes(role) ? role : 'Staff';
        try {
          await invokeUserAdmin({ action: 'create-user', email, password, role: assignedRole });
          successCount++;
        } catch {
          failCount++;
        }
      }
      await refreshOrganizationUsers();
      setBulkImportStatus(null);
      setIsInviteModalOpen(false);
      setBulkCsvText('');
      setUserManagementNotice(`Import CSV selesai: ${successCount} berjaya dicipta${failCount > 0 ? `, ${failCount} gagal/langkau.` : '.'}`);
    } catch (err: any) {
      setBulkImportStatus(null);
      setUserManagementError(err.message || 'Gagal memproses import CSV.');
    } finally {
      setUserManagementBusy(false);
    }
  };

  const handleDownloadCsvTemplate = () => {
    const csvContent = "email,role,password\nstaf1@contoh.com,Staff,PasswordAwal123!\nmanager1@contoh.com,Manager,PasswordAwal123!\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Template_Import_Pengguna.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateOrganizationUser = async (event) => {
    event.preventDefault();
    if (!editingOrganizationUser) return;
    if (editingOrganizationUser.password && editingOrganizationUser.password.length < 12) {
      setUserManagementError('Kata laluan baharu mesti sekurang-kurangnya 12 aksara.');
      return;
    }
    if (editingOrganizationUser.password !== editingOrganizationUser.confirmPassword) {
      setUserManagementError('Pengesahan kata laluan baharu tidak sepadan.');
      return;
    }
    const updated = await runUserAdminAction(
      {
        action: 'update-user',
        userId: editingOrganizationUser.id,
        email: editingOrganizationUser.email,
        password: editingOrganizationUser.password
      },
      `Maklumat ${editingOrganizationUser.email} berjaya dikemas kini.`
    );
    if (updated) setEditingOrganizationUser(null);
  };

  const handleDeleteOrganizationUser = (member) => {
    const confirmed = window.confirm(
      `Padam akaun ${member.email || 'pengguna ini'} secara kekal? Akaun Supabase, akses organisasi dan data akaun yang berkaitan akan dipadam. Tindakan ini tidak boleh dibatalkan.`
    );
    if (!confirmed) return;
    void runUserAdminAction(
      { action: 'delete-user', userId: member.id },
      `Akaun ${member.email || 'pengguna'} telah dipadam secara kekal.`
    );
  };

  const handleSaveRolePermissions = async () => {
    setIsSavingMatrix(true);
    setUserManagementError('');
    try {
      try {
        localStorage.setItem('ar_rahnu_role_permissions', JSON.stringify(rolePermissions));
      } catch (e) {
        console.error('Local storage error:', e);
      }

      const isOrganizationManager = ['Admin', 'Manager'].includes(organizationMembership?.role);
      const snapshotToSave = {
        ...appData,
        rolePermissions
      };

      const { error: saveError } = await supabaseClient
        .from('ar_rahnu_user_data')
        .upsert({
          user_id: dataOwnerUserIdRef.current,
          organization_id: isOrganizationManager ? organizationMembership?.organization_id : null,
          data: snapshotToSave,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (saveError) {
        throw saveError;
      }

      cloudSnapshotRef.current = JSON.stringify(snapshotToSave);

      const logEntry = {
        id: `sec-${Date.now()}`,
        action: 'PERMISSIONS_MATRIX_SAVED',
        actor: user.email || 'Admin',
        target: 'Organisasi',
        detail: 'Matriks kebenaran peranan berjaya disimpan ke pangkalan data Supabase.',
        timestamp: new Date().toISOString(),
        severity: 'info'
      };
      setSecurityLogs(prev => {
        const next = [logEntry, ...prev].slice(0, 50);
        try {
          localStorage.setItem(`ar_rahnu_security_logs_${user.id}`, JSON.stringify(next));
        } catch (e) {
          console.error(e);
        }
        return next;
      });

      if (matrixNoticeTimeoutRef.current) {
        window.clearTimeout(matrixNoticeTimeoutRef.current);
      }
      setMatrixSaveNotice('Rekod Telah Berjaya Di Simpan');
      matrixNoticeTimeoutRef.current = window.setTimeout(() => {
        setMatrixSaveNotice('');
        matrixNoticeTimeoutRef.current = null;
      }, 5000);

    } catch (error: any) {
      console.error('Ralat simpan matriks ke database:', error);
      setUserManagementError(error.message || 'Gagal menyimpan rekod matriks ke pangkalan data.');
    } finally {
      setIsSavingMatrix(false);
    }
  };

  // State Harga Live
  const [currentGoldPrice, setCurrentGoldPrice] = useState(
    () => Number(goldPriceHistory[goldPriceHistory.length - 1]?.price) || INITIAL_GOLD_SPOT_MYR_PER_GRAM
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [scenarioTransactionId, setScenarioTransactionId] = useState(
    () => transactions.find(transaction =>
      isRecordVisible(transaction) &&
      transaction.status === 'Aktif' &&
      !String(transaction.type || '').toLowerCase().includes('tebus')
    )?.id ?? ''
  );
  const [scenarioInstitutionName, setScenarioInstitutionName] = useState(
    () => transactions.find(transaction =>
      isRecordVisible(transaction) &&
      transaction.status === 'Aktif' &&
      !String(transaction.type || '').toLowerCase().includes('tebus')
    )?.institution || ''
  );
  const [scenarioMargin, setScenarioMargin] = useState('');
  const [scenarioOldFees, setScenarioOldFees] = useState('');
  const [scenarioNewFees, setScenarioNewFees] = useState('');
  const [sagFilter, setSagFilter] = useState<'all' | 'overlap' | 'shortfall' | 'ready'>('all');
  const [showAiMethodology, setShowAiMethodology] = useState(false);
  const [executiveChartTab, setExecutiveChartTab] = useState<'marhun' | 'institution' | 'types'>('marhun');
  const [dashboardCalendarView, setDashboardCalendarView] = useState<'agenda' | 'calendar'>('agenda');

  const visibleTransactions = useMemo(() => transactions.filter(isRecordVisible), [transactions]);
  const visibleAssets = useMemo(() => assets
    .filter(isRecordVisible)
    .sort((left, right) =>
      getTransactionTimestamp(right.updatedAt || right.createdAt || right.date) -
        getTransactionTimestamp(left.updatedAt || left.createdAt || left.date) ||
      String(right.id).localeCompare(String(left.id))
    ), [assets]);
  const visibleInstitutions = useMemo(() => institutions.filter(isRecordVisible), [institutions]);
  const visibleSuppliers = useMemo(() => suppliers.filter(isRecordVisible), [suppliers]);

  // State Mobile Menu & Install Prompt
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMaintenanceMenuOpen, setIsMaintenanceMenuOpen] = useState(true);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const notifiedRedemptionsThisSessionRef = useRef(new Set<string>());
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const [isNotificationListOpen, setIsNotificationListOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try {
      return localStorage.getItem(`ar_rahnu_notifications_enabled_${user.id}`) === 'true';
    } catch (error) {
      console.error('Pilihan notifikasi tidak dapat dibaca:', error);
      return false;
    }
  });
  const isSidebarCompact = !isSidebarExpanded && !isSidebarOpen;

  useEffect(() => {
    if (!isNotificationListOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !notificationMenuRef.current?.contains(event.target)) {
        setIsNotificationListOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsNotificationListOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isNotificationListOpen]);

  useEffect(() => {
    const handleGlobalShortcuts = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInput = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

      if ((event.altKey && event.key.toLowerCase() === 'n') || (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'n')) {
        event.preventDefault();
        setEditingTransaction(null);
        setIsModalOpen(true);
        return;
      }

      if ((event.altKey && event.key.toLowerCase() === 'a') || (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a')) {
        event.preventDefault();
        setEditingAsset(null);
        setIsAssetModalOpen(true);
        return;
      }

      if (!isInput && event.key === '/') {
        event.preventDefault();
        if (activeTab === 'assets') {
          const searchInput = document.getElementById('asset-search-input');
          if (searchInput) searchInput.focus();
        } else {
          setActiveTab('transactions');
          setTimeout(() => {
            const searchInput = document.getElementById('sag-search-input');
            if (searchInput) searchInput.focus();
          }, 50);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [activeTab]);

  const handleNotificationToggle = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      try {
        localStorage.setItem(`ar_rahnu_notifications_enabled_${user.id}`, 'false');
        setToastMessage('Notifikasi tarikh tebus dimatikan.');
      } catch (error) {
        console.error('Pilihan notifikasi tidak dapat disimpan:', error);
        setToastMessage('Notifikasi dimatikan buat masa ini, tetapi pilihan ini tidak dapat disimpan.');
      }
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    if (!('Notification' in window)) {
      setToastMessage('Browser ini tidak menyokong notifikasi sistem. Peringatan dalam aplikasi masih tersedia.');
      setTimeout(() => setToastMessage(null), 5000);
      return;
    }

    try {
      const permission = Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission;
      if (permission !== 'granted') {
        setToastMessage(permission === 'denied'
          ? 'Kebenaran notifikasi disekat. Benarkan notifikasi untuk laman ini melalui tetapan browser.'
          : 'Kebenaran notifikasi belum diberikan.');
        setTimeout(() => setToastMessage(null), 5000);
        return;
      }

      setNotificationsEnabled(true);
      try {
        localStorage.setItem(`ar_rahnu_notifications_enabled_${user.id}`, 'true');
        setToastMessage('Notifikasi tarikh tebus diaktifkan.');
      } catch (error) {
        console.error('Pilihan notifikasi tidak dapat disimpan:', error);
        setToastMessage('Notifikasi aktif untuk sesi ini, tetapi pilihan ini tidak dapat disimpan.');
      }
    } catch (error) {
      console.error('Kebenaran notifikasi tidak dapat diminta:', error);
      setToastMessage('Kebenaran notifikasi tidak dapat diminta daripada browser.');
    }
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleInstallButtonClick = () => {
    if (canInstall) {
      void onInstallApp();
      return;
    }
    if (!isAppInstalled) setShowInstallGuide(true);
  };

  const handleRefresh = async (institutionId = null, callback = null) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const liveSpot = await fetchGoldSpotMYRPerGram();
      const updatedAt = new Date().toISOString();
      setCurrentGoldPrice(liveSpot.price);
      setGoldPriceHistory(previousHistory => {
        const snapshotDate = getMalaysiaDateKey(new Date(updatedAt));
        const nextHistory = previousHistory.filter(snapshot => snapshot.date !== snapshotDate);
        nextHistory.push({ date: snapshotDate, capturedAt: updatedAt, price: liveSpot.price });
        return nextHistory.sort((left, right) => left.date.localeCompare(right.date)).slice(-365);
      });
      setInstitutions(prev => prev.map(inst => {
        if (!isRecordVisible(inst)) return inst;
        if (institutionId !== null && inst.id !== institutionId) return inst;
        const spread = Number.isFinite(Number(inst.marhunSpread))
          ? Number(inst.marhunSpread)
          : Number(inst.marhunRate) - INITIAL_GOLD_SPOT_MYR_PER_GRAM;
        return {
          ...inst,
          marhunSpread: spread,
          marhunSpotPrice: liveSpot.price,
          marhunRate: Number((liveSpot.price + spread).toFixed(2)),
          marhunUpdatedAt: updatedAt,
          goldSpotUpdatedAt: liveSpot.goldUpdatedAt,
          exchangeRateUpdatedAt: liveSpot.exchangeUpdatedAt
        };
      }));

      const refreshedInstitution = institutionId === null
        ? null
        : visibleInstitutions.find(inst => inst.id === institutionId);
      if (typeof callback === 'function') {
        const spread = Number(refreshedInstitution?.marhunSpread ??
          (Number(refreshedInstitution?.marhunRate) - INITIAL_GOLD_SPOT_MYR_PER_GRAM));
        callback({
          spotPrice: liveSpot.price,
          institutionRate: Number((liveSpot.price + spread).toFixed(2))
        });
      }
      setToastMessage(institutionId === null
        ? `Harga spot live RM${liveSpot.price.toFixed(2)}/g; anggaran kadar dikemas kini untuk ${visibleInstitutions.length} institusi.`
        : `Anggaran kadar ${refreshedInstitution?.name || 'institusi'} dikemas kini daripada harga spot live.`);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (error) {
      console.error('Gagal mendapatkan harga spot emas live:', error);
      setToastMessage(`Refresh gagal: ${error.message || 'Sumber harga live tidak dapat dicapai.'}`);
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsRefreshing(false);
    }
  };

  const dynamicAiData = useMemo(() => {
    return buildGoldForecast(goldPriceHistory);
  }, [goldPriceHistory]);
  const goldForecastAvailable = dynamicAiData.some(
    point => point.predicted !== null && point.actual === null
  );
  const twelveWeekGoldEstimate = goldForecastAvailable
    ? dynamicAiData[dynamicAiData.length - 1]?.predicted ?? null
    : null;

  // State untuk Emas Di Tangan (EDT) - Dikira secara dinamik dari Asset Record
  const edtBalance = useMemo(() => visibleAssets
    .filter(asset => asset.status === 'EDT')
    .reduce((sum, asset) => sum + (parseFloat(asset.weight) || 0), 0), [visibleAssets]);

  // Computed Dashboard Metrics
  const totalCapital = useMemo(() => visibleTransactions.reduce((sum, t) => sum + t.loan, 0), [visibleTransactions]);
  const totalProfit = useMemo(() => visibleTransactions.reduce((sum, t) => sum + t.profit, 0), [visibleTransactions]);
  const profitTrendData = useMemo(() => {
    const grouped = new Map();
    visibleTransactions.forEach(transaction => {
      if (!transaction.date) return;
      const dateKey = getTransactionDateKey(transaction.date);
      grouped.set(
        dateKey,
        (grouped.get(dateKey) || 0) + (Number(transaction.profit) || 0)
      );
    });
    return Array.from(grouped, ([date, profit]) => ({ date, profit }))
      .sort((left, right) => left.date.localeCompare(right.date));
  }, [visibleTransactions]);
  const institutionAnalysis = useMemo(() => {
    const grouped = new Map();
    visibleTransactions.forEach(transaction => {
      const name = transaction.institution || 'Tiada institusi';
      const entry = grouped.get(name) || { institution: name, loan: 0, redemption: 0 };
      entry.loan += Number(transaction.loan) || 0;
      entry.redemption += getCurrentRedemption(transaction);
      grouped.set(name, entry);
    });
    return Array.from(grouped.values());
  }, [visibleTransactions]);
  const transactionTypeAnalysis = useMemo(() => {
    const grouped = new Map();
    visibleTransactions.forEach(transaction => {
      const type = getTransactionStatus(transaction);
      grouped.set(type, (grouped.get(type) || 0) + 1);
    });
    return Array.from(grouped, ([name, count]) => ({ name, count }));
  }, [visibleTransactions]);
  const cumulativeMarhunData = useMemo(() => {
    const dailyValues = new Map();
    visibleTransactions.forEach(tx => {
      const value = getTransactionMarhunValue(tx);
      if (tx.date && value > 0) {
        const dateKey = getTransactionDateKey(tx.date);
        dailyValues.set(dateKey, (dailyValues.get(dateKey) || 0) + value);
      }
    });

    let accumulatedValue = 0;
    return Array.from(dailyValues.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, dailyValue]) => {
        accumulatedValue += dailyValue;
        return { date, dailyValue, accumulatedValue };
      });
  }, [visibleTransactions]);
  const filteredTransactions = useMemo(() => visibleTransactions.filter(transaction =>
    transactionStatusFilter === 'Semua' || getTransactionStatus(transaction) === transactionStatusFilter
  ), [visibleTransactions, transactionStatusFilter]);
  const sortedTransactions = useMemo(() => [...filteredTransactions].sort((left, right) =>
    getTransactionTimestamp(right.updatedAt || right.createdAt || right.date) -
      getTransactionTimestamp(left.updatedAt || left.createdAt || left.date) ||
    getTransactionTimestamp(right.date) - getTransactionTimestamp(left.date) ||
    String(right.id).localeCompare(String(left.id))
  ), [filteredTransactions]);
  const activePortfolioTransactions = useMemo(() => visibleTransactions.filter(transaction =>
    !String(transaction.type || '').toLowerCase().includes('tebus') &&
    (transaction.status === 'Aktif' || !transaction.status)
  ), [visibleTransactions]);
  const activeTickets = activePortfolioTransactions.length;
  const redemptionNotifications = useMemo(() => visibleTransactions
    .filter(tx => !tx.type.includes('Tebus') && (tx.status === 'Aktif' || !tx.status) && tx.redemptionDate)
    .map(tx => ({ ...tx, daysRemaining: getDaysUntilDate(tx.redemptionDate) }))
    .filter(tx => tx.daysRemaining <= 3)
    .sort((a, b) => a.daysRemaining - b.daysRemaining), [visibleTransactions, currentDate]);

  useEffect(() => {
    if (!notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted' ||
        redemptionNotifications.length === 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const storageKey = `ar_rahnu_notified_redemptions_${user.id}_${today}`;
    const currentAlerts = redemptionNotifications.map(tx => `${tx.id}:${tx.redemptionDate}`);
    let previouslyNotified: string[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      previouslyNotified = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(previouslyNotified)) {
        throw new Error('Format senarai notifikasi tersimpan tidak sah.');
      }
    } catch (error) {
      console.error('Sejarah notifikasi tarikh tebus tidak dapat dibaca:', error);
    }

    const newAlerts = currentAlerts.filter(alert =>
      !previouslyNotified.includes(alert) && !notifiedRedemptionsThisSessionRef.current.has(alert)
    );
    if (newAlerts.length === 0) return;

    const newAlertTransactions = redemptionNotifications.filter(tx =>
      newAlerts.includes(`${tx.id}:${tx.redemptionDate}`)
    );
    const references = newAlertTransactions.slice(0, 3).map(tx => `#${tx.refNo}`).join(', ');
    const additionalCount = newAlertTransactions.length - 3;
    try {
      const notification = new Notification('Peringatan tarikh tebus Ar-Rahnu', {
        body: `${newAlertTransactions.length} transaksi perlu perhatian${references ? `: ${references}` : ''}${additionalCount > 0 ? ` dan ${additionalCount} lagi` : ''}.`,
        tag: `ar-rahnu-redemption-${today}`,
        icon: '/icons/icon-192.png'
      });
      notification.onclick = () => window.focus();
      newAlerts.forEach(alert => notifiedRedemptionsThisSessionRef.current.add(alert));
    } catch (error) {
      console.error('Notifikasi tarikh tebus tidak dapat dipaparkan:', error);
      return;
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify([...previouslyNotified, ...newAlerts]));
    } catch (error) {
      console.error('Sejarah notifikasi tarikh tebus tidak dapat disimpan:', error);
    }
  }, [notificationsEnabled, redemptionNotifications, user.id]);
  const maturityCalendar = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const entries = visibleTransactions
      .filter(tx => !tx.type.includes('Tebus') && tx.redemptionDate)
      .map(tx => ({ ...tx, daysRemaining: getDaysUntilDate(tx.redemptionDate) }))
      .sort((a, b) => a.redemptionDate.localeCompare(b.redemptionDate));
    const entriesByDate = new Map();
    entries.forEach(tx => {
      const dateEntries = entriesByDate.get(tx.redemptionDate) || [];
      dateEntries.push(tx);
      entriesByDate.set(tx.redemptionDate, dateEntries);
    });

    const firstOfMonth = new Date(year, month, 1);
    const gridStart = new Date(year, month, 1 - firstOfMonth.getDay());
    const dayCount = Math.ceil((firstOfMonth.getDay() + new Date(year, month + 1, 0).getDate()) / 7) * 7;
    const days = Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return {
        date,
        dateKey,
        isCurrentMonth: date.getMonth() === month,
        entries: entriesByDate.get(dateKey) || []
      };
    });

    return { days, entries: entries.filter(tx => tx.redemptionDate.startsWith(monthPrefix)) };
  }, [calendarMonth, visibleTransactions, currentDate]);

  // Kira Emas Dalam Ar-Rahnu (EDR) dari surat yang belum tebus & aktif
  const edrBalance = useMemo(
    () => activePortfolioTransactions.reduce((sum, transaction) => sum + getCurrentPledgedWeight(transaction), 0),
    [activePortfolioTransactions]
  );
  const cashOnHand = financialReadiness.cashOnHand.trim() === ''
    ? null
    : Number.isFinite(Number(financialReadiness.cashOnHand))
      ? Math.max(0, Number(financialReadiness.cashOnHand))
      : null;
  const monthlyIncome = financialReadiness.monthlyIncome.trim() === ''
    ? null
    : Number.isFinite(Number(financialReadiness.monthlyIncome))
      ? Math.max(0, Number(financialReadiness.monthlyIncome))
      : null;
  const monthlyExpenses = financialReadiness.monthlyExpenses.trim() === ''
    ? null
    : Number.isFinite(Number(financialReadiness.monthlyExpenses))
      ? Math.max(0, Number(financialReadiness.monthlyExpenses))
      : null;
  const activeRedemptionTotal = activePortfolioTransactions.reduce(
    (sum, transaction) => sum + getCurrentRedemption(transaction),
    0
  );
  const cashCoverageRatio = cashOnHand === null
    ? null
    : activeRedemptionTotal > 0
      ? Math.min(cashOnHand / activeRedemptionTotal, 1)
      : 1;
  const edtCoverageRatio = edrBalance > 0 ? Math.min(edtBalance / edrBalance, 1) : 1;
  const riskScores = useMemo(() => activePortfolioTransactions.map(transaction => {
    const rawDaysRemaining = transaction.redemptionDate ? getDaysUntilDate(transaction.redemptionDate) : null;
    const daysRemaining = Number.isFinite(rawDaysRemaining) ? rawDaysRemaining : null;
    const linkedAssets = getTransactionAssetIds(transaction)
      .map(assetId => visibleAssets.find(asset => String(asset.id) === String(assetId)))
      .filter(Boolean);
    const transactionWeight = getCurrentPledgedWeight(transaction) ||
      linkedAssets.reduce((total, asset) => total + (Number(asset.weight) || 0), 0);
    const maturityPoints = daysRemaining === null
      ? 0
      : daysRemaining < 0
        ? 0
        : daysRemaining <= 3
          ? 5
          : daysRemaining <= 7
            ? 10
            : daysRemaining <= 30
              ? 20
              : 30;
    const cashPoints = cashCoverageRatio === null ? 0 : cashCoverageRatio * 35;
    const edtPoints = edtCoverageRatio * 20;
    const completeFields = [
      transactionWeight > 0,
      Boolean(transaction.purity || getPurityFromAssets(linkedAssets)),
      Number(transaction.marhunPrice) > 0,
      getTransactionMarhunValue(transaction) > 0,
      Number(transaction.loan) > 0,
      Number(transaction.margin) > 0,
      transaction.feeRate !== null && transaction.feeRate !== undefined &&
        Number.isFinite(Number(transaction.feeRate)),
      Boolean(normalizeFeeBasis(transaction.feeBasis)),
      Boolean(transaction.redemptionDate)
    ];
    const recordPoints = Math.round(
      completeFields.filter(Boolean).length / completeFields.length * 15
    );
    const score = cashCoverageRatio === null
      ? null
      : Math.round(maturityPoints + cashPoints + edtPoints + recordPoints);
    return { transaction, daysRemaining, score };
  }), [activePortfolioTransactions, visibleAssets, cashCoverageRatio, edtCoverageRatio, currentDate]);
  const averageRiskScore = riskScores.length && cashCoverageRatio !== null
    ? Math.round(riskScores.reduce((sum, item) => sum + (item.score || 0), 0) / riskScores.length)
    : null;
  const sagAiIndicators = useMemo(() => activePortfolioTransactions.map(transaction => {
    const institution = visibleInstitutions.find(item => item.name === transaction.institution);
    const weight = getCurrentPledgedWeight(transaction);
    const loan = getCurrentPrincipal(transaction);
    const margin = Number(transaction.margin) || 0;
    const newMargin = Number(institution?.maxMargin) || margin;
    const currentInstitutionRate = Number(institution?.marhunRate) || 0;
    const impliedLetterValue = loan > 0 && margin > 0 ? loan / (margin / 100) : null;
    const currentMarhunValue = weight > 0 && currentInstitutionRate > 0
      ? weight * currentInstitutionRate
      : null;
    const estimatedCashBeforeNewFees = currentMarhunValue === null || loan <= 0
      ? null
      : calculateOverlapCashBalance(
        currentMarhunValue * newMargin / 100,
        loan,
        getCurrentFeeArrears(transaction),
        0
      );
    const presumption = estimatedCashBeforeNewFees === null
      ? 'Data belum mencukupi'
      : estimatedCashBeforeNewFees > 0
        ? 'Potensi overlap'
        : estimatedCashBeforeNewFees < 0
          ? 'Petunjuk shortfall'
          : 'Cukup sebelum fi baharu';
    const recordedMarhunValue = getTransactionMarhunValue(transaction);
    const hasPartialRedemption = Boolean(getLatestPartialRedemption(transaction));
    const marhunValueMismatch = !hasPartialRedemption &&
      impliedLetterValue !== null &&
      recordedMarhunValue > 0 &&
      Math.abs(recordedMarhunValue - impliedLetterValue) > 0.01;
    const hasStoredSpread = institution?.marhunSpread !== null &&
      institution?.marhunSpread !== undefined &&
      String(institution.marhunSpread).trim() !== '' &&
      Number.isFinite(Number(institution.marhunSpread));
    const spread = hasStoredSpread
      ? Number(institution.marhunSpread)
      : currentInstitutionRate > 0 && currentGoldPrice > 0
        ? currentInstitutionRate - currentGoldPrice
        : null;
    const projectedInstitutionRate = twelveWeekGoldEstimate !== null && spread !== null
      ? Math.max(0, twelveWeekGoldEstimate + spread)
      : null;
    const projectedMarhunValue = projectedInstitutionRate !== null && weight > 0
      ? weight * projectedInstitutionRate
      : null;
    const projectedFinancing = projectedMarhunValue !== null && newMargin > 0
      ? projectedMarhunValue * newMargin / 100
      : null;
    const projectedCashBeforeNewFees = projectedFinancing === null
      ? null
      : calculateOverlapCashBalance(
        projectedFinancing,
        loan,
        getCurrentFeeArrears(transaction),
        0
      );
    const prediction = projectedCashBeforeNewFees === null
      ? null
      : projectedCashBeforeNewFees > 0
        ? 'Trend 12 minggu menunjukkan potensi overlap sebelum fi baharu'
        : projectedCashBeforeNewFees < 0
          ? 'Trend 12 minggu menunjukkan petunjuk shortfall sebelum fi baharu'
          : 'Trend 12 minggu cukup sebelum fi baharu';
    const readinessScore = riskScores.find(item =>
      String(item.transaction.id) === String(transaction.id)
    )?.score ?? null;

    return {
      transaction,
      currentMarhunValue,
      impliedLetterValue,
      marhunValueMismatch,
      presumption,
      estimatedCashBeforeNewFees,
      projectedMarhunValue,
      projectedFinancing,
      projectedCashBeforeNewFees,
      prediction,
      readinessScore
    };
  }), [
    activePortfolioTransactions,
    visibleInstitutions,
    currentGoldPrice,
    twelveWeekGoldEstimate,
    riskScores
  ]);
  const filteredSagAiIndicators = useMemo(() => {
    if (sagFilter === 'overlap') return sagAiIndicators.filter(i => i.presumption === 'Potensi overlap');
    if (sagFilter === 'shortfall') return sagAiIndicators.filter(i => i.presumption === 'Petunjuk shortfall');
    if (sagFilter === 'ready') return sagAiIndicators.filter(i => (i.readinessScore ?? 0) >= 80);
    return sagAiIndicators;
  }, [sagAiIndicators, sagFilter]);
  const selectedScenarioTransaction = activePortfolioTransactions.find(
    transaction => String(transaction.id) === String(scenarioTransactionId)
  ) || activePortfolioTransactions[0] || null;
  const scenarioInstitution = visibleInstitutions.find(
    institution => institution.name === (scenarioInstitutionName || selectedScenarioTransaction?.institution)
  ) || null;
  const scenarioMarginValue = Math.min(100, Math.max(0, Number(scenarioMargin === ''
    ? scenarioInstitution?.maxMargin ?? selectedScenarioTransaction?.margin
    : scenarioMargin) || 0));
  const scenarioFeesValue = Math.max(0, Number(scenarioNewFees) || 0);
  const scenarioFeesEntered = scenarioNewFees !== '' && Number.isFinite(Number(scenarioNewFees));
  const scenarioOldPrincipal = selectedScenarioTransaction
    ? getCurrentPrincipal(selectedScenarioTransaction)
    : 0;
  const scenarioOldFeesDefault = selectedScenarioTransaction
    ? getCurrentFeeArrears(selectedScenarioTransaction)
    : 0;
  const scenarioOldFeesValue = Math.max(0, Number(scenarioOldFees === ''
    ? scenarioOldFeesDefault
    : scenarioOldFees) || 0);
  const hasScenarioInstitutionSpread = scenarioInstitution?.marhunSpread !== null &&
    scenarioInstitution?.marhunSpread !== undefined &&
    String(scenarioInstitution.marhunSpread).trim() !== '' &&
    Number.isFinite(Number(scenarioInstitution.marhunSpread));
  const scenarioSpread = hasScenarioInstitutionSpread
    ? Number(scenarioInstitution.marhunSpread)
    : Number.isFinite(Number(scenarioInstitution?.marhunRate))
      ? Number(scenarioInstitution.marhunRate) - currentGoldPrice
      : 0;
  const scenarioOutcomes = selectedScenarioTransaction
    ? [
        { label: 'Harga turun 10%', change: -0.1 },
        { label: 'Harga kekal', change: 0 },
        { label: 'Harga naik 10%', change: 0.1 }
      ].map(scenario => {
        const simulatedSpot = currentGoldPrice * (1 + scenario.change);
        const simulatedRate = Math.max(0, simulatedSpot + scenarioSpread);
        const newMarhunValue = getCurrentPledgedWeight(selectedScenarioTransaction) * simulatedRate;
        const newFinancing = newMarhunValue * scenarioMarginValue / 100;
        const cashDifferenceBeforeNewFees = calculateOverlapCashBalance(
          newFinancing,
          scenarioOldPrincipal,
          scenarioOldFeesValue,
          0
        );
        const cashDifference = scenarioFeesEntered
          ? calculateOverlapCashBalance(
            newFinancing,
            scenarioOldPrincipal,
            scenarioOldFeesValue,
            scenarioFeesValue
          )
          : null;
        return {
          ...scenario,
          simulatedSpot,
          simulatedRate,
          newMarhunValue,
          newFinancing,
          oldPrincipal: scenarioOldPrincipal,
          oldFees: scenarioOldFeesValue,
          newFees: scenarioFeesEntered ? scenarioFeesValue : null,
          cashDifferenceBeforeNewFees,
          cashDifference
        };
      })
    : [];

  // SYSTEM RULES & CONDITIONS INDICATOR ENGINE
  const systemIndicators = useMemo(() => {
    const indicators = [];

    // AI RATIO CHECKER (EDT vs EDR)
    if (edrBalance > edtBalance) {
      indicators.push({
        id: 'ratio-alert',
        type: 'RATIO',
        badge: 'Semakan: nisbah EDT/EDR',
        ticket: 'PORTFOLIO',
        title: 'Semak pelan tebus surat aktif',
        desc: `EDT ada ${edtBalance}g dan EDR ${edrBalance}g. Pertimbangkan tunai tersedia, tebus atau pusing mengikut kemampuan dan syarat institusi; membeli emas bukan satu-satunya pilihan.`,
        color: 'amber'
      });
    }

    // Filter open tickets (hanya tiket yang aktif / belum selesai & belum ditebus)
    const openTx = visibleTransactions.filter(t => t.status === 'Aktif' || (!t.status && !t.type.includes('Tebus')));

    openTx.forEach(tx => {
      // RULE 3 & 4: Koperasi offer 70% sahaja & rate mesti lebih tinggi dari rate asal & ada untung melebihi kos tebus
      const best70 = visibleInstitutions
        .filter(i => i.maxMargin === 70 && i.marhunRate > tx.marhunPrice &&
          ((i.marhunRate * (i.maxMargin / 100) * getCurrentPledgedWeight(tx)) > getCurrentRedemption(tx)))
        .sort((a, b) => b.marhunRate - a.marhunRate)[0];

      if (best70) {
        indicators.push({
          id: `salin-${tx.id}`,
          type: 'SALIN',
          badge: 'Salin / Parking (70%)',
          ticket: tx.refNo,
          title: `Salin di ${best70.name}`,
          desc: `Oi acik, Makcik nampak kadar ${best70.name} RM${best70.marhunRate.toFixed(2)}/g lebih tinggi daripada surat lama. Boleh pertimbang salin di sana untuk parking dan ambil lebihan tunai.`,
          color: 'amber'
        });
      }

      // Anggaran OL sebelum fi baharu kerana fi berkaitan bergantung pada sebut harga institusi.
      const best80 = visibleInstitutions
        .filter(i => i.maxMargin === 80 && i.marhunRate > tx.marhunPrice)
        .sort((a, b) => b.marhunRate - a.marhunRate)[0];

      if (best80) {
        const newFinancing = best80.marhunRate * (best80.maxMargin / 100) *
          getCurrentPledgedWeight(tx);
        const oldPrincipal = getCurrentPrincipal(tx);
        const oldFees = getCurrentFeeArrears(tx);
        const estimatedCashBeforeNewFees = calculateOverlapCashBalance(
          newFinancing,
          oldPrincipal,
          oldFees,
          0
        );
        if (estimatedCashBeforeNewFees > 0) {
          indicators.push({
            id: `ol-${tx.id}`,
            type: 'OL',
            badge: 'OL / Pusing (80%)',
            ticket: tx.refNo,
            title: `Semak OL di ${best80.name}`,
            desc: `Pembiayaan baharu dianggarkan ${formatRM(newFinancing)}. Baki sebelum fi baharu: ${formatRM(estimatedCashBeforeNewFees)} selepas menolak pembiayaan lama ${formatRM(oldPrincipal)} dan caj tertunggak ${formatRM(oldFees)}. Masukkan fi berkaitan dan sahkan nilai sebenar dengan institusi.`,
            color: 'blue'
          });
        }
      }

      // Only flag active original pledges with a known redemption date within three days.
      if (!tx.type.includes('Tebus')) {
        const daysRemaining = tx.redemptionDate ? getDaysUntilDate(tx.redemptionDate) : null;
        if (daysRemaining !== null && daysRemaining <= 3) {
          indicators.push({
            id: `tebus-${tx.id}`,
            type: 'TEBUS',
            badge: daysRemaining < 0 ? 'Tindakan: Tebus Terlewat' : 'Tindakan: Tebus',
            ticket: tx.refNo,
            title: daysRemaining < 0
              ? `Surat dah lewat tebus / Perlu tindakan`
              : daysRemaining === 0
                ? `Surat perlu ditebus hari ini`
                : `Surat hampir matang / Perlu ditebus`,
            desc: `Oi acik, Makcik ingatkan tarikh tebus ${tx.redemptionDate}${daysRemaining < 0
              ? `. Dah lewat ${Math.abs(daysRemaining)} hari.`
              : daysRemaining === 0 ? ' ialah hari ini.' : `. Tinggal ${daysRemaining} hari.`} Anggaran jumlah tebus ${formatRM(getCurrentRedemption(tx))}. Sediakan tunai atau emas di tangan (EDT).`,
            color: 'emerald'
          });
        }
      }
    });

    // Deduplicate array based on unique id
    return indicators.reduce((acc, current) => {
      if (!acc.find(item => item.id === current.id)) return acc.concat([current]);
      return acc;
    }, []);
  }, [visibleTransactions, visibleInstitutions, edrBalance, edtBalance, currentDate]);

  // Color mapper for dynamic tailwind classes (required for compiler)
  const indStyles = {
    emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50', strip: 'bg-emerald-500', text: 'text-emerald-700', badgeBg: 'bg-emerald-100' },
    amber: { border: 'border-amber-200', bg: 'bg-amber-50', strip: 'bg-amber-500', text: 'text-amber-700', badgeBg: 'bg-amber-100' },
    blue: { border: 'border-blue-200', bg: 'bg-blue-50', strip: 'bg-blue-500', text: 'text-blue-700', badgeBg: 'bg-blue-100' },
    rose: { border: 'border-rose-200', bg: 'bg-rose-50', strip: 'bg-rose-500', text: 'text-rose-700', badgeBg: 'bg-rose-100' }
  };

  const handleToggleStatus = (id) => {
    const updatedAt = new Date().toISOString();
    setTransactions(prev => prev.map(t => {
      if (isRecordVisible(t) && String(t.id) === String(id) &&
          !['Ditebus', 'Dilelong'].includes(t.status)) {
        const nextStatus = t.status === 'Aktif' ? 'Selesai' : 'Aktif';
        return { ...t, status: nextStatus, updatedAt };
      }
      return t;
    }));
  };

  const handleResolveIndicator = (indicator) => {
    if (indicator.type === 'RATIO') {
      setIsAssetModalOpen(true);
    } else {
      const transaction = visibleTransactions.find(item => item.refNo === indicator.ticket);
      if (transaction) {
        const action = indicator.type === 'TEBUS'
          ? 'TS'
          : indicator.type === 'OL' ? 'OL' : 'Pusing';
        handleOpenCorrection(transaction, action);
      }
    }
  };

  const handleDeleteAsset = (id) => {
    const deletedAt = new Date().toISOString();
    setAssets(prev => prev.map(asset =>
      asset.id === id ? { ...asset, deletedAt, updatedAt: deletedAt } : asset
    ));
    setToastMessage('Rekod aset ditandakan sebagai dipadam dan disorokkan.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDelete = (id) => {
    const deletedAt = new Date().toISOString();
    setTransactions(prev => prev.map(transaction =>
      transaction.id === id ? { ...transaction, deletedAt, updatedAt: deletedAt } : transaction
    ));
    setToastMessage('Rekod transaksi ditandakan sebagai dipadam dan disorokkan.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExportCSV = () => {
    const headers = [
      "Tarikh & Masa", "Jenis Transaksi", "Tempat (Koperasi/Ar-Rahnu)",
      "No. Surat Rujukan", "Berat Emas (g)", "Harga Taksiran (RM/g)",
      "Kadar Pembiayaan (%)", "Jumlah Pembiayaan (RM)", "Jumlah Caj Simpanan (RM)",
      "Jumlah Tebus (RM)", "Lebihan Tunai Direkod (bukan untung) (RM)", "Catatan", "Jumlah Nilai Marhun (RM)",
      "Ketulenan", "Kadar Caj Simpanan (% sebulan)", "Asas Kiraan Caj", "Tempoh Pajakan (bulan)",
      "AI Presumption", "AI Predictive (12 minggu)", "AI Score kesiapsiagaan (/100)"
    ];

    const rows = visibleTransactions.map(tx => {
      const aiIndicator = sagAiIndicators.find(item =>
        String(item.transaction.id) === String(tx.id)
      );
      return [
        tx.date,
        tx.type,
        tx.institution,
        tx.refNo,
        getCurrentPledgedWeight(tx),
        tx.marhunPrice,
        `${tx.margin}%`,
        tx.loan,
        tx.fee || 0,
        getCurrentRedemption(tx),
        tx.profit,
        tx.remarks || '',
        getTransactionMarhunValue(tx),
        tx.purity || '',
        tx.feeRate ?? '',
        getFeeBasisLabel(tx.feeBasis),
        tx.feeTermMonths ?? '',
        aiIndicator?.presumption || '',
        aiIndicator?.prediction || '',
        aiIndicator?.readinessScore ?? ''
      ];
    });

    downloadCsv('Template_Gameplay_Ar-Rahnu_Kop.csv', headers, rows);
  };

  const handleExportAnalyticsCSV = () => {
    const headers = [
      'Jenis rekod', 'Tarikh & Masa', 'Rujukan/Kod', 'Institusi/Pembekal', 'Jenis',
      'Aset berkaitan', 'Berat (g)', 'Harga Marhun/Kadar (RM/g)',
      'Pembiayaan/Nilai (RM)', 'Jumlah tebus (RM)',
      'Lebihan tunai direkod (bukan untung) (RM)', 'AI Score kesiapsiagaan (/100)', 'Status', 'Catatan',
      'Jumlah Nilai Marhun (RM)', 'Ketulenan', 'Kadar Caj Simpanan (% sebulan)',
      'Asas Kiraan Caj', 'Jumlah Caj Simpanan (RM)', 'AI Presumption', 'AI Predictive (12 minggu)',
      'Tempoh Pajakan (bulan)'
    ];
    const transactionRows = visibleTransactions.map(transaction => {
      const linkedAssets = getTransactionAssetIds(transaction)
        .map(assetId => visibleAssets.find(asset => String(asset.id) === String(assetId)))
        .filter(Boolean)
        .map(asset => asset.code || asset.id)
        .join('; ');
      const risk = riskScores.find(item => String(item.transaction.id) === String(transaction.id));
      const aiIndicator = sagAiIndicators.find(item =>
        String(item.transaction.id) === String(transaction.id)
      );
      return [
        'Transaksi',
        transaction.date,
        transaction.refNo,
        transaction.institution,
        getTransactionStatus(transaction),
        linkedAssets,
        getCurrentPledgedWeight(transaction),
        transaction.marhunPrice,
        transaction.loan,
        getCurrentRedemption(transaction),
        transaction.profit,
        risk?.score ?? '',
        transaction.status || 'Belum ditetapkan',
        transaction.remarks,
        getTransactionMarhunValue(transaction),
        transaction.purity || '',
        transaction.feeRate ?? '',
        getFeeBasisLabel(transaction.feeBasis),
        transaction.fee || 0,
        aiIndicator?.presumption || '',
        aiIndicator?.prediction || '',
        transaction.feeTermMonths ?? ''
      ];
    });
    const assetRows = visibleAssets.map(asset => [
      'Aset',
      asset.date,
      asset.code || asset.id,
      asset.supplier,
      asset.type,
      '',
      asset.weight,
      '',
      asset.price,
      '',
      '',
      '',
      asset.status,
      asset.purity ? `Ketulenan ${asset.purity}` : '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ]);
    const institutionRows = visibleInstitutions.map(institution => [
      'Institusi',
      '',
      institution.id,
      institution.name,
      institution.category,
      '',
      '',
      institution.marhunRate,
      '',
      '',
      '',
      '',
      'Daftar institusi',
      institution.remarks,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ]);
    const supplierRows = visibleSuppliers.map(supplier => [
      'Pembekal',
      '',
      supplier.code || supplier.id,
      supplier.name,
      supplier.category,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Daftar pembekal',
      supplier.remarks || supplier.products,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ]);
    const priceRows = goldPriceHistory.map(snapshot => [
      'Snapshot harga',
      snapshot.date,
      '',
      'Harga spot emas',
      'Snapshot harian',
      '',
      '',
      snapshot.price,
      '',
      '',
      '',
      '',
      'Direkod',
      `Masa tangkapan: ${snapshot.capturedAt}`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ]);
    const scenarioRows = scenarioOutcomes.map(scenario => [
      'Simulasi overlap',
      '',
      selectedScenarioTransaction?.refNo,
      scenarioInstitution?.name || scenarioInstitutionName || selectedScenarioTransaction?.institution,
      scenario.label,
      getTransactionAssetIds(selectedScenarioTransaction || {})
        .map(assetId => visibleAssets.find(asset => String(asset.id) === String(assetId)))
        .filter(Boolean)
        .map(asset => asset.code || asset.id)
        .join('; '),
      getCurrentPledgedWeight(selectedScenarioTransaction || {}),
      scenario.simulatedRate,
      scenario.newFinancing,
      scenario.oldPrincipal + scenario.oldFees,
      scenario.cashDifference ?? '',
      '',
      scenario.cashDifference === null
        ? 'Fi baharu belum dimasukkan'
        : scenario.cashDifference >= 0 ? 'Lebihan tunai' : 'Perlu tambah tunai',
      `Pembiayaan lama ${formatRM(scenario.oldPrincipal)}; caj tertunggak ${formatRM(scenario.oldFees)}; fi baharu ${scenario.newFees === null ? 'belum dimasukkan' : formatRM(scenario.newFees)}; margin ${scenarioMarginValue}%. Anggaran sahaja, bukan keuntungan atau sebut harga rasmi.`,
      scenario.newMarhunValue,
      selectedScenarioTransaction?.purity || '',
      selectedScenarioTransaction?.feeRate ?? '',
      getFeeBasisLabel(selectedScenarioTransaction?.feeBasis),
      scenario.newFees ?? '',
      sagAiIndicators.find(item =>
        String(item.transaction.id) === String(selectedScenarioTransaction?.id)
      )?.presumption || '',
      sagAiIndicators.find(item =>
        String(item.transaction.id) === String(selectedScenarioTransaction?.id)
      )?.prediction || '',
      selectedScenarioTransaction?.feeTermMonths ?? ''
    ]);

    downloadCsv(
      `Laporan_Analitik_ArRahnu_${getMalaysiaDateKey()}.csv`,
      headers,
      [...transactionRows, ...assetRows, ...institutionRows, ...supplierRows, ...priceRows, ...scenarioRows]
    );
    setToastMessage('Laporan analitik CSV telah dimuat turun.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim() !== '');

      if (lines.length <= 1) return; // Ignore if empty or only headers

      const importedTx = [];
      const importedAt = new Date().toISOString();
      for (let i = 1; i < lines.length; i++) {
        // Regex to split by comma but ignore commas inside quotes
        const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());

        if (cols.length >= 11 && !cols[0].startsWith('Tarikh')) { // Ensure row is valid and not a header duplicate
          importedTx.push({
            id: Date.now() + i,
            date: normalizeTransactionDateTime({ date: cols[0] }, importedAt).date,
            createdAt: importedAt,
            updatedAt: importedAt,
            type: cols[1],
            transactionStatus: getTransactionStatus({ type: cols[1] }),
            institution: cols[2],
            refNo: cols[3],
            weight: parseFloat(cols[4]) || 0,
            marhunPrice: parseFloat(cols[5]) || 0,
            marhunValue: cols[12] !== undefined && Number.isFinite(parseFloat(cols[12]))
              ? parseFloat(cols[12])
              : calculateMarhunValue(parseFloat(cols[4]) || 0, parseFloat(cols[5]) || 0),
            margin: parseFloat(cols[6].replace('%', '')) || 0,
            loan: parseFloat(cols[7]) || 0,
            fee: parseFloat(cols[8]) || 0,
            redemption: parseFloat(cols[9]) || 0,
            profit: parseFloat(cols[10]) || 0,
            remarks: cols[11] || '',
            purity: cols[13] || '',
            feeRate: cols[14] !== undefined && cols[14] !== ''
              ? parseFloat(cols[14]) || 0
              : null,
            feeBasis: normalizeFeeBasis(cols[15]),
            feeTermMonths: cols[16] !== undefined && cols[16] !== ''
              ? parseFloat(cols[16]) || 0
              : null
          });
        }
      }

      if (importedTx.length > 0) {
        setTransactions(prev => {
          // Prevent duplicates by checking refNo
          const existingRefs = new Set(prev.map(t => t.refNo));
          const newUnique = importedTx.filter(t => !existingRefs.has(t.refNo));
          return [...prev, ...newUnique];
        });
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset file input
  };

  const handleAddTransaction = (newTx) => {
    const createdAt = new Date().toISOString();
    const selectedAssetIds = !newTx.type.includes('Tebus') ? (newTx.selectedAssetIds || []) : [];
    if (selectedAssetIds.length) {
      setAssets(prev => prev.map(asset =>
        isRecordVisible(asset) && selectedAssetIds.map(String).includes(String(asset.id))
          ? { ...asset, status: 'Dalam Ar-Rahnu', updatedAt: createdAt }
          : asset
      ));
    }
    const { id = Date.now(), selectedAssetId, ...transactionData } = newTx;
    setTransactions(prev => [...prev, {
      ...transactionData,
      transactionStatus: getTransactionStatus(transactionData),
      selectedAssetIds,
      createdAt,
      updatedAt: createdAt,
      id
    }]);
    setIsModalOpen(false);
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleOpenCorrection = (transaction, action = 'TS') => {
    setCorrectionTransaction(transaction);
    setInitialCorrectionAction(action);
    setIsCorrectionModalOpen(true);
  };

  const handleSaveCorrection = (correction) => {
    if (!correctionTransaction) return;
    if (correction.type === 'Lelong' && !correction.institutionConfirmed) {
      setToastMessage('Pengesahan institusi wajib direkod sebelum status lelong dikemas kini.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    const actionTransaction = visibleTransactions.find(transaction =>
      String(transaction.id) === String(correctionTransaction.id)
    );
    if (!actionTransaction || ['Selesai', 'Ditebus', 'Dilelong'].includes(actionTransaction.status)) {
      setToastMessage('Surat ini telah berubah atau selesai. Muat semula sebelum merekod tindakan.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    const sourceAssetIds: string[] = Array.from(new Set<string>(
      getTransactionAssetIds(actionTransaction).map(assetId => String(assetId))
    ));
    const selectedAssetIds: string[] = Array.from(new Set<string>(
      (Array.isArray(correction.selectedAssetIds) ? correction.selectedAssetIds : [])
        .map(assetId => String(assetId))
    ));
    const sourceAssetIdSet = new Set(sourceAssetIds);
    if (!selectedAssetIds.length ||
        selectedAssetIds.some(assetId => !sourceAssetIdSet.has(assetId))) {
      setToastMessage('Pilih sekurang-kurangnya satu aset EDR yang masih dipautkan kepada surat ini.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    const requiresAllAssets = ['TS', 'OL', 'Pusing', 'Lelong'].includes(correction.type);
    if (requiresAllAssets && selectedAssetIds.length !== sourceAssetIds.length) {
      setToastMessage('Jenis tindakan ini menamatkan surat lama; pilih semua aset EDR yang dipautkan.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    if (correction.type === 'TKS' && selectedAssetIds.length === sourceAssetIds.length) {
      setToastMessage('TKS perlu meninggalkan sekurang-kurangnya satu aset dalam surat. Gunakan TS untuk tebus penuh.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    const sourceAssets = visibleAssets.filter(asset =>
      sourceAssetIds.includes(String(asset.id))
    );
    if (sourceAssets.length !== sourceAssetIds.length) {
      setToastMessage('Satu atau lebih aset yang dipautkan tidak ditemui. Muat semula dan betulkan pautan sebelum menyimpan tindakan.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    const selectedAssets = sourceAssets.filter(asset =>
      selectedAssetIds.includes(String(asset.id))
    );
    if (selectedAssets.length !== selectedAssetIds.length) {
      setToastMessage('Satu atau lebih aset yang dipilih tidak lagi tersedia. Muat semula dan cuba semula.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    const isLinkedRollover = ['OL', 'Pusing'].includes(correction.type);
    let linkedTransaction = null;
    let linkedNewFinancing = null;
    let cashDifference = null;
    if (isLinkedRollover) {
      linkedTransaction = visibleTransactions.find(transaction =>
        String(transaction.id) === String(correction.linkedTransactionId)
      );
      if (!linkedTransaction || String(linkedTransaction.id) === String(actionTransaction.id) ||
          (linkedTransaction.status !== 'Aktif' && linkedTransaction.status) ||
          String(linkedTransaction.type || '').toLowerCase().includes('tebus') ||
          getMatchingAssetLinkStatus(actionTransaction, linkedTransaction) === false) {
        setToastMessage('Pilih SAG baharu yang sedia ada dan masih aktif untuk dipautkan.');
        setTimeout(() => setToastMessage(null), 4000);
        return;
      }
      if (!correction.sameGoldConfirmed ||
          !Number.isFinite(Number(correction.oldFinancing)) ||
          Number(correction.oldFinancing) < 0 ||
          !Number.isFinite(Number(correction.oldFees)) ||
          Number(correction.oldFees) < 0 ||
          !Number.isFinite(Number(correction.relatedFees)) ||
          Number(correction.relatedFees) < 0) {
        setToastMessage('Sahkan emas yang sama dan masukkan pembiayaan lama, caj tertunggak serta fi berkaitan.');
        setTimeout(() => setToastMessage(null), 4000);
        return;
      }
      linkedNewFinancing = getCurrentPrincipal(linkedTransaction);
      cashDifference = calculateOverlapCashBalance(
        linkedNewFinancing,
        correction.oldFinancing,
        correction.oldFees,
        correction.relatedFees
      );
    }
    const updatedAt = new Date().toISOString();
    const remainingAssetIds = sourceAssetIds.filter(assetId => !selectedAssetIds.includes(assetId));
    const releasedWeight = selectedAssets.reduce((total, asset) => total + (Number(asset.weight) || 0), 0);
    const remainingWeight = visibleAssets
      .filter(asset => remainingAssetIds.includes(String(asset.id)))
      .reduce((total, asset) => total + (Number(asset.weight) || 0), 0);
    const correctionEvent = {
      ...correction,
      selectedAssetIds: undefined,
      releasedAssetIds: selectedAssetIds,
      releasedAssetCodes: selectedAssets.map(asset => asset.code || String(asset.id)),
      releasedWeight,
      remainingWeight,
      totalPaid: isLinkedRollover
        ? Number(correction.oldFinancing) + Number(correction.oldFees)
        : correction.totalPaid,
      id: `${Date.now()}`,
      recordedAt: updatedAt,
      date: parseTransactionDateTime(correction.date).toISOString(),
      linkedRefNo: linkedTransaction?.refNo,
      newFinancing: linkedNewFinancing,
      cashDifference
    };
    const linkedTransactionId = isLinkedRollover
      ? correction.linkedTransactionId
      : null;

    setTransactions(previous => previous.map(transaction => {
      if (String(transaction.id) === String(actionTransaction.id)) {
        const status = correction.type === 'TS'
          ? 'Ditebus'
          : correction.type === 'Lelong'
            ? 'Dilelong'
            : isLinkedRollover
              ? 'Selesai'
              : transaction.status || 'Aktif';
        return {
          ...transaction,
          correctionEvents: [...getCorrectionEvents(transaction), correctionEvent],
          selectedAssetIds: getTransactionAssetIds(transaction)
            .filter(assetId => !selectedAssetIds.includes(String(assetId))),
          selectedAssetId: undefined,
          weight: remainingWeight,
          status,
          updatedAt
        };
      }
      if (linkedTransactionId && String(transaction.id) === String(linkedTransactionId)) {
        return {
          ...transaction,
          parentTransactionId: actionTransaction.id,
          parentRefNo: actionTransaction.refNo,
          updatedAt
        };
      }
      return transaction;
    }));

    setAssets(previous => previous.map(asset =>
      isRecordVisible(asset) && selectedAssetIds.includes(String(asset.id))
        ? { ...asset, status: 'EDT', updatedAt }
        : asset
    ));

    const otherActiveAssetIds = new Set<string>(visibleTransactions
      .filter(transaction =>
        String(transaction.id) !== String(actionTransaction.id) &&
        !['Selesai', 'Ditebus', 'Dilelong'].includes(transaction.status) &&
        !String(transaction.type || '').toLowerCase().includes('tebus')
      )
      .flatMap(getTransactionAssetIds)
      .map(assetId => String(assetId)));
    const returnedAssetCount = selectedAssetIds.filter(assetId => !otherActiveAssetIds.has(assetId)).length;
    const stillPledgedCount = selectedAssetIds.length - returnedAssetCount;
    setToastMessage(
      `Tindakan ${correction.type} untuk Surat #${actionTransaction.refNo} direkodkan. ` +
      `${returnedAssetCount} aset dikembalikan ke EDT` +
      (stillPledgedCount ? `; ${stillPledgedCount} aset kekal dipautkan kepada SAG aktif.` : '.')
    );
    setIsCorrectionModalOpen(false);
    setCorrectionTransaction(null);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveTransaction = (updatedTx) => {
    const updatedAt = new Date().toISOString();
    const selectedAssetIds = !updatedTx.type.includes('Tebus') ? (updatedTx.selectedAssetIds || []) : [];
    const { selectedAssetId, ...transactionData } = updatedTx;
    const transactionStatus = getTransactionStatus({ ...transactionData, transactionStatus: undefined });

    setTransactions(prev => prev.map(transaction =>
      transaction.id === editingTransaction.id
        ? {
            ...transaction,
            ...transactionData,
            id: transaction.id,
            status: transaction.status,
            updatedAt,
            transactionStatus,
            selectedAssetIds
          }
        : transaction
    ));
    setToastMessage(`Transaksi #${updatedTx.refNo} berjaya dikemaskini!`);
    setIsModalOpen(false);
    setEditingTransaction(null);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleEditAsset = (asset) => {
    setEditingAsset(asset);
    setIsAssetModalOpen(true);
  };

  const handleDuplicateAsset = (asset) => {
    const newId = Date.now();
    const createdAt = new Date().toISOString();
    const currentCode = asset.code || generateAssetCode(asset.type, asset.supplier, asset.purity, asset.weight, asset.id);
    const match = currentCode.match(/^(.*)-(\d+)$/);
    const newCode = match 
      ? `${match[1]}-${String(parseInt(match[2], 10) + 1).padStart(2, '0')}`
      : `${currentCode}-02`;

    const duplicated = {
      ...asset,
      id: newId,
      code: newCode,
      supplier: `${asset.supplier} (Salinan)`,
      date: createdAt,
      createdAt,
      updatedAt: createdAt
    };
    setAssets(prev => [...prev, duplicated]);
    setToastMessage(`Aset [${newCode}] berjaya diduplikasi!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveAsset = (assetData) => {
    const updatedAt = new Date().toISOString();
    const normalizedAssetData = {
      ...assetData,
      date: parseTransactionDateTime(assetData.date).toISOString()
    };
    const code = assetData.code?.trim() || generateAssetCode(assetData.type, assetData.supplierCodes || assetData.supplier, assetData.purity, assetData.weight, editingAsset ? editingAsset.id : Date.now(), suppliers);
    if (editingAsset) {
      setAssets(prev => prev.map(asset => asset.id === editingAsset.id
        ? {
            ...asset,
            ...normalizedAssetData,
            code,
            id: editingAsset.id,
            status: assetData.status || editingAsset.status,
            updatedAt
          }
        : asset
      ));
      setToastMessage(`Aset [${code}] berjaya dikemaskini!`);
    } else {
      setAssets(prev => [...prev, {
        ...normalizedAssetData,
        code,
        id: Date.now(),
        status: assetData.status || 'EDT',
        createdAt: updatedAt,
        updatedAt
      }]);
      setToastMessage(`Aset [${code}] berjaya didaftarkan!`);
    }
    setIsAssetModalOpen(false);
    setEditingAsset(null);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleEditInstitution = (inst) => {
    setEditingInstitution(inst);
    setIsInstitutionModalOpen(true);
  };

  const handleDeleteInstitution = (id) => {
    if (institutions.filter(isRecordVisible).length <= 1) {
      setToastMessage('Perlu sekurang-kurangnya 1 institusi aktif dalam sistem.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    const inst = institutions.find(i => i.id === id);
    const deletedAt = new Date().toISOString();
    setInstitutions(prev => prev.map(item =>
      item.id === id ? { ...item, deletedAt, updatedAt: deletedAt } : item
    ));
    setToastMessage(`Institusi "${inst?.name || ''}" ditandakan sebagai dipadam dan disorokkan.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveInstitution = (instData) => {
    const savedInstitution = { ...instData, marhunSpreadCustomized: true };
    if (editingInstitution) {
      setInstitutions(prev => prev.map(i => i.id === editingInstitution.id ? { ...savedInstitution, id: editingInstitution.id } : i));
      setToastMessage(`Institusi "${savedInstitution.name}" berjaya dikemaskini!`);
    } else {
      setInstitutions(prev => [...prev, { ...savedInstitution, id: Date.now() }]);
      setToastMessage(`Institusi baharu "${savedInstitution.name}" berjaya ditambah!`);
    }
    setIsInstitutionModalOpen(false);
    setEditingInstitution(null);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleResetInstitutions = () => {
    setInstitutions(prev => resetRecordsPreservingDeleted(initialInstitutions, prev));
    setToastMessage('Senarai institusi Bangi telah dimuat semula ke tetapan asal!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setIsSupplierModalOpen(true);
  };

  const handleDeleteSupplier = (id) => {
    const supplier = suppliers.find(item => item.id === id);
    const deletedAt = new Date().toISOString();
    setSuppliers(prev => prev.map(item =>
      item.id === id ? { ...item, deletedAt, updatedAt: deletedAt } : item
    ));
    setToastMessage(`Pembekal "${supplier?.name || ''}" ditandakan sebagai dipadam dan disorokkan.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveSupplier = (supplierData) => {
    const normalizedCode = supplierData.code.trim().toUpperCase();
    const normalizedName = supplierData.name.trim().toLowerCase();
    const duplicate = suppliers.find(item =>
      item.id !== editingSupplier?.id &&
      (item.code.trim().toUpperCase() === normalizedCode || item.name.trim().toLowerCase() === normalizedName)
    );
    if (duplicate) {
      setToastMessage(`Kod atau nama pembekal telah digunakan oleh "${duplicate.name}".`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    const updatedSupplier = { ...supplierData, code: normalizedCode, name: supplierData.name.trim() };
    if (editingSupplier) {
      const assetUpdatedAt = new Date().toISOString();
      setSuppliers(prev => prev.map(item => item.id === editingSupplier.id ? { ...updatedSupplier, id: editingSupplier.id } : item));
      setAssets(prev => prev.map(asset => {
        const codes = asset.supplierCodes || suppliers
          .filter(item => item.name === asset.supplier || asset.supplier?.split(',').map(name => name.trim()).includes(item.name))
          .map(item => item.code);
        if (!codes.includes(editingSupplier.code) && asset.supplier !== editingSupplier.name) return asset;
        const updatedCodes = codes.map(code => code === editingSupplier.code ? updatedSupplier.code : code);
        const updatedNames = updatedCodes.map(code =>
          code === updatedSupplier.code
            ? updatedSupplier.name
            : suppliers.find(item => item.code === code)?.name
        ).filter(Boolean);
        return {
          ...asset,
          supplierCodes: updatedCodes,
          supplier: updatedNames.join(', '),
          updatedAt: assetUpdatedAt
        };
      }));
      setToastMessage(`Maklumat pembekal "${updatedSupplier.name}" berjaya dikemaskini!`);
    } else {
      setSuppliers(prev => [...prev, { ...updatedSupplier, id: Date.now() }]);
      setToastMessage(`Pembekal "${updatedSupplier.name}" berjaya didaftarkan!`);
    }
    setIsSupplierModalOpen(false);
    setEditingSupplier(null);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleResetSuppliers = () => {
    setSuppliers(prev => resetRecordsPreservingDeleted(initialSuppliers, prev));
    setSupplierSearch('');
    setToastMessage('Senarai 10 pembekal asal telah dimuat semula!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredSuppliers = visibleSuppliers.filter(supplier =>
    [supplier.code, supplier.name, supplier.category, supplier.products]
      .some(value => String(value || '').toLowerCase().includes(supplierSearch.trim().toLowerCase()))
  );
  const checkedInAssetIds = useMemo(() => getCheckedInAssetIds(transactions), [transactions]);
  const availableAssetsForTransaction = useMemo(
    () => visibleAssets.filter(asset => asset.status === 'EDT' && !checkedInAssetIds.has(String(asset.id))),
    [visibleAssets, checkedInAssetIds]
  );
  const editingTransactionAssetIds = new Set(
    (editingTransaction ? getTransactionAssetIds(editingTransaction) : []).map(String)
  );
  const editingTransactionAssets = visibleAssets.filter(asset => editingTransactionAssetIds.has(String(asset.id)));
  const getTransactionModalAssets = candidateAssets => [
    ...candidateAssets,
    ...editingTransactionAssets.filter(asset =>
      !candidateAssets.some(candidate => String(candidate.id) === String(asset.id))
    )
  ];

  if (!isDataReady) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4 sm:p-6 font-sans">
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">
            {syncStatus === 'loading' ? 'Memuatkan data Supabase...' : isTableSetupRequired ? 'Skema Supabase perlu dikemas kini' : 'Data Supabase belum tersedia'}
          </h1>
          {syncError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-left text-sm text-red-700">{syncError}</p>}
          {isTableSetupRequired && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-950">
              {isMembershipActiveColumnMissing ? (
                <>
                  <p className="font-bold">Pembaikan khusus: lajur <code>active</code> belum wujud dalam jadual keahlian.</p>
                  <p className="mt-2">Buka SQL Editor untuk projek <code>zyikvjbnroicbeezpxvx</code>, jalankan skrip <code>supabase/fix-missing-membership-active.sql</code> (atau tampal arahan ini), kemudian kembali dan tekan <strong>Cuba sambung semula</strong>:</p>
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-white p-3 text-xs text-slate-800"><code>{`ALTER TABLE public.ar_rahnu_organization_members
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';`}</code></pre>
                </>
              ) : (
                <>
                  <p className="font-bold">Lengkapkan persediaan database:</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    <li>Buka fail <code>supabase/schema.sql</code> dalam projek ini dan salin keseluruhan kandungannya. Skrip ini selamat dijalankan semula untuk menambah skema terkini.</li>
                    <li>Buka <a href="https://supabase.com/dashboard/project/zyikvjbnroicbeezpxvx/sql/new" target="_blank" rel="noreferrer" className="font-bold underline">SQL Editor projek Supabase</a>, tampal skrip itu dan tekan <strong>Run</strong>.</li>
                    <li>Kembali ke sini dan tekan <strong>Cuba sambung semula</strong>.</li>
                  </ol>
                </>
              )}
              <a href="https://supabase.com/dashboard/project/zyikvjbnroicbeezpxvx/sql/new" target="_blank" rel="noreferrer" className="mt-3 inline-block font-bold underline">Buka SQL Editor Supabase</a>
              <p className="mt-3 text-xs text-amber-900">Jalankan SQL pada projek yang sama. Jangan masukkan service_role key ke dalam aplikasi.</p>
            </div>
          )}
          {syncStatus === 'loading' && <p className="mt-3 text-sm text-slate-500">Data tempatan tidak akan menggantikan data awan yang sedia ada.</p>}
          {syncStatus === 'error' && (
            <button onClick={() => setHydrationRetry(value => value + 1)} className="mt-5 rounded-lg bg-emerald-700 px-5 py-2.5 font-bold text-white hover:bg-emerald-800">
              Cuba sambung semula
            </button>
          )}
          <button onClick={onSignOut} className="mt-5 block w-full text-sm font-semibold text-slate-500 hover:text-slate-800">Log keluar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen h-[100dvh] min-w-0 bg-slate-50 font-sans text-slate-800 overflow-hidden relative">

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        onMouseEnter={() => {
          if (window.matchMedia('(min-width: 1024px)').matches) setIsSidebarExpanded(true);
        }}
        onMouseLeave={() => {
          if (window.matchMedia('(min-width: 1024px)').matches) setIsSidebarExpanded(false);
        }}
        onFocusCapture={() => {
          if (window.matchMedia('(min-width: 1024px)').matches) setIsSidebarExpanded(true);
        }}
        onBlurCapture={event => {
          if (!event.currentTarget.contains(event.relatedTarget) && window.matchMedia('(min-width: 1024px)').matches) {
            setIsSidebarExpanded(false);
          }
        }}
        className={`fixed lg:relative inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-[width,transform] duration-300 ease-in-out w-64 max-w-[85vw] ${isSidebarExpanded ? 'lg:w-64' : 'lg:w-20'} ${theme === 'dark' ? 'bg-corporate-teal-950 text-slate-100 border-corporate-teal-800' : 'bg-[#F8F3EA] text-slate-800 border-slate-200'} border-r flex flex-col shadow-2xl z-50 shrink-0`}
      >
        <div className={`flex items-center border-b ${isSidebarCompact ? 'justify-center px-3 py-5 lg:justify-center' : 'justify-between p-6'} ${theme === 'dark' ? 'border-corporate-teal-800/50' : 'border-slate-200'}`}>
          <div className="flex items-center space-x-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
              <span aria-hidden="true" className={`absolute inset-0 rounded-full blur-md ${theme === 'dark' ? 'bg-gradient-to-br from-corporate-magenta-400/40 via-corporate-teal-400/20 to-transparent' : ''}`} />
              <img src="/icons/goldbar-logo.png" alt="Logo Ar-Rahnu" className={`relative z-10 h-full w-full object-contain ${theme === 'dark' ? 'drop-shadow-[0_0_8px_rgba(207,57,131,0.65)]' : ''}`} />
            </div>
            <div className={isSidebarCompact ? 'lg:hidden' : ''}>
              <h1 className={`text-xl font-bold tracking-tight ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-corporate-magenta-200 to-corporate-magenta-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(207,57,131,0.65)]'
                  : 'text-corporate-magenta-700'
              }`}>Ar-Rahnu</h1>
              <p className={`text-xs font-medium ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-corporate-magenta-300 to-corporate-magenta-500 bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(207,57,131,0.55)]'
                  : 'text-corporate-magenta-600'
              }`}>Refinance System</p>
            </div>
          </div>
          <button aria-label="Tutup menu" className={`lg:hidden transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`} onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className={`flex-1 py-6 space-y-2 overflow-y-auto custom-scrollbar ${isSidebarCompact ? 'px-3' : 'px-4'}`}>
          <NavItem compact={isSidebarCompact} theme={theme} icon={<LayoutDashboard size={20} />} label="Dashboard" isActive={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} />
          <NavItem compact={isSidebarCompact} theme={theme} icon={<Database size={20} />} label="Asset Record" isActive={activeTab === 'assets'} onClick={() => { setActiveTab('assets'); setIsSidebarOpen(false); }} />
          <NavItem compact={isSidebarCompact} theme={theme} icon={<ArrowRightLeft size={20} />} label="Pengurusan Surat Gadaian (SAG)" isActive={activeTab === 'transactions'} badge={redemptionNotifications.length} onClick={() => { setActiveTab('transactions'); setIsSidebarOpen(false); }} />
          <div>
            <button
              type="button"
              aria-expanded={isMaintenanceMenuOpen}
              aria-label="Selenggara"
              title={isSidebarCompact ? 'Selenggara' : undefined}
              onClick={() => setIsMaintenanceMenuOpen(open => !open)}
              className={`w-full flex items-center rounded-xl transition-all duration-200 ${isSidebarCompact ? 'justify-center px-2' : 'justify-between px-4'} py-3 ${
                activeTab === 'suppliers' || activeTab === 'institutions'
                  ? theme === 'dark'
                    ? 'bg-corporate-teal-800 text-white font-semibold shadow-inner border border-corporate-teal-700'
                    : 'bg-corporate-teal-100 text-corporate-teal-800 font-semibold border border-corporate-teal-200'
                  : theme === 'dark'
                    ? 'text-slate-200 hover:bg-corporate-teal-900 hover:text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className={`flex items-center ${isSidebarCompact ? '' : 'space-x-3'}`}>
                <span className={activeTab === 'suppliers' || activeTab === 'institutions'
                  ? theme === 'dark' ? 'text-corporate-magenta-300' : 'text-corporate-magenta-600'
                  : theme === 'dark' ? 'text-corporate-teal-300' : 'text-corporate-teal-600'}>
                  <Settings2 size={20} />
                </span>
                <span className={isSidebarCompact ? 'lg:hidden' : ''}>Selenggara</span>
              </span>
              <ChevronDown size={16} className={`transition-transform ${isMaintenanceMenuOpen ? '' : '-rotate-90'} ${isSidebarCompact ? 'lg:hidden' : ''}`} />
            </button>
            {isMaintenanceMenuOpen && !isSidebarCompact && (
              <div className={`mt-1 ml-4 pl-3 border-l space-y-1 ${theme === 'dark' ? 'border-corporate-teal-700' : 'border-slate-300'}`}>
                <button
                  type="button"
                  onClick={() => { setActiveTab('suppliers'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeTab === 'suppliers'
                      ? theme === 'dark' ? 'bg-corporate-teal-800 text-white font-semibold' : 'bg-corporate-teal-100 text-corporate-teal-800 font-semibold'
                      : theme === 'dark' ? 'text-slate-200 hover:bg-corporate-teal-900 hover:text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Store size={17} className={activeTab === 'suppliers'
                    ? theme === 'dark' ? 'text-corporate-magenta-300' : 'text-corporate-magenta-600'
                    : theme === 'dark' ? 'text-corporate-teal-300' : 'text-corporate-teal-600'} />
                  <span>Pembekal</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('institutions'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeTab === 'institutions'
                      ? theme === 'dark' ? 'bg-corporate-teal-800 text-white font-semibold' : 'bg-corporate-teal-100 text-corporate-teal-800 font-semibold'
                      : theme === 'dark' ? 'text-slate-200 hover:bg-corporate-teal-900 hover:text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Building2 size={17} className={activeTab === 'institutions'
                    ? theme === 'dark' ? 'text-corporate-magenta-300' : 'text-corporate-magenta-600'
                    : theme === 'dark' ? 'text-corporate-teal-300' : 'text-corporate-teal-600'} />
                  <span>Institusi &amp; Koperasi</span>
                </button>
              </div>
            )}
          </div>
          <NavItem compact={isSidebarCompact} theme={theme} icon={<BrainCircuit size={20} />} label="AI Predictions" isActive={activeTab === 'ai'} onClick={() => { setActiveTab('ai'); setIsSidebarOpen(false); }} />
          {canManageOrganizationUsers && (
            <NavItem compact={isSidebarCompact} theme={theme} icon={<Users size={20} />} label="Pengurusan Pengguna" isActive={activeTab === 'users'} onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }} />
          )}
          {canManageOrganizationUsers && (
            <NavItem compact={isSidebarCompact} theme={theme} icon={<FileSearch size={20} />} label="Audit Trail" isActive={activeTab === 'audit'} onClick={() => { setActiveTab('audit'); setIsSidebarOpen(false); }} />
          )}
        </nav>

        <div className="space-y-3 p-3 sm:p-4">
          {!isSidebarCompact && (
            <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'bg-corporate-teal-900/50 border-corporate-teal-800/50' : 'bg-slate-50 border-slate-200'}`}>
              <div className={`mb-2 flex items-center space-x-2 ${theme === 'dark' ? 'text-corporate-magenta-300' : 'text-corporate-magenta-600'}`}>
                <Sparkles size={16} />
                <span className="text-sm font-semibold">EGM Engine Active</span>
              </div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>System is monitoring market prices to find optimal refinancing windows.</p>
            </div>
          )}
          {isSidebarCompact ? (
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Aktifkan mod terang' : 'Aktifkan mod gelap'}
              title={theme === 'dark' ? 'Mod terang' : 'Mod gelap'}
              className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${theme === 'dark' ? 'border-corporate-teal-700 text-corporate-magenta-300 hover:bg-corporate-teal-900' : 'border-slate-200 text-corporate-teal-700 hover:bg-slate-100'}`}
            >
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          ) : (
            <div className={`grid grid-cols-2 gap-1 rounded-xl border p-1 ${theme === 'dark' ? 'border-corporate-teal-700 bg-corporate-teal-900/60' : 'border-slate-200 bg-slate-100'}`}>
              <button
                type="button"
                aria-pressed={theme === 'light'}
                onClick={() => { if (theme !== 'light') onToggleTheme(); }}
                className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${theme === 'light' ? 'bg-white text-corporate-teal-700 shadow-sm' : 'text-slate-300 hover:bg-corporate-teal-800 hover:text-white'}`}
              >
                <Sun size={16} />
                <span>Light</span>
              </button>
              <button
                type="button"
                aria-pressed={theme === 'dark'}
                onClick={() => { if (theme !== 'dark') onToggleTheme(); }}
                className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-corporate-teal-800 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-800'}`}
              >
                <Moon size={16} />
                <span>Dark</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 min-w-0 min-h-0 flex flex-col h-full w-full lg:w-auto overflow-hidden">
        {/* HEADER */}
        <header className="h-16 sm:h-20 bg-white/80 backdrop-blur-md border-b-2 border-corporate-teal-500 flex items-center justify-between gap-2 px-3 sm:px-4 md:px-8 z-10 shrink-0">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
            <button
              className="lg:hidden p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h2 className="min-w-0 text-base sm:text-xl md:text-2xl font-bold text-slate-800 capitalize tracking-tight truncate flex items-center">
              {activeTab === 'audit' ? 'Audit Trail' : activeTab === 'users' ? 'Pengurusan Pengguna' : activeTab === 'ai' ? 'AI Predictive Engine' : activeTab === 'institutions' ? 'Institusi & Koperasi (Bangi)' : activeTab === 'suppliers' ? 'Penyelenggaraan Pembekal' : activeTab === 'assets' ? 'Emas & Asset Inventory' : activeTab === 'transactions' ? 'Pengurusan Surat Gadaian (SAG)' : 'Executive Dashboard'}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-4">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <div
              ref={notificationMenuRef}
              className="relative"
              onMouseEnter={() => setIsNotificationListOpen(true)}
              onMouseLeave={() => setIsNotificationListOpen(false)}
              onFocusCapture={() => setIsNotificationListOpen(true)}
              onBlurCapture={event => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setIsNotificationListOpen(false);
                }
              }}
            >
              <button
                type="button"
                onClick={handleNotificationToggle}
                aria-label={notificationsEnabled ? 'Matikan notifikasi tarikh tebus' : 'Aktifkan notifikasi tarikh tebus'}
                aria-pressed={notificationsEnabled}
                aria-haspopup="true"
                aria-expanded={isNotificationListOpen}
                title={notificationsEnabled ? 'Notifikasi aktif · hover untuk senarai' : 'Notifikasi tidak aktif · hover untuk senarai'}
                className={`relative rounded-lg border p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corporate-teal-500 ${
                  notificationsEnabled
                    ? 'border-corporate-teal-200 bg-corporate-teal-50 text-corporate-teal-700 hover:bg-corporate-teal-100'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
                {systemIndicators.length > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white">
                    {systemIndicators.length > 9 ? '9+' : systemIndicators.length}
                  </span>
                )}
              </button>
              {isNotificationListOpen && (
                <section
                  aria-label="Senarai notifikasi sistem"
                  className="absolute right-0 top-full z-[80] mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Notifikasi sistem</h3>
                      <p className="text-xs text-slate-500">{systemIndicators.length} perkara memerlukan perhatian</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleNotificationToggle}
                      aria-label={notificationsEnabled ? 'Matikan notifikasi sistem' : 'Aktifkan notifikasi sistem'}
                      aria-pressed={notificationsEnabled}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        notificationsEnabled
                          ? 'bg-corporate-teal-100 text-corporate-teal-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {notificationsEnabled ? 'Aktif' : 'Aktifkan'}
                    </button>
                  </div>
                  <div className="max-h-[min(65vh,28rem)] overflow-y-auto p-2">
                    {systemIndicators.length === 0 ? (
                      <p className="px-3 py-6 text-center text-sm text-slate-500">Tiada notifikasi buat masa ini.</p>
                    ) : (
                      <ul className="space-y-1">
                        {systemIndicators.map(indicator => (
                          <li key={indicator.id} className="rounded-lg px-3 py-2.5 hover:bg-slate-50">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-800">{indicator.title}</p>
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                {indicator.badge}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600">{indicator.desc}</p>
                            <p className="mt-1 text-[11px] font-medium text-slate-500">Rujukan: {indicator.ticket}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">Senarai ditutup automatik apabila kursor keluar.</p>
                </section>
              )}
            </div>
            {!isAppInstalled && (
              <>
                <button
                  type="button"
                  onClick={handleInstallButtonClick}
                  aria-label={canInstall ? 'Pasang aplikasi' : 'Panduan pemasangan aplikasi'}
                  title={canInstall ? 'Pasang aplikasi' : 'Panduan pemasangan aplikasi'}
                  className="group relative hidden sm:inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corporate-teal-500"
                >
                  <Download size={16} />
                  <span role="tooltip" className="pointer-events-none absolute right-0 top-full z-[90] mt-2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    {canInstall ? 'Pasang aplikasi' : 'Panduan pemasangan aplikasi'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleInstallButtonClick}
                  aria-label={canInstall ? 'Pasang aplikasi' : 'Panduan pemasangan aplikasi'}
                  title={canInstall ? 'Pasang aplikasi' : 'Panduan pemasangan aplikasi'}
                  className="sm:hidden p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200"
                >
                  <Download size={20} />
                </button>
              </>
            )}

            <div className="text-right mr-2 md:mr-4 hidden md:block border-l border-slate-200 pl-4">
              <p className="text-sm font-semibold text-slate-800">{user.user_metadata?.full_name || user.user_metadata?.name || 'Nama Paparan'}</p>
              <p className="text-xs text-slate-500">Disimpan per akaun</p>
            </div>
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              title="Pengurusan profil"
              aria-label="Buka pengurusan profil"
              className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border-2 border-emerald-500 shrink-0 hover:ring-2 hover:ring-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {String(user.user_metadata?.full_name || user.user_metadata?.name || '')
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(part => part[0])
                .join('')
                .toUpperCase() || (user.email || 'AR').slice(0, 2).toUpperCase()}
            </button>
            <button onClick={onSignOut} title="Log keluar" aria-label="Log keluar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 sm:px-4 md:px-8 py-2 text-xs ${syncError || authError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`} role={syncError || authError ? 'alert' : 'status'}>
          <span className="min-w-0 break-words">
            {syncError ? `Supabase: ${syncError}` : authError ? `Pengesahan: ${authError}` : `Supabase: ${syncStatus === 'saving' ? 'Menyimpan perubahan...' : 'Semua perubahan disimpan'}`}
            <span className="ml-2 text-slate-500">{isRealtimeConnected ? '· Realtime aktif' : '· Realtime menyambung'}</span>
          </span>
          {syncError && (
            <button onClick={() => { setSyncError(''); setSaveRetry(value => value + 1); }} className="shrink-0 font-bold underline">
              Cuba simpan semula
            </button>
          )}
        </div>
        {canInstall && !isAppInstalled && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-emerald-800 px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="font-bold">Ar-Rahnu boleh dipasang pada peranti ini</p>
              <p className="text-sm text-emerald-100">Pasang untuk akses pantas dari skrin utama.</p>
            </div>
            <button onClick={handleInstallButtonClick} className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-bold text-emerald-900 hover:bg-emerald-50">
              Pasang sekarang
            </button>
          </div>
        )}

        {/* SCROLLABLE CONTENT AREA */}
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-8 relative custom-scrollbar">

          {activeTab === 'audit' && canManageOrganizationUsers && (
            <section className="mx-auto max-w-7xl space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  aria-pressed={auditView === 'trail'}
                  onClick={() => setAuditView('trail')}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${auditView === 'trail' ? 'bg-corporate-teal-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Audit Trail
                </button>
                <button
                  type="button"
                  aria-pressed={auditView === 'traffic'}
                  onClick={() => setAuditView('traffic')}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${auditView === 'traffic' ? 'bg-corporate-teal-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Traffic Inspector
                </button>
              </div>
              {auditView === 'trail' && <>
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                      <FileSearch size={20} className="text-corporate-teal-600" />
                      Audit Trail · {organizationMembership.organization?.name || 'Organisasi'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Rekod kronologi perubahan portfolio dan pengurusan organisasi, termasuk metadata permintaan serta snapshot sebelum/selepas.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void refreshAuditEvents()}
                      disabled={auditLoading}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {auditLoading ? 'Memproses...' : 'Muat semula'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void verifyAuditChain()}
                      disabled={auditLoading}
                      className="inline-flex items-center gap-2 rounded-lg bg-corporate-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-corporate-teal-800 disabled:opacity-50"
                    >
                      <ShieldCheck size={16} /> Sahkan rantaian
                    </button>
                    <button
                      type="button"
                      onClick={() => void exportAuditChain()}
                      disabled={auditLoading}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <DownloadCloud size={16} /> Eksport JSON
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-bold">Hash chain aktif; WORM dan RFC 3161 belum dikonfigurasi.</p>
                <p className="mt-1">
                  Peristiwa menggunakan jam UTC pangkalan data Supabase dan SHA-256 berantai. Pemilik projek pangkalan data masih boleh memadam atau membina semula rekod; pengesahan ini mengesan kerosakan rantai tetapi bukan bukti WORM atau cap masa bebas. Eksport perlu disimpan di arkib Object Lock yang dikawal berasingan untuk perlindungan tersebut.
                </p>
                <p className="mt-1">
                  Peristiwa log masuk/log keluar berautoriti kekal dalam Auth Audit Logs Supabase dan belum digabungkan ke rantaian ini. Alamat IP dan User-Agent bergantung pada header proksi; Device ID mungkin tiada.
                </p>
                <p className="mt-1">Sejarah tidak diisi semula: rantaian bermula apabila migrasi dipasang dan hanya merekod perubahan selepas itu.</p>
              </div>

              {auditError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{auditError}</p>}
              {auditVerification && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{auditVerification}</p>}

              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h4 className="font-bold text-slate-800">Peristiwa terkini</h4>
                    <p className="text-xs text-slate-500">Paparan terhad kepada 100 peristiwa terakhir. Pengesahan dan eksport merangkumi seluruh rantaian.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{auditEvents.length} peristiwa</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Waktu Malaysia / Seq</th>
                        <th className="px-4 py-3">Siapa</th>
                        <th className="px-4 py-3">Perubahan</th>
                        <th className="px-4 py-3">Source IP</th>
                        <th className="px-4 py-3">Rujukan rekod</th>
                        <th className="px-4 py-3">SHA-256</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditEvents.map(event => {
                        const payload = event.event_payload;
                        const actor = organizationUsers.find(member => member.id === payload.actor_user_id);
                        const actorName = actor?.email ||
                          (payload.actor_user_id === user.id ? user.email : null) ||
                          (payload.actor_user_id ? 'Ahli organisasi' : 'Sistem');
                        const actionLabel = auditActionLabels[payload.action.toUpperCase()] || 'Perubahan direkodkan';
                        const moduleLabel = auditModuleLabels[payload.source_module] || 'Sistem';
                        const resourceLabel = auditResourceLabels[payload.resource_type] || 'Rekod berkaitan';
                        return (
                          <tr key={event.event_id} className="align-top hover:bg-slate-50">
                            <td className="whitespace-nowrap px-4 py-3">
                              <p className="font-medium text-slate-800">
                                <time dateTime={payload.occurred_at_utc} title={`UTC asal: ${payload.occurred_at_utc}`}>
                                  {formatMalaysiaDateTime(payload.occurred_at_utc)}
                                </time>
                              </p>
                              <p className="text-xs text-slate-500">#{event.sequence_no}</p>
                            </td>
                            <td className="max-w-48 truncate px-4 py-3 text-sm text-slate-700" title={String(payload.actor_user_id || 'Tiada akaun pengguna dikaitkan')}>
                              <p className="truncate font-medium">{actorName}</p>
                              {actor?.role && <p className="text-xs text-slate-500">{({ Admin: 'Pentadbir', Manager: 'Pengurus', Staff: 'Kakitangan' })[actor.role] || actor.role}</p>}
                            </td>
                            <td className="px-4 py-3" title={`ID rekod berkaitan: ${payload.resource_id}`}>
                              <p className="font-bold text-slate-800">{actionLabel}</p>
                              <p className="text-xs text-slate-500">{moduleLabel} · {resourceLabel}</p>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-600">{String(payload.source_ip || '—')}</td>
                            <td className="px-4 py-3">
                              <button type="button" onClick={() => setSelectedAuditEvent(event)} className="text-sm font-semibold text-corporate-teal-700 underline decoration-dotted underline-offset-2" title={`ID teknikal: ${event.event_id}`}>
                                Rekod #{event.sequence_no}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <button type="button" onClick={() => setSelectedAuditEvent(event)} className="font-mono text-xs text-slate-600" title={event.event_hash}>
                                {event.event_hash.slice(0, 16)}…
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {!auditLoading && auditEvents.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Belum ada peristiwa audit. Perubahan berikutnya pada pangkalan data akan direkodkan.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedAuditEvent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="audit-event-title">
                  <section className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-5">
                      <div className="min-w-0">
                        <h3 id="audit-event-title" className="font-bold text-slate-800">Butiran peristiwa #{selectedAuditEvent.sequence_no}</h3>
                        <p className="truncate font-mono text-xs text-slate-500">{selectedAuditEvent.event_id}</p>
                      </div>
                      <button type="button" onClick={() => setSelectedAuditEvent(null)} aria-label="Tutup butiran audit" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
                    </div>
                    <div className="overflow-auto p-4 sm:p-5">
                      <p className="mb-2 text-sm font-bold text-slate-700">Payload sebelum / selepas, metadata dan hash chain</p>
                      <pre className="overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-relaxed text-emerald-100">{JSON.stringify({
                        event: selectedAuditEvent.event_payload,
                        previous_hash: selectedAuditEvent.previous_hash,
                        event_hash: selectedAuditEvent.event_hash
                      }, null, 2)}</pre>
                    </div>
                  </section>
                </div>
              )}
              </>}

              {auditView === 'traffic' && (
                <div className="space-y-4">
                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Traffic Inspector</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Browser-observed outbound Supabase HTTP requests · {organizationMembership.organization?.name || 'Organisasi'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="rounded-md border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800">HTTP</button>
                        <button type="button" disabled title="TCP connections are not visible to a browser application" className="cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400">TCP</button>
                        <button
                          type="button"
                          onClick={handleToggleTrafficCapture}
                          className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-semibold ${trafficPaused ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-700'}`}
                        >
                          {trafficPaused ? <Play size={13} /> : <Pause size={13} />}
                          {trafficPaused ? 'Resume capture' : 'Pause capture'}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                      <p className="font-semibold">Traffic history is kept for up to 7 days, then deleted.</p>
                      <p className="mt-0.5">Only Supabase HTTP calls made by signed-in app sessions are captured. Authentication endpoints and their bodies are excluded; common credentials, email and phone fields are redacted. Remaining JSON bodies can include financial portfolio data. Client IP is a best-effort proxy header, not verified attribution. No TCP, incoming static-asset requests, or external price-service calls are visible here.</p>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <label className="sr-only" htmlFor="traffic-inspector-filter">Filter HTTP requests</label>
                      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-300 px-3 py-2">
                        <Search size={16} className="shrink-0 text-slate-400" />
                        <input
                          id="traffic-inspector-filter"
                          type="search"
                          value={trafficSearch}
                          onChange={event => setTrafficSearch(event.target.value)}
                          placeholder="Filter requests, e.g. status:500 method:POST"
                          className="min-w-0 flex-1 text-sm outline-none"
                        />
                      </div>
                      <button type="button" onClick={() => void refreshTrafficEvents()} disabled={trafficLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                        {trafficLoading ? 'Loading…' : 'Refresh'}
                      </button>
                      <span className="self-center whitespace-nowrap text-xs text-slate-500">{filteredTrafficEvents.length}{trafficEvents.length === 1000 ? '+' : ''} results · latest 7 days</span>
                    </div>
                    {trafficError && <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{trafficError} Run <code>supabase/traffic-inspector.sql</code> in the Supabase SQL Editor if the inspector schema has not been installed.</p>}
                  </section>

                  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[980px] text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                          <tr>
                            <th className="px-3 py-3 font-semibold">Waktu Malaysia (MYT)</th>
                            <th className="px-3 py-3 font-semibold">Client IP</th>
                            <th className="px-3 py-3 font-semibold">Method</th>
                            <th className="px-3 py-3 font-semibold">Path</th>
                            <th className="px-3 py-3 font-semibold">Status</th>
                            <th className="px-3 py-3 font-semibold">Duration</th>
                            <th className="px-3 py-3 font-semibold">Host</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-slate-600">
                          {visibleTrafficEvents.map(event => (
                            <tr key={event.event_id} onClick={() => setSelectedTrafficEvent(event)} className="cursor-pointer hover:bg-sky-50">
                              <td className="whitespace-nowrap px-3 py-2.5">
                                <time dateTime={event.captured_at} title={`UTC asal: ${event.captured_at}`}>
                                  {formatMalaysiaDateTime(event.captured_at)}
                                </time>
                              </td>
                              <td className="max-w-40 truncate px-3 py-2.5" title={event.client_ip || 'Unavailable'}>{event.client_ip || '—'}</td>
                              <td className="px-3 py-2.5">{event.method}</td>
                              <td className="max-w-64 truncate px-3 py-2.5" title={event.request_path}>{event.request_path}</td>
                              <td className="px-3 py-2.5">
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  event.status >= 500 ? 'bg-red-100 text-red-800' :
                                  event.status >= 400 ? 'bg-amber-100 text-amber-800' :
                                  event.status >= 300 ? 'bg-indigo-100 text-indigo-800' :
                                  event.status >= 200 ? 'bg-emerald-100 text-emerald-800' :
                                  'bg-slate-100 text-slate-600'
                                }`}>{event.status || 'N/A'}</span>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5">{event.duration_ms}ms</td>
                              <td className="max-w-48 truncate px-3 py-2.5" title={event.host}>{event.host}</td>
                            </tr>
                          ))}
                          {!trafficLoading && visibleTrafficEvents.length === 0 && (
                            <tr><td colSpan={7} className="px-3 py-10 text-center font-sans text-slate-500">{trafficError ? 'Traffic events could not be loaded.' : trafficPaused ? 'Capture is paused on this browser.' : trafficSearch ? 'No requests match this filter.' : 'No captured requests yet. Save app data; Traffic Inspector polling is excluded.'}</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-col gap-3 border-t border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-end">
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <span>Rows per page</span>
                        <select value={trafficPageSize} onChange={event => setTrafficPageSize(Number(event.target.value))} className="rounded-md border border-slate-300 bg-white px-2 py-1">
                          {[20, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                      </label>
                      <span className="text-xs text-slate-500">{filteredTrafficEvents.length === 0 ? 0 : trafficPage * trafficPageSize + 1}–{Math.min((trafficPage + 1) * trafficPageSize, filteredTrafficEvents.length)} of {filteredTrafficEvents.length}</span>
                      <div className="flex gap-1">
                        <button type="button" disabled={trafficPage === 0} onClick={() => setTrafficPage(page => Math.max(0, page - 1))} aria-label="Previous page" className="rounded-md border border-slate-300 p-1.5 text-slate-600 disabled:opacity-40"><ChevronLeft size={16} /></button>
                        <button type="button" disabled={trafficPage >= trafficPageCount - 1} onClick={() => setTrafficPage(page => Math.min(trafficPageCount - 1, page + 1))} aria-label="Next page" className="rounded-md border border-slate-300 p-1.5 text-slate-600 disabled:opacity-40"><ChevronRight size={16} /></button>
                      </div>
                    </div>
                  </section>

                  {selectedTrafficEvent && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="traffic-event-title">
                      <section className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-5">
                          <div>
                            <h3 id="traffic-event-title" className="font-bold text-slate-800">{selectedTrafficEvent.method} {selectedTrafficEvent.request_path} · {selectedTrafficEvent.status || 'N/A'}</h3>
                            <p className="mt-1 text-xs text-slate-500">
                              <time dateTime={selectedTrafficEvent.captured_at} title={`UTC asal: ${selectedTrafficEvent.captured_at}`}>
                                {formatMalaysiaDateTime(selectedTrafficEvent.captured_at)}
                              </time>
                              {' · '}{selectedTrafficEvent.duration_ms}ms · {selectedTrafficEvent.host}
                            </p>
                          </div>
                          <button type="button" onClick={() => setSelectedTrafficEvent(null)} aria-label="Close request details" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
                        </div>
                        <div className="grid gap-4 overflow-auto p-4 sm:grid-cols-2 sm:p-5">
                          <div><h4 className="mb-2 text-sm font-bold text-slate-700">Request body (redacted)</h4><pre className="max-h-96 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-emerald-100">{JSON.stringify(selectedTrafficEvent.request_payload, null, 2) || 'No body captured'}</pre></div>
                          <div><h4 className="mb-2 text-sm font-bold text-slate-700">Response body (redacted)</h4><pre className="max-h-96 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-emerald-100">{JSON.stringify(selectedTrafficEvent.response_payload, null, 2) || 'No body captured'}</pre></div>
                          <dl className="space-y-2 text-xs sm:col-span-2">
                            <div><dt className="inline font-bold">Actor: </dt><dd className="inline font-mono">{selectedTrafficEvent.actor_user_id || 'Unknown'}</dd></div>
                            <div><dt className="inline font-bold">Session: </dt><dd className="inline font-mono">{selectedTrafficEvent.session_id || 'Unavailable'}</dd></div>
                            <div><dt className="inline font-bold">Client IP (proxy-observed): </dt><dd className="inline font-mono">{selectedTrafficEvent.client_ip || 'Unavailable'}</dd></div>
                            <div><dt className="inline font-bold">User-Agent: </dt><dd className="inline break-all font-mono">{selectedTrafficEvent.user_agent || 'Unavailable'}</dd></div>
                          </dl>
                        </div>
                      </section>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {activeTab === 'users' && canManageOrganizationUsers && (() => {
            const filteredUsers = organizationUsers.filter(member => {
              const matchesSearch = !userSearchTerm.trim() ||
                (member.email || '').toLowerCase().includes(userSearchTerm.toLowerCase().trim());
              const matchesRole = userRoleFilter === 'ALL' || member.role === userRoleFilter;
              const matchesStatus = userStatusFilter === 'ALL' ||
                (userStatusFilter === 'active' && member.active) ||
                (userStatusFilter === 'suspended' && !member.active) ||
                (userStatusFilter === 'pending' && !member.emailConfirmedAt);
              return matchesSearch && matchesRole && matchesStatus;
            }).sort((a, b) => {
              if (userSortBy === 'email') return (a.email || '').localeCompare(b.email || '');
              if (userSortBy === 'newest') return (b.createdAt || '').localeCompare(a.createdAt || '');
              if (userSortBy === 'last_signin') return (b.lastSignInAt || '').localeCompare(a.lastSignInAt || '');
              return 0;
            });

            const userPageSize = 5;
            const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / userPageSize));
            const paginatedUsers = filteredUsers.slice((userPage - 1) * userPageSize, userPage * userPageSize);

            const adminCount = organizationUsers.filter(u => u.role === 'Admin').length;
            const managerCount = organizationUsers.filter(u => u.role === 'Manager').length;
            const staffCount = organizationUsers.filter(u => u.role === 'Staff').length;
            const activeCount = organizationUsers.filter(u => u.active).length;

            return (
              <section className="mx-auto max-w-7xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Modern Enterprise Admin Command Banner */}
                <div className="relative overflow-hidden rounded-3xl border border-corporate-teal-800/40 bg-gradient-to-br from-slate-900 via-corporate-green-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
                  <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-corporate-teal-400/10 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-corporate-magenta-500/10 blur-3xl" />

                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-corporate-teal-500/30 bg-corporate-teal-950/80 px-3.5 py-1 text-xs font-bold text-corporate-teal-200 backdrop-blur-md mb-2">
                        <ShieldCheck size={14} className="text-emerald-400" />
                        <span>ENTERPRISE ACCESS GOVERNANCE · ADMIN PANEL</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
                        <Users className="text-corporate-teal-300" size={28} />
                        Pengurusan Pengguna &amp; Kawalan Akses
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                        {organizationMembership.organization?.name || 'Organisasi'} · {organizationUsers.length} Jumlah Ahli Berdaftar. Kawal selia peranan, status akaun, dan audit keselamatan organisasi anda.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-bold text-corporate-magenta-200 backdrop-blur-md">
                        <Shield size={14} />
                        <span>Akses: {organizationMembership.role}</span>
                      </span>

                      {isOrganizationAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => { setInviteModalMode('single'); setIsInviteModalOpen(true); }}
                            className="inline-flex items-center gap-2 rounded-xl border border-corporate-teal-400/50 bg-corporate-teal-600 hover:bg-corporate-teal-500 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-lg shadow-corporate-teal-950/40 backdrop-blur-md transition-all active:scale-95"
                          >
                            <UserPlus size={16} />
                            <span>Jemput / Tambah Pengguna</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setInviteModalMode('bulk'); setIsInviteModalOpen(true); }}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white backdrop-blur-md transition-all active:scale-95"
                          >
                            <UploadCloud size={15} />
                            <span>Import CSV</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => void refreshOrganizationUsers()}
                        disabled={userManagementBusy}
                        className="inline-flex items-center justify-center p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/15 text-slate-200 backdrop-blur-md transition-all disabled:opacity-50"
                        title="Segar semula senarai pengguna"
                      >
                        <RefreshCw size={16} className={userManagementBusy ? "animate-spin" : ""} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4 Telemetry Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Jumlah Pengguna</span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-corporate-teal-50 text-corporate-teal-700">
                        <Users size={20} />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {organizationUsers.length} <span className="text-sm font-semibold text-slate-500">ahli</span>
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Berdaftar dalam pangkalan data organisasi
                    </p>
                  </div>

                  <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Akaun Aktif</span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                        <UserCheck size={20} />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                      {activeCount} <span className="text-sm font-semibold text-slate-500">/ {organizationUsers.length}</span>
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      <span>{organizationUsers.length > 0 ? Math.round((activeCount / organizationUsers.length) * 100) : 0}% mempunyai akses aktif</span>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Status Pengesahan</span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                        <Mail size={20} />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {organizationUsers.filter(u => u.emailConfirmedAt).length} <span className="text-sm font-semibold text-slate-500">disahkan</span>
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {organizationUsers.filter(u => !u.emailConfirmedAt).length} menunggu pengesahan jemputan
                    </p>
                  </div>

                  <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Agihan Peranan</span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-corporate-magenta-50 text-corporate-magenta-700">
                        <ShieldCheck size={20} />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                      <span className="rounded-lg bg-corporate-magenta-50 px-2 py-1 text-xs font-bold text-corporate-magenta-800 border border-corporate-magenta-100">
                        {adminCount} Admin
                      </span>
                      <span className="rounded-lg bg-corporate-teal-50 px-2 py-1 text-xs font-bold text-corporate-teal-800 border border-corporate-teal-100">
                        {managerCount} Manager
                      </span>
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 border border-slate-200">
                        {staffCount} Staff
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      Hierarki kuasa dan polisi Supabase RLS
                    </p>
                  </div>
                </div>

                {/* Status Messages */}
                {userManagementError && (
                  <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                      <span>{userManagementError}</span>
                    </div>
                    <button type="button" onClick={() => setUserManagementError('')} className="text-rose-600 hover:text-rose-900"><X size={16} /></button>
                  </div>
                )}
                {userManagementNotice && (
                  <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      <span>{userManagementNotice}</span>
                    </div>
                    <button type="button" onClick={() => setUserManagementNotice('')} className="text-emerald-600 hover:text-emerald-900"><X size={16} /></button>
                  </div>
                )}

                {/* Sub-Tabs Navigation (Pills) */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                  <button
                    type="button"
                    onClick={() => { setUserMgmtSubTab('members'); setUserPage(1); }}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-extrabold transition-all ${
                      userMgmtSubTab === 'members'
                        ? 'bg-corporate-teal-600 text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Users size={16} />
                    <span>Ahli &amp; Roster ({filteredUsers.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserMgmtSubTab('matrix')}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-extrabold transition-all ${
                      userMgmtSubTab === 'matrix'
                        ? 'bg-corporate-teal-600 text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Shield size={16} />
                    <span>Matriks Peranan &amp; Kebenaran</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserMgmtSubTab('activity')}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-extrabold transition-all ${
                      userMgmtSubTab === 'activity'
                        ? 'bg-corporate-teal-600 text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Activity size={16} />
                    <span>Aliran Aktiviti &amp; Audit ({securityLogs.length})</span>
                  </button>
                </div>

                {/* SUB-TAB 1: MEMBERS TABLE & ROSTER */}
                {userMgmtSubTab === 'members' && (
                  <div className="space-y-4">
                    {/* Filter & Search Bar */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex flex-1 flex-col sm:flex-row items-center gap-2.5">
                        <div className="relative w-full sm:w-72">
                          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={userSearchTerm}
                            onChange={e => { setUserSearchTerm(e.target.value); setUserPage(1); }}
                            placeholder="Cari e-mel atau ID pengguna..."
                            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none focus:border-corporate-teal-500 focus:ring-2 focus:ring-corporate-teal-500/20"
                          />
                          {userSearchTerm && (
                            <button
                              type="button"
                              onClick={() => { setUserSearchTerm(''); setUserPage(1); }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        <select
                          value={userRoleFilter}
                          onChange={e => { setUserRoleFilter(e.target.value); setUserPage(1); }}
                          aria-label="Tapis mengikut peranan"
                          className="w-full sm:w-auto px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:border-corporate-teal-500 bg-white text-slate-700"
                        >
                          <option value="ALL">Semua Peranan</option>
                          <option value="Admin">Admin Sahaja</option>
                          <option value="Manager">Manager Sahaja</option>
                          <option value="Staff">Staff Sahaja</option>
                        </select>

                        <select
                          value={userStatusFilter}
                          onChange={e => { setUserStatusFilter(e.target.value); setUserPage(1); }}
                          aria-label="Tapis mengikut status"
                          className="w-full sm:w-auto px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:border-corporate-teal-500 bg-white text-slate-700"
                        >
                          <option value="ALL">Semua Status</option>
                          <option value="active">Akaun Aktif</option>
                          <option value="suspended">Digantung</option>
                          <option value="pending">Menunggu Pengesahan</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-xs text-slate-500 font-medium">Susun:</span>
                        <select
                          value={userSortBy}
                          onChange={e => setUserSortBy(e.target.value as any)}
                          aria-label="Susun senarai pengguna"
                          className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:border-corporate-teal-500 bg-white text-slate-700"
                        >
                          <option value="email">E-mel (A-Z)</option>
                          <option value="newest">Terbaharu Ditambah</option>
                          <option value="last_signin">Log Masuk Terakhir</option>
                        </select>
                      </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                              <th className="p-4 sm:px-6">Pengguna &amp; E-mel</th>
                              <th className="p-4">Peranan</th>
                              <th className="p-4">Status Akses</th>
                              <th className="p-4">Aktiviti Terakhir</th>
                              <th className="p-4 text-center">Tindakan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {paginatedUsers.map(member => {
                              const isCurrentUser = member.id === user.id;
                              const initials = (member.email || 'AR').slice(0, 2).toUpperCase();

                              return (
                                <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                                  {/* User & Email */}
                                  <td className="p-4 sm:px-6">
                                    <div className="flex items-center gap-3">
                                      <div className={`h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center font-black text-xs text-white shadow-sm ${
                                        member.role === 'Admin'
                                          ? 'bg-gradient-to-br from-corporate-magenta-600 to-corporate-magenta-800'
                                          : member.role === 'Manager'
                                            ? 'bg-gradient-to-br from-corporate-teal-600 to-corporate-teal-800'
                                            : 'bg-gradient-to-br from-slate-600 to-slate-800'
                                      }`}>
                                        {initials}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <p className="font-bold text-slate-800 text-sm truncate max-w-xs sm:max-w-sm">
                                            {member.email || 'E-mel tidak tersedia'}
                                          </p>
                                          {isCurrentUser && (
                                            <span className="rounded-full bg-corporate-teal-100 px-2 py-0.5 text-[10px] font-bold text-corporate-teal-800">
                                              Akaun Anda
                                            </span>
                                          )}
                                          {member.isOrganizationOwner && (
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                              Pemilik
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                          ID: {member.id.slice(0, 8)}...
                                        </p>
                                      </div>
                                    </div>

                                    {/* Inline Edit Form if selected */}
                                    {editingOrganizationUser?.id === member.id && (
                                      <form onSubmit={handleUpdateOrganizationUser} className="mt-3 rounded-2xl border border-corporate-teal-200 bg-corporate-teal-50/40 p-3.5 space-y-2.5 animate-in fade-in duration-200">
                                        <p className="font-bold text-corporate-teal-900 text-xs">Kemaskini Profil Pengguna</p>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                          <input
                                            type="email"
                                            required
                                            value={editingOrganizationUser.email}
                                            onChange={event => setEditingOrganizationUser({ ...editingOrganizationUser, email: event.target.value })}
                                            placeholder="E-mel baharu"
                                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-corporate-teal-500"
                                          />
                                          <input
                                            type="password"
                                            minLength={12}
                                            autoComplete="new-password"
                                            value={editingOrganizationUser.password}
                                            onChange={event => setEditingOrganizationUser({ ...editingOrganizationUser, password: event.target.value })}
                                            placeholder="Kata laluan baharu (min. 12)"
                                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-corporate-teal-500"
                                          />
                                          <input
                                            type="password"
                                            minLength={12}
                                            autoComplete="new-password"
                                            value={editingOrganizationUser.confirmPassword}
                                            onChange={event => setEditingOrganizationUser({ ...editingOrganizationUser, confirmPassword: event.target.value })}
                                            placeholder="Sahkan kata laluan"
                                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-corporate-teal-500"
                                          />
                                        </div>
                                        <div className="flex gap-2">
                                          <button type="submit" disabled={userManagementBusy} className="rounded-xl bg-corporate-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-corporate-teal-700 disabled:opacity-50">
                                            Simpan Perubahan
                                          </button>
                                          <button type="button" disabled={userManagementBusy} onClick={() => setEditingOrganizationUser(null)} className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                                            Batal
                                          </button>
                                        </div>
                                      </form>
                                    )}
                                  </td>

                                  {/* Role */}
                                  <td className="p-4">
                                    {isOrganizationAdmin && !isCurrentUser ? (
                                      <select
                                        value={member.role}
                                        aria-label={`Peranan ${member.email}`}
                                        disabled={userManagementBusy}
                                        onChange={event => void runUserAdminAction({ action: 'update-role', userId: member.id, role: event.target.value }, `Peranan ${member.email} dikemas kini kepada ${event.target.value}.`)}
                                        className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold outline-none cursor-pointer transition-all ${
                                          member.role === 'Admin'
                                            ? 'border-corporate-magenta-300 bg-corporate-magenta-50 text-corporate-magenta-800'
                                            : member.role === 'Manager'
                                              ? 'border-corporate-teal-300 bg-corporate-teal-50 text-corporate-teal-800'
                                              : 'border-slate-300 bg-slate-50 text-slate-700'
                                        }`}
                                      >
                                        <option value="Staff">Staff</option>
                                        <option value="Manager">Manager</option>
                                        <option value="Admin">Admin</option>
                                      </select>
                                    ) : (
                                      <span className={`inline-flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-bold border ${
                                        member.role === 'Admin'
                                          ? 'border-corporate-magenta-200 bg-corporate-magenta-50 text-corporate-magenta-800'
                                          : member.role === 'Manager'
                                            ? 'border-corporate-teal-200 bg-corporate-teal-50 text-corporate-teal-800'
                                            : 'border-slate-200 bg-slate-100 text-slate-700'
                                      }`}>
                                        <Shield size={12} />
                                        <span>{member.role}</span>
                                      </span>
                                    )}
                                  </td>

                                  {/* Access Status */}
                                  <td className="p-4">
                                    {member.active ? (
                                      member.emailConfirmedAt ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-800">
                                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                          <span>Aktif</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-bold text-amber-800">
                                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                          <span>Menunggu Pengesahan</span>
                                        </span>
                                      )
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-[11px] font-bold text-rose-800">
                                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                        <span>Akses Digantung</span>
                                      </span>
                                    )}
                                  </td>

                                  {/* Last Activity */}
                                  <td className="p-4 text-slate-500">
                                    <p className="font-semibold text-slate-700">
                                      {member.lastSignInAt ? new Date(member.lastSignInAt).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Belum log masuk'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                      {member.emailConfirmedAt ? 'E-mel disahkan' : 'Pautan belum dituntut'}
                                    </p>
                                  </td>

                                  {/* Actions */}
                                  <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      {isOrganizationAdmin && !isCurrentUser && (
                                        <button
                                          type="button"
                                          disabled={userManagementBusy}
                                          onClick={() => setEditingOrganizationUser(
                                            editingOrganizationUser?.id === member.id
                                              ? null
                                              : { id: member.id, email: member.email, password: '', confirmPassword: '' }
                                          )}
                                          title="Edit e-mel atau tukar kata laluan"
                                          className="p-2 rounded-xl text-slate-400 hover:text-corporate-teal-600 hover:bg-corporate-teal-50 transition-colors"
                                        >
                                          <Pencil size={15} />
                                        </button>
                                      )}

                                      {isOrganizationAdmin && !isCurrentUser && (
                                        <button
                                          type="button"
                                          disabled={userManagementBusy}
                                          onClick={() => void runUserAdminAction(
                                            { action: 'update-access', userId: member.id, active: !member.active },
                                            `${member.email} ${member.active ? 'digantung' : 'diaktifkan semula'}.`
                                          )}
                                          title={member.active ? 'Gantung akses pengguna' : 'Aktifkan semula akses pengguna'}
                                          className={`p-2 rounded-xl transition-colors ${
                                            member.active
                                              ? 'text-slate-400 hover:text-corporate-magenta-600 hover:bg-corporate-magenta-50'
                                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                          }`}
                                        >
                                          {member.active ? <UserX size={15} /> : <UserCheck size={15} />}
                                        </button>
                                      )}

                                      {isOrganizationAdmin && (
                                        <button
                                          type="button"
                                          disabled={userManagementBusy}
                                          onClick={() => void runUserAdminAction({ action: 'reset-password', userId: member.id }, `Pautan tetapan semula kata laluan dihantar kepada ${member.email}.`)}
                                          title="Hantar pautan tetapan semula kata laluan"
                                          className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                        >
                                          <KeyRound size={15} />
                                        </button>
                                      )}

                                      {!isCurrentUser && (isOrganizationAdmin || member.role !== 'Admin') && (
                                        <button
                                          type="button"
                                          disabled={userManagementBusy || (member.isOrganizationOwner && !isOrganizationAdmin)}
                                          onClick={() => handleDeleteOrganizationUser(member)}
                                          title="Padam akaun pengguna secara kekal"
                                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                        >
                                          <Trash2 size={15} />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}

                            {paginatedUsers.length === 0 && (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400">
                                  {organizationUsers.length === 0 ? 'Memuatkan ahli organisasi...' : 'Tiada pengguna sepadan dengan tapisan carian anda.'}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500">
                        <span>
                          Menunjukkan {filteredUsers.length === 0 ? 0 : (userPage - 1) * userPageSize + 1} hingga {Math.min(userPage * userPageSize, filteredUsers.length)} daripada {filteredUsers.length} pengguna
                        </span>
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <button
                            type="button"
                            disabled={userPage <= 1}
                            onClick={() => setUserPage(p => Math.max(1, p - 1))}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40"
                          >
                            Sebelumnya
                          </button>
                          <span className="font-bold text-slate-800 px-2">
                            {userPage} / {totalUserPages}
                          </span>
                          <button
                            type="button"
                            disabled={userPage >= totalUserPages}
                            onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40"
                          >
                            Seterusnya
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 2: ROLE & PERMISSION MATRIX */}
                {userMgmtSubTab === 'matrix' && (
                  <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <Lock size={18} className="text-corporate-teal-600" />
                          Matriks Kebenaran &amp; Peranan (Permission Matrix)
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Kawal selia kebenaran akses granular bagi setiap peranan organisasi. Perubahan disimpan terus ke dalam database organisasi.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isSavingMatrix}
                          onClick={handleSaveRolePermissions}
                          className="inline-flex items-center gap-2 rounded-xl bg-corporate-teal-600 hover:bg-corporate-teal-700 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isSavingMatrix ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              <span>Menyimpan ke Database...</span>
                            </>
                          ) : (
                            <>
                              <Check size={14} />
                              <span>Simpan Matriks</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Auto-hide 5-second Success Message */}
                    {matrixSaveNotice && (
                      <div
                        role="status"
                        className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs sm:text-sm font-extrabold text-emerald-900 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-300"
                      >
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                          <span>{matrixSaveNotice}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMatrixSaveNotice('')}
                          className="text-emerald-700 hover:text-emerald-950 p-1 rounded-lg hover:bg-emerald-100 transition-colors"
                          title="Tutup pemberitahuan"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold">
                            <th className="p-3.5">Modul &amp; Fungsi Sistem</th>
                            <th className="p-3.5 text-center w-32">Staff</th>
                            <th className="p-3.5 text-center w-32">Manager</th>
                            <th className="p-3.5 text-center w-32">Admin</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[
                            { category: 'Pengurusan Surat Gadaian (SAG)' },
                            { id: 'sag_view', label: 'Lihat lejar dan status transaksi SAG', roles: ['Staff', 'Manager', 'Admin'] },
                            { id: 'sag_create', label: 'Daftar transaksi pajakan asal & tebus', roles: ['Staff', 'Manager', 'Admin'] },
                            { id: 'sag_overlap', label: 'Laksana transaksi Salin, OL & Pusing', roles: ['Manager', 'Admin'] },
                            { id: 'sag_delete', label: 'Padam rekod transaksi lejar secara kekal', roles: ['Admin'] },

                            { category: 'Aset & Inventori Emas Fizikal' },
                            { id: 'assets_view', label: 'Lihat inventori emas EDT & EDR', roles: ['Staff', 'Manager', 'Admin'] },
                            { id: 'assets_manage', label: 'Daftar, pautkan dan kemas kini aset emas', roles: ['Manager', 'Admin'] },
                            { id: 'assets_delete', label: 'Padam rekod aset emas daripada inventori', roles: ['Admin'] },

                            { category: 'Analitik & Kecerdasan Pasaran' },
                            { id: 'analytics_view', label: 'Akses Papan Pemuka Eksekutif & Ringkasan BI', roles: ['Staff', 'Manager', 'Admin'] },
                            { id: 'ai_predictions', label: 'Akses AI Predictive Engine & Makcik AI', roles: ['Manager', 'Admin'] },
                            { id: 'export_data', label: 'Eksport laporan CSV analitik & lejar', roles: ['Manager', 'Admin'] },

                            { category: 'Pentadbiran & Keselamatan' },
                            { id: 'users_manage', label: 'Tambah, gantung, edit & reset kata laluan pengguna', roles: ['Admin'] },
                            { id: 'roles_manage', label: 'Ubah suai peranan & kebenaran akses', roles: ['Admin'] },
                            { id: 'audit_inspect', label: 'Akses Audit Trail & HTTP Inspector', roles: ['Manager', 'Admin'] },
                          ].map((item, idx) => {
                            if ('category' in item) {
                              return (
                                <tr key={`cat-${idx}`} className="bg-slate-100/70 font-extrabold text-slate-800 text-[11px]">
                                  <td colSpan={4} className="p-2.5 px-3.5 tracking-wide text-corporate-teal-900">
                                    {item.category}
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <tr key={item.id} className="hover:bg-slate-50/50">
                                <td className="p-3.5 font-medium text-slate-700">
                                  {item.label}
                                </td>
                                {(['Staff', 'Manager', 'Admin'] as const).map(role => {
                                  const isChecked = rolePermissions[role]?.[item.id] ?? false;
                                  return (
                                    <td key={role} className="p-3.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        disabled={!isOrganizationAdmin || role === 'Admin'}
                                        onChange={() => {
                                          setRolePermissions(prev => ({
                                            ...prev,
                                            [role]: {
                                              ...prev[role],
                                              [item.id]: !isChecked
                                            }
                                          }));
                                        }}
                                        className="h-4 w-4 rounded border-slate-300 text-corporate-teal-600 focus:ring-corporate-teal-500 cursor-pointer disabled:opacity-60"
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 3: ACTIVITY & AUDIT STREAM */}
                {userMgmtSubTab === 'activity' && (
                  <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-4">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Activity size={18} className="text-corporate-magenta-600" />
                        Aliran Aktiviti &amp; Audit Keselamatan
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Log peristiwa keselamatan pengguna (pertukaran peranan, penggantungan akses, reset kata laluan, dan pendaftaran akaun).
                      </p>
                    </div>

                    <div className="space-y-3">
                      {securityLogs.map(log => (
                        <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-all">
                          <div className="flex items-start gap-3">
                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                              log.severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-corporate-teal-100 text-corporate-teal-700'
                            }`}>
                              <ShieldCheck size={16} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-800 text-xs">
                                  {log.action.replace(/_/g, ' ')}
                                </span>
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                  Sasaran: {log.target}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-0.5">{log.detail}</p>
                              <p className="text-[11px] text-slate-400 mt-1">Dilakukan oleh: {log.actor}</p>
                            </div>
                          </div>

                          <div className="sm:text-right shrink-0 text-[11px] text-slate-400 font-mono">
                            {new Date(log.timestamp).toLocaleString('ms-MY')}
                          </div>
                        </div>
                      ))}

                      {securityLogs.length === 0 && (
                        <p className="text-center p-8 text-xs text-slate-400">Tiada aktiviti keselamatan direkodkan setakat ini.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* USER CREATION / INVITE MODAL DIALOG */}
                {isInviteModalOpen && isOrganizationAdmin && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="min-w-0 bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90dvh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
                      {/* Modal Header */}
                      <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-corporate-teal-100 text-corporate-teal-700">
                            <UserPlus size={20} />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-800">
                              Jemput &amp; Tambah Pengguna
                            </h3>
                            <p className="text-xs text-slate-500">Pendaftaran akaun baharu dalam organisasi</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsInviteModalOpen(false)}
                          className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      {/* Modal Tab Switcher */}
                      <div className="p-5 sm:p-6 pb-0">
                        <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => setInviteModalMode('single')}
                            className={`py-2 rounded-xl transition-all ${
                              inviteModalMode === 'single'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Pengguna Tunggal
                          </button>
                          <button
                            type="button"
                            onClick={() => setInviteModalMode('bulk')}
                            className={`py-2 rounded-xl transition-all ${
                              inviteModalMode === 'bulk'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Pukal melalui CSV
                          </button>
                        </div>
                      </div>

                      <div className="p-5 sm:p-6">
                        {inviteModalMode === 'single' ? (
                          <form onSubmit={handleCreateOrganizationUser} className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                E-mel Pengguna
                              </label>
                              <input
                                type="email"
                                required
                                value={newUserEmail}
                                onChange={event => setNewUserEmail(event.target.value)}
                                placeholder="nama@organisasi.com"
                                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-corporate-teal-500 focus:ring-2 focus:ring-corporate-teal-500/20"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Peranan Awal
                              </label>
                              <select
                                value={newUserRole}
                                onChange={event => setNewUserRole(event.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm font-semibold outline-none focus:border-corporate-teal-500 focus:ring-2 focus:ring-corporate-teal-500/20 bg-white"
                              >
                                <option value="Staff">Staff (Portfolio Peribadi Sahaja)</option>
                                <option value="Manager">Manager (Akses Portfolio Organisasi)</option>
                                <option value="Admin">Admin (Akses Penuh &amp; Pengurusan Pengguna)</option>
                              </select>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Kata Laluan Awal (Min. 12)
                                </label>
                                <input
                                  type="password"
                                  required
                                  minLength={12}
                                  autoComplete="new-password"
                                  value={newUserPassword}
                                  onChange={event => setNewUserPassword(event.target.value)}
                                  placeholder="Kata laluan awal"
                                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-corporate-teal-500 focus:ring-2 focus:ring-corporate-teal-500/20"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Sahkan Kata Laluan
                                </label>
                                <input
                                  type="password"
                                  required
                                  minLength={12}
                                  autoComplete="new-password"
                                  value={confirmNewUserPassword}
                                  onChange={event => setConfirmNewUserPassword(event.target.value)}
                                  placeholder="Sahkan kata laluan"
                                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-corporate-teal-500 focus:ring-2 focus:ring-corporate-teal-500/20"
                                />
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              Pengguna boleh menukar kata laluan mereka pada bila-bila masa melalui pautan pengesahan atau pengurusan profil.
                            </p>

                            <div className="pt-3 flex gap-2 justify-end border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => setIsInviteModalOpen(false)}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                              >
                                Batal
                              </button>
                              <button
                                type="submit"
                                disabled={userManagementBusy}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-corporate-teal-600 text-white text-xs font-bold hover:bg-corporate-teal-700 disabled:opacity-50 shadow-md"
                              >
                                <Plus size={15} />
                                <span>{userManagementBusy ? 'Mencipta...' : 'Cipta Pengguna'}</span>
                              </button>
                            </div>
                          </form>
                        ) : (
                          /* Bulk CSV Import Tab */
                          <div className="space-y-4">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-2">
                              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                                <FileText size={15} className="text-corporate-teal-600" />
                                Format Fail CSV
                              </p>
                              <p>Format mestilah mengandungi tajuk lajur: <code>email,role,password</code></p>
                              <button
                                type="button"
                                onClick={handleDownloadCsvTemplate}
                                className="inline-flex items-center gap-1.5 text-corporate-teal-700 font-bold underline hover:text-corporate-teal-900"
                              >
                                <DownloadCloud size={14} />
                                <span>Muat turun templat CSV contoh</span>
                              </button>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Tampal Kandungan CSV di sini atau Muat Naik Fail
                              </label>
                              <textarea
                                rows={5}
                                value={bulkCsvText}
                                onChange={e => setBulkCsvText(e.target.value)}
                                placeholder="email,role,password&#10;staf1@contoh.com,Staff,PasswordAwal123!&#10;manager1@contoh.com,Manager,PasswordAwal123!"
                                className="w-full font-mono text-xs rounded-xl border border-slate-200 p-3 outline-none focus:border-corporate-teal-500 focus:ring-2 focus:ring-corporate-teal-500/20"
                              />
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900">
                                <UploadCloud size={15} />
                                <span>Pilih fail .csv</span>
                                <input
                                  type="file"
                                  accept=".csv"
                                  className="hidden"
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = ev => {
                                      setBulkCsvText(String(ev.target?.result || ''));
                                    };
                                    reader.readAsText(file);
                                  }}
                                />
                              </label>

                              {bulkImportStatus && (
                                <span className="text-xs font-bold text-corporate-teal-700 animate-pulse">
                                  {bulkImportStatus}
                                </span>
                              )}
                            </div>

                            <div className="pt-3 flex gap-2 justify-end border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => setIsInviteModalOpen(false)}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                disabled={userManagementBusy || !bulkCsvText.trim()}
                                onClick={() => void handleBulkCsvImport(bulkCsvText)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-corporate-teal-600 text-white text-xs font-bold hover:bg-corporate-teal-700 disabled:opacity-50 shadow-md"
                              >
                                <UploadCloud size={15} />
                                <span>Proses Import Pukal</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            );
          })()}

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (() => {
            const totalGoldGrams = edrBalance + edtBalance;
            const edtPercentage = totalGoldGrams > 0 ? Math.round((edtBalance / totalGoldGrams) * 100) : 50;
            const edrPercentage = 100 - edtPercentage;
            const topInstitution = institutionAnalysis.length
              ? [...institutionAnalysis].sort((a, b) => b.loan - a.loan)[0]
              : null;
            const monthTotalRedemption = maturityCalendar.entries.reduce((sum, tx) => sum + getCurrentRedemption(tx), 0);
            const latestCumulativeMarhun = cumulativeMarhunData.length
              ? cumulativeMarhunData[cumulativeMarhunData.length - 1].accumulatedValue
              : 0;

            return (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Executive Command Header */}
                <div className="relative overflow-hidden rounded-3xl border border-corporate-teal-800/40 bg-gradient-to-br from-slate-900 via-corporate-green-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
                  <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-corporate-teal-400/10 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-corporate-magenta-500/10 blur-3xl" />

                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-corporate-teal-500/30 bg-corporate-teal-950/80 px-3.5 py-1 text-xs font-bold text-corporate-teal-200 backdrop-blur-md mb-2">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                        </span>
                        <span>EXECUTIVE OVERVIEW · AR-RAHNU GAMEPLAY BI</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                        Papan Pemuka Eksekutif
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                        Pusat kawalan kecairan modal, rizab emas fizikal (EDT vs EDR), dan jadual matang surat gadaian dalam satu paparan berpusat.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-200 backdrop-blur-md">
                        <TrendingUp size={15} className="text-emerald-400" />
                        <span>Spot Emas:</span>
                        <span className="text-white font-black">RM {currentGoldPrice.toFixed(2)}/g</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl border border-corporate-teal-400/50 bg-corporate-teal-600 hover:bg-corporate-teal-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-corporate-teal-950/40 backdrop-blur-md transition-all active:scale-95"
                      >
                        <Plus size={16} />
                        <span>Rekod SAG Baharu</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportAnalyticsCSV}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md transition-all active:scale-95"
                      >
                        <DownloadCloud size={16} />
                        <span>Laporan CSV</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4 Interactive Hero KPI Telemetry Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Modal Pembiayaan */}
                  <div
                    onClick={() => setActiveTab('transactions')}
                    className="group relative cursor-pointer overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-corporate-teal-400 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Jumlah Pembiayaan (Loan)</span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-corporate-teal-50 text-corporate-teal-700 transition-colors group-hover:bg-corporate-teal-600 group-hover:text-white">
                        <Wallet size={20} />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {formatRM(totalCapital)}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-corporate-teal-50 px-2.5 py-0.5 font-bold text-corporate-teal-800">
                        {activeTickets} Surat Aktif
                      </span>
                      <span className="font-semibold text-corporate-teal-600 group-hover:underline flex items-center gap-0.5">
                        Lihat lejar <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Lebihan Tunai Direkod */}
                  <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-corporate-magenta-400 hover:shadow-md">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Lebihan Tunai Direkod</span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-corporate-magenta-50 text-corporate-magenta-700">
                        <TrendingUp size={20} />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
                      {formatRM(totalProfit)}
                    </p>
                    <div className="mt-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                        Penstrukturan Semula (Bukan Dividen)
                      </span>
                    </div>
                  </div>

                  {/* Card 3: EDR (Emas Ar-Rahnu) */}
                  <div
                    onClick={() => setActiveTab('assets')}
                    className="group relative cursor-pointer overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-sky-400 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Emas Ar-Rahnu (EDR)</span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 transition-colors group-hover:bg-sky-600 group-hover:text-white">
                        <Clock size={20} />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {edrBalance}g
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">
                        Nilai Marhun: ~<strong className="text-slate-700">{formatRM(edrBalance * currentGoldPrice)}</strong>
                      </span>
                      <span className="font-semibold text-sky-600 group-hover:underline flex items-center gap-0.5">
                        Aset <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>

                  {/* Card 4: EDT (Emas Di Tangan) & Safety Ratio */}
                  <div
                    onClick={() => setActiveTab('assets')}
                    className={`group relative cursor-pointer overflow-hidden rounded-3xl border p-5 shadow-sm transition-all hover:shadow-md ${
                      edtBalance < edrBalance
                        ? 'border-rose-200 bg-rose-50/20 hover:border-rose-400'
                        : 'border-slate-200/80 bg-white hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Emas Di Tangan (EDT)</span>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                        edtBalance < edrBalance ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        <Scale size={20} />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {edtBalance}g
                    </p>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-semibold text-slate-500">Nisbah Keselamatan</span>
                        <span className={`font-black ${edtBalance < edrBalance ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {edtBalance < edrBalance ? 'Kritikal (Tambah EDT)' : 'Ratio Selamat'}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            edtBalance < edrBalance ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(10, edtPercentage))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Smart Radar Tarikh Matang Banner */}
                {redemptionNotifications.length > 0 ? (
                  <div className="relative overflow-hidden rounded-3xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
                          <Bell size={20} className="animate-bounce" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-slate-900 text-base">
                              Tindakan Diperlukan: {redemptionNotifications.length} Surat Hampir / Lewat Matang
                            </h3>
                            <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">
                              Segera
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Surat gadaian ini memerlukan tindakan tebus, salin, atau overlap dalam masa 3 hari atau telah melepasi tarikh matang.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveTab('transactions')}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition-all active:scale-95"
                      >
                        <span>Buka Lejar &amp; Selesaikan</span>
                        <ChevronRight size={15} />
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {redemptionNotifications.slice(0, 3).map(tx => (
                        <div key={tx.id} className="flex items-center justify-between rounded-2xl bg-white/90 border border-amber-200/80 p-3 shadow-sm">
                          <div>
                            <p className="text-xs font-bold text-slate-800">Surat #{tx.refNo} · {tx.institution}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Tebus: {formatRM(getCurrentRedemption(tx))}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                            tx.daysRemaining < 0
                              ? 'bg-rose-100 text-rose-800'
                              : tx.daysRemaining === 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-orange-100 text-orange-800'
                          }`}>
                            {tx.daysRemaining < 0
                              ? `Lewat ${Math.abs(tx.daysRemaining)}h`
                              : tx.daysRemaining === 0 ? 'Hari Ini' : `Baki ${tx.daysRemaining}h`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/60 to-teal-50/60 px-5 py-3.5 flex items-center justify-between text-xs text-emerald-900">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                      <span className="font-semibold">Semua Tarikh Matang Terkawal · Tiada transaksi yang matang dalam masa 3 hari terdekat.</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="font-bold text-emerald-800 hover:text-emerald-950 underline shrink-0 hidden sm:inline"
                    >
                      Semak Lejar
                    </button>
                  </div>
                )}

                {/* Dual-Pane Interactive Executive Studio */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  {/* Left Column (8 cols): Interactive Performance Studio */}
                  <div className="xl:col-span-8 min-w-0 bg-white p-5 sm:p-7 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
                    <div>
                      {/* Studio Top Navigation Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                        <div>
                          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-corporate-teal-600 mb-1">
                            <BarChart3 size={14} />
                            <span>Visual Analitik Eksekutif</span>
                          </div>
                          <h3 className="text-lg sm:text-xl font-bold text-slate-800">
                            Analitik Prestasi Portfolio
                          </h3>
                        </div>

                        {/* Interactive Segmented Tabs */}
                        <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-slate-100 p-1.5 self-start sm:self-center">
                          <button
                            type="button"
                            onClick={() => setExecutiveChartTab('marhun')}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                              executiveChartTab === 'marhun'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Aliran Marhun
                          </button>
                          <button
                            type="button"
                            onClick={() => setExecutiveChartTab('institution')}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                              executiveChartTab === 'institution'
                                ? 'bg-corporate-teal-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Pinjaman &amp; Tebus
                          </button>
                          <button
                            type="button"
                            onClick={() => setExecutiveChartTab('types')}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                              executiveChartTab === 'types'
                                ? 'bg-corporate-magenta-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Pecahan Jenis
                          </button>
                        </div>
                      </div>

                      {/* Active Tab Sub-header Readout */}
                      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {executiveChartTab === 'marhun' && 'Trend penambahan nilai marhun portfolio mengikut garis masa'}
                          {executiveChartTab === 'institution' && 'Perbandingan jumlah pinjaman berbanding komitmen tebus mengikut institusi'}
                          {executiveChartTab === 'types' && 'Pecahan status kitaran transaksi (Pajakan Asal, Salin, OL, Tebus)'}
                        </span>
                        {executiveChartTab === 'marhun' && latestCumulativeMarhun > 0 && (
                          <span className="font-bold text-corporate-teal-700 bg-corporate-teal-50 px-2.5 py-0.5 rounded-full">
                            Terkumpul: {formatRM(latestCumulativeMarhun)}
                          </span>
                        )}
                        {executiveChartTab === 'institution' && (
                          <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                            {institutionAnalysis.length} Institusi Aktif
                          </span>
                        )}
                      </div>

                      {/* Chart Canvas */}
                      <div className="mt-5 h-72 sm:h-80">
                        {executiveChartTab === 'marhun' && (
                          cumulativeMarhunData.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                              <Scale size={32} className="text-slate-300 mb-2" />
                              <span>Tiada rekod marhun untuk dipaparkan.</span>
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={cumulativeMarhunData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorMarhunExecutive" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#047ea0" stopOpacity={0.35} />
                                    <stop offset="95%" stopColor="#047ea0" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.7} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={value => `RM${Number(value).toLocaleString('en-MY')}`} />
                                <Tooltip
                                  formatter={value => [formatRM(Number(value)), 'Nilai Marhun Terkumpul']}
                                  contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                                />
                                <Area type="monotone" dataKey="accumulatedValue" name="Nilai Marhun Terkumpul" stroke="#047ea0" strokeWidth={3} fillOpacity={1} fill="url(#colorMarhunExecutive)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          )
                        )}

                        {executiveChartTab === 'institution' && (
                          institutionAnalysis.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                              <Building2 size={32} className="text-slate-300 mb-2" />
                              <span>Tiada data institusi untuk dianalisis.</span>
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={institutionAnalysis} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.7} />
                                <XAxis dataKey="institution" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                <Tooltip
                                  cursor={{ fill: '#f1f5f9' }}
                                  formatter={(value, name) => [formatRM(Number(value)), name]}
                                  contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
                                <Bar dataKey="loan" name="Pinjaman (RM)" fill="#047ea0" radius={[6, 6, 0, 0]} maxBarSize={45} />
                                <Bar dataKey="redemption" name="Jumlah Tebus (RM)" fill="#a6a7a9" radius={[6, 6, 0, 0]} maxBarSize={45} />
                              </BarChart>
                            </ResponsiveContainer>
                          )
                        )}

                        {executiveChartTab === 'types' && (
                          transactionTypeAnalysis.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                              <Scale size={32} className="text-slate-300 mb-2" />
                              <span>Belum ada transaksi untuk dianalisis.</span>
                            </div>
                          ) : (
                            <div className="h-full flex flex-col md:flex-row items-center justify-between gap-4">
                              <div className="w-full md:w-3/5 h-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={transactionTypeAnalysis}
                                      dataKey="count"
                                      nameKey="name"
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={55}
                                      outerRadius={85}
                                      paddingAngle={4}
                                    >
                                      {transactionTypeAnalysis.map((entry, index) => (
                                        <Cell
                                          key={entry.name}
                                          fill={['#0096d8', '#047ea0', '#cf3983', '#66686a', '#b72e70'][index % 5]}
                                        />
                                      ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => [`${value} rekod`, 'Bilangan']} />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="w-full md:w-2/5 space-y-2 pr-4">
                                {transactionTypeAnalysis.map((entry, index) => (
                                  <div key={entry.name} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="h-3 w-3 rounded-full shrink-0"
                                        style={{ backgroundColor: ['#0096d8', '#047ea0', '#cf3983', '#66686a', '#b72e70'][index % 5] }}
                                      />
                                      <span className="font-semibold text-slate-700">{entry.name}</span>
                                    </div>
                                    <span className="font-bold text-slate-900">{entry.count} rekod</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Dikemaskini daripada transaksi lejar aktif.</span>
                      <span className="font-mono font-medium">BI Live Engine</span>
                    </div>
                  </div>

                  {/* Right Column (4 cols): Pusat Matang & Kalendar Pintar */}
                  <div className="xl:col-span-4 min-w-0 bg-white p-5 sm:p-7 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
                    <div>
                      {/* Header with Navigation & Toggle */}
                      <div className="border-b border-slate-100 pb-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-1.5">
                            <CalendarDays size={18} className="text-corporate-teal-600" />
                            <span>Jadual Matang</span>
                          </h3>
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                            {maturityCalendar.entries.length} rekod
                          </span>
                        </div>

                        {/* Month Navigator */}
                        <div className="flex items-center justify-between gap-1 rounded-2xl bg-slate-50 p-1 border border-slate-200/60">
                          <button
                            type="button"
                            aria-label="Bulan sebelumnya"
                            onClick={() => setCalendarMonth(month => new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                            className="p-1.5 rounded-xl hover:bg-white hover:shadow-sm text-slate-600 transition-all"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <p className="text-xs font-extrabold text-slate-800 capitalize">
                            {calendarMonth.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' })}
                          </p>
                          <button
                            type="button"
                            aria-label="Bulan seterusnya"
                            onClick={() => setCalendarMonth(month => new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                            className="p-1.5 rounded-xl hover:bg-white hover:shadow-sm text-slate-600 transition-all"
                          >
                            <ChevronRight size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCalendarMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                          >
                            Hari Ini
                          </button>
                        </div>

                        {/* View Switcher: Agenda vs Grid */}
                        <div className="mt-3 flex items-center justify-end gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => setDashboardCalendarView('agenda')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                              dashboardCalendarView === 'agenda'
                                ? 'bg-corporate-teal-50 text-corporate-teal-800 border border-corporate-teal-200'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Senarai Agenda
                          </button>
                          <button
                            type="button"
                            onClick={() => setDashboardCalendarView('calendar')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                              dashboardCalendarView === 'calendar'
                                ? 'bg-corporate-teal-50 text-corporate-teal-800 border border-corporate-teal-200'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Grid Kalendar
                          </button>
                        </div>
                      </div>

                      {/* Content Area: Agenda List or Compact Calendar Grid */}
                      <div className="mt-4">
                        {dashboardCalendarView === 'agenda' ? (
                          maturityCalendar.entries.length === 0 ? (
                            <div className="rounded-2xl bg-slate-50 p-6 text-center text-xs text-slate-400 border border-slate-100">
                              <CalendarDays size={28} className="mx-auto text-slate-300 mb-1.5" />
                              <p className="font-semibold text-slate-600">Tiada transaksi matang bulan ini.</p>
                              <p className="text-[11px] mt-0.5">Semua surat selamat daripada tarikh matang bagi bulan ini.</p>
                            </div>
                          ) : (
                            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                              {maturityCalendar.entries.map(tx => {
                                const isSettled = ['Selesai', 'Ditebus', 'Dilelong'].includes(tx.status);
                                const statusLabel = isSettled
                                  ? tx.status
                                  : tx.daysRemaining < 0
                                    ? `Lewat ${Math.abs(tx.daysRemaining)}h`
                                    : tx.daysRemaining === 0 ? 'Hari Ini' : `Baki ${tx.daysRemaining}h`;

                                return (
                                  <div
                                    key={tx.id}
                                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3 transition-all hover:bg-slate-50 hover:border-slate-200"
                                  >
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-xs font-bold text-slate-800">
                                          Surat #{tx.refNo}
                                        </span>
                                        <span className="text-[11px] text-slate-500">· {tx.institution}</span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 mt-0.5">
                                        Matang: {tx.redemptionDate} · <strong className="text-slate-700">{formatRM(getCurrentRedemption(tx))}</strong>
                                      </p>
                                    </div>
                                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                                      isSettled
                                        ? 'bg-slate-200 text-slate-600'
                                        : tx.daysRemaining <= 3
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      {statusLabel}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )
                        ) : (
                          /* Compact Calendar Grid */
                          <div className="rounded-2xl border border-slate-200/80 bg-white p-2">
                            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-1">
                              {['Ah', 'Is', 'Se', 'Ra', 'Kh', 'Ju', 'Sa'].map(d => <span key={d}>{d}</span>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {maturityCalendar.days.map(({ date, dateKey, isCurrentMonth, entries }) => {
                                const isToday = dateKey === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                                return (
                                  <div
                                    key={dateKey}
                                    className={`relative flex flex-col items-center justify-center h-8 rounded-lg text-xs font-semibold ${
                                      isToday
                                        ? 'bg-corporate-teal-600 text-white font-bold'
                                        : entries.length > 0
                                          ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                                          : isCurrentMonth
                                            ? 'text-slate-700 hover:bg-slate-100'
                                            : 'text-slate-300'
                                    }`}
                                  >
                                    <span>{date.getDate()}</span>
                                    {entries.length > 0 && !isToday && (
                                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Monthly Redemption Sum */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Jumlah tebus bulan ini:</span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        {formatRM(monthTotalRedemption)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Portfolio Reserves & Asset Diversification Strip */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <Scale size={16} className="text-corporate-teal-600" />
                        <span>Komposisi Rizab Emas Fizikal (EDT vs EDR)</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Jumlah rizab terkumpul: <strong className="text-slate-800">{totalGoldGrams}g</strong> emas bernilai anggaran <strong className="text-slate-800">{formatRM(totalGoldGrams * currentGoldPrice)}</strong>.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-emerald-500" />
                        <span className="text-slate-600 font-medium">Emas Di Tangan (EDT): <strong>{edtBalance}g</strong> ({edtPercentage}%)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-corporate-teal-500" />
                        <span className="text-slate-600 font-medium">Emas Ar-Rahnu (EDR): <strong>{edrBalance}g</strong> ({edrPercentage}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Dual Segmented Allocation Bar */}
                  <div className="mt-4 h-3 w-full rounded-full bg-slate-100 overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${edtPercentage}%` }}
                      title={`Emas Di Tangan: ${edtBalance}g (${edtPercentage}%)`}
                    />
                    <div
                      className="h-full bg-corporate-teal-500 transition-all duration-500"
                      style={{ width: `${edrPercentage}%` }}
                      title={`Emas Ar-Rahnu: ${edrBalance}g (${edrPercentage}%)`}
                    />
                  </div>

                  {/* 3 Executive Pillars Summary */}
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-xs">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <span className="text-slate-400 font-medium block text-[11px]">Nisbah Keselamatan Fizikal</span>
                      <span className={`font-bold mt-0.5 block ${edtBalance >= edrBalance ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {edtBalance >= edrBalance ? '✓ 100% Dilindungi (EDT ≥ EDR)' : '⚠ Perlu Tambah EDT fizikal'}
                      </span>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <span className="text-slate-400 font-medium block text-[11px]">Institusi Pembiayaan Terbesar</span>
                      <span className="font-bold text-slate-800 mt-0.5 block truncate">
                        {topInstitution ? `${topInstitution.institution} (${formatRM(topInstitution.loan)})` : 'Tiada rekod'}
                      </span>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <span className="text-slate-400 font-medium block text-[11px]">Status Kitaran Lejar</span>
                      <span className="font-bold text-corporate-teal-700 mt-0.5 block">
                        {activeTickets} Surat Aktif daripada {visibleTransactions.length} Transaksi
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB: TRANSACTIONS (CRUD) / PENGURUSAN SURAT GADAIAN (SAG) */}
          {activeTab === 'transactions' && (() => {
            const totalActiveLoan = activePortfolioTransactions.reduce((sum, tx) => sum + getCurrentPrincipal(tx), 0);
            const totalActiveMarhun = activePortfolioTransactions.reduce((sum, tx) => sum + getTransactionMarhunValue(tx), 0);
            const urgentRedemptionTotal = redemptionNotifications.reduce((sum, tx) => sum + getCurrentRedemption(tx), 0);

            const getSagStatusBadge = (tx: any) => {
              const isSettled = tx.status === 'Selesai';
              const isRedeemed = tx.status === 'Ditebus';
              const isAuctioned = tx.status === 'Dilelong';
              const days = getDaysUntilDate(tx.redemptionDate);

              if (isAuctioned) {
                return {
                  label: 'Dilelong',
                  badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-extrabold',
                  dotClass: 'bg-rose-500'
                };
              }

              if (isSettled || isRedeemed) {
                return {
                  label: isRedeemed ? 'Ditebus' : 'Selesai',
                  badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200 font-bold',
                  dotClass: 'bg-slate-400'
                };
              }

              if (days !== null && days < 0) {
                return {
                  label: `Tamat Tempoh (Lewat ${Math.abs(days)}h)`,
                  badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-black animate-pulse',
                  dotClass: 'bg-rose-500'
                };
              }

              if (days !== null && days <= 3) {
                return {
                  label: days === 0 ? 'Matang Hari Ini' : `Hampir Matang (${days}h)`,
                  badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300 font-black',
                  dotClass: 'bg-amber-500'
                };
              }

              return {
                label: 'Aktif',
                badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold',
                dotClass: 'bg-emerald-500'
              };
            };

            const filteredSagList = sortedTransactions.filter(tx => {
              if (sagSearchQuery.trim()) {
                const q = sagSearchQuery.toLowerCase().trim();
                const refMatch = (tx.refNo || '').toLowerCase().includes(q);
                const instMatch = (tx.institution || '').toLowerCase().includes(q);
                const remarksMatch = (tx.remarks || '').toLowerCase().includes(q);
                const assetMatch = (tx.selectedAssetIds || []).some(id => String(id).toLowerCase().includes(q));
                if (!refMatch && !instMatch && !remarksMatch && !assetMatch) return false;
              }

              if (sagBranchFilter !== 'Semua' && tx.institution !== sagBranchFilter) {
                return false;
              }

              if (sagMaturityFilter === 'aktif') {
                if (tx.status && tx.status !== 'Aktif') return false;
              } else if (sagMaturityFilter === 'hampir_matang') {
                const days = getDaysUntilDate(tx.redemptionDate);
                if (days === null || days > 3 || days < 0 || tx.status === 'Selesai' || tx.status === 'Ditebus') return false;
              } else if (sagMaturityFilter === 'lewat') {
                const days = getDaysUntilDate(tx.redemptionDate);
                if (days === null || days >= 0 || tx.status === 'Selesai' || tx.status === 'Ditebus') return false;
              } else if (sagMaturityFilter === 'selesai') {
                if (tx.status !== 'Selesai' && tx.status !== 'Ditebus') return false;
              }

              if (transactionStatusFilter !== 'Semua' && getTransactionStatus(tx) !== transactionStatusFilter) {
                return false;
              }

              return true;
            });

            const sagPageSize = 10;
            const totalSagPages = Math.max(1, Math.ceil(filteredSagList.length / sagPageSize));
            const paginatedSagList = filteredSagList.slice((sagPage - 1) * sagPageSize, sagPage * sagPageSize);

            return (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Modern SAG Command Center Header */}
                <div className="relative overflow-hidden rounded-3xl border border-corporate-teal-800/40 bg-gradient-to-br from-slate-900 via-corporate-green-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
                  <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-corporate-teal-400/10 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-corporate-magenta-500/10 blur-3xl" />

                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-corporate-teal-500/30 bg-corporate-teal-950/80 px-3.5 py-1 text-xs font-bold text-corporate-teal-200 backdrop-blur-md mb-2">
                        <ArrowRightLeft size={14} className="text-emerald-400" />
                        <span>PENGURUSAN SURAT GADAIAN (SAG) · LEJAR UTAMA</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
                        Pengurusan Surat Gadaian (SAG)
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                        Pusat operasi pajakan emas: jejaki siri SAG, nilai taksiran marhun, kadar caj, serta amaran tempoh matang untuk ketepatan data dan kelajuan operasi.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-2 rounded-xl backdrop-blur-md">
                        <span className="font-mono font-bold text-corporate-teal-300">[ / ]</span>
                        <span>Carian</span>
                        <span className="mx-1 text-white/30">·</span>
                        <span className="font-mono font-bold text-corporate-teal-300">[ Alt + N ]</span>
                        <span>Tambah SAG</span>
                      </div>

                      <input
                        type="file"
                        accept=".csv"
                        id="csv-upload"
                        className="hidden"
                        onChange={handleImportCSV}
                      />
                      <label
                        htmlFor="csv-upload"
                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        <UploadCloud size={15} />
                        <span>Import</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white backdrop-blur-md transition-all active:scale-95 shadow-sm"
                      >
                        <DownloadCloud size={15} />
                        <span>Export</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
                        className="inline-flex items-center gap-2 rounded-xl border border-corporate-teal-400/50 bg-corporate-teal-600 hover:bg-corporate-teal-500 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-lg shadow-corporate-teal-950/40 backdrop-blur-md transition-all active:scale-95"
                      >
                        <Plus size={16} />
                        <span>Tambah Surat Gadaian</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4 Hierarchical KPI Telemetry Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Jumlah Gadaian Aktif */}
                  <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Jumlah Gadaian Aktif</span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-corporate-teal-50 text-corporate-teal-700">
                        <Wallet size={20} />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {activePortfolioTransactions.length} <span className="text-sm font-semibold text-slate-500">surat</span>
                    </p>
                    <p className="mt-2 text-xs text-slate-500 font-medium">
                      Baki Pokok: <strong className="text-slate-800">{formatRM(totalActiveLoan)}</strong>
                    </p>
                  </div>

                  {/* Card 2: Nilai Marhun Semasa */}
                  <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Nilai Marhun Semasa</span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                        <Scale size={20} />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                      {formatRM(totalActiveMarhun)}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 font-medium">
                      Emas Terkunci: <strong className="text-slate-800">{edrBalance}g</strong> EDR
                    </p>
                  </div>

                  {/* Card 3: SAG Hampir / Lewat Matang */}
                  <div className={`rounded-3xl border p-5 shadow-sm ${
                    redemptionNotifications.length > 0
                      ? 'border-amber-300 bg-amber-50/40'
                      : 'border-slate-200/80 bg-white'
                  }`}>
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">SAG Perlu Tindakan</span>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                        redemptionNotifications.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <AlertTriangle size={20} />
                      </div>
                    </div>
                    <p className={`mt-3 text-2xl sm:text-3xl font-black tracking-tight ${
                      redemptionNotifications.length > 0 ? 'text-amber-800' : 'text-slate-900'
                    }`}>
                      {redemptionNotifications.length} <span className="text-sm font-semibold text-slate-500">surat</span>
                    </p>
                    <p className="mt-2 text-xs text-slate-500 font-medium">
                      Jumlah Tebus: <strong className="text-slate-800">{formatRM(urgentRedemptionTotal)}</strong>
                    </p>
                  </div>

                  {/* Card 4: Harga Emas Semasa */}
                  <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Harga Emas Semasa</span>
                      <button
                        type="button"
                        onClick={() => handleRefresh()}
                        disabled={isRefreshing}
                        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-corporate-magenta-50 text-corporate-magenta-700 hover:bg-corporate-magenta-100 transition-colors disabled:opacity-50"
                        title="Kemas kini harga pasaran live"
                      >
                        <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                      </button>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      RM {currentGoldPrice.toFixed(2)}
                      <span className="text-xs sm:text-sm font-semibold text-slate-400">/g</span>
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      <span>Rujukan Taksiran Spot Live</span>
                    </div>
                  </div>
                </div>

                {/* Smart Search, Filter & Layout Control Hub */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm space-y-3">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Global Quick Search */}
                    <div className="relative flex-1">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="sag-search-input"
                        type="text"
                        value={sagSearchQuery}
                        onChange={e => { setSagSearchQuery(e.target.value); setSagPage(1); }}
                        placeholder="Cari No. Siri SAG, rujukan tiket, ID aset, atau catatan... [ Tekan '/' ]"
                        className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-200 outline-none focus:border-corporate-teal-500 focus:ring-2 focus:ring-corporate-teal-500/20"
                      />
                      {sagSearchQuery && (
                        <button
                          type="button"
                          onClick={() => { setSagSearchQuery(''); setSagPage(1); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>

                    {/* Filter Dropdowns */}
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={sagBranchFilter}
                        onChange={e => { setSagBranchFilter(e.target.value); setSagPage(1); }}
                        aria-label="Tapis mengikut cawangan / institusi"
                        className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:border-corporate-teal-500 bg-white text-slate-700"
                      >
                        <option value="Semua">Semua Cawangan / Institusi</option>
                        {visibleInstitutions.map(inst => (
                          <option key={inst.id} value={inst.name}>{inst.name}</option>
                        ))}
                      </select>

                      <select
                        value={sagMaturityFilter}
                        onChange={e => { setSagMaturityFilter(e.target.value); setSagPage(1); }}
                        aria-label="Tapis mengikut status matang"
                        className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:border-corporate-teal-500 bg-white text-slate-700"
                      >
                        <option value="Semua">Semua Status SAG</option>
                        <option value="aktif">Aktif Sahaja</option>
                        <option value="hampir_matang">Hampir Matang (≤ 3 Hari)</option>
                        <option value="lewat">Tamat Tempoh / Lewat</option>
                        <option value="selesai">Telah Ditebus / Selesai</option>
                      </select>

                      <select
                        value={transactionStatusFilter}
                        onChange={e => { setTransactionStatusFilter(e.target.value); setSagPage(1); }}
                        aria-label="Tapis mengikut jenis pajak"
                        className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:border-corporate-teal-500 bg-white text-slate-700"
                      >
                        <option value="Semua">Semua Jenis Pajak</option>
                        {transactionStatusOptions.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>

                      {/* View Layout Toggle */}
                      <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => setSagViewLayout('table')}
                          title="Paparan Jadual Penuh"
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                            sagViewLayout === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Jadual
                        </button>
                        <button
                          type="button"
                          onClick={() => setSagViewLayout('grid')}
                          title="Paparan Kad Grid Pantas"
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                            sagViewLayout === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Kad Grid
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Filter Indicator Badges */}
                  {(sagSearchQuery || sagBranchFilter !== 'Semua' || sagMaturityFilter !== 'Semua' || transactionStatusFilter !== 'Semua') && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500 font-medium">Penapis aktif:</span>
                      {sagSearchQuery && (
                        <span className="rounded-lg bg-corporate-teal-50 px-2.5 py-0.5 text-corporate-teal-800 font-semibold border border-corporate-teal-200">
                          Carian: &quot;{sagSearchQuery}&quot;
                        </span>
                      )}
                      {sagBranchFilter !== 'Semua' && (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-slate-700 font-semibold border border-slate-200">
                          Cawangan: {sagBranchFilter}
                        </span>
                      )}
                      {sagMaturityFilter !== 'Semua' && (
                        <span className="rounded-lg bg-amber-50 px-2.5 py-0.5 text-amber-800 font-semibold border border-amber-200">
                          Status: {sagMaturityFilter}
                        </span>
                      )}
                      {transactionStatusFilter !== 'Semua' && (
                        <span className="rounded-lg bg-sky-50 px-2.5 py-0.5 text-sky-800 font-semibold border border-sky-200">
                          Jenis: {transactionStatusFilter}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSagSearchQuery('');
                          setSagBranchFilter('Semua');
                          setSagMaturityFilter('Semua');
                          setTransactionStatusFilter('Semua');
                          setSagPage(1);
                        }}
                        className="text-corporate-magenta-700 font-bold hover:underline text-[11px]"
                      >
                        Padam Semua Penapis
                      </button>
                    </div>
                  )}
                </div>

                {/* VIEW MODE 1: DATA TABLE VIEW */}
                {sagViewLayout === 'table' ? (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden w-full">
                    <div className="min-w-0 w-full overflow-x-auto overscroll-x-contain custom-scrollbar" role="region" aria-label="Jadual transaksi; leret ke sisi untuk melihat semua lajur" tabIndex={0}>
                      <table className="w-full min-w-max text-left border-collapse whitespace-nowrap text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                            <th className="p-4 sm:px-6">No. Siri SAG</th>
                            <th className="p-4">Jenis Pajakan</th>
                            <th className="p-4">Institusi / Cawangan</th>
                            <th className="p-4">Status &amp; Tempoh</th>
                            <th className="p-4 text-right">Berat (g)</th>
                            <th className="p-4 text-right">Nilai Marhun</th>
                            <th className="p-4 text-right">Baki Pinjaman</th>
                            <th className="p-4 text-right">Jumlah Tebus</th>
                            <th className="p-4 text-right">Lebihan Tunai</th>
                            <th className="p-4">Tarikh Matang</th>
                            <th className="p-4">AI Presumption</th>
                            <th className="p-4 text-center">Tindakan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {paginatedSagList.map((tx) => {
                            const linkedAssetIds = tx.selectedAssetIds || (tx.selectedAssetId ? [tx.selectedAssetId] : []);
                            const linkedAssets = linkedAssetIds.map(assetId =>
                              visibleAssets.find(asset => String(asset.id) === String(assetId))
                            );
                            const aiIndicator = sagAiIndicators.find(item =>
                              String(item.transaction.id) === String(tx.id)
                            );
                            const statusInfo = getSagStatusBadge(tx);

                            return (
                              <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors group">
                                {/* No. Siri SAG */}
                                <td className="p-4 sm:px-6">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-black text-slate-900 tracking-tight">
                                      #{tx.refNo}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    {formatTransactionDateTime(tx.date)}
                                  </div>
                                </td>

                                {/* Jenis Pajakan */}
                                <td className="p-4">
                                  <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${
                                    getTransactionStatus(tx) === 'Pajakan Asal' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                    getTransactionStatus(tx) === 'Salin' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                    getTransactionStatus(tx) === 'OL' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                    getTransactionStatus(tx) === 'Lelong' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                    'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}>
                                    {getTransactionStatus(tx)}
                                  </span>
                                </td>

                                {/* Institusi / Cawangan */}
                                <td className="p-4">
                                  <p className="font-bold text-slate-800 text-xs">{tx.institution}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{tx.purity ? `Emas ${tx.purity}` : 'Mutu N/A'}</p>
                                </td>

                                {/* Status & Tempoh (Consistent Status Badge) */}
                                <td className="p-4">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(tx.id)}
                                    disabled={['Ditebus', 'Dilelong'].includes(tx.status)}
                                    title="Klik untuk menukar status"
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full transition-all cursor-pointer ${statusInfo.badgeClass}`}
                                  >
                                    <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotClass}`} />
                                    <span>{statusInfo.label}</span>
                                  </button>
                                </td>

                                {/* Berat (g) */}
                                <td className="p-4 text-right font-mono font-bold text-slate-800">
                                  {getCurrentPledgedWeight(tx)}g
                                </td>

                                {/* Nilai Marhun */}
                                <td className="p-4 text-right font-mono font-bold text-corporate-teal-800">
                                  {formatRM(getTransactionMarhunValue(tx))}
                                </td>

                                {/* Baki Pinjaman */}
                                <td className="p-4 text-right font-mono font-extrabold text-slate-900">
                                  {formatRM(getCurrentPrincipal(tx))}
                                </td>

                                {/* Jumlah Tebus */}
                                <td className="p-4 text-right font-mono text-slate-600">
                                  {formatRM(getCurrentRedemption(tx))}
                                </td>

                                {/* Lebihan Tunai */}
                                <td className="p-4 text-right font-mono">
                                  <span className={`font-bold ${tx.profit > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {tx.profit > 0 ? `+${formatRM(tx.profit)}` : '-'}
                                  </span>
                                </td>

                                {/* Tarikh Matang Direct Input */}
                                <td className="p-4">
                                  {!tx.type.includes('Tebus') ? (
                                    <input
                                      type="date"
                                      aria-label={`Tarikh matang surat ${tx.refNo}`}
                                      value={tx.redemptionDate || ''}
                                      onChange={event => {
                                        const redemptionDate = event.target.value;
                                        const updatedAt = new Date().toISOString();
                                        setTransactions(prev => prev.map(item =>
                                          item.id === tx.id ? { ...item, redemptionDate, updatedAt } : item
                                        ));
                                      }}
                                      className={`p-1.5 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-corporate-teal-500 ${
                                        tx.redemptionDate && getDaysUntilDate(tx.redemptionDate) <= 3 && (tx.status === 'Aktif' || !tx.status)
                                          ? 'border-amber-400 bg-amber-50 text-amber-900'
                                          : 'border-slate-200 bg-white text-slate-700'
                                      }`}
                                    />
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>

                                {/* AI Presumption Indicator */}
                                <td className="p-4 whitespace-normal min-w-56">
                                  {aiIndicator ? (
                                    <div className="space-y-0.5 text-[11px]">
                                      <p className={`font-bold ${
                                        aiIndicator.presumption === 'Potensi overlap' ? 'text-emerald-700' :
                                        aiIndicator.presumption === 'Petunjuk shortfall' ? 'text-rose-700' : 'text-slate-600'
                                      }`}>
                                        {aiIndicator.presumption}
                                      </p>
                                      <p className="text-slate-500 font-medium">
                                        Skor: <strong className="text-slate-700">{aiIndicator.readinessScore ?? 'N/A'}/100</strong>
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 text-[11px]">Selesai / N/A</span>
                                  )}
                                </td>

                                {/* Action Buttons */}
                                <td className="p-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleEditTransaction(tx)}
                                      className="p-1.5 rounded-xl text-slate-400 hover:text-corporate-teal-600 hover:bg-corporate-teal-50 transition-colors"
                                      title="Edit surat gadaian"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCorrection(tx)}
                                      className="p-1.5 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                      title={`Rekod pembetulan (${getCorrectionEvents(tx).length})`}
                                    >
                                      <Settings2 size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStatus(tx.id)}
                                      disabled={['Ditebus', 'Dilelong'].includes(tx.status)}
                                      className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                      title={tx.status === 'Aktif' ? 'Tandakan sebagai Selesai' : 'Tandakan sebagai Aktif'}
                                    >
                                      <CheckCircle2 size={15} className={tx.status === 'Selesai' || tx.status === 'Ditebus' ? 'text-emerald-600' : ''} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(tx.id)}
                                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                      title="Padam rekod transaksi"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                          {paginatedSagList.length === 0 && (
                            <tr>
                              <td colSpan={12} className="p-8 text-center text-slate-400">
                                {visibleTransactions.length === 0
                                  ? 'Tiada transaksi didaftarkan. Tekan "Tambah Surat Gadaian" untuk bermula.'
                                  : 'Tiada rekod SAG sepadan dengan tapisan yang dipilih.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500">
                      <span>
                        Menunjukkan {filteredSagList.length === 0 ? 0 : (sagPage - 1) * sagPageSize + 1} hingga {Math.min(sagPage * sagPageSize, filteredSagList.length)} daripada {filteredSagList.length} surat
                      </span>
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          disabled={sagPage <= 1}
                          onClick={() => setSagPage(p => Math.max(1, p - 1))}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40"
                        >
                          Sebelumnya
                        </button>
                        <span className="font-bold text-slate-800 px-2">
                          {sagPage} / {totalSagPages}
                        </span>
                        <button
                          type="button"
                          disabled={sagPage >= totalSagPages}
                          onClick={() => setSagPage(p => Math.min(totalSagPages, p + 1))}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40"
                        >
                          Seterusnya
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* VIEW MODE 2: CARD GRID VIEW */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {paginatedSagList.map((tx) => {
                        const statusInfo = getSagStatusBadge(tx);
                        const aiIndicator = sagAiIndicators.find(item => String(item.transaction.id) === String(tx.id));

                        return (
                          <div
                            key={tx.id}
                            className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                                <div>
                                  <span className="font-mono text-base font-black text-slate-900 tracking-tight">
                                    Surat #{tx.refNo}
                                  </span>
                                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{tx.institution}</p>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full ${statusInfo.badgeClass}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotClass}`} />
                                  <span>{statusInfo.label}</span>
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-3 py-3 text-xs border-b border-slate-100">
                                <div>
                                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Berat Emas</span>
                                  <span className="font-mono font-bold text-slate-800 text-sm">{getCurrentPledgedWeight(tx)}g</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Nilai Marhun</span>
                                  <span className="font-mono font-bold text-corporate-teal-800 text-sm">{formatRM(getTransactionMarhunValue(tx))}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Baki Pinjaman</span>
                                  <span className="font-mono font-extrabold text-slate-900 text-sm">{formatRM(getCurrentPrincipal(tx))}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Jumlah Tebus</span>
                                  <span className="font-mono font-bold text-slate-700 text-sm">{formatRM(getCurrentRedemption(tx))}</span>
                                </div>
                              </div>

                              <div className="pt-2.5 flex items-center justify-between text-xs text-slate-500">
                                <span>Tarikh Matang: <strong>{tx.redemptionDate || 'Belum diisi'}</strong></span>
                                {aiIndicator && (
                                  <span className="font-bold text-corporate-teal-700">
                                    Skor: {aiIndicator.readinessScore ?? 'N/A'}/100
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[11px] text-slate-400 font-mono">
                                {formatTransactionDateTime(tx.date)}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditTransaction(tx)}
                                  className="p-1.5 rounded-xl text-slate-500 hover:text-corporate-teal-600 hover:bg-corporate-teal-50"
                                  title="Edit"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenCorrection(tx)}
                                  className="p-1.5 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                  title="Pembetulan"
                                >
                                  <Settings2 size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(tx.id)}
                                  className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                  title="Padam"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination for Grid View */}
                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/80 text-xs text-slate-500">
                      <span>{filteredSagList.length} surat gadaian dijumpai</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={sagPage <= 1}
                          onClick={() => setSagPage(p => Math.max(1, p - 1))}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40"
                        >
                          Sebelumnya
                        </button>
                        <span className="font-bold text-slate-800 px-2">{sagPage} / {totalSagPages}</span>
                        <button
                          type="button"
                          disabled={sagPage >= totalSagPages}
                          onClick={() => setSagPage(p => Math.min(totalSagPages, p + 1))}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40"
                        >
                          Seterusnya
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Keyboard Accessibility & Operations Guide */}
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">Pintasan Papan Kekunci Pantas:</span>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                      /
                    </span>
                    <span>Fokus Carian No. Siri</span>
                    <span className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                      Alt + N
                    </span>
                    <span>Tambah SAG Baharu</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Borang menyokong [ Esc ] untuk batal dan [ Ctrl + Enter ] untuk simpan segera.
                  </span>
                </div>
              </div>
            );
          })()}

          {/* TAB: ASSET RECORD / PENGURUSAN EMAS & INVENTORI */}
          {activeTab === 'assets' && (() => {
            const totalGoldGrams = visibleAssets.reduce((sum, a) => sum + (parseFloat(a.weight) || 0), 0);
            const edtAssets = visibleAssets.filter(a => a.status === 'EDT');
            const edrAssets = visibleAssets.filter(a => a.status === 'Dalam Ar-Rahnu');
            const edtWeight = edtAssets.reduce((sum, a) => sum + (parseFloat(a.weight) || 0), 0);
            const edrWeight = edrAssets.reduce((sum, a) => sum + (parseFloat(a.weight) || 0), 0);
            const edtPercentage = totalGoldGrams > 0 ? Math.round((edtWeight / totalGoldGrams) * 100) : 50;
            const edrPercentage = 100 - edtPercentage;
            const totalPurchaseCost = visibleAssets.reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0);
            const totalEstimatedMarketValue = totalGoldGrams * currentGoldPrice;
            const paperGainLoss = totalEstimatedMarketValue - totalPurchaseCost;

            const getAssetStatusBadge = (asset: any) => {
              if (asset.status === 'Dilelong') {
                return {
                  label: 'Dilelong · Keluar',
                  badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-extrabold animate-pulse',
                  dotClass: 'bg-rose-500'
                };
              }
              if (asset.status === 'Dalam Ar-Rahnu') {
                return {
                  label: 'EDR · Dalam Ar-Rahnu',
                  badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300 font-extrabold',
                  dotClass: 'bg-amber-500'
                };
              }
              if (asset.status === 'Ditebus') {
                return {
                  label: 'Ditebus · Arkib',
                  badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200 font-bold',
                  dotClass: 'bg-slate-400'
                };
              }
              return {
                label: 'EDT · Tersedia Di Tangan',
                badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold',
                dotClass: 'bg-emerald-500'
              };
            };

            const filteredAssetList = visibleAssets.filter(asset => {
              if (assetSearchQuery.trim()) {
                const q = assetSearchQuery.toLowerCase().trim();
                const codeMatch = (asset.code || '').toLowerCase().includes(q);
                const supplierMatch = (asset.supplier || '').toLowerCase().includes(q);
                const typeMatch = (asset.type || '').toLowerCase().includes(q);
                const purityMatch = (asset.purity || '').toLowerCase().includes(q);
                const remarksMatch = (asset.remarks || '').toLowerCase().includes(q);
                if (!codeMatch && !supplierMatch && !typeMatch && !purityMatch && !remarksMatch) return false;
              }

              if (assetSupplierFilter !== 'Semua') {
                const assetSuppliers = (asset.supplier || '').split(',').map((s: string) => s.trim());
                if (!assetSuppliers.includes(assetSupplierFilter) && asset.supplier !== assetSupplierFilter) return false;
              }

              if (assetWeightFilter !== 'Semua') {
                const w = parseFloat(asset.weight) || 0;
                if (assetWeightFilter === 'under_5' && w >= 5) return false;
                if (assetWeightFilter === '5_to_10' && (w < 5 || w > 10)) return false;
                if (assetWeightFilter === '10_to_50' && (w < 10 || w > 50)) return false;
                if (assetWeightFilter === 'over_50' && w <= 50) return false;
              }

              if (assetStatusFilter !== 'Semua') {
                if (assetStatusFilter === 'EDT' && asset.status !== 'EDT') return false;
                if (assetStatusFilter === 'EDR' && asset.status !== 'Dalam Ar-Rahnu') return false;
                if (assetStatusFilter === 'Dilelong' && asset.status !== 'Dilelong') return false;
              }

              return true;
            }).sort((a, b) => {
              if (assetSortBy === 'weight_desc') return (parseFloat(b.weight) || 0) - (parseFloat(a.weight) || 0);
              if (assetSortBy === 'price_desc') return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
              if (assetSortBy === 'code_asc') return (a.code || '').localeCompare(b.code || '');
              return getTransactionTimestamp(b.date) - getTransactionTimestamp(a.date);
            });

            const assetPageSize = 10;
            const totalAssetPages = Math.max(1, Math.ceil(filteredAssetList.length / assetPageSize));
            const paginatedAssetList = filteredAssetList.slice((assetPage - 1) * assetPageSize, assetPage * assetPageSize);

            return (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Modern Inventory Command Header */}
                <div className="relative overflow-hidden rounded-3xl border border-corporate-teal-800/40 bg-gradient-to-br from-slate-900 via-corporate-green-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
                  <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-corporate-teal-400/10 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-corporate-magenta-500/10 blur-3xl" />

                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-corporate-teal-500/30 bg-corporate-teal-950/80 px-3.5 py-1 text-xs font-bold text-corporate-teal-200 backdrop-blur-md mb-2">
                        <Database size={14} className="text-emerald-400" />
                        <span>PENGURUSAN EMAS &amp; INVENTORI FIZIKAL</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
                        Emas &amp; Asset Inventory
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                        Pengurusan berketepatan tinggi bagi Gold Bar, Dinar, dan Barang Kemas. Memantau ketulenan, berat gram, kos belian asal serta taksiran pasaran semasa untuk meminimumkan ralat operasi.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-2 rounded-xl backdrop-blur-md">
                        <span className="font-mono font-bold text-corporate-teal-300">[ / ]</span>
                        <span>Carian</span>
                        <span className="mx-1 text-white/30">·</span>
                        <span className="font-mono font-bold text-corporate-teal-300">[ Alt + A ]</span>
                        <span>Daftar Aset</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => { setEditingAsset(null); setIsAssetModalOpen(true); }}
                        className="inline-flex items-center gap-2 rounded-xl border border-corporate-teal-400/50 bg-corporate-teal-600 hover:bg-corporate-teal-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-corporate-teal-950/40 backdrop-blur-md transition-all active:scale-95"
                      >
                        <Plus size={16} />
                        <span>Daftar Aset Emas</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4 Critical KPI Telemetry Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Jumlah Status Emas */}
                  <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Jumlah Rizab Emas</span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-corporate-teal-50 text-corporate-teal-700">
                        <Database size={20} />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {totalGoldGrams}g <span className="text-sm font-semibold text-slate-500">({visibleAssets.length} unit)</span>
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500 font-medium">
                      <span>EDT: <strong className="text-emerald-700">{edtWeight}g</strong> ({edtPercentage}%)</span>
                      <span>EDR: <strong className="text-corporate-teal-700">{edrWeight}g</strong> ({edrPercentage}%)</span>
                    </div>
                  </div>

                  {/* Card 2: Anggaran Nilai Pasaran Semasa */}
                  <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Nilai Pasaran Semasa</span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                        <TrendingUp size={20} />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                      {formatRM(totalEstimatedMarketValue)}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500 font-medium">
                      <span>Kos Asal: {formatRM(totalPurchaseCost)}</span>
                      <span className={paperGainLoss >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                        {paperGainLoss >= 0 ? `+${formatRM(paperGainLoss)}` : formatRM(paperGainLoss)}
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Nisbah Penampan Keselamatan */}
                  <div className={`rounded-3xl border p-5 shadow-sm ${
                    edtWeight >= edrWeight ? 'border-slate-200/80 bg-white' : 'border-rose-300 bg-rose-50/30'
                  }`}>
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Nisbah Keselamatan</span>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                        edtWeight >= edrWeight ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        <ShieldCheck size={20} />
                      </div>
                    </div>
                    <p className={`mt-3 text-xl sm:text-2xl font-black tracking-tight ${
                      edtWeight >= edrWeight ? 'text-emerald-700' : 'text-rose-800'
                    }`}>
                      {edtWeight >= edrWeight ? 'Nisbah Selamat' : 'Kritikal (Tambah EDT)'}
                    </p>
                    <div className="mt-2">
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            edtWeight >= edrWeight ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(10, edtPercentage))}%` }}
                        />
                      </div>
                      <span className="mt-1 block text-[11px] text-slate-500">
                        {edtWeight}g EDT vs {edrWeight}g EDR
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Harga Spot Emas Semasa */}
                  <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Harga Spot Emas</span>
                      <button
                        type="button"
                        onClick={() => handleRefresh()}
                        disabled={isRefreshing}
                        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-corporate-magenta-50 text-corporate-magenta-700 hover:bg-corporate-magenta-100 transition-colors disabled:opacity-50"
                        title="Segar semula harga pasaran live"
                      >
                        <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                      </button>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      RM {currentGoldPrice.toFixed(2)}
                      <span className="text-xs sm:text-sm font-semibold text-slate-400">/g</span>
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      <span>Penilaian Nilai Sebenar Semasa</span>
                    </div>
                  </div>
                </div>

                {/* Smart Search, Filter & Layout Control Hub */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm space-y-3">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Global Quick Search */}
                    <div className="relative flex-1">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="asset-search-input"
                        type="text"
                        value={assetSearchQuery}
                        onChange={e => { setAssetSearchQuery(e.target.value); setAssetPage(1); }}
                        placeholder="Cari No. Siri Aset (cth: GB-PG-999-10G-01), pembekal, jenis, ketulenan... [ Tekan '/' ]"
                        className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-200 outline-none focus:border-corporate-teal-500 focus:ring-2 focus:ring-corporate-teal-500/20"
                      />
                      {assetSearchQuery && (
                        <button
                          type="button"
                          onClick={() => { setAssetSearchQuery(''); setAssetPage(1); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>

                    {/* Filter Dropdowns */}
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={assetSupplierFilter}
                        onChange={e => { setAssetSupplierFilter(e.target.value); setAssetPage(1); }}
                        aria-label="Tapis mengikut pembekal emas"
                        className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:border-corporate-teal-500 bg-white text-slate-700"
                      >
                        <option value="Semua">Semua Pembekal Emas</option>
                        {visibleSuppliers.map(sup => (
                          <option key={sup.id} value={sup.name}>{sup.name} ({sup.code})</option>
                        ))}
                      </select>

                      <select
                        value={assetWeightFilter}
                        onChange={e => { setAssetWeightFilter(e.target.value); setAssetPage(1); }}
                        aria-label="Tapis mengikut kategori berat"
                        className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:border-corporate-teal-500 bg-white text-slate-700"
                      >
                        <option value="Semua">Semua Kategori Berat</option>
                        <option value="under_5">&lt; 5g (Kecil)</option>
                        <option value="5_to_10">5g – 10g (Sederhana)</option>
                        <option value="10_to_50">10g – 50g (Standard)</option>
                        <option value="over_50">&gt; 50g (Besar / Bar)</option>
                      </select>

                      <select
                        value={assetStatusFilter}
                        onChange={e => { setAssetStatusFilter(e.target.value); setAssetPage(1); }}
                        aria-label="Tapis mengikut status aset"
                        className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:border-corporate-teal-500 bg-white text-slate-700"
                      >
                        <option value="Semua">Semua Status Aset</option>
                        <option value="EDT">EDT · Tersedia Di Tangan</option>
                        <option value="EDR">EDR · Dalam Ar-Rahnu</option>
                        <option value="Dilelong">Dilelong · Keluar</option>
                      </select>

                      <select
                        value={assetSortBy}
                        onChange={e => setAssetSortBy(e.target.value as any)}
                        aria-label="Susun rekod aset"
                        className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:border-corporate-teal-500 bg-white text-slate-700"
                      >
                        <option value="newest">Terbaharu Didaftar</option>
                        <option value="weight_desc">Berat Tertinggi (g)</option>
                        <option value="price_desc">Harga Belian Tertinggi (RM)</option>
                        <option value="code_asc">No. Siri Kod (A-Z)</option>
                      </select>

                      {/* View Layout Toggle */}
                      <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => setAssetViewLayout('table')}
                          title="Paparan Jadual Penuh"
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                            assetViewLayout === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Jadual
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssetViewLayout('grid')}
                          title="Paparan Kad Grid Pantas"
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                            assetViewLayout === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Kad Grid
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Active Filter Tags */}
                  {(assetSearchQuery || assetSupplierFilter !== 'Semua' || assetWeightFilter !== 'Semua' || assetStatusFilter !== 'Semua') && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500 font-medium">Penapis aktif:</span>
                      {assetSearchQuery && (
                        <span className="rounded-lg bg-corporate-teal-50 px-2.5 py-0.5 text-corporate-teal-800 font-semibold border border-corporate-teal-200">
                          Carian: &quot;{assetSearchQuery}&quot;
                        </span>
                      )}
                      {assetSupplierFilter !== 'Semua' && (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-slate-700 font-semibold border border-slate-200">
                          Pembekal: {assetSupplierFilter}
                        </span>
                      )}
                      {assetWeightFilter !== 'Semua' && (
                        <span className="rounded-lg bg-amber-50 px-2.5 py-0.5 text-amber-800 font-semibold border border-amber-200">
                          Berat: {assetWeightFilter.replace(/_/g, ' ')}
                        </span>
                      )}
                      {assetStatusFilter !== 'Semua' && (
                        <span className="rounded-lg bg-sky-50 px-2.5 py-0.5 text-sky-800 font-semibold border border-sky-200">
                          Status: {assetStatusFilter}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setAssetSearchQuery('');
                          setAssetSupplierFilter('Semua');
                          setAssetWeightFilter('Semua');
                          setAssetStatusFilter('Semua');
                          setAssetPage(1);
                        }}
                        className="text-corporate-magenta-700 font-bold hover:underline text-[11px]"
                      >
                        Padam Semua Penapis
                      </button>
                    </div>
                  )}
                </div>

                {/* VIEW MODE 1: DATA TABLE VIEW */}
                {assetViewLayout === 'table' ? (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden w-full">
                    <div className="min-w-0 w-full overflow-x-auto overscroll-x-contain custom-scrollbar" role="region" aria-label="Jadual aset emas fizikal" tabIndex={0}>
                      <table className="w-full min-w-max text-left border-collapse whitespace-nowrap text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                            <th className="p-4 sm:px-6">No. Siri &amp; Kod Aset</th>
                            <th className="p-4">Tarikh &amp; Masa (MYT)</th>
                            <th className="p-4">Jenis Item</th>
                            <th className="p-4">Pembekal Emas</th>
                            <th className="p-4 text-center">Mutu Ketulenan</th>
                            <th className="p-4 text-right">Berat (g)</th>
                            <th className="p-4 text-right">Harga Kos Belian</th>
                            <th className="p-4 text-right">Nilai Pasaran Semasa</th>
                            <th className="p-4 text-center">Status Aset</th>
                            <th className="p-4 text-center">Tindakan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {paginatedAssetList.map((asset) => {
                            const isLockedInLedger = checkedInAssetIds.has(String(asset.id));
                            const assetStatusInfo = getAssetStatusBadge(asset);
                            const assetMarketVal = (parseFloat(asset.weight) || 0) * currentGoldPrice;
                            const assetGain = assetMarketVal - (parseFloat(asset.price) || 0);

                            return (
                              <tr key={asset.id} className="hover:bg-slate-50/70 transition-colors group">
                                {/* No. Siri & Kod Aset */}
                                <td className="p-4 sm:px-6">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-xs bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg shadow-xs inline-flex items-center gap-1.5">
                                      <Tag size={13} className="text-amber-600 shrink-0" />
                                      <span className="code-badge-label">{asset.code || generateAssetCode(asset.type, asset.supplier, asset.purity, asset.weight, asset.id)}</span>
                                    </span>
                                    {isLockedInLedger && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200" title="Aset sedang aktif dipautkan dalam transaksi lejar">
                                        <Lock size={11} className="text-corporate-teal-600" />
                                        <span>Terkunci SAG</span>
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Tarikh */}
                                <td className="p-4 text-slate-500 font-medium">
                                  {formatTransactionDateTime(asset.date)}
                                </td>

                                {/* Jenis Item */}
                                <td className="p-4 font-bold text-slate-800">
                                  {asset.type}
                                </td>

                                {/* Pembekal */}
                                <td className="p-4 text-slate-600">
                                  {asset.supplier || '-'}
                                </td>

                                {/* Ketulenan */}
                                <td className="p-4 text-center">
                                  <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 font-bold text-slate-800 font-mono text-[11px] border border-slate-200">
                                    {asset.purity || 'N/A'}
                                  </span>
                                </td>

                                {/* Berat (g) */}
                                <td className="p-4 text-right font-mono font-black text-slate-900 text-sm">
                                  {asset.weight}g
                                </td>

                                {/* Harga Kos Belian */}
                                <td className="p-4 text-right font-mono font-bold text-slate-600">
                                  {formatRM(asset.price)}
                                </td>

                                {/* Nilai Pasaran Semasa (Anti-Error Readout) */}
                                <td className="p-4 text-right font-mono">
                                  <span className="font-extrabold text-corporate-teal-800 text-xs block">
                                    {formatRM(assetMarketVal)}
                                  </span>
                                  <span className={`text-[10px] font-semibold block ${assetGain >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {assetGain >= 0 ? `+${formatRM(assetGain)}` : formatRM(assetGain)}
                                  </span>
                                </td>

                                {/* Status Aset (Consistent Color Badge) */}
                                <td className="p-4 text-center">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full ${assetStatusInfo.badgeClass}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${assetStatusInfo.dotClass}`} />
                                    <span>{assetStatusInfo.label}</span>
                                  </span>
                                </td>

                                {/* Tindakan */}
                                <td className="p-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleEditAsset(asset)}
                                      className="p-1.5 rounded-xl text-slate-400 hover:text-corporate-teal-600 hover:bg-corporate-teal-50 transition-colors"
                                      title="Edit Rekod Aset"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDuplicateAsset(asset)}
                                      className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                      title="Salin / Duplikasi Rekod Aset"
                                    >
                                      <Copy size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAsset(asset.id)}
                                      disabled={isLockedInLedger}
                                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                      title={isLockedInLedger ? 'Aset tidak boleh dipadam kerana sedang aktif dipautkan dalam lejar' : 'Hapus Rekod Aset'}
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                          {paginatedAssetList.length === 0 && (
                            <tr>
                              <td colSpan={10} className="p-8 text-center text-slate-400">
                                {visibleAssets.length === 0
                                  ? 'Tiada rekod aset didaftarkan. Tekan "Daftar Aset Emas" untuk bermula.'
                                  : 'Tiada aset emas sepadan dengan tapisan yang dipilih.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500">
                      <span>
                        Menunjukkan {filteredAssetList.length === 0 ? 0 : (assetPage - 1) * assetPageSize + 1} hingga {Math.min(assetPage * assetPageSize, filteredAssetList.length)} daripada {filteredAssetList.length} aset
                      </span>
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          disabled={assetPage <= 1}
                          onClick={() => setAssetPage(p => Math.max(1, p - 1))}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40"
                        >
                          Sebelumnya
                        </button>
                        <span className="font-bold text-slate-800 px-2">
                          {assetPage} / {totalAssetPages}
                        </span>
                        <button
                          type="button"
                          disabled={assetPage >= totalAssetPages}
                          onClick={() => setAssetPage(p => Math.min(totalAssetPages, p + 1))}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40"
                        >
                          Seterusnya
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* VIEW MODE 2: CARD GRID VIEW */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {paginatedAssetList.map((asset) => {
                        const assetStatusInfo = getAssetStatusBadge(asset);
                        const isLockedInLedger = checkedInAssetIds.has(String(asset.id));
                        const assetMarketVal = (parseFloat(asset.weight) || 0) * currentGoldPrice;
                        const assetGain = assetMarketVal - (parseFloat(asset.price) || 0);

                        return (
                          <div
                            key={asset.id}
                            className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                                <div>
                                  <span className="font-mono text-xs font-black bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md inline-block">
                                    {asset.code || generateAssetCode(asset.type, asset.supplier, asset.purity, asset.weight, asset.id)}
                                  </span>
                                  <p className="text-xs font-bold text-slate-800 mt-1">{asset.type} · Mutu {asset.purity}</p>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full ${assetStatusInfo.badgeClass}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${assetStatusInfo.dotClass}`} />
                                  <span>{assetStatusInfo.label}</span>
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-3 py-3 text-xs border-b border-slate-100">
                                <div>
                                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Berat Bersih</span>
                                  <span className="font-mono font-black text-slate-900 text-sm">{asset.weight}g</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Pembekal</span>
                                  <span className="font-semibold text-slate-700 text-xs truncate block">{asset.supplier || '-'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Kos Belian Asal</span>
                                  <span className="font-mono font-bold text-slate-600 text-xs">{formatRM(asset.price)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Nilai Pasaran Live</span>
                                  <span className="font-mono font-extrabold text-corporate-teal-800 text-xs">{formatRM(assetMarketVal)}</span>
                                </div>
                              </div>

                              <div className="pt-2.5 flex items-center justify-between text-xs">
                                <span className="text-slate-500 font-medium">Perbezaan Nilai:</span>
                                <span className={`font-bold font-mono ${assetGain >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {assetGain >= 0 ? `+${formatRM(assetGain)}` : formatRM(assetGain)}
                                </span>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[11px] text-slate-400 font-mono">
                                {formatTransactionDateTime(asset.date)}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditAsset(asset)}
                                  className="p-1.5 rounded-xl text-slate-500 hover:text-corporate-teal-600 hover:bg-corporate-teal-50"
                                  title="Edit"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateAsset(asset)}
                                  className="p-1.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                  title="Duplikasi"
                                >
                                  <Copy size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAsset(asset.id)}
                                  disabled={isLockedInLedger}
                                  className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                                  title={isLockedInLedger ? 'Terkunci dalam transaksi SAG' : 'Padam'}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination for Grid View */}
                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/80 text-xs text-slate-500">
                      <span>{filteredAssetList.length} rekod aset emas dijumpai</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={assetPage <= 1}
                          onClick={() => setAssetPage(p => Math.max(1, p - 1))}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40"
                        >
                          Sebelumnya
                        </button>
                        <span className="font-bold text-slate-800 px-2">{assetPage} / {totalAssetPages}</span>
                        <button
                          type="button"
                          disabled={assetPage >= totalAssetPages}
                          onClick={() => setAssetPage(p => Math.min(totalAssetPages, p + 1))}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40"
                        >
                          Seterusnya
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Keyboard Accessibility & Anti-Error Guide */}
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">Pintasan Papan Kekunci Pantas:</span>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                      /
                    </span>
                    <span>Fokus Carian Aset</span>
                    <span className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                      Alt + A
                    </span>
                    <span>Daftar Aset Baharu</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Aset bertanda &quot;Terkunci SAG&quot; dilindungi daripada pemadaman tidak sengaja.
                  </span>
                </div>
              </div>
            );
          })()}

          {/* TAB: SUPPLIER MAINTENANCE */}
          {activeTab === 'suppliers' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center">
                    <Store className="mr-2 text-emerald-600" size={20} /> Penyelenggaraan Pembekal Emas
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Urus kod, kategori, produk dan maklumat pembekal untuk rekod aset.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                  <label className="relative w-full sm:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={supplierSearch}
                      onChange={event => setSupplierSearch(event.target.value)}
                      placeholder="Cari kod atau pembekal..."
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </label>
                  <button
                    onClick={handleResetSuppliers}
                    className="justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-lg font-semibold flex items-center transition-colors text-xs border border-slate-200"
                    title="Muat semula senarai 10 pembekal asal"
                  >
                    <RotateCcw size={15} className="mr-1.5" /> Reset
                  </button>
                  <button
                    onClick={() => { setEditingSupplier(null); setIsSupplierModalOpen(true); }}
                    className="justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center transition-colors shadow-sm text-sm"
                  >
                    <Plus size={18} className="mr-1.5" /> Tambah Pembekal
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Jumlah Pembekal</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{visibleSuppliers.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Store size={20} /></div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Hasil Carian</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{filteredSuppliers.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Search size={20} /></div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden w-full">
                <div className="min-w-0 w-full overflow-x-auto overscroll-x-contain" role="region" aria-label="Jadual pembekal; leret ke sisi untuk melihat semua lajur" tabIndex={0}>
                  <table className="w-full min-w-max text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                        <th className="p-4">Kod</th>
                        <th className="p-4">Nama Pembekal</th>
                        <th className="p-4">Kategori</th>
                        <th className="p-4">Produk</th>
                        <th className="p-4">Laman Web</th>
                        <th className="p-4">Catatan</th>
                        <th className="p-4 text-center">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSuppliers.map(supplier => (
                        <tr key={supplier.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-4"><span className="font-mono font-bold text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-md"><span className="code-badge-label">{supplier.code}</span></span></td>
                          <td className="p-4 font-bold text-slate-800">{supplier.name}</td>
                          <td className="p-4"><span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">{supplier.category || '-'}</span></td>
                          <td className="p-4 text-sm text-slate-600 max-w-xs truncate" title={supplier.products}>{supplier.products || '-'}</td>
                          <td className="p-4">
                            {supplier.website ? <a href={supplier.website} target="_blank" rel="noreferrer" className="text-emerald-700 hover:text-emerald-900 text-sm inline-flex items-center gap-1">{supplier.website.replace(/^https?:\/\//, '')}<ExternalLink size={13} /></a> : <span className="text-slate-400">-</span>}
                          </td>
                          <td className="p-4 text-xs text-slate-500 max-w-xs truncate" title={supplier.remarks}>{supplier.remarks || '-'}</td>
                          <td className="p-4 text-center whitespace-nowrap">
                            <button onClick={() => handleEditSupplier(supplier)} className="text-slate-400 hover:text-emerald-600 transition-colors p-2 rounded-lg hover:bg-emerald-50" title="Kemaskini pembekal"><Pencil size={18} /></button>
                            <button onClick={() => handleDeleteSupplier(supplier.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50" title="Padam pembekal"><Trash2 size={18} /></button>
                          </td>
                        </tr>
                      ))}
                      {filteredSuppliers.length === 0 && (
                        <tr><td colSpan="7" className="p-8 text-center text-slate-400">Tiada pembekal ditemui. Tambah pembekal baharu atau ubah carian.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: INSTITUTIONS (MAINTENANCE) */}
          {activeTab === 'institutions' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center">
                    <Building2 className="mr-2 text-emerald-600" size={20} /> Senarai Institusi & Koperasi (Bangi)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Penyelenggaraan kadar marhun (RM/g), margin pinjaman (%) dan maklumat cawangan koperasi/pajak gadai.</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Anggaran = harga spot emas live + spread setiap institusi; bukan kadar rasmi. Sumber:{' '}
                    <a href="https://api.gold-api.com/price/XAU" target="_blank" rel="noreferrer" className="underline">Gold API</a>
                    {' '}dan{' '}
                    <a href="https://open.er-api.com/v6/latest/USD" target="_blank" rel="noreferrer" className="underline">ExchangeRate-API</a>.
                    {' '}Sila sahkan spread dengan institusi.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleRefresh()}
                    disabled={isRefreshing || visibleInstitutions.length === 0}
                    className="flex-1 sm:flex-none justify-center bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3.5 py-2.5 rounded-lg font-semibold flex items-center transition-colors text-xs shadow-sm"
                    title="Segar semula anggaran kadar untuk semua institusi"
                  >
                    <RefreshCw size={15} className={`mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Mengambil harga...' : 'Segar Semula Semua'}
                  </button>
                  <button
                    onClick={handleResetInstitutions}
                    className="flex-1 sm:flex-none justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-lg font-semibold flex items-center transition-colors text-xs shadow-sm border border-slate-200"
                    title="Muat semula senarai 5 institusi asal Bangi"
                  >
                    <RotateCcw size={15} className="mr-1.5" /> Reset Bangi
                  </button>
                  <button
                    onClick={() => {
                      setEditingInstitution(null);
                      setIsInstitutionModalOpen(true);
                    }}
                    className="flex-1 sm:flex-none justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center transition-colors shadow-sm text-sm"
                  >
                    <Plus size={18} className="mr-1.5" /> Tambah Institusi
                  </button>
                </div>
              </div>

              {/* Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Institusi Berdaftar</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{visibleInstitutions.length} Koperasi/Pajak</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Building2 size={20} />
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Margin Tertinggi</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">
                      {visibleInstitutions.length > 0 ? Math.max(...visibleInstitutions.map(i => i.maxMargin)) : 0}%
                    </p>
                    <p className="text-xs text-slate-500">Sesuai Over-Lap (OL)</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <TrendingUp size={20} />
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Marhun Tertinggi</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">
                      RM {visibleInstitutions.length > 0 ? Math.max(...visibleInstitutions.map(i => i.marhunRate)).toFixed(2) : '0.00'}
                    </p>
                    <p className="text-xs text-slate-500">Sesuai Salin / Parking</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Scale size={20} />
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Purata Marhun Semasa</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">
                      RM {visibleInstitutions.length > 0 ? (visibleInstitutions.reduce((sum, institution) => sum + institution.marhunRate, 0) / visibleInstitutions.length).toFixed(2) : '0.00'}
                    </p>
                    <p className="text-xs text-slate-500">Benchmark pasaran Bangi</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Wallet size={20} />
                  </div>
                </div>
              </div>

              {/* Institutions Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden w-full">
                <div className="min-w-0 w-full overflow-x-auto overscroll-x-contain" role="region" aria-label="Jadual institusi; leret ke sisi untuk melihat semua lajur" tabIndex={0}>
                  <table className="w-full min-w-max text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm font-semibold uppercase tracking-wider">
                        <th className="p-4">Nama Institusi / Koperasi</th>
                        <th className="p-4">Kategori</th>
                        <th className="p-4">Cawangan / Lokasi</th>
                        <th className="p-4 text-center">Margin Max (%)</th>
                        <th className="p-4 text-right">Kadar Marhun (RM/g)</th>
                        <th className="p-4">Strategi AI EGM</th>
                        <th className="p-4">Catatan</th>
                        <th className="p-4 text-center">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleInstitutions.map((inst) => {
                        const is80 = inst.maxMargin >= 80;
                        const is70 = inst.maxMargin === 70;
                        return (
                          <tr key={inst.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${is80 ? 'bg-emerald-100 text-emerald-700' : is70 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                  <Building2 size={18} />
                                </div>
                                <div>
                                  <span className="font-bold text-slate-800 text-sm block">{inst.name}</span>
                                  <span className="text-xs text-slate-400 font-mono">ID: #{inst.id}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {inst.category || 'Koperasi'}
                              </span>
                            </td>
                            <td className="p-4 text-slate-600 text-sm">
                              <div className="flex items-center">
                                <MapPin size={14} className="text-slate-400 mr-1.5 shrink-0" />
                                <span>{inst.branch || 'Bangi'}</span>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`inline-block px-3 py-1 text-xs font-black rounded-full ${
                                is80 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                  : is70 
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-blue-100 text-blue-800 border border-blue-300'
                              }`}>
                                {inst.maxMargin}%
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <span className="font-mono font-bold text-slate-900 text-base">
                                RM {Number(inst.marhunRate).toFixed(2)}
                              </span>
                              <span className="text-xs text-slate-400">/g</span>
                              <div className="text-xs text-slate-500">
                                Spot RM{Number(inst.marhunSpotPrice ?? currentGoldPrice).toFixed(2)} + RM{Number(inst.marhunSpread || 0).toFixed(2)} spread
                              </div>
                              {inst.marhunUpdatedAt && (
                                <div className="text-[0.625rem] text-slate-400" title={`Gold quote: ${inst.goldSpotUpdatedAt || '-'}; MYR FX: ${inst.exchangeRateUpdatedAt || '-'}`}>
                                  Dikemas kini {new Date(inst.marhunUpdatedAt).toLocaleString('ms-MY')}
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-md inline-flex items-center space-x-1 ${
                                is80 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : is70 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                <span>{is80 ? '⚡ Sesuai Over-Lap (80%)' : is70 ? '🔄 Sesuai Salin / Parking' : '⚖️ Pusingan Margin 75%'}</span>
                              </span>
                            </td>
                            <td className="p-4 text-xs text-slate-500 max-w-xs truncate" title={inst.remarks}>
                              {inst.remarks || '-'}
                            </td>
                            <td className="p-4 text-center space-x-1">
                              <button
                                onClick={() => handleRefresh(inst.id)}
                                disabled={isRefreshing}
                                className="text-slate-400 hover:text-blue-600 disabled:opacity-50 transition-colors p-2 rounded-lg hover:bg-blue-50"
                                title={`Refresh anggaran kadar ${inst.name}`}
                              >
                                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                              </button>
                              <button
                                onClick={() => handleEditInstitution(inst)}
                                className="text-slate-400 hover:text-emerald-600 transition-colors p-2 rounded-lg hover:bg-emerald-50"
                                title="Edit Maklumat Institusi"
                              >
                                <Pencil size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteInstitution(inst.id)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                                title="Padam Institusi"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {visibleInstitutions.length === 0 && (
                        <tr>
                          <td colSpan="8" className="p-8 text-center text-slate-400">Tiada institusi didaftarkan. Sila klik "Reset Bangi" atau "Tambah Institusi".</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: AI PREDICTIONS */}
          {activeTab === 'ai' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Modern Cyber-FinTech AI Telemetry Hub */}
              <div className="relative overflow-hidden rounded-3xl border border-corporate-teal-700/50 bg-gradient-to-br from-slate-900 via-corporate-green-950 to-slate-900 p-6 sm:p-8 text-white shadow-2xl">
                {/* Ambient glow effects */}
                <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-corporate-teal-400/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-corporate-magenta-500/10 blur-3xl" />
                <div className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 opacity-5">
                  <BrainCircuit size={320} />
                </div>

                <div className="relative z-10">
                  {/* Top Status & Controls Toolbar */}
                  <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-2 rounded-full border border-corporate-teal-500/40 bg-corporate-teal-950/80 px-3.5 py-1.5 text-xs font-bold text-corporate-teal-200 shadow-inner backdrop-blur-md">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                        </span>
                        <span className="tracking-wide">ANALISIS BERASASKAN DATA</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 backdrop-blur-md">
                        <Globe size={13} className="text-corporate-teal-300" />
                        <span>Gold API + ExchangeRate-API</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleRefresh()}
                        disabled={isRefreshing}
                        className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl border border-corporate-teal-400/50 bg-corporate-teal-600 hover:bg-corporate-teal-500 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-lg shadow-corporate-teal-950/40 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                        <span>{isRefreshing ? 'Mengemas kini...' : 'Kemas kini harga'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportAnalyticsCSV}
                        className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white backdrop-blur-md transition-all active:scale-95"
                      >
                        <DownloadCloud size={14} />
                        <span>Laporan CSV</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAiMethodology(prev => !prev)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/15 px-3 py-2 text-xs font-semibold text-slate-300 backdrop-blur-md transition-all"
                        title="Papar penerangan metodologi sistem"
                      >
                        <Info size={14} />
                        <span>{showAiMethodology ? 'Tutup Nota' : 'Nota Sistem'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Title & Introduction */}
                  <div className="mt-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-corporate-teal-300 mb-1">
                        <Zap size={14} className="text-amber-400" />
                        <span>Predictive Intelligence &amp; Portfolio Health</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                        Ramalan dan Cadangan Portfolio
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                        Sistem menganalisis harga pasaran harian, kelayakan tebus surat gadaian, dan simulasi penstrukturan semula portfolio Ar-Rahnu.
                      </p>
                    </div>
                  </div>

                  {/* Telemetry KPI Cards Grid */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Card 1: Harga Spot Emas */}
                    <div className="relative overflow-hidden rounded-2xl border border-corporate-teal-500/30 bg-gradient-to-b from-white/10 to-white/5 p-4 backdrop-blur-md">
                      <div className="flex items-center justify-between text-corporate-teal-200">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Harga Spot Semasa</span>
                        <TrendingUp size={16} className="text-emerald-400" />
                      </div>
                      <p className="mt-2 text-2xl sm:text-3xl font-black text-white">
                        RM {currentGoldPrice.toFixed(2)}
                        <span className="text-xs sm:text-sm font-semibold text-slate-300">/g</span>
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-corporate-teal-200">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                        <span>Asas kiraan marhun live</span>
                      </div>
                    </div>

                    {/* Card 2: Unjuran 12 Minggu */}
                    <div className="relative overflow-hidden rounded-2xl border border-corporate-magenta-500/30 bg-gradient-to-b from-white/10 to-white/5 p-4 backdrop-blur-md">
                      <div className="flex items-center justify-between text-corporate-magenta-200">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Unjuran 12 Minggu</span>
                        <Activity size={16} className="text-corporate-magenta-300" />
                      </div>
                      <p className="mt-2 text-2xl sm:text-3xl font-black text-amber-300">
                        {twelveWeekGoldEstimate === null ? (
                          <span className="text-lg sm:text-xl font-bold text-slate-300">Belum tersedia</span>
                        ) : (
                          <>
                            RM {twelveWeekGoldEstimate.toFixed(2)}
                            <span className="text-xs sm:text-sm font-semibold text-amber-200">/g</span>
                          </>
                        )}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-300">
                        {twelveWeekGoldEstimate !== null ? (
                          <span className="text-emerald-300 font-semibold">Regresi linear 30 snapshot</span>
                        ) : (
                          <span className="text-amber-300">Perlu min. 7 snapshot harian</span>
                        )}
                      </div>
                    </div>

                    {/* Card 3: Snapshot Pasaran */}
                    <div className="relative overflow-hidden rounded-2xl border border-sky-400/30 bg-gradient-to-b from-white/10 to-white/5 p-4 backdrop-blur-md">
                      <div className="flex items-center justify-between text-sky-200">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Snapshot Harga</span>
                        <BarChart3 size={16} className="text-sky-300" />
                      </div>
                      <p className="mt-2 text-2xl sm:text-3xl font-black text-white">
                        {goldPriceHistory.length}
                        <span className="text-xs sm:text-sm font-semibold text-slate-300"> hari</span>
                      </p>
                      <div className="mt-2">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                          <div
                            className="h-full rounded-full bg-sky-400 transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.round((goldPriceHistory.length / 7) * 100))}%` }}
                          />
                        </div>
                        <span className="mt-1 block text-[10px] text-slate-300">
                          {goldPriceHistory.length >= 7 ? 'Baseline 7 hari dicapai' : `${7 - goldPriceHistory.length} hari lagi untuk aktifkan ramalan`}
                        </span>
                      </div>
                    </div>

                    {/* Card 4: Skor Kesiapsiagaan Purata */}
                    <div className="relative overflow-hidden rounded-2xl border border-corporate-teal-400/30 bg-gradient-to-b from-white/10 to-white/5 p-4 backdrop-blur-md">
                      <div className="flex items-center justify-between text-corporate-teal-200">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Skor Kesiapsiagaan</span>
                        <ShieldCheck size={16} className="text-corporate-teal-300" />
                      </div>
                      <p className="mt-2 text-2xl sm:text-3xl font-black text-white">
                        {averageRiskScore === null ? (
                          <span className="text-lg sm:text-xl font-bold text-slate-300">Belum dikira</span>
                        ) : (
                          `${averageRiskScore}/100`
                        )}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                        {averageRiskScore === null ? (
                          <span className="text-slate-400">Isi data tunai di bawah</span>
                        ) : averageRiskScore >= 80 ? (
                          <span className="text-emerald-300 font-bold">● Tahap Bersedia</span>
                        ) : averageRiskScore >= 60 ? (
                          <span className="text-amber-300 font-bold">● Perlu Semakan</span>
                        ) : (
                          <span className="text-rose-300 font-bold">● Perlu Perhatian</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Methodology Info Panel */}
                  {showAiMethodology && (
                    <div className="mt-5 rounded-2xl border border-white/15 bg-slate-950/70 p-4 sm:p-5 text-xs text-slate-300 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-corporate-teal-300 flex items-center gap-1.5">
                          <Info size={14} /> Metodologi Pengiraan &amp; Penafian
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowAiMethodology(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <ul className="space-y-1.5 leading-relaxed list-disc pl-4 text-slate-300">
                        <li><strong>Snapshot Harian:</strong> Sistem menyimpan satu snapshot harga bagi setiap hari apabila anda menekan &ldquo;Kemas kini harga&rdquo;.</li>
                        <li><strong>Unjuran Trend:</strong> Ramalan hanya muncul selepas sekurang-kurangnya 7 hari data menggunakan trend linear ringkas daripada sehingga 30 snapshot terkini, bukan jaminan harga pasaran.</li>
                        <li><strong>Kadar Institusi:</strong> Nilai marhun ialah anggaran spot + spread tersimpan; sentiasa sahkan kadar dan caj sebenar dengan pihak institusi.</li>
                        <li><strong>AI Score:</strong> Skor mengukur kesiapsiagaan tebus (tempoh matang, nisbah tunai, nisbah EDT/EDR dan kelengkapan data), bukan model machine learning atau jaminan kelulusan.</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION: AI Presumption, Predictive & Score Surat Gadaian */}
              <section className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-corporate-teal-600 mb-1">
                      <Layers size={14} />
                      <span>Surat Gadaian Telemetry</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800">
                      AI Presumption, AI Predictive &amp; AI Score Surat Gadaian
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                      Membandingkan nilai semasa anggaran (berat × kadar institusi) dengan nilai asas surat (pembiayaan ÷ margin) serta unjuran trend 12 minggu.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => setSagFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        sagFilter === 'all'
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Semua ({sagAiIndicators.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSagFilter('overlap')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        sagFilter === 'overlap'
                          ? 'bg-corporate-teal-500 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Potensi Overlap ({sagAiIndicators.filter(i => i.presumption === 'Potensi overlap').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSagFilter('shortfall')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        sagFilter === 'shortfall'
                          ? 'bg-corporate-magenta-500 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Shortfall ({sagAiIndicators.filter(i => i.presumption === 'Petunjuk shortfall').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSagFilter('ready')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        sagFilter === 'ready'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Skor &ge; 80 ({sagAiIndicators.filter(i => (i.readinessScore ?? 0) >= 80).length})
                    </button>
                  </div>
                </div>

                {filteredSagAiIndicators.length === 0 ? (
                  <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200/60 p-8 text-center">
                    <BrainCircuit size={32} className="mx-auto text-slate-400 mb-2" />
                    <p className="font-semibold text-slate-700">
                      {sagAiIndicators.length === 0 ? 'Tiada surat aktif untuk dianalisis.' : 'Tiada rekod sepadan dengan tapisan yang dipilih.'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {sagAiIndicators.length === 0 ? 'Daftarkan transaksi aktif di lejar untuk melihat analisa automatik.' : 'Pilih tapisan "Semua" untuk melihat kembali senarai surat.'}
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredSagAiIndicators.map(indicator => {
                      const isOverlap = indicator.presumption === 'Potensi overlap';
                      const isShortfall = indicator.presumption === 'Petunjuk shortfall';
                      const score = indicator.readinessScore;

                      return (
                        <article
                          key={indicator.transaction.id}
                          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-corporate-teal-400 hover:shadow-md"
                        >
                          <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                            isOverlap ? 'bg-corporate-teal-500' : isShortfall ? 'bg-corporate-magenta-500' : 'bg-slate-300'
                          }`} />

                          <div>
                            {/* Card Top Title */}
                            <div className="flex items-start justify-between gap-2 pt-1">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-extrabold text-slate-900">
                                    Surat #{indicator.transaction.refNo || 'N/A'}
                                  </span>
                                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                                    {indicator.transaction.status || 'Aktif'}
                                  </span>
                                </div>
                                <p className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1">
                                  <Building2 size={12} className="text-slate-400" />
                                  <span>{indicator.transaction.institution || 'Institusi belum dipilih'}</span>
                                </p>
                              </div>

                              {/* Readiness Score Badge */}
                              <div className="text-right">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${
                                  score === null
                                    ? 'bg-slate-100 text-slate-600'
                                    : score >= 80
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : score >= 60
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-rose-100 text-rose-800'
                                }`}>
                                  <ShieldCheck size={12} />
                                  <span>{score === null ? 'N/A' : `${score}/100`}</span>
                                </span>
                              </div>
                            </div>

                            {/* Readiness Mini Bar */}
                            {score !== null && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                                  <span>Kesiapsiagaan tebus</span>
                                  <span className="font-bold text-slate-700">
                                    {score >= 80 ? 'Bersedia' : score >= 60 ? 'Perlu Semakan' : 'Perlu Perhatian'}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Metric Grid: Presumption & Predictive */}
                            <div className="mt-4 space-y-3 divide-y divide-slate-100">
                              {/* Presumption Block */}
                              <div className="pt-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    AI Presumption
                                  </span>
                                  <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                                    isOverlap ? 'text-corporate-teal-700' : isShortfall ? 'text-corporate-magenta-700' : 'text-slate-700'
                                  }`}>
                                    {isOverlap ? <ArrowUpRight size={14} /> : isShortfall ? <ArrowDownRight size={14} /> : null}
                                    <span>{indicator.presumption}</span>
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-600 leading-normal">
                                  {indicator.currentMarhunValue === null || indicator.impliedLetterValue === null
                                    ? 'Lengkapkan nilai surat dan kadar institusi untuk perbandingan.'
                                    : (
                                      <>
                                        Anggaran Semasa <strong className="text-slate-800">{formatRM(indicator.currentMarhunValue)}</strong> vs Asas Surat <strong className="text-slate-800">{formatRM(indicator.impliedLetterValue)}</strong>
                                        {indicator.estimatedCashBeforeNewFees !== null && (
                                          <span className="block mt-0.5 text-[11px] text-slate-500">
                                            Baki sebelum fi: <span className={indicator.estimatedCashBeforeNewFees >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                                              {indicator.estimatedCashBeforeNewFees >= 0 ? `+${formatRM(indicator.estimatedCashBeforeNewFees)}` : formatRM(indicator.estimatedCashBeforeNewFees)}
                                            </span>
                                          </span>
                                        )}
                                      </>
                                    )}
                                </p>
                              </div>

                              {/* Predictive Block */}
                              <div className="pt-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    Unjuran 12 Minggu
                                  </span>
                                </div>
                                <p className="mt-1 text-xs font-medium text-slate-700">
                                  {indicator.prediction || 'Belum tersedia — kumpulkan 7 snapshot harga.'}
                                </p>
                                {indicator.projectedMarhunValue !== null && (
                                  <p className="mt-1 text-[11px] text-slate-500">
                                    Nilai unjuran: <strong className="text-slate-700">{formatRM(indicator.projectedMarhunValue)}</strong>
                                    {indicator.projectedFinancing !== null && ` · Pinjaman unjuran ${formatRM(indicator.projectedFinancing)}`}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Mismatch Alert Box */}
                          {indicator.marhunValueMismatch && (
                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs font-semibold text-amber-900 flex items-start gap-1.5">
                              <AlertCircle size={14} className="text-amber-700 shrink-0 mt-0.5" />
                              <span>Nilai marhun berbeza daripada pembiayaan ÷ margin. Semak angka surat.</span>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* SECTION: AI Forecast Chart & Makcik AI Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* AI Forecast Chart */}
                <div className="min-w-0 lg:col-span-2 bg-white p-5 sm:p-7 rounded-3xl shadow-sm border border-slate-200/80">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center">
                        <TrendingUp className="mr-2 text-corporate-teal-600" size={20} />
                        Harga Spot &amp; Unjuran Linear 12 Minggu
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Trend harga spot emas harian (RM/g) serta unjuran regresi linear
                      </p>
                    </div>
                    <span className="self-start sm:self-auto rounded-full bg-corporate-teal-50 px-3 py-1 text-xs font-bold text-corporate-teal-700 border border-corporate-teal-100">
                      {dynamicAiData.length} data point direkod
                    </span>
                  </div>

                  {dynamicAiData.length === 0 ? (
                    <div className="h-72 sm:h-80 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-50 px-6 text-center border border-slate-100">
                      <BarChart3 size={36} className="text-slate-400" />
                      <p className="font-semibold text-slate-700">Belum ada snapshot harga.</p>
                      <p className="max-w-md text-xs text-slate-500 leading-relaxed">
                        Tekan butang &ldquo;Kemas kini harga&rdquo; di atas untuk mengambil harga live dan membina rekod harian.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="h-72 sm:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dynamicAiData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.7} />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={10} />
                            <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                            <Tooltip
                              formatter={value => [formatRM(Number(value)), 'Harga spot']}
                              contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                            <Line type="monotone" dataKey="actual" name="Snapshot Sebenar" stroke="#047ea0" strokeWidth={3} dot={{ r: 4, fill: '#047ea0', strokeWidth: 2, stroke: '#fff' }} connectNulls />
                            <Line type="monotone" dataKey="predicted" name="Trend Linear" stroke="#cf3983" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 3, fill: '#cf3983', strokeWidth: 2, stroke: '#fff' }} connectNulls />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 flex items-center justify-between gap-2">
                        <span>
                          {goldForecastAvailable
                            ? 'Unjuran dikira daripada sehingga 30 snapshot harian terkini.'
                            : `Ramalan memerlukan min. 7 snapshot harian. Rekod semasa: ${goldPriceHistory.length}.`}
                        </span>
                        <span className="font-semibold text-slate-700 shrink-0">Model Regresi Linear</span>
                      </div>
                    </>
                  )}
                </div>

                {/* AI Actionable Insights (Makcik AI) */}
                <div className="min-w-0 bg-white p-5 sm:p-7 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center">
                      <Sparkles className="mr-2 text-corporate-magenta-500" size={20} />
                      Makcik AI Advisor
                    </h3>
                    <span className="rounded-full bg-corporate-magenta-100 px-2.5 py-0.5 text-xs font-black text-corporate-magenta-800">
                      {systemIndicators.length} Perhatian
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">Rules &amp; Indicators pintar untuk lindungi portfolio acik</p>

                  <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar max-h-[380px]">
                    {systemIndicators.length === 0 && (
                      <div className="p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 border border-emerald-200 rounded-2xl text-center space-y-3 shadow-sm animate-in fade-in duration-300">
                        <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                          <CheckCircle2 size={26} />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">Tiada indikator tindakan aktif</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Tiada peraturan amaran yang dicetuskan sekarang. Portfolio dalam keadaan teratur.
                        </p>
                        <div className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded-full border border-emerald-300">
                          <ShieldCheck size={12} className="text-emerald-600" />
                          <span>Status Sihat</span>
                        </div>
                      </div>
                    )}

                    {systemIndicators.map((indicator) => {
                      const styles = indStyles[indicator.color];
                      return (
                        <div key={indicator.id} className={`p-4 border ${styles.border} ${styles.bg} rounded-2xl relative overflow-hidden group shadow-sm transition-all hover:shadow`}>
                          <div className={`absolute top-0 left-0 w-1.5 h-full ${styles.strip}`}></div>
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <span className={`text-[11px] font-bold ${styles.text} ${styles.badgeBg} px-2.5 py-0.5 rounded-full`}>
                              {indicator.badge}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-slate-500 text-right shrink-0">
                              Surat #{indicator.ticket}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm mb-1">{indicator.title}</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">{indicator.desc}</p>
                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={() => handleResolveIndicator(indicator)}
                              className="text-xs font-bold px-3 py-1.5 bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80 rounded-xl transition-all shadow-sm flex items-center space-x-1.5"
                            >
                              {indicator.type === 'RATIO' ? <Plus size={13} /> : <ArrowRightLeft size={13} />}
                              <span>{indicator.type === 'RATIO' ? 'Tambah aset' : 'Rekod tindakan'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION: AI Score Kesiapsiagaan & Kedudukan Kewangan */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left (2 cols): AI Score Kesiapsiagaan */}
                <div className="lg:col-span-2 min-w-0 bg-white p-5 sm:p-7 rounded-3xl shadow-sm border border-slate-200/80">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-100 pb-5">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-corporate-teal-600 mb-1">
                        <ShieldCheck size={14} />
                        <span>Kesiapsiagaan Penebusan</span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-800">
                        AI Score Kesiapsiagaan Tebus
                      </h3>
                      <p className="mt-1 text-xs sm:text-sm text-slate-500">
                        Skor heuristik bagi setiap surat aktif menggunakan data surat dan kewangan portfolio.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-3 text-center sm:text-right shrink-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Purata Portfolio</p>
                      <p className="mt-0.5 text-2xl font-black text-slate-800">
                        {averageRiskScore === null ? 'Belum dikira' : `${averageRiskScore}/100`}
                      </p>
                    </div>
                  </div>

                  {/* 4 Pillars Visual Pill */}
                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-corporate-teal-50/60 border border-corporate-teal-100 p-2.5">
                      <span className="font-extrabold text-corporate-teal-800">30 Mata</span>
                      <p className="text-[11px] text-corporate-teal-600 mt-0.5">Tempoh Matang</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-2.5">
                      <span className="font-extrabold text-emerald-800">35 Mata</span>
                      <p className="text-[11px] text-emerald-600 mt-0.5">Tunai vs Tebus</p>
                    </div>
                    <div className="rounded-xl bg-sky-50/60 border border-sky-100 p-2.5">
                      <span className="font-extrabold text-sky-800">20 Mata</span>
                      <p className="text-[11px] text-sky-600 mt-0.5">Nisbah EDT/EDR</p>
                    </div>
                    <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-2.5">
                      <span className="font-extrabold text-amber-800">15 Mata</span>
                      <p className="text-[11px] text-amber-600 mt-0.5">Kelengkapan Data</p>
                    </div>
                  </div>

                  {/* Ticket List */}
                  <div className="mt-5 space-y-2.5">
                    {riskScores.length === 0 ? (
                      <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                        Tiada surat aktif untuk dinilai.
                      </p>
                    ) : riskScores.map(({ transaction, daysRemaining, score }) => (
                      <div key={transaction.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 transition-all hover:bg-slate-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-800 text-sm">
                              Surat #{transaction.refNo || 'tanpa nombor'}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              · {transaction.institution || 'Institusi belum dipilih'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {daysRemaining === null
                              ? 'Tarikh matang belum diisi'
                              : daysRemaining < 0
                                ? <span className="text-rose-600 font-bold">Lewat {Math.abs(daysRemaining)} hari</span>
                                : daysRemaining === 0
                                  ? <span className="text-amber-600 font-bold">Matang hari ini</span>
                                  : <span>Baki {daysRemaining} hari</span>}
                            {' · Jumlah tebus '}<strong className="text-slate-700">{formatRM(getCurrentRedemption(transaction))}</strong>
                          </p>
                        </div>
                        <span className={`self-start sm:self-auto rounded-full px-3 py-1 text-xs font-black ${
                          score === null
                            ? 'bg-slate-200 text-slate-600'
                            : score >= 80
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : score >= 60
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {score === null
                            ? 'Masukkan tunai tersedia'
                            : `${score}/100 · ${score >= 80 ? 'Bersedia' : score >= 60 ? 'Perlu semakan' : 'Perlu perhatian'}`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Recommendations */}
                  <div className="mt-5 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/50 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-700" /> Cadangan Tindakan AI
                    </h4>
                    <ul className="mt-2 space-y-1.5 text-xs text-amber-900 leading-relaxed">
                      {cashOnHand === null && <li>• Masukkan angka tunai tersedia di sebelah untuk mengira keupayaan menebus surat.</li>}
                      {cashOnHand !== null && cashOnHand < activeRedemptionTotal && (
                        <li>• Tunai yang direkod kurang <strong>{formatRM(activeRedemptionTotal - cashOnHand)}</strong> daripada jumlah tebus surat aktif.</li>
                      )}
                      {monthlyExpenses !== null && cashOnHand !== null && cashOnHand < monthlyExpenses * 3 && (
                        <li>• Dana tunai belum mencapai penanda kecemasan 3 bulan (<strong>{formatRM(monthlyExpenses * 3)}</strong>).</li>
                      )}
                      {riskScores.some(item => item.daysRemaining !== null && item.daysRemaining <= 7) && (
                        <li>• Terdapat surat yang matang dalam 7 hari atau sudah lewat; sahkan segera jumlah tebus rasmi di kaunter institusi.</li>
                      )}
                      {activePortfolioTransactions.length > 0 && cashOnHand !== null && cashOnHand >= activeRedemptionTotal &&
                        !(monthlyExpenses !== null && cashOnHand < monthlyExpenses * 3) &&
                        !riskScores.some(item => item.daysRemaining !== null && item.daysRemaining <= 7) && (
                          <li>• Tunai yang direkod meliputi jumlah tebus aktif. Portfolio berada pada zon selamat.</li>
                        )}
                    </ul>
                  </div>
                </div>

                {/* Right (1 col): Kedudukan Kewangan */}
                <div className="min-w-0 bg-white p-5 sm:p-7 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
                      <Wallet size={14} />
                      <span>Input Kecairan</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800">
                      Kedudukan Kewangan
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Masukkan data semasa untuk menjana skor dan cadangan portfolio.
                    </p>

                    <div className="mt-5 space-y-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Tunai Tersedia
                        </label>
                        <div className="relative rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 overflow-hidden">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-bold text-slate-400">RM</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={financialReadiness.cashOnHand}
                            onChange={event => setFinancialReadiness(current => ({ ...current, cashOnHand: event.target.value }))}
                            className="w-full py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none bg-transparent"
                            placeholder="Contoh: 5000"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Pendapatan Bulanan <span className="font-normal text-slate-400">(Pilihan)</span>
                        </label>
                        <div className="relative rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 overflow-hidden">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-bold text-slate-400">RM</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={financialReadiness.monthlyIncome}
                            onChange={event => setFinancialReadiness(current => ({ ...current, monthlyIncome: event.target.value }))}
                            className="w-full py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none bg-transparent"
                            placeholder="Contoh: 4500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Perbelanjaan Bulanan <span className="font-normal text-slate-400">(Pilihan)</span>
                        </label>
                        <div className="relative rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 overflow-hidden">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-bold text-slate-400">RM</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={financialReadiness.monthlyExpenses}
                            onChange={event => setFinancialReadiness(current => ({ ...current, monthlyExpenses: event.target.value }))}
                            className="w-full py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none bg-transparent"
                            placeholder="Contoh: 2800"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Financial Benchmark Chips */}
                    <div className="mt-4 space-y-2">
                      {monthlyExpenses !== null && (
                        <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-xs text-slate-600">
                          <span className="font-bold text-slate-800">Dana Kecemasan 3 Bulan:</span>{' '}
                          <strong>{formatRM(monthlyExpenses * 3)}</strong>
                          {cashOnHand !== null && (
                            <span className="block mt-0.5 text-[11px] text-slate-500">
                              {cashOnHand >= monthlyExpenses * 3 ? '✓ Mencukupi penanda aras' : `Kekurangan ${formatRM(Math.max(0, monthlyExpenses * 3 - cashOnHand))}`}
                            </span>
                          )}
                        </div>
                      )}

                      {monthlyIncome !== null && (
                        <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-xs text-slate-600">
                          <span className="font-bold text-slate-800">Simpanan 10% Sasaran:</span>{' '}
                          <strong>{formatRM(monthlyIncome * 0.1)}</strong> sebulan
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="mt-4 text-[11px] leading-relaxed text-slate-400 border-t border-slate-100 pt-3">
                    Disimpan setempat pada browser ini. Data kewangan peribadi kekal di peranti anda.
                  </p>
                </div>
              </section>

              {/* SECTION: Simulasi Andaian Overlap */}
              <section className="bg-white p-5 sm:p-7 rounded-3xl shadow-sm border border-slate-200/80">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
                      <Scale size={14} />
                      <span>Financial Scenario Lab</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800">
                      Simulasi Andaian Overlap
                    </h3>
                    <p className="mt-1 max-w-2xl text-xs sm:text-sm text-slate-500 leading-relaxed">
                      Nilai semula emas yang sama, kira pembiayaan baharu dan selesaikan surat lama. Baki tunai ialah perbezaan pembiayaan bersih selepas caj dan fi.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportAnalyticsCSV}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all shadow-sm"
                  >
                    <Download size={15} /> Muat Turun Analisis
                  </button>
                </div>

                {activePortfolioTransactions.length === 0 ? (
                  <p className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm text-slate-500 text-center">
                    Tambah transaksi aktif untuk menggunakan simulasi ini.
                  </p>
                ) : (
                  <>
                    {/* Input Controls Grid */}
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Surat Lama Aktif
                        </label>
                        <select
                          value={selectedScenarioTransaction?.id ?? ''}
                          onChange={event => {
                            const selected = activePortfolioTransactions.find(
                              transaction => String(transaction.id) === event.target.value
                            );
                            const targetInstitution = visibleInstitutions.find(
                              institution => institution.name === selected?.institution
                            );
                            setScenarioTransactionId(event.target.value);
                            setScenarioInstitutionName(selected?.institution || '');
                            setScenarioMargin(String(targetInstitution?.maxMargin ?? selected?.margin ?? ''));
                            setScenarioOldFees('');
                            setScenarioNewFees('');
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-corporate-teal-500 focus:ring-2 focus:ring-corporate-teal-500/20 shadow-sm"
                        >
                          {activePortfolioTransactions.map(transaction => (
                            <option key={transaction.id} value={transaction.id}>
                              Surat #{transaction.refNo || `ID ${transaction.id}`} · {transaction.institution || 'Tiada institusi'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Institusi Pajakan Baharu
                        </label>
                        <select
                          value={scenarioInstitutionName || selectedScenarioTransaction?.institution || ''}
                          onChange={event => {
                            const institution = visibleInstitutions.find(item => item.name === event.target.value);
                            setScenarioInstitutionName(event.target.value);
                            setScenarioMargin(String(institution?.maxMargin ?? ''));
                            setScenarioNewFees('');
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-corporate-teal-500 focus:ring-2 focus:ring-corporate-teal-500/20 shadow-sm"
                        >
                          {visibleInstitutions.map(institution => (
                            <option key={institution.id} value={institution.name}>{institution.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 flex flex-col justify-center">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pembiayaan Lama (Tolak)</span>
                        <p className="mt-0.5 text-base sm:text-lg font-black text-slate-800">{formatRM(scenarioOldPrincipal)}</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Caj Tertunggak Surat Lama
                        </label>
                        <div className="relative rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-corporate-teal-500 focus-within:ring-2 focus-within:ring-corporate-teal-500/20 overflow-hidden">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-bold text-slate-400">RM</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={scenarioOldFees === '' ? scenarioOldFeesDefault : scenarioOldFees}
                            onChange={event => setScenarioOldFees(event.target.value)}
                            className="w-full py-2.5 pl-10 pr-3 text-xs sm:text-sm font-semibold text-slate-800 outline-none bg-transparent"
                            placeholder="Masukkan caj sebenar"
                          />
                        </div>
                        <span className="mt-1 block text-[11px] text-slate-500">
                          Anggaran awal: Tebus lama − Pembiayaan lama.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Margin Pembiayaan Baharu
                        </label>
                        <div className="relative rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-corporate-teal-500 focus-within:ring-2 focus-within:ring-corporate-teal-500/20 overflow-hidden">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={scenarioMargin === ''
                              ? scenarioInstitution?.maxMargin ?? selectedScenarioTransaction?.margin ?? ''
                              : scenarioMargin}
                            onChange={event => setScenarioMargin(event.target.value)}
                            className="w-full py-2.5 pl-3 pr-8 text-xs sm:text-sm font-semibold text-slate-800 outline-none bg-transparent"
                          />
                          <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-bold text-slate-400">%</span>
                        </div>
                        <span className="mt-1 block text-[11px] text-slate-500">
                          Kadar margin institusi baharu dipilih.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Fi Berkaitan Baharu
                        </label>
                        <div className="relative rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-corporate-teal-500 focus-within:ring-2 focus-within:ring-corporate-teal-500/20 overflow-hidden">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-bold text-slate-400">RM</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={scenarioNewFees}
                            onChange={event => setScenarioNewFees(event.target.value)}
                            className="w-full py-2.5 pl-10 pr-3 text-xs sm:text-sm font-semibold text-slate-800 outline-none bg-transparent"
                            placeholder="Contoh: 15.00"
                          />
                        </div>
                        <span className="mt-1 block text-[11px] text-slate-500">
                          Fi pajakan baharu untuk pengiraan baki akhir.
                        </span>
                      </div>
                    </div>

                    {goldPriceHistory.length === 0 && (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-center gap-2">
                        <AlertCircle size={15} className="text-amber-700 shrink-0" />
                        <span>Belum ada snapshot live. Simulasi menggunakan harga rujukan aplikasi sehingga harga dikemas kini.</span>
                      </div>
                    )}

                    {/* 3 Outcome Scenario Cards */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {scenarioOutcomes.map((scenario, index) => {
                        const isPositive = scenario.cashDifference !== null && scenario.cashDifference >= 0;
                        const isPending = scenario.cashDifference === null;

                        return (
                          <div
                            key={scenario.label}
                            className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:shadow-md"
                          >
                            <div>
                              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {index === 0 ? 'Senario Bearish' : index === 1 ? 'Senario Asas' : 'Senario Bullish'}
                                  </span>
                                  <h4 className="font-extrabold text-slate-800 text-sm">{scenario.label}</h4>
                                </div>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                  index === 0 ? 'bg-rose-50 text-rose-700' : index === 1 ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700'
                                }`}>
                                  {index === 0 ? '-10%' : index === 1 ? 'Spot' : '+10%'}
                                </span>
                              </div>

                              <dl className="mt-3 space-y-2 text-xs">
                                <div className="flex justify-between gap-2">
                                  <dt className="text-slate-500">Nilai marhun baharu</dt>
                                  <dd className="font-bold text-slate-800">{formatRM(scenario.newMarhunValue)}</dd>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <dt className="text-slate-500">Kadar marhun simulasi</dt>
                                  <dd className="font-semibold text-slate-700">{formatRM(scenario.simulatedRate)}/g</dd>
                                </div>
                                <div className="flex justify-between gap-2 border-t border-slate-100 pt-2 font-bold text-corporate-teal-800">
                                  <dt>Pembiayaan baharu</dt>
                                  <dd>{formatRM(scenario.newFinancing)}</dd>
                                </div>
                                <div className="flex justify-between gap-2 text-slate-500">
                                  <dt>Tolak pembiayaan lama</dt>
                                  <dd className="font-semibold text-slate-700">−{formatRM(scenario.oldPrincipal)}</dd>
                                </div>
                                <div className="flex justify-between gap-2 text-slate-500">
                                  <dt>Tolak caj tertunggak lama</dt>
                                  <dd className="font-semibold text-slate-700">−{formatRM(scenario.oldFees)}</dd>
                                </div>
                                <div className="flex justify-between gap-2 border-t border-slate-100 pt-2 font-medium text-slate-600">
                                  <dt>Baki sebelum fi baharu</dt>
                                  <dd className="font-bold text-slate-800">{formatRM(scenario.cashDifferenceBeforeNewFees)}</dd>
                                </div>
                                <div className="flex justify-between gap-2 text-slate-500">
                                  <dt>Tolak fi berkaitan baharu</dt>
                                  <dd className="font-semibold text-slate-700">
                                    {scenario.newFees === null ? 'Belum diisi' : `−${formatRM(scenario.newFees)}`}
                                  </dd>
                                </div>
                              </dl>
                            </div>

                            {/* Net Cash Outcome Box */}
                            <div className={`mt-4 rounded-xl p-3.5 border ${
                              isPending
                                ? 'bg-amber-50/80 border-amber-200'
                                : isPositive
                                  ? 'bg-emerald-50 border-emerald-200'
                                  : 'bg-rose-50 border-rose-200'
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                  Baki Tunai Bersih
                                </span>
                                <span className={`text-xs font-black ${
                                  isPending ? 'text-amber-800' : isPositive ? 'text-emerald-800' : 'text-rose-800'
                                }`}>
                                  {isPending ? 'Fi Diperlukan' : isPositive ? 'Lebihan Tunai' : 'Kurang Tunai'}
                                </span>
                              </div>
                              <p className={`mt-1 text-lg font-black ${
                                isPending ? 'text-amber-800' : isPositive ? 'text-emerald-700' : 'text-rose-700'
                              }`}>
                                {isPending ? 'Masukkan fi baharu' : formatRM(scenario.cashDifference)}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-500">
                                {isPending
                                  ? 'Isi anggaran fi untuk menjana baki tunai akhir.'
                                  : isPositive
                                    ? 'Lebihan tunai di tangan (bukan keuntungan pelaburan).'
                                    : 'Perlu tambah tunai sendiri untuk tebus overlap.'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Formula Callout */}
                    <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200/80 p-4 text-xs text-slate-600">
                      <p className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <Info size={14} className="text-corporate-teal-600" />
                        Formula Aliran Tunai Overlap:
                      </p>
                      <p className="font-mono text-[11px] bg-white border border-slate-200 rounded-lg p-2 text-slate-700 overflow-x-auto">
                        Baki Tunai Bersih = Pembiayaan Baharu − Pembiayaan Lama − Caj Tertunggak Lama − Fi Berkaitan Baharu
                      </p>
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        Pembiayaan baharu = Nilai marhun emas yang sama × Margin institusi baharu. Simulasi ±10% adalah ilustrasi stres-ujian pasaran, bukan jaminan harga atau kelulusan pembiayaan.
                      </p>
                    </div>
                  </>
                )}
              </section>
            </div>
          )}

        </div>
      </main>

      {/* NEW TRANSACTION MODAL */}
      {isModalOpen && (
        <TransactionModal
          institutions={visibleInstitutions}
          availableAssets={getTransactionModalAssets(availableAssetsForTransaction)}
          pledgedAssets={getTransactionModalAssets(visibleAssets.filter(asset => asset.status === 'Dalam Ar-Rahnu' && checkedInAssetIds.has(String(asset.id))))}
          sourceTransactions={visibleTransactions}
          initialData={editingTransaction}
          supabaseClient={supabaseClient}
          storageOwnerId={dataOwnerUserIdRef.current}
          onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }}
          onSave={editingTransaction ? handleSaveTransaction : handleAddTransaction}
          onOpenCorrection={(transaction, action) => {
            setIsModalOpen(false);
            setEditingTransaction(null);
            handleOpenCorrection(transaction, action);
          }}
          currentGoldPrice={currentGoldPrice}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      )}

      {isCorrectionModalOpen && correctionTransaction && (
        <CorrectionActionModal
          transaction={correctionTransaction}
          transactions={visibleTransactions}
          assets={visibleAssets}
          initialAction={initialCorrectionAction}
          onClose={() => {
            setIsCorrectionModalOpen(false);
            setCorrectionTransaction(null);
          }}
          onSave={handleSaveCorrection}
        />
      )}

      {/* NEW / EDIT ASSET MODAL */}
      {isAssetModalOpen && (
        <AssetModal
          initialData={editingAsset}
          currentGoldPrice={currentGoldPrice}
          onClose={() => {
            setIsAssetModalOpen(false);
            setEditingAsset(null);
          }}
          onSave={handleSaveAsset}
          suppliers={suppliers}
        />
      )}

      {/* NEW / EDIT INSTITUTION MODAL */}
      {isInstitutionModalOpen && (
        <InstitutionModal
          initialData={editingInstitution}
          currentGoldPrice={currentGoldPrice}
          onClose={() => {
            setIsInstitutionModalOpen(false);
            setEditingInstitution(null);
          }}
          onSave={handleSaveInstitution}
        />
      )}

      {/* NEW / EDIT SUPPLIER MODAL */}
      {isSupplierModalOpen && (
        <SupplierModal
          initialData={editingSupplier}
          onClose={() => {
            setIsSupplierModalOpen(false);
            setEditingSupplier(null);
          }}
          onSave={handleSaveSupplier}
        />
      )}

      {isProfileModalOpen && (
        <ProfileModal
          user={user}
          supabaseClient={supabaseClient}
          theme={theme}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}

      {/* INSTALL GUIDE MODAL */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button onClick={() => setShowInstallGuide(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X size={20} />
            </button>
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Download size={24} />
            </div>
            <h3 className="text-xl font-bold text-center text-slate-800 mb-2">Install Ar-Rahnu EGM</h3>
            <p className="text-sm text-center text-slate-600 mb-6">
              {canInstall
                ? 'Browser sedia memaparkan dialog pemasangan. Tekan butang di bawah untuk meneruskan.'
                : 'Pilihan pemasangan bergantung pada browser dan peranti. Ikut langkah yang sesuai di bawah untuk menambah aplikasi ke skrin utama.'}
            </p>

            {canInstall && (
              <button onClick={handleInstallButtonClick} className="w-full mb-5 rounded-lg bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800">
                Pasang Ar-Rahnu
              </button>
            )}

            <div className="space-y-4 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <strong className="block text-slate-800">🍎 Pengguna iPhone/iPad (Safari):</strong>
                1. Tekan ikon <b>Share</b> <span className="inline-block border border-slate-300 rounded px-1 text-xs">↑</span> di bawah skrin.<br />
                2. Tatal ke bawah dan pilih <b>"Add to Home Screen"</b> <span className="inline-block border border-slate-300 rounded px-1 text-xs">+</span>.
              </div>
              <div className="border-t border-slate-200 pt-3">
                <strong className="block text-slate-800">🤖 Pengguna Android (Chrome):</strong>
                {canInstall
                  ? 'Tekan “Pasang Ar-Rahnu” dan sahkan dialog yang dipaparkan oleh Chrome.'
                  : <>1. Tekan ikon <b>Menu (3 titik bertindih)</b> <span className="inline-block border border-slate-300 rounded px-1 text-xs">⋮</span> di penjuru atas.<br />2. Pilih <b>"Add to Home screen"</b> atau <b>"Install app"</b>.</>}
              </div>
            </div>

            <button
              onClick={() => setShowInstallGuide(false)}
              className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              Tutup & Faham
            </button>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[70] bg-slate-900/95 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center space-x-3 border border-emerald-500/50 backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function ProfileModal({ user, supabaseClient, theme, onClose }: {
  user: User;
  supabaseClient: SupabaseClient;
  theme: 'light' | 'dark';
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState(String(user.user_metadata?.full_name || user.user_metadata?.name || ''));
  const [email, setEmail] = useState(user.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileNotice, setProfileNotice] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'border-corporate-teal-800 bg-corporate-teal-950 text-slate-100' : 'border-slate-200 bg-white text-slate-800';
  const headingClass = isDark ? 'text-white' : 'text-slate-800';
  const secondaryTextClass = isDark ? 'text-slate-300' : 'text-slate-500';
  const labelClass = isDark ? 'text-slate-200' : 'text-slate-700';
  const inputClass = `mt-1.5 w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 ${
    isDark
      ? 'border-corporate-teal-700 bg-corporate-teal-900 text-white focus:border-corporate-teal-400 focus:ring-corporate-teal-800'
      : 'border-slate-300 text-slate-800 focus:border-corporate-teal-500 focus:ring-corporate-teal-100'
  }`;
  const errorClass = isDark ? 'bg-red-950 text-red-200' : 'bg-red-50 text-red-700';
  const noticeClass = isDark ? 'bg-corporate-teal-900 text-corporate-teal-100' : 'bg-emerald-50 text-emerald-800';

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !profileBusy && !passwordBusy) onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, profileBusy, passwordBusy]);

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileBusy(true);
    setProfileError('');
    setProfileNotice('');

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedName.length < 2 || normalizedName.length > 80) {
      setProfileError('Nama hendaklah mengandungi antara 2 hingga 80 aksara.');
      setProfileBusy(false);
      return;
    }

    try {
      const updates: { data: Record<string, unknown>; email?: string } = {
        data: { ...user.user_metadata, full_name: normalizedName }
      };
      const emailChanged = normalizedEmail !== (user.email || '').toLowerCase();
      if (emailChanged) updates.email = normalizedEmail;

      const { error } = await supabaseClient.auth.updateUser(updates);
      if (error) throw error;

      setProfileNotice(emailChanged
        ? 'Nama profil disimpan. Pautan pengesahan e-mel dihantar ke alamat baharu; alamat akaun akan berubah selepas pengesahan.'
        : 'Profil berjaya dikemas kini.');
    } catch (error) {
      setProfileError(error.message || 'Profil tidak dapat dikemas kini.');
    } finally {
      setProfileBusy(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordBusy(true);
    setPasswordError('');
    setPasswordNotice('');

    if (newPassword.length < 12) {
      setPasswordError('Kata laluan baharu mesti sekurang-kurangnya 12 aksara.');
      setPasswordBusy(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Pengesahan kata laluan tidak sepadan.');
      setPasswordBusy(false);
      return;
    }
    if (!user.email) {
      setPasswordError('Akaun ini tiada e-mel untuk mengesahkan kata laluan semasa.');
      setPasswordBusy(false);
      return;
    }

    try {
      const { error: verificationError } = await supabaseClient.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });
      if (verificationError) throw new Error('Kata laluan semasa tidak betul.');

      const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordNotice('Kata laluan berjaya ditukar.');
    } catch (error) {
      setPasswordError(error.message || 'Kata laluan tidak dapat ditukar.');
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !profileBusy && !passwordBusy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className={`relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border p-5 shadow-2xl sm:p-7 ${cardClass}`}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={profileBusy || passwordBusy}
          aria-label="Tutup pengurusan profil"
          className={`absolute right-4 top-4 rounded-lg p-2 disabled:opacity-50 ${isDark ? 'text-slate-300 hover:bg-corporate-teal-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
        >
          <X size={20} />
        </button>

        <div className="mb-6 flex items-center gap-3 pr-10">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-corporate-teal-100 text-corporate-teal-700">
            <UserRound size={22} />
          </div>
          <div>
            <h2 id="profile-modal-title" className={`text-xl font-bold ${headingClass}`}>Pengurusan Profil</h2>
            <p className={`text-sm ${secondaryTextClass}`}>Kemas kini maklumat akaun dan keselamatan anda.</p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className={`rounded-xl border p-4 sm:p-5 ${isDark ? 'border-corporate-teal-800' : 'border-slate-200'}`}>
          <h3 className={`font-semibold ${headingClass}`}>Maklumat profil</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className={`block text-sm font-medium ${labelClass}`}>
              Nama paparan
              <input
                type="text"
                autoComplete="name"
                autoFocus
                required
                minLength={2}
                maxLength={80}
                value={fullName}
                onChange={event => setFullName(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`block text-sm font-medium ${labelClass}`}>
              Alamat e-mel
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={event => setEmail(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <p className={`mt-3 text-xs leading-relaxed ${secondaryTextClass}`}>
            Jika alamat e-mel ditukar, Supabase akan meminta pengesahan e-mel sebelum perubahan digunakan.
          </p>
          {profileError && <p role="alert" className={`mt-3 rounded-lg p-3 text-sm ${errorClass}`}>{profileError}</p>}
          {profileNotice && <p role="status" className={`mt-3 rounded-lg p-3 text-sm ${noticeClass}`}>{profileNotice}</p>}
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={profileBusy} className="rounded-lg bg-corporate-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-corporate-teal-700 disabled:cursor-not-allowed disabled:opacity-60">
              {profileBusy ? 'Menyimpan...' : 'Simpan profil'}
            </button>
          </div>
        </form>

        <form onSubmit={handlePasswordSubmit} className={`mt-5 rounded-xl border p-4 sm:p-5 ${isDark ? 'border-corporate-teal-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-corporate-teal-700" />
            <h3 className={`font-semibold ${headingClass}`}>Tukar kata laluan</h3>
          </div>
          <p className={`mt-1 text-xs ${secondaryTextClass}`}>Sahkan kata laluan semasa sebelum menetapkan kata laluan baharu.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className={`block text-sm font-medium sm:col-span-2 ${labelClass}`}>
              Kata laluan semasa
              <input
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={event => setCurrentPassword(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`block text-sm font-medium ${labelClass}`}>
              Kata laluan baharu
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                value={newPassword}
                onChange={event => setNewPassword(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`block text-sm font-medium ${labelClass}`}>
              Sahkan kata laluan baharu
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          {passwordError && <p role="alert" className={`mt-3 rounded-lg p-3 text-sm ${errorClass}`}>{passwordError}</p>}
          {passwordNotice && <p role="status" className={`mt-3 rounded-lg p-3 text-sm ${noticeClass}`}>{passwordNotice}</p>}
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={passwordBusy} className="rounded-lg bg-corporate-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-corporate-teal-700 disabled:cursor-not-allowed disabled:opacity-60">
              {passwordBusy ? 'Mengemas kini...' : 'Tukar kata laluan'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color }) {
  const colorMap = {
    emerald: {
      badge: 'bg-corporate-green-100 text-corporate-green-800',
      icon: 'bg-corporate-green-500 text-white',
    },
    amber: {
      badge: 'bg-corporate-magenta-100 text-corporate-magenta-800',
      icon: 'bg-corporate-magenta-500 text-white',
    },
    blue: {
      badge: 'bg-corporate-teal-100 text-corporate-teal-800',
      icon: 'bg-corporate-teal-500 text-white',
    },
    rose: {
      badge: 'bg-corporate-magenta-100 text-corporate-magenta-800',
      icon: 'bg-corporate-magenta-500 text-white',
    },
  };
  const colors = colorMap[color] || colorMap.blue;

  return (
    <div className="flex min-w-0 items-start gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition-shadow group hover:shadow-md sm:gap-3 sm:p-4 lg:p-5">
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[0.7rem] font-medium leading-snug text-slate-500 sm:text-xs lg:text-sm">{title}</p>
        <h3 className="whitespace-nowrap text-base font-bold leading-tight tracking-tight text-slate-800 sm:text-lg xl:text-xl 2xl:text-2xl">{value}</h3>
        <p className={`mt-2 inline-block max-w-full rounded-md px-2 py-1 text-[0.65rem] font-semibold leading-snug sm:text-xs ${colors.badge}`}>
          {trend}
        </p>
      </div>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm sm:h-10 sm:w-10 sm:rounded-xl lg:h-11 lg:w-11 [&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-5 sm:[&>svg]:w-5 lg:[&>svg]:h-6 lg:[&>svg]:w-6 ${colors.icon}`}>
        {icon}
      </div>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick, badge = 0, theme = 'dark', compact = false }) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={compact ? label : undefined}
      className={`relative w-full flex items-center rounded-xl py-3 transition-all duration-200 ${compact ? 'justify-center px-2 lg:px-2' : 'space-x-3 px-4'} ${isActive
          ? isDark
            ? 'bg-corporate-teal-800 text-white font-semibold shadow-inner border border-corporate-teal-700'
            : 'bg-corporate-teal-100 text-corporate-teal-800 font-semibold border border-corporate-teal-200'
          : isDark
            ? 'text-slate-200 hover:bg-corporate-teal-900 hover:text-white'
            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
        }`}
    >
      <div className={`shrink-0 ${isActive
        ? isDark ? 'text-corporate-magenta-300' : 'text-corporate-magenta-600'
        : isDark ? 'text-corporate-teal-300' : 'text-corporate-teal-600'}`}>
        {icon}
      </div>
      <span className={`min-w-0 flex-1 text-left ${compact ? 'lg:hidden' : ''}`}>{label}</span>
      {badge > 0 && (
        <span className={`min-w-5 h-5 px-1 rounded-full text-xs font-black flex items-center justify-center ${
          isDark ? 'bg-corporate-magenta-500 text-white' : 'bg-corporate-magenta-100 text-corporate-magenta-800'
        } ${compact ? 'absolute -right-1 -top-1 lg:min-w-4 lg:h-4' : ''}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function CorrectionActionModal({ transaction, transactions, assets = [], initialAction, onClose, onSave }) {
  const [actionType, setActionType] = useState(initialAction);
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [selectionError, setSelectionError] = useState('');
  const [formData, setFormData] = useState({
    date: getMalaysiaDateTimeInputValue(new Date().toISOString()),
    totalPaid: '',
    oldFinancing: '',
    oldFees: '',
    feePaid: '',
    releasedWeight: '',
    remainingWeight: '',
    remainingPrincipal: '',
    remainingRedemption: '',
    paidThroughDate: '',
    linkedTransactionId: '',
    relatedFees: '',
    sameGoldConfirmed: false,
    institutionConfirmed: false,
    auctionProceeds: '',
    remarks: ''
  });
  const linkedAssetIds = [...new Set(getTransactionAssetIds(transaction).map(String))];
  const linkedAssets = linkedAssetIds
    .map(assetId => assets.find(asset => String(asset.id) === assetId))
    .filter(Boolean);
  const selectedAssets = linkedAssets.filter(asset => selectedAssetIds.includes(String(asset.id)));
  const remainingAssets = linkedAssets.filter(asset => !selectedAssetIds.includes(String(asset.id)));
  const selectedAssetWeight = selectedAssets.reduce((total, asset) => total + (Number(asset.weight) || 0), 0);
  const remainingAssetWeight = remainingAssets.reduce((total, asset) => total + (Number(asset.weight) || 0), 0);
  const requiresAllAssets = ['TS', 'OL', 'Pusing', 'Lelong'].includes(actionType);
  const missingAssetCount = linkedAssetIds.length - linkedAssets.length;
  const isTerminal = ['Ditebus', 'Dilelong', 'Selesai'].includes(transaction.status);
  const eligibleRolloverTransactions = transactions.filter(candidate =>
    String(candidate.id) !== String(transaction.id) &&
    (candidate.status === 'Aktif' || !candidate.status) &&
    !String(candidate.type || '').toLowerCase().includes('tebus') &&
    getMatchingAssetLinkStatus(transaction, candidate) !== false
  );
  const selectedRolloverTransaction = eligibleRolloverTransactions.find(candidate =>
    String(candidate.id) === String(formData.linkedTransactionId)
  );
  const rolloverCashPreview = selectedRolloverTransaction &&
    formData.oldFinancing !== '' &&
    formData.oldFees !== '' &&
    formData.relatedFees !== ''
    ? calculateOverlapCashBalance(
      getCurrentPrincipal(selectedRolloverTransaction),
      formData.oldFinancing,
      formData.oldFees,
      formData.relatedFees
    )
    : null;
  const history = getCorrectionEvents(transaction).slice().reverse();

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData(previous => ({ ...previous, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAssetToggle = (assetId) => {
    const normalizedAssetId = String(assetId);
    setSelectedAssetIds(previous => previous.includes(normalizedAssetId)
      ? previous.filter(selectedId => selectedId !== normalizedAssetId)
      : [...previous, normalizedAssetId]);
    setSelectionError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!selectedAssetIds.length) {
      setSelectionError('Pilih sekurang-kurangnya satu aset EDR untuk tindakan ini.');
      return;
    }
    if (requiresAllAssets && selectedAssetIds.length !== linkedAssetIds.length) {
      setSelectionError('Jenis tindakan ini menamatkan surat lama; pilih semua aset EDR yang dipautkan.');
      return;
    }
    if (actionType === 'TKS' && selectedAssetIds.length === linkedAssetIds.length) {
      setSelectionError('TKS perlu meninggalkan sekurang-kurangnya satu aset. Gunakan TS untuk tebus penuh.');
      return;
    }
    if (missingAssetCount > 0) {
      setSelectionError('Semua aset yang dipautkan perlu ditemui sebelum tindakan boleh disimpan.');
      return;
    }
    onSave({
      ...formData,
      type: actionType,
      selectedAssetIds: selectedAssets.map(asset => asset.id),
      releasedWeight: selectedAssetWeight,
      remainingWeight: remainingAssetWeight
    });
  };

  const renderNumberField = (name, label, required = true) => (
    <label className="space-y-1">
      <span className="block text-sm font-semibold text-slate-700">{label}</span>
      <input
        type="number"
        min="0"
        step="0.01"
        name={name}
        value={formData[name]}
        onChange={handleChange}
        required={required}
        className="w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
      />
    </label>
  );

  const formatEventAmount = (value) =>
    value === undefined || value === null || value === '' ? null : formatRM(Number(value) || 0);

  return (
    <div className="fixed inset-0 z-[58] flex items-center justify-center bg-slate-900/70 p-2 backdrop-blur-sm sm:p-4">
      <div className="max-h-[95dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-4 sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Rekod tindakan SAG</h2>
            <p className="text-sm text-slate-500">Surat #{transaction.refNo} · {transaction.institution}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          {history.length > 0 && (
            <section className="space-y-3">
              <h3 className="font-bold text-slate-800">Sejarah tindakan</h3>
              <div className="space-y-2">
                {history.map(event => (
                  <article key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm text-slate-800">{event.type}</strong>
                      <span className="text-xs text-slate-500">{formatTransactionDateTime(event.date)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                      {event.totalPaid !== undefined && (
                        <span>{['OL', 'Pusing'].includes(event.type) ? 'Penyelesaian surat lama' : 'Bayaran'}: {formatEventAmount(event.totalPaid)}</span>
                      )}
                      {event.oldFinancing !== undefined && <span>Pembiayaan lama: {formatEventAmount(event.oldFinancing)}</span>}
                      {event.oldFees !== undefined && <span>Caj tertunggak lama: {formatEventAmount(event.oldFees)}</span>}
                      {event.feePaid !== undefined && <span>Caj dibayar: {formatEventAmount(event.feePaid)}</span>}
                      {event.relatedFees !== undefined && <span>Fi berkaitan: {formatEventAmount(event.relatedFees)}</span>}
                      {event.newFinancing !== undefined && event.newFinancing !== null && <span>Pembiayaan baharu: {formatEventAmount(event.newFinancing)}</span>}
                      {event.cashDifference !== undefined && event.cashDifference !== null && (
                        <span>Baki tunai bukan untung: {formatEventAmount(event.cashDifference)}</span>
                      )}
                      {event.releasedWeight !== undefined && <span>Berat dilepaskan: {Number(event.releasedWeight) || 0}g</span>}
                      {event.remainingWeight !== undefined && <span>Baki berat: {Number(event.remainingWeight) || 0}g</span>}
                      {event.remainingPrincipal !== undefined && <span>Baki prinsipal: {formatEventAmount(event.remainingPrincipal)}</span>}
                      {event.remainingRedemption !== undefined && <span>Baki tebus: {formatEventAmount(event.remainingRedemption)}</span>}
                      {event.releasedAssetCodes?.length > 0 && <span>Aset dipilih: {event.releasedAssetCodes.join(', ')}</span>}
                      {event.paidThroughDate && <span>Dibayar hingga: {event.paidThroughDate}</span>}
                      {event.linkedRefNo && <span>SAG baharu: #{event.linkedRefNo}</span>}
                      {event.auctionProceeds !== undefined && event.auctionProceeds !== '' && <span>Hasil lelong: {formatEventAmount(event.auctionProceeds)}</span>}
                      {event.institutionConfirmed && <span>Pengesahan institusi direkodkan</span>}
                      {event.sameGoldConfirmed && <span>Emas sama disahkan</span>}
                    </div>
                    {event.remarks && <p className="mt-2 text-xs text-slate-600">{event.remarks}</p>}
                  </article>
                ))}
              </div>
            </section>
          )}

          {isTerminal ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Surat ini berstatus {transaction.status}. Sejarah boleh dilihat, tetapi tindakan baharu tidak boleh direkodkan.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="block text-sm font-semibold text-slate-700">Jenis tindakan</span>
                  <select value={actionType} onChange={event => { setActionType(event.target.value); setSelectionError(''); }} className="w-full rounded-lg border border-slate-300 p-2.5">
                    <option value="TS">TS · Tebus penuh</option>
                    <option value="TKS">TKS · Tebus sebahagian</option>
                    <option value="US">US · Bayar upah simpan</option>
                    <option value="OL">OL · Overlap (pautkan SAG baharu)</option>
                    <option value="Pusing">Pusing · Pautkan SAG baharu</option>
                    <option value="Lelong">Lelong · Selepas pengesahan institusi</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="block text-sm font-semibold text-slate-700">Tarikh &amp; masa tindakan</span>
                  <input type="datetime-local" name="date" value={formData.date} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 p-2.5" />
                </label>
              </div>

              <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Aset EDR · Surat #{transaction.refNo}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Pilih aset yang terlibat dalam tindakan ini. Aset terpilih akan dilepaskan daripada surat dan kembali ke status EDT jika tidak dipautkan kepada SAG aktif lain.
                    {requiresAllAssets && ' Jenis tindakan ini memerlukan semua aset.'}
                  </p>
                </div>
                {linkedAssets.length > 0 ? (
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {linkedAssets.map(asset => (
                      <label key={asset.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50/50">
                        <input
                          type="checkbox"
                          checked={selectedAssetIds.includes(String(asset.id))}
                          onChange={() => handleAssetToggle(asset.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block break-all font-mono text-xs font-bold text-slate-800">
                            {asset.code || String(asset.id)}
                          </span>
                          <span className="mt-1 block text-xs text-slate-600">
                            {asset.type || 'Emas'} · {asset.purity || 'Ketulenan tidak direkod'} · {Number(asset.weight) || 0}g
                            {asset.supplier ? ` · ${asset.supplier}` : ''}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">EDR</span>
                      </label>
                    ))}
                    {missingAssetCount > 0 && (
                      <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        {missingAssetCount} pautan aset tidak ditemui dalam rekod aset. Muat semula atau betulkan pautan sebelum menyimpan tindakan.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {missingAssetCount > 0
                      ? `${missingAssetCount} pautan aset tidak ditemui dalam rekod aset. Muat semula atau betulkan pautan sebelum menyimpan tindakan.`
                      : `Tiada aset EDR dipautkan kepada Surat #${transaction.refNo}. Pautkan aset pada rekod SAG terlebih dahulu.`}
                  </p>
                )}
                <p className="text-xs font-semibold text-slate-600">
                  Dipilih: {selectedAssets.length} / {linkedAssetIds.length} aset · Berat: {selectedAssetWeight.toFixed(2)}g
                </p>
                {selectionError && <p role="alert" className="text-xs font-semibold text-rose-700">{selectionError}</p>}
              </section>

              {actionType === 'TS' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {renderNumberField('totalPaid', 'Jumlah bayaran sebenar (RM)')}
                  {renderNumberField('feePaid', 'Caj sebenar dibayar (RM)')}
                </div>
              )}

              {actionType === 'TKS' && (
                <>
                  <p className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                    Berat dilepaskan dan baki berat dikira daripada aset yang dipilih. Tinggalkan sekurang-kurangnya satu aset untuk TKS; gunakan TS untuk tebus penuh. Masukkan baki kewangan selepas transaksi seperti yang disahkan institusi.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {renderNumberField('totalPaid', 'Jumlah bayaran sebenar (RM)')}
                    <label className="space-y-1">
                      <span className="block text-sm font-semibold text-slate-700">Berat dilepaskan (g)</span>
                      <input type="number" value={selectedAssetWeight.toFixed(2)} readOnly className="w-full rounded-lg border border-slate-300 bg-slate-100 p-2.5" />
                    </label>
                    <label className="space-y-1">
                      <span className="block text-sm font-semibold text-slate-700">Baki berat (g)</span>
                      <input type="number" value={remainingAssetWeight.toFixed(2)} readOnly className="w-full rounded-lg border border-slate-300 bg-slate-100 p-2.5" />
                    </label>
                    {renderNumberField('remainingPrincipal', 'Baki prinsipal (RM)')}
                    {renderNumberField('remainingRedemption', 'Baki jumlah tebus (RM)')}
                  </div>
                </>
              )}

              {actionType === 'US' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {renderNumberField('feePaid', 'Upah simpan dibayar (RM)')}
                  <label className="space-y-1">
                    <span className="block text-sm font-semibold text-slate-700">Dibayar hingga</span>
                    <input type="date" name="paidThroughDate" value={formData.paidThroughDate} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 p-2.5" />
                  </label>
                </div>
              )}

              {['OL', 'Pusing'].includes(actionType) && (
                <div className="space-y-4">
                  <label className="block space-y-1">
                    <span className="block text-sm font-semibold text-slate-700">SAG baharu untuk tindakan {actionType} (emas yang sama)</span>
                    <select name="linkedTransactionId" value={formData.linkedTransactionId} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 p-2.5">
                      <option value="">Pilih SAG aktif</option>
                      {eligibleRolloverTransactions.map(candidate => (
                        <option key={candidate.id} value={candidate.id}>#{candidate.refNo} · {candidate.institution}</option>
                      ))}
                    </select>
                    {eligibleRolloverTransactions.length === 0 && (
                      <span className="block text-xs text-amber-700">Tiada SAG aktif yang boleh dipautkan. Rekodkan SAG baharu untuk emas sama dahulu.</span>
                    )}
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {renderNumberField('oldFinancing', 'Pembiayaan lama untuk diselesaikan (RM)')}
                    {renderNumberField('oldFees', 'Caj tertunggak surat lama (RM)')}
                    {renderNumberField('relatedFees', 'Fi berkaitan OL baharu (RM)')}
                  </div>
                  <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <input type="checkbox" name="sameGoldConfirmed" checked={formData.sameGoldConfirmed} onChange={handleChange} required className="mt-1" />
                    <span>Saya mengesahkan emas yang dinilai semula untuk SAG baharu ialah emas yang sama seperti surat lama.</span>
                  </label>
                  {selectedRolloverTransaction && (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      Anggaran baki tunai: pembiayaan baharu {formatRM(getCurrentPrincipal(selectedRolloverTransaction))} − pembiayaan lama {formatRM(Number(formData.oldFinancing) || 0)} − caj tertunggak {formatRM(Number(formData.oldFees) || 0)} − fi berkaitan {formatRM(Number(formData.relatedFees) || 0)} ={' '}
                      <strong className={rolloverCashPreview !== null && rolloverCashPreview >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        {rolloverCashPreview === null ? 'lengkapkan amaun di atas' : formatRM(rolloverCashPreview)}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-500">Anggaran sahaja; baki tunai bukan keuntungan dan perlu disahkan dengan institusi.</span>
                    </p>
                  )}
                </div>
              )}

              {actionType === 'Lelong' && (
                <div className="space-y-4">
                  <label className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                    <input type="checkbox" name="institutionConfirmed" checked={formData.institutionConfirmed} onChange={handleChange} required className="mt-1" />
                    <span>Saya mengesahkan lelong telah disahkan oleh institusi. Status hanya akan dikemas kini selepas pengesahan ini.</span>
                  </label>
                  {renderNumberField('auctionProceeds', 'Hasil lelong direkod (RM)', false)}
                </div>
              )}

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-700">Catatan</span>
                <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={2} className="w-full rounded-lg border border-slate-300 p-2.5" />
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} className="rounded-lg px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-100">Batal</button>
                <button type="submit" className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700">Simpan tindakan</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionModal({ institutions, availableAssets, pledgedAssets, sourceTransactions, initialData, supabaseClient, storageOwnerId, onClose, onSave, onOpenCorrection, currentGoldPrice, isRefreshing, onRefresh }) {
  const roundMoney = (value) => Number((Number(value) || 0).toFixed(2));
  const calculateLoan = (marhunValue, margin) =>
    (parseFloat(marhunValue) || 0) * ((parseFloat(margin) || 0) / 100);
  const calculateProjectedProfit = (type, loan, redemption, fee) =>
    type === 'Pajakan Asal' || type.includes('Tebus')
      ? 0
      : (parseFloat(loan) || 0) - (parseFloat(redemption) || 0) - (parseFloat(fee) || 0);

  const transactionAssets = [...availableAssets, ...pledgedAssets];
  const initialAttachments = Array.isArray(initialData?.attachments) ? initialData.attachments : [];
  const initialLinkedAssets = getTransactionAssetIds(initialData || {})
    .map(assetId => transactionAssets.find(asset => String(asset.id) === String(assetId)))
    .filter(Boolean);
  const initialWeight = initialData?.weight ?? 0;
  const initialPurity = initialData?.purity || getPurityFromAssets(initialLinkedAssets);
  const initialMarhunPrice = initialData?.marhunPrice ?? institutions?.[0]?.marhunRate ?? 0;
  const initialMargin = initialData?.margin ?? institutions?.[0]?.maxMargin ?? 0;
  const initialFeeRate = initialData?.feeRate ?? 0;
  const initialFeeTermMonths = initialData?.feeTermMonths ?? '';
  const initialFeeBasis = initialData?.feeBasis || '';
  const initialType = initialData?.type || 'Pajakan Asal';
  const initialMarhunValue = initialData?.marhunValue ??
    calculateMarhunValue(initialWeight, initialMarhunPrice);
  const initialLoan = initialData?.loan ??
    calculateLoan(initialMarhunValue, initialMargin);
  const initialProfit = initialData?.profit ??
    calculateProjectedProfit(initialType, initialLoan, initialData?.redemption ?? 0, initialData?.fee ?? 0);
  const hasLegacyDateWithoutTime = /^\d{4}-\d{2}-\d{2}$/.test(initialData?.date || '');

  const [formData, setFormData] = useState(() => ({
    date: getMalaysiaDateTimeInputValue(initialData?.date || new Date().toISOString()),
    type: initialType,
    redemptionDate: initialData?.redemptionDate || '',
    institution: initialData?.institution || institutions?.[0]?.name || '',
    refNo: initialData?.refNo || '',
    weight: initialWeight,
    purity: initialPurity,
    marhunPrice: initialMarhunPrice,
    margin: initialMargin,
    feeRate: initialFeeRate,
    feeTermMonths: initialFeeTermMonths,
    feeBasis: initialFeeBasis,
    marhunValue: roundMoney(initialMarhunValue),
    loan: roundMoney(initialLoan),
    profit: roundMoney(initialProfit),
    redemption: initialData?.redemption ?? 0,
    fee: initialData?.fee ?? 0,
    remarks: initialData?.remarks || ''
  }));
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>(
    getTransactionAssetIds(initialData || {})
  );
  const [savedAttachments, setSavedAttachments] = useState(
    initialAttachments
  );
  const [newAttachmentFiles, setNewAttachmentFiles] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [actionSourceId, setActionSourceId] = useState('');
  const [isDateEdited, setIsDateEdited] = useState(false);
  const [isAssetListOpen, setIsAssetListOpen] = useState(false);
  const correctionActionsByTransactionType = {
    'Tebus Penuh (TS)': 'TS',
    'Tebus Sebahagian (TKS)': 'TKS',
    'Upah Simpan (US)': 'US',
    'OL / Pusing (80%)': 'OL',
    Pusing: 'Pusing',
    Lelong: 'Lelong'
  };
  const correctionActionType = initialData
    ? null
    : correctionActionsByTransactionType[formData.type] || null;
  const availableSourceTransactions = sourceTransactions.filter(transaction =>
    (!transaction.status || transaction.status === 'Aktif') &&
    !['Selesai', 'Ditebus', 'Dilelong'].includes(transaction.status) &&
    !String(transaction.type || '').toLowerCase().includes('tebus')
  );
  const selectedSourceTransaction = availableSourceTransactions.find(transaction =>
    String(transaction.id) === String(actionSourceId)
  ) || null;
  const sourceAssetIds = getTransactionAssetIds(selectedSourceTransaction || {}).map(String);
  const sourceEdrAssets = sourceAssetIds
    .map(assetId => pledgedAssets.find(asset => String(asset.id) === assetId))
    .filter(Boolean);
  const remainingAttachmentSlots = maximumTransactionAttachments - savedAttachments.length - newAttachmentFiles.length;

  useEffect(() => {
    const handleModalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        const submitBtn = document.getElementById('transaction-modal-submit-btn');
        if (submitBtn) submitBtn.click();
      }
    };
    window.addEventListener('keydown', handleModalKeyDown);
    return () => window.removeEventListener('keydown', handleModalKeyDown);
  }, [onClose]);

  const handleAttachmentSelection = (event) => {
    const selectedFiles = Array.from(event.target.files || []) as File[];
    event.target.value = '';
    setAttachmentError('');
    const oversizedFiles = selectedFiles.filter(file => file.size > maximumTransactionAttachmentSize);
    const validFiles = selectedFiles.filter(file => file.size <= maximumTransactionAttachmentSize);
    const availableSlots = Math.max(0, maximumTransactionAttachments - savedAttachments.length - newAttachmentFiles.length);
    const acceptedFiles = validFiles.slice(0, availableSlots);
    const messages = [];
    if (oversizedFiles.length) {
      messages.push(`${oversizedFiles.map(file => file.name).join(', ')} melebihi had 50 MB setiap fail.`);
    }
    if (acceptedFiles.length < validFiles.length) {
      messages.push(`Maksimum ${maximumTransactionAttachments} fail lampiran bagi setiap surat gadaian.`);
    }
    if (messages.length) setAttachmentError(messages.join(' '));
    if (acceptedFiles.length) setNewAttachmentFiles(previous => [...previous, ...acceptedFiles]);
  };

  const handleOpenAttachment = async (attachment) => {
    setAttachmentError('');
    try {
      const { data, error } = await supabaseClient.storage
        .from(transactionAttachmentsBucket)
        .createSignedUrl(attachment.path, 60);
      if (error) throw error;
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ralat storan.';
      setAttachmentError(`Lampiran "${attachment.name}" tidak dapat dibuka: ${message}`);
    }
  };

  const handleRemoveSavedAttachment = (attachment) => {
    setSavedAttachments(previous => previous.filter(item => item !== attachment));
  };
  const recalculateFinancialFields = (data, recalculateMarhunValue = false) => {
    const marhunValue = recalculateMarhunValue
      ? calculateMarhunValue(data.weight, data.marhunPrice)
      : parseFloat(data.marhunValue) || 0;
    const loan = calculateLoan(marhunValue, data.margin);
    return {
      ...data,
      marhunValue: roundMoney(marhunValue),
      loan: roundMoney(loan),
      profit: roundMoney(calculateProjectedProfit(data.type, loan, data.redemption, data.fee))
    };
  };
  const calculatedMarhunValue = parseFloat(formData.marhunValue) || 0;
  const loanForSave = parseFloat(formData.loan) || 0;
  const profitForSave = parseFloat(formData.profit) || 0;
  const feeBasisAmount = formData.feeBasis === 'nilaiMarhun'
    ? calculatedMarhunValue
    : formData.feeBasis === 'jumlahPembiayaan'
      ? loanForSave
      : 0;
  const estimatedMonthlyStorageFee = roundMoney(
    feeBasisAmount * ((parseFloat(formData.feeRate) || 0) / 100)
  );
  const feeTermMonths = parseFloat(formData.feeTermMonths) || 0;
  const estimatedTotalStorageFee = roundMoney(estimatedMonthlyStorageFee * feeTermMonths);
  const estimatedTotalRedemption = roundMoney(loanForSave + estimatedTotalStorageFee);
  const hasLoanInputsChanged = !initialData ||
    formData.type !== initialData.type ||
    (parseFloat(formData.weight) || 0) !== (parseFloat(initialData.weight) || 0) ||
    (parseFloat(formData.marhunPrice) || 0) !== (parseFloat(initialData.marhunPrice) || 0) ||
    (parseFloat(formData.margin) || 0) !== (parseFloat(initialData.margin) || 0) ||
    calculatedMarhunValue !== Number(initialMarhunValue) ||
    loanForSave !== (Number(initialData?.loan) || 0) ||
    (parseFloat(formData.fee) || 0) !== (Number(initialData?.fee) || 0);
  const redemptionForSave = formData.type === 'Pajakan Asal'
    ? initialData && !hasLoanInputsChanged
      ? Number(initialData.redemption) || 0
      : loanForSave + (parseFloat(formData.fee) || 0)
    : parseFloat(formData.redemption) || 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'date') setIsDateEdited(true);
    if (name === 'type') {
      setSelectedAssetIds([]);
      setIsAssetListOpen(false);
    }
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'type') {
        return recalculateFinancialFields(updated, true);
      }

      // Auto-fill rates if institution changes
      if (name === 'institution') {
        const inst = institutions.find(i => i.name === value);
        if (inst) {
          updated.marhunPrice = inst.marhunRate;
          updated.margin = inst.maxMargin;
        }
        return recalculateFinancialFields(updated, true);
      }

      if (name === 'weight' || name === 'marhunPrice') {
        return recalculateFinancialFields(updated, true);
      }
      if (name === 'marhunValue' || name === 'margin') {
        return recalculateFinancialFields(updated);
      }
      if (name === 'loan' || name === 'redemption' || name === 'fee') {
        updated.profit = roundMoney(
          calculateProjectedProfit(updated.type, updated.loan, updated.redemption, updated.fee)
        );
      }
      return updated;
    });
  };

  const handleAssetToggle = (assetId) => {
    const assetCandidates = formData.type === 'Pajakan Asal' ? availableAssets : pledgedAssets;
    const updatedIds = selectedAssetIds.map(String).includes(String(assetId))
      ? selectedAssetIds.filter(selectedId => String(selectedId) !== String(assetId))
      : [...selectedAssetIds, assetId];
    setSelectedAssetIds(updatedIds);
    const updatedAssets = assetCandidates
      .filter(asset => updatedIds.map(String).includes(String(asset.id)));
    const selectedWeight = updatedAssets
      .reduce((total, asset) => total + (parseFloat(asset.weight) || 0), 0);
    setFormData(prev => recalculateFinancialFields(
      { ...prev, weight: selectedWeight, purity: getPurityFromAssets(updatedAssets) },
      true
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (correctionActionType) {
      if (!selectedSourceTransaction) return;
      onOpenCorrection(selectedSourceTransaction, correctionActionType);
      return;
    }
    setIsSaving(true);
    setAttachmentError('');
    const transactionId = initialData?.id ?? Date.now();
    const uploadedAttachments = [];
    const removedAttachments = initialAttachments.filter(attachment => attachment?.path &&
      !savedAttachments.some(saved => saved.path === attachment.path)
    );
    try {
      for (const file of newAttachmentFiles) {
        const safeFileName = file.name.replace(/[^\w.-]+/g, '_').slice(-120) || 'lampiran';
        const path = `${storageOwnerId}/${String(transactionId).replace(/[^a-zA-Z0-9_-]/g, '_')}/${crypto.randomUUID()}-${safeFileName}`;
        const { error } = await supabaseClient.storage
          .from(transactionAttachmentsBucket)
          .upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
        if (error) throw new Error(`Gagal memuat naik "${file.name}": ${error.message}`);
        uploadedAttachments.push({
          id: path.split('/').pop(),
          name: file.name,
          path,
          size: file.size,
          type: file.type || 'application/octet-stream',
          uploadedAt: new Date().toISOString()
        });
      }

      if (removedAttachments.length) {
        const { error } = await supabaseClient.storage
          .from(transactionAttachmentsBucket)
          .remove(removedAttachments.map(attachment => attachment.path));
        if (error) throw new Error(`Lampiran lama tidak dapat dipadam: ${error.message}`);
      }

      onSave({
        ...formData,
        id: transactionId,
        attachments: [...savedAttachments, ...uploadedAttachments],
        date: initialData && !isDateEdited
          ? initialData.date
          : parseTransactionDateTime(formData.date).toISOString(),
        selectedAssetIds,
        weight: parseFloat(formData.weight) || 0,
        purity: formData.purity,
        marhunPrice: parseFloat(formData.marhunPrice) || 0,
        marhunValue: roundMoney(calculatedMarhunValue),
        margin: parseFloat(formData.margin) || 0,
        feeRate: parseFloat(formData.feeRate) || 0,
        feeTermMonths,
        feeBasis: formData.feeBasis,
        loan: roundMoney(loanForSave),
        fee: parseFloat(formData.fee) || 0,
        redemption: redemptionForSave,
        profit: roundMoney(profitForSave),
      });
    } catch (error) {
      if (uploadedAttachments.length) {
        const { error: cleanupError } = await supabaseClient.storage
          .from(transactionAttachmentsBucket)
          .remove(uploadedAttachments.map(attachment => attachment.path));
        if (cleanupError) console.error('Lampiran sementara tidak dapat dibersihkan:', cleanupError.message);
      }
      setAttachmentError(error instanceof Error ? error.message : 'Lampiran tidak dapat disimpan.');
    } finally {
      setIsSaving(false);
    }
  };

  if (correctionActionType) {
    const actionLabels = {
      TS: 'Tebus penuh',
      TKS: 'Tebus sebahagian',
      US: 'Bayar upah simpan',
      OL: 'Overlap',
      Pusing: 'Pusing',
      Lelong: 'Lelong'
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-2 backdrop-blur-sm sm:p-4">
        <div className="max-h-[95dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4 sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Pilih SAG untuk tindakan</h2>
              <p className="text-sm text-slate-500">{actionLabels[correctionActionType]}</p>
            </div>
            <button type="button" onClick={onClose} disabled={isSaving} className="rounded-full p-2 text-slate-400 hover:bg-slate-200 disabled:opacity-50" aria-label="Tutup">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-6">
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Pilih surat gadaian sedia ada yang masih aktif</span>
              <select
                value={actionSourceId}
                onChange={event => setActionSourceId(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Pilih SAG aktif</option>
                {availableSourceTransactions.map(transaction => (
                  <option key={transaction.id} value={transaction.id}>
                    #{transaction.refNo} · {transaction.institution} · {formatRM(getCurrentRedemption(transaction))}
                  </option>
                ))}
              </select>
              {availableSourceTransactions.length === 0 && (
                <span className="block text-xs text-amber-700">Tiada SAG aktif yang boleh dipilih untuk tindakan ini.</span>
              )}
            </label>

            {selectedSourceTransaction && (
              <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <h3 className="font-bold text-slate-800">
                    Surat #{selectedSourceTransaction.refNo} · {selectedSourceTransaction.institution}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Berat direkodkan {getCurrentPledgedWeight(selectedSourceTransaction)}g · Baki pembiayaan {formatRM(getCurrentPrincipal(selectedSourceTransaction))} · Jumlah tebus {formatRM(getCurrentRedemption(selectedSourceTransaction))}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700">Aset EDR yang dipautkan kepada surat ini</h4>
                  {sourceEdrAssets.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {sourceEdrAssets.map(asset => (
                        <li key={asset.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                          <span className="font-mono font-semibold">{asset.code || asset.id}</span>
                          {' · '}{asset.type} {asset.purity || ''} · {Number(asset.weight) || 0}g
                        </li>
                      ))}
                    </ul>
                  ) : sourceAssetIds.length > 0 ? (
                    <p className="mt-2 text-xs text-amber-700">
                      Aset EDR yang dipautkan tidak ditemui dalam inventori aktif: {sourceAssetIds.join(', ')}.
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-amber-700">
                      Tiada rekod aset EDR dipautkan pada surat ini. Berat surat ialah {getCurrentPledgedWeight(selectedSourceTransaction)}g; semak inventori aset sebelum meneruskan.
                    </p>
                  )}
                </div>
              </section>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} className="rounded-lg px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-100">Batal</button>
              <button
                type="submit"
                disabled={!selectedSourceTransaction}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Teruskan rekod tindakan
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="min-w-0 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90dvh] sm:max-h-[95dvh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">

        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center">
            {initialData
              ? <><Pencil className="mr-2 text-emerald-600" size={20} /> Edit Surat Gadaian</>
              : <><Plus className="mr-2 text-emerald-600" size={20} /> Tambah Surat Gadaian</>}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-full hover:bg-slate-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 sm:p-5">

            <div className="order-first md:col-span-2 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Maklumat surat gadaian</h3>
              <p className="mt-1 text-xs text-slate-500">Susun maklumat utama, tarikh dan aset yang terlibat.</p>
            </div>

            <div className="order-1 space-y-2">
              <label className="text-sm font-semibold text-slate-700">Status / Jenis Pajakan</label>
              <select name="type" value={formData.type} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all">
                <option value="Pajakan Asal">Pajakan Asal</option>
                <option value="Salin / Parking (70%)">Salin</option>
                <option value="OL / Pusing (80%)">OL</option>
                <option value="Tebus (Cash)">Tebus Cash</option>
                <option value="Tebus (EDT)">Tebus EDT</option>
                <option value="Tebus Penuh (TS)">TS · Tebus Penuh</option>
                <option value="Tebus Sebahagian (TKS)">TKS · Tebus Sebahagian</option>
                <option value="Upah Simpan (US)">US · Upah Simpan</option>
                <option value="Pusing">Pusing</option>
                <option value="Lelong">Lelong</option>
              </select>
            </div>

            <div className="order-4 space-y-2">
              <label htmlFor="transaction-date" className="text-sm font-semibold text-slate-700">Tarikh &amp; Masa (MYT)</label>
              <input id="transaction-date" type="datetime-local" name="date" value={formData.date} onChange={handleChange} required className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
              {hasLegacyDateWithoutTime && (
                <p className="text-xs text-slate-500">Masa tidak direkod untuk rekod lama. Pilih masa yang betul jika mahu menyimpannya.</p>
              )}
            </div>

            {!formData.type.includes('Tebus') && (
              <div className="order-5 space-y-2">
                <label htmlFor="redemption-date" className="text-sm font-semibold text-slate-700">Tarikh Matang</label>
                <input
                  id="redemption-date"
                  type="date"
                  name="redemptionDate"
                  value={formData.redemptionDate}
                  onChange={handleChange}
                  required
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
                <p className="text-xs text-slate-500">Dashboard akan beri amaran 3 hari sebelum tarikh ini dan jika sudah lewat.</p>
              </div>
            )}

            {!formData.type.includes('Tebus') && (
              <div className="order-7 space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">
                  {formData.type === 'Pajakan Asal' ? 'Pilih Aset EDT yang tersedia (Opsional)' : 'Pilih Aset EDR untuk transaksi sambungan (Opsional)'}
                </label>
                <button
                  type="button"
                  aria-expanded={isAssetListOpen}
                  onClick={() => setIsAssetListOpen(open => !open)}
                  className="w-full min-h-12 p-2.5 border border-slate-300 rounded-lg text-left flex items-center justify-between gap-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <span className={selectedAssetIds.length ? 'text-slate-800' : 'text-slate-400'}>
                    {selectedAssetIds.length
                      ? `${selectedAssetIds.length} aset dipilih (${formData.weight}g)`
                      : formData.type === 'Pajakan Asal'
                        ? 'Pilih satu atau lebih aset EDT yang tersedia'
                        : 'Pilih aset EDR daripada transaksi aktif'}
                  </span>
                  <span className="text-slate-500 shrink-0">{isAssetListOpen ? '▲' : '▼'}</span>
                </button>
                {isAssetListOpen && (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg custom-scrollbar">
                    {(formData.type === 'Pajakan Asal' ? availableAssets : pledgedAssets).map(asset => (
                      <label key={asset.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 cursor-pointer border-b last:border-b-0 border-slate-100">
                        <input
                          type="checkbox"
                          checked={selectedAssetIds.map(String).includes(String(asset.id))}
                          onChange={() => handleAssetToggle(asset.id)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-mono text-xs font-bold text-amber-800">
                          {asset.code || generateAssetCode(asset.type, asset.supplierCodes || asset.supplier, asset.purity, asset.weight, asset.id)}
                        </span>
                        <span className="text-sm text-slate-700">{asset.type} {asset.purity} ({asset.weight}g) - {asset.supplier}</span>
                      </label>
                    ))}
                    {(formData.type === 'Pajakan Asal' ? availableAssets : pledgedAssets).length === 0 && (
                      <p className="p-3 text-sm text-slate-500">
                        {formData.type === 'Pajakan Asal'
                          ? 'Tiada aset EDT tersedia. Aset yang sedang aktif dalam Ar-Rahnu tidak boleh dipilih.'
                          : 'Tiada aset EDR dipautkan kepada transaksi aktif untuk disambung.'}
                      </p>
                    )}
                  </div>
                )}
                {!!selectedAssetIds.length && (
                  <p className="text-xs text-slate-500">Berat transaksi dikira daripada jumlah berat aset dipilih. Pautan ini mengekalkan status check-in sehingga transaksi selesai.</p>
                )}
              </div>
            )}

            <div className="order-2 space-y-2">
              <label className="text-sm font-semibold text-slate-700">Institusi</label>
              <select name="institution" value={formData.institution} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all">
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.name}>{inst.name}</option>
                ))}
              </select>
            </div>

            <div className="order-3 space-y-2">
              <label className="text-sm font-semibold text-slate-700">No. Surat Rujukan</label>
              <input type="text" name="refNo" value={formData.refNo} onChange={handleChange} placeholder="cth. 1007-1008" required className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
            </div>

            <div className="order-6 space-y-2">
              <label className="text-sm font-semibold text-slate-700">Ketulenan</label>
              <select
                name="purity"
                value={formData.purity}
                onChange={handleChange}
                required={!formData.type.includes('Tebus')}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              >
                <option value="">Pilih ketulenan</option>
                {formData.purity && !['916', '999', '999.9', '950', '875', '833', '750', 'Campuran / Lain-lain'].includes(String(formData.purity)) && (
                  <option value={formData.purity}>{formData.purity}</option>
                )}
                <option value="916">916</option>
                <option value="999">999</option>
                <option value="999.9">999.9</option>
                <option value="950">950</option>
                <option value="875">875</option>
                <option value="833">833</option>
                <option value="750">750</option>
                <option value="Campuran / Lain-lain">Campuran / Lain-lain</option>
              </select>
            </div>

            <div className="order-8 space-y-2 md:col-span-2">
              <label htmlFor="transaction-remarks" className="text-sm font-semibold text-slate-700">Catatan</label>
              <textarea
                id="transaction-remarks"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows={2}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            <section className="order-9 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Paperclip size={16} className="text-emerald-600" />
                  Fail Lampiran
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Muat naik PDF, imej, dokumen dan fail sokongan lain. Maksimum {maximumTransactionAttachments} fail, sehingga 50 MB setiap fail.
                  {' '}Baki slot: {Math.max(remainingAttachmentSlots, 0)}.
                </p>
              </div>

              <label className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 ${remainingAttachmentSlots <= 0 ? 'pointer-events-none opacity-50' : ''}`}>
                <UploadCloud size={18} />
                Pilih fail
                <input
                  type="file"
                  multiple
                  disabled={remainingAttachmentSlots <= 0 || isSaving}
                  onChange={handleAttachmentSelection}
                  className="sr-only"
                />
              </label>

              {(savedAttachments.length > 0 || newAttachmentFiles.length > 0) && (
                <ul className="space-y-2">
                  {savedAttachments.map(attachment => (
                    <li key={attachment.path} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <span className="min-w-0 break-all text-sm text-slate-700">{attachment.name}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenAttachment(attachment)}
                          disabled={!attachment.path || isSaving}
                          className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                          aria-label={`Buka lampiran ${attachment.name}`}
                        >
                          <ExternalLink size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSavedAttachment(attachment)}
                          disabled={isSaving}
                          className="rounded-md p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                          aria-label={`Buang lampiran ${attachment.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </span>
                    </li>
                  ))}
                  {newAttachmentFiles.map((file, index) => (
                    <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2">
                      <span className="min-w-0 break-all text-sm text-slate-700">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setNewAttachmentFiles(previous => previous.filter((_, fileIndex) => fileIndex !== index))}
                        disabled={isSaving}
                        className="shrink-0 rounded-md p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                        aria-label={`Buang fail ${file.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {attachmentError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{attachmentError}</p>}
            </section>

            <div className="order-10 md:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Penilaian dan pembiayaan</h3>
                <p className="mt-1 text-xs text-slate-500">Masukkan berat, kadar taksiran dan butiran caj.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const institution = institutions.find(item => item.name === formData.institution);
                  if (onRefresh && institution) {
                    onRefresh(institution.id, ({ institutionRate }) =>
                      setFormData(prev => recalculateFinancialFields(
                        { ...prev, marhunPrice: institutionRate.toFixed(2) },
                        true
                      ))
                    );
                  }
                }}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
              >
                <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                {isRefreshing ? 'Mengemas kini...' : 'Segar semula kadar'}
              </button>
            </div>

            <div className="order-11 md:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="flex min-h-10 items-end text-sm font-semibold text-slate-700">Berat Emas (g)</label>
                <input type="number" step="0.01" min="0" name="weight" value={formData.weight} onChange={handleChange} readOnly={selectedAssetIds.length > 0} required className={`w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all ${selectedAssetIds.length ? 'bg-slate-100' : ''}`} />
              </div>
              <div className="space-y-2">
                <label className="flex min-h-10 items-end text-sm font-semibold text-slate-700">Harga Taksiran (RM/g)</label>
                <input type="number" step="0.01" min="0" name="marhunPrice" value={formData.marhunPrice} onChange={handleChange} required className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="flex min-h-10 items-end text-sm font-semibold text-slate-700">Kadar Pembiayaan (%)</label>
                <input type="number" step="0.01" name="margin" value={formData.margin} onChange={handleChange} min="0" max="100" required className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50" />
              </div>
            </div>

            {!formData.type.includes('Tebus') && (
              <div className="order-12 md:col-span-2 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex min-h-10 items-end text-sm font-semibold text-slate-700">Kadar Caj Simpanan (% sebulan)</label>
                  <input
                    type="number"
                    name="feeRate"
                    min="0"
                    step="0.01"
                    value={formData.feeRate}
                    onChange={handleChange}
                    required
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex min-h-10 items-end text-sm font-semibold text-slate-700">Tempoh Pajakan (bulan)</label>
                  <input
                    type="number"
                    name="feeTermMonths"
                    min="1"
                    step="1"
                    value={formData.feeTermMonths}
                    onChange={handleChange}
                    required
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex min-h-10 items-end text-sm font-semibold text-slate-700">Asas Kiraan Caj</label>
                  <select
                    name="feeBasis"
                    value={formData.feeBasis}
                    onChange={handleChange}
                    required
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Pilih asas caj</option>
                    <option value="nilaiMarhun">Nilai Marhun</option>
                    <option value="jumlahPembiayaan">Jumlah Pembiayaan</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex min-h-10 items-end text-sm font-semibold text-slate-700">
                    {formData.type.includes('OL') || formData.type.toLowerCase().includes('pusing')
                      ? 'Fi berkaitan baharu sebenar (RM)'
                      : 'Caj Simpanan Sebenar (RM)'}
                  </label>
                  <input
                    type="number"
                    name="fee"
                    min="0"
                    step="0.01"
                    value={formData.fee}
                    onChange={handleChange}
                    required
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <p className="sm:col-span-2 text-xs text-slate-500">
                  {formData.feeBasis
                    ? `Anggaran upah simpan: ${formatRM(feeBasisAmount)} × ${(parseFloat(formData.feeRate) || 0).toFixed(2)}% × ${feeTermMonths || 0} bulan. Anggaran bulanan ${formatRM(estimatedMonthlyStorageFee)}, jumlah ${formatRM(estimatedTotalStorageFee)}, jumlah tebus anggaran ${formatRM(estimatedTotalRedemption)}. Untuk OL, masukkan jumlah fi berkaitan sebenar mengikut sebut harga institusi.`
                    : 'Pilih asas caj mengikut terma Ar-Rahnu untuk melihat anggaran caj bulanan.'}
                </p>
              </div>
            )}

            {formData.type !== 'Pajakan Asal' && (
              <div className="order-last space-y-2 md:col-span-2">
                <label className="flex min-h-10 items-end text-sm font-semibold text-slate-700">Jumlah penyelesaian surat lama (RM)</label>
                <input type="number" step="0.01" min="0" name="redemption" value={formData.redemption} onChange={handleChange} required className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all bg-amber-50" placeholder="Pembiayaan lama + caj tertunggak" />
                {(formData.type.includes('OL') || formData.type.toLowerCase().includes('pusing')) && (
                  <p className="text-xs leading-relaxed text-slate-500">
                    Masukkan jumlah penyelesaian sebenar daripada institusi (pembiayaan lama + caj tertunggak). Formula baki tunai: pembiayaan baharu − jumlah penyelesaian surat lama − fi berkaitan baharu.
                  </p>
                )}
              </div>
            )}

          </div>

          <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-800">Ringkasan pembiayaan</h3>
              <p className="mt-1 text-xs text-emerald-700">Semak nilai marhun, jumlah pembiayaan dan lebihan tunai anggaran.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex h-full flex-col">
                <label htmlFor="transaction-marhun-value" className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1 block min-h-12">Jumlah Nilai Marhun (RM)</label>
                <input
                  id="transaction-marhun-value"
                  type="number"
                  step="0.01"
                  name="marhunValue"
                  value={formData.marhunValue}
                  onChange={handleChange}
                  min="0"
                  required
                  className="w-full p-2.5 border border-emerald-200 rounded-lg bg-white text-lg font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <p className="mt-1 min-h-12 text-xs text-slate-500">Kiraan asal: berat emas × harga taksiran (RM/g). Boleh ubah manual.</p>
              </div>
              <div className="flex h-full flex-col">
                <label htmlFor="transaction-loan" className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1 block min-h-12">Jumlah Pembiayaan (RM)</label>
                <input
                  id="transaction-loan"
                  type="number"
                  step="0.01"
                  name="loan"
                  value={formData.loan}
                  onChange={handleChange}
                  min="0"
                  required
                  className="w-full p-2.5 border border-emerald-200 rounded-lg bg-white text-lg font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <p className="mt-1 min-h-12 text-xs text-slate-500">Kiraan asal: Jumlah Nilai Marhun × kadar pembiayaan. Boleh ubah manual.</p>
              </div>
              <div className="flex h-full flex-col">
                <label htmlFor="transaction-projected-profit" className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1 block min-h-12">Anggaran Lebihan Tunai Selepas Caj (bukan untung) (RM)</label>
                <input
                  id="transaction-projected-profit"
                  type="number"
                  step="0.01"
                  name="profit"
                  value={formData.profit}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-emerald-200 rounded-lg bg-white text-lg font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <p className="mt-1 min-h-12 text-xs text-slate-500">
                  {formData.type.toLowerCase().includes('salin') ||
                  formData.type.toLowerCase().includes('ol') ||
                  formData.type.toLowerCase().includes('pusing')
                    ? 'Salin/OL: pembiayaan baharu − pembiayaan lama − caj tertunggak lama − fi berkaitan baharu. Masukkan jumlah penyelesaian lama sebagai pembiayaan lama + caj tertunggak. Lebihan tunai bukan keuntungan; pembiayaan tetap perlu dibayar balik. Boleh ubah manual.'
                    : formData.type === 'Pajakan Asal'
                      ? 'Pajakan asal: masukkan caj sebenar institusi. Nilai ini bukan keuntungan yang telah direalisasikan.'
                      : formData.type.toLowerCase().includes('tebus')
                        ? 'Tebusan: rekodkan amaun tebus sebenar mengikut resit institusi.'
                        : 'Semak amaun dan caj dengan institusi; nilai yang dipaparkan ialah anggaran, bukan keuntungan atau kelulusan.'}
                </p>
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-400 hidden sm:flex items-center gap-2">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-600">[ Esc ] Batal</span>
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-600">[ Ctrl + Enter ] Simpan</span>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:space-x-3 gap-3 w-full sm:w-auto">
              <button type="button" onClick={onClose} disabled={isSaving} className="h-11 w-full rounded-xl px-5 text-slate-600 font-semibold transition-colors hover:bg-slate-100 disabled:opacity-50 sm:w-auto">
                Batal
              </button>
              <button id="transaction-modal-submit-btn" type="submit" disabled={isSaving} className="w-full sm:w-auto justify-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center disabled:cursor-not-allowed disabled:opacity-50">
                {isSaving ? 'Menyimpan fail...' : initialData ? 'Kemaskini Surat' : 'Simpan Surat'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssetModal({ initialData, currentGoldPrice, onClose, onSave, suppliers }) {
  const initialSupplierCodes = initialData?.supplierCodes || suppliers
    .filter(item => initialData?.supplier?.split(',').map(name => name.trim()).includes(item.name))
    .map(item => item.code);
  const [selectedSupplierCodes, setSelectedSupplierCodes] = useState(initialSupplierCodes);
  const [isSupplierListOpen, setIsSupplierListOpen] = useState(false);
  const [supplierError, setSupplierError] = useState('');
  const selectableSuppliers = suppliers.filter(item =>
    isRecordVisible(item) || selectedSupplierCodes.includes(item.code)
  );
  const [formData, setFormData] = useState({
    code: initialData?.code || '',
    date: getMalaysiaDateTimeInputValue(initialData?.date || new Date().toISOString()),
    type: initialData?.type || 'Gold Bar',
    supplier: initialData?.supplier || '',
    purity: initialData?.purity || '999.9',
    weight: initialData?.weight !== undefined ? initialData.weight : '',
    price: initialData?.price !== undefined ? initialData.price : '',
    status: initialData?.status || 'EDT'
  });
  const selectedSuppliers = suppliers.filter(item => selectedSupplierCodes.includes(item.code));

  useEffect(() => {
    const handleAssetModalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        const submitBtn = document.getElementById('asset-modal-submit-btn');
        if (submitBtn) submitBtn.click();
      }
    };
    window.addEventListener('keydown', handleAssetModalKeyDown);
    return () => window.removeEventListener('keydown', handleAssetModalKeyDown);
  }, [onClose]);

  const liveMarketValuation = (parseFloat(formData.weight) || 0) * (currentGoldPrice || 0);
  const costPrice = parseFloat(formData.price) || 0;
  const valuationDiff = liveMarketValuation - costPrice;

  const handleAutoGenerateCode = () => {
    const generated = generateAssetCode(
      formData.type,
      selectedSupplierCodes,
      formData.purity,
      formData.weight || '10',
      initialData?.id || Date.now(),
      suppliers
    );
    setFormData(prev => ({ ...prev, code: generated }));
  };

  const handleSupplierToggle = (code) => {
    const updatedCodes = selectedSupplierCodes.includes(code)
      ? selectedSupplierCodes.filter(selectedCode => selectedCode !== code)
      : [...selectedSupplierCodes, code];
    const updatedNames = suppliers.filter(item => updatedCodes.includes(item.code)).map(item => item.name);
    setSelectedSupplierCodes(updatedCodes);
    setFormData(prev => {
      const autoCode = generateAssetCode(prev.type, selectedSupplierCodes, prev.purity, prev.weight, '01', suppliers);
      const shouldUpdateCode = !initialData && (!prev.code || prev.code === autoCode);
      return {
        ...prev,
        supplier: updatedNames.join(', '),
        code: shouldUpdateCode
          ? generateAssetCode(prev.type, updatedCodes, prev.purity, prev.weight, '01', suppliers)
          : prev.code
      };
    });
    setSupplierError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Auto-update code if not editing existing asset with saved code
      if (!initialData && (name === 'type' || name === 'purity' || name === 'weight')) {
        const autoPrev = generateAssetCode(prev.type, selectedSupplierCodes, prev.purity, prev.weight, '01', suppliers);
        if (!prev.code || prev.code === autoPrev) {
          updated.code = generateAssetCode(
            name === 'type' ? value : updated.type,
            selectedSupplierCodes,
            name === 'purity' ? value : updated.purity,
            name === 'weight' ? value : updated.weight,
            '01',
            suppliers
          );
        }
      }
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedSupplierCodes.length === 0) {
      setSupplierError('Pilih sekurang-kurangnya satu pembekal.');
      return;
    }
    const supplierNames = selectedSuppliers.map(item => item.name);
    const finalCode = formData.code?.trim() || generateAssetCode(formData.type, selectedSupplierCodes, formData.purity, formData.weight, initialData?.id || Date.now(), suppliers);
    onSave({
      ...formData,
      date: parseTransactionDateTime(formData.date).toISOString(),
      supplier: supplierNames.join(', '),
      supplierCodes: selectedSupplierCodes,
      code: finalCode,
      weight: parseFloat(formData.weight) || 0,
      price: parseFloat(formData.price) || 0
    });
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="min-w-0 bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] sm:max-h-[95dvh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">

        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center">
            {initialData ? <Pencil className="mr-2 text-emerald-600" size={20} /> : <Plus className="mr-2 text-emerald-600" size={20} />}
            {initialData ? 'Kemaskini Maklumat Aset' : 'Register New Asset'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-full hover:bg-slate-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">

            {/* Unique Asset ID Field */}
            <div className="space-y-1 md:col-span-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700 flex items-center">
                  <Tag size={16} className="mr-1 text-emerald-600" /> Kod Unik Aset (Asset ID)
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateCode}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors border border-emerald-200"
                >
                  <RefreshCw size={12} className="mr-1" /> Auto-Jana ID
                </button>
              </div>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="Cth: GB-PG-999-10G-01"
                required
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 bg-amber-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all uppercase tracking-wide"
              />
              <p className="text-xs text-slate-500">
                Format: <span className="font-semibold text-slate-700">[JENIS]-[SUMBER]-[MUTU]-[BERAT]-[NO]</span> (Cth: <span className="font-semibold text-emerald-700">GB-PG-999-10G-01</span> = Gold Bar, Public Gold, 999, 10g).
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Item Type</label>
              <select name="type" value={formData.type} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all">
                <option value="Gold Bar">Gold Bar</option>
                <option value="Barang Kemas">Barang Kemas</option>
                <option value="Dinar">Dinar</option>
                <option value="Syiling Emas">Syiling Emas (Coin)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Purchase Date &amp; Time</label>
              <input type="datetime-local" name="date" value={formData.date} onChange={handleChange} required className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Supplier / Source</label>
              <button
                type="button"
                aria-expanded={isSupplierListOpen}
                onClick={() => setIsSupplierListOpen(open => !open)}
                className={`w-full min-h-12 p-2.5 border rounded-lg text-left flex items-center justify-between gap-2 focus:ring-2 focus:ring-emerald-500 outline-none ${supplierError ? 'border-red-400' : 'border-slate-300'}`}
              >
                <span className={selectedSuppliers.length ? 'text-slate-800' : 'text-slate-400'}>
                  {selectedSuppliers.length
                    ? selectedSuppliers.map(item => `${item.code} - ${item.name}`).join(', ')
                    : 'Pilih satu atau lebih pembekal'}
                </span>
                <span className="text-slate-500 shrink-0">{isSupplierListOpen ? '▲' : '▼'}</span>
              </button>
              {isSupplierListOpen && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg custom-scrollbar">
                  {selectableSuppliers.map(supplier => (
                    <label key={supplier.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 cursor-pointer border-b last:border-b-0 border-slate-100">
                      <input
                        type="checkbox"
                        checked={selectedSupplierCodes.includes(supplier.code)}
                        onChange={() => handleSupplierToggle(supplier.code)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-mono text-xs font-bold text-emerald-700">{supplier.code}</span>
                      <span className="text-sm text-slate-700">{supplier.name}</span>
                    </label>
                  ))}
                  {selectableSuppliers.length === 0 && <p className="p-3 text-sm text-slate-500">Tiada pembekal aktif. Daftar pembekal terlebih dahulu.</p>}
                </div>
              )}
              {supplierError && <p className="text-xs text-red-600">{supplierError}</p>}
              {!!selectedSuppliers.length && (
                <p className="text-xs text-slate-500">{selectedSuppliers.length} pembekal dipilih; kod pembekal digunakan dalam Asset ID.</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Purity (Mutu)</label>
              <select name="purity" value={formData.purity} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all">
                <option value="999.9">999.9 (24K)</option>
                <option value="950">950</option>
                <option value="916">916 (22K)</option>
                <option value="875">875 (21K)</option>
                <option value="833">833 (20K)</option>
                <option value="750">750 (18K)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Weight (g)</label>
              <input type="number" step="0.01" name="weight" value={formData.weight} onChange={handleChange} required className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Purchase Price (RM)</label>
              <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} required className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Status Aset</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all">
                <option value="EDT">EDT · Available / Check-out</option>
                <option value="Dalam Ar-Rahnu">EDR · Dalam Ar-Rahnu / Check-in</option>
                <option value="Dilelong">Dilelong · Tidak lagi dalam inventori tersedia</option>
              </select>
            </div>

          </div>

          {/* Anti-Human-Error Live Valuation Card */}
          <div className="rounded-2xl border border-corporate-teal-200 bg-corporate-teal-50/50 p-4 mb-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-corporate-teal-900 flex items-center gap-1.5">
                <Scale size={14} className="text-corporate-teal-600" />
                Taksiran Nilai Semasa (Anti-Ralat Manusia)
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-500">
                Spot: RM{Number(currentGoldPrice || 0).toFixed(2)}/g
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2 pt-2 border-t border-corporate-teal-100">
              <div>
                <p className="text-[11px] text-slate-500">Anggaran Nilai Pasaran Semasa:</p>
                <p className="text-lg font-black text-corporate-teal-800 font-mono">
                  {formatRM(liveMarketValuation)}
                </p>
              </div>
              {costPrice > 0 && (
                <div className="sm:text-right">
                  <p className="text-[11px] text-slate-500">Beza Kos Belian Asal:</p>
                  <p className={`text-xs font-bold font-mono ${valuationDiff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {valuationDiff >= 0 ? `+${formatRM(valuationDiff)}` : formatRM(valuationDiff)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-400 hidden sm:flex items-center gap-2">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-600">[ Esc ] Batal</span>
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-600">[ Ctrl + Enter ] Simpan</span>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:space-x-3 gap-3 w-full sm:w-auto">
              <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors">
                Batal
              </button>
              <button id="asset-modal-submit-btn" type="submit" className="w-full sm:w-auto justify-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center">
                {initialData ? 'Kemaskini Aset' : 'Simpan Aset'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function InstitutionModal({ initialData, currentGoldPrice, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    category: initialData?.category || 'Koperasi',
    branch: initialData?.branch || 'Bandar Baru Bangi',
    maxMargin: initialData?.maxMargin !== undefined ? initialData.maxMargin : 75,
    marhunRate: initialData?.marhunRate !== undefined ? initialData.marhunRate : 590.00,
    marhunSpread: initialData?.marhunSpread !== undefined
      ? initialData.marhunSpread
      : Number(((initialData?.marhunRate ?? 590.00) - currentGoldPrice).toFixed(2)),
    remarks: initialData?.remarks || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      maxMargin: parseFloat(formData.maxMargin) || 70,
      marhunRate: parseFloat(formData.marhunRate) || 0,
      marhunSpread: Number(formData.marhunSpread)
    });
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="min-w-0 bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] sm:max-h-[95dvh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center">
            <Building2 className="mr-2 text-emerald-600" size={20} />
            {initialData ? 'Kemaskini Institusi / Koperasi' : 'Daftar Institusi / Koperasi Baharu'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-full hover:bg-slate-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Nama Institusi / Koperasi</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Cth: Koputra - Bank Muamalat / KPDRM - PDRM"
                required
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Kategori</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              >
                <option value="Koperasi">Koperasi</option>
                <option value="Pajak Gadai">Pajak Gadai (Ar-Rahnu)</option>
                <option value="Koperasi & Bank">Koperasi & Bank</option>
                <option value="Bank Islam">Bank Islam</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Cawangan / Lokasi di Bangi</label>
              <input
                type="text"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                placeholder="Cth: Seksyen 9, Bandar Baru Bangi"
                required
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Margin Maksimum (%)</label>
              <input
                type="number"
                step="1"
                min="50"
                max="90"
                name="maxMargin"
                value={formData.maxMargin}
                onChange={handleChange}
                required
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
              <p className="text-xs text-slate-400">Standard: 70% (Salin), 75%, atau 80% (OL).</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Kadar Marhun Semasa (RM/g)</label>
              <input
                type="number"
                step="0.01"
                name="marhunRate"
                value={formData.marhunRate}
                onChange={handleChange}
                required
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 bg-amber-50/40 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
              <p className="text-xs text-slate-400">Kadar harga marhun yang ditawarkan.</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Spread Anggaran (RM/g)</label>
              <input
                type="number"
                step="0.01"
                name="marhunSpread"
                value={formData.marhunSpread}
                onChange={handleChange}
                required
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
              <p className="text-xs text-amber-700">Refresh mengira Spot + Spread ini; ia anggaran, bukan kadar rasmi institusi.</p>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Catatan / Syarat Khusus (Opsional)</label>
              <input
                type="text"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                placeholder="Cth: Wajib keahlian koperasi / perlukan surat tawaran"
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end sm:space-x-3 gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto justify-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center"
            >
              {initialData ? 'Kemaskini Institusi' : 'Simpan Institusi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SupplierModal({ initialData, onClose, onSave }) {
  const [formData, setFormData] = useState({
    code: initialData?.code || '',
    name: initialData?.name || '',
    category: initialData?.category || '',
    products: initialData?.products || '',
    website: initialData?.website || '',
    remarks: initialData?.remarks || ''
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave({
      ...formData,
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      website: formData.website.trim()
    });
  };

  const generateCode = () => {
    const words = formData.name.trim().split(/\s+/).filter(Boolean);
    const code = words.length > 1
      ? words.map(word => word[0]).join('').toUpperCase().slice(0, 3)
      : (words[0] || '').slice(0, 3).toUpperCase();
    setFormData(prev => ({ ...prev, code }));
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="min-w-0 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90dvh] sm:max-h-[95dvh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center">
            <Store className="mr-2 text-emerald-600" size={20} />
            {initialData ? 'Kemaskini Pembekal' : 'Daftar Pembekal Baharu'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-full hover:bg-slate-200" aria-label="Tutup">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-6">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label htmlFor="supplier-code" className="text-sm font-semibold text-slate-700">Kod Pembekal</label>
                <button type="button" onClick={generateCode} className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md border border-emerald-200">
                  <RefreshCw size={12} className="mr-1" /> Jana Kod
                </button>
              </div>
              <input id="supplier-code" name="code" value={formData.code} onChange={handleChange} required maxLength={8} placeholder="Cth: PG" className="w-full p-2.5 border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label htmlFor="supplier-name" className="text-sm font-semibold text-slate-700">Nama Pembekal</label>
              <input id="supplier-name" name="name" value={formData.name} onChange={handleChange} required placeholder="Cth: Public Gold" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label htmlFor="supplier-category" className="text-sm font-semibold text-slate-700">Kategori</label>
              <input id="supplier-category" name="category" value={formData.category} onChange={handleChange} placeholder="Cth: Bullion & Pelaburan" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label htmlFor="supplier-products" className="text-sm font-semibold text-slate-700">Produk / Perkhidmatan</label>
              <textarea id="supplier-products" name="products" value={formData.products} onChange={handleChange} rows={2} placeholder="Senaraikan produk utama" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-y" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label htmlFor="supplier-website" className="text-sm font-semibold text-slate-700">Laman Web</label>
              <input id="supplier-website" type="url" name="website" value={formData.website} onChange={handleChange} placeholder="https://contoh.com" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label htmlFor="supplier-remarks" className="text-sm font-semibold text-slate-700">Catatan</label>
              <textarea id="supplier-remarks" name="remarks" value={formData.remarks} onChange={handleChange} rows={2} placeholder="Maklumat tambahan (pilihan)" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-y" />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-colors">Batal</button>
            <button type="submit" className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors">
              {initialData ? 'Kemaskini Pembekal' : 'Simpan Pembekal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}