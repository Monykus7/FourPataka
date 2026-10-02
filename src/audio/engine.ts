import type { Sound } from '../core/music';
import { createVoice, holdParameter, type Voice } from './voice';
export { createVoice } from './voice';
import type { AuditionPhrase } from '../core/comparison';
import type { CompiledScore } from '../core/parser';
import type { TrackInstance } from '../core/project';
import {
  emptyChain,
  chainMusicalSettings,
  chainTopology,
  type Chain,
  type Processing,
} from '../core/pedals';
import {
  createChain,
  chainLatency,
  measureOversamplingLatency,
  measureCompressorLatency,
  type ChainGraph,
} from './effects';

export const VOICE_LIMIT = 32;
interface AuditionBranch {
  graph: ChainGraph;
  align: DelayNode;
  gain: GainNode;
  dispose: () => void;
  retireTimer: ReturnType<typeof setTimeout> | null;
}
interface Session {
  gate: GainNode;
  nodes: AudioNode[];
  voices: Voice[];
  timer: ReturnType<typeof setInterval> | null;
  start: number;
  duration: number;
  mode: 'score' | 'audition';
  cleanup: ReturnType<typeof setTimeout> | null;
  auditionSound: Sound | null;
  solo?: string;
  phraseSeconds: number;
  chains: Map<string, ChainGraph>;
  chainSettings: Map<string, string>;
  latency: number;
  processingTail: number;
  auditionInput: GainNode | null;
  auditionBranches: Set<AuditionBranch>;
  disposers: Set<() => void>;
  scoreSounds: Map<string, Sound>;
  originalSounds: Map<string, Sound>;
  voiceTracks: WeakMap<Voice, string>;
  comparisonTrack: string | null;
}
export class AudioEngine {
  context: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  monitor: GainNode | null = null;
  mix: GainNode | null = null;
  private session: Session | null = null;
  private revision = 0;
  onEnded: (() => void) | null = null;
  monitorValue = 0.35;
  mixValue = 0.8;
  private preparation: Promise<void> | null = null;
  private oversamplingLatency = 0;
  private compressorLatency = 0.006;

  async ready() {
    if (!this.context) {
      this.context = new AudioContext();
      this.mix = this.context.createGain();
      this.mix.gain.value = this.mixValue;
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.7;
      this.monitor = this.context.createGain();
      this.monitor.gain.value = this.monitorValue;
      this.mix.connect(this.analyser);
      this.analyser.connect(this.monitor);
      this.monitor.connect(this.context.destination);
      this.preparation = Promise.all([
        measureOversamplingLatency(this.context.sampleRate),
        measureCompressorLatency(this.context.sampleRate),
      ]).then(([overdrive, compressor]) => {
        this.oversamplingLatency = overdrive;
        this.compressorLatency = compressor;
      });
    }
    await this.preparation;
    await this.context.resume();
    return this.context;
  }
  setMonitor(value: number) {
    this.monitorValue = value;
    this.monitor?.gain.setTargetAtTime(value, this.context!.currentTime, 0.015);
  }
  setMix(value: number) {
    this.mixValue = value;
    this.mix?.gain.setTargetAtTime(value, this.context!.currentTime, 0.015);
  }
  private begin(mode: Session['mode'], duration: number) {
    this.stop(false);
    const context = this.context!;
    const gate = context.createGain();
    gate.connect(this.mix!);
    const session: Session = {
      gate,
      nodes: [],
      voices: [],
      timer: null,
      cleanup: null,
      start: context.currentTime + 0.05,
      duration,
      mode,
      auditionSound: null,
      phraseSeconds: 0,
      chains: new Map(),
      chainSettings: new Map(),
      latency: 0,
      processingTail: 0,
      auditionInput: null,
      auditionBranches: new Set(),
      disposers: new Set(),
      scoreSounds: new Map(),
      originalSounds: new Map(),
      voiceTracks: new WeakMap(),
      comparisonTrack: null,
    };
    this.session = session;
    return session;
  }
  private voice(
    session: Session,
    destination: AudioNode,
    sound: Sound,
    frequency: number,
    start: number,
    duration: number,
    solo?: string,
    trackKey?: string,
  ) {
    const now = this.context!.currentTime;
    session.voices = session.voices.filter((v) => {
      if (v.end <= now) {
        v.dispose();
        return false;
      }
      return true;
    });
    if (session.voices.length >= VOICE_LIMIT) {
      const stolen = session.voices.shift()!;
      holdParameter(stolen.envelope.gain, now);
      stolen.envelope.gain.linearRampToValueAtTime(0, now + 0.01);
      setTimeout(stolen.dispose, 20);
    }
    const voice = createVoice(this.context!, destination, sound, frequency, start, duration, solo);
    session.voices.push(voice);
    if (trackKey) session.voiceTracks.set(voice, trackKey);
  }
  private auditionChain(session: Session, chain: Chain, fade = false) {
    const context = this.context!;
    const graph = createChain(
      context,
      structuredClone(chain),
      this.oversamplingLatency,
      this.compressorLatency,
    );
    // A fixed eight-pedal latency budget keeps differently ordered A/B paths aligned.
    const latency = 8 * Math.max(this.compressorLatency, this.oversamplingLatency);
    const align = context.createDelay(1),
      gain = context.createGain();
    align.delayTime.value = Math.max(0, latency - graph.latency);
    gain.gain.value = fade ? 0 : 1;
    session.auditionInput!.connect(graph.input);
    graph.output.connect(align).connect(gain).connect(session.gate);
    let retired = false;
    let branch: AuditionBranch;
    const dispose = () => {
      if (retired) return;
      retired = true;
      if (branch.retireTimer) clearTimeout(branch.retireTimer);
      try {
        session.auditionInput!.disconnect(graph.input);
      } catch {
        /* already disconnected */
      }
      graph.dispose();
      align.disconnect();
      gain.disconnect();
      session.disposers.delete(dispose);
      session.auditionBranches.delete(branch);
    };
    const previous = [...session.auditionBranches];
    branch = { graph, align, gain, dispose, retireTimer: null };
    session.disposers.add(dispose);
    session.auditionBranches.add(branch);
    session.chains.set('audition', graph);
    session.latency = latency;
    session.processingTail = graph.tail + align.delayTime.value;
    if (fade) {
      const now = context.currentTime;
      // Warm a replacement path before fading; otherwise its latency padding
      // would leave a silence gap. Retarget all unfinished transitions too.
      const at = now + latency + 0.02;
      previous.forEach((old) => {
        if (old.retireTimer) clearTimeout(old.retireTimer);
        holdParameter(old.gain.gain, now);
        old.gain.gain.setValueAtTime(old.gain.gain.value, at);
        old.gain.gain.linearRampToValueAtTime(0, at + 0.02);
        old.retireTimer = setTimeout(old.dispose, (at - now) * 1000 + 35);
      });
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(1, at + 0.02);
    }
  }
  async audition(sound: Sound, frequencies: number[], solo?: string) {
    return this.auditionPhrase(
      sound,
      {
        tempo: 60,
        beats: 1.6,
        events: [{ beat: 0, duration: 1.6, notes: [], frequencies: [...frequencies] }],
      },
      solo,
    );
  }
  async auditionPhrase(
    sound: Sound,
    phrase: AuditionPhrase,
    solo?: string,
    chain: Chain = emptyChain(),
  ) {
    // Context preparation is asynchronous. Stop or a newer Play invalidates
    // this request so a late resume cannot resurrect an already-canceled note.
    const revision = ++this.revision;
    await this.ready();
    if (revision !== this.revision) return;
    const snapshot = structuredClone(sound);
    const session = this.begin('audition', 1.6 + snapshot.release);
    session.auditionSound = snapshot;
    session.auditionInput = this.context!.createGain();
    session.nodes.push(session.auditionInput);
    this.auditionChain(session, chain);
    session.chainSettings.set('audition', chainMusicalSettings(chain));
    session.solo = solo;
    session.phraseSeconds = (phrase.beats * 60) / phrase.tempo;
    session.duration = session.phraseSeconds + snapshot.release + session.processingTail;
    const frozen = structuredClone(phrase);
    let cursor = 0;
    const schedule = () => {
      this.sampleTails(session);
      const horizon = this.context!.currentTime + 0.12;
      while (
        cursor < frozen.events.length &&
        session.start + (frozen.events[cursor].beat * 60) / frozen.tempo < horizon
      ) {
        const event = frozen.events[cursor++];
        event.frequencies.forEach((f) =>
          this.voice(
            session,
            session.auditionInput!,
            session.auditionSound!,
            f,
            session.start + (event.beat * 60) / frozen.tempo,
            (event.duration * 60) / frozen.tempo,
            session.solo,
          ),
        );
      }
      if (this.context!.currentTime >= session.start + session.duration) this.stop();
    };
    schedule();
    session.timer = setInterval(schedule, 25);
  }
  updateAudition(sound: Sound, solo?: string) {
    const session = this.session;
    if (!session || session.mode !== 'audition') return;
    session.auditionSound = structuredClone(sound);
    session.solo = solo;
    session.voices.forEach((v) => v.update(sound, solo));
    session.duration = Math.max(
      session.phraseSeconds + sound.release + session.processingTail,
      ...session.voices.map((v) => v.end - session.start + session.processingTail),
    );
  }
  switchAudition(sound: Sound, chain: Chain, solo?: string) {
    const session = this.session;
    if (!session || session.mode !== 'audition') return;
    const topology = chainTopology(chain);
    if (session.chains.get('audition')!.topology !== topology)
      this.auditionChain(session, chain, true);
    else session.chains.get('audition')!.update(chain);
    this.refreshAuditionTail(session);
    session.chainSettings.set('audition', chainMusicalSettings(chain));
    this.updateAudition(sound, solo);
  }
  updateScoreComparison(sound: Sound, trackKey: string) {
    const session = this.session;
    if (!session || session.mode !== 'score' || !session.originalSounds.has(trackKey)) return;
    const update = (key: string, next: Sound) => {
      session.scoreSounds.set(key, structuredClone(next));
      session.voices.forEach((voice) => {
        if (session.voiceTracks.get(voice) === key) voice.update(next);
      });
    };
    // Restore the previous target from its frozen applied copy, then override
    // both active voices and the map consulted by future scheduled events.
    // Neither operation writes temporary comparison sounds into the project.
    if (session.comparisonTrack && session.comparisonTrack !== trackKey)
      update(session.comparisonTrack, session.originalSounds.get(session.comparisonTrack)!);
    session.comparisonTrack = trackKey;
    update(trackKey, sound);
    session.duration = Math.max(
      session.duration,
      session.phraseSeconds + sound.release + session.processingTail,
      ...session.voices.map((voice) => voice.end - session.start + session.processingTail),
    );
  }
  get comparisonTrack() {
    return this.session?.comparisonTrack ?? null;
  }
  async play(score: CompiledScore, instances: TrackInstance[], processing?: Processing) {
    const revision = ++this.revision;
    await this.ready();
    if (revision !== this.revision) return;
    const tracks = structuredClone(instances);
    const maxRelease = Math.max(0, ...tracks.map((t) => t.sound.release));
    const session = this.begin('score', score.seconds + maxRelease);
    session.phraseSeconds = score.seconds;
    const settings = structuredClone(processing);
    const master = createChain(
      this.context!,
      settings?.master ?? emptyChain(),
      this.oversamplingLatency,
      this.compressorLatency,
    );
    master.output.connect(session.gate);
    session.chains.set('master', master);
    session.chainSettings.set('master', chainMusicalSettings(settings?.master ?? emptyChain()));
    const maxLatency = Math.max(
      0,
      ...tracks.map((t) =>
        chainLatency(
          settings?.tracks[t.key] ?? emptyChain(),
          this.oversamplingLatency,
          this.compressorLatency,
        ),
      ),
    );
    session.latency = maxLatency + master.latency;
    // Pad shorter track paths to maxLatency: simultaneous note starts alone
    // cannot align compressor/oversampling look-ahead before the master mix.
    session.processingTail = master.tail;
    const buses = new Map<string, GainNode>();
    tracks.forEach((t) => {
      session.originalSounds.set(t.key, structuredClone(t.sound));
      session.scoreSounds.set(t.key, structuredClone(t.sound));
      const bus = this.context!.createGain();
      bus.gain.value = t.level;
      const chain = settings?.tracks[t.key] ?? emptyChain();
      const graph = createChain(
        this.context!,
        chain,
        this.oversamplingLatency,
        this.compressorLatency,
      );
      const align = this.context!.createDelay(1);
      align.delayTime.value = maxLatency - graph.latency;
      session.processingTail = Math.max(
        session.processingTail,
        master.tail + graph.tail + align.delayTime.value,
      );
      graph.output.connect(bus).connect(align).connect(master.input);
      session.chains.set('track:' + t.key, graph);
      session.chainSettings.set('track:' + t.key, chainMusicalSettings(chain));
      session.nodes.push(bus, align);
      buses.set(t.key, graph.input);
    });
    session.duration += session.processingTail;
    const queue = [...score.events].sort((a, b) => a.beat - b.beat);
    let cursor = 0;
    const schedule = () => {
      this.sampleTails(session);
      const horizon = this.context!.currentTime + 0.12;
      while (
        cursor < queue.length &&
        session.start + (queue[cursor].beat * 60) / score.tempo < horizon
      ) {
        const event = queue[cursor++];
        const track = tracks.find((t) => t.key === event.track);
        if (!track) continue;
        event.frequencies.forEach((f) =>
          this.voice(
            session,
            buses.get(event.track)!,
            session.scoreSounds.get(event.track)!,
            f,
            session.start + (event.beat * 60) / score.tempo,
            (event.duration * 60) / score.tempo,
            undefined,
            event.track,
          ),
        );
      }
      if (this.context!.currentTime >= session.start + session.duration) this.stop();
    };
    schedule();
    session.timer = setInterval(schedule, 25);
  }
  get progress() {
    return this.session && this.context
      ? Math.max(0, this.context.currentTime - this.session.start)
      : 0;
  }
  get mode() {
    return this.session?.mode ?? null;
  }
  get sampleRate() {
    return this.context?.sampleRate ?? 48000;
  }
  updateProcessing(processing: Processing, side: 'A' | 'B') {
    const session = this.session;
    if (!session) return;
    if (session.mode === 'audition') {
      const chain = processing.audition[side];
      session.chains.get('audition')?.update(chain);
      this.refreshAuditionTail(session);
      // Topology changes stay queued; parameter changes on existing pedals are live.
      session.chainSettings.set('audition', session.chains.get('audition')!.musicalSettings);
    } else
      session.chains.forEach((graph, key) => {
        graph.update(
          key === 'master' ? processing.master : (processing.tracks[key.slice(6)] ?? emptyChain()),
          true,
        );
      });
  }
  processingPending(processing: Processing, side: 'A' | 'B', destination?: string) {
    const session = this.session;
    if (!session) return false;
    return [...session.chains].some(([key, graph]) => {
      if (destination && key !== destination) return false;
      const chain =
        key === 'audition'
          ? processing.audition[side]
          : key === 'master'
            ? processing.master
            : (processing.tracks[key.slice(6)] ?? emptyChain());
      return (
        graph.topology !== chainTopology(chain) ||
        (session.mode === 'score' && session.chainSettings.get(key) !== chainMusicalSettings(chain))
      );
    });
  }
  outputAnalyser(destination: string) {
    return this.session?.chains.get(destination)?.analyser ?? null;
  }
  private refreshAuditionTail(session: Session) {
    // Lengthening a live delay must extend cleanup, including a note already
    // releasing. Never shorten the budget of echoes captured at old settings.
    const remaining = Math.max(
      0,
      ...[...session.auditionBranches].map(
        (branch) => branch.graph.tail + branch.align.delayTime.value,
      ),
    );
    session.processingTail = Math.max(session.processingTail, remaining);
    session.duration = Math.max(
      session.duration,
      session.phraseSeconds + (session.auditionSound?.release ?? 0) + session.processingTail,
      ...session.voices.map((voice) => voice.end - session.start + session.processingTail),
    );
  }
  private sampleTails(session: Session) {
    // Keep activity memory current even while Compose or Instrument is visible,
    // including rests before the first echo and gaps between long repeats.
    session.chains.forEach((graph) => {
      void graph.activeTails;
    });
  }
  activeTails(destination: string) {
    return this.session?.chains.get(destination)?.activeTails ?? [];
  }
  stop(notify = true) {
    // Invalidate pending resume requests only for explicit Stop, not begin().
    if (notify) this.revision++;
    const session = this.session;
    this.session = null;
    if (session && this.context) {
      if (session.timer) clearInterval(session.timer);
      if (session.cleanup) clearTimeout(session.cleanup);
      const now = this.context.currentTime;
      holdParameter(session.gate.gain, now);
      session.gate.gain.linearRampToValueAtTime(0, now + 0.02);
      setTimeout(() => {
        session.voices.forEach((v) => v.dispose());
        session.nodes.forEach((n) => n.disconnect());
        session.chains.forEach((chain) => chain.dispose());
        session.disposers.forEach((dispose) => dispose());
        session.gate.disconnect();
      }, 35);
    }
    if (notify) this.onEnded?.();
  }
  measure() {
    if (!this.analyser || !this.session) return { peak: 0, rms: 0 };
    const values = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(values);
    let sum = 0;
    let peak = 0;
    values.forEach((v) => {
      sum += v * v;
      peak = Math.max(peak, Math.abs(v));
    });
    return { peak, rms: Math.sqrt(sum / values.length) };
  }
}
