import React, { useState } from 'react';
import { 
  Minimize2, 
  Image as ImageIcon, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight,
  Plus,
  Sliders,
  FileCheck
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes } from '../../services/pdfService';
import { batchCompressImages } from '../../services/imageService';
import { usePremium } from '../../context/PremiumContext';

interface CompressImageWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

type CompressionPreset = 'extreme' | 'recommended' | 'crisp';

export const CompressImageWorkspace: React.FC<CompressImageWorkspaceProps> = ({ tool, onSuccess }) => {
  const { isPremium, openUpgradeModal } = usePremium();
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [preset, setPreset] = useState<CompressionPreset>('recommended');
  const [outputFormat, setOutputFormat] = useState<'original' | 'image/jpeg' | 'image/webp'>('original');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const getQuality = () => {
    if (preset === 'extreme') return 0.55;
    if (preset === 'recommended') return 0.78;
    return 0.90;
  };

  const handleCompress = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress(10);
    setError(null);

    try {
      const rawFiles = files.map((f) => f.file);
      const quality = getQuality();

      const { items, zipBlob } = await batchCompressImages(
        rawFiles,
        {
          quality,
          outputType: outputFormat,
        },
        (p) => setProgress(p)
      );

      const totalOrig = items.reduce((a, b) => a + b.originalSize, 0);
      const totalNew = items.reduce((a, b) => a + b.newSize, 0);
      const savedPct = Math.max(0, Math.round(((totalOrig - totalNew) / totalOrig) * 100));

      if (items.length === 1) {
        const item = items[0];
        const downloadUrl = URL.createObjectURL(item.blob);
        onSuccess({
          title: `Image compressed! Saved ${savedPct}% (${formatBytes(totalOrig)} → ${formatBytes(totalNew)})`,
          success: true,
          downloadUrl,
          downloadFilename: item.name,
          fileSize: totalNew,
          originalSize: totalOrig,
          blob: item.blob,
        });
      } else {
        const zipUrl = zipBlob ? URL.createObjectURL(zipBlob) : undefined;
        onSuccess({
          title: `${items.length} images compressed! Total savings: ${savedPct}% (${formatBytes(totalOrig)} → ${formatBytes(totalNew)})`,
          success: true,
          downloadUrl: zipUrl,
          downloadFilename: 'compressed_images.zip',
          zipBlob,
          fileSize: totalNew,
          originalSize: totalOrig,
          multipleFiles: items.map((it) => ({
            name: it.name,
            blob: it.blob,
            url: it.dataUrl,
            size: it.newSize,
          })),
        });
      }
    } catch (err: any) {
      console.error('Image compression error:', err);
      setError(err?.message || 'Failed to compress images.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {files.length === 0 ? (
        <DropZone
          tool={tool}
          files={files}
          onFilesChange={setFiles}
          title="Drop image files to compress"
          subtitle="Supports JPG, PNG, WEBP, and GIF images. 100% processed in browser."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left / Center: Uploaded images preview list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">
                    {files.length} {files.length === 1 ? 'Image' : 'Images'} Selected
                  </span>
                  <span className="text-xs text-gray-500">
                    ({formatBytes(files.reduce((a, b) => a + b.size, 0))})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add More</span>
                    <input
                      type="file"
                      multiple={tool.multiple}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          const added: UploadedFileItem[] = Array.from(e.target.files as FileList).map((f: File) => ({
                            id: Math.random().toString(36).substring(2, 9),
                            file: f,
                            name: f.name,
                            size: f.size,
                            type: f.type,
                            previewUrl: URL.createObjectURL(f),
                          }));
                          setFiles((prev) => [...prev, ...added]);
                        }
                      }}
                    />
                  </label>
                  <button
                    onClick={() => setFiles([])}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Clear all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Image thumbnail list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto pr-1">
                {files.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200/80 rounded-2xl relative group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-gray-200 overflow-hidden flex items-center justify-center shrink-0 border border-gray-300">
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="font-semibold text-xs text-gray-800 truncate">{item.name}</div>
                      <div className="text-[11px] text-gray-500">{formatBytes(item.size)}</div>
                    </div>
                    <button
                      onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute right-2 top-2 p-1 text-gray-300 hover:text-red-600 rounded-md hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Compression Settings */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-sm font-google">Compression Settings</h3>
              </div>

              {/* Compression presets */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Quality Preset
                </label>

                <div
                  onClick={() => setPreset('extreme')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    preset === 'extreme'
                      ? 'border-emerald-600 bg-emerald-50/60'
                      : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-900">Extreme Compression</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ~70% Savings
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">Maximum file reduction with balanced web quality.</p>
                </div>

                <div
                  onClick={() => setPreset('recommended')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    preset === 'recommended'
                      ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-900">Recommended</span>
                      <Sparkles className="w-3 h-3 text-amber-500" />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ~50% Savings
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">Optimal balance between crisp clarity and file size.</p>
                </div>

                <div
                  onClick={() => setPreset('crisp')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    preset === 'crisp'
                      ? 'border-emerald-600 bg-emerald-50/60'
                      : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-900">Crisp / High Quality</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ~25% Savings
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">Very light compression preserving maximum micro-detail.</p>
                </div>
              </div>

              {/* Output format picker */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Output Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['original', 'image/jpeg', 'image/webp'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setOutputFormat(fmt)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center ${
                        outputFormat === fmt
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {fmt === 'original' ? 'Auto / Same' : fmt === 'image/jpeg' ? 'JPG' : 'WEBP'}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
                  {error}
                </div>
              )}

              {/* Action Button */}
              <button
                id="execute-compress-image-btn"
                onClick={handleCompress}
                disabled={isProcessing || files.length === 0}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold rounded-full text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compressing ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-4 h-4" />
                    <span>Compress {files.length} {files.length === 1 ? 'Image' : 'Images'}</span>
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
