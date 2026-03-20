import { useEffect, useRef, useState } from 'react'
import type { ForceGraphMethods } from 'react-force-graph-2d'
import { MemoryChatPanel } from './components/MemoryChatPanel'
import { MemoryGraphPanel } from './components/MemoryGraphPanel'
import { SurpriseMeterPanel } from './components/SurpriseMeterPanel'
import { ThoughtStreamPanel } from './components/ThoughtStreamPanel'
import { VideoPanel } from './components/VideoPanel'
import { INITIAL_GRAPH } from './dashboard/constants'
import type { GraphLink, GraphNode, GraphPayload } from './dashboard/types'
import { useVideoHistory } from './hooks/useVideoHistory'
import { useVideoProcessor } from './hooks/useVideoProcessor'
import './App.css'

function App() {
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(
    undefined,
  )
  const graphHostRef = useRef<HTMLDivElement | null>(null)
  const [graphSize, setGraphSize] = useState({ width: 1, height: 300 })

  const processor = useVideoProcessor()
  const history = useVideoHistory()

  const [chatVideoId, setChatVideoId] = useState<string | null>(null)
  const [savedGraph, setSavedGraph] = useState<GraphPayload | null>(null)
  const filenameRef = useRef<string>('')

  // On mount, restore the most recent video from history
  useEffect(() => {
    if (history.entries.length > 0) {
      const recent = history.entries[0]
      setChatVideoId(recent.videoId)
      const g = history.getGraph(recent.videoId)
      if (g) setSavedGraph(g)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When processing completes, save to history and select the video for chat
  useEffect(() => {
    if (processor.stage === 'complete' && processor.videoId) {
      const name = filenameRef.current || processor.videoId
      history.addEntry(processor.videoId, name, processor.graphData)
      setChatVideoId(processor.videoId)
      setSavedGraph(processor.graphData)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processor.stage, processor.videoId])

  // Determine which graph to display
  // Only use live processor graph during active processing (not idle/complete/error)
  const isActivelyProcessing =
    processor.stage !== 'idle' && processor.stage !== 'complete' && processor.stage !== 'error'
  const displayGraph = isActivelyProcessing
    ? processor.graphData
    : (savedGraph ?? processor.graphData)

  const handleFileSelected = (file: File) => {
    filenameRef.current = file.name
    processor.processFile(file)
  }

  const handleVideoSelect = (id: string) => {
    setChatVideoId(id)
    const g = history.getGraph(id)
    setSavedGraph(g ?? INITIAL_GRAPH)
  }

  // Resize observer for graph container
  useEffect(() => {
    const host = graphHostRef.current
    if (!host) return

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

  // Center graph when nodes change — delay to let simulation settle
  useEffect(() => {
    const t = setTimeout(() => {
      graphRef.current?.centerAt(0, 0, 250)
      graphRef.current?.zoomToFit(260, 36)
    }, 350)
    return () => clearTimeout(t)
  }, [displayGraph.nodes.length])

  // Update graph physics on resize
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return

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
        stage={processor.stage}
        stageMessage={processor.stageMessage}
        videoUrl={processor.videoUrl}
        scenesFound={processor.scenesFound}
        memoriesIngested={processor.memoriesIngested}
        totalMemories={processor.totalMemories}
        elapsedSeconds={processor.elapsedSeconds}
        onFileSelected={handleFileSelected}
      />

      <section className="side-stack">
        <MemoryGraphPanel
          graphData={displayGraph}
          graphRef={graphRef}
          graphHostRef={graphHostRef}
          graphSize={graphSize}
        />
        <SurpriseMeterPanel surprise={processor.surprise} />
        <ThoughtStreamPanel thoughts={processor.thoughts} />
      </section>

      <MemoryChatPanel
        videoId={chatVideoId}
        videoHistory={history.entries}
        onVideoSelect={handleVideoSelect}
      />
    </main>
  )
}

export default App
