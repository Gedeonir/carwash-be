const User = require("../models/User");
const { success, notFound, paginated } = require("../utils/response");
const { asyncHandler } = require("../middlewares/error");

// ══════════════════════════════════════════════════════════
// USER CONTROLLER (admin)
// ══════════════════════════════════════════════════════════

const getUsers = asyncHandler(async (req, res) => {
  const { role, page = 1, limit = 20, search } = req.query;
  const skip = (page - 1) * limit;
  const filter = {};
  if (role) filter.role = role;
  if (search) filter.$or = [
    { name: { $regex: search, $options: "i" } },
    { email: { $regex: search, $options: "i" } },
  ];

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  paginated(res, users, total, page, limit);
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return notFound(res, "User not found");
  success(res, { user });
});

const updateUser = asyncHandler(async (req, res) => {
  const allowed = ["name", "email", "phone", "role", "isActive", "zone", "isAvailable"];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!user) return notFound(res, "User not found");
  success(res, { user }, "User updated");
});

const getWashers = asyncHandler(async (req, res) => {
  const { zone, available } = req.query;
  const filter = { role: "washer", isActive: true };
  if (zone) filter.zone = zone;
  if (available !== undefined) filter.isAvailable = available === "true";

  const washers = await User.find(filter).sort({ rating: -1 });
  success(res, { washers });
});

module.exports = {
  getUsers, getUser, updateUser, getWashers,
};