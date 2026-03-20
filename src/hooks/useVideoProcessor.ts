import { useCallback, useRef, useState } from 'react'
import { uploadVideo, connectProcessingStream } from '../api/client'
import { CHANNELS, INITIAL_GRAPH, MAX_LAYER_DEPTH } from '../dashboard/constants'
import type { GraphPayload, Thought } from '../dashboard/types'
import { clamp, randomFrom } from '../dashboard/utils'

export type ProcessingStage = 'idle' | 'uploading' | 'analyzing' | 'building_memories' | 'ingesting' | 'complete' | 'error'

export interface VideoProcessorState {
  stage: ProcessingStage
  stageMessage: string
  videoId: string | null
  videoUrl: string | null
  graphData: GraphPayload
  surprise: number
  thoughts: Thought[]
  memoriesIngested: number
  totalMemories: number
  scenesFound: number
  elapsedSeconds: number
  summary: string | null
  error: string | null
}

const CHANNEL_FOR_TYPE: Record<string, string> = {
  scene: 'vision',
  dialogue: 'audio',
  summary: 'semantic',
  emotion: 'social',
}

export function useVideoProcessor() {
  const [state, setState] = useState<VideoProcessorState>({
    stage: 'idle',
    stageMessage: '',
    videoId: null,
    videoUrl: null,
    graphData: INITIAL_GRAPH,
    surprise: 0,
    thoughts: [],
    memoriesIngested: 0,
    totalMemories: 0,
    scenesFound: 0,
    elapsedSeconds: 0,
    summary: null,
    error: null,
  })

  const closeRef = useRef<(() => void) | null>(null)

  const processFile = useCallback(async (file: File) => {
    // Reset state
    setState((prev) => ({
      ...prev,
      stage: 'uploading',
      stageMessage: 'Uploading video...',
      videoUrl: URL.createObjectURL(file),
      graphData: INITIAL_GRAPH,
      surprise: 0,
      thoughts: [],
      memoriesIngested: 0,
      totalMemories: 0,
      scenesFound: 0,
      elapsedSeconds: 0,
      summary: null,
      error: null,
    }))

    try {
      const { videoId } = await uploadVideo(file)
      setState((prev) => ({ ...prev, videoId }))

      // Connect SSE
      let nodeCount = 1 // master-core
      closeRef.current = connectProcessingStream(videoId, {
        onStage(data) {
          setState((prev) => ({
            ...prev,
            stage: data.stage as ProcessingStage,
            stageMessage: data.message,
          }))
        },

        onThought(data) {
          const now = new Date()
          const thought: Thought = {
            id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
            text: `${data.emotion}: ${data.text}`,
            at: now.toLocaleTimeString([], { hour12: false }),
          }

          // Add a graph node for each scene thought
          const nodeId = `scene-${nodeCount}`
          nodeCount++

          setState((prev) => {
            const parentCandidates = prev.graphData.nodes.filter((n) => n.layer < MAX_LAYER_DEPTH)
            const parent = Math.random() < 0.6
              ? prev.graphData.nodes[0]
              : randomFrom(parentCandidates.length > 0 ? parentCandidates : prev.graphData.nodes)

            const channel = randomFrom([...CHANNELS])
            const node = {
              id: nodeId,
              layer: parent.layer + 1,
              channel,
              salience: clamp(Math.random() * 0.75 + 0.25, 0.2, 1),
              surprise: data.tags.length > 3 ? 70 : 40,
            }

            return {
              ...prev,
              thoughts: [thought, ...prev.thoughts].slice(0, 20),
              scenesFound: prev.scenesFound + 1,
              graphData: {
                nodes: [...prev.graphData.nodes, node],
                links: [...prev.graphData.links, { source: parent.id, target: nodeId }],
              },
            }
          })
        },

        onSurprise(data) {
          setState((prev) => ({ ...prev, surprise: data.level }))
        },

        onMemory(data) {
          const nodeId = `mem-${data.index}`
          const channel = CHANNEL_FOR_TYPE[data.type] ?? 'semantic'

          setState((prev) => {
            // Find a scene node to attach to, or attach to master
            const sceneNodes = prev.graphData.nodes.filter((n) => n.id.startsWith('scene-'))
            const parent = sceneNodes.length > 0 ? randomFrom(sceneNodes) : prev.graphData.nodes[0]

            const node = {
              id: nodeId,
              layer: parent.layer + 1,
              channel,
              salience: clamp(0.5 + Math.random() * 0.5, 0.2, 1),
              surprise: (data.metadata.surpriseLevel as number) ?? 30,
            }

            const thought: Thought = {
              id: `mem-${Date.now()}-${data.index}`,
              text: `Memory ingested: ${data.title}`,
              at: new Date().toLocaleTimeString([], { hour12: false }),
            }

            return {
              ...prev,
              memoriesIngested: data.index + 1,
              totalMemories: data.total,
              thoughts: [thought, ...prev.thoughts].slice(0, 20),
              graphData: {
                nodes: [...prev.graphData.nodes, node],
                links: [...prev.graphData.links, { source: parent.id, target: nodeId }],
              },
            }
          })
        },

        onComplete(data) {
          setState((prev) => ({
            ...prev,
            stage: 'complete',
            stageMessage: `Done — ${data.totalMemories} memories from ${data.totalScenes} scenes in ${data.elapsedSeconds}s`,
            totalMemories: data.totalMemories,
            scenesFound: data.totalScenes,
            elapsedSeconds: data.elapsedSeconds,
            summary: data.summary,
          }))
        },

        onError(data) {
          setState((prev) => ({
            ...prev,
            stage: 'error',
            stageMessage: data.message,
            error: data.message,
          }))
        },
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setState((prev) => ({
        ...prev,
        stage: 'error',
        stageMessage: message,
        error: message,
      }))
    }
  }, [])

  const cancel = useCallback(() => {
    closeRef.current?.()
    closeRef.current = null
  }, [])

  return { ...state, processFile, cancel }
}
