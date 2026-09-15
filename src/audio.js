export const AudioEngine = {
  ctx: null,
  init() {
    try {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      this.ctx = null;
    }
  },
  playTone(freq, type, duration, endFreq = null) {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  },
  tap() { this.playTone(440, 'sine', 0.04); },
  buy() { this.playTone(330, 'triangle', 0.08, 660); },
  reroll() { this.playTone(220, 'sine', 0.06, 180); },
  evolve() {
    this.playTone(260, 'square', 0.1, 520);
    setTimeout(() => this.playTone(520, 'square', 0.2, 1040), 100);
  },
  ult() {
    this.playTone(440, 'sawtooth', 0.14, 880);
    setTimeout(() => this.playTone(880, 'sine', 0.18), 70);
  },
  levelUp() {
    [261, 329, 392, 523, 659].forEach((f, i) => setTimeout(() => this.playTone(f, 'square', 0.12), i * 65));
  },
  hit() { this.playTone(130, 'sawtooth', 0.08, 60); },
  crit() {
    this.playTone(200, 'square', 0.06, 70);
    setTimeout(() => this.playTone(320, 'sawtooth', 0.1, 90), 40);
  },
  win() {
    [392, 523, 659, 784].forEach((f, i) => setTimeout(() => this.playTone(f, 'triangle', 0.16), i * 100));
  },
  lose() {
    [330, 293, 261, 196].forEach((f, i) => setTimeout(() => this.playTone(f, 'sawtooth', 0.2), i * 120));
  },
  fanfare() {
    [261, 329, 392, 523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.playTone(f, 'triangle', 0.18, f * 1.2), i * 80));
  }
};

export function triggerScreenShake(isHeavy = false) {
  const app = document.getElementById('app');
  if (!app) return;
  const cls = isHeavy ? 'crit-shake' : 'screen-shake';
  app.classList.remove('screen-shake', 'crit-shake');
  void app.offsetWidth;
  app.classList.add(cls);
  setTimeout(() => app.classList.remove(cls), 350);
}
