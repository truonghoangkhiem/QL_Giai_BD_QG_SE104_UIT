import { errorResponse } from "../../../utils/responseFormat.js"; // Import các hàm định dạng phản hồi

// Xử lý các lỗi hệ thống và logic
const errorMiddleware = (err, req, res, next) => {
  console.error(err.stack); // In lỗi ra console để kiểm tra
  console.log(err.message); // In thông báo lỗi ra console để kiểm tra

  // Xử lý lỗi xác thực (ví dụ: token hết hạn hoặc không hợp lệ)
  if (err.name === 401) {
    return errorResponse(res, err.message, 401);
  }

  if (err.status === 404) {
    return errorResponse(res, err.message, 404);
  }
  // Xử lý lỗi xác thực dữ liệu (ví dụ: dữ liệu không hợp lệ từ phía người dùng)
  if (err.name === "ValidationError" || err.status === 400 || err.message) {
    return errorResponse(res, err.message, 400);
  }

  // Lỗi hệ thống chung
  return errorResponse(res, "Hệ thống đã xảy ra lỗi. Vui lòng thử lại sau.", 500);
};

export { errorMiddleware }; // Xuất trực tiếp hàm errorMiddleware
