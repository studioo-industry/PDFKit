import React, { useState, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  ExternalLink, 
  Download, 
  QrCode, 
  Smartphone, 
  Send, 
  Mail, 
  MessageCircle, 
  Sparkles,
  Edit3,
  ShieldCheck,
  Eye
} from 'lucide-react';
import QRCode from 'qrcode';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  title: string;
  filename: string;
  fileSize?: number;
  onOpenViewer?: () => void;
  onEditDocument?: () => void;
  canEdit?: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  shareUrl,
  title,
  filename,
  fileSize,
  onOpenViewer,
  onEditDocument,
  canEdit = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    if (shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((e) => console.warn('QR Code generation error:', e));
    }
  }, [shareUrl]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    let success = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        success = true;
      }
    } catch (err) {
      console.warn('navigator.clipboard write failed, using fallback', err);
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Shared Document via PDFKit',
          text: `Check out "${filename}" on PDFKit - open, view in browser, edit or download:`,
          url: shareUrl,
        });
      } catch (e) {
        // User cancelled or not supported
      }
    } else {
      handleCopy();
    }
  };

  const shareText = encodeURIComponent(`Check out "${filename}" on PDFKit. Open and view directly in your browser: ${shareUrl}`);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 relative space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 font-google">
              Share Document
            </h3>
            <p className="text-xs text-gray-500 truncate max-w-xs sm:max-w-sm">
              {filename}
            </p>
          </div>
        </div>

        {/* Link box with Copy Button */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
            <span>Unique Shareable Link</span>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Ready to share
            </span>
          </label>
          <div className="flex items-center gap-2 p-1.5 bg-gray-50 border border-gray-200 rounded-2xl focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <input
              type="text"
              readOnly
              value={shareUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-gray-800 font-mono select-all focus:outline-hidden truncate"
            />
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Key Feature Highlights */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-100/90 rounded-2xl space-y-1 text-xs text-blue-900">
          <div className="flex items-center gap-1.5 font-bold text-blue-950">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Opens directly in browser — no app needed!</span>
          </div>
          <p className="text-[11px] text-blue-700 leading-relaxed">
            Anyone with this link can view this document live in their browser with full page preview, zoom in/out, and one-click download.
          </p>
        </div>

        {/* Quick Social & Action Buttons */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Share directly via
          </div>
          <div className="grid grid-cols-4 gap-2">
            {/* WhatsApp */}
            <a
              href={`https://api.whatsapp.com/send?text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2.5 bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-200 hover:border-emerald-200 rounded-xl text-[11px] font-medium transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600 mb-1" />
              <span>WhatsApp</span>
            </a>

            {/* Telegram */}
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(filename)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2.5 bg-gray-50 hover:bg-sky-50 text-gray-700 hover:text-sky-700 border border-gray-200 hover:border-sky-200 rounded-xl text-[11px] font-medium transition-colors"
            >
              <Send className="w-4 h-4 text-sky-500 mb-1" />
              <span>Telegram</span>
            </a>

            {/* Email */}
            <a
              href={`mailto:?subject=${encodeURIComponent(`Shared document: ${filename}`)}&body=${shareText}`}
              className="flex flex-col items-center justify-center p-2.5 bg-gray-50 hover:bg-amber-50 text-gray-700 hover:text-amber-700 border border-gray-200 hover:border-amber-200 rounded-xl text-[11px] font-medium transition-colors"
            >
              <Mail className="w-4 h-4 text-amber-500 mb-1" />
              <span>Email</span>
            </a>

            {/* QR Code toggle */}
            <button
              onClick={() => setShowQr(!showQr)}
              className={`flex flex-col items-center justify-center p-2.5 border rounded-xl text-[11px] font-medium transition-colors cursor-pointer ${
                showQr
                  ? 'bg-purple-50 text-purple-700 border-purple-300'
                  : 'bg-gray-50 hover:bg-purple-50 text-gray-700 hover:text-purple-700 border-gray-200 hover:border-purple-200'
              }`}
            >
              <QrCode className="w-4 h-4 text-purple-600 mb-1" />
              <span>QR Code</span>
            </button>
          </div>
        </div>

        {/* QR Code expansion section */}
        {showQr && qrDataUrl && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col items-center text-center animate-in fade-in duration-200">
            <img 
              src={qrDataUrl} 
              alt="Document QR Code" 
              className="w-44 h-44 rounded-xl shadow-xs border border-gray-200 bg-white p-2 mb-2"
            />
            <p className="text-xs text-gray-600 font-medium">
              Scan with your phone's camera to open this document instantly!
            </p>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {onOpenViewer && (
            <button
              onClick={() => {
                onClose();
                onOpenViewer();
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Open In-Browser Viewer</span>
            </button>
          )}

          {canEdit && onEditDocument && (
            <button
              onClick={() => {
                onClose();
                onEditDocument();
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
              <span>Edit Document Anytime</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
