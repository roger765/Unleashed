let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playSFX(type: 'hit' | 'miss' | 'levelup' | 'capture' | 'click'): void {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'hit':
        osc.type = 'sawtooth';
        osc.frequency.value = 200;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
        break;
      case 'miss':
        osc.type = 'sine';
        osc.frequency.value = 150;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
        break;
      case 'levelup':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
        break;
      case 'capture':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.15);
        osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
        break;
      case 'click':
        osc.type = 'sine';
        osc.frequency.value = 600;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
        break;
    }
  } catch {
    // Audio not available — silently fail
  }
}

// ── Calm BGM (sine arpeggio) ─────────────────────────────────────────
let bgmOscillators: OscillatorNode[] = [];
let bgmGains: GainNode[] = [];
let bgmPlaying = false;

// ── 8-bit battle loop (square + noise; original chiptune, not a cover of any film theme) ──
let chipBattleActive = false;
let chipBattleTimeouts: number[] = [];

function clearChipBattleTimeouts(): void {
  for (const id of chipBattleTimeouts) {
    window.clearTimeout(id);
  }
  chipBattleTimeouts = [];
}

function playChipNoiseHit(ctx: AudioContext, t: number, vol: number): void {
  const dur = 0.038;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 800;
  src.buffer = buf;
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.start(t);
  src.stop(t + dur);
}

function playChipSquare(
  ctx: AudioContext,
  t: number,
  freq: number,
  dur: number,
  vol: number,
  lowpassHz: number,
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = 'square';
  osc.frequency.value = freq;
  filter.type = 'lowpass';
  filter.frequency.value = lowpassHz;
  osc.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur - 0.008);
  osc.start(t);
  osc.stop(t + dur);
}

/**
 * Original NES-style battle loop: driving bass, bright square lead, light noise “kick”.
 * Evokes classic sports / training montage *games* — not a transcription of commercial scores.
 */
function start8BitBattleLoop(): void {
  clearChipBattleTimeouts();
  chipBattleActive = true;

  try {
    const ctx = getCtx();
    const stepMs = 118;
    const n = 32;

    // 16th-note grid: bass roots (triumphant I–V–vi–IV style motion in C)
    const bass: (number | null)[] = [
      65.41, null, 65.41, null, 98, null, 98, null, 110, null, 110, null, 87.31, null, 87.31, null,
      65.41, null, 98, null, 110, null, 98, null, 87.31, null, 65.41, null, 98, null, 110, null,
    ];

    // Original pentatonic fanfare fragments (not Rocky’s melody)
    const lead: (number | null)[] = [
      null, 523.25, null, 659.25, 783.99, null, 659.25, 523.25, 587.33, null, 659.25, null, 523.25,
      null, null, null,
      null, 659.25, null, 783.99, 880, null, 783.99, 659.25, 523.25, null, 587.33, null, 659.25,
      null, 783.99, 880,
    ];

    let step = 0;

    const chipStep = (): void => {
      if (!chipBattleActive) return;
      const t = ctx.currentTime;
      const i = step % n;

      if (i % 8 === 0) {
        playChipNoiseHit(ctx, t, i % 16 === 0 ? 0.055 : 0.038);
      }

      const b = bass[i];
      if (b !== null) {
        playChipSquare(ctx, t, b, 0.13, 0.085, 1400);
      }

      const m = lead[i];
      if (m !== null) {
        playChipSquare(ctx, t, m, 0.1, 0.048, 5200);
      }

      step += 1;
      const id = window.setTimeout(chipStep, stepMs);
      chipBattleTimeouts.push(id);
    };

    chipStep();
  } catch {
    chipBattleActive = false;
  }
}

export type BGMStyle = 'calm' | 'battle';

export function playBGM(style: BGMStyle): void {
  stopBGM();
  try {
    const ctx = getCtx();

    if (style === 'battle') {
      start8BitBattleLoop();
      return;
    }

    const calmPattern = [174.61, 196, 220, 246.94, 261.63, 246.94, 220, 196];
    const noteMs = 820;
    const attackVol = 0.02;
    const noteDur = 0.72;
    let noteIndex = 0;

    function playCalmNote() {
      if (!bgmPlaying) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.value = calmPattern[noteIndex % calmPattern.length];
      gain.gain.setValueAtTime(attackVol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + noteDur - 0.05);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + noteDur);
      bgmOscillators.push(osc);

      noteIndex++;
      setTimeout(playCalmNote, noteMs);
    }

    bgmPlaying = true;
    playCalmNote();
  } catch {
    // Audio not available
  }
}

export function stopBGM(): void {
  chipBattleActive = false;
  clearChipBattleTimeouts();
  bgmPlaying = false;
  for (const osc of bgmOscillators) {
    try {
      osc.stop();
    } catch {
      /* already stopped */
    }
  }
  bgmOscillators = [];
  bgmGains = [];
}
