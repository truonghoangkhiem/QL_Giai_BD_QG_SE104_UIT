const express = require("express");
const {
  getTeams,
  getTeamsByID,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamsByIDSeason,
  getTeamsByNameAndSeasonId,
} = require("../../controllers/team/teamController");
const { authenticateToken } = require("../../middleware/authMiddleware");
const { errorMiddleware } = require("../../middleware/errorMiddleware");

const router = express.Router();

router.get("/", getTeams); ///
router.post("/", authenticateToken, createTeam); ///
router.put("/:id", authenticateToken, updateTeam); ///
router.delete("/:id", authenticateToken, deleteTeam); ///
router.get("/:id", getTeamsByID); ///
router.get("/seasons/:id", getTeamsByIDSeason); ///
router.get("/:season_id/:team_name", getTeamsByNameAndSeasonId); ///
router.use(errorMiddleware); // Đảm bảo mọi lỗi đều được xử lý bởi errorMiddleware

module.exports = router;
