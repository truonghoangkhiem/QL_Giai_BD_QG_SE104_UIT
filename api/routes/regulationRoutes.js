const express = require("express");
const {
  getRegulations,
  getRegulationById,
  createRegulation,
  updateRegulation,
  deleteRegulation,
  getIdRegulations,
} = require("../controllers/regulationController");

const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getRegulations);
router.get("/:id", getRegulationById);
router.get("/id", getIdRegulations);
router.post("/", authenticateToken, createRegulation);
router.put("/:id", authenticateToken, updateRegulation);
router.delete("/:id", authenticateToken, deleteRegulation);

module.exports = router;
