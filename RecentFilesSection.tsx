import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Trash2, 
  Download, 
  ArrowRight, 
  FileText, 
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  X
} from 'lucide-react';
import { RecentProcessedFile, ToolId } from '../types';
import { getRecentFiles, removeRecentFile, clearRecentFiles } from '../services/recentFilesService';
import { formatBytes } from '../services/pdfService';
import { TOOLS } from '../data/tools';

interface RecentFilesSectionProps {
  onSelectTool: (id: ToolId) => void;
  onOpenHistory?: () => void;
}

export const RecentFilesSection: React.FC<RecentFilesSectionProps> = ({ onSelectTool, onOpenHistory }) => {
  const [files, setFiles] = useState<RecentProcessedFile[]>([]);

  const loadFiles = () => {
    setFiles(getRecentFiles(5));
  };

  useEffect(() => {
    loadFiles();

    const handleUpdate = () => {
      loadFiles();
    };

    window.addEventListener('recent-files-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('recent-files-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  if (files.length === 0) {
    return null; // Keep clean when no recent files have been processed
  }

  const formatTimeAgo = (timestamp: number): string => {
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getToolMeta = (toolId: ToolId) => {
    return TOOLS.find((t) => t.id === toolId);
  };

  return (
    <section className="bg-white border border-gray-200/90 rounded-3xl p-5 sm:p-6 shadow-xs animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900 font-google">Recent Files</h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                Last {files.length} {files.length === 1 ? 'file' : 'files'}
              </span>
            </div>
            <p className="text-xs text-gray-500">Quick re-access to your recently processed files and tools</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <span>View Full History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={clearRecentFiles}
            className="text-xs text-gray-400 hover:text-red-600 font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
            title="Clear recent files history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear History</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {files.map((item) => {
          const tool = getToolMeta(item.toolId);
          const isPdf = item.toolType === 'pdf';

          return (
            <div
              key={item.id}
              className="bg-gray-50/80 hover:bg-white border border-gray-200/80 hover:border-blue-300 rounded-2xl p-3.5 flex flex-col justify-between transition-all hover:shadow-xs group relative"
            >
              {/* Remove single item button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeRecentFile(item.id);
                }}
                className="absolute top-2 right-2 p-1 text-gray-300 hover:text-gray-600 rounded-md hover:bg-gray-200/60 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove from recent list"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: tool?.bgLight || (isPdf ? '#e8f0fe' : '#f3e8fd'),
                      color: tool?.color || (isPdf ? '#1a73e8' : '#9334e8'),
                    }}
                  >
                    {isPdf ? (
                      <FileText className="w-3.5 h-3.5" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pr-4">
                    <span className="text-[11px] font-bold text-gray-700 block truncate">
                      {item.toolName}
                    </span>
                    <span className="text-[10px] text-gray-400 block">
                      {formatTimeAgo(item.timestamp)}
                    </span>
                  </div>
                </div>

                <div>
                  <div
                    className="text-xs font-semibold text-gray-900 truncate"
                    title={item.filename}
                  >
                    {item.filename}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500">
                    <span>{formatBytes(item.fileSize)}</span>
                    {item.originalSize && item.originalSize > item.fileSize && (
                      <span className="text-emerald-600 font-bold text-[10px]">
                        (-{Math.round(((item.originalSize - item.fileSize) / item.originalSize) * 100)}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 mt-3 border-t border-gray-100 flex items-center gap-1.5">
                {item.downloadUrl ? (
                  <a
                    href={item.downloadUrl}
                    download={item.filename}
                    className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-xs"
                    title="Download file"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </a>
                ) : (
                  <button
                    onClick={() => onSelectTool(item.toolId)}
                    className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Use Tool</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}

                {item.downloadUrl && (
                  <button
                    onClick={() => onSelectTool(item.toolId)}
                    className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer"
                    title={`Open ${item.toolName}`}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
