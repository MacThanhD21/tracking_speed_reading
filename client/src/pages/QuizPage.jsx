import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';

export default function QuizPage() {
  const { sessionId } = useParams();
  const nav = useNavigate();
  const startedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [gradeResult, setGradeResult] = useState(null);

  useEffect(() => {
    const run = async () => {
      if (!sessionId) return;
      // Guard against React StrictMode double-invoking effects in dev.
      if (startedRef.current) return;
      startedRef.current = true;
      setLoading(true);
      setErr('');
      try {
        const sessionRes = await api(`/reading/sessions/${sessionId}`);
        const existing = sessionRes?.data?.questions || [];
        if (existing.length) {
          setQuiz({
            _id: sessionRes.data._id,
            inferredTitle: sessionRes.data.inferredTitle,
            questions: existing.map((q) => ({ dimension: q.dimension, question: q.question })),
          });
          setAnswers(new Array(existing.length).fill(''));
        } else {
          const qRes = await api(`/reading/sessions/${sessionId}/questions`, { method: 'POST' });
          setQuiz(qRes.data);
          setAnswers(new Array((qRes.data.questions || []).length).fill(''));
          if (qRes.data.geminiError) setErr(`Gemini: ${qRes.data.geminiError}`);
        }
      } catch (e) {
        setErr(e.message || 'Không tải được bài kiểm tra');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [sessionId]);

  const submitQuiz = async () => {
    if (!sessionId) return;
    setSubmitting(true);
    setErr('');
    try {
      const res = await api(`/reading/sessions/${sessionId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      });
      setGradeResult(res.data);
    } catch (e) {
      setErr(e.message || 'Không nộp bài được');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[color:var(--tsr-muted)]">
        Đang tải bài kiểm tra…
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[color:var(--tsr-text)]">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="tsr-surface rounded-3xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-[color:var(--tsr-muted)]">Kiểm tra hiểu bài</div>
              <div className="text-lg font-semibold">
                {quiz?.inferredTitle ? `Tiêu đề: ${quiz.inferredTitle}` : 'Bài kiểm tra 5W1H'}
              </div>
            </div>
            <button type="button" onClick={() => nav('/')} className="tsr-btn">
              Về trang đọc
            </button>
          </div>

          {err ? <p className="mt-3 text-sm text-rose-400">{err}</p> : null}

          {quiz?.questions?.length ? (
            <div className="mt-4 space-y-3">
              {quiz.questions.map((q, idx) => (
                <div key={`${idx}-${q.dimension}`} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">
                      <span className="mr-2">{q.dimension}</span>
                      {q.question}
                    </div>
                    {gradeResult?.answers?.[idx] ? (
                      <div className="text-sm font-semibold">
                        {gradeResult.answers[idx].score}/1
                      </div>
                    ) : null}
                  </div>
                  <textarea
                    className="tsr-input mt-3 min-h-[80px]"
                    value={answers[idx] || ''}
                    onChange={(e) =>
                      setAnswers((arr) => {
                        const next = [...arr];
                        next[idx] = e.target.value;
                        return next;
                      })
                    }
                    placeholder="Nhập câu trả lời…"
                    disabled={submitting}
                  />
                  {gradeResult?.answers?.[idx] ? (
                    <div className="mt-3 rounded-xl border border-[color:var(--tsr-border)] bg-[color:var(--tsr-soft)] p-3">
                      <div className="text-xs text-[color:var(--tsr-muted)]">Đáp án của bạn</div>
                      <div className="text-sm whitespace-pre-wrap">{gradeResult.answers[idx].answer || '(trống)'}</div>
                      {gradeResult.answers[idx].feedback ? (
                        <>
                          <div className="mt-2 text-xs text-[color:var(--tsr-muted)]">Nhận xét</div>
                          <div className="text-sm whitespace-pre-wrap">{gradeResult.answers[idx].feedback}</div>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 text-sm text-[color:var(--tsr-muted)]">
              Chưa có câu hỏi. Quay lại trang đọc để tạo lại phiên.
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={submitQuiz}
              disabled={submitting || !quiz?.questions?.length}
              className="tsr-btn-primary disabled:opacity-60"
            >
              {submitting ? 'Đang chấm…' : gradeResult ? 'Chấm lại' : 'Nộp bài'}
            </button>
            <Link to="/" className="tsr-btn">
              Hủy
            </Link>
            {gradeResult ? (
              <div className="ml-auto text-sm font-semibold">
                Kết quả: {gradeResult.totalScore}/{gradeResult.maxScore}
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

