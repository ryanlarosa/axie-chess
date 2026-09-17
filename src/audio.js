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
  playNoise(duration = 0.05, filterFreq = 800) {
    try {
      this.init();
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch (e) {}
  },
  tap() { this.playTone(480, 'sine', 0.03); },
  buy() { 
    this.playTone(392, 'triangle', 0.06, 784); 
  },
  reroll() { 
    this.playTone(280, 'sine', 0.05, 140); 
  },
  evolve() {
    this.playTone(330, 'square', 0.08, 660);
    setTimeout(() => this.playTone(660, 'triangle', 0.18, 1320), 80);
  },
  ult() {
    this.playNoise(0.12, 1200);
    this.playTone(523, 'sawtooth', 0.16, 1046);
    setTimeout(() => this.playTone(1046, 'sine', 0.22), 80);
  },
  levelUp() {
    [261, 329, 392, 523, 659].forEach((f, i) => setTimeout(() => this.playTone(f, 'square', 0.12), i * 65));
  },
  hit() { 
    this.playNoise(0.06, 450);
    this.playTone(120, 'triangle', 0.09, 50); 
  },
  crit() {
    this.playNoise(0.1, 900);
    this.playTone(240, 'sawtooth', 0.08, 60);
    setTimeout(() => this.playTone(440, 'square', 0.12, 110), 40);
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
