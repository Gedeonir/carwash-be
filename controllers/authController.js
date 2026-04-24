const crypto = require("crypto");
const User = require("../models/User");
const { sendTokenResponse, verifyRefreshToken, generateAccessToken } = require("../utils/jwt");
const { success, created, unauthorized, badRequest, notFound } = require("../utils/response");
const { sendEmail, passwordResetEmail } = require("../utils/email");
const { asyncHandler } = require("../middlewares/error");

// ── POST /api/auth/register ───────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return badRequest(res, "Email is already registered");
  }

  const user = await User.create({ name, email, password, phone, role: "customer" });
  sendTokenResponse(user, 201, res);
});

// ── POST /api/auth/login ──────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, isGuest: false }).select("+password");
  if (!user || !user.password) {
    return unauthorized(res, "Invalid email or password");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return unauthorized(res, "Invalid email or password");
  }

  if (!user.isActive) {
    return unauthorized(res, "Account is deactivated. Contact support.");
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res);
});

// ── POST /api/auth/guest ──────────────────────────────────
// Creates a temporary guest user for booking without full registration
const guestLogin = asyncHandler(async (req, res) => {
  const { name, phone,email } = req.body;  

  if (!name || !phone || !email) {
    return badRequest(res, "Name, Email and phone are required for guest access");
  }

  const existingGuest = await User.findOne({ email, isGuest: true });
  if (existingGuest) {
    return sendTokenResponse(existingGuest, 200, res);
  }

  const guest = await User.create({
    name,
    email,
    phone,
    isGuest: true,
    role: "customer",
  });

  sendTokenResponse(guest, 201, res);
});

// ── POST /api/auth/refresh ────────────────────────────────
const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return unauthorized(res, "No refresh token");

  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded.id);

  if (!user || !user.isActive) {
    return unauthorized(res, "Invalid refresh token");
  }

  const accessToken = generateAccessToken(user._id, user.role);
  success(res, { token: accessToken }, "Token refreshed");
});

// ── POST /api/auth/logout ─────────────────────────────────
const logout = asyncHandler(async (req, res) => {
  res.cookie("refreshToken", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  success(res, {}, "Logged out successfully");
});

// ── GET /api/auth/me ──────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  success(res, { user }, "User profile fetched");
});

// ── PUT /api/auth/me ──────────────────────────────────────
const updateMe = asyncHandler(async (req, res) => {
  const allowed = ["name", "phone", "avatar", "savedLocations", "savedCars", "notifications"];
  const updates = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  success(res, { user }, "Profile updated");
});

// ── PUT /api/auth/change-password ─────────────────────────
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return badRequest(res, "Both current and new password are required");
  }

  const user = await User.findById(req.user._id).select("+password");
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) return badRequest(res, "Current password is incorrect");

  user.password = newPassword;
  await user.save();

  success(res, {}, "Password updated successfully");
});

// ── POST /api/auth/forgot-password ───────────────────────
const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  // Always return 200 to prevent email enumeration
  if (!user) return success(res, {}, "If that email exists, a reset link was sent");

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 min
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  await sendEmail(passwordResetEmail(user, resetUrl));

  success(res, {}, "If that email exists, a reset link was sent");
});

// ── POST /api/auth/reset-password/:token ─────────────────
const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select("+password");

  if (!user) return badRequest(res, "Reset token is invalid or has expired");

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  sendTokenResponse(user, 200, res);
});

module.exports = {
  register,
  login,
  guestLogin,
  refreshToken,
  logout,
  getMe,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
};