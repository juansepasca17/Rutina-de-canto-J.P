// Cuenta regresiva con pausa y ajuste ±s. Se alimenta con update(now) desde requestAnimationFrame.

export class Countdown {
  constructor(total) {
    this.total = total;
    this.left = total;
    this.paused = true;
    this.last = 0;
  }
  start(now) {
    this.last = now;
    this.paused = false;
  }
  pause() {
    this.paused = true;
  }
  resume(now) {
    this.last = now;
    this.paused = false;
  }
  add(seconds) {
    const next = Math.max(1, this.left + seconds);
    this.total = Math.max(1, this.total + (next - this.left));
    this.left = next;
  }
  update(now) {
    if (this.paused) return 0;
    const dt = Math.max(0, (now - this.last) / 1000);
    this.last = now;
    this.left = Math.max(0, this.left - dt);
    return dt;
  }
  get done() {
    return this.left <= 0;
  }
  get progress() {
    return this.total > 0 ? 1 - this.left / this.total : 1;
  }
}

export function fmtTime(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function fmtMinutes(seconds) {
  const m = seconds / 60;
  return m < 10 ? `${(Math.round(m * 2) / 2).toString().replace('.', ',')} min` : `${Math.round(m)} min`;
}
