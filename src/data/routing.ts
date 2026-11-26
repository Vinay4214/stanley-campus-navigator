import campusJson from './campus.json'
import type { CampusData, CampusEdge, RouteResult } from './types'

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
  if (from === to) return { nodeIds: [from], edges: [], distance: 0, minutes: 0, steps: ['You are already here.'] }
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

  const steps = pathEdges.map((edge, index) => {
    const next = campus.nodes.find(node => node.id === nodeIds[index + 1])
    const currentNode = campus.nodes.find(node => node.id === nodeIds[index])
    if (edge.type === 'stairs') return `Take the stairs to the ${ordinal(next?.floor ?? 0)} floor.`
    if (edge.type === 'lift') return `Take the lift to the ${ordinal(next?.floor ?? 0)} floor.`
    if (edge.type === 'outdoor' && next?.kind === 'exit') return `Continue to the main gate exit.`
    if (edge.type === 'outdoor' && next?.kind === 'assembly') return `Continue to the open-area assembly point.`
    if (next?.kind === 'corridor' && currentNode?.block !== next.block) return `Walk outdoors to ${next.name}.`
    return `Walk ${edge.weight} m${edge.type === 'ramp' ? ' via the ramp' : ''}.`
  })
  const destination = campus.nodes.find(node => node.id === to)
  steps.push(`Arrive at ${destination?.name ?? to}.`)
  return { nodeIds, edges: pathEdges, distance, minutes: Math.max(1, Math.ceil(distance / 75)), steps }
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
