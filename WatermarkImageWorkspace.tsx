import React, { useState, useEffect, useRef } from 'react';
import { 
  Stamp, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Sparkles, 
  Sliders,
  Type,
  Grid
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes } from '../../services/pdfService';
import { watermarkImage, loadImage } from '../../services/imageService';
import { usePremium } from '../../context/PremiumContext';

interface WatermarkImageWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

type WatermarkPos = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'tile';

export const WatermarkImageWorkspace: React.FC<WatermarkImageWorkspaceProps> = ({ tool, onSuccess }) => {
  const { isPremium } = usePremium();
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState('#ffffff');
  const [opacity, setOpacity] = useState(0.45);
  const [position, setPosition] = useState<WatermarkPos>('center');
  const [rotation, setRotation] = useState(-30);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileItem = files[0];

  // Draw real-time live preview
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

      ctx.drawImage(img, 0, 0, displayW, displayH);

      // Draw watermark preview scaled to display canvas
      const scale = displayW / (img.naturalWidth || img.width || displayW);
      const scaledFontSize = Math.max(12, Math.round(fontSize * scale));

      ctx.save();
      ctx.globalAlpha = Math.max(0.05, Math.min(opacity, 1));
      ctx.fillStyle = color;
      ctx.font = `bold ${scaledFontSize}px 'Google Sans', 'Plus Jakarta Sans', Arial, sans-serif`;
      ctx.textBaseline = 'middle';

      const margin = scaledFontSize * 1.5;

      if (position === 'tile') {
        const textMetrics = ctx.measureText(text);
        const stepX = textMetrics.width + 60;
        const stepY = scaledFontSize * 4;

        ctx.translate(displayW / 2, displayH / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-displayW / 2, -displayH / 2);

        for (let x = -displayW; x < displayW * 2; x += stepX) {
          for (let y = -displayH; y < displayH * 2; y += stepY) {
            ctx.fillText(text, x, y);
          }
        }
      } else {
        ctx.textAlign = 'center';
        let posX = displayW / 2;
        let posY = displayH / 2;

        if (position === 'top-left') {
          ctx.textAlign = 'left';
          posX = margin;
          posY = margin;
        } else if (position === 'top-right') {
          ctx.textAlign = 'right';
          posX = displayW - margin;
          posY = margin;
        } else if (position === 'bottom-left') {
          ctx.textAlign = 'left';
          posX = margin;
          posY = displayH - margin;
        } else if (position === 'bottom-right') {
          ctx.textAlign = 'right';
          posX = displayW - margin;
          posY = displayH - margin;
        }

        ctx.translate(posX, posY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.fillText(text, 0, 0);
      }

      ctx.restore();
    });
  }, [fileItem?.file, text, fontSize, color, opacity, position, rotation]);

  const handleWatermark = async () => {
    if (!fileItem) return;
    if (!text.trim()) {
      setError('Please enter watermark text.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const res = await watermarkImage(fileItem.file, {
        text,
        fontSize,
        color,
        opacity,
        position,
        rotation,
      });

      const downloadUrl = URL.createObjectURL(res.blob);
      onSuccess({
        title: `Watermark applied successfully!`,
        success: true,
        downloadUrl,
        downloadFilename: res.filename,
        fileSize: res.blob.size,
        originalSize: fileItem.size,
        blob: res.blob,
      });
    } catch (err: any) {
      console.error('Watermark error:', err);
      setError(err?.message || 'Failed to watermark image.');
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
          title="Drop image to watermark"
          subtitle="Add custom text, copyright notices, and repeat tiled stamps across photos."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Preview Canvas */}
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

              <div className="bg-gray-900/5 rounded-2xl p-4 flex items-center justify-center overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[420px] object-contain rounded-lg shadow-sm border border-gray-200"
                />
              </div>

              <div className="text-xs text-gray-500 text-center">
                Interactive real-time preview showing watermark position and opacity.
              </div>
            </div>
          </div>

          {/* Right Watermark Controls */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <Stamp className="w-4 h-4 text-orange-600" />
                <h3 className="font-bold text-gray-900 text-sm font-google">Watermark Options</h3>
              </div>

              {/* Text Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Watermark Text:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="e.g. © 2026 Copyright, Confidential"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-300 focus:border-orange-500 rounded-xl text-sm font-semibold outline-none"
                  />
                  <Type className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Position selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Position & Layout:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'top-left', label: 'Top Left' },
                    { id: 'center', label: 'Center' },
                    { id: 'top-right', label: 'Top Right' },
                    { id: 'bottom-left', label: 'Bottom Left' },
                    { id: 'bottom-right', label: 'Bottom Right' },
                    { id: 'tile', label: 'Tiled Pattern' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPosition(p.id as WatermarkPos)}
                      className={`py-2 px-1 text-[11px] font-bold rounded-xl border transition-colors ${
                        position === p.id
                          ? 'border-orange-600 bg-orange-600 text-white shadow-xs'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders: Opacity, Font Size, Rotation */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span className="font-bold">Opacity</span>
                    <span>{Math.round(opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="w-full accent-orange-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span className="font-bold">Font Size</span>
                    <span>{fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="120"
                    step="2"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-full accent-orange-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span className="font-bold">Rotation Angle</span>
                    <span>{rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    step="5"
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value))}
                    className="w-full accent-orange-600 cursor-pointer"
                  />
                </div>

                {/* Color presets */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Text Color
                  </label>
                  <div className="flex items-center gap-2">
                    {['#ffffff', '#000000', '#ea4335', '#1a73e8', '#f9ab00'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          color === c ? 'scale-110 border-orange-500 ring-2 ring-orange-200' : 'border-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
                  {error}
                </div>
              )}

              {/* Action Button */}
              <button
                id="execute-watermark-btn"
                onClick={handleWatermark}
                disabled={isProcessing || !text.trim()}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white font-bold rounded-full text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Applying Watermark...</span>
                  </>
                ) : (
                  <>
                    <Stamp className="w-4 h-4" />
                    <span>Apply Watermark</span>
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
