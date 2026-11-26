export type ToolId = 
  // PDF tools
  | 'merge' 
  | 'split' 
  | 'compress' 
  | 'pdf-to-jpg' 
  | 'jpg-to-pdf' 
  | 'rotate' 
  | 'protect'
  | 'resize-pdf'
  | 'pdf-to-word'
  | 'word-to-pdf'
  // Image tools
  | 'compress-image'
  | 'resize-image'
  | 'crop-image'
  | 'convert-image'
  | 'watermark-image'
  | 'rotate-image'
  | 'filter-image'
  | 'merge-images'
  | 'add-name-date'
  // Govt Document tools
  | 'passport-photo'
  | 'voter-id-photo'
  | 'driving-licence-photo'
  | 'bg-remove'
  | 'photo-enhancer';

export type ToolType = 'pdf' | 'image' | 'govt';

export type ToolCategory = 
  | 'all' 
  | 'organize' 
  | 'convert' 
  | 'optimize' 
  | 'security' 
  | 'edit' 
  | 'effects'
  | 'govt';

export type SuiteSection = 'all' | 'govt' | 'pdf' | 'image' | 'history';

export type InfoModalType = 'privacy' | 'terms' | 'disclaimer' | 'about' | 'contact' | null;

export interface ToolDefinition {
  id: ToolId;
  name: string;
  shortDesc: string;
  description: string;
  toolType: ToolType;
  category: ToolCategory;
  color: string; // e.g. '#1a73e8', '#ea4335', etc.
  bgLight: string;
  iconName: string;
  accept: Record<string, string[]>;
  multiple: boolean;
  maxFilesFree: number;
  maxFilesPremium: number;
  badge?: string;
  isLockedForGuest?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  provider: 'email' | 'google';
  hasPassword: boolean;
  role: 'member';
  createdAt: string;
}

export interface UploadedFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  pageCount?: number;
  previewUrl?: string;
  thumbnailUrls?: string[];
  rotation?: number;
}

export interface PageThumbnail {
  pageNumber: number;
  thumbnail: string;
  width: number;
  height: number;
  rotation: number;
  selected?: boolean;
}

export interface ProcessResult {
  title: string;
  success: boolean;
  downloadUrl?: string;
  downloadFilename: string;
  downloadName?: string;
  fileSize?: number;
  originalSize?: number;
  zipBlob?: Blob;
  images?: { pageNum: number; dataUrl: string; filename: string }[];
  multipleFiles?: { name: string; blob: Blob; url: string; size: number }[];
  error?: string;
  message?: string;
  pageCount?: number;
  blob?: Blob;
  mimeType?: string;
  toolState?: any;
  shareId?: string;
}

export interface SharedDocumentInfo {
  id: string;
  title: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  toolId: string;
  createdAt: string;
  updatedAt: string;
  editToken?: string;
  ownerId?: string;
  ownerEmailMasked?: string;
  isOwner?: boolean;
  readOnly?: boolean;
  toolState?: any;
  stats: {
    views: number;
    downloads: number;
  };
}

export interface UserPlan {
  isPremium: boolean;
  planName: 'Free' | 'Premium';
  expiresAt?: string;
  showAds: boolean;
  fileSizeLimitMB: number; // 15MB Free vs 100MB Premium
  batchLimit: number; // 2 files Free vs unlimited (100) Premium
}

export interface RecentAction {
  id: string;
  toolId: ToolId;
  toolName: string;
  filename: string;
  timestamp: number;
  fileSize: number;
}

export interface RecentProcessedFile {
  id: string;
  toolId: ToolId;
  toolName: string;
  toolType: ToolType;
  filename: string;
  fileSize: number;
  originalSize?: number;
  timestamp: number;
  downloadUrl?: string;
}
