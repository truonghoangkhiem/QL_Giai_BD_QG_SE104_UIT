import express from "express";
import {
  getPlayers,
  getPlayerById,
  getPlayersByIdTeam,
  createPlayer,
  updatePlayer,
  deletePlayer,
  getPlayerByNamePlayerAndNumberAndTeamId,
} from "../../controllers/player/playerController.js";

import { authenticateToken } from "../../middleware/authMiddleware.js";
import { errorMiddleware } from "../../middleware/errorMiddleware.js";

const router = express.Router();

// Route cụ thể hơn nên đặt trước
router.get("/team/:id", getPlayersByIdTeam); ///
router.get(
  "/:team_id/:number/:name_player",
  getPlayerByNamePlayerAndNumberAndTeamId
); ///

// Route ít cụ thể hơn đặt sau
router.get("/", getPlayers); ///
router.get("/:id", getPlayerById); ///

router.post("/", authenticateToken, createPlayer); ///
router.put("/:id", authenticateToken, updatePlayer); ///
router.delete("/:id", authenticateToken, deletePlayer); ///

router.use(errorMiddleware); // Đảm bảo mọi lỗi đều được xử lý bởi errorMiddleware

export default router;
