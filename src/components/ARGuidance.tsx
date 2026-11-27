import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Camera, Check, Compass, Footprints, MapPin, RotateCcw, X } from 'lucide-react'

interface ARGuidanceProps {
  destination: string
  instruction: string
  distance: number
  roomPhoto?: string
  bearing: number
  mapNorthOffset: number
  distanceToNextNode: number
  onClose: () => void
  onStep: () => void
}

export default function ARGuidance({
  destination,
  instruction,
  distance,
  roomPhoto,
  bearing,
  mapNorthOffset,
  distanceToNextNode,
  onClose,
  onStep
}: ARGuidanceProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const headingRef = useRef<number | null>(null)
  const lastStepRef = useRef({ at: 0, magnitude: 0 })
  const stepDistanceRef = useRef(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraMessage, setCameraMessage] = useState('')
  const [heading, setHeading] = useState<number | null>(null)
  const [calibration, setCalibration] = useState<number | null>(null)
  const [stepTracking, setStepTracking] = useState(false)
  const [stepCount, setStepCount] = useState(0)

  useEffect(() => {
    if (!stream || !videoRef.current) return
    videoRef.current.srcObject = stream
    void videoRef.current.play().catch(() => {
      setCameraMessage('Camera preview could not start. Use the door-photo fallback below.')
    })
  }, [stream])

  useEffect(() => () => stream?.getTracks().forEach(track => track.stop()), [stream])

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const extended = event as DeviceOrientationEvent & { webkitCompassHeading?: number }
      const measured = extended.webkitCompassHeading ?? (event.absolute ? event.alpha : null)
      if (measured === null || measured === undefined) return
      const previous = headingRef.current
      const filtered = previous === null
        ? measured
        : previous + ((((measured - previous + 540) % 360) - 180) * 0.18)
      headingRef.current = filtered
      setHeading(filtered)
    }
    window.addEventListener('deviceorientation', handleOrientation)
    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [])

  useEffect(() => {
    if (!stepTracking) return
    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity
      if (!acceleration) return
      const magnitude = Math.hypot(acceleration.x ?? 0, acceleration.y ?? 0, acceleration.z ?? 0)
      const now = performance.now()
      if (magnitude > 12.2 && lastStepRef.current.magnitude <= 11.2 && now - lastStepRef.current.at > 350) {
        lastStepRef.current = { at: now, magnitude }
        setStepCount(count => count + 1)
        stepDistanceRef.current += 0.7
        if (distanceToNextNode > 0 && stepDistanceRef.current >= distanceToNextNode) {
          stepDistanceRef.current -= distanceToNextNode
          onStep()
        }
      } else {
        lastStepRef.current.magnitude = magnitude
      }
    }
    window.addEventListener('devicemotion', handleMotion)
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [stepTracking, onStep, distanceToNextNode])

  async function enableCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage('Camera access is not available in this browser. Showing the destination-photo fallback.')
      return
    }
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      })
      setStream(cameraStream)
      setCameraMessage('')
    } catch (error) {
      const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')
      setCameraMessage(denied
        ? 'Camera permission was denied. You can continue with the destination-photo fallback.'
        : 'The rear camera could not be opened. You can continue with the destination-photo fallback.')
    }
  }

  async function calibrateCompass() {
    if (!('DeviceOrientationEvent' in window)) {
      setCameraMessage('Compass heading is not available on this device. The arrows remain illustrative.')
      return
    }
    const OrientationEvent = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    if (OrientationEvent.requestPermission) {
      try {
        const permission = await OrientationEvent.requestPermission()
        if (permission !== 'granted') {
          setCameraMessage('Compass permission was not granted. The arrows remain illustrative.')
          return
        }
      } catch {
        setCameraMessage('Compass permission could not be requested. The arrows remain illustrative.')
        return
      }
    }
    if (headingRef.current === null) {
      setCameraMessage('Compass heading is unavailable on this device. The arrows remain illustrative.')
      return
    }
    setCalibration((bearing + mapNorthOffset - headingRef.current + 360) % 360)
    setCameraMessage('Compass aligned to the corridor.')
  }

  async function toggleStepTracking() {
    if (!stepTracking) {
      if (!('DeviceMotionEvent' in window)) {
        setCameraMessage('Step tracking is not available in this browser.')
        return
      }
      const MotionEvent = DeviceMotionEvent as typeof DeviceMotionEvent & {
        requestPermission?: () => Promise<'granted' | 'denied'>
      }
      if (MotionEvent.requestPermission) {
        try {
          const permission = await MotionEvent.requestPermission()
          if (permission !== 'granted') {
            setCameraMessage('Motion permission was not granted. Step tracking remains off.')
            return
          }
        } catch {
          setCameraMessage('Motion permission could not be requested. Step tracking remains off.')
          return
        }
      }
    }
    setStepTracking(value => !value)
  }

  const relativeBearing = ((bearing + mapNorthOffset - (heading ?? 0) - (calibration ?? 0) + 360) % 360)

  return (
    <motion.div className="ar-overlay" role="dialog" aria-modal="true" aria-label="AR guidance camera overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="ar-camera-background">
        {stream
          ? <video ref={videoRef} className="ar-camera-video" autoPlay muted playsInline aria-label="Live rear-camera view"/>
          : roomPhoto
            ? <img className="ar-fallback-photo" src={roomPhoto} alt={`Photo reference for ${destination}`}/>
            : <div className="ar-no-photo"><Camera size={35}/><span>Camera preview unavailable</span></div>}
      </div>
      <div className="ar-shade"/>
      <header className="ar-header">
        <div><small>AR GUIDANCE · CAMERA OVERLAY</small><b>{destination}</b></div>
        <button type="button" onClick={onClose} aria-label="Close AR guidance"><X size={21}/></button>
      </header>
      {!stream && roomPhoto && <span className="ar-photo-fallback-label">Photo guidance fallback</span>}
      <div className="ar-instruction-card">
        <span className="ar-distance">{Math.max(0, Math.round(distance))} m</span>
        <b>{instruction}</b>
        <small>Visual guidance only · not world-anchored AR</small>
      </div>
      <div className="ar-arrow-field" aria-hidden="true">
        <motion.span className="ar-chevron" style={{ rotate: relativeBearing }} animate={{ y: [0, -9, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>
          <ArrowUp size={78} strokeWidth={3}/>
        </motion.span>
        {distance <= 15 && <span className="ar-destination-pin"><MapPin size={22} fill="currentColor"/> Destination ahead</span>}
        <span className="ar-floor-arrow"><ArrowLeft size={24}/><ArrowRight size={24}/><ArrowDown size={24}/></span>
      </div>
      <footer className="ar-controls">
        {cameraMessage && <p className="ar-status" role="status">{cameraMessage}</p>}
        {!stream && <button type="button" className="ar-control-button" onClick={enableCamera}><Camera size={16}/> Turn on camera</button>}
        <button type="button" className="ar-control-button" onClick={calibrateCompass}><Compass size={16}/> Calibrate: point along corridor</button>
        <button type="button" className="ar-control-button" onClick={toggleStepTracking}><Footprints size={16}/>{stepTracking ? `Step tracking on · ${stepCount}` : 'Enable step tracking'}</button>
        {calibration !== null && <span className="ar-calibrated"><Check size={14}/> Calibrated</span>}
        {heading === null && <span className="ar-compass-warning">Compass accuracy low · move your phone in a figure 8</span>}
        <button type="button" className="ar-control-button ar-next-step" onClick={onStep}><RotateCcw size={16}/> Next waypoint</button>
      </footer>
      <AnimatePresence>{cameraMessage && <motion.span className="sr-only" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{cameraMessage}</motion.span>}</AnimatePresence>
    </motion.div>
  )
}
