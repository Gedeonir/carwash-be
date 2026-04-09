const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingRef: {
      type: String,
      unique: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    washer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    addOns: [
      {
        name: { type: String },
        price: { type: Number },
      },
    ],

    // Scheduling
    scheduledDate: {
      type: Date,
      required: [true, "Scheduled date is required"],
    },
    scheduledTime: {
      type: String, // "10:00"
      required: true,
    },

    // Location
    location: {
      label: { type: String },
      address: { type: String, required: true },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
      accessNotes: { type: String },
    },

    // Pricing
    servicePrice: { type: Number, required: true },
    addOnsTotal: { type: Number, default: 0 },
    tip: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // Payment
    paymentMethod: {
      type: String,
      enum: ["momo", "airtel", "card", "cash"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "failed"],
      default: "pending",
    },
    paymentRef: { type: String },

    // Status lifecycle
    status: {
      type: String,
      enum: [
        "confirmed",   // booked, not yet assigned
        "assigned",    // washer assigned
        "heading",     // washer en route
        "arrived",     // washer at location
        "in-progress", // wash happening
        "completed",   // done
        "cancelled",   // cancelled
        "no-show",     // washer or customer no-show
      ],
      default: "confirmed",
    },

    // Tracking timestamps
    timeline: {
      confirmedAt:   { type: Date },
      assignedAt:    { type: Date },
      headingAt:     { type: Date },
      arrivedAt:     { type: Date },
      startedAt:     { type: Date },
      completedAt:   { type: Date },
      cancelledAt:   { type: Date },
    },

    // Guest info (for non-registered users)
    guestName:  { type: String },
    guestPhone: { type: String },
    isGuest:    { type: Boolean, default: false },

    // Review
    review: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
      default: null,
    },

    // Admin notes
    adminNotes: { type: String },

    // Cancellation
    cancellationReason: { type: String },
    cancelledBy: {
      type: String,
      enum: ["customer", "washer", "admin"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────
bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ washer: 1, scheduledDate: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ scheduledDate: 1 });
bookingSchema.index({ bookingRef: 1 });

// ── Auto-generate booking reference ──────────────────────
bookingSchema.pre("save", function (next) {
  if (!this.bookingRef) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.bookingRef = `IK-${timestamp}-${random}`;
  }
  // Set confirmedAt on creation
  if (this.isNew) {
    this.timeline.confirmedAt = new Date();
  }
  next();
});

// ── Virtual: duration ─────────────────────────────────────
bookingSchema.virtual("durationMinutes").get(function () {
  if (this.timeline.startedAt && this.timeline.completedAt) {
    return Math.round(
      (this.timeline.completedAt - this.timeline.startedAt) / 60000
    );
  }
  return null;
});

module.exports = mongoose.model("Booking", bookingSchema);