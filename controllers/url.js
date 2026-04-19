const shortid = require("shortid");
const URL = require("../models/url");
const User = require("../models/user");
const { getISTDateString, getEndOfISTDayAsUTC } = require("../utils/istTime");
const {
  getUsageSnapshot,
  getExpiredSubscriptionPatch,
} = require("../utils/subscription");

async function handleGenerateNewShortURL(req, res) {
  const { url, custom, expiry } = req.body;
  const baseUrl = req.protocol + "://" + req.get("host");
  const todayIST = getISTDateString();
  const formData = {
    url: url || "",
    custom: custom || "",
    expiry: expiry || "",
  };

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

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

  const usageSnapshot = getUsageSnapshot({ subscription: userDoc?.subscription || req.user.subscription || {} }, "shortUrl");
  if (!usageSnapshot.allowed) {
    return res.status(429).render("home", {
      error: `Your ${usageSnapshot.plan === "NORMAL" ? "free" : usageSnapshot.plan} daily short URL limit is exhausted. Try again tomorrow.`,
      formData,
      todayIST,
      urls: await URL.find({ createdBy: req.user._id }),
      user: req.user,
      baseUrl,
    });
  }

  let shortId = shortid.generate(); // default

  if (custom && custom.trim() !== "") {
    const trimmed = custom.trim();

    if (trimmed.length < 4) {
      return res.render("home", {
        customIdError: true,
        customIdErrorType: "length",
        formData: {
          ...formData,
          custom: trimmed,
        },
        todayIST,
        urls: await URL.find({ createdBy: req.user._id }),
        user: req.user,
        baseUrl,
      });
    }

    const existing = await URL.findOne({ shortId: trimmed });
    if (existing) {
      return res.render("home", {
        customIdError: true,
        customIdErrorType: "duplicate",
        formData: {
          ...formData,
          custom: trimmed,
        },
        todayIST,
        urls: await URL.find({ createdBy: req.user._id }),
        user: req.user,
        baseUrl,
      });
    }

    shortId = trimmed;
  }

  // ✅ Expiry Date Handling in IST
  let expiryDate = null;
  if (expiry && expiry.trim() !== "") {
    const trimmedExpiry = expiry.trim();
    if (trimmedExpiry < todayIST) {
      return res.render("home", {
        error: "Expiry date must be today or in the future",
        formData,
        todayIST,
        urls: await URL.find({ createdBy: req.user._id }),
        user: req.user,
        baseUrl,
      });
    }

    expiryDate = getEndOfISTDayAsUTC(trimmedExpiry);
  }

  await URL.create({
    shortId,
    redirectURL: url,
    visitHistory: [],
    createdBy: req.user._id,
    expiryDate,
  });

  await User.updateOne(
    { _id: req.user._id },
    {
      $set: {
        "subscription.plan": usageSnapshot.plan,
        "subscription.usage.dateIST": usageSnapshot.usage.dateIST,
        "subscription.usage.shortUrlCount": usageSnapshot.current + 1,
        "subscription.usage.qrCount": usageSnapshot.usage.qrCount,
      },
    }
  );

  return res.redirect("/short-url");
}

async function handleGetAnalytics(req, res) {
  const shortId = req.params.shortId;
  const result = await URL.findOne({ shortId });
  return res.json({
    totalClicks: result.visitHistory.length,
    analytics: result.visitHistory,
  });
}

module.exports = {
  handleGenerateNewShortURL,
  handleGetAnalytics,
};
