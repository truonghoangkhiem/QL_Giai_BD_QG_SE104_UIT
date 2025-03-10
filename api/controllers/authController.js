const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { GET_DB } = require("../config/db");

const registerUser = async (req, res) => {
  try {
    console.log("📌 [DEBUG] Nhận request đăng ký:", req.body);

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
    });

    res.status(201).json({ message: "Created user successfully" });
  } catch (error) {
    console.error("❌ [DEBUG] Lỗi trong registerUser:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const db = getDB();
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

module.exports = { registerUser, loginUser };
