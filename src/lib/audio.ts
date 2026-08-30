/**
 * Alarm audio.
 *
 * Every tone is synthesised — no audio files. That keeps the offline bundle tiny
 * and, more importantly, lets an alarm be *scheduled on the audio thread* the
 * moment a countdown starts. The audio clock is not subject to the timer
 * throttling browsers apply to hidden tabs, so a pomodoro that ends while the
 * tab is in the background still chimes at exactly the right second, even if the
 * JavaScript that drives the UI is a beat late to notice.
 */

export const SOUND_IDS = ['chime', 'bell', 'beep', 'ring', 'block', 'pulse', 'none'] as const
export type SoundId = (typeof SOUND_IDS)[number]

export const SOUND_LABELS: Record<SoundId, string> = {
  chime: 'Soft chime',
  bell: 'Clean bell',
  beep: 'Double beep',
  ring: 'Long ring',
  block: 'Wood block',
  pulse: 'Low pulse',
  none: 'Silent',
}

/** Per-sound trim so every tone lands at roughly the same perceived loudness. */
const TRIM: Record<SoundId, number> = {
  chime: 0.9,
  bell: 0.85,
  beep: 0.55,
  ring: 0.7,
  block: 0.75,
  pulse: 0.95,
  none: 0,
}

interface ScheduledVoice {
  sound: SoundId
  volume: number
  at: number
  stop: () => void
}

type AudioContextConstructor = typeof AudioContext

let context: AudioContext | null = null
let noiseBuffer: AudioBuffer | null = null
let unavailable = false
const scheduled = new Map<string, ScheduledVoice>()

function getConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null
  const legacy = (window as unknown as { webkitAudioContext?: AudioContextConstructor })
    .webkitAudioContext
  return window.AudioContext ?? legacy ?? null
}

function ensureContext(): AudioContext | null {
  if (context || unavailable) return context
  const Ctor = getConstructor()
  if (!Ctor) {
    unavailable = true
    return null
  }
  try {
    context = new Ctor({ latencyHint: 'interactive' })
  } catch {
    unavailable = true
    return null
  }
  return context
}

/**
 * Browsers require a gesture before audio may start. Called from the first
 * pointer or key event; also nudges a context the browser suspended later on.
 */
export function unlockAudio(): void {
  const ctx = ensureContext()
  if (!ctx) return
  if (ctx.state !== 'running') void ctx.resume().catch(() => undefined)

  // A one-frame silent buffer is what actually unlocks iOS.
  try {
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
  } catch {
    /* nothing to do — playback will fall back to the live path */
  }
}

export function audioState(): 'unavailable' | AudioContextState {
  if (unavailable) return 'unavailable'
  return context?.state ?? 'suspended'
}

function getNoise(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer
  const length = Math.floor(ctx.sampleRate * 0.4)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1
  noiseBuffer = buffer
  return buffer
}

interface VoiceBuilder {
  ctx: AudioContext
  bus: GainNode
  sources: AudioScheduledSourceNode[]
  end: number
}

function partial(
  builder: VoiceBuilder,
  options: {
    freq: number
    at: number
    duration: number
    gain: number
    type?: OscillatorType
    attack?: number
    detune?: number
  },
): void {
  const { ctx, bus } = builder
  const { freq, at, duration, gain, type = 'sine', attack = 0.006, detune = 0 } = options

  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.value = freq
  if (detune) osc.detune.value = detune

  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, at)
  env.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), at + attack)
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration)

  osc.connect(env).connect(bus)
  osc.start(at)
  osc.stop(at + duration + 0.02)
  builder.sources.push(osc)
  builder.end = Math.max(builder.end, at + duration + 0.02)
}

function click(
  builder: VoiceBuilder,
  options: { at: number; freq: number; q: number; duration: number; gain: number },
): void {
  const { ctx, bus } = builder
  const { at, freq, q, duration, gain } = options

  const source = ctx.createBufferSource()
  source.buffer = getNoise(ctx)

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  filter.Q.value = q

  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, at)
  env.gain.exponentialRampToValueAtTime(gain, at + 0.003)
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration)

  source.connect(filter).connect(env).connect(bus)
  source.start(at)
  source.stop(at + duration + 0.02)
  builder.sources.push(source)
  builder.end = Math.max(builder.end, at + duration + 0.02)
}

function buildVoice(ctx: AudioContext, sound: SoundId, at: number, level: number): VoiceBuilder {
  const bus = ctx.createGain()
  bus.gain.value = level
  bus.connect(ctx.destination)

  const builder: VoiceBuilder = { ctx, bus, sources: [], end: at }

  switch (sound) {
    case 'chime': {
      partial(builder, { freq: 880, at, duration: 1.1, gain: 0.5, attack: 0.012 })
      partial(builder, { freq: 1320, at: at + 0.11, duration: 1.25, gain: 0.34, attack: 0.012 })
      partial(builder, { freq: 2640, at: at + 0.11, duration: 0.5, gain: 0.06 })
      break
    }
    case 'bell': {
      const root = 660
      partial(builder, { freq: root, at, duration: 2.1, gain: 0.46, attack: 0.004 })
      partial(builder, { freq: root * 2.0, at, duration: 1.5, gain: 0.2, attack: 0.004 })
      partial(builder, { freq: root * 2.98, at, duration: 0.9, gain: 0.11, attack: 0.003 })
      partial(builder, { freq: root * 4.12, at, duration: 0.45, gain: 0.06, attack: 0.003 })
      click(builder, { at, freq: root * 3, q: 1.6, duration: 0.045, gain: 0.05 })
      break
    }
    case 'beep': {
      for (let i = 0; i < 2; i += 1) {
        partial(builder, {
          freq: 1046.5,
          at: at + i * 0.19,
          duration: 0.11,
          gain: 0.42,
          type: 'triangle',
          attack: 0.004,
        })
      }
      break
    }
    case 'ring': {
      for (let i = 0; i < 5; i += 1) {
        const start = at + i * 0.42
        const freq = i % 2 === 0 ? 784 : 1046.5
        partial(builder, { freq, at: start, duration: 0.4, gain: 0.4, attack: 0.005 })
        partial(builder, { freq: freq * 2, at: start, duration: 0.24, gain: 0.14 })
      }
      break
    }
    case 'block': {
      for (let i = 0; i < 2; i += 1) {
        const start = at + i * 0.17
        click(builder, { at: start, freq: 1500, q: 9, duration: 0.06, gain: 0.5 })
        partial(builder, { freq: 780, at: start, duration: 0.09, gain: 0.24, attack: 0.002 })
      }
      break
    }
    case 'pulse': {
      for (let i = 0; i < 3; i += 1) {
        const start = at + i * 0.33
        partial(builder, { freq: 196, at: start, duration: 0.22, gain: 0.5, attack: 0.02 })
        partial(builder, { freq: 392, at: start, duration: 0.2, gain: 0.16, attack: 0.02 })
      }
      break
    }
    case 'none':
      break
  }

  return builder
}

function stopBuilder(builder: VoiceBuilder): void {
  const { ctx, bus, sources } = builder
  const now = ctx.currentTime
  try {
    bus.gain.cancelScheduledValues(now)
    bus.gain.setValueAtTime(bus.gain.value, now)
    bus.gain.linearRampToValueAtTime(0.0001, now + 0.02)
  } catch {
    /* ignore */
  }
  for (const source of sources) {
    try {
      source.stop(now + 0.03)
    } catch {
      /* already stopped */
    }
  }
  window.setTimeout(() => {
    for (const source of sources) source.disconnect()
    bus.disconnect()
  }, 80)
}

function levelFor(sound: SoundId, volume: number): number {
  // Perceptual curve: linear gain tracks loudness poorly at the low end.
  return Math.pow(Math.min(1, Math.max(0, volume)), 1.7) * TRIM[sound] * 0.9
}

/** Play immediately. Used for previews and as the fallback when scheduling was not possible. */
export function playSound(sound: SoundId, volume: number): void {
  if (sound === 'none' || volume <= 0) return
  const ctx = ensureContext()
  if (!ctx) return
  if (ctx.state !== 'running') void ctx.resume().catch(() => undefined)

  const builder = buildVoice(ctx, sound, ctx.currentTime + 0.02, levelFor(sound, volume))
  window.setTimeout(
    () => {
      for (const source of builder.sources) source.disconnect()
      builder.bus.disconnect()
    },
    Math.ceil((builder.end - ctx.currentTime) * 1000) + 200,
  )
}

/**
 * Queue a tone for an absolute wall-clock instant. Returns true when the audio
 * thread has taken ownership of it, which tells the caller not to play the same
 * tone again when JavaScript later notices the deadline passed.
 */
export function scheduleSound(
  key: string,
  sound: SoundId,
  volume: number,
  at: number,
): boolean {
  cancelSound(key)
  if (sound === 'none' || volume <= 0) return false

  const ctx = ensureContext()
  if (!ctx || ctx.state !== 'running') return false

  const offset = (at - Date.now()) / 1000
  if (offset < 0.05) return false

  const builder = buildVoice(ctx, sound, ctx.currentTime + offset, levelFor(sound, volume))
  scheduled.set(key, {
    sound,
    volume,
    at,
    stop: () => stopBuilder(builder),
  })
  return true
}

export function cancelSound(key: string): void {
  const voice = scheduled.get(key)
  if (!voice) return
  scheduled.delete(key)
  voice.stop()
}

/**
 * Called when a deadline is reached. Returns true if the audio thread already
 * played (or is playing) this alarm, so the caller can skip the live fallback.
 */
export function claimScheduled(key: string, at: number): boolean {
  const voice = scheduled.get(key)
  if (!voice) return false
  scheduled.delete(key)
  return Math.abs(voice.at - at) < 1000
}

/**
 * Re-anchor pending alarms if the audio clock drifted from wall time — which
 * happens when a browser suspends the context while the tab is hidden.
 */
export function resyncScheduled(): void {
  const ctx = context
  if (!ctx || scheduled.size === 0) return

  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => undefined)
    for (const [key, voice] of [...scheduled]) {
      voice.stop()
      scheduled.delete(key)
      scheduleSound(key, voice.sound, voice.volume, voice.at)
    }
  }
}

export function hasScheduled(key: string): boolean {
  return scheduled.has(key)
}
