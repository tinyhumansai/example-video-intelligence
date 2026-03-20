import { MEMORY_ACTIONS, SIGNAL_WORDS } from './constants'
import type { Thought } from './types'

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const randomFrom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

export const buildThought = (surprise: number, nodeId: string): Thought => {
  const now = new Date()
  const tone =
    surprise > 75
      ? 'Novelty spike'
      : surprise > 45
        ? 'Adaptive update'
        : 'Pattern reinforcement'

  return {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    text: `${tone}: ${randomFrom(SIGNAL_WORDS)} ${randomFrom(MEMORY_ACTIONS)} via ${nodeId}.`,
    at: now.toLocaleTimeString([], { hour12: false }),
  }
}
