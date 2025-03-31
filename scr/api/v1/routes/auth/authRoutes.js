const express = require("express");
const {
  registerUser,
  loginUser,
  updatePasswordUser,
  updateUsername,
  deleteUser,
} = require("../../controllers/auth/authController");
const { errorMiddleware } = require("../../middleware/errorMiddleware");

const router = express.Router();

router.post("/register", registerUser); //
router.post("/login", loginUser); //
router.put("/password", updatePasswordUser); //
router.put("/username", updateUsername); //
router.delete("/", deleteUser); //
router.use(errorMiddleware); // Đảm bảo mọi lỗi đều được xử lý bởi errorMiddleware

module.exports = router;
