const express = require("express");
const {
  getMatches,
  getMatchesById,
  createMatch,
  updateMatch,
  deleteMatch,
} = require("../controllers/matchController");
const { authenticateToken } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", getMatches);
router.get("/:id", getMatchesById);
router.post("/", authenticateToken, createMatch);
router.put("/:id", authenticateToken, updateMatch);
router.delete("/:id", authenticateToken, deleteMatch);

module.exports = router;
