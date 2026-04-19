const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      default: "NORMAL",
    },
    subscription: {
      plan: {
        type: String,
        enum: ["NORMAL", "PRO", "PLUS"],
        default: "NORMAL",
      },
      status: {
        type: String,
        enum: ["ACTIVE", "EXPIRED"],
        default: "ACTIVE",
      },
      startedAt: {
        type: Date,
        default: null,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
      usage: {
        dateIST: {
          type: String,
          default: "",
        },
        shortUrlCount: {
          type: Number,
          default: 0,
        },
        qrCount: {
          type: Number,
          default: 0,
        },
      },
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
