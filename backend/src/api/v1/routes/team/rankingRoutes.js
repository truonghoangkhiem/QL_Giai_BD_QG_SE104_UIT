import express from "express";

import {
  createRanking,
  getSeasonRanking,
  updateRanking,
  deleteRanking,
} from "../../controllers/team/rankingController.js";

import { authenticateToken } from "../../middleware/authMiddleware.js";
import { errorMiddleware } from "../../middleware/errorMiddleware.js";

const router = express.Router();

router.get("/:seasonid", getSeasonRanking);
router.post("/:team_result_id", authenticateToken, createRanking);
router.put("/:seasonid", authenticateToken, updateRanking);
router.delete("/:id", authenticateToken, deleteRanking);
router.use(errorMiddleware); // Đảm bảo mọi lỗi đều được xử lý bởi errorMiddleware

export default router;
