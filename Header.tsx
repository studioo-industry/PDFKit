import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Sparkles, 
  Crown, 
  Search, 
  ShieldCheck, 
  Layers, 
  Menu, 
  X, 
  ChevronDown,
  Image as ImageIcon,
  Mail,
  Info,
  Building2,
  Star,
  Clock,
  FileCheck2,
  User,
  KeyRound,
  LogOut,
  LogIn,
  UserPlus
} from 'lucide-react';
import { usePremium } from '../context/PremiumContext';
import { useAuth } from '../context/AuthContext';
import { ToolId, SuiteSection, InfoModalType } from '../types';
import { TOOLS } from '../data/tools';
import { getRecentFiles } from '../services/recentFilesService';

interface HeaderProps {
  activeToolId: ToolId | null;
  onSelectTool: (id: ToolId | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentSection?: SuiteSection;
  onSectionChange?: (sec: SuiteSection) => void;
  onOpenModal?: (type: InfoModalType) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeToolId,
  onSelectTool,
  searchQuery,
  onSearchChange,
  currentSection = 'all',
  onSectionChange,
  onOpenModal,
}) => {
  const { isPremium, openUpgradeModal, downgradeToFree } = usePremium();
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [historyCount, setHistoryCount] = useState<number>(0);

  const updateHistoryCount = () => {
    setHistoryCount(getRecentFiles().length);
  };

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

  const pdfTools = TOOLS.filter((t) => t.toolType === 'pdf');
  const imageTools = TOOLS.filter((t) => t.toolType === 'image');
  const govtTools = TOOLS.filter((t) => t.toolType === 'govt');

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo - Google Style */}
        <div className="flex items-center gap-5">
          <button
            id="pdfkit-logo-btn"
            onClick={() => {
              onSelectTool(null);
              onSearchChange('');
              if (onSectionChange) onSectionChange('all');
            }}
            className="flex items-center gap-2.5 group text-left cursor-pointer focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-red-500 p-0.5 shadow-sm group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <div className="relative flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
                </div>
              </div>
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-gray-900 font-google">
                  PDF<span className="text-blue-600">Kit</span>
                </span>
              </div>
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">PDF & Image Suite</span>
            </div>
          </button>

          {/* Quick Tools Dropdown */}
          <div className="relative hidden md:block">
            <button
              id="tools-dropdown-toggle"
              onClick={() => setIsToolsDropdownOpen(!isToolsDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isToolsDropdownOpen || activeToolId
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Layers className="w-4 h-4 text-blue-600" />
              <span>All Tools</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isToolsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isToolsDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsToolsDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200/90 py-2 z-30 animate-in fade-in zoom-in-95 duration-150 max-h-[500px] overflow-y-auto">
                  
                  {/* PDF Section */}
                  <div className="px-3.5 py-1.5 text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>PDF Tools</span>
                  </div>
                  {pdfTools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => {
                        onSelectTool(tool.id);
                        setIsToolsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-1.5 text-left text-xs hover:bg-gray-50 transition-colors ${
                        activeToolId === tool.id ? 'bg-blue-50/70 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: tool.bgLight, color: tool.color }}
                      >
                        <span className="font-bold text-[10px]">{tool.name.charAt(0)}</span>
                      </div>
                      <div className="truncate flex-1">
                        <div className="truncate font-medium">{tool.name}</div>
                      </div>
                    </button>
                  ))}

                  {/* Govt Section */}
                  <div className="px-3.5 pt-3 pb-1.5 text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5 border-t border-gray-100 mt-2">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Govt Document Tools</span>
                  </div>
                  {govtTools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => {
                        onSelectTool(tool.id);
                        setIsToolsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-1.5 text-left text-xs hover:bg-gray-50 transition-colors ${
                        activeToolId === tool.id ? 'bg-emerald-50/70 text-emerald-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: tool.bgLight, color: tool.color }}
                      >
                        <span className="font-bold text-[10px]">{tool.name.charAt(0)}</span>
                      </div>
                      <div className="truncate flex-1">
                        <div className="truncate font-medium">{tool.name}</div>
                      </div>
                    </button>
                  ))}

                  {/* Image Section */}
                  <div className="px-3.5 pt-3 pb-1.5 text-[11px] font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1.5 border-t border-gray-100 mt-2">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Image Tools</span>
                  </div>
                  {imageTools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => {
                        onSelectTool(tool.id);
                        setIsToolsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-1.5 text-left text-xs hover:bg-gray-50 transition-colors ${
                        activeToolId === tool.id ? 'bg-purple-50/70 text-purple-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: tool.bgLight, color: tool.color }}
                      >
                        <span className="font-bold text-[10px]">{tool.name.charAt(0)}</span>
                      </div>
                      <div className="truncate flex-1">
                        <div className="truncate font-medium">{tool.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Global Search Bar - Google Style */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="header-tool-search"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search tools (merge, compress, crop, resize, convert...)"
              className="w-full pl-10 pr-4 py-2 bg-gray-100/80 hover:bg-gray-100 focus:bg-white border border-transparent focus:border-blue-500 rounded-full text-sm text-gray-800 placeholder-gray-500 transition-all outline-none shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-semibold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Right Action Items */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* History Nav Button */}
          <button
            id="nav-history-btn"
            onClick={() => {
              onSelectTool(null);
              if (onSectionChange) onSectionChange('history');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              currentSection === 'history' && !activeToolId
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            title="View Processing History"
          >
            <Clock className={`w-3.5 h-3.5 ${currentSection === 'history' && !activeToolId ? 'text-white' : 'text-blue-600'}`} />
            <span>History</span>
            {historyCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                currentSection === 'history' && !activeToolId ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-700'
              }`}>
                {historyCount}
              </span>
            )}
          </button>

          {/* Trusted 1M badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-bold border border-amber-200/60">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>1M+ Users</span>
          </div>

          {/* Privacy badge */}
          <button
            onClick={() => onOpenModal && onOpenModal('privacy')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200/60 transition-colors cursor-pointer"
            title="View 100% Client-Side Privacy Policy"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Client Privacy</span>
          </button>

          {/* Contact Support Link in Header */}
          <button
            onClick={() => onOpenModal && onOpenModal('contact')}
            className="hidden sm:flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-blue-600 px-2.5 py-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            title="Email: playzoneofficial99@gmail.com"
          >
            <Mail className="w-3.5 h-3.5 text-blue-600" />
            <span>Contact</span>
          </button>

          {/* User Auth Controls */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                id="user-profile-menu-btn"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition-all cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-xs font-semibold text-blue-900 max-w-[100px] truncate hidden md:inline">
                  {user.name || user.email.split('@')[0]}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-blue-600 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-40 space-y-2">
                    <div className="p-2 border-b border-gray-100">
                      <div className="text-xs font-bold text-gray-900 truncate">{user.name}</div>
                      <div className="text-[11px] text-gray-500 truncate">{user.email}</div>
                      <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/70">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>All Features Unlocked</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        openAuthModal('password');
                      }}
                      className="w-full text-left p-2 rounded-xl text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-blue-600" />
                      <span>Set Password (Any Device)</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left p-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                id="header-signin-btn"
                onClick={() => openAuthModal('login')}
                className="text-xs font-bold text-gray-700 hover:text-blue-600 px-3 py-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                id="header-signup-btn"
                onClick={() => openAuthModal('signup')}
                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-full shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up Free</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-3 max-h-[85vh] overflow-y-auto">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search PDF & Image tools..."
              className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-800 outline-none"
            />
          </div>

          {/* Mobile Auth Banner */}
          {isAuthenticated && user ? (
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">{user.name}</div>
                  <div className="text-[10px] text-gray-500">{user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openAuthModal('password');
                  }}
                  className="p-1.5 bg-white text-blue-600 rounded-lg border border-blue-200 text-xs font-bold"
                  title="Set Password"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="p-1.5 bg-white text-red-600 rounded-lg border border-red-200 text-xs font-bold"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openAuthModal('login');
                }}
                className="flex-1 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openAuthModal('signup');
                }}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-xs"
              >
                Sign Up Free
              </button>
            </div>
          )}

          {/* Mobile History Button */}
          <button
            onClick={() => {
              onSelectTool(null);
              if (onSectionChange) onSectionChange('history');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full p-2.5 rounded-xl border flex items-center justify-between font-semibold text-xs transition-colors ${
              currentSection === 'history' && !activeToolId
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>History Section</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
              {historyCount} {historyCount === 1 ? 'file' : 'files'}
            </span>
          </button>

          <div className="pt-2">
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">PDF Tools</div>
            <div className="grid grid-cols-2 gap-2">
              {pdfTools.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelectTool(t.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-2 rounded-xl border text-left text-xs font-medium flex items-center gap-2 ${
                    activeToolId === t.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px]"
                    style={{ backgroundColor: t.bgLight, color: t.color }}
                  >
                    {t.name.charAt(0)}
                  </div>
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Govt Document Tools</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {govtTools.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelectTool(t.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-2 rounded-xl border text-left text-xs font-medium flex items-center gap-2 ${
                    activeToolId === t.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px]"
                    style={{ backgroundColor: t.bgLight, color: t.color }}
                  >
                    {t.name.charAt(0)}
                  </div>
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <div className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">Image Tools</div>
            <div className="grid grid-cols-2 gap-2">
              {imageTools.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelectTool(t.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-2 rounded-xl border text-left text-xs font-medium flex items-center gap-2 ${
                    activeToolId === t.id ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px]"
                    style={{ backgroundColor: t.bgLight, color: t.color }}
                  >
                    {t.name.charAt(0)}
                  </div>
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Links for Legal, About, Contact */}
          <div className="pt-3 border-t border-gray-100 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Pages & Support</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenModal && onOpenModal('about');
                }}
                className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-left font-medium text-gray-700"
              >
                About Us
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenModal && onOpenModal('contact');
                }}
                className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-left font-semibold"
              >
                Contact Support
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenModal && onOpenModal('privacy');
                }}
                className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-left font-medium text-gray-700"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenModal && onOpenModal('terms');
                }}
                className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-left font-medium text-gray-700"
              >
                Terms & Conditions
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenModal && onOpenModal('disclaimer');
                }}
                className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-left font-medium text-gray-700 col-span-2"
              >
                Disclaimer Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

