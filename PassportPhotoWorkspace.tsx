import React, { useState, useEffect, useRef } from 'react';
import { 
  UserCheck, 
  Trash2, 
  Loader2, 
  Download, 
  ZoomIn, 
  Move, 
  RotateCw, 
  FileText, 
  Palette, 
  Calendar, 
  Printer, 
  Check, 
  Sparkles,
  Info
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes } from '../../services/pdfService';
import { loadImage, canvasToBlob } from '../../services/imageService';
import { 
  PASSPORT_PRESETS, 
  PassportPreset, 
  renderPassportPhoto, 
  generatePrintableSheet 
} from '../../services/govtPhotoService';

interface PassportPhotoWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

export const PassportPhotoWorkspace: React.FC<PassportPhotoWorkspaceProps> = ({ tool, onSuccess }) => {
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<PassportPreset>(PASSPORT_PRESETS[0]);
  
  // Custom dimensions
  const [customW, setCustomW] = useState(35);
  const [customH, setCustomH] = useState(45);
  
  // Transform states
  const [zoom, setZoom] = useState(1.15);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(-15);
  const [rotation, setRotation] = useState(0);
  const [showFaceGuide, setShowFaceGuide] = useState(true);

  // Background replacement
  const [bgColor, setBgColor] = useState('#ffffff');

  // Name & Date on photo
  const [addNameDate, setAddNameDate] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().split('T')[0]);

  // Output format
  const [outputMode, setOutputMode] = useState<'single' | '4x6-6' | '4x6-8' | 'a4-16' | 'a4-32'>('single');
  const [targetKb, setTargetKb] = useState<'none' | '50' | '100' | '200'>('none');

  const [isProcessing, setIsProcessing] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);

  const fileItem = files[0];

  // Load image element when file changes
  useEffect(() => {
    if (fileItem) {
      loadImage(fileItem.file).then((img) => {
        setLoadedImg(img);
        setPanX(0);
        setPanY(-15);
        setZoom(1.15);
      });
    } else {
      setLoadedImg(null);
      setPreviewDataUrl(null);
    }
  }, [fileItem]);

  // Re-render preview canvas whenever controls change
  useEffect(() => {
    if (!loadedImg) return;

    const targetW = selectedPreset.id === 'custom' ? Math.round(customW * 11.81) : selectedPreset.widthPx;
    const targetH = selectedPreset.id === 'custom' ? Math.round(customH * 11.81) : selectedPreset.heightPx;

    const singleCanvas = renderPassportPhoto(loadedImg, {
      targetWidth: targetW,
      targetHeight: targetH,
      zoom,
      panX,
      panY,
      rotation,
      bgColor,
      addNameDate,
      candidateName,
      photoDate,
      borderWidth: 1,
    });

    if (outputMode === 'single') {
      setPreviewDataUrl(singleCanvas.toDataURL('image/jpeg', 0.95));
    } else {
      const sheetCanvas = generatePrintableSheet(singleCanvas, outputMode);
      setPreviewDataUrl(sheetCanvas.toDataURL('image/jpeg', 0.92));
    }
  }, [
    loadedImg,
    selectedPreset,
    customW,
    customH,
    zoom,
    panX,
    panY,
    rotation,
    bgColor,
    addNameDate,
    candidateName,
    photoDate,
    outputMode,
  ]);

  const handleGenerate = async () => {
    if (!loadedImg || !fileItem) return;
    setIsProcessing(true);

    try {
      const targetW = selectedPreset.id === 'custom' ? Math.round(customW * 11.81) : selectedPreset.widthPx;
      const targetH = selectedPreset.id === 'custom' ? Math.round(customH * 11.81) : selectedPreset.heightPx;

      const singleCanvas = renderPassportPhoto(loadedImg, {
        targetWidth: targetW,
        targetHeight: targetH,
        zoom,
        panX,
        panY,
        rotation,
        bgColor,
        addNameDate,
        candidateName,
        photoDate,
        borderWidth: 1,
      });

      let finalCanvas = singleCanvas;
      if (outputMode !== 'single') {
        finalCanvas = generatePrintableSheet(singleCanvas, outputMode);
      }

      // Handle compression / quality
      let quality = 0.94;
      let blob = await canvasToBlob(finalCanvas, 'image/jpeg', quality);

      if (targetKb !== 'none') {
        const maxBytes = parseInt(targetKb, 10) * 1024;
        let q = 0.9;
        while (blob.size > maxBytes && q > 0.2) {
          q -= 0.1;
          blob = await canvasToBlob(finalCanvas, 'image/jpeg', q);
        }
      }

      const downloadUrl = URL.createObjectURL(blob);
      const baseName = fileItem.name.replace(/\.[^/.]+$/, '');
      const downloadName = outputMode === 'single'
        ? `${baseName}_passport_${selectedPreset.widthMm}x${selectedPreset.heightMm}mm.jpg`
        : `${baseName}_passport_sheet_${outputMode}.jpg`;

      onSuccess({
        title: outputMode === 'single' ? 'Passport Photo Ready' : 'Printable Passport Photo Sheet Ready',
        success: true,
        downloadUrl,
        downloadFilename: downloadName,
        downloadName,
        fileSize: blob.size,
        originalSize: fileItem.size,
        message: `Successfully generated ${outputMode === 'single' ? 'official passport photo' : 'printable photo sheet'} (${formatBytes(blob.size)})`,
        blob,
      });
    } catch (err: any) {
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
          title="Upload candidate portrait photo"
          subtitle="Supports JPG, PNG, WEBP. Front-facing photo recommended."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left / Top: Interactive Live Preview with Face Guide */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Live Biometric Preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFaceGuide(!showFaceGuide)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    showFaceGuide ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {showFaceGuide ? 'Face Guide: ON' : 'Face Guide: OFF'}
                </button>
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

            {/* Canvas / Preview Container */}
            <div className="relative bg-gray-100/80 border border-gray-200 rounded-xl p-4 flex items-center justify-center min-h-[380px] w-full overflow-hidden">
              {previewDataUrl ? (
                <div className="relative shadow-md rounded-sm overflow-hidden bg-white max-h-[420px]">
                  <img
                    src={previewDataUrl}
                    alt="Passport Photo Preview"
                    className="max-h-[400px] object-contain block select-none"
                  />

                  {/* Face Framing Biometric Overlay Guide */}
                  {showFaceGuide && outputMode === 'single' && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                      {/* Biometric Oval */}
                      <div className="w-[58%] h-[68%] border-2 border-dashed border-amber-400/90 rounded-[50%] -translate-y-4 flex flex-col justify-between py-2 items-center">
                        <span className="text-[9px] font-bold bg-amber-400 text-amber-950 px-1 rounded-xs -mt-3.5">
                          Top of Head
                        </span>
                        <div className="w-full border-t border-dotted border-blue-400/60" />
                        <span className="text-[9px] font-bold bg-amber-400 text-amber-950 px-1 rounded-xs -mb-3.5">
                          Chin Line
                        </span>
                      </div>
                      {/* Center Crosshair */}
                      <div className="absolute top-1/2 left-0 right-0 border-t border-red-400/30" />
                      <div className="absolute left-1/2 top-0 bottom-0 border-l border-red-400/30" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="text-xs">Rendering preview...</span>
                </div>
              )}
            </div>

            {/* Quick Helper Tip */}
            <div className="mt-3 flex items-start gap-2 text-[11px] text-gray-500 w-full bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>ICAO Biometric Standard:</strong> Center the head inside the oval guide. The face should occupy 70% - 80% of the photograph height. Use sliders below to align.
              </span>
            </div>

            {/* Align & Framing Sliders */}
            <div className="w-full mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span className="flex items-center gap-1"><ZoomIn className="w-3.5 h-3.5 text-gray-500" /> Face Zoom</span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span className="flex items-center gap-1"><Move className="w-3.5 h-3.5 text-gray-500" /> Vertical Position</span>
                  <span>{panY} px</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={panY}
                  onChange={(e) => setPanY(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span className="flex items-center gap-1"><Move className="w-3.5 h-3.5 text-gray-500" /> Horizontal Position</span>
                  <span>{panX} px</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={panX}
                  onChange={(e) => setPanX(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span className="flex items-center gap-1"><RotateCw className="w-3.5 h-3.5 text-gray-500" /> Straighten / Rotate</span>
                  <span>{rotation}°</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                    className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold"
                    title="Rotate 90 deg"
                  >
                    90°
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Specifications & Output Options */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Country / Preset Selection */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>1. Passport & Visa Specification</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {PASSPORT_PRESETS.slice(0, 6).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPreset(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedPreset.id === preset.id
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="font-bold text-xs">{preset.name}</div>
                    <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                      {preset.widthMm} x {preset.heightMm} mm
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Background Color */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-purple-600" />
                <span>2. Official Background Color</span>
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Pure White', color: '#ffffff', border: 'border-gray-300' },
                  { label: 'Light Blue', color: '#cce6ff', border: 'border-blue-200' },
                  { label: 'Light Grey', color: '#f3f4f6', border: 'border-gray-200' },
                  { label: 'Off-White', color: '#fdfbf7', border: 'border-amber-100' },
                ].map((bg) => (
                  <button
                    key={bg.color}
                    type="button"
                    onClick={() => setBgColor(bg.color)}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
                      bgColor === bg.color
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full border ${bg.border} shadow-xs`}
                      style={{ backgroundColor: bg.color }}
                    />
                    <span className="text-[10px] font-medium text-gray-700">{bg.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Candidate Name & Date Strip (Govt Exam Requirement) */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>3. Add Name / Date on Photo</span>
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addNameDate}
                    onChange={(e) => setAddNameDate(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {addNameDate && (
                <div className="space-y-2.5 pt-2 animate-in fade-in">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Applicant Name (e.g. AMIT SHARMA)
                    </label>
                    <input
                      type="text"
                      placeholder="ENTER FULL NAME"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs uppercase font-medium focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Date of Photo (DOP)
                    </label>
                    <input
                      type="date"
                      value={photoDate}
                      onChange={(e) => setPhotoDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Output Sheet vs Single Photo */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-amber-600" />
                <span>4. Print Layout & Sheet Format</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'single', label: 'Single Photo', desc: 'Single file for online portal' },
                  { id: '4x6-6', label: '4x6" Sheet (6 Photos)', desc: 'Standard glossy photo paper' },
                  { id: '4x6-8', label: '4x6" Sheet (8 Photos)', desc: 'Compact passport grid' },
                  { id: 'a4-16', label: 'A4 Sheet (16 Photos)', desc: 'Standard A4 document paper' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setOutputMode(fmt.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      outputMode === fmt.id
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="font-bold text-xs">{fmt.label}</div>
                    <div className="text-[10px] text-gray-500">{fmt.desc}</div>
                  </button>
                ))}
              </div>

              {/* Portal File Size Limit Preset */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <label className="text-[11px] font-semibold text-gray-600 block mb-1.5">
                  Portal File Size Constraint
                </label>
                <div className="flex gap-2">
                  {[
                    { id: 'none', label: 'Max Quality (300 DPI)' },
                    { id: '50', label: '< 50 KB' },
                    { id: '100', label: '< 100 KB' },
                    { id: '200', label: '< 200 KB' },
                  ].map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setTargetKb(size.id as any)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        targetKb === size.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              id="passport-photo-download-btn"
              type="button"
              disabled={isProcessing}
              onClick={handleGenerate}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Official Photo...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download {outputMode === 'single' ? 'Passport Photo' : 'Printable Sheet'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
