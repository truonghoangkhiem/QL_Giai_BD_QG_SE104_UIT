import express from "express";
import {
  getRegulations,
  getRegulationById,
  createRegulation,
  updateRegulation,
  deleteRegulation,
  getRegulationsBySeasonId,
  getIdRegulations,
} from "../../controllers/regulation/regulationController.js";

import { authenticateToken } from "../../middleware/authMiddleware.js";
import { errorMiddleware } from "../../middleware/errorMiddleware.js";

const router = express.Router();

router.get("/", getRegulations); ///
router.get("/season/:season_id", getRegulationsBySeasonId); // Route mới dùng season_id
router.get("/:id", getRegulationById); ///
router.get("/:season_id/:regulation_name", getIdRegulations); ///
router.post("/", authenticateToken, createRegulation); ///
router.put("/:id", authenticateToken, updateRegulation); ///
router.delete("/:id", authenticateToken, deleteRegulation); ///
router.use(errorMiddleware); // Đảm bảo mọi lỗi đều được xử lý bởi errorMiddleware

export default router;
