import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return true;
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    return false;
  }
};

export default connectDB;
