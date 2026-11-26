import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Zap, 
  Lock, 
  Layers, 
  Sparkles, 
  Search, 
  CheckCircle2, 
  FileCheck2,
  FileText,
  Image as ImageIcon,
  Clock
} from 'lucide-react';
import { ToolCategory, ToolId, SuiteSection, InfoModalType } from '../types';
import { TOOLS } from '../data/tools';
import { ToolCard } from './ToolCard';
import { RecentFilesSection } from './RecentFilesSection';
import { AdBanner } from './AdBanner';
import { PartnersSection } from './PartnersSection';
import { usePremium } from '../context/PremiumContext';
import { getRecentFiles } from '../services/recentFilesService';

interface ToolGridProps {
  onSelectTool: (id: ToolId) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentSection?: SuiteSection;
  onSectionChange?: (sec: SuiteSection) => void;
  onOpenModal?: (type: InfoModalType) => void;
}

export const ToolGrid: React.FC<ToolGridProps> = ({
  onSelectTool,
  searchQuery,
  onSearchChange,
  currentSection = 'all',
  onSectionChange,
  onOpenModal,
}) => {
  const { isPremium, openUpgradeModal } = usePremium();
  const [section, setSection] = useState<SuiteSection>(currentSection);
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('all');
  const [historyCount, setHistoryCount] = useState<number>(0);

  const updateHistoryCount = () => {
    setHistoryCount(getRecentFiles().length);
  };

  useEffect(() => {
    setSection(currentSection);
  }, [currentSection]);

  useEffect(() => {
    updateHistoryCount();
    window.addEventListener('history-updated', updateHistoryCount);
    window.addEventListener('recent-files-updated', updateHistoryCount);
    window.addEventListener('storage', updateHistoryCount);

    return () => {
      window.removeEventListener('history-updated', updateHistoryCount);
      window.removeEventListener('recent-files-updated', updateHistoryCount);
      window.removeEventListener('storage', updateHistoryCount);
    };
  }, []);

  const handleSectionSwitch = (sec: SuiteSection) => {
    setSection(sec);
    setActiveCategory('all');
    if (onSectionChange) onSectionChange(sec);
  };

  const pdfCount = TOOLS.filter((t) => t.toolType === 'pdf').length;
  const imageCount = TOOLS.filter((t) => t.toolType === 'image').length;
  const govtCount = TOOLS.filter((t) => t.toolType === 'govt').length;

  const filteredTools = TOOLS.filter((tool) => {
    const matchesSection = section === 'all' || tool.toolType === section;
    const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.shortDesc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSection && matchesCategory && matchesSearch;
  });

  const getCategoriesForSection = () => {
    if (section === 'govt') {
      return [
        { id: 'all' as ToolCategory, label: 'All Govt Tools' },
        { id: 'govt' as ToolCategory, label: 'ID Photos' },
        { id: 'edit' as ToolCategory, label: 'Background & Retouch' },
        { id: 'effects' as ToolCategory, label: 'Enhance' },
      ];
    }
    if (section === 'pdf') {
      return [
        { id: 'all' as ToolCategory, label: 'All PDF Tools' },
        { id: 'organize' as ToolCategory, label: 'Organize' },
        { id: 'convert' as ToolCategory, label: 'Convert' },
        { id: 'optimize' as ToolCategory, label: 'Optimize' },
        { id: 'security' as ToolCategory, label: 'Security' },
      ];
    }
    if (section === 'image') {
      return [
        { id: 'all' as ToolCategory, label: 'All Image Tools' },
        { id: 'optimize' as ToolCategory, label: 'Compress' },
        { id: 'edit' as ToolCategory, label: 'Resize & Crop' },
        { id: 'convert' as ToolCategory, label: 'Convert' },
        { id: 'effects' as ToolCategory, label: 'Filters & Effects' },
        { id: 'security' as ToolCategory, label: 'Watermark' },
        { id: 'collage' as ToolCategory, label: 'Collage & Merge' },
      ];
    }
    return [
      { id: 'all' as ToolCategory, label: 'All Tools' },
      { id: 'govt' as ToolCategory, label: 'Govt Documents' },
      { id: 'organize' as ToolCategory, label: 'Organize' },
      { id: 'convert' as ToolCategory, label: 'Convert' },
      { id: 'optimize' as ToolCategory, label: 'Compress & Optimize' },
      { id: 'edit' as ToolCategory, label: 'Edit & Crop' },
      { id: 'effects' as ToolCategory, label: 'Filters & Enhancer' },
      { id: 'security' as ToolCategory, label: 'Security & Stamps' },
    ];
  };

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Hero Header */}
      <section className="text-center pt-4 sm:pt-6 max-w-3xl mx-auto space-y-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-200/60 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>100% Client-Side PDF, Image & Govt Suite</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-gray-900 font-google leading-tight">
          {section === 'govt' ? (
            <>Official <span className="text-emerald-600">Govt Document</span> & ID Suite</>
          ) : section === 'pdf' ? (
            <>Complete Suite for <span className="text-blue-600">PDF Documents</span></>
          ) : section === 'image' ? (
            <>Powerful In-Browser <span className="text-purple-600">Image Studio</span></>
          ) : (
            <>Every tool you need for <span className="text-blue-600">PDFs</span>, <span className="text-purple-600">Images</span> & <span className="text-emerald-600">Govt Documents</span></>
          )}
        </h1>

        <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
          {section === 'govt'
            ? 'Compliant Passport photos, Voter ID photos, Driving Licence photos, AI Background Removal, and HD Photo Enhancer for official portal uploads.'
            : section === 'pdf'
            ? 'Merge, split, compress, convert, rotate, and password-protect your PDFs locally in your browser with zero latency.'
            : section === 'image'
            ? 'Compress, resize, crop, convert, watermark, rotate, enhance with filters, and merge photos with instant browser rendering.'
            : 'Fast, secure, zero-upload PDF, Image, and Govt Document engine. All processing runs directly in your browser memory.'}
        </p>

        {/* Section Switcher Tabs: All vs Govt vs PDF vs Image vs History */}
        <div className="flex items-center justify-center pt-2">
          <div className="inline-flex flex-wrap items-center justify-center gap-1 p-1.5 bg-gray-100/90 rounded-full border border-gray-200/80 shadow-xs">
            <button
              id="tab-all-tools"
              type="button"
              onClick={() => handleSectionSwitch('all')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                section === 'all'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layers className="w-4 h-4 text-gray-500" />
              <span>All Tools</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-700">
                {TOOLS.length}
              </span>
            </button>

            <button
              id="tab-govt-tools"
              type="button"
              onClick={() => handleSectionSwitch('govt')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                section === 'govt'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-emerald-600'
              }`}
            >
              <FileCheck2 className="w-4 h-4 text-emerald-500" />
              <span>Govt Documents</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                section === 'govt' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {govtCount}
              </span>
            </button>

            <button
              id="tab-pdf-tools"
              type="button"
              onClick={() => handleSectionSwitch('pdf')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                section === 'pdf'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>PDF Tools</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                section === 'pdf' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800'
              }`}>
                {pdfCount}
              </span>
            </button>

            <button
              id="tab-image-tools"
              type="button"
              onClick={() => handleSectionSwitch('image')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                section === 'image'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Image Tools</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                section === 'image' ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-800'
              }`}>
                {imageCount}
              </span>
            </button>

            <button
              id="tab-history-section"
              type="button"
              onClick={() => handleSectionSwitch('history')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                section === 'history'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <Clock className="w-4 h-4 text-blue-500" />
              <span>History</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                section === 'history' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700 font-semibold'
              }`}>
                {historyCount}
              </span>
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
          {getCategoriesForSection().map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80 hover:text-gray-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Ad Banner for Free Users */}
      <AdBanner variant="horizontal" />

      {/* Recent Files Section (Local Storage history of last 5 processed files) */}
      <RecentFilesSection 
        onSelectTool={onSelectTool} 
        onOpenHistory={() => handleSectionSwitch('history')}
      />

      {/* Grid of Tools */}
      <section>
        {filteredTools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} onSelect={onSelectTool} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-200/80 p-8 max-w-md mx-auto">
            <Search className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-900 mb-1">No tools found</h3>
            <p className="text-xs text-gray-500 mb-4">No tools match your active search "{searchQuery}".</p>
            <button
              onClick={() => {
                onSearchChange('');
                setActiveCategory('all');
                setSection('all');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-full text-xs font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>

      {/* Trust & Features Section */}
      <section className="bg-white rounded-3xl border border-gray-200/90 p-8 sm:p-12 shadow-xs">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold font-google text-gray-900 mb-3">
            Why use PDFKit Studio?
          </h2>
          <p className="text-sm text-gray-600">
            Engineered with modern WebAssembly, PDF-Lib, and HTML5 Canvas to deliver desktop-grade file processing directly inside your browser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-start text-left space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-gray-900 font-google">100% Private & Local</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Your files never leave your computer. All processing happens strictly in browser memory for complete privacy and zero data leakage.
            </p>
          </div>

          <div className="flex flex-col items-start text-left space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-gray-900 font-google">Instant Processing Speed</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Zero network upload delays. Compress, resize, crop, merge, and convert multi-megabyte PDFs and images instantly.
            </p>
          </div>

          <div className="flex flex-col items-start text-left space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-gray-900 font-google">Universal File Support</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Seamlessly handle PDFs, JPG, PNG, WEBP, GIF, and multi-page documents on any device without software installation.
            </p>
          </div>
        </div>
      </section>

      {/* Strategic Partners & 1M+ Users Section */}
      <PartnersSection
        onOpenContact={onOpenModal ? () => onOpenModal('contact') : undefined}
        onOpenAbout={onOpenModal ? () => onOpenModal('about') : undefined}
      />
    </div>
  );
};

