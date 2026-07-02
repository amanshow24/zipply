const { getRedisClient } = require("./client");

const SHORT_URL_CACHE_PREFIX = "zipply:short-url:";
const DEFAULT_CACHE_TTL_SECONDS = 24 * 60 * 60;

function getShortUrlCacheKey(shortId) {
  return `${SHORT_URL_CACHE_PREFIX}${shortId}`;
}

function toCachePayload(entry) {
  if (!entry) {
    return null;
  }

  return {
    shortId: entry.shortId,
    redirectURL: entry.redirectURL,
    expiryDate: entry.expiryDate ? new Date(entry.expiryDate).toISOString() : null,
  };
}

function parseCachePayload(payload) {
  if (!payload) {
    return null;
  }

  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch (_error) {
      return null;
    }
  }

  if (typeof payload === "object") {
    return payload;
  }

  return null;
}

function getCacheTtlSeconds(entry) {
  const baseTtl = DEFAULT_CACHE_TTL_SECONDS;

  if (!entry?.expiryDate) {
    return baseTtl;
  }

  const expiryMs = new Date(entry.expiryDate).getTime();
  if (Number.isNaN(expiryMs)) {
    return baseTtl;
  }

  const remainingSeconds = Math.ceil((expiryMs - Date.now()) / 1000);
  if (remainingSeconds <= 0) {
    return 0;
  }

  return Math.min(baseTtl, remainingSeconds);
}

async function getCachedShortUrl(shortId) {
  const redis = getRedisClient();
  if (!redis || !shortId) {
    return null;
  }

  try {
    const payload = await redis.get(getShortUrlCacheKey(shortId));
    return parseCachePayload(payload);
  } catch (_error) {
    return null;
  }
}

async function setCachedShortUrl(entry) {
  const redis = getRedisClient();
  if (!redis || !entry?.shortId || !entry.redirectURL) {
    return false;
  }

  const ttlSeconds = getCacheTtlSeconds(entry);
  if (ttlSeconds <= 0) {
    return false;
  }

  try {
    await redis.set(getShortUrlCacheKey(entry.shortId), JSON.stringify(toCachePayload(entry)), {
      ex: ttlSeconds,
    });
    return true;
  } catch (_error) {
    return false;
  }
}

async function deleteCachedShortUrl(shortId) {
  const redis = getRedisClient();
  if (!redis || !shortId) {
    return false;
  }

  try {
    await redis.del(getShortUrlCacheKey(shortId));
    return true;
  } catch (_error) {
    return false;
  }
}

module.exports = {
  DEFAULT_CACHE_TTL_SECONDS,
  deleteCachedShortUrl,
  getCachedShortUrl,
  getCacheTtlSeconds,
  getShortUrlCacheKey,
  parseCachePayload,
  setCachedShortUrl,
  toCachePayload,
};