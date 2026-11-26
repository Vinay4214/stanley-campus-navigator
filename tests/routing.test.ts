import { describe, expect, it } from 'vitest'
import { campus, edgeKey, findRoute, nearestRoom } from '../src/data/routing'

describe('campus routing', () => {
  it('finds a cross-floor route from the gate to the fourth-floor CSE department', () => {
    const route = findRoute('gate', 'B-407')
    expect(route).not.toBeNull()
    expect(route?.nodeIds).toContain('B-4')
    expect(route?.nodeIds).toContain('B-407')
    expect(route?.distance).toBeGreaterThan(0)
    expect(route?.minutes).toBeGreaterThan(0)
  })

  it('uses lifts rather than stairs in accessibility mode', () => {
    const route = findRoute('gate', 'B-407', { accessible: true })
    expect(route).not.toBeNull()
    expect(route?.edges.some(edge => edge.type === 'stairs')).toBe(false)
    expect(route?.edges.some(edge => edge.type === 'lift')).toBe(true)
    expect(route?.edges.every(edge => edge.accessible)).toBe(true)
  })

  it('reroutes when the direct outdoor path to Block B is blocked', () => {
    const direct = campus.edges.find(edge => edge.from === 'quad' && edge.to === 'B-0')
    expect(direct).toBeDefined()
    const original = findRoute('gate', 'B-407')
    const rerouted = findRoute('gate', 'B-407', { blocked: [edgeKey(direct!)] })
    expect(original?.nodeIds).toContain('B-0')
    expect(rerouted).not.toBeNull()
    expect(rerouted?.nodeIds).toContain('A-0')
    expect(rerouted?.edges.some(edge => edgeKey(edge) === edgeKey(direct!))).toBe(false)
    expect(rerouted?.distance).toBeGreaterThan(original?.distance ?? 0)
  })

  it('finds the nearest washroom reachable from the open area', () => {
    const nearest = nearestRoom('quad', 'washroom')
    expect(nearest?.room.id).toBe('C-010')
    expect(nearest?.route.distance).toBeGreaterThan(0)
  })
})
