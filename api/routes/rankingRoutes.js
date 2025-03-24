const express = require("express");

const {
  createRanking,
  getSeasonRanking,
  // updateRanking,
  // deleteRanking,
} = require("../controllers/rankingController");

const { authenticateToken } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/:seasonid", getSeasonRanking);
router.post("/:team_result_id", authenticateToken, createRanking);
router.put("/", authenticateToken, updateRanking);
// router.delete("/", authenticateToken, deleteRanking);

module.exports = router;
