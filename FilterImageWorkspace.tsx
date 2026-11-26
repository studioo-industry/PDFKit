import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw,
  Sun,
  Contrast,
  Palette
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes } from '../../services/pdfService';
import { applyImageFilters, ImageFilters } from '../../services/imageService';
import { usePremium } from '../../context/PremiumContext';

interface FilterImageWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

const DEFAULT_FILTERS: ImageFilters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  sepia: 0,
  invert: 0,
  blur: 0,
  hueRotate: 0,
};

export const FilterImageWorkspace: React.FC<FilterImageWorkspaceProps> = ({ tool, onSuccess }) => {
  const { isPremium } = usePremium();
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [filters, setFilters] = useState<ImageFilters>({ ...DEFAULT_FILTERS });
  const [activePreset, setActivePreset] = useState<string>('normal');
  const [format, setFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileItem = files[0];

  const applyPresetFilter = (presetName: string) => {
    setActivePreset(presetName);
    if (presetName === 'normal') {
      setFilters({ ...DEFAULT_FILTERS });
    } else if (presetName === 'bw') {
      setFilters({ ...DEFAULT_FILTERS, grayscale: 100, contrast: 115 });
    } else if (presetName === 'sepia') {
      setFilters({ ...DEFAULT_FILTERS, sepia: 85, contrast: 95, brightness: 105 });
    } else if (presetName === 'vibrant') {
      setFilters({ ...DEFAULT_FILTERS, saturation: 150, contrast: 120 });
    } else if (presetName === 'vintage') {
      setFilters({ ...DEFAULT_FILTERS, sepia: 40, contrast: 110, brightness: 90, saturation: 80 });
    } else if (presetName === 'warm') {
      setFilters({ ...DEFAULT_FILTERS, sepia: 30, saturation: 120, brightness: 105 });
    } else if (presetName === 'invert') {
      setFilters({ ...DEFAULT_FILTERS, invert: 100 });
    }
  };

  const cssFilterString = [
    `brightness(${filters.brightness}%)`,
    `contrast(${filters.contrast}%)`,
    `saturate(${filters.saturation}%)`,
    `grayscale(${filters.grayscale}%)`,
    `sepia(${filters.sepia}%)`,
    `invert(${filters.invert}%)`,
    `blur(${filters.blur}px)`,
    `hue-rotate(${filters.hueRotate}deg)`,
  ].join(' ');

  const handleApply = async () => {
    if (!fileItem) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res = await applyImageFilters(fileItem.file, filters, format);
      const downloadUrl = URL.createObjectURL(res.blob);

      onSuccess({
        title: `Filters and photo enhancements applied!`,
        success: true,
        downloadUrl,
        downloadFilename: res.filename,
        fileSize: res.blob.size,
        originalSize: fileItem.size,
        blob: res.blob,
      });
    } catch (err: any) {
      console.error('Filter error:', err);
      setError(err?.message || 'Failed to apply filters.');
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
          title="Drop image to enhance & filter"
          subtitle="Adjust brightness, contrast, saturation, black & white, vintage, and color balance."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Live Filter Preview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="font-bold text-gray-900 text-sm">{fileItem.name}</span>
                <button
                  onClick={() => {
                    setFiles([]);
                    setFilters({ ...DEFAULT_FILTERS });
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Filtered image live canvas/img */}
              <div className="bg-gray-950/5 rounded-2xl p-4 flex items-center justify-center min-h-[380px] overflow-hidden">
                {fileItem.previewUrl && (
                  <img
                    src={fileItem.previewUrl}
                    alt="Filtered photo"
                    style={{ filter: cssFilterString }}
                    className="max-h-80 object-contain rounded-xl shadow-sm border border-gray-200 transition-all duration-75"
                  />
                )}
              </div>

              {/* Preset buttons */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Quick Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'normal', label: 'Normal' },
                    { id: 'bw', label: 'B&W Film' },
                    { id: 'sepia', label: 'Sepia' },
                    { id: 'vibrant', label: 'Vibrant' },
                    { id: 'vintage', label: 'Vintage' },
                    { id: 'warm', label: 'Warm' },
                    { id: 'invert', label: 'Invert' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPresetFilter(p.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                        activePreset === p.id
                          ? 'border-red-600 bg-red-600 text-white shadow-xs'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Fine-tuning Sliders */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-red-600" />
                  <h3 className="font-bold text-gray-900 text-sm font-google">Adjustments</h3>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFilters({ ...DEFAULT_FILTERS });
                    setActivePreset('normal');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Sliders */}
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs text-gray-700 mb-1">
                    <span className="font-bold">Brightness</span>
                    <span>{filters.brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    value={filters.brightness}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, brightness: parseInt(e.target.value) }));
                      setActivePreset('custom');
                    }}
                    className="w-full accent-red-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-700 mb-1">
                    <span className="font-bold">Contrast</span>
                    <span>{filters.contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    value={filters.contrast}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, contrast: parseInt(e.target.value) }));
                      setActivePreset('custom');
                    }}
                    className="w-full accent-red-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-700 mb-1">
                    <span className="font-bold">Saturation</span>
                    <span>{filters.saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={filters.saturation}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, saturation: parseInt(e.target.value) }));
                      setActivePreset('custom');
                    }}
                    className="w-full accent-red-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-700 mb-1">
                    <span className="font-bold">Grayscale (B&W)</span>
                    <span>{filters.grayscale}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.grayscale}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, grayscale: parseInt(e.target.value) }));
                      setActivePreset('custom');
                    }}
                    className="w-full accent-red-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-700 mb-1">
                    <span className="font-bold">Vintage Sepia</span>
                    <span>{filters.sepia}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.sepia}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, sepia: parseInt(e.target.value) }));
                      setActivePreset('custom');
                    }}
                    className="w-full accent-red-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-700 mb-1">
                    <span className="font-bold">Soft Blur</span>
                    <span>{filters.blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    value={filters.blur}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, blur: parseInt(e.target.value) }));
                      setActivePreset('custom');
                    }}
                    className="w-full accent-red-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Format selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['image/jpeg', 'image/png', 'image/webp'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormat(fmt)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        format === fmt
                          ? 'border-red-600 bg-red-600 text-white shadow-xs'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {fmt === 'image/jpeg' ? 'JPG' : fmt === 'image/png' ? 'PNG' : 'WEBP'}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                id="execute-filter-btn"
                onClick={handleApply}
                disabled={isProcessing}
                className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-bold rounded-full text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Applying Enhancements...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Save Filtered Photo</span>
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
