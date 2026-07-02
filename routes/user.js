const express = require("express");
const {
  handleUserSignup,
  handleUserLogin,
  handleChangePassword,
  handleVerifyEmailOtp,
} = require("../controllers/user");
const {
  verifyOtpRateLimit,
} = require("../middlewares/rateLimit/authOtp");
const {
  loginRateLimit,
  signupRateLimit,
} = require("../service/redis/authRateLimit");

const router = express.Router();

router.post("/", signupRateLimit, handleUserSignup);
router.post("/login", loginRateLimit, handleUserLogin);
router.post("/verify-email", verifyOtpRateLimit, handleVerifyEmailOtp);
router.post("/change-password", handleChangePassword);


router.get("/logout", (req, res) => {
  res.clearCookie("token");
  return res.redirect("/login");
});


module.exports = router;
