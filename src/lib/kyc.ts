/**
 * Semakan KYC / AML asas untuk transaksi Ar-Rahnu.
 *
 * Tiada medan tarikh lahir dalam sistem, jadi umur diterbitkan daripada
 * 12 digit No. Kad Pengenalan Malaysia (YYMMDD di hadapan).
 */

export const MINIMUM_CUSTOMER_AGE = 18;
export const MAXIMUM_REASONABLE_AGE = 100;

export type MalaysianIcParse = {
  valid: boolean;
  digits: string;
  birthDate: string;
  age: number | null;
  violations: string[];
};

const pad2 = (value: number) => String(value).padStart(2, '0');

const toIsoDate = (year: number, month: number, day: number): string =>
  `${year}-${pad2(month)}-${pad2(day)}`;

/** Umur penuh pada tarikh rujukan (tahun/bulan/hari). */
export const calculateAge = (birthDate: string, referenceDate: Date): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  let age = referenceDate.getFullYear() - year;
  const beforeBirthday =
    referenceDate.getMonth() + 1 < month ||
    (referenceDate.getMonth() + 1 === month && referenceDate.getDate() < day);
  if (beforeBirthday) age -= 1;
  return Number.isFinite(age) ? age : null;
};

/**
 * Hurai No. Kad Pengenalan Malaysia (contoh: 900101015555).
 * Tahun abad ditentukan dengan membandingkan 2 digit tahun dengan tahun semasa.
 */
export const parseMalaysianIc = (
  icNumber: unknown,
  referenceDate: Date = new Date()
): MalaysianIcParse => {
  const digits = String(icNumber ?? '').replace(/\D/g, '');
  const violations: string[] = [];
  if (!digits) {
    return { valid: false, digits: '', birthDate: '', age: null, violations: ['No. Kad Pengenalan tiada.'] };
  }
  if (digits.length !== 12) {
    return {
      valid: false,
      digits,
      birthDate: '',
      age: null,
      violations: ['No. Kad Pengenalan mesti tepat 12 digit.']
    };
  }

  const yearTwoDigits = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));
  const currentYear = referenceDate.getFullYear();
  const currentYearTwoDigits = currentYear % 100;
  const century = yearTwoDigits <= currentYearTwoDigits ? 2000 : 1900;
  const year = century + yearTwoDigits;

  if (month < 1 || month > 12) violations.push('Bulan dalam No. Kad Pengenalan tidak sah.');
  if (day < 1 || day > 31) violations.push('Hari dalam No. Kad Pengenalan tidak sah.');
  if (violations.length === 0) {
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (
      candidate.getUTCFullYear() !== year ||
      candidate.getUTCMonth() !== month - 1 ||
      candidate.getUTCDate() !== day
    ) {
      violations.push('Tarikh lahir dalam No. Kad Pengenalan tidak wujud.');
    }
  }

  const birthDate = violations.length === 0 ? toIsoDate(year, month, day) : '';
  const age = birthDate ? calculateAge(birthDate, referenceDate) : null;
  if (age !== null && age < 0) violations.push('Tarikh lahir berada pada masa hadapan.');
  if (age !== null && age > MAXIMUM_REASONABLE_AGE) violations.push('Umur melebihi had munasabah; semak No. Kad Pengenalan.');

  return {
    valid: violations.length === 0,
    digits,
    birthDate,
    age,
    violations
  };
};

export type CustomerKycInput = {
  name?: unknown;
  icNumber?: unknown;
  phone?: unknown;
  address?: unknown;
  /** Akaun ahli berdaftar (auth.users.id) jika pelanggan ialah ahli sistem. */
  memberUserId?: unknown;
  referenceDate?: Date;
};

export type CustomerKycResult = {
  compliant: boolean;
  age: number | null;
  birthDate: string;
  identityVerified: boolean;
  violations: string[];
  warnings: string[];
};

/**
 * Semakan KYC/AML asas sebelum transaksi disimpan:
 * - identiti (nama + No. KP 12 digit yang sah)
 * - umur minimum 18 tahun (AML: perlindungan kanak-kanak)
 * - maklumat hubungan untuk pengesahan
 */
export const evaluateCustomerKyc = ({
  name,
  icNumber,
  phone,
  address,
  memberUserId,
  referenceDate = new Date()
}: CustomerKycInput): CustomerKycResult => {
  const violations: string[] = [];
  const warnings: string[] = [];
  const parsed = parseMalaysianIc(icNumber, referenceDate);

  if (!String(name || '').trim()) violations.push('Nama pelanggan wajib diisi untuk pengesahan identiti (KYC).');
  parsed.violations.forEach(violation => violations.push(violation));

  if (parsed.age !== null) {
    if (parsed.age < MINIMUM_CUSTOMER_AGE) {
      violations.push(
        `Pelanggan berumur ${parsed.age} tahun. Transaksi Ar-Rahnu hanya dibenarkan untuk umur ${MINIMUM_CUSTOMER_AGE} tahun ke atas (KYC/AML).`
      );
    } else if (parsed.age < 21) {
      warnings.push(`Pelanggan berumur ${parsed.age} tahun (bawah 21); rekodkan persetujuan penjaga jika polisi memerlukan.`);
    }
  }

  if (!String(phone || '').trim()) warnings.push('No. telefon pelanggan tiada — pengesahan identiti tambahan disyorkan.');
  if (!String(address || '').trim()) warnings.push('Alamat pelanggan tiada — rekod KYC tidak lengkap.');
  if (!String(memberUserId || '').trim()) {
    warnings.push('Pelanggan tidak dipautkan kepada akaun ahli berdaftar; identiti belum disahkan secara digital.');
  }

  return {
    compliant: violations.length === 0,
    age: parsed.age,
    birthDate: parsed.birthDate,
    identityVerified: parsed.valid && Boolean(String(name || '').trim()),
    violations,
    warnings
  };
};
