// public/script.js (SpeechRecognition + Voice Selector)
const micBtn = document.getElementById('mic-btn');
const chatContainer = document.getElementById('chat-container');

// 🎤 Create and style voice selector dropdown
const voiceSelector = document.createElement("select");
voiceSelector.id = "voice-selector";
voiceSelector.style.margin = "10px";
voiceSelector.style.padding = "6px";
voiceSelector.style.borderRadius = "8px";
voiceSelector.style.fontSize = "14px";
voiceSelector.style.background = "#1e1e1e";
voiceSelector.style.color = "#fff";
voiceSelector.style.border = "1px solid #555";
voiceSelector.style.display = "block";

// Insert dropdown ABOVE mic button
micBtn.parentNode.insertBefore(voiceSelector, micBtn);

let socket;
let isListening = false;
let recognition;
let voices = [];
let selectedVoice = null;

// Init WebSocket
function initSocket() {
    socket = new WebSocket(`ws://${window.location.host}`);

    socket.onmessage = (event) => {
        console.log("Message from server:", event.data);
        try {
            const data = JSON.parse(event.data);
            if (data.text) {
                chatContainer.innerHTML += `<p class="ai-message">[AI] ${data.text}</p>`;
                speakText(data.text);
            }
        } catch (e) {
            console.error("Received non-JSON:", event.data);
        }
    };
}

// 🔊 Load voices into dropdown
function loadVoices() {
    voices = speechSynthesis.getVoices();

    // Prevent empty dropdown
    if (!voices || voices.length === 0) {
        console.warn("⚠️ No voices loaded yet, retrying...");
        setTimeout(loadVoices, 500); // retry
        return;
    }

    voiceSelector.innerHTML = "";

    voices.forEach((voice, i) => {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = `${voice.name} (${voice.lang})`;
        if (selectedVoice && voice.name === selectedVoice.name) {
            option.selected = true;
        }
        voiceSelector.appendChild(option);
    });

    if (!selectedVoice) {
        selectedVoice =
            voices.find(v => v.name.toLowerCase().includes("aria")) ||
            voices.find(v => v.name.toLowerCase().includes("google")) ||
            voices.find(v => v.lang.startsWith("en-US")) ||
            voices[0];
        console.log("✅ Default voice selected:", selectedVoice.name);
    }
}
speechSynthesis.onvoiceschanged = populateVoiceList;
populateVoiceList();

// Handle voice change
voiceSelector.addEventListener("change", () => {
    selectedVoice = voices[parseInt(voiceSelector.value)];
    console.log("🔊 Switched to voice:", selectedVoice.name);
});

// 🗣️ Speak AI response
function speakText(text) {
    if (!selectedVoice) {
        console.warn("⚠️ No voice selected, skipping speech.");
        return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedVoice.lang || "en-US";
    utterance.voice = selectedVoice;
    utterance.rate = 1;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
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

// 🎤 Toggle mic
micBtn.addEventListener('click', () => {
    if (isListening) {
        recognition.stop();
    } else {
        startListening();
    }
});

// 🔌 Init socket
initSocket();
