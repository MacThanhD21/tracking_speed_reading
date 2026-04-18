import express from 'express';
import {
  createSession,
  listMySessions,
  getSession,
  generateQuestions,
  submitAnswers,
} from '../controllers/readingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.post('/sessions', protect, createSession);
router.get('/sessions', protect, listMySessions);
router.get('/sessions/:id', protect, getSession);
router.post('/sessions/:id/questions', protect, generateQuestions);
router.post('/sessions/:id/submit', protect, submitAnswers);

export default router;
