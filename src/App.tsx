/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Storefront } from './components/Storefront';
import { CartProvider } from './context/CartContext';
import { FirebaseAuthProvider } from './context/FirebaseAuthContext';

const ADMIN_TOKEN_STORAGE_KEY = 'classycases_admin_token';

function isAdminLocation(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return path === '/admin' || path.startsWith('/admin/') || hash.startsWith('#/admin');
}

function readStoredAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function App() {
  const [view, setView] = useState<'storefront' | 'admin'>(() =>
    isAdminLocation() ? 'admin' : 'storefront'
  );
  const [adminToken, setAdminTokenState] = useState<string | null>(() =>
    readStoredAdminToken()
  );

  function setAdminToken(nextToken: string | null) {
    setAdminTokenState(nextToken);
    try {
      if (nextToken) {
        localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, nextToken);
      } else {
        localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      }
    } catch {
      // ignore storage quota/privacy mode errors
    }
  }

  useEffect(() => {
    function handleRouteChange() {
      setView(isAdminLocation() ? 'admin' : 'storefront');
    }
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  function openAdmin() {
    try {
      window.history.pushState(null, '', '/admin');
    } catch {
      window.location.hash = '#/admin';
    }
    setView('admin');
  }

  function openStorefront() {
    try {
      window.history.pushState(null, '', '/');
    } catch {
      window.location.hash = '#/';
    }
    setView('storefront');
  }

  return (
    <ErrorBoundary>
      <FirebaseAuthProvider>
        <CartProvider>
          {view === 'admin' ? (
            <AdminDashboard
              adminToken={adminToken}
              onAdminTokenChange={setAdminToken}
              onBackToStore={openStorefront}
            />
          ) : (
            <Storefront onOpenAdmin={openAdmin} />
          )}
        </CartProvider>
      </FirebaseAuthProvider>
    </ErrorBoundary>
  );
}
