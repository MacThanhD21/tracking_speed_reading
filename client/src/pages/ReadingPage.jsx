import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const formatClock = (sec) => {
  const s = Math.max(0, Math.floor(sec || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

const countWords = (t) =>
  (t || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const inferTitleFromText = (raw) => {
  const t = (raw || '').trim();
  if (!t) return '';
  const firstLine = t.split('\n').map((x) => x.trim()).find(Boolean) || t;
  const m = firstLine.match(/^(.+?[.!?])(\s|$)/);
  const title = (m ? m[1] : firstLine).trim();
  const maxLen = 110;
  if (title.length <= maxLen) return title;
  return `${title.slice(0, maxLen).trim()}…`;
};

const calcWpm = (words, durationMs) => {
  const w = Math.max(0, Number(words) || 0);
  const minutes = Math.max(0, Number(durationMs) || 0) / 60000;
  if (minutes <= 0) return 0;
  return Math.floor(w / minutes);
};

function UserMenu({ userName, onLogout }) {
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onDoc = (e) => {
      if (!open) return;
      const el = e.target;
      if (el?.closest?.('[data-user-menu]')) return;
      setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [open]);

  return (
    <div className="relative" data-user-menu>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="tsr-btn text-sm px-3 py-1.5"
      >
        {userName}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 mt-2 w-52 rounded-2xl tsr-surface overflow-hidden shadow-xl"
          >
            <div className="p-2 text-sm">
              <button
                type="button"
                className="w-full text-left rounded-xl px-3 py-2 hover:bg-white/5"
                onClick={toggleTheme}
              >
                Chế độ: <span className="font-semibold">{theme === 'dark' ? 'Tối' : 'Sáng'}</span>
              </button>
              <Link className="block rounded-xl px-3 py-2 hover:bg-white/5" to="/cai-dat">
                Cài đặt
              </Link>
              <Link className="block rounded-xl px-3 py-2 hover:bg-white/5" to="/thong-ke">
                Thống kê
              </Link>
              <Link className="block rounded-xl px-3 py-2 hover:bg-white/5" to="/phien-gan-day">
                Phiên gần đây
              </Link>
              <button
                type="button"
                className="w-full text-left rounded-xl px-3 py-2 hover:bg-white/5 text-[color:var(--tsr-text)] hover:text-rose-500"
                onClick={onLogout}
              >
                Đăng xuất
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ReadingPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [phase, setPhase] = useState('idle');
  const [startedAt, setStartedAt] = useState(null);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [wordsRead, setWordsRead] = useState(0);
  const [lastSummary, setLastSummary] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const readerRef = useRef(null);

  const loadHistory = async () => {
    try {
      const res = await api('/reading/sessions');
      setHistory(res.data || []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const locked = phase === 'reading' || phase === 'submitting';
  const totalWords = useMemo(() => countWords(text), [text]);
  const inferredTitle = useMemo(() => inferTitleFromText(text), [text]);

  const start = () => {
    if (!text.trim()) {
      setErr('Vui lòng dán nội dung bài đọc');
      return;
    }
    setErr('');
    setResult(null);
    setPhase('reading');
    const t0 = Date.now();
    setStartedAt(t0);
    setElapsedSec(0);
    setWordsRead(0);
    requestAnimationFrame(() => {
      if (readerRef.current) readerRef.current.scrollTop = 0;
    });
  };

  const stop = async () => {
    if (!startedAt) return;
    const durationMs = Date.now() - startedAt;
    setPhase('submitting');
    setBusy(true);
    setErr('');
    try {
      const res = await api('/reading/sessions', {
        method: 'POST',
        body: JSON.stringify({
          text,
          durationMs,
          title: inferredTitle,
          wordsRead,
          wps: calcWpm(wordsRead, durationMs),
        }),
      });
      setResult(res.data);
      setPhase('done');
      const summary = {
        sessionId: res.data._id,
        durationMs,
        wordsRead,
        wps: calcWpm(wordsRead, durationMs),
      };
      setLastSummary(summary);
      setShowSummary(true);
      loadHistory();
    } catch (ex) {
      if (ex.data?.code === 'MISSING_GEMINI_KEY') {
        setErr('Bạn cần cấu hình API key trước.');
      } else {
        setErr(ex.message || 'Không tạo được phiên đọc');
      }
      setPhase('idle');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setPhase('idle');
    setStartedAt(null);
    setResult(null);
    setErr('');
    setWordsRead(0);
    setLastSummary(null);
    setShowSummary(false);
  };

  useEffect(() => {
    if (phase !== 'reading' || !startedAt) return;
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 300);
    return () => clearInterval(id);
  }, [phase, startedAt]);

  useEffect(() => {
    // Lock outer page scroll to avoid double-scroll (body + reader zone).
    document.body.classList.add('tsr-lock-page-scroll');
    return () => {
      document.body.classList.remove('tsr-lock-page-scroll');
    };
  }, []);

  if (!user) return null;

  const onReaderScroll = () => {
    if (phase !== 'reading') return;
    const root = readerRef.current;
    if (!root) return;
    const maxScroll = Math.max(1, root.scrollHeight - root.clientHeight);
    const pct = Math.min(1, Math.max(0, root.scrollTop / maxScroll));
    setWordsRead(Math.max(0, Math.min(totalWords, Math.floor(totalWords * pct))));
  };

  const readingTime = phase === 'reading' ? elapsedSec : result ? result.durationMs / 1000 : 0;
  const readingMetrics = {
    time: formatClock(readingTime),
    words: phase === 'reading' ? wordsRead : result ? result.wordCount : 0,
  };

  return (
    <div className="h-screen overflow-hidden text-[color:var(--tsr-text)]">
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="tsr-surface rounded-2xl px-3 py-2">
            <div className="grid grid-cols-3 items-center gap-3">
              <nav className="flex items-center gap-2 text-sm">
                {phase === 'idle' && (
                  <button type="button" onClick={start} className="tsr-btn-primary">
                    Bắt đầu
                  </button>
                )}
                {phase === 'reading' && (
                  <button type="button" onClick={stop} disabled={busy} className="tsr-btn-primary disabled:opacity-60">
                    {busy ? 'Đang gửi…' : 'Kết thúc'}
                  </button>
                )}
                {(phase === 'done' || phase === 'submitting') && (
                  <button type="button" onClick={reset} className="tsr-btn">
                    Phiên mới
                  </button>
                )}
                {!user.hasGeminiKey && (
                  <Link
                    className="tsr-btn px-3 py-1.5 text-amber-100"
                    to="/cau-hinh-api"
                    title="Cần cấu hình Gemini API key"
                  >
                    Cài đặt API
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link className="tsr-btn px-3 py-1.5" to="/quan-tri">
                    Admin
                  </Link>
                )}
              </nav>

              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <div className="text-[11px] text-[color:var(--tsr-muted)]">Thời gian</div>
                  <div className="font-semibold tracking-wide">{readingMetrics.time}</div>
                </div>
                <div className="h-9 w-px bg-white/10" />
                <div className="text-center">
                  <div className="text-[11px] text-[color:var(--tsr-muted)]">Số từ</div>
                  <div className="font-semibold tracking-wide">
                    {readingMetrics.words}
                    <span className="text-xs text-[color:var(--tsr-muted)]">/{totalWords || 0}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <UserMenu userName={user.name} onLogout={logout} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-28 pb-4 h-screen overflow-hidden">
        <section className="min-w-0 h-full">
          <div className="tsr-surface rounded-3xl overflow-hidden shadow-2xl h-full">
            <div className="p-5 space-y-4 h-full flex flex-col min-h-0">
              {inferredTitle ? (
                <div className="text-sm font-semibold text-[color:var(--tsr-muted)]">{inferredTitle}</div>
              ) : null}
              {err && <p className="text-sm text-rose-200">{err}</p>}

              <div className="tsr-reading-zone overflow-hidden flex-1 min-h-0">
                {phase === 'idle' ? (
                  <textarea
                    className="tsr-reading-text tsr-stable-scroll w-full h-full overflow-y-scroll bg-transparent px-6 py-5 outline-none text-[color:var(--tsr-text)] placeholder:text-[color:var(--tsr-muted)]"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Dán nội dung bài đọc ở đây…"
                  />
                ) : (
                  <div
                    ref={readerRef}
                    onScroll={onReaderScroll}
                    className="tsr-reading-text tsr-stable-scroll h-full overflow-y-scroll px-6 py-5"
                  >
                    {text?.trim() ? (
                      <div className="max-w-none whitespace-pre-wrap break-words">{text}</div>
                    ) : (
                      <div className="text-sm text-[color:var(--tsr-muted)]">Chưa có nội dung.</div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-[color:var(--tsr-muted)]">
                <div>
                  Tổng từ: <span className="text-[color:var(--tsr-text)]">{totalWords}</span>
                </div>
                {phase !== 'idle' ? (
                  <div>
                    Đã đọc: <span className="text-[color:var(--tsr-text)]">{wordsRead}</span>
                  </div>
                ) : null}
              </div>

            </div>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {showSummary && lastSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          >
            <div className="absolute inset-0 bg-black/70" onClick={() => setShowSummary(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="relative w-full max-w-2xl rounded-3xl tsr-surface p-8 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-[color:var(--tsr-muted)]">Kết quả phiên đọc</div>
                  <div className="text-2xl font-semibold">Hoàn thành</div>
                </div>
                <button type="button" className="tsr-btn px-3 py-1.5" onClick={() => setShowSummary(false)}>
                  Đóng
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl tsr-surface p-5">
                  <div className="text-[11px] text-[color:var(--tsr-muted)]">Thời gian</div>
                  <div className="text-2xl font-semibold">{formatClock(lastSummary.durationMs / 1000)}</div>
                </div>
                <div className="rounded-2xl tsr-surface p-5">
                  <div className="text-[11px] text-[color:var(--tsr-muted)]">Số từ đọc</div>
                  <div className="text-2xl font-semibold">{lastSummary.wordsRead}</div>
                </div>
                <div className="rounded-2xl tsr-surface p-5">
                  <div className="text-[11px] text-[color:var(--tsr-muted)]">WPM</div>
                  <div className="text-2xl font-semibold">{lastSummary.wps}</div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/kiem-tra/${lastSummary.sessionId}`)}
                  className="tsr-btn-primary"
                >
                  Kiểm tra
                </button>
                <button type="button" className="tsr-btn" onClick={() => setShowSummary(false)}>
                  Quay lại
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
