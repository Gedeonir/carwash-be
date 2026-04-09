const Review = require("../models/Review");
const Booking = require("../models/Booking");
const User = require("../models/User");
const { created, notFound, badRequest, forbidden, paginated } = require("../utils/response");
const { asyncHandler } = require("../middlewares/error");


// ══════════════════════════════════════════════════════════
// REVIEW CONTROLLER
// ══════════════════════════════════════════════════════════

const createReview = asyncHandler(async (req, res) => {
  const { bookingId, rating, comment, tags = [], tip = 0 } = req.body;

  const booking = await Booking.findById(bookingId).populate("washer");
  if (!booking) return notFound(res, "Booking not found");

  if (booking.customer.toString() !== req.user._id.toString()) {
    return forbidden(res, "You can only review your own bookings");
  }
  if (booking.status !== "completed") {
    return badRequest(res, "Can only review completed bookings");
  }
  if (booking.review) {
    return badRequest(res, "You have already reviewed this booking");
  }

  const review = await Review.create({
    booking: bookingId,
    customer: req.user._id,
    washer: booking.washer._id,
    rating,
    comment,
    tags,
    tip,
  });

  // Link review to booking
  booking.review = review._id;
  if (tip > 0) booking.tip = tip;
  await booking.save();

  // Award loyalty points (10 per wash + 5 bonus for rating ≥ 4)
  const points = 10 + (rating >= 4 ? 5 : 0);
  await User.findByIdAndUpdate(req.user._id, { $inc: { loyaltyPoints: points } });

  created(res, { review }, "Review submitted. Thank you!");
});

const getReviews = asyncHandler(async (req, res) => {
  const { washerId, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;
  const filter = { isVisible: true };
  if (washerId) filter.washer = washerId;

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate("customer", "name avatar")
      .populate("washer", "name avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Review.countDocuments(filter),
  ]);

  paginated(res, reviews, total, page, limit);
});

module.exports = {
  createReview, getReviews,

};