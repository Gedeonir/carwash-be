const express = require("express");
const {
  register, login, guestLogin, refreshToken, logout,
  getMe, updateMe, changePassword, forgotPassword, resetPassword,
} = require("../controllers/authController");
const {
  createBooking, getBookings, getBooking, updateStatus,
  assignWasher, getAllBookingsAdmin, getStats,
} = require("../controllers/bookingController");

const {
  createReview, getReviews,
} = require("../controllers/reviewController");

const {
  getUsers, getUser, updateUser, getWashers,
} = require("../controllers/userController");

const {
  getNotifications, markNotificationRead,
} = require("../controllers/notificationsController");
const {
  getServices, getService, createService, updateService, deleteService,
} = require("../controllers/serviceController");

const { protect, authorize } = require("../middlewares/auth");
const {
  validate, registerRules, loginRules, bookingRules,
  reviewRules, serviceRules, paginationRules,
} = require("../middlewares/validate");

const router = express.Router();

// ══════════════════════════════════════════════════════════
// AUTH  /api/auth
// ══════════════════════════════════════════════════════════
const auth = express.Router();
auth.post("/register",         registerRules, validate, register);
auth.post("/login",            loginRules,    validate, login);
auth.post("/guest",            guestLogin);
auth.post("/refresh",          refreshToken);
auth.post("/logout",           logout);
auth.get ("/me",               protect, getMe);
auth.put ("/me",               protect, updateMe);
auth.put ("/change-password",  protect, changePassword);
auth.post("/forgot-password",  forgotPassword);
auth.post("/reset-password/:token", resetPassword);

// ══════════════════════════════════════════════════════════
// SERVICES  /api/services
// ══════════════════════════════════════════════════════════
const services = express.Router();
services.get  ("/",    getServices);
services.get  ("/:id", getService);
services.post ("/",    protect, authorize("admin"), serviceRules, validate, createService);
services.put  ("/:id", protect, authorize("admin"), updateService);
services.delete("/:id",protect, authorize("admin"), deleteService);

// ══════════════════════════════════════════════════════════
// BOOKINGS  /api/bookings
// ══════════════════════════════════════════════════════════
const bookings = express.Router();
bookings.post("/",                  protect, bookingRules, validate, createBooking);
bookings.get ("/",                  protect, paginationRules, validate, getBookings);
bookings.get ("/stats",             protect, authorize("admin"), getStats);
bookings.get ("/admin/all",         protect, authorize("admin"), paginationRules, validate, getAllBookingsAdmin);
bookings.get ("/:id",               protect, getBooking);
bookings.patch("/:id/status",       protect, updateStatus);
bookings.patch("/:id/assign",       protect, authorize("admin"), assignWasher);

// ══════════════════════════════════════════════════════════
// REVIEWS  /api/reviews
// ══════════════════════════════════════════════════════════
const reviews = express.Router();
reviews.get ("/",    paginationRules, validate, getReviews);
reviews.post("/",    protect, reviewRules, validate, createReview);

// ══════════════════════════════════════════════════════════
// USERS  /api/users  (admin only)
// ══════════════════════════════════════════════════════════
const users = express.Router();
users.get    ("/",           protect, authorize("admin"), paginationRules, validate, getUsers);
users.get    ("/washers",    getWashers);
users.get    ("/:id",        protect, authorize("admin"), getUser);
users.put    ("/:id",        protect, authorize("admin"), updateUser);

// ══════════════════════════════════════════════════════════
// NOTIFICATIONS  /api/notifications
// ══════════════════════════════════════════════════════════
const notifications = express.Router();
notifications.get  ("/",     protect, getNotifications);
notifications.patch("/:id",  protect, markNotificationRead); // id = "all" or a specific ID

// ══════════════════════════════════════════════════════════
// Mount all routers
// ══════════════════════════════════════════════════════════
router.use("/auth",          auth);
router.use("/services",      services);
router.use("/bookings",      bookings);
router.use("/reviews",       reviews);
router.use("/users",         users);
router.use("/notifications", notifications);

module.exports = router;