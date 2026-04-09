const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true, // one review per booking
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    washer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },
    tags: [{ type: String }], // "On time", "Friendly", "Very clean", etc.
    comment: {
      type: String,
      maxlength: [500, "Comment cannot exceed 500 characters"],
      trim: true,
    },
    tip: {
      type: Number,
      default: 0,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ washer: 1 });
reviewSchema.index({ booking: 1 });

// After saving a review, update the washer's average rating
reviewSchema.post("save", async function () {
  const User = mongoose.model("User");
  const washer = await User.findById(this.washer);
  if (washer) {
    washer.updateRating(this.rating);
    await washer.save();
  }
});

module.exports = mongoose.model("Review", reviewSchema);