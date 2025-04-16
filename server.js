import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import fs from "fs";
import YAML from "yaml";
import { connectDB } from "./src/api/config/db.js";
import authRoutes from "./src/api/v1/routes/auth/authRoutes.js"; // Import routes
import teamRoutes from "./src/api/v1/routes/team/teamRoutes.js";
import seasonRoutes from "./src/api/v1/routes/season/seasonRoutes.js";
import matchRoutes from "./src/api/v1/routes/match/matchRoutes.js";
import playerRoutes from "./src/api/v1/routes/player/playerRoutes.js";
import regulationRoutes from "./src/api/v1/routes/regulation/regulationRoutes.js";
import team_resultsRoutes from "./src/api/v1/routes/team/team_resultsRoutes.js";
import rankingRoutes from "./src/api/v1/routes/team/rankingRoutes.js";
import player_resultsRoutes from "./src/api/v1/routes/player/player_resultsRoutes.js";
import player_rankingsRoutes from "./src/api/v1/routes/player/player_rankingsRoutes.js";
import { errorMiddleware } from "./src/api/v1/middleware/errorMiddleware.js";
import swaggerUi from "swagger-ui-express";

dotenv.config();

const file = fs.readFileSync("./Document/swagger.yaml", "utf8");
const swaggerDocument = YAML.parse(file);

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

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
