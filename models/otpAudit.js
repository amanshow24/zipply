const mongoose = require("mongoose");

const otpAuditSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        "OTP_SENT",
        "OTP_RESENT",
        "OTP_VERIFY_SUCCESS",
        "OTP_VERIFY_FAILED",
        "OTP_VERIFY_EXPIRED",
        "OTP_VERIFY_LOCKED",
      ],
      index: true,
    },
    requestIp: {
      type: String,
      default: "unknown",
    },
    userAgent: {
      type: String,
      default: "unknown",
    },
    metadata: {
      type: Object,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

const OtpAudit = mongoose.model("OtpAudit", otpAuditSchema);

module.exports = OtpAudit;