import { useCallback, useRef, useState } from 'react'
import type { ProcessingStage } from '../hooks/useVideoProcessor'

type VideoPanelProps = {
  stage: ProcessingStage
  stageMessage: string
  videoUrl: string | null
  scenesFound: number
  memoriesIngested: number
  totalMemories: number
  elapsedSeconds: number
  onFileSelected: (file: File) => void
}

const STAGE_LABELS: Record<string, string> = {
  idle: 'Ready',
  uploading: 'Uploading…',
  analyzing: 'Analyzing…',
  building_memories: 'Building memories…',
  ingesting: 'Ingesting…',
  complete: 'Complete',
  error: 'Error',
}

export function VideoPanel({
  stage,
  stageMessage,
  videoUrl,
  scenesFound,
  memoriesIngested,
  totalMemories,
  elapsedSeconds,
  onFileSelected,
}: VideoPanelProps) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file?.type.startsWith('video/')) onFileSelected(file)
    },
    [onFileSelected],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFileSelected(file)
    },
    [onFileSelected],
  )

  const isProcessing = stage !== 'idle' && stage !== 'complete' && stage !== 'error'

  return (
    <section className="panel panel-video">
      <div
        className={`video-screen ${dragOver ? 'drag-over' : ''}`}
        role="img"
        aria-label="Video upload area"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {videoUrl ? (
          <video
            className="camera-feed"
            src={videoUrl}
            controls
            playsInline
            aria-label="Uploaded video"
          />
        ) : (
          <div
            className="upload-prompt"
            onClick={() => inputRef.current?.click()}
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.5)' }}
          >
            <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              Drop a video here or click to upload
            </p>
            <p style={{ fontSize: '0.8rem' }}>MP4, WebM, MOV supported</p>
          </div>
        )}

        {isProcessing && (
          <div
            className="processing-overlay"
            style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: 'rgba(0,0,0,0.6)', color: '#fff',
              fontSize: '1rem', flexDirection: 'column', gap: '0.5rem',
            }}
          >
            <span className="spinner" />
            <span>{stageMessage}</span>
          </div>
        )}

        {!isProcessing && videoUrl && (
          <button
            className="upload-new-btn"
            onClick={() => inputRef.current?.click()}
          >
            Upload New Video
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
      </div>

      <div className="input-metrics">
        <article>
          <p>Status</p>
          <strong>{STAGE_LABELS[stage] ?? stage}</strong>
        </article>
        <article>
          <p>Scenes</p>
          <strong>{scenesFound}</strong>
        </article>
        <article>
          <p>Memories</p>
          <strong>{totalMemories > 0 ? `${memoriesIngested}/${totalMemories}` : memoriesIngested}</strong>
        </article>
        <article>
          <p>Time</p>
          <strong>{elapsedSeconds > 0 ? `${elapsedSeconds}s` : '—'}</strong>
        </article>
      </div>
    </section>
  )
}
