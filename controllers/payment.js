const crypto = require("crypto");
const util = require("util");
const Razorpay = require("razorpay");
const shortid = require("shortid");

const Payment = require("../models/payment");
const User = require("../models/user");
const { getISTDateString } = require("../utils/istTime");
const {
  normalizePlan,
  getEffectivePlan,
  getSubscriptionExpiryFromNow,
} = require("../utils/subscription");

const RAZORPAY_KEY_ID = (process.env.RAZORPAY_KEY_ID || "").trim();
const RAZORPAY_KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET || "").trim();
const RAZORPAY_CURRENCY = (process.env.RAZORPAY_CURRENCY || "INR").trim().toUpperCase();
const PLAN_PRICES = {
  PRO: 19900,
  PLUS: 29900,
};

const PLAN_LABELS = {
  PRO: "Pro",
  PLUS: "Plus",
};

const razorpay =
  RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET,
      })
    : null;

function getPlanFromRequest(req) {
  return normalizePlan(req.body?.plan || req.query?.plan);
}

async function handleCreatePaymentOrder(req, res) {
  const plan = getPlanFromRequest(req);

  if (!PLAN_PRICES[plan]) {
    return res.status(400).json({
      success: false,
      message: "Please select a valid paid plan.",
    });
  }

  if (!razorpay) {
    return res.status(500).json({
      success: false,
      message: "Razorpay is not configured on the server.",
    });
  }

  const activePlan = getEffectivePlan({ subscription: req.user?.subscription || {} });
  if (activePlan !== "NORMAL") {
    const expiresAt = req.user?.subscription?.expiresAt
      ? new Date(req.user.subscription.expiresAt)
      : null;

    const expiresText = expiresAt
      ? expiresAt.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "your current plan expiry";

    return res.status(409).json({
      success: false,
      message: `You already have an active ${activePlan} plan. You can change plans after ${expiresText} (IST).`,
    });
  }

  const amount = PLAN_PRICES[plan];
  // Keep receipt short to satisfy Razorpay validation constraints.
  const receipt = `zp_${plan.toLowerCase()}_${shortid.generate()}`;

  try {
    const order = await razorpay.orders.create({
      amount,
      currency: RAZORPAY_CURRENCY,
      receipt,
      payment_capture: 1,
      notes: {
        userId: req.user._id.toString(),
        plan,
        app: "Zipply",
      },
    });

    await Payment.create({
      userId: req.user._id,
      plan,
      amount,
      currency: RAZORPAY_CURRENCY,
      status: "CREATED",
      razorpayOrderId: order.id,
      receipt,
      meta: {
        notes: order.notes || {},
      },
    });

    return res.json({
      success: true,
      keyId: RAZORPAY_KEY_ID,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      plan,
      planLabel: PLAN_LABELS[plan],
      amount,
      amountInRupees: amount / 100,
      currency: RAZORPAY_CURRENCY,
    });
  } catch (error) {
    console.error("\n================ Razorpay Order Creation Error ================");
    console.error("time:", new Date().toISOString());
    console.error("userId:", req.user?._id?.toString?.() || "unknown");
    console.error("plan:", plan);
    console.error("amount:", amount);
    console.error("currency:", RAZORPAY_CURRENCY);
    console.error("receipt:", receipt);
    console.error("keyConfigured:", Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET));
    console.error("error.name:", error?.name || "N/A");
    console.error("error.message:", error?.message || "N/A");
    console.error("error.code:", error?.code || error?.error?.code || "N/A");
    console.error("error.statusCode:", error?.statusCode || "N/A");
    console.error("error.description:", error?.error?.description || "N/A");
    console.error("error.reason:", error?.error?.reason || "N/A");
    console.error("error.source:", error?.error?.source || "N/A");
    console.error("error.step:", error?.error?.step || "N/A");
    console.error("error.field:", error?.error?.field || "N/A");
    if (error?.stack) {
      console.error("stack:\n", error.stack);
    }
    console.error("rawError:\n", util.inspect(error, { depth: null, colors: false }));
    console.error("===============================================================\n");

    return res.status(500).json({
      success: false,
      message: "Unable to create payment order right now.",
    });
  }
}

async function handleVerifyPayment(req, res) {
  const razorpayOrderId = (req.body?.razorpay_order_id || "").trim();
  const razorpayPaymentId = (req.body?.razorpay_payment_id || "").trim();
  const razorpaySignature = (req.body?.razorpay_signature || "").trim();
  const requestedPlan = getPlanFromRequest(req);

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({
      success: false,
      message: "Missing payment verification data.",
    });
  }

  if (!RAZORPAY_KEY_SECRET) {
    return res.status(500).json({
      success: false,
      message: "Razorpay secret key is missing on the server.",
    });
  }

  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    await Payment.updateOne(
      { razorpayOrderId, userId: req.user._id },
      {
        $set: {
          status: "FAILED",
          razorpaySignature,
        },
      }
    );

    return res.status(400).json({
      success: false,
      message: "Payment signature verification failed.",
    });
  }

  const paymentRecord = await Payment.findOne({
    razorpayOrderId,
    userId: req.user._id,
  });

  if (!paymentRecord) {
    return res.status(404).json({
      success: false,
      message: "Payment record not found.",
    });
  }

  if (paymentRecord.status === "PAID") {
    return res.json({
      success: true,
      message: "Payment already verified.",
      plan: paymentRecord.plan,
    });
  }

  const plan = PLAN_PRICES[requestedPlan] ? requestedPlan : paymentRecord.plan;
  const expiresAt = getSubscriptionExpiryFromNow(1);
  const now = new Date();

  await Payment.updateOne(
    { _id: paymentRecord._id },
    {
      $set: {
        status: "PAID",
        razorpayPaymentId,
        razorpaySignature,
        plan,
        verifiedAt: now,
      },
    }
  );

  await User.updateOne(
    { _id: req.user._id },
    {
      $set: {
        "subscription.plan": plan,
        "subscription.status": "ACTIVE",
        "subscription.startedAt": now,
        "subscription.expiresAt": expiresAt,
        "subscription.usage.dateIST": getISTDateString(now),
        "subscription.usage.shortUrlCount": 0,
        "subscription.usage.qrCount": 0,
      },
    }
  );

  return res.json({
    success: true,
    message: `${PLAN_LABELS[plan] || plan} plan activated successfully.`,
    plan,
    amount: paymentRecord.amount,
    currency: paymentRecord.currency,
    expiresAt,
  });
}

module.exports = {
  handleCreatePaymentOrder,
  handleVerifyPayment,
};