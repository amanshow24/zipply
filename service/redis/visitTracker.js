const crypto = require("crypto");

const { getRedisClient } = require("./client");

const VISIT_DEDUP_PREFIX = "zipply:visit-dedup:";
const VISIT_DEDUP_TTL_SECONDS = 2;

function getVisitDedupKey(shortId, userAgent) {
  const agentHash = crypto.createHash("sha1").update(userAgent || "Unknown").digest("hex");
  return `${VISIT_DEDUP_PREFIX}${shortId}:${agentHash}`;
}

async function shouldTrackVisit(shortId, userAgent) {
  const redis = getRedisClient();
  if (!redis || !shortId) {
    return true;
  }

  const dedupKey = getVisitDedupKey(shortId, userAgent);

  try {
    const claimed = await redis.set(dedupKey, "1", { nx: true, ex: VISIT_DEDUP_TTL_SECONDS });
    return Boolean(claimed);
  } catch (_error) {
    return true;
  }
}

module.exports = {
  VISIT_DEDUP_TTL_SECONDS,
  getVisitDedupKey,
  shouldTrackVisit,
};