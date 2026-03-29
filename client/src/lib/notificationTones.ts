/**
 * Notification tone playback using the Web Audio API.
 * No external files or libraries needed — tones are synthesised programmatically.
 *
 * Each tone is a short melodic sequence designed to be distinct and pleasant.
 */

type ToneId =
  | "default"
  | "tone1"
  | "tone2"
  | "tone3"
  | "tone4"
  | "tone5"
  | "tone6"
  | "tone7";

export const TONE_OPTIONS: Array<{ value: ToneId; label: string }> = [
  { value: "default", label: "Default" },
  { value: "tone1", label: "Alert 1" },
  { value: "tone2", label: "Alert 2" },
  { value: "tone3", label: "Alert 3" },
  { value: "tone4", label: "Alert 4" },
  { value: "tone5", label: "Alert 5" },
  { value: "tone6", label: "Alert 6" },
  { value: "tone7", label: "Alert 7" },
];

// ── Note frequencies in Hz ──────────────────────────────────────────────
const NOTE: Record<string, number> = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  G4: 392.0,  A4: 440.0,  B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
  G5: 783.99, A5: 880.0,
};

// Each "tone" is an array of [freq, duration_seconds, type]
type OscType = "sine" | "triangle" | "square" | "sawtooth";
type Note = [number, number, OscType?];

const TONE_SEQUENCES: Record<ToneId, Note[]> = {
  default: [
    [NOTE.E5, 0.12, "sine"],
    [NOTE.A5, 0.18, "sine"],
  ],
  tone1: [
    [NOTE.C5, 0.1, "sine"],
    [NOTE.E5, 0.1, "sine"],
    [NOTE.G5, 0.15, "sine"],
  ],
  tone2: [
    [NOTE.G4, 0.08, "triangle"],
    [NOTE.C5, 0.08, "triangle"],
    [NOTE.E5, 0.12, "triangle"],
  ],
  tone3: [
    [NOTE.A4, 0.12, "sine"],
    [NOTE.A5, 0.2, "sine"],
  ],
  tone4: [
    [NOTE.D5, 0.07, "triangle"],
    [NOTE.F5, 0.07, "triangle"],
    [NOTE.A5, 0.07, "triangle"],
    [NOTE.D5, 0.12, "triangle"],
  ],
  tone5: [
    [NOTE.C5, 0.06, "sine"],
    [NOTE.D5, 0.06, "sine"],
    [NOTE.E5, 0.06, "sine"],
    [NOTE.F5, 0.12, "sine"],
  ],
  tone6: [
    [NOTE.E4, 0.1, "square"],
    [NOTE.G4, 0.1, "square"],
    [NOTE.B4, 0.1, "square"],
    [NOTE.E5, 0.15, "square"],
  ],
  tone7: [
    [NOTE.A4, 0.08, "sine"],
    [NOTE.C5, 0.08, "sine"],
    [NOTE.E5, 0.08, "sine"],
    [NOTE.A5, 0.08, "sine"],
    [NOTE.E5, 0.15, "sine"],
  ],
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a notification tone by id.
 * Safe to call even if AudioContext isn't allowed yet — errors are silently caught.
 */
export function playNotificationTone(toneId: ToneId | string): void {
  const id = (toneId as ToneId) in TONE_SEQUENCES ? (toneId as ToneId) : "default";
  const sequence = TONE_SEQUENCES[id];

  try {
    const ctx = getAudioContext();
    let startTime = ctx.currentTime + 0.01;

    for (const [freq, dur, type = "sine"] of sequence) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      // Quick attack, smooth decay
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.28, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + dur + 0.01);

      startTime += dur + 0.02; // small gap between notes
    }
  } catch {
    // AudioContext might be unavailable (e.g. in tests or SSR)
  }
}

/**
 * Preview a tone — same as playNotificationTone but exported with a clearer name.
 */
export const previewTone = playNotificationTone;
