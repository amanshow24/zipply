const express = require("express");
const router = express.Router();

// Public Static Pages
router.get("/about", (req, res) => {
  res.render("about", { user: req.user });
});

router.get("/faq", (req, res) => {
  res.render("faq", { user: req.user });
});

router.get("/terms", (req, res) => {
  res.render("terms", { user: req.user });
});

router.get("/privacy", (req, res) => {
  res.render("privacy", { user: req.user });
});

router.get("/support", (req, res) => {
  res.render("support", { user: req.user });
});

router.get("/team", (req, res) => {
  res.render("team", { user: req.user });
});

module.exports = router;
