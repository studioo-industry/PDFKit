import React from 'react';
import { 
  Users, 
  ShieldCheck, 
  Star, 
  Zap, 
  CheckCircle2, 
  Globe2, 
  Building2, 
  ExternalLink 
} from 'lucide-react';

interface PartnersSectionProps {
  onOpenContact?: () => void;
  onOpenAbout?: () => void;
}

export const PartnersSection: React.FC<PartnersSectionProps> = ({ 
  onOpenContact,
  onOpenAbout 
}) => {
  return (
    <section className="bg-gradient-to-b from-white to-gray-50/80 rounded-3xl border border-gray-200/90 p-8 sm:p-12 shadow-xs space-y-10">
      {/* Header & 1M Users Badge */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 text-amber-800 rounded-full text-xs font-bold border border-amber-200/80 shadow-xs">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>Trusted by 1,000,000+ Users Worldwide</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold font-google text-gray-900 tracking-tight">
          Powering millions of daily document & image workflows
        </h2>
        
        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-2xl mx-auto">
          From independent creators to leading digital platforms, professionals rely on our zero-upload browser technology for high-speed, 100% private file transformations.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/70 shadow-xs text-center">
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 font-google">1M+</div>
          <div className="text-xs font-medium text-gray-500 mt-1">Active Users</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/70 shadow-xs text-center">
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-google">100%</div>
          <div className="text-xs font-medium text-gray-500 mt-1">Local Browser Privacy</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/70 shadow-xs text-center">
          <div className="text-2xl sm:text-3xl font-extrabold text-purple-600 font-google">4.9 / 5</div>
          <div className="text-xs font-medium text-gray-500 mt-1">User Satisfaction Rating</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/70 shadow-xs text-center">
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-google">0 sec</div>
          <div className="text-xs font-medium text-gray-500 mt-1">Server Queue Wait</div>
        </div>
      </div>

      {/* Featured Ecosystem & Strategic Partners */}
      <div className="pt-2">
        <div className="text-center text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-6">
          Strategic Partners & Technology Ecosystem
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Partner 1: Walletly */}
          <div className="group bg-white hover:bg-blue-50/40 p-5 sm:p-6 rounded-2xl border border-gray-200 hover:border-blue-300 transition-all duration-200 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                    W
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm font-google group-hover:text-blue-600 transition-colors">
                      Walletly
                    </h3>
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      FinTech Partner
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Seamless digital receipt compression and PDF statement management integrated with secure personal finance tooling.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              <span>Verified Ecosystem Partner</span>
            </div>
          </div>

          {/* Partner 2: Fussin Hub */}
          <div className="group bg-white hover:bg-purple-50/40 p-5 sm:p-6 rounded-2xl border border-gray-200 hover:border-purple-300 transition-all duration-200 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                    FH
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm font-google group-hover:text-purple-600 transition-colors">
                      Fussin Hub
                    </h3>
                    <span className="text-[10px] text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      Media & Creator Hub
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Empowering creator communities with high-volume image optimization, batch watermark stamping, and asset conversions.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center text-[11px] font-semibold text-purple-700">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-purple-600" />
              <span>Verified Creator Partner</span>
            </div>
          </div>

          {/* Partner 3: Google & Web Standards */}
          <div className="group bg-white hover:bg-red-50/30 p-5 sm:p-6 rounded-2xl border border-gray-200 hover:border-red-300 transition-all duration-200 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-white text-gray-800 flex items-center justify-center font-bold text-base shadow-xs border border-gray-200">
                    <span className="text-blue-600">G</span>
                    <span className="text-red-500">o</span>
                    <span className="text-amber-500">o</span>
                    <span className="text-blue-600">g</span>
                    <span className="text-emerald-500">l</span>
                    <span className="text-red-500">e</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm font-google group-hover:text-blue-600 transition-colors">
                      Google
                    </h3>
                    <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Web & Cloud Standards
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Engineered to follow Google Chrome V8 and WebAssembly standard guidelines for ultra-fast browser execution and security.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center text-[11px] font-semibold text-blue-700">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-blue-600" />
              <span>V8 & WASM Optimized</span>
            </div>
          </div>
        </div>
      </div>

      {/* Partner Call to Action */}
      <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 hidden sm:flex">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-gray-900">
              Interested in partnering with PDFKit Studio?
            </div>
            <div className="text-[11px] sm:text-xs text-gray-500">
              Connect your platform with our browser-native processing suite. Contact our partner relations team.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenContact && (
            <button
              onClick={onOpenContact}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full text-xs transition-colors cursor-pointer"
            >
              Partner Inquiry
            </button>
          )}
          {onOpenAbout && (
            <button
              onClick={onOpenAbout}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-full text-xs border border-gray-200 transition-colors cursor-pointer"
            >
              About Our Story
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
