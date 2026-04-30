const { body, param, query, validationResult } = require("express-validator");
const { badRequest } = require("../utils/response");

// Run validation result check
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {    
    return badRequest(res, "Validation failed", errors.array().map((e) => e.msg));
  }
  next();
};

// ── Auth validators ───────────────────────────────────────
const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 80 }),
  body("email").optional().isEmail().withMessage("Invalid email format").normalizeEmail(),
  body("password").optional().isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("phone").optional().trim().notEmpty().withMessage("Phone is required"),
  body("isGuest").optional().isBoolean(),
];

const loginRules = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

// ── Booking validators ────────────────────────────────────
const bookingRules = [
  body("service").notEmpty().withMessage("Service ID is required").isMongoId().withMessage("Invalid service ID"),
  body("scheduledDate").notEmpty().withMessage("Date is required").isISO8601().withMessage("Invalid date format"),
  body("scheduledTime").notEmpty().withMessage("Time is required").matches(/^\d{2}:\d{2}$/).withMessage("Time must be HH:MM format"),
  body("location.address").notEmpty().withMessage("Location address is required"),
  body("paymentMethod").isIn(["momo", "airtel", "card", "cash"]).withMessage("Invalid payment method"),
  body("addOns").optional().isArray(),
  body("tip").optional().isNumeric().withMessage("Tip must be a number"),
];

// ── Review validators ─────────────────────────────────────
const reviewRules = [
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("comment").optional().isLength({ max: 500 }).withMessage("Comment cannot exceed 500 characters"),
  body("tip").optional().isNumeric(),
  body("tags").optional().isArray(),
];

// ── Service validators ────────────────────────────────────
const serviceRules = [
  body("name").trim().notEmpty().withMessage("Service name is required"),
  body("price").isNumeric({ min: 0 }).withMessage("Valid price is required"),
  body("durationMinutes").isNumeric({ min: 1 }).withMessage("Valid duration is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
];

// ── Pagination query ──────────────────────────────────────
const paginationRules = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  bookingRules,
  reviewRules,
  serviceRules,
  paginationRules,
};