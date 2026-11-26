import React, { useState, useEffect } from 'react';
import { 
  Vote, 
  Trash2, 
  Loader2, 
  Download, 
  ZoomIn, 
  Move, 
  RotateCw, 
  Calendar, 
  Printer, 
  Check, 
  ShieldCheck,
  Sparkles,
  Info
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes } from '../../services/pdfService';
import { loadImage, canvasToBlob } from '../../services/imageService';
import { renderPassportPhoto, generatePrintableSheet } from '../../services/govtPhotoService';

interface VoterIdPhotoWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

export const VoterIdPhotoWorkspace: React.FC<VoterIdPhotoWorkspaceProps> = ({ tool, onSuccess }) => {
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  
  // Voter ID specs: Form 6 NVSP standard is 3.2cm x 2.4cm (portrait 2.4x3.2 or 3.2x2.4) or 3.5cm x 4.5cm
  const [specMode, setSpecMode] = useState<'nvsp-32x24' | 'standard-35x45'>('nvsp-32x24');

  // Zoom, pan & rotation
  const [zoom, setZoom] = useState(1.1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(-10);
  const [rotation, setRotation] = useState(0);

  // Background
  const [bgColor, setBgColor] = useState('#ffffff');

  // Name & Date on photo
  const [addNameDate, setAddNameDate] = useState(true);
  const [candidateName, setCandidateName] = useState('');
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().split('T')[0]);

  // Output
  const [outputMode, setOutputMode] = useState<'single' | '4x6-6' | 'a4-16'>('single');
  const [maxKb, setMaxKb] = useState<'50' | '100' | '200'>('50'); // NVSP strictly requires < 50KB

  const [isProcessing, setIsProcessing] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);

  const fileItem = files[0];

  useEffect(() => {
    if (fileItem) {
      loadImage(fileItem.file).then((img) => {
        setLoadedImg(img);
        setPanX(0);
        setPanY(-10);
        setZoom(1.1);
      });
    } else {
      setLoadedImg(null);
      setPreviewDataUrl(null);
    }
  }, [fileItem]);

  // Render preview
  useEffect(() => {
    if (!loadedImg) return;

    const targetW = specMode === 'nvsp-32x24' ? 378 : 413;
    const targetH = specMode === 'nvsp-32x24' ? 472 : 531;

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
      setPreviewDataUrl(singleCanvas.toDataURL('image/jpeg', 0.92));
    } else {
      const sheetCanvas = generatePrintableSheet(singleCanvas, outputMode);
      setPreviewDataUrl(sheetCanvas.toDataURL('image/jpeg', 0.92));
    }
  }, [
    loadedImg,
    specMode,
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
      const targetW = specMode === 'nvsp-32x24' ? 378 : 413;
      const targetH = specMode === 'nvsp-32x24' ? 472 : 531;

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

      // Strict compression for NVSP portal (< 50KB or 100KB)
      const targetLimitBytes = parseInt(maxKb, 10) * 1024;
      let quality = 0.92;
      let blob = await canvasToBlob(finalCanvas, 'image/jpeg', quality);

      while (blob.size > targetLimitBytes && quality > 0.15) {
        quality -= 0.08;
        blob = await canvasToBlob(finalCanvas, 'image/jpeg', quality);
      }

      const downloadUrl = URL.createObjectURL(blob);
      const baseName = fileItem.name.replace(/\.[^/.]+$/, '');
      const downloadName = outputMode === 'single'
        ? `${baseName}_voter_id_${specMode}.jpg`
        : `${baseName}_voter_id_sheet_${outputMode}.jpg`;

      onSuccess({
        title: 'Voter ID Photo Ready',
        success: true,
        downloadUrl,
        downloadFilename: downloadName,
        downloadName,
        fileSize: blob.size,
        originalSize: fileItem.size,
        message: `Voter ID photo ready for NVSP portal upload (${formatBytes(blob.size)}, strictly under ${maxKb}KB)`,
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
          title="Upload photo for Voter ID Card"
          subtitle="Election Commission of India NVSP Form 6 & Form 8 official specs"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Preview */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Vote className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Election Commission Voter ID Preview
                </span>
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

            <div className="relative bg-gray-100/80 border border-gray-200 rounded-xl p-4 flex items-center justify-center min-h-[360px] w-full">
              {previewDataUrl ? (
                <div className="shadow-md rounded-sm overflow-hidden bg-white max-h-[400px]">
                  <img
                    src={previewDataUrl}
                    alt="Voter ID Preview"
                    className="max-h-[380px] object-contain block select-none"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <span className="text-xs">Generating photo...</span>
                </div>
              )}
            </div>

            {/* NVSP Compliance Badge */}
            <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-800 w-full bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>ECI Form-6 Compliant:</strong> Plain white background, centered frontal face, compressed under {maxKb} KB.
              </span>
            </div>

            {/* Adjustments */}
            <div className="w-full mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span className="flex items-center gap-1"><ZoomIn className="w-3.5 h-3.5 text-gray-500" /> Zoom</span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span className="flex items-center gap-1"><Move className="w-3.5 h-3.5 text-gray-500" /> Position Y</span>
                  <span>{panY} px</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  value={panY}
                  onChange={(e) => setPanY(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Right: Settings */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Dimensions */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Vote className="w-4 h-4 text-emerald-600" />
                <span>1. Voter ID Dimension Standard</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSpecMode('nvsp-32x24')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    specMode === 'nvsp-32x24'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 shadow-xs'
                      : 'border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="font-bold text-xs">NVSP Standard</div>
                  <div className="text-[11px] text-gray-500">3.2 x 2.4 cm (ECI Form 6)</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSpecMode('standard-35x45')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    specMode === 'standard-35x45'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 shadow-xs'
                      : 'border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="font-bold text-xs">EPIC Card ID</div>
                  <div className="text-[11px] text-gray-500">3.5 x 4.5 cm (Biometric)</div>
                </button>
              </div>
            </div>

            {/* Voter Name & Date Bar */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>2. Candidate Name & Date Bar</span>
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
                      Voter Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. RAJESH VERMA"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs uppercase font-medium focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Date of Photograph (DOP)
                    </label>
                    <input
                      type="date"
                      value={photoDate}
                      onChange={(e) => setPhotoDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Portal File Size Limit */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>3. NVSP Portal Upload Limit</span>
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '50', label: 'Under 50 KB', desc: 'Strict NVSP limit' },
                  { id: '100', label: 'Under 100 KB', desc: 'Standard portal' },
                  { id: '200', label: 'Under 200 KB', desc: 'State portal' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setMaxKb(s.id as any)}
                    className={`p-2 rounded-xl border text-center transition-colors cursor-pointer ${
                      maxKb === s.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    <div className="text-xs">{s.label}</div>
                    <div className="text-[10px] text-gray-500">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Output Layout */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-amber-600" />
                <span>4. Download Format</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOutputMode('single')}
                  className={`p-2 rounded-xl border text-left cursor-pointer ${
                    outputMode === 'single' ? 'border-emerald-600 bg-emerald-50 font-bold' : 'border-gray-200'
                  }`}
                >
                  <div className="text-xs">Single Photo (.jpg)</div>
                  <div className="text-[10px] text-gray-500">For online form upload</div>
                </button>
                <button
                  type="button"
                  onClick={() => setOutputMode('4x6-6')}
                  className={`p-2 rounded-xl border text-left cursor-pointer ${
                    outputMode === '4x6-6' ? 'border-emerald-600 bg-emerald-50 font-bold' : 'border-gray-200'
                  }`}
                >
                  <div className="text-xs">4x6" Sheet (6 Copies)</div>
                  <div className="text-[10px] text-gray-500">For printing</div>
                </button>
              </div>
            </div>

            <button
              id="voter-id-download-btn"
              type="button"
              disabled={isProcessing}
              onClick={handleGenerate}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compressing & Formatting Voter Photo...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Voter ID Photo (&lt; {maxKb}KB)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
