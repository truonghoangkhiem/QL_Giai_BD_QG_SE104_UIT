import express from "express";
import {
  createTeamResults,
  getTeamResultsbySeasonId,
  getTeamResultsById,
  getId,
  updateTeamResultsByMatch,
  deleteTeamResults,
} from "../../controllers/team/team_resultsController.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { errorMiddleware } from "../../middleware/errorMiddleware.js";

const router = express.Router();
router.get("/:id", getTeamResultsById); ///
router.get("/season/:season_id", getTeamResultsbySeasonId); ///
router.get("/:season_id/:team_id", getId); ///
router.post("/", authenticateToken, createTeamResults); ////
router.put("/:matchid", authenticateToken, updateTeamResultsByMatch); ///
router.use(errorMiddleware); // Đảm bảo mọi lỗi đều được xử lý bởi errorMiddleware
router.delete("/:id", authenticateToken, deleteTeamResults); /// Xóa kết quả đội bóng theo ID

export default router;
