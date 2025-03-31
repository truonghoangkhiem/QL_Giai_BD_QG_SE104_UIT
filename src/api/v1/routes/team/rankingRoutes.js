const express = require("express");

const {
  createRanking,
  getSeasonRanking,
  updateRanking,
  deleteRanking,
} = require("../../controllers/team/rankingController");

const { authenticateToken } = require("../../middleware/authMiddleware");
const { errorMiddleware } = require("../../middleware/errorMiddleware");

const router = express.Router();

router.get("/:seasonid", getSeasonRanking);
router.post("/:team_result_id", authenticateToken, createRanking);
router.put("/:seasonid", authenticateToken, updateRanking);
router.delete("/:id", authenticateToken, deleteRanking);
router.use(errorMiddleware); // Đảm bảo mọi lỗi đều được xử lý bởi errorMiddleware

module.exports = router;
