import User from '../models/User.js';
import { encryptSecret } from '../utils/cryptoKey.js';

export const setGeminiApiKey = async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'API key không hợp lệ' });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    user.geminiApiKeyEnc = encryptSecret(apiKey.trim());
    user.geminiKeySetAt = new Date();
    await user.save();
    res.json({ success: true, message: 'Đã lưu API key', data: user.toSafeObject() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Lỗi server' });
  }
};

export const deleteGeminiApiKey = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: { geminiApiKeyEnc: '', geminiKeySetAt: null },
    });
    res.json({ success: true, message: 'Đã xóa API key' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Lỗi server' });
  }
};
