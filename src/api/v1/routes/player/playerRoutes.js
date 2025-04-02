const express = require("express");
const {
  getPlayers,
  getPlayerById,
  getPlayersByIdTeam,
  createPlayer,
  updatePlayer,
  deletePlayer,
} = require("../../controllers/player/playerController");

const { authenticateToken } = require("../../middleware/authMiddleware");
const { errorMiddleware } = require("../../middleware/errorMiddleware");

const router = express.Router();
router.get("/", getPlayers); ///
router.get("/:id", getPlayerById); ///
router.get("/team/:id", getPlayersByIdTeam); ///
router.post("/", authenticateToken, createPlayer); ///
router.put("/:id", authenticateToken, updatePlayer); ///
router.delete("/:id", authenticateToken, deletePlayer); ///
router.use(errorMiddleware); // Đảm bảo mọi lỗi đều được xử lý bởi errorMiddleware

module.exports = router;
