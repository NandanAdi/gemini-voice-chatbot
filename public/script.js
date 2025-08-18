
const micBtn = document.getElementById('mic-btn');
const chatContainer = document.getElementById('chat-container');

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

micBtn.parentNode.insertBefore(voiceSelector, micBtn);

let socket;
let isListening = false;
let recognition;
let voices = [];
let selectedVoice = null;

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
speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

voiceSelector.addEventListener("change", () => {
    selectedVoice = voices[parseInt(voiceSelector.value)];
    console.log("🔊 Switched to voice:", selectedVoice.name);
});

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

// 🎙 Start listening (SpeechRecognition)
function startListening() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        alert("Speech Recognition not supported in this browser.");
        return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        console.log("🎙 Listening...");
        chatContainer.innerHTML += `<p class="ai-message">Listening...</p>`;
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("📝 You said:", transcript);
        chatContainer.innerHTML += `<p class="user-message">${transcript}</p>`;

        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(transcript);
        }
    };

    recognition.onerror = (event) => {
        console.error("❌ Recognition error:", event.error);
        chatContainer.innerHTML += `<p class="ai-message">Speech recognition error: ${event.error}</p>`;
    };

    recognition.onend = () => {
        console.log("🛑 Stopped listening.");
        isListening = false;
        micBtn.classList.remove('listening');
    };

    recognition.start();
    isListening = true;
    micBtn.classList.add('listening');
}

micBtn.addEventListener('click', () => {
    if (isListening) {
        recognition.stop();
    } else {
        startListening();
    }
});

initSocket();
