const express = require("express");

const {
  createPlayerRankings,
  updatePlayerRankingsafterMatch,
  deletePlayerRankings,
  getPlayerRankingsbySeasonIdAndDate,
} = require("../controllers/player_rankingsController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authenticateToken, createPlayerRankings);
router.get("/season/:seasonid", getPlayerRankingsbySeasonIdAndDate);
router.put(
  "/match/:matchid",
  authenticateToken,
  updatePlayerRankingsafterMatch
);
router.delete("/:id", authenticateToken, deletePlayerRankings);

module.exports = router;
