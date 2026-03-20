import { useEffect, useRef, useState } from 'react'
import type { ForceGraphMethods } from 'react-force-graph-2d'
import { MemoryGraphPanel } from './components/MemoryGraphPanel'
import { SurpriseMeterPanel } from './components/SurpriseMeterPanel'
import { ThoughtStreamPanel } from './components/ThoughtStreamPanel'
import { VideoPanel } from './components/VideoPanel'
import {
  CHANNELS,
  INITIAL_GRAPH,
  MAX_LAYER_DEPTH,
  MAX_NODES,
} from './dashboard/constants'
import type { GraphLink, GraphNode, GraphPayload, Thought } from './dashboard/types'
import { buildThought, clamp, randomFrom } from './dashboard/utils'
import './App.css'

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
      } catch { }
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
      const liveSurprise = clamp(Math.floor(Math.random() * 101), 0, 100)
      setSurprise(liveSurprise)

      setGraphData((current) => {
        if (current.nodes.length >= MAX_NODES) {
          const sourceId = randomFrom(current.nodes).id
          setThoughts((existing) => [buildThought(liveSurprise, sourceId), ...existing].slice(0, 20))
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

        nextNode.surprise = liveSurprise
        setThoughts((existing) =>
          [buildThought(liveSurprise, nextNode.id), ...existing].slice(0, 20),
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
    graphRef.current?.zoomToFit(260, 36)
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
    graph.zoomToFit(220, 36)
  }, [graphSize.width, graphSize.height])

  return (
    <main className="dashboard">
      <VideoPanel
        streamStrength={streamStrength}
        surprise={surprise}
        videoRef={videoRef}
      />

      <section className="side-stack">
        <MemoryGraphPanel
          graphData={graphData}
          graphRef={graphRef}
          graphHostRef={graphHostRef}
          graphSize={graphSize}
        />
        <SurpriseMeterPanel surprise={surprise} />
        <ThoughtStreamPanel thoughts={thoughts} />
      </section>
    </main>
  )
}

export default App
