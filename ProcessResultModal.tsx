import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Download, 
  ArrowLeft, 
  FileText, 
  Archive, 
  Sparkles, 
  Share2, 
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Image as ImageIcon,
  Copy,
  Check,
  Edit3,
  Eye,
  Loader2,
  QrCode,
  Lock
} from 'lucide-react';
import { ProcessResult, ToolId } from '../types';
import { formatBytes, downloadBlob } from '../services/pdfService';
import { createShareDocument, updateShareDocument, getAppBaseUrl } from '../services/shareService';
import { ShareModal } from './ShareModal';
import { AdBanner } from './AdBanner';
import { usePremium } from '../context/PremiumContext';
import { useAuth } from '../context/AuthContext';
import { PdfThumbnailPreview } from './preview/PdfThumbnailPreview';
import { PdfPreviewModal } from './preview/PdfPreviewModal';

interface ProcessResultModalProps {
  result: ProcessResult;
  toolId: ToolId;
  onReset: () => void;
  onSwitchTool: (toolId: ToolId) => void;
  onOpenSharedViewer?: (shareId: string) => void;
  onEditDocument?: (toolState: any, shareId?: string) => void;
}

export const ProcessResultModal: React.FC<ProcessResultModalProps> = ({
  result,
  toolId,
  onReset,
  onSwitchTool,
  onOpenSharedViewer,
  onEditDocument,
}) => {
  const { isPremium, openUpgradeModal } = usePremium();
  const { isAuthenticated, openAuthModal } = useAuth();
  const [isSharing, setIsSharing] = useState(false);
  const [shareId, setShareId] = useState<string | null>(result.shareId || null);
  const [shareUrl, setShareUrl] = useState<string | null>(() => {
    if (result.shareId) {
      const base = getAppBaseUrl();
      return base ? `${base}/?share=${result.shareId}` : `/?share=${result.shareId}`;
    }
    return null;
  });
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  // Sync state when a new result is passed to the modal
  useEffect(() => {
    setShareId(result.shareId || null);
    if (result.shareId) {
      const base = getAppBaseUrl();
      setShareUrl(base ? `${base}/?share=${result.shareId}` : `/?share=${result.shareId}`);
    } else {
      setShareUrl(null);
    }
    setIsSharing(false);
    setShareError(null);
    setCopiedLink(false);
    setIsPdfPreviewOpen(false);
  }, [result]);

  const downloadFilename = result.downloadFilename || (result as any).downloadName || 'processed_file';

  const isPdfOutput =
    (typeof downloadFilename === 'string' && downloadFilename.toLowerCase().endsWith('.pdf')) ||
    result.mimeType === 'application/pdf';

  const isImageOutput =
    typeof downloadFilename === 'string' &&
    (downloadFilename.toLowerCase().endsWith('.jpg') ||
      downloadFilename.toLowerCase().endsWith('.jpeg') ||
      downloadFilename.toLowerCase().endsWith('.png') ||
      downloadFilename.toLowerCase().endsWith('.webp') ||
      downloadFilename.toLowerCase().endsWith('.gif'));

  const isDocxOutput =
    typeof downloadFilename === 'string' &&
    (downloadFilename.toLowerCase().endsWith('.docx') || downloadFilename.toLowerCase().endsWith('.doc'));

  const getMimeType = () => {
    if (result.mimeType) return result.mimeType;
    if (isPdfOutput) return 'application/pdf';
    if (isDocxOutput) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (result.zipBlob) return 'application/zip';
    if (downloadFilename.toLowerCase().endsWith('.png')) return 'image/png';
    if (downloadFilename.toLowerCase().endsWith('.webp')) return 'image/webp';
    if (downloadFilename.toLowerCase().endsWith('.jpg') || downloadFilename.toLowerCase().endsWith('.jpeg')) return 'image/jpeg';
    return 'application/octet-stream';
  };

  const getFileBlob = async (): Promise<Blob | null> => {
    // Direct blob
    if (result.blob) {
      if (result.blob instanceof Blob) return result.blob;
      if (result.blob instanceof Uint8Array || result.blob instanceof ArrayBuffer) {
        return new Blob([result.blob], { type: getMimeType() });
      }
    }
    // Zip archive blob
    if (result.zipBlob && result.zipBlob instanceof Blob) return result.zipBlob;

    // Multiple files array
    if (result.multipleFiles && result.multipleFiles.length > 0) {
      const first = result.multipleFiles[0];
      if (first.blob && first.blob instanceof Blob) return first.blob;
    }

    // Extracted images array
    if (result.images && result.images.length > 0) {
      const first = result.images[0];
      if (first.blob && first.blob instanceof Blob) return first.blob;
    }

    // Download URL fallback (fetch or data URI parse)
    if (result.downloadUrl) {
      if (result.downloadUrl.startsWith('data:')) {
        try {
          const parts = result.downloadUrl.split(',');
          const mime = parts[0].match(/:(.*?);/)?.[1] || getMimeType();
          const bstr = atob(parts[1]);
          const u8arr = new Uint8Array(bstr.length);
          for (let i = 0; i < bstr.length; i++) {
            u8arr[i] = bstr.charCodeAt(i);
          }
          return new Blob([u8arr], { type: mime });
        } catch (e) {
          console.warn('Failed to parse data URL in getFileBlob', e);
        }
      }
      try {
        const r = await fetch(result.downloadUrl);
        if (r.ok) {
          return await r.blob();
        }
      } catch (e) {
        console.warn('Failed to fetch blob from downloadUrl', e);
      }
    }
    return null;
  };

  const handleShareClick = async () => {
    if (!isAuthenticated) {
      openAuthModal(
        'signup',
        'Please sign in or create an account to generate secure shareable links. Shared documents open in full screen and only you (the owner) can modify them.'
      );
      return;
    }

    if (shareId && shareUrl) {
      setIsPdfPreviewOpen(false);
      setIsShareModalOpen(true);
      return;
    }

    setIsSharing(true);
    setShareError(null);

    try {
      const blob = await getFileBlob();
      if (!blob) {
        throw new Error('Unable to prepare file for sharing. Please re-run or try again.');
      }

      const res = await createShareDocument({
        title: result.title || downloadFilename,
        filename: downloadFilename,
        mimeType: getMimeType(),
        blob,
        toolId,
        toolState: result.toolState || null,
      });

      setShareId(res.id);
      setShareUrl(res.fullUrl);
      setIsPdfPreviewOpen(false);
      setIsShareModalOpen(true);
    } catch (err: any) {
      console.error('Error creating share link:', err);
      setShareError(err?.message || 'Failed to generate share link. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    let success = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        success = true;
      }
    } catch (e) {
      console.warn('navigator.clipboard.writeText failed, trying fallback', e);
    }

    if (!success) {
      try {
        const input = document.createElement('input');
        input.value = shareUrl;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        success = document.execCommand('copy');
        document.body.removeChild(input);
      } catch (e) {
        console.warn('execCommand copy fallback error:', e);
      }
    }

    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleDownloadMain = async () => {
    try {
      const mime = getMimeType();
      if (result.zipBlob) {
        downloadBlob(result.zipBlob, downloadFilename, 'application/zip');
        return;
      }
      if (result.blob) {
        downloadBlob(result.blob, downloadFilename, mime);
        return;
      }
      if (result.downloadUrl) {
        if (result.downloadUrl.startsWith('data:') || result.downloadUrl.startsWith('blob:')) {
          const a = document.createElement('a');
          a.href = result.downloadUrl;
          a.download = downloadFilename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
        }
        const res = await fetch(result.downloadUrl);
        const b = await res.blob();
        downloadBlob(b, downloadFilename, mime);
        return;
      }
      if (result.multipleFiles && result.multipleFiles.length > 0) {
        downloadBlob(result.multipleFiles[0].blob, result.multipleFiles[0].name || downloadFilename, mime);
        return;
      }
    } catch (e) {
      console.warn('downloadBlob encountered error, trying anchor fallback:', e);
      if (result.downloadUrl) {
        const a = document.createElement('a');
        a.href = result.downloadUrl;
        a.download = downloadFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Top Banner Result Card */}
      <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-10 shadow-sm text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-100/60 shadow-xs">
          <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 font-google mb-2">
          {result.title || (result as any).message || 'Your File is Ready!'}
        </h2>

        {/* Single Image Live Preview if output is an image */}
        {isImageOutput && result.downloadUrl && (
          <div className="my-5 max-w-sm mx-auto p-2 bg-gray-50 border border-gray-200 rounded-2xl shadow-xs">
            <img
              src={result.downloadUrl}
              alt="Processed output"
              className="max-h-56 w-auto mx-auto object-contain rounded-xl"
            />
          </div>
        )}

        {/* File size savings meter if Compress tool */}
        {(toolId === 'compress' || toolId === 'compress-image') && result.originalSize && result.fileSize && (
          <div className="my-4 max-w-sm mx-auto p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 mb-1">
              <span>Original: {formatBytes(result.originalSize)}</span>
              <span className="text-sm font-bold text-emerald-600">
                -
                {Math.max(
                  0,
                  Math.round(((result.originalSize - result.fileSize) / result.originalSize) * 100)
                )}
                %
              </span>
              <span>New: {formatBytes(result.fileSize)}</span>
            </div>
            <div className="w-full bg-emerald-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      10,
                      Math.round((result.fileSize / result.originalSize) * 100)
                    )
                  )}%`,
                }}
              />
            </div>
            <div className="text-[11px] text-emerald-700 mt-2 font-medium">
              Saved {formatBytes(Math.max(0, result.originalSize - result.fileSize))} of storage space!
            </div>
          </div>
        )}

        {/* General size info */}
        {result.fileSize && toolId !== 'compress' && toolId !== 'compress-image' && (
          <p className="text-xs sm:text-sm text-gray-500 mb-6">
            File size: <span className="font-semibold text-gray-700">{formatBytes(result.fileSize)}</span>
          </p>
        )}

        {/* In-Modal PDF Thumbnail Card (Instant preview before downloading/sharing) */}
        {isPdfOutput && (result.blob || result.downloadUrl) && (
          <div className="my-5 max-w-md mx-auto">
            <PdfThumbnailPreview
              file={result.blob || result.downloadUrl!}
              fileName={downloadFilename}
              fileSize={result.fileSize}
              compact={true}
              onShare={handleShareClick}
              onEdit={
                onEditDocument && (result.toolState || shareId)
                  ? () => onEditDocument(result.toolState, shareId || undefined)
                  : undefined
              }
            />
          </div>
        )}

        {/* Main Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 my-6 flex-wrap">
          {/* Preview Button for PDF output */}
          {isPdfOutput && (result.blob || result.downloadUrl) && (
            <button
              id="preview-result-pdf-btn"
              onClick={() => setIsPdfPreviewOpen(true)}
              className="w-full sm:w-auto px-6 py-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/90 font-bold rounded-full text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow-md"
              title="Preview converted or processed PDF pages before downloading or sharing"
            >
              <Eye className="w-5 h-5 text-indigo-600" />
              <span>Preview PDF</span>
            </button>
          )}

          {/* Download Button */}
          <button
            id="download-result-btn"
            onClick={handleDownloadMain}
            className="w-full sm:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Download className="w-5 h-5" />
            <span>
              {result.zipBlob
                ? 'Download ZIP Archive'
                : isDocxOutput
                ? 'Download Word Document (.docx)'
                : isImageOutput
                ? 'Download Image'
                : 'Download PDF Document'}
            </span>
          </button>

          {/* Share & Generate Unique Link Button */}
          <button
            id="share-result-btn"
            onClick={handleShareClick}
            disabled={isSharing}
            className="w-full sm:w-auto px-6 py-3.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold rounded-full text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            title={!isAuthenticated ? 'Sign in required to create protected share links' : 'Create secure shareable link'}
          >
            {isSharing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                <span>Creating Link...</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-purple-600" />
                <span>{shareUrl ? 'Share Document Link' : 'Share & Create Link'}</span>
                {!isAuthenticated && (
                  <span className="text-[10px] bg-purple-200/80 text-purple-800 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Sign in</span>
                  </span>
                )}
              </>
            )}
          </button>

          {/* Edit Document Anytime Button */}
          {(onEditDocument || result.toolState) && (
            <button
              onClick={() => onEditDocument?.(result.toolState, shareId || undefined)}
              className="w-full sm:w-auto px-5 py-3.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold rounded-full text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              title="Re-open in workspace and edit anytime"
            >
              <Edit3 className="w-4 h-4 text-amber-600" />
              <span>Edit Document</span>
            </button>
          )}

          {/* Process Another */}
          <button
            onClick={onReset}
            className="w-full sm:w-auto px-5 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-full text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>New File</span>
          </button>
        </div>

        {/* Share Error Alert if any */}
        {shareError && (
          <div className="my-3 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 max-w-lg mx-auto text-left">
            {shareError}
          </div>
        )}

        {/* Unique Shareable Link Display Card (when generated) */}
        {shareUrl && (
          <div className="my-5 max-w-xl mx-auto p-4 sm:p-5 bg-linear-to-r from-purple-50/70 via-blue-50/70 to-indigo-50/70 border border-purple-200/90 rounded-2xl text-left space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Unique Shareable Link (Open in Browser)
              </span>
              <span className="text-[11px] text-purple-700 font-medium flex items-center gap-1 bg-purple-100/70 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" /> Live & Editable
              </span>
            </div>

            <div className="flex items-center gap-2 p-1.5 bg-white border border-gray-200 rounded-xl shadow-2xs">
              <input
                type="text"
                readOnly
                value={shareUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 bg-transparent px-2.5 py-1 text-xs text-gray-700 font-mono truncate select-all focus:outline-hidden"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 flex-wrap gap-2">
              <p className="text-[11px] text-gray-500">
                Anyone with this link can view the file directly in their browser and download it.
              </p>
              {shareId && onOpenSharedViewer && (
                <button
                  onClick={() => onOpenSharedViewer(shareId)}
                  className="text-blue-600 hover:text-blue-800 font-semibold text-xs flex items-center gap-1 underline underline-offset-2 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview In-Browser Viewer</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Multiple file items / images individual download section */}
        {result.images && result.images.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-100 text-left">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-gray-800">
                Converted Pages ({result.images.length})
              </h4>
              <span className="text-xs text-gray-500">Click any image to download individually</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-80 overflow-y-auto p-1">
              {result.images.map((img) => (
                <div
                  key={img.pageNum}
                  className="group relative bg-gray-50 border border-gray-200 rounded-xl p-2 hover:border-blue-400 transition-all flex flex-col items-center"
                >
                  <img
                    src={img.dataUrl}
                    alt={`Page ${img.pageNum}`}
                    className="w-full h-32 object-contain rounded bg-white shadow-2xs mb-2"
                  />
                  <div className="w-full flex items-center justify-between text-[11px] text-gray-600">
                    <span>Page {img.pageNum}</span>
                    <a
                      href={img.dataUrl}
                      download={img.filename}
                      className="p-1 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                      title="Download image"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Multiple split files or batch image outputs */}
        {result.multipleFiles && result.multipleFiles.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-100 text-left">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-gray-800">
                Processed Files ({result.multipleFiles.length})
              </h4>
              <span className="text-xs text-gray-500">Download individually or via ZIP above</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto">
              {result.multipleFiles.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {f.url ? (
                      <div className="w-8 h-8 rounded bg-gray-200 overflow-hidden shrink-0">
                        <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <FileText className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <div className="truncate">
                      <div className="font-semibold text-gray-800 truncate">{f.name}</div>
                      <div className="text-[10px] text-gray-400">{formatBytes(f.size)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadBlob(f.blob, f.name)}
                    className="px-3 py-1 bg-white border border-gray-300 hover:bg-blue-50 hover:text-blue-600 text-gray-700 rounded-lg font-medium flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Privacy Note */}
        <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Processed safely in browser. No file was sent to external cloud servers.</span>
        </div>
      </div>

      {/* Ad for Free users */}
      <AdBanner variant="horizontal" />

      {/* Next actions recommendation */}
      {onSwitchTool && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            What would you like to do next?
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {toolId !== 'compress-image' && toolId !== 'compress' && (
              <button
                onClick={() => onSwitchTool(isImageOutput ? 'compress-image' : 'compress')}
                className="p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-xs text-gray-900 mb-0.5">Compress File</div>
                <div className="text-[11px] text-gray-500">Reduce its file size</div>
              </button>
            )}
            {toolId !== 'watermark-image' && (
              <button
                onClick={() => onSwitchTool('watermark-image')}
                className="p-3 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 rounded-xl text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-xs text-gray-900 mb-0.5">Watermark Photo</div>
                <div className="text-[11px] text-gray-500">Stamp copyright / confidential</div>
              </button>
            )}
            {toolId !== 'convert-image' && (
              <button
                onClick={() => onSwitchTool('convert-image')}
                className="p-3 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 rounded-xl text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-xs text-gray-900 mb-0.5">Convert Image</div>
                <div className="text-[11px] text-gray-500">To WEBP, JPG, or PNG</div>
              </button>
            )}
          </div>
        </div>
      )}
      {/* PDF.js Preview Modal Dialog */}
      {isPdfOutput && (result.blob || result.downloadUrl) && (
        <PdfPreviewModal
          isOpen={isPdfPreviewOpen}
          onClose={() => setIsPdfPreviewOpen(false)}
          file={result.blob || result.downloadUrl!}
          fileName={downloadFilename}
          onShare={handleShareClick}
          onEdit={
            onEditDocument && (result.toolState || shareId)
              ? () => {
                  setIsPdfPreviewOpen(false);
                  onEditDocument(result.toolState, shareId || undefined);
                }
              : undefined
          }
        />
      )}

      {/* Share Modal Dialog */}
      {shareUrl && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          shareUrl={shareUrl}
          title={result.title || downloadFilename}
          filename={downloadFilename}
          fileSize={result.fileSize}
          onOpenViewer={
            shareId && onOpenSharedViewer
              ? () => {
                  setIsShareModalOpen(false);
                  onOpenSharedViewer(shareId);
                }
              : undefined
          }
          onEditDocument={
            onEditDocument && (result.toolState || shareId)
              ? () => {
                  setIsShareModalOpen(false);
                  onEditDocument(result.toolState, shareId || undefined);
                }
              : undefined
          }
        />
      )}
    </div>
  );
};

