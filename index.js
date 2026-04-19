require('dotenv').config();

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");

const { checkForAuthentication } = require("./middlewares/auth");

const URL = require("./models/url");
const urlRoute = require("./routes/url");
const staticRoute = require("./routes/staticRouter");
const staticPagesRoute = require("./routes/static");
const userRoute = require("./routes/user");
const qrRouter = require("./routes/qrRouter");
const paymentRoute = require("./routes/payment");

const app = express();

//  Securely use PORT and MongoDB URI
const BASE_PORT = Number(process.env.PORT || 8010);
const AUTO_FALLBACK_PORT = process.env.AUTO_FALLBACK_PORT === "true";
const MONGODB_URI = process.env.MONGODB_URI;

//  Connect to MongoDB Atlas securely
mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected to Atlas"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

//  Set view engine and middlewares
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://checkout.razorpay.com",
          "https://cdn.jsdelivr.net",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
        ],
        fontSrc: [
          "'self'",
          "data:",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://fonts.gstatic.com",
        ],
        imgSrc: ["'self'", "data:", "blob:", "https://checkout.razorpay.com"],
        connectSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
        frameSrc: ["'self'", "https://checkout.razorpay.com", "https://api.razorpay.com"],
        frameAncestors: ["'self'", "https://checkout.razorpay.com", "https://api.razorpay.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'", "https://api.razorpay.com"],
      },
    },
  })
);
app.use(mongoSanitize());
app.use(checkForAuthentication);
app.use(express.static(path.join(__dirname, "public")));

//  Routes
app.use("/url", urlRoute);
app.use("/user", userRoute);
app.use("/payment", paymentRoute);
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
      notFoundType: "short-url",
    });
  }

  const expiryEpoch = entry.expiryDate ? new Date(entry.expiryDate).getTime() : null;
  if (expiryEpoch && Date.now() > expiryEpoch) {
    return res.status(410).render("404", {
      user: req.user,
      message: "This short URL has expired.",
      notFoundType: "short-url",
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

function startServer(port) {
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`✅ Server started on http://0.0.0.0:${port}`);
  });

  server.keepAliveTimeout = 120000; // 120 seconds
  server.headersTimeout = 130000; // 130 seconds

  server.on("error", (error) => {
    if (error && error.code === "EADDRINUSE") {
      if (AUTO_FALLBACK_PORT) {
        const nextPort = port + 1;
        console.warn(`⚠️ Port ${port} is already in use. Retrying on ${nextPort}...`);
        return startServer(nextPort);
      }

      console.error(
        `❌ Port ${port} is already in use. Stop the process using this port or run with a different PORT.`
      );
      process.exit(1);
    }

    console.error("❌ Server failed to start:", error);
    process.exit(1);
  });
}

startServer(BASE_PORT);
