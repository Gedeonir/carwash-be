const Booking = require("../models/Booking");
const Service = require("../models/Service");
const Notification = require("../models/Notification");
const { success, created, notFound, badRequest, paginated, forbidden } = require("../utils/response");
const { asyncHandler } = require("../middlewares/error");
const { sendEmail, bookingConfirmedEmail, washerAssignedEmail } = require("../utils/email");

// Valid status transitions (what can follow what)
const STATUS_TRANSITIONS = {
  confirmed:    ["assigned", "cancelled"],
  assigned:     ["heading", "cancelled"],
  heading:      ["arrived", "cancelled"],
  arrived:      ["in-progress"],
  "in-progress":["completed", "no-show"],
  completed:    [],
  cancelled:    [],
  "no-show":    [],
};

// ── POST /api/bookings ────────────────────────────────────
const createBooking = asyncHandler(async (req, res) => {
  const {
    service: serviceId,
    addOns = [],
    scheduledDate,
    scheduledTime,
    location,
    paymentMethod,
    tip = 0,
  } = req.body;

  const service = await Service.findById(serviceId);
  if (!service || !service.isActive) {
    return notFound(res, "Service not found or unavailable");
  }

  // Calculate add-ons total
  const addOnsTotal = addOns.reduce((sum, a) => sum + (a.price || 0), 0);
  const totalAmount = service.price + addOnsTotal + Number(tip);

  const bookingData = {
    service: service._id,
    servicePrice: service.price,
    addOns,
    addOnsTotal,
    tip,
    totalAmount,
    scheduledDate: new Date(scheduledDate),
    scheduledTime,
    location,
    paymentMethod,
    customer: req.user._id,
    isGuest: req.user.isGuest,
  };

  // if (req.user.isGuest) {
  //   bookingData.guestName = guestName || req.user.name;
  //   bookingData.guestPhone = guestPhone || req.user.phone;
  // }

  const booking = await Booking.create(bookingData);
  await booking.populate(["service", "customer"]);

  // Send confirmation email
  if (!req.user.isGuest && req.user.email) {
    await sendEmail(bookingConfirmedEmail(booking, req.user));
  }

  // Create in-app notification
  await Notification.create({
    user: req.user._id,
    type: "booking",
    title: "Booking confirmed!",
    body: `Your ${service.name} is confirmed for ${scheduledTime} on ${new Date(scheduledDate).toDateString()}.`,
    icon: "✅",
    refModel: "Booking",
    refId: booking._id,
  });

  created(res, { booking }, "Booking created successfully");
});

// ── GET /api/bookings ─────────────────────────────────────
// Customer sees own bookings; admin sees all
const getBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.user.role === "customer") filter.customer = req.user._id;
  if (req.user.role === "washer")   filter.washer = req.user._id;
  if (status) filter.status = status;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("service", "name price durationMinutes icon")
      .populate("washer", "name rating avatar phone")
      .populate("customer", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Booking.countDocuments(filter),
  ]);

  paginated(res, bookings, total, page, limit);
});

// ── GET /api/bookings/:id ─────────────────────────────────
const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("service")
    .populate("washer", "name rating avatar phone zone")
    .populate("customer", "name email phone")
    .populate("review");

  if (!booking) return notFound(res, "Booking not found");

  // Customers can only see their own bookings
  if (
    req.user.role === "customer" &&
    booking.customer._id.toString() !== req.user._id.toString()
  ) {
    return forbidden(res, "Access denied");
  }

  success(res, { booking });
});

// ── PATCH /api/bookings/:id/status ───────────────────────
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const booking = await Booking.findById(req.params.id).populate("customer washer service");

  if (!booking) return notFound(res, "Booking not found");

  const allowed = STATUS_TRANSITIONS[booking.status] || [];
  if (!allowed.includes(status)) {
    return badRequest(res, `Cannot transition from '${booking.status}' to '${status}'`);
  }

  // Role-based transition rules
  if (status === "cancelled" && req.user.role === "customer") {
    const hoursDiff = (new Date(booking.scheduledDate) - new Date()) / 3600000;
    if (hoursDiff < 2) {
      return badRequest(res, "Cancellations must be made at least 2 hours before the booking");
    }
    booking.cancellationReason = req.body.reason;
    booking.cancelledBy = "customer";
  }

  if (["heading", "arrived", "in-progress", "completed"].includes(status)) {
    if (req.user.role !== "washer" && req.user.role !== "admin") {
      return forbidden(res, "Only washers can update this status");
    }
  }

  // Update status & timeline
  booking.status = status;
  const timelineMap = {
    assigned:      "assignedAt",
    heading:       "headingAt",
    arrived:       "arrivedAt",
    "in-progress": "startedAt",
    completed:     "completedAt",
    cancelled:     "cancelledAt",
  };
  if (timelineMap[status]) booking.timeline[timelineMap[status]] = new Date();

  await booking.save();

  // Notify customer of key transitions
  const notifMap = {
    assigned:      { title: "Washer assigned!", body: `${booking.washer?.name} will wash your car.`, icon: "👤" },
    heading:       { title: "Washer on the way!", body: `${booking.washer?.name} is heading to you.`, icon: "🚗" },
    arrived:       { title: "Washer has arrived!", body: "Your wash is about to begin.", icon: "📍" },
    "in-progress": { title: "Wash in progress", body: "Your car is being cleaned. Sit back!", icon: "💧" },
    completed:     { title: "Wash complete! ✨", body: "Your car is sparkling. Rate your experience.", icon: "✨" },
    cancelled:     { title: "Booking cancelled", body: `Booking ${booking.bookingRef} was cancelled.`, icon: "❌" },
  };

  if (notifMap[status]) {
    await Notification.create({
      user: booking.customer._id,
      type: "tracking",
      ...notifMap[status],
      refModel: "Booking",
      refId: booking._id,
    });
  }

  success(res, { booking }, `Booking status updated to '${status}'`);
});

// ── PATCH /api/bookings/:id/assign ───────────────────────
// Admin assigns a washer
const assignWasher = asyncHandler(async (req, res) => {
  const { washerId } = req.body;
  const booking = await Booking.findById(req.params.id).populate("customer service");

  if (!booking) return notFound(res, "Booking not found");
  if (booking.status !== "confirmed") {
    return badRequest(res, "Can only assign washer to confirmed bookings");
  }

  const User = require("../models/User");
  const washer = await User.findOne({ _id: washerId, role: "washer", isAvailable: true });
  if (!washer) return notFound(res, "Washer not found or unavailable");

  booking.washer = washerId;
  booking.status = "assigned";
  booking.timeline.assignedAt = new Date();
  await booking.save();

  // Notify customer
  if (booking.customer.email) {
    await sendEmail(washerAssignedEmail(booking, booking.customer, washer));
  }

  await Notification.create({
    user: booking.customer._id,
    type: "booking",
    title: "Washer assigned!",
    body: `${washer.name} (⭐ ${washer.rating}) will wash your car.`,
    icon: "👤",
    refModel: "Booking",
    refId: booking._id,
  });

  success(res, { booking }, "Washer assigned successfully");
});

// ── GET /api/bookings/admin/all ───────────────────────────
const getAllBookingsAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, date, washer } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (washer) filter.washer = washer;
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    filter.scheduledDate = { $gte: start, $lt: end };
  }

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("service", "name price")
      .populate("washer", "name rating")
      .populate("customer", "name email phone")
      .sort({ scheduledDate: 1, scheduledTime: 1 })
      .skip(skip)
      .limit(Number(limit)),
    Booking.countDocuments(filter),
  ]);

  paginated(res, bookings, total, page, limit);
});

// ── GET /api/bookings/stats ───────────────────────────────
// Admin analytics
const getStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    todayBookings,
    totalBookings,
    completedToday,
    revenueToday,
    revenueTotal,
    activeJobs,
  ] = await Promise.all([
    Booking.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: "completed", "timeline.completedAt": { $gte: today } }),
    Booking.aggregate([
      { $match: { status: "completed", "timeline.completedAt": { $gte: today } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Booking.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Booking.countDocuments({ status: { $in: ["heading", "arrived", "in-progress"] } }),
  ]);

  // Revenue by service
  const revenueByService = await Booking.aggregate([
    { $match: { status: "completed" } },
    { $group: { _id: "$service", total: { $sum: "$servicePrice" }, count: { $sum: 1 } } },
    { $lookup: { from: "services", localField: "_id", foreignField: "_id", as: "service" } },
    { $unwind: "$service" },
    { $project: { name: "$service.name", total: 1, count: 1 } },
    { $sort: { total: -1 } },
  ]);

  success(res, {
    today: {
      bookings: todayBookings,
      completed: completedToday,
      revenue: revenueToday[0]?.total || 0,
      activeJobs,
    },
    overall: {
      totalBookings,
      totalRevenue: revenueTotal[0]?.total || 0,
    },
    revenueByService,
  });
});

module.exports = {
  createBooking,
  getBookings,
  getBooking,
  updateStatus,
  assignWasher,
  getAllBookingsAdmin,
  getStats,
};