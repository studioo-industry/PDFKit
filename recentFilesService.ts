import { RecentProcessedFile } from '../types';

const STORAGE_KEY = 'pdfkit_recent_files_v1';
export const MAX_HISTORY_ITEMS = 100;
export const MAX_RECENT_WIDGET_FILES = 5;

// In-memory cache for session download URLs (since Blob URLs cannot be persisted in localStorage)
const sessionUrlCache = new Map<string, string>();

export const getRecentFiles = (limit: number = MAX_HISTORY_ITEMS): RecentProcessedFile[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: RecentProcessedFile[] = JSON.parse(raw);
    
    // Attach session download URLs if available
    const mapped = parsed.map((item) => ({
      ...item,
      downloadUrl: sessionUrlCache.get(item.id) || item.downloadUrl,
    }));

    return limit ? mapped.slice(0, limit) : mapped;
  } catch (e) {
    console.error('Error reading recent files from localStorage:', e);
    return [];
  }
};

export const getAllHistory = (): RecentProcessedFile[] => {
  return getRecentFiles(MAX_HISTORY_ITEMS);
};

export const addRecentFile = (
  file: Omit<RecentProcessedFile, 'id' | 'timestamp'>
): RecentProcessedFile[] => {
  try {
    const current = getRecentFiles(MAX_HISTORY_ITEMS);
    const id = 'rec_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();

    if (file.downloadUrl) {
      sessionUrlCache.set(id, file.downloadUrl);
    }

    const newItem: RecentProcessedFile = {
      ...file,
      id,
      timestamp: Date.now(),
      // We don't store blob: URLs in localStorage string because they expire on refresh
      downloadUrl: file.downloadUrl?.startsWith('blob:') ? undefined : file.downloadUrl,
    };

    // Filter out duplicates with identical filename and toolId
    const filtered = current.filter(
      (item) => !(item.filename === file.filename && item.toolId === file.toolId)
    );

    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('recent-files-updated'));
    window.dispatchEvent(new Event('history-updated'));

    // Return with session URL attached
    return updated.map((item) => ({
      ...item,
      downloadUrl: sessionUrlCache.get(item.id) || item.downloadUrl,
    }));
  } catch (e) {
    console.error('Error adding recent file:', e);
    return getRecentFiles();
  }
};

export const removeRecentFile = (id: string): RecentProcessedFile[] => {
  try {
    sessionUrlCache.delete(id);
    const current = getRecentFiles(MAX_HISTORY_ITEMS);
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('recent-files-updated'));
    window.dispatchEvent(new Event('history-updated'));
    return updated;
  } catch (e) {
    console.error('Error removing recent file:', e);
    return getRecentFiles();
  }
};

export const removeHistoryItem = (id: string): RecentProcessedFile[] => {
  return removeRecentFile(id);
};

export const clearRecentFiles = (): void => {
  try {
    sessionUrlCache.clear();
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('recent-files-updated'));
    window.dispatchEvent(new Event('history-updated'));
  } catch (e) {
    console.error('Error clearing recent files:', e);
  }
};

export const clearAllHistory = (): void => {
  clearRecentFiles();
};
