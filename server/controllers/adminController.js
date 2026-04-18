import User from '../models/User.js';
import ReadingSession from '../models/ReadingSession.js';

export const listUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: users.map((u) => u.toSafeObject()) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Lỗi server' });
  }
};

export const setUserActive = async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    if (user.role === 'admin' && isActive === false) {
      return res.status(400).json({ success: false, message: 'Không khóa tài khoản admin bằng API này' });
    }
    user.isActive = Boolean(isActive);
    await user.save();
    res.json({ success: true, data: user.toSafeObject() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Lỗi server' });
  }
};

export const listSessions = async (req, res) => {
  try {
    const items = await ReadingSession.find({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .select('-text');
    res.json({ success: true, data: items });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Lỗi server' });
  }
};

export const createAdminUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ tên, email, mật khẩu' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu admin phải từ 6 ký tự' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
    }

    const admin = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: String(password),
      role: 'admin',
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Đã tạo tài khoản admin',
      data: admin.toSafeObject(),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Lỗi server' });
  }
};
