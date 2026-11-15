import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Trash2,
  X
} from 'lucide-react';
import {
  SAG_COPY_TYPES,
  SAG_KARAT_OPTIONS,
  SAG_PLEDGE_STATUSES,
  SAG_PLEDGE_TYPES,
  SAG_PRODUCT_DEFAULT,
  SAG_STATUS_OPTIONS,
  SAG_TAWARRUQ_CLAUSES,
  addMonthsToDateOnly,
  createSagMarhunItem,
  formatSagDate,
  formatSagMoney,
  mergeSagMemberContact,
  normalizeSagDocument,
  resolveSagPledgeStatus,
  resolveSagPledgeType,
  roundMoney,
  summarizeSagMarhunItems,
  toDateOnly,
  validateSagDocument,
  type SagDocument,
  type SagDocumentStatus,
  type SagLetterhead,
  type SagMarhunItem,
  type SagMemberSnapshot
} from './sagDocuments';
import { SagLetter } from './SagLetter';

export type SagMemberOption = SagMemberSnapshot & { email?: string };

const fieldClass =
  'w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500';
const labelClass = 'text-[11px] font-bold uppercase tracking-wide text-slate-500';
const sectionClass = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';

const formatInputNumber = (value: number | string | null | undefined) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : '';
};

const assetStatusLabel = (asset: any) => {
  if (asset?.status === 'Dalam Ar-Rahnu') return 'EDR';
  if (asset?.status === 'Ditebus') return 'Ditebus';
  if (asset?.status === 'Dilelong') return 'Dilelong';
  return 'EDT';
};

const formatAssetOption = (asset: any) =>
  [
    asset?.code || asset?.id,
    `${asset?.type || 'Emas'}${asset?.purity ? ` ${asset.purity}` : ''}`,
    `${Number(asset?.weight) || 0}g`,
    asset?.supplier,
    assetStatusLabel(asset)
  ]
    .filter(Boolean)
    .join(' · ');

export function SagDocumentForm({
  initialDocument,
  transactions,
  institutions,
  members,
  letterhead,
  existingNumbers,
  sagDocuments = [],
  assets = [],
  resolveTransactionAssets,
  onClose,
  onSave
}: {
  initialDocument: SagDocument;
  transactions: any[];
  institutions: any[];
  members: SagMemberOption[];
  letterhead: SagLetterhead;
  existingNumbers: string[];
  sagDocuments?: SagDocument[];
  /** Senarai aset daripada modul Asset Record. */
  assets?: any[];
  resolveTransactionAssets: (transaction: any) => any[];
  onClose: () => void;
  onSave: (document: SagDocument) => void;
}) {
  const [form, setForm] = useState<SagDocument>(initialDocument);
  const [errors, setErrors] = useState<string[]>([]);
  const [assetPickerId, setAssetPickerId] = useState('');

  const derived = useMemo(() => normalizeSagDocument(form), [form]);
  const marhunSummary = useMemo(() => summarizeSagMarhunItems(derived.marhunItems), [derived.marhunItems]);
  const usedDocumentNumbers = useMemo(
    () => existingNumbers.filter(number => number !== initialDocument.documentNo),
    [existingNumbers, initialDocument.documentNo]
  );

  const transactionAssets = useMemo(() => {
    const transaction = transactions.find(item => String(item.id) === String(form.transactionId));
    return transaction ? resolveTransactionAssets(transaction) : [];
  }, [transactions, form.transactionId, resolveTransactionAssets]);

  /**
   * Pilihan marhun menggabungkan aset yang dipautkan pada rekod SAG (utama) dengan
   * semua aset lain daripada modul Asset Record, supaya pengguna boleh memaut aset
   * walaupun surat belum dipautkan kepada transaksi.
   */
  const assetOptions = useMemo(() => {
    const usedIds = new Set(derived.marhunItems.map(item => String(item.assetId)));
    const linked = transactionAssets.filter(asset => !usedIds.has(String(asset.id)));
    const linkedIds = new Set(transactionAssets.map(asset => String(asset.id)));
    const others = (assets || []).filter(asset =>
      asset && !asset.deletedAt && !usedIds.has(String(asset.id)) && !linkedIds.has(String(asset.id))
    );
    return { linked, others, all: [...linked, ...others] };
  }, [transactionAssets, assets, derived.marhunItems]);

  const linkedTransaction = useMemo(
    () => transactions.find(item => String(item.id) === String(form.transactionId)),
    [transactions, form.transactionId]
  );

  const defaultMarhunRate = roundMoney(
    derived.marhunItems[0]?.ratePerGram ||
    Number(linkedTransaction?.marhunPrice) ||
    Number(institutions.find(item => item.name === form.institutionName)?.marhunRate) ||
    0
  );

  const previousDocumentOptions = useMemo(
    () => sagDocuments
      .filter(document => !document.deletedAt && String(document.id) !== String(form.id))
      .sort((left, right) => String(right.financingDate || '').localeCompare(String(left.financingDate || ''))),
    [sagDocuments, form.id]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        const submitButton = window.document.getElementById('sag-document-form-submit');
        if (submitButton instanceof HTMLButtonElement) submitButton.click();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const update = (patch: Partial<SagDocument>) => setForm(previous => ({ ...previous, ...patch }));

  const updateMember = (patch: Partial<SagMemberSnapshot>) =>
    setForm(previous => ({ ...previous, member: { ...previous.member, ...patch } }));

  const updateSignature = (patch: Partial<SagDocument['signatures']>) =>
    setForm(previous => ({ ...previous, signatures: { ...previous.signatures, ...patch } }));

  const handleMemberSelect = (userId: string) => {
    const member = members.find(entry => entry.userId === userId);
    if (!member) {
      updateMember({ userId: '' });
      return;
    }
    setForm(previous => {
      const nextMember = mergeSagMemberContact(previous.member, member);
      return {
        ...previous,
        member: nextMember,
        signatures: {
          ...previous.signatures,
          customerName: previous.signatures.customerName || nextMember.name
        }
      };
    });
  };

  const handleTransactionSelect = (value: string) => {
    const transaction = transactions.find(item => String(item.id) === value);
    if (!transaction) {
      update({ transactionId: null, transactionRefNo: '' });
      return;
    }
    const institution = institutions.find(item => item.name === transaction.institution);
    const linkedAssets = resolveTransactionAssets(transaction);
    const financingDate = toDateOnly(transaction.date) || toDateOnly(new Date().toISOString());
    const marhunRate = roundMoney(transaction.marhunPrice ?? institution?.marhunRate ?? 0);
    const items = linkedAssets.map(asset => createSagMarhunItem(asset, marhunRate));
    const parentDocument = transaction.parentTransactionId != null
      ? sagDocuments.find(document =>
        !document.deletedAt && String(document.transactionId) === String(transaction.parentTransactionId))
      : null;

    setForm(previous => ({
      ...previous,
      transactionId: transaction.id ?? null,
      transactionRefNo: String(transaction.refNo || ''),
      institutionId: institution?.id ?? null,
      institutionName: String(institution?.name || transaction.institution || ''),
      pledgeType: resolveSagPledgeType(transaction),
      pledgeStatus: resolveSagPledgeStatus(transaction),
      previousDocumentNo: parentDocument?.documentNo || previous.previousDocumentNo,
      previousTransactionRefNo: parentDocument?.transactionRefNo || String(transaction.parentRefNo || previous.previousTransactionRefNo || ''),
      financingDate,
      maturityDate: toDateOnly(transaction.redemptionDate) || previous.maturityDate,
      paymentTermMonths: Number(transaction.feeTermMonths) > 0 ? Number(transaction.feeTermMonths) : previous.paymentTermMonths,
      purchasePrice: roundMoney(transaction.loan ?? previous.purchasePrice),
      totalProfit: roundMoney(transaction.fee ?? previous.totalProfit),
      marhunValue: items.length
        ? summarizeSagMarhunItems(items).value
        : roundMoney(transaction.marhunValue ?? previous.marhunValue),
      marhunItems: items.length ? items : previous.marhunItems
    }));
  };

  const handleSyncMarhunFromTransaction = () => {
    const transaction = transactions.find(item => String(item.id) === String(form.transactionId));
    if (!transaction) return;
    const linkedAssets = resolveTransactionAssets(transaction);
    if (!linkedAssets.length) return;
    const rate = roundMoney(
      transaction.marhunPrice ??
      (institutions.find(item => item.name === transaction.institution)?.marhunRate ?? 0)
    );
    setForm(previous => ({
      ...previous,
      marhunItems: linkedAssets
        .filter(asset => (parseFloat(asset.weight) || 0) > 0)
        .map(asset => createSagMarhunItem(asset, rate)),
      marhunValue: 0
    }));
  };

  const updateItem = (id: string, patch: Partial<SagMarhunItem>) => {
    setForm(previous => ({
      ...previous,
      marhunItems: previous.marhunItems.map(item => (item.id === id ? { ...item, ...patch } : item))
    }));
  };

  const removeItem = (id: string) => {
    setForm(previous => ({
      ...previous,
      marhunItems: previous.marhunItems.filter(item => item.id !== id)
    }));
  };

  const addAssetItem = () => {
    const asset = assetOptions.all.find(item => String(item.id) === assetPickerId);
    if (!asset) return;
    setForm(previous => ({
      ...previous,
      marhunItems: [...previous.marhunItems, createSagMarhunItem(asset, defaultMarhunRate)]
    }));
    setAssetPickerId('');
  };

  const addManualItem = () => {
    setForm(previous => ({
      ...previous,
      marhunItems: [
        ...previous.marhunItems,
        {
          id: `marhun-manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          assetId: null,
          description: '',
          quantity: 1,
          karat: '22.0K',
          ratePerGram: defaultMarhunRate,
          weight: 0,
          marhunValue: 0
        }
      ]
    }));
  };

  const handleSubmit = (statusOverride?: SagDocumentStatus) => {
    const candidate = normalizeSagDocument({
      ...form,
      status: statusOverride || form.status
    });
    const nextErrors = validateSagDocument(candidate);
    if (usedDocumentNumbers.some(number => String(number).toUpperCase() === candidate.documentNo)) {
      nextErrors.unshift(`No. SAG ${candidate.documentNo} telah digunakan oleh rekod lain.`);
    }
    if (nextErrors.length) {
      setErrors(nextErrors);
      return;
    }
    setErrors([]);
    onSave(candidate);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Borang Surat Akuan Gadaian"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-2 backdrop-blur-sm animate-in fade-in duration-200 sm:p-4"
      onClick={onClose}
    >
      <form
        className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={event => event.stopPropagation()}
        onSubmit={event => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-6">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-800">
                {form.documentNo}
              </span>
              <span className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-600">
                {form.status}
              </span>
              {form.transactionRefNo && (
                <span className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600">
                  SAG #{form.transactionRefNo}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {initialDocument.createdAt && existingNumbers.includes(initialDocument.documentNo)
                ? 'Kemaskini Surat Akuan Gadaian'
                : 'Surat Akuan Gadaian Baharu'}
            </h2>
            <p className="text-xs text-slate-500">
              Lengkapkan butiran ahli, marhun dan nilai pembiayaan. Rekod disambung terus kepada modul transaksi SAG, aset emas dan keahlian ahli.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup borang"
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 custom-scrollbar sm:px-6">
          {errors.length > 0 && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3">
              <p className="text-sm font-bold text-rose-800">Sila lengkapkan maklumat berikut:</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs font-medium text-rose-700">
                {errors.map(error => <li key={error}>{error}</li>)}
              </ul>
            </div>
          )}

          <section className={sectionClass}>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700">
              <FileText size={15} className="text-emerald-600" /> Rujukan Surat
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-document-no">No. SAG</label>
                <input
                  id="sag-document-no"
                  value={form.documentNo}
                  onChange={event => update({ documentNo: event.target.value.toUpperCase() })}
                  className={`${fieldClass} font-mono font-bold`}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-status">Status Dokumen</label>
                <select
                  id="sag-status"
                  value={form.status}
                  onChange={event => update({ status: event.target.value as SagDocumentStatus })}
                  className={fieldClass}
                >
                  {SAG_STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-pledge-type">Jenis Pajakan</label>
                <select
                  id="sag-pledge-type"
                  value={form.pledgeType}
                  onChange={event => update({ pledgeType: event.target.value })}
                  className={fieldClass}
                  required
                >
                  <option value="">Pilih jenis pajakan...</option>
                  {SAG_PLEDGE_TYPES.map(pledgeType => (
                    <option key={pledgeType} value={pledgeType}>{pledgeType}</option>
                  ))}
                </select>
                <p className="text-[11px] font-medium text-slate-500">
                  Jenis transaksi surat ini (Pajakan Asal, Salin, OL, Pusing, tebus atau lelong).
                </p>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-pledge-status">Status Rekod</label>
                <select
                  id="sag-pledge-status"
                  value={form.pledgeStatus}
                  onChange={event => update({ pledgeStatus: event.target.value })}
                  className={fieldClass}
                >
                  {SAG_PLEDGE_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-copy-type">Jenis Salinan</label>
                <select
                  id="sag-copy-type"
                  value={form.copyType}
                  onChange={event => update({ copyType: event.target.value as SagDocument['copyType'] })}
                  className={fieldClass}
                >
                  {SAG_COPY_TYPES.map(copyType => <option key={copyType} value={copyType}>{copyType}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-previous-document">Surat Asal (transaksi sebelum)</label>
                <select
                  id="sag-previous-document"
                  value={form.previousDocumentNo}
                  onChange={event => {
                    const previousDocument = previousDocumentOptions.find(document => document.documentNo === event.target.value);
                    update({
                      previousDocumentNo: previousDocument?.documentNo || '',
                      previousTransactionRefNo: previousDocument?.transactionRefNo || ''
                    });
                  }}
                  className={fieldClass}
                >
                  <option value="">Tiada surat asal</option>
                  {form.previousDocumentNo && !previousDocumentOptions.some(document => document.documentNo === form.previousDocumentNo) && (
                    <option value={form.previousDocumentNo}>
                      {form.previousDocumentNo}
                      {form.previousTransactionRefNo ? ` (#${form.previousTransactionRefNo})` : ''}
                    </option>
                  )}
                  {previousDocumentOptions.map(document => (
                    <option key={document.id} value={document.documentNo}>
                      {document.documentNo} · {document.pledgeType || 'Tanpa jenis'} · {formatSagDate(document.financingDate)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-transaction">Rujuk Rekod SAG (Transaksi)</label>
                <select
                  id="sag-transaction"
                  value={form.transactionId == null ? '' : String(form.transactionId)}
                  onChange={event => handleTransactionSelect(event.target.value)}
                  className={fieldClass}
                >
                  <option value="">Tiada pautan</option>
                  {form.transactionId != null && !transactions.some(transaction => String(transaction.id) === String(form.transactionId)) && (
                    <option value={String(form.transactionId)}>
                      #{form.transactionRefNo || form.transactionId} (rekod tidak tersedia)
                    </option>
                  )}
                  {transactions.map(transaction => (
                    <option key={transaction.id} value={String(transaction.id)}>
                      #{transaction.refNo} · {transaction.institution} · {transaction.type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className={labelClass} htmlFor="sag-product">Produk</label>
                <input
                  id="sag-product"
                  value={form.product}
                  onChange={event => update({ product: event.target.value })}
                  className={fieldClass}
                  placeholder={SAG_PRODUCT_DEFAULT}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className={labelClass} htmlFor="sag-institution">Institusi / Cawangan</label>
                <input
                  id="sag-institution"
                  list="sag-institution-options"
                  value={form.institutionName}
                  onChange={event => update({ institutionName: event.target.value })}
                  className={fieldClass}
                  placeholder="cth. KPDRM - PDRM"
                />
                <datalist id="sag-institution-options">
                  {institutions.map(institution => (
                    <option key={institution.id} value={institution.name} />
                  ))}
                </datalist>
              </div>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500">
              Memilih rekod transaksi akan mengisi institusi, tarikh, nilai pembiayaan dan senarai marhun secara automatik.
            </p>
          </section>

          <section className={sectionClass}>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">Butiran Ahli</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className={labelClass} htmlFor="sag-member">Ahli Berdaftar</label>
                <select
                  id="sag-member"
                  value={form.member.userId}
                  onChange={event => handleMemberSelect(event.target.value)}
                  className={fieldClass}
                >
                  <option value="">Tiada pautan ahli</option>
                  {form.member.userId && !members.some(member => member.userId === form.member.userId) && (
                    <option value={form.member.userId}>
                      {form.member.memberNo ? `${form.member.memberNo} · ` : ''}{form.member.name || form.member.userId}
                    </option>
                  )}
                  {members.map(member => (
                    <option key={member.userId} value={member.userId}>
                      {member.memberNo ? `${member.memberNo} · ` : ''}{member.name || member.email || member.userId}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] font-medium text-slate-500">
                  Nama, No. MyKad dan No. Keahlian diambil daripada modul Keahlian Ahli. Alamat, telefon dan waris disimpan semula ke profil ahli selepas disimpan.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-member-name">Nama</label>
                <input
                  id="sag-member-name"
                  value={form.member.name}
                  onChange={event => updateMember({ name: event.target.value })}
                  className={fieldClass}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-member-ic">No. MyKad</label>
                <input
                  id="sag-member-ic"
                  value={form.member.icNumber}
                  onChange={event => updateMember({ icNumber: event.target.value })}
                  className={`${fieldClass} font-mono`}
                  inputMode="numeric"
                  placeholder="831020-05-6060"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-member-phone">No. Telefon</label>
                <input
                  id="sag-member-phone"
                  value={form.member.phone}
                  onChange={event => updateMember({ phone: event.target.value })}
                  className={fieldClass}
                  placeholder="cth. 0192510942"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-member-heir">Waris</label>
                <input
                  id="sag-member-heir"
                  value={form.member.heirName}
                  onChange={event => updateMember({ heirName: event.target.value })}
                  className={fieldClass}
                  placeholder="Nama waris / penama"
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-member-pobox">No. Kotak</label>
                <input
                  id="sag-member-pobox"
                  value={form.member.poBox}
                  onChange={event => updateMember({ poBox: event.target.value })}
                  className={`${fieldClass} font-mono`}
                  placeholder="cth. A49"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className={labelClass} htmlFor="sag-member-address">Alamat</label>
                <textarea
                  id="sag-member-address"
                  value={form.member.address}
                  onChange={event => updateMember({ address: event.target.value })}
                  className={fieldClass}
                  rows={2}
                  required
                />
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Pembiayaan dan Keuntungan</h3>
              <button
                type="button"
                onClick={handleSyncMarhunFromTransaction}
                disabled={form.transactionId == null || transactionAssets.length === 0}
                title="Bina semula senarai marhun daripada aset emas yang dipautkan pada rekod SAG"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40"
              >
                <RefreshCw size={13} /> Selaras Marhun
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-financing-date">Tarikh Pembiayaan</label>
                <input
                  id="sag-financing-date"
                  type="date"
                  value={toDateOnly(form.financingDate)}
                  onChange={event => {
                    const financingDate = event.target.value;
                    update({
                      financingDate,
                      maturityDate: form.maturityDate || addMonthsToDateOnly(financingDate, form.paymentTermMonths * 3)
                    });
                  }}
                  className={fieldClass}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-term-months">Selang Tempoh Bayaran (bulan)</label>
                <input
                  id="sag-term-months"
                  type="number"
                  min={1}
                  max={24}
                  value={formatInputNumber(form.paymentTermMonths)}
                  onChange={event => update({ paymentTermMonths: Math.max(1, Number(event.target.value) || 1) })}
                  className={fieldClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-maturity-date">Tarikh Matang</label>
                <input
                  id="sag-maturity-date"
                  type="date"
                  value={toDateOnly(form.maturityDate)}
                  onChange={event => update({ maturityDate: event.target.value })}
                  className={fieldClass}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-marhun-value">Nilai Marhun (RM)</label>
                <input
                  id="sag-marhun-value"
                  type="number"
                  step="0.01"
                  min={0}
                  value={formatInputNumber(derived.marhunValue)}
                  onChange={event => update({ marhunValue: Number(event.target.value) || 0 })}
                  className={`${fieldClass} bg-slate-50 font-mono font-bold`}
                  readOnly={derived.marhunItems.length > 0}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-purchase-price">Harga Belian / Nilai Pembiayaan (RM)</label>
                <input
                  id="sag-purchase-price"
                  type="number"
                  step="0.01"
                  min={0}
                  value={formatInputNumber(form.purchasePrice)}
                  onChange={event => update({ purchasePrice: Number(event.target.value) || 0 })}
                  className={`${fieldClass} font-mono font-bold`}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-total-profit">Jumlah Keuntungan (RM)</label>
                <input
                  id="sag-total-profit"
                  type="number"
                  step="0.01"
                  min={0}
                  value={formatInputNumber(form.totalProfit)}
                  onChange={event => update({ totalProfit: Number(event.target.value) || 0 })}
                  className={`${fieldClass} font-mono font-bold`}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-selling-price">Harga Jualan (RM)</label>
                <input
                  id="sag-selling-price"
                  value={formatSagMoney(derived.sellingPrice)}
                  readOnly
                  className={`${fieldClass} bg-slate-50 font-mono font-bold text-emerald-800`}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-payment-due">Tarikh Bayaran (pilihan)</label>
                <input
                  id="sag-payment-due"
                  type="date"
                  value={toDateOnly(form.paymentDueOverride)}
                  onChange={event => update({ paymentDueOverride: event.target.value })}
                  className={fieldClass}
                />
                <p className="text-[11px] font-medium text-slate-500">Kosongkan untuk memaparkan "Sebelum tarikh matang".</p>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-remarks">Catatan Dalaman</label>
                <input
                  id="sag-remarks"
                  value={form.remarks}
                  onChange={event => update({ remarks: event.target.value })}
                  className={fieldClass}
                  placeholder="Nota pegawai (tidak dicetak)"
                />
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-max border-collapse text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-bold">Tempoh</th>
                    <th className="px-3 py-2 font-bold">Tarikh Bayaran</th>
                    <th className="px-3 py-2 text-right font-bold">Hari</th>
                    <th className="px-3 py-2 text-right font-bold">Keuntungan</th>
                    <th className="px-3 py-2 text-right font-bold">Terkumpul</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {derived.profitSchedule.map(period => (
                    <tr key={period.index}>
                      <td className="px-3 py-2 font-bold text-slate-700">{period.label}</td>
                      <td className="px-3 py-2 font-mono">{formatSagDate(period.dueDate)}</td>
                      <td className="px-3 py-2 text-right font-mono">{period.days}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatSagMoney(period.profit)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-800">{formatSagMoney(period.cumulativeProfit)}</td>
                    </tr>
                  ))}
                  {derived.profitSchedule.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-slate-400">
                        Tetapkan tarikh pembiayaan dan tarikh matang untuk menjana jadual keuntungan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Keterangan Marhun</h3>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={assetPickerId}
                  onChange={event => setAssetPickerId(event.target.value)}
                  className="min-w-64 rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-semibold"
                  aria-label="Pilih aset emas daripada modul Asset Record"
                >
                  <option value="">
                    {assetOptions.all.length === 0
                      ? 'Tiada aset tersedia...'
                      : `Pilih aset emas (${assetOptions.all.length})...`}
                  </option>
                  {assetOptions.linked.length > 0 && (
                    <optgroup label="Dipautkan pada rekod SAG ini">
                      {assetOptions.linked.map(asset => (
                        <option key={asset.id} value={String(asset.id)}>
                          {formatAssetOption(asset)}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {assetOptions.others.length > 0 && (
                    <optgroup label="Asset Record">
                      {assetOptions.others.map(asset => (
                        <option key={asset.id} value={String(asset.id)}>
                          {formatAssetOption(asset)}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <button
                  type="button"
                  onClick={addAssetItem}
                  disabled={!assetPickerId}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40"
                >
                  <Plus size={13} /> Tambah Aset
                </button>
                <button
                  type="button"
                  onClick={addManualItem}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <Plus size={13} /> Item Manual
                </button>
              </div>
            </div>

            {assetOptions.others.length > 0 && (
              <p className="mb-2 text-[11px] font-medium text-slate-500">
                {assetOptions.others.length} aset daripada Asset Record tersedia untuk dipautkan sebagai marhun.
                Pilihan disusun mengikut aset yang dipautkan pada rekod SAG terlebih dahulu.
              </p>
            )}
            {assetOptions.all.length === 0 && (
              <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
                {assets.length === 0
                  ? 'Tiada aset dalam Asset Record. Tambah aset emas di modul Asset Record untuk memautkannya di sini, atau guna "Item Manual".'
                  : 'Semua aset dalam Asset Record telah dimasukkan sebagai marhun.'}
              </p>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-max border-collapse text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-2 py-2 font-bold">Bil</th>
                    <th className="px-2 py-2 font-bold">Marhun</th>
                    <th className="px-2 py-2 font-bold">Kuantiti</th>
                    <th className="px-2 py-2 font-bold">Karat</th>
                    <th className="px-2 py-2 font-bold">Harga (RM/g)</th>
                    <th className="px-2 py-2 font-bold">Berat (g)</th>
                    <th className="px-2 py-2 text-right font-bold">N. Marhun</th>
                    <th className="px-2 py-2 text-center font-bold">Buang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {form.marhunItems.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-2 py-1.5 text-center font-mono text-slate-500">{index + 1}</td>
                      <td className="px-2 py-1.5">
                        <input
                          value={item.description}
                          onChange={event => updateItem(item.id, { description: event.target.value })}
                          className="w-full min-w-48 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                          placeholder="cth. Gold Bar (KPD-001)"
                          aria-label={`Keterangan marhun ${index + 1}`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={1}
                          value={formatInputNumber(item.quantity)}
                          onChange={event => updateItem(item.id, { quantity: Number(event.target.value) || 0 })}
                          className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-xs font-mono"
                          aria-label={`Kuantiti marhun ${index + 1}`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={item.karat}
                          onChange={event => updateItem(item.id, { karat: event.target.value })}
                          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-mono"
                          aria-label={`Karat marhun ${index + 1}`}
                        >
                          {SAG_KARAT_OPTIONS.map(karat => <option key={karat} value={karat}>{karat}</option>)}
                          {!SAG_KARAT_OPTIONS.includes(item.karat) && <option value={item.karat}>{item.karat}</option>}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={formatInputNumber(item.ratePerGram)}
                          onChange={event => updateItem(item.id, { ratePerGram: Number(event.target.value) || 0 })}
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-xs font-mono"
                          aria-label={`Harga per gram marhun ${index + 1}`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={formatInputNumber(item.weight)}
                          onChange={event => updateItem(item.id, { weight: Number(event.target.value) || 0 })}
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-xs font-mono"
                          aria-label={`Berat marhun ${index + 1}`}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono font-bold text-emerald-800">
                        {formatSagMoney(item.quantity * item.weight * item.ratePerGram)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="rounded-lg p-1.5 text-rose-600 transition-colors hover:bg-rose-50"
                          aria-label={`Buang marhun ${index + 1}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {form.marhunItems.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-4 text-center text-slate-400">
                        Belum ada marhun. Pilih aset emas daripada Asset Record di atas, atau tambah item secara manual.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 text-xs font-bold text-slate-700">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-right uppercase">Jumlah Marhun Keseluruhan</td>
                    <td className="px-2 py-2 text-center font-mono">{marhunSummary.quantity}</td>
                    <td />
                    <td />
                    <td className="px-2 py-2 text-right font-mono">{marhunSummary.weight.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right font-mono text-emerald-800">{formatSagMoney(marhunSummary.value)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className={sectionClass}>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">Akad Tawarruq, Akuan dan Tandatangan</h3>
            <div className="space-y-2">
              {SAG_TAWARRUQ_CLAUSES.map(clause => {
                const agreed = Boolean(form.tawarruq?.[clause.key]);
                return (
                  <label
                    key={clause.key}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                      agreed ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={event => update({
                        tawarruq: { ...form.tawarruq, [clause.key]: event.target.checked }
                      })}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold uppercase tracking-wide text-slate-700">{clause.title}</span>
                      <span className="mt-0.5 block text-[11px] font-medium leading-relaxed text-slate-600">{clause.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Pelanggan</p>
                <input
                  value={form.signatures.customerName}
                  onChange={event => updateSignature({ customerName: event.target.value })}
                  className={fieldClass}
                  placeholder="Nama penandatangan"
                  aria-label="Nama penandatangan pelanggan"
                />
                <input
                  type="date"
                  value={toDateOnly(form.signatures.customerSignedAt)}
                  onChange={event => updateSignature({ customerSignedAt: event.target.value })}
                  className={fieldClass}
                  aria-label="Tarikh tandatangan pelanggan"
                />
              </div>
              <div className="space-y-1.5 rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Pihak Ar-Rahnu</p>
                <input
                  value={form.signatures.officerName}
                  onChange={event => updateSignature({ officerName: event.target.value })}
                  className={fieldClass}
                  placeholder={letterhead.officerName || 'Nama pegawai'}
                  aria-label="Nama pegawai Ar-Rahnu"
                />
                <input
                  type="date"
                  value={toDateOnly(form.signatures.officerSignedAt)}
                  onChange={event => updateSignature({ officerSignedAt: event.target.value })}
                  className={fieldClass}
                  aria-label="Tarikh tandatangan pegawai"
                />
              </div>
              <div className="space-y-1.5 rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Saksi</p>
                <input
                  value={form.signatures.witnessName}
                  onChange={event => updateSignature({ witnessName: event.target.value })}
                  className={fieldClass}
                  placeholder={letterhead.witnessName || 'Nama saksi'}
                  aria-label="Nama saksi"
                />
                <input
                  type="date"
                  value={toDateOnly(form.signatures.witnessSignedAt)}
                  onChange={event => updateSignature({ witnessSignedAt: event.target.value })}
                  className={fieldClass}
                  aria-label="Tarikh tandatangan saksi"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="text-[11px] font-medium text-slate-500">
            [ Esc ] batal · [ Ctrl + Enter ] simpan
          </span>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl px-4 py-2.5 font-semibold text-slate-600 transition-colors hover:bg-slate-200 sm:w-auto"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('Dikeluarkan')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 font-bold text-emerald-800 transition-colors hover:bg-emerald-100 sm:w-auto"
            >
              <Check size={15} /> Simpan &amp; Keluarkan
            </button>
            <button
              id="sag-document-form-submit"
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 sm:w-auto"
            >
              <Save size={15} /> Simpan
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export function SagLetterOverlay({
  document: sagDocument,
  letterhead,
  onClose
}: {
  document: SagDocument;
  letterhead: SagLetterhead;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="sag-print-overlay" role="dialog" aria-modal="true" aria-label="Pratonton Surat Akuan Gadaian">
      <div className="sag-print-toolbar sag-no-print">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-corporate-teal-300">Pratonton Surat Akuan Gadaian</p>
          <p className="truncate text-sm font-bold text-white">{sagDocument.documentNo} · {sagDocument.member.name || 'Tanpa nama ahli'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-200 sm:inline-flex">
            {sagDocument.copyType}
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-500"
          >
            <Printer size={15} /> Cetak / Simpan PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
          >
            <X size={15} /> Tutup
          </button>
        </div>
      </div>
      <div className="sag-print-stage">
        <div className="sag-print-paper">
          <SagLetter document={sagDocument} letterhead={letterhead} />
        </div>
      </div>
    </div>,
    window.document.body
  );
}
