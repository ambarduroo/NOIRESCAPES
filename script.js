const musicToggle = document.getElementById("musicToggle");
const navMusic = document.getElementById("navMusic");
const heroMusic = document.getElementById("heroMusic");
const heroMusicIcon = document.getElementById("heroMusicIcon");
const heroMusicText = document.getElementById("heroMusicText");
const quoteMusic = document.getElementById("quoteMusic");
const volumeControl = document.getElementById("volumeControl");
const equalizer = document.getElementById("equalizer");
const trackName = document.getElementById("trackName");
const trackMood = document.getElementById("trackMood");

let audioContext = null;
let masterGain = null;
let musicPlaying = false;
let activeMood = "sunset";
let loopTimer = null;
let nextBeatTime = 0;
let step = 0;
let audioNodes = [];

const moods = {
  sunset: {
    title: "GOLDEN HOUR",
    subtitle: "MELODIC IBIZA HOUSE",
    bpm: 112,
    bass: 55,
    kick: 0.85,
    brightness: 0.15
  },
  deep: {
    title: "SALT & SOUND",
    subtitle: "DEEP HOUSE FREQUENCIES",
    bpm: 120,
    bass: 65,
    kick: 0.95,
    brightness: 0.22
  },
  techno: {
    title: "AFTER DARK",
    subtitle: "UNDERGROUND TECHNO",
    bpm: 126,
    bass: 49,
    kick: 1,
    brightness: 0.30
  }
};

function setupAudio() {
  if (audioContext) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    alert("Tu navegador no permite reproducir este sonido. Probá con Safari o Chrome actualizado.");
    return;
  }

  audioContext = new AudioContextClass();
  masterGain = audioContext.createGain();
  masterGain.gain.value = Number(volumeControl.value) / 100 * 0.55;
  masterGain.connect(audioContext.destination);
}

function registerNode(node) {
  audioNodes.push(node);
  return node;
}

function playKick(time, strength = 1) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(125, time);
  oscillator.frequency.exponentialRampToValueAtTime(43, time + 0.13);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.8 * strength, time + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);

  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(time);
  oscillator.stop(time + 0.34);

  registerNode(oscillator);
}

function playHat(time, strength = 0.12) {
  const bufferSize = Math.floor(audioContext.sampleRate * 0.045);
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = audioContext.createBufferSource();
  noise.buffer = buffer;

  const filter = audioContext.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 6500;

  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(strength, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start(time);

  registerNode(noise);
}

function playBass(time, frequency, duration = 0.18) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(frequency, time);

  filter.type = "lowpass";
  filter.frequency.value = 180;

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.17, time + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  oscillator.start(time);
  oscillator.stop(time + duration + 0.02);

  registerNode(oscillator);
}

function playPad(time, frequency, duration = 0.7) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  oscillator.type = "triangle";
  oscillator.frequency.value = frequency;

  filter.type = "lowpass";
  filter.frequency.value = 900;

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.035, time + 0.12);
  gain.gain.setTargetAtTime(0.0001, time + duration * 0.55, 0.15);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  oscillator.start(time);
  oscillator.stop(time + duration);

  registerNode(oscillator);
}

function scheduleBeat() {
  if (!audioContext || !musicPlaying) return;

  const mood = moods[activeMood];
  const beatLength = 60 / mood.bpm;
  const sixteenth = beatLength / 4;

  while (nextBeatTime < audioContext.currentTime + 0.12) {
    const currentStep = step % 16;

    // Bombo constante de música electrónica.
    if (currentStep % 4 === 0) {
      playKick(nextBeatTime, mood.kick);
    }

    // Hi-hats para darle movimiento al ritmo.
    if (currentStep % 2 === 1) {
      playHat(nextBeatTime, activeMood === "techno" ? 0.18 : 0.10);
    }

    if (currentStep % 4 === 2 && activeMood !== "sunset") {
      playHat(nextBeatTime, 0.07);
    }

    // Secuencia grave que cambia según el ambiente.
    const bassPattern = activeMood === "sunset"
      ? [0, 0, 7, 0, 5, 0, 10, 0, 0, 0, 7, 0, 12, 0, 7, 0]
      : activeMood === "deep"
      ? [0, 0, 0, 7, 0, 5, 0, 7, 0, 0, 12, 0, 7, 0, 5, 0]
      : [0, 0, 0, 0, 7, 0, 0, 5, 0, 0, 12, 0, 7, 0, 0, 5];

    if (currentStep % 4 === 0 || (activeMood === "techno" && currentStep % 4 === 2)) {
      const note = bassPattern[currentStep];
      playBass(nextBeatTime, mood.bass * Math.pow(2, note / 12));
    }

    // Notas suaves y brillantes para la vibra mediterránea.
    if (activeMood === "sunset" && currentStep === 0) {
      playPad(nextBeatTime, 220, 1.5);
      playPad(nextBeatTime, 277.18, 1.5);
      playPad(nextBeatTime, 329.63, 1.5);
    }

    if (activeMood === "deep" && currentStep === 0) {
      playPad(nextBeatTime, 196, 1.3);
      playPad(nextBeatTime, 246.94, 1.3);
      playPad(nextBeatTime, 293.66, 1.3);
    }

    if (activeMood === "techno" && currentStep === 8) {
      playPad(nextBeatTime, 164.81, 0.45);
      playPad(nextBeatTime, 246.94, 0.45);
    }

    nextBeatTime += sixteenth;
    step++;
  }

  loopTimer = window.setTimeout(scheduleBeat, 25);
}

async function startMusic(mood = activeMood) {
  activeMood = moods[mood] ? mood : "sunset";
  setupAudio();

  if (!audioContext || !masterGain) return;

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  if (!musicPlaying) {
    musicPlaying = true;
    step = 0;
    nextBeatTime = audioContext.currentTime + 0.05;
    scheduleBeat();
  }

  updatePlayer();
}

function stopMusic() {
  musicPlaying = false;

  if (loopTimer) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }

  updatePlayer();
}

function updatePlayer() {
  const mood = moods[activeMood];

  trackName.textContent = mood.title;
  trackMood.textContent = mood.subtitle;

  musicToggle.textContent = musicPlaying ? "Ⅱ" : "▶";
  musicToggle.setAttribute(
    "aria-label",
    musicPlaying ? "Pausar música" : "Reproducir música"
  );

  equalizer.classList.toggle("playing", musicPlaying);
  heroMusicIcon.textContent = musicPlaying ? "Ⅱ" : "▶";
  heroMusicText.textContent = musicPlaying ? "PAUSE THE VIBE" : "PLAY THE VIBE";
  navMusic.innerHTML = `<span class="sound-dot"></span> ${musicPlaying ? "SOUND ON" : "SOUND OFF"}`;

  document.querySelectorAll(".experience-card").forEach(card => {
    card.classList.toggle("is-active", card.dataset.mood === activeMood && musicPlaying);
  });
}

function toggleMusic() {
  if (musicPlaying) {
    stopMusic();
  } else {
    startMusic(activeMood);
  }
}

musicToggle.addEventListener("click", toggleMusic);
navMusic.addEventListener("click", toggleMusic);
heroMusic.addEventListener("click", toggleMusic);
quoteMusic.addEventListener("click", toggleMusic);

document.querySelectorAll("[data-mood]").forEach(element => {
  const activateCard = () => startMusic(element.dataset.mood);

  element.addEventListener("click", activateCard);

  if (element.classList.contains("experience-card")) {
    element.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateCard();
      }
    });
  }
});

volumeControl.addEventListener("input", () => {
  if (masterGain && audioContext) {
    masterGain.gain.setTargetAtTime(
      Number(volumeControl.value) / 100 * 0.55,
      audioContext.currentTime,
      0.04
    );
  }
});

updatePlayer();

