/**
 * High-performance Web Audio Synthesizer, Sequencer, and WAV Exporter
 */

import { PatternData, MasterFXState } from '../types/music';
import { noteToFreq } from '../utils/musicTheory';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private djFilter: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayGain: GainNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private distortionNode: WaveShaperNode | null = null;

  // Sequencer state
  private isPlaying: boolean = false;
  private bpm: number = 132;
  private currentStep: number = 0;
  private nextStepTime: number = 0;
  private timerId: number | null = null;
  private pattern: PatternData | null = null;
  private onStepCallback: ((step: number) => void) | null = null;

  // Track volumes & mutes
  private trackVolumes: Record<string, number> = {
    kick: 0.9,
    snare: 0.85,
    hihatC: 0.7,
    hihatO: 0.75,
    clap: 0.8,
    taiko: 0.9,
    crash: 0.75,
    bass: 0.85,
    chords: 0.75,
    lead: 0.85,
    arp: 0.7,
  };
  private trackMutes: Record<string, boolean> = {};
  private trackSolos: Record<string, boolean> = {};

  // FX settings
  private fxState: MasterFXState = {
    filterCutoff: 0.5, // 0.5 is neutral
    filterResonance: 3,
    distortion: 0.15,
    delayTime: 0.25,
    delayFeedback: 0.35,
    reverbAmount: 0.25,
    masterVolume: 0.85,
  };

  constructor() {
    // Lazy initialized on first user interaction
  }

  public init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.fxState.masterVolume, this.ctx.currentTime);

    // Analyser Node for Visualizer
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;

    // DJ Filter
    this.djFilter = this.ctx.createBiquadFilter();
    this.updateDJFilter();

    // Delay Network
    this.delayNode = this.ctx.createDelay(1.0);
    this.delayNode.delayTime.setValueAtTime(this.fxState.delayTime, this.ctx.currentTime);
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.setValueAtTime(this.fxState.delayFeedback, this.ctx.currentTime);
    this.delayGain = this.ctx.createGain();
    this.delayGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.delayGain);

    // Algorithmic Reverb Impulse
    this.reverbConvolver = this.ctx.createConvolver();
    this.reverbConvolver.buffer = this.buildImpulseResponse(this.ctx, 1.8, 2.0);
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.setValueAtTime(this.fxState.reverbAmount, this.ctx.currentTime);
    this.reverbConvolver.connect(this.reverbGain);

    // Distortion
    this.distortionNode = this.ctx.createWaveShaper();
    this.distortionNode.curve = this.makeDistortionCurve(this.fxState.distortion * 50) as any;
    this.distortionNode.oversample = '2x';

    // Graph routing:
    // Source -> DJ Filter -> Distortion -> MasterGain -> Analyser -> Destination
    // Effects sends: DJ Filter -> Delay / Reverb -> MasterGain
    this.djFilter.connect(this.distortionNode);
    this.distortionNode.connect(this.masterGain);

    this.djFilter.connect(this.delayNode);
    this.delayGain.connect(this.masterGain);

    this.djFilter.connect(this.reverbConvolver);
    this.reverbGain.connect(this.masterGain);

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  private buildImpulseResponse(ctx: BaseAudioContext, duration: number, decay: number): AudioBuffer {
    const rate = ctx.sampleRate;
    const length = rate * duration;
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const factor = Math.exp(-n * decay);
      left[i] = ((Math.random() * 2) - 1) * factor;
      right[i] = ((Math.random() * 2) - 1) * factor;
    }
    return impulse;
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = Math.max(0, amount);
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
    }
    return curve;
  }

  public updateDJFilter() {
    if (!this.djFilter || !this.ctx) return;
    const val = this.fxState.filterCutoff; // 0 to 1
    const t = this.ctx.currentTime;

    if (val < 0.48) {
      // Lowpass active (filtering out high frequencies)
      this.djFilter.type = 'lowpass';
      const freq = 120 + Math.pow(val / 0.48, 2.5) * 19880;
      this.djFilter.frequency.setTargetAtTime(freq, t, 0.03);
      this.djFilter.Q.setTargetAtTime(this.fxState.filterResonance, t, 0.03);
    } else if (val > 0.52) {
      // Highpass active (cutting out low bass)
      this.djFilter.type = 'highpass';
      const norm = (val - 0.52) / 0.48;
      const freq = 20 + Math.pow(norm, 2.5) * 7500;
      this.djFilter.frequency.setTargetAtTime(freq, t, 0.03);
      this.djFilter.Q.setTargetAtTime(this.fxState.filterResonance, t, 0.03);
    } else {
      // Flat bypass
      this.djFilter.type = 'allpass';
    }
  }

  public setFxState(newFx: Partial<MasterFXState>) {
    this.fxState = { ...this.fxState, ...newFx };
    if (!this.ctx) return;

    if (newFx.filterCutoff !== undefined || newFx.filterResonance !== undefined) {
      this.updateDJFilter();
    }
    if (newFx.masterVolume !== undefined && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.fxState.masterVolume, this.ctx.currentTime, 0.02);
    }
    if (newFx.reverbAmount !== undefined && this.reverbGain) {
      this.reverbGain.gain.setTargetAtTime(this.fxState.reverbAmount, this.ctx.currentTime, 0.02);
    }
    if (newFx.delayFeedback !== undefined && this.delayFeedback) {
      this.delayFeedback.gain.setTargetAtTime(this.fxState.delayFeedback, this.ctx.currentTime, 0.02);
    }
    if (newFx.delayTime !== undefined && this.delayNode) {
      this.delayNode.delayTime.setTargetAtTime(this.fxState.delayTime, this.ctx.currentTime, 0.02);
    }
    if (newFx.distortion !== undefined && this.distortionNode) {
      this.distortionNode.curve = this.makeDistortionCurve(this.fxState.distortion * 50) as any;
    }
  }

  public getFxState(): MasterFXState {
    return { ...this.fxState };
  }

  public setTrackVolume(trackId: string, volume: number) {
    this.trackVolumes[trackId] = Math.max(0, Math.min(1, volume));
  }

  public setTrackMute(trackId: string, isMuted: boolean) {
    this.trackMutes[trackId] = isMuted;
  }

  public setTrackSolo(trackId: string, isSolo: boolean) {
    this.trackSolos[trackId] = isSolo;
  }

  private isTrackAudible(trackId: string): boolean {
    const hasAnySolo = Object.values(this.trackSolos).some((v) => v);
    if (hasAnySolo) {
      return !!this.trackSolos[trackId];
    }
    return !this.trackMutes[trackId];
  }

  public getTrackVolume(trackId: string): number {
    return this.trackVolumes[trackId] ?? 0.8;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  // ==========================================
  // INSTRUMENT SYNTHESIS METHODS
  // ==========================================

  public playKick(time: number, customCtx?: BaseAudioContext, destination?: AudioNode) {
    const ctx = customCtx || this.ctx;
    if (!ctx) return;
    const dest = destination || this.djFilter!;
    const vol = this.getTrackVolume('kick') * 1.2;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Deep pitch drop
    osc.frequency.setValueAtTime(155, time);
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.12);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);

    // Punch transient click
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(300, time);
    clickGain.gain.setValueAtTime(vol * 0.7, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

    osc.connect(gain);
    gain.connect(dest);
    clickOsc.connect(clickGain);
    clickGain.connect(dest);

    osc.start(time);
    osc.stop(time + 0.35);
    clickOsc.start(time);
    clickOsc.stop(time + 0.03);
  }

  public playSnare(time: number, customCtx?: BaseAudioContext, destination?: AudioNode) {
    const ctx = customCtx || this.ctx;
    if (!ctx) return;
    const dest = destination || this.djFilter!;
    const vol = this.getTrackVolume('snare');

    // Tonal body
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, time);
    osc.frequency.exponentialRampToValueAtTime(90, time + 0.08);
    oscGain.gain.setValueAtTime(vol * 0.6, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.16);

    // Snare noise burst
    const noiseLength = 0.22;
    const bufferSize = ctx.sampleRate * noiseLength;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, time);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.7, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + noiseLength);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);

    noise.start(time);
    noise.stop(time + noiseLength);
  }

  public playHiHat(time: number, isOpen: boolean = false, customCtx?: BaseAudioContext, destination?: AudioNode) {
    const ctx = customCtx || this.ctx;
    if (!ctx) return;
    const dest = destination || this.djFilter!;
    const vol = this.getTrackVolume(isOpen ? 'hihatO' : 'hihatC') * 0.65;
    const duration = isOpen ? 0.32 : 0.05;

    // Metallic frequencies simulation using noise + bandpass
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(9200, time);
    filter.Q.setValueAtTime(3.5, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(time);
    noise.stop(time + duration);
  }

  public playClap(time: number, customCtx?: BaseAudioContext, destination?: AudioNode) {
    const ctx = customCtx || this.ctx;
    if (!ctx) return;
    const dest = destination || this.djFilter!;
    const vol = this.getTrackVolume('clap') * 0.8;

    // Clap has 3 rapid pre-bursts followed by sustained decay
    [0, 0.012, 0.024].forEach((offset) => {
      const burstLen = 0.02;
      const bufSize = ctx.sampleRate * burstLen;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol * 0.5, time + offset);
      g.gain.exponentialRampToValueAtTime(0.001, time + offset + burstLen);
      src.connect(g);
      g.connect(dest);
      src.start(time + offset);
      src.stop(time + offset + burstLen);
    });

    // Main body
    const mainLen = 0.22;
    const mainBuf = ctx.createBuffer(1, ctx.sampleRate * mainLen, ctx.sampleRate);
    const md = mainBuf.getChannelData(0);
    for (let i = 0; i < ctx.sampleRate * mainLen; i++) md[i] = Math.random() * 2 - 1;
    const mainSrc = ctx.createBufferSource();
    mainSrc.buffer = mainBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, time + 0.035);
    filter.Q.setValueAtTime(1.8, time + 0.035);
    const mainG = ctx.createGain();
    mainG.gain.setValueAtTime(vol * 0.8, time + 0.035);
    mainG.gain.exponentialRampToValueAtTime(0.001, time + 0.035 + mainLen);
    mainSrc.connect(filter);
    filter.connect(mainG);
    mainG.connect(dest);
    mainSrc.start(time + 0.035);
    mainSrc.stop(time + 0.035 + mainLen);
  }

  public playTaiko(time: number, customCtx?: BaseAudioContext, destination?: AudioNode) {
    const ctx = customCtx || this.ctx;
    if (!ctx) return;
    const dest = destination || this.djFilter!;
    const vol = this.getTrackVolume('taiko') * 1.3;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.18);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

    // Woody attack click
    const click = ctx.createOscillator();
    const clickG = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(260, time);
    clickG.gain.setValueAtTime(vol * 0.4, time);
    clickG.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

    osc.connect(gain);
    gain.connect(dest);
    click.connect(clickG);
    clickG.connect(dest);

    osc.start(time);
    osc.stop(time + 0.48);
    click.start(time);
    click.stop(time + 0.04);
  }

  public playCrash(time: number, customCtx?: BaseAudioContext, destination?: AudioNode) {
    const ctx = customCtx || this.ctx;
    if (!ctx) return;
    const dest = destination || this.djFilter!;
    const vol = this.getTrackVolume('crash') * 0.7;
    const duration = 1.6;

    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4500, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(time);
    noise.stop(time + duration);
  }

  public playBassNote(note: string, time: number, duration: number = 0.25, customCtx?: BaseAudioContext, destination?: AudioNode) {
    const ctx = customCtx || this.ctx;
    if (!ctx) return;
    const dest = destination || this.djFilter!;
    const vol = this.getTrackVolume('bass') * 0.95;
    const freq = noteToFreq(note);
    if (!freq) return;

    // Dual oscillator: Sub Sine + Saturated Triangle
    const subOsc = ctx.createOscillator();
    const triOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    const triGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq, time);

    triOsc.type = 'triangle';
    triOsc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, time);
    filter.frequency.exponentialRampToValueAtTime(140, time + duration);

    subGain.gain.setValueAtTime(vol, time);
    subGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    triGain.gain.setValueAtTime(vol * 0.6, time);
    triGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    subOsc.connect(subGain);
    triOsc.connect(filter);
    filter.connect(triGain);

    subGain.connect(dest);
    triGain.connect(dest);

    subOsc.start(time);
    subOsc.stop(time + duration);
    triOsc.start(time);
    triOsc.stop(time + duration);
  }

  public playChord(notes: string[], time: number, duration: number = 0.45, customCtx?: BaseAudioContext, destination?: AudioNode) {
    const ctx = customCtx || this.ctx;
    if (!ctx) return;
    const dest = destination || this.djFilter!;
    const vol = (this.getTrackVolume('chords') / notes.length) * 0.75;

    notes.forEach((note) => {
      const freq = noteToFreq(note);
      if (!freq) return;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, time);
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(freq * 1.004, time); // slight detune for lush supersaw

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, time);
      filter.Q.setValueAtTime(2.0, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc1.start(time);
      osc1.stop(time + duration);
      osc2.start(time);
      osc2.stop(time + duration);
    });
  }

  public playLeadNote(note: string, time: number, duration: number = 0.35, customCtx?: BaseAudioContext, destination?: AudioNode) {
    const ctx = customCtx || this.ctx;
    if (!ctx) return;
    const dest = destination || this.djFilter!;
    const vol = this.getTrackVolume('lead') * 0.85;
    const freq = noteToFreq(note);
    if (!freq) return;

    // Dual detuned supersaw with dynamic resonant envelope
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.008, time); // 14 cents detune

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3800, time);
    filter.frequency.exponentialRampToValueAtTime(1400, time + duration);
    filter.Q.setValueAtTime(4.0, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(time);
    osc1.stop(time + duration);
    osc2.start(time);
    osc2.stop(time + duration);
  }

  public playArpNote(note: string, time: number, duration: number = 0.18, customCtx?: BaseAudioContext, destination?: AudioNode) {
    const ctx = customCtx || this.ctx;
    if (!ctx) return;
    const dest = destination || this.djFilter!;
    const vol = this.getTrackVolume('arp') * 0.7;
    const freq = noteToFreq(note);
    if (!freq) return;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, time);
    filter.frequency.exponentialRampToValueAtTime(600, time + duration);
    filter.Q.setValueAtTime(3.0, time);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + duration);
  }

  // ==========================================
  // LIVE DJ PADS & SPECIAL SOUND FX
  // ==========================================

  public triggerPad(type: string) {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    switch (type) {
      case 'airhorn':
        this.playAirhorn(t);
        break;
      case 'cheer':
        this.playCrowdCheer(t);
        break;
      case 'riser':
        this.playRiserSweep(t);
        break;
      case 'scratch':
        this.playScratch(t);
        break;
      case 'wobble':
        this.playBassWobble(t);
        break;
      case 'taiko':
        this.playTaiko(t);
        break;
      case 'laser':
        this.playLaser(t);
        break;
      case 'mc':
        this.playMCSpeech();
        break;
      default:
        break;
    }
  }

  public playAirhorn(time: number) {
    if (!this.ctx) return;
    // Classic festival airhorn blare: 3 rapid bursts with 4 chord tones
    const frequencies = [370, 466, 554, 740]; // F# maj chord blare
    const burstOffsets = [0, 0.12, 0.24];

    burstOffsets.forEach((bOffset) => {
      frequencies.forEach((f) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, time + bOffset);
        osc.frequency.exponentialRampToValueAtTime(f * 1.02, time + bOffset + 0.08);

        gain.gain.setValueAtTime(0.2, time + bOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, time + bOffset + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(time + bOffset);
        osc.stop(time + bOffset + 0.11);
      });
    });
  }

  public playCrowdCheer(time: number) {
    if (!this.ctx) return;
    const duration = 2.5;
    const bufSize = this.ctx.sampleRate * duration;
    const buf = this.ctx.createBuffer(2, bufSize, this.ctx.sampleRate);

    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < bufSize; i++) {
        d[i] = (Math.random() * 2 - 1) * 0.8;
      }
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, time);
    filter.frequency.linearRampToValueAtTime(1800, time + 1.0);
    filter.Q.setValueAtTime(1.2, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, time);
    gain.gain.linearRampToValueAtTime(0.7, time + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    src.start(time);
    src.stop(time + duration);
  }

  public playRiserSweep(time: number) {
    if (!this.ctx) return;
    const duration = 1.8;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, time);
    osc.frequency.exponentialRampToValueAtTime(2200, time + duration);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(100, time);
    filter.frequency.exponentialRampToValueAtTime(3500, time + duration);
    filter.Q.setValueAtTime(5.0, time);

    gain.gain.setValueAtTime(0.05, time);
    gain.gain.linearRampToValueAtTime(0.65, time + duration * 0.85);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(time);
    osc.stop(time + duration);
  }

  public playScratch(time: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, time);
    osc.frequency.exponentialRampToValueAtTime(90, time + 0.15);

    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(time);
    osc.stop(time + 0.17);
  }

  public playBassWobble(time: number) {
    if (!this.ctx) return;
    const duration = 0.6;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, time); // C2

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(7, time); // 7Hz wobble
    lfoGain.gain.setValueAtTime(900, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, time);
    filter.Q.setValueAtTime(8, time);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    gain.gain.setValueAtTime(0.85, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(time);
    osc.stop(time + duration);
    lfo.start(time);
    lfo.stop(time + duration);
  }

  public playLaser(time: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2600, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.12);

    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(time);
    osc.stop(time + 0.13);
  }

  public playMCSpeech(customText?: string) {
    const phrases = [
      '文化祭開幕！最高に盛り上がっていこうぜ！',
      'Are you ready?! Make some noise!',
      '3, 2, 1, Let\'s go!',
      'みんな両手を挙げて！最高のステージだ！',
    ];
    const text = customText || phrases[Math.floor(Math.random() * phrases.length)];

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'ja-JP';
      utter.rate = 1.15;
      utter.pitch = 1.05;
      window.speechSynthesis.speak(utter);
    }
  }

  // ==========================================
  // SEQUENCER SCHEDULER (LOOKAHEAD CLOCK)
  // ==========================================

  public start(pattern: PatternData, bpm: number, onStep: (step: number) => void) {
    this.init();
    if (!this.ctx) return;

    this.pattern = pattern;
    this.bpm = bpm;
    this.onStepCallback = onStep;
    this.isPlaying = true;
    this.currentStep = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;

    this.scheduleLoop();
  }

  public updatePattern(pattern: PatternData) {
    this.pattern = pattern;
  }

  public setBpm(bpm: number) {
    this.bpm = Math.max(60, Math.min(220, bpm));
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.currentStep = 0;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private scheduleLoop = () => {
    if (!this.isPlaying || !this.ctx || !this.pattern) return;

    // Lookahead: schedule events for the next 80ms
    const secondsPer16th = (60 / this.bpm) / 4;
    while (this.nextStepTime < this.ctx.currentTime + 0.08) {
      this.playStepAt(this.currentStep, this.nextStepTime);

      const stepNotice = this.currentStep;
      // Schedule visual update aligned with audio time
      const delayMs = Math.max(0, (this.nextStepTime - this.ctx.currentTime) * 1000);
      setTimeout(() => {
        if (this.isPlaying && this.onStepCallback) {
          this.onStepCallback(stepNotice);
        }
      }, delayMs);

      this.nextStepTime += secondsPer16th;
      this.currentStep = (this.currentStep + 1) % 16;
    }

    this.timerId = window.setTimeout(this.scheduleLoop, 25);
  };

  private playStepAt(step: number, time: number) {
    if (!this.pattern) return;

    if (this.pattern.kick[step] && this.isTrackAudible('kick')) {
      this.playKick(time);
    }
    if (this.pattern.snare[step] && this.isTrackAudible('snare')) {
      this.playSnare(time);
    }
    if (this.pattern.hihatC[step] && this.isTrackAudible('hihatC')) {
      this.playHiHat(time, false);
    }
    if (this.pattern.hihatO[step] && this.isTrackAudible('hihatO')) {
      this.playHiHat(time, true);
    }
    if (this.pattern.clap[step] && this.isTrackAudible('clap')) {
      this.playClap(time);
    }
    if (this.pattern.taiko[step] && this.isTrackAudible('taiko')) {
      this.playTaiko(time);
    }
    if (this.pattern.crash[step] && this.isTrackAudible('crash')) {
      this.playCrash(time);
    }
    if (this.pattern.bass[step] && this.isTrackAudible('bass')) {
      const note = this.pattern.bass[step];
      if (note) this.playBassNote(note, time, (60 / this.bpm) / 2);
    }
    if (this.pattern.chords[step] && this.isTrackAudible('chords')) {
      const chord = this.pattern.chords[step];
      if (chord && chord.length > 0) this.playChord(chord, time, (60 / this.bpm) / 2);
    }
    if (this.pattern.lead[step] && this.isTrackAudible('lead')) {
      const note = this.pattern.lead[step];
      if (note) this.playLeadNote(note, time, (60 / this.bpm) / 3);
    }
    if (this.pattern.arp[step] && this.isTrackAudible('arp')) {
      const note = this.pattern.arp[step];
      if (note) this.playArpNote(note, time, (60 / this.bpm) / 4);
    }
  }

  // ==========================================
  // OFFLINE WAV EXPORT ENGINE
  // ==========================================

  public async exportSongToWav(
    pattern: PatternData,
    bpm: number,
    repeatBars: number = 4,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    const sampleRate = 44100;
    const secondsPer16th = (60 / bpm) / 4;
    const totalSteps = 16 * repeatBars;
    const totalDuration = totalSteps * secondsPer16th + 1.5; // with reverb tail

    const OfflineCtxClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const offlineCtx = new OfflineCtxClass(2, Math.ceil(sampleRate * totalDuration), sampleRate);

    // Setup offline master bus
    const masterGain = offlineCtx.createGain();
    masterGain.gain.setValueAtTime(this.fxState.masterVolume, 0);

    // Filter
    const djFilter = offlineCtx.createBiquadFilter();
    djFilter.type = 'allpass';

    // Delay
    const delay = offlineCtx.createDelay(1.0);
    delay.delayTime.setValueAtTime(this.fxState.delayTime, 0);
    const delayFb = offlineCtx.createGain();
    delayFb.gain.setValueAtTime(this.fxState.delayFeedback, 0);
    const delayG = offlineCtx.createGain();
    delayG.gain.setValueAtTime(0.2, 0);
    delay.connect(delayFb);
    delayFb.connect(delay);
    delay.connect(delayG);

    // Reverb
    const reverb = offlineCtx.createConvolver();
    reverb.buffer = this.buildImpulseResponse(offlineCtx, 1.8, 2.0);
    const reverbG = offlineCtx.createGain();
    reverbG.gain.setValueAtTime(this.fxState.reverbAmount, 0);
    reverb.connect(reverbG);

    // Routing
    djFilter.connect(masterGain);
    djFilter.connect(delay);
    delayG.connect(masterGain);
    djFilter.connect(reverb);
    reverbG.connect(masterGain);
    masterGain.connect(offlineCtx.destination);

    // Schedule all steps
    for (let stepIndex = 0; stepIndex < totalSteps; stepIndex++) {
      const step = stepIndex % 16;
      const t = stepIndex * secondsPer16th;

      if (pattern.kick[step] && this.isTrackAudible('kick')) {
        this.playKick(t, offlineCtx, djFilter);
      }
      if (pattern.snare[step] && this.isTrackAudible('snare')) {
        this.playSnare(t, offlineCtx, djFilter);
      }
      if (pattern.hihatC[step] && this.isTrackAudible('hihatC')) {
        this.playHiHat(t, false, offlineCtx, djFilter);
      }
      if (pattern.hihatO[step] && this.isTrackAudible('hihatO')) {
        this.playHiHat(t, true, offlineCtx, djFilter);
      }
      if (pattern.clap[step] && this.isTrackAudible('clap')) {
        this.playClap(t, offlineCtx, djFilter);
      }
      if (pattern.taiko[step] && this.isTrackAudible('taiko')) {
        this.playTaiko(t, offlineCtx, djFilter);
      }
      if (pattern.crash[step] && this.isTrackAudible('crash')) {
        this.playCrash(t, offlineCtx, djFilter);
      }
      if (pattern.bass[step] && this.isTrackAudible('bass')) {
        const note = pattern.bass[step];
        if (note) this.playBassNote(note, t, secondsPer16th * 2, offlineCtx, djFilter);
      }
      if (pattern.chords[step] && this.isTrackAudible('chords')) {
        const chord = pattern.chords[step];
        if (chord) this.playChord(chord, t, secondsPer16th * 2, offlineCtx, djFilter);
      }
      if (pattern.lead[step] && this.isTrackAudible('lead')) {
        const note = pattern.lead[step];
        if (note) this.playLeadNote(note, t, secondsPer16th * 1.5, offlineCtx, djFilter);
      }
      if (pattern.arp[step] && this.isTrackAudible('arp')) {
        const note = pattern.arp[step];
        if (note) this.playArpNote(note, t, secondsPer16th, offlineCtx, djFilter);
      }

      if (onProgress && stepIndex % 8 === 0) {
        onProgress(Math.round((stepIndex / totalSteps) * 60));
      }
    }

    if (onProgress) onProgress(75);
    const renderedBuffer = await offlineCtx.startRendering();
    if (onProgress) onProgress(90);

    const wavBlob = this.audioBufferToWav(renderedBuffer);
    if (onProgress) onProgress(100);
    return wavBlob;
  }

  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * blockAlign;
    const bufferArray = new ArrayBuffer(44 + dataLength);
    const view = new DataView(bufferArray);

    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this.writeString(view, 8, 'WAVE');

    // fmt subchunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, format, true); // AudioFormat
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    // data subchunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write interleaved samples
    const channels = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        let sample = channels[channel][i];
        // Clip sample
        sample = Math.max(-1, Math.min(1, sample));
        // Scale to 16-bit integer
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

// Global audio engine singleton
export const audioEngine = new AudioEngine();
