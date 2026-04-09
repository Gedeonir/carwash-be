const Notification = require("../models/Notification");
const { success, notFound } = require("../utils/response");
const { asyncHandler } = require("../middlewares/error");
// ══════════════════════════════════════════════════════════
// NOTIFICATION CONTROLLER
// ══════════════════════════════════════════════════════════

const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, unread } = req.query;
  const skip = (page - 1) * limit;
  const filter = { user: req.user._id };
  if (type) filter.type = type;
  if (unread === "true") filter.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);

  res.status(200).json({
    success: true,
    data: { notifications, unreadCount },
    meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
  });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (id === "all") {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    return success(res, {}, "All notifications marked as read");
  }

  const notif = await Notification.findOneAndUpdate(
    { _id: id, user: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!notif) return notFound(res, "Notification not found");
  success(res, { notification: notif }, "Marked as read");
});


module.exports = {
  getNotifications, markNotificationRead,
};