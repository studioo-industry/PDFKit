import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { notifyAdminOnSignIn, getNotifications } from './adminNotifier';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  salt?: string;
  provider: 'email' | 'google';
  hasPassword: boolean;
  createdAt: string;
  lastLoginAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const JWT_SECRET = process.env.AUTH_SECRET || 'pdfkit-auth-secret-key-cross-device-2026';

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]), 'utf-8');
  }
}

function getUsers(): StoredUser[] {
  ensureStorage();
  try {
    const content = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(content) || [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  ensureStorage();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export function signToken(userId: string, email: string): string {
  const payload = {
    userId,
    email,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };
  const str = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(str).digest('base64url');
  return `${str}.${sig}`;
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [str, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(str).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(str, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function sanitizeUser(user: StoredUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider,
    hasPassword: user.hasPassword,
    role: 'member',
    createdAt: user.createdAt,
  };
}

export function setupAuthRoutes(app: express.Express) {
  // 1. Sign Up with Email & Password
  app.post('/api/auth/signup', (req: Request, res: Response): any => {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const users = getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
    const userName = name && String(name).trim() ? String(name).trim() : cleanEmail.split('@')[0];

    const newUser: StoredUser = {
      id: userId,
      email: cleanEmail,
      name: userName,
      passwordHash,
      salt,
      provider: 'email',
      hasPassword: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);

    // Send sign-up details directly to admin email: playzoneofficial99@gmail.com
    notifyAdminOnSignIn({
      eventType: 'SIGN_UP',
      userEmail: newUser.email,
      userName: newUser.name,
      userId: newUser.id,
      provider: 'email',
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    }).catch((e) => console.warn('Admin notification warning on signup:', e));

    const token = signToken(newUser.id, newUser.email);
    return res.json({
      user: sanitizeUser(newUser),
      token,
      message: 'Account created successfully!',
    });
  });

  // 2. Sign In with Email & Password
  app.post('/api/auth/login', (req: Request, res: Response): any => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const users = getUsers();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(401).json({ error: 'No account found with this email. Please sign up.' });
    }

    if (!user.passwordHash || !user.salt) {
      return res.status(400).json({ 
        error: 'This account was created with Google. Please use Continue with Google, or set a password in Account Settings.' 
      });
    }

    const testHash = hashPassword(password, user.salt);
    if (testHash !== user.passwordHash) {
      return res.status(401).json({ error: 'Incorrect password. Please try again or reset your password.' });
    }

    user.lastLoginAt = new Date().toISOString();
    saveUsers(users);

    // Send sign-in details directly to admin email: playzoneofficial99@gmail.com
    notifyAdminOnSignIn({
      eventType: 'SIGN_IN',
      userEmail: user.email,
      userName: user.name,
      userId: user.id,
      provider: 'email',
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    }).catch((e) => console.warn('Admin notification warning on login:', e));

    const token = signToken(user.id, user.email);
    return res.json({
      user: sanitizeUser(user),
      token,
      message: 'Logged in successfully!',
    });
  });

  // 3. Continue with Google
  app.post('/api/auth/google', (req: Request, res: Response): any => {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Google email is required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const users = getUsers();
    let user = users.find((u) => u.email.toLowerCase() === cleanEmail);
    const isNewUser = !user;

    if (!user) {
      // Create new Google-linked user
      const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
      const userName = name && String(name).trim() ? String(name).trim() : cleanEmail.split('@')[0];
      user = {
        id: userId,
        email: cleanEmail,
        name: userName,
        provider: 'google',
        hasPassword: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      users.push(user);
    } else {
      user.lastLoginAt = new Date().toISOString();
      if (name && !user.name) user.name = String(name).trim();
    }

    saveUsers(users);

    // Send sign-in/up details directly to admin email: playzoneofficial99@gmail.com
    notifyAdminOnSignIn({
      eventType: isNewUser ? 'SIGN_UP' : 'GOOGLE_AUTH',
      userEmail: user.email,
      userName: user.name,
      userId: user.id,
      provider: 'google',
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    }).catch((e) => console.warn('Admin notification warning on google auth:', e));

    const token = signToken(user.id, user.email);
    return res.json({
      user: sanitizeUser(user),
      token,
      message: 'Google authentication successful!',
    });
  });

  // 4. Set / Change Password (Cross-Device Access)
  app.post('/api/auth/set-password', (req: Request, res: Response): any => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token.' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }

    const { newPassword, currentPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const users = getUsers();
    const user = users.find((u) => u.id === decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // If user already has password, verify current password
    if (user.hasPassword && user.passwordHash && user.salt) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Please enter your current password to set a new one.' });
      }
      const testHash = hashPassword(currentPassword, user.salt);
      if (testHash !== user.passwordHash) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }
    }

    // Hash new password
    const salt = crypto.randomBytes(16).toString('hex');
    user.passwordHash = hashPassword(newPassword, salt);
    user.salt = salt;
    user.hasPassword = true;
    saveUsers(users);

    return res.json({
      success: true,
      message: 'Password set successfully! You can now access your account from any device with your email and password.',
      user: sanitizeUser(user),
    });
  });

  // 5. Get Current User Profile (/api/auth/me)
  app.get('/api/auth/me', (req: Request, res: Response): any => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    const users = getUsers();
    const user = users.find((u) => u.id === decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({
      user: sanitizeUser(user),
    });
  });

  // 6. Logout
  app.post('/api/auth/logout', (_req: Request, res: Response) => {
    res.json({ success: true, message: 'Logged out successfully.' });
  });

  // 7. Admin Audit & Notifications for playzoneofficial99@gmail.com
  app.get('/api/admin/signin-alerts', (req: Request, res: Response): any => {
    const list = getNotifications();
    return res.json({
      adminTargetEmail: 'playzoneofficial99@gmail.com',
      totalCount: list.length,
      alerts: list,
    });
  });
}
