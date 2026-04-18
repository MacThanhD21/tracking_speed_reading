import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function PrivateRoute({ children, admin }) {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Đang tải…
      </div>
    );
  }
  if (!user) return <Navigate to="/dang-nhap" replace state={{ from: loc.pathname }} />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
