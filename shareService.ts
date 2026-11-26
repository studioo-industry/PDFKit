import { SharedDocumentInfo } from '../types';

const STORAGE_KEY = 'pdfkit_saved_shares';

export interface LocalShareRecord {
  id: string;
  editToken: string;
  title: string;
  filename: string;
  mimeType: string;
  toolId: string;
  createdAt: string;
}

export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    if (origin && origin !== 'null' && !origin.startsWith('file:')) {
      return origin;
    }
    if (window.location.host) {
      const proto =
        window.location.protocol && !window.location.protocol.startsWith('file:')
          ? window.location.protocol
          : 'https:';
      return `${proto}//${window.location.host}`;
    }
  }
  return '';
}

export function blobToBase64(data: Blob | Uint8Array | ArrayBuffer | string | any): Promise<string> {
  if (!data) {
    return Promise.reject(new Error('No data provided to convert to base64'));
  }

  // If already string
  if (typeof data === 'string') {
    if (data.startsWith('data:')) {
      return Promise.resolve(data);
    }
    return Promise.resolve(`data:application/octet-stream;base64,${data}`);
  }

  // If typed array or ArrayBuffer
  let blob: Blob;
  if (data instanceof Blob) {
    blob = data;
  } else if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
    blob = new Blob([data]);
  } else if (data && data.buffer instanceof ArrayBuffer) {
    blob = new Blob([data.buffer]);
  } else {
    try {
      blob = new Blob([data]);
    } catch (e) {
      return Promise.reject(new Error('Invalid data format cannot be converted to Blob'));
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as base64 string'));
      }
    };
    reader.onerror = () => {
      reject(reader.error || new Error('Failed to read file for sharing'));
    };
    reader.readAsDataURL(blob);
  });
}

export function getLocalUserShares(): LocalShareRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalUserShare(share: LocalShareRecord) {
  try {
    const shares = getLocalUserShares().filter((s) => s.id !== share.id);
    shares.unshift(share);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shares.slice(0, 50)));
  } catch (e) {
    console.warn('Failed to save share locally', e);
  }
}

export function getEditTokenForShare(id: string): string | undefined {
  const shares = getLocalUserShares();
  const match = shares.find((s) => s.id === id);
  return match?.editToken;
}

export interface CreateSharePayload {
  title: string;
  filename: string;
  mimeType: string;
  blob?: Blob;
  fileData?: string;
  toolId: string;
  toolState?: any;
}

export function getAuthHeader(): Record<string, string> {
  try {
    const token = localStorage.getItem('pdfkit_auth_token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch {
    // Ignore localStorage failures
  }
  return {};
}

export async function createShareDocument(payload: CreateSharePayload): Promise<{
  id: string;
  shareUrl: string;
  fullUrl: string;
  editToken: string;
  metadata: SharedDocumentInfo;
}> {
  let fileData = payload.fileData;
  if (!fileData && payload.blob) {
    fileData = await blobToBase64(payload.blob);
  }

  if (!fileData) {
    throw new Error('File data or blob is required to create a share link.');
  }

  const authHeaders = getAuthHeader();
  if (!authHeaders.Authorization) {
    throw new Error('Please sign in or create an account to generate a share link.');
  }

  const res = await fetch('/api/share', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...authHeaders
    },
    body: JSON.stringify({
      title: payload.title,
      filename: payload.filename,
      mimeType: payload.mimeType,
      fileData,
      toolId: payload.toolId,
      toolState: payload.toolState,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate share link.');
  }

  const data = await res.json();
  const baseUrl = getAppBaseUrl();
  const fullUrl = baseUrl ? `${baseUrl}/?share=${data.id}` : (data.shareUrl || `/?share=${data.id}`);

  saveLocalUserShare({
    id: data.id,
    editToken: data.editToken,
    title: payload.title,
    filename: payload.filename,
    mimeType: payload.mimeType,
    toolId: payload.toolId,
    createdAt: new Date().toISOString(),
  });

  return {
    id: data.id,
    shareUrl: data.shareUrl,
    fullUrl,
    editToken: data.editToken,
    metadata: {
      ...data.metadata,
      isOwner: true,
      readOnly: false,
    },
  };
}

export async function fetchSharedDocument(id: string): Promise<{
  document: SharedDocumentInfo;
  fileUrl: string;
  downloadUrl: string;
}> {
  const authHeaders = getAuthHeader();
  const localEditToken = getEditTokenForShare(id);
  const editTokenParam = localEditToken ? `?editToken=${encodeURIComponent(localEditToken)}` : '';

  const res = await fetch(`/api/share/${encodeURIComponent(id)}${editTokenParam}`, {
    headers: {
      ...authHeaders,
      ...(localEditToken ? { 'x-edit-token': localEditToken } : {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Document not found.');
  }
  const data = await res.json();
  return {
    document: data.document,
    fileUrl: data.fileUrl,
    downloadUrl: data.downloadUrl,
  };
}

export async function updateShareDocument(
  id: string,
  payload: {
    editToken?: string;
    title?: string;
    filename?: string;
    mimeType?: string;
    blob?: Blob;
    fileData?: string;
    toolState?: any;
  }
): Promise<{ success: boolean; document: SharedDocumentInfo }> {
  const token = payload.editToken || getEditTokenForShare(id);
  const authHeaders = getAuthHeader();
  let fileData = payload.fileData;
  if (!fileData && payload.blob) {
    fileData = await blobToBase64(payload.blob);
  }

  const res = await fetch(`/api/share/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      editToken: token,
      title: payload.title,
      filename: payload.filename,
      mimeType: payload.mimeType,
      fileData,
      toolState: payload.toolState,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update shared document.');
  }

  return await res.json();
}
