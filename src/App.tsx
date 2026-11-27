import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Lenis from 'lenis'
import Fuse from 'fuse.js'
import {
  Accessibility, ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, ArrowUpRight, AudioLines, Bell,
  BookOpen, Building2, Camera, Check, ChevronDown, ChevronRight, Clock3, Compass, CornerUpLeft, CornerUpRight, ExternalLink,
  Footprints, GraduationCap, Info, Layers3, LocateFixed, MapPin, MapPinned,
  Mic, Moon, Navigation, Pause, Play, Plus, Search, ShieldAlert, Sparkles, Sun, Utensils, Volume2, VolumeX, X
} from 'lucide-react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { campus, edgeKey, findAlternateRoute, findRoute, nearestRoom, projectMapPoint } from './data/routing'
import type { CampusRoom, NavigationInstruction, RouteResult } from './data/types'
import { readState, subscribeState, trackRoute, trackSearch, writeState } from './data/store'
import type { DemoState } from './data/store'
import panoramaData from './data/panoramas.json'
import streetviewData from './data/streetview.json'
import ARGuidance from './components/ARGuidance'

const Twin = lazy(() => import('./components/Twin'))
const EventsPage = lazy(() => import('./pages/EventsPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const QrPage = lazy(() => import('./pages/QrPage'))
const PanoramaPage = lazy(() => import('./pages/PanoramaPage'))
const floorNames = ['Ground', '1st', '2nd', '3rd', '4th']
interface PanoramaAsset {
  file: string
  room: string
  name: string
  hotspots?: string[]
}
const panoramaAssets = panoramaData as PanoramaAsset[]
const streetviewLinks = streetviewData as { place: string; url: string; room: string }[]
const categories = [
  { label: 'Library', query: 'library', icon: BookOpen },
  { label: 'Washroom', query: 'nearest washroom', icon: LocateFixed },
  { label: 'Canteen', query: 'canteen', icon: Utensils },
  { label: 'Departments', query: 'CSE department', icon: GraduationCap },
  { label: 'Exam cell', query: 'exam cell', icon: Bell }
]
const voices = [
  { label: 'English', lang: 'en-IN' },
  { label: 'తెలుగు', lang: 'te-IN' },
  { label: 'हिन्दी', lang: 'hi-IN' }
]

type RecognitionInstance = {
  lang: string
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
}

export default function App() {
  const location = useLocation()
  const [theme, setTheme] = useState(localStorage.getItem('stanley-theme') ?? 'light')
  const [accessible, setAccessible] = useState(false)
  const [largeText, setLargeText] = useState(false)
  const [state, setState] = useState<DemoState>(() => readState())
  const stateRef = useRef(state)
  const [toast, setToast] = useState('')
  const [muted, setMuted] = useState(false)
  const [voiceLang, setVoiceLang] = useState('en-IN')

  useEffect(() => subscribeState(next => {
    const routeChanged = next.blocked.join('|') !== stateRef.current.blocked.join('|')
    stateRef.current = next
    setState(next)
    if (routeChanged) {
      setToast('Route updated · campus conditions changed')
      window.setTimeout(() => setToast(''), 3500)
    }
  }), [])

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lenis = new Lenis({ autoRaf: !reducedMotion, duration: reducedMotion ? 0.1 : 0.8 })
    return () => lenis.destroy()
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = accessible ? 'contrast' : theme
    document.documentElement.classList.toggle('large-text', largeText)
    return () => document.documentElement.classList.remove('large-text')
  }, [theme, accessible, largeText])

  useEffect(() => {
    if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  const updateState = (next: DemoState) => {
    stateRef.current = next
    setState(next)
    writeState(next)
  }
  const speak = (text: string) => {
    if (muted || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = voiceLang
    window.speechSynthesis.speak(utterance)
  }
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('stanley-theme', next)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Stanley Campus Navigator home">
          <img src="/assets/stanley-crest.jpg" alt="Stanley College crest" />
          <span><b>Stanley</b><small>Campus navigator</small></span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}><Compass size={16}/> Explore</Link>
          <Link to="/events" className={location.pathname === '/events' ? 'active' : ''}>Events</Link>
          <Link to="/twin" className={location.pathname === '/twin' ? 'active' : ''}>Digital twin</Link>
          <Link to="/360" className={location.pathname === '/360' ? 'active' : ''}>360° views</Link>
        </nav>
        <div className="top-actions">
          <label className="voice-select"><AudioLines size={15}/><select aria-label="Navigation voice language" value={voiceLang} onChange={event => setVoiceLang(event.target.value)}>{voices.map(voice => <option key={voice.lang} value={voice.lang}>{voice.label}</option>)}</select></label>
          <button className="icon-button" title={muted ? 'Unmute voice' : 'Mute voice'} onClick={() => setMuted(value => !value)}>{muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}</button>
          <button className="icon-button" title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>
          <button className={`icon-button ${accessible ? 'is-on' : ''}`} title="Accessibility mode" onClick={() => setAccessible(value => !value)}><Accessibility size={19}/></button>
          {accessible && <button className="text-size-button" onClick={() => setLargeText(value => !value)} aria-pressed={largeText}>Aa</button>}
        </div>
      </header>

      {state.announcement && <div className="announcement"><Bell size={15}/><span>{state.announcement}</span><button aria-label="Dismiss announcement" onClick={() => updateState({ ...state, announcement: '' })}><X size={15}/></button></div>}

      <AnimatePresence mode="wait">
        <motion.main key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -7 }} transition={{ duration: 0.24 }}>
          <Suspense fallback={<div className="page subpage" role="status">Loading campus view…</div>}>
            <Routes>
              <Route path="/" element={<HomePage state={state} updateState={updateState} accessible={accessible} toggleAccessible={() => setAccessible(value => !value)} speak={speak} />} />
              <Route path="/events" element={<EventsPage onNavigate={room => window.location.assign(`/?to=${encodeURIComponent(room)}`)} />} />
              <Route path="/admin" element={<AdminPage state={state} updateState={updateState}/>} />
              <Route path="/qr" element={<QrPage />} />
              <Route path="/360" element={<PanoramaPage />} />
              <Route path="/twin" element={<TwinPage />} />
              <Route path="*" element={<HomePage state={state} updateState={updateState} accessible={accessible} toggleAccessible={() => setAccessible(value => !value)} speak={speak} />} />
            </Routes>
          </Suspense>
        </motion.main>
      </AnimatePresence>

      <footer className="site-footer"><span>Demo prototype for Stanley College of Engineering &amp; Technology for Women</span><div><Link to="/qr">Landmark QR</Link><Link to="/admin">Admin</Link><span>Hyderabad, India</span></div></footer>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <Link to="/"><Compass size={19}/><span>Explore</span></Link>
        <Link to="/events"><Bell size={19}/><span>Events</span></Link>
        <Link to="/twin"><Layers3 size={19}/><span>Twin</span></Link>
        <Link to="/360"><ArrowUpRight size={19}/><span>360°</span></Link>
      </nav>
      <AnimatePresence>{toast && <motion.div className="toast" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}><Check size={16}/>{toast}</motion.div>}</AnimatePresence>
    </div>
  )
}

interface HomeProps {
  state: DemoState
  updateState: (state: DemoState) => void
  accessible: boolean
  toggleAccessible: () => void
  speak: (text: string) => void
}

function HomePage({ state, updateState, accessible, toggleAccessible, speak }: HomeProps) {
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState(() => {
    const landmark = new URLSearchParams(window.location.search).get('landmark')
    return landmark && campus.nodes.some(node => node.id === landmark) ? landmark : 'gate'
  })
  const [fromText, setFromText] = useState(() => {
    const landmark = new URLSearchParams(window.location.search).get('landmark')
    return landmark ? campus.nodes.find(node => node.id === landmark)?.name ?? 'Main Gate' : 'Main Gate'
  })
  const [target, setTarget] = useState<CampusRoom | null>(null)
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [block, setBlock] = useState<string | null>(null)
  const [floor, setFloor] = useState(0)
  const [showSteps, setShowSteps] = useState(false)
  const [navigationActive, setNavigationActive] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showHere, setShowHere] = useState(false)
  const [emergency, setEmergency] = useState(false)
  const [voiceListening, setVoiceListening] = useState(false)
  const [planPhoto, setPlanPhoto] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [northUp, setNorthUp] = useState(false)
  const [arOpen, setArOpen] = useState(false)
  const [mapPickFor, setMapPickFor] = useState<'start' | 'destination' | null>(null)
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [mapZoom, setMapZoom] = useState(1)
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 })
  const mapPanStart = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null)
  const spokenThresholds = useRef(new Set<number>())
  const fuse = useMemo(() => new Fuse(campus.rooms, {
    keys: ['id', 'name', 'dept', 'aliases', 'type', 'block'],
    threshold: 0.38, ignoreLocation: true, minMatchCharLength: 2
  }), [])
  const filtered = query.trim() && !target ? fuse.search(query.replace(/^(where is|find|take me to|navigate to)\s+/i, '').trim()).slice(0, 5).map(result => result.item) : []
  const placeOptions = useMemo(() => [
    ...campus.nodes.map(node => ({ id: node.id, label: node.name })),
    ...campus.rooms.map(room => ({ id: room.id, label: `${room.name} · ${room.id}` }))
  ], [])
  const alternateRoute = useMemo(
    () => route && target ? findAlternateRoute(from, target.id, { accessible, blocked: state.blocked }) : null,
    [route, from, target, accessible, state.blocked]
  )
  const campusTransform = campus.mapTransforms?.find(item => item.id === 'campus-ground')
  const remainingDistance = route
    ? route.edges.slice(Math.min(progress, route.edges.length)).reduce((total, edge) => total + edge.weight, 0)
    : 0

  function mapPoint(nodeId: string): [number, number] {
    const node = campus.nodes.find(item => item.id === nodeId)
    if (!node) return [50, 50]
    return planPhoto && campusTransform
      ? projectMapPoint(node.x, node.y, campusTransform.controlPoints, campusTransform.sourceSize)
      : [node.x, node.y]
  }

  function startMapPan(event: React.PointerEvent<HTMLDivElement>) {
    if (mapZoom <= 1 || (event.target instanceof Element && event.target.closest('button'))) return
    mapPanStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: mapOffset.x,
      offsetY: mapOffset.y
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveMapPan(event: React.PointerEvent<HTMLDivElement>) {
    const start = mapPanStart.current
    if (!start || start.pointerId !== event.pointerId) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const maxX = bounds.width * (mapZoom - 1) / 2
    const maxY = bounds.height * (mapZoom - 1) / 2
    setMapOffset({
      x: Math.max(-maxX, Math.min(maxX, start.offsetX + event.clientX - start.x)),
      y: Math.max(-maxY, Math.min(maxY, start.offsetY + event.clientY - start.y))
    })
  }

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('to')
    if (requested) {
      const room = campus.rooms.find(item => item.id === requested) ?? campus.rooms.find(item => item.name.toLowerCase().includes(requested.toLowerCase()))
      if (room) chooseRoom(room)
      else if (campus.nodes.some(node => node.id === requested)) {
        const node = campus.nodes.find(item => item.id === requested)
        const route = findRoute(from, requested, { accessible, blocked: state.blocked })
        if (node && route) {
          setTarget({ id: node.id, name: node.name, type: node.kind ?? 'landmark', block: node.block ?? '', floor: node.floor, dept: 'Campus', aliases: [], polygon: [] })
          setBlock(node.block ?? null)
          setFloor(node.floor)
          setRoute(route)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!simulating || !route) return
    const timer = window.setInterval(() => {
      setProgress(value => {
        const next = Math.min(value + speed, route.nodeIds.length - 1)
        const nextNode = campus.nodes.find(node => node.id === route.nodeIds[next])
        if (nextNode?.block) {
          setBlock(nextNode.block)
          setFloor(nextNode.floor)
        }
        const instruction = route.instructions.find(item => item.nodeId === nextNode?.id)
        if (instruction && instruction.kind !== 'walk' && instruction.kind !== 'arrive') {
          speak(instruction.text)
          if ('vibrate' in navigator) navigator.vibrate?.(45)
        }
        if (next >= route.nodeIds.length - 1) {
          setSimulating(false)
          return next
        }
        return next
      })
    }, 1500)
    return () => window.clearInterval(timer)
  }, [simulating, route, speed, speak])

  useEffect(() => {
    if (!target) return
    setRoute(findRoute(from, target.id, { accessible, blocked: state.blocked }))
    setSimulating(false)
    setProgress(0)
  }, [from, target, state.blocked, accessible])

  useEffect(() => {
    if (!simulating || !route) return
    for (const threshold of [30, 10]) {
      if (remainingDistance <= threshold && !spokenThresholds.current.has(threshold)) {
        spokenThresholds.current.add(threshold)
        speak(threshold === 10 ? `You are 10 metres from ${target?.name ?? 'your destination'}.` : `You are 30 metres from ${target?.name ?? 'your destination'}.`)
      }
    }
  }, [simulating, route, remainingDistance, target, speak])

  function chooseRoom(room: CampusRoom | null, searchTerm = query) {
    if (!room) return
    const nextRoute = findRoute(from, room.id, { accessible, blocked: state.blocked })
    setEmergency(false)
    setNavigationActive(false)
    setTarget(room)
    setBlock(null)
    setFloor(0)
    setQuery(room.id)
    setRoute(nextRoute)
    setShowSteps(true)
    setSheetExpanded(false)
    setProgress(0)
    setSimulating(false)
    if (nextRoute) {
      updateState(trackRoute(trackSearch(state, searchTerm || room.id), `${from} → ${room.id}`))
      searchRef.current?.blur()
    }
  }

  function submitSearch(value = query) {
    const clean = value.trim()
    if (!clean) return
    const nearest = /nearest\s+(washroom|restroom|toilet|bathroom)/i.test(clean)
      ? nearestRoom(from, 'washroom', { accessible, blocked: state.blocked })
      : null
    if (nearest) {
      chooseRoom(nearest.room, clean)
      return
    }
    const exact = campus.rooms.find(room => room.id.toLowerCase() === clean.toLowerCase())
    const match = exact ?? fuse.search(clean.replace(/^(where is|find|take me to|navigate to)\s+/i, '').trim())[0]?.item
    if (match) chooseRoom(match, clean)
    else updateState(trackSearch(state, clean))
  }

  function speakDirections() {
    if (!route) return
    speak(route.steps.join(' '))
  }

  function startVoiceSearch() {
    const Recognition = (window as Window & { SpeechRecognition?: new () => RecognitionInstance; webkitSpeechRecognition?: new () => RecognitionInstance }).SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: new () => RecognitionInstance }).webkitSpeechRecognition
    if (!Recognition) {
      window.alert('Voice search is not supported in this browser. Try a recent version of Chrome.')
      return
    }
    const recognition = new Recognition()
    recognition.lang = 'en-IN'
    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript
      setQuery(transcript)
      setVoiceListening(false)
      submitSearch(transcript)
    }
    recognition.onerror = () => setVoiceListening(false)
    recognition.onend = () => setVoiceListening(false)
    setVoiceListening(true)
    recognition.start()
  }

  function selectLandmark(id: string) {
    setNavigationActive(false)
    setSimulating(false)
    setFrom(id)
    setFromText(placeOptions.find(item => item.id === id)?.label ?? id)
    setShowHere(false)
    setQuery('')
    if (target) setRoute(findRoute(id, target.id, { accessible, blocked: state.blocked }))
    setProgress(0)
  }

  function resolvePlace(value: string): { id: string; label: string } | undefined {
    const clean = value.trim().toLowerCase()
    if (!clean) return undefined
    const option = placeOptions.find(item => item.id.toLowerCase() === clean)
      ?? placeOptions.find(item => item.label.toLowerCase() === clean)
      ?? placeOptions.find(item => item.label.toLowerCase().includes(clean))
    if (option) return option
    const room = fuse.search(clean)[0]?.item
    return room ? { id: room.id, label: `${room.name} · ${room.id}` } : undefined
  }

  function chooseStart(value: string) {
    setNavigationActive(false)
    setSimulating(false)
    setFromText(value)
    const match = resolvePlace(value)
    if (!match) return
    setFrom(match.id)
    setFromText(match.label)
    if (target) setRoute(findRoute(match.id, target.id, { accessible, blocked: state.blocked }))
    setProgress(0)
  }

  function swapRoute() {
    if (!target) return
    setNavigationActive(false)
    setSimulating(false)
    const oldStart = placeOptions.find(item => item.id === from)
    const oldDestination = { id: target.id, label: `${target.name} · ${target.id}` }
    const previousDestination = campus.rooms.find(room => room.id === from)
      ?? (oldStart ? { id: oldStart.id, name: oldStart.label, type: 'landmark', block: '', floor: 0, dept: '', aliases: [], polygon: [] } satisfies CampusRoom : null)
    if (!previousDestination) return
    setFrom(oldDestination.id)
    setFromText(oldDestination.label)
    setTarget(previousDestination)
    setQuery(previousDestination.id)
    setRoute(findRoute(oldDestination.id, previousDestination.id, { accessible, blocked: state.blocked }))
    setProgress(0)
  }

  function selectFromMap(blockId: string) {
    const nodeId = `${blockId}-${floor}`
    if (mapPickFor === 'start') {
      chooseStart(nodeId)
      setMapPickFor(null)
      return
    }
    const room = campus.rooms.find(item => item.block === blockId && item.floor === floor)
    if (room) chooseRoom(room)
    else {
      const node = campus.nodes.find(item => item.id === nodeId)
      if (node) {
        setNavigationActive(false)
        setSimulating(false)
        setTarget({ id: node.id, name: node.name, type: 'landmark', block: blockId, floor, dept: 'Campus', aliases: [], polygon: [] })
        setRoute(findRoute(from, node.id, { accessible, blocked: state.blocked }))
        setBlock(null)
      }
    }
    setMapPickFor(null)
  }

  function rerouteTest() {
    const nextEdge = route?.edges.find(edge => !state.blocked.includes(edgeKey(edge)) && ['corridor', 'stairs', 'outdoor'].includes(edge.type))
    if (!nextEdge) return
    updateState({ ...state, blocked: [...state.blocked, edgeKey(nextEdge)] })
  }

  function setRouteProgress(value: number) {
    const next = Math.max(0, Math.min(Math.round(value), (route?.nodeIds.length ?? 1) - 1))
    setProgress(next)
    const node = route && campus.nodes.find(item => item.id === route.nodeIds[next])
    if (node?.block) {
      setBlock(node.block)
      setFloor(node.floor)
    }
    if (next >= (route?.nodeIds.length ?? 1) - 1) setSimulating(false)
  }

  function toggleNavigationPlayback() {
    if (simulating) {
      setSimulating(false)
      return
    }
    if (route && progress >= route.nodeIds.length - 1) setProgress(0)
    setSimulating(true)
  }

  function selectFloorOnRoute(nextFloor: number) {
    const node = route?.nodeIds.map(id => campus.nodes.find(item => item.id === id)).find(item => item?.floor === nextFloor && item.block)
    if (!node?.block) return
    setBlock(node.block)
    setFloor(nextFloor)
  }

  function triggerEmergency() {
    const destination = findRoute(from, 'exit', { accessible, blocked: state.blocked })
    setEmergency(true)
    setTarget(null)
    setRoute(destination)
    setNavigationActive(false)
    setSimulating(false)
    setProgress(0)
    setShowSteps(true)
    setBlock(null)
    setFloor(0)
    speak(`Emergency route. ${destination?.steps.join(' ') ?? 'No safe path is available. Please ask campus staff for help.'}`)
  }

  return (
    <div className="page home-page">
      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot"/> YOUR CAMPUS, MADE SIMPLE</div>
          <h1>Find your way<br/><em>with confidence.</em></h1>
          <p>Every classroom, every corridor, every floor. A calmer way to navigate Stanley.</p>
          <div className="search-wrap">
            <div className="search-box">
              <Search size={21}/><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') submitSearch() }} placeholder="Find a room, person, department…" aria-label="Search campus" autoComplete="off"/>
              <button className={`voice-button ${voiceListening ? 'listening' : ''}`} title="Search by voice" onClick={startVoiceSearch}><Mic size={18}/></button>
              <button className="search-submit" onClick={() => submitSearch()} aria-label="Search"><ArrowRight size={18}/></button>
            </div>
            {filtered.length > 0 && <div className="search-results">{filtered.map(room => <button key={room.id} onClick={() => chooseRoom(room)}>{roomPhoto(room.id) && <img className="result-photo" src={roomPhoto(room.id)} alt=""/>}<span className="result-icon"><MapPin size={16}/></span><span><b>{room.name}</b><small>{room.id} · Block {room.block} · {floorNames[room.floor]} floor</small></span><ChevronRight size={17}/></button>)}</div>}
            <div className="search-hint"><span>Try</span> <button onClick={() => { setQuery('where is CSE department'); submitSearch('where is CSE department') }}>“where is CSE department”</button><span>or</span><button onClick={() => { setQuery('nearest washroom'); submitSearch('nearest washroom') }}>“nearest washroom”</button></div>
          </div>
          <div className="category-row">{categories.map(({ label, query: itemQuery, icon: Icon }) => <button key={label} className="category-chip" onClick={() => { setQuery(itemQuery); submitSearch(itemQuery) }}><Icon size={15}/>{label}</button>)}</div>
          {!query && state.recentSearches.length > 0 && <div className="recent-searches"><span>RECENT</span>{state.recentSearches.slice(0, 3).map(item => <button key={item} onClick={() => { setQuery(item); submitSearch(item) }}>{item}</button>)}</div>}
          <div className="hero-stats"><div><b>5</b><span>blocks</span></div><i/><div><b>5</b><span>floors</span></div><i/><div><b>{campus.rooms.length}+</b><span>destinations</span></div></div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit orbit-a"/><div className="hero-orbit orbit-b"/>
          <div className="hero-illustration">
            <img src="/assets/stanley-logo.jpeg" alt="Stanley College of Engineering & Technology for Women logo"/>
            <div className="illustration-campus">
              <div className="ill-block ill-a">A</div><div className="ill-block ill-b">B</div><div className="ill-block ill-c">C</div><div className="ill-block ill-d">D</div><div className="ill-block ill-e">E</div>
              <div className="ill-lawn">OPEN<br/>AREA</div><div className="ill-route"/>
              <div className="ill-pin"><MapPin size={17} fill="currentColor"/></div>
            </div>
            <div className="glass-note"><span className="pulse-dot"/><span><b>You're on your way</b><small>Indoor directions, made easy</small></span><Navigation size={18}/></div>
          </div>
          <div className="floating-label label-left"><span className="label-icon"><Building2 size={17}/></span><span><b>5 campus blocks</b><small>Connected, one map</small></span></div>
          <div className="floating-label label-right"><span className="label-icon gold"><LocateFixed size={17}/></span><span><b>Every floor</b><small>Ground to 4th</small></span></div>
          <div className="hero-sparkle sparkle-one"><Sparkles size={18}/></div><div className="hero-sparkle sparkle-two"><Plus size={19}/></div>
        </div>
      </section>

      <section className="explore-section">
        <form className="route-planner" onSubmit={event => { event.preventDefault(); chooseStart(fromText); submitSearch(query) }}>
          <div className="planner-heading"><div><span className="eyebrow">WALKING DIRECTIONS</span><h2>Plan your route</h2></div><span className="simulated-badge"><span/> Simulated positioning</span></div>
          <div className="planner-fields">
            <label className="planner-field from-field"><span className="origin-dot"/><span>From</span><input list="campus-place-options" value={fromText} onChange={event => setFromText(event.target.value)} onBlur={() => chooseStart(fromText)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); chooseStart(fromText) } }} aria-label="Starting point" placeholder="Main Gate"/></label>
            <button type="button" className="swap-route" title="Swap start and destination" aria-label="Swap start and destination" onClick={swapRoute}><ArrowLeftRight size={17}/></button>
            <label className="planner-field to-field"><MapPin size={17}/><span>To</span><input list="campus-place-options" value={target ? `${target.name} · ${target.id}` : query} onChange={event => { setNavigationActive(false); setSimulating(false); setTarget(null); setRoute(null); setQuery(event.target.value) }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); submitSearch(query) } }} aria-label="Destination" placeholder="Search rooms, people, departments"/></label>
            <datalist id="campus-place-options">{placeOptions.map((item, index) => <option key={`${item.id}-${index}`} value={item.label}/>)}</datalist>
            <button className="planner-go" type="submit"><Navigation size={17}/> Find route</button>
          </div>
          <div className="planner-actions"><button type="button" onClick={() => setMapPickFor(value => value === 'start' ? null : 'start')} className={mapPickFor === 'start' ? 'selected' : ''}><MapPinned size={15}/> Choose start on map</button><button type="button" onClick={() => setMapPickFor(value => value === 'destination' ? null : 'destination')} className={mapPickFor === 'destination' ? 'selected' : ''}><MapPinned size={15}/> Choose destination on map</button><button type="button" onClick={() => setShowHere(true)}><LocateFixed size={15}/> I'm here · pick landmark / QR</button></div>
          <div className="quick-destinations" aria-label="Quick destinations">{[
            ['Library', 'E-205'], ['HoD CSE', 'B-407'], ['HoD IT', 'C-004'], ['Examination Cell', 'E-012'], ['Accounts', 'E-111'], ['AI & DS', 'E-003'], ['Canteen', 'B-001'], ['Washroom', 'nearest washroom']
          ].map(([label, code]) => <button type="button" key={label} onClick={() => { if (code === 'nearest washroom') submitSearch(code); else { const room = campus.rooms.find(item => item.id === code); if (room) chooseRoom(room, label) } }}>{label}</button>)}</div>
          {target && <div className="route-choice-row"><button type="button" className={`route-choice ${!accessible ? 'active' : ''}`} onClick={() => accessible && toggleAccessible()}><b>Fastest</b><span>{route && !accessible ? `${route.minutes} min · ${route.distance} m` : 'Standard route'}</span></button><button type="button" className={`route-choice ${accessible ? 'active' : ''}`} onClick={() => !accessible && toggleAccessible()}><b>Accessible (no stairs)</b><span>{accessible ? route ? `${route.minutes} min · step-free` : 'No verified step-free route' : 'Find step-free route'}</span></button>{route && <div className="route-floors" aria-label="Floors on route">{[...new Set(route.nodeIds.map(id => campus.nodes.find(node => node.id === id)?.floor).filter((value): value is number => value !== undefined))].map(item => <button type="button" key={item} onClick={() => selectFloorOnRoute(item)} title={`${floorNames[item]} floor`}><i/>{floorNames[item]}</button>)}</div>}</div>}
          {target && !route && accessible && <p className="route-unavailable" role="status">No verified step-free route is available for this destination. The scanned plan does not confirm lift or ramp access.</p>}
        </form>
        <div className="section-heading">
          <div><div className="eyebrow">EXPLORE THE CAMPUS</div><h2>{block ? `Block ${block}` : 'A campus at a glance'}</h2><p>{block ? `Choose a floor to explore rooms and find your destination.` : 'Tap a building to open its floor plan, or start a route from the main gate.'}</p></div>
          {block && <button className="quiet-button" onClick={() => { setNavigationActive(false); setSimulating(false); setBlock(null); setFloor(0); setTarget(null); setRoute(null) }}><ArrowLeft size={16}/> All campus</button>}
        </div>
        <div className={`explore-grid ${route ? 'has-route' : ''}`}>
          <div className="map-card">
            <div className="map-card-top"><div><span className="live-dot"/><b>{block ? `BLOCK ${block} · ${floorNames[floor].toUpperCase()} FLOOR` : 'STANLEY CAMPUS · ABIDS'}</b></div><span className="map-caption">{block && floor > 0 ? 'Approximate layout' : planPhoto ? 'Real campus plan scan · route alignment approximate' : 'Clean campus plan · route alignment approximate'}</span><button type="button" className="plan-toggle" onClick={() => setPlanPhoto(value => !value)}>{planPhoto ? 'Plan photo' : 'Clean plan'}</button></div>
            {!block ? (
              <div className="campus-map" onPointerDown={startMapPan} onPointerMove={moveMapPan} onPointerUp={() => { mapPanStart.current = null }} onPointerCancel={() => { mapPanStart.current = null }} style={{ touchAction: mapZoom > 1 ? 'none' : 'pan-y' }}>
                <div className="campus-map-layer" style={{ '--map-rotation': `${route && navigationActive && !northUp ? -bearingToNextNode(route, progress) : 0}deg`, '--map-zoom': mapZoom, '--map-x': `${mapOffset.x}px`, '--map-y': `${mapOffset.y}px` } as React.CSSProperties}>
                <img src={planPhoto ? '/maps/campus-ground.webp' : '/maps/ground-plan.svg'} alt={planPhoto ? 'Photographed Stanley College campus ground plan from the supplied plan' : 'Clean simplified Stanley College campus plan'}/>
                {route && planPhoto && <RouteMapLayer route={route} alternate={alternateRoute} progress={progress}/>}
                {campus.buildings.map(building => {
                  const position = planPhoto && campusTransform
                    ? projectMapPoint(building.x, building.y, campusTransform.controlPoints, campusTransform.sourceSize)
                    : [building.x, building.y]
                  return <button key={building.id} className={`map-building map-building-${building.id.toLowerCase()}`} style={{ left: `${position[0]}%`, top: `${position[1]}%`, '--building-color': building.color } as React.CSSProperties} onClick={() => mapPickFor ? selectFromMap(building.id) : (setBlock(building.id), setFloor(0))}><b>{building.id}</b><span>{building.name}</span></button>
                })}
                {!route && <>
                  {(['gate', 'quad', 'parking', 'play'] as const).map(id => {
                    const point = mapPoint(id)
                    const label = id === 'gate' ? 'Main Gate' : id === 'quad' ? 'Open area' : id === 'parking' ? 'Parking' : 'Play area'
                    return <button key={id} className={`map-place place-${id === 'quad' ? 'open' : id}`} style={{ left: `${point[0]}%`, right: 'auto', top: `${point[1]}%`, bottom: 'auto', transform: 'translate(-50%,-50%)' }} onClick={() => selectLandmark(id)}>{id === 'gate' && <span/>}{label}</button>
                  })}
                  {(() => {
                    const point = mapPoint('canteen')
                    return <button className="map-place place-canteen" style={{ left: `${point[0]}%`, right: 'auto', top: `${point[1]}%`, transform: 'translate(-50%,-50%)' }} onClick={() => submitSearch('canteen')}>Canteen</button>
                  })()}
                </>}
                {route && <div className="map-route-markers"><span className="start-map-marker"><span/>Start · {placeOptions.find(item => item.id === from)?.label}</span>{target && <span className="end-map-marker"><MapPin size={17} fill="currentColor"/><b>{target.id}</b>{roomPhoto(target.id) && <img src={roomPhoto(target.id)} alt=""/>}</span>}</div>}
                <div className="map-scale"><span/> 50 m</div>
                </div>
                <div className="map-controls" role="group" aria-label="Map zoom controls">
                  <button type="button" aria-label="Zoom in" onClick={() => setMapZoom(value => Math.min(3, value + 0.25))}><Plus size={16}/></button>
                  <button type="button" aria-label="Zoom out" onClick={() => setMapZoom(value => { const next = Math.max(1, value - 0.25); if (next === 1) setMapOffset({ x: 0, y: 0 }); return next })}><span>−</span></button>
                  <button type="button" aria-label="Reset map view" onClick={() => { setMapZoom(1); setMapOffset({ x: 0, y: 0 }) }}><LocateFixed size={14}/></button>
                </div>
              </div>
            ) : (
              <FloorMap block={block} floor={floor} target={target} route={route} onSelect={chooseRoom} planPhoto={planPhoto}/>
            )}
            {block && <div className="floor-switcher" role="group" aria-label="Choose floor">{floorNames.map((name, index) => <button key={name} onClick={() => setFloor(index)} className={floor === index ? 'selected' : ''}>{name}</button>)}</div>}
            <div className="map-legend"><span><i className="legend-room"/> Destination</span><span><i className="legend-route"/> Route</span><button onClick={() => setShowHere(true)}><LocateFixed size={14}/> I'm here / Scan QR</button>{route && navigationActive && <button onClick={() => setNorthUp(value => !value)}>{northUp ? 'Heading up' : 'North up'}</button>}</div>
            <div className="map-disclaimer"><Info size={14}/>{block && floor > 0 ? 'Upper-floor room placements are approximate. Confirm directions with campus staff.' : 'Illustrated demo map · distances and positioning are estimates.'}</div>
          </div>

          <aside className={`route-panel ${route && !navigationActive ? 'route-sheet' : ''}`}>
            {emergency && route ? (
              <div className="emergency-card"><div className="emergency-head"><ShieldAlert size={20}/><span>EMERGENCY MODE</span><button onClick={() => { setEmergency(false); setRoute(null) }} aria-label="Close emergency mode"><X size={16}/></button></div><h3>Move to safety</h3><p>Follow the route to the nearest exit. Avoid blocked passages.</p><div className="safe-destination"><MapPin size={18}/><span><b>Main Gate Exit</b><small>Assembly point: Open Area</small></span></div><ol>{route.steps.map((step, index) => <li key={index}>{step}</li>)}</ol><button className="emergency-action" onClick={() => speak(route.steps.join(' '))}><Volume2 size={16}/> Speak directions</button></div>
            ) : route && target ? (
              <motion.div className="directions-card" drag="y" dragConstraints={{ top: -160, bottom: 0 }} dragElastic={0.06} onDragEnd={(_, info) => setSheetExpanded(info.offset.y < -35)} animate={{ y: sheetExpanded ? -90 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
                <button className="sheet-handle" onClick={() => setSheetExpanded(value => !value)} aria-label={sheetExpanded ? 'Collapse directions' : 'Expand directions'}><i/></button>
                {navigationActive && <div className="navigation-banner"><span className="maneuver-arrow">{instructionIcon(route.instructions.find(item => item.nodeId === route.nodeIds[Math.min(progress + 1, route.nodeIds.length - 1)])?.kind ?? 'walk')}</span><span><small>{remainingDistance <= 20 ? 'Arriving soon' : `In ${Math.min(30, Math.max(10, Math.round((route.edges[progress]?.weight ?? 20) / 5) * 5))} m`}</small><b>{route.instructions.find(item => item.nodeId === route.nodeIds[Math.min(progress + 1, route.nodeIds.length - 1)])?.text ?? `Continue toward ${target.name}`}</b><small>toward {target.name}, Block {target.block}</small></span><button onClick={toggleNavigationPlayback} aria-label={simulating ? 'Pause navigation' : 'Resume navigation'}>{simulating ? <Pause size={18}/> : <Play size={18}/>}</button></div>}
                <div className="directions-head"><div className="route-badge"><Navigation size={17}/></div><div><span>{navigationActive ? 'NAVIGATING' : 'YOUR ROUTE'}</span><b>To {target.name}</b><small>{target.id} · Block {target.block} · {floorNames[target.floor]} floor</small></div><button className="close-route" onClick={() => { setRoute(null); setTarget(null); setNavigationActive(false); setSimulating(false) }} aria-label="Clear route"><X size={17}/></button></div>
                {roomPhoto(target.id) && <div className="destination-photo-card"><img src={roomPhoto(target.id)} alt={`Door sign for ${target.name} (${target.id})`}/><span><b>{target.name}</b><small>{target.id} · You will see this door</small></span></div>}
                <div className="route-metrics"><span><Footprints size={15}/>{navigationActive ? remainingDistance : route.distance} m</span><span><Clock3 size={15}/>{Math.max(1, Math.ceil((navigationActive ? remainingDistance : route.distance) / 75))} min walk</span><span>{route.edges.some(edge => edge.type === 'stairs') ? 'Stairs' : 'Step-free'}</span></div>
                {!navigationActive && <div className="route-controls"><button className="start-button" onClick={() => { setNavigationActive(true); setSimulating(true); setProgress(0); setSheetExpanded(false); setBlock(null); speak(route.instructions[0]?.text ?? 'Start walking.') }}><Navigation size={16}/>Start</button><button className="icon-button" onClick={speakDirections} title="Read directions aloud"><Volume2 size={17}/></button></div>}
                {navigationActive && <div className="nav-progress"><span style={{ width: `${(progress / Math.max(1, route.nodeIds.length - 1)) * 100}%` }}/></div>}
                <div className="simulation-note"><span className="blue-pulse"/> simulated positioning (demo) <button onClick={() => setShowHere(true)}>I'm here / QR</button></div>
                {navigationActive && <div className="simulation-controls"><button onClick={toggleNavigationPlayback}>{simulating ? <Pause size={15}/> : <Play size={15}/>} {simulating ? 'Pause' : progress >= route.nodeIds.length - 1 ? 'Restart' : 'Play'}</button><label>Speed <select aria-label="Simulation speed" value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select></label><button onClick={rerouteTest}><MapPinned size={14}/> Reroute test</button><button onClick={() => setArOpen(true)}><Camera size={15}/> AR</button></div>}
                {navigationActive && <input className="route-scrubber" type="range" min="0" max={route.nodeIds.length - 1} value={progress} onChange={event => setRouteProgress(Number(event.target.value))} aria-label="Simulated position along route"/>}
                {!navigationActive && <button className="steps-toggle" onClick={() => { setShowSteps(value => !value); setSheetExpanded(value => !value) }}>{showSteps ? 'Hide directions' : 'Turn-by-turn directions'} <ChevronDown size={16}/></button>}
                {(showSteps || navigationActive) && <ol className="directions-list">{route.instructions.map((instruction, index) => {
                  const nodeIndex = route.nodeIds.indexOf(instruction.nodeId ?? '')
                  const complete = nodeIndex >= 0 && nodeIndex <= progress
                  const photoCode = index >= route.instructions.length - 2 ? target.id : instruction.nodeId
                  const image = photoCode ? roomPhoto(photoCode) : undefined
                  const panorama = panoramaAssets.find(item => item.room === instruction.nodeId)
                  const shareLink = streetviewLinks.find(item => item.room === instruction.nodeId)
                  return <li key={`${instruction.nodeId}-${index}`} className={complete ? 'passed' : ''}><span className="step-marker">{instructionIcon(instruction.kind)}</span><span><b className="instruction-text">{instruction.text}</b><small className="instruction-meta">{instruction.distance ? `${instruction.distance} m · ` : ''}{floorNames[instruction.floor]} floor{instruction.kind === 'arrive' || image ? ' · You will see this door' : ''}</small>{image && <img className="step-door-photo" src={image} alt={`Door photo ${photoCode}`} />}{panorama ? <Link className="preview-chip" to={`/360?room=${encodeURIComponent(panorama.room)}`}>Preview this turn <ArrowUpRight size={11}/></Link> : shareLink ? <a className="preview-chip" href={shareLink.url} target="_blank" rel="noopener noreferrer">Preview this turn <ExternalLink size={11}/></a> : null}</span></li>
                })}</ol>}
                {progress >= route.nodeIds.length - 1 && <div className="arrived-card">{roomPhoto(target.id) && <img src={roomPhoto(target.id)} alt={`Door to ${target.name}`}/>}<Sparkles size={17}/><div><b>You have arrived at {target.name}</b><small>{target.id}, {floorNames[target.floor]} floor</small></div><button onClick={() => window.alert('Thanks for helping improve this demo route!')}>Feedback</button></div>}
                <a className="street-view-link" href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${import.meta.env.VITE_CAMPUS_LAT ?? '17.3913'},${import.meta.env.VITE_CAMPUS_LNG ?? '78.4750'}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Outdoor Street View</a>
              </motion.div>
            ) : target && !route ? (
              <div className="no-stepfree-card"><span className="route-badge"><Accessibility size={17}/></span><h3>No verified step-free route</h3><p>The scanned plans show stairs but do not confirm a lift or ramp to {target.name}. Please ask campus staff before attempting this journey.</p><button className="quiet-button" onClick={toggleAccessible}>Show fastest route</button></div>
            ) : (
              <div className="welcome-panel">
                <div className="panel-kicker"><span className="tiny-sun"><Compass size={16}/></span> READY WHEN YOU ARE</div>
                <h3>Where would you<br/>like to go?</h3>
                <p>Search a room, a department, or a person. We’ll find the way.</p>
                <div className="mini-route"><span><span className="origin-dot"/> Main Gate</span><ArrowRight size={15}/><span><MapPin size={14}/> Your destination</span></div>
                <button className="emergency-button" onClick={triggerEmergency}><ShieldAlert size={17}/> Emergency · nearest exit</button>
                <button className="accessibility-link" onClick={() => { if (!accessible) document.querySelector<HTMLButtonElement>('[title="Accessibility mode"]')?.click() }}><Accessibility size={16}/> {accessible ? 'Step-free routing enabled' : 'Need a step-free route?'} <ArrowRight size={14}/></button>
              </div>
            )}
            <div className="feature-mini-grid"><div><span className="mini-icon"><Layers3 size={16}/></span><b>5 floors</b><small>From ground to fourth</small></div><div><span className="mini-icon green"><LocateFixed size={16}/></span><b>Easy to find</b><small>Codes, names &amp; people</small></div></div>
            <button type="button" className="ar-coming" onClick={() => route && target && setArOpen(true)} disabled={!route || !target}><span><Camera size={15}/></span><div><b>AR guidance</b><small>Camera overlay · demo only, not world-anchored</small></div><ArrowRight size={15}/></button>
          </aside>
        </div>
        <div className="below-links"><Link to="/events">See what’s happening <ArrowRight size={15}/></Link><Link to="/twin">Explore the digital twin <ArrowRight size={15}/></Link><Link to="/qr">Landmark QR codes <ArrowRight size={15}/></Link></div>
      </section>

      {arOpen && route && target && <ARGuidance
        destination={target.name}
        instruction={route.instructions.find(item => item.nodeId === route.nodeIds[Math.min(progress + 1, route.nodeIds.length - 1)])?.text ?? `Continue toward ${target.name}`}
        distance={remainingDistance}
        roomPhoto={roomPhoto(route.nodeIds[Math.min(progress + 1, route.nodeIds.length - 1)]) ?? roomPhoto(target.id)}
        bearing={bearingToNextNode(route, progress)}
        mapNorthOffset={campus.mapNorthOffset ?? 0}
        distanceToNextNode={route.edges[progress]?.weight ?? 0}
        onClose={() => setArOpen(false)}
        onStep={() => setRouteProgress(Math.min(progress + 1, route.nodeIds.length - 1))}
      />}
      <AnimatePresence>{showHere && <HereModal onClose={() => setShowHere(false)} onSelect={selectLandmark}/>}</AnimatePresence>
    </div>
  )
}

function roomPhoto(id: string): string | undefined {
  const code = id.toUpperCase()
  return ['C-003', 'C-004', 'B-406', 'B-407', 'E-003', 'E-111', 'E-204', 'E-205', 'E-012', 'E-013'].includes(code)
    ? `/photos/${code}.webp`
    : undefined
}

function instructionIcon(kind: NavigationInstruction['kind'] | 'walk') {
  if (kind === 'turn-left') return <CornerUpLeft size={17}/>
  if (kind === 'turn-right') return <CornerUpRight size={17}/>
  if (kind === 'stairs-up') return <ArrowUp size={17}/>
  if (kind === 'stairs-down') return <ArrowDown size={17}/>
  if (kind === 'lift') return <ArrowUpRight size={17}/>
  if (kind === 'arrive') return <MapPin size={17}/>
  if (kind === 'uturn') return <ArrowLeftRight size={17}/>
  return <ArrowUp size={17}/>
}

function bearingToNextNode(route: RouteResult, progress: number) {
  const current = campus.nodes.find(node => node.id === route.nodeIds[Math.min(progress, route.nodeIds.length - 1)])
  const next = campus.nodes.find(node => node.id === route.nodeIds[Math.min(progress + 1, route.nodeIds.length - 1)])
  if (!current || !next) return 0
  const angle = Math.atan2(next.x - current.x, current.y - next.y) * 180 / Math.PI
  return (angle + 360) % 360
}

function RouteMapLayer({ route, alternate, progress }: { route: RouteResult; alternate: RouteResult | null; progress: number }) {
  const transform = campus.mapTransforms?.find(item => item.id === 'campus-ground')
  if (!transform) return null
  const project = (id: string) => {
    const node = campus.nodes.find(item => item.id === id)
    if (!node) return undefined
    return projectMapPoint(node.x, node.y, transform.controlPoints, transform.sourceSize)
  }
  const points = (ids: string[]) => ids.map(id => project(id)).filter((point): point is [number, number] => point !== undefined)
  const routePoints = points(route.nodeIds)
  const alternatePoints = alternate ? points(alternate.nodeIds) : []
  const current = route.nodeIds[Math.min(progress, route.nodeIds.length - 1)]
  const location = project(current)
  return <svg className="route-map-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Walking route on the photographed campus plan">
    {alternatePoints.length > 1 && <polyline className="alternative-route-line" points={alternatePoints.map(point => point.join(',')).join(' ')}/>}
    {routePoints.length > 1 && <>
      <polyline className="route-line-casing" points={routePoints.map(point => point.join(',')).join(' ')}/>
      <polyline className="route-line-flow" points={routePoints.map(point => point.join(',')).join(' ')}/>
    </>}
    {routePoints[0] && <g className="route-map-start" transform={`translate(${routePoints[0][0]} ${routePoints[0][1]})`}><circle r="1.6"/><text x="2.2" y="-1.7">START</text></g>}
    {routePoints.at(-1) && <g className="route-map-end" transform={`translate(${routePoints.at(-1)?.[0]} ${routePoints.at(-1)?.[1]})`}><path d="M0 -3.4C-1.9 -3.4-3.4-1.9-3.4 0c0 2.4 3.4 5.2 3.4 5.2S3.4 2.4 3.4 0C3.4-1.9 1.9-3.4 0-3.4Z"/><circle cy="-.1" r="1.05"/></g>}
    {location && <g className="route-blue-dot" transform={`translate(${location[0]} ${location[1]})`}><circle r="1.2"/><path d="M0-1.3 1.2-3.5 0-6 -1.2-3.5Z"/></g>}
  </svg>
}

function FloorMap({ block, floor, target, route, onSelect, planPhoto }: { block: string; floor: number; target: CampusRoom | null; route: RouteResult | null; onSelect: (room: CampusRoom) => void; planPhoto: boolean }) {
  const rooms = campus.rooms.filter(room => room.block === block && room.floor === floor)
  const routeIds = route?.nodeIds ?? []
  return (
    <div className="floor-map" aria-label={`Block ${block} floor ${floor} schematic`}>
      {planPhoto && (block === 'B' || block === 'E') && floor === 0 && <figure className="floor-plan-reference"><img className="floor-plan-photo" src="/maps/E-block-ground.webp" alt="Photographed ground-floor plan showing Block B, Block E, and the open area"/><figcaption>Original ground-floor scan · Blocks B and E · corridor alignment is approximate</figcaption></figure>}
      <div className="floor-hallway"><span>ROUTE GRAPH · CORRIDOR LINKS APPROXIMATE</span></div>
      <div className="floor-room-grid">
        {rooms.length ? rooms.map((room, index) => <button key={room.id} className={`floor-room ${target?.id === room.id || routeIds.includes(room.id) ? 'room-target' : ''}`} style={{ '--room-index': index } as React.CSSProperties} onClick={() => onSelect(room)}><small>{room.id}</small><b>{room.name}</b><span>{room.type}</span></button>) : <div className="empty-floor"><Building2 size={26}/><b>Floor {floor} · Block {block}</b><span>Approximate floor plan</span><p>Room positions are illustrative. Select a room from search for directions.</p></div>}
      </div>
      <div className="floor-approx"><span className="blue-pulse"/> {floor > 0 ? 'Approximate layout' : 'Simplified ground-floor plan'} · tap a room for directions</div>
    </div>
  )
}

function HereModal({ onClose, onSelect }: { onClose: () => void; onSelect: (id: string) => void }) {
  const landmarks = campus.nodes.filter(node => ['outdoor', 'corridor', 'exit'].includes(node.kind ?? '') && node.floor === 0)
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="here-modal" initial={{ y: 22, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 12, scale: 0.98 }} onClick={event => event.stopPropagation()}>
        <button className="close-route modal-close" onClick={onClose} aria-label="Close"><X size={18}/></button><span className="modal-icon"><LocateFixed size={22}/></span><h3>Set your starting point</h3><p>Choose a QR landmark or a nearby campus spot. Positioning is simulated for this demo.</p>
        <div className="landmark-list">{landmarks.map(node => <button key={node.id} onClick={() => { onSelect(node.id); onClose() }}><MapPin size={16}/><span>{node.name}</span><ChevronRight size={16}/></button>)}</div>
        <Link to="/qr" className="modal-qr-link" onClick={onClose}>Print or scan a landmark QR <ArrowRight size={15}/></Link>
      </motion.div>
    </motion.div>
  )
}

function TwinPage() {
  const [floor, setFloor] = useState(0)
  const [night, setNight] = useState(false)
  const [selected, setSelected] = useState('A')
  return <section className="page subpage twin-page">
    <PageIntro eyebrow="CAMPUS, IN 3D" title="The digital twin" text="Explore the campus blocks as a layered 3D model. Click a block to focus it."/>
    <div className="twin-note"><Info size={15}/>Visual twin (demo data) · building heights and floor geometry are illustrative.</div>
    <div className="twin-toolbar"><label>Floor <input type="range" min="0" max="4" value={floor} onChange={event => setFloor(Number(event.target.value))}/><b>{floorNames[floor]}</b></label><div><button className="quiet-button" onClick={() => setNight(value => !value)}>{night ? <Sun size={16}/> : <Moon size={16}/>} {night ? 'Day view' : 'Night view'}</button><button className="quiet-button" onClick={() => window.location.assign(`/?block=${selected}`)}><ArrowUpRight size={15}/> Explore on map</button></div></div>
    <div className="twin-stage"><Suspense fallback={<div className="twin-loading"><span className="skeleton-shimmer"/>Preparing 3D campus…</div>}><Twin floor={floor} routeIds={[]} night={night} onSelect={setSelected}/></Suspense><div className="twin-selected"><span className="selected-block-dot" style={{ backgroundColor: campus.buildings.find(item => item.id === selected)?.color }}/><div><small>SELECTED BUILDING</small><b>Block {selected}</b></div><span>Floor {floor}</span></div></div>
    <div className="ar-roadmap"><div className="roadmap-icon"><Sparkles size={20}/></div><div><b>AR navigation: coming soon</b><p>Roadmap: add WebXR guidance after accurate indoor mapping and on-device positioning are available.</p></div></div>
  </section>
}

function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div className="subpage-intro"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{text}</p></div>
}
