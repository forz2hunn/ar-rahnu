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
  LogOut
} from 'lucide-react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { supabaseClient } from './src/lib/supabase';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ReferenceLine
} from 'recharts';

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
const transactionStatusOptions = ['Pajakan Asal', 'Salin', 'OL', 'Tebus Cash', 'Tebus EDT'];
const getTransactionStatus = (transaction) => {
  if (transactionStatusOptions.includes(transaction.transactionStatus)) return transaction.transactionStatus;
  const type = String(transaction.type || '').toLowerCase();
  if (type.includes('pajakan')) return 'Pajakan Asal';
  if (type.includes('salin')) return 'Salin';
  if (type.includes('ol')) return 'OL';
  if (type.includes('tebus') && type.includes('edt')) return 'Tebus EDT';
  if (type.includes('tebus')) return 'Tebus Cash';
  return 'Lain-lain';
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
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      if (authMode === 'sign-up') {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setAuthNotice('Pendaftaran diterima. Sahkan alamat e-mel anda melalui pautan yang dihantar, kemudian log masuk.');
        }
      } else {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
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
          <h1 className="mt-2 text-2xl font-bold text-slate-800">{authMode === 'sign-in' ? 'Log masuk Supabase' : 'Cipta akaun Supabase'}</h1>
          <p className="mt-2 text-sm text-slate-500">Data dashboard disimpan dalam ruang peribadi akaun anda.</p>
        </div>
        <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="supabase-email">E-mel</label>
        <input id="supabase-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="mb-4 w-full rounded-lg border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-emerald-500" />
        <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="supabase-password">Kata laluan</label>
        <input id="supabase-password" type="password" autoComplete={authMode === 'sign-in' ? 'current-password' : 'new-password'} minLength={6} required value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-emerald-500" />
        {authError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{authError}</p>}
        {authNotice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{authNotice}</p>}
        <button type="submit" disabled={isSubmitting} className="mt-6 w-full rounded-lg bg-emerald-700 px-4 py-3 font-bold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50">
          {isSubmitting ? 'Memproses...' : authMode === 'sign-in' ? 'Log masuk' : 'Daftar akaun'}
        </button>
        <button type="button" onClick={() => { setAuthMode(authMode === 'sign-in' ? 'sign-up' : 'sign-in'); setAuthError(''); setAuthNotice(''); }} className="mt-4 w-full text-sm font-semibold text-emerald-700 hover:text-emerald-900">
          {authMode === 'sign-in' ? 'Belum ada akaun? Daftar di sini' : 'Sudah ada akaun? Log masuk'}
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
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
      <span className="hidden sm:inline">{isDark ? 'Mod terang' : 'Mod gelap'}</span>
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
  
  // State dengan sokongan localStorage
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem('ar_rahnu_transactions_v2');
      const savedTransactions = saved ? JSON.parse(saved) : initialTransactions;
      return Array.isArray(savedTransactions)
        ? savedTransactions.map(transaction => ({ ...transaction, transactionStatus: getTransactionStatus(transaction) }))
        : initialTransactions;
    } catch {
      return initialTransactions;
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
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((a, idx) => ({
          ...a,
          code: a.code || generateAssetCode(a.type, a.supplier, a.purity, a.weight, a.id || idx + 1)
        }));
      }
      return initialAssets;
    } catch {
      return initialAssets;
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

  const appData = useMemo(() => ({ transactions, institutions, assets, suppliers }), [transactions, institutions, assets, suppliers]);
  const localSnapshotRef = useRef(appData);
  localSnapshotRef.current = appData;
  const cloudSnapshotRef = useRef('');
  const ownWriteSnapshotsRef = useRef(new Set<string>());
  const saveQueueRef = useRef(Promise.resolve());
  const [isDataReady, setIsDataReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState('loading');
  const [syncError, setSyncError] = useState('');
  const [isTableSetupRequired, setIsTableSetupRequired] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [hydrationRetry, setHydrationRetry] = useState(0);
  const [saveRetry, setSaveRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let channel = null;

    const applyCloudData = (incoming) => {
      if (!incoming || !Array.isArray(incoming.transactions) ||
          !Array.isArray(incoming.institutions) || !Array.isArray(incoming.assets) ||
          !Array.isArray(incoming.suppliers)) {
        throw new Error('Struktur data Supabase tidak lengkap. Pastikan jadual ar_rahnu_user_data menggunakan skema aplikasi.');
      }

      const nextData = {
        transactions: incoming.transactions.map(transaction => ({
          ...transaction,
          transactionStatus: getTransactionStatus(transaction)
        })),
        institutions: incoming.institutions,
        assets: incoming.assets,
        suppliers: incoming.suppliers
      };
      const serializedData = JSON.stringify(nextData);
      cloudSnapshotRef.current = serializedData;
      if (JSON.stringify(localSnapshotRef.current) === serializedData) return;

      setTransactions(nextData.transactions);
      setInstitutions(nextData.institutions);
      setAssets(nextData.assets);
      setSuppliers(nextData.suppliers);
    };

    const loadCloudData = async () => {
      setIsDataReady(false);
      setSyncStatus('loading');
      setSyncError('');
      setIsTableSetupRequired(false);
      setIsRealtimeConnected(false);
      try {
        const { data: row, error } = await supabaseClient
          .from('ar_rahnu_user_data')
          .select('data')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;

        if (row) {
          applyCloudData(row.data);
        } else {
          const firstSave = localSnapshotRef.current;
          const { error: saveError } = await supabaseClient
            .from('ar_rahnu_user_data')
            .upsert({ user_id: user.id, data: firstSave, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
          if (saveError) throw saveError;
          cloudSnapshotRef.current = JSON.stringify(firstSave);
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
            filter: `user_id=eq.${user.id}`
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
          .subscribe(status => {
            if (!active) return;
            setIsRealtimeConnected(status === 'SUBSCRIBED');
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              setSyncError(`Langganan realtime Supabase gagal: ${status}. Simpanan automatik masih mencuba melalui API.`);
            }
          });
      } catch (error) {
        if (!active) return;
        const missingTable = isMissingSupabaseTableError(error);
        setIsTableSetupRequired(missingTable);
        setSyncError(missingTable
          ? "Jadual 'public.ar_rahnu_user_data' belum wujud atau belum masuk ke schema cache Supabase."
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
            .upsert({ user_id: user.id, data: snapshot, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
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
  }, [appData, isDataReady, saveRetry, supabaseClient, user.id]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isInstitutionModalOpen, setIsInstitutionModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editingInstitution, setEditingInstitution] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // State Harga Live
  const [currentGoldPrice, setCurrentGoldPrice] = useState(INITIAL_GOLD_SPOT_MYR_PER_GRAM);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State Mobile Menu & Install Prompt
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMaintenanceMenuOpen, setIsMaintenanceMenuOpen] = useState(true);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const isSidebarCompact = !isSidebarExpanded && !isSidebarOpen;

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
      setInstitutions(prev => prev.map(inst => {
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
        : institutions.find(inst => inst.id === institutionId);
      if (typeof callback === 'function') {
        const spread = Number(refreshedInstitution?.marhunSpread ??
          (Number(refreshedInstitution?.marhunRate) - INITIAL_GOLD_SPOT_MYR_PER_GRAM));
        callback({
          spotPrice: liveSpot.price,
          institutionRate: Number((liveSpot.price + spread).toFixed(2))
        });
      }
      setToastMessage(institutionId === null
        ? `Harga spot live RM${liveSpot.price.toFixed(2)}/g; anggaran kadar dikemas kini untuk ${institutions.length} institusi.`
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

  // Data ramalan mingguan bersandarkan harga live semasa untuk 12 minggu.
  const dynamicAiData = useMemo(() => {
    const today = new Date();
    const todayLabel = 'Hari Ini';
    const forecastMilestones = [0, 15, 35, 60];
    const weeklyForecast = Array.from({ length: 12 }, (_, index) => {
      const week = index + 1;
      const milestoneIndex = Math.floor((week - 1) / 4);
      const progress = (week - milestoneIndex * 4) / 4;
      const increase = forecastMilestones[milestoneIndex] +
        (forecastMilestones[milestoneIndex + 1] - forecastMilestones[milestoneIndex]) * progress;
      const forecastDate = new Date(today);
      forecastDate.setDate(forecastDate.getDate() + week * 7);

      return {
        date: forecastDate.toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' }),
        actual: null,
        predicted: Number((currentGoldPrice + increase).toFixed(2))
      };
    });

    return [
      { date: 'Sep 2026', actual: 585.00, predicted: null },
      { date: 'Okt 2026', actual: 560.00, predicted: null },
      { date: todayLabel, actual: currentGoldPrice, predicted: currentGoldPrice },
      ...weeklyForecast
    ];
  }, [currentGoldPrice]);

  // State untuk Emas Di Tangan (EDT) - Dikira secara dinamik dari Asset Record
  const edtBalance = useMemo(() => assets.filter(a => a.status === 'EDT').reduce((sum, a) => sum + (parseFloat(a.weight) || 0), 0), [assets]);

  // Computed Dashboard Metrics
  const totalCapital = useMemo(() => transactions.reduce((sum, t) => sum + t.loan, 0), [transactions]);
  const totalProfit = useMemo(() => transactions.reduce((sum, t) => sum + t.profit, 0), [transactions]);
  const cumulativeMarhunData = useMemo(() => {
    const dailyValues = new Map();
    transactions.forEach(tx => {
      const weight = Number(tx.weight) || 0;
      const rate = Number(tx.marhunPrice) || 0;
      const value = weight * rate;
      if (tx.date && value > 0) {
        dailyValues.set(tx.date, (dailyValues.get(tx.date) || 0) + value);
      }
    });

    let accumulatedValue = 0;
    return Array.from(dailyValues.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, dailyValue]) => {
        accumulatedValue += dailyValue;
        return { date, dailyValue, accumulatedValue };
      });
  }, [transactions]);
  const filteredTransactions = useMemo(() => transactions.filter(transaction =>
    transactionStatusFilter === 'Semua' || getTransactionStatus(transaction) === transactionStatusFilter
  ), [transactions, transactionStatusFilter]);
  const activeTickets = transactions.filter(t => t.status === 'Aktif' || (!t.status && !t.type.includes('Tebus'))).length;
  const redemptionNotifications = useMemo(() => transactions
    .filter(tx => !tx.type.includes('Tebus') && (tx.status === 'Aktif' || !tx.status) && tx.redemptionDate)
    .map(tx => ({ ...tx, daysRemaining: getDaysUntilDate(tx.redemptionDate) }))
    .filter(tx => tx.daysRemaining <= 3)
    .sort((a, b) => a.daysRemaining - b.daysRemaining), [transactions, currentDate]);
  const maturityCalendar = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const entries = transactions
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
  }, [calendarMonth, transactions, currentDate]);

  // Kira Emas Dalam Ar-Rahnu (EDR) dari surat yang belum tebus & aktif
  const edrBalance = useMemo(() => transactions.filter(t => t.status === 'Aktif' || (!t.status && !t.type.includes('Tebus'))).reduce((sum, t) => sum + (t.weight || 0), 0), [transactions]);

  // SYSTEM RULES & CONDITIONS INDICATOR ENGINE
  const systemIndicators = useMemo(() => {
    const indicators = [];

    // AI RATIO CHECKER (EDT vs EDR)
    if (edrBalance > edtBalance) {
      indicators.push({
        id: 'ratio-alert',
        type: 'RATIO',
        badge: 'Amaran Kritikal: Ratio Tak Balance',
        ticket: 'PORTFOLIO',
        title: `Pegi beli Gold Bar (GB) sekarang!`,
        desc: `Oi acik, Makcik tengok ratio emas belum seimbang. EDT ada ${edtBalance}g, tapi EDR sampai ${edrBalance}g. Tambah Gold Bar supaya nanti ada emas di tangan untuk tebus surat pajakan.`,
        color: 'rose'
      });
    }

    // Filter open tickets (hanya tiket yang aktif / belum selesai & belum ditebus)
    const openTx = transactions.filter(t => t.status === 'Aktif' || (!t.status && !t.type.includes('Tebus')));

    openTx.forEach(tx => {
      // RULE 3 & 4: Koperasi offer 70% sahaja & rate mesti lebih tinggi dari rate asal & ada untung melebihi kos tebus
      const best70 = institutions
        .filter(i => i.maxMargin === 70 && i.marhunRate > tx.marhunPrice && ((i.marhunRate * (i.maxMargin / 100) * tx.weight) > tx.redemption))
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

      // RULE 4: 80% OL dan Pusing (Cari yang margin 80% dan boleh beri lebihan modal)
      const best80 = institutions
        .filter(i => i.maxMargin === 80 && i.marhunRate > tx.marhunPrice)
        .sort((a, b) => b.marhunRate - a.marhunRate)[0];

      if (best80) {
        const anggaranLebihan = (best80.marhunRate * (best80.maxMargin / 100) * tx.weight) - tx.redemption;
        if (anggaranLebihan > 0) {
          indicators.push({
            id: `ol-${tx.id}`,
            type: 'OL',
            badge: 'OL / Pusing (80%)',
            ticket: tx.refNo,
            title: `Over-Lap (OL) ke ${best80.name}`,
            desc: `Oi acik, Makcik nampak peluang OL di ${best80.name}. Anggaran lebihan tunai RM${anggaranLebihan.toFixed(2)}. Semak kos dan kadar sebenar di kaunter sebelum pusing modal.`,
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
              : daysRemaining === 0 ? ' ialah hari ini.' : `. Tinggal ${daysRemaining} hari.`} Anggaran jumlah tebus ${formatRM(Number(tx.redemption) || 0)}. Sediakan tunai atau emas di tangan (EDT).`,
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
  }, [transactions, institutions, edrBalance, edtBalance, currentDate]);

  // Color mapper for dynamic tailwind classes (required for compiler)
  const indStyles = {
    emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50', strip: 'bg-emerald-500', text: 'text-emerald-700', badgeBg: 'bg-emerald-100' },
    amber: { border: 'border-amber-200', bg: 'bg-amber-50', strip: 'bg-amber-500', text: 'text-amber-700', badgeBg: 'bg-amber-100' },
    blue: { border: 'border-blue-200', bg: 'bg-blue-50', strip: 'bg-blue-500', text: 'text-blue-700', badgeBg: 'bg-blue-100' },
    rose: { border: 'border-rose-200', bg: 'bg-rose-50', strip: 'bg-rose-500', text: 'text-rose-700', badgeBg: 'bg-rose-100' }
  };

  const handleFinishAllPendingTasks = () => {
    // 1. Selesaikan semua surat lama yang telah dipusingkan/salin
    setTransactions(prev => prev.map(t => {
      if (t.refNo === '1001-1002' || t.refNo === '1003-1004') {
        return { ...t, status: 'Selesai' };
      }
      return { ...t, status: t.status || 'Aktif' };
    }));

    // 2. Pastikan nisbah EDT seimbang dengan EDR
    setAssets(prev => {
      const edtTotal = prev.filter(a => a.status === 'EDT').reduce((sum, a) => sum + (parseFloat(a.weight) || 0), 0);
      const activeWeight = 5; // Berat surat aktif 1005-1006
      if (edtTotal < activeWeight || edtTotal < 10) {
        const topUpWeight = Math.max(10 - edtTotal, 5);
        return [
          ...prev,
          {
            id: Date.now(),
            code: generateAssetCode('Gold Bar', 'Public Gold', '999.9', topUpWeight, prev.length + 1),
            date: new Date().toISOString().split('T')[0],
            supplier: 'Public Gold',
            supplierCodes: ['PG'],
            type: 'Gold Bar',
            purity: '999.9',
            weight: topUpWeight,
            price: topUpWeight * currentGoldPrice,
            status: 'EDT'
          }
        ];
      }
      return prev;
    });

    setToastMessage('Semua tugasan tertunggak telah berjaya diselesaikan! Portfolio kini 100% seimbang & optimum.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleStatus = (id) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'Aktif' ? 'Selesai' : 'Aktif';
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  const handleResolveIndicator = (indicator) => {
    if (indicator.type === 'RATIO') {
      setIsAssetModalOpen(true);
    } else if (indicator.type === 'TEBUS') {
      setTransactions(prev => prev.map(t => t.refNo === indicator.ticket ? { ...t, status: 'Ditebus' } : t));
      setAssets(prev => prev.map(a => a.status === 'Dalam Ar-Rahnu' ? { ...a, status: 'EDT' } : a));
      setToastMessage(`Surat #${indicator.ticket} telah berjaya ditebus dan aset dikembalikan ke EDT!`);
      setTimeout(() => setToastMessage(null), 3000);
    } else {
      // Salin / OL
      setTransactions(prev => prev.map(t => t.refNo === indicator.ticket ? { ...t, status: 'Selesai' } : t));
      setToastMessage(`Tindakan ${indicator.badge} untuk Surat #${indicator.ticket} telah selesai!`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleDeleteAsset = (id) => {
    const isUsedInLedger = transactions.some(transaction =>
      (transaction.selectedAssetIds || (transaction.selectedAssetId ? [transaction.selectedAssetId] : []))
        .map(String)
        .includes(String(id))
    );
    if (isUsedInLedger) {
      setToastMessage('Aset tidak boleh dipadam kerana telah dipautkan kepada transaksi lejar.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    setAssets(assets.filter(a => a.id !== id));
  };

  const handleDelete = (id) => {
    const deletedTransaction = transactions.find(t => t.id === id);
    const deletedAssetIds = deletedTransaction?.selectedAssetIds || (deletedTransaction?.selectedAssetId ? [deletedTransaction.selectedAssetId] : []);
    const remainingTransactions = transactions.filter(t => t.id !== id);
    const stillUsedAssetIds = new Set(remainingTransactions.flatMap(t =>
      t.selectedAssetIds || (t.selectedAssetId ? [t.selectedAssetId] : [])
    ).map(String));
    setAssets(prev => prev.map(asset =>
      deletedAssetIds.map(String).includes(String(asset.id)) && !stillUsedAssetIds.has(String(asset.id))
        ? { ...asset, status: 'EDT' }
        : asset
    ));
    setTransactions(remainingTransactions);
  };

  const handleExportCSV = () => {
    // Headers matching the Google Sheet exactly
    const headers = [
      "Tarikh", "Jenis Transaksi", "Tempat (Koperasi/Ar-Rahnu)",
      "No. Surat Rujukan", "Berat Emas (g)", "Harga Marhun (RM/g)",
      "Margin (%)", "Jumlah Pinjaman (RM)", "Upah Simpan (RM)",
      "Jumlah Tebus (RM)", "Lebihan/Profit (RM)", "Catatan"
    ];

    const rows = transactions.map(tx => [
      tx.date,
      tx.type,
      tx.institution,
      tx.refNo,
      tx.weight,
      tx.marhunPrice,
      `${tx.margin}%`,
      tx.loan,
      tx.fee || 0,
      tx.redemption,
      tx.profit,
      `"${(tx.remarks || '').replace(/"/g, '""')}"` // Handle quotes and commas in remarks
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Template_Gameplay_Ar-Rahnu_Kop.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      for (let i = 1; i < lines.length; i++) {
        // Regex to split by comma but ignore commas inside quotes
        const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());

        if (cols.length >= 11 && cols[0] !== "Tarikh") { // Ensure row is valid and not a header duplicate
          importedTx.push({
            id: Date.now() + i,
            date: cols[0],
            type: cols[1],
            transactionStatus: getTransactionStatus({ type: cols[1] }),
            institution: cols[2],
            refNo: cols[3],
            weight: parseFloat(cols[4]) || 0,
            marhunPrice: parseFloat(cols[5]) || 0,
            margin: parseFloat(cols[6].replace('%', '')) || 0,
            loan: parseFloat(cols[7]) || 0,
            fee: parseFloat(cols[8]) || 0,
            redemption: parseFloat(cols[9]) || 0,
            profit: parseFloat(cols[10]) || 0,
            remarks: cols[11] || ''
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
    const selectedAssetIds = newTx.type === 'Pajakan Asal' ? (newTx.selectedAssetIds || []) : [];
    if (selectedAssetIds.length) {
      setAssets(prev => prev.map(asset =>
        selectedAssetIds.map(String).includes(String(asset.id))
          ? { ...asset, status: 'Dalam Ar-Rahnu' }
          : asset
      ));
    }
    const { selectedAssetId, ...transactionData } = newTx;
    setTransactions(prev => [...prev, {
      ...transactionData,
      transactionStatus: getTransactionStatus(transactionData),
      selectedAssetIds,
      id: Date.now()
    }]);
    setIsModalOpen(false);
  };

  const handleEditAsset = (asset) => {
    setEditingAsset(asset);
    setIsAssetModalOpen(true);
  };

  const handleDuplicateAsset = (asset) => {
    const newId = Date.now();
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
      date: new Date().toISOString().split('T')[0]
    };
    setAssets(prev => [...prev, duplicated]);
    setToastMessage(`Aset [${newCode}] berjaya diduplikasi!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveAsset = (assetData) => {
    const code = assetData.code?.trim() || generateAssetCode(assetData.type, assetData.supplierCodes || assetData.supplier, assetData.purity, assetData.weight, editingAsset ? editingAsset.id : Date.now(), suppliers);
    if (editingAsset) {
      setAssets(prev => prev.map(a => a.id === editingAsset.id ? { ...assetData, code, id: editingAsset.id, status: assetData.status || editingAsset.status } : a));
      setToastMessage(`Aset [${code}] berjaya dikemaskini!`);
    } else {
      setAssets(prev => [...prev, { ...assetData, code, id: Date.now(), status: assetData.status || 'EDT' }]);
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
    if (institutions.length <= 1) {
      setToastMessage('Perlu sekurang-kurangnya 1 institusi aktif dalam sistem.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    const inst = institutions.find(i => i.id === id);
    setInstitutions(prev => prev.filter(i => i.id !== id));
    setToastMessage(`Institusi "${inst?.name || ''}" telah dipadam.`);
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
    setInstitutions(initialInstitutions);
    setToastMessage('Senarai institusi Bangi telah dimuat semula ke tetapan asal!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setIsSupplierModalOpen(true);
  };

  const handleDeleteSupplier = (id) => {
    const supplier = suppliers.find(item => item.id === id);
    const inUse = assets.some(asset =>
      (asset.supplierCodes || []).includes(supplier?.code) ||
      (!asset.supplierCodes && asset.supplier === supplier?.name)
    );
    if (inUse) {
      setToastMessage(`Pembekal "${supplier.name}" tidak boleh dipadam kerana telah digunakan dalam rekod aset.`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    setSuppliers(prev => prev.filter(item => item.id !== id));
    setToastMessage(`Pembekal "${supplier?.name || ''}" telah dipadam.`);
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
        return { ...asset, supplierCodes: updatedCodes, supplier: updatedNames.join(', ') };
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
    setSuppliers(initialSuppliers);
    setSupplierSearch('');
    setToastMessage('Senarai 10 pembekal asal telah dimuat semula!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    [supplier.code, supplier.name, supplier.category, supplier.products]
      .some(value => String(value || '').toLowerCase().includes(supplierSearch.trim().toLowerCase()))
  );

  if (!isDataReady) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4 sm:p-6 font-sans">
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">{syncStatus === 'loading' ? 'Memuatkan data Supabase...' : 'Data Supabase belum tersedia'}</h1>
          {syncError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-left text-sm text-red-700">{syncError}</p>}
          {isTableSetupRequired && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-950">
              <p className="font-bold">Selesaikan persediaan database sekali sahaja:</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Buka fail <code>supabase/schema.sql</code> dalam projek ini dan salin keseluruhan kandungannya.</li>
                <li>Buka <a href="https://supabase.com/dashboard/project/zyikvjbnroicbeezpxvx/sql/new" target="_blank" rel="noreferrer" className="font-bold underline">SQL Editor projek Supabase</a>, tampal skrip itu dan tekan <strong>Run</strong>.</li>
                <li>Kembali ke sini dan tekan <strong>Cuba sambung semula</strong>.</li>
              </ol>
              <p className="mt-3 text-xs text-amber-900">Jangan tukar atau tampal service_role key. Masalah ini memerlukan penciptaan jadual, bukan perubahan kata laluan.</p>
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
        className={`fixed lg:relative inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-[width,transform] duration-300 ease-in-out w-64 max-w-[85vw] ${isSidebarExpanded ? 'lg:w-64' : 'lg:w-20'} ${theme === 'dark' ? 'bg-corporate-teal-950 text-slate-100 border-corporate-teal-800' : 'bg-white text-slate-800 border-slate-200'} border-r flex flex-col shadow-2xl z-50 shrink-0`}
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
          <NavItem compact={isSidebarCompact} theme={theme} icon={<ArrowRightLeft size={20} />} label="Transactions" isActive={activeTab === 'transactions'} badge={redemptionNotifications.length} onClick={() => { setActiveTab('transactions'); setIsSidebarOpen(false); }} />
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
              {activeTab === 'ai' ? 'AI Predictive Engine' : activeTab === 'institutions' ? 'Institusi & Koperasi (Bangi)' : activeTab === 'suppliers' ? 'Penyelenggaraan Pembekal' : activeTab === 'assets' ? 'Emas & Asset Inventory' : activeTab === 'transactions' ? 'Transaction Ledger' : 'Executive Dashboard'}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-4">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            {!isAppInstalled && (
              <>
                <button
                  onClick={handleInstallButtonClick}
                  className="hidden sm:flex items-center space-x-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg transition-colors border border-emerald-200"
                >
                  <Download size={16} />
                  <span>{canInstall ? 'Pasang App' : 'Panduan Pasang'}</span>
                </button>

                <button
                  onClick={handleInstallButtonClick}
                  aria-label={canInstall ? 'Pasang aplikasi' : 'Panduan pemasangan aplikasi'}
                  className="sm:hidden p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200"
                >
                  <Download size={20} />
                </button>
              </>
            )}

            <div className="text-right mr-2 md:mr-4 hidden md:block border-l border-slate-200 pl-4">
              <p className="text-sm font-semibold text-slate-800">{user.email}</p>
              <p className="text-xs text-slate-500">Disimpan per akaun</p>
            </div>
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border-2 border-emerald-500 shrink-0">
              {(user.email || 'AR').slice(0, 2).toUpperCase()}
            </div>
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

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Capital (Loan)" value={formatRM(totalCapital)} icon={<Wallet size={24} />} trend="Aktif" color="emerald" />
                <StatCard title="Total Net Profit" value={formatRM(totalProfit)} icon={<TrendingUp size={24} />} trend="+8.2%" color="amber" />
                <StatCard title="Emas Ar-Rahnu (EDR)" value={`${edrBalance}g`} icon={<Clock size={24} />} trend={`${activeTickets} Surat Aktif`} color="blue" />
                <StatCard
                  title="Emas Di Tangan (EDT)"
                  value={`${edtBalance}g`}
                  icon={<Scale size={24} />}
                  trend={edtBalance < edrBalance ? "Kritikal (Beli GB)" : "Ratio Selamat"}
                  color={edtBalance < edrBalance ? "rose" : "emerald"}
                />
              </div>

              <section className={`rounded-2xl border p-5 shadow-sm ${redemptionNotifications.length ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`} aria-live="polite">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${redemptionNotifications.length ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-600'}`}>
                    <Bell size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800">
                      Notifikasi tarikh tebus
                      {redemptionNotifications.length > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-amber-600 text-white text-xs">
                          {redemptionNotifications.length}
                        </span>
                      )}
                    </h3>
                    {redemptionNotifications.length === 0 ? (
                      <p className="text-sm text-slate-500 mt-1">Tiada transaksi aktif yang tarikh matangnya dalam 3 hari atau sudah lewat. Pastikan tarikh matang diisi pada lejar.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {redemptionNotifications.map(tx => (
                          <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-white/80 border border-amber-200 px-3 py-2.5">
                            <div>
                              <p className="text-sm font-bold text-slate-800">Surat #{tx.refNo} · {tx.institution}</p>
                              <p className="text-xs text-slate-600">
                                Tarikh tebus {tx.redemptionDate} · {tx.daysRemaining < 0
                                  ? `Lewat ${Math.abs(tx.daysRemaining)} hari`
                                  : tx.daysRemaining === 0 ? 'Tebus hari ini' : `Baki ${tx.daysRemaining} hari`}
                              </p>
                            </div>
                            <button
                              onClick={() => setActiveTab('transactions')}
                              className="text-xs font-bold text-amber-800 hover:text-amber-950 underline self-start sm:self-auto"
                            >
                              Buka lejar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="min-w-0 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100" aria-label="Kalendar tarikh matang transaksi">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center">
                      <CalendarDays className="mr-2 text-emerald-600" size={20} /> Kalendar Tarikh Matang
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Tarikh tebus daripada rekod transaksi anda.</p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <button
                      type="button"
                      aria-label="Bulan sebelumnya"
                      onClick={() => setCalendarMonth(month => new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <p className="min-w-36 text-center font-bold text-slate-800 capitalize">
                      {calendarMonth.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' })}
                    </p>
                    <button
                      type="button"
                      aria-label="Bulan seterusnya"
                      onClick={() => setCalendarMonth(month => new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Hari ini
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 border-t border-l border-slate-200">
                  {['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'].map(day => (
                    <div key={day} className="p-1.5 sm:p-2 text-center text-[11px] sm:text-xs font-semibold text-slate-500 border-r border-b border-slate-200">
                      {day}
                    </div>
                  ))}
                  {maturityCalendar.days.map(({ date, dateKey, isCurrentMonth, entries }) => {
                    const isToday = dateKey === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                    return (
                      <div
                        key={dateKey}
                        className={`min-h-16 sm:min-h-20 p-1 sm:p-2 border-r border-b border-slate-200 ${isCurrentMonth ? 'bg-white' : 'bg-slate-50/70'} ${entries.length ? 'bg-amber-50/70' : ''}`}
                        aria-label={`${dateKey}${entries.length ? `, ${entries.length} transaksi matang` : ''}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? 'bg-emerald-600 font-bold text-white' : isCurrentMonth ? 'text-slate-700' : 'text-slate-400'}`}>
                            {date.getDate()}
                          </span>
                          {entries.length > 0 && (
                            <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">{entries.length}</span>
                          )}
                        </div>
                        {entries.slice(0, 2).map(tx => (
                          <p key={tx.id} className="hidden sm:block mt-1 truncate text-[10px] font-medium text-amber-800" title={`Surat #${tx.refNo}`}>
                            #{tx.refNo}
                          </p>
                        ))}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h4 className="font-bold text-slate-800">Transaksi matang bulan ini</h4>
                    <span className="text-xs text-slate-500">{maturityCalendar.entries.length} rekod</span>
                  </div>
                  {maturityCalendar.entries.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                      Tiada rekod tarikh matang untuk bulan ini. Isi tarikh tebus pada transaksi di lejar untuk memaparkannya di kalendar.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {maturityCalendar.entries.map(tx => {
                        const isSettled = tx.status === 'Selesai' || tx.status === 'Ditebus';
                        const statusLabel = isSettled
                          ? tx.status
                          : tx.daysRemaining < 0
                            ? `Lewat ${Math.abs(tx.daysRemaining)} hari`
                            : tx.daysRemaining === 0
                              ? 'Matang hari ini'
                              : `Baki ${tx.daysRemaining} hari`;
                        return (
                          <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800">Surat #{tx.refNo} · {tx.institution}</p>
                              <p className="maturity-alert-detail text-xs text-slate-500">
                                Matang {new Date(`${tx.redemptionDate}T00:00:00`).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })} · {formatRM(Number(tx.redemption) || 0)}
                              </p>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3">
                              <span className={`text-xs font-semibold ${isSettled ? 'text-slate-500' : tx.daysRemaining <= 3 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                {statusLabel}
                              </span>
                              <button
                                type="button"
                                onClick={() => setActiveTab('transactions')}
                                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
                              >
                                Buka lejar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="min-w-0 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                    <TrendingUp className="mr-2 text-emerald-500" size={20} /> Profit Growth Timeline
                  </h3>
                  <div className="h-64 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={transactions}>
                        <defs>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0096d8" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#0096d8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dcdde0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#66686a', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#66686a', fontSize: 12 }} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Area type="monotone" dataKey="profit" stroke="#0096d8" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="min-w-0 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                    <Building2 className="mr-2 text-blue-500" size={20} /> Loan vs Redemption by Institution
                  </h3>
                  <div className="h-64 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={transactions}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dcdde0" />
                        <XAxis dataKey="institution" axisLine={false} tickLine={false} tick={{ fill: '#66686a', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#66686a', fontSize: 12 }} />
                        <Tooltip cursor={{ fill: '#eeeeef' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="loan" name="Loan (RM)" fill="#047ea0" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        <Bar dataKey="redemption" name="Redemption (RM)" fill="#a6a7a9" radius={[4, 4, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <section className="min-w-0 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center">
                      <Scale className="mr-2 text-amber-500" size={20} /> Aliran Nilai Marhun Terkumpul
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Jumlah nilai marhun transaksi mengikut tarikh.</p>
                  </div>
                  {cumulativeMarhunData.length > 0 && (
                    <div className="sm:text-right">
                      <p className="text-xs text-slate-500">Nilai terkumpul</p>
                      <p className="text-lg font-bold text-amber-700">{formatRM(cumulativeMarhunData[cumulativeMarhunData.length - 1].accumulatedValue)}</p>
                    </div>
                  )}
                </div>
                <div className="h-64 sm:h-72">
                  {cumulativeMarhunData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                      Tiada rekod transaksi dengan berat dan kadar marhun untuk dipaparkan.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cumulativeMarhunData}>
                        <defs>
                          <linearGradient id="colorMarhunAccumulated" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#047ea0" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#047ea0" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dcdde0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#66686a', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#66686a', fontSize: 12 }} tickFormatter={value => `RM${Number(value).toLocaleString('en-MY')}`} />
                        <Tooltip
                          formatter={value => [formatRM(Number(value)), 'Nilai Marhun terkumpul']}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="accumulatedValue" name="Nilai Marhun terkumpul" stroke="#047ea0" strokeWidth={3} fillOpacity={1} fill="url(#colorMarhunAccumulated)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2">Dikira daripada berat (g) × kadar marhun (RM/g); transaksi Salin dan OL dikira sebagai aktiviti berasingan.</p>
              </section>
            </div>
          )}

          {/* TAB: TRANSACTIONS (CRUD) */}
          {activeTab === 'transactions' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                  <ArrowRightLeft className="mr-2 text-emerald-600" size={20} /> Transaction Ledger
                </h3>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <label className="flex flex-1 sm:flex-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
                    <span className="shrink-0 font-semibold">Jenis pajak</span>
                    <select
                      aria-label="Tapis transaksi mengikut jenis pajak"
                      value={transactionStatusFilter}
                      onChange={event => setTransactionStatusFilter(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent font-semibold text-slate-800 outline-none sm:w-40"
                    >
                      <option value="Semua">Semua jenis</option>
                      {transactionStatusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    id="csv-upload"
                    className="hidden"
                    onChange={handleImportCSV}
                  />
                  <label
                    htmlFor="csv-upload"
                    className="flex-1 sm:flex-none justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-semibold flex items-center transition-colors shadow-sm cursor-pointer border border-slate-200"
                  >
                    <UploadCloud size={18} className="mr-2" /> Import
                  </label>
                  <button
                    onClick={handleExportCSV}
                    className="flex-1 sm:flex-none justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-semibold flex items-center transition-colors shadow-sm border border-slate-200"
                  >
                    <DownloadCloud size={18} className="mr-2" /> Export
                  </button>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex-1 sm:flex-none justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center transition-colors shadow-sm"
                  >
                    <Plus size={18} className="mr-2" /> New Entry
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden w-full">
                <div className="min-w-0 w-full overflow-x-auto overscroll-x-contain" role="region" aria-label="Jadual transaksi; leret ke sisi untuk melihat semua lajur" tabIndex={0}>
                  <table className="w-full min-w-max text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm font-semibold uppercase tracking-wider">
                        <th className="p-4">Date</th>
                        <th className="p-4">Jenis Pajak</th>
                        <th className="p-4">Ref No.</th>
                        <th className="p-4">Tarikh Tebus</th>
                        <th className="p-4">Institution</th>
                        <th className="p-4 text-right">Loan (RM)</th>
                        <th className="p-4 text-right">Redeem (RM)</th>
                        <th className="p-4 text-right">Profit (RM)</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-4 text-slate-600 font-medium">{tx.date}</td>
                          <td className="p-4">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                getTransactionStatus(tx) === 'Pajakan Asal' ? 'bg-emerald-100 text-emerald-700' :
                                getTransactionStatus(tx) === 'Salin' ? 'bg-amber-100 text-amber-700' :
                                getTransactionStatus(tx) === 'OL' ? 'bg-blue-100 text-blue-700' :
                                getTransactionStatus(tx).startsWith('Tebus') ? 'bg-slate-200 text-slate-700' :
                                  'bg-slate-100 text-slate-600'
                              }`}>
                              {getTransactionStatus(tx)}
                            </span>
                          </td>
                          <td className="p-4 text-slate-800 font-mono text-sm">{tx.refNo}</td>
                          <td className="p-4">
                            {!tx.type.includes('Tebus') ? (
                              <div className="space-y-1">
                                <input
                                  type="date"
                                  aria-label={`Tarikh matang surat ${tx.refNo}`}
                                  value={tx.redemptionDate || ''}
                                  onChange={event => {
                                    const redemptionDate = event.target.value;
                                    setTransactions(prev => prev.map(item =>
                                      item.id === tx.id ? { ...item, redemptionDate } : item
                                    ));
                                  }}
                                  className={`p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 ${
                                    tx.redemptionDate && getDaysUntilDate(tx.redemptionDate) <= 3 && (tx.status === 'Aktif' || !tx.status)
                                      ? 'border-amber-300 bg-amber-50'
                                      : 'border-slate-200'
                                  }`}
                                />
                                {!tx.redemptionDate && <p className="text-xs text-slate-400">Tetapkan tarikh untuk kalendar dan notifikasi</p>}
                              </div>
                            ) : <span className="text-slate-300">-</span>}
                          </td>
                          <td className="p-4 text-slate-600">{tx.institution}</td>
                          <td className="p-4 text-right font-semibold text-slate-800">{formatRM(tx.loan)}</td>
                          <td className="p-4 text-right text-slate-500">{formatRM(tx.redemption)}</td>
                          <td className="p-4 text-right">
                            <span className={`font-bold ${tx.profit > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {tx.profit > 0 ? `+${formatRM(tx.profit)}` : '-'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleToggleStatus(tx.id)}
                              title="Klik untuk tukar status (Aktif / Selesai)"
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                                tx.status === 'Selesai' 
                                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                                  : tx.status === 'Ditebus'
                                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              }`}
                            >
                              {tx.status === 'Selesai' ? (
                                <><span>✓</span><span>Selesai</span></>
                              ) : tx.status === 'Ditebus' ? (
                                <><span>✓</span><span>Ditebus</span></>
                              ) : (
                                <><span>●</span><span>Aktif</span></>
                              )}
                            </button>
                          </td>
                          <td className="p-4 text-center space-x-1">
                            <button
                              onClick={() => handleToggleStatus(tx.id)}
                              className="text-slate-400 hover:text-emerald-600 transition-colors p-2 rounded-lg hover:bg-emerald-50"
                              title={tx.status === 'Aktif' ? 'Tanda sebagai Selesai' : 'Tanda sebagai Aktif'}
                            >
                              <CheckCircle2 size={18} className={tx.status === 'Selesai' || tx.status === 'Ditebus' ? 'text-emerald-600' : ''} />
                            </button>
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 sm:opacity-0 sm:group-hover:opacity-100"
                              title="Delete Transaction"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredTransactions.length === 0 && (
                        <tr>
                          <td colSpan="10" className="p-8 text-center text-slate-400">
                            {transactions.length === 0
                              ? 'No transactions found. Add a new entry to get started.'
                              : `Tiada transaksi untuk jenis "${transactionStatusFilter}".`}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ASSET RECORD */}
          {activeTab === 'assets' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                  <Database className="mr-2 text-emerald-600" size={20} /> Emas & Asset Inventory
                </h3>
                <button
                  onClick={() => {
                    setEditingAsset(null);
                    setIsAssetModalOpen(true);
                  }}
                  className="w-full sm:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center transition-colors shadow-sm"
                >
                  <Plus size={18} className="mr-2" /> Add Asset
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden w-full">
                <div className="min-w-0 w-full overflow-x-auto overscroll-x-contain" role="region" aria-label="Jadual aset; leret ke sisi untuk melihat semua lajur" tabIndex={0}>
                  <table className="w-full min-w-max text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm font-semibold uppercase tracking-wider">
                        <th className="p-4">Asset ID</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Item Type</th>
                        <th className="p-4">Supplier</th>
                        <th className="p-4">Purity</th>
                        <th className="p-4 text-right">Weight (g)</th>
                        <th className="p-4 text-right">Price (RM)</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-4">
                            <span className="font-mono font-bold text-xs bg-amber-50 text-amber-900 border border-amber-200/90 px-2.5 py-1 rounded-md shadow-xs inline-flex items-center space-x-1.5">
                              <Tag size={13} className="text-amber-600 shrink-0" />
                              <span className="code-badge-label">{asset.code || generateAssetCode(asset.type, asset.supplier, asset.purity, asset.weight, asset.id)}</span>
                            </span>
                          </td>
                          <td className="p-4 text-slate-600 font-medium">{asset.date}</td>
                          <td className="p-4 font-semibold text-slate-700">{asset.type}</td>
                          <td className="p-4 text-slate-600">{asset.supplier}</td>
                          <td className="p-4 text-slate-600">{asset.purity}</td>
                          <td className="p-4 text-right font-bold text-slate-800">{asset.weight}g</td>
                          <td className="p-4 text-right text-slate-600">{formatRM(asset.price)}</td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${asset.status === 'EDT' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                              {asset.status}
                            </span>
                          </td>
                          <td className="p-4 text-center space-x-1">
                            <button
                              onClick={() => handleEditAsset(asset)}
                              className="text-slate-400 hover:text-emerald-600 transition-colors p-2 rounded-lg hover:bg-emerald-50"
                              title="Edit Rekod Aset"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => handleDuplicateAsset(asset)}
                              className="text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50"
                              title="Duplicate Rekod Aset"
                            >
                              <Copy size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteAsset(asset.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                              title="Hapus Rekod Aset"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {assets.length === 0 && (
                        <tr>
                          <td colSpan="9" className="p-8 text-center text-slate-400">No assets found. Add a new gold bar or jewelry to track.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

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
                    <p className="text-2xl font-bold text-slate-800 mt-1">{suppliers.length}</p>
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
                    disabled={isRefreshing || institutions.length === 0}
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
                    <p className="text-2xl font-bold text-slate-800 mt-1">{institutions.length} Koperasi/Pajak</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Building2 size={20} />
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Margin Tertinggi</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">
                      {institutions.length > 0 ? Math.max(...institutions.map(i => i.maxMargin)) : 0}%
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
                      RM {institutions.length > 0 ? Math.max(...institutions.map(i => i.marhunRate)).toFixed(2) : '0.00'}
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
                      RM {institutions.length > 0 ? (institutions.reduce((s, i) => s + i.marhunRate, 0) / institutions.length).toFixed(2) : '0.00'}
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
                      {institutions.map((inst) => {
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
                      {institutions.length === 0 && (
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
              {/* AI Banner */}
              <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10">
                  <BrainCircuit size={100} className="md:w-32 md:h-32" />
                </div>
                <div className="relative z-10 max-w-3xl">
                  <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 mb-4">
                    <div className="flex items-center space-x-2 text-amber-400 bg-emerald-950/50 px-4 py-1.5 rounded-full border border-emerald-700 text-xs sm:text-sm">
                      <Sparkles size={16} />
                      <span className="font-bold tracking-wide">EGM PROPHET MODEL ACTIVE</span>
                    </div>
                    <div className="flex items-center space-x-2 text-emerald-200 bg-emerald-950/50 px-4 py-1.5 rounded-full border border-emerald-700 text-xs sm:text-sm">
                      <Globe size={16} />
                      <span className="font-bold tracking-wide">Source: Gold API + ExchangeRate-API</span>
                    </div>
                    <button
                      onClick={() => handleRefresh()}
                      disabled={isRefreshing}
                      className="mt-3 sm:mt-0 sm:ml-auto w-full sm:w-auto flex justify-center items-center space-x-2 bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 sm:py-1.5 rounded-full transition-all border border-emerald-500 shadow-sm disabled:opacity-50"
                    >
                      <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                      <span className="text-sm font-bold">{isRefreshing ? 'Fetching...' : 'Live Refresh'}</span>
                    </button>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-4">Optimal Refinancing Window Detected</h2>

                  <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-6">
                    <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-emerald-400/30 flex-1 sm:flex-none">
                      <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">Harga Spot Emas Live</p>
                      <p className="text-3xl md:text-4xl font-black text-white">RM {currentGoldPrice.toFixed(2)}<span className="text-base md:text-lg text-emerald-200 font-medium tracking-normal">/g</span></p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-amber-400/30 flex-1 sm:flex-none">
                      <p className="text-amber-200 text-xs font-bold uppercase tracking-wider mb-1">Sasaran AI 12 Minggu</p>
                      <p className="text-3xl md:text-4xl font-black text-amber-400">RM {(currentGoldPrice + 60).toFixed(2)}<span className="text-base md:text-lg text-amber-200 font-medium tracking-normal">/g</span></p>
                    </div>
                  </div>

                  <p className="text-emerald-100 text-sm md:text-lg leading-relaxed max-w-2xl">
                    Harga spot emas semasa berdasarkan sebut harga emas USD dan kadar tukaran USD/MYR ialah <strong className="text-white">RM {currentGoldPrice.toFixed(2)}/g</strong>. Kadar marhun institusi yang dipaparkan ialah anggaran spot + spread, bukan sebut harga rasmi institusi. Ramalan AI mingguan menjangkakan harga spot RM {(currentGoldPrice + 60).toFixed(2)}/g dalam 12 minggu. Sila sahkan kadar sebenar terus dengan institusi.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* AI Forecast Chart */}
                <div className="min-w-0 lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                    <TrendingUp className="mr-2 text-blue-500" size={20} /> Ramalan Marhun Mingguan (12 Minggu, MYR/g)
                  </h3>
                  <div className="h-72 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dynamicAiData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dcdde0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#66686a', fontSize: 12 }} dy={10} />
                        <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#66686a', fontSize: 12 }} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <ReferenceLine x="Hari Ini" stroke="#0096d8" strokeDasharray="3 3" label={{ position: 'top', value: 'Hari Ini', fill: '#047ea0', fontSize: 12, fontWeight: 'bold' }} />
                        <Line type="monotone" dataKey="actual" name="Actual Price" stroke="#047ea0" strokeWidth={3} dot={{ r: 4, fill: '#047ea0', strokeWidth: 2, stroke: '#fff' }} />
                        <Line type="monotone" dataKey="predicted" name="Ramalan AI Mingguan" stroke="#cf3983" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 3, fill: '#cf3983', strokeWidth: 2, stroke: '#fff' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* AI Actionable Insights */}
                <div className="min-w-0 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                  <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
                    <AlertCircle className="mr-2 text-amber-500" size={20} /> Makcik AI
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">Rules &amp; Indicators · Pesanan untuk portfolio acik</p>
                  <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">

                    {systemIndicators.length > 0 && (
                      <button 
                        onClick={handleFinishAllPendingTasks}
                        className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
                      >
                        <CheckCircle2 size={16} />
                        <span>Selesaikan Semua Tugasan Tertunggak</span>
                      </button>
                    )}

                    {systemIndicators.length === 0 && (
                      <div className="p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 border border-emerald-200 rounded-2xl text-center space-y-3 shadow-sm animate-in fade-in duration-300">
                        <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                          <CheckCircle2 size={26} />
                        </div>
                        <h4 className="font-bold text-slate-800 text-base">Semua Tugasan Telah Selesai!</h4>
                        <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                          Tahniah! Semua surat aktif telah dioptimumkan & nisbah simpanan (EDT: {edtBalance}g) selamat melebihi gadaian (EDR: {edrBalance}g). Tiada surat tertunggak.
                        </p>
                        <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-300">
                          <ShieldCheck size={14} className="text-emerald-600" />
                          <span>Portfolio 100% Optimum & Selamat</span>
                        </div>
                      </div>
                    )}

                    {systemIndicators.map((indicator) => {
                      const styles = indStyles[indicator.color];
                      return (
                        <div key={indicator.id} className={`p-4 border ${styles.border} ${styles.bg} rounded-xl relative overflow-hidden group`}>
                          <div className={`absolute top-0 left-0 w-1 h-full ${styles.strip}`}></div>
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <span className={`text-xs font-bold ${styles.text} ${styles.badgeBg} px-2 py-1 rounded`}>{indicator.badge}</span>
                            <span className="text-[11px] font-mono font-semibold text-slate-500 text-right shrink-0">Surat #{indicator.ticket}</span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm mb-1">{indicator.title}</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">{indicator.desc}</p>
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => handleResolveIndicator(indicator)}
                              className="text-[11px] font-semibold px-2.5 py-1 text-slate-500 hover:text-slate-800 hover:bg-white/70 rounded-md transition-colors flex items-center space-x-1"
                            >
                              <Check size={13} />
                              <span>{indicator.type === 'RATIO' ? 'Tambah aset' : indicator.type === 'TEBUS' ? 'Tandakan ditebus' : 'Tandakan selesai'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}

                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* NEW TRANSACTION MODAL */}
      {isModalOpen && (
        <TransactionModal
          institutions={institutions}
          availableAssets={assets.filter(asset => {
            const usedAssetIds = new Set(transactions.flatMap(transaction =>
              transaction.selectedAssetIds || (transaction.selectedAssetId ? [transaction.selectedAssetId] : [])
            ).map(String));
            return asset.status === 'EDT' && !usedAssetIds.has(String(asset.id));
          })}
          onClose={() => setIsModalOpen(false)}
          onSave={handleAddTransaction}
          currentGoldPrice={currentGoldPrice}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      )}

      {/* NEW / EDIT ASSET MODAL */}
      {isAssetModalOpen && (
        <AssetModal
          initialData={editingAsset}
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

function TransactionModal({ institutions, availableAssets, onClose, onSave, currentGoldPrice, isRefreshing, onRefresh }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Pajakan Asal',
    redemptionDate: '',
    institution: institutions?.[0]?.name || '',
    refNo: '',
    weight: 10,
    marhunPrice: institutions?.[0]?.marhunRate || 0,
    margin: institutions?.[0]?.maxMargin || 0,
    redemption: 0,
    remarks: ''
  });
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [isAssetListOpen, setIsAssetListOpen] = useState(false);

  // Dynamic calculations based on EGM spreadsheet logic
  const calculatedLoan = (parseFloat(formData.weight) || 0) * (parseFloat(formData.marhunPrice) || 0) * ((parseFloat(formData.margin) || 0) / 100);
  const calculatedProfit = (formData.type !== 'Pajakan Asal') ? (calculatedLoan - (parseFloat(formData.redemption) || 0)) : 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      // Auto-fill rates if institution changes
      if (name === 'institution') {
        const inst = institutions.find(i => i.name === value);
        if (inst) {
          updated.marhunPrice = inst.marhunRate;
          updated.margin = inst.maxMargin;
        }
      }

      return updated;
    });
  };

  const handleAssetToggle = (assetId) => {
    const updatedIds = selectedAssetIds.includes(assetId)
      ? selectedAssetIds.filter(selectedId => selectedId !== assetId)
      : [...selectedAssetIds, assetId];
    setSelectedAssetIds(updatedIds);
    const selectedWeight = availableAssets
      .filter(asset => updatedIds.includes(asset.id))
      .reduce((total, asset) => total + (parseFloat(asset.weight) || 0), 0);
    setFormData(prev => ({ ...prev, weight: selectedWeight || 10 }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      selectedAssetIds,
      weight: parseFloat(formData.weight) || 0,
      marhunPrice: parseFloat(formData.marhunPrice) || 0,
      margin: parseFloat(formData.margin) || 0,
      loan: calculatedLoan,
      fee: 0, // Simplified for this UI
      redemption: formData.type === 'Pajakan Asal' ? calculatedLoan : (parseFloat(formData.redemption) || 0),
      profit: calculatedProfit,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="min-w-0 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90dvh] sm:max-h-[95dvh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">

        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center">
            <Plus className="mr-2 text-emerald-600" size={20} /> Add Ledger Entry
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-full hover:bg-slate-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Status / Jenis Pajak</label>
              <select name="type" value={formData.type} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all">
                <option value="Pajakan Asal">Pajakan Asal</option>
                <option value="Salin / Parking (70%)">Salin</option>
                <option value="OL / Pusing (80%)">OL</option>
                <option value="Tebus (Cash)">Tebus Cash</option>
                <option value="Tebus (EDT)">Tebus EDT</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Date</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
            </div>

            {!formData.type.includes('Tebus') && (
              <div className="space-y-1">
                <label htmlFor="redemption-date" className="text-sm font-semibold text-slate-700">Tarikh Tebus / Matang</label>
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

            {formData.type === 'Pajakan Asal' && (
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Pilih Aset Inventori (Opsional)</label>
                <button
                  type="button"
                  aria-expanded={isAssetListOpen}
                  onClick={() => setIsAssetListOpen(open => !open)}
                  className="w-full min-h-12 p-2.5 border border-slate-300 rounded-lg text-left flex items-center justify-between gap-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <span className={selectedAssetIds.length ? 'text-slate-800' : 'text-slate-400'}>
                    {selectedAssetIds.length
                      ? `${selectedAssetIds.length} aset dipilih (${formData.weight}g)`
                      : 'Pilih satu atau lebih aset yang tersedia'}
                  </span>
                  <span className="text-slate-500 shrink-0">{isAssetListOpen ? '▲' : '▼'}</span>
                </button>
                {isAssetListOpen && (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg custom-scrollbar">
                    {availableAssets.map(asset => (
                      <label key={asset.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 cursor-pointer border-b last:border-b-0 border-slate-100">
                        <input
                          type="checkbox"
                          checked={selectedAssetIds.includes(asset.id)}
                          onChange={() => handleAssetToggle(asset.id)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-mono text-xs font-bold text-amber-800">
                          {asset.code || generateAssetCode(asset.type, asset.supplierCodes || asset.supplier, asset.purity, asset.weight, asset.id)}
                        </span>
                        <span className="text-sm text-slate-700">{asset.type} {asset.purity} ({asset.weight}g) - {asset.supplier}</span>
                      </label>
                    ))}
                    {availableAssets.length === 0 && <p className="p-3 text-sm text-slate-500">Tiada aset tersedia. Aset dalam Ar-Rahnu atau yang telah digunakan pada lejar tidak dipaparkan.</p>}
                  </div>
                )}
                {!!selectedAssetIds.length && (
                  <p className="text-xs text-slate-500">Berat transaksi dikira daripada jumlah berat aset dipilih.</p>
                )}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Institution</label>
              <select name="institution" value={formData.institution} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all">
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.name}>{inst.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Reference No.</label>
              <input type="text" name="refNo" value={formData.refNo} onChange={handleChange} placeholder="e.g. 1007-1008" required className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Gold Weight (g)</label>
              <input type="number" step="0.01" name="weight" value={formData.weight} onChange={handleChange} readOnly={selectedAssetIds.length > 0} required className={`w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all ${selectedAssetIds.length ? 'bg-slate-100' : ''}`} />
            </div>

            <div className="flex space-x-4">
              <div className="space-y-1 flex-1">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-700">Marhun (RM/g)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const institution = institutions.find(item => item.name === formData.institution);
                      if (onRefresh && institution) {
                        onRefresh(institution.id, ({ institutionRate }) =>
                          setFormData(prev => ({ ...prev, marhunPrice: institutionRate.toFixed(2) }))
                        );
                      }
                    }}
                    disabled={isRefreshing}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center bg-emerald-100/50 px-2 py-0.5 rounded-full transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={`mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
                    {isRefreshing ? 'Fetching...' : 'Live Refresh'}
                  </button>
                </div>
                <input type="number" step="0.01" name="marhunPrice" value={formData.marhunPrice} onChange={handleChange} required className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
              </div>
              <div className="space-y-1 w-1/3">
                <label className="text-sm font-semibold text-slate-700">Margin (%)</label>
                <input type="number" name="margin" value={formData.margin} onChange={handleChange} required className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50" />
              </div>
            </div>

            {formData.type !== 'Pajakan Asal' && (
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Previous Redemption Cost (RM)</label>
                <input type="number" step="0.01" name="redemption" value={formData.redemption} onChange={handleChange} required className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all bg-amber-50" placeholder="Amount needed to redeem original pawn" />
              </div>
            )}

          </div>

          {/* Auto-Calculated Preview Block */}
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1">Calculated Loan</p>
              <p className="text-xl font-bold text-slate-800">{formatRM(calculatedLoan)}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1">Projected Profit</p>
              <p className={`text-xl font-bold ${calculatedProfit > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                {formData.type === 'Pajakan Asal' ? 'N/A' : (calculatedProfit > 0 ? `+${formatRM(calculatedProfit)}` : formatRM(calculatedProfit))}
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end sm:space-x-3 gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" className="w-full sm:w-auto justify-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center">
              Save Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssetModal({ initialData, onClose, onSave, suppliers }) {
  const initialSupplierCodes = initialData?.supplierCodes || suppliers
    .filter(item => initialData?.supplier?.split(',').map(name => name.trim()).includes(item.name))
    .map(item => item.code);
  const [selectedSupplierCodes, setSelectedSupplierCodes] = useState(initialSupplierCodes);
  const [isSupplierListOpen, setIsSupplierListOpen] = useState(false);
  const [supplierError, setSupplierError] = useState('');
  const [formData, setFormData] = useState({
    code: initialData?.code || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    type: initialData?.type || 'Gold Bar',
    supplier: initialData?.supplier || '',
    purity: initialData?.purity || '999.9',
    weight: initialData?.weight !== undefined ? initialData.weight : '',
    price: initialData?.price !== undefined ? initialData.price : '',
    status: initialData?.status || 'EDT'
  });
  const selectedSuppliers = suppliers.filter(item => selectedSupplierCodes.includes(item.code));

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
              <label className="text-sm font-semibold text-slate-700">Purchase Date</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
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
                  {suppliers.map(supplier => (
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
                  {suppliers.length === 0 && <p className="p-3 text-sm text-slate-500">Tiada pembekal. Daftar pembekal terlebih dahulu.</p>}
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
                <option value="EDT">Emas Di Tangan (EDT)</option>
                <option value="Dalam Ar-Rahnu">Dalam Ar-Rahnu</option>
              </select>
            </div>

          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end sm:space-x-3 gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-colors">
              Batal
            </button>
            <button type="submit" className="w-full sm:w-auto justify-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center">
              {initialData ? 'Kemaskini Aset' : 'Simpan Aset'}
            </button>
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