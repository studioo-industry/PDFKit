import React, { useState, useEffect } from 'react';
import { 
  Scaling, 
  FileText, 
  Trash2, 
  Loader2, 
  Lock, 
  Unlock, 
  Sliders, 
  Sparkles, 
  Download,
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes, resizePdf } from '../../services/pdfService';
import { PDFDocument } from 'pdf-lib';
import { PdfThumbnailPreview } from '../preview/PdfThumbnailPreview';

interface ResizePdfWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

type DimensionUnit = 'mm' | 'cm' | 'in' | 'pt';
type ResizeTab = 'dimensions' | 'filesize' | 'both';

// Conversion factors to points (1 pt = 1/72 inch)
const UNIT_TO_POINTS: Record<DimensionUnit, number> = {
  pt: 1,
  in: 72,
  mm: 72 / 25.4, // 2.83465 pt/mm
  cm: 72 / 2.54, // 28.3465 pt/cm
};

const POINTS_TO_UNIT = (pts: number, unit: DimensionUnit): number => {
  return parseFloat((pts / UNIT_TO_POINTS[unit]).toFixed(1));
};

export const ResizePdfWorkspace: React.FC<ResizePdfWorkspaceProps> = ({ tool, onSuccess }) => {
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [activeTab, setActiveTab] = useState<ResizeTab>('dimensions');

  // Page dimension states
  const [unit, setUnit] = useState<DimensionUnit>('mm');
  const [width, setWidth] = useState<number>(210); // A4 default in mm
  const [height, setHeight] = useState<number>(297);
  const [origWidthPt, setOrigWidthPt] = useState<number>(595.28);
  const [origHeightPt, setOrigHeightPt] = useState<number>(841.89);
  const [lockAspect, setLockAspect] = useState<boolean>(true);
  const [pageCount, setPageCount] = useState<number>(1);

  // File size customization states (1KB to 5MB)
  const [targetSizeVal, setTargetSizeVal] = useState<number>(500);
  const [targetSizeUnit, setTargetSizeUnit] = useState<'KB' | 'MB'>('KB');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const fileItem = files[0];

  // Inspect first page dimensions upon file upload
  useEffect(() => {
    if (fileItem) {
      fileItem.file.arrayBuffer().then(async (ab) => {
        try {
          const doc = await PDFDocument.load(ab, { ignoreEncryption: true });
          const pages = doc.getPages();
          setPageCount(pages.length);
          if (pages.length > 0) {
            const first = pages[0];
            const wPt = first.getWidth();
            const hPt = first.getHeight();
            setOrigWidthPt(wPt);
            setOrigHeightPt(hPt);
            setWidth(POINTS_TO_UNIT(wPt, unit));
            setHeight(POINTS_TO_UNIT(hPt, unit));
          }
        } catch (e) {
          console.warn('Could not read PDF metadata:', e);
        }
      });
    }
  }, [fileItem?.file]);

  // Handle unit switch
  const handleUnitChange = (newUnit: DimensionUnit) => {
    // Convert current width and height in points to the new unit
    const curWidthPt = width * UNIT_TO_POINTS[unit];
    const curHeightPt = height * UNIT_TO_POINTS[unit];
    setUnit(newUnit);
    setWidth(parseFloat((curWidthPt / UNIT_TO_POINTS[newUnit]).toFixed(1)));
    setHeight(parseFloat((curHeightPt / UNIT_TO_POINTS[newUnit]).toFixed(1)));
  };

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (lockAspect && origWidthPt > 0) {
      const ratio = origHeightPt / origWidthPt;
      setHeight(parseFloat((val * ratio).toFixed(1)));
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (lockAspect && origHeightPt > 0) {
      const ratio = origWidthPt / origHeightPt;
      setWidth(parseFloat((val * ratio).toFixed(1)));
    }
  };

  const applyPreset = (presetW: number, presetH: number, presetUnit: DimensionUnit) => {
    setUnit(presetUnit);
    setWidth(presetW);
    setHeight(presetH);
  };

  const getTargetSizeKB = (): number => {
    if (targetSizeUnit === 'MB') {
      return Math.min(5120, Math.max(1, targetSizeVal * 1024));
    }
    return Math.min(5120, Math.max(1, targetSizeVal));
  };

  const handleResize = async () => {
    if (!fileItem) return;

    setError(null);
    setIsProcessing(true);
    setProgress(10);

    try {
      const targetWidthPt = (activeTab === 'dimensions' || activeTab === 'both')
        ? width * UNIT_TO_POINTS[unit]
        : undefined;

      const targetHeightPt = (activeTab === 'dimensions' || activeTab === 'both')
        ? height * UNIT_TO_POINTS[unit]
        : undefined;

      const targetSizeKB = (activeTab === 'filesize' || activeTab === 'both')
        ? getTargetSizeKB()
        : undefined;

      const res = await resizePdf(
        fileItem.file,
        {
          targetWidthPt,
          targetHeightPt,
          maintainAspect: lockAspect,
          targetSizeKB,
        },
        (p) => setProgress(p)
      );

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const cleanName = fileItem.name.replace(/\.pdf$/i, '');
      const downloadFilename = targetSizeKB
        ? `${cleanName}_resized_${Math.round(targetSizeKB)}kb.pdf`
        : `${cleanName}_resized_${Math.round(width)}x${Math.round(height)}${unit}.pdf`;

      onSuccess({
        title: targetSizeKB 
          ? `PDF resized to ${formatBytes(res.newSize)} (Target: ${formatBytes(targetSizeKB * 1024)})!`
          : `PDF resized to ${width} × ${height} ${unit}!`,
        success: true,
        downloadUrl,
        downloadFilename,
        fileSize: res.newSize,
        originalSize: res.originalSize,
        blob,
      });
    } catch (err: any) {
      console.error('PDF resize failed:', err);
      setError(err?.message || 'Failed to resize PDF document.');
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
          title="Drop PDF file to resize"
          subtitle="Resize page dimensions manually (W×H) or customize file size between 1KB and 5MB."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Preview & Document Details */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="font-bold text-gray-900 text-sm">Document Info</span>
                <button
                  onClick={() => setFiles([])}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-50/60 border border-blue-100 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-gray-900 truncate" title={fileItem.name}>
                    {fileItem.name}
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {pageCount} {pageCount === 1 ? 'Page' : 'Pages'} • {formatBytes(fileItem.size)}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Original Size:</span>
                  <span className="font-bold text-gray-800">{formatBytes(fileItem.size)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Original Page:</span>
                  <span className="font-bold text-gray-800">
                    {POINTS_TO_UNIT(origWidthPt, 'mm')} × {POINTS_TO_UNIT(origHeightPt, 'mm')} mm
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Points (DPI 72):</span>
                  <span className="font-mono text-[11px] text-gray-700">
                    {Math.round(origWidthPt)} × {Math.round(origHeightPt)} pt
                  </span>
                </div>
              </div>
            </div>

            {/* PDF Thumbnail Preview via react-pdf */}
            <PdfThumbnailPreview
              file={fileItem.file}
              fileName={fileItem.name}
              fileSize={fileItem.size}
              title="Visual Layout Preview"
              subtitle="Preview document before resizing"
            />
          </div>

          {/* Right Resize Controls */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Scaling className="w-4 h-4 text-teal-600" />
                  <h3 className="font-bold text-gray-900 text-sm font-google">PDF Resize Options</h3>
                </div>
                <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  Custom W×H & 1KB–5MB
                </span>
              </div>

              {/* Mode Switcher */}
              <div className="grid grid-cols-3 p-1 bg-gray-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('dimensions')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    activeTab === 'dimensions'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Page Size (W×H)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('filesize')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    activeTab === 'filesize'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Target Size (1KB–5MB)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('both')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    activeTab === 'both'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Both Combined
                </button>
              </div>

              {/* 1. Page Dimensions Manual Inputs */}
              {(activeTab === 'dimensions' || activeTab === 'both') && (
                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Page Dimensions (Write Manually)
                    </label>

                    {/* Unit Switcher */}
                    <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[11px]">
                      {(['mm', 'cm', 'in', 'pt'] as DimensionUnit[]).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => handleUnitChange(u)}
                          className={`px-2 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                            unit === u
                              ? 'bg-white text-teal-700 shadow-xs'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          {u.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual Width & Height Inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Width ({unit})
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="5000"
                        value={width}
                        onChange={(e) => handleWidthChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 focus:border-teal-500 rounded-xl text-sm font-semibold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Height ({unit})
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="5000"
                        value={height}
                        onChange={(e) => handleHeightChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 focus:border-teal-500 rounded-xl text-sm font-semibold outline-none"
                      />
                    </div>
                  </div>

                  {/* Lock Aspect Ratio */}
                  <button
                    type="button"
                    onClick={() => setLockAspect(!lockAspect)}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                      lockAspect
                        ? 'bg-teal-50 border-teal-200 text-teal-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    {lockAspect ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>{lockAspect ? 'Maintain Proportions (Fit inside page)' : 'Free Aspect Ratio (Custom Width & Height)'}</span>
                  </button>

                  {/* Quick Preset Buttons */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Standard Page Presets
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: 'A4', w: 210, h: 297, u: 'mm' as DimensionUnit, desc: '210 × 297 mm' },
                        { label: 'US Letter', w: 8.5, h: 11, u: 'in' as DimensionUnit, desc: '8.5 × 11 in' },
                        { label: 'Legal', w: 8.5, h: 14, u: 'in' as DimensionUnit, desc: '8.5 × 14 in' },
                        { label: 'A3', w: 297, h: 420, u: 'mm' as DimensionUnit, desc: '297 × 420 mm' },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => applyPreset(p.w, p.h, p.u)}
                          className="p-2 bg-gray-50 hover:bg-teal-50 hover:border-teal-300 border border-gray-200 rounded-xl text-left transition-colors cursor-pointer"
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
              {(activeTab === 'filesize' || activeTab === 'both') && (
                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Customise Target File Size (1 KB to 5 MB)
                    </label>
                    <span className="text-xs font-bold text-teal-600">
                      Target: {targetSizeVal} {targetSizeUnit} ({formatBytes(getTargetSizeKB() * 1024)})
                    </span>
                  </div>

                  {/* Manual Target Input with KB/MB toggle */}
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
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 focus:border-teal-500 rounded-xl text-sm font-semibold outline-none"
                        placeholder="Enter target size"
                      />
                    </div>
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetSizeUnit('KB');
                          if (targetSizeVal > 5120) setTargetSizeVal(500);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          targetSizeUnit === 'KB' ? 'bg-white text-teal-700 shadow-xs' : 'text-gray-600'
                        }`}
                      >
                        KB
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetSizeUnit('MB');
                          if (targetSizeVal > 5) setTargetSizeVal(2);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          targetSizeUnit === 'MB' ? 'bg-white text-teal-700 shadow-xs' : 'text-gray-600'
                        }`}
                      >
                        MB
                      </button>
                    </div>
                  </div>

                  {/* Target Size Presets (1KB to 5MB) */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Popular Target Sizes
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                      {[
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
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
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
                    💡 Smart optimizer automatically tunes raster resolution and compression streams to fit your PDF under your target size constraint.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
                  {error}
                </div>
              )}

              {/* Submit & Download Button */}
              <button
                id="execute-resize-pdf-btn"
                onClick={handleResize}
                disabled={isProcessing || !fileItem}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-bold rounded-full text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing PDF ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Scaling className="w-4 h-4" />
                    <span>Resize PDF & Download</span>
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
