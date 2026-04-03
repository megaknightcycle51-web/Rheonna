require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_KEY) {
  console.error("❌ Missing ANTHROPIC_API_KEY in .env file");
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/shape", async (req, res) => {
  try {
    const { system, messages } = req.body;

    if (!system || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Missing system or messages" });
    }

    console.log("Calling Anthropic API...");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: system,
        messages: messages,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Anthropic error:", data);
      return res.status(response.status).json({ error: data.error?.message || "API error" });
    }

    console.log("Success! Sending response back to client");
    res.json(data);
  } catch (err) {
    console.error("Server error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ POST http://localhost:${PORT}/api/shape`);
});
