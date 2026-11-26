import React, { useState } from 'react';
import { 
  Minimize2, 
  Sparkles, 
  FileText, 
  Loader2, 
  Trash2, 
  Zap, 
  Check, 
  Layers 
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes, compressPdf } from '../../services/pdfService';
import { usePremium } from '../../context/PremiumContext';
import { PdfThumbnailPreview } from '../preview/PdfThumbnailPreview';

interface CompressWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

export const CompressWorkspace: React.FC<CompressWorkspaceProps> = ({ tool, onSuccess }) => {
  const { isPremium, openUpgradeModal } = usePremium();
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [qualityLevel, setQualityLevel] = useState<'extreme' | 'recommended' | 'low'>('recommended');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileItem = files[0];

  const handleCompress = async () => {
    if (!fileItem) return;

    setError(null);
    setIsProcessing(true);
    setProgress(15);

    try {
      const result = await compressPdf(
        fileItem.file,
        qualityLevel,
        (p) => setProgress(p)
      );

      const blob = new Blob([result.data], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const downloadFilename = fileItem.name.replace(/\.pdf$/i, '_compressed.pdf');

      onSuccess({
        title: `Your PDF was compressed by ${result.savingsPercent}%!`,
        success: true,
        downloadUrl,
        downloadFilename,
        fileSize: result.newSize,
        originalSize: result.originalSize,
        blob,
      });
    } catch (err: any) {
      console.error('Compression error:', err);
      setError(err?.message || 'Failed to compress PDF. Please try a different compression level.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {!fileItem ? (
        <DropZone
          tool={tool}
          files={files}
          onFilesChange={setFiles}
          title="Drop PDF file to compress"
          subtitle="Reduce PDF file size while maintaining clean readability."
        />
      ) : (
        <div className="space-y-6">
          {/* PDF Thumbnail Preview Generator using react-pdf */}
          <PdfThumbnailPreview
            file={fileItem.file}
            fileName={fileItem.name}
            fileSize={fileItem.size}
            title="PDF Document Preview"
            subtitle="Review contents before compressing"
            onRemove={() => setFiles([])}
          />

          <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{fileItem.name}</h3>
                  <p className="text-xs text-gray-500">
                    Original file size: <span className="font-semibold text-gray-700">{formatBytes(fileItem.size)}</span>
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

          {/* Compression Level Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Select Compression Level:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Extreme */}
              <div
                onClick={() => setQualityLevel('extreme')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  qualityLevel === 'extreme'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-gray-900">Extreme</span>
                  {qualityLevel === 'extreme' && <Check className="w-4 h-4 text-emerald-600" />}
                </div>
                <div className="text-xs text-emerald-700 font-semibold mb-1">Max compression</div>
                <div className="text-[11px] text-gray-500">Smallest file size, modest quality reduction (~75% savings)</div>
              </div>

              {/* Recommended */}
              <div
                onClick={() => setQualityLevel('recommended')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all relative ${
                  qualityLevel === 'recommended'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                  POPULAR
                </span>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-gray-900">Recommended</span>
                  {qualityLevel === 'recommended' && <Check className="w-4 h-4 text-emerald-600" />}
                </div>
                <div className="text-xs text-emerald-700 font-semibold mb-1">Optimal balance</div>
                <div className="text-[11px] text-gray-500">Good quality and high compression (~50% savings)</div>
              </div>

              {/* Low */}
              <div
                onClick={() => setQualityLevel('low')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  qualityLevel === 'low'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-gray-900">Light</span>
                  {qualityLevel === 'low' && <Check className="w-4 h-4 text-emerald-600" />}
                </div>
                <div className="text-xs text-emerald-700 font-semibold mb-1">High quality</div>
                <div className="text-[11px] text-gray-500">Highest visual fidelity, lower compression (~25% savings)</div>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800">
              {error}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-500 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Processed locally in browser memory</span>
            </div>

            <button
              id="execute-compress-btn"
              onClick={handleCompress}
              disabled={isProcessing}
              className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold rounded-full text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compressing ({progress}%)...</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span>Compress PDF Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
