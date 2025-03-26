const express = require("express");
const {
  createTeamResults,
  getTeamResultsbySeasonId,
  getTeamResultsById,
  getId,
  updateTeamResultsByMatch,
} = require("../controllers/team_resultsController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();
router.get("/:id", getTeamResultsById);
router.get("/season/:id", getTeamResultsbySeasonId);
router.get("/id", getId);
router.post("/", authenticateToken, createTeamResults);
router.put("/:matchid", authenticateToken, updateTeamResultsByMatch);

module.exports = router;
