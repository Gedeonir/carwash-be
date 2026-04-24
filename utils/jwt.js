const jwt = require("jsonwebtoken");

/**
 * Generate an access token (short-lived)
 */
const generateAccessToken = (userId, role,isGuest) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: isGuest?"30m":process.env.JWT_EXPIRES_IN || "7d" }
  );
};

/**
 * Generate a refresh token (long-lived)
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d" }
  );
};

/**
 * Verify an access token — returns decoded payload or throws
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Verify a refresh token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

/**
 * Send both tokens as response with httpOnly cookie for refresh
 */
const sendTokenResponse = (user, statusCode, res) => {
  const accessToken = generateAccessToken(user._id, user.role,user.isGuest);

 if (!user.isGuest) {
    const refreshToken = generateRefreshToken(user._id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isGuest: user.isGuest,
    avatar: user.avatar,
    loyaltyTier: user.loyaltyTier,
    loyaltyPoints: user.loyaltyPoints,
  };

  res.status(statusCode).json({
    success: true,
    token: accessToken,
    user: userData,
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  sendTokenResponse,
};