const express = require("express");
const { restrictTo } = require("../middlewares/auth");
const URL = require("../models/url");

const router = express.Router();

router.get("/admin/urls", restrictTo(["ADMIN"]), async (req, res) => {
  const allurls = await URL.find({});
  const baseUrl = req.protocol + "://" + req.get("host");
  return res.render("home", {
    urls: allurls,
    user: req.user,
    baseUrl,
    success: req.query.deleted === "true" ? "URL deleted successfully." : null,
  });
});

router.get("/", restrictTo(["NORMAL", "ADMIN"]), async (req, res) => {
  const allurls = await URL.find({ createdBy: req.user._id });
  const baseUrl = req.protocol + "://" + req.get("host");
  return res.render("home", {
    urls: allurls,
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
