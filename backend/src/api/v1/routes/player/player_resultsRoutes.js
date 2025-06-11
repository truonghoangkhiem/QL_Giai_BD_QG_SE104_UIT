import express from "express";

import {
  createPlayerResults,
  updatePlayerResultsafterMatch,
  getPlayerResultbySeasonIdAndDate,
  updatePlayerResults,
  deletePlayerResults,
  getPlayerResultsById,
} from "../../controllers/player/player_resultsController.js";

import { authenticateToken } from "../../middleware/authMiddleware.js";
import { errorMiddleware } from "../../middleware/errorMiddleware.js";

const router = express.Router();

router.post("/", authenticateToken, createPlayerResults);
router.get("/season/:seasonid/:date", getPlayerResultbySeasonIdAndDate);
router.get("/player/:playerid", getPlayerResultsById);
router.put("/match/:matchid", authenticateToken, updatePlayerResultsafterMatch);
router.put("/:id", authenticateToken, updatePlayerResults);
router.delete("/:id", authenticateToken, deletePlayerResults);
router.use(errorMiddleware); // Đảm bảo mọi lỗi đều được xử lý bởi errorMiddleware

export default router;
