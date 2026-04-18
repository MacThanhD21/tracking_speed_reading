import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    type: { type: String },
    dimension: { type: String },
    question: { type: String },
    expectedAnswer: { type: String, default: '' },
  },
  { _id: false }
);

const answerSchema = new mongoose.Schema(
  {
    dimension: { type: String },
    question: { type: String },
    answer: { type: String },
    score: { type: Number, default: 0 },
    feedback: { type: String, default: '' },
  },
  { _id: false }
);

const readingSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    inferredTitle: { type: String, default: '' },
    wordCount: { type: Number, required: true },
    wordsRead: { type: Number, default: 0 },
    durationMs: { type: Number, required: true },
    wps: { type: Number, required: true },
    questions: { type: [questionSchema], default: [] },
    geminiError: { type: String, default: '' },
    quizStatus: { type: String, enum: ['none', 'generated', 'submitted'], default: 'none' },
    submittedAt: { type: Date },
    answers: { type: [answerSchema], default: [] },
    totalScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ReadingSession = mongoose.model('ReadingSession', readingSessionSchema);
export default ReadingSession;
