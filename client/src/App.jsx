import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import SetupApiKeyPage from './pages/SetupApiKeyPage.jsx';
import ReadingPage from './pages/ReadingPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import QuizPage from './pages/QuizPage.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';

function AuthedHome() {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 bg-slate-950">
        Đang tải…
      </div>
    );
  }
  if (!user) return <Navigate to="/dang-nhap" replace state={{ from: loc.pathname }} />;
  if (user.role === 'admin' && loc.pathname === '/') {
    return <Navigate to="/quan-tri" replace />;
  }
  if (user.role !== 'admin' && !user.hasGeminiKey && loc.pathname === '/') {
    return <Navigate to="/cau-hinh-api" replace />;
  }
  return <ReadingPage />;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/dang-nhap"
        element={!loading && user ? <Navigate to={user.role === 'admin' ? '/quan-tri' : '/'} replace /> : <LoginPage />}
      />
      <Route
        path="/dang-nhap-admin"
        element={!loading && user ? <Navigate to={user.role === 'admin' ? '/quan-tri' : '/'} replace /> : <AdminLoginPage />}
      />
      <Route
        path="/dang-ky"
        element={!loading && user ? <Navigate to="/" replace /> : <RegisterPage />}
      />
      <Route
        path="/cau-hinh-api"
        element={
          <PrivateRoute>
            <SetupApiKeyPage />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<AuthedHome />} />
      <Route
        path="/kiem-tra/:sessionId"
        element={
          <PrivateRoute>
            <QuizPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/quan-tri"
        element={
          <PrivateRoute admin>
            <AdminPage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
