const express = require("express");
const { CONNECT_DB } = require("./config/db");
const authRoutes = require("./routes/authRoutes"); // Import routes
const teamRoutes = require("./routes/teamRoutes");
const seasonRoutes = require("./routes/seasonRoutes");

require("dotenv").config();

console.log(
  "📌 [DEBUG] MONGODB_URI:",
  process.env.MONGODB_URI || "❌ Không tìm thấy biến môi trường!"
);
console.log(
  "📌 [DEBUG] DATABASE_NAME:",
  process.env.DATABASE_NAME || "❌ Không tìm thấy biến môi trường!"
);

const app = express();
app.use(express.json());

// Định nghĩa các route API
app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/seasons", seasonRoutes);

// API Mặc định để kiểm tra server đang chạy
app.get("/", (req, res) => {
  res.send("⚽ API Football League is running...");
});

// Kết nối MongoDB trước khi chạy server
CONNECT_DB()
  .then((db) => {
    console.log("✅ Database connected successfully!");

    // Sau khi kết nối, mới khởi động server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
  });
