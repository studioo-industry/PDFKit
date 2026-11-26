import React, { useState, useEffect } from 'react';
import { 
  RotateCw, 
  RotateCcw, 
  Sparkles, 
  FileText, 
  Loader2, 
  Trash2, 
  Check 
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult, PageThumbnail } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes, rotatePdf, getPdfThumbnails } from '../../services/pdfService';
import { usePremium } from '../../context/PremiumContext';

interface RotateWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

export const RotateWorkspace: React.FC<RotateWorkspaceProps> = ({ tool, onSuccess }) => {
  const { isPremium, openUpgradeModal } = usePremium();
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});
  const [globalRotation, setGlobalRotation] = useState(0);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileItem = files[0];

  useEffect(() => {
    if (fileItem) {
      setIsLoadingThumbnails(true);
      getPdfThumbnails(fileItem.file, 40)
        .then((res) => {
          setThumbnails(res.thumbnails);
          setPageRotations({});
          setGlobalRotation(0);
          setIsLoadingThumbnails(false);
        })
        .catch((err) => {
          console.error(err);
          setIsLoadingThumbnails(false);
        });
    } else {
      setThumbnails([]);
      setPageRotations({});
    }
  }, [fileItem]);

  const rotateSinglePage = (pageNum: number, direction: 'cw' | 'ccw') => {
    const current = pageRotations[pageNum] !== undefined ? pageRotations[pageNum] : globalRotation;
    const delta = direction === 'cw' ? 90 : -90;
    const next = (current + delta + 360) % 360;
    setPageRotations((prev) => ({ ...prev, [pageNum]: next }));
  };

  const rotateAll = (direction: 'cw' | 'ccw') => {
    const delta = direction === 'cw' ? 90 : -90;
    const nextGlobal = (globalRotation + delta + 360) % 360;
    setGlobalRotation(nextGlobal);

    const updated: Record<number, number> = {};
    thumbnails.forEach((t) => {
      const current = pageRotations[t.pageNumber] !== undefined ? pageRotations[t.pageNumber] : globalRotation;
      updated[t.pageNumber] = (current + delta + 360) % 360;
    });
    setPageRotations(updated);
  };

  const resetAllRotations = () => {
    setGlobalRotation(0);
    setPageRotations({});
  };

  const handleSave = async () => {
    if (!fileItem) return;

    setError(null);
    setIsProcessing(true);
    setProgress(15);

    try {
      const pdfBytes = await rotatePdf(
        fileItem.file,
        pageRotations,
        globalRotation,
        (p) => setProgress(p)
      );

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const downloadFilename = fileItem.name.replace(/\.pdf$/i, '_rotated.pdf');

      onSuccess({
        title: `PDF rotated successfully!`,
        success: true,
        downloadUrl,
        downloadFilename,
        fileSize: blob.size,
        blob,
      });
    } catch (err: any) {
      console.error('Rotate error:', err);
      setError(err?.message || 'Failed to rotate PDF.');
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
          title="Drop PDF file to rotate"
          subtitle="Rotate specific pages or the entire document by 90°, 180°, or 270°."
        />
      ) : (
        <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">{fileItem.name}</h3>
                <p className="text-xs text-gray-500">
                  {formatBytes(fileItem.size)} • {thumbnails.length} pages
                </p>
              </div>
            </div>

            {/* Global Rotation Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => rotateAll('ccw')}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rotate All Left</span>
              </button>
              <button
                onClick={() => rotateAll('cw')}
                className="px-3.5 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate All Right</span>
              </button>
              <button
                onClick={resetAllRotations}
                className="p-2 text-xs text-gray-400 hover:text-gray-700 rounded-lg"
                title="Reset rotations"
              >
                Reset
              </button>
              <button
                onClick={() => setFiles([])}
                className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                title="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Page Grid */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span>Click individual rotate icons on any page:</span>
              <span className="text-[11px] text-gray-400">Preview dynamically rotates</span>
            </div>

            {isLoadingThumbnails ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-600 mb-2" />
                <span>Generating page previews...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-96 overflow-y-auto p-1">
                {thumbnails.map((thumb) => {
                  const currentRot =
                    pageRotations[thumb.pageNumber] !== undefined
                      ? pageRotations[thumb.pageNumber]
                      : globalRotation;

                  return (
                    <div
                      key={thumb.pageNumber}
                      className="group relative bg-gray-50 border border-gray-200 hover:border-cyan-400 rounded-2xl p-2.5 transition-all flex flex-col justify-between"
                    >
                      <div className="relative w-full h-32 flex items-center justify-center overflow-hidden rounded-xl bg-white shadow-2xs mb-2">
                        <img
                          src={thumb.thumbnail}
                          alt={`Page ${thumb.pageNumber}`}
                          className="max-h-full max-w-full object-contain transition-transform duration-300"
                          style={{ transform: `rotate(${currentRot}deg)` }}
                        />
                        {currentRot !== 0 && (
                          <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-cyan-600 text-white text-[10px] font-bold rounded-md">
                            {currentRot}°
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-700 px-1">
                        <span className="font-semibold">Page {thumb.pageNumber}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => rotateSinglePage(thumb.pageNumber, 'ccw')}
                            className="p-1 hover:bg-gray-200 text-gray-500 rounded"
                            title="Rotate 90° CCW"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => rotateSinglePage(thumb.pageNumber, 'cw')}
                            className="p-1 hover:bg-cyan-100 text-cyan-700 rounded"
                            title="Rotate 90° CW"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800">
              {error}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
            <button
              id="execute-rotate-btn"
              onClick={handleSave}
              disabled={isProcessing}
              className="px-8 py-3.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-300 text-white font-bold rounded-full text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Applying Rotations ({progress}%)...</span>
                </>
              ) : (
                <>
                  <RotateCw className="w-4 h-4" />
                  <span>Save Rotated PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
