const express = require("express");
const QRCode = require("qrcode");
const { restrictTo } = require("../middlewares/auth");
const QR = require("../models/qr");

const router = express.Router();

// GET QR page + history
router.get("/", restrictTo(["NORMAL", "ADMIN"]), async (req, res) => {
  const qrHistory = await QR.find({ createdBy: req.user._id }).sort({ createdAt: 1 }); // oldest first

  res.render("qr", {
    user: req.user,
    qrImage: null,
    qrText: "",
    qrHistory,
  });
});

// POST QR form
router.post("/", restrictTo(["NORMAL", "ADMIN"]), async (req, res) => {
  const { qrText } = req.body;

  if (!qrText || qrText.trim() === "") {
    const qrHistory = await QR.find({ createdBy: req.user._id }).sort({ createdAt: 1 });
    return res.render("qr", {
      user: req.user,
      qrText: "",
      qrImage: null,
      error: "Text or URL is required",
      qrHistory,
    });
  }

  try {
    const qrImage = await QRCode.toDataURL(qrText.trim());

    await QR.create({
      text: qrText.trim(),
      image: qrImage,
      createdBy: req.user._id,
    });

    return res.redirect("/qr"); // ✅ PRG pattern
  } catch (err) {
    console.error("QR generation error:", err);
    const qrHistory = await QR.find({ createdBy: req.user._id }).sort({ createdAt: 1 });
    return res.render("qr", {
      user: req.user,
      qrText,
      qrImage: null,
      error: "Failed to generate QR code",
      qrHistory,
    });
  }
});

// delete qr
router.post("/delete/:id", restrictTo(["NORMAL", "ADMIN"]), async (req, res) => {
  const { id } = req.params;

  try {
    await QR.deleteOne({ _id: id, createdBy: req.user._id });
    return res.redirect("/qr");
  } catch (err) {
    console.error("Error deleting QR:", err);
    return res.status(500).send("Failed to delete QR code.");
  }
});

module.exports = router;
