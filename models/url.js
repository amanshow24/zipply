const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema(
  {
    shortId: {
      type: String,
      required: true,
      unique: true,
    },
    redirectURL: {
      type: String,
      required: true,
    },

    expiryDate: {
       type: Date,
       default: null,
    },

    visitHistory: [
  {
    timestamp: { type: Number },
    userAgent: { type: String },
  }
],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    aiInsights: {
      status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending",
      },
      summary: {
        type: String,
        default: "",
      },
      category: {
        type: String,
        default: "",
      },
      analyzedAt: {
        type: Date,
        default: null,
      },
      attempts: {
        type: Number,
        default: 0,
      },
      error: {
        type: String,
        default: "",
      },
    },
  },
  { timestamps: true }
);

const URL = mongoose.model("url", urlSchema);

module.exports = URL;
