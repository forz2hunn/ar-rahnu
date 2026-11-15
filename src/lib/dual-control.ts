/**
 * Kawalan dwi-custody (two-man rule) untuk operasi kebal/inventori.
 *
 * Peraturan: operasi kritikal mesti diminta oleh seorang pegawai dan
 * diluluskan oleh pegawai KEDUA yang berbeza. Pelulus tidak boleh sama
 * dengan pemohon.
 */

export type CustodyAction = 'asset_release' | 'asset_status_change' | 'auction_settlement';

export const CUSTODY_ACTION_LABELS: Record<CustodyAction, string> = {
  asset_release: 'Pelepasan / pengeluaran aset dari kebal',
  asset_status_change: 'Perubahan status aset dalam kebal',
  auction_settlement: 'Penyelesaian lelongan (aset keluar)'
};

export type CustodyApproval = {
  action: CustodyAction;
  requestedBy: string;
  requestedByName: string;
  approvedBy: string;
  approvedByName: string;
  approvedAt: string;
  reference: string;
};

export type CustodyEvaluation = {
  compliant: boolean;
  violations: string[];
  approval: CustodyApproval | null;
};

/**
 * Nilai sama ada kelulusan dwi-kawalan lengkap.
 * `requestedBy` ialah pengguna yang sedang merekod tindakan.
 */
export const evaluateDualCustody = ({
  action,
  requestedBy,
  requestedByName = '',
  approvedBy,
  approvedByName,
  reference = '',
  referenceRequired = false,
  approvedAt = new Date().toISOString()
}: {
  action: CustodyAction;
  requestedBy: unknown;
  requestedByName?: unknown;
  approvedBy: unknown;
  approvedByName?: unknown;
  reference?: unknown;
  referenceRequired?: boolean;
  approvedAt?: string;
}): CustodyEvaluation => {
  const violations: string[] = [];
  const requesterId = String(requestedBy ?? '').trim();
  const approverId = String(approvedBy ?? '').trim();
  const approverName = String(approvedByName ?? '').trim();
  const approvalReference = String(reference ?? '').trim();

  if (!requesterId) {
    violations.push('Pemohon tidak dikenali; sesi pengguna diperlukan untuk kawalan dwi-custody.');
  }
  if (!approverId) {
    violations.push('ID pegawai pelulus kedua (dwi-kawalan) wajib diisi.');
  }
  if (!approverName) {
    violations.push('Nama pegawai pelulus kedua wajib diisi.');
  }
  if (requesterId && approverId && requesterId === approverId) {
    violations.push('Pelulus kedua mesti pegawai yang BERBEZA daripada pemohon (two-man rule).');
  }
  if (referenceRequired && !approvalReference) {
    violations.push('Rujukan kelulusan / dokumen sokongan wajib untuk tindakan ini.');
  }

  return {
    compliant: violations.length === 0,
    violations,
    approval: violations.length === 0
      ? {
          action,
          requestedBy: requesterId,
          requestedByName: String(requestedByName ?? '').trim(),
          approvedBy: approverId,
          approvedByName: approverName,
          approvedAt,
          reference: approvalReference
        }
      : null
  };
};

/** Adakah perubahan status aset memerlukan dwi-kawalan? */
export const requiresCustodyApproval = ({
  previousStatus,
  nextStatus
}: {
  previousStatus?: string | null;
  nextStatus?: string | null;
}): boolean => {
  const previous = String(previousStatus || '');
  const next = String(nextStatus || '');
  if (previous === next) return false;
  // Aset keluar dari kebal (EDR) atau keluar dari senarai lelong.
  if (previous === 'Dalam Ar-Rahnu' || previous === 'Dilelong') return true;
  if (next === 'Dilelong' || next === 'Ditebus') return true;
  return false;
};
