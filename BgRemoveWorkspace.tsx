import React, { useState, useEffect, useRef } from 'react';
import { 
  Eraser, 
  Trash2, 
  Loader2, 
  Download, 
  Sliders, 
  Palette, 
  Pipette, 
  Check, 
  Sparkles,
  Eye
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes } from '../../services/pdfService';
import { loadImage, canvasToBlob } from '../../services/imageService';
import { removeAndReplaceBackground } from '../../services/govtPhotoService';

interface BgRemoveWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

export const BgRemoveWorkspace: React.FC<BgRemoveWorkspaceProps> = ({ tool, onSuccess }) => {
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [tolerance, setTolerance] = useState(35);
  const [feather, setFeather] = useState(2);
  const [replacementColor, setReplacementColor] = useState<string>('#ffffff'); // Default pure white for govt documents
  const [customColor, setCustomColor] = useState('#cce6ff');
  
  const [isEyedropperActive, setIsEyedropperActive] = useState(false);
  const [sampledColor, setSampledColor] = useState<{ r: number; g: number; b: number } | undefined>(undefined);

  const [viewMode, setViewMode] = useState<'after' | 'before' | 'split'>('after');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileItem = files[0];

  useEffect(() => {
    if (fileItem) {
      loadImage(fileItem.file).then((img) => {
        setLoadedImg(img);
        setSampledColor(undefined);
      });
    } else {
      setLoadedImg(null);
      setPreviewDataUrl(null);
    }
  }, [fileItem]);

  // Recompute background removal
  useEffect(() => {
    if (!loadedImg) return;

    const canvas = removeAndReplaceBackground(loadedImg, {
      sampleColor: sampledColor,
      tolerance,
      feather,
      replacementColor,
    });

    previewCanvasRef.current = canvas;
    const format = replacementColor === 'transparent' ? 'image/png' : 'image/jpeg';
    setPreviewDataUrl(canvas.toDataURL(format, 0.92));
  }, [loadedImg, tolerance, feather, replacementColor, sampledColor]);

  // Handle clicking on image with eyedropper
  const handleCanvasClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isEyedropperActive || !loadedImg) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scaleX = loadedImg.naturalWidth / rect.width;
    const scaleY = loadedImg.naturalHeight / rect.height;

    const actualX = Math.floor(clickX * scaleX);
    const actualY = Math.floor(clickY * scaleY);

    // Sample color from original image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = loadedImg.naturalWidth;
    tempCanvas.height = loadedImg.naturalHeight;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(loadedImg, 0, 0);

    const pixel = ctx.getImageData(actualX, actualY, 1, 1).data;
    setSampledColor({ r: pixel[0], g: pixel[1], b: pixel[2] });
    setIsEyedropperActive(false);
  };

  const handleDownload = async () => {
    if (!loadedImg || !fileItem) return;
    setIsProcessing(true);

    try {
      const finalCanvas = removeAndReplaceBackground(loadedImg, {
        sampleColor: sampledColor,
        tolerance,
        feather,
        replacementColor,
      });

      const isTransparent = replacementColor === 'transparent';
      const mimeType = isTransparent ? 'image/png' : 'image/jpeg';
      const extension = isTransparent ? '.png' : '.jpg';
      const blob = await canvasToBlob(finalCanvas, mimeType, 0.94);

      const downloadUrl = URL.createObjectURL(blob);
      const baseName = fileItem.name.replace(/\.[^/.]+$/, '');
      const downloadName = `${baseName}_bg_removed${extension}`;

      onSuccess({
        title: 'Background Removed Successfully',
        success: true,
        downloadUrl,
        downloadFilename: downloadName,
        downloadName,
        fileSize: blob.size,
        originalSize: fileItem.size,
        message: `Background replaced with ${replacementColor === 'transparent' ? 'transparent PNG' : replacementColor} (${formatBytes(blob.size)})`,
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
          title="Upload photo to remove or replace background"
          subtitle="Works with ID cards, portraits, and product photos (JPG, PNG, WEBP)"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Preview Canvas */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Eraser className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Live Background Removal Preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-gray-100 p-0.5 rounded-lg flex items-center text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('after')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                      viewMode === 'after' ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-600'
                    }`}
                  >
                    Result
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('before')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                      viewMode === 'before' ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-600'
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

            <div 
              className={`relative border border-gray-200 rounded-xl p-4 flex items-center justify-center min-h-[380px] w-full ${
                replacementColor === 'transparent' ? 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] bg-slate-50' : 'bg-gray-100/80'
              }`}
            >
              {previewDataUrl && loadedImg ? (
                <div className="relative shadow-md rounded-sm overflow-hidden max-h-[420px]">
                  <img
                    src={viewMode === 'before' ? URL.createObjectURL(fileItem.file) : previewDataUrl}
                    alt="Background preview"
                    onClick={handleCanvasClick}
                    className={`max-h-[400px] object-contain block select-none ${
                      isEyedropperActive ? 'cursor-crosshair ring-2 ring-purple-500' : ''
                    }`}
                  />
                  {isEyedropperActive && (
                    <div className="absolute top-2 left-2 bg-black/80 text-white text-[11px] px-2.5 py-1 rounded-md shadow-md flex items-center gap-1.5">
                      <Pipette className="w-3.5 h-3.5 text-purple-400" />
                      <span>Click any area of background to sample color</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  <span className="text-xs">Removing background...</span>
                </div>
              )}
            </div>

            {/* Quick Helper */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500 w-full px-1">
              <span>Original: {formatBytes(fileItem.size)}</span>
              <button
                type="button"
                onClick={() => setIsEyedropperActive(!isEyedropperActive)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  isEyedropperActive ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                <Pipette className="w-3.5 h-3.5" />
                <span>{isEyedropperActive ? 'Eyedropper Active' : 'Sample Background Color'}</span>
              </button>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Background Replacement Color */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-purple-600" />
                <span>1. Replace Background With</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: '#ffffff', label: 'Pure White', desc: 'Govt & Passport standard', color: '#ffffff', border: 'border-gray-300' },
                  { id: '#cce6ff', label: 'Passport Sky Blue', desc: 'Official light blue tone', color: '#cce6ff', border: 'border-blue-200' },
                  { id: '#f3f4f6', label: 'Light Grey', desc: 'European Schengen standard', color: '#f3f4f6', border: 'border-gray-200' },
                  { id: 'transparent', label: 'Transparent (PNG)', desc: 'Cutout for graphics', color: 'transparent', border: 'border-dashed border-gray-400' },
                ].map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setReplacementColor(bg.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      replacementColor === bg.id
                        ? 'border-purple-600 bg-purple-50/70 text-purple-900 shadow-xs'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-md shrink-0 border ${bg.border} mt-0.5`}
                      style={{ backgroundColor: bg.color === 'transparent' ? '#ffffff' : bg.color }}
                    />
                    <div>
                      <div className="text-xs font-bold">{bg.label}</div>
                      <div className="text-[10px] text-gray-500">{bg.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Sensitivity & Tolerance Sliders */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span>2. Fine-Tune Tolerance & Edges</span>
              </h3>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Color Tolerance</span>
                  <span>{tolerance}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="85"
                  value={tolerance}
                  onChange={(e) => setTolerance(parseInt(e.target.value, 10))}
                  className="w-full accent-purple-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  Increase if background isn't fully removed; decrease if foreground is cut.
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Edge Feather & Softness</span>
                  <span>{feather} px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="8"
                  value={feather}
                  onChange={(e) => setFeather(parseInt(e.target.value, 10))}
                  className="w-full accent-purple-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  Smoothes jagged edges around hair and shoulders.
                </span>
              </div>
            </div>

            <button
              id="bg-remove-download-btn"
              type="button"
              disabled={isProcessing}
              onClick={handleDownload}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing image...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Clean Image ({replacementColor === 'transparent' ? 'PNG' : 'JPG'})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
