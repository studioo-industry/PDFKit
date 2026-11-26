import React, { useState } from 'react';
import { 
  Image as ImageIcon, 
  Sparkles, 
  FileText, 
  Loader2, 
  Trash2, 
  Download, 
  Archive 
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes, pdfToJpg, createZipDownload } from '../../services/pdfService';
import { usePremium } from '../../context/PremiumContext';

interface PdfToJpgWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

export const PdfToJpgWorkspace: React.FC<PdfToJpgWorkspaceProps> = ({ tool, onSuccess }) => {
  const { isPremium, openUpgradeModal } = usePremium();
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [quality, setQuality] = useState<number>(0.92);
  const [scaleFactor, setScaleFactor] = useState<number>(1.8);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<{ current: number; total: number; percent: number }>({
    current: 0,
    total: 0,
    percent: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const fileItem = files[0];

  const handleConvert = async () => {
    if (!fileItem) return;

    setError(null);
    setIsProcessing(true);
    setCurrentProgress({ current: 0, total: 1, percent: 5 });

    try {
      const convertedImages = await pdfToJpg(
        fileItem.file,
        quality,
        scaleFactor,
        (percent, current, total) => {
          setCurrentProgress({ percent, current, total });
        }
      );

      if (convertedImages.length === 0) {
        throw new Error('No pages could be extracted.');
      }

      const baseName = fileItem.name.replace(/\.[^/.]+$/, '');

      if (convertedImages.length === 1) {
        const single = convertedImages[0];
        const downloadUrl = URL.createObjectURL(single.blob);
        onSuccess({
          title: 'PDF page converted to JPG image!',
          success: true,
          downloadUrl,
          downloadFilename: single.filename,
          blob: single.blob,
          fileSize: single.blob.size,
          images: convertedImages,
          mimeType: 'image/jpeg',
        });
      } else {
        const zipFiles = convertedImages.map((img) => ({
          name: img.filename,
          data: img.blob,
        }));

        const zipBlob = await createZipDownload(zipFiles);
        const downloadUrl = URL.createObjectURL(zipBlob);

        onSuccess({
          title: `Converted ${convertedImages.length} pages to JPG images!`,
          success: true,
          downloadUrl,
          downloadFilename: `${baseName}_images.zip`,
          zipBlob,
          fileSize: zipBlob.size,
          images: convertedImages,
          mimeType: 'application/zip',
        });
      }
    } catch (err: any) {
      console.error('PDF to JPG error:', err);
      setError(err?.message || 'Failed to convert PDF pages to JPG images.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {!fileItem ? (
        <DropZone
          tool={tool}
          files={files}
          onFilesChange={setFiles}
          title="Drop PDF file to convert to JPG"
          subtitle="Extract high-resolution JPEG images for every page in your PDF."
        />
      ) : (
        <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">{fileItem.name}</h3>
                <p className="text-xs text-gray-500">{formatBytes(fileItem.size)}</p>
              </div>
            </div>

            <button
              onClick={() => setFiles([])}
              className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              title="Remove file"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {/* Quality & Resolution Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
              <label className="block text-xs font-bold text-gray-700">Image Resolution</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScaleFactor(1.5)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                    scaleFactor === 1.5
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  Standard (150 DPI)
                </button>
                <button
                  type="button"
                  onClick={() => setScaleFactor(2.2)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                    scaleFactor === 2.2
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  High (300 DPI)
                </button>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
              <label className="block text-xs font-bold text-gray-700">JPEG Quality</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setQuality(0.85)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                    quality === 0.85
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  Standard (85%)
                </button>
                <button
                  type="button"
                  onClick={() => setQuality(0.95)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                    quality === 0.95
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  Maximum (95%)
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800">
              {error}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
            <button
              id="execute-pdf-to-jpg-btn"
              onClick={handleConvert}
              disabled={isProcessing}
              className="px-8 py-3.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-bold rounded-full text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    Converting {currentProgress.current}/{currentProgress.total} ({currentProgress.percent}%)...
                  </span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  <span>Convert to JPG</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
