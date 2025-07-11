const express = require("express");
const URL = require("../models/url");
const { restrictTo, checkForAuthentication } = require("../middlewares/auth");

const {
  handleGenerateNewShortURL,
  handleGetAnalytics,
} = require("../controllers/url");

const router = express.Router();

// 🔒 Ensure all routes here have req.user available
router.use(checkForAuthentication);

router.post("/", handleGenerateNewShortURL);

router.get("/analytics/:shortId", handleGetAnalytics);

router.post("/delete/:id", async (req, res) => {
  const { id } = req.params;

  const url = await URL.findOne({ _id: id });

  if (!url) return res.status(404).send("URL not found");

  // 🔐 Make sure current user owns the URL
  if (url.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).send("Forbidden");
  }

  await URL.deleteOne({ _id: id });
  return res.redirect("/");
});

module.exports = router;
