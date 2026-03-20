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
  nodes: [{ id: MASTER_NODE_ID, layer: 0, fx: 0, fy: 0 }],
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
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(
    undefined,
  )
  const graphHostRef = useRef<HTMLDivElement | null>(null)
  const [graphSize, setGraphSize] = useState({ width: 480, height: 300 })

  const [graphData, setGraphData] = useState<GraphPayload>(INITIAL_GRAPH)
  const [surprise, setSurprise] = useState(34)
  const [streamStrength, setStreamStrength] = useState([42, 51, 63, 47, 58, 40])
  const [thoughts, setThoughts] = useState<Thought[]>([
    {
      id: 'boot-thought',
      text: 'Bootstrap: master-core initialized and awaiting sensory stream.',
      at: new Date().toLocaleTimeString([], { hour12: false }),
    },
  ])

  useEffect(() => {
    const host = graphHostRef.current
    if (!host) {
      return
    }

    const setSize = () =>
      setGraphSize({
        width: Math.max(320, Math.floor(host.clientWidth)),
        height: Math.max(260, Math.floor(host.clientHeight)),
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
    graphRef.current?.zoomToFit(280, 70)
  }, [graphData.nodes.length])

  return (
    <main className="dashboard">
      <section className="panel panel-video">
        <div className="panel-head">
          <h1>Neocortex Live Conscience</h1>
          <span className="status">Realtime ingest online</span>
        </div>

        <div className="video-screen" role="img" aria-label="Live sensory input simulation">
          <div className="scanlines" />
          <div className="video-overlay">
            <p>Input Stream</p>
            <strong>Environmental + Interaction Feed</strong>
          </div>
          <div className="stream-bars">
            {streamStrength.map((level, idx) => (
              <span key={`stream-${idx}`} style={{ height: `${level}%` }} />
            ))}
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
        <article className="panel panel-graph">
          <div className="card-head">
            <h2>Growing Memory Graph</h2>
            <span>{graphData.nodes.length} nodes</span>
          </div>
          <div className="graph-host" ref={graphHostRef}>
            <ForceGraph2D<GraphNode, GraphLink>
              ref={graphRef}
              width={graphSize.width}
              height={graphSize.height}
              graphData={graphData}
              backgroundColor="transparent"
              dagMode="radialout"
              dagLevelDistance={30}
              cooldownTicks={90}
              d3AlphaDecay={0.08}
              d3VelocityDecay={0.45}
              minZoom={0.55}
              maxZoom={1.9}
              linkColor={() => 'rgba(170, 59, 255, 0.35)'}
              linkWidth={1.1}
              linkDirectionalParticles={1}
              linkDirectionalParticleWidth={1.4}
              linkDirectionalParticleColor={() => 'rgba(106, 211, 255, 0.9)'}
              nodeLabel={(node) => node.id}
              nodeVal={(node) => (node.id === MASTER_NODE_ID ? 14 : 3 + 1 / (node.layer + 1))}
              nodeColor={(node) =>
                node.id === MASTER_NODE_ID ? 'rgba(170, 59, 255, 1)' : 'rgba(8, 6, 13, 0.62)'
              }
            />
          </div>
        </article>

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
                <time>{thought.at}</time>
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
