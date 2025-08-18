Got it 👍
Here’s the complete **single code block** for your `README.md` file — you can just copy-paste it as is:

```markdown
# 🎙️ Gemini Voice Chatbot

A real-time **voice-enabled chatbot** that listens to the user, processes their query using AI models, and responds back with **speech + text**.  

Supports multiple AI providers with automatic fallback:  
- ✅ Google Gemini (primary)  
- ✅ OpenAI GPT-3.5 (fallback)  
- ✅ Cohere Command-R+ (final fallback)  

---

## 🚀 Features
- 🎤 **Speech-to-text** via browser’s `SpeechRecognition` API (no API cost)  
- 🔊 **AI replies with voice** via browser `speechSynthesis`  
- 🔄 **Multi-provider fallback** (Gemini → OpenAI → Cohere)  
- 🌐 Simple **WebSocket server** for real-time communication  
- 🔐 Environment variables for API keys (no hardcoded secrets)  

---

## 📂 Project Structure
```

gemini-voice-chatbot/
├── public/             # Frontend (HTML, CSS, JS)
│   ├── index.html
│   ├── style.css
│   └── script.js
├── src/                # Backend server
│   └── server.js
├── .env                # API keys (not committed)
├── .gitignore
├── package.json
└── README.md

````

---

## ⚙️ Setup Instructions

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/gemini-voice-chatbot.git
cd gemini-voice-chatbot
````

### 2. Install dependencies

```bash
npm install
```

### 3. Add environment variables

Create a `.env` file in the root with:

```
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
COHERE_API_KEY=your_cohere_api_key
PORT=3000
```

👉 You don’t need all keys; missing ones just skip that provider.

### 4. Run in dev mode

```bash
npm run dev
```

Server starts at:

```
http://localhost:3000
```

---

## 🖥️ Usage

1. Open the app in your browser.
2. Press the 🎤 microphone button to talk.
3. The chatbot listens, sends text to the AI, and replies with **text + voice**.
4. If Gemini quota is exceeded, it auto-falls back to OpenAI, then Cohere.

---

## 📸 Demo Screenshot

![Demo Screenshot](https://via.placeholder.com/800x400?text=Gemini+Voice+Chatbot)

---

## 🔒 Notes

* `.env` is ignored by git for safety (your keys stay private).
* Browser’s **SpeechRecognition API** only works on **Chrome/Edge**, not on Brave/Firefox.
* Voices may sound robotic since free `speechSynthesis` is used. Paid TTS (Google/ElevenLabs/Azure) would sound natural.

---

## 📜 License

MIT License © 2025

```

---

⚡ Do you want me to also add a **"Deploy on Render/Heroku" section** in this README so others can run your chatbot live without needing Node setup locally?
```
