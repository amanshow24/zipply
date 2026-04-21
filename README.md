# Zipply

Zipply is a full-stack URL shortener and QR code platform where users can create short links, generate QR codes, track link activity, and manage plan-based usage. It is built with Node.js, Express, MongoDB, and EJS, with a responsive UI for desktop and mobile.

## Live Demo

https://zipply.onrender.com/

## Features

- User authentication with JWT-based session cookie
- Signup with email OTP verification using Brevo
- Login and logout flow with protected routes
- Create short URLs with optional custom alias
- Expiry date support for shortened links
- Redirect analytics with visit history and user agent tracking
- QR code generation for URL and plain text input
- Public QR resolver route for scan behavior
- Delete created short URLs and QR entries
- Billing page with Razorpay payment order and verification
- Subscription plans: NORMAL, PRO, PLUS
- Daily usage limits enforced per plan
- Auto fallback to free plan when paid subscription expires
- Static pages: About, Team, FAQ, Support, Terms, Privacy
- Security middleware:
   - Helmet (with CSP)
   - Express Mongo Sanitize

## Tech Stack

Frontend
- EJS templates
- HTML5
- CSS3
- Vanilla JavaScript
- Bootstrap assets

Backend
- Node.js
- Express.js
- MongoDB + Mongoose

Services and Libraries
- Razorpay for payment processing
- Brevo API for OTP, account validation, and subscription confirmation emails
- qrcode for QR image generation
- bcryptjs for password hashing
- jsonwebtoken for auth token creation/verification
- cookie-parser, helmet, express-mongo-sanitize, axios, shortid, uuid

## Project Structure

- index.js
- routes/
   - url.js
   - user.js
   - payment.js
   - qrRouter.js
   - staticRouter.js
   - static.js
- controllers/
   - url.js
   - user.js
   - payment.js
- models/
   - user.js
   - url.js
   - qr.js
   - payment.js
   - pendingSignup.js
   - otpAudit.js
- middlewares/
   - auth.js
   - rateLimit/authOtp.js
- service/
   - auth.js
- utils/
   - istTime.js
   - subscription.js
- views/
- public/

## Environment Variables

Create a .env file in the project root and add:

PORT=8010
AUTO_FALLBACK_PORT=false
NODE_ENV=development

MONGODB_URI=your_mongodb_connection_string
SECRET=your_jwt_secret

OTP_SESSION_SECRET=optional_secondary_secret
OTP_ATTEMPT_LIMIT=5
OTP_LOCKOUT_MS=600000

BREVO_API_KEY=your_brevo_api_key
BREVO_FROM_EMAIL=your_verified_sender_email
FROM_EMAIL=your_verified_sender_email
SENDGRID_FROM_EMAIL=

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_CURRENCY=INR
RAZORPAY_PRO_MONTHLY_PAISE=19900
RAZORPAY_PLUS_MONTHLY_PAISE=29900

APP_NAME=Zipply
APP_URL=https://your-domain.com
CONTACT_EMAIL=your_support_email
BRAND_LOGO_URL=https://your-domain.com/logo.png
LEGAL_COMPANY_NAME=your_company_name
LEGAL_COMPANY_ADDRESS=your_company_address

## Getting Started

1. Clone the repository
    git clone https://github.com/amanshow24/zipply.git

2. Move into the project folder
    cd zipply

3. Install dependencies
    npm install

4. Add your environment variables in .env

5. Start the app
    npm start

For development with auto-restart:

npm run dev

App runs at:

http://localhost:8010

## Plan Limits

- NORMAL: 3 short URLs/day, 2 QR/day
- PRO: 10 short URLs/day, 10 QR/day
- PLUS: 25 short URLs/day, 25 QR/day

## Main Routes

Web routes
- GET /
- GET /short-url
- GET /view/:shortId
- GET /qr
- GET /billing
- GET /signup
- GET /login
- GET /verify-email
- GET /about
- GET /team
- GET /faq
- GET /support
- GET /terms
- GET /privacy

URL routes
- POST /url
- GET /url/analytics/:shortId
- POST /url/delete/:id
- GET /url/:shortId

User routes
- POST /user
- POST /user/login
- POST /user/verify-email
- GET /user/logout

Payment routes
- POST /payment/create-order
- POST /payment/verify

QR routes
- GET /qr
- POST /qr
- GET /qr/r/:resolverId
- POST /qr/delete/:id

Health route
- GET /health

## Authentication Notes

- Auth token is stored in a cookie named token.
- Signup creates a pending account first and sends a 6-digit OTP by email.
- OTP is hashed, time-limited, and protected by failed-attempt lockout.
- Account is created only after successful OTP verification.

## Scripts

- npm start: run production server
- npm run dev: run with nodemon

## Deployment

The app is deployed on Render. For deployment:

- Set all required environment variables in your hosting provider
- Set NODE_ENV=production
- Do not set PORT manually on Render unless required
- Ensure MongoDB Atlas network access is configured
- Ensure Brevo sender identity and API key are valid
- Ensure Razorpay credentials are valid for your environment

## Contributing

1. Fork this repository
2. Create a feature branch
3. Commit your changes
4. Push your branch
5. Open a pull request

## License

This project is currently marked as ISC in package.json.

## Author

Aman Show
https://github.com/amanshow24
