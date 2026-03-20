import type { RefObject } from 'react'

type VideoPanelProps = {
  streamStrength: number[]
  surprise: number
  videoRef: RefObject<HTMLVideoElement | null>
}

export function VideoPanel({ streamStrength, surprise, videoRef }: VideoPanelProps) {
  return (
    <section className="panel panel-video">
      <div className="video-screen" role="img" aria-label="Live sensory input simulation">
        <video
          ref={videoRef}
          className="camera-feed"
          autoPlay
          muted
          playsInline
          aria-label="Live camera feed"
        />
      </div>

      <div className="input-metrics">
        <article>
          <p>Frame delta</p>
          <strong>{Math.round(streamStrength[0] * 1.3)} ms</strong>
        </article>
        <article>
          <p>Active channels</p>
          <strong>{streamStrength.length + 2}</strong>
        </article>
        <article>
          <p>Context entropy</p>
          <strong>{Math.round((surprise / 100) * 7.5 * 100) / 100}</strong>
        </article>
      </div>
    </section>
  )
}
