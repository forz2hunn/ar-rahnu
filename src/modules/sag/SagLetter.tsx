import { QRCodeSVG } from 'qrcode.react';
import {
  SAG_CUSTOMER_DECLARATIONS,
  SAG_TAWARRUQ_CLAUSES,
  buildSagQrPayload,
  buildSagVerificationCode,
  formatSagDate,
  formatSagMoney,
  formatSagNumber,
  getSagFeeBasisLabel,
  roundMoney,
  summarizeSagMarhunItems,
  type SagDocument,
  type SagLetterhead
} from './sagDocuments';
import './sagLetter.css';

const MIN_MARHUN_ROWS = 5;

const buildSignatureDate = (value: string) => (value ? formatSagDate(value) : '');

/** Timestamp penuh untuk jejak penerimaan terma. */
const buildConsentTimestamp = (value?: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat('ms-MY', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kuala_Lumpur'
  }).format(parsed) + ' MYT';
};

const describeUjrahRate = (document: SagDocument) => {
  if (document.feeBasis === 'kadarTetap') return `${formatSagMoney(document.ujrahFixedMonthly)} sebulan`;
  if (document.feeBasis === 'beratMarhun') return `RM ${formatSagNumber(document.feeRate)} / gram / bulan`;
  if (document.feeBasis === 'nilaiMarhun') return `${formatSagNumber(document.feeRate)}% sebulan`;
  return '-';
};

export function SagLetter({
  document: sagDocument,
  letterhead
}: {
  document: SagDocument;
  letterhead: SagLetterhead;
}) {
  const marhunItems = sagDocument.marhunItems || [];
  const marhunSummary = summarizeSagMarhunItems(marhunItems);
  const schedule = sagDocument.profitSchedule || [];
  const emptyRows = Math.max(0, MIN_MARHUN_ROWS - marhunItems.length);
  const paymentDue = sagDocument.paymentDueOverride
    ? formatSagDate(sagDocument.paymentDueOverride)
    : `SEBELUM ${formatSagDate(sagDocument.maturityDate)}`;
  const verificationCode = buildSagVerificationCode(sagDocument);
  // Nilai marhun dokumen diutamakan supaya sama dengan nilai yang tercetak pada
  // surat asal (termasuk surat import institusi lain).
  const totalMarhun = roundMoney(sagDocument.marhunValue) || marhunSummary.value;
  const totalWeight = marhunItems.length ? marhunSummary.weight : 0;

  return (
    <article className="sag-letter" aria-label={`Surat Akuan Gadaian ${sagDocument.documentNo}`}>
      {sagDocument.status === 'Batal' && <div className="sag-letter__watermark">Batal</div>}

      <header className="sag-letter__head">
        <div>
          <p className="sag-letter__brand-name">{letterhead.organizationName || 'AR-RAHNU'}</p>
          <p className="sag-letter__brand-line">
            {letterhead.addressLine1}
            {letterhead.addressLine2 ? <><br />{letterhead.addressLine2}</> : null}
            {letterhead.registrationNo ? <><br />No. Pendaftaran: {letterhead.registrationNo}</> : null}
          </p>
          {letterhead.phone && <p className="sag-letter__brand-phone">Tel: {letterhead.phone}</p>}
        </div>

        <div className="sag-letter__logos">
          <img
            src="/icons/goldbar-logo.png"
            alt=""
            className="sag-letter__logo"
            onError={event => { event.currentTarget.style.display = 'none'; }}
          />
          <div className="sag-letter__logo-fallback">AR<br />RAHNU</div>
        </div>

        <div className="sag-letter__meta">
          <p className="sag-letter__docno">{sagDocument.documentNo}</p>
          <QRCodeSVG value={buildSagQrPayload(sagDocument)} size={74} level="M" />
          <p className="sag-letter__qr-caption">SAH {verificationCode}</p>
        </div>
      </header>

      <div className="sag-letter__masthead">
        <h1 className="sag-letter__title">Surat Akuan Gadaian</h1>
        <span className="sag-letter__status">{sagDocument.pledgeStatus || 'Aktif'}</span>
        <span className="sag-letter__copy">{sagDocument.copyType}</span>
      </div>
      <p className="sag-letter__subtitle">Perjanjian Pembiayaan Ar Rahnu (Tawarruq)</p>

      <section className="sag-letter__section">
        <table className="sag-letter__table sag-letter__grid">
          <colgroup>
            <col style={{ width: '24mm' }} />
            <col style={{ width: '58mm' }} />
            <col style={{ width: '34mm' }} />
            <col />
          </colgroup>
          <tbody>
            <tr>
              <td className="is-label">Nama</td>
              <td className="is-value" colSpan={1}>{sagDocument.member.name || '-'}</td>
              <td className="is-label">Produk</td>
              <td className="is-value">{sagDocument.product || '-'}</td>
            </tr>
            <tr>
              <td className="is-label">No MyKad</td>
              <td className="is-value">{sagDocument.member.icNumber || '-'}</td>
              <td className="is-label">No SAG</td>
              <td className="is-value">{sagDocument.documentNo || '-'}</td>
            </tr>
            <tr>
              <td className="is-label" rowSpan={2}>Alamat</td>
              <td className="is-value" rowSpan={2}>{sagDocument.member.address || '-'}</td>
              <td className="is-label">Tarikh Pembiayaan</td>
              <td className="is-value">{formatSagDate(sagDocument.financingDate)}</td>
            </tr>
            <tr>
              <td className="is-label">Tarikh Matang</td>
              <td className="is-value">{formatSagDate(sagDocument.maturityDate)}</td>
            </tr>
            <tr>
              <td className="is-label">No Telefon</td>
              <td className="is-value">{sagDocument.member.phone || '-'}</td>
              <td className="is-label">Nilai Marhun</td>
              <td className="is-num is-value">{formatSagMoney(totalMarhun)}</td>
            </tr>
            <tr>
              <td className="is-label">Waris</td>
              <td className="is-value">{sagDocument.member.heirName || '-'}</td>
              <td className="is-label">Harga Belian / Nilai Pembiayaan</td>
              <td className="is-num is-value">{formatSagMoney(sagDocument.purchasePrice)}</td>
            </tr>
            <tr>
              <td className="is-label">No Kotak</td>
              <td className="is-value">{sagDocument.member.poBox || '-'}</td>
              <td className="is-label">Keuntungan Jualan (Ribh)</td>
              <td className="is-num is-value">{formatSagMoney(sagDocument.totalProfit)}</td>
            </tr>
            <tr>
              <td className="is-label">No. Akaun</td>
              <td className="is-value">{sagDocument.accountNo || '-'}</td>
              <td className="is-label">Harga Jualan (tanpa upah)</td>
              <td className="is-num is-value">{formatSagMoney(sagDocument.sellingPrice)}</td>
            </tr>
            <tr>
              <td className="is-label">Versi Kontrak</td>
              <td className="is-value">{sagDocument.contractVersion || '-'}</td>
              <td className="is-label">Upah Simpan (Ijarah)</td>
              <td className="is-num is-value">{formatSagMoney(sagDocument.ujrahTotal)}</td>
            </tr>
            <tr>
              <td className="is-label" />
              <td />
              <td className="is-label">Jumlah Tebus (Jualan + Upah)</td>
              <td className="is-num is-value">{formatSagMoney(sagDocument.redemptionTotal)}</td>
            </tr>
            <tr>
              <td className="is-label">No. Sijil Komoditi</td>
              <td className="is-value">{sagDocument.commodityCertificateNo || '-'}</td>
              <td className="is-label">Bayaran Keuntungan ({sagDocument.profitPaymentMonths || 6} bulan)</td>
              <td className="is-num is-value">{formatSagMoney(sagDocument.profitPaymentAmount)}</td>
            </tr>
            <tr>
              <td className="is-label" />
              <td />
              <td className="is-label">Tarikh Bayaran</td>
              <td className="is-value">{paymentDue}</td>
            </tr>
            <tr>
              <td className="is-label">Jenis Pajakan</td>
              <td className="is-value">{sagDocument.pledgeType || '-'}</td>
              <td className="is-label">Surat Asal</td>
              <td className="is-value">
                {sagDocument.previousDocumentNo || '-'}
                {sagDocument.previousDocumentNo && sagDocument.previousTransactionRefNo
                  ? ` (#${sagDocument.previousTransactionRefNo})`
                  : ''}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="sag-letter__section">
        <p className="sag-letter__section-title">Transaksi Tawarruq</p>
        <table className="sag-letter__table">
          <thead>
            <tr>
              <th style={{ width: '26mm' }}>Akad</th>
              <th>Keterangan</th>
              <th style={{ width: '22mm' }}>Setuju</th>
            </tr>
          </thead>
          <tbody>
            {SAG_TAWARRUQ_CLAUSES.map(clause => {
              const agreed = Boolean(sagDocument.tawarruq?.[clause.key]);
              return (
                <tr key={clause.key}>
                  <td style={{ fontWeight: 700 }}>{clause.title}</td>
                  <td className="sag-letter__agreement-text">{clause.description}</td>
                  <td className="sag-letter__agree-box">
                    {agreed ? 'Setuju' : 'Tidak Setuju'}
                    <br />
                    <span className="sag-letter__tick">{agreed ? 'X' : ''}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="sag-letter__section">
        <p className="sag-letter__section-title">Akad Ijarah — Upah Simpan (Berasingan Daripada Harga Jualan)</p>
        <table className="sag-letter__table">
          <tbody>
            <tr>
              <td className="is-label" style={{ width: '52mm' }}>Asas Kiraan</td>
              <td className="is-value">{getSagFeeBasisLabel(sagDocument.feeBasis)}</td>
              <td className="is-label" style={{ width: '42mm' }}>Kadar</td>
              <td className="is-value">{describeUjrahRate(sagDocument)}</td>
            </tr>
            <tr>
              <td className="is-label">Upah Simpan Sebulan</td>
              <td className="is-num is-value">{formatSagMoney(sagDocument.ujrahMonthly)}</td>
              <td className="is-label">Jumlah Upah ({sagDocument.paymentTermMonths} bulan)</td>
              <td className="is-num is-value">{formatSagMoney(sagDocument.ujrahTotal)}</td>
            </tr>
          </tbody>
        </table>
        <p className="sag-letter__agreement-text" style={{ marginTop: '2mm' }}>
          Upah simpan ialah bayaran perkhidmatan penyimpanan Marhun dan dikira berasaskan nilai/berat Marhun atau caj
          perkhidmatan tetap. Ia bukan sebahagian daripada Harga Jualan dan bukan peratusan ke atas jumlah pembiayaan.
        </p>
        {(sagDocument.ujrahSchedule || []).length > 0 && (
          <table className="sag-letter__table" style={{ marginTop: '2mm' }}>
            <thead>
              <tr>
                <th style={{ width: '52mm' }}>Tempoh</th>
                {(sagDocument.ujrahSchedule || []).map(period => (
                  <th key={period.index}>{period.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="is-label">Tarikh Bayaran</td>
                {(sagDocument.ujrahSchedule || []).map(period => (
                  <td key={period.index} className="is-center">{formatSagDate(period.dueDate)}</td>
                ))}
              </tr>
              <tr>
                <td className="is-label">Upah Simpan</td>
                {(sagDocument.ujrahSchedule || []).map(period => (
                  <td key={period.index} className="is-num">{formatSagMoney(period.profit)}</td>
                ))}
              </tr>
              <tr>
                <td className="is-label">Jumlah Terkumpul</td>
                {(sagDocument.ujrahSchedule || []).map(period => (
                  <td key={period.index} className="is-num is-total">{formatSagMoney(period.cumulativeProfit)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        )}
      </section>

      <section className="sag-letter__section">
        <p className="sag-letter__section-title">Jadual Keuntungan Jualan (Ribh)</p>
        <table className="sag-letter__table">
          <thead>
            <tr>
              <th style={{ width: '52mm' }}>Tempoh Pembayaran</th>
              {schedule.length === 0 ? (
                <th>Tiada Jadual</th>
              ) : (
                schedule.map(period => <th key={period.index}>{period.label}</th>)
              )}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="is-label">Tarikh Bayaran</td>
              {schedule.length === 0 ? (
                <td className="is-center">-</td>
              ) : (
                schedule.map(period => (
                  <td key={period.index} className="is-center">{formatSagDate(period.dueDate)}</td>
                ))
              )}
            </tr>
            <tr>
              <td className="is-label">Jumlah Keuntungan Yang Perlu Dibayar</td>
              {schedule.length === 0 ? (
                <td className="is-num">-</td>
              ) : (
                schedule.map(period => (
                  <td key={period.index} className="is-num">{formatSagMoney(period.profit)}</td>
                ))
              )}
            </tr>
            <tr>
              <td className="is-label">Jumlah Keuntungan Terkumpul</td>
              {schedule.length === 0 ? (
                <td className="is-num">-</td>
              ) : (
                schedule.map(period => (
                  <td key={period.index} className="is-num is-total">{formatSagMoney(period.cumulativeProfit)}</td>
                ))
              )}
            </tr>
          </tbody>
        </table>
      </section>

      <section className="sag-letter__section">
        <p className="sag-letter__section-title">Keterangan Marhun</p>
        <table className="sag-letter__table">
          <thead>
            <tr>
              <th style={{ width: '10mm' }}>Bil</th>
              <th>Marhun</th>
              <th style={{ width: '16mm' }}>Kuantiti</th>
              <th style={{ width: '14mm' }}>Karat</th>
              <th style={{ width: '21mm' }}>Harga (RM/g)</th>
              <th style={{ width: '17mm' }}>Berat (g)</th>
              <th style={{ width: '24mm' }}>N. Marhun (RM)</th>
            </tr>
          </thead>
          <tbody>
            {marhunItems.map((item, index) => (
              <tr key={item.id}>
                <td className="is-center">{index + 1}</td>
                <td>{item.description || '-'}</td>
                <td className="is-center">{formatSagNumber(item.quantity, 0)}</td>
                <td className="is-center">{item.karat || '-'}</td>
                <td className="is-num">{formatSagNumber(item.ratePerGram)}</td>
                <td className="is-num">{formatSagNumber(item.weight)}</td>
                <td className="is-num">{formatSagNumber(item.marhunValue)}</td>
              </tr>
            ))}
            {Array.from({ length: emptyRows }).map((_, index) => (
              <tr key={`empty-${index}`}>
                <td className="is-center">&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            ))}
            <tr className="is-total">
              <td className="is-label is-total" colSpan={2} style={{ textAlign: 'right' }}>
                Jumlah Marhun Keseluruhan
              </td>
              <td className="is-center is-total">{formatSagNumber(marhunSummary.quantity, 0)}</td>
              <td className="is-total" />
              <td className="is-total" />
              <td className="is-num is-total">{formatSagNumber(totalWeight)}</td>
              <td className="is-num is-total">{formatSagNumber(totalMarhun)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="sag-letter__section">
        <p className="sag-letter__section-title">Akuan Pelanggan</p>
        <ol className="sag-letter__declarations">
          {SAG_CUSTOMER_DECLARATIONS.map((declaration, index) => (
            <li key={index}>{declaration}</li>
          ))}
        </ol>
      </section>

      <section className="sag-letter__signatures">
        <div className="sag-letter__sign-card">
          <p className="sag-letter__sign-role">Tandatangan Pelanggan</p>
          <div className="sag-letter__sign-scribble" aria-hidden="true" />
          <p className="sag-letter__sign-line">
            Nama: <span className="sag-letter__sign-name">{sagDocument.signatures.customerName || sagDocument.member.name || '-'}</span>
            <br />
            Tarikh: {buildSignatureDate(sagDocument.signatures.customerSignedAt) || '-'}
          </p>
        </div>

        <div className="sag-letter__sign-card">
          <p className="sag-letter__sign-role">Tandatangan Pihak Ar-Rahnu</p>
          <div className="sag-letter__sign-scribble" aria-hidden="true" />
          <p className="sag-letter__sign-line">
            Nama: <span className="sag-letter__sign-name">{sagDocument.signatures.officerName || letterhead.officerName || '-'}</span>
            <br />
            Jawatan: {letterhead.officerPosition || 'Pegawai Ar-Rahnu'}
            <br />
            Tarikh: {buildSignatureDate(sagDocument.signatures.officerSignedAt) || '-'}
          </p>
        </div>

        <div className="sag-letter__sign-card">
          <p className="sag-letter__sign-role">Tandatangan Saksi</p>
          <div className="sag-letter__sign-scribble" aria-hidden="true" />
          <p className="sag-letter__sign-line">
            Nama: <span className="sag-letter__sign-name">{sagDocument.signatures.witnessName || letterhead.witnessName || '-'}</span>
            <br />
            Tarikh: {buildSignatureDate(sagDocument.signatures.witnessSignedAt) || '-'}
          </p>
        </div>
      </section>

      <footer className="sag-letter__footnote">
        <span>Dokumen dijana oleh Sistem Ar-Rahnu. Kod pengesahan: {verificationCode}</span>
        <span>
          {sagDocument.transactionRefNo ? `Ruj. transaksi: ${sagDocument.transactionRefNo} · ` : ''}
          {sagDocument.institutionName || letterhead.organizationName}
        </span>
        <span>
          Versi kontrak: {sagDocument.contractVersion || '-'} · Ijab &amp; Qabul:{' '}
          {buildConsentTimestamp(sagDocument.consent?.acceptedAt) || 'Belum direkod'}
          {sagDocument.consent?.termsHash ? ` (${sagDocument.consent.termsHash})` : ''}
        </span>
      </footer>
    </article>
  );
}
