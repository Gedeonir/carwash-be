require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Service = require("../models/Service");
const Booking = require("../models/Booking");
const Review = require("../models/Review");
const Notification = require("../models/Notification");

const connectDB = require("../config/db");

const SERVICES = [
  {
    name: "Basic Wash",
    slug: "basic-wash",
    description: "A thorough exterior clean that gets your car looking fresh fast. Perfect for regular upkeep.",
    price: 5000,
    durationMinutes: 45,
    icon: "💧",
    tag: "Popular",
    sortOrder: 1,
    includes: [
      "Exterior hand wash",
      "Wheel & tyre clean",
      "Window wipe (exterior)",
      "Door jamb wipe",
      "Air freshener",
    ],
    excludes: ["Interior vacuum", "Dashboard wipe", "Wax or polish"],
    addOns: [
      { name: "Engine Bay Clean", price: 3000, icon: "🔧", description: "Full degreasing and rinse of engine bay" },
      { name: "Seat Shampoo",     price: 4000, icon: "🪑", description: "Deep shampoo for fabric or leather seats" },
    ],
  },
  {
    name: "Standard Wash",
    slug: "standard-wash",
    description: "Our bestseller. A complete clean inside and out — everything your car needs to feel brand new.",
    price: 10000,
    durationMinutes: 60,
    icon: "✨",
    tag: "Most Popular",
    sortOrder: 2,
    includes: [
      "Everything in Basic",
      "Interior vacuum (seats, mats, boot)",
      "Dashboard & console wipe",
      "Door panels clean",
      "Window clean (interior + exterior)",
      "Tyre dressing",
    ],
    excludes: ["Wax or polish", "Leather treatment"],
    addOns: [
      { name: "Engine Bay Clean",   price: 3000, icon: "🔧", description: "Full degreasing and rinse" },
      { name: "Seat Shampoo",       price: 4000, icon: "🪑", description: "Deep shampoo for fabric or leather seats" },
      { name: "Odour Eliminator",   price: 2000, icon: "🌿", description: "Ozone treatment for stubborn smells" },
    ],
  },
  {
    name: "Premium Detail",
    slug: "premium-detail",
    description: "A full professional detail that leaves your car showroom-ready. Wax, polish, and every nook cleaned.",
    price: 18000,
    durationMinutes: 90,
    icon: "🏆",
    tag: "Best Value",
    sortOrder: 3,
    includes: [
      "Everything in Standard",
      "Clay bar paint decontamination",
      "Hand wax & machine polish",
      "Leather seat conditioning",
      "Engine bay wipe",
      "Headlight restoration",
      "Tyre shine application",
    ],
    excludes: [],
    addOns: [
      { name: "Ceramic Coating", price: 15000, icon: "💎", description: "Long-lasting paint protection (6–12 months)" },
      { name: "Seat Shampoo",    price: 4000,  icon: "🪑", description: "Deep shampoo for fabric or leather seats" },
    ],
  },
];

const seed = async () => {
  await connectDB();
  console.log("\n🌱 Starting database seed...\n");

  // ── Clear existing data ────────────────────────────────
  await Promise.all([
    User.deleteMany({}),
    Service.deleteMany({}),
    Booking.deleteMany({}),
    Review.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  console.log("🗑️  Cleared existing data");

  // ── Services ───────────────────────────────────────────
  const services = await Service.insertMany(SERVICES);
  console.log(`✅ Created ${services.length} services`);

  // ── Admin ──────────────────────────────────────────────
  const admin = await User.create({
    name: "Ikinamba Admin",
    email: "admin@ikinamba.com",
    password: "Admin123!",
    role: "admin",
    phone: "+250 788 000 000",
    isActive: true,
  });
  console.log(`✅ Created admin: ${admin.email} / password: Admin123!`);

  // ── Washers ────────────────────────────────────────────
  const washersData = [
    { name: "Jean Nkurunziza", email: "jean@ikinamba.com",   phone: "+250 788 111 111", zone: "Kimihurura", rating: 4.9, totalReviews: 312 },
    { name: "Pascal Mugisha",  email: "pascal@ikinamba.com", phone: "+250 788 222 222", zone: "Kiyovu",      rating: 4.8, totalReviews: 204 },
    { name: "Eric Kayumba",    email: "eric@ikinamba.com",   phone: "+250 788 333 333", zone: "Remera",      rating: 4.7, totalReviews: 178 },
    { name: "Alice Mutoni",    email: "alice@ikinamba.com",  phone: "+250 788 444 444", zone: "CBD",         rating: 4.9, totalReviews: 289 },
  ];

  const washers = await Promise.all(
    washersData.map((w) =>
      User.create({ ...w, password: "Washer123!", role: "washer", isAvailable: true })
    )
  );
  console.log(`✅ Created ${washers.length} washers`);

  // ── Customers ──────────────────────────────────────────
  const customersData = [
    { name: "Amira Kagabo",      email: "amira@example.com",   phone: "+250 788 555 111", loyaltyPoints: 70 },
    { name: "James Mukuralinda", email: "james@example.com",   phone: "+250 788 555 222", loyaltyPoints: 30 },
    { name: "Claudine Uwera",    email: "claudine@example.com",phone: "+250 788 555 333", loyaltyPoints: 200 },
    { name: "David Bizimana",    email: "david@example.com",   phone: "+250 788 555 444", loyaltyPoints: 10 },
  ];

  const customers = await Promise.all(
    customersData.map((c) =>
      User.create({
        ...c,
        password: "Customer123!",
        role: "customer",
        savedLocations: [
          { label: "Home", address: "KG 9 Ave, Kimihurura, Kigali", coordinates: { lat: -1.9536, lng: 30.0622 } },
          { label: "Work", address: "KN 4 St, CBD, Kigali",         coordinates: { lat: -1.9441, lng: 30.0619 } },
        ],
        savedCars: [
          { plate: "RAB 123A", model: "Toyota RAV4", color: "Silver", year: "2022" },
        ],
      })
    )
  );
  console.log(`✅ Created ${customers.length} customers`);

  // ── Bookings ───────────────────────────────────────────
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const lastWeek = new Date(now); lastWeek.setDate(now.getDate() - 7);

  const bookingsData = [
    // Active booking (in-progress)
    {
      customer: customers[0]._id,
      washer:   washers[0]._id,
      service:  services[1]._id,  // Standard
      servicePrice: 10000,
      totalAmount:  10000,
      scheduledDate: now,
      scheduledTime: "10:00",
      location: { label: "Home", address: "KG 9 Ave, Kimihurura, Kigali", coordinates: { lat: -1.9536, lng: 30.0622 } },
      paymentMethod: "momo",
      paymentStatus: "paid",
      status: "in-progress",
      timeline: { confirmedAt: now, assignedAt: now, headingAt: now, arrivedAt: now, startedAt: now },
    },
    // Upcoming booking (confirmed)
    {
      customer: customers[1]._id,
      washer:   washers[1]._id,
      service:  services[0]._id,  // Basic
      servicePrice: 5000,
      totalAmount:  5000,
      scheduledDate: tomorrow,
      scheduledTime: "09:00",
      location: { label: "Work", address: "KN 4 St, CBD, Kigali" },
      paymentMethod: "cash",
      paymentStatus: "pending",
      status: "assigned",
      timeline: { confirmedAt: now, assignedAt: now },
    },
    // Upcoming (unassigned)
    {
      customer: customers[2]._id,
      service:  services[2]._id,  // Premium
      servicePrice: 18000,
      addOns: [{ name: "Seat Shampoo", price: 4000 }],
      addOnsTotal: 4000,
      totalAmount:  22000,
      scheduledDate: tomorrow,
      scheduledTime: "14:00",
      location: { label: "Home", address: "KG 101 St, Nyamirambo, Kigali" },
      paymentMethod: "airtel",
      paymentStatus: "pending",
      status: "confirmed",
      timeline: { confirmedAt: now },
    },
    // Completed booking (yesterday) - will get a review
    {
      customer: customers[0]._id,
      washer:   washers[0]._id,
      service:  services[2]._id,  // Premium
      servicePrice: 18000,
      totalAmount: 18000,
      scheduledDate: yesterday,
      scheduledTime: "11:00",
      location: { label: "Home", address: "KG 9 Ave, Kimihurura, Kigali" },
      paymentMethod: "momo",
      paymentStatus: "paid",
      status: "completed",
      timeline: {
        confirmedAt: yesterday, assignedAt: yesterday, headingAt: yesterday,
        arrivedAt: yesterday, startedAt: yesterday, completedAt: yesterday,
      },
    },
    // Completed (last week)
    {
      customer: customers[1]._id,
      washer:   washers[2]._id,
      service:  services[1]._id,  // Standard
      servicePrice: 10000,
      totalAmount: 10000,
      scheduledDate: lastWeek,
      scheduledTime: "13:00",
      location: { label: "Home", address: "KG 45 St, Remera, Kigali" },
      paymentMethod: "card",
      paymentStatus: "paid",
      status: "completed",
      timeline: {
        confirmedAt: lastWeek, assignedAt: lastWeek, headingAt: lastWeek,
        arrivedAt: lastWeek, startedAt: lastWeek, completedAt: lastWeek,
      },
    },
    // Cancelled
    {
      customer: customers[3]._id,
      service:  services[0]._id,
      servicePrice: 5000,
      totalAmount: 5000,
      scheduledDate: lastWeek,
      scheduledTime: "08:00",
      location: { address: "KG 23 Ave, Kacyiru, Kigali" },
      paymentMethod: "momo",
      paymentStatus: "refunded",
      status: "cancelled",
      cancellationReason: "Customer rescheduled",
      cancelledBy: "customer",
      timeline: { confirmedAt: lastWeek, cancelledAt: lastWeek },
    },
  ];

  const bookings = await Booking.insertMany(bookingsData);
  console.log(`✅ Created ${bookings.length} bookings`);

  // ── Reviews ────────────────────────────────────────────
  const completedBookings = bookings.filter((b) => b.status === "completed");

  const reviews = await Promise.all(
    completedBookings.map((b, i) =>
      Review.create({
        booking:  b._id,
        customer: b.customer,
        washer:   b.washer,
        rating:   i === 0 ? 5 : 4,
        tags:     i === 0 ? ["Great service", "On time", "Very clean", "Friendly"] : ["On time", "Thorough"],
        comment:  i === 0
          ? "Jean was fantastic! My car looks showroom-new. Will book every week."
          : "Good service, on time and thorough.",
        tip: i === 0 ? 1000 : 0,
      })
    )
  );

  // Link reviews to bookings
  await Promise.all(
    completedBookings.map((b, i) =>
      Booking.findByIdAndUpdate(b._id, { review: reviews[i]._id })
    )
  );
  console.log(`✅ Created ${reviews.length} reviews`);

  // ── Notifications ──────────────────────────────────────
  await Notification.insertMany([
    {
      user: customers[0]._id,
      type: "booking",
      title: "Booking confirmed!",
      body: "Your Standard Wash is confirmed for today at 10:00 AM.",
      icon: "✅",
      isRead: false,
      refModel: "Booking",
      refId: bookings[0]._id,
    },
    {
      user: customers[0]._id,
      type: "tracking",
      title: "Wash in progress 💧",
      body: "Jean Nkurunziza is washing your car right now.",
      icon: "💧",
      isRead: false,
      refModel: "Booking",
      refId: bookings[0]._id,
    },
    {
      user: customers[0]._id,
      type: "promo",
      title: "20% off this weekend",
      body: "Book any Premium Detail this weekend and get 20% off. Use code WEEKEND20.",
      icon: "🎁",
      isRead: true,
    },
    {
      user: customers[1]._id,
      type: "booking",
      title: "Washer assigned!",
      body: "Pascal Mugisha will wash your car tomorrow at 09:00.",
      icon: "👤",
      isRead: false,
      refModel: "Booking",
      refId: bookings[1]._id,
    },
  ]);
  console.log("✅ Created sample notifications");

  // ── Summary ────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ SEED COMPLETE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n🔑 Login credentials:");
  console.log("   Admin   → admin@ikinamba.com    / Admin123!");
  console.log("   Washer  → jean@ikinamba.com     / Washer123!");
  console.log("   Customer→ amira@example.com     / Customer123!");
  console.log("\n");

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});