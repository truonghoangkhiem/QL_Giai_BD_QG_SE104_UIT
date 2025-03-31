const express = require("express");
const {
  getSeasons,
  createSeason,
  updateSeason,
  deleteSeason,
  getSeasonById,
  getSeasonIdBySeasonName,
} = require("../../controllers/season/seasonController");
const { authenticateToken } = require("../../middleware/authMiddleware");
const { errorMiddleware } = require("../../middleware/errorMiddleware");

const router = express.Router();
router.get("/:id", getSeasonById); //
router.get("/", getSeasons); //
router.get("/name/:season_name", getSeasonIdBySeasonName); //
router.post("/", authenticateToken, createSeason); //
router.put("/:id", authenticateToken, updateSeason); //
router.delete("/:id", authenticateToken, deleteSeason); //
router.use(errorMiddleware); // Đảm bảo mọi lỗi đều được xử lý bởi errorMiddleware

module.exports = router;
