require('dotenv').config();

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");

const { restrictToLoggedinUserOnly, checkAuth, checkForAuthentication, restrictTo } = require("./middlewares/auth");

const URL = require("./models/url");
const urlRoute = require("./routes/url");
const staticRoute = require("./routes/staticRouter");
const staticPagesRoute = require("./routes/static");
const userRoute = require("./routes/user");
const qrRouter = require("./routes/qrRouter");

const app = express();

//  Securely use PORT and MongoDB URI
const PORT = process.env.PORT || 8010;
const MONGODB_URI = process.env.MONGODB_URI;

//  Connect to MongoDB Atlas securely
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB Connected to Atlas"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

//  Set view engine and middlewares
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(helmet());
app.use(mongoSanitize());
app.use(checkForAuthentication);
app.use(express.static(path.join(__dirname, "public")));

//  Routes
app.use("/url", restrictTo(["NORMAL", "ADMIN"]), urlRoute);
app.use("/user", userRoute);
app.use("/", staticRoute);
app.use("/", staticPagesRoute);
app.use("/qr", qrRouter);

//  Short URL redirect logic
app.get("/url/:shortId", async (req, res) => {
  const { shortId } = req.params;
  if (shortId === "favicon.ico") return res.status(204).end();

  const entry = await URL.findOne({ shortId });
  if (!entry) {
    return res.status(404).render("404", {
      user: req.user,
      message: "The short URL you are trying to access does not exist.",
    });
  }

  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const expiryIST = entry.expiryDate ? new Date(entry.expiryDate) : null;
  if (expiryIST && nowIST > expiryIST) {
    return res.status(410).render("404", {
      user: req.user,
      message: "This short URL has expired.",
    });
  }

  const userAgent = req.get("User-Agent") || "Unknown";
  const isBot = /bot|crawl|spider|fetch|facebookexternalhit|favicon/i.test(userAgent);

  if (!isBot) {
    const lastVisit = entry.visitHistory[entry.visitHistory.length - 1];
    const now = Date.now();
    const lastTimestamp = lastVisit ? new Date(lastVisit.timestamp).getTime() : 0;

    const isDuplicate =
      lastVisit &&
      userAgent === lastVisit.userAgent &&
      now - lastTimestamp < 4000;

    if (!isDuplicate) {
      await URL.updateOne(
        { shortId },
        {
          $push: {
            visitHistory: {
              timestamp: new Date(),
              userAgent,
            },
          },
        }
      );
    }
  }

  return res.redirect(entry.redirectURL);
});

//  Health check
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

//  Start server with Render-friendly settings
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server started on http://0.0.0.0:${PORT}`);
});

server.keepAliveTimeout = 120000;   // 120 seconds
server.headersTimeout = 130000;     // 130 seconds
