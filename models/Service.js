const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    durationMinutes: {
      type: Number,
      required: true,
    },
    icon: {
      type: String,
      default: "💧",
    },
    tag: {
      type: String, // "Popular", "Best Value", etc.
      default: null,
    },
    includes: [{ type: String }],
    excludes: [{ type: String }],
    addOns: [
      {
        name: { type: String },
        price: { type: Number },
        icon: { type: String },
        description: { type: String },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Auto-generate slug from name
serviceSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, "-");
  }
  next();
});

module.exports = mongoose.model("Service", serviceSchema);