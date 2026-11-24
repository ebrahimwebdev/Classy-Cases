import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

interface FirebaseAuthContextValue {
  user: User | null;
  idToken: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ user: User; idToken: string }>;
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
