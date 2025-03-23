const express = require("express");
const {
  createTeamResult,
  getTeamResultsbySeasonId,
  getTeamResultsById,
  getId,
  updateTeamResultsByMatch,
} = require("../controllers/team_resultController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();
router.get("/:id", getTeamResultsById);
router.get("/season/:id", getTeamResultsbySeasonId);
router.get("/id", getId);
router.post("/", authenticateToken, createTeamResult);
router.put("/:matchid", authenticateToken, updateTeamResultsByMatch);

module.exports = router;
