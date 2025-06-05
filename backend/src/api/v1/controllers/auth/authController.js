import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../../../../models/User.js"; // Import model User
import {
  RegisterSchema,
  LoginSchema,
  UpdatePasswordSchema,
  UpdateUsernameSchema,
  DeleteUserSchema,
} from "../../../../schemas/userSchema.js"; // Import schemas
import { successResponse } from "../../../../utils/responseFormat.js";

// Đăng ký tài khoản
const registerUser = async (req, res, next) => {
  const { username, email, password } = req.body;
  try {
    // Validate schema với Zod
    const { success, error } = RegisterSchema.safeParse({
      username,
      email,
      password,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error("Email này đã được sử dụng. Vui lòng sử dụng email khác.");
      error.status = 400;
      return next(error);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      email,
      password: hashedPassword,
      userpassword: password,
    });

    const savedUser = await user.save();

    return successResponse(
      res,
      { userId: savedUser._id },
      "Created user successfully",
      201
    );
  } catch (error) {
    console.error("❌ [DEBUG] Lỗi trong registerUser:", error);
    return next(error);
  }
};

// Đăng nhập tài khoản
const loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    // Validate schema với Zod
    const { success, error } = LoginSchema.safeParse({ email, password });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      const error = new Error("Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.");
      error.status = 401;
      return next(error);
    }

    const token = jwt.sign(
      { user_id: user._id, email },
      process.env.JWT_SECRET,
      { expiresIn: "5h" }
    );

    return successResponse(res, { token }, "Login successful");
  } catch (error) {
    console.error("❌ [DEBUG] Lỗi trong loginUser:", error);
    return next(error);
  }
};

// Cập nhật mật khẩu
const updatePasswordUser = async (req, res, next) => {
  const { email, oldpassword, newpassword } = req.body;
  try {
    // Validate schema với Zod
    const { success, error } = UpdatePasswordSchema.safeParse({
      email,
      oldpassword,
      newpassword,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("Không tìm thấy tài khoản với email này.");
      error.status = 404;
      return next(error);
    }
    if (!(await bcrypt.compare(oldpassword, user.password))) {
      const error = new Error("Mật khẩu cũ không chính xác.");
      error.status = 401;
      return next(error);
    }

    const hashedPassword = await bcrypt.hash(newpassword, 10);
    user.password = hashedPassword;
    await user.save();

    return successResponse(res, null, "Update password successfully");
  } catch (error) {
    console.error("❌ [DEBUG] Lỗi trong updatePasswordUser:", error);
    return next(error);
  }
};

// Cập nhật tên người dùng
const updateUsername = async (req, res, next) => {
  const { email, Inputpassword, newusername } = req.body;
  try {
    // Validate schema với Zod
    const { success, error } = UpdateUsernameSchema.safeParse({
      email,
      Inputpassword,
      newusername,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("Không tìm thấy tài khoản với email này.");
      error.status = 404;
      return next(error);
    }
    if (!(await bcrypt.compare(Inputpassword, user.password))) {
      const error = new Error("Mật khẩu không chính xác.");
      error.status = 401;
      return next(error);
    }

    user.username = newusername;
    await user.save();

    return successResponse(res, null, "Update Username successfully");
  } catch (error) {
    console.error("❌ [DEBUG] Lỗi trong updateUsername:", error);
    return next(error);
  }
};

// Xóa người dùng
const deleteUser = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    // Validate schema với Zod
    const { success, error } = DeleteUserSchema.safeParse({ email, password });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("Không tìm thấy tài khoản với email này.");
      error.status = 404;
      return next(error);
    }
    if (!(await bcrypt.compare(password, user.password))) {
      const error = new Error("Mật khẩu không chính xác.");
      error.status = 401;
      return next(error);
    }

    await User.deleteOne({ email });

    return successResponse(res, null, "Delete user successfully");
  } catch (error) {
    console.error("❌ [DEBUG] Lỗi trong deleteUser:", error);
    return next(error);
  }
};

export {
  registerUser,
  loginUser,
  updatePasswordUser,
  updateUsername,
  deleteUser,
};
