import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ isAuthenticated, children }) {
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}
