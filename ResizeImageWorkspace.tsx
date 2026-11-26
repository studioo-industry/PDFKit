import React, { useState, useEffect } from 'react';
import { 
  Scaling, 
  Lock, 
  Unlock, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Plus, 
  Image as ImageIcon,
  Sliders,
  Sparkles,
  Download
} from 'lucide-react';
import JSZip from 'jszip';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes } from '../../services/pdfService';
import { getImageDimensions, resizeImage, resizeImageToTargetFileSize } from '../../services/imageService';
import { usePremium } from '../../context/PremiumContext';

interface ResizeImageWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

type ResizeTab = 'dimensions' | 'filesize' | 'percentage';
type ImageDimensionUnit = 'px' | 'mm' | 'cm' | 'in';

export const ResizeImageWorkspace: React.FC<ResizeImageWorkspaceProps> = ({ tool, onSuccess }) => {
  const { isPremium } = usePremium();
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [activeTab, setActiveTab] = useState<ResizeTab>('dimensions');
  
  // Dimensions for primary file
  const [origWidthPx, setOrigWidthPx] = useState(1920);
  const [origHeightPx, setOrigHeightPx] = useState(1080);
  const [unit, setUnit] = useState<ImageDimensionUnit>('px');
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [dpi, setDpi] = useState(300); // 300 DPI standard for physical print/passport
  const [lockAspect, setLockAspect] = useState(true);

  // Percentage mode
  const [percentage, setPercentage] = useState(50);

  // Target file size mode (1KB to 5MB)
  const [targetSizeVal, setTargetSizeVal] = useState(50); // default 50KB (common passport/govt portal)
  const [targetSizeUnit, setTargetSizeUnit] = useState<'KB' | 'MB'>('KB');

  // Format
  const [format, setFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Helper to convert between units and pixels
  const pxToUnit = (pixels: number, targetUnit: ImageDimensionUnit): number => {
    if (targetUnit === 'px') return Math.round(pixels);
    if (targetUnit === 'in') return parseFloat((pixels / dpi).toFixed(2));
    if (targetUnit === 'mm') return parseFloat(((pixels / dpi) * 25.4).toFixed(1));
    if (targetUnit === 'cm') return parseFloat(((pixels / dpi) * 2.54).toFixed(2));
    return pixels;
  };

  const unitToPx = (value: number, sourceUnit: ImageDimensionUnit): number => {
    if (sourceUnit === 'px') return Math.round(value);
    if (sourceUnit === 'in') return Math.round(value * dpi);
    if (sourceUnit === 'mm') return Math.round((value / 25.4) * dpi);
    if (sourceUnit === 'cm') return Math.round((value / 2.54) * dpi);
    return Math.round(value);
  };

  // Load natural dimensions when first file arrives
  useEffect(() => {
    if (files.length > 0) {
      getImageDimensions(files[0].file).then(({ width: w, height: h }) => {
        setOrigWidthPx(w);
        setOrigHeightPx(h);
        setWidth(pxToUnit(w, unit));
        setHeight(pxToUnit(h, unit));
      }).catch((e) => console.error('Error reading image dims:', e));
    }
  }, [files[0]?.file]);

  const handleUnitChange = (newUnit: ImageDimensionUnit) => {
    // Current width and height in px
    const curPxW = unitToPx(width, unit);
    const curPxH = unitToPx(height, unit);
    setUnit(newUnit);
    setWidth(pxToUnit(curPxW, newUnit));
    setHeight(pxToUnit(curPxH, newUnit));
  };

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (lockAspect && origWidthPx > 0) {
      const ratio = origHeightPx / origWidthPx;
      const calculatedH = val * ratio;
      setHeight(unit === 'px' ? Math.round(calculatedH) : parseFloat(calculatedH.toFixed(1)));
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (lockAspect && origHeightPx > 0) {
      const ratio = origWidthPx / origHeightPx;
      const calculatedW = val * ratio;
      setWidth(unit === 'px' ? Math.round(calculatedW) : parseFloat(calculatedW.toFixed(1)));
    }
  };

  const applyPreset = (w: number, h: number, u: ImageDimensionUnit) => {
    setUnit(u);
    setWidth(w);
    setHeight(h);
  };

  const getTargetSizeKB = (): number => {
    if (targetSizeUnit === 'MB') {
      return Math.min(5120, Math.max(1, targetSizeVal * 1024));
    }
    return Math.min(5120, Math.max(1, targetSizeVal));
  };

  const handleResize = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress(15);
    setError(null);

    try {
      const results: { name: string; blob: Blob; url: string; size: number }[] = [];
      const total = files.length;
      const targetSizeKB = activeTab === 'filesize' ? getTargetSizeKB() : undefined;

      for (let i = 0; i < total; i++) {
        const file = files[i].file;
        let dims = { width: origWidthPx || 1920, height: origHeightPx || 1080 };
        try {
          dims = await getImageDimensions(file);
        } catch (dimErr) {
          console.warn('Could not read image dims directly, using fallback:', dimErr);
        }

        if (activeTab === 'filesize' && targetSizeKB) {
          // Customise size between 1KB and 5MB
          const res = await resizeImageToTargetFileSize(file, {
            targetSizeKB,
            format,
          });

          results.push({
            name: res.filename,
            blob: res.blob,
            url: res.dataUrl,
            size: res.actualSize,
          });
        } else {
          // Pixels or Percentage dimensions
          const rawWPx = unitToPx(width, unit);
          const rawHPx = unitToPx(height, unit);
          let targetWPx = !isNaN(rawWPx) && rawWPx >= 1 ? Math.round(rawWPx) : (dims.width || origWidthPx || 800);
          let targetHPx = !isNaN(rawHPx) && rawHPx >= 1 ? Math.round(rawHPx) : (dims.height || origHeightPx || 600);

          if (activeTab === 'percentage') {
            const factor = Math.max(0.01, (percentage || 50) / 100);
            targetWPx = Math.max(1, Math.round(dims.width * factor));
            targetHPx = Math.max(1, Math.round(dims.height * factor));
          } else if (i > 0) {
            // Scale subsequent files proportionally
            const ratio = origWidthPx && origWidthPx > 0 ? targetWPx / origWidthPx : 1;
            targetWPx = Math.max(1, Math.round(dims.width * ratio));
            targetHPx = Math.max(1, Math.round(dims.height * ratio));
          }

          const res = await resizeImage(file, {
            width: targetWPx,
            height: targetHPx,
            format,
          });

          results.push({
            name: res.filename,
            blob: res.blob,
            url: res.dataUrl,
            size: res.blob.size,
          });
        }

        setProgress(Math.round(((i + 1) / total) * 85));
      }

      if (results.length === 1) {
        const single = results[0];
        const downloadUrl = URL.createObjectURL(single.blob);
        const title = targetSizeKB
          ? `Image resized to ${formatBytes(single.size)} (Target: ${formatBytes(targetSizeKB * 1024)})!`
          : `Image resized to ${Math.round(unitToPx(width, unit))} × ${Math.round(unitToPx(height, unit))} px!`;

        onSuccess({
          title,
          success: true,
          downloadUrl,
          downloadFilename: single.name,
          fileSize: single.size,
          originalSize: files[0].size,
          blob: single.blob,
        });
      } else {
        const zip = new JSZip();
        results.forEach((r) => zip.file(r.name, r.blob));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);

        onSuccess({
          title: `${results.length} images resized successfully!`,
          success: true,
          downloadUrl: zipUrl,
          downloadFilename: 'resized_images.zip',
          zipBlob,
          fileSize: zipBlob.size,
          multipleFiles: results,
        });
      }
    } catch (err: any) {
      console.error('Resize error:', err);
      setError(err?.message || 'Failed to resize images.');
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
          title="Drop images to resize"
          subtitle="Resize by height & width manually (px, mm, cm, in) or customise file size from 1KB to 5MB."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Preview List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="font-bold text-gray-900 text-sm">
                  {files.length} {files.length === 1 ? 'Image' : 'Images'} Selected
                </span>

                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
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

              {/* Main image live preview */}
              <div className="bg-gray-900/5 border border-gray-200/80 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[220px] overflow-hidden relative">
                {files[0]?.previewUrl && (
                  <img
                    src={files[0].previewUrl}
                    alt={files[0].name}
                    className="max-h-56 object-contain rounded-lg shadow-xs"
                  />
                )}
                <div className="mt-2 text-center">
                  <div className="text-xs font-bold text-gray-800 truncate max-w-[200px]" title={files[0]?.name}>
                    {files[0]?.name}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Original: {origWidthPx} × {origHeightPx} px ({formatBytes(files[0]?.size || 0)})
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Resize Controls */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Scaling className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-gray-900 text-sm font-google">Image Resize Controls</h3>
                </div>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Manual W×H & 1KB–5MB
                </span>
              </div>

              {/* Mode Switcher */}
              <div className="grid grid-cols-3 p-1 bg-gray-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('dimensions')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    activeTab === 'dimensions' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Write Width & Height
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('filesize')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    activeTab === 'filesize' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Target Size (1KB–5MB)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('percentage')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    activeTab === 'percentage' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Percentage (%)
                </button>
              </div>

              {/* 1. Manual Width & Height */}
              {activeTab === 'dimensions' && (
                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Dimensions (Manual Write)
                    </label>

                    {/* Unit Switcher */}
                    <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[11px]">
                      {(['px', 'mm', 'cm', 'in'] as ImageDimensionUnit[]).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => handleUnitChange(u)}
                          className={`px-2 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                            unit === u
                              ? 'bg-white text-blue-700 shadow-xs'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          {u.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Width ({unit})
                      </label>
                      <input
                        type="number"
                        step={unit === 'px' ? '1' : '0.1'}
                        min="1"
                        max="20000"
                        value={width}
                        onChange={(e) => handleWidthChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 focus:border-blue-500 rounded-xl text-sm font-semibold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Height ({unit})
                      </label>
                      <input
                        type="number"
                        step={unit === 'px' ? '1' : '0.1'}
                        min="1"
                        max="20000"
                        value={height}
                        onChange={(e) => handleHeightChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 focus:border-blue-500 rounded-xl text-sm font-semibold outline-none"
                      />
                    </div>
                  </div>

                  {/* Lock Aspect Ratio */}
                  <button
                    type="button"
                    onClick={() => setLockAspect(!lockAspect)}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                      lockAspect
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    {lockAspect ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>{lockAspect ? 'Maintain Proportions (Aspect Ratio Locked)' : 'Custom Free Ratio (Unlocked)'}</span>
                  </button>

                  {/* Standard Presets */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Popular Size Presets
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: 'Passport Photo', w: 35, h: 45, u: 'mm' as ImageDimensionUnit, desc: '35 × 45 mm' },
                        { label: 'US Visa / 2×2 in', w: 2, h: 2, u: 'in' as ImageDimensionUnit, desc: '51 × 51 mm' },
                        { label: 'Instagram Square', w: 1080, h: 1080, u: 'px' as ImageDimensionUnit, desc: '1080 × 1080 px' },
                        { label: 'Full HD 1080p', w: 1920, h: 1080, u: 'px' as ImageDimensionUnit, desc: '1920 × 1080 px' },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => applyPreset(p.w, p.h, p.u)}
                          className="p-2 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 border border-gray-200 rounded-xl text-left transition-colors cursor-pointer"
                        >
                          <div className="text-xs font-bold text-gray-800">{p.label}</div>
                          <div className="text-[10px] text-gray-500">{p.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Target File Size (1 KB to 5 MB) */}
              {activeTab === 'filesize' && (
                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Customise Target File Size (1 KB to 5 MB)
                    </label>
                    <span className="text-xs font-bold text-blue-600">
                      Target: {targetSizeVal} {targetSizeUnit} ({formatBytes(getTargetSizeKB() * 1024)})
                    </span>
                  </div>

                  {/* Manual input + KB/MB switch */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <input
                        type="number"
                        min="1"
                        max={targetSizeUnit === 'MB' ? 5 : 5120}
                        value={targetSizeVal}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setTargetSizeVal(targetSizeUnit === 'MB' ? Math.min(5, val) : Math.min(5120, val));
                        }}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 focus:border-blue-500 rounded-xl text-sm font-semibold outline-none"
                        placeholder="Enter target file size"
                      />
                    </div>
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetSizeUnit('KB');
                          if (targetSizeVal > 5120) setTargetSizeVal(50);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          targetSizeUnit === 'KB' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600'
                        }`}
                      >
                        KB
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetSizeUnit('MB');
                          if (targetSizeVal > 5) setTargetSizeVal(1);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          targetSizeUnit === 'MB' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600'
                        }`}
                      >
                        MB
                      </button>
                    </div>
                  </div>

                  {/* Preset Size Buttons (1KB to 5MB) */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Popular Target Sizes
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                      {[
                        { label: '20 KB', kb: 20 },
                        { label: '50 KB', kb: 50 },
                        { label: '100 KB', kb: 100 },
                        { label: '200 KB', kb: 200 },
                        { label: '500 KB', kb: 500 },
                        { label: '1 MB', kb: 1024 },
                        { label: '2 MB', kb: 2048 },
                        { label: '5 MB', kb: 5120 },
                      ].map((sz) => {
                        const isSelected = getTargetSizeKB() === sz.kb;
                        return (
                          <button
                            key={sz.label}
                            type="button"
                            onClick={() => {
                              if (sz.kb >= 1024) {
                                setTargetSizeUnit('MB');
                                setTargetSizeVal(Math.round(sz.kb / 1024));
                              } else {
                                setTargetSizeUnit('KB');
                                setTargetSizeVal(sz.kb);
                              }
                            }}
                            className={`py-1.5 px-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {sz.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-200/80">
                    💡 Perfect for online forms and government portals with strict file size caps (e.g. 20KB or 50KB). The optimizer calibrates quality and resolution to match your exact file size.
                  </p>
                </div>
              )}

              {/* 3. Percentage Mode */}
              {activeTab === 'percentage' && (
                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Scale Percentage:
                    </label>
                    <span className="text-sm font-bold text-blue-600">{percentage}%</span>
                  </div>

                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={percentage}
                    onChange={(e) => setPercentage(parseInt(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />

                  <div className="grid grid-cols-4 gap-1.5">
                    {[25, 50, 75, 150].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setPercentage(pct)}
                        className={`py-1.5 rounded-lg text-xs font-bold border ${
                          percentage === pct
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600">
                    New resolution: ~{Math.round(origWidthPx * (percentage / 100))} × {Math.round(origHeightPx * (percentage / 100))} px
                  </div>
                </div>
              )}

              {/* Format selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Target Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['image/jpeg', 'image/png', 'image/webp'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormat(fmt)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        format === fmt
                          ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
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

              {/* Submit & Download button */}
              <button
                id="execute-resize-btn"
                onClick={handleResize}
                disabled={isProcessing || files.length === 0}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-full text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resizing ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Scaling className="w-4 h-4" />
                    <span>
                      {activeTab === 'filesize' 
                        ? `Resize to ~${targetSizeVal}${targetSizeUnit} & Download`
                        : `Resize ${files.length} ${files.length === 1 ? 'Image' : 'Images'} & Download`}
                    </span>
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
