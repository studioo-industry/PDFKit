import React from 'react';
import { X, Sparkles, ShieldCheck, Zap, Users, Globe2, Heart, Award, Building2, Mail } from 'lucide-react';

interface AboutUsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenContact?: () => void;
}

export const AboutUsModal: React.FC<AboutUsModalProps> = ({
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
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
              P
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-google text-gray-900">
                About PDFKit Studio
              </h2>
              <p className="text-xs text-gray-500">
                Fast, Private & In-Browser Document & Image Processing
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
          {/* Mission Card */}
          <div className="p-5 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-100 rounded-3xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full text-xs font-bold text-blue-700 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Our Mission</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 font-google">
              Reinventing file utilities without compromising user privacy.
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              PDFKit Studio was created to solve a fundamental flaw in modern online converters: forcing users to upload sensitive financial, legal, and personal files to unknown third-party cloud servers. We proved that cutting-edge browser capabilities (WebAssembly, PDF-Lib, Canvas) allow 100% local, instantaneous document manipulation with zero server exposure.
            </p>
          </div>

          {/* Key Milestones & Metrics */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80">
              <div className="text-xl sm:text-2xl font-extrabold text-blue-600 font-google">1,000,000+</div>
              <div className="text-[11px] text-gray-500 font-medium mt-0.5">Global Users</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80">
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-google">0 Uploads</div>
              <div className="text-[11px] text-gray-500 font-medium mt-0.5">Zero Data Collected</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80">
              <div className="text-xl sm:text-2xl font-extrabold text-purple-600 font-google">15+ Tools</div>
              <div className="text-[11px] text-gray-500 font-medium mt-0.5">PDF & Image Suite</div>
            </div>
          </div>

          {/* Pillars */}
          <div className="space-y-3">
            <h4 className="font-bold text-gray-900 text-sm font-google uppercase tracking-wider">
              Core Engineering Pillars
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-gray-200 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-gray-900 text-xs sm:text-sm">Radical Privacy</div>
                  <div className="text-gray-500 text-xs mt-0.5">Your files stay strictly within your device's memory.</div>
                </div>
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded-2xl flex items-start gap-3">
                <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-gray-900 text-xs sm:text-sm">Instant Execution</div>
                  <div className="text-gray-500 text-xs mt-0.5">No upload buffers or queue delays. Fast, client-side rendering.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Partners & Ecosystem */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
            <h4 className="font-bold text-gray-900 text-xs sm:text-sm flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Ecosystem Alliances & Community</span>
            </h4>
            <p className="text-xs text-gray-600">
              Proudly collaborating with innovative digital partners like <strong>Walletly</strong> (financial asset management), <strong>Fussin Hub</strong> (creator media ecosystem), and engineered following modern <strong>Google Chrome & WebAssembly</strong> standards.
            </p>
          </div>

          {/* Contact Bar */}
          <div className="flex items-center justify-between p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-800">
              <Mail className="w-4 h-4 text-blue-600" />
              <span>Reach the Team: playzoneofficial99@gmail.com</span>
            </div>
            {onOpenContact && (
              <button
                onClick={() => {
                  onClose();
                  onOpenContact();
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
              >
                Send Feedback
              </button>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full text-xs shadow-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
