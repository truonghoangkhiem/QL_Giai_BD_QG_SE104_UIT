import express from "express";
import {
  getMatches,
  getMatchesById,
  createMatch,
  updateMatch,
  deleteMatch,
  getMatchesBySeasonId,
  getMatchesBySeasonIdAndDate,
  getMatchesByTeamId,
} from "../../controllers/match/matchController.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { errorMiddleware } from "../../middleware/errorMiddleware.js";

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

export default router;
