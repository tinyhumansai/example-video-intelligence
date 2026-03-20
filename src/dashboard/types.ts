export type Thought = {
  id: string
  text: string
  at: string
}

export type GraphNode = {
  id: string
  layer: number
  channel: string
  salience: number
  surprise: number
  fx?: number
  fy?: number
}

export type GraphLink = {
  source: string
  target: string
}

export type GraphPayload = {
  nodes: GraphNode[]
  links: GraphLink[]
}

export type CameraStatus = 'loading' | 'ready' | 'blocked'
