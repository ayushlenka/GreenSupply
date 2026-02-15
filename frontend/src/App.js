import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { fetchBusinessByEmail, fetchMe } from './api';
import { clearStoredToken, getStoredToken, readTokenFromUrlHash, setStoredToken } from './auth';
import ProtectedRoute from './components/ProtectedRoute';

const HomePage = lazy(() => import('./pages/HomePage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const GroupsPage = lazy(() => import('./pages/GroupsPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SupplierPage = lazy(() => import('./pages/SupplierPage'));

function getInitialToken() {
  const storedToken = getStoredToken();
  if (storedToken) return storedToken;

  const hashToken = readTokenFromUrlHash();
  if (hashToken) {
    setStoredToken(hashToken);
  }
  return hashToken;
}

function App() {
  const [token, setToken] = useState(getInitialToken);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setUser(null);
      setProfile(null);
      setIsAuthLoading(false);
      return;
    }

    const load = async () => {
      setIsAuthLoading(true);
      try {
        const me = await fetchMe();
        if (cancelled) return;
        setUser(me);

        if (me?.email) {
          try {
            const business = await fetchBusinessByEmail(me.email);
            if (!cancelled) setProfile(business);
          } catch {
            if (!cancelled) setProfile(null);
          }
        } else {
          setProfile(null);
        }
      } catch {
        if (cancelled) return;
        clearStoredToken();
        setToken(null);
        setUser(null);
        setProfile(null);
      } finally {
        if (!cancelled) setIsAuthLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const hashToken = readTokenFromUrlHash();
    if (!hashToken || hashToken === token) return;
    setStoredToken(hashToken);
    setToken(hashToken);
  }, [token]);

  const auth = useMemo(
    () => ({
      isAuthenticated: Boolean(token && user),
      isLoading: isAuthLoading,
      user,
      profile,
      onProfileCreated: (newProfile) => {
        setProfile(newProfile);
        setIsAuthLoading(false);
      },
      onLogout: () => {
        clearStoredToken();
        setToken(null);
        setUser(null);
        setProfile(null);
        setIsAuthLoading(false);
      }
    }),
    [token, user, profile, isAuthLoading]
  );

  const businessAllowed = !auth.isLoading && auth.isAuthenticated && auth.profile?.account_type === 'business';
  const supplierAllowed = !auth.isLoading && auth.isAuthenticated && auth.profile?.account_type === 'supplier';

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex h-screen items-center justify-center bg-cream text-ink/60 text-sm">Loading...</div>}>
      <Routes>
        <Route path="/" element={<HomePage auth={auth} />} />
        <Route path="/auth" element={<AuthPage auth={auth} />} />

        <Route
          path="/groups"
          element={
            <ProtectedRoute isAuthenticated={businessAllowed} isLoading={auth.isLoading}>
              <GroupsPage auth={auth} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute isAuthenticated={businessAllowed} isLoading={auth.isLoading}>
              <ProductsPage auth={auth} />
            </ProtectedRoute>
          }
        />
        <Route path="/products" element={<Navigate to="/orders" replace />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isAuthenticated={businessAllowed} isLoading={auth.isLoading}>
              <DashboardPage auth={auth} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/supplier"
          element={
            <ProtectedRoute isAuthenticated={supplierAllowed} isLoading={auth.isLoading}>
              <SupplierPage auth={auth} />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
