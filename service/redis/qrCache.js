const { getRedisClient } = require("./client");

const QR_CACHE_PREFIX = "zipply:qr:";
const DEFAULT_CACHE_TTL_SECONDS = 24 * 60 * 60;

function getQrCacheKey(resolverId) {
  return `${QR_CACHE_PREFIX}${resolverId}`;
}

function toCachePayload(entry) {
  if (!entry) {
    return null;
  }

  return {
    resolverId: entry.resolverId,
    text: entry.text,
    dataType: entry.dataType || "text",
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

function getCacheTtlSeconds() {
  return DEFAULT_CACHE_TTL_SECONDS;
}

async function getCachedQr(resolverId) {
  const redis = getRedisClient();
  if (!redis || !resolverId) {
    return null;
  }

  try {
    const payload = await redis.get(getQrCacheKey(resolverId));
    return parseCachePayload(payload);
  } catch (_error) {
    return null;
  }
}

async function setCachedQr(entry) {
  const redis = getRedisClient();
  if (!redis || !entry?.resolverId || !entry.text) {
    return false;
  }

  try {
    await redis.set(getQrCacheKey(entry.resolverId), JSON.stringify(toCachePayload(entry)), {
      ex: getCacheTtlSeconds(),
    });
    return true;
  } catch (_error) {
    return false;
  }
}

async function deleteCachedQr(resolverId) {
  const redis = getRedisClient();
  if (!redis || !resolverId) {
    return false;
  }

  try {
    await redis.del(getQrCacheKey(resolverId));
    return true;
  } catch (_error) {
    return false;
  }
}

module.exports = {
  DEFAULT_CACHE_TTL_SECONDS,
  deleteCachedQr,
  getCachedQr,
  getCacheTtlSeconds,
  getQrCacheKey,
  parseCachePayload,
  setCachedQr,
  toCachePayload,
};