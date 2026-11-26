import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Trash2, 
  Loader2, 
  Download, 
  Sliders, 
  Sun, 
  Contrast, 
  Wand2, 
  Check, 
  RotateCcw,
  Eye
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes } from '../../services/pdfService';
import { loadImage, canvasToBlob } from '../../services/imageService';
import { enhanceDocumentPhoto } from '../../services/govtPhotoService';

interface PhotoEnhancerWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

export const PhotoEnhancerWorkspace: React.FC<PhotoEnhancerWorkspaceProps> = ({ tool, onSuccess }) => {
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  
  // Enhancement states
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(15);
  const [sharpness, setSharpness] = useState(40);
  const [exposure, setExposure] = useState(5);
  const [denoise, setDenoise] = useState(10);
  const [autoEnhance, setAutoEnhance] = useState(true);
  const [grayscale, setGrayscale] = useState(false);

  const [viewMode, setViewMode] = useState<'after' | 'before'>('after');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);

  const fileItem = files[0];

  useEffect(() => {
    if (fileItem) {
      loadImage(fileItem.file).then((img) => {
        setLoadedImg(img);
        setAutoEnhance(true);
      });
    } else {
      setLoadedImg(null);
      setPreviewDataUrl(null);
    }
  }, [fileItem]);

  // Re-render enhanced image
  useEffect(() => {
    if (!loadedImg) return;

    const canvas = enhanceDocumentPhoto(loadedImg, {
      brightness,
      contrast,
      sharpness,
      exposure,
      denoise,
      autoEnhance,
      grayscale,
    });

    setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.94));
  }, [loadedImg, brightness, contrast, sharpness, exposure, denoise, autoEnhance, grayscale]);

  const resetFilters = () => {
    setBrightness(0);
    setContrast(0);
    setSharpness(0);
    setExposure(0);
    setDenoise(0);
    setAutoEnhance(false);
    setGrayscale(false);
  };

  const handleDownload = async () => {
    if (!loadedImg || !fileItem) return;
    setIsProcessing(true);

    try {
      const finalCanvas = enhanceDocumentPhoto(loadedImg, {
        brightness,
        contrast,
        sharpness,
        exposure,
        denoise,
        autoEnhance,
        grayscale,
      });

      const blob = await canvasToBlob(finalCanvas, 'image/jpeg', 0.95);
      const downloadUrl = URL.createObjectURL(blob);
      const baseName = fileItem.name.replace(/\.[^/.]+$/, '');
      const downloadName = `${baseName}_enhanced_hd.jpg`;

      onSuccess({
        title: 'Photo Enhanced with HD Clarity',
        success: true,
        downloadUrl,
        downloadFilename: downloadName,
        downloadName,
        fileSize: blob.size,
        originalSize: fileItem.size,
        message: `Photo enhanced with HD clarity and contrast balance (${formatBytes(blob.size)})`,
        blob,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {!fileItem ? (
        <DropZone
          tool={tool}
          files={files}
          onFilesChange={setFiles}
          title="Upload dark, blurry, or low-quality document photo"
          subtitle="1-Click AI clarity boost, sharpness restoration, and contrast balancing"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Preview */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-600" />
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Enhanced Document Preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-gray-100 p-0.5 rounded-lg flex items-center text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('after')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                      viewMode === 'after' ? 'bg-white text-rose-700 shadow-xs' : 'text-gray-600'
                    }`}
                  >
                    Enhanced
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('before')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                      viewMode === 'before' ? 'bg-white text-rose-700 shadow-xs' : 'text-gray-600'
                    }`}
                  >
                    Original
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Change</span>
                </button>
              </div>
            </div>

            <div className="relative bg-gray-100/80 border border-gray-200 rounded-xl p-4 flex items-center justify-center min-h-[380px] w-full">
              {previewDataUrl && loadedImg ? (
                <div className="shadow-md rounded-sm overflow-hidden max-h-[420px]">
                  <img
                    src={viewMode === 'before' ? URL.createObjectURL(fileItem.file) : previewDataUrl}
                    alt="Enhanced Preview"
                    className="max-h-[400px] object-contain block select-none"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
                  <span className="text-xs">Enhancing photo details...</span>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500 w-full px-1">
              <span>Original size: {formatBytes(fileItem.size)}</span>
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-800 font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Default</span>
              </button>
            </div>
          </div>

          {/* Right: Sliders & Controls */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* 1-Click Auto Boost */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
              <button
                type="button"
                onClick={() => setAutoEnhance(!autoEnhance)}
                className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  autoEnhance
                    ? 'border-rose-500 bg-rose-50/70 text-rose-950 ring-2 ring-rose-500/20 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${autoEnhance ? 'bg-rose-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    <Wand2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-xs">1-Click Govt ID Auto-Enhance</div>
                    <div className="text-[10px] text-gray-500">Auto shadow lift, facial de-blur & contrast</div>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${autoEnhance ? 'bg-rose-200 text-rose-800' : 'bg-gray-200 text-gray-600'}`}>
                  {autoEnhance ? 'ACTIVE' : 'OFF'}
                </span>
              </button>
            </div>

            {/* Manual Sliders */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs space-y-3.5">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-rose-600" />
                <span>Fine Adjustments</span>
              </h3>

              {/* Sharpness */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Sharpness & Edge Clarity</span>
                  <span>{sharpness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sharpness}
                  onChange={(e) => {
                    setSharpness(parseInt(e.target.value, 10));
                  }}
                  className="w-full accent-rose-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Contrast */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Contrast Balance</span>
                  <span>{contrast > 0 ? `+${contrast}` : contrast}%</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="50"
                  value={contrast}
                  onChange={(e) => {
                    setContrast(parseInt(e.target.value, 10));
                  }}
                  className="w-full accent-rose-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Brightness / Exposure */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Exposure & Brightness</span>
                  <span>{brightness > 0 ? `+${brightness}` : brightness}%</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="50"
                  value={brightness}
                  onChange={(e) => {
                    setBrightness(parseInt(e.target.value, 10));
                  }}
                  className="w-full accent-rose-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Grayscale toggle for B&W documents */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-800 block">Black & White Document Mode</span>
                  <span className="text-[10px] text-gray-500">For forms requiring strict B&W photo</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={grayscale}
                    onChange={(e) => setGrayscale(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>
            </div>

            <button
              id="photo-enhancer-download-btn"
              type="button"
              disabled={isProcessing}
              onClick={handleDownload}
              className="w-full py-3 px-4 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting HD Photo...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Enhanced HD Photo</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
