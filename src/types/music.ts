/**
 * Core Music Types for Festival Beats
 */

export type DrumTrackId = 'kick' | 'snare' | 'hihatC' | 'hihatO' | 'clap' | 'taiko' | 'crash';
export type MelodicTrackId = 'bass' | 'chords' | 'lead' | 'arp';
export type TrackId = DrumTrackId | MelodicTrackId;

export interface TrackConfig {
  id: TrackId;
  name: string;
  nameJp: string;
  category: 'drum' | 'melodic';
  color: string;
  volume: number; // 0 to 1
  isMuted: boolean;
  isSolo: boolean;
}

export interface PatternData {
  kick: boolean[];
  snare: boolean[];
  hihatC: boolean[];
  hihatO: boolean[];
  clap: boolean[];
  taiko: boolean[];
  crash: boolean[];
  bass: (string | null)[];
  chords: (string[] | null)[];
  lead: (string | null)[];
  arp: (string | null)[];
}

export interface SongSection {
  id: string;
  name: string;
  nameJp: string;
  pattern: PatternData;
  bars: number;
}

export interface SongPreset {
  id: string;
  title: string;
  titleJp: string;
  genre: string;
  bpm: number;
  key: string;
  scale: string;
  mood: string;
  tagline: string;
  accentColor: string;
  sections: SongSection[];
}

export interface DJPadConfig {
  id: string;
  label: string;
  labelJp: string;
  keyHint: string;
  color: string;
  type: 'airhorn' | 'cheer' | 'riser' | 'scratch' | 'wobble' | 'taiko' | 'laser' | 'mc';
}

export interface MasterFXState {
  filterCutoff: number; // 0 (extreme LP) to 1 (neutral 0.5) to extreme HP (1.0)
  filterResonance: number;
  distortion: number; // 0 to 1
  delayTime: number; // in seconds
  delayFeedback: number; // 0 to 0.8
  reverbAmount: number; // 0 to 1
  masterVolume: number; // 0 to 1
}

export interface AudioVisualizerData {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  bassEnergy: number;
  midEnergy: number;
  trebleEnergy: number;
  beatTrigger: boolean;
}
