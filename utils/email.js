const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`📧 [DEV] Email to ${to}: ${subject}`);
    return;
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
};

// ── Templates ─────────────────────────────────────────────

const bookingConfirmedEmail = (booking, customer) => ({
  to: customer.email,
  subject: `Booking confirmed — ${booking.bookingRef}`,
  html: `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
      <h2 style="color:#F5C542">Ikinamba.</h2>
      <h3>Your wash is confirmed! 🚗</h3>
      <p>Hi ${customer.name},</p>
      <p>Your booking <strong>${booking.bookingRef}</strong> is confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">Service</td><td style="padding:8px;border-bottom:1px solid #eee">${booking.service?.name}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">Date</td><td style="padding:8px;border-bottom:1px solid #eee">${new Date(booking.scheduledDate).toDateString()}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">Time</td><td style="padding:8px;border-bottom:1px solid #eee">${booking.scheduledTime}</td></tr>
        <tr><td style="padding:8px;color:#888">Location</td><td style="padding:8px">${booking.location.address}</td></tr>
      </table>
      <p style="color:#888;font-size:13px">We'll notify you when your washer is on the way.</p>
      <p>— The Ikinamba Team</p>
    </div>
  `,
});

const washerAssignedEmail = (booking, customer, washer) => ({
  to: customer.email,
  subject: `Your washer is assigned — ${booking.bookingRef}`,
  html: `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
      <h2 style="color:#F5C542">Ikinamba.</h2>
      <h3>${washer.name} will wash your car!</h3>
      <p>Hi ${customer.name}, your washer <strong>${washer.name}</strong> (⭐ ${washer.rating}) is assigned to your booking <strong>${booking.bookingRef}</strong>.</p>
      <p>They'll arrive at <strong>${booking.scheduledTime}</strong> on <strong>${new Date(booking.scheduledDate).toDateString()}</strong>.</p>
      <p style="color:#888;font-size:13px">You'll receive another notification when they're on the way.</p>
    </div>
  `,
});

const passwordResetEmail = (user, resetUrl) => ({
  to: user.email,
  subject: "Reset your Ikinamba password",
  html: `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
      <h2 style="color:#F5C542">Ikinamba.</h2>
      <h3>Password reset request</h3>
      <p>Hi ${user.name},</p>
      <p>Click the button below to reset your password. This link expires in 10 minutes.</p>
      <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#F5C542;color:#0A0A0A;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
      <p style="color:#888;font-size:13px">If you didn't request this, ignore this email.</p>
    </div>
  `,
});

module.exports = { sendEmail, bookingConfirmedEmail, washerAssignedEmail, passwordResetEmail };