const { verifyAccessToken } = require("../utils/jwt");
const { unauthorized, forbidden } = require("../utils/response");
const User = require("../models/User");

/**
 * protect — verifies JWT, attaches req.user
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return unauthorized(res, "No token provided. Please sign in.");
    }

    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id).select("-password -refreshToken");
    if (!user) {
      return unauthorized(res, "User no longer exists.");
    }
    if (!user.isActive) {
      return unauthorized(res, "Account is deactivated.");
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return unauthorized(res, "Token expired. Please sign in again.");
    }
    return unauthorized(res, "Invalid token.");
  }
};

/**
 * authorize(...roles) — restricts access to specific roles
 * Usage: router.get("/", protect, authorize("admin"), handler)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return forbidden(res, `Role '${req.user.role}' is not authorized for this action.`);
    }
    next();
  };
};

/**
 * optionalAuth — attaches user if token present, but doesn't block if not
 * Used for guest-friendly endpoints
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id);
      if (user && user.isActive) req.user = user;
    }
  } catch (_) {
    // silent — guest continues without auth
  }
  next();
};

module.exports = { protect, authorize, optionalAuth };