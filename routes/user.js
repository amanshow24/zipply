const express = require("express");
const {
  handleUserSignup,
  handleUserLogin,
  handleVerifyEmailOtp,
} = require("../controllers/user");
const {
  signupRateLimit,
  verifyOtpRateLimit,
} = require("../middlewares/rateLimit/authOtp");

const router = express.Router();

router.post("/", signupRateLimit, handleUserSignup);
router.post("/login", handleUserLogin);
router.post("/verify-email", verifyOtpRateLimit, handleVerifyEmailOtp);


router.get("/logout", (req, res) => {
  res.clearCookie("token");
  return res.redirect("/login");
});


module.exports = router;
