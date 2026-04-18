import crypto from 'crypto';

const ALGO = 'aes-256-gcm';

const getKey = () => {
  const raw = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!raw) {
    throw new Error('Set ENCRYPTION_KEY or JWT_SECRET to encrypt stored Gemini API keys');
  }
  return crypto.createHash('sha256').update(String(raw)).digest();
};

export const encryptSecret = (plainText) => {
  if (!plainText) return '';
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
};

export const decryptSecret = (payloadB64) => {
  if (!payloadB64) return '';
  const key = getKey();
  const buf = Buffer.from(String(payloadB64), 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
};
