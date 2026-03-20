import { AlphahumanMemoryClient } from '@tinyhumansai/neocortex'
import { analyzeVideo } from './analyzer.js'
import { buildMemories, type MemoryItem } from './memoryBuilder.js'

export interface SSEEvent {
  event: string
  data: unknown
}

export async function* processVideo(
  videoId: string,
  videoPath: string,
  filename: string,
): AsyncGenerator<SSEEvent> {
  const startTime = Date.now()

  // Stage 1: Uploading & analyzing
  console.log(`[orchestrator] Starting pipeline for video ${videoId} (${filename})`)
  yield { event: 'stage', data: { stage: 'uploading', message: 'Uploading video to Gemini...' } }

  let analysis
  try {
    analysis = await analyzeVideo(videoPath, (msg) => {
      // Progress messages are yielded inline below
    })
  } catch (err: unknown) {
    console.error('[orchestrator] Analysis failed:', err)
    const message = err instanceof Error ? err.message : 'Analysis failed'
    yield { event: 'error', data: { message } }
    return
  }

  yield {
    event: 'stage',
    data: { stage: 'analyzing', message: `Found ${analysis.scenes.length} scenes` },
  }

  // Stream each scene as a thought
  for (const scene of analysis.scenes) {
    yield {
      event: 'thought',
      data: {
        text: scene.description,
        emotion: scene.emotion,
        tags: scene.tags,
        startSec: scene.startSec,
        endSec: scene.endSec,
      },
    }
    yield {
      event: 'surprise',
      data: { level: scene.surpriseLevel },
    }
  }

  // Stage 2: Building memories
  console.log(`[orchestrator] Analysis complete — ${analysis.scenes.length} scenes. Building memories...`)
  yield { event: 'stage', data: { stage: 'building_memories', message: 'Building memory items...' } }

  const memories = buildMemories(analysis, videoId, filename)

  // Stage 3: Ingesting into TinyHumans (progressive — one at a time)
  console.log(`[orchestrator] Ingesting ${memories.length} memories into namespace video-${videoId}`)
  yield {
    event: 'stage',
    data: { stage: 'ingesting', message: `Ingesting ${memories.length} memories...` },
  }

  const token = process.env.TINYHUMANS_TOKEN
  if (!token) {
    yield { event: 'error', data: { message: 'TINYHUMANS_TOKEN not configured' } }
    return
  }

  const client = new AlphahumanMemoryClient({ token })
  const namespace = `video-${videoId}`

  for (let i = 0; i < memories.length; i++) {
    const mem = memories[i]
    try {
      await client.insertMemory({
        title: mem.title,
        content: mem.content,
        namespace,
        sourceType: 'doc',
        metadata: mem.metadata,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ingestion failed'
      yield { event: 'error', data: { message: `Failed to ingest "${mem.title}": ${message}` } }
      return
    }

    yield {
      event: 'memory',
      data: {
        index: i,
        total: memories.length,
        title: mem.title,
        content: mem.content,
        type: mem.type,
        metadata: mem.metadata,
      },
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log(`[orchestrator] Pipeline complete for ${videoId} in ${elapsed}s`)
  yield {
    event: 'complete',
    data: {
      videoId,
      totalMemories: memories.length,
      totalScenes: analysis.scenes.length,
      elapsedSeconds: parseFloat(elapsed),
      summary: analysis.summary,
    },
  }
}
