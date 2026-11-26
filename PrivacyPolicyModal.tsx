import React from 'react';
import { X, ShieldCheck, Lock, EyeOff, Server, HardDrive, Mail } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenContact?: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  onOpenContact,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 z-10">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-google text-gray-900">
                Privacy Policy
              </h2>
              <p className="text-xs text-gray-500">
                Last updated: August 2026 • 100% Client-Side Privacy Guarantee
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs sm:text-sm text-gray-600 leading-relaxed">
          {/* Highlight Card */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
            <Lock className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-900 text-xs sm:text-sm">
                Zero-Upload Privacy Architecture
              </h4>
              <p className="text-emerald-800 text-xs mt-0.5 leading-relaxed">
                PDFKit Studio does not upload, transmit, or store your documents or images on any server. All processing (merging, compressing, cropping, resizing, converting, and watermarking) is executed entirely within your browser memory (RAM) and vanishes upon closing the tab.
              </p>
            </div>
          </div>

          {/* Section 1 */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
              <span>1. Information We Do NOT Collect</span>
            </h3>
            <p>
              Unlike legacy cloud document converters, we never inspect, read, copy, or retain the contents of your files. When you select a PDF or image:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>No files are transmitted to external cloud servers or databases.</li>
              <li>No document metadata, personal text, biometric images, or confidential figures are stored.</li>
              <li>No file copies remain once you refresh or close your browser session.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
              <span>2. Local Storage and Preferences</span>
            </h3>
            <p>
              We use lightweight local browser storage (<code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">localStorage</code>) strictly to preserve user settings on your own device, such as:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Your preferred view filters (e.g., PDF Tools vs Image Tools).</li>
              <li>PRO account status and simulated subscription state.</li>
              <li>Recent locally completed tool actions.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
              <span>3. Third-Party Advertising & Analytics</span>
            </h3>
            <p>
              To maintain free access for millions of users worldwide, the free tier of PDFKit Studio displays standard privacy-compliant advertisements (such as Google AdSense or certified sponsor networks). These providers may use non-identifying cookies to serve relevant contextual advertisements in accordance with standard web advertising policies.
            </p>
            <p>
              PRO subscribers enjoy an entirely ad-free experience with zero third-party advertising scripts active.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
              <span>4. GDPR, CCPA, and Global Compliance</span>
            </h3>
            <p>
              Because we operate on a zero-knowledge, client-side execution framework, we do not maintain databases of personal information, sell personal data, or track users across external domains.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
              <span>5. Privacy Officer & Contact</span>
            </h3>
            <p>
              If you have any questions or security audits regarding our privacy architecture, please contact our data privacy desk at:
            </p>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-800 font-semibold text-xs sm:text-sm">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>playzoneofficial99@gmail.com</span>
              </div>
              {onOpenContact && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenContact();
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                >
                  Contact Form
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full text-xs shadow-xs transition-colors cursor-pointer"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
};
