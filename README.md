Zipply

A production-style URL Shortener and QR Code platform built with Node.js, Express, MongoDB, and EJS.

Zipply allows users to sign up with OTP email verification, create short links with optional custom aliases and expiry, generate shareable QR codes, view usage analytics, and upgrade subscription plans using Razorpay.

--------------------------------------------------------------------------------
LIVE DEMO
--------------------------------------------------------------------------------
https://zipply.onrender.com

--------------------------------------------------------------------------------
KEY FEATURES
--------------------------------------------------------------------------------
- Authentication and access control
- Email OTP signup verification with Brevo
- Secure login/logout using JWT cookie auth
- URL shortening with optional custom alias
- Link expiry support (IST day-end based)
- Redirect analytics with visit history and user agent capture
- QR code generation for both URLs and plain text
- Public QR resolver route for scanning behavior
- Plan-based daily usage limits
- Billing with Razorpay order creation and signature verification
- Subscription lifecycle (Free, Pro, Plus) with automatic expiry fallback
- Mobile responsive UI across dashboard and all main pages
- Security hardening with Helmet CSP and MongoDB sanitization

--------------------------------------------------------------------------------
TECH STACK
--------------------------------------------------------------------------------
- Backend: Node.js, Express.js
- Frontend: EJS, HTML, CSS, Bootstrap
- Database: MongoDB Atlas with Mongoose
- Auth: JWT + HTTP-only cookies
- Payments: Razorpay
- Email: Brevo SMTP API (via HTTP API)
- QR Engine: qrcode
- Utilities: axios, bcryptjs, shortid, uuid

--------------------------------------------------------------------------------
CURRENT PLAN LIMITS
--------------------------------------------------------------------------------
- Free (NORMAL): 3 short URLs/day, 2 QR/day
- Pro (PRO): 10 short URLs/day, 10 QR/day
- Plus (PLUS): 25 short URLs/day, 25 QR/day

--------------------------------------------------------------------------------
PROJECT STRUCTURE
--------------------------------------------------------------------------------
controllers/
middlewares/
models/
public/
routes/
service/
utils/
views/
index.js
package.json

--------------------------------------------------------------------------------
ENVIRONMENT VARIABLES
--------------------------------------------------------------------------------
Create a .env file in the project root.

# Core
NODE_ENV=development
PORT=8010
AUTO_FALLBACK_PORT=false
MONGODB_URI=your_mongodb_connection_string
SECRET=your_jwt_secret

# OTP / Auth
OTP_SESSION_SECRET=optional_secondary_secret_for_pending_signup_cookie
OTP_ATTEMPT_LIMIT=5
OTP_LOCKOUT_MS=600000

# Email (Brevo)
BREVO_API_KEY=your_brevo_api_key
BREVO_FROM_EMAIL=no-reply@yourdomain.com
FROM_EMAIL=no-reply@yourdomain.com
SENDGRID_FROM_EMAIL=

# Payments (Razorpay)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxxxxx
RAZORPAY_CURRENCY=INR
RAZORPAY_PRO_MONTHLY_PAISE=19900
RAZORPAY_PLUS_MONTHLY_PAISE=29900

# Branding / Legal / Links
APP_NAME=Zipply
APP_URL=https://your-app-domain.com
CONTACT_EMAIL=support@yourdomain.com
BRAND_LOGO_URL=https://yourdomain.com/logo.png
LEGAL_COMPANY_NAME=Your Company Name
LEGAL_COMPANY_ADDRESS=Your Registered Address

Notes:
- On Render, do not manually set PORT unless you have a special reason.
- Set NODE_ENV=production in deployment.
- Keep all secrets private and never commit .env to GitHub.

--------------------------------------------------------------------------------
LOCAL SETUP
--------------------------------------------------------------------------------
1) Clone repository
   git clone https://github.com/your-username/zipply.git
   cd zipply

2) Install dependencies
   npm install

3) Configure .env (see section above)

4) Start server
   npm run dev
   or
   npm start

--------------------------------------------------------------------------------
SCRIPTS
--------------------------------------------------------------------------------
npm start    -> Runs node index.js
npm run dev  -> Runs nodemon index.js

--------------------------------------------------------------------------------
MAIN ROUTES
--------------------------------------------------------------------------------
Web Pages
- GET / : Dashboard (authenticated)
- GET /short-url : URL management page
- GET /qr : QR page
- GET /billing : Billing page
- GET /view/:shortId : URL detail/analytics view
- GET /signup
- GET /login
- GET /verify-email
- GET /about
- GET /team
- GET /faq
- GET /support
- GET /terms
- GET /privacy

URL APIs
- POST /url : Create short URL
- GET /url/analytics/:shortId : Get link analytics
- POST /url/delete/:id : Delete URL
- GET /url/:shortId : Redirect endpoint

Auth APIs
- POST /user : Signup + send OTP
- POST /user/login : Login
- POST /user/verify-email : Verify OTP
- GET /user/logout : Logout

Payment APIs
- POST /payment/create-order : Create Razorpay order
- POST /payment/verify : Verify Razorpay payment and activate plan

QR APIs
- POST /qr : Generate QR
- POST /qr/delete/:id : Delete QR
- GET /qr/r/:resolverId : Public resolver (redirect URL or render text)

Health Check
- GET /health : Returns OK

--------------------------------------------------------------------------------
SECURITY HIGHLIGHTS
--------------------------------------------------------------------------------
- Helmet with explicit CSP directives
- express-mongo-sanitize against operator injection
- Password hashing with bcrypt
- OTP stored as hash in database
- OTP audit logging
- HTTP-only cookie for session token
- Subscription expiry enforcement on auth/load paths

--------------------------------------------------------------------------------
DEPLOYMENT (RENDER)
--------------------------------------------------------------------------------
1) Create a new Web Service from your GitHub repo
2) Build command: npm install
3) Start command: npm start
4) Add all required environment variables in Render dashboard
5) Set NODE_ENV=production
6) Deploy

Recommended:
- Add a persistent MongoDB Atlas network allowlist setup
- Keep Razorpay test keys in staging, live keys in production

--------------------------------------------------------------------------------
KNOWN IMPROVEMENTS (NEXT)
--------------------------------------------------------------------------------
- Add automated tests (unit + integration)
- Add centralized startup env validation
- Add API rate limiting for login and payment endpoints
- Add CI workflow for lint/test/deploy checks

--------------------------------------------------------------------------------
LICENSE
--------------------------------------------------------------------------------
ISC

--------------------------------------------------------------------------------
AUTHOR
--------------------------------------------------------------------------------
Aman Show
GitHub: https://github.com/amanshow24
