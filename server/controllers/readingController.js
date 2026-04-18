import ReadingSession from '../models/ReadingSession.js';
import User from '../models/User.js';
import { decryptSecret } from '../utils/cryptoKey.js';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const countWords = (text) => {
  if (!text) return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
};

const parseJsonFromModel = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  let t = raw.replace(/^\uFEFF/, '').trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
};

const buildPrompt = (title, content) => `Bạn là giáo viên tiếng Việt. Dựa trên tiêu đề và nội dung bài đọc, hãy tạo từ 10 đến 15 câu hỏi dạng 5W1H (Who/What/When/Where/Why/How — dùng tiếng Việt cho câu hỏi).

Tiêu đề gợi ý: ${title || '(Không rõ)'}

Nội dung bài:
"""
${content.slice(0, 12000)}
"""

Trả về DUY NHẤT một JSON hợp lệ, không markdown, không giải thích thêm. Schema:
{
  "inferredTitle": "string — tiêu đề ngắn gọn nếu suy ra được",
  "questions": [
    { "dimension": "Who|What|When|Where|Why|How", "question": "câu hỏi tiếng Việt", "expectedAnswer": "đáp án ngắn gọn dựa trên bài" }
  ]
}

Ràng buộc:
- 10 <= số phần tử questions <= 15
- dimension phải là một trong: Who, What, When, Where, Why, How
- Câu hỏi phải bám sát nội dung bài, không hỏi chung chung`;

const callGeminiOnce = async (apiKey, prompt, jsonMode) => {
  const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 4096,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(errText || `Gemini ${res.status}`);
    err.statusCode = res.status;
    throw err;
  }
  const data = await res.json();
  const part = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!part) throw new Error('Gemini không trả về nội dung');
  return part;
};

const callGemini = async (apiKey, prompt) => {
  try {
    return await callGeminiOnce(apiKey, prompt, true);
  } catch (e) {
    if (e.statusCode === 400) {
      return await callGeminiOnce(apiKey, prompt, false);
    }
    throw e;
  }
};

export const createSession = async (req, res) => {
  try {
    const { text, durationMs, title, wordsRead } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, message: 'Thiếu nội dung bài đọc' });
    }
    const ms = Number(durationMs);
    if (!Number.isFinite(ms) || ms < 500) {
      return res.status(400).json({ success: false, message: 'Thời gian đọc không hợp lệ' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    const wordCount = countWords(text);
    if (wordCount < 5) {
      return res.status(400).json({ success: false, message: 'Bài đọc quá ngắn (tối thiểu ~5 từ)' });
    }

    let inferredTitle = typeof title === 'string' ? title.trim() : '';
    const wordsReadNum = Math.max(0, Math.min(wordCount, Number(wordsRead) || 0));
    const minutes = ms / 60000;
    const wpsNum = minutes > 0 ? Math.floor(wordsReadNum / minutes) : 0;

    const session = await ReadingSession.create({
      user: user._id,
      text,
      inferredTitle,
      wordCount,
      wordsRead: wordsReadNum,
      durationMs: Math.round(ms),
      wps: wpsNum,
      questions: [],
      geminiError: '',
      quizStatus: 'none',
    });

    res.status(201).json({
      success: true,
      data: {
        _id: session._id,
        wordCount: session.wordCount,
        wordsRead: session.wordsRead,
        durationMs: session.durationMs,
        wps: session.wps,
        inferredTitle: session.inferredTitle,
        questions: session.questions,
        geminiError: session.geminiError || undefined,
        createdAt: session.createdAt,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Lỗi server' });
  }
};

export const generateQuestions = async (req, res) => {
  try {
    const session = await ReadingSession.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: 'Không tìm thấy phiên đọc' });

    // Idempotent: if questions were already generated, return them directly.
    if (session.questions?.length && session.quizStatus === 'generated') {
      return res.json({
        success: true,
        data: {
          _id: session._id,
          inferredTitle: session.inferredTitle,
          questions: session.questions.map((q) => ({ dimension: q.dimension, question: q.question })),
          geminiError: session.geminiError || undefined,
          quizStatus: session.quizStatus,
        },
      });
    }

    const user = await User.findById(req.user._id).select('+geminiApiKeyEnc');
    if (!user?.geminiApiKeyEnc) {
      return res.status(400).json({
        success: false,
        message: 'Bạn cần cấu hình Gemini API key trước khi tạo câu hỏi',
        code: 'MISSING_GEMINI_KEY',
      });
    }

    let apiKey;
    try {
      apiKey = decryptSecret(user.geminiApiKeyEnc);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ success: false, message: 'Không giải mã được API key đã lưu' });
    }

    let inferredTitle = session.inferredTitle || '';
    let questions = [];
    let geminiError = '';

    try {
      const raw = await callGemini(apiKey, buildPrompt(inferredTitle, session.text));
      const parsed = parseJsonFromModel(raw);
      if (parsed?.questions?.length) {
        inferredTitle = parsed.inferredTitle || inferredTitle;
        questions = parsed.questions
          .filter((q) => q && q.question && q.dimension)
          .map((q) => ({
            type: '5w1h',
            dimension: String(q.dimension),
            question: String(q.question),
            expectedAnswer: String(q.expectedAnswer || ''),
          }))
          .slice(0, 15);
      } else {
        geminiError = 'Không phân tích được JSON từ Gemini';
      }
    } catch (e) {
      console.error(e);
      geminiError = e.message || 'Lỗi gọi Gemini';
    }

    // Use atomic update to avoid concurrency/version errors (e.g. double requests).
    const updated = await ReadingSession.findOneAndUpdate(
      { _id: session._id, user: req.user._id },
      {
        $set: {
          inferredTitle,
          questions,
          geminiError,
          quizStatus: questions.length ? 'generated' : 'none',
        },
      },
      { new: true }
    );

    res.json({
      success: true,
      data: {
        _id: updated._id,
        inferredTitle: updated.inferredTitle,
        questions: updated.questions.map((q) => ({
          dimension: q.dimension,
          question: q.question,
        })),
        geminiError: updated.geminiError || undefined,
        quizStatus: updated.quizStatus,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Lỗi server' });
  }
};

const buildGradePrompt = (content, questions, answers) => {
  const qa = questions.map((q, idx) => ({
    dimension: q.dimension,
    question: q.question,
    expectedAnswer: q.expectedAnswer || '',
    userAnswer: (answers?.[idx] || '').toString(),
  }));

  return `Bạn là giám khảo. Chấm câu trả lời của người học dựa trên nội dung bài đọc.\n\nNỘI DUNG BÀI:\n\"\"\"\n${content.slice(0, 12000)}\n\"\"\"\n\nDANH SÁCH CÂU HỎI + ĐÁP ÁN NGƯỜI HỌC (kèm expectedAnswer để tham chiếu):\n${JSON.stringify(qa, null, 2)}\n\nHãy trả về DUY NHẤT JSON hợp lệ theo schema:\n{\n  \"answers\": [\n    {\"score\": 0|1, \"feedback\": \"nhận xét ngắn gọn tiếng Việt\"}\n  ],\n  \"totalScore\": number\n}\n\nRàng buộc:\n- Mỗi câu: score chỉ 0 hoặc 1\n- feedback ngắn gọn, cụ thể\n- totalScore = tổng score\n- Không thêm markdown hoặc giải thích ngoài JSON.`;
};

export const submitAnswers = async (req, res) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: 'answers phải là mảng' });
    }

    const session = await ReadingSession.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: 'Không tìm thấy phiên đọc' });
    if (!session.questions?.length) {
      return res.status(400).json({ success: false, message: 'Phiên này chưa có bộ câu hỏi. Hãy bấm “Kiểm tra” trước.' });
    }

    const user = await User.findById(req.user._id).select('+geminiApiKeyEnc');
    if (!user?.geminiApiKeyEnc) {
      return res.status(400).json({
        success: false,
        message: 'Bạn cần cấu hình Gemini API key trước khi chấm bài',
        code: 'MISSING_GEMINI_KEY',
      });
    }

    let apiKey;
    try {
      apiKey = decryptSecret(user.geminiApiKeyEnc);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ success: false, message: 'Không giải mã được API key đã lưu' });
    }

    const prompt = buildGradePrompt(session.text, session.questions, answers);
    let parsed = null;
    let geminiError = '';
    try {
      const raw = await callGemini(apiKey, prompt);
      parsed = parseJsonFromModel(raw);
    } catch (e) {
      console.error(e);
      geminiError = e.message || 'Lỗi gọi Gemini';
    }

    if (!parsed?.answers?.length) {
      return res.status(500).json({ success: false, message: 'Không chấm được bài', detail: geminiError || 'Invalid JSON' });
    }

    const graded = session.questions.map((q, idx) => {
      const a = (answers[idx] || '').toString();
      const g = parsed.answers[idx] || {};
      const score = g.score === 1 ? 1 : 0;
      const feedback = (g.feedback || '').toString();
      return {
        dimension: q.dimension,
        question: q.question,
        answer: a,
        score,
        feedback,
      };
    });

    const totalScore = Number(parsed.totalScore) || graded.reduce((sum, x) => sum + (x.score || 0), 0);
    session.answers = graded;
    session.totalScore = totalScore;
    session.quizStatus = 'submitted';
    session.submittedAt = new Date();
    await session.save();

    res.json({
      success: true,
      data: {
        _id: session._id,
        quizStatus: session.quizStatus,
        totalScore: session.totalScore,
        maxScore: session.questions.length,
        answers: session.answers,
        submittedAt: session.submittedAt,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Lỗi server' });
  }
};

export const listMySessions = async (req, res) => {
  try {
    const items = await ReadingSession.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-text');
    res.json({ success: true, data: items });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Lỗi server' });
  }
};

export const getSession = async (req, res) => {
  try {
    const s = await ReadingSession.findOne({ _id: req.params.id, user: req.user._id });
    if (!s) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    res.json({ success: true, data: s });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Lỗi server' });
  }
};
