const mongoose = require("mongoose");

const PENDING_WINDOW_MS = 30 * 60 * 1000;

const pendingSignupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    otpExpiresAt: {
      type: Date,
      required: true,
    },
    resendAvailableAt: {
      type: Date,
      required: true,
    },
    lastOtpSentAt: {
      type: Date,
      required: true,
    },
    failedAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    lockReason: {
      type: String,
      default: "",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + PENDING_WINDOW_MS),
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
);

const PendingSignup = mongoose.model("PendingSignup", pendingSignupSchema);

module.exports = PendingSignup;