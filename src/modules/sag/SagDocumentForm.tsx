import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  Save,
  ScanText,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import {
  SAG_CONTRACT_VERSION,
  SAG_COPY_TYPES,
  SAG_FEE_BASIS_OPTIONS,
  SAG_KARAT_OPTIONS,
  SAG_PLEDGE_STATUSES,
  SAG_PLEDGE_TYPES,
  SAG_PRODUCT_DEFAULT,
  SAG_STATUS_OPTIONS,
  SAG_TAWARRUQ_CLAUSES,
  SAG_UJRAH_DISALLOWED_MESSAGE,
  addMonthsToDateOnly,
  buildSagContractConsent,
  calculateSagFinancing,
  calculateSagStorageFee,
  createSagMarhunItem,
  evaluateSagCustomerExposure,
  formatSagDate,
  formatSagMoney,
  normalizeSagDocument,
  normalizeSagFeeBasis,
  resolveSagPledgeStatus,
  resolveSagPledgeType,
  resolveSagKaratFineness,
  roundMoney,
  summarizeSagMarhunItems,
  toDateOnly,
  validateSagDocument,
  type SagAuditActor,
  type SagDocument,
  type SagDocumentStatus,
  type SagLetterhead,
  type SagMarhunItem,
  type SagMemberSnapshot
} from './sagDocuments';
import { SagLetter } from './SagLetter';
import { extractSagImportText } from '../../lib/sag-import-ocr';
import { parseSagImportText } from '../../lib/sag-import-parser';

export type SagMemberOption = SagMemberSnapshot & { email?: string };

const fieldClass =
  'w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500';
const labelClass = 'text-[11px] font-bold uppercase tracking-wide text-slate-500';
const sectionClass = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';

const formatInputNumber = (value: number | string | null | undefined) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : '';
};

/** Timestamp penuh (bukan tarikh sahaja) untuk jejak Ijab & Qabul. */
const formatConsentTimestamp = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat('ms-MY', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Kuala_Lumpur'
  }).format(parsed) + ' MYT';
};

const assetStatusLabel = (asset: any) => {
  if (asset?.status === 'Dalam Ar-Rahnu') return 'EDR';
  if (asset?.status === 'Ditebus') return 'Ditebus';
  if (asset?.status === 'Dilelong') return 'Dilelong';
  return 'EDT';
};

const emptyMemberContact: SagMemberSnapshot = {
  userId: '',
  memberNo: '',
  name: '',
  icNumber: '',
  address: '',
  phone: '',
  heirName: '',
  poBox: ''
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
  loadMemberProfile,
  acceptanceActor = null,
  onLoadAttachmentFiles,
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
  /** Ambil butiran profil ahli (telefon/alamat/waris) apabila daftar keahlian belum menyimpannya. */
  loadMemberProfile?: (userId: string) => Promise<Partial<SagMemberSnapshot> | null>;
  /** Pelaku yang menerima pengesahan Ijab & Qabul (direkod bersama timestamp). */
  acceptanceActor?: SagAuditActor | null;
  /** Muat turun fail surat yang dilampirkan untuk diimbas semula. */
  onLoadAttachmentFiles?: () => Promise<File[]>;
  onClose: () => void;
  onSave: (document: SagDocument) => void;
}) {
  const [form, setForm] = useState<SagDocument>(initialDocument);
  const [errors, setErrors] = useState<string[]>([]);
  const [isScanningAttachment, setIsScanningAttachment] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ tone: 'info' | 'success' | 'error'; message: string } | null>(null);
  const [isImportingMarhun, setIsImportingMarhun] = useState(false);
  const [marhunImportFeedback, setMarhunImportFeedback] = useState<{ tone: 'info' | 'success' | 'error'; message: string } | null>(null);
  const marhunImportInputRef = useRef<HTMLInputElement | null>(null);
  const [assetPickerId, setAssetPickerId] = useState('');
  const [isLoadingMemberProfile, setIsLoadingMemberProfile] = useState(false);
  const selectedMemberUserIdRef = useRef('');

  const derived = useMemo(() => normalizeSagDocument(form), [form]);
  // Had pendedahan seorang pelanggan (terkumpul + harian).
  const exposure = useMemo(
    () => evaluateSagCustomerExposure({ documents: sagDocuments, candidate: derived }),
    [sagDocuments, derived]
  );
  const selectedMemberRecord = useMemo(
    () => members.find(entry => entry.userId === form.member.userId) || null,
    [members, form.member.userId]
  );
  const memberHasContact = Boolean(form.member.phone || form.member.address || form.member.heirName);

  // Upah simpan (akad ijarah) dikira daripada marhun/perkhidmatan — BUKAN jumlah pembiayaan.
  const marhunWeight = useMemo(
    () => summarizeSagMarhunItems(derived.marhunItems).weight,
    [derived.marhunItems]
  );
  const feeSummary = useMemo(
    () => calculateSagStorageFee({
      feeRate: derived.feeRate,
      feeBasis: derived.feeBasis,
      termMonths: derived.paymentTermMonths,
      marhunValue: derived.marhunValue,
      marhunWeight,
      fixedMonthly: derived.ujrahFixedMonthly,
      sellingPrice: derived.sellingPrice
    }),
    [derived.feeRate, derived.feeBasis, derived.paymentTermMonths, derived.marhunValue, derived.ujrahFixedMonthly, derived.sellingPrice, marhunWeight]
  );
  const financingFromMargin = useMemo(
    () => calculateSagFinancing(derived.marhunValue, form.margin),
    [derived.marhunValue, form.margin]
  );
  // Hanya pembiayaan diisi. Upah simpan TIDAK dimasukkan ke dalam keuntungan/harga jualan.
  const applyCalculatedFinancing = () => {
    update({ purchasePrice: financingFromMargin });
  };
  const feeBasisUnitLabel = derived.feeBasis === 'beratMarhun'
    ? 'RM/g sebulan'
    : derived.feeBasis === 'kadarTetap'
      ? 'RM sebulan'
      : '% sebulan';
  const feeBasisHint = feeSummary.basis === 'beratMarhun'
    ? `${formatInputNumber(feeSummary.basisAmount)} g × RM ${formatInputNumber(derived.feeRate)}/g`
    : feeSummary.basis === 'kadarTetap'
      ? 'Caj perkhidmatan tetap'
      : `RM ${formatInputNumber(feeSummary.basisAmount)} × ${formatInputNumber(derived.feeRate)}%`;
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

  /** Petakan hasil imbasan surat ke dalam borang kemaskini. */
  const applyScannedDocument = (parsed: ReturnType<typeof parseSagImportText>) => {
    const fields = parsed.fields;
    setForm(previous => {
      const next: SagDocument = { ...previous };
      if (fields.institutionName) next.institutionName = fields.institutionName;
      if (fields.documentNo) next.documentNo = fields.documentNo.toUpperCase();
      if (fields.accountNo) next.accountNo = fields.accountNo;
      if (fields.commodityCertificateNo) next.commodityCertificateNo = fields.commodityCertificateNo;
      if (fields.pledgeType && SAG_PLEDGE_TYPES.includes(fields.pledgeType)) next.pledgeType = fields.pledgeType;
      if (fields.financingDate) next.financingDate = fields.financingDate;
      if (fields.maturityDate) next.maturityDate = fields.maturityDate;
      const memberPatch: Partial<SagMemberSnapshot> = {};
      if (fields.memberName) memberPatch.name = fields.memberName;
      if (fields.memberIcNumber) memberPatch.icNumber = fields.memberIcNumber;
      if (fields.memberPhone) memberPatch.phone = fields.memberPhone;
      if (fields.memberAddress) memberPatch.address = fields.memberAddress;
      if (fields.heirName) memberPatch.heirName = fields.heirName;
      if (fields.poBox) memberPatch.poBox = fields.poBox;
      if (Object.keys(memberPatch).length) next.member = { ...next.member, ...memberPatch };
      if (fields.marhunValue && fields.marhunValue > 0) {
        next.marhunValue = fields.marhunValue;
        next.marhunValueOverride = fields.marhunValue;
      }
      if (fields.financingAmount && fields.financingAmount > 0) next.purchasePrice = fields.financingAmount;
      if (fields.profitAmount !== undefined) next.totalProfit = fields.profitAmount;
      if (fields.feeBasis) next.feeBasis = fields.feeBasis;
      if (fields.feeRate !== undefined) next.feeRate = fields.feeRate;
      if (fields.previousRedemption !== undefined) next.previousRedemption = fields.previousRedemption;
      if (fields.profitPaymentAmount !== undefined) next.profitPaymentAmount = fields.profitPaymentAmount;
      if (fields.profitPaymentMonths !== undefined) next.profitPaymentMonths = fields.profitPaymentMonths;
      if (fields.marhunItems?.length) {
        next.marhunItems = fields.marhunItems.map((item, index) => ({
          id: `scan-${Date.now()}-${index}`,
          assetId: null,
          description: item.description,
          quantity: item.quantity,
          karat: item.karat,
          ratePerGram: item.ratePerGram,
          weight: item.weight,
          marhunValue: item.marhunValue,
          fineness: item.fineness ?? undefined
        }));
        next.marhunValueOverride = fields.marhunValue ?? next.marhunValueOverride;
      }
      return next;
    });
  };

  /** Imbas semula fail surat asal yang dilampirkan pada rekod ini. */
  const handleScanAttachment = async () => {
    if (!onLoadAttachmentFiles || isScanningAttachment) return;
    setIsScanningAttachment(true);
    setScanFeedback({ tone: 'info', message: 'Membaca fail surat...' });
    try {
      const files = await onLoadAttachmentFiles();
      if (!files.length) throw new Error('Tiada fail lampiran surat untuk dibaca.');
      const extraction = await extractSagImportText(files, (message, progress) => {
        setScanFeedback({
          tone: 'info',
          message: progress !== undefined ? `${message} (${Math.round(progress * 100)}%)` : message
        });
      });
      const parsed = parseSagImportText(extraction.text);
      applyScannedDocument(parsed);
      setScanFeedback({
        tone: 'success',
        message: `Data surat dibaca (${parsed.matchedLabels.length} medan` +
          `${parsed.fields.marhunItems?.length ? `, ${parsed.fields.marhunItems.length} item marhun` : ''}). Sila semak sebelum simpan.`
      });
    } catch (error) {
      setScanFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Pembacaan fail gagal.'
      });
    } finally {
      setIsScanningAttachment(false);
    }
  };

  /**
   * Import HANYA jadual Keterangan Marhun daripada fail surat institusi lain
   * (PDF/imej). Medan lain pada borang tidak diubah.
   */
  const handleImportMarhunFiles = async (files: File[]) => {
    if (!files.length || isImportingMarhun) return;
    setIsImportingMarhun(true);
    setMarhunImportFeedback({ tone: 'info', message: 'Membaca jadual Keterangan Marhun...' });
    try {
      const extraction = await extractSagImportText(files, (message, progress) => {
        setMarhunImportFeedback({
          tone: 'info',
          message: progress !== undefined ? `${message} (${Math.round(progress * 100)}%)` : message
        });
      });
      const parsed = parseSagImportText(extraction.text);
      const importedFromLetter = parsed.fields.marhunItems || [];
      if (!importedFromLetter.length) {
        setMarhunImportFeedback({
          tone: 'error',
          message: 'Jadual Keterangan Marhun tidak ditemui dalam fail ini. Gunakan PDF asal atau imej yang lebih jelas.'
        });
        return;
      }
      const importedItems: SagMarhunItem[] = importedFromLetter.map((item, index) => ({
        id: `import-marhun-${Date.now()}-${index}`,
        assetId: null,
        description: item.description,
        quantity: item.quantity,
        karat: item.karat,
        ratePerGram: roundMoney(item.ratePerGram),
        weight: roundMoney(item.weight),
        marhunValue: roundMoney(item.marhunValue),
        fineness: item.fineness ?? undefined
      }));
      const totals = summarizeSagMarhunItems(importedItems);
      const letterTotal = Number(parsed.fields.marhunValue) > 0
        ? roundMoney(parsed.fields.marhunValue)
        : roundMoney(totals.value);
      setForm(previous => ({
        ...previous,
        marhunItems: importedItems,
        marhunValue: letterTotal,
        marhunValueOverride: letterTotal
      }));
      setErrors([]);
      const mismatch = Math.abs(totals.value - letterTotal) > 0.05;
      setMarhunImportFeedback({
        tone: mismatch ? 'info' : 'success',
        message: `Keterangan Marhun diimport: ${importedItems.length} item · ${totals.weight.toFixed(2)} g · ` +
          `${formatSagMoney(totals.value)}` +
          (mismatch ? ` (surat: ${formatSagMoney(letterTotal)} — sila semak item).` : '.')
      });
    } catch (error) {
      setMarhunImportFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Import Keterangan Marhun gagal.'
      });
    } finally {
      setIsImportingMarhun(false);
    }
  };

  /**
   * Memilih ahli mesti menggantikan butiran di bawah sepenuhnya. Jika rekod ahli tiada
   * alamat/telefon/waris, medan tersebut dikosongkan dan tidak dikekalkan daripada
   * pilihan ahli sebelumnya.
   */
  const handleMemberSelect = (userId: string) => {
    const member = userId ? members.find(entry => entry.userId === userId) : null;
    selectedMemberUserIdRef.current = userId;
    setForm(previous => {
      const nextMember: SagMemberSnapshot = member
        ? {
            userId: member.userId,
            memberNo: member.memberNo || '',
            name: member.name || '',
            icNumber: member.icNumber || '',
            address: member.address || '',
            phone: member.phone || '',
            heirName: member.heirName || '',
            poBox: member.poBox || ''
          }
        : { ...emptyMemberContact };
      const signatureWasAuto = !previous.signatures.customerName ||
        previous.signatures.customerName === previous.member.name;
      return {
        ...previous,
        member: nextMember,
        signatures: {
          ...previous.signatures,
          customerName: signatureWasAuto ? nextMember.name : previous.signatures.customerName
        }
      };
    });

    // Daftar keahlian mungkin belum menyimpan telefon/alamat/waris ahli, sedangkan
    // butiran itu ada dalam profil ahli. Ambil daripada profil dan isi medan kosong.
    const needsProfile = Boolean(member && loadMemberProfile &&
      (!member.address || !member.phone || !member.heirName));
    setIsLoadingMemberProfile(needsProfile);
    if (!member || !needsProfile || !loadMemberProfile) return;
    void loadMemberProfile(userId)
      .then(profile => {
        if (!profile || selectedMemberUserIdRef.current !== userId) return;
        setForm(previous => {
          if (String(previous.member.userId) !== userId) return previous;
          const fill = (current: string, incoming?: string) =>
            String(current || '').trim() || String(incoming || '').trim();
          const nextMember: SagMemberSnapshot = {
            ...previous.member,
            name: fill(previous.member.name, profile.name),
            icNumber: fill(previous.member.icNumber, profile.icNumber),
            memberNo: fill(previous.member.memberNo, profile.memberNo),
            phone: fill(previous.member.phone, profile.phone),
            address: fill(previous.member.address, profile.address),
            heirName: fill(previous.member.heirName, profile.heirName)
          };
          const signatureWasAuto = !previous.signatures.customerName ||
            previous.signatures.customerName === previous.member.name;
          return {
            ...previous,
            member: nextMember,
            signatures: {
              ...previous.signatures,
              customerName: signatureWasAuto ? nextMember.name : previous.signatures.customerName
            }
          };
        });
      })
      .catch(() => undefined)
      .finally(() => {
        if (selectedMemberUserIdRef.current === userId) setIsLoadingMemberProfile(false);
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
      margin: roundMoney(transaction.margin ?? institution?.maxMargin ?? previous.margin),
      feeRate: roundMoney(transaction.feeRate ?? previous.feeRate),
      feeBasis: transaction.feeBasis !== undefined
        ? normalizeSagFeeBasis(transaction.feeBasis)
        : previous.feeBasis,
      // Tebus surat asal diambil daripada surat terdahulu (harga jualan + ujrah),
      // bukan tebus surat ini.
      previousRedemption: parentDocument
        ? roundMoney(
          parentDocument.redemptionTotal ||
          parentDocument.sellingPrice ||
          roundMoney((parentDocument.purchasePrice || 0) + (parentDocument.totalProfit || 0))
        )
        : 0,
      purchasePrice: roundMoney(transaction.loan ?? previous.purchasePrice),
      // `transaction.fee` ialah caj simpanan (ujrah), bukan keuntungan jualan.
      // Ribh murabahah dikekalkan daripada surat dan tidak diambil daripada lejar.
      totalProfit: previous.totalProfit,
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
      marhunValueOverride: null,
      marhunItems: linkedAssets
        .filter(asset => (parseFloat(asset.weight) || 0) > 0)
        .map(asset => createSagMarhunItem(asset, rate)),
      marhunValue: 0
    }));
  };

  const updateItem = (id: string, patch: Partial<SagMarhunItem>) => {
    setForm(previous => ({
      ...previous,
      marhunValueOverride: null,
      marhunItems: previous.marhunItems.map(item => {
        if (item.id !== id) return item;
        // Menukar karat mesti menukar kadar efektif mengikut faktor ketulenan
        // supaya nilai marhun tidak terlebih nilai (mis. 18K dikira kadar 999).
        if (patch.karat && !('ratePerGram' in patch)) {
          const oldFineness = Number(item.fineness) > 0
            ? Number(item.fineness)
            : resolveSagKaratFineness(item.karat);
          const nextFineness = resolveSagKaratFineness(patch.karat);
          if (oldFineness && nextFineness) {
            const baseRate = item.ratePerGram / oldFineness;
            const nextRate = roundMoney(baseRate * nextFineness);
            return {
              ...item,
              ...patch,
              fineness: nextFineness,
              ratePerGram: nextRate,
              marhunValue: roundMoney(item.quantity * item.weight * nextRate)
            };
          }
        }
        return { ...item, ...patch };
      })
    }));
  };

  const removeItem = (id: string) => {
    setForm(previous => ({
      ...previous,
      marhunValueOverride: null,
      marhunItems: previous.marhunItems.filter(item => item.id !== id)
    }));
  };

  const addAssetItem = () => {
    const asset = assetOptions.all.find(item => String(item.id) === assetPickerId);
    if (!asset) return;
    setForm(previous => ({
      ...previous,
      marhunValueOverride: null,
      marhunItems: [...previous.marhunItems, createSagMarhunItem(asset, defaultMarhunRate)]
    }));
    setAssetPickerId('');
  };

  const addManualItem = () => {
    // Item manual juga mesti mengambil kira ketulenan: kadar institusi ialah
    // kadar emas tulen, jadi kadar efektif = kadar tulen × fineness karat.
    const fineness = resolveSagKaratFineness('22.0K') ?? 0.916;
    const effectiveRate = roundMoney(defaultMarhunRate * fineness);
    setForm(previous => ({
      ...previous,
      marhunValueOverride: null,
      marhunItems: [
        ...previous.marhunItems,
        {
          id: `marhun-manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          assetId: null,
          description: '',
          quantity: 1,
          karat: '22.0K',
          ratePerGram: effectiveRate,
          weight: 0,
          marhunValue: 0,
          fineness
        }
      ]
    }));
  };

  const handleSubmit = (statusOverride?: SagDocumentStatus) => {
    const nextStatus = statusOverride || form.status;
    const contractVersion = form.contractVersion || SAG_CONTRACT_VERSION;
    // Jejak penerimaan terma hanya direkod apabila surat dikeluarkan — bukan Draf.
    const consent = nextStatus === 'Draf'
      ? form.consent
      : buildSagContractConsent({
          documentNo: form.documentNo,
          tawarruq: form.tawarruq,
          acceptedBy: acceptanceActor,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          contractVersion,
          previousConsent: form.consent
        });
    const candidate = normalizeSagDocument({
      ...form,
      status: nextStatus,
      contractVersion,
      consent
    });
    const nextErrors = validateSagDocument(candidate);
    // Had pendedahan pelanggan hanya disemak untuk surat yang dikeluarkan.
    if (nextStatus !== 'Draf') {
      evaluateSagCustomerExposure({ documents: sagDocuments, candidate })
        .violations.forEach(violation => nextErrors.push(violation));
    }
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
          <div className="flex items-center gap-2">
            {onLoadAttachmentFiles && (
              <button
                type="button"
                onClick={() => void handleScanAttachment()}
                disabled={isScanningAttachment}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-300 bg-white px-3 py-2 text-[11px] font-bold text-cyan-800 transition-colors hover:bg-cyan-50 disabled:opacity-50"
                title="Baca semula fail surat yang dilampirkan dan isi semula borang"
              >
                <ScanText size={14} className={isScanningAttachment ? 'animate-pulse' : ''} />
                <span>{isScanningAttachment ? 'Membaca...' : 'Baca & Isi Automatik'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup borang"
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 custom-scrollbar sm:px-6">
          {scanFeedback && (
            <div
              role="status"
              className={`rounded-xl border p-3 text-xs font-semibold ${scanFeedback.tone === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : scanFeedback.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-cyan-200 bg-cyan-50 text-cyan-900'}`}
            >
              {scanFeedback.message}
            </div>
          )}
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
                <label className={labelClass} htmlFor="sag-account-no">No. Akaun Institusi</label>
                <input
                  id="sag-account-no"
                  value={form.accountNo || ''}
                  onChange={event => update({ accountNo: event.target.value.toUpperCase() })}
                  className={`${fieldClass} font-mono`}
                  placeholder="cth. 0030008733"
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-commodity-no">No. Sijil Komoditi</label>
                <input
                  id="sag-commodity-no"
                  value={form.commodityCertificateNo || ''}
                  onChange={event => update({ commodityCertificateNo: event.target.value.toUpperCase() })}
                  className={`${fieldClass} font-mono`}
                  placeholder="cth. CPO04MAR26-0001536-000"
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
                      previousTransactionRefNo: previousDocument?.transactionRefNo || '',
                      // Jumlah tebus surat asal menjadi asas unjuran lebihan tunai surat susulan.
                      previousRedemption: previousDocument
                        ? roundMoney(
                          previousDocument.redemptionTotal ||
                          previousDocument.sellingPrice ||
                          roundMoney((previousDocument.purchasePrice || 0) + (previousDocument.totalProfit || 0))
                        )
                        : 0
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
                  {!form.member.userId
                    ? 'Nama, No. MyKad dan No. Keahlian diambil daripada modul Keahlian Ahli. Alamat, telefon dan waris disimpan semula ke profil ahli selepas disimpan.'
                    : isLoadingMemberProfile
                      ? 'Memuatkan butiran profil ahli daripada modul Keahlian Ahli...'
                      : memberHasContact
                        ? 'Alamat, telefon dan waris diambil daripada rekod ahli. Perubahan akan disimpan semula ke profil ahli selepas surat disimpan.'
                        : !selectedMemberRecord
                          ? 'Ahli ini tidak lagi wujud dalam senarai Keahlian Ahli. Butiran di bawah dikekalkan daripada surat ini.'
                          : 'Tiada rekod alamat, telefon atau waris bagi ahli ini dalam Keahlian Ahli. Isi maklumat baharu dan ia akan disimpan semula ke profil ahli selepas surat disimpan.'}
                </p>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-member-name">Nama</label>
                <input
                  id="sag-member-name"
                  value={form.member.name}
                  onChange={event => updateMember({ name: event.target.value })}
                  className={fieldClass}
                  required={form.status !== 'Draf'}
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
                  required={form.status !== 'Draf'}
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
                  required={form.status !== 'Draf'}
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
                <label className={labelClass} htmlFor="sag-member-pobox">No. Peti/Kotak Simpanan</label>
                <input
                  id="sag-member-pobox"
                  value={form.member.poBox}
                  onChange={event => updateMember({ poBox: event.target.value })}
                  className={`${fieldClass} font-mono`}
                  placeholder="cth. A49"
                  aria-describedby="sag-member-pobox-help"
                />
                <p id="sag-member-pobox-help" className="text-[11px] font-medium text-slate-500">
                  Nombor peti/kotak tempat marhun disimpan, seperti pada resit institusi. Pilihan — biarkan kosong jika tidak berkenaan. Surat akan mencetaknya pada baris <span className="font-semibold">No Kotak</span>.
                </p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className={labelClass} htmlFor="sag-member-address">Alamat</label>
                <textarea
                  id="sag-member-address"
                  value={form.member.address}
                  onChange={event => updateMember({ address: event.target.value })}
                  className={fieldClass}
                  rows={2}
                  required={form.status !== 'Draf'}
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
                  onChange={event => update({ marhunValue: Number(event.target.value) || 0, marhunValueOverride: null })}
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
                <label className={labelClass} htmlFor="sag-total-profit">Keuntungan Jualan / Ribh (RM)</label>
                <input
                  id="sag-total-profit"
                  type="number"
                  step="0.01"
                  min={0}
                  value={formatInputNumber(form.totalProfit)}
                  onChange={event => update({ totalProfit: Number(event.target.value) || 0 })}
                  className={`${fieldClass} font-mono font-bold`}
                />
                <p className="text-[11px] font-medium text-slate-500">Tidak termasuk upah simpan (akad ijarah).</p>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-profit-payment-months">Bayaran Keuntungan Setiap (bulan)</label>
                <input
                  id="sag-profit-payment-months"
                  type="number"
                  min={1}
                  max={24}
                  step={1}
                  value={formatInputNumber(form.profitPaymentMonths ?? 6)}
                  onChange={event => update({ profitPaymentMonths: Math.max(1, Math.min(24, Number(event.target.value) || 6)) })}
                  className={`${fieldClass} font-mono`}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-profit-payment-amount">Jumlah Bayaran Keuntungan (RM)</label>
                <input
                  id="sag-profit-payment-amount"
                  type="number"
                  step="0.01"
                  min={0}
                  value={formatInputNumber(form.profitPaymentAmount ?? 0)}
                  onChange={event => update({ profitPaymentAmount: Number(event.target.value) || 0 })}
                  className={`${fieldClass} font-mono`}
                />
                <p className="text-[11px] font-medium text-slate-500">Seperti tercetak: “Jumlah Bayaran Keuntungan setiap X bulan”.</p>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-margin">Margin Pembiayaan (%)</label>
                <input
                  id="sag-margin"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={formatInputNumber(form.margin)}
                  onChange={event => update({ margin: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })}
                  className={`${fieldClass} font-mono`}
                />
                <p className="text-[11px] font-medium text-slate-500">Pembiayaan = nilai marhun × margin.</p>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-fee-basis">Asas Upah Simpan (Akad Ijarah)</label>
                <select
                  id="sag-fee-basis"
                  value={form.feeBasis}
                  onChange={event => update({ feeBasis: event.target.value as typeof form.feeBasis })}
                  className={fieldClass}
                >
                  <option value="">Belum ditetapkan</option>
                  {SAG_FEE_BASIS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                  {/* Rekod warisan yang masih menggunakan asas pembiayaan ditunjuk supaya boleh dibetulkan. */}
                  {normalizeSagFeeBasis(form.feeBasis) === 'jumlahPembiayaan' && (
                    <option value="jumlahPembiayaan">Jumlah Pembiayaan (tidak dibenarkan)</option>
                  )}
                </select>
                <p className="text-[11px] font-medium text-slate-500">
                  {SAG_FEE_BASIS_OPTIONS.find(option => option.value === normalizeSagFeeBasis(form.feeBasis))?.hint
                    || 'Upah simpan mesti berasaskan marhun atau caj perkhidmatan fizikal.'}
                </p>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-fee-rate">
                  {normalizeSagFeeBasis(form.feeBasis) === 'kadarTetap' ? 'Kadar Tetap (RM sebulan)' : `Kadar Upah Simpan (${feeBasisUnitLabel})`}
                </label>
                <input
                  id="sag-fee-rate"
                  type="number"
                  step="0.01"
                  min={0}
                  value={formatInputNumber(form.feeRate)}
                  onChange={event => update({ feeRate: Math.max(0, Number(event.target.value) || 0) })}
                  className={`${fieldClass} font-mono`}
                  disabled={normalizeSagFeeBasis(form.feeBasis) === 'kadarTetap'}
                />
                {normalizeSagFeeBasis(form.feeBasis) === 'jumlahPembiayaan' && (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] font-semibold text-rose-700">
                    {SAG_UJRAH_DISALLOWED_MESSAGE}
                  </p>
                )}
              </div>
              {normalizeSagFeeBasis(form.feeBasis) === 'kadarTetap' && (
                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="sag-ujrah-fixed">Caj Perkhidmatan Tetap (RM sebulan)</label>
                  <input
                    id="sag-ujrah-fixed"
                    type="number"
                    step="0.01"
                    min={0}
                    value={formatInputNumber(form.ujrahFixedMonthly)}
                    onChange={event => update({ ujrahFixedMonthly: Math.max(0, Number(event.target.value) || 0) })}
                    className={`${fieldClass} font-mono`}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="sag-previous-redemption">Jumlah Tebus Surat Asal (RM)</label>
                <input
                  id="sag-previous-redemption"
                  type="number"
                  step="0.01"
                  min={0}
                  value={formatInputNumber(form.previousRedemption)}
                  onChange={event => update({ previousRedemption: Math.max(0, Number(event.target.value) || 0) })}
                  className={`${fieldClass} font-mono`}
                />
                <p className="text-[11px] font-medium text-slate-500">Asas unjuran lebihan tunai surat susulan (0 untuk Pajakan Asal).</p>
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

            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-900">
                  Kiraan automatik · selaras formula lejar SAG
                </p>
                <button
                  type="button"
                  onClick={applyCalculatedFinancing}
                  title="Gunakan pembiayaan (nilai marhun × margin) sahaja; upah simpan kekal dalam akad ijarah berasingan"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-800 transition-colors hover:bg-emerald-50"
                >
                  <RefreshCw size={13} /> Guna Kiraan Ini
                </button>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {[
                  { label: 'Pembiayaan (margin)', value: formatSagMoney(financingFromMargin), hint: `${formatInputNumber(form.margin)}% × ${formatSagMoney(derived.marhunValue)}` },
                  { label: 'Upah simpan sebulan', value: formatSagMoney(feeSummary.monthly), hint: feeBasisHint },
                  { label: 'Jumlah upah (tempoh)', value: formatSagMoney(feeSummary.total), hint: `${derived.paymentTermMonths} bulan` },
                  { label: 'Harga Jualan (tanpa upah)', value: formatSagMoney(derived.sellingPrice), hint: 'Pembiayaan + ribh' },
                  { label: 'Jumlah Tebus (jualan + upah)', value: formatSagMoney(feeSummary.redemption), hint: 'Dua akad berasingan' },
                  { label: 'Unjuran lebihan tunai', value: formatSagMoney(derived.projectedProfit), hint: 'Pembiayaan − tebus asal − fi' }
                ].map(item => (
                  <div key={item.label} className="rounded-lg border border-emerald-100 bg-white px-2.5 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{item.label}</p>
                    <p className="font-mono text-sm font-bold text-emerald-900">{item.value}</p>
                    <p className="text-[10px] font-medium text-slate-500">{item.hint}</p>
                  </div>
                ))}
              </div>
              {feeSummary.violations.length > 0 && (
                <ul className="mt-2 space-y-1 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] font-semibold text-rose-700">
                  {feeSummary.violations.map(violation => <li key={violation}>• {violation}</li>)}
                </ul>
              )}
              <p className="mt-2 text-[11px] font-medium text-emerald-900">
                Akad ijarah (upah simpan) dikira berasingan daripada akad jualan tawarruq; upah tidak dimasukkan ke dalam Harga Jualan.
              </p>
            </div>

            <div className={`mt-3 rounded-xl border p-3 text-xs ${exposure.violations.length ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Had Pendedahan Pelanggan</p>
              <p className="mt-1">
                Aktif sedia ada: <span className="font-mono font-bold">{formatSagMoney(exposure.activeFinancing)}</span>
                {' '}({exposure.activeLetters} surat) · Selepas surat ini:{' '}
                <span className="font-mono font-bold">{formatSagMoney(exposure.cumulativeAfter)}</span>
                {' '}/ {formatSagMoney(exposure.limits.singleCustomer)}
              </p>
              <p className="mt-0.5">
                Pembiayaan pada tarikh ini: <span className="font-mono font-bold">{formatSagMoney(exposure.todayAfter)}</span>
                {' '}/ {formatSagMoney(exposure.limits.daily)}
              </p>
              {exposure.violations.length > 0 && (
                <ul className="mt-1 list-inside list-disc space-y-0.5 font-semibold">
                  {exposure.violations.map(violation => <li key={violation}>{violation}</li>)}
                </ul>
              )}
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
                <button
                  type="button"
                  onClick={() => marhunImportInputRef.current?.click()}
                  disabled={isImportingMarhun}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-[11px] font-bold text-cyan-800 transition-colors hover:bg-cyan-100 disabled:opacity-40"
                >
                  <Upload size={13} /> {isImportingMarhun ? 'Mengimport...' : 'Import Keterangan Marhun'}
                </button>
                <input
                  ref={marhunImportInputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  multiple
                  className="hidden"
                  onChange={event => {
                    const selected = Array.from(event.target.files || []);
                    event.target.value = '';
                    void handleImportMarhunFiles(selected);
                  }}
                />
              </div>
            </div>

            {marhunImportFeedback && (
              <p
                className={`mb-2 rounded-lg px-3 py-2 text-[11px] font-semibold ${
                  marhunImportFeedback.tone === 'error'
                    ? 'bg-rose-50 text-rose-800'
                    : marhunImportFeedback.tone === 'success'
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-cyan-50 text-cyan-900'
                }`}
              >
                {marhunImportFeedback.message}
              </p>
            )}

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

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] font-medium text-slate-600">
              <p className="font-bold uppercase tracking-wide text-slate-500">Jejak Ijab &amp; Qabul</p>
              <p className="mt-1">
                Versi kontrak: <span className="font-mono font-bold text-slate-800">{form.contractVersion || SAG_CONTRACT_VERSION}</span>
              </p>
              {form.consent?.acceptedAt ? (
                <p>
                  Diterima: <span className="font-mono font-bold text-emerald-800">{formatConsentTimestamp(form.consent.acceptedAt)}</span>
                  {form.consent.acceptedBy?.name || form.consent.acceptedBy?.email
                    ? ` · oleh ${form.consent.acceptedBy?.name || form.consent.acceptedBy?.email}`
                    : ''}
                  {' · '}kod rujukan <span className="font-mono font-bold">{form.consent.termsHash}</span>
                </p>
              ) : (
                <p className="text-amber-700">
                  Belum direkod. Timestamp dan versi kontrak akan dicatat secara automatik apabila surat dikeluarkan.
                </p>
              )}
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
