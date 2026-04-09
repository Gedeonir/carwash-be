const { error } = require("../utils/response");

/**
 * Global async error handler — wrap async route handlers with asyncHandler()
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 handler — mount after all routes
 */
const notFound = (req, res) => {
  error(res, `Route ${req.originalUrl} not found`, 404);
};

/**
 * Global error handler — mount last
 */
const globalErrorHandler = (err, req, res, next) => {
  console.error(`❌ [${new Date().toISOString()}] ${err.name}: ${err.message}`);

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return error(res, `${field} already exists`, 400);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return error(res, "Validation failed", 400, messages);
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    return error(res, `Invalid ${err.path}: ${err.value}`, 400);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return error(res, "Invalid token", 401);
  }
  if (err.name === "TokenExpiredError") {
    return error(res, "Token expired", 401);
  }

  // Multer file size
  if (err.code === "LIMIT_FILE_SIZE") {
    return error(res, "File too large. Max 5MB allowed.", 400);
  }

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === "production"
    ? "Something went wrong"
    : err.message;

  error(res, message, statusCode);
};

module.exports = { asyncHandler, notFound, globalErrorHandler };