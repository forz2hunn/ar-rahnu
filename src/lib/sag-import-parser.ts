/**
 * Pengekstrak medan Surat Akuan Gadaian daripada teks mentah — sama ada
 * lapisan teks PDF atau hasil OCR imej/imbasan.
 *
 * Fungsi di sini tulen (tiada DOM/storan) supaya mudah diuji dan dikitar semula
 * oleh modul lain. Ia menggunakan pendekatan label + corak: setiap medan dicari
 * melalui label yang lazim pada surat Ar-Rahnu (termasuk label berbahasa
 * Inggeris), kemudian nilai disahkan mengikut jenis (wang/tarikh/No. KP).
 */

export type SagImportMarhunItem = {
  description: string;
  quantity: number;
  karat: string;
  weight: number;
  marhunValue: number;
  ratePerGram: number;
  fineness: number | null;
};

export type SagImportParsedFields = {
  institutionName?: string;
  documentNo?: string;
  memberName?: string;
  memberIcNumber?: string;
  financingDate?: string;
  maturityDate?: string;
  pledgeType?: string;
  marhunValue?: number;
  financingAmount?: number;
  profitAmount?: number;
  sellingPrice?: number;
  paymentTermMonths?: number;
  /** Asas upah simpan yang dapat disimpulkan daripada jadual tempoh matang. */
  feeBasis?: 'nilaiMarhun';
  /** Kadar upah simpan (% sebulan) yang dikira daripada jadual tempoh. */
  feeRate?: number;
  /** Jumlah tebus surat asal (pembiayaan + jumlah jadual tempoh). */
  previousRedemption?: number;
  /** Jumlah terkumpul upah simpan sepanjang tempoh (RM). */
  scheduleTotal?: number;
  /** Bilangan bulan yang digunakan untuk mengira kadar (dari tarikh surat). */
  scheduleMonths?: number;
  /** Senarai item marhun daripada jadual Keterangan Marhun surat asal. */
  marhunItems?: SagImportMarhunItem[];
  /** No. akaun institusi pada surat asal. */
  accountNo?: string;
  /** No. kotak/peti tempat marhun disimpan. */
  poBox?: string;
  /** No. Sijil Komoditi (tawarruq). */
  commodityCertificateNo?: string;
  /** Jumlah bayaran keuntungan setiap selang tempoh (RM). */
  profitPaymentAmount?: number;
  /** Selang bayaran keuntungan dalam bulan (contoh: setiap 6 bulan). */
  profitPaymentMonths?: number;
};

export type SagImportParseResult = {
  fields: SagImportParsedFields;
  /** 0–1: jumlah pemberat medan utama yang berjaya dipadankan. */
  confidence: number;
  /** Label medan (untuk paparan) yang berjaya dipadankan. */
  matchedLabels: string[];
  notes: string[];
};

/** Label lazim pada surat Ar-Rahnu; turutan menentukan keutamaan. */
const FIELD_LABELS = {
  institutionName: ['Cawangan/Kedai', 'Cawangan', 'Nama Institusi', 'Institusi', 'Koperasi'],
  documentNo: [
    'No. Surat', 'No Surat', 'No Sir', 'No. Sijil', 'No Sijil',
    'No. Rujukan', 'No Rujukan', 'No. Gadaian', 'No Gadaian'
  ],
  accountNo: ['No. Akaun', 'No Akaun', 'Nombor Akaun', 'No. Akaun Gadaian'],
  poBox: ['No. Kotak', 'No Kotak', 'No. Peti', 'No Peti', 'Kotak Simpanan'],
  commodityCertificateNo: ['No. Sijil Komoditi', 'No Sijil Komoditi', 'Sijil Komoditi', 'No. Sijil'],
  profitPaymentAmount: ['Jumlah Bayaran Keuntungan', 'Bayaran Keuntungan'],
  profitPaymentMonths: ['Cara Bayaran Keuntungan', 'Cara Bayaran'],
  memberName: ['Nama Ahli', 'Nama Pelanggan', 'Nama Penggadai', 'Nama Pemilik', 'Nama'],
  memberIcNumber: [
    'No. Kad Pengenalan', 'No Kad Pengenalan', 'No. KP', 'No KP', 'No. MyKad', 'No MyKad',
    'No. I/C', 'No IC', 'MyKad'
  ],
  financingDate: ['Tarikh Gadaian', 'Tarikh Pembiayaan', 'Tarikh Pajakan', 'Tarikh Mula', 'Tarikh Transaksi'],
  maturityDate: ['Tarikh Matang', 'Tarikh Tamat', 'Tarikh Luput'],
  marhunValue: ['Jumlah Nilai Marhun', 'Nilai Marhun', 'Nilai Gadaian', 'Nilai Cagaran'],
  financingAmount: [
    'Jumlah Pembiayaan/Harga Belian', 'Jumlah Pembiayaan', 'Harga Belian', 'Purchase Price',
    'Jumlah Pinjaman', 'Pembiayaan'
  ],  sellingPrice: ['Harga Jualan/Sale Price', 'Harga Jualan', 'Sale Price', 'Jumlah Harga Jualan'],
  profitAmount: ['Keuntungan/Profit', 'Jumlah Keuntungan', 'Keuntungan', 'Profit'],
  paymentTermMonths: ['Tempoh Pembiayaan', 'Tempoh Gadaian', 'Tempoh Pajakan', 'Tempoh (bulan)', 'Tempoh'],
  pledgeType: ['Jenis Pajakan', 'Jenis Gadaian', 'Jenis Surat'],
  margin: ['Kadar Pembiayaan', 'Margin Pembiayaan', 'Margin', 'LTV']
} as const;

const ALL_LABEL_KEYS = Object.values(FIELD_LABELS)
  .flat()
  .map(label => label.toLowerCase().replace(/[^a-z0-9]/g, ''))
  .sort((left, right) => right.length - left.length);

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Normalisasi teks dan simpan peta indeks → kedudukan asal. */
const normalizeWithMap = (text: string) => {
  let key = '';
  const map: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index].toLowerCase();
    if (/[a-z0-9]/.test(char)) {
      key += char;
      map.push(index);
    }
  }
  return { key, map };
};

const trimToNextLabel = (value: string) => {
  const lower = value.toLowerCase();
  let cut = value.length;
  for (const labelKey of ALL_LABEL_KEYS) {
    const at = normalizeKey(value).indexOf(labelKey);
    if (at > 0) {
      // Cari kedudukan asal label seterusnya untuk memotong nilai bercampur lajur.
      const { map } = normalizeWithMap(value);
      const originalIndex = map[at];
      if (originalIndex > 0 && originalIndex < cut) cut = originalIndex;
    }
  }
  return lower ? value.slice(0, cut) : value;
};

const isLabelLine = (line: string) => {
  const key = normalizeKey(line);
  return ALL_LABEL_KEYS.some(labelKey => key.startsWith(labelKey));
};

const cleanValue = (value: string) =>
  value
    .replace(/^[\s:;|,.\-–—]+/, '')
    .replace(/[\s:;|,.\-–—]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

type ExtractOptions = {
  /** Sahkan nilai sebelum diterima (contoh: mesti boleh dihurai sebagai wang). */
  validate?: (value: string) => boolean;
  /** Tolak baris tertentu (contoh: "Jumlah Bayaran Keuntungan"). */
  acceptLine?: (line: string) => boolean;
};

/**
 * Cari nilai selepas label. Dua laluan:
 *  1. Label di awal baris (kedudukan lajur kiri) — paling dipercayai.
 *  2. Label di tengah baris (OCR menggabungkan lajur) — sandaran.
 */
const extractField = (lines: string[], labels: readonly string[], options: ExtractOptions = {}) => {
  for (const allowMidLine of [false, true]) {
    for (const label of labels) {
      const labelKey = normalizeKey(label);
      if (!labelKey) continue;
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        const { key, map } = normalizeWithMap(line);
        const at = key.indexOf(labelKey);
        if (at === -1) continue;
        const originalStart = map[at];
        if (!allowMidLine && originalStart > 12) continue;
        if (allowMidLine && originalStart > 92) continue;
        if (options.acceptLine && !options.acceptLine(line)) continue;
        const originalEnd = map[at + labelKey.length - 1] ?? originalStart + label.length;
        const sameLine = cleanValue(trimToNextLabel(line.slice(originalEnd + 1)));
        const candidates: string[] = [];
        if (sameLine) candidates.push(sameLine);
        // Nilai selalunya berada pada baris berikutnya (sel jadual / label berbalut).
        // Cari sehingga 3 baris ke hadapan, berhenti jika bertemu label baharu.
        if (options.validate) {
          for (let offset = 1; offset <= 3 && lineIndex + offset < lines.length; offset += 1) {
            const nextLine = cleanValue(lines[lineIndex + offset]);
            if (!nextLine) continue;
            if (isLabelLine(nextLine)) break;
            candidates.push(nextLine);
            if (nextLine.length > 90) break;
          }
        }
        for (const value of candidates) {
          if (!value) continue;
          if (options.validate && !options.validate(value)) continue;
          return { value, label, lineIndex };
        }
      }
    }
  }
  return null;
};

const pad2 = (value: number) => String(value).padStart(2, '0');

/** Peta kekeliruan lazim OCR (huruf yang menyerupai digit). */
const OCR_DIGIT_MAP: Record<string, string> = {
  O: '0', o: '0', D: '0', d: '0', Q: '0', q: '0',
  I: '1', i: '1', l: '1', L: '1', '|': '1',
  S: '5', s: '5', B: '8', b: '8', Z: '2', z: '2', G: '6', g: '6', T: '7'
};

const DIGIT_LIKE_CLASS = 'OoDdQqIiLl|SsBbZzGgTt';

const normalizeOcrDigits = (value: string) =>
  String(value || '').replace(new RegExp(`[${DIGIT_LIKE_CLASS}]`, 'g'), char => OCR_DIGIT_MAP[char] ?? char);

const roundMoneyValue = (value: number) => Math.round(value * 100) / 100;

const formatNumberForNote = (value: number) =>
  Number(value || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Faktor ketulenan karat selari dengan SAG_KARAT_FINENESS dalam modul SAG. */
const KARAT_FINENESS: Record<string, number> = {
  '24': 0.9999,
  '23': 0.95,
  '22': 0.916,
  '21': 0.875,
  '20': 0.833,
  '18': 0.75,
  '14': 0.585,
  '9': 0.375
};

const resolveKaratFineness = (karatNumber: number) =>
  KARAT_FINENESS[String(karatNumber)] ?? Number((karatNumber / 24).toFixed(4));

/** Tambah bulan pada tarikh ISO (YYYY-MM-DD) tanpa bergantung pada zon waktu. */
const addMonthsToIsoDate = (isoDate: string, months: number) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return '';
  const date = new Date(Date.UTC(year, month - 1 + months, day));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
};

/** Bilangan bulan penuh antara dua tarikh ISO (YYYY-MM-DD). */
const monthsBetweenIsoDates = (startIso: string, endIso: string) => {
  const [startYear, startMonth, startDay] = startIso.split('-').map(Number);
  const [endYear, endMonth, endDay] = endIso.split('-').map(Number);
  if (!startYear || !endYear) return 0;
  let months = (endYear - startYear) * 12 + (endMonth - startMonth);
  if (endDay < startDay) months -= 1;
  return months > 0 ? months : 0;
};

/** Hurai token wang yang mungkin tercemar OCR (contoh: "RM 11,584.05"). */
const parseMoneyToken = (raw: string): number | null => {
  const cleaned = normalizeOcrDigits(raw).replace(/[^\d.,]/g, '');
  if (!cleaned || !/\d/.test(cleaned)) return null;
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(cleaned)) {
    return roundMoneyValue(Number(cleaned.replace(/,/g, '')));
  }
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(cleaned)) {
    return roundMoneyValue(Number(cleaned.replace(/\./g, '').replace(',', '.')));
  }
  if (/^\d{1,3}(?:,\d{3})+,\d{1,2}$/.test(cleaned)) {
    const parts = cleaned.split(',');
    return roundMoneyValue(Number(`${parts.slice(0, -1).join('')}.${parts[parts.length - 1]}`));
  }
  const numeric = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(numeric) ? roundMoneyValue(numeric) : null;
};

const parseMoneyValue = (raw: string): number | null => {
  const text = String(raw || '');
  // Token calon: huruf digit-like dibenarkan, tetapi token mesti mengandungi
  // digit sebenar supaya perkataan seperti "Price" tidak dibaca sebagai 1.
  const tokenRegex = new RegExp(`(?:RM|R\\s?M|RN)?\\s*[\\d${DIGIT_LIKE_CLASS}][\\d${DIGIT_LIKE_CLASS}.,]*`, 'gi');
  const matches = text.match(tokenRegex) || [];
  let best: { value: number; score: number } | null = null;
  for (const token of matches) {
    const realDigits = (token.match(/\d/g) || []).length;
    const hasCurrency = /^\s*(?:rm|rn|r\s?m)/i.test(token) || /(?:^|\s)rm\s*$/i.test(token);
    if (realDigits < 1) continue;
    if (realDigits < 2 && !hasCurrency) continue;
    const value = parseMoneyToken(token);
    if (value === null || value < 1) continue;
    const score = (hasCurrency ? 100 : 0) + realDigits * 10 + token.length;
    if (!best || score > best.score) best = { value, score };
  }
  return best ? best.value : null;
};

const MALAY_MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mac: 3, mar: 3, apr: 4, mei: 5, jun: 6, jul: 7,
  ogo: 8, ogos: 8, aug: 8, sep: 9, sept: 9, okt: 10, oct: 10,
  nov: 11, dis: 12, dec: 12
};

const tryNumericDate = (text: string): string | null => {
  const iso = text.match(/((?:19|20)\d{2})[./-](\d{1,2})[./-](\d{1,2})/);
  if (iso) {
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${iso[1]}-${pad2(month)}-${pad2(day)}`;
    }
  }
  const numeric = text.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    let year = Number(numeric[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1990 && year <= 2100) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }
  return null;
};

const parseDateValue = (raw: string): string | null => {
  const text = String(raw || '').replace(/\s+/g, ' ');
  const direct = tryNumericDate(text);
  if (direct) return direct;
  const normalized = tryNumericDate(normalizeOcrDigits(text));
  if (normalized) return normalized;
  const worded = text.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+((?:19|20)\d{2})/);
  if (worded) {
    const month = MALAY_MONTHS[worded[2].toLowerCase().slice(0, 4)] || MALAY_MONTHS[worded[2].toLowerCase().slice(0, 3)];
    const day = Number(worded[1]);
    if (month && day >= 1 && day <= 31) {
      return `${worded[3]}-${pad2(month)}-${pad2(day)}`;
    }
  }
  return null;
};

const normalizeIc = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 12 ? digits : '';
};

const cleanName = (raw: string) => {
  const value = cleanValue(raw)
    .replace(/[^A-Za-z\u00C0-\u024F .'@/&-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (value.length < 3) return '';
  if (!/[A-Za-z]{3}/.test(value)) return '';
  if (/institusi|syarikat|koperasi|cawangan|alamat|telefon|emel|email|tarikh|nilai|jumlah|no\b/i.test(value)) return '';
  return value;
};

const cleanInstitution = (raw: string) => {
  const value = cleanValue(raw)
    .replace(/^cawangan\s*\/?\s*kedai\s*[:\-]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (value.length < 3 || !/[A-Za-z]{3}/.test(value)) return '';
  return value;
};

const cleanDocumentNo = (raw: string) => {
  const match = raw.match(/[A-Z0-9][A-Z0-9/._-]{4,}/i);
  const candidate = match ? match[0].replace(/[._-]+$/, '') : '';
  if (!candidate || !/\d/.test(candidate)) return '';
  return candidate.toUpperCase();
};

/** No. akaun institusi dikekalkan sebagai teks supaya sifar di hadapan tidak hilang. */
const cleanAccountNo = (raw: string) => {
  const match = raw.match(/[A-Z0-9][A-Z0-9/._-]{3,}/i);
  const candidate = match ? match[0].replace(/[._-]+$/, '') : '';
  if (!candidate || !/\d/.test(candidate)) return '';
  return candidate.toUpperCase();
};

/** No. Sijil Komoditi dikekalkan sebagai teks (huruf + digit). */
const cleanCommodityNo = (raw: string) => {
  const match = raw.match(/[A-Z0-9][A-Z0-9/._-]{4,}/i);
  const candidate = match ? match[0].replace(/[._-]+$/, '') : '';
  if (!candidate || !/\d/.test(candidate)) return '';
  return candidate.toUpperCase();
};

/** No. kotak/peti marhun (contoh: "37", "A49"). */
const cleanPoBox = (raw: string) => {
  const match = raw.match(/[A-Z0-9][A-Z0-9/-]{0,11}/i);
  const candidate = match ? match[0] : '';
  return /\d/.test(candidate) ? candidate.toUpperCase() : '';
};

const resolvePledgeType = (raw: string) => {
  const lower = raw.toLowerCase();
  if (/pusing|pindah\s*gadai|pindahan/.test(lower)) return 'Pusing';
  if (/salin/.test(lower)) return 'Salin';
  if (/\bol\b|overlap/.test(lower)) return 'OL';
  if (/lelong/.test(lower)) return 'Lelong';
  if (/tebus/.test(lower)) return 'Tebus Cash';
  if (/pajakan asal|gadaian asal|pajak gadai|tawarruq/.test(lower)) return 'Pajakan Asal';
  if (/lain/.test(lower)) return 'Lain-lain';
  return '';
};

/**
 * Kesan cop tindanan pada surat (contoh cop `OVERLAP` di penjuru kanan atas).
 * Cop ini lebih dipercayai daripada medan "Jenis Gadaian" yang hanya menyatakan
 * produk (contoh: PGI - Tawarruq).
 *
 * Nota: perkataan `SALINAN PELANGGAN` pada kotak salinan TIDAK bermaksud
 * pajakan `Salin`, jadi hanya cop OVERLAP/PUSING yang dikesan di sini.
 */
const detectStampedPledgeType = (rawText: string, lines: string[]) => {
  // Guna kunci ternormal (buang ruang/tanda baca) supaya OCR yang memecahkan
  // "OVER LAP" atau menyelit simbol tetap dikesan.
  const fullKey = normalizeKey(rawText);
  if (fullKey.includes('overlap') || fullKey.includes('verlap')) return 'OL';
  const headerKey = normalizeKey(lines.slice(0, 18).join(' '));
  if (headerKey.includes('pusing') || headerKey.includes('pindahgadai')) return 'Pusing';
  return '';
};

const parsePercent = (raw: string): number | null => {
  const match = raw.match(/(\d+(?:\.\d+)?)\s*%?/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 && value <= 100 ? value : null;
};

const FIELD_WEIGHTS: { key: keyof SagImportParsedFields; weight: number; label: string }[] = [
  { key: 'institutionName', weight: 0.08, label: 'Institusi asal' },
  { key: 'documentNo', weight: 0.08, label: 'No. surat' },
  { key: 'memberName', weight: 0.14, label: 'Nama ahli' },
  { key: 'memberIcNumber', weight: 0.10, label: 'No. MyKad' },
  { key: 'financingDate', weight: 0.14, label: 'Tarikh pembiayaan' },
  { key: 'maturityDate', weight: 0.06, label: 'Tarikh matang' },
  { key: 'pledgeType', weight: 0.04, label: 'Jenis pajakan' },
  { key: 'marhunValue', weight: 0.18, label: 'Nilai marhun' },
  { key: 'financingAmount', weight: 0.18, label: 'Jumlah pembiayaan' }
];

/**
 * Hurai teks surat kepada medan borang import.
 *
 * Nilai yang hilang tetapi boleh diterbitkan akan dikira:
 *  - pembiayaan = harga jualan − keuntungan
 *  - pembiayaan = nilai marhun × margin
 */
export const parseSagImportText = (text: string): SagImportParseResult => {
  const lines = String(text || '')
    .replace(/\u00a0/g, ' ')
    .split(/\r?\n/)
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean);
  const fields: SagImportParsedFields = {};
  const notes: string[] = [];

  const institution = extractField(lines, FIELD_LABELS.institutionName, {
    validate: value => cleanInstitution(value) !== ''
  });
  if (institution) fields.institutionName = cleanInstitution(institution.value);

  const documentNo = extractField(lines, FIELD_LABELS.documentNo, {
    validate: value => cleanDocumentNo(value) !== '',
    // "No. Sijil Komoditi" bukan nombor surat gadaian.
    acceptLine: line => !/komoditi/i.test(line)
  });
  if (documentNo) fields.documentNo = cleanDocumentNo(documentNo.value);

  const accountNo = extractField(lines, FIELD_LABELS.accountNo, {
    validate: value => cleanAccountNo(value) !== ''
  });
  if (accountNo) fields.accountNo = cleanAccountNo(accountNo.value);

  const commodityCertificate = extractField(lines, FIELD_LABELS.commodityCertificateNo, {
    validate: value => cleanCommodityNo(value) !== '',
    acceptLine: line => /komoditi/i.test(line)
  });
  if (commodityCertificate) fields.commodityCertificateNo = cleanCommodityNo(commodityCertificate.value);

  const profitPayment = extractField(lines, FIELD_LABELS.profitPaymentAmount, {
    validate: value => parseMoneyValue(value) !== null,
    acceptLine: line => /bayaran\s*keuntungan/i.test(line)
  });
  if (profitPayment) fields.profitPaymentAmount = parseMoneyValue(profitPayment.value) || undefined;

  const paymentCadence = extractField(lines, FIELD_LABELS.profitPaymentMonths, {
    validate: value => /bulan/i.test(value) && /\d/.test(value)
  });
  const cadenceMatch = (paymentCadence?.value || '').match(/(\d{1,2})\s*bulan/i)
    || String(text || '').match(/(?:setiap|every)\s*(\d{1,2})\s*bulan/i);
  if (cadenceMatch) {
    const cadenceMonths = Number(cadenceMatch[1]);
    if (cadenceMonths >= 1 && cadenceMonths <= 24) fields.profitPaymentMonths = cadenceMonths;
  }

  const poBox = extractField(lines, FIELD_LABELS.poBox, {
    validate: value => cleanPoBox(value) !== ''
  });
  if (poBox) fields.poBox = cleanPoBox(poBox.value);

  const memberName = extractField(lines, FIELD_LABELS.memberName, {
    validate: value => cleanName(value) !== ''
  });
  if (memberName) fields.memberName = cleanName(memberName.value);

  const ic = extractField(lines, FIELD_LABELS.memberIcNumber, {
    validate: value => normalizeIc(value) !== ''
  });
  if (ic) {
    fields.memberIcNumber = normalizeIc(ic.value);
  } else {
    const icMatch = String(text).match(/\b\d{6}[- ]?\d{2}[- ]?\d{4}\b/);
    if (icMatch) fields.memberIcNumber = normalizeIc(icMatch[0]);
  }

  const financingDate = extractField(lines, FIELD_LABELS.financingDate, {
    validate: value => parseDateValue(value) !== null
  });
  if (financingDate) fields.financingDate = parseDateValue(financingDate.value) || undefined;

  const maturityDate = extractField(lines, FIELD_LABELS.maturityDate, {
    validate: value => parseDateValue(value) !== null
  });
  if (maturityDate) fields.maturityDate = parseDateValue(maturityDate.value) || undefined;

  const marhun = extractField(lines, FIELD_LABELS.marhunValue, {
    validate: value => parseMoneyValue(value) !== null
  });
  if (marhun) fields.marhunValue = parseMoneyValue(marhun.value) || undefined;

  const financing = extractField(lines, FIELD_LABELS.financingAmount, {
    validate: value => parseMoneyValue(value) !== null,
    // Elak "Tempoh Pembiayaan" dianggap sebagai jumlah pembiayaan.
    acceptLine: line => !/tempoh/i.test(line)
  });
  if (financing) fields.financingAmount = parseMoneyValue(financing.value) || undefined;

  const selling = extractField(lines, FIELD_LABELS.sellingPrice, {
    validate: value => parseMoneyValue(value) !== null
  });
  if (selling) fields.sellingPrice = parseMoneyValue(selling.value) || undefined;

  const profit = extractField(lines, FIELD_LABELS.profitAmount, {
    validate: value => parseMoneyValue(value) !== null,
    // "Jumlah Bayaran Keuntungan" ialah bayaran berkala, bukan jumlah ribh.
    acceptLine: line => !/bayaran\s+(?:keuntungan|profit)/i.test(line)
  });
  if (profit) fields.profitAmount = parseMoneyValue(profit.value) || undefined;

  const term = extractField(lines, FIELD_LABELS.paymentTermMonths, {
    validate: value => {
      const match = value.match(/\d{1,2}/);
      const months = match ? Number(match[0]) : 0;
      return months >= 1 && months <= 60;
    }
  });
  if (term) {
    const match = term.value.match(/\d{1,2}/);
    if (match) fields.paymentTermMonths = Number(match[0]);
  }

  const pledge = extractField(lines, FIELD_LABELS.pledgeType);
  const pledgeFromLabel = pledge ? resolvePledgeType(pledge.value) : '';
  const stampedPledgeType = detectStampedPledgeType(String(text || ''), lines);
  if (stampedPledgeType) {
    fields.pledgeType = stampedPledgeType;
    if (stampedPledgeType !== pledgeFromLabel) {
      notes.push(`Jenis pajakan dikesan daripada cop surat: ${stampedPledgeType === 'OL' ? 'OVERLAP (OL)' : stampedPledgeType}.`);
    }
  } else if (pledgeFromLabel) {
    fields.pledgeType = pledgeFromLabel;
  }

  const marginField = extractField(lines, FIELD_LABELS.margin, {
    validate: value => parsePercent(value) !== null
  });
  const margin = marginField ? parsePercent(marginField.value) : null;

  // --- Sandaran: cari terus dalam teks penuh jika carian label+baris gagal ---
  const rawText = String(text || '');
  const moneyAfter = (patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const match = rawText.match(pattern);
      if (match) {
        const value = parseMoneyValue(match[1]);
        if (value !== null && value > 0) return value;
      }
    }
    return undefined;
  };
  const dateAfter = (patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const match = rawText.match(pattern);
      if (match) {
        const value = parseDateValue(match[1]);
        if (value) return value;
      }
    }
    return undefined;
  };
  const MONEY_TAIL = `((?:RM|R\\s?M|RN)?\\s*[\\d${DIGIT_LIKE_CLASS}][\\d${DIGIT_LIKE_CLASS}.,]{2,})`;
  const moneyPattern = (label: string) => new RegExp(`${label}[\\s\\S]{0,60}?${MONEY_TAIL}`, 'i');

  if (fields.marhunValue === undefined) {
    fields.marhunValue = moneyAfter([
      moneyPattern('Nilai\\s*Marhun'),
      moneyPattern('Nilai\\s*Gadaian')
    ]);
  }
  if (fields.financingAmount === undefined) {
    fields.financingAmount = moneyAfter([
      new RegExp(`^\\s*Jumlah\\s*Pembiayaan[\\s\\S]{0,80}?${MONEY_TAIL}`, 'im'),
      moneyPattern('Jumlah\\s*Pembiayaan'),
      moneyPattern('Harga\\s*Belian'),
      moneyPattern('Purchase\\s*Price')
    ]);
  }
  if (fields.sellingPrice === undefined) {
    fields.sellingPrice = moneyAfter([
      new RegExp(`^\\s*Harga\\s*Jualan[\\s\\S]{0,60}?${MONEY_TAIL}`, 'im'),
      moneyPattern('Harga\\s*Jualan'),
      moneyPattern('Sale\\s*Price')
    ]);
  }
  if (fields.profitAmount === undefined) {
    fields.profitAmount = moneyAfter([
      new RegExp(`^\\s*Keuntungan[\\s\\S]{0,40}?${MONEY_TAIL}`, 'im'),
      new RegExp(`^\\s*Profit[\\s\\S]{0,40}?${MONEY_TAIL}`, 'im'),
      // Elak "Jumlah Bayaran Keuntungan setiap 6 bulan" disalah anggap sebagai ribh.
      new RegExp(`(?<!Bayaran\\s{0,2})Keuntungan[\\s\\S]{0,40}?${MONEY_TAIL}`, 'i'),
      new RegExp(`(?<!Bayaran\\s{0,2})Profit[\\s\\S]{0,40}?${MONEY_TAIL}`, 'i')
    ]);
  }
  if (fields.financingDate === undefined) {
    fields.financingDate = dateAfter([
      /Tarikh\s*Gadaian[\s\S]{0,30}?(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
      /Tarikh\s*Pembiayaan[\s\S]{0,30}?(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i
    ]);
  }
  if (fields.maturityDate === undefined) {
    fields.maturityDate = dateAfter([
      /Tarikh\s*Matang[\s\S]{0,30}?(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
      /Tarikh\s*Tamat[\s\S]{0,30}?(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i
    ]);
  }
  if (fields.memberIcNumber === undefined) {
    const icFallback = rawText.match(/No\.?\s*K\.?P\.?[\s\S]{0,20}?(\d{6}[\s-]?\d{2}[\s-]?\d{4})/i)
      || rawText.match(/\b(\d{6}[\s-]?\d{2}[\s-]?\d{4})\b/);
    if (icFallback) fields.memberIcNumber = normalizeIc(icFallback[1]) || undefined;
  }
  if (fields.documentNo === undefined) {
    const docFallback = rawText.match(/\b(\d{2,4}[-/]\d{4,6}[-/]\d{3,4}(?:[-/]\d{1,2})?)\b/)
      || rawText.match(/\b([A-Z]{2,6}[-/]\d{2,4}[-/]\d{3,6})\b/);
    if (docFallback) fields.documentNo = cleanDocumentNo(docFallback[1]) || undefined;
  }

  // --- Penyelarasan jadual: cari tiga nilai a + b = (a+b) ---
  // OCR sering menggeser nilai antara lajur, menyebabkan nilai keuntungan
  // terbaca sebagai jumlah pembiayaan. Tiga nilai yang memenuhi a + b = a+b
  // dikenal pasti tanpa bergantung pada kedudukan label.
  const locateLabelLine = (labels: readonly string[]) => {
    for (let index = 0; index < lines.length; index += 1) {
      const key = normalizeKey(lines[index]);
      if (labels.some(label => {
        const labelKey = normalizeKey(label);
        return labelKey && key.includes(labelKey);
      })) return index;
    }
    return -1;
  };
  const labelLines = [
    locateLabelLine(FIELD_LABELS.financingAmount),
    locateLabelLine(FIELD_LABELS.profitAmount),
    locateLabelLine(FIELD_LABELS.sellingPrice)
  ].filter(index => index >= 0);
  const windowStart = labelLines.length ? Math.max(0, Math.min(...labelLines) - 10) : 0;
  const windowEnd = labelLines.length ? Math.min(lines.length - 1, Math.max(...labelLines) + 30) : lines.length - 1;
  const moneyCandidates: { value: number; lineIndex: number }[] = [];
  const rmPattern = new RegExp(`R[.,]?\\s?[MN]\\s*([\\d${DIGIT_LIKE_CLASS}][\\d${DIGIT_LIKE_CLASS}.,]*)`, 'gi');
  const plainMoneyPattern = /\d{1,3}(?:,\d{3})+\.\d{2}/g;
  for (let index = windowStart; index <= windowEnd; index += 1) {
    const line = lines[index];
    const values: number[] = [];
    let rmMatch: RegExpExecArray | null;
    rmPattern.lastIndex = 0;
    while ((rmMatch = rmPattern.exec(line)) !== null) {
      const value = parseMoneyToken(rmMatch[1]);
      if (value !== null && value >= 1) values.push(value);
    }
    if (!values.length) {
      const plainMatches = line.match(plainMoneyPattern) || [];
      plainMatches.forEach(token => {
        const value = parseMoneyToken(token);
        if (value !== null && value >= 1) values.push(value);
      });
    }
    Array.from(new Set(values)).forEach(value => moneyCandidates.push({ value, lineIndex: index }));
  }
  let triple: { financing: number; profit: number; selling: number; span: number } | null = null;
  for (let left = 0; left < moneyCandidates.length; left += 1) {
    for (let right = left + 1; right < moneyCandidates.length; right += 1) {
      const first = moneyCandidates[left];
      const second = moneyCandidates[right];
      if (Math.abs(first.value - second.value) < 0.015) continue;
      const total = roundMoneyValue(first.value + second.value);
      const totalIndex = moneyCandidates.findIndex((candidate, index) =>
        index !== left && index !== right && Math.abs(candidate.value - total) < 0.02
      );
      if (totalIndex === -1) continue;
      const financing = Math.max(first.value, second.value);
      const profit = Math.min(first.value, second.value);
      // Ribh Ar-Rahnu sentiasa lebih kecil daripada jumlah pembiayaan.
      if (!(financing > 0 && profit > 0 && financing >= profit * 1.05)) continue;
      const third = moneyCandidates[totalIndex];
      const indices = [first.lineIndex, second.lineIndex, third.lineIndex];
      const span = Math.max(...indices) - Math.min(...indices);
      if (!triple || span < triple.span) {
        triple = { financing, profit, selling: third.value, span };
      }
    }
  }
  if (triple) {
    const alreadyConsistent = fields.financingAmount !== undefined &&
      fields.profitAmount !== undefined &&
      fields.sellingPrice !== undefined &&
      Math.abs(fields.financingAmount + fields.profitAmount - fields.sellingPrice) <= 0.02;
    if (!alreadyConsistent) {
      fields.financingAmount = triple.financing;
      fields.profitAmount = triple.profit;
      fields.sellingPrice = triple.selling;
      notes.push('Nilai pembiayaan, keuntungan dan harga jualan diselaraskan daripada jadual surat (a + b = a+b).');
    }
  }

  // --- Terbitan nilai yang tidak tercetak secara jelas ---
  // Pembetulan OCR: keuntungan tidak boleh melebihi pembiayaan, dan nilai yang
  // sama untuk kedua-duanya bermaksud satu baris jadual telah tersalah padan.
  if (fields.financingAmount !== undefined && fields.profitAmount !== undefined) {
    if (fields.financingAmount < fields.profitAmount - 0.01) {
      const swapped = fields.financingAmount;
      fields.financingAmount = fields.profitAmount;
      fields.profitAmount = swapped;
      notes.push('Jumlah pembiayaan dan keuntungan ditukar kerana keuntungan melebihi jumlah pembiayaan.');
    } else if (Math.abs(fields.financingAmount - fields.profitAmount) <= 0.01 &&
      fields.sellingPrice !== undefined && fields.sellingPrice > fields.profitAmount) {
      const derived = roundMoneyValue(fields.sellingPrice - fields.profitAmount);
      if (derived > 0) {
        fields.financingAmount = derived;
        notes.push('Jumlah pembiayaan dibetulkan kepada harga jualan − keuntungan (nilai keuntungan tersalah dibaca sebagai pembiayaan).');
      }
    }
  }
  // Pembetulan selamat: jumlah pembiayaan tidak boleh sama/melebihi harga jualan.
  if (fields.financingAmount !== undefined && fields.sellingPrice !== undefined &&
    fields.financingAmount >= fields.sellingPrice) {
    const corrected = fields.profitAmount !== undefined
      ? roundMoneyValue(fields.sellingPrice - fields.profitAmount)
      : 0;
    if (corrected > 0 && corrected < fields.sellingPrice) {
      fields.financingAmount = corrected;
      notes.push('Jumlah pembiayaan dibetulkan kepada harga jualan − keuntungan (nilai tertera ialah harga jualan).');
    }
  }
  if (fields.financingAmount === undefined && fields.sellingPrice && fields.profitAmount !== undefined) {
    const derived = Math.round((fields.sellingPrice - fields.profitAmount) * 100) / 100;
    if (derived > 0) {
      fields.financingAmount = derived;
      notes.push('Jumlah pembiayaan dikira daripada harga jualan − keuntungan.');
    }
  }
  if (fields.financingAmount === undefined && fields.marhunValue && margin) {
    const derived = Math.round(fields.marhunValue * margin) / 100;
    if (derived > 0) {
      fields.financingAmount = derived;
      notes.push(`Jumlah pembiayaan dikira daripada margin ${margin}% × nilai marhun.`);
    }
  }
  if (fields.sellingPrice === undefined && fields.financingAmount && fields.profitAmount !== undefined) {
    fields.sellingPrice = Math.round((fields.financingAmount + fields.profitAmount) * 100) / 100;
  }
  if (fields.profitAmount === undefined && fields.sellingPrice && fields.financingAmount) {
    const derived = Math.round((fields.sellingPrice - fields.financingAmount) * 100) / 100;
    if (derived >= 0) fields.profitAmount = derived;
  }
  // Tarikh matang/pembiayaan daripada tempoh surat (contoh: Tempoh 18 bulan).
  if (fields.maturityDate === undefined && fields.financingDate && fields.paymentTermMonths) {
    const derived = addMonthsToIsoDate(fields.financingDate, fields.paymentTermMonths);
    if (derived) {
      fields.maturityDate = derived;
      notes.push(`Tarikh matang dikira daripada ${fields.financingDate} + ${fields.paymentTermMonths} bulan.`);
    }
  }
  if (fields.financingDate === undefined && fields.maturityDate && fields.paymentTermMonths) {
    const derived = addMonthsToIsoDate(fields.maturityDate, -fields.paymentTermMonths);
    if (derived) {
      fields.financingDate = derived;
      notes.push(`Tarikh pembiayaan dikira daripada ${fields.maturityDate} − ${fields.paymentTermMonths} bulan.`);
    }
  }

  // --- Jadual tempoh matang → asas upah simpan, kadar (% sebulan) & tebus surat asal ---
  const scheduleRows: { amount: number; cumulative: number }[] = [];
  const scheduleMoneyPattern = new RegExp(`R[.,]?\\s?[MN]\\s*([\\d${DIGIT_LIKE_CLASS}][\\d${DIGIT_LIKE_CLASS}.,]*)`, 'gi');
  const collectScheduleMoney = (source: string) => {
    const values: number[] = [];
    scheduleMoneyPattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = scheduleMoneyPattern.exec(source)) !== null) {
      const value = parseMoneyToken(match[1]);
      if (value !== null && value >= 1) values.push(value);
    }
    return values;
  };
  lines.forEach((line, index) => {
    const isPeriodLine = /tempoh|lanjutan/i.test(line);
    const hasDate = /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(line);
    if (!isPeriodLine && !hasDate) return;
    let values = collectScheduleMoney(line);
    if (!values.length && isPeriodLine) {
      // Nilai lajur jadual mungkin tercetak pada baris berikutnya.
      const nextValues = collectScheduleMoney(lines[index + 1] || '');
      if (nextValues.length >= 2) values = nextValues;
    }
    if (!values.length) return;
    // Baris tanpa label tempoh hanya diterima jika ada tarikh + dua nilai wang
    // (lajur KEUNTUNGAN dan TERKUMPUL).
    if (!isPeriodLine && !(hasDate && values.length >= 2)) return;
    const amount = values[0];
    const cumulative = values[values.length - 1];
    // Elak nilai marhun/pembiayaan tersasar masuk ke jadual tempoh.
    if (fields.marhunValue && (amount >= fields.marhunValue || cumulative >= fields.marhunValue)) return;
    scheduleRows.push({ amount, cumulative: cumulative > 0 ? cumulative : amount });
  });
  let scheduleTotal = scheduleRows.length
    ? Math.max(...scheduleRows.map(row => row.cumulative))
    : 0;
  let scheduleSource = 'jadual tempoh matang';
  // Sandaran hanya jika surat memang mempunyai bahagian jadual tempoh matang.
  const hasScheduleSection = /tempoh\s*(?:matang|lanjutan)|terkumpul/i.test(String(text || ''));
  if (!scheduleTotal && fields.profitAmount !== undefined && hasScheduleSection) {
    scheduleTotal = fields.profitAmount;
    scheduleSource = 'jumlah keuntungan surat (jadual tempoh tidak terbaca)';
  }
  if (scheduleTotal > 0) {
    const months = (fields.financingDate && fields.maturityDate
      ? monthsBetweenIsoDates(fields.financingDate, fields.maturityDate)
      : 0) || fields.paymentTermMonths || scheduleRows.length * 6;
    if (months > 0) {
      fields.scheduleTotal = roundMoneyValue(scheduleTotal);
      fields.scheduleMonths = months;
    }
    if (fields.marhunValue && months > 0) {
      const monthly = scheduleTotal / months;
      const rate = roundMoneyValue((monthly / fields.marhunValue) * 100);
      if (rate > 0 && rate < 100) {
        fields.feeBasis = 'nilaiMarhun';
        fields.feeRate = rate;
        notes.push(
          `Asas upah simpan: Nilai Marhun · kadar ${rate}% sebulan ` +
          `(RM ${formatNumberForNote(scheduleTotal)} ÷ ${months} bulan ÷ marhun RM ${formatNumberForNote(fields.marhunValue)}, sumber: ${scheduleSource}).`
        );
      }
    }
    if (fields.financingAmount !== undefined && fields.pledgeType && fields.pledgeType !== 'Pajakan Asal') {
      const previousRedemption = roundMoneyValue(fields.financingAmount + scheduleTotal);
      if (previousRedemption > 0) {
        fields.previousRedemption = previousRedemption;
        notes.push(`Jumlah tebus surat asal: RM ${formatNumberForNote(previousRedemption)} (pembiayaan + jumlah ${scheduleSource}).`);
      }
    }
  }

  // --- Keterangan Marhun (jadual barang gadaian) ---
  const marhunItems: SagImportMarhunItem[] = [];
  let marhunSectionStart = lines.findIndex(line => /keterangan\s*marhun/i.test(line));
  if (marhunSectionStart === -1) {
    marhunSectionStart = lines.findIndex(line => /marhun/i.test(line) && /karat|berat|kuantiti/i.test(line));
  }
  if (marhunSectionStart >= 0) {
    let marhunSectionEnd = Math.min(lines.length, marhunSectionStart + 30);
    for (let index = marhunSectionStart + 1; index < marhunSectionEnd; index += 1) {
      if (/^\s*jumlah\b/i.test(lines[index]) || /konsep|syarat|peringatan|nota|penyata/i.test(lines[index])) {
        // Sertakan baris JUMLAH untuk semakan jumlah.
        marhunSectionEnd = Math.min(lines.length, index + 1);
        break;
      }
    }
    const sectionLines = lines.slice(marhunSectionStart + 1, marhunSectionEnd);
    const sectionText = sectionLines.join(' ');
    const rowTailPattern = new RegExp(
      `(\\d{1,2})\\s+(\\d{1,2}(?:[.,]\\d+)?)\\s*K\\s+([\\d${DIGIT_LIKE_CLASS}.,]+)\\s+(?:RM\\s*)?([\\d${DIGIT_LIKE_CLASS}.,]+)`,
      'i'
    );
    const buildMarhunItem = (descriptionRaw: string, qtyRaw: unknown, karatRaw: unknown, weightRaw: string, valueRaw: string): SagImportMarhunItem | null => {
      const description = String(descriptionRaw || '')
        .replace(/\s+/g, ' ')
        .trim()
        // Buang kuantiti yang tercicir di hujung keterangan (kes sauh karat).
        .replace(/\s+\d{1,2}$/, '');
      if (!description || description.length < 2) return null;
      if (/^(?:jumlah|bil|marhun|kuantiti|karat|berat|nilai)/i.test(description)) return null;
      const quantity = Math.max(1, Math.min(100, Number(qtyRaw) || 1));
      const karatNumber = Number(String(karatRaw).replace(',', '.'));
      if (!(karatNumber >= 6 && karatNumber <= 24.5)) return null;
      const weight = parseMoneyToken(weightRaw);
      const marhunValue = parseMoneyToken(valueRaw);
      if (!weight || !marhunValue || weight <= 0 || marhunValue <= 0) return null;
      if (weight > 5000 || marhunValue > 50000000) return null;
      const ratePerGram = roundMoneyValue(marhunValue / (quantity * weight));
      if (!(ratePerGram > 0)) return null;
      return {
        description,
        quantity,
        karat: `${karatNumber.toFixed(1)}K`,
        weight: roundMoneyValue(weight),
        marhunValue: roundMoneyValue(marhunValue),
        ratePerGram,
        fineness: resolveKaratFineness(karatNumber)
      };
    };

    // Utamakan baris jadual: setiap baris bermula dengan nombor Bil. Baris
    // sambungan (keterangan/nilai terbungkus) digabung sebelum dihurai.
    let pendingRow = '';
    const flushRow = () => {
      if (!pendingRow) return;
      const tail = pendingRow.match(rowTailPattern);
      if (tail && tail.index !== undefined) {
        const description = pendingRow
          .slice(0, tail.index)
          .replace(/^\s*\d{1,2}[.)]?\s*/, '');
        const item = buildMarhunItem(description, tail[1], tail[2], tail[3], tail[4]);
        if (item) marhunItems.push(item);
      }
      pendingRow = '';
    };
    sectionLines.forEach(line => {
      if (/^\s*jumlah\b/i.test(line)) {
        flushRow();
        return;
      }
      if (/^\s*\d{1,2}[.)]?\s+\S/.test(line)) {
        flushRow();
        pendingRow = line;
        return;
      }
      if (pendingRow) pendingRow = `${pendingRow} ${line}`;
    });
    flushRow();

    const totalsOf = (items: SagImportMarhunItem[]) => ({
      weight: roundMoneyValue(items.reduce((sum, item) => sum + item.quantity * item.weight, 0)),
      value: roundMoneyValue(items.reduce((sum, item) => sum + item.quantity * item.weight * item.ratePerGram, 0))
    });
    const runFallbackRows = (target: SagImportMarhunItem[]) => {
      const fallbackPattern = new RegExp(
        `(\\d{1,2})\\s+([A-Za-z][A-Za-z0-9 ()/'.,&+#\\-]*?)\\s+(\\d{1,2})\\s+(\\d{1,2}(?:[.,]\\d+)?)\\s*K\\s+([\\d${DIGIT_LIKE_CLASS}.,]+)\\s+(?:RM\\s*)?([\\d${DIGIT_LIKE_CLASS}.,]+)`,
        'gi'
      );
      let rowMatch: RegExpExecArray | null;
      while ((rowMatch = fallbackPattern.exec(sectionText)) !== null) {
        const item = buildMarhunItem(rowMatch[2], rowMatch[3], rowMatch[4], rowMatch[5], rowMatch[6]);
        if (item) target.push(item);
      }
      return target;
    };
    const runKaratAnchoredRows = (target: SagImportMarhunItem[]) => {
      // Setiap penanda karat (contoh 18.0K) menjadi sauh satu baris. Strategi ini
      // tidak memerlukan nombor Bil, jadi baris yang hilang "Bil" tetap dibaca.
      const karatPattern = /\b(\d{1,2}(?:[.,]\d+)?)\s*K\b/gi;
      const karatMatches = Array.from(sectionText.matchAll(karatPattern));
      karatMatches.forEach((karatMatch, index) => {
        const karatStart = karatMatch.index ?? 0;
        const previousEnd = index > 0
          ? (karatMatches[index - 1].index ?? 0) + karatMatches[index - 1][0].length
          : 0;
        const before = sectionText.slice(previousEnd, karatStart);
        const after = sectionText.slice(karatStart + karatMatch[0].length);
        const qtyMatches = Array.from(before.matchAll(/\b(\d{1,2})\b/g));
        const qtyMatch = qtyMatches[qtyMatches.length - 1];
        if (!qtyMatch || qtyMatch.index === undefined) return;
        const bilMatches = Array.from(before.matchAll(/\b\d{1,2}\s+(?=[A-Za-z])/g));
        const bilMatch = bilMatches[bilMatches.length - 1];
        let description = bilMatch && bilMatch.index !== undefined && bilMatch.index < qtyMatch.index
          ? before.slice(bilMatch.index)
          : before.slice(0, qtyMatch.index);
        description = description
          .replace(/^\s*\d{1,2}[.)]?\s*/, '')
          .replace(/\s+/g, ' ')
          .trim();
        const tail = after.match(new RegExp(
          `^\\s*(?:RM\\s*)?([\\d${DIGIT_LIKE_CLASS}][\\d${DIGIT_LIKE_CLASS}.,]*)\\s+(?:RM\\s*)?([\\d${DIGIT_LIKE_CLASS}][\\d${DIGIT_LIKE_CLASS}.,]*)`
        ));
        if (!tail) return;
        const item = buildMarhunItem(description, qtyMatch[1], karatMatch[1], tail[1], tail[2]);
        if (item) target.push(item);
      });
      return target;
    };
    // Sandaran: sesetengah OCR mencetak seluruh jadual dalam satu baris.
    if (!marhunItems.length) runFallbackRows(marhunItems);
    if (!marhunItems.length) runKaratAnchoredRows(marhunItems);

    // Semakan jumlah item terhadap baris JUMLAH surat. Jika tidak sepadan,
    // cuba strategi lain dan pilih set yang paling hampir dengan JUMLAH.
    const jumlahLine = sectionLines.find(line => /^\s*jumlah\b/i.test(line));
    if (jumlahLine) {
      const jumlahValues = (jumlahLine.replace(/^\s*jumlah\b/i, '').match(/[\d.,]+/g) || [])
        .map(token => parseMoneyToken(token))
        .filter((value): value is number => value !== null && value > 0);
      if (jumlahValues.length >= 2) {
        const expectedWeight = Math.min(jumlahValues[0], jumlahValues[1]);
        const expectedValue = Math.max(jumlahValues[0], jumlahValues[1]);
        const toleranceWeight = Math.max(0.2, expectedWeight * 0.03);
        const toleranceValue = Math.max(1, expectedValue * 0.02);
        const errorOf = (totals: { weight: number; value: number }) =>
          Math.abs(totals.weight - expectedWeight) + Math.abs(totals.value - expectedValue);
        const matchesJumlah = (totals: { weight: number; value: number }) =>
          Math.abs(totals.weight - expectedWeight) <= toleranceWeight &&
          Math.abs(totals.value - expectedValue) <= toleranceValue;

        let totals = totalsOf(marhunItems);
        if (!matchesJumlah(totals)) {
          const candidates = [runKaratAnchoredRows([]), runFallbackRows([])];
          for (const candidate of candidates) {
            if (!candidate.length) continue;
            const candidateTotals = totalsOf(candidate);
            if (matchesJumlah(candidateTotals) || errorOf(candidateTotals) < errorOf(totals)) {
              marhunItems.length = 0;
              marhunItems.push(...candidate);
              totals = candidateTotals;
              if (matchesJumlah(totals)) break;
            }
          }
        }
        if (!matchesJumlah(totals)) {
          notes.push(
            `Jadual marhun (${marhunItems.length} item, ${formatNumberForNote(totals.weight)} g / RM ${formatNumberForNote(totals.value)}) ` +
            `tidak sepadan dengan JUMLAH surat (${formatNumberForNote(expectedWeight)} g / RM ${formatNumberForNote(expectedValue)}); semak item.`
          );
        }
      }
    } else {
      // Tanpa baris JUMLAH, gunakan set item terbanyak supaya baris yang
      // kehilangan nombor Bil tidak tercicir.
      const anchoredItems = runKaratAnchoredRows([]);
      if (anchoredItems.length > marhunItems.length) {
        marhunItems.length = 0;
        marhunItems.push(...anchoredItems);
      }
    }
  }
  if (marhunItems.length) {
    fields.marhunItems = marhunItems;
    const totalWeight = marhunItems.reduce((sum, item) => sum + item.quantity * item.weight, 0);
    notes.push(`Keterangan marhun: ${marhunItems.length} item (${formatNumberForNote(totalWeight)} g) dipetakan ke surat.`);
  }

  const matchedLabels = FIELD_WEIGHTS
    .filter(entry => {
      const value = fields[entry.key];
      return value !== undefined && value !== '' && value !== null;
    })
    .map(entry => entry.label);
  if (fields.accountNo) matchedLabels.push('No. akaun institusi');
  if (fields.poBox) matchedLabels.push('No. kotak marhun');
  if (fields.commodityCertificateNo) matchedLabels.push('No. sijil komoditi');
  if (fields.profitPaymentAmount !== undefined) matchedLabels.push('Bayaran keuntungan berkala');
  const confidence = Math.min(1, FIELD_WEIGHTS
    .filter(entry => {
      const value = fields[entry.key];
      return value !== undefined && value !== '' && value !== null;
    })
    .reduce((total, entry) => total + entry.weight, 0));

  return { fields, confidence, matchedLabels, notes };
};
