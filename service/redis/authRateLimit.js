const { getRedisClient } = require("./client");

const AUTH_RATE_LIMIT_WINDOW_SECONDS = 10 * 60;

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return req.ip || req.connection?.remoteAddress || "unknown-ip";
}

function createAuthPageRateLimiter({
  keyPrefix,
  maxRequests,
  viewName,
  message,
  formDataBuilder,
}) {
  return async function authPageRateLimitMiddleware(req, res, next) {
    const redis = getRedisClient();
    if (!redis) {
      return next();
    }

    const ip = getClientIp(req);
    const key = `${keyPrefix}:${ip}`;

    try {
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, AUTH_RATE_LIMIT_WINDOW_SECONDS);
      }

      const retryAfterSeconds = AUTH_RATE_LIMIT_WINDOW_SECONDS;
      res.setHeader("Retry-After", String(retryAfterSeconds));

      if (count > maxRequests) {
        const formData = typeof formDataBuilder === "function" ? formDataBuilder(req) : {};

        if (req.accepts("html")) {
          return res.status(429).render(viewName, {
            error: message,
            errors: [message],
            formData,
            user: null,
          });
        }

        return res.status(429).json({
          error: message,
        });
      }

      return next();
    } catch (_error) {
      return next();
    }
  };
}

const loginRateLimit = createAuthPageRateLimiter({
  keyPrefix: "zipply:rate:login",
  maxRequests: 5,
  viewName: "login",
  message: "Too many login attempts. Please wait 10 minutes and try again.",
  formDataBuilder: (req) => ({
    email: (req.body?.email || "").trim().toLowerCase(),
  }),
});

const signupRateLimit = createAuthPageRateLimiter({
  keyPrefix: "zipply:rate:signup",
  maxRequests: 3,
  viewName: "signup",
  message: "Too many signup attempts. Please wait 10 minutes and try again.",
  formDataBuilder: (req) => ({
    name: (req.body?.name || "").trim(),
    email: (req.body?.email || "").trim().toLowerCase(),
  }),
});

module.exports = {
  AUTH_RATE_LIMIT_WINDOW_SECONDS,
  createAuthPageRateLimiter,
  loginRateLimit,
  signupRateLimit,
};