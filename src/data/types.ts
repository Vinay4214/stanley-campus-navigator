export type EdgeType = 'corridor' | 'stairs' | 'lift' | 'ramp' | 'outdoor'

export interface CampusRoom {
  id: string
  name: string
  type: string
  block: string
  floor: number
  dept: string
  aliases: string[]
  polygon: number[][]
}

export interface CampusNode {
  id: string
  name: string
  x: number
  y: number
  floor: number
  block?: string
  kind?: string
}

export interface CampusEdge {
  from: string
  to: string
  weight: number
  type: EdgeType
  accessible: boolean
  blocked?: boolean
}

export interface CampusData {
  buildings: { id: string; name: string; floors: number[]; x: number; y: number; color: string }[]
  rooms: CampusRoom[]
  nodes: CampusNode[]
  edges: CampusEdge[]
  mapNorthOffset?: number
  mapTransforms?: {
    id: string
    image: string
    page: number
    sourceSize: [number, number]
    controlPoints: { landmark: string; world: [number, number]; image: [number, number] }[]
  }[]
}

export interface NavigationInstruction {
  kind: 'walk' | 'outdoor' | 'turn-left' | 'turn-right' | 'uturn' | 'stairs-up' | 'stairs-down' | 'lift' | 'arrive'
  text: string
  distance: number
  floor: number
  nodeId?: string
}

export interface RouteResult {
  nodeIds: string[]
  edges: CampusEdge[]
  distance: number
  minutes: number
  steps: string[]
  instructions: NavigationInstruction[]
}
