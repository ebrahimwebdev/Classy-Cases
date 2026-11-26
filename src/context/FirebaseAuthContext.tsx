import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';

export function formatFirebaseAuthError(error: unknown): string {
  const rawCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';
  const msg = error instanceof Error ? error.message : String(error || 'Authentication failed');

  if (rawCode === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return `Domain "${host}" is not authorized for Google Sign-In in Firebase project "${firebaseConfig.projectId}". Add it under Firebase Console → Authentication → Settings → Authorized domains.`;
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
      return 'This sign-in method is currently disabled in Firebase Authentication settings.';
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
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          const token = await nextUser.getIdToken();
          setIdToken(token);
        } catch {
          setIdToken(null);
        }
      } else {
        setIdToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const credential = await signInWithPopup(auth, googleAuthProvider);
    const token = await credential.user.getIdToken();
    setUser(credential.user);
    setIdToken(token);
    return { user: credential.user, idToken: token };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const token = await credential.user.getIdToken();
    setUser(credential.user);
    setIdToken(token);
    return { user: credential.user, idToken: token };
  }, []);

  const signUpWithEmail = useCallback(async (displayName: string, email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const trimmedName = displayName.trim();
    if (trimmedName) {
      try {
        await updateProfile(credential.user, { displayName: trimmedName });
      } catch {
        // Non-fatal if profile name update lags
      }
    }
    try {
      await sendEmailVerification(credential.user);
    } catch {
      // Optional verification trigger
    }
    const token = await credential.user.getIdToken(true);
    setUser(credential.user);
    setIdToken(token);
    return { user: credential.user, idToken: token };
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const updateAuthDisplayName = useCallback(async (displayName: string) => {
    if (!auth.currentUser) return;
    await updateProfile(auth.currentUser, { displayName: displayName.trim() });
    const token = await auth.currentUser.getIdToken(true);
    setUser({ ...auth.currentUser } as User);
    setIdToken(token);
  }, []);

  const sendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setIdToken(null);
  }, []);

  const refreshToken = useCallback(async () => {
    if (!auth.currentUser) {
      setIdToken(null);
      return null;
    }
    const token = await auth.currentUser.getIdToken(true);
    setIdToken(token);
    return token;
  }, []);

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
