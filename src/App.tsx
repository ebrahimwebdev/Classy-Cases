/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { Storefront } from './components/Storefront';
import { CartProvider } from './context/CartContext';

export default function App() {
  const [view, setView] = useState<'storefront' | 'admin'>(() => {
    return window.location.hash.startsWith('#/admin') ? 'admin' : 'storefront';
  });

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
    <CartProvider>
      {view === 'admin' ? (
        <AdminDashboard onBackToStore={openStorefront} />
      ) : (
        <Storefront onOpenAdmin={openAdmin} />
      )}
    </CartProvider>
  );
}
