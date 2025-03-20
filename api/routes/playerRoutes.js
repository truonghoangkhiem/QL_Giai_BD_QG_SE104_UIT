const express = require("express");
const {
  getPlayers,
  getPlayerById,
  getPlayersByIdTeam,
  createPlayer,
  updatePlayer,
  deletePlayer,
} = require("../controllers/playerController");

const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();
router.get("/", getPlayers);
router.get("/:id", getPlayerById);
router.get("/team/:id", getPlayersByIdTeam);
router.post("/", authenticateToken, createPlayer);
router.put("/:id", authenticateToken, updatePlayer);
router.delete("/:id", authenticateToken, deletePlayer);

module.exports = router;
