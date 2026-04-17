// audio.js — Procedural ASMR sound effects via Web Audio API.
// All sounds generated from oscillators and noise buffers — no external files.
// AudioContext is created lazily on first user interaction (browser policy).

let _ctx = null;          // AudioContext (lazy init)
let _enabled = true;      // User toggle
let _ambientNode = null;  // Continuous ambient node
let _cricketNode = null;  // Night cricket node

// Load preference from localStorage
const _STORAGE_KEY = 'pony-pastures-audio';
const saved = localStorage.getItem(_STORAGE_KEY);
if (saved !== null) _enabled = saved === '1';

// ── Context init ───────────────────────────────────────────────────────────────

function _getCtx() {
  if (!_enabled) return null;
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      _enabled = false;
      return null;
    }
  }
  // Resume if suspended (browser may suspend after inactivity)
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

// ── Toggle ─────────────────────────────────────────────────────────────────────

export function isAudioEnabled() { return _enabled; }

export function toggleAudio() {
  _enabled = !_enabled;
  localStorage.setItem(_STORAGE_KEY, _enabled ? '1' : '0');
  if (_enabled) {
    // Re-init ambient when turning on
    _getCtx();
    startAmbient();
  } else {
    // Stop ambient
    _stopAmbient();
    _stopCrickets();
    if (_ctx) {
      _ctx.close();
      _ctx = null;
    }
  }
  return _enabled;
}

// ── Noise buffer helper ────────────────────────────────────────────────────────

function _makeNoiseBuffer(ctx, duration) {
  const sampleRate = ctx.sampleRate;
  const frameCount = Math.ceil(sampleRate * duration);
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// ── Master gain helper (keeps everything ASMR-soft) ───────────────────────────

function _masterGain(ctx, value) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(value, ctx.currentTime);
  g.connect(ctx.destination);
  return g;
}

// ── Sound: Plant (soft "thup") ─────────────────────────────────────────────────

export function playPlant() {
  const ctx = _getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.13);
}

// ── Sound: Water (gentle splash — filtered noise) ─────────────────────────────

export function playWater() {
  const ctx = _getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const buf = _makeNoiseBuffer(ctx, 0.25);
  const src = ctx.createBufferSource();
  src.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1800, now);
  filter.Q.setValueAtTime(0.8, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.linearRampToValueAtTime(0.14, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(now);
  src.stop(now + 0.26);
}

// ── Sound: Harvest pop (mid freq with pitch bend up) ──────────────────────────

export function playHarvest() {
  const ctx = _getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(640, now + 0.09);

  gain.gain.setValueAtTime(0.20, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.19);
}

// ── Sound: Coin clink (bright metallic ting) ──────────────────────────────────

export function playCoin() {
  const ctx = _getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1480, now);
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

  gain.gain.setValueAtTime(0.14, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  // Add slight harmonics
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(2960, now);
  gain2.gain.setValueAtTime(0.06, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now);
  osc2.stop(now + 0.13);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.23);
}

// ── Sound: Horse nicker (warm low filtered noise with slight vibrato) ──────────

export function playNicker() {
  const ctx = _getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const buf = _makeNoiseBuffer(ctx, 0.35);
  const src = ctx.createBufferSource();
  src.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(320, now);
  filter.Q.setValueAtTime(4, now);

  // Vibrato via LFO on filter freq
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.setValueAtTime(8, now);
  lfoGain.gain.setValueAtTime(40, now);
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.16, now + 0.06);
  gain.gain.setValueAtTime(0.14, now + 0.18);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  lfo.start(now);
  src.start(now);
  src.stop(now + 0.36);
  lfo.stop(now + 0.36);
}

// ── Sound: Feed horse (gentle munch — short noise bursts) ─────────────────────

export function playFeed() {
  const ctx = _getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  for (let i = 0; i < 3; i++) {
    const t = now + i * 0.07;
    const buf = _makeNoiseBuffer(ctx, 0.06);
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.10, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.07);
  }
}

// ── Sound: Level up (ascending ding-ding-ding) ────────────────────────────────

export function playLevelUp() {
  const ctx = _getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const freqs = [523, 659, 784]; // C5, E5, G5
  for (let i = 0; i < 3; i++) {
    const t = now + i * 0.12;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqs[i], t);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  }
}

// ── Sound: Tame success (warm chord) ──────────────────────────────────────────

export function playTame() {
  const ctx = _getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const freqs = [392, 494, 587]; // G4, B4, D5 — warm G major triad
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqs[i], now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.05);
    gain.gain.setValueAtTime(0.12, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.82);
  }
}

// ── Sound: Button tap (soft click) ────────────────────────────────────────────

export function playButton() {
  const ctx = _getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(1100, now);

  gain.gain.setValueAtTime(0.07, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.05);
}

// ── Ambient meadow (continuous low layered noise) ──────────────────────────────

export function startAmbient() {
  const ctx = _getCtx();
  if (!ctx || _ambientNode) return;

  // Two layers of filtered noise for wind
  const windGroup = ctx.createGain();
  windGroup.gain.setValueAtTime(0.04, ctx.currentTime);
  windGroup.connect(ctx.destination);

  // Layer 1 — low rumble
  const buf1 = _makeNoiseBuffer(ctx, 4.0);
  const src1 = ctx.createBufferSource();
  src1.buffer = buf1;
  src1.loop = true;
  const f1 = ctx.createBiquadFilter();
  f1.type = 'lowpass';
  f1.frequency.setValueAtTime(220, ctx.currentTime);
  f1.Q.setValueAtTime(0.5, ctx.currentTime);
  src1.connect(f1);
  f1.connect(windGroup);
  src1.start();

  // Layer 2 — slightly higher rustle
  const buf2 = _makeNoiseBuffer(ctx, 3.7);
  const src2 = ctx.createBufferSource();
  src2.buffer = buf2;
  src2.loop = true;
  const f2 = ctx.createBiquadFilter();
  f2.type = 'bandpass';
  f2.frequency.setValueAtTime(500, ctx.currentTime);
  f2.Q.setValueAtTime(0.6, ctx.currentTime);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.5, ctx.currentTime);
  src2.connect(f2);
  f2.connect(g2);
  g2.connect(windGroup);
  src2.start();

  _ambientNode = { src1, src2, windGroup };
}

function _stopAmbient() {
  if (_ambientNode) {
    try { _ambientNode.src1.stop(); } catch (e) {}
    try { _ambientNode.src2.stop(); } catch (e) {}
    _ambientNode = null;
  }
}

// ── Night crickets (rhythmic high-frequency blips) ────────────────────────────

let _cricketTimeout = null;

export function updateCrickets(nightFactor) {
  const ctx = _getCtx();
  if (!ctx) return;

  const active = nightFactor > 0.5;

  if (active && !_cricketNode) {
    _startCrickets(ctx, nightFactor);
  } else if (!active && _cricketNode) {
    _stopCrickets();
  } else if (active && _cricketNode) {
    // Update volume based on nightFactor
    const vol = Math.min(0.05, (nightFactor - 0.5) * 0.12);
    try { _cricketNode.gainNode.gain.setTargetAtTime(vol, ctx.currentTime, 0.5); } catch (e) {}
  }
}

function _startCrickets(ctx, nf) {
  // Chirp interval in ms
  const interval = 180;
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 2);
  gainNode.connect(ctx.destination);

  _cricketNode = { gainNode, active: true };

  function chirp() {
    if (!_cricketNode || !_cricketNode.active) return;
    const ctxNow = ctx.currentTime;

    // Two short high blips
    for (let i = 0; i < 2; i++) {
      const t = ctxNow + i * 0.04;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(4200 + Math.random() * 400, t);
      g.gain.setValueAtTime(0.0, t);
      g.gain.linearRampToValueAtTime(1.0, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(g);
      g.connect(gainNode);
      osc.start(t);
      osc.stop(t + 0.05);
    }

    _cricketTimeout = setTimeout(chirp, interval + Math.random() * 80);
  }

  _cricketTimeout = setTimeout(chirp, 500);
}

function _stopCrickets() {
  if (_cricketTimeout) { clearTimeout(_cricketTimeout); _cricketTimeout = null; }
  if (_cricketNode) {
    _cricketNode.active = false;
    try {
      const ctx2 = _ctx;
      if (ctx2 && _cricketNode.gainNode) {
        _cricketNode.gainNode.gain.setTargetAtTime(0.001, ctx2.currentTime, 0.3);
      }
    } catch (e) {}
    _cricketNode = null;
  }
}

// ── Initialize ambient on first user interaction ───────────────────────────────
// Called from main.js after first tap

export function initAudio() {
  if (!_enabled) return;
  _getCtx();
  startAmbient();
}
