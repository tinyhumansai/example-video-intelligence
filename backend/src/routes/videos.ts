import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { processVideo } from '../pipeline/orchestrator.js'
import { AlphahumanMemoryClient } from '@tinyhumansai/neocortex'

const upload = multer({
  storage: multer.diskStorage({
    destination: path.resolve(import.meta.dirname, '../../uploads'),
    filename: (_req, file, cb) => {
      const id = uuid()
      const ext = path.extname(file.originalname)
      cb(null, `${id}${ext}`)
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true)
    else cb(new Error('Only video files are allowed'))
  },
})

// In-memory store of uploaded videos
const videoStore = new Map<string, { filename: string; originalName: string; path: string }>()

export const videosRouter = Router()

// Upload a video file
videosRouter.post('/upload', upload.single('video'), (req, res) => {
  const file = req.file
  if (!file) {
    res.status(400).json({ error: 'No video file provided' })
    return
  }

  const videoId = path.parse(file.filename).name
  videoStore.set(videoId, {
    filename: file.filename,
    originalName: file.originalname,
    path: file.path,
  })

  res.json({ videoId, filename: file.originalname })
})

// SSE endpoint — process video through the pipeline
videosRouter.get('/:videoId/process', (req, res) => {
  const { videoId } = req.params
  const video = videoStore.get(videoId)

  if (!video) {
    res.status(404).json({ error: 'Video not found' })
    return
  }

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  let closed = false
  req.on('close', () => { closed = true })

  ;(async () => {
    try {
      for await (const evt of processVideo(videoId, video.path, video.originalName)) {
        if (closed) break
        send(evt.event, evt.data)
      }
    } catch (err: unknown) {
      console.error('[SSE] Pipeline error:', err)
      const message = err instanceof Error ? err.message : 'Unknown error'
      send('error', { message })
    }
  })()
})

// Recall memories for a video (Master node summary)
videosRouter.get('/:videoId/recall', async (req, res) => {
  const { videoId } = req.params
  const token = process.env.TINYHUMANS_TOKEN
  if (!token) {
    res.status(500).json({ error: 'TINYHUMANS_TOKEN not configured' })
    return
  }

  try {
    const client = new AlphahumanMemoryClient({ token })
    const result = await client.recallMemory({ namespace: `video-${videoId}`, maxChunks: 20 })
    res.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Recall failed'
    res.status(500).json({ error: message })
  }
})

// Query memories for a video
videosRouter.get('/:videoId/memories', async (req, res) => {
  const { videoId } = req.params
  const query = (req.query.q as string) || 'What happened in this video?'

  const token = process.env.TINYHUMANS_TOKEN
  if (!token) {
    res.status(500).json({ error: 'TINYHUMANS_TOKEN not configured' })
    return
  }

  try {
    const client = new AlphahumanMemoryClient({ token })
    const result = await client.queryMemory({
      query,
      namespace: `video-${videoId}`,
      maxChunks: 20,
      llmQuery: query,
    })
    res.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Query failed'
    res.status(500).json({ error: message })
  }
})

// Delete memories for a video
videosRouter.delete('/:videoId', async (req, res) => {
  const { videoId } = req.params
  const token = process.env.TINYHUMANS_TOKEN
  if (!token) {
    res.status(500).json({ error: 'TINYHUMANS_TOKEN not configured' })
    return
  }

  try {
    const client = new AlphahumanMemoryClient({ token })
    const result = await client.deleteMemory({ namespace: `video-${videoId}` })
    videoStore.delete(videoId)
    res.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Delete failed'
    res.status(500).json({ error: message })
  }
})
