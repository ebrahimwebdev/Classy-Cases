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

export default function App() {
  const [view, setView] = useState<'storefront' | 'admin'>(() => {
    return window.location.hash.startsWith('#/admin') ? 'admin' : 'storefront';
  });
  const [adminToken, setAdminToken] = useState<string | null>(null);

  useEffect(() => {
    function handleHashChange() {
      setView(window.location.hash.startsWith('#/admin') ? 'admin' : 'storefront');
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  function openAdmin() {
    window.location.hash = '#/admin';
    setView('admin');
  }

  function openStorefront() {
    window.location.hash = '#/';
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
