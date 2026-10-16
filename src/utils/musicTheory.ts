/**
 * Music Theory utilities, frequencies, scales, and algorithmic composition
 */

import { PatternData } from '../types/music';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function noteToFreq(note: string): number {
  if (!note) return 0;
  // Format: 'C4', 'F#3', 'Bb2', etc.
  const normalized = note.replace('Db', 'C#').replace('Eb', 'D#').replace('Gb', 'F#').replace('Ab', 'G#').replace('Bb', 'A#');
  const match = normalized.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return 440;
  const name = match[1];
  const octave = parseInt(match[2], 10);
  const noteIndex = NOTE_NAMES.indexOf(name);
  if (noteIndex === -1) return 440;

  // MIDI note: C4 is 60, A4 is 69 (440Hz)
  const midi = (octave + 1) * 12 + noteIndex;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export const SCALES: Record<string, number[]> = {
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  japaneseInsen: [0, 1, 5, 7, 10], // D, Eb, G, A, C (Traditional Japanese festival scale)
  hirajoshi: [0, 2, 3, 7, 8],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  pentatonicMinor: [0, 3, 5, 7, 10],
};

export const PIANO_ROLL_NOTES = [
  'C5', 'B4', 'A#4', 'A4', 'G#4', 'G4', 'F#4', 'F4', 'E4', 'D#4', 'D4', 'C#4',
  'C4', 'B3', 'A#3', 'A3', 'G#3', 'G3', 'F#3', 'F3', 'E3', 'D#3', 'D3', 'C#3',
  'C3', 'B2', 'A#2', 'A2', 'G#2', 'G2', 'F#2', 'F2', 'E2'
];

/**
 * Generate algorithmic festival track patterns
 */
export function generateAlgorithmicTrack(
  genre: 'edm' | 'rock' | 'matsuri' | 'citypop' | 'dnb',
  keyRoot: string = 'F',
  energy: 'high' | 'peak' | 'chill' = 'peak'
): PatternData {
  const rootIndex = NOTE_NAMES.indexOf(keyRoot) >= 0 ? NOTE_NAMES.indexOf(keyRoot) : 5; // default F

  const pattern: PatternData = {
    kick: new Array(16).fill(false),
    snare: new Array(16).fill(false),
    hihatC: new Array(16).fill(false),
    hihatO: new Array(16).fill(false),
    clap: new Array(16).fill(false),
    taiko: new Array(16).fill(false),
    crash: new Array(16).fill(false),
    bass: new Array(16).fill(null),
    chords: new Array(16).fill(null),
    lead: new Array(16).fill(null),
    arp: new Array(16).fill(null),
  };

  const scale = (genre === 'matsuri') ? SCALES.japaneseInsen : (genre === 'citypop' ? SCALES.dorian : SCALES.naturalMinor);

  // Helper to get note name by scale degree and octave
  const getNote = (degree: number, octave: number): string => {
    const semitones = scale[degree % scale.length] + Math.floor(degree / scale.length) * 12;
    const finalNoteIdx = (rootIndex + semitones) % 12;
    const finalOctave = octave + Math.floor((rootIndex + semitones) / 12);
    return `${NOTE_NAMES[finalNoteIdx]}${finalOctave}`;
  };

  if (genre === 'edm') {
    // 4-on-the-floor festival EDM banger
    pattern.kick = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];
    pattern.clap = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
    pattern.hihatC = [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false];
    pattern.hihatO = [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false];
    pattern.crash[0] = true;

    // Bassline (Driving 808 with offbeat bounce)
    pattern.bass[0] = getNote(0, 2);
    pattern.bass[2] = getNote(0, 2);
    pattern.bass[4] = getNote(0, 2);
    pattern.bass[6] = getNote(4, 2);
    pattern.bass[8] = getNote(3, 2);
    pattern.bass[10] = getNote(3, 2);
    pattern.bass[12] = getNote(2, 2);
    pattern.bass[14] = getNote(4, 2);

    // Chords (4-bar progression in 16 steps: i - VI - VII - v)
    const c1 = [getNote(0, 3), getNote(2, 3), getNote(4, 3)];
    const c2 = [getNote(5, 3), getNote(7, 3), getNote(9, 3)];
    const c3 = [getNote(6, 3), getNote(8, 3), getNote(10, 3)];
    pattern.chords[0] = c1;
    pattern.chords[3] = c1;
    pattern.chords[4] = c2;
    pattern.chords[7] = c2;
    pattern.chords[8] = c3;
    pattern.chords[11] = c3;
    pattern.chords[12] = c1;

    // Lead (Festival Anthem Hook)
    pattern.lead[0] = getNote(4, 4);
    pattern.lead[2] = getNote(4, 4);
    pattern.lead[3] = getNote(5, 4);
    pattern.lead[4] = getNote(4, 4);
    pattern.lead[6] = getNote(2, 4);
    pattern.lead[8] = getNote(0, 4);
    pattern.lead[10] = getNote(2, 4);
    pattern.lead[12] = getNote(4, 4);
    pattern.lead[14] = getNote(7, 4);

    // Arp (16th note shimmer)
    for (let i = 0; i < 16; i++) {
      pattern.arp[i] = getNote((i % 4) * 2, 4);
    }
  } else if (genre === 'rock') {
    // High-speed anime/school festival rock!
    pattern.kick = [true, false, false, false, false, false, true, false, false, false, true, false, false, false, false, false];
    pattern.snare = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, true, false];
    pattern.hihatC = [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true];
    pattern.crash[0] = true;
    pattern.crash[8] = true;

    // Rock Bass (8th note driving eighths)
    const b0 = getNote(0, 2);
    const b1 = getNote(3, 2);
    const b2 = getNote(4, 2);
    const b3 = getNote(5, 2);
    pattern.bass = [b0, b0, b0, b0, b1, b1, b1, b1, b2, b2, b2, b2, b3, b3, b2, b1];

    // Chords (Power chords)
    const pc1 = [getNote(0, 3), getNote(4, 3)];
    const pc2 = [getNote(3, 3), getNote(7, 3)];
    const pc3 = [getNote(4, 3), getNote(8, 3)];
    pattern.chords[0] = pc1;
    pattern.chords[4] = pc2;
    pattern.chords[8] = pc3;
    pattern.chords[12] = pc1;

    // Blistering Lead Guitar Melody
    pattern.lead[0] = getNote(7, 4);
    pattern.lead[2] = getNote(6, 4);
    pattern.lead[4] = getNote(4, 4);
    pattern.lead[6] = getNote(5, 4);
    pattern.lead[8] = getNote(7, 4);
    pattern.lead[10] = getNote(9, 4);
    pattern.lead[12] = getNote(11, 4);
    pattern.lead[14] = getNote(7, 4);
  } else if (genre === 'matsuri') {
    // Neo-Japanese Festival Trap
    pattern.taiko = [true, false, false, false, false, false, true, false, true, false, false, false, false, false, true, false];
    pattern.kick = [true, false, false, false, false, false, true, false, true, false, false, false, false, false, false, false];
    pattern.snare = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
    pattern.clap = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, true];
    pattern.hihatC = [true, true, false, true, true, false, true, true, false, true, true, false, true, true, true, true];
    pattern.crash[0] = true;

    // Deep Taiko Bass
    pattern.bass[0] = getNote(0, 2);
    pattern.bass[6] = getNote(0, 2);
    pattern.bass[8] = getNote(3, 2);
    pattern.bass[14] = getNote(4, 2);

    // Koto/Shamisen Insen Melody
    pattern.lead[0] = getNote(0, 4);
    pattern.lead[2] = getNote(1, 4);
    pattern.lead[3] = getNote(2, 4);
    pattern.lead[5] = getNote(3, 4);
    pattern.lead[6] = getNote(2, 4);
    pattern.lead[8] = getNote(4, 4);
    pattern.lead[10] = getNote(3, 4);
    pattern.lead[12] = getNote(1, 4);
    pattern.lead[14] = getNote(0, 4);

    // Pentatonic Arp
    pattern.arp[1] = getNote(2, 4);
    pattern.arp[4] = getNote(3, 4);
    pattern.arp[7] = getNote(4, 4);
    pattern.arp[10] = getNote(2, 4);
    pattern.arp[13] = getNote(1, 4);
  } else if (genre === 'citypop') {
    // Funky School Festival Evening Groove
    pattern.kick = [true, false, false, false, false, false, true, false, false, false, true, false, false, false, false, false];
    pattern.snare = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
    pattern.hihatC = [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true];
    pattern.hihatO = [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false];
    pattern.clap[4] = true;
    pattern.clap[12] = true;

    // Slap Bass line
    pattern.bass[0] = getNote(0, 2);
    pattern.bass[2] = getNote(0, 3);
    pattern.bass[4] = getNote(2, 2);
    pattern.bass[6] = getNote(3, 2);
    pattern.bass[8] = getNote(4, 2);
    pattern.bass[10] = getNote(4, 3);
    pattern.bass[12] = getNote(2, 2);
    pattern.bass[14] = getNote(1, 2);

    // Jazzy 7th/9th Chords
    const chord1 = [getNote(0, 3), getNote(2, 3), getNote(4, 3), getNote(6, 3)];
    const chord2 = [getNote(2, 3), getNote(4, 3), getNote(6, 3), getNote(8, 3)];
    pattern.chords[2] = chord1;
    pattern.chords[6] = chord1;
    pattern.chords[10] = chord2;
    pattern.chords[14] = chord2;

    // Brass Lead Stabs
    pattern.lead[0] = getNote(4, 4);
    pattern.lead[3] = getNote(5, 4);
    pattern.lead[6] = getNote(6, 4);
    pattern.lead[8] = getNote(4, 4);
    pattern.lead[11] = getNote(2, 4);
    pattern.lead[14] = getNote(0, 4);
  } else {
    // DnB
    pattern.kick = [true, false, false, false, false, false, false, false, false, false, true, false, false, false, false, false];
    pattern.snare = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
    pattern.hihatC = [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false];
    pattern.hihatO = [false, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false];
    pattern.crash[0] = true;

    pattern.bass[0] = getNote(0, 2);
    pattern.bass[4] = getNote(0, 2);
    pattern.bass[8] = getNote(2, 2);
    pattern.bass[12] = getNote(3, 2);

    pattern.lead[0] = getNote(4, 4);
    pattern.lead[2] = getNote(7, 4);
    pattern.lead[4] = getNote(6, 4);
    pattern.lead[6] = getNote(4, 4);
    pattern.lead[8] = getNote(9, 4);
    pattern.lead[10] = getNote(7, 4);
    pattern.lead[12] = getNote(4, 4);
    pattern.lead[14] = getNote(2, 4);
  }

  return pattern;
}
