const User = require("../models/User");
const Booking = require("../models/Booking");
const { getDistance } = require("./getDistance");

const suggestWashers = async ({ date, time, location }) => {
  const washers = await User.find({ role: "washer", isActive: true });

  const available = [];

  for (const washer of washers) {
    const conflict = await Booking.findOne({
      washer: washer._id,
      scheduledDate: new Date(date),
      scheduledTime: time,
    });

    if (!conflict) {
      available.push(washer);
    }
  }

  if (!available.length) return [];

  const sorted = available.sort((a, b) => {
    const distA = getDistance(
      location.coordinates?.lat,
      location.coordinates?.lng,
      a.zone?.coordinates?.lat,
      a.zone?.coordinates?.lng,
    );
    const distB = getDistance(
      location.coordinates?.lat,
      location.coordinates?.lng,
      b.zone?.coordinates?.lat,
      b.zone?.coordinates?.lng,
    );

    if (distA !== distB) return distA - distB;

    return b.rating - a.rating;
  });

  return sorted.slice(0, 5);
};

module.exports = { suggestWashers };
