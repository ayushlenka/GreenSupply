import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import GroupsPage from './pages/GroupsPage';
import ProductsPage from './pages/ProductsPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import { clearStoredToken, getStoredToken, readTokenFromUrlHash } from './auth';
import { fetchMe } from './api';

function App() {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);

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
      return;
    }

    fetchMe()
      .then((res) => setUser(res))
      .catch(() => {
        clearStoredToken();
        setToken(null);
        setUser(null);
      });
  }, [token]);

  const auth = useMemo(
    () => ({
      isAuthenticated: Boolean(token && user),
      user,
      onLogout: () => {
        clearStoredToken();
        setToken(null);
        setUser(null);
      }
    }),
    [token, user]
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage auth={auth} />} />
        <Route
          path="/groups"
          element={
            <ProtectedRoute isAuthenticated={auth.isAuthenticated}>
              <GroupsPage auth={auth} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute isAuthenticated={auth.isAuthenticated}>
              <ProductsPage auth={auth} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isAuthenticated={auth.isAuthenticated}>
              <DashboardPage auth={auth} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
