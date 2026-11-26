import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
  lines: { text: string; fontSize: number; isBold?: boolean }[];
}

/**
 * Parses a PDF file using pdfjs-dist and extracts text by page with font metadata
 */
export async function extractTextFromPdf(
  pdfFile: File,
  onProgress?: (progress: number) => void
): Promise<{ pages: ExtractedPdfPage[]; totalPages: number; fullText: string }> {
  const pdfjs = await import('pdfjs-dist');
  
  // Set worker
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version || '6.2.108'}/build/pdf.worker.min.mjs`;
  }

  const arrayBuffer = await pdfFile.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  const pages: ExtractedPdfPage[] = [];
  let fullText = '';

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    
    const lines: { text: string; fontSize: number; isBold?: boolean }[] = [];
    let pageText = '';

    // Group items by line approximate Y coordinate
    const items = textContent.items as any[];
    let currentY: number | null = null;
    let currentLineText = '';
    let currentFontSize = 12;

    for (const item of items) {
      if (!item.str && !item.chars) continue;
      const str = item.str || '';
      const transform = item.transform;
      const y = transform ? Math.round(transform[5]) : null;
      const fontSize = transform ? Math.round(Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1])) : 12;

      if (currentY !== null && y !== null && Math.abs(y - currentY) > 4) {
        if (currentLineText.trim()) {
          lines.push({ text: currentLineText.trim(), fontSize: currentFontSize });
          pageText += currentLineText.trim() + '\n';
        }
        currentLineText = str;
        currentY = y;
        currentFontSize = fontSize;
      } else {
        currentLineText += (currentLineText && !currentLineText.endsWith(' ') ? ' ' : '') + str;
        if (currentY === null) currentY = y;
        if (fontSize > currentFontSize) currentFontSize = fontSize;
      }
    }

    if (currentLineText.trim()) {
      lines.push({ text: currentLineText.trim(), fontSize: currentFontSize });
      pageText += currentLineText.trim() + '\n';
    }

    pages.push({
      pageNumber: i,
      text: pageText,
      lines,
    });

    fullText += `--- Page ${i} ---\n` + pageText + '\n\n';

    if (onProgress) {
      onProgress(Math.round((i / totalPages) * 100));
    }
  }

  return { pages, totalPages, fullText };
}

/**
 * Creates a genuine Microsoft Word (.docx) file from extracted PDF pages/text
 */
export async function createDocxFromPdf(
  pages: ExtractedPdfPage[],
  documentTitle = 'Converted Document'
): Promise<Blob> {
  const paragraphs: Paragraph[] = [];

  // Title
  paragraphs.push(
    new Paragraph({
      text: documentTitle,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  for (const page of pages) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `[ Page ${page.pageNumber} ]`,
            italics: true,
            color: '666666',
            size: 18,
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );

    for (const line of page.lines) {
      const isHeader = line.fontSize >= 16;
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.text,
              bold: isHeader,
              size: isHeader ? 28 : 22,
            }),
          ],
          spacing: { after: 120 },
        })
      );
    }

    // Page break between pages (except last)
    if (page.pageNumber < pages.length) {
      paragraphs.push(
        new Paragraph({
          pageBreakBefore: true,
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  return buffer;
}

/**
 * Parses a Word document (.docx) to HTML and raw text using mammoth
 */
export async function parseDocxFile(
  file: File
): Promise<{ html: string; text: string; messages: string[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const fName = file?.name || '';

  if (fName.toLowerCase().endsWith('.txt') || file.type === 'text/plain') {
    const text = new TextDecoder().decode(arrayBuffer);
    const html = text.split('\n').map((l) => `<p>${l || '&nbsp;'}</p>`).join('');
    return { html, text, messages: [] };
  }

  try {
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
    if (rawTextResult.value && rawTextResult.value.trim().length > 0) {
      return {
        html: result.value,
        text: rawTextResult.value,
        messages: result.messages.map((m: any) => m.message),
      };
    }
  } catch (err) {
    console.warn('Mammoth docx parse failed, trying binary text fallback:', err);
  }

  // Fallback: extract legible text from arrayBuffer
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawStr = decoder.decode(arrayBuffer);
    const matched = rawStr.match(/[\x20-\x7E\u0900-\u097F\u00A0-\u024F]{3,}/g);
    if (matched && matched.length > 0) {
      const filtered = matched.filter((s) => !s.startsWith('xml') && !s.includes('schemas.openxmlformats') && !s.includes('word/'));
      if (filtered.length > 0) {
        const text = filtered.join('\n');
        const html = filtered.map((l) => `<p>${l}</p>`).join('');
        return { html, text, messages: ['Extracted via fallback document parser'] };
      }
    }
  } catch (e) {
    console.warn('Text fallback failed:', e);
  }

  throw new Error('Could not parse Word document. Please ensure it is a valid .docx, .doc, or .txt file.');
}

/**
 * Sanitizes text to fit within standard PDF WinAnsi / Latin-1 encoding
 */
export function sanitizeForWinAnsi(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u2018\u2019]/g, "'") // curly single quotes
    .replace(/[\u201C\u201D]/g, '"') // curly double quotes
    .replace(/[\u2013\u2014]/g, '-') // en-dash, em-dash
    .replace(/\u2026/g, '...') // ellipsis
    .replace(/[\u2022\u25CF]/g, '*') // bullets
    .replace(/\u00A0/g, ' ') // non-breaking space
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); // control chars
}

/**
 * Checks if text contains characters outside of the standard WinAnsi / Latin-1 range
 * (e.g. Devanagari/Hindi "ह", Cyrillic, Chinese, Arabic, emojis, etc.)
 */
export function hasUnicodeCharacters(text: string): boolean {
  if (!text) return false;
  // Checks for any character code > 255
  return /[^\x00-\xFF]/.test(text);
}

/**
 * High-DPI Canvas PDF Renderer for Unicode, Hindi/Devanagari, and international documents.
 * Renders text with native browser HarfBuzz/font shaping into crisp 2x resolution PDF pages.
 */
export async function convertDocxViaCanvas(
  text: string,
  options: {
    pageSize?: 'a4' | 'letter';
    fontFamily?: 'helvetica' | 'times' | 'courier';
    fontSize?: number;
    margins?: number;
    title?: string;
    addPageNumbers?: boolean;
  } = {}
): Promise<Uint8Array> {
  const {
    pageSize = 'a4',
    fontFamily = 'helvetica',
    fontSize = 12,
    margins = 40,
    title,
    addPageNumbers = true,
  } = options;

  const pdfDoc = await PDFDocument.create();

  // Page dimensions in points (72 pt/inch)
  const ptWidth = pageSize === 'letter' ? 612 : 595.28;
  const ptHeight = pageSize === 'letter' ? 792 : 841.89;

  // 2x scaling for crisp printing (144 DPI equivalent)
  const scale = 2;
  const canvasW = Math.round(ptWidth * scale);
  const canvasH = Math.round(ptHeight * scale);
  const marginPx = Math.round(margins * scale);
  const contentWidthPx = canvasW - marginPx * 2;

  // Font family string with full Unicode & Devanagari fallbacks
  let baseFontFamily = '"Noto Sans Devanagari", "Segoe UI", Roboto, -apple-system, sans-serif';
  if (fontFamily === 'times') {
    baseFontFamily = '"Times New Roman", "Noto Serif Devanagari", Georgia, serif';
  } else if (fontFamily === 'courier') {
    baseFontFamily = '"Courier New", Courier, monospace';
  }

  const baseFont = `${Math.round(fontSize * scale)}px ${baseFontFamily}`;
  const boldFont = `bold ${Math.round((fontSize + 3) * scale)}px ${baseFontFamily}`;
  const headerFont = `bold ${Math.round(10 * scale)}px ${baseFontFamily}`;
  const footerFont = `${Math.round(10 * scale)}px ${baseFontFamily}`;

  // Temporary canvas to measure text
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d');
  if (!mCtx) throw new Error('Failed to initialize canvas context');

  // Wrap text by content width
  const wrapTextCanvas = (lineText: string, isHeading: boolean): string[] => {
    mCtx.font = isHeading ? boldFont : baseFont;
    const words = lineText.split(' ');
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const width = mCtx.measureText(test).width;
      if (width > contentWidthPx && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [''];
  };

  const rawParagraphs = text.split(/\r?\n/);
  const wrappedLines: { text: string; isHeading?: boolean }[] = [];

  for (const p of rawParagraphs) {
    const trimmed = p.trim();
    if (!trimmed) {
      wrappedLines.push({ text: '' }); // paragraph spacer
      continue;
    }
    const isHeading = trimmed.length < 80 && (trimmed.startsWith('#') || trimmed.toUpperCase() === trimmed);
    const cleanText = trimmed.replace(/^#+\s*/, '');
    const lines = wrapTextCanvas(cleanText, isHeading);
    for (const l of lines) {
      wrappedLines.push({ text: l, isHeading });
    }
  }

  const lineHeightPx = Math.round(fontSize * 1.55 * scale);
  const topMarginPx = marginPx + (title ? Math.round(35 * scale) : Math.round(15 * scale));
  const bottomMarginPx = marginPx + (addPageNumbers ? Math.round(30 * scale) : Math.round(15 * scale));
  const usableHeightPx = canvasH - topMarginPx - bottomMarginPx;

  // Paginate lines
  const pagesData: { text: string; isHeading?: boolean }[][] = [];
  let currentPageLines: { text: string; isHeading?: boolean }[] = [];
  let currentY = 0;

  for (const line of wrappedLines) {
    const itemHeight = line.text === '' ? lineHeightPx * 0.6 : lineHeightPx;
    if (currentY + itemHeight > usableHeightPx && currentPageLines.length > 0) {
      pagesData.push(currentPageLines);
      currentPageLines = [line];
      currentY = itemHeight;
    } else {
      currentPageLines.push(line);
      currentY += itemHeight;
    }
  }
  if (currentPageLines.length > 0) {
    pagesData.push(currentPageLines);
  }
  if (pagesData.length === 0) {
    pagesData.push([{ text: '(Empty Document)' }]);
  }

  const totalPages = pagesData.length;

  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Optional Title Header
    if (title) {
      ctx.font = headerFont;
      ctx.fillStyle = '#4b5563'; // gray-600
      ctx.fillText(title, marginPx, marginPx + Math.round(12 * scale));

      // Divider line
      ctx.strokeStyle = '#e5e7eb'; // gray-200
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.moveTo(marginPx, marginPx + Math.round(20 * scale));
      ctx.lineTo(canvasW - marginPx, marginPx + Math.round(20 * scale));
      ctx.stroke();
    }

    // Draw text lines
    let y = topMarginPx;
    const lines = pagesData[pIdx];

    for (const line of lines) {
      if (line.text) {
        ctx.font = line.isHeading ? boldFont : baseFont;
        ctx.fillStyle = line.isHeading ? '#1e3a8a' : '#111827'; // blue-900 or gray-900
        ctx.fillText(line.text, marginPx, y + Math.round(fontSize * scale));
      }
      y += line.text === '' ? lineHeightPx * 0.6 : lineHeightPx;
    }

    // Page numbers
    if (addPageNumbers) {
      const pageNumberText = `Page ${pIdx + 1} of ${totalPages}`;
      ctx.font = footerFont;
      ctx.fillStyle = '#6b7280'; // gray-500
      const numWidth = ctx.measureText(pageNumberText).width;
      ctx.fillText(pageNumberText, (canvasW - numWidth) / 2, canvasH - marginPx + Math.round(15 * scale));
    }

    // Export canvas to JPEG blob and embed into pdf-lib
    const jpegBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.95);
    });
    const imgBytes = await jpegBlob.arrayBuffer();
    const embeddedImage = await pdfDoc.embedJpg(imgBytes);

    const pdfPage = pdfDoc.addPage([ptWidth, ptHeight]);
    pdfPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: ptWidth,
      height: ptHeight,
    });
  }

  return await pdfDoc.save();
}

/**
 * Converts formatted text / paragraphs from Word document into a clean multi-page PDF.
 * Automatically detects Unicode scripts (Hindi/Devanagari, Chinese, Arabic, emojis)
 * and uses the High-DPI Canvas engine to prevent any WinAnsi encoding errors.
 */
export async function convertDocxTextToPdf(
  text: string,
  options: {
    pageSize?: 'a4' | 'letter';
    fontFamily?: 'helvetica' | 'times' | 'courier';
    fontSize?: number;
    margins?: number;
    title?: string;
    addPageNumbers?: boolean;
  } = {}
): Promise<Uint8Array> {
  const {
    pageSize = 'a4',
    fontFamily = 'helvetica',
    fontSize = 11,
    margins = 40,
    title,
    addPageNumbers = true,
  } = options;

  // If text contains any non-WinAnsi characters (like Devanagari "ह", Arabic, Asian scripts, or emojis),
  // immediately use the Canvas-based multi-page renderer to guarantee 100% font fidelity and avoid WinAnsi error
  if (hasUnicodeCharacters(text) || (title && hasUnicodeCharacters(title))) {
    return await convertDocxViaCanvas(text, options);
  }

  // Attempt vector PDF creation, with complete fallback to canvas if WinAnsi encounters any unhandled character
  try {
    const pdfDoc = await PDFDocument.create();

    // Page dimensions in pt
    const pageDims: [number, number] = pageSize === 'letter' ? [612, 792] : [595.28, 841.89];
    const [pageWidth, pageHeight] = pageDims;

    // Font
    let font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    let boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    if (fontFamily === 'times') {
      font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    } else if (fontFamily === 'courier') {
      font = await pdfDoc.embedFont(StandardFonts.Courier);
      boldFont = await pdfDoc.embedFont(StandardFonts.CourierBold);
    }

    const lineHeight = fontSize * 1.45;
    const contentWidth = pageWidth - margins * 2;
    const topMargin = margins + (title ? 30 : 10);
    const bottomMargin = margins + (addPageNumbers ? 25 : 10);
    const usableHeight = pageHeight - topMargin - bottomMargin;

    // Helper to split text into lines that fit in contentWidth
    const wrapText = (textLine: string, f: typeof font, size: number): string[] => {
      const sanitized = sanitizeForWinAnsi(textLine);
      const words = sanitized.split(' ');
      const lines: string[] = [];
      let current = '';

      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        const width = f.widthOfTextAtSize(test, size);
        if (width > contentWidth && current) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
      return lines;
    };

    const rawParagraphs = text.split(/\r?\n/);
    const wrappedLines: { text: string; isHeading?: boolean }[] = [];

    for (const p of rawParagraphs) {
      const trimmed = p.trim();
      if (!trimmed) {
        wrappedLines.push({ text: '' }); // empty line for paragraph spacing
        continue;
      }
      const isHeading = trimmed.length < 70 && (trimmed.startsWith('#') || trimmed.toUpperCase() === trimmed);
      const cleanText = trimmed.replace(/^#+\s*/, '');
      const currentF = isHeading ? boldFont : font;
      const currentSize = isHeading ? fontSize + 3 : fontSize;
      const lines = wrapText(cleanText, currentF, currentSize);
      for (const l of lines) {
        wrappedLines.push({ text: l, isHeading });
      }
    }

    // Paginate lines
    const pagesData: { text: string; isHeading?: boolean }[][] = [];
    let currentPageLines: { text: string; isHeading?: boolean }[] = [];
    let currentY = 0;

    for (const line of wrappedLines) {
      const itemHeight = line.text === '' ? lineHeight * 0.7 : lineHeight;
      if (currentY + itemHeight > usableHeight && currentPageLines.length > 0) {
        pagesData.push(currentPageLines);
        currentPageLines = [line];
        currentY = itemHeight;
      } else {
        currentPageLines.push(line);
        currentY += itemHeight;
      }
    }
    if (currentPageLines.length > 0) {
      pagesData.push(currentPageLines);
    }

    if (pagesData.length === 0) {
      pagesData.push([{ text: '(Empty Document)' }]);
    }

    const totalPages = pagesData.length;

    for (let pIdx = 0; pIdx < totalPages; pIdx++) {
      const page = pdfDoc.addPage(pageDims);
      let y = pageHeight - topMargin;

      // Document header title if present
      if (title) {
        const safeTitle = sanitizeForWinAnsi(title);
        page.drawText(safeTitle, {
          x: margins,
          y: pageHeight - margins + 5,
          size: 9,
          font: boldFont,
          color: rgb(0.3, 0.3, 0.3),
        });
        // Header line
        page.drawLine({
          start: { x: margins, y: pageHeight - margins },
          end: { x: pageWidth - margins, y: pageHeight - margins },
          thickness: 0.5,
          color: rgb(0.8, 0.8, 0.8),
        });
      }

      // Draw content lines
      const lines = pagesData[pIdx];
      for (const line of lines) {
        if (line.text) {
          const lineFont = line.isHeading ? boldFont : font;
          const lineSize = line.isHeading ? fontSize + 2 : fontSize;
          page.drawText(line.text, {
            x: margins,
            y,
            size: lineSize,
            font: lineFont,
            color: line.isHeading ? rgb(0.1, 0.2, 0.4) : rgb(0.1, 0.1, 0.1),
          });
        }
        y -= line.text === '' ? lineHeight * 0.7 : lineHeight;
      }

      // Page numbers
      if (addPageNumbers) {
        const pageNumberText = `Page ${pIdx + 1} of ${totalPages}`;
        const numWidth = font.widthOfTextAtSize(pageNumberText, 9);
        page.drawText(pageNumberText, {
          x: (pageWidth - numWidth) / 2,
          y: margins - 15,
          size: 9,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
      }
    }

    return await pdfDoc.save();
  } catch (err: any) {
    console.warn('Vector PDF generation caught encoding error, falling back to Canvas Unicode renderer:', err);
    // Automatic flawless fallback to Canvas renderer whenever any encoding issue arises
    return await convertDocxViaCanvas(text, options);
  }
}
