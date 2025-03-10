const express = require("express");
const {
  getSeasons,
  createSeason,
  updateSeason,
  deleteSeason,
  getSeasonById,
} = require("../controllers/seasonController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();
router.get("/:id", getSeasonById);
router.get("/", getSeasons);
router.post("/", authenticateToken, createSeason);
router.put("/:id", authenticateToken, updateSeason);
router.delete("/:id", authenticateToken, deleteSeason);

module.exports = router;
