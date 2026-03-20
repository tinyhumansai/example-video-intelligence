import type { RefObject } from 'react'
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d'
import { CHANNEL_HUES, MASTER_NODE_ID } from '../dashboard/constants'
import { clamp } from '../dashboard/utils'
import type { GraphLink, GraphNode, GraphPayload } from '../dashboard/types'

type MemoryGraphPanelProps = {
  graphData: GraphPayload
  graphRef: RefObject<ForceGraphMethods<GraphNode, GraphLink> | undefined>
  graphHostRef: RefObject<HTMLDivElement | null>
  graphSize: {
    width: number
    height: number
  }
}

export function MemoryGraphPanel({
  graphData,
  graphRef,
  graphHostRef,
  graphSize,
}: MemoryGraphPanelProps) {
  return (
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
          const lightness = clamp(Math.round(60 - node.layer * 4 + node.surprise / 15), 34, 74)

          return `hsl(${hue} ${saturation}% ${lightness}%)`
        }}
      />
    </div>
  )
}
