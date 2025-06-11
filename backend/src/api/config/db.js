import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

// Hàm kết nối database
const connectDB = async () => {
  try {
    console.log("📌 [DEBUG] Đang kết nối MongoDB...");
    console.log(process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: process.env.DATABASE_NAME, // Chỉ định tên database nếu cần
    });
    console.log("✅ [DEBUG] Đã kết nối MongoDB:", process.env.DATABASE_NAME);
  } catch (error) {
    console.error("❌ [DEBUG] Lỗi kết nối MongoDB:", error);
    throw error; // Ném lỗi để xử lý ở nơi gọi hàm
  }
};

export { connectDB };
