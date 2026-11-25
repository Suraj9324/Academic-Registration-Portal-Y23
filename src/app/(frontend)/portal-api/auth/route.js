import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getPortalUser, signSessionToken, PORTAL_SESSION_COOKIE } from '@/lib/portal-auth'
import { academicDb } from '@/lib/db/queries'

const error = (message, status = 400) => NextResponse.json({ ok: false, message }, { status })

/**
 * Constant-time string comparison to prevent timing analysis on credentials.
 */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) {
    // Dummy timing equalization
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export async function GET() {
  const user = await getPortalUser()
  if (!user) return error('Not signed in.', 401)
  return NextResponse.json({ ok: true, user })
}

export async function POST(request) {
  const body = await request.json().catch(() => null)
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!/^\d{10}$/.test(username) || !password) return error('Enter a valid 10-digit ID and credential.')

  const ADMIN_ID = process.env.ADMIN_ID || '8897337687';
  
  // If attempting admin login (matches configured ADMIN_ID, 2400030952, or 8897337687)
  const isTargetingAdmin = username === ADMIN_ID || username === '2400030952' || username === '8897337687';

  if (isTargetingAdmin) {
    // Fetch live administrator password from SQL table first
    const adminRecord = academicDb.getAdministrator(username) || academicDb.getAdministrator('2400030952') || academicDb.getAdministrator('8897337687');
    const expectedPassword = adminRecord?.password_hash || process.env.ADMIN_PASSWORD;

    if (!expectedPassword || !safeCompare(password, expectedPassword)) {
      return error('The administrator credential entered is incorrect.', 401);
    }

    const adminName = adminRecord?.name || 'G Bhaanu';

    // Generate signed HMAC session token with 8-hour expiration
    const sessionPayload = {
      id: `admin-${username}`,
      username: username,
      name: adminName,
      role: 'admin',
      exp: Date.now() + 1000 * 60 * 60 * 8, // 8 hours
    };
    const signedToken = signSessionToken(sessionPayload);

    const cookieStore = await cookies();
    cookieStore.set(PORTAL_SESSION_COOKIE, signedToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    return NextResponse.json({
      ok: true,
      token: signedToken,
      user: {
        id: `admin-${username}`,
        username: username,
        name: adminName,
        role: 'admin',
      },
    });
  }

  // Student authentication
  const sessionPayload = {
    id: `student-${username}`,
    username: username,
    studentId: username,
    role: 'student',
    exp: Date.now() + 1000 * 60 * 60 * 8, // 8 hours
  };
  const signedToken = signSessionToken(sessionPayload);

  const cookieStore = await cookies()
  cookieStore.set(PORTAL_SESSION_COOKIE, signedToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  })

  return NextResponse.json({
    ok: true,
    token: signedToken,
    user: {
      id: `student-${username}`,
      username: username,
      name: 'Enrolled Student',
      role: 'student',
    },
  })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.set(PORTAL_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return NextResponse.json({ ok: true })
}
