const express = require("express");

const {
  createPlayerResults,
  updatePlayerResultsafterMatch,
  getPlayerResultbySeasonIdAndDate,
  updatePlayerResults,
  deletePlayerResults,
  getPlayerResultsById,
} = require("../../controllers/player/player_resultsController");

const { authenticateToken } = require("../../middleware/authMiddleware");
const { errorMiddleware } = require("../../middleware/errorMiddleware");

const router = express.Router();

router.post("/", authenticateToken, createPlayerResults);
router.get("/season/:seasonid", getPlayerResultbySeasonIdAndDate);
router.get("/player/:playerid", getPlayerResultsById);
router.put("/match/:matchid", authenticateToken, updatePlayerResultsafterMatch);
router.put("/:id", authenticateToken, updatePlayerResults);
router.delete("/:id", authenticateToken, deletePlayerResults);
router.use(errorMiddleware); // Đảm bảo mọi lỗi đều được xử lý bởi errorMiddleware

module.exports = router;
