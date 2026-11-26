import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  CheckSquare, 
  Square, 
  Layers, 
  FileText, 
  Loader2, 
  Trash2, 
  Archive,
  Sparkles
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult, PageThumbnail } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes, splitPdf, getPdfThumbnails, createZipDownload, downloadBlob } from '../../services/pdfService';
import { usePremium } from '../../context/PremiumContext';

interface SplitWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

export const SplitWorkspace: React.FC<SplitWorkspaceProps> = ({ tool, onSuccess }) => {
  const { isPremium, openUpgradeModal } = usePremium();
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [splitMode, setSplitMode] = useState<'all' | 'custom' | 'extract-selected'>('extract-selected');
  const [customRange, setCustomRange] = useState('1-2');
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileItem = files[0];

  useEffect(() => {
    if (fileItem) {
      setIsLoadingThumbnails(true);
      getPdfThumbnails(fileItem.file, 30)
        .then((res) => {
          setPageCount(res.pageCount);
          setThumbnails(res.thumbnails.map((t, idx) => ({ ...t, selected: idx === 0 })));
          setIsLoadingThumbnails(false);
        })
        .catch((err) => {
          console.error(err);
          setIsLoadingThumbnails(false);
        });
    } else {
      setThumbnails([]);
      setPageCount(0);
    }
  }, [fileItem]);

  const togglePageSelection = (pageNum: number) => {
    setThumbnails((prev) =>
      prev.map((t) => (t.pageNumber === pageNum ? { ...t, selected: !t.selected } : t))
    );
  };

  const selectAll = () => {
    setThumbnails((prev) => prev.map((t) => ({ ...t, selected: true })));
  };

  const deselectAll = () => {
    setThumbnails((prev) => prev.map((t) => ({ ...t, selected: false })));
  };

  const handleSplit = async () => {
    if (!fileItem) return;

    setError(null);
    setIsProcessing(true);
    setProgress(10);

    try {
      const selectedPages = thumbnails.filter((t) => t.selected).map((t) => t.pageNumber);
      
      const splitResults = await splitPdf(
        fileItem.file,
        splitMode,
        customRange,
        selectedPages,
        (p) => setProgress(p)
      );

      if (splitResults.length === 0) {
        throw new Error('No pages were extracted. Please check your range.');
      }

      if (splitResults.length === 1) {
        // Single PDF output
        const blob = new Blob([splitResults[0].data], { type: 'application/pdf' });
        const downloadUrl = URL.createObjectURL(blob);
        onSuccess({
          title: `PDF split successfully!`,
          success: true,
          downloadUrl,
          downloadFilename: splitResults[0].name,
          fileSize: blob.size,
          blob,
        });
      } else {
        // Multiple PDFs output -> create ZIP
        const zipBlob = await createZipDownload(splitResults);
        const downloadUrl = URL.createObjectURL(zipBlob);
        
        onSuccess({
          title: `Successfully extracted ${splitResults.length} PDF files!`,
          success: true,
          downloadUrl,
          downloadFilename: `PDFKit_split_${Date.now()}.zip`,
          zipBlob,
          fileSize: zipBlob.size,
          multipleFiles: splitResults.map((r) => ({
            name: r.name,
            blob: new Blob([r.data], { type: 'application/pdf' }),
            url: URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' })),
            size: r.data.length,
          })),
        });
      }
    } catch (err: any) {
      console.error('Split error:', err);
      setError(err?.message || 'Failed to split PDF. Please check your selection or page range.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {!fileItem ? (
        <DropZone
          tool={tool}
          files={files}
          onFilesChange={setFiles}
          title="Drop PDF file to split"
          subtitle="Extract single pages, ranges, or separate all pages."
        />
      ) : (
        <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">{fileItem.name}</h3>
                <p className="text-xs text-gray-500">
                  {formatBytes(fileItem.size)} • {pageCount || '...'} pages
                </p>
              </div>
            </div>

            <button
              onClick={() => setFiles([])}
              className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              title="Remove file"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Selection Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setSplitMode('extract-selected')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                splitMode === 'extract-selected'
                  ? 'border-red-500 bg-red-50/50 text-red-950 ring-1 ring-red-500'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="font-bold text-sm mb-1">Select Pages Visually</div>
              <div className="text-xs text-gray-500">Click thumbnails to extract selected pages</div>
            </button>

            <button
              onClick={() => setSplitMode('custom')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                splitMode === 'custom'
                  ? 'border-red-500 bg-red-50/50 text-red-950 ring-1 ring-red-500'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="font-bold text-sm mb-1">Custom Page Ranges</div>
              <div className="text-xs text-gray-500">e.g. 1-3, 5, 8-10</div>
            </button>

            <button
              onClick={() => setSplitMode('all')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                splitMode === 'all'
                  ? 'border-red-500 bg-red-50/50 text-red-950 ring-1 ring-red-500'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="font-bold text-sm mb-1">Extract Every Page</div>
              <div className="text-xs text-gray-500">Save each page as a separate PDF in a ZIP</div>
            </button>
          </div>

          {/* Custom Range Input */}
          {splitMode === 'custom' && (
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
              <label className="block text-xs font-semibold text-gray-700">
                Enter page ranges (separated by commas):
              </label>
              <input
                type="text"
                value={customRange}
                onChange={(e) => setCustomRange(e.target.value)}
                placeholder="e.g. 1-3, 5, 7-9"
                className="w-full px-4 py-2.5 bg-white border border-gray-300 focus:border-red-500 rounded-xl text-sm outline-none"
              />
              <p className="text-[11px] text-gray-500">
                Total available pages in this document: {pageCount}
              </p>
            </div>
          )}

          {/* Visual page thumbnails grid */}
          {splitMode === 'extract-selected' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700">
                  Select pages to extract ({thumbnails.filter((t) => t.selected).length} of{' '}
                  {thumbnails.length} selected):
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAll}
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    Select all
                  </button>
                  <span>•</span>
                  <button
                    onClick={deselectAll}
                    className="text-gray-500 hover:underline font-semibold"
                  >
                    Deselect all
                  </button>
                </div>
              </div>

              {isLoadingThumbnails ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-red-500 mb-2" />
                  <span>Loading PDF page previews...</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-80 overflow-y-auto p-1">
                  {thumbnails.map((thumb) => (
                    <div
                      key={thumb.pageNumber}
                      onClick={() => togglePageSelection(thumb.pageNumber)}
                      className={`group relative rounded-xl border p-1.5 cursor-pointer transition-all ${
                        thumb.selected
                          ? 'border-red-500 bg-red-50/60 ring-2 ring-red-400'
                          : 'border-gray-200 bg-white hover:border-gray-300 opacity-60'
                      }`}
                    >
                      <img
                        src={thumb.thumbnail}
                        alt={`Page ${thumb.pageNumber}`}
                        className="w-full h-24 object-contain rounded bg-white shadow-2xs mb-1"
                      />
                      <div className="flex items-center justify-between text-[11px] px-1 font-medium text-gray-700">
                        <span>P. {thumb.pageNumber}</span>
                        {thumb.selected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-red-600" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800">
              {error}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
            <button
              id="execute-split-btn"
              onClick={handleSplit}
              disabled={isProcessing}
              className="px-8 py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-bold rounded-full text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Splitting PDF ({progress}%)...</span>
                </>
              ) : (
                <>
                  <Scissors className="w-4 h-4" />
                  <span>Split PDF Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
