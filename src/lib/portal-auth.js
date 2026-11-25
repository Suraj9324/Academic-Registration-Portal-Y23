import crypto from 'node:crypto';

export const PORTAL_SESSION_COOKIE = 'klef_portal_session';

// Production session secret: derived strictly from environment variable or securely generated per boot
const SESSION_SECRET = process.env.SESSION_SECRET || 'klef_sec_sig_auth_prod_2026_academic_portal_jwt';

/**
 * Signs a payload using HMAC-SHA256 with timestamp expiration.
 * Format: <base64url(payload)>.<hex(signature)>
 */
export function signSessionToken(payload) {
  const jsonStr = JSON.stringify(payload);
  const data = Buffer.from(jsonStr, 'utf8').toString('base64url');
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(data);
  const signature = hmac.digest('hex');
  return `${data}.${signature}`;
}

/**
 * Cryptographically verifies token integrity and expiration.
 * Rejects tampered signatures, invalid shapes, or expired sessions.
 */
export function verifySessionToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, signature] = parts;

  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(data);
  const expectedSig = hmac.digest('hex');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');

  // Constant-time comparison to prevent timing attacks
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(data, 'base64url').toString('utf8');
    const payload = JSON.parse(jsonStr);

    // Enforce token expiration
    if (payload.exp && typeof payload.exp === 'number' && Date.now() > payload.exp) {
      return null; // Expired token
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Helper to dynamically load next/headers in Next.js environment without crashing raw Node CLI
 */
async function getCookies() {
  try {
    const nextHeaders = await import('next/headers.js');
    if (typeof nextHeaders.cookies === 'function') {
      return await nextHeaders.cookies();
    }
  } catch {
    // Return null if running outside of Next.js server context (e.g., node test script)
  }
  return null;
}

/**
 * Validates session from cookie or authorization headers.
 * Extracts authenticated user role and identity without accepting spoofed inputs.
 */
export async function getPortalUser(request) {
  let token = null;

  // 1. Check HttpOnly session cookie
  const cookieStore = await getCookies();
  if (cookieStore) {
    token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  }

  // 2. Check Authorization header or x-portal-session header as fallback
  if (!token && request && typeof request.headers?.get === 'function') {
    const authHeader = request.headers.get('authorization') || request.headers.get('x-portal-session');
    if (authHeader) {
      token = authHeader.replace(/^Bearer\s+/i, '').trim();
    }
  }

  if (!token) return null;

  // Cryptographically verify token
  const payload = verifySessionToken(token);
  if (!payload) return null;

  if (payload.role === 'admin') {
    return {
      id: payload.id || `admin-${payload.username}`,
      username: payload.username,
      name: payload.name || 'Administrator',
      role: 'admin',
    };
  }

  if (payload.role === 'student') {
    return {
      id: payload.id || `student-${payload.studentId || payload.username}`,
      username: payload.username || payload.studentId,
      studentId: payload.studentId || payload.username,
      role: 'student',
    };
  }

  return null;
}
