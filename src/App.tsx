import { useEffect, useRef, useState } from 'react'
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d'
import './App.css'

type Thought = {
  id: string
  text: string
  at: string
}

type GraphNode = {
  id: string
  layer: number
  channel: string
  salience: number
  surprise: number
  fx?: number
  fy?: number
}

type GraphLink = {
  source: string
  target: string
}

type GraphPayload = {
  nodes: GraphNode[]
  links: GraphLink[]
}

const MAX_NODES = 64
const MASTER_NODE_ID = 'master-core'
const MAX_LAYER_DEPTH = 5
const CHANNELS = ['vision', 'audio', 'spatial', 'semantic', 'social'] as const
const CHANNEL_HUES: Record<string, number> = {
  core: 275,
  vision: 198,
  audio: 24,
  spatial: 152,
  semantic: 292,
  social: 340,
}

const SIGNAL_WORDS = [
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

const MEMORY_ACTIONS = [
  'linked to episodic trace',
  'promoted to working memory',
  'compressed into semantic shard',
  'cross-checked against prior scene',
  'fused with environmental signal',
  'marked as high-salience event',
]

const INITIAL_GRAPH: GraphPayload = {
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

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const randomFrom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const buildThought = (surprise: number, nodeId: string): Thought => {
  const now = new Date()
  const tone =
    surprise > 75
      ? 'Novelty spike'
      : surprise > 45
        ? 'Adaptive update'
        : 'Pattern reinforcement'

  return {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    text: `${tone}: ${randomFrom(SIGNAL_WORDS)} ${randomFrom(MEMORY_ACTIONS)} via ${nodeId}.`,
    at: now.toLocaleTimeString([], { hour12: false }),
  }
}

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(
    undefined,
  )
  const graphHostRef = useRef<HTMLDivElement | null>(null)
  const [graphSize, setGraphSize] = useState({ width: 1, height: 300 })

  const [graphData, setGraphData] = useState<GraphPayload>(INITIAL_GRAPH)
  const [surprise, setSurprise] = useState(34)
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'ready' | 'blocked'>('loading')
  const [streamStrength, setStreamStrength] = useState([42, 51, 63, 47, 58, 40])
  const [thoughts, setThoughts] = useState<Thought[]>([
    {
      id: 'boot-thought',
      text: 'Bootstrap: master-core initialized and awaiting sensory stream.',
      at: new Date().toLocaleTimeString([], { hour12: false }),
    },
  ])

  useEffect(() => {
    let cancelled = false

    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }
        setCameraStatus('ready')
      } catch {
        setCameraStatus('blocked')
      }
    }

    setupCamera()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    const host = graphHostRef.current
    if (!host) {
      return
    }

    const setSize = () =>
      setGraphSize({
        width: Math.max(1, Math.floor(host.clientWidth)),
        height: Math.max(220, Math.floor(host.clientHeight)),
      })

    setSize()
    const observer = new ResizeObserver(setSize)
    observer.observe(host)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setGraphData((current) => {
        if (current.nodes.length >= MAX_NODES) {
          return current
        }

        const candidateParents = current.nodes.filter((node) => node.layer < MAX_LAYER_DEPTH)
        const fallbackParent = current.nodes[0]
        const parent =
          Math.random() < 0.55
            ? fallbackParent
            : randomFrom(candidateParents.length > 0 ? candidateParents : current.nodes)
        const nextNode: GraphNode = {
          id: `n-${current.nodes.length.toString().padStart(2, '0')}`,
          layer: parent.layer + 1,
          channel: randomFrom([...CHANNELS]),
          salience: clamp(Math.random() * 0.75 + (parent.layer + 1) * 0.05, 0.2, 1),
          surprise: 0,
        }
        const nextLink: GraphLink = {
          source: parent.id,
          target: nextNode.id,
        }

        const noveltyScore = clamp(
          Math.round(14 + nextNode.layer * 10 + Math.random() * 32),
          8,
          100,
        )
        nextNode.surprise = noveltyScore

        setSurprise(noveltyScore)
        setThoughts((existing) =>
          [buildThought(noveltyScore, nextNode.id), ...existing].slice(0, 7),
        )

        return {
          nodes: [...current.nodes, nextNode],
          links: [...current.links, nextLink],
        }
      })

      setStreamStrength((prev) =>
        prev.map((value, idx) => {
          const pulse = Math.sin((Date.now() / 500 + idx) * 0.8) * 9
          return clamp(Math.round(value + pulse + (Math.random() * 14 - 7)), 18, 100)
        }),
      )
    }, 900)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    graphRef.current?.centerAt(0, 0, 250)
    graphRef.current?.zoom(1.15, 250)
  }, [graphData.nodes.length])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) {
      return
    }

    const chargeForce = graph.d3Force('charge') as unknown as
      | { strength: (value: number) => void }
      | null
    chargeForce?.strength(-220)
    graph.d3ReheatSimulation()
  }, [graphSize.width, graphSize.height])

  return (
    <main className="dashboard">
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
          <div className="scanlines" />
          <div className="video-overlay">
            <p>Input Stream</p>
            <strong>
              {cameraStatus === 'ready'
                ? 'Environmental + Interaction Feed (Live Camera)'
                : cameraStatus === 'loading'
                  ? 'Connecting camera...'
                  : 'Camera unavailable - simulation mode'}
            </strong>
          </div>
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

      <section className="side-stack">
        <div className="graph-host panel panel-graph" ref={graphHostRef}>
          <ForceGraph2D<GraphNode, GraphLink>
            ref={graphRef}
            width={graphSize.width}
            height={graphSize.height}
            graphData={graphData}
            backgroundColor="transparent"
            dagMode="radialout"
            dagLevelDistance={52}
            cooldownTicks={90}
            d3AlphaDecay={0.08}
            d3VelocityDecay={0.45}
            minZoom={0.7}
            maxZoom={1.9}
            linkColor={() => 'rgba(170, 59, 255, 0.35)'}
            linkWidth={1.1}
            linkDirectionalParticles={1}
            linkDirectionalParticleWidth={1.4}
            linkDirectionalParticleColor={() => 'rgba(106, 211, 255, 0.9)'}
            nodeLabel={(node) => node.id}
            nodeVal={(node) =>
              node.id === MASTER_NODE_ID
                ? 18
                : Math.max(2.4, 2.6 + node.salience * 8 + node.surprise / 32 - node.layer * 0.25)
            }
            nodeColor={(node) => {
              if (node.id === MASTER_NODE_ID) {
                return '#ffffff'
              }

              const hue = CHANNEL_HUES[node.channel] ?? 265
              const saturation = clamp(Math.round(64 + node.salience * 26), 60, 92)
              const lightness = clamp(
                Math.round(60 - node.layer * 4 + node.surprise / 15),
                34,
                74,
              )

              return `hsl(${hue} ${saturation}% ${lightness}%)`
            }}
          />
        </div>

        <article className="panel panel-surprise">
          <div className="card-head">
            <h2>Surprise Meter</h2>
            <span>{surprise}%</span>
          </div>
          <div className="meter-track" aria-label="Model surprise level">
            <div className="meter-fill" style={{ width: `${surprise}%` }} />
          </div>
          <p className="meter-note">
            {surprise > 75
              ? 'High novelty detected. Learning pressure increased.'
              : surprise > 45
                ? 'Moderate novelty. Integrating with recent memory shards.'
                : 'Stable environment. Reinforcing known patterns.'}
          </p>
        </article>

        <article className="panel panel-thoughts">
          <div className="card-head">
            <h2>Thought Stream</h2>
            <span>{thoughts.length} active</span>
          </div>
          <ul>
            {thoughts.map((thought) => (
              <li key={thought.id}>
                <span className="thought-time">{thought.at}</span>
                <p>{thought.text}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  )
}

export default App
