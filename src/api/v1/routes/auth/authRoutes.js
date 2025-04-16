import express from "express";
import {
  registerUser,
  loginUser,
  updatePasswordUser,
  updateUsername,
  deleteUser,
} from "../../controllers/auth/authController.js";
import { errorMiddleware } from "../../middleware/errorMiddleware.js";

const router = express.Router();

router.post("/register", registerUser); ///
router.post("/login", loginUser); ///
router.put("/password", updatePasswordUser); ///
router.put("/username", updateUsername); ///
router.delete("/", deleteUser); ///
router.use(errorMiddleware);

export default router;
