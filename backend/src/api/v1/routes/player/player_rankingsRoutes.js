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

// HOÀN TRẢ LẠI PHƯƠNG THỨC GET
router.get("/season/:seasonid", getPlayerRankingsbySeasonIdAndDate);

router.post("/", authenticateToken, createPlayerRankings);
router.put(
  "/match/:matchid",
  authenticateToken,
  updatePlayerRankingsafterMatch
);
router.delete("/:id", authenticateToken, deletePlayerRankings);
router.use(errorMiddleware);

export default router;