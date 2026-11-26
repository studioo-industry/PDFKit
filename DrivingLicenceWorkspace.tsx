import React, { useState, useEffect, useRef } from 'react';
import { 
  IdCard, 
  Trash2, 
  Loader2, 
  Download, 
  ZoomIn, 
  Move, 
  PenTool, 
  ShieldCheck, 
  Sparkles,
  UploadCloud,
  FileBadge
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes } from '../../services/pdfService';
import { loadImage, canvasToBlob } from '../../services/imageService';
import { renderPassportPhoto } from '../../services/govtPhotoService';

interface DrivingLicenceWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

export const DrivingLicenceWorkspace: React.FC<DrivingLicenceWorkspaceProps> = ({ tool, onSuccess }) => {
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  
  // Signature image state
  const [sigFile, setSigFile] = useState<File | null>(null);
  const [sigImg, setSigImg] = useState<HTMLImageElement | null>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  // Photo transforms
  const [zoom, setZoom] = useState(1.15);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(-10);

  // Export option: 'photo-only' (35x45mm), 'sig-only', or 'merged-card' (photo + signature stack)
  const [exportMode, setExportMode] = useState<'photo-only' | 'sig-only' | 'merged-card'>('photo-only');
  const [maxKb, setMaxKb] = useState<'20' | '50'>('50'); // Sarathi requirement: 20-50KB for photo, 10-20KB for signature

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
        setZoom(1.15);
      });
    } else {
      setLoadedImg(null);
      setPreviewDataUrl(null);
    }
  }, [fileItem]);

  useEffect(() => {
    if (sigFile) {
      loadImage(sigFile).then((img) => setSigImg(img));
    } else {
      setSigImg(null);
    }
  }, [sigFile]);

  // Generate preview
  useEffect(() => {
    if (!loadedImg) return;

    // RTO 35x45mm is 420x525 px @ 300 DPI
    const photoCanvas = renderPassportPhoto(loadedImg, {
      targetWidth: 420,
      targetHeight: 525,
      zoom,
      panX,
      panY,
      rotation: 0,
      bgColor: '#ffffff',
      borderWidth: 1,
    });

    if (exportMode === 'photo-only' || !sigImg) {
      setPreviewDataUrl(photoCanvas.toDataURL('image/jpeg', 0.9));
    } else if (exportMode === 'sig-only') {
      // Signature preview canvas
      const sCanvas = document.createElement('canvas');
      sCanvas.width = 420;
      sCanvas.height = 140;
      const sCtx = sCanvas.getContext('2d');
      if (sCtx) {
        sCtx.fillStyle = '#ffffff';
        sCtx.fillRect(0, 0, 420, 140);
        sCtx.drawImage(sigImg, 10, 10, 400, 120);
        sCtx.strokeStyle = '#000000';
        sCtx.lineWidth = 1;
        sCtx.strokeRect(0, 0, 420, 140);
      }
      setPreviewDataUrl(sCanvas.toDataURL('image/jpeg', 0.9));
    } else {
      // Merged DL card canvas (photo on top + signature on bottom)
      const mergedCanvas = document.createElement('canvas');
      mergedCanvas.width = 420;
      mergedCanvas.height = 680;
      const mCtx = mergedCanvas.getContext('2d');
      if (mCtx) {
        mCtx.fillStyle = '#ffffff';
        mCtx.fillRect(0, 0, 420, 680);
        // Photo
        mCtx.drawImage(photoCanvas, 0, 0);
        // Divider
        mCtx.fillStyle = '#e5e7eb';
        mCtx.fillRect(0, 525, 420, 15);
        mCtx.fillStyle = '#4b5563';
        mCtx.font = 'bold 10px sans-serif';
        mCtx.textAlign = 'center';
        mCtx.fillText('APPLICANT SIGNATURE', 210, 536);
        // Signature
        mCtx.drawImage(sigImg, 20, 545, 380, 120);
        // Outer border
        mCtx.strokeStyle = '#000000';
        mCtx.lineWidth = 1.5;
        mCtx.strokeRect(0, 0, 420, 680);
      }
      setPreviewDataUrl(mergedCanvas.toDataURL('image/jpeg', 0.9));
    }
  }, [loadedImg, sigImg, zoom, panX, panY, exportMode]);

  const handleGenerate = async () => {
    if (!loadedImg || !fileItem) return;
    setIsProcessing(true);

    try {
      const photoCanvas = renderPassportPhoto(loadedImg, {
        targetWidth: 420,
        targetHeight: 525,
        zoom,
        panX,
        panY,
        rotation: 0,
        bgColor: '#ffffff',
        borderWidth: 1,
      });

      let finalCanvas: HTMLCanvasElement;
      let defaultName = 'driving_licence_photo_35x45mm.jpg';

      if (exportMode === 'photo-only' || !sigImg) {
        finalCanvas = photoCanvas;
      } else if (exportMode === 'sig-only') {
        finalCanvas = document.createElement('canvas');
        finalCanvas.width = 420;
        finalCanvas.height = 140;
        const sCtx = finalCanvas.getContext('2d');
        if (sCtx) {
          sCtx.fillStyle = '#ffffff';
          sCtx.fillRect(0, 0, 420, 140);
          sCtx.drawImage(sigImg, 10, 10, 400, 120);
          sCtx.strokeStyle = '#000000';
          sCtx.lineWidth = 1;
          sCtx.strokeRect(0, 0, 420, 140);
        }
        defaultName = 'driving_licence_signature.jpg';
      } else {
        finalCanvas = document.createElement('canvas');
        finalCanvas.width = 420;
        finalCanvas.height = 680;
        const mCtx = finalCanvas.getContext('2d');
        if (mCtx) {
          mCtx.fillStyle = '#ffffff';
          mCtx.fillRect(0, 0, 420, 680);
          mCtx.drawImage(photoCanvas, 0, 0);
          mCtx.fillStyle = '#f3f4f6';
          mCtx.fillRect(0, 525, 420, 15);
          mCtx.fillStyle = '#4b5563';
          mCtx.font = 'bold 10px sans-serif';
          mCtx.textAlign = 'center';
          mCtx.fillText('APPLICANT SIGNATURE', 210, 536);
          mCtx.drawImage(sigImg, 20, 545, 380, 120);
          mCtx.strokeStyle = '#000000';
          mCtx.lineWidth = 1.5;
          mCtx.strokeRect(0, 0, 420, 680);
        }
        defaultName = 'driving_licence_photo_and_signature_merged.jpg';
      }

      // Compression constraint for Sarathi Parivahan (< 50KB or < 20KB)
      const targetLimitBytes = parseInt(maxKb, 10) * 1024;
      let quality = 0.9;
      let blob = await canvasToBlob(finalCanvas, 'image/jpeg', quality);

      while (blob.size > targetLimitBytes && quality > 0.15) {
        quality -= 0.08;
        blob = await canvasToBlob(finalCanvas, 'image/jpeg', quality);
      }

      const downloadUrl = URL.createObjectURL(blob);
      const baseName = fileItem.name.replace(/\.[^/.]+$/, '');
      const downloadName = `${baseName}_${defaultName}`;

      onSuccess({
        title: 'Driving Licence / Learner Document Ready',
        success: true,
        downloadUrl,
        downloadFilename: downloadName,
        downloadName,
        fileSize: blob.size,
        originalSize: fileItem.size,
        message: `RTO Sarathi Parivahan ready file (${formatBytes(blob.size)}, strictly under ${maxKb}KB)`,
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
          title="Upload candidate photo for Driving Licence"
          subtitle="Compliant with RTO Sarathi Parivahan portal (35x45 mm, 20KB - 50KB limit)"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Preview */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <IdCard className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  RTO Sarathi Driving Licence Preview
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFiles([])}
                className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Change Photo</span>
              </button>
            </div>

            <div className="relative bg-gray-100/80 border border-gray-200 rounded-xl p-4 flex items-center justify-center min-h-[380px] w-full">
              {previewDataUrl ? (
                <div className="shadow-md rounded-sm overflow-hidden bg-white max-h-[420px]">
                  <img
                    src={previewDataUrl}
                    alt="Driving Licence Photo Preview"
                    className="max-h-[400px] object-contain block select-none"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                  <span className="text-xs">Preparing preview...</span>
                </div>
              )}
            </div>

            {/* Sarathi RTO Compliance Info */}
            <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-900 w-full bg-amber-50/80 p-2.5 rounded-xl border border-amber-200">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Parivahan Sarathi Standards:</strong> Photo 35mm x 45mm (420x525 px), pure white background, face taking 70-80% of frame, compressed between 20KB and 50KB.
              </span>
            </div>

            {/* Sliders */}
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
                  className="w-full accent-amber-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
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
                  className="w-full accent-amber-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Right: Signature Upload & Export Settings */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Signature Upload (Optional for Sarathi) */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-amber-600" />
                  <span>Applicant Signature (Optional)</span>
                </h3>
                {sigFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setSigFile(null);
                      if (exportMode !== 'photo-only') setExportMode('photo-only');
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold"
                  >
                    Remove
                  </button>
                )}
              </div>

              <input
                ref={sigInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSigFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              {!sigFile ? (
                <button
                  type="button"
                  onClick={() => sigInputRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-gray-300 hover:border-amber-500 rounded-xl flex flex-col items-center justify-center gap-1.5 bg-gray-50/50 hover:bg-amber-50/30 transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-5 h-5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-700">Upload Signature Image</span>
                  <span className="text-[10px] text-gray-400">Black or blue ink on plain white paper</span>
                </button>
              ) : (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center justify-between">
                  <div className="truncate">
                    <div className="text-xs font-bold text-amber-950 truncate">{sigFile.name}</div>
                    <div className="text-[10px] text-amber-700">{formatBytes(sigFile.size)} • Signature Attached</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => sigInputRef.current?.click()}
                    className="text-xs font-semibold text-amber-800 underline ml-2 shrink-0 cursor-pointer"
                  >
                    Replace
                  </button>
                </div>
              )}
            </div>

            {/* Export Format */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <FileBadge className="w-4 h-4 text-blue-600" />
                <span>Export Format</span>
              </h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setExportMode('photo-only')}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                    exportMode === 'photo-only' ? 'border-amber-600 bg-amber-50/70 font-bold' : 'border-gray-200'
                  }`}
                >
                  <div>
                    <div className="text-xs text-gray-900">DL Photo Only (35 x 45 mm)</div>
                    <div className="text-[10px] text-gray-500 font-normal">Primary portal photo upload slot</div>
                  </div>
                  <span className="text-xs text-amber-700 font-mono">420x525 px</span>
                </button>

                {sigFile && (
                  <>
                    <button
                      type="button"
                      onClick={() => setExportMode('sig-only')}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                        exportMode === 'sig-only' ? 'border-amber-600 bg-amber-50/70 font-bold' : 'border-gray-200'
                      }`}
                    >
                      <div>
                        <div className="text-xs text-gray-900">Signature Only (Compressed)</div>
                        <div className="text-[10px] text-gray-500 font-normal">Separate signature portal upload slot</div>
                      </div>
                      <span className="text-xs text-amber-700 font-mono">&lt; 20 KB</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExportMode('merged-card')}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                        exportMode === 'merged-card' ? 'border-amber-600 bg-amber-50/70 font-bold' : 'border-gray-200'
                      }`}
                    >
                      <div>
                        <div className="text-xs text-gray-900">Merged Photo + Signature Card</div>
                        <div className="text-[10px] text-gray-500 font-normal">Unified identity document card layout</div>
                      </div>
                      <span className="text-xs text-amber-700 font-mono">All-in-one</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Portal File Size Limit */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Sarathi Upload File Size Limit</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMaxKb('50')}
                  className={`p-2 rounded-xl border text-center transition-colors cursor-pointer ${
                    maxKb === '50' ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="text-xs">Under 50 KB</div>
                  <div className="text-[10px] text-gray-500">Standard Sarathi limit</div>
                </button>
                <button
                  type="button"
                  onClick={() => setMaxKb('20')}
                  className={`p-2 rounded-xl border text-center transition-colors cursor-pointer ${
                    maxKb === '20' ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="text-xs">Under 20 KB</div>
                  <div className="text-[10px] text-gray-500">For signature or strict RTO</div>
                </button>
              </div>
            </div>

            <button
              id="driving-licence-download-btn"
              type="button"
              disabled={isProcessing}
              onClick={handleGenerate}
              className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compressing for Sarathi Portal...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Driving Licence File (&lt; {maxKb}KB)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
