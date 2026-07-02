const { Redis } = require("@upstash/redis");

let redisClient = null;

function hasRedisConfig() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function getRedisClient() {
  if (!hasRedisConfig()) {
    return null;
  }

  if (!redisClient) {
    redisClient = Redis.fromEnv();
  }

  return redisClient;
}

module.exports = {
  getRedisClient,
  hasRedisConfig,
};