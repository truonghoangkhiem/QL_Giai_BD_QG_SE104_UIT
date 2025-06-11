import express from "express";
import {
  createOrUpdateLineup,
  getLineupsByMatchId,
  getLineupByMatchAndTeamId,
  deleteLineup,
} from "../../controllers/match/matchLineupController.js"; // Đảm bảo tên hàm khớp
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { errorMiddleware } from "../../middleware/errorMiddleware.js";

const router = express.Router();

router.post("/", authenticateToken, createOrUpdateLineup);
router.put("/match/:match_id/team/:team_id", authenticateToken, createOrUpdateLineup);

router.get("/match/:match_id", getLineupsByMatchId);
router.get("/match/:match_id/team/:team_id", getLineupByMatchAndTeamId);

router.delete("/match/:match_id/team/:team_id", authenticateToken, deleteLineup);

router.use(errorMiddleware);

export default router;