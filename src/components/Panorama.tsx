import { useEffect, useRef } from 'react'
import '@photo-sphere-viewer/core/index.css'

interface PanoramaProps {
  image: string
}

export default function Panorama({ image }: PanoramaProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let viewer: { destroy: () => void } | undefined
    let mounted = true
    void import('@photo-sphere-viewer/core').then(({ Viewer }) => {
      if (!mounted || !containerRef.current) return
      viewer = new Viewer({ container: containerRef.current, panorama: image, navbar: ['zoom', 'fullscreen'] })
    })
    return () => {
      mounted = false
      viewer?.destroy()
    }
  }, [image])

  return <div className="panorama-viewer" ref={containerRef} />
}
