import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Trash2, 
  Loader2, 
  Download, 
  Sliders, 
  Check, 
  Eye, 
  Settings2, 
  Sparkles,
  RefreshCw,
  FileType
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes } from '../../services/pdfService';
import { parseDocxFile, convertDocxTextToPdf } from '../../services/wordService';

interface WordToPdfWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

export const WordToPdfWorkspace: React.FC<WordToPdfWorkspaceProps> = ({ tool, onSuccess }) => {
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  
  // Document contents
  const [docHtml, setDocHtml] = useState<string>('');
  const [docText, setDocText] = useState<string>('');
  const [docTitle, setDocTitle] = useState<string>('Document');

  // PDF Page Layout & Custom Options
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [fontFamily, setFontFamily] = useState<'helvetica' | 'times' | 'courier'>('helvetica');
  const [fontSize, setFontSize] = useState<number>(11);
  const [margins, setMargins] = useState<number>(40);
  const [includeHeaderTitle, setIncludeHeaderTitle] = useState<boolean>(true);
  const [includePageNumbers, setIncludePageNumbers] = useState<boolean>(true);

  // Preview tab
  const [activePreviewTab, setActivePreviewTab] = useState<'formatted' | 'text'>('formatted');
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileItem = files[0];

  useEffect(() => {
    if (fileItem) {
      setIsParsing(true);
      setError(null);
      setDocTitle(fileItem.name.replace(/\.[^/.]+$/, ''));

      parseDocxFile(fileItem.file)
        .then((res) => {
          setDocHtml(res.html);
          setDocText(res.text);
        })
        .catch((err) => {
          console.error(err);
          setError('Failed to parse Word document. Please ensure it is a valid .docx or .txt file.');
        })
        .finally(() => {
          setIsParsing(false);
        });
    } else {
      setDocHtml('');
      setDocText('');
    }
  }, [fileItem]);

  const handleConvertToPdf = async () => {
    if (!docText.trim() || !fileItem) return;
    setIsConverting(true);

    try {
      const pdfBytes = await convertDocxTextToPdf(docText, {
        pageSize,
        fontFamily,
        fontSize,
        margins,
        title: includeHeaderTitle ? docTitle : undefined,
        addPageNumbers: includePageNumbers,
      });

      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const baseName = fileItem.name.replace(/\.[^/.]+$/, '');
      const downloadName = `${baseName}.pdf`;

      onSuccess({
        title: 'Word Document Converted to PDF',
        success: true,
        downloadUrl,
        downloadFilename: downloadName,
        downloadName,
        fileSize: pdfBlob.size,
        originalSize: fileItem.size,
        message: `Successfully converted Word document to high-quality PDF (${formatBytes(pdfBlob.size)})`,
        blob: pdfBlob,
        mimeType: 'application/pdf',
      });
    } catch (err: any) {
      console.error(err);
      setError('Error generating PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="space-y-6">
      {!fileItem ? (
        <DropZone
          tool={tool}
          files={files}
          onFilesChange={setFiles}
          title="Upload Microsoft Word document (.docx, .doc, .txt)"
          subtitle="Supports full text formatting, tables, lists, manual styling select & live preview"
        />
      ) : (
        <div className="space-y-4">
          
          {/* Header Bar */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="truncate">
                <div className="font-bold text-sm text-gray-900 truncate">
                  {fileItem.name}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {formatBytes(fileItem.size)} • Microsoft Word Document
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-gray-100 p-0.5 rounded-xl flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('formatted')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    activePreviewTab === 'formatted' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600'
                  }`}
                >
                  Formatted Preview
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('text')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    activePreviewTab === 'text' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600'
                  }`}
                >
                  Edit Text & Layout
                </button>
              </div>

              <button
                type="button"
                onClick={() => setFiles([])}
                className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Change Word File</span>
              </button>
            </div>
          </div>

          {isParsing ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-xs flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <div className="font-bold text-sm text-gray-900">Parsing Word Document Structure...</div>
              <div className="text-xs text-gray-500">Extracting fonts, paragraphs, and headings</div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left: Document Sheet Live Preview */}
              <div className="lg:col-span-8 bg-gray-100/80 rounded-2xl border border-gray-200/80 p-6 flex flex-col items-center">
                <div className="w-full max-w-2xl bg-white shadow-md border border-gray-200 rounded-sm p-8 min-h-[520px]">
                  
                  {/* Header Title in Preview */}
                  {includeHeaderTitle && (
                    <div className="border-b border-gray-200 pb-2 mb-4 flex items-center justify-between text-[11px] text-gray-500 font-semibold">
                      <span>{docTitle}</span>
                      <span className="font-mono text-gray-400">PDFKit Engine</span>
                    </div>
                  )}

                  {activePreviewTab === 'formatted' ? (
                    <div
                      className="prose prose-sm max-w-none text-gray-800 leading-relaxed overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: docHtml || '<p>No content preview available.</p>' }}
                    />
                  ) : (
                    <textarea
                      value={docText}
                      onChange={(e) => setDocText(e.target.value)}
                      placeholder="Enter or edit document text here..."
                      rows={20}
                      className="w-full h-full min-h-[440px] font-mono text-xs leading-relaxed text-gray-800 outline-none p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  )}

                  {/* Footer Page Number in Preview */}
                  {includePageNumbers && (
                    <div className="border-t border-gray-100 pt-3 mt-6 text-center text-[10px] text-gray-400 font-mono">
                      Page 1 of Document
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Manual Select & Custom Styling Options */}
              <div className="lg:col-span-4 space-y-4">
                
                {/* Manual Select Page & Margins */}
                <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3.5">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Settings2 className="w-4 h-4 text-blue-600" />
                    <span>1. Page Size & Margins</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPageSize('a4')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                        pageSize === 'a4' ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold' : 'border-gray-200'
                      }`}
                    >
                      <div className="text-xs">A4 Paper</div>
                      <div className="text-[10px] text-gray-500">210 x 297 mm</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPageSize('letter')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                        pageSize === 'letter' ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold' : 'border-gray-200'
                      }`}
                    >
                      <div className="text-xs">US Letter</div>
                      <div className="text-[10px] text-gray-500">8.5 x 11 inches</div>
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Page Margins
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Normal (40pt)', value: 40 },
                        { label: 'Narrow (20pt)', value: 20 },
                        { label: 'Wide (60pt)', value: 60 },
                      ].map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setMargins(m.value)}
                          className={`p-1.5 rounded-lg border text-center text-xs cursor-pointer ${
                            margins === m.value ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold' : 'border-gray-200'
                          }`}
                        >
                          {m.label.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Typography & Styling Select */}
                <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3.5">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-purple-600" />
                    <span>2. Typography & Formatting</span>
                  </h3>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Font Family
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'helvetica', label: 'Helvetica' },
                        { id: 'times', label: 'Times' },
                        { id: 'courier', label: 'Courier' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFontFamily(f.id as any)}
                          className={`p-1.5 rounded-lg border text-center text-xs cursor-pointer ${
                            fontFamily === f.id ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold' : 'border-gray-200'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                      <span>Body Font Size</span>
                      <span>{fontSize} pt</span>
                    </div>
                    <input
                      type="range"
                      min="9"
                      max="16"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <label className="flex items-center justify-between text-xs text-gray-700 cursor-pointer">
                      <span>Include Document Title in Header</span>
                      <input
                        type="checkbox"
                        checked={includeHeaderTitle}
                        onChange={(e) => setIncludeHeaderTitle(e.target.checked)}
                        className="rounded-sm text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                    <label className="flex items-center justify-between text-xs text-gray-700 cursor-pointer">
                      <span>Add Page Numbers in Footer</span>
                      <input
                        type="checkbox"
                        checked={includePageNumbers}
                        onChange={(e) => setIncludePageNumbers(e.target.checked)}
                        className="rounded-sm text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                </div>

                <button
                  id="word-to-pdf-download-btn"
                  type="button"
                  disabled={isConverting}
                  onClick={handleConvertToPdf}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isConverting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating PDF Document...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Convert Word to PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
