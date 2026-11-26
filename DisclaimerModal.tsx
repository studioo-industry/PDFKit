import React from 'react';
import { X, AlertTriangle, ShieldAlert, CheckCircle2, FileQuestion, Mail } from 'lucide-react';

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenContact?: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({
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
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-google text-gray-900">
                Disclaimer
              </h2>
              <p className="text-xs text-gray-500">
                General Software, Processing & File Fidelity Disclaimer
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
          {/* Main Notice */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900 text-xs sm:text-sm">
                "As Is" and "As Available" Service Notice
              </h4>
              <p className="text-amber-800 text-xs mt-0.5 leading-relaxed">
                PDFKit Studio is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied.
              </p>
            </div>
          </div>

          {/* Section 1: In-Browser Rendering & Hardware Dependency */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
              1. Local Browser Rendering & Hardware Resources
            </h3>
            <p>
              Because all file conversions, PDF splitting, image compression, and filters are executed directly in client device memory via WebAssembly and HTML5 Canvas:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Processing speeds and capabilities depend directly on your local device's available RAM and CPU power.</li>
              <li>Very large files (e.g. 500MB+ or thousands of pages) may trigger browser memory limits on older mobile devices or low-spec computers.</li>
              <li>PDFKit Studio does not store recovery logs or backup copies of your files.</li>
            </ul>
          </div>

          {/* Section 2: File Backup Recommendation */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
              2. Always Retain Original Backups
            </h3>
            <p>
              While our PDF-Lib and Canvas algorithms are heavily tested for industry-standard compliance, complex PDF forms, proprietary font embeddings, and unusual color spaces may render slightly differently. <strong>We strongly advise always keeping a backup copy of your original documents and photos before modifying or compressing them.</strong>
            </p>
          </div>

          {/* Section 3: Third-Party & Partner Mentions */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
              3. Ecosystem & Partner Trademarks
            </h3>
            <p>
              References to third-party companies and trademarks (including Google, Chrome, Walletly, Fussin Hub, Adobe, PDF, etc.) are for descriptive, compatibility, and integration reference purposes only. All product names, logos, and brands remain the property of their respective owners.
            </p>
          </div>

          {/* Section 4: Contact */}
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-700 font-semibold">
              <Mail className="w-4 h-4 text-blue-600" />
              <span>Questions? Email playzoneofficial99@gmail.com</span>
            </div>
            {onOpenContact && (
              <button
                onClick={() => {
                  onClose();
                  onOpenContact();
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
              >
                Send Message
              </button>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-full text-xs shadow-xs transition-colors cursor-pointer"
          >
            I Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};
