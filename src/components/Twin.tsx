import { Canvas } from '@react-three/fiber'
import { useMemo, useState } from 'react'
import { campus } from '../data/routing'

interface TwinProps {
  floor: number
  routeIds: string[]
  night: boolean
  onSelect: (block: string) => void
}

function CampusModel({ floor, routeIds, night, onSelect }: TwinProps) {
  const [exploded, setExploded] = useState(false)
  const [rotation, setRotation] = useState(0)
  const blocks = useMemo(() => campus.buildings, [])
  const routeBlocks = new Set(routeIds.map(id => campus.nodes.find(node => node.id === id)?.block).filter(Boolean))
  const yGap = exploded ? 0.54 : 0.08

  return (
    <>
      <color attach="background" args={[night ? '#181721' : '#f4f0e9']} />
      <ambientLight intensity={night ? 0.75 : 1.5} />
      <directionalLight position={[5, 9, 8]} intensity={night ? 1.4 : 2.2} castShadow />
      <group rotation={[-0.14, rotation, 0]}>
        <mesh
          position={[0, -0.22, 0]}
          receiveShadow
          onPointerMove={event => {
            if (event.buttons === 1) setRotation(value => value + event.movementX * 0.006)
          }}
        >
          <boxGeometry args={[9.8, 0.18, 7]} />
          <meshStandardMaterial color={night ? '#313644' : '#dfe8dc'} />
        </mesh>
        {blocks.map(block => {
          const x = (block.x - 50) / 11
          const z = (block.y - 48) / 11
          return (
            <group key={block.id} position={[x, 0, z]} onClick={() => onSelect(block.id)}>
              {block.floors.map(floorNumber => (
                <mesh
                  key={floorNumber}
                  position={[0, 0.25 + floorNumber * yGap, 0]}
                  castShadow
                  onClick={event => {
                    event.stopPropagation()
                    setExploded(value => !value)
                  }}
                >
                  <boxGeometry args={[1.3, 0.42, 0.94]} />
                  <meshStandardMaterial
                    color={routeBlocks.has(block.id) ? '#c88d48' : block.color}
                    emissive={routeBlocks.has(block.id) ? '#864b23' : '#000000'}
                    emissiveIntensity={routeBlocks.has(block.id) ? 0.24 : 0}
                    transparent
                    opacity={floorNumber === floor ? 1 : 0.56}
                  />
                </mesh>
              ))}
            </group>
          )
        })}
        <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.75, 0.83, 56]} />
          <meshBasicMaterial color="#7a1f2b" />
        </mesh>
      </group>
    </>
  )
}

export default function Twin(props: TwinProps) {
  return (
    <div className="twin-canvas" aria-label="Interactive three dimensional campus model">
      <Canvas shadows camera={{ position: [8, 8, 10], fov: 34 }}>
        <CampusModel {...props} />
      </Canvas>
    </div>
  )
}
