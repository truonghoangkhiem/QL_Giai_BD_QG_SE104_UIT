const express = require("express");

const {
  createPlayerResults,
  updatePlayerResultsafterMatch,
  getPlayerResultbySeasonIdAndDate,
  updatePlayerResults,
  deletePlayerResults,
  getPlayerResultsById,
} = require("../controllers/player_resultsController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authenticateToken, createPlayerResults);
router.get("/season/:seasonid", getPlayerResultbySeasonIdAndDate);
router.get("/player/:playerid", getPlayerResultsById);
router.put("/match/:matchid", authenticateToken, updatePlayerResultsafterMatch);
router.put("/:id", authenticateToken, updatePlayerResults);
router.delete("/:id", authenticateToken, deletePlayerResults);

module.exports = router;
