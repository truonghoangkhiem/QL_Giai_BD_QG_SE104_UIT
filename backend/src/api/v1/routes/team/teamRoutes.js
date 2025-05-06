import express from "express";
import {
  getTeams,
  getTeamsByID,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamsByIDSeason,
  getTeamsByNameAndSeasonId,
} from "../../controllers/team/teamController.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { errorMiddleware } from "../../middleware/errorMiddleware.js";

const router = express.Router();

router.get("/", getTeams); ///
router.post("/", authenticateToken, createTeam); ///
router.put("/:id", authenticateToken, updateTeam); ///
router.delete("/:id", authenticateToken, deleteTeam); ///
router.get("/:id", getTeamsByID); ///
router.get("/seasons/:season_id", getTeamsByIDSeason); ///
router.get("/:season_id/:team_name", getTeamsByNameAndSeasonId); ///
router.use(errorMiddleware); // Đảm bảo mọi lỗi đều được xử lý bởi errorMiddleware

export default router;
