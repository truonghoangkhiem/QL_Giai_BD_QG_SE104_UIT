require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { connectDB } = require("./src/api/config/db");
const authRoutes = require("./src/api/v1/routes/auth/authRoutes"); // Import routes
const teamRoutes = require("./src/api/v1/routes/team/teamRoutes");
const seasonRoutes = require("./src/api/v1/routes/season/seasonRoutes");
const matchRoutes = require("./src/api/v1/routes/match/matchRoutes");
const playerRoutes = require("./src/api/v1/routes/player/playerRoutes");
const regulationRoutes = require("./src/api/v1/routes/regulation/regulationRoutes");
const team_resultsRoutes = require("./src/api/v1/routes/team/team_resultsRoutes");
const rankingRoutes = require("./src/api/v1/routes/team/rankingRoutes");
const player_resultsRoutes = require("./src/api/v1/routes/player/player_resultsRoutes");
const player_rankingsRoutes = require("./src/api/v1/routes/player/player_rankingsRoutes");
const { errorMiddleware } = require("./src/api/v1/middleware/errorMiddleware");

console.log(
  "📌 [DEBUG] MONGODB_URI:",
  process.env.MONGODB_URI || "❌ Không tìm thấy biến môi trường!"
);
console.log("DATABASE_NAME:", process.env.DATABASE_NAME); // Kiểm tra giá trị của DATABASE_NAME

console.log(
  "📌 [DEBUG] DATABASE_NAME:",
  process.env.DATABASE_NAME || "❌ Không tìm thấy biến môi trường!"
);
console.log(process.env.MONGODB_URI);

const app = express();
app.use(express.json());

// Định nghĩa các route API
app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/seasons", seasonRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/regulations", regulationRoutes);
app.use("/api/team_results", team_resultsRoutes);
app.use("/api/rankings", rankingRoutes);
app.use("/api/player_results", player_resultsRoutes);
app.use("/api/player_rankings", player_rankingsRoutes);
app.use(errorMiddleware);
// API Mặc định để kiểm tra server đang chạy
app.get("/", (req, res) => {
  res.send("⚽ API Football League is running...");
});
console.log("Môi trường hiện tại:", process.env.NODE_ENV || "chưa thiết lập");

// Kết nối MongoDB trước khi chạy server
connectDB()
  .then(() => {
    // Sau khi kết nối, mới khởi động server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
  });
