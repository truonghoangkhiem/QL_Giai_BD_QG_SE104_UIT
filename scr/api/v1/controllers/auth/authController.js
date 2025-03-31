const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { GET_DB } = require("../../../config/db");
const { successResponse } = require("../../../../utils/responseFormat");

// Đăng ký tài khoản
const registerUser = async (req, res, next) => {
  const { username, email, password } = req.body;
  try {
    const db = GET_DB();
    if (!db) throw new Error("Database chưa kết nối!");

    // Kiểm tra dữ liệu đầu vào
    if (!username || !email || !password) {
      const error = new Error("All fields are required");
      error.status = 400;
      return next(error); // Ném lỗi cho middleware xử lý
    }

    // Kiểm tra kiểu dữ liệu
    if (
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      const error = new Error("Invalid input type");
      error.status = 400;
      return next(error); // Ném lỗi cho middleware xử lý
    }

    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      const error = new Error("Email already exists");
      error.status = 400;
      return next(error); // Ném lỗi cho middleware xử lý
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Thêm người dùng mới vào DB
    const result = await db.collection("users").insertOne({
      username,
      email,
      password: hashedPassword, // Lưu mật khẩu đã mã hóa
    });

    return successResponse(
      res,
      { userId: result.insertedId },
      "Created user successfully",
      201
    );
  } catch (error) {
    console.error("❌ [DEBUG] Lỗi trong registerUser:", error);
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

// Đăng nhập tài khoản
const loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const db = GET_DB();
    const user = await db.collection("users").findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      const error = new Error("Email or password is incorrect");
      error.status = 401;
      return next(error); // Ném lỗi cho middleware xử lý
    }

    // Tạo token JWT
    const token = jwt.sign(
      { user_id: user._id, email },
      process.env.JWT_SECRET,
      { expiresIn: "5h" }
    );

    return successResponse(res, { token }, "Login successful");
  } catch (error) {
    console.error("❌ [DEBUG] Lỗi trong loginUser:", error);
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

// Cập nhật mật khẩu
const updatePasswordUser = async (req, res, next) => {
  const { email, oldpassword, newpassword } = req.body;
  if (!email || !oldpassword || !newpassword) {
    const error = new Error("All fields are required");
    error.status = 400;
    return next(error); // Ném lỗi cho middleware xử lý
  }
  try {
    const db = GET_DB();
    const Existuser = await db.collection("users").findOne({ email });
    if (!Existuser) {
      const error = new Error("Email not correct");
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    if (!(await bcrypt.compare(oldpassword, Existuser.password))) {
      const error = new Error("Old password is incorrect");
      error.status = 401;
      return next(error); // Ném lỗi cho middleware xử lý
    }

    const hashedPassword = await bcrypt.hash(newpassword, 10);
    await db
      .collection("users")
      .findOneAndUpdate(
        { email },
        { $set: { password: hashedPassword, userpassword: newpassword } }
      );

    return successResponse(res, null, "Update password successfully");
  } catch (error) {
    console.error("❌ [DEBUG] Lỗi trong updatePasswordUser:", error);
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

// Cập nhật tên người dùng
const updateUsername = async (req, res, next) => {
  const { email, Inputpassword, newusername } = req.body;
  if (!email || !Inputpassword || !newusername) {
    const error = new Error("All fields are required");
    error.status = 400;
    return next(error); // Ném lỗi cho middleware xử lý
  }
  try {
    const db = GET_DB();
    const Existuser = await db.collection("users").findOne({ email });
    if (!Existuser) {
      const error = new Error("User not correct");
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    if (!(await bcrypt.compare(Inputpassword, Existuser.password))) {
      const error = new Error("Password is incorrect");
      error.status = 401;
      return next(error); // Ném lỗi cho middleware xử lý
    }

    await db
      .collection("users")
      .findOneAndUpdate({ email }, { $set: { username: newusername } });

    return successResponse(res, null, "Update Username successfully");
  } catch (error) {
    console.error("❌ [DEBUG] Lỗi trong updateUsername:", error);
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

// Xóa người dùng
const deleteUser = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    const error = new Error("All fields are required");
    error.status = 400;
    return next(error); // Ném lỗi cho middleware xử lý
  }
  try {
    const db = GET_DB();
    const Existuser = await db.collection("users").findOne({ email });
    if (!Existuser) {
      const error = new Error("Email not correct");
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    if (!(await bcrypt.compare(password, Existuser.password))) {
      const error = new Error("Password is incorrect");
      error.status = 401;
      return next(error); // Ném lỗi cho middleware xử lý
    }

    await db.collection("users").findOneAndDelete({ email });

    return successResponse(res, null, "Delete user successfully");
  } catch (error) {
    console.error("❌ [DEBUG] Lỗi trong deleteUser:", error);
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

module.exports = {
  registerUser,
  loginUser,
  updatePasswordUser,
  updateUsername,
  deleteUser,
};
