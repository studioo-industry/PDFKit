import React from 'react';
import { Lock, Sparkles, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LockedFeatureGateProps {
  featureName: string;
  description?: string;
}

export const LockedFeatureGate: React.FC<LockedFeatureGateProps> = ({
  featureName,
  description = 'Sign in or create a free account to automatically unlock this tool and enjoy unlimited access across all your devices.'
}) => {
  const { openAuthModal } = useAuth();

  return (
    <div className="max-w-xl mx-auto my-8 bg-white border border-gray-200/90 rounded-3xl p-8 sm:p-10 shadow-xs text-center relative overflow-hidden">
      {/* Decorative background accent */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-100/50 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-100/50 rounded-full blur-2xl pointer-events-none" />

      {/* Lock Icon */}
      <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
        <Lock className="w-8 h-8" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-bold tracking-wide uppercase text-blue-700 mb-3">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Free Member Feature</span>
      </div>

      <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
        Unlock {featureName}
      </h2>

      <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed mb-6">
        {description}
      </p>

      {/* Perks List */}
      <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 max-w-md mx-auto mb-6 text-left space-y-2 text-xs text-gray-700">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span><strong>Automatic Instant Unlock</strong> upon signing in or signing up</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span><strong>Sign In with Email or Google</strong> and set a password</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span><strong>Cross-Device Access</strong> on mobile, tablet, and PC</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span><strong>100% Free Forever</strong> — No credit card or hidden fees</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
        <button
          onClick={() => openAuthModal('signup')}
          className="w-full sm:w-auto flex-1 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Sign Up Free to Unlock</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => openAuthModal('login')}
          className="w-full sm:w-auto py-3.5 px-6 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-bold rounded-2xl text-xs transition-all cursor-pointer"
        >
          Sign In
        </button>
      </div>
    </div>
  );
};
