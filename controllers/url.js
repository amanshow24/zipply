const shortid = require("shortid");
const URL = require("../models/url");

async function handleGenerateNewShortURL(req, res) {
  const { url, custom, expiry } = req.body;
  const baseUrl = req.protocol + "://" + req.get("host");

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  let shortId = shortid.generate(); // default

  if (custom && custom.trim() !== "") {
    const trimmed = custom.trim();

    if (trimmed.length < 4) {
      return res.render("home", {
        error: "Custom Short ID must be at least 4 characters long",
        urls: await URL.find({ createdBy: req.user._id }),
        user: req.user,
        baseUrl,
      });
    }

    const existing = await URL.findOne({ shortId: trimmed });
    if (existing) {
      return res.render("home", {
        error: "Custom Short ID already in use",
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
    const istDateString = expiry + "T23:59:59+05:30";
    const inputDate = new Date(istDateString);

    const now = new Date();
    if (inputDate < now) {
      return res.render("home", {
        error: "Expiry date must be today or in the future",
        urls: await URL.find({ createdBy: req.user._id }),
        user: req.user,
        baseUrl,
      });
    }

    expiryDate = inputDate;
  }

  await URL.create({
    shortId,
    redirectURL: url,
    visitHistory: [],
    createdBy: req.user._id,
    expiryDate,
  });

  return res.redirect("/");
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
