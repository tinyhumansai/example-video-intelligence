import { GoogleGenAI } from '@google/genai'

export interface SceneAnalysis {
  startSec: number
  endSec: number
  description: string
  dialogue: string
  emotion: string
  tags: string[]
  surpriseLevel: number
}

export interface VideoAnalysisResult {
  scenes: SceneAnalysis[]
  summary: string
  emotionalArc: string
}

const ANALYSIS_PROMPT = `You are analyzing a video as if you personally experienced it. Watch carefully and describe what happens scene by scene as first-person memories.

Return a JSON object with this exact structure:
{
  "scenes": [
    {
      "startSec": 0,
      "endSec": 15,
      "description": "I saw... (first-person narrative of what happens in this segment)",
      "dialogue": "Any spoken words or notable sounds I heard",
      "emotion": "The dominant emotion (e.g. excitement, calm, tension, joy, surprise, melancholy)",
      "tags": ["tag1", "tag2", "tag3"],
      "surpriseLevel": 45
    }
  ],
  "summary": "A first-person summary of the entire video experience",
  "emotionalArc": "How the emotional tone shifted across the video"
}

Rules:
- Break the video into logical scenes (5-30 seconds each)
- surpriseLevel: 0-100, how unexpected or novel this scene is relative to the rest
- Write descriptions as vivid first-person memories
- tags should capture key visual elements, actions, and themes
- dialogue should capture any speech, or "none" if silent
- Return ONLY valid JSON, no markdown fences`

export async function analyzeVideo(
  videoPath: string,
  onProgress?: (msg: string) => void,
): Promise<VideoAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const ai = new GoogleGenAI({ apiKey })
  const mimeType = getMimeType(videoPath)

  onProgress?.('Uploading video to Gemini...')

  // Upload the video file using the Files API
  const uploadResult = await ai.files.upload({
    file: videoPath,
    config: { mimeType },
  })

  if (!uploadResult.uri) throw new Error('Failed to upload video to Gemini')

  // Wait for file to be processed (max 5 minutes)
  onProgress?.('Waiting for Gemini to process video...')
  let file = uploadResult
  const MAX_POLL_MS = 5 * 60 * 1000
  const pollStart = Date.now()
  while (file.state === 'PROCESSING') {
    if (Date.now() - pollStart > MAX_POLL_MS) {
      throw new Error('Gemini file processing timed out after 5 minutes')
    }
    await new Promise((r) => setTimeout(r, 3000))
    console.log(`[analyzer] Polling file ${file.name} (${Math.round((Date.now() - pollStart) / 1000)}s)...`)
    try {
      file = await ai.files.get({ name: file.name! })
    } catch (err) {
      console.error('[analyzer] Transient error polling file status:', err)
    }
  }

  console.log(`[analyzer] File processing complete — state: ${file.state}`)

  if (file.state === 'FAILED') {
    throw new Error('Gemini failed to process the video file')
  }

  onProgress?.('Analyzing video with Gemini...')
  console.log('[analyzer] Sending generateContent request to Gemini...')

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { fileData: { fileUri: file.uri!, mimeType } },
          { text: ANALYSIS_PROMPT },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
    },
  })

  const text = response.text
  console.log(`[analyzer] Gemini response received (${text?.length ?? 0} chars)`)
  if (!text) throw new Error('Empty response from Gemini')

  const parsed = JSON.parse(text) as VideoAnalysisResult

  if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
    throw new Error('Invalid analysis result: missing scenes array')
  }

  return parsed
}

function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
  }
  return mimeTypes[ext ?? ''] ?? 'video/mp4'
}
