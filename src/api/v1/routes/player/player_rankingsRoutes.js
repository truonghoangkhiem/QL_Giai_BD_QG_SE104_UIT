import express from "express";

import {
  createPlayerRankings,
  updatePlayerRankingsafterMatch,
  deletePlayerRankings,
  getPlayerRankingsbySeasonIdAndDate,
} from "../../controllers/player/player_rankingsController.js";

import { authenticateToken } from "../../middleware/authMiddleware.js";
import { errorMiddleware } from "../../middleware/errorMiddleware.js";

const router = express.Router();

router.post("/", authenticateToken, createPlayerRankings);
router.get("/season/:seasonid", getPlayerRankingsbySeasonIdAndDate);
router.put(
  "/match/:matchid",
  authenticateToken,
  updatePlayerRankingsafterMatch
);
router.delete("/:id", authenticateToken, deletePlayerRankings);
router.use(errorMiddleware); // Đảm bảo mọi lỗi đều được xử lý bởi errorMiddleware

export default router;
