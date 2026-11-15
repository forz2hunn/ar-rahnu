/**
 * Domain logic for Modul Pengurusan Surat Akuan Gadaian (SAG).
 * Semua pengiraan di sini adalah tulen (pure) supaya boleh digunakan oleh
 * borang, pratonton surat dan ujian tanpa bergantung kepada React.
 */

export type SagDocumentStatus = 'Draf' | 'Dikeluarkan' | 'Batal';
export type SagCopyType = 'Salinan Pelanggan' | 'Salinan Ar-Rahnu';
/** Asas kiraan upah simpan, sama seperti modul lejar SAG. */
export type SagFeeBasis = '' | 'nilaiMarhun' | 'jumlahPembiayaan';

export type SagAuditActor = {
  id: string;
  name: string;
  email: string;
};

export type SagAuditFields = {
  recordType?: string;
  lastAction?: 'CREATE' | 'UPDATE' | 'DELETE';
  createdBy?: SagAuditActor;
  createdAt?: string;
  updatedBy?: SagAuditActor;
  updatedAt?: string;
  deletedBy?: SagAuditActor;
  deletedAt?: string;
};

export type SagMemberSnapshot = {
  userId: string;
  memberNo: string;
  name: string;
  icNumber: string;
  address: string;
  phone: string;
  heirName: string;
  poBox: string;
};

export type SagMarhunItem = {
  id: string;
  assetId: string | number | null;
  description: string;
  quantity: number;
  karat: string;
  ratePerGram: number;
  weight: number;
  marhunValue: number;
};

export type SagProfitPeriod = {
  index: number;
  label: string;
  dueDate: string;
  days: number;
  profit: number;
  cumulativeProfit: number;
};

export type SagTawarruqAgreement = {
  saleAgreed: boolean;
  pledgeAgreed: boolean;
};

export type SagSignatureBlock = {
  customerName: string;
  customerSignedAt: string;
  officerName: string;
  officerSignedAt: string;
  witnessName: string;
  witnessSignedAt: string;
};

export type SagDocument = SagAuditFields & {
  id: string | number;
  documentNo: string;
  status: SagDocumentStatus;
  copyType: SagCopyType;
  product: string;
  transactionId: string | number | null;
  transactionRefNo: string;
  institutionId: string | number | null;
  institutionName: string;
  /** Jenis pajakan yang di transaksi pada surat ini (Pajakan Asal, Salin, OL, Pusing, dll). */
  pledgeType: string;
  /** Status rekod transaksi pada masa surat disimpan. */
  pledgeStatus: string;
  /** Surat Akuan Gadaian terdahulu yang di transaksi untuk menghasilkan surat ini. */
  previousDocumentNo: string;
  previousTransactionRefNo: string;
  /** Jumlah tebus surat terdahulu (asas unjuran lebihan tunai surat susulan). */
  previousRedemption: number;
  financingDate: string;
  maturityDate: string;
  paymentDueOverride: string;
  paymentTermMonths: number;
  member: SagMemberSnapshot;
  marhunValue: number;
  /** Margin pembiayaan (% daripada nilai marhun), selaras dengan modul lejar SAG. */
  margin: number;
  purchasePrice: number;
  totalProfit: number;
  /** Kadar upah simpan (% sebulan) seperti direkod dalam lejar SAG. */
  feeRate: number;
  /** Asas kiraan upah simpan: nilai marhun atau jumlah pembiayaan. */
  feeBasis: SagFeeBasis;
  /** Unjuran lebihan tunai (loan − tebus − fi) untuk surat susulan. */
  projectedProfit: number;
  sellingPrice: number;
  profitSchedule: SagProfitPeriod[];
  tawarruq: SagTawarruqAgreement;
  marhunItems: SagMarhunItem[];
  signatures: SagSignatureBlock;
  remarks: string;
};

export type SagLetterhead = {
  organizationName: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  registrationNo: string;
  documentPrefix: string;
  officerName: string;
  officerPosition: string;
  witnessName: string;
};

export type SagModuleSettings = {
  letterhead: SagLetterhead;
};

export const SAG_STATUS_OPTIONS: SagDocumentStatus[] = ['Draf', 'Dikeluarkan', 'Batal'];
export const SAG_COPY_TYPES: SagCopyType[] = ['Salinan Pelanggan', 'Salinan Ar-Rahnu'];
export const SAG_PLEDGE_TYPES = [
  'Pajakan Asal',
  'Salin',
  'OL',
  'Pusing',
  'Tebus Cash',
  'Tebus EDT',
  'TS',
  'TKS',
  'US',
  'Lelong',
  'Lain-lain'
];
export const SAG_PLEDGE_STATUSES = ['Aktif', 'Selesai', 'Ditebus', 'Dilelong'];
export const SAG_PRODUCT_DEFAULT = 'PEMBIAYAAN AR-RAHNU';
export const SAG_DEFAULT_PAYMENT_TERM_MONTHS = 6;

export const SAG_KARAT_OPTIONS = ['24.0K', '23.0K', '22.0K', '21.0K', '20.0K', '18.0K', '14.0K', '9.0K'];

export const SAG_DEFAULT_SETTINGS: SagModuleSettings = {
  letterhead: {
    organizationName: 'AR-RAHNU KPDRM - BANGI',
    addressLine1: '27, Jalan 9/9c, Seksyen 9, Bandar Baru Bangi',
    addressLine2: '43650 Bangi, Selangor',
    phone: '019-770 9696',
    registrationNo: '',
    documentPrefix: 'KPD004',
    officerName: '',
    officerPosition: 'Pegawai Ar-Rahnu',
    witnessName: ''
  }
};

/** Klausa akad tawarruq seperti pada borang rasmi. */
export const SAG_TAWARRUQ_CLAUSES: { key: keyof SagTawarruqAgreement; title: string; description: string }[] = [
  {
    key: 'saleAgreed',
    title: 'Kontrak Jualan',
    description:
      'Saya dengan ini bersetuju untuk membeli komoditi daripada Ar Rahnu KPDRM pada Harga Jualan dengan bayaran tangguh. Komoditi adalah sebagaimana yang dinyatakan di dalam slip pembekal komoditi mengikut kadar jumlah pembiayaan yang diberikan kepada saya.'
  },
  {
    key: 'pledgeAgreed',
    title: 'Kontrak Gadai',
    description:
      'Saya bersetuju untuk menggadaikan Marhun sebagai cagaran kepada harga komoditi.'
  }
];

/** Akuan pelanggan seperti pada borang rasmi Surat Akuan Gadaian. */
export const SAG_CUSTOMER_DECLARATIONS: string[] = [
  'Saya mengakui bahawa Marhun yang digadai sebagaimana perincian di dalam keterangan marhun di atas adalah hak milik saya.',
  'Saya dengan ini bersetuju dan membenarkan pihak Ar-Rahnu KPDRM untuk melakukan sebarang pengujian yang perlu bagi menguji ketulenan barang (marhun) yang digadai mengikut prosedur yang telah ditetapkan oleh Ar-Rahnu KPDRM.',
  'Saya memahami bahawa pihak Ar-Rahnu KPDRM adalah pihak berkuasa untuk mengambil tindakan atau mendakwa saya sekiranya didapati marhun atau mana-mana marhun sebelum dan selepasnya yang diikrarkan sebagai keterangan marhun di atas adalah bukan milik saya, palsu atau melanggar mana-mana undang-undang di Malaysia.',
  'Saya bersetuju dengan penetapan Harga Jualan dan bayaran balik yang dijelaskan pada tarikh bayaran berdasarkan jadual pembayaran balik di atas serta tempoh pembiayaan yang dinyatakan.',
  'Saya bersetuju untuk menerima bayaran ganti rugi marhun di dalam bentuk wang tunai berdasarkan kepada nilai marhun yang tertera di dalam keterangan marhun setelah ditolak apa-apa kos berkaitan sekiranya berlaku kehilangan kepada barangan gadai di dalam premis Ar-Rahnu KPDRM, dan tidak akan menuntut sebarang bayaran lanjutan yang berkaitan atas perkara tersebut sehingga berlaku penyerahan nilai marhun.',
  'Saya memahami dan bersetuju bahawa nilai marhun adalah berdasarkan kadar semasa yang berkuat kuasa dan saya terikat dengan syarat-syarat pembayaran di dalam perjanjian ini.',
  'Saya memahami dan bersetuju dengan segala terma dan syarat yang telah ditetapkan oleh Ar-Rahnu KPDRM sepanjang tempoh perjanjian ini.'
];

const MS_PER_DAY = 86400000;

export const roundMoney = (value: unknown): number => Number((Number(value) || 0).toFixed(2));

export const toDateOnly = (value?: string | null): string => {
  if (!value) return '';
  const text = String(value).trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

// --- Formula pajakan yang diselaraskan dengan modul lejar SAG ---
export const SAG_FEE_BASIS_OPTIONS: { value: Exclude<SagFeeBasis, ''>; label: string }[] = [
  { value: 'nilaiMarhun', label: 'Nilai Marhun' },
  { value: 'jumlahPembiayaan', label: 'Jumlah Pembiayaan' }
];

export const normalizeSagFeeBasis = (value: unknown): SagFeeBasis => {
  const text = String(value ?? '').trim();
  if (text === 'nilaiMarhun' || text === 'Nilai Marhun') return 'nilaiMarhun';
  if (text === 'jumlahPembiayaan' || text === 'Jumlah Pembiayaan') return 'jumlahPembiayaan';
  return '';
};

export const getSagFeeBasisLabel = (value: unknown): string =>
  SAG_FEE_BASIS_OPTIONS.find(option => option.value === normalizeSagFeeBasis(value))?.label || 'Belum ditetapkan';

/** Nilai marhun = berat × kadar taksiran per gram. */
export const calculateSagMarhunValue = (weight: unknown, ratePerGram: unknown): number =>
  roundMoney((Number(weight) || 0) * (Number(ratePerGram) || 0));

/** Pembiayaan = nilai marhun × margin %. */
export const calculateSagFinancing = (marhunValue: unknown, margin: unknown): number =>
  roundMoney((Number(marhunValue) || 0) * ((Number(margin) || 0) / 100));

/** Unjuran lebihan tunai: surat asal/tebus tidak menghasilkan lebihan. */
export const calculateSagProjectedProfit = (
  pledgeType: unknown,
  purchasePrice: unknown,
  redemption: unknown,
  totalProfit: unknown
): number => {
  const type = String(pledgeType || '');
  if (type === 'Pajakan Asal' || type.includes('Tebus')) return 0;
  return roundMoney((Number(purchasePrice) || 0) - (Number(redemption) || 0) - (Number(totalProfit) || 0));
};

/** Upah simpan: kadar sebulan × asas kiraan × tempoh, berserta jumlah tebus. */
export const calculateSagStorageFee = ({
  feeRate,
  feeBasis,
  termMonths,
  marhunValue,
  purchasePrice
}: {
  feeRate: unknown;
  feeBasis: unknown;
  termMonths: unknown;
  marhunValue: unknown;
  purchasePrice: unknown;
}) => {
  const basis = normalizeSagFeeBasis(feeBasis);
  const basisAmount = basis === 'nilaiMarhun'
    ? Number(marhunValue) || 0
    : basis === 'jumlahPembiayaan'
      ? Number(purchasePrice) || 0
      : 0;
  const monthly = roundMoney(basisAmount * ((Number(feeRate) || 0) / 100));
  const months = Math.max(0, Number(termMonths) || 0);
  const total = roundMoney(monthly * months);
  return {
    basisAmount: roundMoney(basisAmount),
    monthly,
    total,
    redemption: roundMoney((Number(purchasePrice) || 0) + total)
  };
};

const parseDateOnly = (value?: string | null): Date | null => {
  const iso = toDateOnly(value);
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const addMonthsToDateOnly = (value: string, months: number): string => {
  const base = parseDateOnly(value);
  if (!base) return toDateOnly(value);
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const day = base.getUTCDate();
  const target = new Date(Date.UTC(year, month + months, 1));
  const daysInTargetMonth = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, daysInTargetMonth));
  return target.toISOString().slice(0, 10);
};

export const diffInDays = (start: string, end: string): number => {
  const from = parseDateOnly(start);
  const to = parseDateOnly(end);
  if (!from || !to) return 0;
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
};

export const formatSagDate = (value?: string | null): string => {
  const iso = toDateOnly(value);
  if (!iso) return '-';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

export const formatSagDateTime = (value?: string | null): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(parsed);
  const get = (type: string) => parts.find(part => part.type === type)?.value || '';
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
};

const moneyFormatter = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export const formatSagMoney = (value: unknown): string =>
  `RM ${moneyFormatter.format(roundMoney(value))}`;

export const formatSagNumber = (value: unknown, digits = 2): string =>
  new Intl.NumberFormat('en-MY', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(Number(value) || 0);

/** Menyamai pengelasan jenis pajakan yang digunakan dalam modul transaksi SAG. */
export const resolveSagPledgeType = (transaction: any): string => {
  if (!transaction) return '';
  const explicit = String(transaction.transactionStatus || '');
  if (SAG_PLEDGE_TYPES.includes(explicit)) return explicit;
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

export const resolveSagPledgeStatus = (transaction: any): string => {
  const status = String(transaction?.status || '');
  return SAG_PLEDGE_STATUSES.includes(status) ? status : 'Aktif';
};

export const getSagPledgeTypeTone = (pledgeType?: string): string => {
  switch (pledgeType) {
    case 'Pajakan Asal':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'Salin':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'OL':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'Pusing':
      return 'bg-teal-50 text-teal-800 border-teal-200';
    case 'Lelong':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'TS':
    case 'TKS':
    case 'Tebus Cash':
    case 'Tebus EDT':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-violet-50 text-violet-800 border-violet-200';
  }
};

export const purityToKarat = (purity?: string | null): string => {  const numeric = parseFloat(String(purity || '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(numeric)) return '-';
  const table: [number, string][] = [
    [999, '24.0K'],
    [950, '23.0K'],
    [916, '22.0K'],
    [875, '21.0K'],
    [835, '20.0K'],
    [750, '18.0K'],
    [585, '14.0K'],
    [375, '9.0K']
  ];
  const match = table.find(([minimum]) => numeric >= minimum);
  return match ? match[1] : '-';
};

export const buildSagProfitSchedule = ({
  financingDate,
  maturityDate,
  totalProfit,
  paymentTermMonths = SAG_DEFAULT_PAYMENT_TERM_MONTHS
}: {
  financingDate: string;
  maturityDate: string;
  totalProfit: number;
  paymentTermMonths?: number;
}): SagProfitPeriod[] => {
  const start = parseDateOnly(financingDate);
  const maturity = parseDateOnly(maturityDate);
  const profit = roundMoney(totalProfit);
  if (!start || !maturity || maturity <= start) return [];

  const totalDays = diffInDays(financingDate, maturityDate);
  if (totalDays <= 0) return [];

  const periodMonths = Math.max(1, Math.min(24, Math.round(Number(paymentTermMonths) || SAG_DEFAULT_PAYMENT_TERM_MONTHS)));
  const windows: { dueDate: string; days: number }[] = [];
  let cursor = toDateOnly(financingDate);
  for (let guard = 0; guard < 60; guard += 1) {
    const candidate = addMonthsToDateOnly(cursor, periodMonths);
    const isBeyondMaturity = (parseDateOnly(candidate)?.getTime() || 0) >= maturity.getTime();
    const dueDate = isBeyondMaturity ? toDateOnly(maturityDate) : candidate;
    const days = diffInDays(cursor, dueDate);
    if (days <= 0) break;
    windows.push({ dueDate, days });
    if (isBeyondMaturity) break;
    cursor = dueDate;
  }

  let cumulativeDays = 0;
  let previousCumulativeProfit = 0;
  return windows.map((window, index) => {
    cumulativeDays += window.days;
    const isLast = index === windows.length - 1;
    const cumulativeProfit = isLast
      ? profit
      : roundMoney((profit * cumulativeDays) / totalDays);
    const periodProfit = roundMoney(cumulativeProfit - previousCumulativeProfit);
    previousCumulativeProfit = cumulativeProfit;
    return {
      index: index + 1,
      label: index === 0 ? 'TEMPOH MATANG' : `TEMPOH LANJUTAN ${index}`,
      dueDate: window.dueDate,
      days: window.days,
      profit: periodProfit,
      cumulativeProfit
    };
  });
};

export const createSagMarhunItem = (asset: any, ratePerGram: number): SagMarhunItem => {
  const weight = roundMoney(asset?.weight);
  const rate = roundMoney(ratePerGram);
  return {
    id: `marhun-${asset?.id ?? Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    assetId: asset?.id ?? null,
    description: `${asset?.type || 'Marhun'}${asset?.code ? ` (${asset.code})` : ''}`,
    quantity: 1,
    karat: purityToKarat(asset?.purity),
    ratePerGram: rate,
    weight,
    marhunValue: roundMoney(weight * rate)
  };
};

export const normalizeSagMarhunItems = (items: unknown): SagMarhunItem[] => {
  if (!Array.isArray(items)) return [];
  return items
    .filter(item => item && typeof item === 'object')
    .map((item: any, index) => {
      const quantity = Math.max(0, Number(item.quantity) || 0);
      const weight = Math.max(0, Number(item.weight) || 0);
      const ratePerGram = Math.max(0, Number(item.ratePerGram) || 0);
      return {
        id: String(item.id || `marhun-${index}`),
        assetId: item.assetId ?? null,
        description: String(item.description || ''),
        quantity,
        karat: String(item.karat || '-'),
        ratePerGram: roundMoney(ratePerGram),
        weight: roundMoney(weight),
        marhunValue: roundMoney(quantity * weight * ratePerGram)
      };
    });
};

export const summarizeSagMarhunItems = (items: SagMarhunItem[]) => ({
  quantity: items.reduce((total, item) => total + item.quantity, 0),
  weight: roundMoney(items.reduce((total, item) => total + item.quantity * item.weight, 0)),
  value: roundMoney(items.reduce((total, item) => total + item.marhunValue, 0))
});

/**
 * Kira semula semua nilai terbitan supaya borang, senarai dan surat
 * sentiasa menggunakan angka yang sama.
 */
export const normalizeSagDocument = (document: SagDocument): SagDocument => {
  const marhunItems = normalizeSagMarhunItems(document.marhunItems);
  const marhunSummary = summarizeSagMarhunItems(marhunItems);
  const purchasePrice = roundMoney(document.purchasePrice);
  const totalProfit = roundMoney(document.totalProfit);
  const pledgeType = String(document.pledgeType || '').trim();
  const previousRedemption = roundMoney(document.previousRedemption);
  const paymentTermMonths = Math.max(1, Math.min(24, Math.round(Number(document.paymentTermMonths) || SAG_DEFAULT_PAYMENT_TERM_MONTHS)));
  const financingDate = toDateOnly(document.financingDate) || toDateOnly(new Date().toISOString());
  const maturityDate = toDateOnly(document.maturityDate) ||
    addMonthsToDateOnly(financingDate, paymentTermMonths * 3);

  return {
    ...document,
    documentNo: String(document.documentNo || '').trim().toUpperCase(),
    product: String(document.product || SAG_PRODUCT_DEFAULT).trim(),
    pledgeType: String(document.pledgeType || '').trim(),
    pledgeStatus: String(document.pledgeStatus || 'Aktif').trim(),
    previousDocumentNo: String(document.previousDocumentNo || '').trim().toUpperCase(),
    previousTransactionRefNo: String(document.previousTransactionRefNo || '').trim(),
    previousRedemption,
    financingDate,
    maturityDate,
    paymentTermMonths,
    marhunItems,
    marhunValue: marhunItems.length ? marhunSummary.value : roundMoney(document.marhunValue),
    margin: Math.max(0, Math.min(100, roundMoney(document.margin))),
    feeRate: Math.max(0, roundMoney(document.feeRate)),
    feeBasis: normalizeSagFeeBasis(document.feeBasis),
    projectedProfit: calculateSagProjectedProfit(pledgeType, purchasePrice, previousRedemption, totalProfit),
    purchasePrice,
    totalProfit,
    sellingPrice: roundMoney(purchasePrice + totalProfit),
    profitSchedule: buildSagProfitSchedule({
      financingDate,
      maturityDate,
      totalProfit,
      paymentTermMonths
    })
  };
};

/** Medan lejar SAG (modul transaksi) yang ditulis daripada Surat Akuan Gadaian. */
export type SagLedgerFields = {
  refNo: string;
  date: string;
  redemptionDate: string;
  type: string;
  institution: string;
  weight: number;
  purity: string;
  marhunPrice: number;
  margin: number;
  marhunValue: number;
  loan: number;
  fee: number;
  /** Kadar upah simpan (% sebulan) dan asas kiraannya. */
  feeRate: number;
  feeBasis: SagFeeBasis;
  /** Unjuran lebihan tunai untuk surat susulan. */
  profit: number;
  redemption: number;
  feeTermMonths: number;
  transactionStatus: string;
  selectedAssetIds: (string | number)[];
  remarks: string;
};

/**
 * Terjemah Surat Akuan Gadaian kepada medan lejar SAG supaya surat menjadi
 * rekod master dan lejar menyimpan angka yang sama. Medan khusus lejar
 * (feeRate, feeBasis, profit, status, lampiran) tidak disentuh.
 */
export const buildSagLedgerFieldsFromDocument = (
  document: SagDocument,
  existingTransaction?: any | null
): SagLedgerFields => {
  const marhunItems = document.marhunItems || [];
  const summary = summarizeSagMarhunItems(marhunItems);
  const marhunValue = summary.value || roundMoney(document.marhunValue);
  const weight = summary.weight;
  const loan = roundMoney(document.purchasePrice);
  const fee = roundMoney(document.totalProfit);
  const pledgeType = SAG_PLEDGE_TYPES.includes(String(document.pledgeType || ''))
    ? String(document.pledgeType)
    : '';
  const karatList = Array.from(new Set(marhunItems.map(item => String(item.karat || '')).filter(Boolean)));
  const assetIds = marhunItems
    .map(item => item.assetId)
    .filter(value => value !== null && value !== undefined && String(value) !== '');
  return {
    refNo: String(existingTransaction?.refNo || document.transactionRefNo || document.documentNo || ''),
    date: toDateOnly(document.financingDate),
    redemptionDate: toDateOnly(document.maturityDate),
    type: String(existingTransaction?.type || pledgeType || 'Pajakan Asal'),
    institution: String(document.institutionName || existingTransaction?.institution || ''),
    weight,
    purity: karatList.join(' / ') || String(existingTransaction?.purity || ''),
    marhunPrice: weight > 0
      ? roundMoney(marhunValue / weight)
      : roundMoney(marhunItems[0]?.ratePerGram || 0),
    margin: roundMoney(document.margin) || (marhunValue > 0
      ? roundMoney((loan / marhunValue) * 100)
      : roundMoney(existingTransaction?.margin ?? 0)),
    marhunValue,
    loan,
    fee,
    feeRate: roundMoney(document.feeRate ?? existingTransaction?.feeRate ?? 0),
    feeBasis: normalizeSagFeeBasis(document.feeBasis || existingTransaction?.feeBasis),
    profit: roundMoney(document.projectedProfit ?? existingTransaction?.profit ?? 0),
    redemption: document.previousRedemption > 0
      ? roundMoney(document.previousRedemption)
      : roundMoney(loan + fee),
    feeTermMonths: Math.max(1, Number(document.paymentTermMonths) || SAG_DEFAULT_PAYMENT_TERM_MONTHS),
    transactionStatus: pledgeType || String(existingTransaction?.transactionStatus || 'Pajakan Asal'),
    selectedAssetIds: assetIds,
    remarks: String(existingTransaction?.remarks || `Dijana daripada Surat Akuan Gadaian ${document.documentNo}`)
  };
};

/**
 * Terjemah semula perubahan lejar kepada surat supaya surat sentiasa
 * memaparkan institusi, tarikh, nilai dan status pajakan terkini.
 */
export const buildSagDocumentPatchFromLedger = (
  document: SagDocument,
  transaction: any
): Partial<SagDocument> => {
  const ledgerPledgeType = resolveSagPledgeType(transaction);
  // 'Lain-lain' ialah nilai sandaran: jangan timpa jenis pajakan yang sudah ditetapkan pada surat.
  const resolvedPledgeType = ledgerPledgeType && ledgerPledgeType !== 'Lain-lain' && SAG_PLEDGE_TYPES.includes(ledgerPledgeType)
    ? ledgerPledgeType
    : document.pledgeType;
  return {
    transactionId: transaction?.id ?? document.transactionId ?? null,
    transactionRefNo: String(transaction?.refNo || document.transactionRefNo || ''),
    institutionName: String(transaction?.institution || document.institutionName || ''),
    financingDate: toDateOnly(transaction?.date) || document.financingDate,
    maturityDate: toDateOnly(transaction?.redemptionDate) || document.maturityDate,
    purchasePrice: roundMoney(transaction?.loan ?? document.purchasePrice),
    totalProfit: roundMoney(transaction?.fee ?? document.totalProfit),
    marhunValue: roundMoney(transaction?.marhunValue ?? document.marhunValue),
    margin: roundMoney(transaction?.margin ?? document.margin),
    feeRate: roundMoney(transaction?.feeRate ?? document.feeRate),
    feeBasis: transaction?.feeBasis !== undefined && transaction?.feeBasis !== null
      ? normalizeSagFeeBasis(transaction.feeBasis)
      : document.feeBasis,
    previousRedemption: resolvedPledgeType === 'Pajakan Asal'
      ? document.previousRedemption
      : roundMoney(transaction?.redemption ?? document.previousRedemption),
    pledgeType: resolvedPledgeType,
    pledgeStatus: resolveSagPledgeStatus(transaction)
  };
};

export const buildSagDocumentNumber = (
  prefix: string,
  dateISO: string,
  existingNumbers: string[] = []
): string => {
  const iso = toDateOnly(dateISO) || toDateOnly(new Date().toISOString());
  const [year, month, day] = iso.split('-');
  const normalizedPrefix = (String(prefix || 'SAG').trim() || 'SAG').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const dateSegment = `${day}${month}${year.slice(2)}`;
  const scope = `${normalizedPrefix}-${dateSegment}-`;
  const used = new Set(
    existingNumbers
      .map(value => String(value || '').toUpperCase())
      .filter(value => value.startsWith(scope))
  );
  let sequence = 1;
  let candidate = `${scope}${String(sequence).padStart(4, '0')}`;
  while (used.has(candidate)) {
    sequence += 1;
    candidate = `${scope}${String(sequence).padStart(4, '0')}`;
  }
  return candidate;
};

export type SagDocumentDraftInput = {
  transaction?: any;
  institution?: any;
  assets?: any[];
  member?: Partial<SagMemberSnapshot> | null;
  letterhead: SagLetterhead;
  existingNumbers?: string[];
  copyType?: SagCopyType;
  /** Surat Akuan Gadaian terdahulu yang di transaksi untuk menghasilkan surat ini. */
  previousDocument?: SagDocument | null;
  now?: string;
};

export const mergeSagMemberContact = (
  base: Partial<SagMemberSnapshot> | null | undefined,
  contact?: Partial<SagMemberSnapshot> | null
): SagMemberSnapshot => ({
  userId: String(base?.userId || contact?.userId || ''),
  memberNo: String(contact?.memberNo || base?.memberNo || ''),
  name: String(contact?.name || base?.name || ''),
  icNumber: String(contact?.icNumber || base?.icNumber || ''),
  address: String(contact?.address || base?.address || ''),
  phone: String(contact?.phone || base?.phone || ''),
  heirName: String(contact?.heirName || base?.heirName || ''),
  poBox: String(contact?.poBox || base?.poBox || '')
});

export const buildSagDocumentDraft = ({
  transaction,
  institution,
  assets = [],
  member,
  letterhead,
  existingNumbers = [],
  copyType = 'Salinan Pelanggan',
  previousDocument = null,
  now = new Date().toISOString()
}: SagDocumentDraftInput): SagDocument => {
  const financingDate = toDateOnly(transaction?.date) || toDateOnly(now);
  const marhunRate = roundMoney(transaction?.marhunPrice ?? institution?.marhunRate ?? 0);
  const purchasePrice = roundMoney(transaction?.loan ?? 0);
  const totalProfit = roundMoney(transaction?.fee ?? 0);
  const linkedItems = assets
    .filter(asset => asset && (parseFloat(asset.weight) || 0) > 0)
    .map(asset => createSagMarhunItem(asset, marhunRate));
  const marhunValueFromAssets = summarizeSagMarhunItems(linkedItems).value;
  const fallbackMarhunValue = roundMoney(
    transaction?.marhunValue ?? (Number(transaction?.weight) || 0) * marhunRate
  );
  const maturityDate = toDateOnly(transaction?.redemptionDate);

  return normalizeSagDocument({
    id: now,
    documentNo: buildSagDocumentNumber(letterhead.documentPrefix, financingDate, existingNumbers),
    status: 'Draf',
    copyType,
    product: SAG_PRODUCT_DEFAULT,
    transactionId: transaction?.id ?? null,
    transactionRefNo: String(transaction?.refNo || ''),
    institutionId: institution?.id ?? null,
    institutionName: String(institution?.name || transaction?.institution || ''),
    pledgeType: resolveSagPledgeType(transaction),
    pledgeStatus: resolveSagPledgeStatus(transaction),
    previousDocumentNo: String(previousDocument?.documentNo || ''),
    previousTransactionRefNo: String(previousDocument?.transactionRefNo || transaction?.parentRefNo || ''),
    previousRedemption: roundMoney(
      previousDocument?.sellingPrice ?? transaction?.redemption ?? 0
    ),
    financingDate,
    maturityDate: maturityDate || addMonthsToDateOnly(financingDate, SAG_DEFAULT_PAYMENT_TERM_MONTHS * 3),
    paymentDueOverride: '',
    paymentTermMonths: Number(transaction?.feeTermMonths) > 0
      ? Number(transaction.feeTermMonths)
      : SAG_DEFAULT_PAYMENT_TERM_MONTHS,
    member: mergeSagMemberContact(member),
    marhunValue: linkedItems.length ? marhunValueFromAssets : fallbackMarhunValue,
    margin: roundMoney(transaction?.margin ?? institution?.maxMargin ?? 0),
    feeRate: roundMoney(transaction?.feeRate ?? 0),
    feeBasis: normalizeSagFeeBasis(transaction?.feeBasis),
    purchasePrice,
    totalProfit,
    sellingPrice: roundMoney(purchasePrice + totalProfit),
    profitSchedule: [],
    tawarruq: { saleAgreed: true, pledgeAgreed: true },
    marhunItems: linkedItems,
    signatures: {
      customerName: String(member?.name || ''),
      customerSignedAt: '',
      officerName: letterhead.officerName,
      officerSignedAt: '',
      witnessName: letterhead.witnessName,
      witnessSignedAt: ''
    },
    remarks: '',
    recordType: 'sagDocument',
    lastAction: 'CREATE',
    createdAt: now,
    updatedAt: now
  } as SagDocument);
};

export const createEmptySagDocument = (
  letterhead: SagLetterhead,
  existingNumbers: string[] = [],
  now = new Date().toISOString()
): SagDocument => {
  const financingDate = toDateOnly(now);
  return normalizeSagDocument({
    id: now,
    documentNo: buildSagDocumentNumber(letterhead.documentPrefix, financingDate, existingNumbers),
    status: 'Draf',
    copyType: 'Salinan Pelanggan',
    product: SAG_PRODUCT_DEFAULT,
    transactionId: null,
    transactionRefNo: '',
    institutionId: null,
    institutionName: '',
    pledgeType: '',
    pledgeStatus: 'Aktif',
    previousDocumentNo: '',
    previousTransactionRefNo: '',
    previousRedemption: 0,
    financingDate,
    maturityDate: addMonthsToDateOnly(financingDate, SAG_DEFAULT_PAYMENT_TERM_MONTHS * 3),
    paymentDueOverride: '',
    paymentTermMonths: SAG_DEFAULT_PAYMENT_TERM_MONTHS,
    member: {
      userId: '',
      memberNo: '',
      name: '',
      icNumber: '',
      address: '',
      phone: '',
      heirName: '',
      poBox: ''
    },
    marhunValue: 0,
    margin: 0,
    feeRate: 0,
    feeBasis: '' as SagFeeBasis,
    purchasePrice: 0,
    totalProfit: 0,
    sellingPrice: 0,
    profitSchedule: [],
    tawarruq: { saleAgreed: true, pledgeAgreed: true },
    marhunItems: [],
    signatures: {
      customerName: '',
      customerSignedAt: '',
      officerName: letterhead.officerName,
      officerSignedAt: '',
      witnessName: letterhead.witnessName,
      witnessSignedAt: ''
    },
    remarks: '',
    recordType: 'sagDocument',
    lastAction: 'CREATE',
    createdAt: now,
    updatedAt: now
  } as SagDocument);
};

export const validateSagDocument = (document: SagDocument): string[] => {
  const errors: string[] = [];
  if (!String(document.documentNo || '').trim()) errors.push('No. SAG wajib diisi.');
  if (!String(document.member?.name || '').trim()) errors.push('Nama ahli wajib diisi.');
  const icDigits = String(document.member?.icNumber || '').replace(/\D/g, '');
  if (icDigits.length !== 12) errors.push('No. MyKad ahli mesti 12 digit.');
  if (!String(document.member?.address || '').trim()) errors.push('Alamat ahli wajib diisi.');
  if (!String(document.member?.phone || '').trim()) errors.push('No. telefon ahli wajib diisi.');
  if (!String(document.pledgeType || '').trim()) errors.push('Jenis pajakan mesti dipilih mengikut transaksi surat ini.');
  if (!document.financingDate) errors.push('Tarikh pembiayaan wajib diisi.');
  if (!document.maturityDate) errors.push('Tarikh matang wajib diisi.');
  if (document.maturityDate && document.financingDate && document.maturityDate <= document.financingDate) {
    errors.push('Tarikh matang mesti selepas tarikh pembiayaan.');
  }
  if (!(Number(document.purchasePrice) > 0)) errors.push('Harga belian / nilai pembiayaan mesti melebihi RM 0.00.');
  if (roundMoney(document.purchasePrice) > roundMoney(document.marhunValue)) {
    errors.push('Nilai pembiayaan tidak boleh melebihi nilai marhun.');
  }
  if (!document.marhunItems.length && !(Number(document.marhunValue) > 0)) {
    errors.push('Masukkan sekurang-kurangnya satu item marhun atau nilai marhun.');
  }
  if (!document.tawarruq?.saleAgreed || !document.tawarruq?.pledgeAgreed) {
    errors.push('Kedua-dua akad tawarruq perlu disahkan.');
  }
  return errors;
};

export const getSagDocumentStatusMeta = (status?: SagDocumentStatus) => {
  if (status === 'Dikeluarkan') {
    return {
      label: 'Dikeluarkan',
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold',
      dotClass: 'bg-emerald-500'
    };
  }
  if (status === 'Batal') {
    return {
      label: 'Batal',
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
      dotClass: 'bg-rose-500'
    };
  }
  return {
    label: 'Draf',
    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold',
    dotClass: 'bg-amber-500'
  };
};

export const buildSagVerificationCode = (document: SagDocument): string => {
  const payload = [
    document.documentNo,
    document.member?.memberNo,
    document.member?.icNumber,
    toDateOnly(document.financingDate),
    roundMoney(document.sellingPrice).toFixed(2)
  ].join('|');
  let hash = 0;
  for (let index = 0; index < payload.length; index += 1) {
    hash = (hash * 31 + payload.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36).toUpperCase().padStart(7, '0').slice(0, 7);
};

export const buildSagQrPayload = (document: SagDocument): string =>
  [
    'ARRAHNU-SAG',
    document.documentNo || '-',
    `REF:${document.transactionRefNo || '-'}`,
    `AH:${String(document.member?.memberNo || '-').toUpperCase()}`,
    `JM:${roundMoney(document.marhunValue).toFixed(2)}`,
    `HJ:${roundMoney(document.sellingPrice).toFixed(2)}`,
    `SAH:${buildSagVerificationCode(document)}`
  ].join('|');

export const summarizeSagDocuments = (documents: SagDocument[]) => {
  const visible = documents.filter(document => !document.deletedAt);
  return {
    total: visible.length,
    issued: visible.filter(document => document.status === 'Dikeluarkan').length,
    draft: visible.filter(document => document.status === 'Draf').length,
    cancelled: visible.filter(document => document.status === 'Batal').length,
    marhunTotal: roundMoney(visible.reduce((total, document) => total + (Number(document.marhunValue) || 0), 0)),
    financingTotal: roundMoney(visible.reduce((total, document) => total + (Number(document.purchasePrice) || 0), 0)),
    profitTotal: roundMoney(visible.reduce((total, document) => total + (Number(document.totalProfit) || 0), 0))
  };
};
