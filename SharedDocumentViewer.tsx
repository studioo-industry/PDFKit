import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Share2, 
  Edit3, 
  ArrowLeft, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Minimize2,
  ChevronLeft, 
  ChevronRight, 
  Columns, 
  Loader2, 
  ShieldCheck, 
  Eye, 
  Calendar, 
  CheckCircle2, 
  Sparkles,
  ExternalLink,
  Layers,
  Lock,
  Crown,
  Info
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { SharedDocumentInfo, ToolId } from '../types';
import { fetchSharedDocument } from '../services/shareService';
import { formatBytes, downloadBlob } from '../services/pdfService';
import { ShareModal } from './ShareModal';
import { useAuth } from '../context/AuthContext';

// Ensure worker is configured for client-side rendering
if (typeof window !== 'undefined') {
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version || '5.4.296'}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('pdfjs worker init error:', e);
  }
}

interface SharedDocumentViewerProps {
  shareId: string;
  onBackToHome: () => void;
  onEditDocument: (doc: SharedDocumentInfo) => void;
  onSelectTool: (toolId: ToolId) => void;
}

export const SharedDocumentViewer: React.FC<SharedDocumentViewerProps> = ({
  shareId,
  onBackToHome,
  onEditDocument,
  onSelectTool,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [docInfo, setDocInfo] = useState<SharedDocumentInfo | null>(null);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Full-screen mode state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // PDF Viewer State
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.1);
  const [rotation, setRotation] = useState<number>(0);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [pdfLoading, setPdfLoading] = useState<boolean>(true);

  // Share Dialog state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDoc() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchSharedDocument(shareId);
        if (isMounted) {
          setDocInfo(res.document);
          setFileUrl(res.fileUrl);
          setDownloadUrl(res.downloadUrl);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load document.');
          setIsLoading(false);
        }
      }
    }

    if (shareId) {
      loadDoc();
    }

    return () => {
      isMounted = false;
    };
  }, [shareId]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      if (viewerContainerRef.current?.requestFullscreen) {
        viewerContainerRef.current.requestFullscreen().catch(() => {
          // In iframe fallback, the CSS state handles full-screen immersion
        });
      }
    } else {
      setIsFullscreen(false);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const isPdf = docInfo?.mimeType?.includes('pdf') || docInfo?.filename?.toLowerCase().endsWith('.pdf');
  const isImage =
    docInfo?.mimeType?.startsWith('image/') ||
    /\.(jpe?g|png|webp|gif|bmp|svg|avif)$/i.test(docInfo?.filename || '');

  // Owner verification: only the owner can modify and change this document
  const isOwner = Boolean(
    docInfo?.isOwner ||
    (isAuthenticated && user && docInfo?.ownerId && user.id === docInfo.ownerId)
  );

  const handleDownload = async () => {
    if (!docInfo) return;
    try {
      const url = downloadUrl || `/api/share/${docInfo.id}/download`;
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        downloadBlob(blob, docInfo.filename, docInfo.mimeType || 'application/pdf');
        return;
      }
    } catch (e) {
      console.warn('Direct fetch download failed, using link fallback:', e);
    }
    const a = document.createElement('a');
    a.href = downloadUrl || `/api/share/${docInfo.id}/download`;
    a.download = docInfo.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (isLoading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 font-google mb-1">
          Opening Document in Full View...
        </h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Rendering high-resolution document pages directly in your browser.
        </p>
      </div>
    );
  }

  if (error || !docInfo) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white border border-gray-200 rounded-3xl shadow-sm text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <FileText className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 font-google">
          Document Unavailable
        </h3>
        <p className="text-sm text-gray-600">
          {error || 'This shared link may have expired or was removed by its author.'}
        </p>
        <button
          onClick={onBackToHome}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full transition-colors cursor-pointer"
        >
          Go to PDFKit Tools
        </button>
      </div>
    );
  }

  const shareFullUrl = `${window.location.origin}/?share=${docInfo.id}`;

  return (
    <div 
      ref={viewerContainerRef}
      className="w-full h-full flex flex-col bg-gray-950 overflow-hidden"
    >
      {/* Top Navigation & Document Info Bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-3 sm:px-6 py-2.5 shadow-md flex items-center justify-between gap-3 shrink-0 text-white z-20">
        {/* Left: Back button + Doc Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBackToHome}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Back to PDFKit Tools"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white font-google truncate max-w-xs sm:max-w-md">
                {docInfo.title || docInfo.filename}
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 bg-blue-900/50 text-blue-300 border border-blue-700/60 text-[10px] font-bold rounded uppercase">
                {isPdf ? 'PDF Document' : isImage ? 'Image' : 'File'}
              </span>

              {/* Ownership & Permission Badge */}
              {isOwner ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold rounded-full">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>Document Owner</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-800 text-gray-400 border border-gray-700 text-[10px] font-medium rounded-full" title="Only the owner can modify or change this document">
                  <Lock className="w-3 h-3 text-gray-400" />
                  <span>Read-Only</span>
                </span>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-2.5 text-xs text-gray-400 mt-0.5">
              <span>{formatBytes(docInfo.fileSize)}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-gray-400" />
                {docInfo.stats?.views || 1} views
              </span>
              {docInfo.ownerEmailMasked && (
                <>
                  <span>•</span>
                  <span className="text-gray-400">Shared by {docInfo.ownerEmailMasked}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions (Full Screen, Download, Share, Owner Edit) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Full Screen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              isFullscreen
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
            }`}
            title={isFullscreen ? 'Exit full screen (Esc)' : 'Open in full screen mode'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit Full Screen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Full Screen</span>
              </>
            )}
          </button>

          {/* Direct Download */}
          <button
            onClick={handleDownload}
            className="px-3 sm:px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Share Link */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* OWNER-ONLY EDITING: Strictly rendered only for the verified owner */}
          {isOwner ? (
            <button
              onClick={() => onEditDocument(docInfo)}
              className="px-3 sm:px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-xs hover:shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              title="You are the owner: Click to modify and change this document"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Modify</span>
            </button>
          ) : (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800/80 border border-gray-700 rounded-lg text-xs text-gray-400 font-medium" title="No modification access is granted to shared viewers. Only the owner can change this file.">
              <Lock className="w-3 h-3 text-gray-400" />
              <span>Read-Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive In-Browser Document Viewer */}
      <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col bg-gray-900">
        {/* PDF Viewer */}
        {isPdf ? (
          <div className="flex flex-col h-full bg-gray-900 text-white">
            {/* Viewer Toolbar */}
            <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 bg-gray-950 border-b border-gray-800 shrink-0 text-xs">
              {/* Left: Page navigation */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1.5 text-gray-300 hover:text-white disabled:opacity-30 disabled:hover:text-gray-300 rounded hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1 font-mono text-gray-300">
                  <span className="font-bold text-white">{currentPage}</span>
                  <span>/</span>
                  <span>{numPages || '...'}</span>
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                  disabled={currentPage >= numPages}
                  className="p-1.5 text-gray-300 hover:text-white disabled:opacity-30 disabled:hover:text-gray-300 rounded hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Center: Zoom and Display Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-gray-800/80 rounded-lg px-2 py-1 border border-gray-700">
                  <button
                    onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}
                    className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono px-2 text-gray-300">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
                    className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setScale(1.0)}
                  className="hidden sm:inline-block px-2 py-1 bg-gray-800/80 hover:bg-gray-700 text-[11px] rounded-lg border border-gray-700 text-gray-300 transition-colors cursor-pointer"
                >
                  100%
                </button>

                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                  title="Rotate clockwise"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* Right: Pages toggle & Fullscreen toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowThumbnails(!showThumbnails)}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    showThumbnails ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                  title="Toggle page thumbnails"
                >
                  <Columns className="w-4 h-4" />
                  <span className="hidden md:inline">Pages</span>
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                  title={isFullscreen ? 'Exit Full Screen' : 'View Full Screen'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Viewer Workspace with Sidebar & Canvas */}
            <div className="flex-1 flex overflow-hidden">
              {/* Thumbnails Sidebar */}
              {showThumbnails && numPages > 0 && (
                <div className="w-36 sm:w-44 bg-gray-950/70 border-r border-gray-800 p-3 overflow-y-auto space-y-2.5 shrink-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1">
                    Pages ({numPages})
                  </div>
                  <Document
                    file={fileUrl}
                    loading={<div className="text-center py-4 text-xs text-gray-500">Loading...</div>}
                  >
                    {Array.from({ length: numPages }, (_, idx) => idx + 1).map((pNum) => (
                      <button
                        key={pNum}
                        onClick={() => setCurrentPage(pNum)}
                        className={`w-full text-left p-1 rounded-xl border transition-all flex flex-col items-center group cursor-pointer ${
                          currentPage === pNum
                            ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/60'
                            : 'border-gray-800 hover:border-gray-700 bg-gray-900/60'
                        }`}
                      >
                        <div className="w-full bg-white rounded-lg overflow-hidden shadow-xs flex items-center justify-center">
                          <Page
                            pageNumber={pNum}
                            width={110}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono mt-1">
                          {pNum}
                        </span>
                      </button>
                    ))}
                  </Document>
                </div>
              )}

              {/* Main Document Page Preview */}
              <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center bg-gray-900/90 relative">
                {pdfLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/60 z-10 backdrop-blur-2xs">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                    <span className="text-xs text-gray-300">Rendering document pages...</span>
                  </div>
                )}

                <div 
                  className="transition-transform duration-200 shadow-2xl rounded-sm overflow-hidden bg-white"
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  <Document
                    file={fileUrl}
                    onLoadSuccess={({ numPages }) => {
                      setNumPages(numPages);
                      setPdfLoading(false);
                    }}
                    onLoadError={(err) => {
                      console.error('PDF view load error:', err);
                      setPdfLoading(false);
                    }}
                    loading={<div className="p-12 text-gray-400 text-xs">Loading page...</div>}
                  >
                    <Page
                      pageNumber={currentPage}
                      scale={scale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>
                </div>
              </div>
            </div>
          </div>
        ) : isImage ? (
          /* Image Viewer */
          <div className="flex-1 p-6 sm:p-12 bg-gray-900 flex flex-col items-center justify-center overflow-auto relative">
            <div className="max-w-4xl w-full flex items-center justify-center">
              <img
                src={fileUrl}
                alt={docInfo.title}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-2xl bg-white"
              />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleDownload}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Image</span>
              </button>
              <button
                onClick={toggleFullscreen}
                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Other Format Viewer */
          <div className="flex-1 p-12 text-center space-y-4 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{docInfo.filename}</h3>
            <p className="text-xs text-gray-500">
              Ready for high-speed download ({formatBytes(docInfo.fileSize)})
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownload}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Share Dialog */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={shareFullUrl}
        title={docInfo.title}
        filename={docInfo.filename}
        fileSize={docInfo.fileSize}
        canEdit={isOwner}
        onEditDocument={isOwner ? () => {
          setIsShareModalOpen(false);
          onEditDocument(docInfo);
        } : undefined}
      />
    </div>
  );
};
