import express from 'express';
import { setGeminiApiKey, deleteGeminiApiKey } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.put('/gemini-key', protect, setGeminiApiKey);
router.delete('/gemini-key', protect, deleteGeminiApiKey);

export default router;
