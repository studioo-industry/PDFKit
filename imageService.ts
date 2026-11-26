import JSZip from 'jszip';
import { formatBytes } from './pdfService';

const isBlobLike = (val: any): val is Blob =>
  Boolean(val && typeof val === 'object' && typeof (val as any).slice === 'function' && typeof (val as any).size === 'number');

/**
 * Sniff magic bytes from image header to identify format accurately
 */
const sniffImageFormat = async (
  blob: Blob
): Promise<{ isPdf: boolean; mime: string | null; isHeic: boolean }> => {
  try {
    const slice = blob.slice(0, 32);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // PDF magic bytes (%PDF -> 0x25, 0x50, 0x44, 0x46)
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return { isPdf: true, mime: 'application/pdf', isHeic: false };
    }
    // JPEG (0xFF, 0xD8, 0xFF)
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return { isPdf: false, mime: 'image/jpeg', isHeic: false };
    }
    // PNG (0x89, 0x50, 0x4E, 0x47)
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return { isPdf: false, mime: 'image/png', isHeic: false };
    }
    // GIF ('GIF8' -> 0x47, 0x49, 0x46, 0x38)
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
      return { isPdf: false, mime: 'image/gif', isHeic: false };
    }
    // WebP ('RIFF'....'WEBP')
    if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) {
      return { isPdf: false, mime: 'image/webp', isHeic: false };
    }
    // BMP ('BM' -> 0x42, 0x4D)
    if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
      return { isPdf: false, mime: 'image/bmp', isHeic: false };
    }
    // HEIC / HEIF brands in ftyp box (bytes 4-11)
    if (bytes.length >= 12) {
      const ascii = String.fromCharCode(...bytes.slice(4, 12)).toLowerCase();
      if (ascii.includes('heic') || ascii.includes('mif1') || ascii.includes('msf1') || ascii.includes('heix') || ascii.includes('hevc')) {
        return { isPdf: false, mime: 'image/heic', isHeic: true };
      }
    }
  } catch {
    // ignore
  }
  return { isPdf: false, mime: null, isHeic: false };
};

/**
 * Fast binary parser for image dimensions directly from bytes without DOM rendering
 */
const parseImageDimensionsFromBytes = (bytes: Uint8Array): { width: number; height: number } | null => {
  try {
    // PNG IHDR chunk: bytes 16-19 width, 20-23 height (big endian)
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 && bytes.length >= 24) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const width = view.getUint32(16, false);
      const height = view.getUint32(20, false);
      if (width > 0 && height > 0) return { width, height };
    }

    // GIF header: bytes 6-7 width, 8-9 height (little endian)
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38 && bytes.length >= 10) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const width = view.getUint16(6, true);
      const height = view.getUint16(8, true);
      if (width > 0 && height > 0) return { width, height };
    }

    // BMP header: bytes 18-21 width, 22-25 height (little endian)
    if (bytes[0] === 0x42 && bytes[1] === 0x4D && bytes.length >= 26) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const width = view.getInt32(18, true);
      const height = Math.abs(view.getInt32(22, true));
      if (width > 0 && height > 0) return { width, height };
    }

    // JPEG markers: search for SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
    if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
      let offset = 2;
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      while (offset < bytes.length - 8) {
        if (bytes[offset] !== 0xFF) {
          offset++;
          continue;
        }
        const marker = bytes[offset + 1];
        if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
          const height = view.getUint16(offset + 5, false);
          const width = view.getUint16(offset + 7, false);
          if (width > 0 && height > 0) return { width, height };
        }
        offset += 2 + view.getUint16(offset + 2, false);
      }
    }
  } catch {
    // ignore
  }
  return null;
};

const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader did not return a string'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(blob);
  });
};

const loadImageFromUrl = (url: string, isObjectUrl: boolean): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // CRITICAL: NEVER set crossOrigin on blob: or data: URLs!
    if (url.startsWith('http://') || url.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }

    let isSettled = false;

    const cleanup = () => {
      if (isObjectUrl) {
        // Keep object URL alive for 60s so canvas / operations don't lose memory access
        setTimeout(() => {
          try {
            URL.revokeObjectURL(url);
          } catch {
            // ignore
          }
        }, 60000);
      }
    };

    // Safety timeout to prevent hanging on unresponsive loads
    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        cleanup();
        if (img.naturalWidth > 0) {
          resolve(img);
        } else {
          reject(new Error('Failed to load image file. Image load timed out.'));
        }
      }
    }, 15000);

    img.onload = () => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);
      cleanup();
      resolve(img);
    };

    img.onerror = () => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);
      cleanup();
      reject(new Error('Failed to load image file. Please ensure it is a valid image.'));
    };

    img.src = url;

    // Check if image is already completed (cached)
    if (img.complete && img.naturalWidth > 0) {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        cleanup();
        resolve(img);
      }
    }
  });
};

/**
 * Load an image from a File, Blob, or URL into an HTMLImageElement
 * Equipped with multi-layered decoding:
 * 1. HEIC / HEIF auto-conversion
 * 2. Native GPU/CPU direct decoding via createImageBitmap
 * 3. Object URL fallback with crossOrigin safety
 * 4. FileReader Base64 fallback for strict sandboxes
 */
export const loadImage = async (source: any): Promise<HTMLImageElement> => {
  // Normalize input if an UploadedFileItem was passed
  let raw: any = source;
  if (raw && typeof raw === 'object') {
    if (raw.file) raw = raw.file;
    else if (typeof raw.previewUrl === 'string') raw = raw.previewUrl;
  }

  if (!raw) {
    throw new Error('No image file or source provided.');
  }

  // Handle direct string URLs
  if (typeof raw === 'string') {
    return await loadImageFromUrl(raw, false);
  }

  if (!isBlobLike(raw)) {
    throw new Error('Failed to load image file. Invalid image source provided.');
  }

  let blob: Blob = raw;

  // Sniff magic bytes
  const header = await sniffImageFormat(blob);
  if (header.isPdf) {
    throw new Error('This file is a PDF document. Please use "PDF to JPG" or PDF tools to process PDF files.');
  }

  // Handle HEIC / HEIF images (common from iPhones / iOS cameras)
  const filename = (raw as File).name || '';
  const isHeic = header.isHeic || /\.(heic|heif)$/i.test(filename) || blob.type.includes('heic') || blob.type.includes('heif');

  if (isHeic) {
    try {
      const heic2anyModule = await import('heic2any');
      const heic2anyFn = (heic2anyModule as any).default || heic2anyModule;
      const converted = await heic2anyFn({
        blob,
        toType: 'image/jpeg',
        quality: 0.95,
      });
      blob = Array.isArray(converted) ? converted[0] : converted;
    } catch (heicErr) {
      console.warn('HEIC auto-conversion warning:', heicErr);
    }
  }

  // Strategy 1: Native direct GPU/CPU decode via createImageBitmap (ultra-fast, no DOM attachment)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      const w = bitmap.width;
      const h = bitmap.height;
      if (w > 0 && h > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close();
          const dataUrl = canvas.toDataURL('image/png');
          const img = new Image();
          img.src = dataUrl;
          if (img.complete && img.naturalWidth > 0) {
            return img;
          }
          return await new Promise<HTMLImageElement>((resolve) => {
            img.onload = () => resolve(img);
            img.onerror = () => resolve(img);
          });
        }
      }
    } catch {
      // Fall through to object URL (e.g. SVGs)
    }
  }

  // Strategy 2: URL.createObjectURL
  try {
    const objUrl = URL.createObjectURL(blob);
    return await loadImageFromUrl(objUrl, true);
  } catch {
    // Strategy 3: FileReader base64 Data URL (immune to iframe sandbox blob restrictions)
    try {
      const dataUrl = await blobToDataUrl(blob);
      return await loadImageFromUrl(dataUrl, false);
    } catch {
      throw new Error('Failed to load image file. Please ensure it is a valid image (JPG, PNG, WEBP, GIF, SVG).');
    }
  }
};

/**
 * Read image natural dimensions from a File or Blob
 */
export const getImageDimensions = async (source: any): Promise<{ width: number; height: number }> => {
  let file: any = source;
  if (file && typeof file === 'object' && file.file) file = file.file;

  if (isBlobLike(file)) {
    // 1. Fast byte header sniff (under 1ms, zero memory overhead)
    try {
      const slice = file.slice(0, 65536);
      const buffer = await slice.arrayBuffer();
      const parsed = parseImageDimensionsFromBytes(new Uint8Array(buffer));
      if (parsed && parsed.width > 0 && parsed.height > 0) {
        return parsed;
      }
    } catch {
      // ignore
    }

    // 2. Native createImageBitmap
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file);
        const w = bitmap.width;
        const h = bitmap.height;
        bitmap.close();
        if (w > 0 && h > 0) {
          return { width: w, height: h };
        }
      } catch {
        // fallback
      }
    }
  }

  // 3. Fallback to loadImage
  try {
    const img = await loadImage(file);
    const w = img.naturalWidth || img.width || 1920;
    const h = img.naturalHeight || img.height || 1080;
    return { width: w, height: h };
  } catch (err) {
    console.error('Failed to get image dimensions, using safe fallback:', err);
    return { width: 1920, height: 1080 };
  }
};

/**
 * Helper to convert canvas to Blob with fallback
 */
export const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string = 'image/jpeg',
  quality: number = 0.85
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate image blob from canvas'));
        }
      },
      type,
      quality
    );
  });
};

export interface CompressImageOptions {
  quality: number; // 0.1 to 1.0
  maxDimension?: number; // e.g. 1920
  outputType?: 'image/jpeg' | 'image/webp' | 'image/png' | 'original';
}

export interface CompressResultItem {
  name: string;
  blob: Blob;
  dataUrl: string;
  originalSize: number;
  newSize: number;
  width: number;
  height: number;
  savedPercent: number;
}

/**
 * Compress a single image
 */
export const compressSingleImage = async (
  file: File,
  options: CompressImageOptions
): Promise<CompressResultItem> => {
  const img = await loadImage(file);
  let targetWidth = img.naturalWidth || img.width;
  let targetHeight = img.naturalHeight || img.height;

  if (options.maxDimension && (targetWidth > options.maxDimension || targetHeight > options.maxDimension)) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * options.maxDimension) / targetWidth);
      targetWidth = options.maxDimension;
    } else {
      targetWidth = Math.round((targetWidth * options.maxDimension) / targetHeight);
      targetHeight = options.maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not obtain canvas 2D rendering context');

  let mimeType = 'image/jpeg';
  if (options.outputType === 'original') {
    mimeType = file.type || 'image/jpeg';
  } else if (options.outputType) {
    mimeType = options.outputType;
  }

  // Draw background white for jpeg if original had transparency
  if (mimeType === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const quality = Math.min(Math.max(options.quality, 0.05), 1.0);
  const blob = await canvasToBlob(canvas, mimeType, quality);
  const dataUrl = canvas.toDataURL(mimeType, quality);

  const originalSize = file.size;
  const newSize = blob.size;
  const savedPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

  let ext = '.jpg';
  if (mimeType === 'image/png') ext = '.png';
  if (mimeType === 'image/webp') ext = '.webp';
  const cleanName = file.name.replace(/\.[^/.]+$/, '') + '_compressed' + ext;

  return {
    name: cleanName,
    blob,
    dataUrl,
    originalSize,
    newSize,
    width: targetWidth,
    height: targetHeight,
    savedPercent,
  };
};

/**
 * Batch compress multiple images with progress callback
 */
export const batchCompressImages = async (
  files: File[],
  options: CompressImageOptions,
  onProgress?: (progress: number) => void
): Promise<{ items: CompressResultItem[]; zipBlob?: Blob }> => {
  const items: CompressResultItem[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const item = await compressSingleImage(file, options);
    items.push(item);
    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 90));
    }
  }

  let zipBlob: Blob | undefined;
  if (items.length > 1) {
    const zip = new JSZip();
    items.forEach((item) => {
      zip.file(item.name, item.blob);
    });
    zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
      if (onProgress) {
        onProgress(90 + Math.round(metadata.percent * 0.1));
      }
    });
  }

  if (onProgress) onProgress(100);
  return { items, zipBlob };
};

/**
 * Resize an image by explicit dimensions or percentage
 */
export const resizeImage = async (
  file: File,
  options: {
    width: number;
    height: number;
    maintainAspect?: boolean;
    format?: 'image/jpeg' | 'image/png' | 'image/webp';
    quality?: number;
  }
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number; filename: string }> => {
  const img = await loadImage(file);
  const origW = img.naturalWidth || img.width || 100;
  const origH = img.naturalHeight || img.height || 100;

  let targetW = Math.max(1, Math.round(options.width || origW));
  let targetH = Math.max(1, Math.round(options.height || origH));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const fName = file?.name || '';
  let format: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg';
  if (options.format) {
    format = options.format;
  } else if (file.type === 'image/png' || fName.toLowerCase().endsWith('.png')) {
    format = 'image/png';
  } else if (file.type === 'image/webp' || fName.toLowerCase().endsWith('.webp')) {
    format = 'image/webp';
  }

  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
  }

  // Smooth scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const quality = options.quality !== undefined ? options.quality : 0.92;
  const blob = await canvasToBlob(canvas, format, quality);
  const dataUrl = canvas.toDataURL(format, quality);

  let ext = '.jpg';
  if (format === 'image/png') ext = '.png';
  if (format === 'image/webp') ext = '.webp';
  const filename = file.name.replace(/\.[^/.]+$/, '') + `_${targetW}x${targetH}` + ext;

  return { blob, dataUrl, width: targetW, height: targetH, filename };
};

/**
 * Resize image to hit a custom target file size (from 1KB to 5MB)
 * Optionally with specified width & height, or maintaining aspect ratio.
 */
export const resizeImageToTargetFileSize = async (
  file: File,
  options: {
    targetSizeKB: number; // 1 to 5120 (5MB)
    width?: number;
    height?: number;
    format?: 'image/jpeg' | 'image/png' | 'image/webp';
  }
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number; filename: string; actualSize: number }> => {
  const targetBytes = Math.max(1024, Math.min(5 * 1024 * 1024, options.targetSizeKB * 1024));
  const img = await loadImage(file);
  const origW = img.naturalWidth || img.width || 100;
  const origH = img.naturalHeight || img.height || 100;

  let baseW = options.width && options.width > 0 ? Math.round(options.width) : origW;
  let baseH = options.height && options.height > 0 ? Math.round(options.height) : origH;

  const fName2 = file?.name || '';
  let format: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg';
  if (options.format) {
    format = options.format;
  } else if (file.type === 'image/png' || fName2.toLowerCase().endsWith('.png')) {
    format = 'image/png';
  } else if (file.type === 'image/webp' || fName2.toLowerCase().endsWith('.webp')) {
    format = 'image/webp';
  }

  // PNG is lossless and cannot be calibrated by compression quality, so for target size use jpeg/webp
  const effectiveFormat = format === 'image/png' && options.targetSizeKB < 200 ? 'image/jpeg' : format;

  let bestBlob: Blob | null = null;
  let bestDataUrl = '';
  let bestW = baseW;
  let bestH = baseH;

  // Try scale factors if initial size at lowest quality is still too big
  let scale = 1.0;
  for (let attempt = 0; attempt < 5; attempt++) {
    const curW = Math.max(1, Math.round(baseW * scale));
    const curH = Math.max(1, Math.round(baseH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = curW;
    canvas.height = curH;
    const ctx = canvas.getContext('2d');
    if (!ctx) break;

    if (effectiveFormat === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, curW, curH);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, curW, curH);

    // Binary search quality between 0.05 and 0.98
    let lowQ = 0.05;
    let highQ = 0.98;
    let localBestBlob: Blob | null = null;
    let localBestDataUrl = '';

    for (let iter = 0; iter < 7; iter++) {
      const midQ = (lowQ + highQ) / 2;
      const blob = await canvasToBlob(canvas, effectiveFormat, midQ);
      const dataUrl = canvas.toDataURL(effectiveFormat, midQ);

      if (blob.size <= targetBytes) {
        localBestBlob = blob;
        localBestDataUrl = dataUrl;
        lowQ = midQ; // Try higher quality
      } else {
        highQ = midQ; // File too large, reduce quality
      }
    }

    if (localBestBlob && localBestBlob.size <= targetBytes) {
      bestBlob = localBestBlob;
      bestDataUrl = localBestDataUrl;
      bestW = curW;
      bestH = curH;
      break;
    } else {
      scale *= 0.75;
      if (scale < 0.1) break;
    }
  }

  // Fallback if needed
  if (!bestBlob) {
    const canvas = document.createElement('canvas');
    const curW = Math.max(32, Math.round(baseW * 0.25));
    const curH = Math.max(32, Math.round(baseH * 0.25));
    canvas.width = curW;
    canvas.height = curH;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, curW, curH);
    bestBlob = await canvasToBlob(canvas, 'image/jpeg', 0.1);
    bestDataUrl = canvas.toDataURL('image/jpeg', 0.1);
    bestW = curW;
    bestH = curH;
  }

  let ext = '.jpg';
  if (effectiveFormat === 'image/webp') ext = '.webp';
  else if (effectiveFormat === 'image/png') ext = '.png';
  const filename = file.name.replace(/\.[^/.]+$/, '') + `_${options.targetSizeKB}KB` + ext;

  return {
    blob: bestBlob,
    dataUrl: bestDataUrl,
    width: bestW,
    height: bestH,
    filename,
    actualSize: bestBlob.size,
  };
};

/**
 * Crop an image using normalized or absolute coordinates
 */
export const cropImage = async (
  file: File,
  crop: { x: number; y: number; width: number; height: number },
  options?: { format?: 'image/jpeg' | 'image/png' | 'image/webp'; quality?: number }
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number; filename: string }> => {
  const img = await loadImage(file);
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;

  const cropX = Math.max(0, Math.min(crop.x, imgW - 1));
  const cropY = Math.max(0, Math.min(crop.y, imgH - 1));
  const cropW = Math.max(1, Math.min(crop.width, imgW - cropX));
  const cropH = Math.max(1, Math.min(crop.height, imgH - cropY));

  const canvas = document.createElement('canvas');
  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const format = options?.format || (file.type as any) || 'image/jpeg';
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cropW, cropH);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  const quality = options?.quality ?? 0.92;
  const blob = await canvasToBlob(canvas, format, quality);
  const dataUrl = canvas.toDataURL(format, quality);

  let ext = '.jpg';
  if (format === 'image/png') ext = '.png';
  if (format === 'image/webp') ext = '.webp';
  const filename = file.name.replace(/\.[^/.]+$/, '') + `_cropped` + ext;

  return { blob, dataUrl, width: cropW, height: cropH, filename };
};

/**
 * Convert an image file format
 */
export const convertImageFormat = async (
  file: File,
  targetFormat: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/bmp',
  quality: number = 0.92,
  extensionOverride?: 'jpg' | 'jpeg' | 'png' | 'webp' | 'bmp'
): Promise<{ blob: Blob; dataUrl: string; filename: string; size: number }> => {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  if (targetFormat === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0);

  const mime = targetFormat === 'image/bmp' ? 'image/png' : targetFormat;
  const blob = await canvasToBlob(canvas, mime, quality);
  const dataUrl = canvas.toDataURL(mime, quality);

  let ext = '.jpg';
  if (extensionOverride) {
    ext = `.${extensionOverride}`;
  } else if (targetFormat === 'image/png') {
    ext = '.png';
  } else if (targetFormat === 'image/webp') {
    ext = '.webp';
  } else if (targetFormat === 'image/bmp') {
    ext = '.bmp';
  }

  const filename = file.name.replace(/\.[^/.]+$/, '') + ext;

  return { blob, dataUrl, filename, size: blob.size };
};

/**
 * Apply Watermark to image
 */
export interface WatermarkOptions {
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'tile';
  rotation: number; // degrees
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
  quality?: number;
}

export const watermarkImage = async (
  file: File,
  options: WatermarkOptions
): Promise<{ blob: Blob; dataUrl: string; filename: string }> => {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const format = options.format || (file.type as any) || 'image/jpeg';
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }

  ctx.drawImage(img, 0, 0);

  // Apply watermark text
  ctx.save();
  ctx.globalAlpha = Math.max(0.05, Math.min(options.opacity, 1));
  ctx.fillStyle = options.color;
  ctx.font = `bold ${options.fontSize}px 'Google Sans', 'Plus Jakarta Sans', Arial, sans-serif`;
  ctx.textBaseline = 'middle';

  const margin = Math.round(options.fontSize * 1.5);

  if (options.position === 'tile') {
    const textMetrics = ctx.measureText(options.text);
    const stepX = textMetrics.width + 120;
    const stepY = options.fontSize * 4;

    ctx.translate(w / 2, h / 2);
    ctx.rotate((options.rotation * Math.PI) / 180);
    ctx.translate(-w / 2, -h / 2);

    for (let x = -w; x < w * 2; x += stepX) {
      for (let y = -h; y < h * 2; y += stepY) {
        ctx.fillText(options.text, x, y);
      }
    }
  } else {
    ctx.textAlign = 'center';
    let posX = w / 2;
    let posY = h / 2;

    if (options.position === 'top-left') {
      ctx.textAlign = 'left';
      posX = margin;
      posY = margin;
    } else if (options.position === 'top-right') {
      ctx.textAlign = 'right';
      posX = w - margin;
      posY = margin;
    } else if (options.position === 'bottom-left') {
      ctx.textAlign = 'left';
      posX = margin;
      posY = h - margin;
    } else if (options.position === 'bottom-right') {
      ctx.textAlign = 'right';
      posX = w - margin;
      posY = h - margin;
    }

    ctx.translate(posX, posY);
    ctx.rotate((options.rotation * Math.PI) / 180);
    ctx.fillText(options.text, 0, 0);
  }

  ctx.restore();

  const quality = options.quality ?? 0.92;
  const blob = await canvasToBlob(canvas, format, quality);
  const dataUrl = canvas.toDataURL(format, quality);

  let ext = '.jpg';
  if (format === 'image/png') ext = '.png';
  if (format === 'image/webp') ext = '.webp';
  const filename = file.name.replace(/\.[^/.]+$/, '') + '_watermarked' + ext;

  return { blob, dataUrl, filename };
};

/**
 * Rotate & Flip Image
 */
export const rotateFlipImage = async (
  file: File,
  rotation: number, // 0, 90, 180, 270
  flipH: boolean,
  flipV: boolean,
  format: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
  quality: number = 0.92
): Promise<{ blob: Blob; dataUrl: string; filename: string }> => {
  const img = await loadImage(file);
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  const is90or270 = Math.abs(rotation % 180) === 90;
  const canvasW = is90or270 ? origH : origW;
  const canvasH = is90or270 ? origW : origH;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  ctx.save();
  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(img, -origW / 2, -origH / 2);
  ctx.restore();

  const blob = await canvasToBlob(canvas, format, quality);
  const dataUrl = canvas.toDataURL(format, quality);

  let ext = '.jpg';
  if (format === 'image/png') ext = '.png';
  if (format === 'image/webp') ext = '.webp';
  const filename = file.name.replace(/\.[^/.]+$/, '') + '_transformed' + ext;

  return { blob, dataUrl, filename };
};

/**
 * Photo Filters & Adjustments
 */
export interface ImageFilters {
  brightness: number; // 0 to 200, 100 default
  contrast: number; // 0 to 200, 100 default
  saturation: number; // 0 to 200, 100 default
  grayscale: number; // 0 to 100, 0 default
  sepia: number; // 0 to 100, 0 default
  invert: number; // 0 to 100, 0 default
  blur: number; // 0 to 20px, 0 default
  hueRotate: number; // 0 to 360, 0 default
}

export const applyImageFilters = async (
  file: File,
  filters: ImageFilters,
  format: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
  quality: number = 0.92
): Promise<{ blob: Blob; dataUrl: string; filename: string }> => {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }

  // Construct CSS filter string
  const filterString = [
    `brightness(${filters.brightness}%)`,
    `contrast(${filters.contrast}%)`,
    `saturate(${filters.saturation}%)`,
    `grayscale(${filters.grayscale}%)`,
    `sepia(${filters.sepia}%)`,
    `invert(${filters.invert}%)`,
    `blur(${filters.blur}px)`,
    `hue-rotate(${filters.hueRotate}deg)`,
  ].join(' ');

  ctx.filter = filterString;
  ctx.drawImage(img, 0, 0);

  const blob = await canvasToBlob(canvas, format, quality);
  const dataUrl = canvas.toDataURL(format, quality);

  let ext = '.jpg';
  if (format === 'image/png') ext = '.png';
  if (format === 'image/webp') ext = '.webp';
  const filename = file.name.replace(/\.[^/.]+$/, '') + '_filtered' + ext;

  return { blob, dataUrl, filename };
};

/**
 * Merge/Collage Images horizontally, vertically, or in a grid
 */
export const mergeImages = async (
  files: File[],
  layout: 'horizontal' | 'vertical' | 'grid',
  options: { spacing: number; bgColor: string; columns?: number }
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number; filename: string }> => {
  if (files.length === 0) throw new Error('No images to merge');

  const loaded = await Promise.all(files.map((f) => loadImage(f)));
  const spacing = options.spacing || 0;
  const bgColor = options.bgColor || '#ffffff';

  let totalW = 0;
  let totalH = 0;

  if (layout === 'horizontal') {
    const maxHeight = Math.max(...loaded.map((img) => img.naturalHeight || img.height));
    const normalizedWidths = loaded.map((img) => {
      const origH = img.naturalHeight || img.height;
      const origW = img.naturalWidth || img.width;
      return (origW * maxHeight) / origH;
    });

    totalW = normalizedWidths.reduce((a, b) => a + b, 0) + spacing * (loaded.length + 1);
    totalH = maxHeight + spacing * 2;

    const canvas = document.createElement('canvas');
    canvas.width = totalW;
    canvas.height = totalH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, totalW, totalH);

    let currentX = spacing;
    loaded.forEach((img, i) => {
      const drawW = normalizedWidths[i];
      ctx.drawImage(img, currentX, spacing, drawW, maxHeight);
      currentX += drawW + spacing;
    });

    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    return { blob, dataUrl, width: totalW, height: totalH, filename: 'merged_horizontal.jpg' };
  } else if (layout === 'vertical') {
    const maxWidth = Math.max(...loaded.map((img) => img.naturalWidth || img.width));
    const normalizedHeights = loaded.map((img) => {
      const origH = img.naturalHeight || img.height;
      const origW = img.naturalWidth || img.width;
      return (origH * maxWidth) / origW;
    });

    totalW = maxWidth + spacing * 2;
    totalH = normalizedHeights.reduce((a, b) => a + b, 0) + spacing * (loaded.length + 1);

    const canvas = document.createElement('canvas');
    canvas.width = totalW;
    canvas.height = totalH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, totalW, totalH);

    let currentY = spacing;
    loaded.forEach((img, i) => {
      const drawH = normalizedHeights[i];
      ctx.drawImage(img, spacing, currentY, maxWidth, drawH);
      currentY += drawH + spacing;
    });

    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    return { blob, dataUrl, width: totalW, height: totalH, filename: 'merged_vertical.jpg' };
  } else {
    // Grid layout
    const cols = options.columns || (loaded.length <= 4 ? 2 : 3);
    const rows = Math.ceil(loaded.length / cols);
    const cellW = 800;
    const cellH = 600;

    totalW = cols * cellW + (cols + 1) * spacing;
    totalH = rows * cellH + (rows + 1) * spacing;

    const canvas = document.createElement('canvas');
    canvas.width = totalW;
    canvas.height = totalH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, totalW, totalH);

    loaded.forEach((img, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const posX = spacing + col * (cellW + spacing);
      const posY = spacing + row * (cellH + spacing);

      // Fit image cover into cell
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;
      const scale = Math.max(cellW / origW, cellH / origH);
      const scaledW = origW * scale;
      const scaledH = origH * scale;
      const offsetX = posX + (cellW - scaledW) / 2;
      const offsetY = posY + (cellH - scaledH) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(posX, posY, cellW, cellH);
      ctx.clip();
      ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);
      ctx.restore();
    });

    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    return { blob, dataUrl, width: totalW, height: totalH, filename: 'collage_grid.jpg' };
  }
};
