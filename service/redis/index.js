const {
  deleteCachedShortUrl,
  getCachedShortUrl,
  getCacheTtlSeconds,
  getShortUrlCacheKey,
  setCachedShortUrl,
} = require("./shortUrlCache");
const {
  loginRateLimit,
  signupRateLimit,
} = require("./authRateLimit");
const {
  deleteCachedQr,
  getCachedQr,
  getQrCacheKey,
  setCachedQr,
} = require("./qrCache");
const {
  VISIT_DEDUP_TTL_SECONDS,
  getVisitDedupKey,
  shouldTrackVisit,
} = require("./visitTracker");

module.exports = {
  VISIT_DEDUP_TTL_SECONDS,
  deleteCachedShortUrl,
  deleteCachedQr,
  getCachedShortUrl,
  getCachedQr,
  getCacheTtlSeconds,
  getShortUrlCacheKey,
  getQrCacheKey,
  getVisitDedupKey,
  loginRateLimit,
  setCachedShortUrl,
  setCachedQr,
  signupRateLimit,
  shouldTrackVisit,
};