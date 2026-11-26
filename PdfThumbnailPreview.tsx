import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Grid, 
  Layout, 
  Lock, 
  KeyRound, 
  Loader2, 
  AlertCircle,
  Sparkles,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PdfPreviewModal } from './PdfPreviewModal';
import { formatBytes } from '../../services/pdfService';

// Ensure pdfjs worker is initialized
if (typeof window !== 'undefined') {
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version || '5.4.296'}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('pdfjs worker init error:', e);
  }
}

export interface PdfThumbnailPreviewProps {
  file: File | Blob | string;
  fileName?: string;
  fileSize?: number;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  showAllPagesOption?: boolean;
  onRemove?: () => void;
  className?: string;
  onShare?: () => void;
  onEdit?: () => void;
}

export const PdfThumbnailPreview: React.FC<PdfThumbnailPreviewProps> = ({
  file,
  fileName,
  fileSize,
  title = 'Uploaded PDF Preview',
  subtitle,
  compact = false,
  showAllPagesOption = true,
  onRemove,
  className = '',
  onShare,
  onEdit,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'single' | 'gallery'>('single');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalInitialPage, setModalInitialPage] = useState<number>(1);
  
  // Password support for encrypted files
  const [password, setPassword] = useState<string>('');
  const [inputPassword, setInputPassword] = useState<string>('');
  const [isPasswordRequired, setIsPasswordRequired] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = fileName || (file instanceof File ? file.name : 'Document.pdf');
  const displaySize = fileSize !== undefined ? fileSize : (file instanceof File ? file.size : null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setIsPasswordRequired(false);
    setError(null);
  };

  const onDocumentLoadError = (err: any) => {
    console.warn('react-pdf document load warning:', err);
    setIsLoading(false);
    if (err?.name === 'PasswordException' || err?.message?.toLowerCase().includes('password')) {
      setIsPasswordRequired(true);
      setError('Password required to view this document.');
    } else {
      setError(err?.message || 'Could not load PDF preview.');
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPassword) return;
    setPassword(inputPassword);
    setIsLoading(true);
  };

  const openFullscreenAtPage = (pageNum: number) => {
    setModalInitialPage(pageNum);
    setIsModalOpen(true);
  };

  // Compact Mode (ideal for file lists or tight spaces)
  if (compact) {
    return (
      <div className={`relative bg-gray-50 border border-gray-200/90 rounded-2xl p-3 flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-3 min-w-0">
          {/* Mini Thumbnail via react-pdf */}
          <div 
            onClick={() => openFullscreenAtPage(1)}
            className="w-12 h-16 bg-white rounded-lg border border-gray-200 shadow-xs flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group"
            title="Click to view full preview"
          >
            {isPasswordRequired ? (
              <Lock className="w-4 h-4 text-amber-500" />
            ) : (
              <Document
                file={file}
                password={password}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={<Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
              >
                <Page
                  pageNumber={1}
                  width={48}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
            )}
          </div>

          <div className="min-w-0 truncate">
            <h4 className="text-xs font-bold text-gray-900 truncate">{displayName}</h4>
            <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
              {displaySize && <span>{formatBytes(displaySize)}</span>}
              {numPages > 0 && (
                <>
                  <span>•</span>
                  <span>{numPages} {numPages === 1 ? 'page' : 'pages'}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => openFullscreenAtPage(1)}
            className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            title="Inspect preview"
          >
            <Eye className="w-4 h-4" />
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              title="Remove file"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Fullscreen Preview Modal */}
        <PdfPreviewModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          file={file}
          fileName={displayName}
          initialPage={modalInitialPage}
          onShare={onShare}
          onEdit={onEdit}
        />
      </div>
    );
  }

  // Full-featured Preview Generator Card
  return (
    <div className={`bg-white border border-gray-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 text-left ${className}`}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 truncate">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 truncate font-google">
                {title}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0">
                react-pdf Preview
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {subtitle || displayName}
              {displaySize && ` (${formatBytes(displaySize)})`}
            </p>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {/* View Mode Toggle: Single Page vs All Pages Grid */}
          {showAllPagesOption && numPages > 1 && (
            <div className="flex items-center bg-gray-100 p-0.5 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setViewMode('single')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                  viewMode === 'single'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Single Page View"
              >
                <Layout className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Page</span>
              </button>
              <button
                onClick={() => setViewMode('gallery')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                  viewMode === 'gallery'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="All Pages Grid"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">All Pages</span>
              </button>
            </div>
          )}

          {/* Fullscreen Expand Preview */}
          <button
            onClick={() => openFullscreenAtPage(currentPage)}
            className="px-3 py-1.5 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Inspect in full preview modal"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fullscreen</span>
          </button>

          {/* Remove File (if allowed) */}
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
              title="Remove File"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Password Required Form Banner */}
      {isPasswordRequired && (
        <form 
          onSubmit={handlePasswordSubmit} 
          className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Document is encrypted.</strong> Enter password to render preview:
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="password"
              placeholder="Enter password..."
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              className="px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors shrink-0 cursor-pointer"
            >
              Unlock
            </button>
          </div>
        </form>
      )}

      {/* Main Preview Container */}
      <div className="relative bg-gray-50/70 border border-gray-200/80 rounded-2xl p-4 min-h-[220px] flex items-center justify-center overflow-hidden">
        {error && !isPasswordRequired ? (
          <div className="text-center p-6 space-y-2 max-w-sm">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-xs font-semibold text-gray-700">{error}</p>
            <p className="text-[11px] text-gray-500">
              The preview could not be generated, but you can still proceed with processing.
            </p>
          </div>
        ) : (
          <Document
            file={file}
            password={password}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex flex-col items-center gap-2 py-8">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                <span className="text-xs text-gray-500 font-medium">
                  Generating PDF thumbnail preview...
                </span>
              </div>
            }
          >
            {viewMode === 'single' ? (
              /* Single Page Focused Preview */
              <div className="flex flex-col items-center gap-3">
                <div 
                  onClick={() => openFullscreenAtPage(currentPage)}
                  className="relative group cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-md border border-gray-200/80 bg-white transition-all"
                  title="Click to zoom in fullscreen"
                >
                  <Page
                    pageNumber={currentPage}
                    width={Math.min(360, window.innerWidth > 640 ? 320 : 260) * scale}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    loading={
                      <div className="w-[260px] h-[340px] bg-gray-100 animate-pulse flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      </div>
                    }
                  />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded-full bg-gray-900/80 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs shadow-lg">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </span>
                  </div>
                </div>

                {/* Page Navigation & Zoom Bar */}
                {numPages > 1 && (
                  <div className="flex items-center gap-3 bg-white px-4 py-1.5 rounded-full border border-gray-200/90 shadow-2xs text-xs">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-500 rounded-md transition-colors"
                      title="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="font-semibold text-gray-700 min-w-[75px] text-center">
                      Page {currentPage} of {numPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                      disabled={currentPage >= numPages}
                      className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-500 rounded-md transition-colors"
                      title="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <span className="text-gray-300">|</span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setScale((s) => Math.max(0.7, s - 0.15))}
                        className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
                        title="Zoom out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setScale((s) => Math.min(1.4, s + 0.15))}
                        className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
                        title="Zoom in"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* All Pages Gallery View */
              <div className="w-full">
                <div className="text-xs text-gray-500 mb-2 flex items-center justify-between">
                  <span>Click any page to inspect in detail</span>
                  <span className="font-bold text-gray-700">{numPages} pages</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
                  {Array.from({ length: numPages }, (_, idx) => idx + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => openFullscreenAtPage(pageNum)}
                      className={`group p-2 rounded-xl border bg-white text-left transition-all hover:border-blue-400 hover:shadow-sm cursor-pointer ${
                        currentPage === pageNum ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'
                      }`}
                    >
                      <div className="w-full aspect-3/4 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center border border-gray-100">
                        <Page
                          pageNumber={pageNum}
                          width={120}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          loading={
                            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-[10px] text-gray-400">
                              p.{pageNum}
                            </div>
                          }
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-500 font-medium">
                        <span>Page {pageNum}</span>
                        <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Document>
        )}
      </div>

      {/* Footer Info Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500 pt-1">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>High-DPI thumbnail preview ready</span>
          {numPages > 0 && <span>• {numPages} total pages loaded</span>}
        </div>
        <div className="flex items-center gap-2">
          <span>Client-side preview</span>
        </div>
      </div>

      {/* Modal Inspector */}
      <PdfPreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        file={file}
        fileName={displayName}
        initialPage={modalInitialPage}
        onShare={onShare}
        onEdit={onEdit}
      />
    </div>
  );
};
