import { z } from "zod";

// Schema cho đăng ký
const RegisterSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Schema cho đăng nhập
const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Schema cho cập nhật mật khẩu
const UpdatePasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  oldpassword: z.string().min(1, "Old password is required"),
  newpassword: z.string().min(6, "New password must be at least 6 characters"),
});

// Schema cho cập nhật username
const UpdateUsernameSchema = z.object({
  email: z.string().email("Invalid email address"),
  Inputpassword: z.string().min(1, "Password is required"),
  newusername: z.string().min(1, "New username is required"),
});

// Schema cho xóa user
const DeleteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export {
  RegisterSchema,
  LoginSchema,
  UpdatePasswordSchema,
  UpdateUsernameSchema,
  DeleteUserSchema,
};
