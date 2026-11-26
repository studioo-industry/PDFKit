import React from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  FileText, 
  Image as ImageIcon, 
  Mail, 
  Building2, 
  Scale, 
  AlertTriangle, 
  Info, 
  Heart,
  Star
} from 'lucide-react';
import { ToolId, InfoModalType } from '../types';
import { TOOLS } from '../data/tools';
import { usePremium } from '../context/PremiumContext';

interface FooterProps {
  onSelectTool: (id: ToolId) => void;
  onOpenModal: (type: InfoModalType) => void;
  onOpenHistory?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTool, onOpenModal, onOpenHistory }) => {
  const { isPremium, openUpgradeModal, downgradeToFree } = usePremium();

  const pdfTools = TOOLS.filter((t) => t.toolType === 'pdf');
  const imageTools = TOOLS.filter((t) => t.toolType === 'image');

  return (
    <footer className="mt-20 border-t border-gray-200/80 bg-white text-gray-600 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-gray-100">
          
          {/* Col 1: Brand & Privacy Guarantee */}
          <div className="space-y-3 lg:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                P
              </div>
              <span className="text-base font-bold text-gray-900 font-google">
                PDF<span className="text-blue-600">Kit</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              The all-in-one browser PDF and Image suite. Process files securely in RAM without server uploads.
            </p>
            <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl w-fit border border-amber-200/60 font-semibold text-[11px]">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Trusted by 1M+ Users</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl w-fit border border-emerald-200/60 font-medium text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Client-Side Privacy</span>
            </div>
          </div>

          {/* Col 2: PDF Tools */}
          <div className="space-y-2">
            <div className="font-bold text-blue-600 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Tools</span>
            </div>
            <ul className="space-y-1.5">
              {pdfTools.slice(0, 6).map((tool) => (
                <li key={tool.id}>
                  <button
                    onClick={() => onSelectTool(tool.id)}
                    className="hover:text-blue-600 transition-colors text-left cursor-pointer"
                  >
                    {tool.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Image Tools */}
          <div className="space-y-2">
            <div className="font-bold text-purple-600 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Image Tools</span>
            </div>
            <ul className="space-y-1.5">
              {imageTools.slice(0, 6).map((tool) => (
                <li key={tool.id}>
                  <button
                    onClick={() => onSelectTool(tool.id)}
                    className="hover:text-purple-600 transition-colors text-left cursor-pointer"
                  >
                    {tool.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Company & Partners */}
          <div className="space-y-2">
            <div className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-gray-500" />
              <span>Company & Partners</span>
            </div>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => onOpenModal('about')}
                  className="hover:text-blue-600 transition-colors text-left cursor-pointer flex items-center gap-1"
                >
                  <Info className="w-3 h-3 text-gray-400" />
                  <span>About Us</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal('contact')}
                  className="hover:text-blue-600 transition-colors text-left cursor-pointer flex items-center gap-1 font-semibold text-blue-600"
                >
                  <Mail className="w-3 h-3 text-blue-500" />
                  <span>Contact Us</span>
                </button>
              </li>
              <li className="pt-2">
                <div className="text-[10px] uppercase font-bold text-gray-400">Key Partners</div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-medium text-[10px]">
                    Walletly
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-medium text-[10px]">
                    Fussin Hub
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-medium text-[10px]">
                    Google
                  </span>
                </div>
              </li>
            </ul>
          </div>

          {/* Col 5: Legal & Support */}
          <div className="space-y-2">
            <div className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-gray-500" />
              <span>Legal & Policies</span>
            </div>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => onOpenModal('privacy')}
                  className="hover:text-blue-600 transition-colors text-left cursor-pointer flex items-center gap-1"
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>Privacy Policy</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal('terms')}
                  className="hover:text-blue-600 transition-colors text-left cursor-pointer flex items-center gap-1"
                >
                  <FileText className="w-3 h-3 text-blue-400" />
                  <span>Terms & Conditions</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal('disclaimer')}
                  className="hover:text-blue-600 transition-colors text-left cursor-pointer flex items-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <span>Disclaimer</span>
                </button>
              </li>
              <li className="pt-2">
                <div className="text-[10px] text-gray-400">Support Desk:</div>
                <a
                  href="mailto:playzoneofficial99@gmail.com"
                  className="text-[11px] text-blue-600 hover:underline font-mono truncate block"
                >
                  playzoneofficial99@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright row */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-400 text-[11px]">
          <div>
            © {new Date().getFullYear()} PDFKit Studio. In-browser PDF & Image processing engine.
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => onOpenModal('privacy')}
              className="hover:text-gray-600 transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <span>•</span>
            <button
              onClick={() => onOpenModal('terms')}
              className="hover:text-gray-600 transition-colors cursor-pointer"
            >
              Terms
            </button>
            <span>•</span>
            <button
              onClick={() => onOpenModal('disclaimer')}
              className="hover:text-gray-600 transition-colors cursor-pointer"
            >
              Disclaimer
            </button>
            <span>•</span>
            <button
              onClick={() => onOpenModal('contact')}
              className="hover:text-gray-600 transition-colors cursor-pointer"
            >
              Contact
            </button>
            {onOpenHistory && (
              <>
                <span>•</span>
                <button
                  onClick={onOpenHistory}
                  className="hover:text-blue-600 transition-colors cursor-pointer font-medium"
                >
                  History
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

