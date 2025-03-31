const express = require("express");
const {
  getRegulations,
  getRegulationById,
  createRegulation,
  updateRegulation,
  deleteRegulation,
  getIdRegulations,
} = require("../../controllers/regulation/regulationController");

const { authenticateToken } = require("../../middleware/authMiddleware");
const { errorMiddleware } = require("../../middleware/errorMiddleware");

const router = express.Router();

router.get("/", getRegulations); //
router.get("/:id", getRegulationById); //
router.get("/:season_id/:regulation_name", getIdRegulations); //
router.post("/", authenticateToken, createRegulation); //
router.put("/:id", authenticateToken, updateRegulation); //
router.delete("/:id", authenticateToken, deleteRegulation); //
router.use(errorMiddleware); // Đảm bảo mọi lỗi đều được xử lý bởi errorMiddleware

module.exports = router;
