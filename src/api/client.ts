export async function uploadVideo(file: File): Promise<{ videoId: string; filename: string }> {
  const form = new FormData()
  form.append('video', file)

  const res = await fetch('/api/videos/upload', { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(err.error ?? `Upload failed (${res.status})`)
  }
  return res.json()
}

export type SSEHandler = {
  onStage?: (data: { stage: string; message: string }) => void
  onThought?: (data: { text: string; emotion: string; tags: string[]; startSec: number; endSec: number }) => void
  onSurprise?: (data: { level: number }) => void
  onMemory?: (data: { index: number; total: number; title: string; content: string; type: string; metadata: Record<string, unknown> }) => void
  onComplete?: (data: { videoId: string; totalMemories: number; totalScenes: number; elapsedSeconds: number; summary: string }) => void
  onError?: (data: { message: string }) => void
}

export function connectProcessingStream(videoId: string, handlers: SSEHandler): () => void {
  const source = new EventSource(`/api/videos/${videoId}/process`)

  source.addEventListener('stage', (e) => handlers.onStage?.(JSON.parse(e.data)))
  source.addEventListener('thought', (e) => handlers.onThought?.(JSON.parse(e.data)))
  source.addEventListener('surprise', (e) => handlers.onSurprise?.(JSON.parse(e.data)))
  source.addEventListener('memory', (e) => handlers.onMemory?.(JSON.parse(e.data)))
  source.addEventListener('complete', (e) => {
    handlers.onComplete?.(JSON.parse(e.data))
    source.close()
  })
  source.addEventListener('error', (e) => {
    if (e instanceof MessageEvent) {
      handlers.onError?.(JSON.parse(e.data))
    }
    source.close()
  })

  return () => source.close()
}

export async function recallVideoMemories(videoId: string) {
  const res = await fetch(`/api/videos/${videoId}/recall`)
  if (!res.ok) throw new Error('Recall failed')
  return res.json()
}

export async function queryVideoMemories(videoId: string, query: string) {
  const res = await fetch(`/api/videos/${videoId}/memories?q=${encodeURIComponent(query)}`)
  if (!res.ok) throw new Error('Query failed')
  return res.json()
}

export async function deleteVideoMemories(videoId: string) {
  const res = await fetch(`/api/videos/${videoId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Delete failed')
  return res.json()
}
