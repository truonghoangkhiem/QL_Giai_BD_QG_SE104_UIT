const express = require("express");
const {
  getMatches,
  getMatchesById,
  createMatch,
  updateMatch,
  deleteMatch,
  getMatchesBySeasonId,
  getMatchesBySeasonIdAndDate,
  getMatchesByTeamId,
} = require("../../controllers/match/matchController");
const { authenticateToken } = require("../../middleware/authMiddleware");
const { errorMiddleware } = require("../../middleware/errorMiddleware");
const router = express.Router();

router.get("/", getMatches); ///
router.get("/:id", getMatchesById); ///
router.get("/seasons/:season_id/:date", getMatchesBySeasonIdAndDate); ///
router.post("/", authenticateToken, createMatch); ///
router.get("/teams/:team_id", getMatchesByTeamId);
router.get("/seasons/:season_id", getMatchesBySeasonId); ///
router.put("/:id", authenticateToken, updateMatch); ///
router.delete("/:id", authenticateToken, deleteMatch); ///
router.use(errorMiddleware); // Đảm bảo mọi lỗi đều được xử lý bởi errorMiddleware

module.exports = router;
