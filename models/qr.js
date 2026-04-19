const mongoose = require("mongoose");

const qrSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  resolverId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  dataType: {
    type: String,
    enum: ["url", "text"],
    default: "text",
  },
  image: {
    type: String, // base64 Data URL
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const QR = mongoose.model("QR", qrSchema);
module.exports = QR;
