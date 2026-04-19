const WINDOW_MS = 60 * 1000;

const buckets = new Map();

function cleanupBucket(key, now) {
  const current = buckets.get(key);
  if (!current) {
    return;
  }

  if (now >= current.resetAt) {
    buckets.delete(key);
  }
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return req.ip || req.connection?.remoteAddress || "unknown-ip";
}

function createRateLimiter({ keyPrefix, maxRequests, message, windowMs = WINDOW_MS }) {
  return function otpRateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const ip = getClientIp(req);
    const key = `${keyPrefix}:${ip}`;

    cleanupBucket(key, now);

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        count: 0,
        resetAt: now + windowMs,
      };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));

    if (bucket.count > maxRequests) {
      if (req.accepts("html")) {
        return res.status(429).render("login", {
          error: message,
          errors: [message],
          formData: {
            email: (req.body?.email || "").trim().toLowerCase(),
          },
          user: null,
        });
      }

      return res.status(429).json({
        error: message,
      });
    }

    return next();
  };
}

const signupRateLimit = createRateLimiter({
  keyPrefix: "signup",
  maxRequests: 5,
  message: "Too many signup attempts. Please wait a minute and try again.",
});

const verifyOtpRateLimit = createRateLimiter({
  keyPrefix: "verify-otp",
  maxRequests: 10,
  message: "Too many OTP verification attempts. Please wait a minute and try again.",
});

module.exports = {
  signupRateLimit,
  verifyOtpRateLimit,
};
