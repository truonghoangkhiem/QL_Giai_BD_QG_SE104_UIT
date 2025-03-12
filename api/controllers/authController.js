const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { GET_DB } = require("../config/db");
const { get } = require("mongoose");

// Đăng ký tài khoản
const registerUser = async (req, res) => {
  try {
    const db = GET_DB();
    if (!db) throw new Error("Database chưa kết nối!");

    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400), json({ message: "Invalid input type" });
    }

    const existingUser = await db.collection("users").findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.collection("users").insertOne({
      username,
      email,
      password: hashedPassword,
      userpassword: password,
    });

    res.status(201).json({ message: "Created user successfully" });
  } catch (error) {
    console.error("❌ [DEBUG] Lỗi trong registerUser:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
// Đăng nhập tài khoản
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const db = GET_DB();
    const user = await db.collection("users").findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ message: "Email or password is incorrect" });
    }

    const token = jwt.sign(
      { user_id: user._id, email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error });
  }
};
// Sua mat khau
const updatePasswordUser = async (req, res) => {
  const { email, oldpassword, newpassword } = req.body;
  if (!email || !oldpassword || !newpassword) {
    return res.status(400).json({ message: "All fields are required" });
  }
  if (
    typeof email !== "string" ||
    typeof oldpassword !== "string" ||
    typeof newpassword !== "string"
  ) {
    return res.status(400).json({ message: "Invalid input type" });
  }
  try {
    const db = GET_DB();
    const Existuser = await db.collection("users").findOne({ email });
    if (!Existuser) {
      return res.status(404).json({ message: "Email not correct" });
    }
    if (!(await bcrypt.compare(oldpassword, Existuser.password))) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }
    const hashedPassword = await bcrypt.hash(newpassword, 10);
    await db
      .collection("users")
      .findOneAndUpdate(
        { email },
        { $set: { password: hashedPassword, userpassword: newpassword } }
      );
    res.status(200).json({ message: "Update password successfully" });
  } catch (error) {
    res.status(500).json({ message: "Update password failed", error });
  }
};
const updateUsername = async (req, res) => {
  const { email, Inputpassword, newusername } = req.body;
  if (!email || !Inputpassword || !newusername) {
    return res.status(400).json({ message: "All fields are required" });
  }
  if (
    typeof email !== "string" ||
    typeof Inputpassword !== "string" ||
    typeof newusername !== "string"
  ) {
    return res.status(400).json({ message: "Invalid input type" });
  }
  try {
    const db = GET_DB();
    const Existuser = await db.collection("users").findOne({ email });
    if (!Existuser) {
      return res.status(404).json({ message: "User not correct" });
    }
    if (!(await bcrypt.compare(Inputpassword, Existuser.password))) {
      return res.status(401).json({ message: "Password is incorrect" });
    }
    await db
      .collection("users")
      .findOneAndUpdate({ email }, { $set: { username: newusername } });
    res.status(200).json({ message: "Update Username successfully" });
  } catch (error) {
    res.status(500).json({ message: "Update Username failed", error });
  }
};
//Xoa user
const deleteUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Invalid input type" });
  }
  try {
    const db = GET_DB();
    const Existuser = await db.collection("users").findOne({ email });
    if (!Existuser) {
      return res.status(404).json({ message: "Email not correct" });
    }
    if (!(await bcrypt.compare(password, Existuser.password))) {
      return res.status(401).json({ message: "Password is incorrect" });
    }
    const result = await db.collection("users").findOneAndDelete({ email });
    res.status(200).json({ message: "Delete user successfully" });
  } catch (error) {
    res.status(500).json({ message: "Delete user failed", error });
  }
};

module.exports = {
  registerUser,
  loginUser,
  updatePasswordUser,
  updateUsername,
  deleteUser,
};
