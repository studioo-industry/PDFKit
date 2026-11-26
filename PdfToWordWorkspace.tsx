import React, { useState, useEffect } from 'react';
import { 
  FileType, 
  Trash2, 
  Loader2, 
  Download, 
  FileText, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Copy, 
  Sparkles,
  Edit3
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes } from '../../services/pdfService';
import { extractTextFromPdf, createDocxFromPdf, ExtractedPdfPage } from '../../services/wordService';
import { PdfThumbnailPreview } from '../preview/PdfThumbnailPreview';

interface PdfToWordWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

export const PdfToWordWorkspace: React.FC<PdfToWordWorkspaceProps> = ({ tool, onSuccess }) => {
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  
  const [pages, setPages] = useState<ExtractedPdfPage[]>([]);
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [editableTitle, setEditableTitle] = useState('Converted Document');

  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileItem = files[0];

  // When file is uploaded, extract text and page structure
  useEffect(() => {
    if (fileItem) {
      setIsExtracting(true);
      setError(null);
      setEditableTitle(fileItem.name.replace(/\.pdf$/i, ''));

      extractTextFromPdf(fileItem.file, (progress) => {
        setExtractProgress(progress);
      })
        .then((res) => {
          setPages(res.pages);
          setCurrentPageIdx(0);
        })
        .catch((err) => {
          console.error(err);
          setError('Failed to extract text from PDF. The document may be scanned or image-only.');
        })
        .finally(() => {
          setIsExtracting(false);
        });
    } else {
      setPages([]);
      setCurrentPageIdx(0);
    }
  }, [fileItem]);

  const handleUpdatePageText = (newText: string) => {
    setPages((prev) => {
      const updated = [...prev];
      if (updated[currentPageIdx]) {
        updated[currentPageIdx] = {
          ...updated[currentPageIdx],
          text: newText,
          lines: newText.split('\n').map((l) => ({ text: l, fontSize: 12 })),
        };
      }
      return updated;
    });
  };

  const handleCopyText = () => {
    const fullDoc = pages.map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`).join('\n\n');
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(fullDoc).catch(() => {
          fallbackCopyText(fullDoc);
        });
      } else {
        fallbackCopyText(fullDoc);
      }
    } catch {
      fallbackCopyText(fullDoc);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fallbackCopyText = (textToCopy: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = textToCopy;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch (e) {
      console.warn('Fallback copy error:', e);
    }
    document.body.removeChild(textarea);
  };

  const handleConvertToWord = async () => {
    if (pages.length === 0 || !fileItem) return;
    setIsConverting(true);

    try {
      const docxBlob = await createDocxFromPdf(pages, editableTitle);
      const downloadUrl = URL.createObjectURL(docxBlob);
      const baseName = fileItem.name.replace(/\.pdf$/i, '');
      const downloadName = `${baseName}.docx`;

      onSuccess({
        title: `Converted ${pages.length} ${pages.length === 1 ? 'page' : 'pages'} to Microsoft Word (.docx)`,
        success: true,
        downloadUrl,
        downloadFilename: downloadName,
        downloadName,
        fileSize: docxBlob.size,
        originalSize: fileItem.size,
        pageCount: pages.length,
        message: `Successfully converted PDF (${pages.length} pages) to Microsoft Word (.docx)`,
        blob: docxBlob,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
    } catch (err: any) {
      console.error(err);
      setError('Error generating Word document: ' + (err.message || 'Unknown error'));
    } finally {
      setIsConverting(false);
    }
  };

  const currentPage = pages[currentPageIdx];

  return (
    <div className="space-y-6">
      {!fileItem ? (
        <DropZone
          tool={tool}
          files={files}
          onFilesChange={setFiles}
          title="Upload PDF to convert to Microsoft Word (.docx)"
          subtitle="Extracts text, paragraphs, headings, and formatting into editable Word document"
        />
      ) : (
        <div className="space-y-4">
          
          {/* Header Bar */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                <FileType className="w-5 h-5 text-blue-700" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editableTitle}
                    onChange={(e) => setEditableTitle(e.target.value)}
                    className="font-bold text-sm text-gray-900 border-b border-dashed border-gray-300 hover:border-blue-500 focus:border-blue-600 outline-none pb-0.5"
                    title="Click to rename document"
                  />
                  <Edit3 className="w-3 h-3 text-gray-400 shrink-0" />
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {formatBytes(fileItem.size)} • {pages.length} Pages Extracted
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy All Text'}</span>
              </button>
              
              <button
                type="button"
                onClick={() => setFiles([])}
                className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Change PDF</span>
              </button>
            </div>
          </div>

          {/* Loading or Error State */}
          {isExtracting ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-xs flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <div className="font-bold text-sm text-gray-900">Extracting PDF Text & Structure...</div>
              <div className="w-64 bg-gray-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${extractProgress}%` }}
                />
              </div>
              <div className="text-xs text-gray-500">{extractProgress}% complete</div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs">
              {error}
            </div>
          ) : (
            /* Document Editor & Interactive Preview */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left: Word Document Paper View */}
              <div className="lg:col-span-8 bg-gray-100/80 rounded-2xl border border-gray-200/80 p-6 flex flex-col items-center">
                
                {/* Page Navigation Bar */}
                <div className="w-full flex items-center justify-between mb-4 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <span>Page {currentPageIdx + 1} of {pages.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPageIdx === 0}
                      onClick={() => setCurrentPageIdx((p) => Math.max(0, p - 1))}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono px-2 text-gray-500">
                      {currentPageIdx + 1} / {pages.length}
                    </span>
                    <button
                      type="button"
                      disabled={currentPageIdx >= pages.length - 1}
                      onClick={() => setCurrentPageIdx((p) => Math.min(pages.length - 1, p + 1))}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Word Document Sheet Simulation */}
                <div className="w-full max-w-2xl bg-white shadow-md border border-gray-200 rounded-sm p-8 min-h-[500px]">
                  <div className="text-[11px] font-mono text-gray-400 mb-3 uppercase tracking-wider flex items-center justify-between border-b border-gray-100 pb-2">
                    <span>Microsoft Word (.docx) Preview</span>
                    <span>Page {currentPageIdx + 1}</span>
                  </div>

                  {currentPage ? (
                    <textarea
                      value={currentPage.text}
                      onChange={(e) => handleUpdatePageText(e.target.value)}
                      placeholder="No text extracted on this page..."
                      rows={18}
                      className="w-full h-full min-h-[420px] resize-y font-sans text-sm leading-relaxed text-gray-800 outline-none p-2 focus:ring-1 focus:ring-blue-400 rounded-md"
                    />
                  ) : (
                    <div className="text-gray-400 text-sm italic py-10 text-center">
                      No text found on this page.
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Word Options & Download Action */}
              <div className="lg:col-span-4 space-y-4">
                <PdfThumbnailPreview
                  file={fileItem.file}
                  fileName={fileItem.name}
                  fileSize={fileItem.size}
                  title="Original PDF Pages"
                  subtitle="Compare visual pages with extracted text"
                />
                
                <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileType className="w-4 h-4 text-blue-600" />
                    <span>Microsoft Word (.docx) Export</span>
                  </h3>

                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex items-center gap-2 text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-xl">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Genuine .docx binary format</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-700 font-semibold bg-blue-50 p-2 rounded-xl">
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Preserves page breaks & headings</span>
                    </div>
                    <div className="flex items-center gap-2 text-purple-700 font-semibold bg-purple-50 p-2 rounded-xl">
                      <Check className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Compatible with MS Office, Google Docs & LibreOffice</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <button
                      id="pdf-to-word-download-btn"
                      type="button"
                      disabled={isConverting}
                      onClick={handleConvertToWord}
                      className="w-full py-3 px-4 bg-[#2b579a] hover:bg-[#20457c] text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {isConverting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating Word .docx Document...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download Word (.docx)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
