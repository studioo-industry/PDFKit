import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Trash2, 
  Download, 
  ArrowRight, 
  FileText, 
  Image as ImageIcon, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  HardDrive, 
  Sparkles,
  RefreshCw,
  Layers,
  ArrowLeft,
  Check,
  X
} from 'lucide-react';
import { RecentProcessedFile, ToolId } from '../types';
import { 
  getAllHistory, 
  removeHistoryItem, 
  clearAllHistory 
} from '../services/recentFilesService';
import { formatBytes } from '../services/pdfService';
import { TOOLS } from '../data/tools';

interface HistorySectionProps {
  onSelectTool: (id: ToolId) => void;
  onBackToTools: () => void;
}

export const HistorySection: React.FC<HistorySectionProps> = ({ onSelectTool, onBackToTools }) => {
  const [history, setHistory] = useState<RecentProcessedFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'pdf' | 'image'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'size'>('newest');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadHistory = () => {
    setHistory(getAllHistory());
  };

  useEffect(() => {
    loadHistory();

    const handleUpdate = () => {
      loadHistory();
    };

    window.addEventListener('history-updated', handleUpdate);
    window.addEventListener('recent-files-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('history-updated', handleUpdate);
      window.removeEventListener('recent-files-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3000);
  };

  // Delete individual history item
  const handleDeleteItem = (id: string, filename: string) => {
    removeHistoryItem(id);
    showToast(`Removed "${filename.length > 25 ? filename.substring(0, 22) + '...' : filename}" from history`);
  };

  // One-click full history delete
  const handleClearFullHistory = () => {
    clearAllHistory();
    setShowClearConfirm(false);
    showToast('All processing history has been deleted');
  };

  const formatTimestamp = (ts: number): { date: string; relative: string } => {
    const diffMs = Date.now() - ts;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    let relative = 'Just now';
    if (diffSec >= 60 && diffMin < 60) relative = `${diffMin}m ago`;
    else if (diffMin >= 60 && diffHours < 24) relative = `${diffHours}h ago`;
    else if (diffHours >= 24) relative = `${diffDays}d ago`;

    const d = new Date(ts);
    const dateStr = d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      date: `${dateStr} at ${timeStr}`,
      relative,
    };
  };

  const getToolMeta = (toolId: ToolId) => {
    return TOOLS.find((t) => t.id === toolId);
  };

  // Filtered and sorted history
  const filteredHistory = useMemo(() => {
    return history
      .filter((item) => {
        const matchesType = typeFilter === 'all' || item.toolType === typeFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          item.filename.toLowerCase().includes(q) ||
          item.toolName.toLowerCase().includes(q);
        return matchesType && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return b.timestamp - a.timestamp;
        if (sortBy === 'oldest') return a.timestamp - b.timestamp;
        if (sortBy === 'size') return (b.fileSize || 0) - (a.fileSize || 0);
        return 0;
      });
  }, [history, searchQuery, typeFilter, sortBy]);

  // Statistics
  const totalPdfCount = history.filter((h) => h.toolType === 'pdf').length;
  const totalImageCount = history.filter((h) => h.toolType === 'image').length;
  const totalBytesProcessed = history.reduce((acc, curr) => acc + (curr.fileSize || 0), 0);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-gray-700 flex items-center gap-3 text-xs font-medium animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-gray-400 hover:text-white ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={onBackToTools}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs font-semibold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Tools</span>
              </button>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-200/60">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>User History Hub</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 font-google">
              Processing History
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 max-w-2xl leading-relaxed">
              Every document you merge, compress, convert, or edit is stored directly in your browser.
              No files are uploaded to any server. You can manage, re-download, or delete individual records
              or clear your full history with one click.
            </p>
          </div>

          {/* Delete Full History One-Click Button */}
          {history.length > 0 && (
            <div className="flex items-center gap-3 shrink-0">
              {showClearConfirm ? (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-2 rounded-2xl animate-in zoom-in-95 duration-150">
                  <span className="text-xs font-semibold text-red-800 px-2">
                    Delete all {history.length} records?
                  </span>
                  <button
                    id="confirm-delete-full-history"
                    onClick={handleClearFullHistory}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete All</span>
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  id="btn-delete-full-history"
                  onClick={() => setShowClearConfirm(true)}
                  className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200/80 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs hover:shadow-sm"
                  title="Delete full history in one click"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span>Delete Full History</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quick Stats Grid */}
        {history.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-gray-100">
            <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100">
              <div className="text-[11px] font-medium text-gray-500">Total Processed</div>
              <div className="text-lg font-bold text-gray-900 font-google mt-0.5">
                {history.length} {history.length === 1 ? 'file' : 'files'}
              </div>
            </div>

            <div className="bg-blue-50/50 rounded-2xl p-3 border border-blue-100/60">
              <div className="text-[11px] font-medium text-blue-700">PDF Files</div>
              <div className="text-lg font-bold text-blue-900 font-google mt-0.5">
                {totalPdfCount}
              </div>
            </div>

            <div className="bg-purple-50/50 rounded-2xl p-3 border border-purple-100/60">
              <div className="text-[11px] font-medium text-purple-700">Image Files</div>
              <div className="text-lg font-bold text-purple-900 font-google mt-0.5">
                {totalImageCount}
              </div>
            </div>

            <div className="bg-emerald-50/50 rounded-2xl p-3 border border-emerald-100/60">
              <div className="text-[11px] font-medium text-emerald-700">Data Managed</div>
              <div className="text-lg font-bold text-emerald-900 font-google mt-0.5">
                {formatBytes(totalBytesProcessed)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      {history.length > 0 && (
        <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="history-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history by filename or tool..."
              className="w-full pl-9 pr-8 py-2 bg-gray-50 hover:bg-gray-100 focus:bg-white border border-gray-200 focus:border-blue-500 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 transition-all outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type filters and sort */}
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 w-full md:w-auto">
            {/* Type buttons */}
            <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200/80 text-xs">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  typeFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({history.length})
              </button>
              <button
                onClick={() => setTypeFilter('pdf')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  typeFilter === 'pdf'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                PDFs ({totalPdfCount})
              </button>
              <button
                onClick={() => setTypeFilter('image')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  typeFilter === 'image'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-purple-600'
                }`}
              >
                Images ({totalImageCount})
              </button>
            </div>

            {/* Sort selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-xl px-3 py-2 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="size">Largest File Size</option>
            </select>
          </div>
        </div>
      )}

      {/* History Items List */}
      {filteredHistory.length > 0 ? (
        <div className="space-y-3">
          {filteredHistory.map((item) => {
            const tool = getToolMeta(item.toolId);
            const isPdf = item.toolType === 'pdf';
            const { date, relative } = formatTimestamp(item.timestamp);

            return (
              <div
                key={item.id}
                id={`history-item-${item.id}`}
                className="bg-white border border-gray-200/90 hover:border-blue-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:shadow-xs group"
              >
                {/* Left Side: Icon & Info */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0"
                    style={{
                      backgroundColor: tool?.bgLight || (isPdf ? '#e8f0fe' : '#f3e8fd'),
                      color: tool?.color || (isPdf ? '#1a73e8' : '#9334e8'),
                    }}
                  >
                    {isPdf ? (
                      <FileText className="w-5 h-5" />
                    ) : (
                      <ImageIcon className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 truncate" title={item.filename}>
                        {item.filename}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPdf ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-purple-50 text-purple-700 border border-purple-100'
                        }`}
                      >
                        {item.toolName}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{formatBytes(item.fileSize)}</span>
                      {item.originalSize && item.originalSize > item.fileSize && (
                        <span className="text-emerald-600 font-bold text-[11px] bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                          Reduced by {Math.round(((item.originalSize - item.fileSize) / item.originalSize) * 100)}%
                        </span>
                      )}
                      <span>•</span>
                      <span title={date} className="flex items-center gap-1 text-gray-400">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>{relative}</span>
                        <span className="hidden md:inline">({date})</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Action Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  {/* Download button if available in session */}
                  {item.downloadUrl && (
                    <a
                      href={item.downloadUrl}
                      download={item.filename}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  )}

                  {/* Open / Re-use tool */}
                  <button
                    onClick={() => onSelectTool(item.toolId)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title={`Open ${item.toolName} tool`}
                  >
                    <span>Use Tool</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Individual Delete One-Click Button */}
                  <button
                    id={`btn-delete-item-${item.id}`}
                    onClick={() => handleDeleteItem(item.id, item.filename)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-100"
                    title="Delete this record from history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : history.length > 0 ? (
        /* Filter returned 0 results */
        <div className="bg-white border border-gray-200/90 rounded-3xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 font-google">No matching records found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              No history entries match your current search "{searchQuery}" or filter.
            </p>
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('all');
            }}
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Clear Search & Filters
          </button>
        </div>
      ) : (
        /* Empty History State */
        <div className="bg-white border border-gray-200/90 rounded-3xl p-12 sm:p-16 text-center space-y-5 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-gray-900 font-google">
              Your History is Clean
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              No files have been processed yet or all records have been cleared.
              When you merge, split, compress, or convert documents, your operations will appear here.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onBackToTools}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>Explore Available Tools</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
