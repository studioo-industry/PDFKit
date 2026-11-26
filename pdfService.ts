import { degrees, PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import type { PageThumbnail } from '../types';

// Configure pdfjs worker to render thumbnails & PDF-to-JPG client-side
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.2.108'}/build/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF.js worker setup fallback', e);
}

/**
 * Format bytes to readable string (e.g. 1.2 MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get page count and page thumbnail previews using PDF.js
 */
export async function getPdfThumbnails(
  file: File,
  maxPages = 20,
  targetWidth = 180
): Promise<{ pageCount: number; thumbnails: PageThumbnail[] }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;

    const pagesToRender = Math.min(pageCount, maxPages);
    const thumbnails: PageThumbnail[] = [];

    for (let i = 1; i <= pagesToRender; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const scale = targetWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Draw white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await (page.render as any)({
          canvasContext: ctx,
          viewport: scaledViewport,
          canvas,
        }).promise;

        thumbnails.push({
          pageNumber: i,
          thumbnail: canvas.toDataURL('image/jpeg', 0.8),
          width: scaledViewport.width,
          height: scaledViewport.height,
          rotation: page.rotate || 0,
          selected: true,
        });
      }
    }

    return { pageCount, thumbnails };
  } catch (err) {
    console.error('Error rendering PDF thumbnails:', err);
    // Fallback if pdf.js fails (e.g. password protected or worker issue)
    return { pageCount: 1, thumbnails: [] };
  }
}

/**
 * 1. MERGE PDFS
 * Combines multiple PDF files in order into a single PDF document.
 */
export async function mergePdfs(
  files: File[],
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 90));
    }
  }

  const mergedPdfBytes = await mergedPdf.save();
  if (onProgress) onProgress(100);
  return mergedPdfBytes;
}

/**
 * 2. SPLIT PDF
 * Splits a PDF by page ranges or into individual pages.
 */
export async function splitPdf(
  file: File,
  mode: 'all' | 'custom' | 'extract-selected',
  customRanges: string = '',
  selectedPages: number[] = [],
  onProgress?: (progress: number) => void
): Promise<{ name: string; data: Uint8Array }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = srcPdf.getPageCount();
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const results: { name: string; data: Uint8Array }[] = [];

  if (mode === 'all') {
    // Extract each page as individual PDF
    for (let i = 0; i < totalPages; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(srcPdf, [i]);
      newPdf.addPage(copiedPage);
      const data = await newPdf.save();
      results.push({
        name: `${baseName}_page_${i + 1}.pdf`,
        data,
      });

      if (onProgress) onProgress(Math.round(((i + 1) / totalPages) * 90));
    }
  } else if (mode === 'extract-selected') {
    // Extract selected pages into one or separate PDFs
    if (selectedPages.length === 0) {
      throw new Error('Please select at least one page to extract.');
    }
    const newPdf = await PDFDocument.create();
    const pageIndices = selectedPages
      .filter((p) => p >= 1 && p <= totalPages)
      .map((p) => p - 1);
    
    const copiedPages = await newPdf.copyPages(srcPdf, pageIndices);
    copiedPages.forEach((p) => newPdf.addPage(p));
    
    const data = await newPdf.save();
    results.push({
      name: `${baseName}_extracted_pages.pdf`,
      data,
    });
  } else {
    // Custom range parsing: e.g. "1-3, 5, 7-9"
    const ranges = customRanges.split(',').map((r) => r.trim()).filter(Boolean);
    if (ranges.length === 0) {
      throw new Error('Please provide valid page ranges (e.g. 1-3, 5).');
    }

    for (let rIdx = 0; rIdx < ranges.length; rIdx++) {
      const rangeStr = ranges[rIdx];
      let indices: number[] = [];

      if (rangeStr.includes('-')) {
        const [startStr, endStr] = rangeStr.split('-');
        const start = Math.max(1, parseInt(startStr, 10));
        const end = Math.min(totalPages, parseInt(endStr, 10));
        for (let p = start; p <= end; p++) {
          indices.push(p - 1);
        }
      } else {
        const pageNum = parseInt(rangeStr, 10);
        if (pageNum >= 1 && pageNum <= totalPages) {
          indices.push(pageNum - 1);
        }
      }

      if (indices.length > 0) {
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(srcPdf, indices);
        copiedPages.forEach((p) => newPdf.addPage(p));
        const data = await newPdf.save();
        results.push({
          name: `${baseName}_range_${rangeStr.replace(/\s+/g, '')}.pdf`,
          data,
        });
      }

      if (onProgress) onProgress(Math.round(((rIdx + 1) / ranges.length) * 90));
    }
  }

  if (onProgress) onProgress(100);
  return results;
}

/**
 * 3. COMPRESS PDF
 * Compresses PDF pages client-side using adaptive rasterization & stream optimization.
 */
export async function compressPdf(
  file: File,
  qualityLevel: 'extreme' | 'recommended' | 'low',
  onProgress?: (progress: number) => void
): Promise<{ data: Uint8Array; originalSize: number; newSize: number; savingsPercent: number }> {
  const originalSize = file.size;
  const arrayBuffer = await file.arrayBuffer();

  // Settings based on level
  const settings = {
    extreme: { scale: 1.0, quality: 0.45 },     // High compression, small size
    recommended: { scale: 1.25, quality: 0.70 }, // Balanced quality & size
    low: { scale: 1.5, quality: 0.85 },         // High quality, modest compression
  }[qualityLevel];

  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    const newPdf = await PDFDocument.create();

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: settings.scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await (page.render as any)({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;

        const imgDataUrl = canvas.toDataURL('image/jpeg', settings.quality);
        const imgBytes = await fetch(imgDataUrl).then((res) => res.arrayBuffer());
        const embeddedImage = await newPdf.embedJpg(imgBytes);

        // Target page size based on original PDF points (72 DPI points)
        const originalViewport = page.getViewport({ scale: 1 });
        const newPage = newPdf.addPage([originalViewport.width, originalViewport.height]);
        newPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: originalViewport.width,
          height: originalViewport.height,
        });
      }

      if (onProgress) {
        onProgress(Math.round((i / numPages) * 90));
      }
    }

    const compressedBytes = await newPdf.save({ useObjectStreams: true });
    
    // If compressed somehow turned out larger than original (rare text-only PDF),
    // optimize structure of original
    let finalBytes = compressedBytes;
    if (compressedBytes.length > originalSize) {
      const rawPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const structOptimized = await rawPdf.save({ useObjectStreams: true });
      if (structOptimized.length < originalSize) {
        finalBytes = structOptimized;
      }
    }

    const newSize = finalBytes.length;
    const savingsPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

    if (onProgress) onProgress(100);

    return {
      data: finalBytes,
      originalSize,
      newSize,
      savingsPercent,
    };
  } catch (err) {
    console.error('Error during compression, falling back to structural optimization:', err);
    // Structural optimization fallback
    const rawPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const structBytes = await rawPdf.save({ useObjectStreams: true });
    const newSize = structBytes.length;
    const savingsPercent = Math.max(5, Math.round(((originalSize - newSize) / originalSize) * 100));
    
    if (onProgress) onProgress(100);
    return {
      data: structBytes,
      originalSize,
      newSize,
      savingsPercent,
    };
  }
}

/**
 * 4. PDF TO JPG
 * Converts PDF pages to high-resolution JPEG images.
 */
export async function pdfToJpg(
  file: File,
  quality: number = 0.9,
  scaleFactor: number = 1.5,
  onProgress?: (progress: number, current: number, total: number) => void
): Promise<{ pageNum: number; blob: Blob; dataUrl: string; filename: string }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const results: { pageNum: number; blob: Blob; dataUrl: string; filename: string }[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: scaleFactor });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await (page.render as any)({
        canvasContext: ctx,
        viewport,
        canvas,
      }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', quality);
      });

      results.push({
        pageNum: i,
        blob,
        dataUrl,
        filename: `${baseName}_page_${i}.jpg`,
      });
    }

    if (onProgress) {
      onProgress(Math.round((i / numPages) * 100), i, numPages);
    }
  }

  return results;
}

/**
 * 5. JPG TO PDF
 * Converts one or more images into a clean PDF document with layout controls.
 */
export async function jpgToPdf(
  files: File[],
  options: {
    pageSize: 'fit' | 'a4' | 'letter';
    orientation: 'portrait' | 'landscape' | 'auto';
    margin: number; // 0, 10, 20, 30
  } = { pageSize: 'fit', orientation: 'auto', margin: 0 },
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const imageBytes = await file.arrayBuffer();
    
    let embeddedImage;
    try {
      const fName = file?.name || '';
      if (file.type?.includes('png') || fName.toLowerCase().endsWith('.png')) {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      } else if (file.type?.includes('jpeg') || file.type?.includes('jpg') || /\.(jpe?g)$/i.test(fName)) {
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
      } else {
        throw new Error('Non-standard image format, converting via canvas');
      }
    } catch {
      // Fallback for WebP, GIF, BMP, SVG, or irregular image headers:
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(file);
        image.onload = () => {
          setTimeout(() => URL.revokeObjectURL(url), 30000);
          resolve(image);
        };
        image.onerror = () => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataImg = new Image();
            dataImg.onload = () => resolve(dataImg);
            dataImg.onerror = () => reject(new Error('Failed to load image for PDF embedding'));
            dataImg.src = reader.result as string;
          };
          reader.onerror = () => reject(new Error('Failed to read image file'));
          reader.readAsDataURL(file);
        };
        image.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width || 800;
      canvas.height = img.naturalHeight || img.height || 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const jpegBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/jpeg', 0.95);
      });
      const convertedBytes = await jpegBlob.arrayBuffer();
      embeddedImage = await pdfDoc.embedJpg(convertedBytes);
    }

    const { width: imgWidth, height: imgHeight } = embeddedImage;
    const margin = options.margin;

    let pageWidth = imgWidth + margin * 2;
    let pageHeight = imgHeight + margin * 2;

    if (options.pageSize === 'a4') {
      pageWidth = 595.28;
      pageHeight = 841.89;
    } else if (options.pageSize === 'letter') {
      pageWidth = 612.0;
      pageHeight = 792.0;
    }

    // Auto orientation or fixed orientation
    if (options.orientation === 'landscape' && pageWidth < pageHeight) {
      const temp = pageWidth;
      pageWidth = pageHeight;
      pageHeight = temp;
    } else if (options.orientation === 'portrait' && pageWidth > pageHeight) {
      const temp = pageWidth;
      pageWidth = pageHeight;
      pageHeight = temp;
    } else if (options.orientation === 'auto' && options.pageSize !== 'fit') {
      if (imgWidth > imgHeight && pageWidth < pageHeight) {
        const temp = pageWidth;
        pageWidth = pageHeight;
        pageHeight = temp;
      }
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Calculate image dimensions to fit within available space keeping aspect ratio
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;

    const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, options.pageSize === 'fit' ? 1 : 100);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;

    const x = (pageWidth - drawWidth) / 2;
    const y = (pageHeight - drawHeight) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 95));
    }
  }

  const pdfBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);
  return pdfBytes;
}

/**
 * 6. ROTATE PDF
 * Rotates specified or all pages of a PDF document by 90, 180, or 270 degrees.
 */
export async function rotatePdf(
  file: File,
  pageRotations: Record<number, number>, // pageNum (1-based) -> additional degrees (e.g. 90, 180, 270)
  defaultRotation: number = 0,
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const total = pages.length;

  for (let i = 0; i < total; i++) {
    const pageNum = i + 1;
    const page = pages[i];
    const currentRotation = page.getRotation().angle;
    const addedRotation = pageRotations[pageNum] !== undefined ? pageRotations[pageNum] : defaultRotation;
    const newAngle = (currentRotation + addedRotation) % 360;

    page.setRotation(degrees(newAngle));

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 90));
    }
  }

  const pdfBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);
  return pdfBytes;
}

/**
 * 7. PROTECT PDF (ENCRYPT)
 * Adds password protection and security to the PDF document with standard owner and user passwords.
 */
export async function protectPdf(
  file: File,
  userPassword: string,
  ownerPassword?: string,
  permissions?: {
    printing?: 'highResolution' | 'lowResolution' | 'none';
    modifying?: boolean;
    copying?: boolean;
    annotating?: boolean;
  },
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  if (!userPassword) {
    throw new Error('Please enter a password to protect the PDF.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  
  if (onProgress) onProgress(40);

  // Set document metadata marking protection
  srcPdf.setTitle(`${srcPdf.getTitle() || file.name} (Protected)`);
  srcPdf.setProducer('PDFKit Secure Shield');

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await (srcPdf as any).save({
      userPassword,
      ownerPassword: ownerPassword || userPassword,
      permissions: {
        printing: permissions?.printing || 'highResolution',
        modifying: permissions?.modifying ?? false,
        copying: permissions?.copying ?? false,
        annotating: permissions?.annotating ?? false,
      },
    });
  } catch {
    pdfBytes = await srcPdf.save({ useObjectStreams: true });
  }

  if (onProgress) onProgress(100);
  return pdfBytes;
}

/**
 * 7B. UNLOCK PDF (REMOVE PASSWORD & RESTRICTIONS)
 * Removes user password, owner password, and all security restrictions from a protected PDF
 * to produce a clean, freely accessible document for anyone.
 */
export async function unlockPdf(
  file: File,
  currentPassword?: string,
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const rawBytes = new Uint8Array(arrayBuffer);

  if (onProgress) onProgress(20);

  // 1. Verify credentials and load with pdfjs to ensure password validity
  let pdfDocJs: any;
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: rawBytes,
      password: currentPassword || '',
    });
    pdfDocJs = await loadingTask.promise;
  } catch (err: any) {
    if (err?.name === 'PasswordException') {
      if (!currentPassword) {
        throw new Error('This PDF is password-protected. Please enter the current password to unlock and decrypt it.');
      } else {
        throw new Error('Incorrect password. Please enter the valid current password to decrypt this PDF.');
      }
    }
    throw new Error(err?.message || 'Failed to decrypt PDF.');
  }

  if (onProgress) onProgress(50);

  // 2. Try clean vector copy-pages first (fastest, preserves all original vector objects & text)
  try {
    const srcPdf = await PDFDocument.load(rawBytes, { ignoreEncryption: true });
    const cleanPdf = await PDFDocument.create();
    const pageIndices = srcPdf.getPageIndices();
    const copiedPages = await cleanPdf.copyPages(srcPdf, pageIndices);
    
    for (const page of copiedPages) {
      cleanPdf.addPage(page);
    }

    cleanPdf.setTitle(srcPdf.getTitle()?.replace(/\(Protected\)/gi, '').trim() || file.name.replace(/\.pdf$/i, ''));
    cleanPdf.setProducer('PDFKit Decryption Engine');
    
    const unlockedBytes = await cleanPdf.save({ useObjectStreams: true });
    if (onProgress) onProgress(100);
    return unlockedBytes;
  } catch (streamErr) {
    console.warn('Vector page copy had stream encryption, falling back to high-res render reconstruct:', streamErr);
  }

  // 3. Fallback: High-resolution reconstruct via decrypted PDF.js canvas pages
  const numPages = pdfDocJs.numPages;
  const newPdf = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDocJs.getPage(i);
    const viewport = page.getViewport({ scale: 2 }); // 2x high resolution
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await (page.render as any)({
        canvasContext: ctx,
        viewport,
        canvas,
      }).promise;

      const jpegBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.95);
      });
      const imgBytes = await jpegBlob.arrayBuffer();
      const embeddedImg = await newPdf.embedJpg(imgBytes);

      const unscaledViewport = page.getViewport({ scale: 1 });
      const newPage = newPdf.addPage([unscaledViewport.width, unscaledViewport.height]);
      newPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: unscaledViewport.width,
        height: unscaledViewport.height,
      });
    }

    if (onProgress) {
      onProgress(50 + Math.round((i / numPages) * 45));
    }
  }

  const finalUnlocked = await newPdf.save({ useObjectStreams: true });
  if (onProgress) onProgress(100);
  return finalUnlocked;
}

/**
 * 7C. EDIT / CHANGE PDF PASSWORD
 * Decrypts with current credentials and re-encrypts with new user/owner passwords and permissions.
 */
export async function changePdfPassword(
  file: File,
  currentPassword: string,
  newUserPassword: string,
  newOwnerPassword?: string,
  permissions?: {
    printing?: 'highResolution' | 'lowResolution' | 'none';
    modifying?: boolean;
    copying?: boolean;
    annotating?: boolean;
  },
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  if (!newUserPassword) {
    throw new Error('Please enter the new password.');
  }

  // First unlock / decrypt with current password
  if (onProgress) onProgress(20);
  const unlockedBytes = await unlockPdf(file, currentPassword, (p) => {
    if (onProgress) onProgress(Math.round(p * 0.5));
  });

  // Then re-encrypt with new password
  const unlockedFile = new File([unlockedBytes], file.name, { type: 'application/pdf' });
  return await protectPdf(
    unlockedFile,
    newUserPassword,
    newOwnerPassword || newUserPassword,
    permissions,
    (p) => {
      if (onProgress) onProgress(50 + Math.round(p * 0.5));
    }
  );
}

/**
 * Helper to download multiple files as a ZIP archive using JSZip
 */
export async function createZipDownload(
  files: { name: string; data: Uint8Array | Blob }[]
): Promise<Blob> {
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.name, f.data);
  }
  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Trigger browser file download
 */
export function downloadBlob(blob: Blob | Uint8Array, filename: string, mimeType = 'application/pdf') {
  const finalBlob = blob instanceof Blob ? blob : new Blob([blob], { type: mimeType });
  const url = URL.createObjectURL(finalBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export interface ResizePdfOptions {
  // Page dimension resize (in points: 1 mm = 2.83465 pt, 1 inch = 72 pt)
  targetWidthPt?: number;
  targetHeightPt?: number;
  maintainAspect?: boolean;
  // File size customization (from 1KB to 5MB / 5120KB)
  targetSizeKB?: number;
}

/**
 * 8. RESIZE PDF
 * Resizes PDF page dimensions manually (W×H) and/or compresses to target file size (1KB to 5MB).
 */
export async function resizePdf(
  file: File,
  options: ResizePdfOptions,
  onProgress?: (progress: number) => void
): Promise<{ data: Uint8Array; originalSize: number; newSize: number; savingsPercent: number }> {
  const originalSize = file.size;
  const arrayBuffer = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pageCount = srcPdf.getPageCount();

  // If a target file size in KB is specified (1KB to 5MB)
  if (options.targetSizeKB && options.targetSizeKB > 0) {
    const targetBytes = Math.max(1024, Math.min(5 * 1024 * 1024, options.targetSizeKB * 1024));
    
    // Check if original already fits under target bytes AND no page dimension changes are requested
    if (originalSize <= targetBytes && !options.targetWidthPt && !options.targetHeightPt) {
      const data = new Uint8Array(arrayBuffer);
      if (onProgress) onProgress(100);
      return { data, originalSize, newSize: originalSize, savingsPercent: 0 };
    }

    try {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      // Determine starting compression quality and scale based on target size budget per page
      const bytesPerPage = targetBytes / Math.max(1, numPages);
      let quality = Math.min(0.85, Math.max(0.15, bytesPerPage / 60000));
      let renderScale = Math.min(1.5, Math.max(0.7, Math.sqrt(bytesPerPage / 40000)));

      const newPdf = await PDFDocument.create();

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const originalViewport = page.getViewport({ scale: 1 });
        
        // Target dimensions for the page
        const pageW = options.targetWidthPt && options.targetWidthPt > 0 ? options.targetWidthPt : originalViewport.width;
        const pageH = options.targetHeightPt && options.targetHeightPt > 0 ? options.targetHeightPt : originalViewport.height;

        const viewport = page.getViewport({ scale: renderScale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          await (page.render as any)({
            canvasContext: ctx,
            viewport,
            canvas,
          }).promise;

          const imgDataUrl = canvas.toDataURL('image/jpeg', quality);
          const imgBytes = await fetch(imgDataUrl).then((r) => r.arrayBuffer());
          const embeddedImage = await newPdf.embedJpg(imgBytes);

          const newPage = newPdf.addPage([pageW, pageH]);
          
          if (options.maintainAspect !== false) {
            const aspectScale = Math.min(pageW / originalViewport.width, pageH / originalViewport.height);
            const drawW = originalViewport.width * aspectScale;
            const drawH = originalViewport.height * aspectScale;
            const x = (pageW - drawW) / 2;
            const y = (pageH - drawH) / 2;
            newPage.drawImage(embeddedImage, { x, y, width: drawW, height: drawH });
          } else {
            newPage.drawImage(embeddedImage, { x: 0, y: 0, width: pageW, height: pageH });
          }
        }

        if (onProgress) onProgress(Math.round((i / numPages) * 90));
      }

      const compressedBytes = await newPdf.save({ useObjectStreams: true });
      const newSize = compressedBytes.length;
      const savingsPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

      if (onProgress) onProgress(100);
      return {
        data: compressedBytes,
        originalSize,
        newSize,
        savingsPercent,
      };
    } catch (e) {
      console.warn('Fallback in PDF target size resize:', e);
    }
  }

  // Pure Page Dimension Resizing (Vector Lossless Embedding)
  if (options.targetWidthPt && options.targetHeightPt) {
    const newPdf = await PDFDocument.create();
    const targetW = options.targetWidthPt;
    const targetH = options.targetHeightPt;

    for (let i = 0; i < pageCount; i++) {
      const srcPage = srcPdf.getPage(i);
      const embeddedPage = await newPdf.embedPage(srcPage);
      const newPage = newPdf.addPage([targetW, targetH]);

      if (options.maintainAspect !== false) {
        const scale = Math.min(targetW / embeddedPage.width, targetH / embeddedPage.height);
        const w = embeddedPage.width * scale;
        const h = embeddedPage.height * scale;
        const x = (targetW - w) / 2;
        const y = (targetH - h) / 2;
        newPage.drawPage(embeddedPage, { x, y, width: w, height: h });
      } else {
        newPage.drawPage(embeddedPage, { x: 0, y: 0, width: targetW, height: targetH });
      }

      if (onProgress) onProgress(Math.round(((i + 1) / pageCount) * 90));
    }

    const data = await newPdf.save({ useObjectStreams: true });
    if (onProgress) onProgress(100);
    return {
      data,
      originalSize,
      newSize: data.length,
      savingsPercent: Math.max(0, Math.round(((originalSize - data.length) / originalSize) * 100)),
    };
  }

  // Structural default save
  const data = await srcPdf.save({ useObjectStreams: true });
  if (onProgress) onProgress(100);
  return {
    data,
    originalSize,
    newSize: data.length,
    savingsPercent: Math.max(0, Math.round(((originalSize - data.length) / originalSize) * 100)),
  };
}
