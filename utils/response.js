/**
 * Standardised API response helpers
 * All responses follow: { success, message, data?, errors?, meta? }
 */

const success = (res, data = {}, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const created = (res, data = {}, message = "Created successfully") => {
  return success(res, data, message, 201);
};

const paginated = (res, data, total, page, limit, message = "Success") => {
  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  });
};

const error = (res, message = "Something went wrong", statusCode = 500, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

const notFound = (res, message = "Resource not found") => {
  return error(res, message, 404);
};

const unauthorized = (res, message = "Unauthorized") => {
  return error(res, message, 401);
};

const forbidden = (res, message = "Access denied") => {
  return error(res, message, 403);
};

const badRequest = (res, message = "Bad request", errors = null) => {
  return error(res, message, 400, errors);
};

module.exports = { success, created, paginated, error, notFound, unauthorized, forbidden, badRequest };