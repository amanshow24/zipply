const express = require("express");
const { restrictTo } = require("../middlewares/auth");
const URL = require("../models/url");
const Payment = require("../models/payment");
const User = require("../models/user");
const { getISTDateString } = require("../utils/istTime");
const { handleVerifyEmailPage } = require("../controllers/user");
const {
  getEffectivePlan,
  getPlanLabel,
  getPlanLimits,
  getUsageForToday,
  getExpiredSubscriptionPatch,
} = require("../utils/subscription");

const router = express.Router();

router.get("/", restrictTo(["NORMAL"]), async (req, res) => {
  const fullName = req.user && req.user.name ? req.user.name.trim() : "";
  const emailValue = req.user && req.user.email ? req.user.email : "";
  const emailLocal = emailValue.includes("@") ? emailValue.split("@")[0] : "";
  const emailBasedName = emailLocal
    ? emailLocal
        .replace(/[._-]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "";

  const dashboardName = fullName || emailBasedName || "User";

  return res.render("dashboard", {
    user: req.user,
    dashboardName,
  });
});

router.get("/short-url", restrictTo(["NORMAL"]), async (req, res) => {
  const allurls = await URL.find({ createdBy: req.user._id });
  const baseUrl = req.protocol + "://" + req.get("host");
  return res.render("home", {
    urls: allurls,
    todayIST: getISTDateString(),
    user: req.user,
    baseUrl,
    success: req.query.deleted === "true" ? "URL deleted successfully." : null,
  });
});

router.get("/signup", (req, res) => {
  return res.render("signup", {
    user: req.user,
  });
});

router.get("/login", (req, res) => {
  return res.render("login", {
    user: req.user,
  });
});

router.get("/verify-email", handleVerifyEmailPage);

router.get("/billing", async (req, res) => {
  if (!req.user) {
    return res.redirect("/login");
  }

  const expiredPatch = getExpiredSubscriptionPatch(req.user.subscription || {});
  if (expiredPatch) {
    await User.updateOne({ _id: req.user._id }, { $set: expiredPatch });
    req.user.subscription = {
      ...(req.user.subscription || {}),
      plan: "NORMAL",
      status: "EXPIRED",
    };
  }

  const payments = await Payment.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(8).lean();
  const effectivePlan = getEffectivePlan(req.user);
  const usage = getUsageForToday(req.user.subscription || {});

  return res.render("billing", {
    user: req.user,
    currentPlan: effectivePlan,
    planLabel: getPlanLabel(effectivePlan),
    planLimits: getPlanLimits(effectivePlan),
    subscription: req.user.subscription || {},
    usage,
    transactions: payments,
  });
});

// View More Page
router.get("/view/:shortId", async (req, res) => {
  const { shortId } = req.params;

  const url = await URL.findOne({ shortId }).populate("createdBy", "email");

  if (!url) {
    return res.status(404).send("Short URL not found");
  }

   const baseUrl = req.protocol + "://" + req.get("host");
  return res.render("viewMore", {
    url,
    user: req.user,
     baseUrl,
  });
});



module.exports = router;
