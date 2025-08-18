require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const COHERE_API_KEY = process.env.COHERE_API_KEY;

const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const COHERE_API_URL = "https://api.cohere.ai/v1/chat";

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (msg) => {
    const userText = msg.toString();
    console.log("📝 User said:", userText);

    let finalText = "❌ Could not get a response.";
    let source = "Unknown";

    // 1️⃣ Gemini
    try {
      const geminiPayload = {
        contents: [
          { role: "user", parts: [{ text: userText }] }
        ],
        systemInstruction: {
          role: "user",
          parts: [
            { text: "You are a helpful assistant for Revolt Motors. Keep responses concise." }
          ]
        }
      };

      const geminiResp = await axios.post(GEMINI_API_URL, geminiPayload, {
        headers: { "Content-Type": "application/json" }
      });

      finalText =
        geminiResp.data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "❌ Gemini returned no text.";
      source = "Gemini";

      console.log("🤖 Gemini response:", finalText);
    } catch (error) {
      console.error("🚨 Gemini error:", error.response?.data || error.message);

      // 2️⃣ OpenAI fallback
      if (error.response?.data?.error?.status === "RESOURCE_EXHAUSTED" ||
          error.response?.data?.error?.code === 'insufficient_quota') {
        console.log("⚠️ Falling back to OpenAI GPT-3.5...");
        try {
          const openaiResp = await axios.post(
            OPENAI_API_URL,
            {
              model: "gpt-3.5-turbo",
              messages: [
                { role: "system", content: "You are a helpful assistant for Revolt Motors. Keep responses concise." },
                { role: "user", content: userText }
              ],
            },
            {
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
              }
            }
          );

          finalText =
            openaiResp.data.choices?.[0]?.message?.content ||
            "❌ OpenAI returned no text.";
          source = "OpenAI";

          console.log("🤖 OpenAI response:", finalText);
        } catch (openaiError) {
          console.error("🚨 OpenAI error:", openaiError.response?.data || openaiError.message);

          // 3️⃣ Cohere fallback
          console.log("⚠️ Falling back to Cohere...");
          try {
            const cohereResp = await axios.post(
              COHERE_API_URL,
              {
                model: "command-r-plus",
                message: userText
              },
              {
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${COHERE_API_KEY}`
                }
              }
            );

            finalText =
              cohereResp.data?.text ||
              "❌ Cohere returned no text.";
            source = "Cohere";

            console.log("🤖 Cohere response:", finalText);
          } catch (cohereError) {
            console.error("🚨 Cohere error:", cohereError.response?.data || cohereError.message);
            finalText = "❌ All providers failed (Gemini, OpenAI, Cohere).";
            source = "None";
          }
        }
      } else {
        finalText = "❌ Error contacting Gemini API.";
      }
    }

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ text: finalText }));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  if (!GEMINI_API_KEY) console.error("❌ Missing GEMINI_API_KEY in .env file");
  if (!OPENAI_API_KEY) console.warn("⚠️ No OPENAI_API_KEY found. Fallback may not work.");
  if (!COHERE_API_KEY) console.warn("⚠️ No COHERE_API_KEY found. Final fallback may not work.");
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
