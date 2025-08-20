// src/server.js (Gemini → OpenAI → Cohere fallback)
require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const COHERE_API_KEY = process.env.COHERE_API_KEY;

const GEMINI_MODEL = "gemini-2.0-flash-live-001"; // Live model
const GEMINI_LIVE_URL = `wss://generativelanguage.googleapis.com/v1beta/live?key=${GEMINI_API_KEY}`;

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const COHERE_API_URL = "https://api.cohere.ai/v1/chat";

wss.on("connection", (clientWs) => {
  console.log("🌐 Client connected");

  let geminiWs;

  try {
    // 🔗 Connect to Gemini Live WebSocket
    geminiWs = new WebSocket(GEMINI_LIVE_URL);

    geminiWs.on("open", () => {
      console.log("✅ Connected to Gemini Live API");

      // Tell Gemini which model to use
      geminiWs.send(
        JSON.stringify({
          setup: { model: GEMINI_MODEL },
        })
      );
    });

    // Forward Gemini’s responses back to the browser
    geminiWs.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        const text = msg.candidates?.[0]?.content?.parts?.[0]?.text;

        // 🚫 Ignore system/init responses
        if (!text || text.toLowerCase().includes("gemini live")) return;

        console.log("🤖 Gemini Live:", text);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({ text, source: "Gemini" }));
        }
      } catch (err) {
        console.error("Parse error from Gemini Live:", err);
      }
    });

    geminiWs.on("error", (err) => {
      console.error("🚨 Gemini Live error:", err.message);
    });

    // When browser sends a message → forward to Gemini
    clientWs.on("message", (msg) => {
      const userText = msg.toString().trim();

      // 🚫 Ignore empty/blank messages
      if (!userText) {
        console.log("⚠️ Ignored empty message");
        return;
      }

      console.log("📝 User said:", userText);

      if (geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.send(
          JSON.stringify({
            input: { text: userText },
          })
        );
      } else {
        console.log("⚠️ Gemini WS not open, using fallback...");
        fallbackToOtherModels(clientWs, userText);
      }
    });
  } catch (err) {
    console.error("🚨 Could not connect to Gemini Live:", err.message);
  }

  clientWs.on("close", () => {
    if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
      geminiWs.close();
    }
    console.log("❌ Client disconnected");
  });
});

/**
 * Fallback to OpenAI → Cohere if Gemini Live fails
 */
async function fallbackToOtherModels(ws, userText) {
  let finalText = "❌ Could not get a response.";
  let source = "Unknown";

  // 1️⃣ Try OpenAI
  try {
    const openaiResp = await axios.post(
      OPENAI_API_URL,
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are Revolt Motors’ AI Assistant. Be polite, concise, and only answer about Revolt Motors, its EV products, general EV info, and small talk. 🚫 Never mention APIs, quotas, or errors.",
          },
          { role: "user", content: userText },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    finalText =
      openaiResp.data.choices?.[0]?.message?.content ||
      "❌ OpenAI returned no text.";
    source = "OpenAI";
    console.log("🤖 OpenAI response:", finalText);
  } catch (err) {
    console.error("🚨 OpenAI error:", err.response?.data || err.message);

    // 2️⃣ Try Cohere
    try {
      const cohereResp = await axios.post(
        COHERE_API_URL,
        {
          model: "command-r-plus", // free tier model
          message: userText,
          chat_history: [
            {
              role: "SYSTEM",
              message:
                "You are Revolt Motors’ AI Assistant. Always be polite and concise. Only talk about Revolt Motors, its EV products, general EV info, and polite small talk. 🚫 Never mention APIs, quotas, or errors. If you don’t know, say: 'I’m not sure about that, but I can help you with Revolt Motors or EV questions.'",
            },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${COHERE_API_KEY}`,
          },
        }
      );

      finalText =
        cohereResp.data?.text ||
        "❌ Cohere returned no text.";
      source = "Cohere";

      console.log("🤖 Cohere response:", finalText);
    } catch (cohereError) {
      console.error(
        "🚨 Cohere error:",
        cohereError.response?.data || cohereError.message
      );
      finalText = "❌ All providers failed (Gemini, OpenAI, Cohere).";
      source = "None";
    }
  }

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ text: finalText, source }));
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  if (!GEMINI_API_KEY) console.error("❌ Missing GEMINI_API_KEY in .env file");
});
