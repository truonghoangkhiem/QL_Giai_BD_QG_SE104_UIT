require("dotenv").config();
const mongoose = require("mongoose");

let DatabaseQuanLyGiaiBDQG; // Khai báo biến ngoài hàm

const CONNECT_DB = async () => {
  try {
    console.log(process.env); // Kiểm tra xem các biến môi trường có được đọc đúng không
    console.log("MONGODB_URI:", process.env.MONGODB_URI); // Thêm dòng này để debug
    console.log("📌 [DEBUG] Đang kết nối MongoDB...");
    DatabaseQuanLyGiaiBDQG = await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ [DEBUG] Đã kết nối MongoDB:", process.env.DATABASE_NAME);
    return DatabaseQuanLyGiaiBDQG;
  } catch (error) {
    console.error("❌ [DEBUG] Lỗi kết nối MongoDB:", error);
    throw error;
  }
};

const GET_DB = () => {
  if (!DatabaseQuanLyGiaiBDQG) {
    throw new Error("❌ [DEBUG] Database chưa kết nối!");
  }
  return DatabaseQuanLyGiaiBDQG;
};

module.exports = { CONNECT_DB, GET_DB };
