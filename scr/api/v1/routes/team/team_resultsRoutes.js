const express = require("express");
const {
  createTeamResults,
  getTeamResultsbySeasonId,
  getTeamResultsById,
  getId,
  updateTeamResultsByMatch,
  deleteTeamResults,
} = require("../../controllers/team/team_resultsController");
const { authenticateToken } = require("../../middleware/authMiddleware");
const { errorMiddleware } = require("../../middleware/errorMiddleware");

const router = express.Router();
router.get("/:id", getTeamResultsById); //
router.get("/season/:season_id", getTeamResultsbySeasonId); //
router.get("/:season_id/:team_id", getId); //
router.post("/", authenticateToken, createTeamResults); //
router.put("/:matchid", authenticateToken, updateTeamResultsByMatch); //
router.use(errorMiddleware); // Đảm bảo mọi lỗi đều được xử lý bởi errorMiddleware
router.delete("/:id", authenticateToken, deleteTeamResults); // Xóa kết quả đội bóng theo ID

module.exports = router;
