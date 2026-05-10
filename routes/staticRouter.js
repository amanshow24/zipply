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

router.get("/profile", async (req, res) => {
  if (!req.user) {
    return res.redirect("/login");
  }

  const profileUser = await User.findById(req.user._id)
    .select("name email role subscription createdAt lastLoginAt")
    .lean();

  if (!profileUser) {
    return res.redirect("/login");
  }

  const expiredPatch = getExpiredSubscriptionPatch(profileUser.subscription || {});
  if (expiredPatch) {
    await User.updateOne({ _id: req.user._id }, { $set: expiredPatch });
    profileUser.subscription = {
      ...(profileUser.subscription || {}),
      plan: "NORMAL",
      status: "EXPIRED",
    };
  }

  const userLinks = await URL.find({ createdBy: req.user._id })
    .select("expiryDate visitHistory")
    .lean();

  const nowEpoch = Date.now();
  const linkStats = userLinks.reduce(
    (stats, link) => {
      const expiryEpoch = link.expiryDate ? new Date(link.expiryDate).getTime() : null;
      const isExpired = Boolean(expiryEpoch && nowEpoch > expiryEpoch);

      stats.totalLinks += 1;
      stats.totalClicks += Array.isArray(link.visitHistory) ? link.visitHistory.length : 0;

      if (isExpired) {
        stats.expiredLinks += 1;
      } else {
        stats.activeLinks += 1;
      }

      return stats;
    },
    { totalLinks: 0, totalClicks: 0, activeLinks: 0, expiredLinks: 0 }
  );

  const effectivePlan = getEffectivePlan({ subscription: profileUser.subscription || {} });
  const usage = getUsageForToday(profileUser.subscription || {});
  const joinedAt = profileUser.createdAt
    ? new Date(profileUser.createdAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Unknown";

  const lastLoginAt = profileUser.lastLoginAt
    ? new Date(profileUser.lastLoginAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not available yet";

  const expiresAt = profileUser.subscription?.expiresAt
    ? new Date(profileUser.subscription.expiresAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  const profileName = (profileUser.name || req.user.name || "User").trim();
  const profileEmail = profileUser.email || req.user.email || "";
  const initials = profileName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";

  return res.render("profile", {
    user: req.user,
    profile: {
      name: profileName,
      email: profileEmail,
      role: profileUser.role || "NORMAL",
      joinedAt,
      lastLoginAt,
      initials,
      expiresAt,
    },
    currentPlan: effectivePlan,
    planLabel: getPlanLabel(effectivePlan),
    planLimits: getPlanLimits(effectivePlan),
    subscription: profileUser.subscription || {},
    usage,
    stats: linkStats,
    passwordChangeSuccess: req.query.passwordChanged === "true" ? "Password updated successfully." : null,
    passwordChangeError:
      req.query.passwordError === "missing"
        ? "Please fill in all password fields."
        : req.query.passwordError === "length"
          ? "New password must be at least 4 characters long."
          : req.query.passwordError === "mismatch"
            ? "New password and confirm password do not match."
            : req.query.passwordError === "current"
              ? "Current password is incorrect."
              : null,
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
