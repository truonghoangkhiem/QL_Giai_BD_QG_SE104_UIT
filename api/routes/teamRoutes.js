const express = require("express");
const {
  getTeams,
  getTeamsByID,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamsByIDSeason,
} = require("../controllers/teamController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getTeams);
router.post("/", authenticateToken, createTeam);
router.put("/:id", authenticateToken, updateTeam);
router.delete("/:id", authenticateToken, deleteTeam);
router.get("/:id", getTeamsByID);
router.get("/seasons/:id", getTeamsByIDSeason);

module.exports = router;
