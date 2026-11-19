/**
 * Pengekstrak teks surat import:
 *  1. PDF berlapis teks → baca terus daripada lapisan teks (paling tepat).
 *  2. PDF imbas / fail imej → OCR (Tesseract, bahasa Melayu + Inggeris).
 *
 * Pustaka berat dimuatkan secara dinamik supaya bundle utama aplikasi tidak
 * membengkak; OCR hanya dimuatkan apabila benar-benar diperlukan.
 */

export type SagImportTextMethod = 'pdf-text' | 'ocr';

export type SagImportExtraction = {
  text: string;
  method: SagImportTextMethod;
  filesProcessed: number;
  notes: string[];
};

export type SagImportProgress = (message: string, progress?: number) => void;

const MAX_FILES_PER_SCAN = 3;
const MAX_PDF_TEXT_PAGES = 6;
const MAX_OCR_PAGES = 2;
const MIN_USABLE_TEXT_LENGTH = 80;

let pdfModulePromise: Promise<typeof import('pdfjs-dist')> | null = null;
let ocrWorkerPromise: Promise<any> | null = null;
let activeProgress: SagImportProgress | null = null;

const loadPdfJs = async () => {
  if (!pdfModulePromise) {
    pdfModulePromise = (async () => {
      const pdfjs = await import('pdfjs-dist');
      // Vite akan memancarkan fail worker sebagai aset dan memberi URL-nya.
      const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      pdfjs.GlobalWorkerOptions.workerSrc = (workerModule as { default: string }).default;
      return pdfjs;
    })().catch(error => {
      pdfModulePromise = null;
      throw error;
    });
  }
  return pdfModulePromise;
};

const loadOcrWorker = async () => {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('msa+eng', 1, {
        logger: message => {
          if (message.status === 'recognizing text') {
            activeProgress?.('Membaca teks imbasan (OCR)...', message.progress);
          } else if (message.progress > 0) {
            activeProgress?.(`Menyediakan enjin OCR (${message.status})...`, message.progress * 0.2);
          }
        }
      });
      // Kekalkan jarak antara lajur jadual dan anggap imej beresolusi cetakan.
      await worker.setParameters({ preserve_interword_spaces: '1', user_defined_dpi: '300' });
      return worker;
    })().catch(error => {
      ocrWorkerPromise = null;
      throw error;
    });
  }
  return ocrWorkerPromise;
};

const isPdfFile = (file: File) =>
  file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');

/** Bina baris teks daripada item PDF berdasarkan kedudukan menegaknya. */
const textItemsToLines = (items: any[]) => {
  const sorted = items
    .filter(item => item && typeof item.str === 'string')
    .map(item => ({
      text: item.str as string,
      x: Number(item.transform?.[4] ?? 0),
      y: Number(item.transform?.[5] ?? 0)
    }))
    .sort((left, right) => (Math.abs(right.y - left.y) > 2 ? right.y - left.y : left.x - right.x));

  const lines: string[] = [];
  let currentY: number | null = null;
  let currentLine = '';
  sorted.forEach(item => {
    if (currentY !== null && Math.abs(item.y - currentY) > 2) {
      lines.push(currentLine.trim());
      currentLine = '';
    }
    currentY = item.y;
    currentLine += `${item.text} `;
  });
  if (currentLine.trim()) lines.push(currentLine.trim());
  return lines.join('\n');
};

const countMeaningfulChars = (text: string) => String(text || '').replace(/[^A-Za-z0-9]/g, '').length;

/** Tukar kanvas kepada kelabu + kontras supaya teks jadual lebih jelas untuk OCR. */
const enhanceCanvas = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  try {
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    for (let index = 0; index < data.length; index += 4) {
      const gray = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
      const boosted = Math.max(0, Math.min(255, (gray - 128) * 1.2 + 128));
      data[index] = boosted;
      data[index + 1] = boosted;
      data[index + 2] = boosted;
    }
    context.putImageData(image, 0, 0);
  } catch {
    // Abaikan sekatan kanvas (CORS); OCR akan guna imej asal.
  }
  return canvas;
};

/** Naik skala imej kecil supaya digit jadual dapat dibaca dengan lebih tepat. */
const prepareImageForOcr = async (file: File): Promise<File | HTMLCanvasElement> => {
  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(3, Math.max(1, 1600 / Math.max(1, maxDimension)));
    if (scale <= 1 && maxDimension >= 1400) {
      bitmap.close?.();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close?.();
      return file;
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return enhanceCanvas(canvas);
  } catch {
    return file;
  }
};

const renderPdfPageToDataUrl = async (page: any) => {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Kanvas pelayar tidak tersedia untuk OCR.');
  await page.render({ canvas, viewport }).promise;
  return enhanceCanvas(canvas).toDataURL('image/png');
};

/** Render bahagian atas muka surat (tempat cop OVERLAP/PUSING) untuk OCR. */
const renderPdfTopRegionToDataUrl = async (page: any, heightRatio = 0.35) => {
  const viewport = page.getViewport({ scale: 2 });
  const full = document.createElement('canvas');
  full.width = Math.ceil(viewport.width);
  full.height = Math.ceil(viewport.height);
  const fullContext = full.getContext('2d');
  if (!fullContext) throw new Error('Kanvas pelayar tidak tersedia untuk OCR cop.');
  await page.render({ canvas: full, viewport }).promise;
  const cropHeight = Math.max(1, Math.min(full.height, Math.ceil(full.height * heightRatio)));
  const crop = document.createElement('canvas');
  crop.width = full.width;
  crop.height = cropHeight;
  const cropContext = crop.getContext('2d');
  if (!cropContext) return enhanceCanvas(full).toDataURL('image/png');
  cropContext.drawImage(full, 0, 0, full.width, cropHeight, 0, 0, crop.width, crop.height);
  return enhanceCanvas(crop).toDataURL('image/png');
};

const extractFromPdf = async (
  file: File,
  onProgress?: SagImportProgress
): Promise<{ text: string; method: SagImportTextMethod; notes: string[] }> => {
  const notes: string[] = [];
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjs.getDocument({ data }).promise;
  try {
    const pageCount = Math.min(document.numPages, MAX_PDF_TEXT_PAGES);
    let text = '';
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      onProgress?.(`Membaca teks PDF... (${pageNumber}/${pageCount})`, pageNumber / (pageCount + 1));
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      text += `${textItemsToLines(content.items as any[])}\n`;
    }

    if (countMeaningfulChars(text) >= MIN_USABLE_TEXT_LENGTH) {
      // Cop OVERLAP/PUSING selalunya imej cop, bukan sebahagian lapisan teks PDF.
      // Imbas bahagian atas muka surat untuk mengesannya.
      if (!/overlap/i.test(text)) {
        try {
          onProgress?.('Memeriksa cop surat (OVERLAP/PUSING)...', 0.85);
          const worker = await loadOcrWorker();
          const page = await document.getPage(1);
          const dataUrl = await renderPdfTopRegionToDataUrl(page);
          const stampScan = await worker.recognize(dataUrl);
          const stampText = String(stampScan?.data?.text || '');
          if (stampText.trim()) {
            text += `\n${stampText}`;
            notes.push('Bahagian atas muka surat diimbas untuk mengesan cop OVERLAP/PUSING.');
          }
        } catch (error) {
          notes.push(`Pemeriksaan cop surat gagal: ${error instanceof Error ? error.message : 'ralat tidak diketahui'}.`);
        }
      }
      return { text, method: 'pdf-text', notes };
    }

    notes.push('PDF tidak mengandungi lapisan teks yang mencukupi; halaman diimbas menggunakan OCR.');
    const worker = await loadOcrWorker();
    const ocrPages = Math.min(document.numPages, MAX_OCR_PAGES);
    let ocrText = '';
    for (let pageNumber = 1; pageNumber <= ocrPages; pageNumber += 1) {
      onProgress?.(`Mengimbas halaman ${pageNumber}/${ocrPages} dengan OCR...`, pageNumber / (ocrPages + 1));
      const page = await document.getPage(pageNumber);
      const dataUrl = await renderPdfPageToDataUrl(page);
      const result = await worker.recognize(dataUrl);
      ocrText += `${result?.data?.text || ''}\n`;
    }
    return { text: ocrText, method: 'ocr', notes };
  } finally {
    await document.cleanup().catch(() => undefined);
  }
};

const extractFromImage = async (
  file: File,
  onProgress?: SagImportProgress
): Promise<{ text: string; method: SagImportTextMethod; notes: string[] }> => {
  onProgress?.('Membaca imej dengan OCR...', 0.1);
  const worker = await loadOcrWorker();
  const source = await prepareImageForOcr(file);
  const result = await worker.recognize(source);
  return { text: String(result?.data?.text || ''), method: 'ocr', notes: [] };
};

/**
 * Baca teks daripada senarai fail (PDF/imej). Fail yang gagal dibaca akan
 * dilangkau dan dicatat dalam `notes`; ralat hanya dilempar jika tiada teks
 * sama sekali dapat diekstrak.
 */
export const extractSagImportText = async (
  files: File[],
  onProgress?: SagImportProgress
): Promise<SagImportExtraction> => {
  const targets = (files || []).slice(0, MAX_FILES_PER_SCAN);
  if (!targets.length) throw new Error('Tiada fail untuk dibaca.');

  activeProgress = onProgress || null;
  const notes: string[] = [];
  let text = '';
  let filesProcessed = 0;
  let ocrUsed = false;

  try {
    for (let index = 0; index < targets.length; index += 1) {
      const file = targets[index];
      onProgress?.(`Menyediakan fail ${index + 1}/${targets.length}...`, index / targets.length);
      try {
        const result = isPdfFile(file)
          ? await extractFromPdf(file, onProgress)
          : await extractFromImage(file, onProgress);
        text += `${result.text}\n`;
        notes.push(...result.notes);
        if (result.method === 'ocr') ocrUsed = true;
        filesProcessed += 1;
      } catch (error) {
        notes.push(`Fail "${file.name}" tidak dapat dibaca: ${error instanceof Error ? error.message : 'ralat tidak diketahui'}.`);
      }
    }
  } finally {
    activeProgress = null;
  }

  if (countMeaningfulChars(text) < 10) {
    throw new Error('Teks tidak dapat diekstrak daripada fail. Pastikan fail PDF/imej jelas dan bukan dokumen kosong.');
  }

  onProgress?.('Teks berjaya diekstrak.', 1);
  return { text, method: ocrUsed ? 'ocr' : 'pdf-text', filesProcessed, notes };
};
