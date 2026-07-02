# Redis Service Guide

This folder keeps the Redis implementation isolated from the route handlers so the cache behavior is easy to review and change later.

Redis is used as a read-through cache for public short URLs, public QR resolvers, and a small dedupe helper for visit tracking.

## What This Folder Does

- Caches public short URL lookups.
- Caches public QR resolver lookups.
- Stores redirect target, expiry metadata, QR text, and QR data type.
- Auto-expires cached entries with TTL.
- Invalidates cache entries when a URL or QR entry is deleted.
- Primes the cache when new data is created.
- Reduces repeated analytics writes with a short duplicate-hit window.

## Files

### `client.js`

- Creates the Upstash Redis client.
- Only initializes Redis when both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` exist.
- Returns `null` if Redis is not configured, so the app can fall back to MongoDB.

### `shortUrlCache.js`

- Stores and reads short URL cache payloads.
- Deletes cached short URLs.
- Uses a fixed TTL, with expiry-aware shortening when needed.

### `qrCache.js`

- Stores and reads QR resolver cache payloads.
- Deletes cached QR resolver entries.
- Uses the same TTL policy as short URL cache entries.

### `visitTracker.js`

- Keeps a short dedupe key for repeated hits.
- Prevents rapid duplicate analytics writes from the same short URL and user-agent.
- Uses a 2 second lock window.

### `index.js`

- Re-exports the Redis helpers used by the app.

## Environment Variables

Add these values to `.env`:

```env
UPSTASH_REDIS_REST_URL=https://your-upstash-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-secret-token
```

Use the REST values from the Upstash Connect section.

## Cache Rules

- MongoDB remains the source of truth.
- Redis stores only what the public fetch path needs.
- Short URL cache entries store `shortId`, `redirectURL`, and `expiryDate`.
- QR cache entries store `resolverId`, `text`, and `dataType`.
- Default TTL is 24 hours.
- If a URL expires earlier in MongoDB, Redis uses the shorter remaining lifetime.
- Short URL and QR cache entries are deleted immediately on manual delete.

## Workflow

### Short URL

1. MongoDB saves the record.
2. Redis stores the redirect payload.
3. Public fetch checks Redis first.
4. On a miss, MongoDB is queried and Redis is repopulated.
5. Expired or deleted URLs do not redirect.

### QR

1. MongoDB saves the QR record.
2. Redis stores the QR resolver payload.
3. Public fetch checks Redis first.
4. On a miss, MongoDB is queried and Redis is repopulated.
5. The QR record stays in MongoDB until the user deletes it.

### Visit Tracking

1. A short Redis dedupe key is created for non-bot traffic.
2. Repeated hits within 2 seconds skip the MongoDB analytics write.
3. If the dedupe key is missing or expired, the visit is written to MongoDB.

## Important Edge Cases

- If Redis is unavailable, the app falls back to MongoDB.
- If a cache read fails, the request still completes.
- If a cache write fails, the redirect still works.
- If a short URL or QR is deleted, the Redis key is removed too.
- If a Redis key expires, the next fetch repopulates it from MongoDB.
- Redis expiry does not delete the MongoDB record.

## Quick Mental Model

- MongoDB = truth
- Redis = speed
- TTL = cleanup
- Invalidation = correctness
- Dedupe = fewer analytics writes