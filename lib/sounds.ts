// lib/sounds.ts
// Web Audio API-based sound effects (no file dependencies)

let audioCtx: AudioContext | null = null
let muted = false

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

function beep(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.3,
  delay = 0
) {
  if (muted || typeof window === "undefined") return
  try {
    const ctx = getCtx()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay)

    gainNode.gain.setValueAtTime(volume, ctx.currentTime + delay)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration)

    oscillator.start(ctx.currentTime + delay)
    oscillator.stop(ctx.currentTime + delay + duration)
  } catch {
    // Silently fail if audio context not available
  }
}

export const sounds = {
  setMuted(value: boolean) {
    muted = value
  },

  isMuted() {
    return muted
  },

  numberCalled() {
    beep(440, 0.1, "square", 0.2)
    beep(660, 0.15, "sine", 0.15, 0.1)
  },

  cellMarked() {
    beep(523, 0.08, "sine", 0.15)
  },

  lineCompleted() {
    beep(523, 0.1, "sine", 0.3)
    beep(659, 0.1, "sine", 0.3, 0.12)
    beep(784, 0.2, "sine", 0.3, 0.24)
  },

  bingoLetter() {
    beep(880, 0.15, "sine", 0.4)
    beep(1100, 0.2, "sine", 0.4, 0.15)
  },

  victory() {
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      beep(freq, 0.3, "sine", 0.4, i * 0.15)
    })
    beep(1047, 0.8, "sine", 0.5, notes.length * 0.15)
  },

  playerJoined() {
    beep(440, 0.1, "sine", 0.2)
    beep(550, 0.15, "sine", 0.2, 0.12)
  },

  click() {
    beep(300, 0.05, "square", 0.1)
  },
}
