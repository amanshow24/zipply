const crypto = require("crypto");
const util = require("util");
const Razorpay = require("razorpay");
const shortid = require("shortid");
const axios = require("axios");

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

const APP_NAME = process.env.APP_NAME || "Zipply";
const APP_URL = process.env.APP_URL || "https://zipply.onrender.com";
const CONTACT_EMAIL = (process.env.CONTACT_EMAIL || "amanshow9800@gmail.com").trim();
const BRAND_LOGO_URL = process.env.BRAND_LOGO_URL || "";
const EMAIL_FROM = (
  process.env.BREVO_FROM_EMAIL || process.env.FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || ""
)
  .trim()
  .toLowerCase();
const BREVO_API_KEY = (process.env.BREVO_API_KEY || "").trim();

const razorpay =
  RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET,
      })
    : null;

function formatISTDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function buildBrandLogoBlock() {
  if (BRAND_LOGO_URL) {
    return `<img src="${BRAND_LOGO_URL}" alt="${APP_NAME} logo" style="height:32px;max-width:150px;object-fit:contain;display:block;margin:0 auto;" />`;
  }

  return `<div style="text-align:center;">
    <div style="display:inline-block;text-align:left;">
      <div style="font-family:'Poppins','Roboto','Segoe UI',Arial,sans-serif;font-size:34px;line-height:1;font-weight:700;color:#1a73e8;letter-spacing:-0.03em;">${APP_NAME}</div>
      <div style="width:46%;height:3px;border-radius:999px;background:linear-gradient(90deg,#1a73e8,rgba(26,115,232,0.22));margin:6px 0 0;"></div>
    </div>
  </div>`;
}

function buildCommonEmailFooterHtml() {
  return `<div class="z-email-section" style="padding:18px 24px;border-top:1px solid #e5e7eb;background:#f8fbff;">
    <p style="margin:0 0 8px;font-size:13px;line-height:1.7;color:#4b5563;text-align:center;">
      Can't find what you're looking for? Email us at
      <a href="mailto:${CONTACT_EMAIL}" style="color:#1a73e8;text-decoration:none;font-weight:600;">${CONTACT_EMAIL}</a>.
    </p>

    <div style="text-align:center;padding:6px 0 10px;">
      <a href="https://github.com/amanshow24" target="_blank" aria-label="GitHub" style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;margin:0 4px;border:1px solid rgba(26,115,232,0.45);border-radius:999px;background:#ffffff;text-decoration:none;">
        <img src="https://img.icons8.com/ios-filled/50/1A73E8/github.png" alt="GitHub" width="16" height="16" style="display:inline-block;vertical-align:middle;border:0;" />
      </a>
      <a href="https://www.linkedin.com/in/aman-kumar-show-a5589b290/" target="_blank" aria-label="LinkedIn" style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;margin:0 4px;border:1px solid rgba(26,115,232,0.45);border-radius:999px;background:#ffffff;text-decoration:none;">
        <img src="https://img.icons8.com/ios-filled/50/1A73E8/linkedin.png" alt="LinkedIn" width="16" height="16" style="display:inline-block;vertical-align:middle;border:0;" />
      </a>
      <a href="https://www.instagram.com/aman_a_18" target="_blank" aria-label="Instagram" style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;margin:0 4px;border:1px solid rgba(26,115,232,0.45);border-radius:999px;background:#ffffff;text-decoration:none;">
        <img src="https://img.icons8.com/ios-filled/50/1A73E8/instagram-new.png" alt="Instagram" width="16" height="16" style="display:inline-block;vertical-align:middle;border:0;" />
      </a>
      <a href="https://twitter.com/amanshow2005" target="_blank" aria-label="Twitter" style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;margin:0 4px;border:1px solid rgba(26,115,232,0.45);border-radius:999px;background:#ffffff;text-decoration:none;">
        <img src="https://img.icons8.com/ios-filled/50/1A73E8/twitter.png" alt="Twitter" width="16" height="16" style="display:inline-block;vertical-align:middle;border:0;" />
      </a>
    </div>

    <div style="margin:2px 0 0;text-align:center;">
      <div style="display:inline-block;text-align:left;">
        <div style="font-family:'Poppins','Roboto','Segoe UI',Arial,sans-serif;font-size:20px;line-height:1;font-weight:700;color:#1a73e8;letter-spacing:-0.03em;">${APP_NAME}</div>
        <div style="width:46%;height:2px;border-radius:999px;background:linear-gradient(90deg,#1a73e8,rgba(26,115,232,0.22));margin:5px 0 0;"></div>
      </div>
    </div>
  </div>`;
}

function buildSubscriptionEmailHtml({
  name,
  plan,
  amount,
  currency,
  orderId,
  paymentId,
  paidAt,
  expiresAt,
}) {
  const safeName = (name || "there").trim();
  const brandLogoBlock = buildBrandLogoBlock();
  const footerHtml = buildCommonEmailFooterHtml();
  const amountText = typeof amount === "number" ? (amount / 100).toFixed(2) : "-";

  return `<div style="margin:0;padding:0;background:#f6f8fc;font-family:'Roboto','Segoe UI',Arial,sans-serif;color:#1f2937;">
    <style>
      @media only screen and (max-width: 600px) {
        .z-email-wrap {
          padding: 0 !important;
        }
        .z-email-card {
          border-left: 0 !important;
          border-right: 0 !important;
          border-radius: 0 !important;
        }
        .z-email-section {
          padding-left: 16px !important;
          padding-right: 16px !important;
        }
      }
    </style>
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;visibility:hidden;">Your ${APP_NAME} subscription is active. Order ${orderId} is confirmed.</div>
    <div class="z-email-wrap" style="width:100%;max-width:640px;margin:0 auto;padding:16px 0;">
      <div class="z-email-card" style="width:100%;background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;box-shadow:0 8px 24px rgba(15,23,42,0.08);overflow:hidden;">
        <div class="z-email-section" style="padding:22px 24px 18px;border-bottom:1px solid #e5e7eb;background:rgba(26,115,232,0.05);">
          ${brandLogoBlock}
          <p style="margin:14px 0 0;text-align:center;font-size:14px;line-height:1.65;color:#6b7280;">Subscription payment confirmed for your ${APP_NAME} account.</p>
        </div>

        <div class="z-email-section" style="padding:24px;">
          <h1 style="margin:0 0 12px;font-family:'Poppins','Segoe UI',Roboto,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:600;color:#1f2937;">Your subscription is active!</h1>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#374151;">Hello ${safeName},</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#374151;">Your payment is successful and your <strong>${plan}</strong> plan is now active.</p>

          <div style="border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc;padding:12px 14px;">
            <p style="margin:0 0 8px;font-size:13px;line-height:1.65;color:#4b5563;"><strong>Order ID:</strong> ${orderId}</p>
            <p style="margin:0 0 8px;font-size:13px;line-height:1.65;color:#4b5563;"><strong>Payment ID:</strong> ${paymentId || "-"}</p>
            <p style="margin:0 0 8px;font-size:13px;line-height:1.65;color:#4b5563;"><strong>Amount:</strong> ${currency || "INR"} ${amountText}</p>
            <p style="margin:0 0 8px;font-size:13px;line-height:1.65;color:#4b5563;"><strong>Paid at (IST):</strong> ${formatISTDateTime(paidAt)}</p>
            <p style="margin:0;font-size:13px;line-height:1.65;color:#4b5563;"><strong>Plan expiry (IST):</strong> ${formatISTDateTime(expiresAt)}</p>
          </div>
        </div>

        ${footerHtml}
      </div>
    </div>
  </div>`;
}

async function sendSubscriptionSuccessEmail({
  email,
  name,
  plan,
  amount,
  currency,
  orderId,
  paymentId,
  paidAt,
  expiresAt,
}) {
  if (!BREVO_API_KEY || !EMAIL_FROM || !email) {
    return;
  }

  const payload = {
    sender: {
      name: APP_NAME,
      email: EMAIL_FROM,
    },
    to: [
      {
        email,
        name,
      },
    ],
    subject: `${APP_NAME} subscription confirmed - ${plan} plan`,
    htmlContent: buildSubscriptionEmailHtml({
      name,
      plan,
      amount,
      currency,
      orderId,
      paymentId,
      paidAt,
      expiresAt,
    }),
  };

  try {
    await axios.post("https://api.brevo.com/v3/smtp/email", payload, {
      headers: {
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      timeout: 15000,
    });
  } catch (error) {
    console.error("Subscription confirmation email send failed:", {
      statusCode: error?.response?.status || error?.code,
      responseMessage: error?.response?.data?.message || error?.message || "unknown-error",
    });
  }
}

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

  void sendSubscriptionSuccessEmail({
    email: req.user?.email,
    name: req.user?.name,
    plan: PLAN_LABELS[plan] || plan,
    amount: paymentRecord.amount,
    currency: paymentRecord.currency,
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    paidAt: now,
    expiresAt,
  });

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