import React, { useState, useEffect } from 'react';
import { 
  FileImage, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Loader2, 
  FileText, 
  Layers,
  Edit3,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes, jpgToPdf } from '../../services/pdfService';
import { usePremium } from '../../context/PremiumContext';
import { blobToBase64 } from '../../services/shareService';

interface JpgToPdfWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
  initialState?: {
    images?: Array<{ name: string; size: number; type: string; dataUrl: string }>;
    pageSize?: 'fit' | 'a4' | 'letter';
    orientation?: 'auto' | 'portrait' | 'landscape';
    margin?: number;
    shareId?: string;
    title?: string;
  };
}

export const JpgToPdfWorkspace: React.FC<JpgToPdfWorkspaceProps> = ({ tool, onSuccess, initialState }) => {
  const { isPremium, openUpgradeModal } = usePremium();
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [pageSize, setPageSize] = useState<'fit' | 'a4' | 'letter'>(initialState?.pageSize || 'fit');
  const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>(initialState?.orientation || 'auto');
  const [margin, setMargin] = useState<number>(initialState?.margin || 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load initial state if provided (when editing a shared document)
  useEffect(() => {
    if (initialState?.images && initialState.images.length > 0) {
      const loadInitialImages = async () => {
        try {
          const loaded: UploadedFileItem[] = [];
          for (let i = 0; i < initialState.images!.length; i++) {
            const imgData = initialState.images![i];
            let blob: Blob;
            if (imgData.dataUrl.startsWith('data:')) {
              const res = await fetch(imgData.dataUrl);
              blob = await res.blob();
            } else if (imgData.dataUrl.startsWith('http') || imgData.dataUrl.startsWith('/')) {
              const res = await fetch(imgData.dataUrl);
              blob = await res.blob();
            } else {
              continue;
            }
            const file = new File([blob], imgData.name || `image_${i + 1}.jpg`, {
              type: imgData.type || blob.type || 'image/jpeg',
            });
            loaded.push({
              id: `init_${i}_` + Math.random().toString(36).substring(2, 7),
              file,
              name: file.name,
              size: file.size,
              type: file.type,
              previewUrl: URL.createObjectURL(blob),
            });
          }
          if (loaded.length > 0) {
            setFiles(loaded);
          }
        } catch (e) {
          console.warn('Failed to load initial images for editing:', e);
        }
      };
      loadInitialImages();
    }
  }, [initialState]);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= files.length) return;
    const newFiles = [...files];
    const temp = newFiles[index];
    newFiles[index] = newFiles[targetIndex];
    newFiles[targetIndex] = temp;
    setFiles(newFiles);
  };

  const handleRemove = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  const handleConvert = async () => {
    if (files.length === 0) {
      setError('Please add at least 1 image.');
      return;
    }

    setError(null);
    setIsProcessing(true);
    setProgress(10);

    try {
      const pdfBytes = await jpgToPdf(
        files.map((f) => f.file),
        { pageSize, orientation, margin },
        (p) => setProgress(p)
      );

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const downloadFilename = initialState?.title 
        ? (initialState.title.endsWith('.pdf') ? initialState.title : `${initialState.title}.pdf`)
        : `PDFKit_images_${Date.now()}.pdf`;

      // Prepare images data so the document can be edited anytime
      const savedImages = await Promise.all(
        files.map(async (f) => {
          let dataUrl = f.previewUrl;
          if (!dataUrl.startsWith('data:')) {
            dataUrl = await blobToBase64(f.file);
          }
          return {
            name: f.name,
            size: f.size,
            type: f.type,
            dataUrl,
          };
        })
      );

      const toolState = {
        toolId: 'jpg-to-pdf',
        pageSize,
        orientation,
        margin,
        images: savedImages,
      };

      onSuccess({
        title: initialState?.shareId
          ? `Updated PDF with ${files.length} ${files.length === 1 ? 'image' : 'images'}!`
          : `Created PDF with ${files.length} ${files.length === 1 ? 'image' : 'images'}!`,
        success: true,
        downloadUrl,
        downloadFilename,
        fileSize: blob.size,
        blob,
        toolState,
        shareId: initialState?.shareId,
      });
    } catch (err: any) {
      console.error('JPG to PDF error:', err);
      setError(err?.message || 'Failed to convert images to PDF.');
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
          title="Drop JPG or PNG images here"
          subtitle="Convert pictures into a professional PDF document."
        />
      ) : (
        <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 font-google">
                  {initialState?.shareId ? 'Editing Shared Document' : 'JPG to PDF Converter'} ({files.length} images)
                </h2>
                {initialState?.shareId && (
                  <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full flex items-center gap-1">
                    <Edit3 className="w-3 h-3" />
                    Editing Live Share Link
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {initialState?.shareId
                  ? 'Reorder images, add photos, or adjust margins. Converting will update the existing unique share link!'
                  : 'Arrange images in order and configure page layout.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="add-more-img-input"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-full flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More Images</span>
              </label>
              <input
                id="add-more-img-input"
                type="file"
                multiple
                accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    const valid: UploadedFileItem[] = [];
                    for (const f of Array.from(e.target.files as FileList)) {
                      const isImage = f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|svg|avif)$/i.test(f.name);
                      if (!isImage) {
                        setError('Only image files (JPG, PNG, WebP) are supported in JPG to PDF.');
                        continue;
                      }
                      valid.push({
                        id: Math.random().toString(36).substring(2, 9),
                        file: f,
                        name: f.name,
                        size: f.size,
                        type: f.type,
                        previewUrl: URL.createObjectURL(f),
                      });
                    }
                    if (valid.length > 0) {
                      setFiles((prev) => [...prev, ...valid]);
                    }
                  }
                  e.target.value = '';
                }}
              />

              <button
                onClick={() => setFiles([])}
                className="px-3 py-2 text-xs text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>

          {/* Layout Configuration Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
            {/* Page size */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-gray-700 uppercase">Page Format</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as any)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 outline-none"
              >
                <option value="fit">Fit to Image Size</option>
                <option value="a4">A4 (Standard)</option>
                <option value="letter">US Letter</option>
              </select>
            </div>

            {/* Orientation */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-gray-700 uppercase">Orientation</label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as any)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 outline-none"
              >
                <option value="auto">Auto (Match Image)</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            {/* Margins */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-gray-700 uppercase">Margins</label>
              <select
                value={margin}
                onChange={(e) => setMargin(parseInt(e.target.value, 10))}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 outline-none"
              >
                <option value="0">No Margin (Full Bleed)</option>
                <option value="15">Small Margin (15pt)</option>
                <option value="30">Large Margin (30pt)</option>
              </select>
            </div>
          </div>

          {/* Image grid & sequence */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-1">
            {files.map((item, index) => (
              <div
                key={item.id}
                className="group relative bg-gray-50 border border-gray-200 rounded-2xl p-2 hover:border-purple-400 transition-all flex flex-col justify-between"
              >
                <div className="relative mb-2">
                  <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-black/70 text-white rounded-md text-[10px] font-bold z-10">
                    #{index + 1}
                  </span>
                  <img
                    src={item.previewUrl || ''}
                    alt={item.name}
                    className="w-full h-28 object-contain rounded-xl bg-white shadow-2xs"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-600 px-1">
                  <span className="truncate max-w-[100px]">{item.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-200 disabled:opacity-20 rounded"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === files.length - 1}
                      className="p-1 hover:bg-gray-200 disabled:opacity-20 rounded"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="p-1 hover:bg-red-100 text-red-500 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800">
              {error}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
            <button
              id="execute-jpg-to-pdf-btn"
              onClick={handleConvert}
              disabled={isProcessing}
              className="px-8 py-3.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-bold rounded-full text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{initialState?.shareId ? 'Updating Document' : 'Converting to PDF'} ({progress}%)...</span>
                </>
              ) : (
                <>
                  <FileImage className="w-4 h-4" />
                  <span>{initialState?.shareId ? 'Update & Save to Shared Link' : 'Create PDF Document'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
