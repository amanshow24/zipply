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
SESSION_SECRET=your_session_secret
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
