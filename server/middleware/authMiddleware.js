import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user || !req.user.isActive) {
        return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ hoặc đã bị khóa' });
      }
      next();
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'Thiếu token' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Cần quyền quản trị' });
};
