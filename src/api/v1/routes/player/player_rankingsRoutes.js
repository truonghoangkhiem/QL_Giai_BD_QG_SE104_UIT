const express = require("express");

const {
  createPlayerRankings,
  updatePlayerRankingsafterMatch,
  deletePlayerRankings,
  getPlayerRankingsbySeasonIdAndDate,
} = require("../../controllers/player/player_rankingsController");

const { authenticateToken } = require("../../middleware/authMiddleware");
const { errorMiddleware } = require("../../middleware/errorMiddleware");

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

module.exports = router;
