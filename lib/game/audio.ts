// ============================================================
// Gerenciador de Áudio — sons sintetizados via Web Audio API
// Nenhum arquivo externo necessário!
// ============================================================

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx?.state === 'suspended') {
    audioCtx.resume?.().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3,
  ramp: boolean = true
) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    if (ramp) {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // silenciar erros de áudio
  }
}

/** Som ao comer fruta */
export function sfxEat() {
  playTone(523, 0.1, 'sine', 0.25);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.25), 50);
  setTimeout(() => playTone(784, 0.15, 'sine', 0.2), 100);
}

/** Som ao comer fruta dourada */
export function sfxGolden() {
  playTone(523, 0.1, 'sine', 0.3);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.3), 80);
  setTimeout(() => playTone(784, 0.1, 'sine', 0.3), 160);
  setTimeout(() => playTone(1047, 0.2, 'sine', 0.25), 240);
}

/** Som do portal aparecendo */
export function sfxPortalAppear() {
  playTone(330, 0.3, 'sine', 0.2);
  setTimeout(() => playTone(440, 0.3, 'sine', 0.2), 150);
  setTimeout(() => playTone(554, 0.3, 'sine', 0.2), 300);
  setTimeout(() => playTone(660, 0.5, 'sine', 0.15), 450);
}

/** Som ao entrar no portal */
export function sfxPortalEnter() {
  playTone(440, 0.15, 'triangle', 0.3);
  setTimeout(() => playTone(554, 0.15, 'triangle', 0.3), 100);
  setTimeout(() => playTone(660, 0.15, 'triangle', 0.3), 200);
  setTimeout(() => playTone(880, 0.3, 'triangle', 0.25), 300);
  setTimeout(() => playTone(1100, 0.4, 'triangle', 0.2), 450);
}

/** Som de morte */
export function sfxDeath() {
  playTone(300, 0.15, 'sawtooth', 0.2);
  setTimeout(() => playTone(200, 0.2, 'sawtooth', 0.2), 100);
  setTimeout(() => playTone(100, 0.4, 'sawtooth', 0.15), 250);
}

/** Som de botão/clique */
export function sfxClick() {
  playTone(800, 0.06, 'sine', 0.15);
}

/** Vibração suave (se habilitada e disponível) */
export function vibrate(ms: number = 50) {
  if (typeof navigator !== 'undefined' && navigator?.vibrate) {
    try { navigator.vibrate(ms); } catch { /* ok */ }
  }
}

// ─── Música de fundo simples ──────────────────────────────
let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicPlaying = false;

const MUSIC_NOTES = [262, 294, 330, 349, 392, 440, 392, 349, 330, 294];

export function startMusic() {
  if (musicPlaying) return;
  musicPlaying = true;
  let idx = 0;
  musicInterval = setInterval(() => {
    if (!musicPlaying) return;
    const note = MUSIC_NOTES[idx % MUSIC_NOTES.length];
    playTone(note, 0.25, 'sine', 0.06, true);
    idx++;
  }, 400);
}

export function stopMusic() {
  musicPlaying = false;
  if (musicInterval !== null) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

export function isMusicPlaying(): boolean {
  return musicPlaying;
}
