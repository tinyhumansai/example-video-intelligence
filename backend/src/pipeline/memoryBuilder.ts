import type { VideoAnalysisResult } from './analyzer.js'

export interface MemoryItem {
  title: string
  content: string
  type: 'scene' | 'dialogue' | 'summary' | 'emotion'
  metadata: Record<string, unknown>
}

export function buildMemories(
  analysis: VideoAnalysisResult,
  videoId: string,
  filename: string,
): MemoryItem[] {
  const memories: MemoryItem[] = []

  // Scene memories
  analysis.scenes.forEach((scene, i) => {
    memories.push({
      title: `Scene ${i + 1}: ${scene.tags.slice(0, 3).join(', ')}`,
      content: scene.description,
      type: 'scene',
      metadata: {
        type: 'scene',
        sceneIndex: i,
        startSec: scene.startSec,
        endSec: scene.endSec,
        emotion: scene.emotion,
        tags: scene.tags,
        surpriseLevel: scene.surpriseLevel,
        videoFilename: filename,
      },
    })

    // Dialogue memories (if present)
    if (scene.dialogue && scene.dialogue.toLowerCase() !== 'none') {
      memories.push({
        title: `Dialogue at ${formatTime(scene.startSec)}`,
        content: `I heard: "${scene.dialogue}"`,
        type: 'dialogue',
        metadata: {
          type: 'dialogue',
          sceneIndex: i,
          startSec: scene.startSec,
          endSec: scene.endSec,
          videoFilename: filename,
        },
      })
    }
  })

  // Overall summary memory
  memories.push({
    title: 'Video Summary',
    content: analysis.summary,
    type: 'summary',
    metadata: {
      type: 'summary',
      totalScenes: analysis.scenes.length,
      videoFilename: filename,
    },
  })

  // Emotional arc memory
  memories.push({
    title: 'Emotional Arc',
    content: analysis.emotionalArc,
    type: 'emotion',
    metadata: {
      type: 'emotion',
      videoFilename: filename,
    },
  })

  return memories
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
