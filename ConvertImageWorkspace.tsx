import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Plus, 
  Image as ImageIcon,
  Sparkles,
  Sliders,
  FileText,
  FileCheck,
  CheckSquare,
  Square,
  Eye,
  X,
  Download
} from 'lucide-react';
import JSZip from 'jszip';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes, jpgToPdf } from '../../services/pdfService';
import { convertImageFormat } from '../../services/imageService';
import { usePremium } from '../../context/PremiumContext';

interface ConvertImageWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

export type TargetFormatType = 'jpg' | 'jpeg' | 'pdf' | 'png' | 'webp';

export const ConvertImageWorkspace: React.FC<ConvertImageWorkspaceProps> = ({ tool, onSuccess }) => {
  const { isPremium } = usePremium();
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetFormat, setTargetFormat] = useState<TargetFormatType>('jpg');
  const [quality, setQuality] = useState<number>(0.92);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Preview Modal state
  const [previewItem, setPreviewItem] = useState<UploadedFileItem | null>(null);
  const [previewConvertedUrl, setPreviewConvertedUrl] = useState<string | null>(null);
  const [previewConvertedSize, setPreviewConvertedSize] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Sync selected IDs when files change
  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      files.forEach((f) => {
        if (prev.size === 0 || prev.has(f.id)) {
          next.add(f.id);
        }
      });
      return next.size > 0 ? next : new Set(files.map((f) => f.id));
    });
  }, [files]);

  // Live conversion for Preview Modal
  useEffect(() => {
    if (!previewItem) {
      setPreviewConvertedUrl(null);
      setPreviewConvertedSize(null);
      return;
    }

    if (targetFormat === 'pdf') {
      setPreviewConvertedUrl(null);
      return;
    }

    setIsPreviewLoading(true);
    const mimeType = targetFormat === 'png' ? 'image/png' : targetFormat === 'webp' ? 'image/webp' : 'image/jpeg';
    const ext = targetFormat === 'jpeg' ? 'jpeg' : (targetFormat === 'jpg' ? 'jpg' : undefined);

    convertImageFormat(previewItem.file, mimeType, quality, ext)
      .then((res) => {
        setPreviewConvertedUrl(res.dataUrl);
        setPreviewConvertedSize(res.size);
      })
      .catch((e) => console.error(e))
      .finally(() => setIsPreviewLoading(false));
  }, [previewItem, targetFormat, quality]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(files.map((f) => f.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const getFormatLabel = (fmt: TargetFormatType) => {
    switch (fmt) {
      case 'jpg': return 'JPG (.jpg)';
      case 'jpeg': return 'JPEG (.jpeg)';
      case 'pdf': return 'PDF Document (.pdf)';
      case 'png': return 'PNG (.png)';
      case 'webp': return 'WEBP (.webp)';
    }
  };

  const handleConvert = async () => {
    const activeFiles = files.filter((f) => selectedIds.has(f.id));
    if (activeFiles.length === 0) return;

    setIsProcessing(true);
    setProgress(15);
    setError(null);

    try {
      // 1. Target Format: PDF (Image to PDF conversion)
      if (targetFormat === 'pdf') {
        const rawFiles = activeFiles.map((f) => f.file);
        const pdfBytes = await jpgToPdf(
          rawFiles,
          {
            pageSize: 'a4',
            orientation: 'portrait',
            margin: 20,
          },
          (p) => setProgress(p)
        );

        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        const downloadUrl = URL.createObjectURL(pdfBlob);
        const cleanName = activeFiles[0].name.replace(/\.[^/.]+$/, '');
        const downloadFilename = activeFiles.length === 1 
          ? `${cleanName}_converted.pdf` 
          : `images_converted_${activeFiles.length}pages.pdf`;

        onSuccess({
          title: `${activeFiles.length} ${activeFiles.length === 1 ? 'image' : 'images'} converted to PDF successfully!`,
          success: true,
          downloadUrl,
          downloadFilename,
          fileSize: pdfBlob.size,
          originalSize: activeFiles.reduce((acc, f) => acc + f.size, 0),
          blob: pdfBlob,
        });
        return;
      }

      // 2. Target Format: Raster images (JPG, JPEG, PNG, WEBP)
      const results: { name: string; blob: Blob; url: string; size: number }[] = [];
      const total = activeFiles.length;

      const mimeType = targetFormat === 'png' 
        ? 'image/png' 
        : targetFormat === 'webp' 
        ? 'image/webp' 
        : 'image/jpeg';

      const extOverride = targetFormat === 'jpeg' ? 'jpeg' : (targetFormat === 'jpg' ? 'jpg' : undefined);

      for (let i = 0; i < total; i++) {
        const file = activeFiles[i].file;
        const res = await convertImageFormat(file, mimeType, quality, extOverride);
        
        results.push({
          name: res.filename,
          blob: res.blob,
          url: res.dataUrl,
          size: res.size,
        });

        setProgress(Math.round(((i + 1) / total) * 85));
      }

      if (results.length === 1) {
        const single = results[0];
        const downloadUrl = URL.createObjectURL(single.blob);
        onSuccess({
          title: `Image converted to ${getFormatLabel(targetFormat)}!`,
          success: true,
          downloadUrl,
          downloadFilename: single.name,
          fileSize: single.size,
          originalSize: activeFiles[0].size,
          blob: single.blob,
        });
      } else {
        const zip = new JSZip();
        results.forEach((r) => zip.file(r.name, r.blob));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);

        onSuccess({
          title: `${results.length} images converted to ${getFormatLabel(targetFormat)}!`,
          success: true,
          downloadUrl: zipUrl,
          downloadFilename: `converted_${targetFormat}_images.zip`,
          zipBlob,
          fileSize: zipBlob.size,
          multipleFiles: results,
        });
      }
    } catch (err: any) {
      console.error('Convert error:', err);
      setError(err?.message || 'Failed to convert images.');
      setIsProcessing(false);
    }
  };

  const selectedCount = files.filter((f) => selectedIds.has(f.id)).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {files.length === 0 ? (
        <DropZone
          tool={tool}
          files={files}
          onFilesChange={setFiles}
          title="Drop image files to convert"
          subtitle="Convert JPG to JPEG, JPEG to JPG, Image to PDF, PNG, or WEBP with manual select & preview."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left File List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-gray-100 gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">
                    {files.length} {files.length === 1 ? 'Image' : 'Images'} Uploaded
                  </span>
                  <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                    {selectedCount} Selected
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectedCount === files.length ? deselectAll : selectAll}
                    className="text-xs text-purple-700 hover:text-purple-800 font-semibold px-2 py-1 rounded-md hover:bg-purple-50 transition-colors cursor-pointer"
                  >
                    {selectedCount === files.length ? 'Deselect All' : 'Select All'}
                  </button>

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
                    type="button"
                    onClick={() => setFiles([])}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title="Remove all files"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Items grid with Manual Select checkboxes & Preview buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto pr-1">
                {files.map((item, idx) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl relative group transition-all border ${
                        isSelected 
                          ? 'bg-purple-50/50 border-purple-300 shadow-xs' 
                          : 'bg-gray-50 border-gray-200/80 opacity-75'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleSelect(item.id)}
                        className="cursor-pointer text-purple-600 hover:text-purple-700 shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-purple-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      <div 
                        onClick={() => setPreviewItem(item)}
                        className="w-12 h-12 rounded-xl bg-gray-200 overflow-hidden flex items-center justify-center shrink-0 border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                        title="Click to preview"
                      >
                        {item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pr-6">
                        <div className="font-semibold text-xs text-gray-800 truncate" title={item.name}>
                          {item.name}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {formatBytes(item.size)} • {item.type.replace('image/', '').toUpperCase() || 'IMG'}
                        </div>
                      </div>

                      {/* Action buttons on card */}
                      <div className="absolute right-2 top-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="p-1 text-gray-400 hover:text-purple-600 rounded-md hover:bg-purple-50 cursor-pointer"
                          title="Preview image"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-gray-300 hover:text-red-600 rounded-md hover:bg-red-50 cursor-pointer"
                          title="Delete file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Convert Controls */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-purple-600" />
                  <h3 className="font-bold text-gray-900 text-sm">Target Format</h3>
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  Instant
                </span>
              </div>

              {/* Quick Format Presets */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Quick Convert Presets
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTargetFormat('jpeg')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border text-left transition-colors cursor-pointer ${
                      targetFormat === 'jpeg'
                        ? 'border-purple-600 bg-purple-50 text-purple-900'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    JPG to JPEG
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetFormat('jpg')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border text-left transition-colors cursor-pointer ${
                      targetFormat === 'jpg'
                        ? 'border-purple-600 bg-purple-50 text-purple-900'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    JPEG to JPG
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetFormat('png')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border text-left transition-colors cursor-pointer ${
                      targetFormat === 'png'
                        ? 'border-purple-600 bg-purple-50 text-purple-900'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    To PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetFormat('pdf')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border text-left transition-colors cursor-pointer ${
                      targetFormat === 'pdf'
                        ? 'border-purple-600 bg-purple-50 text-purple-900'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    To PDF Document
                  </button>
                </div>
              </div>

              {/* Format selection */}
              <div className="space-y-2">
                {[
                  { id: 'jpg', title: 'JPG (.jpg)', desc: 'Standard compressed format for web & forms' },
                  { id: 'jpeg', title: 'JPEG (.jpeg)', desc: 'Full JPEG container format' },
                  { id: 'png', title: 'PNG (.png)', desc: 'Lossless format, supports transparency' },
                  { id: 'webp', title: 'WEBP (.webp)', desc: 'Ultra-efficient modern web format' },
                  { id: 'pdf', title: 'PDF Document (.pdf)', desc: 'Compile images into single or multi-page PDF', badge: 'Document' },
                ].map((fmt) => (
                  <div
                    key={fmt.id}
                    onClick={() => setTargetFormat(fmt.id as TargetFormatType)}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                      targetFormat === fmt.id
                        ? 'border-purple-600 bg-purple-50/60 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-gray-900">{fmt.title}</span>
                      {fmt.badge && (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                          {fmt.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">{fmt.desc}</p>
                  </div>
                ))}
              </div>

              {/* Quality slider for JPG / JPEG / WEBP */}
              {(targetFormat === 'jpg' || targetFormat === 'jpeg' || targetFormat === 'webp') && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Output Quality:
                    </label>
                    <span className="text-xs font-bold text-purple-600">{Math.round(quality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="1.0"
                    step="0.05"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
                  {error}
                </div>
              )}

              {/* Action Button */}
              <button
                id="execute-convert-btn"
                type="button"
                onClick={handleConvert}
                disabled={isProcessing || selectedCount === 0}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-bold rounded-full text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Converting ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>
                      Convert {selectedCount} Selected {selectedCount === 1 ? 'Image' : 'Images'} to {targetFormat.toUpperCase()}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Image Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-gray-900 text-sm truncate max-w-md">
                  {previewItem.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview image */}
            <div className="relative bg-gray-100 rounded-2xl p-4 flex items-center justify-center min-h-[300px] max-h-[440px] overflow-hidden">
              {isPreviewLoading ? (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  <span className="text-xs">Generating preview...</span>
                </div>
              ) : previewConvertedUrl ? (
                <img
                  src={previewConvertedUrl}
                  alt="Converted preview"
                  className="max-h-[380px] object-contain rounded-lg shadow-sm"
                />
              ) : previewItem.previewUrl ? (
                <img
                  src={previewItem.previewUrl}
                  alt={previewItem.name}
                  className="max-h-[380px] object-contain rounded-lg shadow-sm"
                />
              ) : (
                <div className="text-xs text-gray-400">Preview not available</div>
              )}
            </div>

            {/* Modal Info Bar & Download Single */}
            <div className="flex flex-wrap items-center justify-between text-xs gap-3 pt-2">
              <div className="text-gray-500">
                <span>Original: {formatBytes(previewItem.size)}</span>
                {previewConvertedSize && (
                  <span className="text-purple-700 font-bold ml-2">
                    → Converted ({targetFormat.toUpperCase()}): {formatBytes(previewConvertedSize)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="px-4 py-2 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 font-semibold cursor-pointer"
                >
                  Close
                </button>
                {previewConvertedUrl && (
                  <a
                    href={previewConvertedUrl}
                    download={`${previewItem.name.replace(/\.[^/.]+$/, '')}.${targetFormat}`}
                    className="px-4 py-2 rounded-xl text-white bg-purple-600 hover:bg-purple-700 font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download This Image</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
