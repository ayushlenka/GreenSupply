import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { fetchBusinessByEmail, fetchMe } from './api';
import { clearStoredToken, getStoredToken, readTokenFromUrlHash } from './auth';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import GroupsPage from './pages/GroupsPage';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import SupplierPage from './pages/SupplierPage';

function App() {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const hashToken = readTokenFromUrlHash();
    if (hashToken) {
      localStorage.setItem('greensupply_access_token', hashToken);
      setToken(hashToken);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setProfile(null);
      return;
    }

    fetchMe()
      .then((res) => setUser(res))
      .catch(() => {
        clearStoredToken();
        setToken(null);
        setUser(null);
        setProfile(null);
      });
  }, [token]);

  useEffect(() => {
    if (!user?.email) {
      setProfile(null);
      return;
    }

    fetchBusinessByEmail(user.email)
      .then((business) => setProfile(business))
      .catch(() => setProfile(null));
  }, [user]);

  const auth = useMemo(
    () => ({
      isAuthenticated: Boolean(token && user),
      user,
      profile,
      onProfileCreated: (newProfile) => setProfile(newProfile),
      onLogout: () => {
        clearStoredToken();
        setToken(null);
        setUser(null);
        setProfile(null);
      }
    }),
    [token, user, profile]
  );

  const businessAllowed = auth.isAuthenticated && auth.profile?.account_type === 'business';
  const supplierAllowed = auth.isAuthenticated && auth.profile?.account_type === 'supplier';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage auth={auth} />} />

        <Route
          path="/groups"
          element={
            <ProtectedRoute isAuthenticated={businessAllowed}>
              <GroupsPage auth={auth} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute isAuthenticated={businessAllowed}>
              <ProductsPage auth={auth} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isAuthenticated={businessAllowed}>
              <DashboardPage auth={auth} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/supplier"
          element={
            <ProtectedRoute isAuthenticated={supplierAllowed}>
              <SupplierPage auth={auth} />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
