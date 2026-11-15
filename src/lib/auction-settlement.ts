import { fromCents, roundMoney, toCents } from './money';

/**
 * Penyelesaian hasil lelongan (auction settlement).
 *
 * Turutan rasmi penolakan hasil lelong:
 *   1. Kos lelongan / guaman
 *   2. Ujrah (upah simpan) tertunggak
 *   3. Baki pokok pembiayaan
 *
 * Sebarang baki selepas tiga perkara di atas ialah LEBIHAN milik penggadai
 * (liabiliti syarikat kepadanya) — BUKAN keuntungan syarikat.
 * Kekurangan pula ialah AKAUN BELUM TERIMA (A/R) pelanggan.
 *
 * Semua pengiraan dibuat dalam sen (integer) supaya tiada ralat floating point.
 */

export type AuctionSettlementBreakdownItem = {
  code: 'auctionCost' | 'ujrahArrears' | 'principal';
  label: string;
  due: number;
  paid: number;
  unpaid: number;
};

export type AuctionSettlement = {
  /** Hasil lelong kasar yang diterima. */
  proceeds: number;
  auctionCosts: number;
  ujrahArrears: number;
  principal: number;
  /** Jumlah yang ditolak mengikut turutan rasmi. */
  auctionCostsPaid: number;
  ujrahPaid: number;
  principalPaid: number;
  /** Baki yang tidak dapat dijelaskan oleh hasil lelong. */
  auctionCostsUnpaid: number;
  ujrahUnpaid: number;
  principalUnpaid: number;
  /** Lebihan milik penggadai (liabiliti, bukan keuntungan). */
  surplus: number;
  /** Kekurangan yang menjadi hutang pelanggan (A/R). */
  deficit: number;
  /** Petunjuk semantik untuk paparan/akauntansi. */
  liabilityToPledgor: number;
  receivableFromPledgor: number;
  settled: boolean;
  violations: string[];
  breakdown: AuctionSettlementBreakdownItem[];
};

const toAmount = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

export const calculateAuctionSettlement = ({
  proceeds,
  auctionCosts = 0,
  ujrahArrears = 0,
  principal = 0
}: {
  proceeds: unknown;
  auctionCosts?: unknown;
  ujrahArrears?: unknown;
  principal?: unknown;
}): AuctionSettlement => {
  const violations: string[] = [];
  const rawProceeds = Number(proceeds);
  const rawCosts = Number(auctionCosts);
  const rawUjrah = Number(ujrahArrears);
  const rawPrincipal = Number(principal);

  if (!Number.isFinite(rawProceeds) || rawProceeds <= 0) {
    violations.push('Hasil lelong mesti melebihi RM 0.00.');
  }
  if (!Number.isFinite(rawCosts) || rawCosts < 0) {
    violations.push('Kos lelongan/guaman tidak boleh negatif.');
  }
  if (!Number.isFinite(rawUjrah) || rawUjrah < 0) {
    violations.push('Ujrah tertunggak tidak boleh negatif.');
  }
  if (!Number.isFinite(rawPrincipal) || rawPrincipal < 0) {
    violations.push('Baki pokok pembiayaan tidak boleh negatif.');
  }

  const proceedsAmount = toAmount(rawProceeds);
  const costsAmount = toAmount(rawCosts);
  const ujrahAmount = toAmount(rawUjrah);
  const principalAmount = toAmount(rawPrincipal);

  let remaining = toCents(proceedsAmount);
  const costsCents = Math.max(0, toCents(costsAmount));
  const ujrahCents = Math.max(0, toCents(ujrahAmount));
  const principalCents = Math.max(0, toCents(principalAmount));

  // Turutan rasmi: kos → ujrah → pokok.
  const costsPaidCents = Math.min(remaining, costsCents);
  remaining -= costsPaidCents;
  const ujrahPaidCents = Math.min(remaining, ujrahCents);
  remaining -= ujrahPaidCents;
  const principalPaidCents = Math.min(remaining, principalCents);
  remaining -= principalPaidCents;

  const costsUnpaidCents = costsCents - costsPaidCents;
  const ujrahUnpaidCents = ujrahCents - ujrahPaidCents;
  const principalUnpaidCents = principalCents - principalPaidCents;
  const surplusCents = Math.max(0, remaining);
  const deficitCents = costsUnpaidCents + ujrahUnpaidCents + principalUnpaidCents;

  const breakdown: AuctionSettlementBreakdownItem[] = [
    {
      code: 'auctionCost',
      label: 'Kos lelongan / guaman',
      due: fromCents(costsCents),
      paid: fromCents(costsPaidCents),
      unpaid: fromCents(costsUnpaidCents)
    },
    {
      code: 'ujrahArrears',
      label: 'Ujrah (upah simpan) tertunggak',
      due: fromCents(ujrahCents),
      paid: fromCents(ujrahPaidCents),
      unpaid: fromCents(ujrahUnpaidCents)
    },
    {
      code: 'principal',
      label: 'Baki pokok pembiayaan',
      due: fromCents(principalCents),
      paid: fromCents(principalPaidCents),
      unpaid: fromCents(principalUnpaidCents)
    }
  ];

  return {
    proceeds: roundMoney(proceedsAmount),
    auctionCosts: roundMoney(costsAmount),
    ujrahArrears: roundMoney(ujrahAmount),
    principal: roundMoney(principalAmount),
    auctionCostsPaid: fromCents(costsPaidCents),
    ujrahPaid: fromCents(ujrahPaidCents),
    principalPaid: fromCents(principalPaidCents),
    auctionCostsUnpaid: fromCents(costsUnpaidCents),
    ujrahUnpaid: fromCents(ujrahUnpaidCents),
    principalUnpaid: fromCents(principalUnpaidCents),
    surplus: fromCents(surplusCents),
    deficit: fromCents(deficitCents),
    liabilityToPledgor: fromCents(surplusCents),
    receivableFromPledgor: fromCents(deficitCents),
    settled: deficitCents === 0,
    violations,
    breakdown
  };
};

/** Ringkasan A/R pelanggan daripada semua penyelesaian lelong (kekurangan). */
export const summarizeAuctionReceivables = (settlements: Array<Partial<AuctionSettlement> | null | undefined>) => {
  const totalReceivableCents = settlements.reduce(
    (total, settlement) => total + Math.max(0, toCents(settlement?.deficit)),
    0
  );
  const totalLiabilityCents = settlements.reduce(
    (total, settlement) => total + Math.max(0, toCents(settlement?.surplus)),
    0
  );
  return {
    receivable: fromCents(totalReceivableCents),
    payableToPledgors: fromCents(totalLiabilityCents),
    count: settlements.filter(Boolean).length
  };
};
