# Zipply

Zipply is a full-stack URL shortener and QR code platform built with Node.js, Express, MongoDB, and EJS. It supports short link creation, QR generation, authentication, analytics, billing, plan-based usage limits, Rate limiting and Redis-backed caching for fast lookups.

Live demo: https://zipply.onrender.com/

## Features

- JWT-based authentication with protected routes
- Persistent login sessions (until logout or cookie expiry)
- Email OTP signup flow with pending account verification
- Short URL creation with optional custom aliases and expiry dates
- Redirect analytics with visit history tracking
- QR code generation for URLs and plain text
- Billing flow with Razorpay test-mode integration
- Subscription plans with daily usage limits
- Redis read-through cache for public short URL and QR resolution
- Redis-backed rate limiting for login and signup pages
- Rate limits are applied per client IP address
- Security middleware with Helmet and Mongo sanitation

## Tech Stack

### Frontend

- EJS
- HTML5
- CSS3
- Vanilla JavaScript
- Bootstrap assets

### Backend

- Node.js
- Express.js
- MongoDB + Mongoose

### Services and Libraries

- Razorpay
- Brevo
- Upstash Redis
- qrcode
- bcryptjs
- jsonwebtoken
- cookie-parser
- helmet
- express-mongo-sanitize
- axios
- shortid
- uuid

## Redis Cache

Redis is used as a read-through cache for public short URL redirects and QR resolver fetches.

Required environment variables:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Cache behavior:

- MongoDB remains the source of truth.
- Redis stores redirect target and expiry metadata.
- Redis also stores QR resolver payloads.
- Redis also stores short-lived login and signup rate-limit counters.
- Rate-limit counters are keyed by client IP address.
- Rate-limit counters expire automatically after 10 minutes.
- TTL is used to avoid keeping cold keys forever.

### 3. Configure environment variables

Create a `.env` file in the project root.

```env
PORT=8010
MONGODB_URI=your_mongodb_connection_string
SECRET=your_jwt_secret

OTP_SESSION_SECRET=optional_secondary_secret
OTP_ATTEMPT_LIMIT=5
OTP_LOCKOUT_MS=600000

BREVO_API_KEY=your_brevo_api_key
BREVO_FROM_EMAIL=your_verified_sender_email
FROM_EMAIL=your_verified_sender_email

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Optional auth session settings
AUTH_TOKEN_TTL_DAYS=7
AUTH_COOKIE_MAX_AGE_DAYS=7
```

## Plan Limits

- NORMAL: 3 short URLs/day, 2 QR/day
- PRO: 10 short URLs/day, 10 QR/day
- PLUS: 25 short URLs/day, 25 QR/day

## Project Structure

- `index.js` - app entry point
- `routes/` - route definitions
- `controllers/` - request handlers
- `models/` - Mongoose schemas
- `middlewares/` - authentication and rate-limiting middleware
- `service/` - reusable service modules, including Redis and auth helpers
- `utils/` - time and subscription helpers
- `views/` - EJS templates
- `public/` - static assets

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push your branch
5. Open a pull request

## License

ISC, as declared in `package.json`.

## Author

Aman Show

GitHub: https://github.com/amanshow24