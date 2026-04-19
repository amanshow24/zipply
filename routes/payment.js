const express = require("express");

const {
  handleCreatePaymentOrder,
  handleVerifyPayment,
} = require("../controllers/payment");
const { checkForAuthentication } = require("../middlewares/auth");

const router = express.Router();

router.post("/create-order", checkForAuthentication, (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Please log in first." });
  }

  return handleCreatePaymentOrder(req, res, next);
});

router.post("/verify", checkForAuthentication, (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Please log in first." });
  }

  return handleVerifyPayment(req, res, next);
});

module.exports = router;