import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  sendEmailVerification,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

interface ServerSessionUserPayload {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

function buildSessionUser(payload: ServerSessionUserPayload): User {
  return {
    uid: payload.uid,
    email: payload.email || null,
    displayName: payload.displayName || null,
    photoURL: payload.photoURL || null,
    emailVerified: true,
  } as unknown as User;
}

export function formatFirebaseAuthError(error: unknown): string {
  const rawCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';
  const msg = error instanceof Error ? error.message : String(error || 'Authentication failed');

  if (rawCode === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return `Google Sign-In is not enabled for "${host}". Please use Email & Password below to sign in or create your account.`;
  }

  switch (rawCode) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Please choose a stronger password (at least 6 characters).';
    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Please wait a moment before trying again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completing authentication.';
    case 'auth/popup-blocked':
      return 'Pop-up was blocked by your browser. Please allow pop-ups or sign in with email.';
    case 'auth/network-request-failed':
      return 'Network error occurred. Please check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Google Sign-In is disabled on this preview domain. Please sign in with Email & Password below.';
    default:
      return msg.replace(/^Firebase:\s*/i, '').replace(/\s*\(auth\/[^)]+\)\.?$/i, '') || 'Authentication failed.';
  }
}

interface FirebaseAuthContextValue {
  user: User | null;
  idToken: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ user: User; idToken: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ user: User; idToken: string }>;
  signUpWithEmail: (displayName: string, email: string, password: string) => Promise<{ user: User; idToken: string }>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateAuthDisplayName: (displayName: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextValue | null>(null);

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (cancelled) return;
      if (nextUser) {
        setUser(nextUser);
        try {
          const token = await nextUser.getIdToken();
          if (!cancelled) setIdToken(token);
        } catch {
          if (!cancelled) setIdToken(null);
        }
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/account/auth/me', {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (res.ok) {
          const data = (await res.json()) as {
            authenticated?: boolean;
            token?: string;
            user?: ServerSessionUserPayload;
          };
          if (!cancelled && data.authenticated && data.user && data.token) {
            setUser(buildSessionUser(data.user));
            setIdToken(data.token);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Treat as signed out when session check fails
      }

      if (!cancelled) {
        setUser(null);
        setIdToken(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const credential = await signInWithPopup(auth, googleAuthProvider);
    const token = await credential.user.getIdToken();
    setUser(credential.user);
    setIdToken(token);
    return { user: credential.user, idToken: token };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/account/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      token?: string;
      user?: ServerSessionUserPayload;
    };
    if (!res.ok || !data.user || !data.token) {
      throw new Error(
        data.error || 'Incorrect email or password. Please check your credentials and try again.'
      );
    }
    const sessionUser = buildSessionUser(data.user);
    setUser(sessionUser);
    setIdToken(data.token);
    return { user: sessionUser, idToken: data.token };
  }, []);

  const signUpWithEmail = useCallback(async (displayName: string, email: string, password: string) => {
    const res = await fetch('/api/account/auth/register', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      token?: string;
      user?: ServerSessionUserPayload;
    };
    if (!res.ok || !data.user || !data.token) {
      throw new Error(data.error || 'Could not create account. Please try again.');
    }
    const sessionUser = buildSessionUser(data.user);
    setUser(sessionUser);
    setIdToken(data.token);
    return { user: sessionUser, idToken: data.token };
  }, []);

  const sendPasswordReset = useCallback(async (_email: string) => {
    throw new Error(
      'Automatic password reset emails are not enabled on this domain. Please contact store support on WhatsApp to reset your password.'
    );
  }, []);

  const updateAuthDisplayName = useCallback(async (displayName: string) => {
    const trimmed = displayName.trim();
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: trimmed });
      const token = await auth.currentUser.getIdToken(true);
      setUser({ ...auth.currentUser } as User);
      setIdToken(token);
      return;
    }
    setUser((prev) => (prev ? ({ ...prev, displayName: trimmed } as User) : prev));
  }, []);

  const sendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      await fetch('/api/account/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
    } catch {
      // Non-fatal if cookie clear request fails
    }
    if (auth.currentUser) {
      await signOut(auth);
    }
    setUser(null);
    setIdToken(null);
  }, []);

  const refreshToken = useCallback(async () => {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken(true);
      setIdToken(token);
      return token;
    }
    try {
      const res = await fetch('/api/account/auth/me', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (res.ok) {
        const data = (await res.json()) as {
          authenticated?: boolean;
          token?: string;
          user?: ServerSessionUserPayload;
        };
        if (data.authenticated && data.token && data.user) {
          setUser(buildSessionUser(data.user));
          setIdToken(data.token);
          return data.token;
        }
      }
    } catch {
      // Ignore refresh error
    }
    return idToken;
  }, [idToken]);

  return (
    <FirebaseAuthContext.Provider
      value={{
        user,
        idToken,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        updateAuthDisplayName,
        sendVerificationEmail,
        signOutUser,
        refreshToken,
      }}
    >
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const ctx = useContext(FirebaseAuthContext);
  if (!ctx) {
    throw new Error('useFirebaseAuth must be used inside FirebaseAuthProvider');
  }
  return ctx;
}
