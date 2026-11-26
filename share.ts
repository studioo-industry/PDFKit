import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { verifyToken } from './auth';

export interface SharedDocumentMetadata {
  id: string;
  title: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  toolId: string;
  createdAt: string;
  updatedAt: string;
  editToken: string;
  ownerId: string;
  ownerEmail: string;
  toolState?: any;
  stats: {
    views: number;
    downloads: number;
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SHARES_DIR = path.join(DATA_DIR, 'shares');
const SHARES_FILES_DIR = path.join(SHARES_DIR, 'files');
const SHARES_INDEX_FILE = path.join(SHARES_DIR, 'index.json');

function ensureShareStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SHARES_DIR)) {
    fs.mkdirSync(SHARES_DIR, { recursive: true });
  }
  if (!fs.existsSync(SHARES_FILES_DIR)) {
    fs.mkdirSync(SHARES_FILES_DIR, { recursive: true });
  }
  if (!fs.existsSync(SHARES_INDEX_FILE)) {
    fs.writeFileSync(SHARES_INDEX_FILE, JSON.stringify([]), 'utf-8');
  }
}

function getShares(): SharedDocumentMetadata[] {
  ensureShareStorage();
  try {
    const data = fs.readFileSync(SHARES_INDEX_FILE, 'utf-8');
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

function saveShares(shares: SharedDocumentMetadata[]) {
  ensureShareStorage();
  fs.writeFileSync(SHARES_INDEX_FILE, JSON.stringify(shares, null, 2), 'utf-8');
}

function getFileExtension(filename: string, mimeType: string): string {
  const match = filename.match(/\.([0-9a-z]+)$/i);
  if (match) return '.' + match[1].toLowerCase();
  if (mimeType.includes('pdf')) return '.pdf';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return '.jpg';
  if (mimeType.includes('png')) return '.png';
  if (mimeType.includes('webp')) return '.webp';
  if (mimeType.includes('zip')) return '.zip';
  if (mimeType.includes('word') || mimeType.includes('document')) return '.docx';
  return '.bin';
}

export function setupShareRoutes(app: express.Express) {
  // Helper to extract authenticated user from Bearer token if present
  const getAuthUser = (req: Request) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return verifyToken(token);
    }
    return null;
  };

  // 1. Create a new Shared Document (Requires Signed-in User)
  app.post('/api/share', (req: Request, res: Response): any => {
    try {
      // STRICT REQUIREMENT: Only signed-in / signed-up users can create share links
      const authUser = getAuthUser(req);
      if (!authUser) {
        return res.status(401).json({
          error: 'Account Required: You must sign in or create an account to create shareable links. Only signed-in users can access this feature.',
          code: 'AUTH_REQUIRED',
        });
      }

      const { title, filename, mimeType, fileData, toolId, toolState } = req.body;

      if (!fileData) {
        return res.status(400).json({ error: 'File data is required.' });
      }

      ensureShareStorage();

      // Clean base64 data
      let base64 = fileData;
      if (typeof fileData === 'string' && fileData.includes(',')) {
        base64 = fileData.split(',')[1];
      }

      const buffer = Buffer.from(base64, 'base64');
      const safeId = 'doc_' + crypto.randomBytes(6).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
      const safeFilename = filename || 'document.pdf';
      const ext = getFileExtension(safeFilename, mimeType || 'application/pdf');
      const filePath = path.join(SHARES_FILES_DIR, `${safeId}${ext}`);

      fs.writeFileSync(filePath, buffer);

      const editToken = 'edt_' + crypto.randomBytes(16).toString('hex');
      const now = new Date().toISOString();

      const metadata: SharedDocumentMetadata = {
        id: safeId,
        title: title || safeFilename,
        filename: safeFilename,
        mimeType: mimeType || 'application/pdf',
        fileSize: buffer.length,
        toolId: toolId || 'jpg-to-pdf',
        createdAt: now,
        updatedAt: now,
        editToken,
        ownerId: authUser.userId,
        ownerEmail: authUser.email,
        toolState: toolState || null,
        stats: {
          views: 0,
          downloads: 0,
        },
      };

      const shares = getShares();
      shares.unshift(metadata);
      saveShares(shares);

      return res.json({
        success: true,
        id: safeId,
        shareUrl: `/?share=${safeId}`,
        editToken,
        isOwner: true,
        metadata: {
          ...metadata,
          isOwner: true,
          readOnly: false,
          editToken, // Provided to verified owner creator
        },
      });
    } catch (err: any) {
      console.error('Error creating share:', err);
      return res.status(500).json({ error: err?.message || 'Failed to create shareable link.' });
    }
  });

  // 2. Get Shared Document Metadata (Checks if viewer is owner vs read-only guest)
  app.get('/api/share/:id', (req: Request, res: Response): any => {
    try {
      const { id } = req.params;
      const shares = getShares();
      const item = shares.find((s) => s.id === id);

      if (!item) {
        return res.status(404).json({ error: 'Shared document not found or expired.' });
      }

      // Check if file exists on disk
      const ext = getFileExtension(item.filename, item.mimeType);
      const filePath = path.join(SHARES_FILES_DIR, `${item.id}${ext}`);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'The file for this shared link is no longer available.' });
      }

      // Increment view count
      item.stats.views = (item.stats.views || 0) + 1;
      saveShares(shares);

      // Verify if current viewer is the Document Owner
      const authUser = getAuthUser(req);
      const reqEditToken = (req.query.editToken as string) || (req.headers['x-edit-token'] as string);

      let isOwner = false;
      if (authUser && item.ownerId && authUser.userId === item.ownerId) {
        isOwner = true;
      } else if (reqEditToken && item.editToken && reqEditToken === item.editToken) {
        isOwner = true;
      }

      // Mask owner email for recipient privacy
      const maskedOwnerEmail = item.ownerEmail
        ? `${item.ownerEmail.substring(0, 3)}***@${item.ownerEmail.split('@')[1] || 'domain'}`
        : 'Owner';

      // Prepare response: non-owners NEVER receive editToken and are marked readOnly: true
      const { editToken: _, ...publicMetadata } = item;

      return res.json({
        success: true,
        document: {
          ...publicMetadata,
          isOwner,
          readOnly: !isOwner,
          ownerEmailMasked: maskedOwnerEmail,
          editToken: isOwner ? item.editToken : undefined,
        },
        isOwner,
        readOnly: !isOwner,
        fileUrl: `/api/share/${item.id}/file`,
        downloadUrl: `/api/share/${item.id}/download`,
      });
    } catch (err: any) {
      console.error('Error retrieving share metadata:', err);
      return res.status(500).json({ error: err?.message || 'Failed to load document.' });
    }
  });

  // 3. Serve Raw File (for inline browser viewing / PDF canvas / image rendering)
  app.get('/api/share/:id/file', (req: Request, res: Response): any => {
    try {
      const { id } = req.params;
      const shares = getShares();
      const item = shares.find((s) => s.id === id);

      if (!item) {
        return res.status(404).send('Document not found');
      }

      const ext = getFileExtension(item.filename, item.mimeType);
      const filePath = path.join(SHARES_FILES_DIR, `${item.id}${ext}`);

      if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found on disk');
      }

      res.setHeader('Content-Type', item.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(item.filename)}"`);
      res.setHeader('Cache-Control', 'public, max-age=86400');

      const stream = fs.createReadStream(filePath);
      return stream.pipe(res);
    } catch (err: any) {
      console.error('Error serving shared file:', err);
      return res.status(500).send('Internal Server Error');
    }
  });

  // 4. Download File Attachment (Direct Download)
  app.get('/api/share/:id/download', (req: Request, res: Response): any => {
    try {
      const { id } = req.params;
      const shares = getShares();
      const item = shares.find((s) => s.id === id);

      if (!item) {
        return res.status(404).send('Document not found');
      }

      const ext = getFileExtension(item.filename, item.mimeType);
      const filePath = path.join(SHARES_FILES_DIR, `${item.id}${ext}`);

      if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
      }

      item.stats.downloads = (item.stats.downloads || 0) + 1;
      saveShares(shares);

      return res.download(filePath, item.filename);
    } catch (err: any) {
      console.error('Error downloading shared file:', err);
      return res.status(500).send('Internal Server Error');
    }
  });

  // 5. Update / Edit Shared Document (STRICT OWNER-ONLY ACCESS)
  app.put('/api/share/:id', (req: Request, res: Response): any => {
    try {
      const { id } = req.params;
      const { editToken, title, filename, fileData, mimeType, toolState } = req.body;

      const shares = getShares();
      const item = shares.find((s) => s.id === id);

      if (!item) {
        return res.status(404).json({ error: 'Shared document not found.' });
      }

      // Check if caller is the verified owner
      const authUser = getAuthUser(req);
      let isAuthorizedOwner = false;

      if (authUser && item.ownerId && authUser.userId === item.ownerId) {
        isAuthorizedOwner = true;
      } else if (editToken && item.editToken && editToken === item.editToken) {
        isAuthorizedOwner = true;
      }

      if (!isAuthorizedOwner) {
        return res.status(403).json({
          error: 'Access Denied: Only the verified owner of this document can modify or change it. No access is granted to anyone else to modify it.',
          code: 'OWNER_ONLY_MODIFICATION',
        });
      }

      if (title) item.title = title;
      if (filename) item.filename = filename;
      if (mimeType) item.mimeType = mimeType;
      if (toolState !== undefined) item.toolState = toolState;

      // Update binary file if new data was provided
      if (fileData) {
        let base64 = fileData;
        if (typeof fileData === 'string' && fileData.includes(',')) {
          base64 = fileData.split(',')[1];
        }
        const buffer = Buffer.from(base64, 'base64');
        const ext = getFileExtension(item.filename, item.mimeType);
        const filePath = path.join(SHARES_FILES_DIR, `${item.id}${ext}`);
        fs.writeFileSync(filePath, buffer);
        item.fileSize = buffer.length;
      }

      item.updatedAt = new Date().toISOString();
      saveShares(shares);

      return res.json({
        success: true,
        message: 'Document updated successfully by owner!',
        document: item,
      });
    } catch (err: any) {
      console.error('Error updating shared document:', err);
      return res.status(500).json({ error: err?.message || 'Failed to update document.' });
    }
  });

  // 6. Delete Shared Document (STRICT OWNER-ONLY ACCESS)
  app.delete('/api/share/:id', (req: Request, res: Response): any => {
    try {
      const { id } = req.params;
      const { editToken } = req.body;

      const shares = getShares();
      const index = shares.findIndex((s) => s.id === id);

      if (index === -1) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      const item = shares[index];
      const authUser = getAuthUser(req);
      let isAuthorizedOwner = false;

      if (authUser && item.ownerId && authUser.userId === item.ownerId) {
        isAuthorizedOwner = true;
      } else if (editToken && item.editToken && editToken === item.editToken) {
        isAuthorizedOwner = true;
      }

      if (!isAuthorizedOwner) {
        return res.status(403).json({
          error: 'Access Denied: Only the document owner can delete this document.',
        });
      }

      const ext = getFileExtension(item.filename, item.mimeType);
      const filePath = path.join(SHARES_FILES_DIR, `${item.id}${ext}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      shares.splice(index, 1);
      saveShares(shares);

      return res.json({ success: true, message: 'Document deleted successfully by owner.' });
    } catch (err: any) {
      console.error('Error deleting document:', err);
      return res.status(500).json({ error: 'Failed to delete document.' });
    }
  });
}
