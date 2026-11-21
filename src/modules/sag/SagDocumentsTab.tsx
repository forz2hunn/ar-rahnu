import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  BadgePercent,
  Building2,
  Coins,
  FileText,
  Gavel,
  Layers,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  ScanText,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  UploadCloud,
  Wallet,
  X
} from 'lucide-react';
import {
  SAG_DEFAULT_PAYMENT_TERM_MONTHS,
  SAG_PLEDGE_TYPES,
  SAG_STATUS_OPTIONS,
  formatSagDate,
  formatSagMoney,
  getSagDocumentStatusMeta,
  getSagPledgeTypeTone,
  summarizeSagDocuments,
  type SagDocument,
  type SagDocumentAttachment,
  type SagExternalImportInput,
  type SagLetterhead,
  type SagModuleSettings,
  resolveSagKaratFineness
} from './sagDocuments';
import { extractSagImportText } from '../../lib/sag-import-ocr';
import { parseSagImportText, type SagImportMarhunItem, type SagImportParseResult } from '../../lib/sag-import-parser';

const PAGE_SIZE = 10;

/** Had fail bagi setiap sesi import surat institusi lain. */
const MAX_EXTERNAL_IMPORT_FILES = 10;
const MAX_EXTERNAL_IMPORT_FILE_SIZE = 50 * 1024 * 1024;

/** Cap jari set fail, digunakan untuk mengesan pertukaran sumber imbasan. */
const filesFingerprint = (files: File[]) =>
  files.map(file => `${file.name}:${file.size}:${file.lastModified}`).join('|');

/** Baris draf Keterangan Marhun dalam modal import (nilai sebagai teks input). */
type MarhunRowDraft = {
  id: string;
  description: string;
  quantity: string;
  karat: string;
  weight: string;
  marhunValue: string;
};

/** Nilai terbitan imbasan (bukan input pengguna) untuk semakan dalam modal. */
type SagImportDerived = {
  feeBasis: '' | 'nilaiMarhun';
  feeRate: number | null;
  previousRedemption: number | null;
  /** Bulan jadual surat yang digunakan untuk menerbitkan kadar upah. */
  rateBasisMonths: number | null;
  accountNo: string;
  poBox: string;
  profitAmount: number | null;
  commodityCertificateNo: string;
  profitPaymentAmount: number | null;
  profitPaymentMonths: number | null;
  memberPhone: string;
  memberAddress: string;
  heirName: string;
};

const EMPTY_DERIVED: SagImportDerived = {
  feeBasis: '',
  feeRate: null,
  previousRedemption: null,
  rateBasisMonths: null,
  accountNo: '',
  poBox: '',
  profitAmount: null,
  commodityCertificateNo: '',
  profitPaymentAmount: null,
  profitPaymentMonths: null,
  memberPhone: '',
  memberAddress: '',
  heirName: ''
};

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
  onImportExternal,
  onOpenAttachment,
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
  /** Import salinan Surat Akuan Gadaian daripada institusi lain (fail imbasan + metadata). */
  onImportExternal?: (input: SagExternalImportInput) => Promise<void>;
  /** Buka fail salinan surat yang dilampirkan pada rekod. */
  onOpenAttachment?: (attachment: SagDocumentAttachment) => void;
  onOpenSettings: () => void;
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [pledgeFilter, setPledgeFilter] = useState('Semua');
  const [institutionFilter, setInstitutionFilter] = useState('Semua');
  const [sourceFilter, setSourceFilter] = useState('Semua');
  const [page, setPage] = useState(1);
  const [isImportOpen, setIsImportOpen] = useState(false);

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
        if (sourceFilter !== 'Semua' && (document.source || 'internal') !== sourceFilter) return false;
        if (!normalizedQuery) return true;
        return [
          document.documentNo,
          document.accountNo,
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
  }, [visibleDocuments, query, statusFilter, pledgeFilter, institutionFilter, sourceFilter]);

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
    { title: 'Nilai Pembiayaan', value: formatSagMoney(summary.financingTotal), hint: `Ribh ${formatSagMoney(summary.profitTotal)} · Upah ${formatSagMoney(summary.ujrahTotal)}`, icon: <Wallet size={18} />, tone: 'border-emerald-200 bg-emerald-50 text-emerald-800' }
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
            {canManage && onImportExternal && (
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                title="Import salinan surat akuan gadaian daripada institusi lain (PDF/imej imbasan)"
                className="inline-flex items-center gap-2 rounded-xl border border-sky-300/40 bg-sky-500/20 px-3.5 py-2 text-xs font-semibold text-sky-50 backdrop-blur-md transition-all hover:bg-sky-500/30 active:scale-95 sm:text-sm"
              >
                <UploadCloud size={15} />
                <span>Import Surat Institusi Lain</span>
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
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
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
          <div className="space-y-1.5 sm:w-52">
            <label className={labelClass} htmlFor="sag-doc-source">Sumber Surat</label>
            <select
              id="sag-doc-source"
              value={sourceFilter}
              onChange={event => { setSourceFilter(event.target.value); setPage(1); }}
              className={inputClass}
            >
              <option value="Semua">Semua sumber</option>
              <option value="internal">Terbitan sistem</option>
              <option value="external">Import institusi lain</option>
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
                const externalAttachments = document.source === 'external' ? (document.attachments || []) : [];
                const hasExternalFiles = externalAttachments.length > 0 && Boolean(onOpenAttachment);
                const openPrimary = () => {
                  if (hasExternalFiles) onOpenAttachment?.(externalAttachments[0]);
                  else onPreview(document);
                };
                return (
                  <tr
                    key={document.id}
                    onClick={openPrimary}
                    tabIndex={0}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openPrimary();
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
                      {document.source === 'external' && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-800">
                          <Building2 size={10} />
                          Import Institusi Lain{externalAttachments.length ? ` · ${externalAttachments.length} fail` : ''}
                        </span>
                      )}
                      {document.accountNo && (
                        <span className="mt-0.5 block font-mono text-[10px] font-semibold text-slate-500">
                          Akaun {document.accountNo}
                        </span>
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
                      {document.feeBasis === 'jumlahPembiayaan' && (
                        <span className="mt-1 block text-[10px] font-bold text-rose-600">Ujrah tidak patuh · asas pembiayaan</span>
                      )}
                      {document.status !== 'Draf' && !document.consent?.acceptedAt && (
                        <span className="mt-1 block text-[10px] font-bold text-amber-700">Ijab &amp; Qabul tiada rekod</span>
                      )}
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
                        {hasExternalFiles && externalAttachments.map((attachment, index) => (
                          <button
                            key={attachment.path || `${document.id}-attachment-${index}`}
                            type="button"
                            onClick={() => onOpenAttachment?.(attachment)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-sky-50 hover:text-sky-700"
                            title={`Buka fail imbasan ${attachment.name}`}
                            aria-label={`Buka fail ${attachment.name} bagi surat ${document.documentNo}`}
                          >
                            <Paperclip size={15} />
                          </button>
                        ))}
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

      {isImportOpen && onImportExternal && (
        <SagExternalImportModal
          institutionOptions={institutionOptions}
          existingDocumentNumbers={visibleDocuments.map(document => document.documentNo).filter(Boolean)}
          onClose={() => setIsImportOpen(false)}
          onImport={onImportExternal}
        />
      )}
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

const localDateKey = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

/**
 * Borang import salinan Surat Akuan Gadaian daripada institusi lain.
 *
 * Surat disimpan sebagai rekod rujukan (status `Draf`, `source: 'external'`)
 * bersama fail imbasan PDF/imej, supaya arkib surat institusi lain kekal
 * berasingan daripada surat terbitan sistem dan tidak menyentuh lejar.
 */
export function SagExternalImportModal({
  institutionOptions,
  existingDocumentNumbers,
  onClose,
  onImport
}: {
  institutionOptions: string[];
  existingDocumentNumbers: string[];
  onClose: () => void;
  onImport: (input: SagExternalImportInput) => Promise<void>;
}) {
  const [form, setForm] = useState({
    institutionName: '',
    documentNo: '',
    memberName: '',
    memberIcNumber: '',
    pledgeType: 'Pajakan Asal',
    financingDate: localDateKey(),
    maturityDate: '',
    marhunValue: '',
    financingAmount: '',
    /** Tempoh upah simpan (bulan) yang dicaj, bukan jumlah tempoh penuh surat. */
    paymentTermMonths: String(SAG_DEFAULT_PAYMENT_TERM_MONTHS),
    remarks: ''
  });
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const analyseRunRef = useRef(0);
  /** Set fail yang menghasilkan data borang semasa; berubah = data perlu dibuang. */
  const scannedSourcesRef = useRef('');
  const [scan, setScan] = useState({
    status: 'idle' as 'idle' | 'running' | 'done' | 'error',
    message: '',
    progress: null as number | null,
    method: '' as '' | 'pdf-text' | 'ocr',
    matchedLabels: [] as string[],
    missingLabels: [] as string[],
    confidence: 0,
    notes: [] as string[],
    rawText: ''
  });
  const [derived, setDerived] = useState<SagImportDerived>(EMPTY_DERIVED);
  const [marhunRows, setMarhunRows] = useState<MarhunRowDraft[]>([]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isSaving]);

  const update = (patch: Partial<typeof form>) => setForm(previous => ({ ...previous, ...patch }));

  const marhunRowTotals = marhunRows.reduce((totals, row) => {
    const quantity = Math.max(0, Number(row.quantity) || 0);
    const weight = Math.max(0, Number(row.weight) || 0);
    const value = Math.max(0, Number(row.marhunValue) || 0);
    totals.weight += quantity * weight;
    totals.value += value;
    return totals;
  }, { weight: 0, value: 0 });

  const addMarhunRow = () => setMarhunRows(rows => [
    ...rows,
    { id: `row-${Date.now()}-${rows.length}`, description: '', quantity: '1', karat: '', weight: '', marhunValue: '' }
  ]);
  const updateMarhunRow = (id: string, patch: Partial<MarhunRowDraft>) =>
    setMarhunRows(rows => rows.map(row => (row.id === id ? { ...row, ...patch } : row)));
  const removeMarhunRow = (id: string) =>
    setMarhunRows(rows => rows.filter(row => row.id !== id));

  /** Peta medan yang dibaca daripada surat ke dalam borang import. */
  const buildFormPatch = (parsed: SagImportParseResult) => {
    const patch: Partial<typeof form> = {};
    const { fields } = parsed;
    if (fields.institutionName) patch.institutionName = fields.institutionName;
    if (fields.documentNo) patch.documentNo = fields.documentNo;
    if (fields.memberName) patch.memberName = fields.memberName;
    if (fields.memberIcNumber) patch.memberIcNumber = fields.memberIcNumber;
    if (fields.financingDate) patch.financingDate = fields.financingDate;
    if (fields.maturityDate) patch.maturityDate = fields.maturityDate;
    if (fields.pledgeType && (SAG_PLEDGE_TYPES as string[]).includes(fields.pledgeType)) {
      patch.pledgeType = fields.pledgeType;
    }
    // "Tempoh" pada surat ialah tempoh upah simpan yang dicaj (lazimnya 6 bulan
    // satu period), bukan jumlah tempoh penuh gadaian. Nilai ini menentukan
    // Jumlah Upah pada surat, jadi ia mesti dibawa masuk ke rekod.
    if (typeof fields.paymentTermMonths === 'number' && fields.paymentTermMonths > 0) {
      patch.paymentTermMonths = String(Math.max(1, Math.min(24, Math.round(fields.paymentTermMonths))));
    }
    if (typeof fields.marhunValue === 'number' && fields.marhunValue > 0) {
      patch.marhunValue = fields.marhunValue.toFixed(2);
    }
    if (typeof fields.financingAmount === 'number' && fields.financingAmount > 0) {
      patch.financingAmount = fields.financingAmount.toFixed(2);
    }
    return patch;
  };

  /**
   * Kosongkan medan yang diisi oleh imbasan. Dipanggil apabila set fail bertukar
   * supaya nilai surat lama tidak kekal bersama data surat baharu (contoh nilai
   * marhun surat A terbawa ke surat B yang tidak menyatakan nilai itu).
   */
  const resetScannedFields = (): Partial<typeof form> => ({
    institutionName: '',
    documentNo: '',
    memberName: '',
    memberIcNumber: '',
    financingDate: '',
    maturityDate: '',
    pledgeType: 'Pajakan Asal',
    marhunValue: '',
    financingAmount: '',
    paymentTermMonths: String(SAG_DEFAULT_PAYMENT_TERM_MONTHS)
  });

  /**
   * Baca fail surat (lapisan teks PDF atau OCR) dan isi medan borang secara
   * automatik. Semua nilai tetap boleh disemak/diubah sebelum diimport.
   */
  const runScan = async (targetFiles: File[]) => {
    if (!targetFiles.length) return;
    const runId = analyseRunRef.current + 1;
    analyseRunRef.current = runId;
    const fingerprint = filesFingerprint(targetFiles);
    // Fail berbeza bermaksud data borang sedia ada datang daripada surat lain
    // dan mesti dibuang sebelum bacaan baharu dipetakan.
    const isNewSources = scannedSourcesRef.current !== fingerprint;
    setScan({ status: 'running', message: 'Menyediakan pembacaan surat...', progress: 0, method: '', matchedLabels: [], missingLabels: [], confidence: 0, notes: [], rawText: '' });
    try {
      const extraction = await extractSagImportText(targetFiles, (message, progress) => {
        if (analyseRunRef.current !== runId) return;
        setScan(previous => ({
          ...previous,
          status: 'running',
          message,
          progress: typeof progress === 'number' ? progress : previous.progress
        }));
      });
      if (analyseRunRef.current !== runId) return;
      const parsed = parseSagImportText(extraction.text);
      const patch: Partial<typeof form> = {
        ...(isNewSources ? resetScannedFields() : {}),
        ...buildFormPatch(parsed)
      };
      if (Object.keys(patch).length) update(patch);
      scannedSourcesRef.current = fingerprint;
      setDerived({
        feeBasis: parsed.fields.feeBasis || '',
        feeRate: parsed.fields.feeRate ?? null,
        previousRedemption: parsed.fields.previousRedemption ?? null,
        rateBasisMonths: parsed.fields.scheduleMonths ?? parsed.fields.paymentTermMonths ?? null,
        accountNo: parsed.fields.accountNo || '',
        poBox: parsed.fields.poBox || '',
        profitAmount: parsed.fields.profitAmount ?? null,
        commodityCertificateNo: parsed.fields.commodityCertificateNo || '',
        profitPaymentAmount: parsed.fields.profitPaymentAmount ?? null,
        profitPaymentMonths: parsed.fields.profitPaymentMonths ?? null,
        memberPhone: parsed.fields.memberPhone || '',
        memberAddress: parsed.fields.memberAddress || '',
        heirName: parsed.fields.heirName || ''
      });
      setMarhunRows((parsed.fields.marhunItems || []).map((item, index) => ({
        id: `scan-${Date.now()}-${index}`,
        description: item.description,
        quantity: String(item.quantity),
        karat: item.karat,
        weight: item.weight.toFixed(2),
        marhunValue: item.marhunValue.toFixed(2)
      })));
      const missingLabels = [
        !parsed.fields.institutionName && 'Institusi asal',
        !parsed.fields.memberName && 'Nama ahli',
        !parsed.fields.financingDate && 'Tarikh pembiayaan',
        !parsed.fields.maturityDate && 'Tarikh matang',
        !parsed.fields.marhunValue && 'Nilai marhun',
        !parsed.fields.financingAmount && 'Jumlah pembiayaan',
        !parsed.fields.paymentTermMonths && 'Tempoh upah simpan'
      ].filter(Boolean) as string[];
      setScan({
        status: 'done',
        message: extraction.method === 'ocr'
          ? 'Surat dibaca melalui OCR (imbasan) — semak ketepatan nilai.'
          : 'Surat dibaca daripada lapisan teks PDF.',
        progress: 1,
        method: extraction.method,
        matchedLabels: parsed.matchedLabels,
        missingLabels,
        confidence: parsed.confidence,
        notes: [...extraction.notes, ...parsed.notes],
        rawText: extraction.text.slice(0, 20000)
      });
    } catch (scanError) {
      if (analyseRunRef.current !== runId) return;
      if (isNewSources) {
        // Fail baharu gagal dibaca: buang sisa surat lama supaya tidak diimport.
        update(resetScannedFields());
        scannedSourcesRef.current = fingerprint;
      }
      setDerived(EMPTY_DERIVED);
      setMarhunRows([]);
      setScan({
        status: 'error',
        message: scanError instanceof Error ? scanError.message : 'Pembacaan automatik gagal.',
        progress: null,
        method: '',
        matchedLabels: [],
        missingLabels: [],
        confidence: 0,
        notes: [],
        rawText: ''
      });
    }
  };

  const handleRemoveFile = (index: number) => {
    const nextFiles = files.filter((_, fileIndex) => fileIndex !== index);
    setFiles(nextFiles);
    if (!nextFiles.length) {
      analyseRunRef.current += 1;
      scannedSourcesRef.current = '';
      // Tiada lagi fail: buang semua nilai yang datang daripada imbasan.
      update(resetScannedFields());
      setDerived(EMPTY_DERIVED);
      setMarhunRows([]);
      setScan({ status: 'idle', message: '', progress: null, method: '', matchedLabels: [], missingLabels: [], confidence: 0, notes: [], rawText: '' });
      return;
    }
    // Set fail berubah: baca semula fail yang tinggal supaya data borang
    // sepadan dengan fail yang benar-benar dilampirkan (imbasan lama dibatalkan
    // melalui runId, dan medan imbasan direset kerana cap jari fail berubah).
    void runScan(nextFiles);
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selected.length) return;
    const rejected: string[] = [];
    const accepted = selected.filter(file => {
      const isPdf = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');
      if (!isPdf && !isImage) {
        rejected.push(`${file.name} (bukan PDF/imej)`);
        return false;
      }
      if (file.size > MAX_EXTERNAL_IMPORT_FILE_SIZE) {
        rejected.push(`${file.name} (melebihi 50 MB)`);
        return false;
      }
      return true;
    });
    const nextFiles = [...files, ...accepted].slice(0, MAX_EXTERNAL_IMPORT_FILES);
    if (files.length + accepted.length > MAX_EXTERNAL_IMPORT_FILES) {
      setError(`Maksimum ${MAX_EXTERNAL_IMPORT_FILES} fail bagi setiap sesi import.`);
    } else if (rejected.length) {
      setError(`Fail berikut tidak diterima: ${rejected.join(', ')}.`);
    } else {
      setError('');
    }
    setFiles(nextFiles);
    if (nextFiles.length) void runScan(nextFiles);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    const institutionName = form.institutionName.trim();
    if (!institutionName) {
      setError('Nama institusi asal wajib diisi.');
      return;
    }
    if (!form.financingDate) {
      setError('Tarikh pembiayaan wajib diisi.');
      return;
    }
    if (!files.length) {
      setError('Sekurang-kurangnya satu fail salinan surat (PDF/imej) diperlukan.');
      return;
    }
    const paymentTermMonths = Math.round(Number(form.paymentTermMonths));
    if (!(paymentTermMonths >= 1 && paymentTermMonths <= 24)) {
      setError('Tempoh upah simpan mestilah antara 1 dan 24 bulan.');
      return;
    }
    const documentNo = form.documentNo.trim().toUpperCase();
    if (documentNo && existingDocumentNumbers.some(number => String(number || '').trim().toUpperCase() === documentNo)) {
      setError(`No. surat ${documentNo} telah digunakan oleh rekod sedia ada.`);
      return;
    }
    const marhunValue = Number(form.marhunValue);
    const financingAmount = Number(form.financingAmount);
    if (!(marhunValue > 0)) {
      setError('Nilai marhun mesti melebihi RM 0.00.');
      return;
    }
    if (!(financingAmount > 0)) {
      setError('Jumlah pembiayaan mesti melebihi RM 0.00.');
      return;
    }
    if (financingAmount > marhunValue) {
      setError('Jumlah pembiayaan tidak boleh melebihi nilai marhun.');
      return;
    }
    const incompleteMarhunRow = marhunRows.find(row => {
      const hasAny = Boolean(row.description.trim() || row.weight || row.marhunValue);
      const complete = Boolean(row.description.trim()) && Number(row.weight) > 0 && Number(row.marhunValue) > 0;
      return hasAny && !complete;
    });
    if (incompleteMarhunRow) {
      setError('Sila lengkapkan Keterangan, Berat (g) dan Nilai Marhun bagi setiap item marhun.');
      return;
    }
    const marhunItems = marhunRows
      .map(row => {
        const description = row.description.trim();
        const quantity = Math.max(1, Number(row.quantity) || 1);
        const weight = Number(row.weight) || 0;
        const itemValue = Number(row.marhunValue) || 0;
        if (!description || weight <= 0 || itemValue <= 0) return null;
        return {
          description,
          quantity,
          karat: row.karat.trim() || '-',
          weight: Math.round(weight * 100) / 100,
          marhunValue: Math.round(itemValue * 100) / 100,
          ratePerGram: Math.round((itemValue / (quantity * weight)) * 100) / 100,
          fineness: resolveSagKaratFineness(row.karat.trim())
        } as SagImportMarhunItem;
      })
      .filter((item): item is SagImportMarhunItem => item !== null);
    if (marhunItems.length) {
      const itemsValue = marhunItems.reduce((sum, item) => sum + item.marhunValue, 0);
      if (Math.abs(itemsValue - marhunValue) > 0.05) {
        setError(
          `Jumlah Nilai Marhun item (RM ${itemsValue.toFixed(2)}) tidak sama dengan Nilai Marhun borang (RM ${marhunValue.toFixed(2)}). ` +
          'Betulkan item atau tekan “Guna jumlah item” di bahagian Keterangan Marhun.'
        );
        return;
      }
    }
    setError('');
    setIsSaving(true);
    try {
      await onImport({
        institutionName,
        documentNo,
        memberName: form.memberName.trim(),
        memberIcNumber: form.memberIcNumber.trim(),
        financingDate: form.financingDate,
        maturityDate: form.maturityDate,
        pledgeType: form.pledgeType,
        marhunValue,
        financingAmount,
        paymentTermMonths,
        remarks: form.remarks.trim(),
        files,
        feeBasis: derived.feeBasis || undefined,
        feeRate: derived.feeRate ?? undefined,
        previousRedemption: derived.previousRedemption ?? undefined,
        marhunItems: marhunItems.length ? marhunItems : undefined,
        accountNo: derived.accountNo || undefined,
        poBox: derived.poBox || undefined,
        profitAmount: derived.profitAmount ?? undefined,
        commodityCertificateNo: derived.commodityCertificateNo || undefined,
        profitPaymentAmount: derived.profitPaymentAmount ?? undefined,
        profitPaymentMonths: derived.profitPaymentMonths ?? undefined,
        memberPhone: derived.memberPhone || undefined,
        memberAddress: derived.memberAddress || undefined,
        heirName: derived.heirName || undefined
      });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Import surat tidak berjaya.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Import Surat Akuan Gadaian daripada institusi lain"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-2 backdrop-blur-sm sm:p-4"
      onClick={() => { if (!isSaving) onClose(); }}
    >
      <form
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={event => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-6">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <Building2 size={18} className="text-sky-600" /> Import Surat Institusi Lain
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Daftarkan salinan Surat Akuan Gadaian daripada institusi Ar-Rahnu lain (contoh surat pindah gadaian / pusing).
              Fail imbasan disimpan bersama rekod sebagai rujukan dan direkodkan berstatus <span className="font-semibold">Draf</span> —
              tiada rekod lejar koperasi ini dicipta secara automatik.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40"
            aria-label="Tutup borang import"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 custom-scrollbar sm:px-6">
          {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}

          <div className="space-y-2 rounded-xl border border-dashed border-sky-300 bg-sky-50/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-sky-900">Fail Salinan Surat</p>
                <p className="text-[11px] font-medium text-sky-800/80">
                  PDF atau imej imbasan. Maksimum {MAX_EXTERNAL_IMPORT_FILES} fail, sehingga 50 MB setiap fail.
                  Data surat dibaca automatik (teks PDF/OCR) untuk mengisi borang.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {files.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void runScan(files)}
                    disabled={scan.status === 'running' || isSaving}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800 transition-colors hover:bg-cyan-100 disabled:opacity-50"
                  >
                    <ScanText size={15} />
                    <span>{scan.status === 'running' ? 'Membaca...' : 'Baca & Isi Automatik'}</span>
                  </button>
                )}
                <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-700 transition-colors hover:bg-sky-100 ${files.length >= MAX_EXTERNAL_IMPORT_FILES ? 'pointer-events-none opacity-50' : ''}`}>
                  <UploadCloud size={15} />
                  <span>Pilih Fail</span>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    multiple
                    disabled={files.length >= MAX_EXTERNAL_IMPORT_FILES || isSaving}
                    onChange={handleFileSelection}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            {files.length === 0 ? (
              <p className="text-[11px] font-semibold text-sky-800/70">Belum ada fail dipilih.</p>
            ) : (
              <ul className="space-y-1.5">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2"
                  >
                    <span className="min-w-0 break-all text-xs font-semibold text-slate-700">
                      <Paperclip size={12} className="mr-1 inline text-sky-600" />
                      {file.name}
                      <span className="ml-1 font-mono text-[10px] text-slate-400">({Math.max(1, Math.round(file.size / 1024))} KB)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      disabled={isSaving}
                      className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                      aria-label={`Buang fail ${file.name}`}
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-cyan-200 bg-cyan-50/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-cyan-900">Keterangan Marhun</p>
                <p className="text-[11px] font-medium text-cyan-800/80">
                  Semak setiap item supaya sama dengan surat asal. Boleh tambah atau betulkan jika bacaan OCR tidak tepat.
                </p>
              </div>
              <button
                type="button"
                onClick={addMarhunRow}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-300 bg-white px-3 py-1.5 text-[11px] font-bold text-cyan-800 transition-colors hover:bg-cyan-100 disabled:opacity-50"
              >
                <Plus size={13} /> Tambah Item
              </button>
            </div>
            {marhunRows.length === 0 ? (
              <p className="text-[11px] font-semibold text-cyan-900/70">
                Tiada item dikesan. Tekan “Tambah Item” untuk masukkan secara manual.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-xs">
                  <thead className="text-[10px] uppercase tracking-wide text-cyan-900/70">
                    <tr>
                      <th className="px-1 py-1 text-left font-bold">Bil</th>
                      <th className="px-1 py-1 text-left font-bold">Keterangan Marhun</th>
                      <th className="px-1 py-1 text-right font-bold">Kuantiti</th>
                      <th className="px-1 py-1 text-left font-bold">Karat</th>
                      <th className="px-1 py-1 text-right font-bold">Berat (g)</th>
                      <th className="px-1 py-1 text-right font-bold">Nilai Marhun (RM)</th>
                      <th className="px-1 py-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {marhunRows.map((row, index) => (
                      <tr key={row.id} className="border-t border-cyan-200/60">
                        <td className="px-1 py-1 font-bold text-slate-600">{index + 1}</td>
                        <td className="px-1 py-1">
                          <input
                            value={row.description}
                            onChange={event => updateMarhunRow(row.id, { description: event.target.value })}
                            className={`${inputClass} py-1 text-xs`}
                            placeholder="cth. BK Cincin (UA) (D15)"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={row.quantity}
                            onChange={event => updateMarhunRow(row.id, { quantity: event.target.value })}
                            className={`${inputClass} w-20 py-1 text-right font-mono text-xs`}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            value={row.karat}
                            onChange={event => updateMarhunRow(row.id, { karat: event.target.value.toUpperCase() })}
                            className={`${inputClass} w-20 py-1 font-mono text-xs`}
                            placeholder="18.0K"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.weight}
                            onChange={event => updateMarhunRow(row.id, { weight: event.target.value })}
                            className={`${inputClass} w-24 py-1 text-right font-mono text-xs`}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.marhunValue}
                            onChange={event => updateMarhunRow(row.id, { marhunValue: event.target.value })}
                            className={`${inputClass} w-28 py-1 text-right font-mono text-xs`}
                          />
                        </td>
                        <td className="px-1 py-1 text-right">
                          <button
                            type="button"
                            onClick={() => removeMarhunRow(row.id)}
                            disabled={isSaving}
                            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                            aria-label={`Buang item ${index + 1}`}
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-cyan-300 font-bold text-cyan-950">
                      <td colSpan={4} className="px-1 py-1.5 text-right">Jumlah</td>
                      <td className="px-1 py-1.5 text-right">
                        <span className="block text-[9px] font-bold uppercase tracking-wide text-cyan-700">Berat (g)</span>
                        <span className="font-mono">{marhunRowTotals.weight.toFixed(2)}</span>
                      </td>
                      <td className="px-1 py-1.5 text-right">
                        <span className="block text-[9px] font-bold uppercase tracking-wide text-cyan-700">Nilai (RM)</span>
                        <span className="font-mono">{marhunRowTotals.value.toFixed(2)}</span>
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            {marhunRowTotals.value > 0 && Math.abs(marhunRowTotals.value - (Number(form.marhunValue) || 0)) > 0.05 && (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900">
                Jumlah item RM {marhunRowTotals.value.toFixed(2)} berbeza dengan Nilai Marhun borang RM {(Number(form.marhunValue) || 0).toFixed(2)}.{' '}
                <button
                  type="button"
                  onClick={() => update({ marhunValue: marhunRowTotals.value.toFixed(2) })}
                  disabled={isSaving}
                  className="font-bold underline disabled:opacity-50"
                >
                  Guna jumlah item
                </button>{' '}
                atau betulkan item supaya sama dengan surat asal.
              </p>
            )}
          </div>

          {scan.status !== 'idle' && (
            <div className={`rounded-xl border p-3 text-xs ${scan.status === 'error'
              ? 'border-amber-300 bg-amber-50'
              : 'border-cyan-200 bg-cyan-50/70'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={`flex items-center gap-2 font-bold ${scan.status === 'error' ? 'text-amber-900' : 'text-cyan-900'}`}>
                  {scan.status === 'running'
                    ? <ScanText size={14} className="animate-pulse" />
                    : scan.status === 'done'
                      ? <Sparkles size={14} />
                      : <AlertTriangle size={14} />}
                  {scan.status === 'running'
                    ? 'Membaca data surat…'
                    : scan.status === 'done'
                      ? 'Data surat dipetakan ke borang'
                      : 'Pembacaan automatik gagal'}
                </p>
                <button
                  type="button"
                  onClick={() => void runScan(files)}
                  disabled={scan.status === 'running' || !files.length}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors disabled:opacity-40 ${scan.status === 'error'
                    ? 'border-amber-300 bg-white text-amber-800 hover:bg-amber-100'
                    : 'border-cyan-300 bg-white text-cyan-800 hover:bg-cyan-100'}`}
                >
                  <RefreshCw size={12} className={scan.status === 'running' ? 'animate-spin' : ''} />
                  <span>Baca semula</span>
                </button>
              </div>
              <p className={`mt-1 font-medium ${scan.status === 'error' ? 'text-amber-900/80' : 'text-cyan-900/80'}`}>
                {scan.message}
                {scan.status === 'running' && scan.progress !== null
                  ? ` (${Math.round(Math.min(1, Math.max(0, scan.progress)) * 100)}%)`
                  : ''}
              </p>
              {scan.status === 'running' && scan.progress !== null && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cyan-100">
                  <div
                    className="h-full rounded-full bg-cyan-500 transition-all duration-300"
                    style={{ width: `${Math.round(Math.min(1, Math.max(0, scan.progress)) * 100)}%` }}
                  />
                </div>
              )}
              {scan.status === 'done' && (
                <>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {scan.matchedLabels.length > 0
                      ? scan.matchedLabels.map(label => (
                        <span key={label} className="rounded-md border border-cyan-300 bg-white px-1.5 py-0.5 text-[10px] font-bold text-cyan-800">
                          {label}
                        </span>
                      ))
                      : (
                        <span className="text-[11px] font-semibold text-cyan-900/70">
                          Tiada medan standard dapat dipadankan — sila isi secara manual.
                        </span>
                      )}
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-cyan-900/70">
                    Keyakinan padanan {Math.round(scan.confidence * 100)}%
                    {scan.method === 'ocr' ? ' · OCR imbasan' : ' · teks PDF'}.
                    Sila semak setiap nilai sebelum menekan “Import Surat”.
                  </p>
                  {scan.missingLabels.length > 0 && (
                    <p className="mt-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900">
                      Tidak dapat dibaca daripada fail: {scan.missingLabels.join(', ')}. Sila isi atau betulkan nilai tersebut.
                    </p>
                  )}
                  {(derived.feeRate !== null || derived.previousRedemption !== null || marhunRows.length > 0) && (
                    <div className="mt-1.5 rounded-lg border border-cyan-300 bg-white px-2 py-1 text-[11px] font-semibold text-cyan-900">
                      {derived.feeRate !== null && (
                        <span>
                          Asas Upah Simpan (Akad Ijarah): <b>Nilai Marhun</b> · Kadar <b>{derived.feeRate}% sebulan</b>
                          {derived.rateBasisMonths ? ` (dikira daripada ${derived.rateBasisMonths} bulan jadual surat)` : ''}.
                          {' '}Tempoh yang dicaj pada rekod: <b>{form.paymentTermMonths || '?'} bulan</b>.
                        </span>
                      )}
                      {derived.previousRedemption !== null && (
                        <span className="mt-0.5 block">Jumlah Tebus Surat Asal: <b>RM {derived.previousRedemption.toFixed(2)}</b>.</span>
                      )}
                      {marhunRows.length > 0 && (
                        <span className="mt-0.5 block">
                          Keterangan Marhun: <b>{marhunRows.length} item</b>
                          {' '}({marhunRowTotals.weight.toFixed(2)} g)
                          akan dimasukkan ke surat.
                        </span>
                      )}
                      {(derived.accountNo || derived.poBox) && (
                        <span className="mt-0.5 block">
                          {derived.accountNo ? <>No. Akaun: <b>{derived.accountNo}</b>.</> : null}
                          {derived.accountNo && derived.poBox ? ' ' : null}
                          {derived.poBox ? <>No. Kotak: <b>{derived.poBox}</b>.</> : null}
                        </span>
                      )}
                      {derived.commodityCertificateNo && (
                        <span className="mt-0.5 block">No. Sijil Komoditi: <b>{derived.commodityCertificateNo}</b>.</span>
                      )}
                      {derived.profitPaymentAmount !== null && (
                        <span className="mt-0.5 block">
                          Bayaran Keuntungan {derived.profitPaymentMonths ? `setiap ${derived.profitPaymentMonths} bulan` : 'berkala'}: <b>RM {derived.profitPaymentAmount.toFixed(2)}</b>.
                        </span>
                      )}
                      {(derived.memberPhone || derived.heirName || derived.memberAddress) && (
                        <span className="mt-0.5 block">
                          {derived.memberPhone ? <>Telefon ahli: <b>{derived.memberPhone}</b>. </> : null}
                          {derived.heirName ? <>Waris: <b>{derived.heirName}</b>. </> : null}
                          {derived.memberAddress ? <span className="block break-words">Alamat: <b>{derived.memberAddress}</b>.</span> : null}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
              {scan.notes.length > 0 && (
                <ul className={`mt-1 list-disc space-y-0.5 pl-4 text-[11px] font-medium ${scan.status === 'error' ? 'text-amber-900/80' : 'text-cyan-900/70'}`}>
                  {scan.notes.map(note => <li key={note}>{note}</li>)}
                </ul>
              )}
              {scan.status === 'done' && scan.rawText && (
                <details className="mt-2 rounded-lg border border-cyan-200 bg-white px-2 py-1">
                  <summary className="cursor-pointer text-[11px] font-bold text-cyan-800">Lihat teks OCR yang dibaca</summary>
                  <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-slate-600">{scan.rawText}</pre>
                </details>
              )}
              {scan.status === 'error' && (
                <p className="mt-1 text-[11px] font-medium text-amber-900/80">
                  Petua: gunakan PDF berteks jika tersedia. OCR memerlukan sambungan internet pada penggunaan pertama
                  (muat turun enjin &amp; data bahasa), kemudian di-cache oleh pelayar.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className={labelClass} htmlFor="sag-ext-institution">Nama Institusi Asal</label>
              <input
                id="sag-ext-institution"
                list="sag-ext-institution-options"
                value={form.institutionName}
                onChange={event => update({ institutionName: event.target.value })}
                placeholder="Contoh: Ar-Rahnu XChange, Bank Rakyat, Pos Ar-Rahnu"
                className={inputClass}
              />
              <datalist id="sag-ext-institution-options">
                {institutionOptions.map(institution => <option key={institution} value={institution} />)}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="sag-ext-docno">No. Surat Asal (pilihan)</label>
              <input
                id="sag-ext-docno"
                value={form.documentNo}
                onChange={event => update({ documentNo: event.target.value.toUpperCase() })}
                placeholder="Kosongkan untuk jana No. SAG baharu"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="sag-ext-pledge">Jenis Pajakan</label>
              <select
                id="sag-ext-pledge"
                value={form.pledgeType}
                onChange={event => update({ pledgeType: event.target.value })}
                className={inputClass}
              >
                {SAG_PLEDGE_TYPES.map(pledgeType => (
                  <option key={pledgeType} value={pledgeType}>{pledgeType}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="sag-ext-member">Nama Ahli</label>
              <input
                id="sag-ext-member"
                value={form.memberName}
                onChange={event => update({ memberName: event.target.value })}
                placeholder="Seperti pada surat asal"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="sag-ext-ic">No. MyKad Ahli</label>
              <input
                id="sag-ext-ic"
                value={form.memberIcNumber}
                onChange={event => update({ memberIcNumber: event.target.value })}
                placeholder="Contoh: 900101015555"
                inputMode="numeric"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="sag-ext-financing-date">Tarikh Pembiayaan</label>
              <input
                id="sag-ext-financing-date"
                type="date"
                value={form.financingDate}
                onChange={event => update({ financingDate: event.target.value })}
                className={`${inputClass} font-mono`}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="sag-ext-maturity-date">Tarikh Matang (pilihan)</label>
              <input
                id="sag-ext-maturity-date"
                type="date"
                value={form.maturityDate}
                onChange={event => update({ maturityDate: event.target.value })}
                className={`${inputClass} font-mono`}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className={labelClass} htmlFor="sag-ext-term">Tempoh Upah Simpan (bulan)</label>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <input
                  id="sag-ext-term"
                  type="number"
                  min="1"
                  max="24"
                  step="1"
                  value={form.paymentTermMonths}
                  onChange={event => update({ paymentTermMonths: event.target.value })}
                  className={`${inputClass} font-mono sm:max-w-[9rem]`}
                />
                <p className="text-[11px] font-medium text-slate-500">
                  Satu period upah yang dicaj pada surat (lalai {SAG_DEFAULT_PAYMENT_TERM_MONTHS} bulan).
                  Jumlah upah = kadar % × nilai marhun × tempoh ini.
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="sag-ext-marhun">Nilai Marhun (RM)</label>
              <input
                id="sag-ext-marhun"
                type="number"
                min="0"
                step="0.01"
                value={form.marhunValue}
                onChange={event => update({ marhunValue: event.target.value })}
                placeholder="0.00"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="sag-ext-financing">Jumlah Pembiayaan (RM)</label>
              <input
                id="sag-ext-financing"
                type="number"
                min="0"
                step="0.01"
                value={form.financingAmount}
                onChange={event => update({ financingAmount: event.target.value })}
                placeholder="0.00"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className={labelClass} htmlFor="sag-ext-remarks">Catatan / Rujukan (pilihan)</label>
              <textarea
                id="sag-ext-remarks"
                value={form.remarks}
                onChange={event => update({ remarks: event.target.value })}
                rows={2}
                placeholder="Contoh: Surat pindah gadaian untuk pusing dari institusi asal"
                className={`${inputClass} resize-y`}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-full rounded-xl px-4 py-2.5 font-semibold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-40 sm:w-auto"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSaving || scan.status === 'running'}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <UploadCloud size={15} /> {isSaving ? 'Mengimport...' : scan.status === 'running' ? 'Membaca surat...' : 'Import Surat'}
          </button>
        </div>
      </form>
    </div>
  );
}
