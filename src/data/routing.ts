import campusJson from './campus.json'
import type { CampusData, CampusEdge, NavigationInstruction, RouteResult } from './types'

export const campus = campusJson as CampusData

export function edgeKey(edge: Pick<CampusEdge, 'from' | 'to' | 'type'>): string {
  return [edge.from, edge.to].sort().join('::') + `::${edge.type}`
}

export function findRoute(
  from: string,
  to: string,
  options: { accessible?: boolean; blocked?: string[] } = {}
): RouteResult | null {
  const { accessible = false, blocked = [] } = options
  if (from === to) {
    const node = campus.nodes.find(item => item.id === to)
    const instruction: NavigationInstruction = { kind: 'arrive', text: 'You are already here.', distance: 0, floor: node?.floor ?? 0, nodeId: to }
    return { nodeIds: [from], edges: [], distance: 0, minutes: 0, steps: [instruction.text], instructions: [instruction] }
  }
  const disabled = new Set(blocked)
  const edges = campus.edges.filter(edge =>
    !edge.blocked &&
    !disabled.has(edgeKey(edge)) &&
    (!accessible || (edge.accessible && edge.type !== 'stairs'))
  )
  const distances = new Map<string, number>([[from, 0]])
  const previous = new Map<string, { node: string; edge: CampusEdge }>()
  const pending = new Set([from])

  while (pending.size) {
    let current: string | undefined
    let best = Infinity
    for (const id of pending) {
      const distance = distances.get(id) ?? Infinity
      if (distance < best) {
        best = distance
        current = id
      }
    }
    if (!current || best === Infinity) break
    if (current === to) break
    pending.delete(current)
    for (const edge of edges) {
      const next = edge.from === current ? edge.to : edge.to === current ? edge.from : undefined
      if (!next) continue
      const candidate = best + edge.weight
      if (candidate < (distances.get(next) ?? Infinity)) {
        distances.set(next, candidate)
        previous.set(next, { node: current, edge })
        pending.add(next)
      }
    }
  }

  const distance = distances.get(to)
  if (distance === undefined) return null
  const nodeIds = [to]
  const pathEdges: CampusEdge[] = []
  let cursor = to
  while (cursor !== from) {
    const step = previous.get(cursor)
    if (!step) return null
    pathEdges.unshift(step.edge)
    cursor = step.node
    nodeIds.unshift(cursor)
  }

  const instructions = buildInstructions(nodeIds, pathEdges, to)
  return {
    nodeIds,
    edges: pathEdges,
    distance,
    minutes: Math.max(1, Math.ceil(distance / 75)),
    steps: instructions.map(instruction => instruction.text),
    instructions
  }
}

export function findAlternateRoute(
  from: string,
  to: string,
  options: { accessible?: boolean; blocked?: string[] } = {}
): RouteResult | null {
  const primary = findRoute(from, to, options)
  if (!primary || primary.edges.length === 0) return null
  const candidates = primary.edges
    .map(edge => findRoute(from, to, { ...options, blocked: [...(options.blocked ?? []), edgeKey(edge)] }))
    .filter((candidate): candidate is RouteResult => candidate !== null && candidate.nodeIds.join('|') !== primary.nodeIds.join('|'))
  return candidates.sort((a, b) => a.distance - b.distance)[0] ?? null
}

export function buildInstructions(nodeIds: string[], edges: CampusEdge[], destinationId: string): NavigationInstruction[] {
  type SegmentKind = 'walk' | 'outdoor' | 'turn-left' | 'turn-right' | 'uturn'
  const instructions: NavigationInstruction[] = []
  let segmentDistance = 0
  let segmentKind: SegmentKind = 'walk'
  let segmentFloor = campus.nodes.find(node => node.id === nodeIds[0])?.floor ?? 0
  let segmentEnd = nodeIds[0]

  const flushSegment = () => {
    if (!segmentDistance) return
    const metres = Math.round(segmentDistance)
    const phrase = segmentKind === 'outdoor'
      ? `Walk outdoors ${metres} m.`
      : segmentKind === 'turn-left'
        ? `Turn left and walk ${metres} m.`
        : segmentKind === 'turn-right'
          ? `Turn right and walk ${metres} m.`
          : segmentKind === 'uturn'
            ? `Turn around and walk ${metres} m.`
            : `Continue for ${metres} m.`
    instructions.push({ kind: segmentKind, text: phrase, distance: metres, floor: segmentFloor, nodeId: segmentEnd })
    segmentDistance = 0
  }

  for (let index = 0; index < edges.length; index += 1) {
    const edge = edges[index]
    const current = campus.nodes.find(node => node.id === nodeIds[index])
    const next = campus.nodes.find(node => node.id === nodeIds[index + 1])
    if (!current || !next) continue

    if (edge.type === 'stairs' || edge.type === 'lift') {
      flushSegment()
      const direction = next.floor > current.floor ? 'up' : 'down'
      const kind = edge.type === 'lift' ? 'lift' : direction === 'up' ? 'stairs-up' : 'stairs-down'
      const action = edge.type === 'lift' ? 'Take the lift' : `Take the stairs in ${current.block ?? 'the'} Block`
      const toFloor = ordinal(next.floor)
      instructions.push({
        kind,
        text: `${action} to the ${toFloor} floor.`,
        distance: Math.round(edge.weight),
        floor: next.floor,
        nodeId: next.id
      })
      segmentKind = 'walk'
      segmentFloor = next.floor
      segmentEnd = next.id
      continue
    }

    let turn: SegmentKind | undefined
    if (index > 0) {
      const previous = campus.nodes.find(node => node.id === nodeIds[index - 1])
      const priorEdge = edges[index - 1]
      if (previous && priorEdge.type !== 'stairs' && priorEdge.type !== 'lift' && previous.floor === current.floor) {
        const angle = turnAngle(previous.x, previous.y, current.x, current.y, next.x, next.y)
        if (Math.abs(angle) >= 165) turn = 'uturn'
        else if (Math.abs(angle) >= 35) turn = angle > 0 ? 'turn-right' : 'turn-left'
      }
    }
    const kind = edge.type === 'outdoor' ? 'outdoor' : 'walk'
    if (turn) {
      flushSegment()
      segmentKind = turn
    } else if (segmentDistance > 0 && (segmentKind === 'outdoor') !== (kind === 'outdoor')) {
      flushSegment()
      segmentKind = kind
    } else if (segmentDistance === 0) {
      segmentKind = kind
    }
    segmentDistance += edge.weight
    segmentFloor = current.floor
    segmentEnd = next.id
  }
  flushSegment()
  const destination = campus.nodes.find(node => node.id === destinationId)
  instructions.push({
    kind: 'arrive',
    text: `You will see this door. Arrive at ${destination?.name ?? destinationId}.`,
    distance: 0,
    floor: destination?.floor ?? 0,
    nodeId: destinationId
  })
  return instructions
}

function turnAngle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
  const first = Math.atan2(by - ay, bx - ax)
  const second = Math.atan2(cy - by, cx - bx)
  let degrees = (second - first) * 180 / Math.PI
  if (degrees > 180) degrees -= 360
  if (degrees < -180) degrees += 360
  return degrees
}

export function projectMapPoint(
  x: number,
  y: number,
  controlPoints: NonNullable<CampusData['mapTransforms']>[number]['controlPoints'],
  sourceSize: [number, number] = campus.mapTransforms?.[0]?.sourceSize ?? [100, 100]
): [number, number] {
  if (controlPoints.length < 3) return [x, y]
  const [a, b, c] = controlPoints
  const determinant = a.world[0] * (b.world[1] - c.world[1]) + b.world[0] * (c.world[1] - a.world[1]) + c.world[0] * (a.world[1] - b.world[1])
  if (Math.abs(determinant) < 0.0001) return [x, y]
  const coefficient = (values: number[]) => [
    (values[0] * (b.world[1] - c.world[1]) + values[1] * (c.world[1] - a.world[1]) + values[2] * (a.world[1] - b.world[1])) / determinant,
    (values[0] * (c.world[0] - b.world[0]) + values[1] * (a.world[0] - c.world[0]) + values[2] * (b.world[0] - a.world[0])) / determinant,
    (values[0] * (b.world[0] * c.world[1] - c.world[0] * b.world[1]) + values[1] * (c.world[0] * a.world[1] - a.world[0] * c.world[1]) + values[2] * (a.world[0] * b.world[1] - b.world[0] * a.world[1])) / determinant
  ]
  const px = coefficient([a.image[0], b.image[0], c.image[0]])
  const py = coefficient([a.image[1], b.image[1], c.image[1]])
  return [
    (px[0] * x + px[1] * y + px[2]) / sourceSize[0] * 100,
    (py[0] * x + py[1] * y + py[2]) / sourceSize[1] * 100
  ]
}

export function nearestRoom(
  from: string,
  type: string,
  options: { accessible?: boolean; blocked?: string[] } = {}
) {
  return campus.rooms
    .filter(room => room.type === type)
    .map(room => ({ room, route: findRoute(from, room.id, options) }))
    .filter((entry): entry is { room: (typeof campus.rooms)[number]; route: RouteResult } => entry.route !== null)
    .sort((a, b) => a.route.distance - b.route.distance)[0] ?? null
}

function ordinal(floor: number) {
  return floor === 0 ? 'ground' : `${floor}${floor === 1 ? 'st' : floor === 2 ? 'nd' : floor === 3 ? 'rd' : 'th'}`
}
