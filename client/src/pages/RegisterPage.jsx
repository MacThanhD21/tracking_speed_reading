import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await register({ name, email, password });
      nav('/cau-hinh-api', { replace: true });
    } catch (ex) {
      setErr(ex.message || 'Đăng ký thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md tsr-surface rounded-3xl p-8 shadow-xl"
      >
        <h1 className="text-2xl font-semibold">Đăng ký</h1>
        <p className="mt-1 text-sm text-[color:var(--tsr-muted)]">Tạo tài khoản để lưu phiên đọc</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm mb-1 text-[color:var(--tsr-muted)]">Họ tên</label>
            <input
              className="tsr-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-[color:var(--tsr-muted)]">Email</label>
            <input
              className="tsr-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-[color:var(--tsr-muted)]">Mật khẩu (tối thiểu 6 ký tự)</label>
            <input
              className="tsr-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          {err && <p className="text-sm text-rose-500">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full tsr-btn-primary disabled:opacity-60"
          >
            {busy ? 'Đang xử lý…' : 'Đăng ký'}
          </button>
        </form>
        <p className="mt-4 text-sm text-[color:var(--tsr-muted)]">
          Đã có tài khoản?{' '}
          <Link className="underline" to="/dang-nhap">
            Đăng nhập
          </Link>
        </p>
        <p className="mt-2 text-sm text-[color:var(--tsr-muted)]">
          Quản trị viên?{' '}
          <Link className="underline" to="/dang-nhap-admin">
            Đăng nhập Admin
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
