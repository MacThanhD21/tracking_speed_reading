import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const STUDIO_URL = 'https://aistudio.google.com/apikey';

export default function SetupApiKeyPage() {
  const { user, refresh, setHasGeminiKey } = useAuth();
  const nav = useNavigate();
  const [key, setKey] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  useEffect(() => {
    if (user.role === 'admin') {
      nav('/quan-tri', { replace: true });
    }
  }, [user.role, nav]);

  const onSave = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await api('/user/gemini-key', { method: 'PUT', body: JSON.stringify({ apiKey: key }) });
      setHasGeminiKey(true);
      await refresh();
      nav('/', { replace: true });
    } catch (ex) {
      setErr(ex.message || 'Không lưu được');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-b from-slate-950 to-slate-900">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl"
      >
        <h1 className="text-2xl font-semibold text-white">Cấu hình Gemini API key</h1>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          Ứng dụng sử dụng API key của chính bạn để tạo câu hỏi sau mỗi phiên đọc. Key được mã hóa trước khi lưu trên
          server.
        </p>
        <div className="mt-4">
          <a
            href={STUDIO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-cyan-700/60 bg-cyan-950/40 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-900/50"
          >
            Mở Google AI Studio để lấy API key
          </a>
        </div>
        <form className="mt-6 space-y-4" onSubmit={onSave}>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Dán API key</label>
            <textarea
              className="w-full min-h-[100px] rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:border-cyan-600 font-mono text-sm"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIza..."
              required
            />
          </div>
          {err && <p className="text-sm text-rose-400">{err}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 py-2 font-medium text-white"
            >
              {busy ? 'Đang lưu…' : 'Lưu và tiếp tục'}
            </button>
            {user.hasGeminiKey && (
              <button
                type="button"
                onClick={() => nav('/', { replace: true })}
                className="rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:bg-slate-800"
              >
                Bỏ qua
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
