const express = require("express");
const {
  registerUser,
  loginUser,
  updatePasswordUser,
  updateUsername,
  deleteUser,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.put("/password", updatePasswordUser);
router.put("/username", updateUsername);
router.delete("/", deleteUser);

module.exports = router;
