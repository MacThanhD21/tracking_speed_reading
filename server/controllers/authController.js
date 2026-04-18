import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin' });
    }
    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: 'Email đã được sử dụng' });
    }
    const user = await User.create({ name, email, password });
    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasGeminiKey: false,
        token: generateToken(user._id),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Lỗi server' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa' });
    }
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasGeminiKey: Boolean(user.geminiApiKeyEnc),
        token: generateToken(user._id),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Lỗi server' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, data: user.toSafeObject() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Lỗi server' });
  }
};
