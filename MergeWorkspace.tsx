import React, { useState } from 'react';
import { 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Layers, 
  Sparkles, 
  FileText, 
  Loader2, 
  GripVertical 
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { Document, Page } from 'react-pdf';
import { Eye } from 'lucide-react';
import { PdfPreviewModal } from '../preview/PdfPreviewModal';
import { PdfThumbnailPreview } from '../preview/PdfThumbnailPreview';
import { DropZone } from '../DropZone';
import { formatBytes, mergePdfs, downloadBlob } from '../../services/pdfService';
import { usePremium } from '../../context/PremiumContext';

interface MergeWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

export const MergeWorkspace: React.FC<MergeWorkspaceProps> = ({ tool, onSuccess }) => {
  const { isPremium, openUpgradeModal, checkFileLimit } = usePremium();
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewingFile, setPreviewingFile] = useState<UploadedFileItem | null>(null);
  const [showStoryboard, setShowStoryboard] = useState<boolean>(false);

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

  const handleMerge = async () => {
    if (files.length < 2) {
      setError('Please add at least 2 PDF files to merge.');
      return;
    }

    setError(null);
    setIsProcessing(true);
    setProgress(10);

    try {
      const mergedBytes = await mergePdfs(
        files.map((f) => f.file),
        (p) => setProgress(p)
      );

      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const downloadFilename = `PDFKit_merged_${Date.now()}.pdf`;

      onSuccess({
        title: `Successfully merged ${files.length} PDFs!`,
        success: true,
        downloadUrl,
        downloadFilename,
        fileSize: blob.size,
        blob,
      });
    } catch (err: any) {
      console.error('Merge error:', err);
      setError(err?.message || 'Failed to merge PDF files. Please ensure files are valid and uncorrupted.');
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
          title="Drop PDF files to merge"
          subtitle="Select 2 or more PDF files. You can reorder them before merging."
        />
      ) : (
        <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gray-900 font-google">
                Merge PDF Files ({files.length})
              </h2>
              <p className="text-xs text-gray-500">
                Drag or use arrows to change the order. The merged PDF will follow this sequence.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="add-more-pdf-input"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-full flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More PDFs</span>
              </label>
              <input
                id="add-more-pdf-input"
                type="file"
                multiple
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    const valid: UploadedFileItem[] = [];
                    for (const f of Array.from(e.target.files as FileList)) {
                      const fileName = f?.name || '';
                      const isPdf = f.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
                      if (!isPdf) {
                        setError('Only PDF documents are supported in Merge PDF.');
                        continue;
                      }
                      valid.push({
                        id: Math.random().toString(36).substring(2, 9),
                        file: f,
                        name: f.name,
                        size: f.size,
                        type: f.type,
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

          {/* Error notice */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800">
              {error}
            </div>
          )}

          {/* List of files to merge */}
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {files.map((fileItem, index) => (
              <div
                key={fileItem.id}
                className="flex items-center justify-between p-3.5 bg-gray-50/80 hover:bg-blue-50/40 border border-gray-200/90 rounded-2xl transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>
                  <div
                    onClick={() => setPreviewingFile(fileItem)}
                    className="w-10 h-13 bg-white rounded-lg border border-gray-200 shadow-xs flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group"
                    title="Click to inspect PDF contents"
                  >
                    <Document
                      file={fileItem.file}
                      loading={<Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
                    >
                      <Page
                        pageNumber={1}
                        width={40}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </Document>
                  </div>
                  <div className="truncate">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {fileItem.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatBytes(fileItem.size)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Move up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === files.length - 1}
                    className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Move down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewingFile(fileItem)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Inspect PDF contents"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemove(fileItem.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors ml-1"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-gray-500">
              Total files: <span className="font-semibold text-gray-800">{files.length}</span> •
              Combined size:{' '}
              <span className="font-semibold text-gray-800">
                {formatBytes(files.reduce((acc, f) => acc + f.size, 0))}
              </span>
            </div>

            <button
              id="execute-merge-btn"
              onClick={handleMerge}
              disabled={isProcessing || files.length < 2}
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-full text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Merging PDFs ({progress}%)...</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>Merge PDFs Now</span>
                </>
              )}
            </button>
          </div>

          {/* Optional Storyboard View */}
          {showStoryboard && files.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Document Contents Previews</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {files.map((item) => (
                  <PdfThumbnailPreview
                    key={item.id}
                    file={item.file}
                    fileName={item.name}
                    fileSize={item.size}
                    compact={false}
                    showAllPagesOption={true}
                    onRemove={() => handleRemove(item.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Inspector */}
      {previewingFile && (
        <PdfPreviewModal
          isOpen={!!previewingFile}
          onClose={() => setPreviewingFile(null)}
          file={previewingFile.file}
          fileName={previewingFile.name}
        />
      )}
    </div>
  );
};
