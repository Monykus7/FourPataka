import { components, dbToGain, type Sound } from '../core/music';
import type { CompiledScore } from '../core/parser';
import type { TrackInstance } from '../core/project';

export const VOICE_LIMIT = 32;
export interface Voice { envelope: GainNode; oscillators: OscillatorNode[]; end: number; dispose: () => void }
// Shared source factory, deliberately usable by OfflineAudioContext for later export.
export function createVoice(context: BaseAudioContext, destination: AudioNode, sound: Sound, frequency: number, start: number, duration: number, solo?: string): Voice {
  const envelope = context.createGain();
  const trim = dbToGain(sound.trim);
  const reached = trim * Math.min(1, duration / sound.attack);
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(reached, start + Math.min(sound.attack, duration));
  envelope.gain.setValueAtTime(reached, start + duration);
  envelope.gain.linearRampToValueAtTime(0, start + duration + sound.release);
  envelope.connect(destination);
  const partials = components(sound, frequency, context.sampleRate).filter(p => p.available && p.magnitude > 0 && (!solo || p.label === solo));
  const oscillators: OscillatorNode[] = [];
  const harmonics = partials.filter(p => p.kind === 'harmonic');
  if (harmonics.length) {
    const real = new Float32Array(17); const imag = new Float32Array(17);
    harmonics.forEach(p => { imag[p.index + 1] = p.magnitude * p.polarity; });
    const oscillator = context.createOscillator();
    oscillator.setPeriodicWave(context.createPeriodicWave(real, imag, { disableNormalization: true }));
    oscillator.frequency.value = frequency; oscillator.connect(envelope); oscillators.push(oscillator);
  }
  const subGains: GainNode[] = [];
  partials.filter(p => p.kind === 'undertone').forEach(p => {
    const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.frequency.value = p.frequency; oscillator.type = 'sine'; gain.gain.value = p.magnitude;
    oscillator.connect(gain); gain.connect(envelope); subGains.push(gain); oscillators.push(oscillator);
  });
  const end = start + duration + sound.release;
  let disposed = false;
  const dispose = () => {
    if (disposed) return; disposed = true;
    oscillators.forEach(o => { try { o.stop(); } catch { /* already stopped */ } o.disconnect(); });
    subGains.forEach(g => g.disconnect()); envelope.disconnect();
  };
  oscillators.forEach(o => { o.start(start); o.stop(end + .005); });
  return { envelope, oscillators, end, dispose };
}

interface Session { gate: GainNode; nodes: AudioNode[]; voices: Voice[]; timer: ReturnType<typeof setInterval> | null; start: number; duration: number; mode: 'score' | 'audition'; cleanup: ReturnType<typeof setTimeout> | null }
export class AudioEngine {
  context: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  monitor: GainNode | null = null;
  mix: GainNode | null = null;
  private session: Session | null = null;
  private revision = 0;
  onEnded: (() => void) | null = null;
  monitorValue = .35;
  mixValue = .8;

  async ready() {
    if (!this.context) {
      this.context = new AudioContext();
      this.mix = this.context.createGain(); this.mix.gain.value = this.mixValue;
      this.analyser = this.context.createAnalyser(); this.analyser.fftSize = 2048; this.analyser.smoothingTimeConstant = .7;
      this.monitor = this.context.createGain(); this.monitor.gain.value = this.monitorValue;
      this.mix.connect(this.analyser); this.analyser.connect(this.monitor); this.monitor.connect(this.context.destination);
    }
    await this.context.resume();
    return this.context;
  }
  setMonitor(value: number) { this.monitorValue = value; this.monitor?.gain.setTargetAtTime(value, this.context!.currentTime, .015); }
  setMix(value: number) { this.mixValue = value; this.mix?.gain.setTargetAtTime(value, this.context!.currentTime, .015); }
  private begin(mode: Session['mode'], duration: number) {
    this.stop(false);
    const context = this.context!;
    const gate = context.createGain(); gate.connect(this.mix!);
    const session: Session = { gate, nodes: [], voices: [], timer: null, cleanup: null, start: context.currentTime + .05, duration, mode };
    this.session = session;
    return session;
  }
  private voice(session: Session, destination: AudioNode, sound: Sound, frequency: number, start: number, duration: number, solo?: string) {
    const now = this.context!.currentTime;
    session.voices = session.voices.filter(v => { if (v.end <= now) { v.dispose(); return false; } return true; });
    if (session.voices.length >= VOICE_LIMIT) {
      const stolen = session.voices.shift()!;
      stolen.envelope.gain.cancelAndHoldAtTime(now);
      stolen.envelope.gain.linearRampToValueAtTime(0, now + .01);
      setTimeout(stolen.dispose, 20);
    }
    session.voices.push(createVoice(this.context!, destination, sound, frequency, start, duration, solo));
  }
  async audition(sound: Sound, frequencies: number[], solo?: string) {
    const revision = ++this.revision;
    await this.ready();
    if (revision !== this.revision) return;
    const snapshot = structuredClone(sound);
    const session = this.begin('audition', 1.6 + snapshot.release);
    frequencies.forEach(frequency => this.voice(session, session.gate, snapshot, frequency, session.start, 1.6, solo));
    session.cleanup = setTimeout(() => { if (this.session === session) this.stop(); }, (session.duration + .07) * 1000);
  }
  async play(score: CompiledScore, instances: TrackInstance[]) {
    const revision = ++this.revision;
    await this.ready();
    if (revision !== this.revision) return;
    const tracks = structuredClone(instances);
    const maxRelease = Math.max(0, ...tracks.map(t => t.sound.release));
    const session = this.begin('score', score.seconds + maxRelease);
    const buses = new Map<string, GainNode>();
    tracks.forEach(t => { const bus = this.context!.createGain(); bus.gain.value = t.level; bus.connect(session.gate); session.nodes.push(bus); buses.set(t.key, bus); });
    const queue = [...score.events].sort((a, b) => a.beat - b.beat);
    let cursor = 0;
    const schedule = () => {
      const horizon = this.context!.currentTime + .12;
      while (cursor < queue.length && session.start + queue[cursor].beat * 60 / score.tempo < horizon) {
        const event = queue[cursor++]; const track = tracks.find(t => t.key === event.track);
        if (!track) continue;
        event.frequencies.forEach(f => this.voice(session, buses.get(event.track)!, track.sound, f, session.start + event.beat * 60 / score.tempo, event.duration * 60 / score.tempo));
      }
      if (this.context!.currentTime >= session.start + session.duration) this.stop();
    };
    schedule(); session.timer = setInterval(schedule, 25);
  }
  get progress() { return this.session && this.context ? Math.max(0, this.context.currentTime - this.session.start) : 0; }
  get mode() { return this.session?.mode ?? null; }
  get sampleRate() { return this.context?.sampleRate ?? 48000; }
  stop(notify = true) {
    // Invalidate pending resume requests only for explicit Stop, not begin().
    if (notify) this.revision++;
    const session = this.session; this.session = null;
    if (session && this.context) {
      if (session.timer) clearInterval(session.timer);
      if (session.cleanup) clearTimeout(session.cleanup);
      const now = this.context.currentTime;
      session.gate.gain.cancelAndHoldAtTime(now); session.gate.gain.linearRampToValueAtTime(0, now + .02);
      setTimeout(() => { session.voices.forEach(v => v.dispose()); session.nodes.forEach(n => n.disconnect()); session.gate.disconnect(); }, 35);
    }
    if (notify) this.onEnded?.();
  }
  measure() {
    if (!this.analyser || !this.session) return { peak: 0, rms: 0 };
    const values = new Float32Array(this.analyser.fftSize); this.analyser.getFloatTimeDomainData(values);
    let sum = 0; let peak = 0;
    values.forEach(v => { sum += v * v; peak = Math.max(peak, Math.abs(v)); });
    return { peak, rms: Math.sqrt(sum / values.length) };
  }
}
