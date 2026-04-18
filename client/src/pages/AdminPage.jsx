import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminPage() {
  const { logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [tab, setTab] = useState('users');
  const [err, setErr] = useState('');
  const [createAdminForm, setCreateAdminForm] = useState({ name: '', email: '', password: '' });
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');

  const load = async () => {
    setErr('');
    try {
      const [u, s] = await Promise.all([api('/admin/users'), api('/admin/sessions')]);
      setUsers(u.data || []);
      setSessions(s.data || []);
    } catch (e) {
      setErr(e.message || 'Không tải được dữ liệu');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleUser = async (id, isActive) => {
    try {
      await api(`/admin/users/${id}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
      await load();
    } catch (e) {
      setErr(e.message || 'Thao tác thất bại');
    }
  };

  const createAdmin = async (e) => {
    e.preventDefault();
    setErr('');
    setAdminMsg('');
    setAdminBusy(true);
    try {
      await api('/admin/users/admin', {
        method: 'POST',
        body: JSON.stringify(createAdminForm),
      });
      setAdminMsg('Đã tạo tài khoản admin thành công');
      setCreateAdminForm({ name: '', email: '', password: '' });
      await load();
    } catch (e2) {
      setErr(e2.message || 'Không tạo được tài khoản admin');
    } finally {
      setAdminBusy(false);
    }
  };

  return (
    <div className="min-h-screen text-[color:var(--tsr-text)]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="tsr-surface rounded-3xl p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Quản trị</h1>
              <p className="text-xs text-[color:var(--tsr-muted)]">Người dùng & phiên đọc</p>
            </div>
            <button type="button" onClick={logout} className="tsr-btn text-sm">
              Đăng xuất
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-5 mb-4">
            <button
              type="button"
              onClick={() => setTab('users')}
              className={tab === 'users' ? 'tsr-btn-primary' : 'tsr-btn'}
            >
              Người dùng
            </button>
            <button
              type="button"
              onClick={() => setTab('sessions')}
              className={tab === 'sessions' ? 'tsr-btn-primary' : 'tsr-btn'}
            >
              Phiên đọc
            </button>
            <button type="button" onClick={load} className="ml-auto tsr-btn">
              Tải lại
            </button>
          </div>

          {err && <p className="text-sm text-rose-500 mb-3">{err}</p>}
          {adminMsg && <p className="text-sm text-emerald-600 mb-3">{adminMsg}</p>}

          {tab === 'users' && (
            <div className="space-y-4">
              <form onSubmit={createAdmin} className="rounded-2xl border border-[color:var(--tsr-border)] bg-[color:var(--tsr-soft)] p-4">
                <div className="text-sm font-semibold mb-3">Tạo tài khoản admin</div>
                <div className="grid md:grid-cols-3 gap-3">
                  <input
                    className="tsr-input"
                    placeholder="Họ tên admin"
                    value={createAdminForm.name}
                    onChange={(e) => setCreateAdminForm((s) => ({ ...s, name: e.target.value }))}
                    required
                  />
                  <input
                    className="tsr-input"
                    type="email"
                    placeholder="Email admin"
                    value={createAdminForm.email}
                    onChange={(e) => setCreateAdminForm((s) => ({ ...s, email: e.target.value }))}
                    required
                  />
                  <input
                    className="tsr-input"
                    type="password"
                    placeholder="Mật khẩu (>= 6)"
                    minLength={6}
                    value={createAdminForm.password}
                    onChange={(e) => setCreateAdminForm((s) => ({ ...s, password: e.target.value }))}
                    required
                  />
                </div>
                <div className="mt-3">
                  <button type="submit" className="tsr-btn-primary disabled:opacity-60" disabled={adminBusy}>
                    {adminBusy ? 'Đang tạo…' : 'Tạo admin'}
                  </button>
                </div>
              </form>

              <div className="overflow-x-auto rounded-2xl border border-[color:var(--tsr-border)] bg-[color:var(--tsr-soft)]">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-[color:var(--tsr-muted)] bg-[color:var(--tsr-soft-2)]">
                    <tr>
                      <th className="p-3">Tên</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Vai trò</th>
                      <th className="p-3">API key</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} className="border-t border-[color:var(--tsr-border)]">
                        <td className="p-3 font-medium">{u.name}</td>
                        <td className="p-3">{u.email}</td>
                        <td className="p-3 capitalize">{u.role}</td>
                        <td className="p-3">{u.hasGeminiKey ? 'Đã có' : 'Chưa'}</td>
                        <td className="p-3">{u.isActive ? 'Hoạt động' : 'Khóa'}</td>
                        <td className="p-3">
                          {u.role !== 'admin' && (
                            <button type="button" className="tsr-btn text-xs px-3 py-1.5" onClick={() => toggleUser(u._id, !u.isActive)}>
                              {u.isActive ? 'Khóa' : 'Mở khóa'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'sessions' && (
            <div className="overflow-x-auto rounded-2xl border border-[color:var(--tsr-border)] bg-[color:var(--tsr-soft)]">
              <table className="min-w-full text-sm">
                <thead className="text-left text-[color:var(--tsr-muted)] bg-[color:var(--tsr-soft-2)]">
                  <tr>
                    <th className="p-3">Thời gian</th>
                    <th className="p-3">Người dùng</th>
                    <th className="p-3">WPM</th>
                    <th className="p-3">Từ</th>
                    <th className="p-3">Giây</th>
                    <th className="p-3">Câu hỏi</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s._id} className="border-t border-[color:var(--tsr-border)]">
                      <td className="p-3 whitespace-nowrap">{new Date(s.createdAt).toLocaleString('vi-VN')}</td>
                      <td className="p-3">
                        {s.user?.name} <span className="text-[color:var(--tsr-muted)]">({s.user?.email})</span>
                      </td>
                      <td className="p-3 font-semibold">{s.wps}</td>
                      <td className="p-3">{s.wordCount}</td>
                      <td className="p-3">{(s.durationMs / 1000).toFixed(1)}</td>
                      <td className="p-3">{s.questions?.length || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
