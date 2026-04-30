const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [80, "Name cannot exceed 80 characters"],
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    phone: {
      type: String,
      trim: true,
    },
    ID: {
      type: Number,
      maxlength: [16, "ID number cannot exceed 80 characters"],
    },
    
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // never return password in queries
    },
    role: {
      type: String,
      enum: ["customer", "washer", "admin"],
      default: "customer",
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
      default: null,
    },
    // Customer-specific
    savedLocations: [
      {
        label: { type: String }, // "Home", "Work", custom
        address: { type: String },
        coordinates: {
          lat: { type: Number },
          lng: { type: Number },
        },
      },
    ],
    savedCars: [
      {
        plate: { type: String },
        model: { type: String },
        color: { type: String },
        year: { type: String },
      },
    ],
    loyaltyPoints: {
      type: Number,
      default: 0,
    },
    loyaltyTier: {
      type: String,
      enum: ["bronze", "silver", "gold", "platinum"],
      default: "bronze",
    },
    // Washer-specific
    zone: {
      address: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    isAvailable: { type: Boolean, default: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    // Auth
    refreshToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },

    // Notification preferences
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: false },
      promos: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ── Indexes ───────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ zone: 1, isAvailable: 1 });

// ── Virtuals ──────────────────────────────────────────────
userSchema.virtual("initials").get(function () {
  return this.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
});

// ── Pre-save: hash password ───────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Pre-save: update loyalty tier ────────────────────────
userSchema.pre("save", function (next) {
  if (this.loyaltyPoints >= 500) this.loyaltyTier = "platinum";
  else if (this.loyaltyPoints >= 200) this.loyaltyTier = "gold";
  else if (this.loyaltyPoints >= 70) this.loyaltyTier = "silver";
  else this.loyaltyTier = "bronze";
  next();
});

// ── Instance methods ──────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.updateRating = function (newRating) {
  const total = this.rating * this.totalReviews + newRating;
  this.totalReviews += 1;
  this.rating = Math.round((total / this.totalReviews) * 10) / 10;
};

module.exports = mongoose.model("User", userSchema);
