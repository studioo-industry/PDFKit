import { canvasToBlob } from './imageService';

export interface PassportPreset {
  id: string;
  name: string;
  country: string;
  widthMm: number;
  heightMm: number;
  widthPx: number; // calculated at 300 DPI
  heightPx: number;
  description: string;
  bgColor: string;
}

export const PASSPORT_PRESETS: PassportPreset[] = [
  {
    id: 'india-passport',
    name: 'India Passport & Visa',
    country: 'India',
    widthMm: 35,
    heightMm: 45,
    widthPx: 413,
    heightPx: 531,
    description: '35x45 mm, 80% face coverage, plain white background',
    bgColor: '#ffffff',
  },
  {
    id: 'us-visa',
    name: 'US Visa & Passport',
    country: 'United States',
    widthMm: 51,
    heightMm: 51,
    widthPx: 600,
    heightPx: 600,
    description: '2x2 inches (51x51 mm), white / off-white background',
    bgColor: '#ffffff',
  },
  {
    id: 'uk-schengen',
    name: 'UK / Schengen / Europe',
    country: 'Europe',
    widthMm: 35,
    heightMm: 45,
    widthPx: 413,
    heightPx: 531,
    description: '35x45 mm, light grey / cream / off-white background',
    bgColor: '#f3f4f6',
  },
  {
    id: 'canada',
    name: 'Canada Passport',
    country: 'Canada',
    widthMm: 50,
    heightMm: 70,
    widthPx: 590,
    heightPx: 826,
    description: '50x70 mm, white or light-coloured background',
    bgColor: '#ffffff',
  },
  {
    id: 'australia',
    name: 'Australia Passport',
    country: 'Australia',
    widthMm: 35,
    heightMm: 45,
    widthPx: 413,
    heightPx: 531,
    description: '35x45 mm, plain white or light grey background',
    bgColor: '#ffffff',
  },
  {
    id: 'uae-dubai',
    name: 'UAE / Dubai Visa',
    country: 'UAE',
    widthMm: 40,
    heightMm: 60,
    widthPx: 472,
    heightPx: 708,
    description: '40x60 mm, white background, high contrast',
    bgColor: '#ffffff',
  },
  {
    id: 'voter-id-standard',
    name: 'Election Commission Voter ID',
    country: 'India',
    widthMm: 32,
    heightMm: 24,
    widthPx: 378,
    heightPx: 283,
    description: 'NVSP standard 3.2x2.4 cm or 35x45 mm under 50KB',
    bgColor: '#ffffff',
  },
  {
    id: 'driving-licence-standard',
    name: 'RTO Sarathi Driving Licence',
    country: 'India',
    widthMm: 35,
    heightMm: 45,
    widthPx: 420,
    heightPx: 525,
    description: '35x45 mm (420x525 px), 20KB - 50KB limit',
    bgColor: '#ffffff',
  },
];

/**
 * Creates a passport photo canvas with pan, zoom, background replacement and optional name/date strip
 */
export function renderPassportPhoto(
  img: HTMLImageElement,
  options: {
    targetWidth: number;
    targetHeight: number;
    zoom: number;
    panX: number;
    panY: number;
    rotation?: number;
    bgColor?: string; // e.g. '#ffffff' or 'transparent' or '#cce6ff'
    addNameDate?: boolean;
    candidateName?: string;
    photoDate?: string;
    borderWidth?: number;
  }
): HTMLCanvasElement {
  const {
    targetWidth,
    targetHeight,
    zoom,
    panX,
    panY,
    rotation = 0,
    bgColor = '#ffffff',
    addNameDate = false,
    candidateName = '',
    photoDate = '',
    borderWidth = 0,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Fill background
  if (bgColor && bgColor !== 'transparent') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  // 2. Draw image with pan, zoom, rotation
  ctx.save();
  ctx.translate(targetWidth / 2 + panX, targetHeight / 2 + panY);
  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180);
  }

  // Scale image to cover target
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const targetAspect = targetWidth / targetHeight;

  let drawW: number;
  let drawH: number;

  if (imgAspect > targetAspect) {
    drawH = targetHeight * zoom;
    drawW = drawH * imgAspect;
  } else {
    drawW = targetWidth * zoom;
    drawH = drawW / imgAspect;
  }

  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  // 3. Name & Date bottom bar (if enabled)
  if (addNameDate && (candidateName.trim() || photoDate.trim())) {
    const stripHeight = Math.max(48, Math.round(targetHeight * 0.18));
    const stripY = targetHeight - stripHeight;

    // White strip background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, stripY, targetWidth, stripHeight);

    // Top border of strip
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, stripY);
    ctx.lineTo(targetWidth, stripY);
    ctx.stroke();

    // Text formatting
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const fontSize = Math.max(13, Math.round(stripHeight * 0.32));
    ctx.font = `bold ${fontSize}px sans-serif`;

    if (candidateName.trim() && photoDate.trim()) {
      ctx.fillText(candidateName.trim().toUpperCase(), targetWidth / 2, stripY + stripHeight * 0.32);
      ctx.font = `600 ${fontSize - 1}px sans-serif`;
      ctx.fillText(photoDate.trim(), targetWidth / 2, stripY + stripHeight * 0.72);
    } else if (candidateName.trim()) {
      ctx.fillText(candidateName.trim().toUpperCase(), targetWidth / 2, stripY + stripHeight / 2);
    } else if (photoDate.trim()) {
      ctx.fillText(photoDate.trim(), targetWidth / 2, stripY + stripHeight / 2);
    }
  }

  // 4. Border outline (if requested)
  if (borderWidth > 0) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(borderWidth / 2, borderWidth / 2, targetWidth - borderWidth, targetHeight - borderWidth);
  }

  return canvas;
}

/**
 * Generates a printable multi-photo sheet (4x6 inch or A4) with cut marks
 */
export function generatePrintableSheet(
  photoCanvas: HTMLCanvasElement,
  sheetType: '4x6-6' | '4x6-8' | 'a4-16' | 'a4-32'
): HTMLCanvasElement {
  let sheetWidth: number;
  let sheetHeight: number;
  let cols: number;
  let rows: number;

  if (sheetType === '4x6-6') {
    // 4x6" @ 300 DPI = 1200 x 1800 px (landscape 1800 x 1200)
    sheetWidth = 1800;
    sheetHeight = 1200;
    cols = 3;
    rows = 2;
  } else if (sheetType === '4x6-8') {
    sheetWidth = 1800;
    sheetHeight = 1200;
    cols = 4;
    rows = 2;
  } else if (sheetType === 'a4-32') {
    // A4 @ 300 DPI = 2480 x 3508 px
    sheetWidth = 2480;
    sheetHeight = 3508;
    cols = 4;
    rows = 8;
  } else {
    // a4-16
    sheetWidth = 2480;
    sheetHeight = 3508;
    cols = 4;
    rows = 4;
  }

  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = sheetWidth;
  sheetCanvas.height = sheetHeight;
  const ctx = sheetCanvas.getContext('2d');
  if (!ctx) return sheetCanvas;

  // Pure white paper background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, sheetWidth, sheetHeight);

  // Calculate cell sizes and padding
  const marginX = 80;
  const marginY = 80;
  const usableW = sheetWidth - marginX * 2;
  const usableH = sheetHeight - marginY * 2;

  const cellW = usableW / cols;
  const cellH = usableH / rows;

  // Maintain photo aspect ratio inside cell
  const photoAspect = photoCanvas.width / photoCanvas.height;
  let targetPhotoW = cellW * 0.9;
  let targetPhotoH = targetPhotoW / photoAspect;

  if (targetPhotoH > cellH * 0.9) {
    targetPhotoH = cellH * 0.9;
    targetPhotoW = targetPhotoH * photoAspect;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = marginX + c * cellW + (cellW - targetPhotoW) / 2;
      const y = marginY + r * cellH + (cellH - targetPhotoH) / 2;

      // Draw photo
      ctx.drawImage(photoCanvas, x, y, targetPhotoW, targetPhotoH);

      // Draw thin cutting guide outline
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, targetPhotoW, targetPhotoH);

      // Little corner cut crosshairs
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1;
      const markLen = 8;
      // top-left
      ctx.beginPath();
      ctx.moveTo(x - markLen, y); ctx.lineTo(x, y);
      ctx.moveTo(x, y - markLen); ctx.lineTo(x, y);
      // bottom-right
      ctx.moveTo(x + targetPhotoW, y + targetPhotoH); ctx.lineTo(x + targetPhotoW + markLen, y + targetPhotoH);
      ctx.moveTo(x + targetPhotoW, y + targetPhotoH); ctx.lineTo(x + targetPhotoW, y + targetPhotoH + markLen);
      ctx.stroke();
    }
  }

  // Add sheet header watermark info
  ctx.fillStyle = '#9ca3af';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `PDFKit Official Passport Photo Sheet (${cols * rows} Photos) • Ready to Print on Photo Glossy Paper`,
    sheetWidth / 2,
    sheetHeight - 30
  );

  return sheetCanvas;
}

/**
 * Smart background color detector and replacer
 */
export function removeAndReplaceBackground(
  img: HTMLImageElement,
  options: {
    sampleColor?: { r: number; g: number; b: number };
    tolerance: number; // 1 to 100
    feather: number; // 0 to 10
    replacementColor: string; // '#ffffff', '#cce6ff', 'transparent', etc.
    customMask?: Uint8Array; // optional manual erase mask
  }
): HTMLCanvasElement {
  const { sampleColor, tolerance = 35, feather = 2, replacementColor = '#ffffff', customMask } = options;

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // If no sample color provided, sample top-left, top-right, and top-center edge pixels
  let targetR = 255;
  let targetG = 255;
  let targetB = 255;

  if (sampleColor) {
    targetR = sampleColor.r;
    targetG = sampleColor.g;
    targetB = sampleColor.b;
  } else {
    // Sample top edge corners
    const p1 = 0;
    const p2 = (canvas.width - 1) * 4;
    targetR = Math.round((data[p1] + data[p2]) / 2);
    targetG = Math.round((data[p1 + 1] + data[p2 + 1]) / 2);
    targetB = Math.round((data[p1 + 2] + data[p2 + 2]) / 2);
  }

  // Parse replacement color
  let repR = 255;
  let repG = 255;
  let repB = 255;
  let repAlpha = 255;

  if (replacementColor === 'transparent') {
    repAlpha = 0;
  } else if (replacementColor.startsWith('#')) {
    const hex = replacementColor.replace('#', '');
    repR = parseInt(hex.substring(0, 2), 16) || 255;
    repG = parseInt(hex.substring(2, 4), 16) || 255;
    repB = parseInt(hex.substring(4, 6), 16) || 255;
  }

  const maxDist = (tolerance / 100) * 441.67; // max Euclidean distance in RGB is sqrt(255^2*3) ~ 441.67
  const featherDist = Math.max(1, feather * 6);

  const len = data.length;
  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dr = r - targetR;
    const dg = g - targetG;
    const db = b - targetB;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);

    if (dist < maxDist) {
      // It's background
      if (repAlpha === 0) {
        data[i + 3] = 0;
      } else {
        // Blend with replacement
        data[i] = repR;
        data[i + 1] = repG;
        data[i + 2] = repB;
        data[i + 3] = 255;
      }
    } else if (dist < maxDist + featherDist && featherDist > 0) {
      // Soft transition feathering
      const t = (dist - maxDist) / featherDist; // 0 (bg) to 1 (fg)
      if (repAlpha === 0) {
        data[i + 3] = Math.round(t * 255);
      } else {
        data[i] = Math.round(repR * (1 - t) + r * t);
        data[i + 1] = Math.round(repG * (1 - t) + g * t);
        data[i + 2] = Math.round(repB * (1 - t) + b * t);
      }
    }
  }

  // Apply custom erase/restore mask if provided
  if (customMask && customMask.length === canvas.width * canvas.height) {
    for (let p = 0; p < customMask.length; p++) {
      const idx = p * 4;
      if (customMask[p] === 1) {
        // Forced erased
        if (repAlpha === 0) {
          data[idx + 3] = 0;
        } else {
          data[idx] = repR;
          data[idx + 1] = repG;
          data[idx + 2] = repB;
          data[idx + 3] = 255;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * 1-Click Photo Enhancer for blurry, dark, low-contrast document & ID photos
 */
export function enhanceDocumentPhoto(
  img: HTMLImageElement,
  options: {
    brightness: number; // -50 to +50
    contrast: number; // -50 to +50
    sharpness: number; // 0 to 100
    exposure: number; // -50 to +50
    denoise: number; // 0 to 50
    autoEnhance?: boolean;
    grayscale?: boolean;
  }
): HTMLCanvasElement {
  const {
    brightness,
    contrast,
    sharpness,
    exposure,
    denoise,
    autoEnhance = false,
    grayscale = false,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Base adjustments via canvas filter
  let effectiveBrightness = brightness;
  let effectiveContrast = contrast;
  let effectiveExposure = exposure;
  let effectiveSharpness = sharpness;

  if (autoEnhance) {
    effectiveBrightness += 12;
    effectiveContrast += 18;
    effectiveExposure += 10;
    effectiveSharpness = Math.max(effectiveSharpness, 45);
  }

  const brightnessFactor = 1 + (effectiveBrightness + effectiveExposure) / 100;
  const contrastFactor = 1 + effectiveContrast / 100;

  ctx.filter = `brightness(${Math.max(0.2, brightnessFactor)}) contrast(${Math.max(0.2, contrastFactor)}) ${grayscale ? 'grayscale(100%)' : ''}`;
  ctx.drawImage(img, 0, 0);
  ctx.filter = 'none';

  // Convolution Sharpening Filter if sharpness > 0
  if (effectiveSharpness > 0) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const src = imgData.data;
    const w = canvas.width;
    const h = canvas.height;

    const output = ctx.createImageData(w, h);
    const dst = output.data;

    // Convolution kernel: 3x3 unsharp mask
    // [  0, -s,  0 ]
    // [ -s, 1+4s, -s ]
    // [  0, -s,  0 ]
    const s = (effectiveSharpness / 100) * 0.65;
    const center = 1 + 4 * s;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        const iUp = ((y - 1) * w + x) * 4;
        const iDown = ((y + 1) * w + x) * 4;
        const iLeft = (y * w + (x - 1)) * 4;
        const iRight = (y * w + (x + 1)) * 4;

        for (let c = 0; c < 3; c++) {
          const val =
            center * src[i + c] -
            s * (src[iUp + c] + src[iDown + c] + src[iLeft + c] + src[iRight + c]);
          dst[i + c] = Math.min(255, Math.max(0, Math.round(val)));
        }
        dst[i + 3] = src[i + 3];
      }
    }

    // Copy edge pixels
    for (let x = 0; x < w; x++) {
      const top = x * 4;
      const bottom = ((h - 1) * w + x) * 4;
      for (let c = 0; c < 4; c++) {
        dst[top + c] = src[top + c];
        dst[bottom + c] = src[bottom + c];
      }
    }
    for (let y = 0; y < h; y++) {
      const left = (y * w) * 4;
      const right = (y * w + (w - 1)) * 4;
      for (let c = 0; c < 4; c++) {
        dst[left + c] = src[left + c];
        dst[right + c] = src[right + c];
      }
    }

    ctx.putImageData(output, 0, 0);
  }

  return canvas;
}
