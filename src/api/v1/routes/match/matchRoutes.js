const express = require("express");
const {
  getMatches,
  getMatchesById,
  createMatch,
  updateMatch,
  deleteMatch,
  getMatchesBySeasonId,
} = require("../../controllers/match/matchController");
const { authenticateToken } = require("../../middleware/authMiddleware");
const { errorMiddleware } = require("../../middleware/errorMiddleware");
const { get } = require("mongoose");

const router = express.Router();

router.get("/", getMatches); //
router.get("/:id", getMatchesById); //
router.post("/", authenticateToken, createMatch); //
router.get("/season/:seasonid", getMatchesBySeasonId); //
router.put("/:id", authenticateToken, updateMatch); //
router.delete("/:id", authenticateToken, deleteMatch); //
router.use(errorMiddleware); // Đảm bảo mọi lỗi đều được xử lý bởi errorMiddleware

module.exports = router;
