// Định dạng phản hồi thành công
const successResponse = async (
  res,
  data,
  message = "Request successful",
  statusCode = 200
) => {
  return res.status(statusCode).json({
    status: "success",
    message: message,
    data: data,
  });
};

// Định dạng phản hồi lỗi chung
const errorResponse = async (
  res,
  message = "Something went wrong",
  statusCode = 500
) => {
  return res.status(statusCode).json({
    status: "error",
    message: message,
  });
};

// Định dạng phản hồi lỗi khi có lỗi xác thực (Validation Error)
const validationError = async (res, errors) => {
  return res.status(400).json({
    status: "error",
    message: "Validation Error",
    errors: errors,
  });
};

// Định dạng phản hồi lỗi khi không có quyền truy cập (Unauthorized)
const unauthorizedError = async (res) => {
  return res.status(401).json({
    status: "error",
    message: "Unauthorized access",
  });
};

// Export tất cả các hàm
export { successResponse, errorResponse, validationError, unauthorizedError };
