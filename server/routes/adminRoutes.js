import express from 'express';
import { listUsers, setUserActive, listSessions, createAdminUser } from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect, adminOnly);
router.get('/users', listUsers);
router.post('/users/admin', createAdminUser);
router.patch('/users/:id/active', setUserActive);
router.get('/sessions', listSessions);

export default router;
