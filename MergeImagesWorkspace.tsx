import React, { useState } from 'react';
import { 
  LayoutGrid, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Image as ImageIcon,
  Sparkles,
  Layers
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes } from '../../services/pdfService';
import { mergeImages } from '../../services/imageService';
import { usePremium } from '../../context/PremiumContext';

interface MergeImagesWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

type MergeLayout = 'horizontal' | 'vertical' | 'grid';

export const MergeImagesWorkspace: React.FC<MergeImagesWorkspaceProps> = ({ tool, onSuccess }) => {
  const { isPremium } = usePremium();
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [layout, setLayout] = useState<MergeLayout>('horizontal');
  const [spacing, setSpacing] = useState(16);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [columns, setColumns] = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= files.length) return;
    const updated = [...files];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setFiles(updated);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      setError('Please select at least 2 images to merge.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const rawFiles = files.map((f) => f.file);
      const res = await mergeImages(rawFiles, layout, {
        spacing,
        bgColor,
        columns,
      });

      const downloadUrl = URL.createObjectURL(res.blob);
      onSuccess({
        title: `${files.length} images combined into a seamless collage!`,
        success: true,
        downloadUrl,
        downloadFilename: res.filename,
        fileSize: res.blob.size,
        blob: res.blob,
      });
    } catch (err: any) {
      console.error('Merge images error:', err);
      setError(err?.message || 'Failed to merge images.');
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
          title="Drop 2 or more images to combine"
          subtitle="Join images horizontally, vertically, or in a multi-image collage grid."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Reorderable image list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="font-bold text-gray-900 text-sm">
                  {files.length} Images in Sequence (Reorder below)
                </span>

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
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {files.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200/80 rounded-2xl hover:border-amber-400/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="w-12 h-12 rounded-xl bg-gray-200 overflow-hidden shrink-0 border border-gray-300">
                        {item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-gray-400 m-auto mt-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-gray-900 truncate">{item.name}</div>
                        <div className="text-[11px] text-gray-500">{formatBytes(item.size)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveItem(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded-lg hover:bg-gray-200"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveItem(idx, 'down')}
                        disabled={idx === files.length - 1}
                        className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded-lg hover:bg-gray-200"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Collage & Layout Settings */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <LayoutGrid className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-gray-900 text-sm font-google">Collage Layout</h3>
              </div>

              {/* Layout Types */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Orientation:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'horizontal', label: 'Side-by-Side' },
                    { id: 'vertical', label: 'Stacked' },
                    { id: 'grid', label: 'Grid / Collage' },
                  ].map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLayout(l.id as MergeLayout)}
                      className={`py-2 px-1 text-[11px] font-bold rounded-xl border transition-colors ${
                        layout === l.id
                          ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spacing Gap Slider */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex justify-between text-xs text-gray-700">
                  <span className="font-bold">Border & Spacing:</span>
                  <span>{spacing} px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="4"
                  value={spacing}
                  onChange={(e) => setSpacing(parseInt(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              {/* Background Color */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Background Color:
                </label>
                <div className="flex items-center gap-2">
                  {['#ffffff', '#000000', '#f3f4f6', '#fef3c7', '#e0e7ff'].map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setBgColor(bg)}
                      style={{ backgroundColor: bg }}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        bgColor === bg ? 'scale-110 border-amber-500 ring-2 ring-amber-200' : 'border-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
                  {error}
                </div>
              )}

              {/* Action button */}
              <button
                id="execute-merge-images-btn"
                onClick={handleMerge}
                disabled={isProcessing || files.length < 2}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white font-bold rounded-full text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Collage...</span>
                  </>
                ) : (
                  <>
                    <LayoutGrid className="w-4 h-4" />
                    <span>Merge {files.length} Photos</span>
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
