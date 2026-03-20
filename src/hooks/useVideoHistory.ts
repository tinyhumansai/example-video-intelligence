import { useState, useCallback } from 'react'
import type { VideoHistoryEntry, GraphPayload, GraphNode } from '../dashboard/types'

const HISTORY_KEY = 'video-history'
const GRAPH_KEY_PREFIX = 'video-graph-'
const MAX_ENTRIES = 50

function loadEntries(): VideoHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function useVideoHistory() {
  const [entries, setEntries] = useState<VideoHistoryEntry[]>(loadEntries)

  const addEntry = useCallback((videoId: string, name: string, graphData: GraphPayload) => {
    setEntries((prev) => {
      const filtered = prev.filter((e) => e.videoId !== videoId)
      const entry: VideoHistoryEntry = { videoId, name, processedAt: new Date().toISOString() }
      const next = [entry, ...filtered].slice(0, MAX_ENTRIES)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      return next
    })
    localStorage.setItem(`${GRAPH_KEY_PREFIX}${videoId}`, JSON.stringify(graphData))
  }, [])

  const getGraph = useCallback((videoId: string): GraphPayload | null => {
    try {
      const raw = localStorage.getItem(`${GRAPH_KEY_PREFIX}${videoId}`)
      if (!raw) return null
      const parsed = JSON.parse(raw) as GraphPayload
      // Strip stale force-simulation state so dagMode can lay out fresh
      parsed.nodes = parsed.nodes.map((n: GraphNode & Record<string, unknown>) => {
        const { x, y, vx, vy, ...clean } = n
        void x; void y; void vx; void vy
        // Keep fx/fy only on master node (pinned at origin)
        if (clean.id !== 'master-core') {
          delete clean.fx
          delete clean.fy
        }
        return clean as GraphNode
      })
      return parsed
    } catch {
      return null
    }
  }, [])

  return { entries, addEntry, getGraph }
}
