const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const User = require("../models/user");
const PendingSignup = require("../models/pendingSignup");
const OtpAudit = require("../models/otpAudit");
const { setUser } = require("../service/auth");

const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_RESEND_GAP_MS = 60 * 1000;
const OTP_ATTEMPT_LIMIT = Number(process.env.OTP_ATTEMPT_LIMIT || 5);
const OTP_LOCKOUT_MS = Number(process.env.OTP_LOCKOUT_MS || 10 * 60 * 1000);
const PENDING_COOKIE_NAME = "pending_signup";
const OTP_SESSION_SECRET = process.env.OTP_SESSION_SECRET || process.env.SECRET;
const BREVO_API_KEY = (process.env.BREVO_API_KEY || "").trim();
const EMAIL_FROM = (
  process.env.BREVO_FROM_EMAIL || process.env.FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || ""
)
  .trim()
  .toLowerCase();
const APP_NAME = process.env.APP_NAME || "Zipply";
const APP_URL = process.env.APP_URL || "https://zipply.onrender.com";
const CONTACT_EMAIL = (process.env.CONTACT_EMAIL || "amanshow9800@gmail.com").trim();
const BRAND_LOGO_URL = process.env.BRAND_LOGO_URL || "";
const LEGAL_COMPANY_NAME = process.env.LEGAL_COMPANY_NAME || "Zipply";
const LEGAL_COMPANY_ADDRESS = process.env.LEGAL_COMPANY_ADDRESS || "";

if (!BREVO_API_KEY || !EMAIL_FROM) {
  console.warn(
    "⚠️ Brevo is not fully configured. OTP emails will fail until BREVO_API_KEY and BREVO_FROM_EMAIL (or FROM_EMAIL) are set."
  );
}

function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateOtpCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(OTP_LENGTH, "0");
}

function maskEmail(email = "") {
  const [local = "", domain = ""] = email.split("@");
  if (!local || !domain) {
    return email;
  }

  const visibleLocal = local.length <= 2 ? local[0] || "" : `${local.slice(0, 2)}${"*".repeat(Math.max(1, local.length - 2))}`;
  return `${visibleLocal}@${domain}`;
}

function buildOtpEmailHtml(name, otp) {
  const safeName = (name || "there").trim();
  const logoBlock = BRAND_LOGO_URL
    ? `<img src="${BRAND_LOGO_URL}" alt="${APP_NAME} logo" style="height:32px;max-width:150px;object-fit:contain;display:block;margin:0 auto;" />`
    : `<div style="text-align:center;">
         <div style="display:inline-block;text-align:left;">
           <div style="font-family:'Poppins','Roboto','Segoe UI',Arial,sans-serif;font-size:34px;line-height:1;font-weight:700;color:#1a73e8;letter-spacing:-0.03em;">${APP_NAME}</div>
           <div style="width:46%;height:3px;border-radius:999px;background:linear-gradient(90deg,#1a73e8,rgba(26,115,232,0.22));margin:6px 0 0;"></div>
         </div>
       </div>`;

  return `
  <div style="margin:0;padding:0;background:#f6f8fc;font-family:'Roboto','Segoe UI',Arial,sans-serif;color:#1f2937;">
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

        .z-email-otp {
          font-size: 28px !important;
          letter-spacing: 6px !important;
          padding: 12px 14px !important;
        }
      }
    </style>
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;visibility:hidden;">Your ${APP_NAME} verification OTP is ${otp}. It is valid for 5 minutes.</div>
    <div class="z-email-wrap" style="width:100%;max-width:640px;margin:0 auto;padding:16px 0;">
      <div class="z-email-card" style="width:100%;background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;box-shadow:0 8px 24px rgba(15,23,42,0.08);overflow:hidden;">
        <div class="z-email-section" style="padding:22px 24px 18px;border-bottom:1px solid #e5e7eb;background:rgba(26,115,232,0.05);">
          ${logoBlock}
          <p style="margin:14px 0 0;text-align:center;font-size:14px;line-height:1.65;color:#6b7280;">Secure email verification for your ${APP_NAME} signup.</p>
        </div>

        <div class="z-email-section" style="padding:24px;">
          <h1 style="margin:0 0 12px;font-family:'Poppins','Segoe UI',Roboto,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:600;color:#1f2937;">Verify Your Email</h1>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#374151;">Hi ${safeName},</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#374151;">Use the OTP below to complete your signup. This code is valid for <strong>5 minutes</strong> and can be used only once.</p>

          <div style="text-align:center;margin:0 0 18px;">
            <div class="z-email-otp" style="display:inline-block;padding:14px 18px;border-radius:14px;border:1px dashed #1a73e8;background:#f8fbff;color:#1a73e8;font-family:'Poppins','Segoe UI',Roboto,Arial,sans-serif;font-size:32px;font-weight:700;letter-spacing:8px;line-height:1;">${otp}</div>
          </div>

          <div style="border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc;padding:12px 14px;">
            <p style="margin:0;font-size:13px;line-height:1.65;color:#4b5563;">If you did not request this OTP, you can safely ignore this email. Also check your spam/promotions folder if this message is not in your inbox.</p>
          </div>
        </div>

        <div class="z-email-section" style="padding:18px 24px;border-top:1px solid #e5e7eb;background:#f8fbff;">
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
        </div>
      </div>
    </div>
  </div>`;
}

function buildAccountValidatedEmailHtml(name) {
  const safeName = (name || "there").trim();
  const logoBlock = BRAND_LOGO_URL
    ? `<img src="${BRAND_LOGO_URL}" alt="${APP_NAME} logo" style="height:32px;max-width:150px;object-fit:contain;display:block;margin:0 auto;" />`
    : `<div style="text-align:center;">
         <div style="display:inline-block;text-align:left;">
           <div style="font-family:'Poppins','Roboto','Segoe UI',Arial,sans-serif;font-size:34px;line-height:1;font-weight:700;color:#1a73e8;letter-spacing:-0.03em;">${APP_NAME}</div>
           <div style="width:46%;height:3px;border-radius:999px;background:linear-gradient(90deg,#1a73e8,rgba(26,115,232,0.22));margin:6px 0 0;"></div>
         </div>
       </div>`;

  return `
  <div style="margin:0;padding:0;background:#f6f8fc;font-family:'Roboto','Segoe UI',Arial,sans-serif;color:#1f2937;">
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

        .z-email-cta {
          display: block !important;
          width: 100% !important;
          margin: 8px 0 !important;
          box-sizing: border-box !important;
        }

        .z-email-cta-table {
          width: 100% !important;
        }

        .z-email-cta-cell {
          display: block !important;
          width: 100% !important;
          padding: 6px 0 !important;
        }
      }
    </style>
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;visibility:hidden;">Your ${APP_NAME} account is now validated and ready to use.</div>
    <div class="z-email-wrap" style="width:100%;max-width:640px;margin:0 auto;padding:16px 0;">
      <div class="z-email-card" style="width:100%;background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;box-shadow:0 8px 24px rgba(15,23,42,0.08);overflow:hidden;">
        <div class="z-email-section" style="padding:22px 24px 18px;border-bottom:1px solid #e5e7eb;background:rgba(26,115,232,0.05);">
          ${logoBlock}
          <p style="margin:14px 0 0;text-align:center;font-size:14px;line-height:1.65;color:#6b7280;">Your account is now confirmed and ready to go.</p>
        </div>

        <div class="z-email-section" style="padding:24px;">
          <h1 style="margin:0 0 12px;font-family:'Poppins','Segoe UI',Roboto,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:600;color:#1f2937;">Your account is validated!</h1>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#374151;">Hello ${safeName},</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#374151;">You are all set to start using ${APP_NAME}. Pick what you want to do next:</p>

          <table class="z-email-cta-table" role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 8px;">
            <tr>
              <td class="z-email-cta-cell" style="padding:0 6px 0 0;">
                <a class="z-email-cta" href="${APP_URL}/short-url" style="display:inline-block;padding:11px 18px;border-radius:10px;background:#1a73e8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Create Short URL</a>
              </td>
              <td class="z-email-cta-cell" style="padding:0 0 0 6px;">
                <a class="z-email-cta" href="${APP_URL}/qr" style="display:inline-block;padding:11px 18px;border-radius:10px;background:#ffffff;color:#1a73e8;border:1px solid rgba(26,115,232,0.35);text-decoration:none;font-size:14px;font-weight:600;">Generate QR Code</a>
              </td>
            </tr>
          </table>

          <div style="border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc;padding:12px 14px;margin-top:16px;">
            <p style="margin:0;font-size:13px;line-height:1.65;color:#4b5563;">Quick tip: Start with a short URL for your most shared link, then generate a QR for offline sharing and print use.</p>
          </div>
        </div>

        <div class="z-email-section" style="padding:18px 24px;border-top:1px solid #e5e7eb;background:#f8fbff;">
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
        </div>
      </div>
    </div>
  </div>`;
}

function getRequestIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || "unknown";
}

async function logOtpAudit({ req, email, eventType, metadata = {} }) {
  try {
    await OtpAudit.create({
      email,
      eventType,
      requestIp: getRequestIp(req),
      userAgent: req.get("User-Agent") || "unknown",
      metadata,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("OTP audit logging error:", error);
  }
}

async function sendOtpEmail({ email, name, otp }) {
  if (!BREVO_API_KEY || !EMAIL_FROM) {
    throw new Error("Brevo is not configured. Set BREVO_API_KEY and BREVO_FROM_EMAIL.");
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
    subject: `Your ${APP_NAME} verification OTP`,
    htmlContent: buildOtpEmailHtml(name, otp),
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
    const statusCode = error?.response?.status || error?.code;
    const responseBody = error?.response?.body;
    const responseData = error?.response?.data;
    const responseMessage = responseData?.message || responseData?.code || error?.message || "unknown-error";

    console.error("Brevo send failed:", {
      statusCode,
      responseMessage,
    });

    if (statusCode === 401) {
      const authError = new Error("Email service authentication failed. Please update Brevo API credentials.");
      authError.code = "BREVO_AUTH_FAILED";
      authError.details = responseData || responseBody;
      throw authError;
    }

    if (statusCode === 402 || statusCode === 429 || /credit|quota|limit/i.test(responseMessage)) {
      const creditsError = new Error("Email sending limit reached on Brevo.");
      creditsError.code = "BREVO_CREDITS_EXCEEDED";
      creditsError.details = responseData || responseBody;
      throw creditsError;
    }

    const deliveryError = new Error("Unable to send verification email right now.");
    deliveryError.code = "OTP_EMAIL_DELIVERY_FAILED";
    throw deliveryError;
  }
}

async function sendAccountValidatedEmail({ email, name }) {
  if (!BREVO_API_KEY || !EMAIL_FROM) {
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
    subject: `Your ${APP_NAME} account is validated!`,
    htmlContent: buildAccountValidatedEmailHtml(name),
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
    const statusCode = error?.response?.status || error?.code;
    const responseData = error?.response?.data;
    const responseMessage = responseData?.message || responseData?.code || error?.message || "unknown-error";

    console.error("Account validated email send failed:", {
      statusCode,
      responseMessage,
    });
  }
}

function getSignupRenderError(error) {
  if (error?.code === "BREVO_AUTH_FAILED") {
    return "Email service is temporarily unavailable. Please try again in a few minutes.";
  }

  if (error?.code === "BREVO_CREDITS_EXCEEDED") {
    return "Email service has reached its sending limit. Please try again later.";
  }

  if (error?.code === "OTP_EMAIL_DELIVERY_FAILED") {
    return "Could not send OTP email right now. Please try again shortly.";
  }

  return "Something went wrong. Please try again.";
}

function setPendingSignupCookie(res, pendingSignup) {
  const token = jwt.sign(
    {
      pendingId: pendingSignup._id.toString(),
      email: pendingSignup.email,
    },
    OTP_SESSION_SECRET,
    { expiresIn: "30m" }
  );

  res.cookie(PENDING_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 60 * 1000,
  });
}

function clearPendingSignupCookie(res) {
  res.clearCookie(PENDING_COOKIE_NAME);
}

function getPendingPayload(req) {
  const token = req.cookies?.[PENDING_COOKIE_NAME];
  if (!token || !OTP_SESSION_SECRET) {
    return null;
  }

  try {
    return jwt.verify(token, OTP_SESSION_SECRET);
  } catch (error) {
    return null;
  }
}

async function getPendingSignupFromRequest(req) {
  const payload = getPendingPayload(req);
  if (!payload?.pendingId || !payload?.email) {
    return null;
  }

  const pendingSignup = await PendingSignup.findOne({
    _id: payload.pendingId,
    email: payload.email,
  });

  return pendingSignup;
}

async function renderVerifyEmailPage(req, res, options = {}) {
  const pendingSignup = await getPendingSignupFromRequest(req);

  if (!pendingSignup) {
    clearPendingSignupCookie(res);
    return res.redirect("/signup");
  }

  return res.render("verifyEmail", {
    user: null,
    error: options.error,
    success: options.success,
    formData: {
      otp: options.otp || "",
    },
    emailMasked: maskEmail(pendingSignup.email),
  });
}

async function handleUserSignup(req, res) {
  const { name, email, password, confirmPassword } = req.body;
  const trimmedName = (name || "").trim();
  const trimmedEmail = (email || "").trim().toLowerCase();

  try {
    const validationErrors = [];

    if (!trimmedName) {
      validationErrors.push("Name is required.");
    }

    if (!trimmedEmail) {
      validationErrors.push("Email is required.");
    } else if (!isValidEmail(trimmedEmail)) {
      validationErrors.push("Invalid email format.");
    }

    if (!password || password.length < 4) {
      validationErrors.push("Password must be at least 4 characters long.");
    }

    if (password !== confirmPassword) {
      validationErrors.push("Password not matched.");
    }

    if (validationErrors.length > 0) {
      return res.render("signup", {
        error: validationErrors[0],
        errors: validationErrors,
        formData: {
          name: trimmedName,
          email: trimmedEmail,
        },
        user: null,
      });
    }

    const existingUser = await User.findOne({ email: trimmedEmail });

    if (existingUser) {
      return res.render("signup", {
        error: "Email already exists. Try logging in.",
        errors: ["Email already exists. Try logging in."],
        formData: {
          name: trimmedName,
          email: trimmedEmail,
        },
        user: null,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtpCode();
    const otpHash = await bcrypt.hash(otp, 10);
    const now = new Date();
    const otpExpiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);
    const resendAvailableAt = new Date(now.getTime() + OTP_RESEND_GAP_MS);
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

    const pendingSignup = await PendingSignup.findOneAndUpdate(
      { email: trimmedEmail },
      {
        $set: {
          name: trimmedName,
          email: trimmedEmail,
          passwordHash: hashedPassword,
          otpHash,
          otpExpiresAt,
          resendAvailableAt,
          lastOtpSentAt: now,
          failedAttempts: 0,
          lockedUntil: null,
          lockReason: "",
          expiresAt,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    await sendOtpEmail({
      email: trimmedEmail,
      name: trimmedName,
      otp,
    });

    await logOtpAudit({
      req,
      email: trimmedEmail,
      eventType: "OTP_SENT",
      metadata: {
        reason: "signup",
      },
    });

    setPendingSignupCookie(res, pendingSignup);
    return res.redirect("/verify-email");
  } catch (error) {
    console.error("Signup error:", error?.message || error);
    return res.status(500).render("signup", {
      error: getSignupRenderError(error),
      errors: [getSignupRenderError(error)],
      formData: {
        name: trimmedName,
        email: trimmedEmail,
      },
      user: null,
    });
  }
}

async function handleUserLogin(req, res) {
  const { email, password } = req.body;
  const trimmedEmail = (email || "").trim().toLowerCase();

  try {
    if (!trimmedEmail || !password) {
      return res.render("login", {
        error: "Email and password are required.",
        errors: ["Email and password are required."],
        formData: {
          email: trimmedEmail,
        },
        user: null,
      });
    }

    if (!isValidEmail(trimmedEmail)) {
      return res.render("login", {
        error: "Invalid email format.",
        errors: ["Invalid email format."],
        formData: {
          email: trimmedEmail,
        },
        user: null,
      });
    }

    const user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      const pendingSignup = await PendingSignup.findOne({ email: trimmedEmail }).select("_id");

      if (pendingSignup) {
        return res.render("login", {
          error: "Signup is pending. Please verify your email first.",
          errors: ["Signup is pending. Please verify your email first."],
          formData: {
            email: trimmedEmail,
          },
          user: null,
        });
      }

      return res.render("login", {
        error: "Email not found. Please sign up first.",
        errors: ["Email not found. Please sign up first."],
        formData: {
          email: trimmedEmail,
        },
        user: null,
      });
    }

    let isPasswordValid = false;

    if (user.password && user.password.startsWith("$2")) {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      isPasswordValid = user.password === password;

      if (isPasswordValid) {
        user.password = await bcrypt.hash(password, 10);
        await user.save();
      }
    }

    if (!isPasswordValid) {
      return res.render("login", {
        error: "Invalid password.",
        errors: ["Invalid password."],
        formData: {
          email: trimmedEmail,
        },
        user: null,
      });
    }

    const token = setUser(user);
    res.cookie("token", token);
    return res.redirect("/");
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).render("login", {
      error: "Something went wrong. Please try again.",
      user: null,
    });
  }
}

async function handleVerifyEmailPage(req, res) {
  if (req.user) {
    return res.redirect("/");
  }

  return renderVerifyEmailPage(req, res);
}

async function handleVerifyEmailOtp(req, res) {
  const otpInput = (req.body?.otp || "").trim();

  try {
    if (!/^\d{6}$/.test(otpInput)) {
      return renderVerifyEmailPage(req, res, {
        error: "Please enter a valid 6-digit OTP.",
        otp: otpInput,
      });
    }

    const pendingSignup = await getPendingSignupFromRequest(req);
    if (!pendingSignup) {
      clearPendingSignupCookie(res);
      return res.redirect("/signup");
    }

    if (pendingSignup.lockedUntil && Date.now() < new Date(pendingSignup.lockedUntil).getTime()) {
      const secondsLeft = Math.ceil((new Date(pendingSignup.lockedUntil).getTime() - Date.now()) / 1000);

      await logOtpAudit({
        req,
        email: pendingSignup.email,
        eventType: "OTP_VERIFY_LOCKED",
        metadata: {
          secondsLeft,
          lockReason: pendingSignup.lockReason || "too_many_attempts",
        },
      });

      return renderVerifyEmailPage(req, res, {
        error: `Too many incorrect attempts. Try again in ${secondsLeft}s.`,
      });
    }

    if (pendingSignup.lockedUntil && Date.now() >= new Date(pendingSignup.lockedUntil).getTime()) {
      pendingSignup.lockedUntil = null;
      pendingSignup.lockReason = "";
      pendingSignup.failedAttempts = 0;
      await pendingSignup.save();
    }

    const now = Date.now();
    if (now > new Date(pendingSignup.otpExpiresAt).getTime()) {
      await logOtpAudit({
        req,
        email: pendingSignup.email,
        eventType: "OTP_VERIFY_EXPIRED",
      });

      return renderVerifyEmailPage(req, res, {
        error: "OTP has expired. Please sign up again to get a new OTP.",
      });
    }

    if (pendingSignup.failedAttempts >= OTP_ATTEMPT_LIMIT) {
      pendingSignup.lockedUntil = new Date(Date.now() + OTP_LOCKOUT_MS);
      pendingSignup.lockReason = "too_many_attempts";
      await pendingSignup.save();

      await logOtpAudit({
        req,
        email: pendingSignup.email,
        eventType: "OTP_VERIFY_LOCKED",
        metadata: {
          attemptLimit: OTP_ATTEMPT_LIMIT,
          lockMinutes: Math.round(OTP_LOCKOUT_MS / 60000),
        },
      });

      return renderVerifyEmailPage(req, res, {
        error: "Too many failed attempts. Please wait and try again.",
      });
    }

    const isOtpValid = await bcrypt.compare(otpInput, pendingSignup.otpHash);
    if (!isOtpValid) {
      pendingSignup.failedAttempts += 1;

      if (pendingSignup.failedAttempts >= OTP_ATTEMPT_LIMIT) {
        pendingSignup.lockedUntil = new Date(Date.now() + OTP_LOCKOUT_MS);
        pendingSignup.lockReason = "too_many_attempts";
      }

      await pendingSignup.save();

      await logOtpAudit({
        req,
        email: pendingSignup.email,
        eventType: "OTP_VERIFY_FAILED",
        metadata: {
          failedAttempts: pendingSignup.failedAttempts,
          attemptLimit: OTP_ATTEMPT_LIMIT,
        },
      });

      return renderVerifyEmailPage(req, res, {
        error:
          pendingSignup.failedAttempts >= OTP_ATTEMPT_LIMIT
            ? "Invalid OTP. Account is temporarily locked due to too many failed attempts."
            : "Invalid OTP. Please try again.",
        otp: otpInput,
      });
    }

    await logOtpAudit({
      req,
      email: pendingSignup.email,
      eventType: "OTP_VERIFY_SUCCESS",
    });

    const existingUser = await User.findOne({ email: pendingSignup.email }).select("_id");
    if (existingUser) {
      await PendingSignup.deleteOne({ _id: pendingSignup._id });
      clearPendingSignupCookie(res);

      return res.render("login", {
        error: "Email already verified. Please log in.",
        errors: ["Email already verified. Please log in."],
        formData: {
          email: pendingSignup.email,
        },
        user: null,
      });
    }

    const createdUser = await User.create({
      name: pendingSignup.name,
      email: pendingSignup.email,
      password: pendingSignup.passwordHash,
    });

    void sendAccountValidatedEmail({
      email: createdUser.email,
      name: createdUser.name,
    });

    await PendingSignup.deleteOne({ _id: pendingSignup._id });
    clearPendingSignupCookie(res);

    const token = setUser(createdUser);
    res.cookie("token", token);
    return res.redirect("/");
  } catch (error) {
    console.error("OTP verify error:", error);
    return renderVerifyEmailPage(req, res, {
      error: "Could not verify OTP right now. Please try again.",
      otp: otpInput,
    });
  }
}


module.exports = {
  handleUserSignup,
  handleUserLogin,
  handleVerifyEmailPage,
  handleVerifyEmailOtp,
};
