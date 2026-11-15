import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  BadgePercent,
  Coins,
  FileText,
  Gavel,
  Layers,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  Settings2,
  Trash2,
  Wallet,
  X
} from 'lucide-react';
import {
  SAG_PLEDGE_TYPES,
  SAG_STATUS_OPTIONS,
  formatSagDate,
  formatSagMoney,
  getSagDocumentStatusMeta,
  getSagPledgeTypeTone,
  summarizeSagDocuments,
  type SagDocument,
  type SagLetterhead,
  type SagModuleSettings
} from './sagDocuments';

const PAGE_SIZE = 10;

/** Tindakan susulan lejar yang boleh dimulakan terus daripada surat. */
export type SagCorrectionAction = 'TS' | 'TKS' | 'US' | 'Lelong';

/** Ringkasan penunjuk AI/analitik lejar untuk dipaparkan bersama surat. */
export type SagLetterIndicator = {
  presumption?: string;
  readinessScore?: number | null;
  prediction?: string | null;
};

const inputClass =
  'w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500';
const labelClass = 'text-[11px] font-bold uppercase tracking-wide text-slate-500';

export function SagDocumentsTab({
  documents,
  canManage,
  canDelete,
  onPreview,
  onCreate,
  onEdit,
  onDelete,
  onCorrection,
  indicators,
  onSyncLedger,
  pendingLedgerCount = 0,
  onOpenSettings
}: {
  documents: SagDocument[];
  canManage: boolean;
  canDelete: boolean;
  onPreview: (document: SagDocument) => void;
  onCreate: () => void;
  onEdit: (document: SagDocument) => void;
  onDelete: (document: SagDocument) => void;
  /** Mulakan tindakan susulan lejar (TS/TKS/US/Lelong) daripada surat ini. */
  onCorrection?: (document: SagDocument, action: SagCorrectionAction) => void;
  /** Penunjuk AI/analitik lejar (dikunci mengikut id transaksi) untuk setiap surat. */
  indicators?: Record<string, SagLetterIndicator>;
  /** Import rekod lejar SAG yang belum mempunyai surat + selaraskan kedua-dua modul. */
  onSyncLedger?: () => void;
  /** Bilangan rekod lejar SAG yang belum mempunyai Surat Akuan Gadaian. */
  pendingLedgerCount?: number;
  onOpenSettings: () => void;
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [pledgeFilter, setPledgeFilter] = useState('Semua');
  const [institutionFilter, setInstitutionFilter] = useState('Semua');
  const [page, setPage] = useState(1);

  const visibleDocuments = useMemo(
    () => documents.filter(document => !document.deletedAt),
    [documents]
  );
  const summary = useMemo(() => summarizeSagDocuments(visibleDocuments), [visibleDocuments]);
  const institutionOptions = useMemo(
    () => Array.from(new Set(visibleDocuments.map(document => document.institutionName).filter(Boolean))).sort(),
    [visibleDocuments]
  );

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return visibleDocuments
      .filter(document => {
        if (statusFilter !== 'Semua' && document.status !== statusFilter) return false;
        if (pledgeFilter !== 'Semua' && document.pledgeType !== pledgeFilter) return false;
        if (institutionFilter !== 'Semua' && document.institutionName !== institutionFilter) return false;
        if (!normalizedQuery) return true;
        return [
          document.documentNo,
          document.transactionRefNo,
          document.previousDocumentNo,
          document.pledgeType,
          document.member?.name,
          document.member?.icNumber,
          document.member?.memberNo,
          document.institutionName,
          document.product
        ]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) => {
        const leftDate = String(left.updatedAt || left.createdAt || left.financingDate || '');
        const rightDate = String(right.updatedAt || right.createdAt || right.financingDate || '');
        return rightDate.localeCompare(leftDate);
      });
  }, [visibleDocuments, query, statusFilter, pledgeFilter, institutionFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedDocuments = filteredDocuments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const statCards = [
    { title: 'Jumlah Surat Akuan', value: String(summary.total), hint: `${summary.issued} dikeluarkan`, icon: <FileText size={18} />, tone: 'border-corporate-teal-200 bg-corporate-teal-50/70 text-corporate-teal-800' },
    { title: 'Draf Belum Selesai', value: String(summary.draft), hint: 'Salinan belum lengkap', icon: <AlertTriangle size={18} />, tone: 'border-amber-200 bg-amber-50 text-amber-900' },
    { title: 'Nilai Marhun', value: formatSagMoney(summary.marhunTotal), hint: 'Jumlah keseluruhan', icon: <Layers size={18} />, tone: 'border-slate-200 bg-slate-50 text-slate-700' },
    { title: 'Nilai Pembiayaan', value: formatSagMoney(summary.financingTotal), hint: `Keuntungan ${formatSagMoney(summary.profitTotal)}`, icon: <Wallet size={18} />, tone: 'border-emerald-200 bg-emerald-50 text-emerald-800' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative overflow-hidden rounded-3xl border border-corporate-teal-800/40 bg-gradient-to-br from-slate-900 via-corporate-green-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-corporate-teal-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-corporate-magenta-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-corporate-teal-500/30 bg-corporate-teal-950/80 px-3.5 py-1 text-xs font-bold text-corporate-teal-200 backdrop-blur-md">
              <FileText size={14} className="text-emerald-400" />
              <span>PENGURUSAN SURAT AKUAN GADAIAN (SAG)</span>
            </div>
            <h2 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Pengurusan Surat Akuan Gadaian (SAG)
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300 sm:text-sm">
              Arkib salinan Surat Akuan Gadaian anda. Setiap surat merekod jenis pajakan yang di transaksi (Pajakan Asal, Salin, OL, Pusing, tebus atau lelong), nilai marhun, akad tawarruq dan jadual keuntungan, serta dipautkan kepada rekod SAG, aset emas dan institusi supaya analisis pulangan kekal tepat.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 sm:text-sm"
            >
              <Settings2 size={15} />
              <span>Tetapan Letterhead</span>
            </button>
            {canManage && onSyncLedger && (
              <button
                type="button"
                onClick={onSyncLedger}
                title={
                  pendingLedgerCount > 0
                    ? `Import ${pendingLedgerCount} rekod lejar SAG yang belum mempunyai surat dan selaraskan kedua-dua modul`
                    : 'Import rekod lejar SAG yang belum mempunyai surat dan selaraskan kedua-dua modul'
                }
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 sm:text-sm"
              >
                <ArrowRightLeft size={15} />
                <span>Segerak / Import Lejar</span>
                {pendingLedgerCount > 0 && (
                  <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-amber-950">
                    {pendingLedgerCount}
                  </span>
                )}
              </button>
            )}
            {canManage && (
              <button
                type="button"
                onClick={onCreate}
                className="inline-flex items-center gap-2 rounded-xl border border-corporate-teal-400/50 bg-corporate-teal-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-corporate-teal-950/40 backdrop-blur-md transition-all hover:bg-corporate-teal-500 active:scale-95 sm:text-sm"
              >
                <Plus size={16} />
                <span>Tambah Surat Akuan</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(card => (
          <div key={card.title} className={`rounded-2xl border p-4 shadow-sm ${card.tone}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{card.title}</p>
              <span className="opacity-70">{card.icon}</span>
            </div>
            <p className="mt-2 truncate font-mono text-xl font-black tracking-tight">{card.value}</p>
            <p className="mt-0.5 text-[11px] font-semibold opacity-70">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1 space-y-1.5">
            <label className={labelClass} htmlFor="sag-doc-search">Carian</label>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="sag-doc-search"
                value={query}
                onChange={event => { setQuery(event.target.value); setPage(1); }}
                placeholder="No. SAG, nama ahli, No. MyKad, No. keahlian atau rujukan transaksi"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>
          <div className="space-y-1.5 sm:w-44">
            <label className={labelClass} htmlFor="sag-doc-status">Status Dokumen</label>
            <select
              id="sag-doc-status"
              value={statusFilter}
              onChange={event => { setStatusFilter(event.target.value); setPage(1); }}
              className={inputClass}
            >
              <option value="Semua">Semua status</option>
              {SAG_STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 sm:w-40">
            <label className={labelClass} htmlFor="sag-doc-pledge">Jenis Pajakan</label>
            <select
              id="sag-doc-pledge"
              value={pledgeFilter}
              onChange={event => { setPledgeFilter(event.target.value); setPage(1); }}
              className={inputClass}
            >
              <option value="Semua">Semua jenis</option>
              {SAG_PLEDGE_TYPES.map(pledgeType => (
                <option key={pledgeType} value={pledgeType}>{pledgeType}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:w-56">
            <label className={labelClass} htmlFor="sag-doc-institution">Institusi</label>
            <select
              id="sag-doc-institution"
              value={institutionFilter}
              onChange={event => { setInstitutionFilter(event.target.value); setPage(1); }}
              className={inputClass}
            >
              <option value="Semua">Semua institusi</option>
              {institutionOptions.map(institution => <option key={institution} value={institution}>{institution}</option>)}
            </select>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {filteredDocuments.length} daripada {visibleDocuments.length} surat akuan dipaparkan
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-max border-collapse text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">No. SAG</th>
                <th className="px-4 py-3 font-bold">Ahli</th>
                <th className="px-4 py-3 font-bold">Ruj. Transaksi</th>
                <th className="px-4 py-3 font-bold">Institusi</th>
                <th className="px-4 py-3 font-bold">Tarikh Pembiayaan</th>
                <th className="px-4 py-3 text-right font-bold">Nilai Marhun</th>
                <th className="px-4 py-3 text-right font-bold">Nilai Pembiayaan</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 text-center font-bold">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {paginatedDocuments.map(document => {
                const statusMeta = getSagDocumentStatusMeta(document.status);
                return (
                  <tr
                    key={document.id}
                    onClick={() => onPreview(document)}
                    tabIndex={0}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onPreview(document);
                      }
                    }}
                    aria-label={`Lihat surat akuan gadaian ${document.documentNo}`}
                    className="cursor-pointer transition-colors hover:bg-slate-50/70 focus:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
                  >
                    <td className="px-4 py-3">
                      <span className="block font-mono text-sm font-black tracking-tight text-slate-900">{document.documentNo}</span>
                      <span className={`mt-1 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getSagPledgeTypeTone(document.pledgeType)}`}>
                        {document.pledgeType || 'Belum ditetapkan'}
                      </span>
                      {document.previousDocumentNo && (
                        <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">Dari {document.previousDocumentNo}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-sm font-bold text-slate-800">{document.member?.name || '-'}</span>
                      <span className="block font-mono text-[11px] text-slate-500">
                        {document.member?.memberNo ? `${document.member.memberNo} · ` : ''}
                        {document.member?.icNumber || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-mono text-slate-600">{document.transactionRefNo || '-'}</span>
                      {document.status === 'Draf' ? (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                          Draf · belum ke lejar
                        </span>
                      ) : (
                        <span className={`mt-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${document.transactionId
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                          {document.transactionId ? 'Lejar selari' : 'Belum disegerakkan'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{document.institutionName || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="block font-mono text-slate-700">{formatSagDate(document.financingDate)}</span>
                      <span className="block text-[11px] text-slate-400">Matang {formatSagDate(document.maturityDate)}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{formatSagMoney(document.marhunValue)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="block font-mono font-bold text-slate-800">{formatSagMoney(document.purchasePrice)}</span>
                      <span className="block font-mono text-[11px] text-emerald-700">+ {formatSagMoney(document.totalProfit)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] ${statusMeta.badgeClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
                        {statusMeta.label}
                      </span>
                      <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{document.copyType}</span>
                      {document.transactionId != null && indicators?.[String(document.transactionId)] && (() => {
                        const indicator = indicators[String(document.transactionId)];
                        const score = indicator.readinessScore;
                        const dotClass = indicator.presumption === 'Petunjuk shortfall'
                          ? 'bg-rose-500'
                          : indicator.presumption === 'Potensi overlap'
                            ? 'bg-amber-500'
                            : score !== null && score !== undefined && score >= 80
                              ? 'bg-emerald-500'
                              : 'bg-slate-400';
                        return (
                          <span
                            title={indicator.prediction || 'Penunjuk AI lejar SAG'}
                            className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-500"
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                            AI {score !== null && score !== undefined ? `${Math.round(Number(score))}/100` : '—'}
                            <span className="truncate">· {indicator.presumption || 'Data belum mencukupi'}</span>
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3" onClick={event => event.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {document.transactionId && document.pledgeStatus === 'Aktif' && onCorrection && (
                          <>
                            <button
                              type="button"
                              onClick={() => onCorrection(document, 'TS')}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                              title="Tebus penuh (TS)"
                              aria-label={`Tebus penuh untuk surat ${document.documentNo}`}
                            >
                              <Coins size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onCorrection(document, 'TKS')}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-700"
                              title="Tebus sebahagian (TKS)"
                              aria-label={`Tebus sebahagian untuk surat ${document.documentNo}`}
                            >
                              <BadgePercent size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onCorrection(document, 'US')}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-corporate-teal-50 hover:text-corporate-teal-700"
                              title="Bayar upah simpan (US)"
                              aria-label={`Upah simpan untuk surat ${document.documentNo}`}
                            >
                              <Wallet size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onCorrection(document, 'Lelong')}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-700"
                              title="Lelong (lelong marhun)"
                              aria-label={`Lelong untuk surat ${document.documentNo}`}
                            >
                              <Gavel size={15} />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => onPreview(document)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                          title="Pratonton dan cetak surat"
                          aria-label={`Pratonton surat ${document.documentNo}`}
                        >
                          <Printer size={15} />
                        </button>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => onEdit(document)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-corporate-teal-50 hover:text-corporate-teal-700"
                            title="Kemaskini surat akuan"
                            aria-label={`Kemaskini surat ${document.documentNo}`}
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(document)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-700"
                            title="Padam surat akuan"
                            aria-label={`Padam surat ${document.documentNo}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedDocuments.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-slate-500">
                    <FileText size={26} className="mx-auto mb-2 text-slate-300" />
                    {visibleDocuments.length === 0 ? (
                      <div className="space-y-3">
                        <p>
                          Belum ada Surat Akuan Gadaian.
                          {pendingLedgerCount > 0
                            ? ` Terdapat ${pendingLedgerCount} rekod SAG dalam lejar Pengurusan Surat Gadaian yang belum dijadikan surat.`
                            : ' Tekan "Tambah Surat Akuan" untuk menjana surat pertama.'}
                        </p>
                        {canManage && onSyncLedger && pendingLedgerCount > 0 && (
                          <button
                            type="button"
                            onClick={onSyncLedger}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-95"
                          >
                            <ArrowRightLeft size={15} />
                            Import {pendingLedgerCount} Rekod Lejar SAG
                          </button>
                        )}
                      </div>
                    ) : 'Tiada surat akuan sepadan dengan tapisan yang dipilih.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 p-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Menunjukkan {filteredDocuments.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} hingga {Math.min(currentPage * PAGE_SIZE, filteredDocuments.length)} daripada {filteredDocuments.length} surat
          </span>
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(previous => Math.max(1, previous - 1))}
              className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span className="px-2 font-bold text-slate-800">{currentPage} / {totalPages}</span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(previous => Math.min(totalPages, previous + 1))}
              className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              Seterusnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SagLetterheadModal({
  settings,
  letterhead,
  onClose,
  onSave
}: {
  settings: SagModuleSettings;
  letterhead: SagLetterhead;
  onClose: () => void;
  onSave: (settings: SagModuleSettings) => void;
}) {
  const [form, setForm] = useState<SagLetterhead>(letterhead);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const update = (patch: Partial<SagLetterhead>) => setForm(previous => ({ ...previous, ...patch }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.organizationName.trim()) {
      setError('Nama organisasi pada letterhead wajib diisi.');
      return;
    }
    if (!form.documentPrefix.trim()) {
      setError('Kod awalan No. SAG wajib diisi.');
      return;
    }
    setError('');
    onSave({ ...settings, letterhead: { ...form, documentPrefix: form.documentPrefix.toUpperCase() } });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tetapan letterhead Surat Akuan Gadaian"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-2 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <form
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={event => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-6">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <Settings2 size={18} className="text-emerald-600" /> Tetapan Letterhead SAG
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Maklumat institusi seperti yang tercetak pada salinan surat fizikal anda. Ia digunakan pada kepala surat dan untuk menjana No. SAG baharu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
            aria-label="Tutup tetapan"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 custom-scrollbar sm:px-6">
          {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className={labelClass} htmlFor="sag-lh-name">Nama Organisasi</label>
              <input id="sag-lh-name" value={form.organizationName} onChange={event => update({ organizationName: event.target.value })} className={inputClass} required />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className={labelClass} htmlFor="sag-lh-address1">Alamat Baris 1</label>
              <input id="sag-lh-address1" value={form.addressLine1} onChange={event => update({ addressLine1: event.target.value })} className={inputClass} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className={labelClass} htmlFor="sag-lh-address2">Alamat Baris 2</label>
              <input id="sag-lh-address2" value={form.addressLine2} onChange={event => update({ addressLine2: event.target.value })} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="sag-lh-phone">No. Telefon</label>
              <input id="sag-lh-phone" value={form.phone} onChange={event => update({ phone: event.target.value })} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="sag-lh-registration">No. Pendaftaran (pilihan)</label>
              <input id="sag-lh-registration" value={form.registrationNo} onChange={event => update({ registrationNo: event.target.value })} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="sag-lh-prefix">Kod Awalan No. SAG</label>
              <input id="sag-lh-prefix" value={form.documentPrefix} onChange={event => update({ documentPrefix: event.target.value.toUpperCase() })} className={`${inputClass} font-mono font-bold`} required />
              <p className="text-[11px] font-medium text-slate-500">Contoh: KPD004 -&gt; KPD004-DDMMYY-0001</p>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="sag-lh-officer">Nama Pegawai Pada Salinan</label>
              <input id="sag-lh-officer" value={form.officerName} onChange={event => update({ officerName: event.target.value })} className={inputClass} />
              <p className="text-[11px] font-medium text-slate-500">Rujukan sahaja, mengikut tandatangan pada salinan surat.</p>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="sag-lh-position">Jawatan Pegawai Pada Salinan</label>
              <input id="sag-lh-position" value={form.officerPosition} onChange={event => update({ officerPosition: event.target.value })} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="sag-lh-witness">Nama Saksi Pada Salinan (pilihan)</label>
              <input id="sag-lh-witness" value={form.witnessName} onChange={event => update({ witnessName: event.target.value })} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl px-4 py-2.5 font-semibold text-slate-600 transition-colors hover:bg-slate-200 sm:w-auto"
          >
            Batal
          </button>
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 sm:w-auto"
          >
            <Save size={15} /> Simpan Tetapan
          </button>
        </div>
      </form>
    </div>
  );
}
