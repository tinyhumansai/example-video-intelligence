import type { GraphPayload } from './types'

export const MAX_NODES = 64
export const MASTER_NODE_ID = 'master-core'
export const MAX_LAYER_DEPTH = 5

export const CHANNELS = ['vision', 'audio', 'spatial', 'semantic', 'social'] as const

export const CHANNEL_HUES: Record<string, number> = {
  core: 275,
  vision: 198,
  audio: 24,
  spatial: 152,
  semantic: 292,
  social: 340,
}

export const SIGNAL_WORDS = [
  'gesture',
  'tone',
  'object edge',
  'latency change',
  'light shift',
  'speaker turn',
  'context jump',
  'motion burst',
  'semantic cue',
  'micro-expression',
]

export const MEMORY_ACTIONS = [
  'linked to episodic trace',
  'promoted to working memory',
  'compressed into semantic shard',
  'cross-checked against prior scene',
  'fused with environmental signal',
  'marked as high-salience event',
]

export const INITIAL_GRAPH: GraphPayload = {
  nodes: [
    {
      id: MASTER_NODE_ID,
      layer: 0,
      channel: 'core',
      salience: 1,
      surprise: 24,
      fx: 0,
      fy: 0,
    },
  ],
  links: [],
}
