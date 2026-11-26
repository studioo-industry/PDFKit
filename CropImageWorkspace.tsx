import React, { useState, useEffect, useRef } from 'react';
import { 
  Crop, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw,
  Maximize2,
  Sliders
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes } from '../../services/pdfService';
import { cropImage, getImageDimensions, loadImage } from '../../services/imageService';
import { usePremium } from '../../context/PremiumContext';

interface CropImageWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

type AspectPreset = 'free' | '1:1' | '4:3' | '16:9' | '9:16' | '3:2';

export const CropImageWorkspace: React.FC<CropImageWorkspaceProps> = ({ tool, onSuccess }) => {
  const { isPremium } = usePremium();
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [preset, setPreset] = useState<AspectPreset>('1:1');
  
  const [origW, setOrigW] = useState(1200);
  const [origH, setOrigH] = useState(800);
  
  // Crop coordinates in actual image pixels
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropW, setCropW] = useState(600);
  const [cropH, setCropH] = useState(600);

  const [format, setFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileItem = files[0];

  // When file loads, calculate natural dimensions and center the initial crop
  useEffect(() => {
    if (fileItem) {
      getImageDimensions(fileItem.file).then(({ width, height }) => {
        setOrigW(width);
        setOrigH(height);
        applyPreset('1:1', width, height);
      });
    }
  }, [fileItem?.file]);

  const applyPreset = (p: AspectPreset, imgW = origW, imgH = origH) => {
    setPreset(p);
    let targetW = imgW;
    let targetH = imgH;

    if (p === '1:1') {
      const size = Math.min(imgW, imgH);
      targetW = size;
      targetH = size;
    } else if (p === '4:3') {
      if (imgW / imgH > 4 / 3) {
        targetH = imgH;
        targetW = Math.round(imgH * (4 / 3));
      } else {
        targetW = imgW;
        targetH = Math.round(imgW * (3 / 4));
      }
    } else if (p === '16:9') {
      if (imgW / imgH > 16 / 9) {
        targetH = imgH;
        targetW = Math.round(imgH * (16 / 9));
      } else {
        targetW = imgW;
        targetH = Math.round(imgW * (9 / 16));
      }
    } else if (p === '9:16') {
      if (imgW / imgH > 9 / 16) {
        targetH = imgH;
        targetW = Math.round(imgH * (9 / 16));
      } else {
        targetW = imgW;
        targetH = Math.round(imgW * (16 / 9));
      }
    } else if (p === '3:2') {
      if (imgW / imgH > 3 / 2) {
        targetH = imgH;
        targetW = Math.round(imgH * (3 / 2));
      } else {
        targetW = imgW;
        targetH = Math.round(imgW * (2 / 3));
      }
    } else {
      // Freeform default 80%
      targetW = Math.round(imgW * 0.8);
      targetH = Math.round(imgH * 0.8);
    }

    setCropW(targetW);
    setCropH(targetH);
    setCropX(Math.max(0, Math.round((imgW - targetW) / 2)));
    setCropY(Math.max(0, Math.round((imgH - targetH) / 2)));
  };

  // Draw crop box overlay on preview canvas
  useEffect(() => {
    if (!fileItem || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    loadImage(fileItem.file).then((img) => {
      const displayW = 600;
      const displayH = (img.height / img.width) * displayW;

      canvas.width = displayW;
      canvas.height = displayH;

      // Draw base image
      ctx.drawImage(img, 0, 0, displayW, displayH);

      // Darken uncropped areas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, displayW, displayH);

      // Clear cropped rectangle
      const scaleX = displayW / origW;
      const scaleY = displayH / origH;
      const rX = cropX * scaleX;
      const rY = cropY * scaleY;
      const rW = cropW * scaleX;
      const rH = cropH * scaleY;

      ctx.drawImage(img, cropX, cropY, cropW, cropH, rX, rY, rW, rH);

      // Draw crop outline & rule of thirds grid
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(rX, rY, rW, rH);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      // Verticals
      ctx.beginPath();
      ctx.moveTo(rX + rW / 3, rY);
      ctx.lineTo(rX + rW / 3, rY + rH);
      ctx.moveTo(rX + (rW * 2) / 3, rY);
      ctx.lineTo(rX + (rW * 2) / 3, rY + rH);
      // Horizontals
      ctx.moveTo(rX, rY + rH / 3);
      ctx.lineTo(rX + rW, rY + rH / 3);
      ctx.moveTo(rX, rY + (rH * 2) / 3);
      ctx.lineTo(rX + rW, rY + (rH * 2) / 3);
      ctx.stroke();
    });
  }, [fileItem?.file, cropX, cropY, cropW, cropH, origW, origH]);

  const handleCrop = async () => {
    if (!fileItem) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res = await cropImage(
        fileItem.file,
        {
          x: cropX,
          y: cropY,
          width: cropW,
          height: cropH,
        },
        { format }
      );

      const downloadUrl = URL.createObjectURL(res.blob);
      onSuccess({
        title: `Image cropped to ${cropW}×${cropH}px!`,
        success: true,
        downloadUrl,
        downloadFilename: res.filename,
        fileSize: res.blob.size,
        originalSize: fileItem.size,
        blob: res.blob,
      });
    } catch (err: any) {
      console.error('Crop error:', err);
      setError(err?.message || 'Failed to crop image.');
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
          title="Drop image to crop"
          subtitle="Crop photos to 1:1, 16:9, 4:3, Instagram stories, or custom boxes."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Canvas Preview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="font-bold text-gray-900 text-sm">{fileItem.name}</span>
                <button
                  onClick={() => setFiles([])}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-gray-950 rounded-2xl p-3 flex items-center justify-center overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[420px] object-contain rounded-lg shadow-md"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <span>Original: {origW} × {origH} px</span>
                <span className="font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                  Cropped Area: {cropW} × {cropH} px
                </span>
              </div>
            </div>
          </div>

          {/* Right Crop Presets & Fine-tuning */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <Crop className="w-4 h-4 text-red-600" />
                <h3 className="font-bold text-gray-900 text-sm font-google">Aspect Ratio Presets</h3>
              </div>

              {/* Aspect buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '1:1', label: '1:1 Square' },
                  { id: '4:3', label: '4:3 Photo' },
                  { id: '16:9', label: '16:9 Video' },
                  { id: '9:16', label: '9:16 Story' },
                  { id: '3:2', label: '3:2 Classic' },
                  { id: 'free', label: 'Custom' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => applyPreset(item.id as AspectPreset)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center ${
                      preset === item.id
                        ? 'border-red-600 bg-red-600 text-white shadow-xs'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Crop position sliders */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Position Adjustment:
                </label>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Horizontal Offset (X)</span>
                    <span className="font-semibold">{cropX} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, origW - cropW)}
                    value={cropX}
                    onChange={(e) => setCropX(parseInt(e.target.value))}
                    className="w-full accent-red-600 cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Vertical Offset (Y)</span>
                    <span className="font-semibold">{cropY} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, origH - cropH)}
                    value={cropY}
                    onChange={(e) => setCropY(parseInt(e.target.value))}
                    className="w-full accent-red-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Output format */}
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

              {/* Action */}
              <button
                id="execute-crop-btn"
                onClick={handleCrop}
                disabled={isProcessing}
                className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-bold rounded-full text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cropping Image...</span>
                  </>
                ) : (
                  <>
                    <Crop className="w-4 h-4" />
                    <span>Crop & Save Photo</span>
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
