
const chatContainer = document.getElementById("chat-container");
const micBtn = document.getElementById("mic-btn");
const voiceSelect = document.getElementById("voice-select");

const MIN_GAP_MS = 1000; 

let ws;
function connectWS() {
  ws = new WebSocket(`ws://${window.location.host}`);
  ws.onopen = () => console.log(" WS connected");
  ws.onclose = () => setTimeout(connectWS, 1000);
  ws.onmessage = (evt) => handleServerMessage(evt.data);
}
connectWS();

function sendToServer(text) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(text);
  }
}

function addMessage(text, role = "ai", source = null) {
  const el = document.createElement("div");
  el.className = role === "user" ? "user-message" : "ai-message";
  el.textContent = text;
  if (role === "ai" && source) {
    const s = document.createElement("div");
    s.className = "source-label";
    s.textContent = `(${source})`;
    el.appendChild(document.createElement("br"));
    el.appendChild(s);
  }
  chatContainer.appendChild(el);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

let voices = [];
let selectedVoiceIndex = 0;
let isSpeaking = false;
let currentUtterance = null;

function populateVoiceList() {
  voices = speechSynthesis.getVoices();
  voiceSelect.innerHTML = voices
    .map((v, i) => `<option value="${i}">${v.name} — ${v.lang}</option>`)
    .join("");
  selectedVoiceIndex = voices.findIndex(v => v.lang.startsWith("en-IN")) || 0;
  voiceSelect.value = String(selectedVoiceIndex);
}
speechSynthesis.onvoiceschanged = populateVoiceList;
populateVoiceList();

voiceSelect.addEventListener("change", () => {
  selectedVoiceIndex = parseInt(voiceSelect.value || "0", 10) || 0;
});

function cancelTTS(force = true) {
  try {
    if (force) {
      speechSynthesis.cancel();
    }
  } catch {}
  isSpeaking = false;
  currentUtterance = null;
}

function speakWithGap(text) {
  cancelTTS(); 
  const v = voices[selectedVoiceIndex];
  const u = new SpeechSynthesisUtterance(text);
  if (v) u.voice = v;
  u.onstart = () => { isSpeaking = true; console.log("🔊 AI speaking…"); };
  u.onend = () => { isSpeaking = false; currentUtterance = null; console.log(" AI finished"); };
  u.onerror = () => { isSpeaking = false; currentUtterance = null; };
  currentUtterance = u;
  const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastFinalUserTs));
  setTimeout(() => speechSynthesis.speak(u), wait);
}

// -------------------- Speech Recognition --------------------
let recognition;
let isListening = false;
let manualStop = false;
let lastUserText = "";
let lastFinalUserTs = 0;

function initRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert("Speech Recognition not supported"); return; }
  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-IN";

  recognition.onstart = () => { isListening = true; micBtn.classList.add("listening"); };
  recognition.onspeechstart = () => { if (isSpeaking) cancelTTS(); };
  recognition.onresult = (e) => {
    const result = e.results[e.results.length - 1];
    if (!result) return;
    if (!result.isFinal && isSpeaking) cancelTTS(); // barge-in
    if (result.isFinal) {
      const transcript = result[0].transcript.trim();
      if (!transcript || transcript.toLowerCase() === lastUserText.toLowerCase()) return;
      lastUserText = transcript;
      lastFinalUserTs = Date.now();
      addMessage(transcript, "user");
      sendToServer(transcript);
    }
  };
  recognition.onerror = (e) => {
    console.warn("ASR error:", e.error);
    isListening = false; micBtn.classList.remove("listening");
    if (!manualStop && e.error !== "not-allowed") setTimeout(() => startRecognition(), 500);
  };
  recognition.onend = () => {
    isListening = false; micBtn.classList.remove("listening");
    if (!manualStop && !isSpeaking) setTimeout(() => startRecognition(), 500);
  };
}

function startRecognition() {
  if (!recognition) initRecognition();
  if (isListening) return;
  manualStop = false;
  recognition.start();
}
function stopRecognition() {
  if (!recognition) return;
  manualStop = true;
  recognition.stop();
  recognition.abort();
  isListening = false;
  micBtn.classList.remove("listening");
}

// -------------------- Mic Toggle --------------------
micBtn.addEventListener("click", () => {
  if (isListening || isSpeaking) {
    console.log(" Manual STOP: mic + TTS");
    stopRecognition();
    cancelTTS(true);
  } else {
    console.log(" Manual START: mic listening");
    lastUserText = "";
    startRecognition();
  }
});

// -------------------- Server Message Handler --------------------
function handleServerMessage(raw) {
  let data;
  try { data = JSON.parse(raw); } catch { return; }
  const text = data?.text;
  if (!text) return;
  addMessage(text, "ai", data.source);
  speakWithGap(text);
}
