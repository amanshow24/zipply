const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET;

function getTokenExpiresInSeconds() {
  const days = Number(process.env.AUTH_TOKEN_TTL_DAYS || 7);
  return Math.max(1, days) * 24 * 60 * 60;
}

function getTokenCookieOptions() {
  const maxAgeDays = Number(process.env.AUTH_COOKIE_MAX_AGE_DAYS || 7);
  const maxAgeMs = Math.max(1, maxAgeDays) * 24 * 60 * 60 * 1000;

  return {
    httpOnly: true,
    path: "/",
    maxAge: maxAgeMs,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}

function setUser(user) {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      subscription: user.subscription || undefined,
    },
    SECRET_KEY,
    { expiresIn: getTokenExpiresInSeconds() }
  );
}

function getUser(token) {
  if (!token) return null;

  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    return null;
  }
}

module.exports = {
  setUser,
  getUser,
  getTokenCookieOptions,
};
