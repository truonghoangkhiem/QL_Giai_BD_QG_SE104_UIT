const express = require("express");
const {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
} = require("../controllers/teamController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getTeams);
router.post("/", authenticateToken, createTeam);
router.put("/:id", authenticateToken, updateTeam);
router.delete("/:id", authenticateToken, deleteTeam);

module.exports = router;
