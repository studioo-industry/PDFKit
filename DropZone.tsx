import React, { useRef, useState } from 'react';
import { UploadCloud, Plus, AlertCircle, Sparkles, FileText, Image as ImageIcon } from 'lucide-react';
import { usePremium } from '../context/PremiumContext';
import { ToolDefinition, UploadedFileItem } from '../types';
import { formatBytes, getPdfThumbnails } from '../services/pdfService';

interface DropZoneProps {
  tool: ToolDefinition;
  files: UploadedFileItem[];
  onFilesChange: (files: UploadedFileItem[]) => void;
  title?: string;
  subtitle?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  tool,
  files,
  onFilesChange,
  title,
  subtitle,
}) => {
  const { plan, checkFileLimit, openUpgradeModal } = usePremium();
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isWordToPdf = tool.id === 'word-to-pdf';
  const isImageTool = tool.toolType === 'image' || tool.toolType === 'govt' || tool.id === 'jpg-to-pdf';
  const isPdfTool = tool.toolType === 'pdf' && tool.id !== 'jpg-to-pdf' && !isWordToPdf;

  const handleFiles = async (rawFiles: FileList | File[]) => {
    setErrorMsg(null);
    const newFileList = Array.from(rawFiles);

    if (newFileList.length === 0) return;

    // Check if tool accepts only single file
    if (!tool.multiple && (files.length > 0 || newFileList.length > 1)) {
      if (newFileList.length > 1) {
        setErrorMsg(`${tool.name} works on one file at a time.`);
        return;
      }
      // If single file, replace existing
    }

    const targetTotalCount = tool.multiple ? files.length + newFileList.length : newFileList.length;
    
    // Batch limit check
    const batchCheck = checkFileLimit(0, targetTotalCount);
    if (!batchCheck.allowed) {
      setErrorMsg(batchCheck.message || 'Batch limit reached.');
      return;
    }

    // Process each file
    const validItems: UploadedFileItem[] = [];

    for (const file of newFileList) {
      // Validate size
      const sizeCheck = checkFileLimit(file.size, 1);
      if (!sizeCheck.allowed) {
        setErrorMsg(`${file.name}: ${sizeCheck.message}`);
        return;
      }

      // Check file type
      const fileName = file?.name || '';
      const isPdf = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
      const isImage =
        file.type.startsWith('image/') ||
        /\.(jpe?g|jfif|png|webp|gif|bmp|svg|avif|ico|tiff?|heic|heif)$/i.test(fileName);
      const isWord =
        /\.(docx|doc|txt|rtf)$/i.test(fileName) ||
        file.type.includes('word') ||
        file.type.includes('officedocument') ||
        file.type === 'text/plain';

      if (isWordToPdf) {
        if (!isWord) {
          setErrorMsg(`Please upload a valid Word document (.docx, .doc, .rtf, .txt).`);
          return;
        }
      } else if (isImageTool && !isImage) {
        if (isPdf) {
          setErrorMsg(`You uploaded a PDF document. To convert PDF pages into JPG images, please use the "PDF to JPG" tool.`);
        } else {
          setErrorMsg(`Please upload valid image files (JPG, PNG, WEBP, GIF, SVG, HEIC).`);
        }
        return;
      } else if (isPdfTool && !isPdf) {
        if (isImage) {
          setErrorMsg(`You uploaded an image file. To convert images into a PDF document, please use the "JPG to PDF" tool.`);
        } else {
          setErrorMsg(`Please upload a valid PDF document (.pdf).`);
        }
        return;
      }

      const item: UploadedFileItem = {
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        size: file.size,
        type: file.type || (isImage ? 'image/jpeg' : isWord ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'),
      };

      // Create preview for images safely
      if (isImage) {
        try {
          item.previewUrl = URL.createObjectURL(file);
        } catch {
          // ignore
        }
      }

      validItems.push(item);
    }

    if (tool.multiple) {
      onFilesChange([...files, ...validItems]);
    } else {
      onFilesChange(validItems);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const acceptAttribute = isWordToPdf
    ? '.docx,.doc,.txt,.rtf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain'
    : isImageTool
    ? 'image/*,.jpg,.jpeg,.jfif,.png,.webp,.gif,.bmp,.svg,.avif,.ico,.tif,.tiff,.heic,.heif'
    : 'application/pdf,.pdf';

  const defaultTitle = title || (isWordToPdf
    ? `Choose ${tool.multiple ? 'Word files' : 'a Word document'} or drop ${tool.multiple ? 'them' : 'it'} here`
    : isImageTool
    ? `Choose ${tool.multiple ? 'images' : 'an image'} or drop ${tool.multiple ? 'them' : 'it'} here`
    : `Choose ${tool.multiple ? 'PDF files' : 'a PDF file'} or drop ${tool.multiple ? 'them' : 'it'} here`);

  const defaultSubtitle = subtitle || (isWordToPdf
    ? 'Supports Microsoft Word (.docx, .doc), RTF, and text files'
    : isImageTool
    ? 'Supports JPG, PNG, WEBP, GIF, SVG and modern image formats'
    : 'Supports standard PDF documents (.pdf)');

  const buttonLabel = isWordToPdf
    ? `Select ${tool.multiple ? 'Word Documents' : 'Word Document'}`
    : `Select ${isImageTool ? (tool.multiple ? 'Images' : 'Image') : (tool.multiple ? 'PDF Files' : 'PDF File')}`;

  return (
    <div className="w-full">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={tool.multiple}
        accept={acceptAttribute}
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = ''; // Reset input to allow selecting same file again
        }}
        className="hidden"
      />

      {/* Error message alert */}
      {errorMsg && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-red-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>Dismiss</span>
          </button>
        </div>
      )}

      {/* Drop Zone Box */}
      <div
        id="pdfkit-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
            : 'border-gray-300 hover:border-blue-400 bg-white hover:bg-gray-50/70 shadow-xs'
        }`}
      >
        <div className="max-w-md mx-auto flex flex-col items-center">
          {/* Animated upload icon circle */}
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-105 shadow-xs"
            style={{ backgroundColor: tool.bgLight, color: tool.color }}
          >
            {isImageTool ? (
              <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10" />
            ) : (
              <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10" />
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-gray-900 font-google mb-1.5">
            {defaultTitle}
          </h3>

          <p className="text-xs sm:text-sm text-gray-500 mb-5 leading-relaxed">
            {defaultSubtitle}
          </p>

          <button
            type="button"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full text-sm shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{buttonLabel}</span>
          </button>

          {/* Limits indicator footer */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-gray-500 font-medium">
            <span className="flex items-center gap-1 text-blue-600 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>100% Free &amp; Unlimited</span>
            </span>
            <span>•</span>
            <span>Max 1GB per file</span>
            <span>•</span>
            <span>Up to 100 batch files</span>
            <span>•</span>
            <span>100% Client-Side Private</span>
          </div>
        </div>
      </div>
    </div>
  );
};
