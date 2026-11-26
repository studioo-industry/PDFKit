import React, { useState } from 'react';
import { 
  RotateCw, 
  RotateCcw, 
  FlipHorizontal, 
  FlipVertical, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw 
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes } from '../../services/pdfService';
import { rotateFlipImage } from '../../services/imageService';
import { usePremium } from '../../context/PremiumContext';

interface RotateImageWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

export const RotateImageWorkspace: React.FC<RotateImageWorkspaceProps> = ({ tool, onSuccess }) => {
  const { isPremium } = usePremium();
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [format, setFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileItem = files[0];

  const handleRotateCW = () => setRotation((prev) => (prev + 90) % 360);
  const handleRotateCCW = () => setRotation((prev) => (prev + 270) % 360);
  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  };

  const handleSave = async () => {
    if (!fileItem) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res = await rotateFlipImage(fileItem.file, rotation, flipH, flipV, format);
      const downloadUrl = URL.createObjectURL(res.blob);

      onSuccess({
        title: `Image rotated and transformed!`,
        success: true,
        downloadUrl,
        downloadFilename: res.filename,
        fileSize: res.blob.size,
        originalSize: fileItem.size,
        blob: res.blob,
      });
    } catch (err: any) {
      console.error('Rotate image error:', err);
      setError(err?.message || 'Failed to rotate image.');
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
          title="Drop image to rotate or flip"
          subtitle="Rotate 90°, 180°, 270° or mirror flip horizontally and vertically in browser."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Live Transformed View */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="font-bold text-gray-900 text-sm">{fileItem.name}</span>
                <button
                  onClick={() => {
                    setFiles([]);
                    handleReset();
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Real-time interactive CSS preview */}
              <div className="bg-gray-900/5 rounded-2xl p-6 flex items-center justify-center min-h-[380px] overflow-hidden">
                <div
                  className="transition-transform duration-300 ease-out max-w-full max-h-[360px] flex items-center justify-center"
                  style={{
                    transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                  }}
                >
                  {fileItem.previewUrl && (
                    <img
                      src={fileItem.previewUrl}
                      alt="Transformed preview"
                      className="max-h-72 object-contain rounded-xl shadow-md border border-gray-200"
                    />
                  )}
                </div>
              </div>

              {/* Status pill */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <span>Rotation: <strong>{rotation}°</strong></span>
                <span>
                  Flip: <strong>{flipH ? 'Horizontal ' : ''}{flipV ? 'Vertical' : ''}{!flipH && !flipV ? 'None' : ''}</strong>
                </span>
                <button
                  onClick={handleReset}
                  className="text-teal-600 hover:underline font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Transformation</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Rotation Controls */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <RotateCw className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-gray-900 text-sm font-google">Rotate & Mirror</h3>
              </div>

              {/* Rotate 90 CW and CCW */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Rotate Orientation
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleRotateCCW}
                    className="p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl flex flex-col items-center gap-1 text-xs font-bold text-gray-800 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-5 h-5 text-teal-600" />
                    <span>90° Left (CCW)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRotateCW}
                    className="p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl flex flex-col items-center gap-1 text-xs font-bold text-gray-800 transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-5 h-5 text-teal-600" />
                    <span>90° Right (CW)</span>
                  </button>
                </div>
              </div>

              {/* Mirror / Flip Controls */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Mirror / Flip
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFlipH(!flipH)}
                    className={`p-3 border rounded-2xl flex flex-col items-center gap-1 text-xs font-bold transition-colors cursor-pointer ${
                      flipH
                        ? 'border-teal-600 bg-teal-50 text-teal-800'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <FlipHorizontal className="w-5 h-5 text-teal-600" />
                    <span>Flip Horizontal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFlipV(!flipV)}
                    className={`p-3 border rounded-2xl flex flex-col items-center gap-1 text-xs font-bold transition-colors cursor-pointer ${
                      flipV
                        ? 'border-teal-600 bg-teal-50 text-teal-800'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <FlipVertical className="w-5 h-5 text-teal-600" />
                    <span>Flip Vertical</span>
                  </button>
                </div>
              </div>

              {/* Output format */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Save Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['image/jpeg', 'image/png', 'image/webp'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormat(fmt)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        format === fmt
                          ? 'border-teal-600 bg-teal-600 text-white shadow-xs'
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
                id="execute-rotate-image-btn"
                onClick={handleSave}
                disabled={isProcessing}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-bold rounded-full text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Image...</span>
                  </>
                ) : (
                  <>
                    <RotateCw className="w-4 h-4" />
                    <span>Save Transformed Image</span>
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
