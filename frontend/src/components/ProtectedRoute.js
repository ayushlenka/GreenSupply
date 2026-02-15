import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ isAuthenticated, isLoading = false, children }) {
  const location = useLocation();

  if (isLoading) {
    return <div className="min-h-screen bg-[#ebe7db]" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}
