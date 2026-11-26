import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCw, 
  FileText, 
  Loader2, 
  Download,
  Eye,
  Columns,
  Share2,
  Edit3
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { downloadBlob } from '../../services/pdfService';

// Ensure worker is configured for client-side rendering
if (typeof window !== 'undefined') {
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version || '5.4.296'}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('pdfjs worker init error:', e);
  }
}

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | Blob | string;
  fileName?: string;
  initialPage?: number;
  onShare?: () => void;
  onEdit?: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  file,
  fileName = 'Document Preview',
  initialPage = 1,
  onShare,
  onEdit,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [scale, setScale] = useState<number>(1.1);
  const [rotation, setRotation] = useState<number>(0);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(initialPage);
      setScale(1.1);
      setRotation(0);
      setIsLoading(true);
      setError(null);
    }
  }, [isOpen, initialPage]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setCurrentPage((prev) => Math.min(prev + 1, numPages || prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrentPage((prev) => Math.max(prev - 1, 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, numPages, onClose]);

  if (!isOpen) return null;

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (err: Error) => {
    console.error('PDF preview load error:', err);
    setError(err.message || 'Failed to render PDF preview.');
    setIsLoading(false);
  };

  const handleDownload = () => {
    if (file instanceof File || file instanceof Blob) {
      downloadBlob(file, fileName, 'application/pdf');
    } else if (typeof file === 'string') {
      if (file.startsWith('data:') || file.startsWith('blob:')) {
        const a = document.createElement('a');
        a.href = file;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        fetch(file)
          .then((res) => res.blob())
          .then((blob) => downloadBlob(blob, fileName, 'application/pdf'))
          .catch(() => {
            const a = document.createElement('a');
            a.href = file;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 p-2 sm:p-4">
      {/* Background click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-6xl h-[92vh] bg-gray-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-800 text-white">
        {/* Top Header Controls Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gray-900/90 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="text-sm font-semibold text-gray-100 truncate">{fileName}</h3>
              <p className="text-[11px] text-gray-400">
                {numPages > 0 ? `${numPages} pages total` : 'Loading document...'}
              </p>
            </div>
          </div>

          {/* Center Page Navigator */}
          <div className="flex items-center gap-2 bg-gray-800/80 px-3 py-1.5 rounded-full border border-gray-700 text-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 text-gray-300 hover:text-white disabled:opacity-30 disabled:hover:text-gray-300 rounded hover:bg-gray-700 transition-colors"
              title="Previous Page (Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-gray-200 min-w-[70px] text-center">
              Page <span className="text-white font-bold">{currentPage}</span> of {numPages || '...'}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages}
              className="p-1 text-gray-300 hover:text-white disabled:opacity-30 disabled:hover:text-gray-300 rounded hover:bg-gray-700 transition-colors"
              title="Next Page (Right Arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Toggle Sidebar Thumbnails */}
            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                showThumbnails ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
              title="Toggle Thumbnails Strip"
            >
              <Columns className="w-4 h-4" />
              <span className="hidden md:inline">Pages</span>
            </button>

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-xl border border-gray-700">
              <button
                onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
                className="p-1 text-gray-400 hover:text-white rounded transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-gray-300 px-1">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
                className="p-1 text-gray-400 hover:text-white rounded transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Rotate Preview */}
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
              title="Rotate View"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Edit Button if provided */}
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 rounded-xl transition-colors"
                title="Edit Document in Workspace"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {/* Share Button if provided */}
            {onShare && (
              <button
                onClick={onShare}
                className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-950/40 rounded-xl transition-colors"
                title="Share Document"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            {/* Download Original */}
            <button
              onClick={handleDownload}
              className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 rounded-xl transition-colors"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-xl transition-colors ml-1"
              title="Close Preview (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Thumbnails Sidebar */}
          {showThumbnails && numPages > 0 && (
            <div className="w-36 sm:w-48 bg-gray-950/80 border-r border-gray-800 p-3 overflow-y-auto space-y-3 shrink-0 scrollbar-thin">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1">
                All Pages ({numPages})
              </div>
              <Document
                file={file}
                loading={<div className="text-center py-4 text-xs text-gray-500">Loading strip...</div>}
              >
                {Array.from({ length: numPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-full text-left p-1.5 rounded-xl border transition-all flex flex-col items-center group cursor-pointer ${
                      currentPage === pageNum
                        ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50'
                        : 'border-gray-800 hover:border-gray-700 bg-gray-900/50'
                    }`}
                  >
                    <div className="w-full bg-white rounded-lg overflow-hidden shadow-xs flex items-center justify-center">
                      <Page
                        pageNumber={pageNum}
                        width={130}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        loading={
                          <div className="w-[130px] h-[170px] bg-gray-800 flex items-center justify-center">
                            <span className="text-[10px] text-gray-500">p. {pageNum}</span>
                          </div>
                        }
                      />
                    </div>
                    <span className="text-[11px] font-semibold mt-1 text-gray-400 group-hover:text-gray-200">
                      Page {pageNum}
                    </span>
                  </button>
                ))}
              </Document>
            </div>
          )}

          {/* Primary Main Viewer Area */}
          <div className="flex-1 overflow-auto bg-gray-950 p-4 sm:p-8 flex items-center justify-center">
            {error ? (
              <div className="max-w-md p-6 bg-red-950/40 border border-red-800/80 rounded-2xl text-center space-y-2">
                <p className="text-sm font-semibold text-red-400">{error}</p>
                <p className="text-xs text-gray-400">
                  The document could not be previewed. It may be encrypted or corrupted.
                </p>
              </div>
            ) : (
              <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex flex-col items-center gap-3 py-12">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <span className="text-xs font-medium text-gray-400">
                      Generating PDF preview...
                    </span>
                  </div>
                }
              >
                <div className="relative shadow-2xl rounded-2xl overflow-hidden bg-white border border-gray-700/50 transition-transform">
                  <Page
                    pageNumber={currentPage}
                    scale={scale}
                    rotate={rotation}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="max-w-full"
                    loading={
                      <div className="w-[500px] h-[700px] bg-gray-800 animate-pulse flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                      </div>
                    }
                  />
                </div>
              </Document>
            )}
          </div>
        </div>

        {/* Bottom Status Info Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-gray-900 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400 shrink-0">
          <div className="flex items-center gap-3">
            <span>
              Use <kbd className="px-1.5 py-0.5 bg-gray-800 text-gray-300 rounded text-[10px] border border-gray-700">←</kbd> and <kbd className="px-1.5 py-0.5 bg-gray-800 text-gray-300 rounded text-[10px] border border-gray-700">→</kbd> to navigate pages
            </span>
            <span>•</span>
            <span>Esc to close</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-300 font-medium">Rendered via react-pdf</span>
          </div>
        </div>
      </div>
    </div>
  );
};
