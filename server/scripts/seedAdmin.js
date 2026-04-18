import dotenv from 'dotenv';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const run = async () => {
  const uri = process.env.MONGODB_URI;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';

  if (!uri || !email || !password) {
    console.error('Set MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD in server/.env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    if (exists.role !== 'admin') {
      exists.role = 'admin';
      await exists.save();
      console.log('Promoted existing user to admin:', email);
    } else {
      console.log('Admin already exists:', email);
    }
    await mongoose.disconnect();
    return;
  }

  await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: 'admin',
  });
  console.log('Created admin:', email);
  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
