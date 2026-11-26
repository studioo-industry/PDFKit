import React from 'react';
import { X, FileText, CheckCircle2, AlertCircle, Scale, Mail } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenContact?: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({
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
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-google text-gray-900">
                Terms & Conditions
              </h2>
              <p className="text-xs text-gray-500">
                Terms of Service & Acceptable Use Policy • Last Revised: August 2026
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
          {/* Intro */}
          <p>
            Welcome to <strong>PDFKit Studio</strong>. By accessing or using our website, utilities, and associated services, you agree to be bound by the following Terms and Conditions. Please review them carefully.
          </p>

          {/* Section 1: Service Description */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
              1. Nature of the Service & Browser Execution
            </h3>
            <p>
              PDFKit Studio provides web-based client-side tools for manipulating, converting, compressing, watermarking, and organizing PDF documents and images. Processing is carried out locally using client-side JavaScript, WebAssembly, and HTML5 Canvas technologies.
            </p>
          </div>

          {/* Section 2: Intellectual Property */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
              2. Intellectual Property & Ownership of User Files
            </h3>
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-2xl space-y-1">
              <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>You Retain 100% Ownership</span>
              </div>
              <p className="text-blue-800 text-xs">
                We assert zero intellectual property rights over files you process. You retain all copyrights, proprietary rights, and licenses in your documents and images.
              </p>
            </div>
            <p>
              All software codebase, interfaces, logos, brand elements, and visual themes comprising PDFKit Studio remain the exclusive intellectual property of PDFKit Studio and its licensors.
            </p>
          </div>

          {/* Section 3: Acceptable Use */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
              3. Acceptable Use Policy
            </h3>
            <p>You agree not to use the service to:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Process content that violates third-party copyrights, trademarks, or personal rights.</li>
              <li>Attempt to reverse-engineer, inject automated denial-of-service scripts, or scrape the application.</li>
              <li>Bypass client-side plan limits or ad delivery systems through abusive automated bots.</li>
            </ul>
          </div>

          {/* Section 4: Subscription & Free Tier */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
              4. Subscription Tiers & Fair Usage
            </h3>
            <p>
              The <strong>Free Tier</strong> is ad-supported and offers file size thresholds suitable for everyday individual tasks. The <strong>PRO Tier</strong> grants extended file upload capacities (100MB+), bulk batch queues, and completely ad-free workflows.
            </p>
          </div>

          {/* Section 5: Limitation of Liability */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
              5. Limitation of Liability
            </h3>
            <p>
              Under no circumstances shall PDFKit Studio, its developers, or its partners (including Walletly, Fussin Hub, and Google) be held liable for any data loss, corruption of files, interruption of business, or incidental damages resulting from the use or inability to use the tools. Users are encouraged to maintain backup copies of all original files.
            </p>
          </div>

          {/* Contact Row */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Legal inquiries:</span>
            <div className="flex items-center gap-1.5 font-semibold text-gray-800">
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span>playzoneofficial99@gmail.com</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full text-xs shadow-xs transition-colors cursor-pointer"
          >
            Accept & Close
          </button>
        </div>
      </div>
    </div>
  );
};
