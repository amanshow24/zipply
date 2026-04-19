const express = require("express");
const URL = require("../models/url");
const { restrictTo, checkForAuthentication } = require("../middlewares/auth");

const {
  handleGenerateNewShortURL,
  handleGetAnalytics,
} = require("../controllers/url");

const router = express.Router();

router.post("/", checkForAuthentication, restrictTo(["NORMAL"]), handleGenerateNewShortURL);

router.get("/analytics/:shortId", checkForAuthentication, restrictTo(["NORMAL"]), handleGetAnalytics);

router.post("/delete/:id", checkForAuthentication, restrictTo(["NORMAL"]), async (req, res) => {
  const { id } = req.params;

  const url = await URL.findOne({ _id: id });

  if (!url) return res.status(404).send("URL not found");

  // 🔐 Make sure current user owns the URL
  if (url.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).send("Forbidden");
  }

  await URL.deleteOne({ _id: id });
  return res.redirect("/short-url");
});

module.exports = router;
