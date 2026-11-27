import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { isSqlConfigured } from '../db/index.ts';
import { getOrCreateUser } from '../db/users.ts';

export const CUSTOMER_COOKIE_NAME = 'cc_customer_session';
export const CUSTOMER_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

let secretResolver: () => string = () =>
  process.env.SESSION_SECRET?.trim() || 'classy-cases-fallback-ephemeral-key';

export function registerCustomerSessionSecretResolver(resolver: () => string) {
  secretResolver = resolver;
}

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUserId?: number;
}

export function createCustomerAccountSessionToken(user: {
  uid: string;
  email: string;
  name?: string;
}): string {
  const payload = Buffer.from(
    JSON.stringify({
      role: 'customer_account',
      uid: user.uid,
      email: user.email,
      name: user.name || '',
      iat: Date.now(),
      exp: Date.now() + CUSTOMER_COOKIE_MAX_AGE_SECONDS * 1000,
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', secretResolver())
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyCustomerAccountSessionToken(token: string): DecodedIdToken | null {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', secretResolver())
    .update(payload)
    .digest('base64url');
  const b1 = Buffer.from(sig);
  const b2 = Buffer.from(expectedSig);
  if (b1.length !== b2.length || !crypto.timingSafeEqual(b1, b2)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      role?: string;
      uid?: string;
      email?: string;
      name?: string;
      exp?: number;
    };
    if (
      parsed.role === 'customer_account' &&
      typeof parsed.uid === 'string' &&
      parsed.uid.trim() &&
      typeof parsed.exp === 'number' &&
      parsed.exp > Date.now()
    ) {
      return {
        uid: parsed.uid,
        email: parsed.email || '',
        name: parsed.name || '',
        email_verified: true,
        aud: 'classy-cases',
        auth_time: Math.floor(Date.now() / 1000),
        exp: Math.floor(parsed.exp / 1000),
        firebase: { identities: {}, sign_in_provider: 'password' },
        iat: Math.floor(Date.now() / 1000),
        iss: 'classy-cases',
        sub: parsed.uid,
      } as DecodedIdToken;
    }
    return null;
  } catch {
    return null;
  }
}

export function extractCustomerCookieToken(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header || typeof header !== 'string') return null;
  for (const part of header.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    if (key === CUSTOMER_COOKIE_NAME) {
      const val = part.slice(eqIdx + 1).trim();
      try {
        return decodeURIComponent(val);
      } catch {
        return val;
      }
    }
  }
  return null;
}

function isSameOriginMutationForCookie(req: Request): boolean {
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') return true;
  const expectedHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (!expectedHost) return false;
  const sourceHeader = req.headers.origin || req.headers.referer;
  if (!sourceHeader || typeof sourceHeader !== 'string') return false;
  try {
    return new URL(sourceHeader).host.toLowerCase() === expectedHost;
  } catch {
    return false;
  }
}

async function resolveAuthenticatedCustomer(req: Request): Promise<DecodedIdToken | null> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1]?.trim();
    if (token) {
      if (token.split('.').length === 2) {
        const verified = verifyCustomerAccountSessionToken(token);
        if (verified) return verified;
      } else if (token.split('.').length === 3) {
        return await adminAuth.verifyIdToken(token);
      }
    }
  }

  const cookieToken = extractCustomerCookieToken(req);
  if (cookieToken) {
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
    if (isMutation && !isSameOriginMutationForCookie(req)) {
      return null;
    }
    const verified = verifyCustomerAccountSessionToken(cookieToken);
    if (verified) return verified;
  }

  return null;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const decodedToken = await resolveAuthenticatedCustomer(req);
    if (!decodedToken) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid session' });
      return;
    }
    req.user = decodedToken;
    if (isSqlConfigured()) {
      const dbUser = await getOrCreateUser(decodedToken.uid, decodedToken.email || '');
      req.dbUserId = dbUser?.id;
    }
    next();
  } catch (error) {
    console.error('Error verifying customer auth token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const decodedToken = await resolveAuthenticatedCustomer(req);
    if (decodedToken) {
      req.user = decodedToken;
      if (isSqlConfigured()) {
        const dbUser = await getOrCreateUser(decodedToken.uid, decodedToken.email || '');
        req.dbUserId = dbUser?.id;
      }
    }
  } catch {
    // Ignore invalid optional customer token; treat request as guest
  }
  next();
};
