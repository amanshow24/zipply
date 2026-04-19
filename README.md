# 🔗 Zipply - URL Shortener & QR Code Generator

Zipply is a full-featured URL shortener and QR code generator web app. It allows users to create short custom links and QR codes, view analytics, and manage their shortened URLs — all in a clean, responsive UI.

---

## 🚀 Features

- 🔐 User authentication (Sign up / Login / Logout)
- 🔗 Shorten URLs with optional custom aliases
- 🕓 Expiry time support for shortened links
- 📈 Analytics dashboard with visit history
- 📷 QR Code generator for any URL
- 📬 Download/Delete QR Code feature
- 🧹 Clean, responsive UI with Bootstrap & custom CSS

---

## 🧰 Tech Stack

- **Frontend:** HTML, CSS, JavaScript, EJS, Bootstrap
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas with Mongoose
- **QR Generation:** `qrcode` npm package
- **Authentication:** Sessions,

---
## 📸 App Link
- Wanna visit the app .. here it is, [Zipply](https://zipply.onrender.com)

---

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/zipply.git
cd zipply
````

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Environment Variables

Create a `.env` file in the root directory:

```env
PORT=8010
MONGODB_URI=your_mongodb_connection_string
SECRET=your_jwt_secret
OTP_SESSION_SECRET=optional_separate_secret_for_signup_otp
BREVO_API_KEY=your_brevo_api_key
BREVO_FROM_EMAIL=no-reply@yourdomain.com
FROM_EMAIL=no-reply@yourdomain.com
APP_NAME=Zipply
APP_URL=https://yourdomain.com
BRAND_LOGO_URL=https://yourdomain.com/assets/logo.png
LEGAL_COMPANY_NAME=Your Company Name
LEGAL_COMPANY_ADDRESS=Your registered business address
OTP_ATTEMPT_LIMIT=5
OTP_LOCKOUT_MS=600000
```

### 4. Start the Server

```bash
npm start
```

The server will start at [http://localhost:8010](http://localhost:8010)

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome!
Feel free to check the [issues page](https://github.com/your-username/zipply/issues).

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

## 🙌 Acknowledgements
* [QRCode NPM](https://www.npmjs.com/package/qrcode)
* [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
* [Bootstrap](https://getbootstrap.com/)

---

> Built with ❤️ by [Aman Show](https://github.com/amanshow24/)

---

## Email OTP Verification Flow

- Signup now creates a pending registration first.
- A 6-digit OTP is emailed and valid for 5 minutes.
- OTP is stored as a hash in DB and can be used only once.
- User account is created only after successful OTP verification.
- OTP attempts support temporary lockout after configurable failed attempts.
- OTP events are stored in audit logs for security tracing.
