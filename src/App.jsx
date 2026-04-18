import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import NotificationCenter from './components/NotificationCenter';
import Home from './pages/Home';
import Products from './pages/Products';
import CartPage from './pages/CartPage';
import Checkout from './pages/Checkout';
import OrderHistory from './pages/OrderHistory';
import { ROUTES } from './utils/constants';
import { useDispatch } from 'react-redux';
import { addNotification } from './features/notificationSlice';
import { NOTIFICATION_TYPES } from './utils/constants';
import { syncCartFromStorage } from './features/cartSlice';
import './App.css';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Service Worker registration for PWA support
    if ('serviceWorker' in navigator) {
      // Register in both dev/prod so the app can keep working from cache
      // after at least one successful online load.
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('Service Worker registration failed:', err);
      });
    }

    // Listen for storage events (multi-tab sync)
    const handleStorageChange = (e) => {
      if (e.key === 'app_cart') {
        try {
          const raw = e.newValue;
          if (!raw) {
            return;
          }

          const parsed = JSON.parse(raw);
          const normalizedPayload = Array.isArray(parsed)
            ? {
                items: parsed,
                version: Date.now(),
                lastModified: new Date().toISOString(),
              }
            : {
                items: Array.isArray(parsed.items) ? parsed.items : [],
                version: Number(parsed.version) || Date.now(),
                lastModified: parsed.lastModified || new Date().toISOString(),
              };

          dispatch(syncCartFromStorage(normalizedPayload));
          dispatch(
            addNotification({
              type: NOTIFICATION_TYPES.INFO,
              message: 'Either cart is modified in another tab or you have tampered with it.',
              duration: 3500,
            })
          );
        } catch (error) {
          console.error('Failed to sync cart from another tab', error);
        }
      }
    };
// Listen for storage events to sync cart across tabs.
    window.addEventListener('storage', handleStorageChange);

    // Cleanup listener on unmount main page app component.
    return () => window.removeEventListener('storage', handleStorageChange);

  },// runs only once when app loads, 
  // and sets up listener for cart changes across tabs.
  // b/c dispatch is stable from redux, we can safely include
  //  it in deps array without causing re-renders. 
  [dispatch]);


  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-black text-white">
        <Navbar />
        <main className="flex-grow bg-gradient-to-b from-black via-slate-950 to-slate-900">
          <Routes>
            <Route path={ROUTES.HOME} element={<Home />} />
            <Route path={ROUTES.PRODUCTS} element={<Products />} />
            <Route path={ROUTES.CART} element={<CartPage />} />
            <Route path={ROUTES.CHECKOUT} element={<Checkout />} />
            <Route path={ROUTES.ORDER_HISTORY} element={<OrderHistory />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
        <NotificationCenter />
      </div>
    </BrowserRouter>
  );
}

export default App;
