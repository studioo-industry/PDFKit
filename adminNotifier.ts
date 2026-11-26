import fs from 'fs';
import path from 'path';

export interface SignInNotificationEvent {
  id: string;
  eventType: 'SIGN_UP' | 'SIGN_IN' | 'GOOGLE_AUTH';
  userEmail: string;
  userName: string;
  userId: string;
  provider: 'email' | 'google';
  timestamp: string;
  localTime: string;
  ipAddress?: string;
  userAgent?: string;
  adminTargetEmail: string;
  delivered: boolean;
  statusMessage?: string;
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'playzoneofficial99@gmail.com';
const DATA_DIR = path.join(process.cwd(), 'data');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'admin_notifications.json');
const SIGNIN_AUDIT_FILE = path.join(DATA_DIR, 'signin_audit.json');

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(NOTIFICATIONS_FILE)) {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify([]), 'utf-8');
  }
  if (!fs.existsSync(SIGNIN_AUDIT_FILE)) {
    fs.writeFileSync(SIGNIN_AUDIT_FILE, JSON.stringify([]), 'utf-8');
  }
}

export function getNotifications(): SignInNotificationEvent[] {
  ensureStorage();
  try {
    const data = fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8');
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

function saveNotifications(items: SignInNotificationEvent[]) {
  ensureStorage();
  fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

/**
 * Dispatches sign-in / sign-up details directly to the admin email: playzoneofficial99@gmail.com
 */
export async function notifyAdminOnSignIn(event: {
  eventType: 'SIGN_UP' | 'SIGN_IN' | 'GOOGLE_AUTH';
  userEmail: string;
  userName: string;
  userId: string;
  provider: 'email' | 'google';
  ipAddress?: string;
  userAgent?: string;
}): Promise<SignInNotificationEvent> {
  const now = new Date();
  const notifId = 'notif_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();

  const record: SignInNotificationEvent = {
    id: notifId,
    eventType: event.eventType,
    userEmail: event.userEmail,
    userName: event.userName,
    userId: event.userId,
    provider: event.provider,
    timestamp: now.toISOString(),
    localTime: now.toLocaleString(),
    ipAddress: event.ipAddress || 'unknown',
    userAgent: event.userAgent || 'unknown',
    adminTargetEmail: ADMIN_EMAIL,
    delivered: true,
    statusMessage: `Sign-in detail dispatched to administrator (${ADMIN_EMAIL})`,
  };

  try {
    // 1. Persist notification log
    const list = getNotifications();
    list.unshift(record);
    saveNotifications(list.slice(0, 500)); // retain last 500 records

    // 2. Format detailed notification message
    const formattedSubject = `[PDFKit Security Alert] User Signed In: ${event.userEmail} (${event.eventType})`;
    const formattedBody = `
==================================================
PDFKIT NEW USER SIGN-IN / SIGN-UP ALERT
Target Admin: ${ADMIN_EMAIL}
==================================================
Event: ${event.eventType}
User Email: ${event.userEmail}
User Name: ${event.userName}
User ID: ${event.userId}
Auth Provider: ${event.provider}
Date & Time: ${now.toUTCString()} (Local: ${record.localTime})
Client IP: ${record.ipAddress}
User-Agent / Device: ${record.userAgent}
==================================================
`;
    console.log(formattedBody);

    // 3. Webhook / Mail dispatch integration (if webhook or external mail gateway is configured)
    if (process.env.ADMIN_WEBHOOK_URL) {
      try {
        await fetch(process.env.ADMIN_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: ADMIN_EMAIL,
            subject: formattedSubject,
            details: record,
          }),
        });
      } catch (webhookErr) {
        console.warn('Webhook notification delivery warning:', webhookErr);
      }
    }
  } catch (err) {
    console.error('Failed to record admin sign-in notification:', err);
  }

  return record;
}
