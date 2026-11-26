import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  Scissors, 
  Minimize2, 
  Image as ImageIcon, 
  FileImage, 
  RotateCw, 
  Lock,
  ChevronRight,
  Home
} from 'lucide-react';
import { ToolId, ProcessResult, SuiteSection, InfoModalType, SharedDocumentInfo } from './types';
import { TOOLS } from './data/tools';
import { addRecentFile } from './services/recentFilesService';
import { PremiumProvider, usePremium } from './context/PremiumContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { LockedFeatureGate } from './components/auth/LockedFeatureGate';
import { Header } from './components/Header';
import { ToolGrid } from './components/ToolGrid';
import { HistorySection } from './components/HistorySection';
import { AdBanner } from './components/AdBanner';
import { ProcessResultModal } from './components/ProcessResultModal';
import { SharedDocumentViewer } from './components/SharedDocumentViewer';
import { Footer } from './components/Footer';

// Legal & Info Modals
import { PrivacyPolicyModal } from './components/modals/PrivacyPolicyModal';
import { TermsModal } from './components/modals/TermsModal';
import { DisclaimerModal } from './components/modals/DisclaimerModal';
import { AboutUsModal } from './components/modals/AboutUsModal';
import { ContactUsModal } from './components/modals/ContactUsModal';

// PDF Tool Workspaces
import { MergeWorkspace } from './components/tools/MergeWorkspace';
import { SplitWorkspace } from './components/tools/SplitWorkspace';
import { CompressWorkspace } from './components/tools/CompressWorkspace';
import { PdfToJpgWorkspace } from './components/tools/PdfToJpgWorkspace';
import { JpgToPdfWorkspace } from './components/tools/JpgToPdfWorkspace';
import { ResizePdfWorkspace } from './components/tools/ResizePdfWorkspace';
import { RotateWorkspace } from './components/tools/RotateWorkspace';
import { ProtectWorkspace } from './components/tools/ProtectWorkspace';
import { PdfToWordWorkspace } from './components/tools/PdfToWordWorkspace';
import { WordToPdfWorkspace } from './components/tools/WordToPdfWorkspace';

// Image Tool Workspaces
import { CompressImageWorkspace } from './components/image-tools/CompressImageWorkspace';
import { ResizeImageWorkspace } from './components/image-tools/ResizeImageWorkspace';
import { CropImageWorkspace } from './components/image-tools/CropImageWorkspace';
import { ConvertImageWorkspace } from './components/image-tools/ConvertImageWorkspace';
import { WatermarkImageWorkspace } from './components/image-tools/WatermarkImageWorkspace';
import { RotateImageWorkspace } from './components/image-tools/RotateImageWorkspace';
import { FilterImageWorkspace } from './components/image-tools/FilterImageWorkspace';
import { MergeImagesWorkspace } from './components/image-tools/MergeImagesWorkspace';
import { AddNameDateWorkspace } from './components/image-tools/AddNameDateWorkspace';

// Govt Document Workspaces
import { PassportPhotoWorkspace } from './components/govt-tools/PassportPhotoWorkspace';
import { VoterIdPhotoWorkspace } from './components/govt-tools/VoterIdPhotoWorkspace';
import { DrivingLicenceWorkspace } from './components/govt-tools/DrivingLicenceWorkspace';
import { BgRemoveWorkspace } from './components/govt-tools/BgRemoveWorkspace';
import { PhotoEnhancerWorkspace } from './components/govt-tools/PhotoEnhancerWorkspace';

const MainContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeToolId, setActiveToolId] = useState<ToolId | null>(null);
  const [currentSection, setCurrentSection] = useState<SuiteSection>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentResult, setCurrentResult] = useState<ProcessResult | null>(null);
  const [activeInfoModal, setActiveInfoModal] = useState<InfoModalType>(null);

  // Shared Document viewing & editing state
  const [sharedDocId, setSharedDocId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const shareParam = params.get('share');
      if (shareParam) return shareParam;
      const pathMatch = window.location.pathname.match(/\/share\/([a-zA-Z0-9_-]+)/);
      if (pathMatch) return pathMatch[1];
    }
    return null;
  });

  const [editingToolState, setEditingToolState] = useState<{
    toolId: ToolId;
    state: any;
    shareId?: string;
  } | null>(null);

  // Handle URL history sync for share links
  const handleOpenSharedViewer = (id: string) => {
    setSharedDocId(id);
    setActiveToolId(null);
    setCurrentResult(null);
    window.history.pushState({}, '', `/?share=${id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromViewer = () => {
    setSharedDocId(null);
    window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditDocument = (docOrState: any, shareId?: string) => {
    // If it's a SharedDocumentInfo from viewer
    if (docOrState && docOrState.id && docOrState.toolState) {
      const targetTool = (docOrState.toolId || 'jpg-to-pdf') as ToolId;
      setEditingToolState({
        toolId: targetTool,
        state: {
          ...docOrState.toolState,
          shareId: docOrState.id,
          title: docOrState.title,
        },
        shareId: docOrState.id,
      });
      setSharedDocId(null);
      setCurrentResult(null);
      setActiveToolId(targetTool);
      window.history.pushState({}, '', '/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // If it's toolState passed from ProcessResultModal
    const targetTool = (docOrState?.toolId || activeToolId || 'jpg-to-pdf') as ToolId;
    setEditingToolState({
      toolId: targetTool,
      state: {
        ...docOrState,
        shareId,
      },
      shareId,
    });
    setSharedDocId(null);
    setCurrentResult(null);
    setActiveToolId(targetTool);
    window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeTool = TOOLS.find((t) => t.id === activeToolId);

  // Sync browser back/forward buttons with shared viewer
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const share = params.get('share');
      setSharedDocId(share || null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectTool = (id: ToolId | null) => {
    setActiveToolId(id);
    setCurrentResult(null);
    setSharedDocId(null);
    if (window.location.search.includes('share=')) {
      window.history.pushState({}, '', '/');
    }
    if (id !== editingToolState?.toolId) {
      setEditingToolState(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSuccess = (result: ProcessResult) => {
    const filename = result.downloadFilename || result.downloadName || 'processed_file';
    const normalizedResult: ProcessResult = {
      ...result,
      title: result.title || result.message || 'Your File is Ready!',
      success: result.success !== false,
      downloadFilename: filename,
    };
    setCurrentResult(normalizedResult);
    if (activeTool && normalizedResult.success) {
      addRecentFile({
        toolId: activeTool.id,
        toolName: activeTool.name,
        toolType: activeTool.toolType,
        filename,
        fileSize: normalizedResult.fileSize || 0,
        originalSize: normalizedResult.originalSize,
        downloadUrl: normalizedResult.downloadUrl,
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setCurrentResult(null);
  };

  const handleOpenInfoModal = (type: InfoModalType) => {
    setActiveInfoModal(type);
  };

  const handleCloseInfoModal = () => {
    setActiveInfoModal(null);
  };

  return (
    <div className={`min-h-screen flex flex-col ${sharedDocId ? 'bg-gray-950' : 'bg-[#F8FAFD]'}`}>
      {/* Header (Hidden when viewing a shared document so it opens in true dedicated full screen) */}
      {!sharedDocId && (
        <Header
          activeToolId={activeToolId}
          onSelectTool={handleSelectTool}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currentSection={currentSection}
          onSectionChange={setCurrentSection}
          onOpenModal={handleOpenInfoModal}
        />
      )}

      {/* Main Container */}
      <main className={`flex-1 w-full mx-auto transition-all ${
        sharedDocId 
          ? 'max-w-none p-0 flex flex-col h-screen overflow-hidden' 
          : 'max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10'
      }`}>
        {sharedDocId ? (
          <SharedDocumentViewer
            shareId={sharedDocId}
            onBackToHome={handleBackFromViewer}
            onEditDocument={handleEditDocument}
            onSelectTool={(tId) => {
              setSharedDocId(null);
              window.history.pushState({}, '', '/');
              handleSelectTool(tId);
            }}
          />
        ) : activeToolId && activeTool ? (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Breadcrumb navigation */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <button
                onClick={() => handleSelectTool(null)}
                className="flex items-center gap-1 hover:text-blue-600 font-medium transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <button
                onClick={() => {
                  setCurrentSection(activeTool.toolType);
                  handleSelectTool(null);
                }}
                className="hover:text-blue-600 font-medium transition-colors cursor-pointer capitalize"
              >
                {activeTool.toolType === 'govt' ? 'Govt Documents' : activeTool.toolType === 'pdf' ? 'PDF Tools' : 'Image Tools'}
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold text-gray-900">{activeTool.name}</span>
            </div>

            {/* Tool Header Title bar */}
            {!currentResult && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0"
                    style={{ backgroundColor: activeTool.bgLight, color: activeTool.color }}
                  >
                    <span className="font-bold text-lg">{activeTool.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-google tracking-tight">
                        {activeTool.name}
                      </h1>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        activeTool.toolType === 'govt'
                          ? 'bg-emerald-100 text-emerald-800'
                          : activeTool.toolType === 'pdf'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {activeTool.toolType === 'govt' ? 'GOVT DOC' : activeTool.toolType.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mt-0.5">
                      {activeTool.description}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectTool(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Choose Another Tool</span>
                </button>
              </div>
            )}

            {/* Tool Workspace or Success Result */}
            {currentResult ? (
              <ProcessResultModal
                result={currentResult}
                toolId={activeToolId}
                onReset={handleReset}
                onSwitchTool={(newId) => handleSelectTool(newId)}
                onOpenSharedViewer={handleOpenSharedViewer}
                onEditDocument={handleEditDocument}
              />
            ) : activeTool.isLockedForGuest && !isAuthenticated ? (
              <LockedFeatureGate
                featureName={activeTool.name}
                description={activeTool.description}
              />
            ) : (
              <div className="space-y-6">
                {/* PDF Tools */}
                {activeToolId === 'merge' && (
                  <MergeWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'split' && (
                  <SplitWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'compress' && (
                  <CompressWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'pdf-to-jpg' && (
                  <PdfToJpgWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'jpg-to-pdf' && (
                  <JpgToPdfWorkspace
                    tool={activeTool}
                    onSuccess={handleSuccess}
                    initialState={
                      editingToolState?.toolId === 'jpg-to-pdf'
                        ? editingToolState.state
                        : undefined
                    }
                  />
                )}
                {activeToolId === 'resize-pdf' && (
                  <ResizePdfWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'rotate' && (
                  <RotateWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'protect' && (
                  <ProtectWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'pdf-to-word' && (
                  <PdfToWordWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'word-to-pdf' && (
                  <WordToPdfWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}

                {/* Image Tools */}
                {activeToolId === 'compress-image' && (
                  <CompressImageWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'resize-image' && (
                  <ResizeImageWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'crop-image' && (
                  <CropImageWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'convert-image' && (
                  <ConvertImageWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'watermark-image' && (
                  <WatermarkImageWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'rotate-image' && (
                  <RotateImageWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'filter-image' && (
                  <FilterImageWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'merge-images' && (
                  <MergeImagesWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'add-name-date' && (
                  <AddNameDateWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}

                {/* Govt Document Tools */}
                {activeToolId === 'passport-photo' && (
                  <PassportPhotoWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'voter-id-photo' && (
                  <VoterIdPhotoWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'driving-licence-photo' && (
                  <DrivingLicenceWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'bg-remove' && (
                  <BgRemoveWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}
                {activeToolId === 'photo-enhancer' && (
                  <PhotoEnhancerWorkspace tool={activeTool} onSuccess={handleSuccess} />
                )}

                {/* In-tool ad banner for Free users */}
                <AdBanner variant="horizontal" />
              </div>
            )}
          </div>
        ) : currentSection === 'history' ? (
          <HistorySection
            onSelectTool={handleSelectTool}
            onBackToTools={() => setCurrentSection('all')}
          />
        ) : (
          <ToolGrid
            onSelectTool={handleSelectTool}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            currentSection={currentSection}
            onSectionChange={setCurrentSection}
            onOpenModal={handleOpenInfoModal}
          />
        )}
      </main>

      {/* Legal, About, and Contact Modals */}
      <PrivacyPolicyModal
        isOpen={activeInfoModal === 'privacy'}
        onClose={handleCloseInfoModal}
        onOpenContact={() => handleOpenInfoModal('contact')}
      />

      <TermsModal
        isOpen={activeInfoModal === 'terms'}
        onClose={handleCloseInfoModal}
        onOpenContact={() => handleOpenInfoModal('contact')}
      />

      <DisclaimerModal
        isOpen={activeInfoModal === 'disclaimer'}
        onClose={handleCloseInfoModal}
        onOpenContact={() => handleOpenInfoModal('contact')}
      />

      <AboutUsModal
        isOpen={activeInfoModal === 'about'}
        onClose={handleCloseInfoModal}
        onOpenContact={() => handleOpenInfoModal('contact')}
      />

      <ContactUsModal
        isOpen={activeInfoModal === 'contact'}
        onClose={handleCloseInfoModal}
      />

      {/* Auth Modal */}
      <AuthModal />

      {/* Footer (Hidden when viewing shared document to keep full-screen immersion) */}
      {!sharedDocId && (
        <Footer 
          onSelectTool={handleSelectTool} 
          onOpenModal={handleOpenInfoModal}
          onOpenHistory={() => {
            handleSelectTool(null);
            setCurrentSection('history');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <PremiumProvider>
        <MainContent />
      </PremiumProvider>
    </AuthProvider>
  );
}

