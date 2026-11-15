/**
 * Enjin penilaian emas (Marhun) dan kawalan LTV.
 *
 * Semua fungsi di sini adalah tulen (pure) supaya borang, lejar, surat dan ujian
 * menggunakan formula yang sama.
 *
 * Model penilaian:
 *   berat bersih  = berat kasar − potongan (batu / patri / komponen bukan emas)
 *   berat emas tulen (fine weight) = berat bersih × ketulenan (fineness)
 *   nilai marhun  = berat emas tulen × kadar taksiran per gram emas tulen
 *
 * Kadar `marhunRate` institusi diterbitkan daripada harga spot emas tulen
 * (spot + spread), jadi ketulenan WAJIB didarabkan. Tanpa pendaraban ini,
 * barang 916/875/750 dinilai lebih tinggi daripada kandungan emas sebenar.
 */

import { roundMoney } from './money';

export type GoldValuationMethod = 'purityAdjusted' | 'legacyPerGram';

/** Faktor ketulenan (fineness) bagi setiap mutu yang diterima sistem. */
export const GOLD_FINENESS_BY_PURITY: Record<string, number> = {
  '999.9': 0.9999,
  '999': 0.999,
  '950': 0.95,
  '916': 0.916,
  '875': 0.875,
  '833': 0.833,
  '750': 0.75,
  '585': 0.585,
  '375': 0.375
};

export const GOLD_PURITY_MIXED = 'Campuran / Lain-lain';

/** Had LTV sistem (tidak boleh dilangkau walaupun institusi menetapkan lebih tinggi). */
export const GOLD_LTV_HARD_CAP_PERCENT = 80;
/** Had LTV minimum yang munasabah untuk mengelakkan rekod tersilap (0%). */
export const GOLD_LTV_MIN_PERCENT = 1;

/** Had pendedahan pembiayaan terkumpul bagi seorang pelanggan (RM). */
export const SINGLE_CUSTOMER_EXPOSURE_LIMIT_MYR = 50000;
/** Had pendedahan pembiayaan harian bagi seorang pelanggan (RM). */
export const SINGLE_CUSTOMER_DAILY_LIMIT_MYR = 25000;

export const normalizeGoldPurity = (purity: unknown): string => String(purity ?? '').trim();

/** Faktor ketulenan; `null` jika mutu tidak diketahui. */
export const resolveGoldFineness = (purity: unknown): number | null => {
  const key = normalizeGoldPurity(purity);
  if (!key) return null;
  const direct = GOLD_FINENESS_BY_PURITY[key];
  if (typeof direct === 'number') return direct;
  // Terima bentuk "916 (22K)" atau "22.0K".
  const numeric = parseFloat(key.replace(/[^\d.]/g, ''));
  if (Number.isFinite(numeric)) {
    if (numeric > 0 && numeric <= 1) return numeric;
    if (numeric > 1 && numeric <= 1000) return numeric / 1000;
  }
  return null;
};

export const isKnownGoldPurity = (purity: unknown): boolean => resolveGoldFineness(purity) !== null;

const round2 = (value: unknown): number => roundMoney(value);
const round4 = (value: unknown): number => Number((Number(value) || 0).toFixed(4));

export type GoldValuationItem = {
  /** Berat kasar item (gram). */
  weight: unknown;
  purity: unknown;
  /** Potongan berat bukan emas bagi item ini (gram). */
  deductionWeight?: unknown;
};

export type MarhunValuation = {
  method: GoldValuationMethod;
  grossWeight: number;
  deductionWeight: number;
  /** Berat bersih selepas potongan (gram). */
  netWeight: number;
  /** Purata faktor ketulenan berwajaran (0–1). */
  fineness: number;
  /** Berat emas tulen (gram). */
  fineWeight: number;
  ratePerGram: number;
  marhunValue: number;
  violations: string[];
};

/**
 * Kira nilai marhun daripada berat, ketulenan dan potongan berat.
 * `items` (jika diberi) digunakan untuk nilai berbilang aset dengan mutu berbeza.
 */
export const calculateMarhunValuation = ({
  grossWeight,
  deductionWeight = 0,
  purity,
  ratePerGram,
  method = 'purityAdjusted',
  items
}: {
  grossWeight: unknown;
  deductionWeight?: unknown;
  purity?: unknown;
  ratePerGram: unknown;
  method?: GoldValuationMethod;
  items?: GoldValuationItem[] | null;
}): MarhunValuation => {
  const violations: string[] = [];
  const rate = Math.max(0, Number(ratePerGram) || 0);
  const useItems = Array.isArray(items) && items.length > 0;

  let gross = Math.max(0, Number(grossWeight) || 0);
  let deduction = Math.max(0, Number(deductionWeight) || 0);
  let fineWeight = 0;
  let netWeight = 0;
  let fineness = 0;

  if (useItems) {
    gross = 0;
    deduction = 0;
    (items as GoldValuationItem[]).forEach((item, index) => {
      const itemGross = Math.max(0, Number(item?.weight) || 0);
      const itemDeduction = Math.max(0, Number(item?.deductionWeight) || 0);
      const itemNet = Math.max(0, itemGross - itemDeduction);
      const itemFineness = resolveGoldFineness(item?.purity);
      gross += itemGross;
      deduction += itemDeduction;
      netWeight += itemNet;
      if (itemFineness === null) {
        violations.push(
          `Aset #${index + 1}: ketulenan "${normalizeGoldPurity(item?.purity) || 'kosong'}" tidak dikenali, jadi nilai emas tulen tidak dapat dikira.`
        );
        return;
      }
      fineWeight += itemNet * itemFineness;
    });
    fineness = netWeight > 0 ? fineWeight / netWeight : 0;
  } else {
    netWeight = Math.max(0, gross - deduction);
    const resolvedFineness = resolveGoldFineness(purity);
    if (method === 'purityAdjusted') {
      if (resolvedFineness === null) {
        violations.push(
          `Ketulenan "${normalizeGoldPurity(purity) || 'kosong'}" tidak dikenali. Pilih mutu 999.9 / 999 / 950 / 916 / 875 / 833 / 750.`
        );
      } else {
        fineness = resolvedFineness;
        fineWeight = netWeight * resolvedFineness;
      }
    } else {
      // Rekod warisan: nilai lama dikira berat × kadar (tanpa pelarasan ketulenan),
      // tetapi ketulenan masih disimpan untuk audit.
      fineness = resolvedFineness ?? 0;
      fineWeight = resolvedFineness === null ? netWeight : netWeight * resolvedFineness;
    }
  }

  if (gross <= 0) violations.push('Berat kasar emas mesti melebihi 0 gram.');
  if (deduction < 0) violations.push('Potongan berat tidak boleh negatif.');
  if (gross > 0 && deduction >= gross) {
    violations.push('Potongan berat (batu/patri) mesti kurang daripada berat kasar.');
  }
  if (rate <= 0) violations.push('Kadar taksiran (RM/g) mesti melebihi RM 0.00.');

  // Mod warisan mengekalkan formula berat bersih × kadar (tanpa pelarasan ketulenan).
  const valuedWeight = method === 'purityAdjusted' ? fineWeight : netWeight;
  const marhunValue = round2(valuedWeight * rate);

  return {
    method,
    grossWeight: round2(gross),
    deductionWeight: round2(deduction),
    netWeight: round2(netWeight),
    fineness: round4(fineness),
    fineWeight: round4(fineWeight),
    ratePerGram: round2(rate),
    marhunValue,
    violations
  };
};

export type LtvEvaluation = {
  ltvPercent: number;
  /** Had berkesan = min(had institusi, had sistem). */
  effectiveCapPercent: number;
  institutionCapPercent: number;
  hardCapPercent: number;
  headroom: number;
  compliant: boolean;
  violations: string[];
};

/** Semak LTV (pembiayaan ÷ nilai marhun) terhadap had institusi dan had sistem. */
export const evaluateLtv = ({
  marhunValue,
  loan,
  margin,
  institutionCapPercent
}: {
  marhunValue: unknown;
  loan: unknown;
  margin?: unknown;
  institutionCapPercent: unknown;
}): LtvEvaluation => {
  const violations: string[] = [];
  const value = Math.max(0, Number(marhunValue) || 0);
  const financing = Math.max(0, Number(loan) || 0);
  const institutionCap = Math.min(100, Math.max(0, Number(institutionCapPercent) || 0));
  const effectiveCap = Math.min(institutionCap || GOLD_LTV_HARD_CAP_PERCENT, GOLD_LTV_HARD_CAP_PERCENT);
  const ltvPercent = value > 0 ? round2((financing / value) * 100) : 0;
  const declaredMargin = Number(margin);

  if (value <= 0) violations.push('Nilai marhun mesti melebihi RM 0.00 sebelum pembiayaan boleh disahkan.');
  if (financing <= 0) violations.push('Jumlah pembiayaan mesti melebihi RM 0.00.');
  if (value > 0 && financing > 0) {
    if (ltvPercent > effectiveCap + 0.005) {
      violations.push(
        `LTV ${ltvPercent.toFixed(2)}% melebihi had ${effectiveCap.toFixed(0)}% (institusi ${institutionCap.toFixed(0)}%, had sistem ${GOLD_LTV_HARD_CAP_PERCENT}%).`
      );
    }
    if (ltvPercent > GOLD_LTV_HARD_CAP_PERCENT + 0.005) {
      violations.push(`LTV melebihi had mutlak sistem ${GOLD_LTV_HARD_CAP_PERCENT}%.`);
    }
    if (ltvPercent < GOLD_LTV_MIN_PERCENT) {
      violations.push(`LTV ${ltvPercent.toFixed(2)}% terlalu rendah; sahkan semula jumlah pembiayaan.`);
    }
  }
  if (Number.isFinite(declaredMargin) && declaredMargin > 0 && value > 0 &&
      Math.abs(declaredMargin - ltvPercent) > 0.5) {
    violations.push(
      `Kadar pembiayaan ${round2(declaredMargin).toFixed(2)}% tidak sepadan dengan LTV sebenar ${ltvPercent.toFixed(2)}%.`
    );
  }

  return {
    ltvPercent,
    effectiveCapPercent: round2(effectiveCap),
    institutionCapPercent: round2(institutionCap),
    hardCapPercent: GOLD_LTV_HARD_CAP_PERCENT,
    headroom: round2(Math.max(0, value * (effectiveCap / 100) - financing)),
    compliant: violations.length === 0,
    violations
  };
};
