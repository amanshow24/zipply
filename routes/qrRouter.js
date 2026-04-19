const express = require("express");
const QRCode = require("qrcode");
const shortid = require("shortid");
const { restrictTo } = require("../middlewares/auth");
const User = require("../models/user");
const QR = require("../models/qr");
const {
  getUsageSnapshot,
  getExpiredSubscriptionPatch,
} = require("../utils/subscription");

const router = express.Router();

const isHttpUrl = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_error) {
    return false;
  }
};

const getBaseUrl = (req) => {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = forwardedProto ? forwardedProto.split(",")[0] : req.protocol;
  return `${protocol}://${req.get("host")}`;
};

// GET QR page + history
router.get("/", restrictTo(["NORMAL"]), async (req, res) => {
  const userDoc = await User.findById(req.user._id).select("subscription").lean();
  const expiredPatch = getExpiredSubscriptionPatch(userDoc?.subscription || {});
  if (expiredPatch) {
    await User.updateOne({ _id: req.user._id }, { $set: expiredPatch });
    userDoc.subscription = {
      ...(userDoc.subscription || {}),
      plan: "NORMAL",
      status: "EXPIRED",
    };
  }

  const qrHistory = await QR.find({ createdBy: req.user._id }).sort({ createdAt: 1 }); // oldest first

  res.render("qr", {
    user: req.user,
    qrImage: null,
    qrText: "",
    qrHistory,
  });
});

// POST QR form
router.post("/", restrictTo(["NORMAL"]), async (req, res) => {
  const { qrText } = req.body;

  const userDoc = await User.findById(req.user._id).select("subscription").lean();
  const expiredPatch = getExpiredSubscriptionPatch(userDoc?.subscription || {});
  if (expiredPatch) {
    await User.updateOne({ _id: req.user._id }, { $set: expiredPatch });
    userDoc.subscription = {
      ...(userDoc.subscription || {}),
      plan: "NORMAL",
      status: "EXPIRED",
    };
  }

  const usageSnapshot = getUsageSnapshot({ subscription: userDoc?.subscription || req.user.subscription || {} }, "qr");

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

  if (!usageSnapshot.allowed) {
    const qrHistory = await QR.find({ createdBy: req.user._id }).sort({ createdAt: 1 });
    return res.status(429).render("qr", {
      user: req.user,
      qrText: qrText.trim(),
      qrImage: null,
      error: `Your ${usageSnapshot.plan === "NORMAL" ? "free" : usageSnapshot.plan} daily QR limit is exhausted. Try again tomorrow.`,
      qrHistory,
    });
  }

  try {
    const normalizedText = qrText.trim();
    const resolverId = shortid.generate();
    const dataType = isHttpUrl(normalizedText) ? "url" : "text";
    const resolveUrl = `${getBaseUrl(req)}/qr/r/${resolverId}`;
    const qrImage = await QRCode.toDataURL(resolveUrl);

    await QR.create({
      text: normalizedText,
      image: qrImage,
      createdBy: req.user._id,
      resolverId,
      dataType,
    });

    await User.updateOne(
      { _id: req.user._id },
      {
        $set: {
          "subscription.plan": usageSnapshot.plan,
          "subscription.usage.dateIST": usageSnapshot.usage.dateIST,
          "subscription.usage.shortUrlCount": usageSnapshot.usage.shortUrlCount,
          "subscription.usage.qrCount": usageSnapshot.current + 1,
        },
      }
    );

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

// public resolver for generated QR codes
router.get("/r/:resolverId", async (req, res) => {
  const { resolverId } = req.params;

  const qrEntry = await QR.findOne({ resolverId });
  if (!qrEntry) {
    return res.status(404).render("404", {
      user: req.user,
      message: "This QR code is invalid or has been removed.",
      notFoundType: "qr",
    });
  }

  if (qrEntry.dataType === "url" && isHttpUrl(qrEntry.text)) {
    return res.redirect(qrEntry.text);
  }

  return res.render("qrResolve", {
    user: req.user,
    qrText: qrEntry.text,
  });
});

// delete qr
router.post("/delete/:id", restrictTo(["NORMAL"]), async (req, res) => {
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
