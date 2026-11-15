/**
 * Utiliti wang (RM) yang tepat untuk mengelakkan ralat floating point.
 *
 * Semua pengiraan kewangan sistem menggunakan pembundaran "separuh jauh
 * daripada sifar" pada 2 tempat perpuluhan. `Number.prototype.toFixed`
 * TIDAK digunakan kerana ia boleh tersilap bundar akibat perwakilan binari
 * (contoh: (1.005).toFixed(2) => "1.00" dan (2.675).toFixed(2) => "2.67").
 */

const MONEY_DECIMALS = 2;

/** Bundarkan nombor kepada sen (integer) tanpa ralat perwakilan binari. */
export const toCents = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric === 0) return 0;
  const absolute = Math.abs(numeric);
  // Had selamat: nilai kewangan praktikal jauh di bawah 1e15.
  if (absolute >= 1e15) return Math.round(numeric * 100) || 0;
  // toPrecision(15) membuang "noise" binari (cth 0.1 + 0.2).
  const precise = Number(absolute.toPrecision(15));
  const [mantissa, exponentPart] = precise.toString().split('e');
  const exponent = Number(exponentPart) || 0;
  const shifted = Number(`${mantissa}e${exponent + MONEY_DECIMALS}`);
  const rounded = Math.round(shifted);
  if (!Number.isFinite(rounded)) return Math.round(numeric * 100) || 0;
  // `rounded` ialah nilai dalam SEN (integer).
  return numeric < 0 ? -rounded : rounded;
};

/** Tukar sen (integer) kembali kepada RM. */
export const fromCents = (cents: unknown): number => {
  const numeric = Number(cents);
  if (!Number.isFinite(numeric)) return 0;
  return Number((Math.round(numeric) / 100).toFixed(MONEY_DECIMALS));
};

/** Bundarkan nilai RM kepada 2 tempat perpuluhan dengan tepat. */
export const roundMoney = (value: unknown): number => {
  const cents = toCents(value);
  return cents === 0 ? 0 : fromCents(cents);
};

/** Jumlahkan nilai wang dengan tepat (dalam sen). */
export const sumMoney = (values: unknown[]): number =>
  fromCents(values.reduce<number>((total, value) => total + toCents(value), 0));

/** Tambah dua atau lebih nilai wang dengan tepat. */
export const addMoney = (...values: unknown[]): number => sumMoney(values);

/** Tolak nilai wang (a − b) dengan tepat. */
export const subtractMoney = (left: unknown, right: unknown): number =>
  fromCents(toCents(left) - toCents(right));

/** Darab nilai wang dengan faktor (contoh kadar peratus) dan bundarkan sekali. */
export const multiplyMoney = (amount: unknown, factor: unknown): number => {
  const numericAmount = Number(amount) || 0;
  const numericFactor = Number(factor) || 0;
  if (!Number.isFinite(numericAmount) || !Number.isFinite(numericFactor)) return 0;
  if (numericAmount === 0 || numericFactor === 0) return 0;
  // Lakukan pendaraban dalam sen apabila faktor integer kecil untuk ketepatan.
  return roundMoney(numericAmount * numericFactor);
};

/**
 * Agihkan jumlah wang kepada beberapa bahagian mengikut nisbah berat,
 * tanpa kehilangan sen (largest remainder method). Jumlah bahagian
 * sentiasa sama tepat dengan `total`.
 */
export const allocateMoney = (total: unknown, weights: number[]): number[] => {
  const totalCents = toCents(total);
  const safeWeights = weights.map(weight => Math.max(0, Number(weight) || 0));
  const weightSum = safeWeights.reduce((sum, weight) => sum + weight, 0);
  if (totalCents === 0 || weightSum === 0 || safeWeights.length === 0) {
    return safeWeights.map(() => 0);
  }
  const rawShares = safeWeights.map(weight => (totalCents * weight) / weightSum);
  const floors = rawShares.map(share => Math.floor(share));
  let remainder = totalCents - floors.reduce((sum, share) => sum + share, 0);
  const order = rawShares
    .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index);
  const shares = [...floors];
  for (let pointer = 0; pointer < order.length && remainder > 0; pointer += 1) {
    shares[order[pointer].index] += 1;
    remainder -= 1;
  }
  // Baki (jika ada disebabkan pembundaran) diberi kepada bahagian pertama.
  if (remainder !== 0) shares[0] += remainder;
  return shares.map(fromCents);
};
