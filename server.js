require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const compression = require("compression");
const rateLimit  = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser  = require("cookie-parser");

const connectDB = require("./config/db");
const routes    = require("./routes/index");
const { notFound, globalErrorHandler } = require("./middlewares/error");

// ── App ───────────────────────────────────────────────────
const app = express();

// ── DB ────────────────────────────────────────────────────
connectDB();

// ── Security middleware ───────────────────────────────────
app.use(helmet());
app.use(mongoSanitize()); // prevent NoSQL injection

// ── CORS ──────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Rate limiting ─────────────────────────────────────────
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many login attempts. Try again in 15 minutes." },
});

app.use("/api", limiter);
app.use("/api/auth/login",    authLimiter);
app.use("/api/auth/register", authLimiter);

// ── Body & cookie parsers ─────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// ── Compression ───────────────────────────────────────────
app.use(compression());

// ── HTTP logging (dev only) ───────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ── Static uploads ────────────────────────────────────────
app.use("/uploads", express.static("uploads"));

// ── Health check ──────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Ikinamba API is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API routes ────────────────────────────────────────────
app.use("/api", routes);

// ── 404 & error handlers ─────────────────────────────────
app.use(notFound);
app.use(globalErrorHandler);

// ── Start server ──────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Ikinamba API running`);
  console.log(`   Mode:    ${process.env.NODE_ENV || "development"}`);
  console.log(`   Port:    ${PORT}`);
  console.log(`   Health:  http://localhost:${PORT}/health`);
  console.log(`   API:     http://localhost:${PORT}/api\n`);
});

// ── Graceful shutdown ─────────────────────────────────────
process.on("unhandledRejection", (err) => {
  console.error(`❌ Unhandled rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => process.exit(0));
});

module.exports = app;