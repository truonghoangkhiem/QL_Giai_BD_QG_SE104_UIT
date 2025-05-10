import express from "express";
import {
  getSeasons,
  createSeason,
  updateSeason,
  deleteSeason,
  getSeasonById,
  getSeasonIdBySeasonName,
} from "../../controllers/season/seasonController.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { errorMiddleware } from "../../middleware/errorMiddleware.js";

const router = express.Router();
router.get("/:id", getSeasonById); ///
router.get("/", getSeasons); ///
router.get("/name/:season_name", getSeasonIdBySeasonName); ///
router.post("/", authenticateToken, createSeason); ////
router.put("/:id", authenticateToken, updateSeason); ///
router.delete("/:id", authenticateToken, deleteSeason); ///
router.use(errorMiddleware); // Đảm bảo mọi lỗi đều được xử lý bởi errorMiddleware

export default router;
