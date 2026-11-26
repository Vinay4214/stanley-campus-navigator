import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Lenis from 'lenis'
import Fuse from 'fuse.js'
import {
  Accessibility, ArrowLeft, ArrowRight, ArrowUpRight, AudioLines, Bell,
  BookOpen, Building2, Check, ChevronDown, ChevronRight, Clock3, Compass, ExternalLink,
  Footprints, GraduationCap, Info, Layers3, LocateFixed, MapPin,
  Mic, Moon, Navigation, Plus, Search, ShieldAlert, Sparkles, Sun, Utensils, Volume2, VolumeX, X
} from 'lucide-react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { campus, findRoute, nearestRoom } from './data/routing'
import type { CampusRoom, RouteResult } from './data/types'
import { readState, subscribeState, trackRoute, trackSearch, writeState } from './data/store'
import type { DemoState } from './data/store'
import panoramaData from './data/panoramas.json'
import streetviewData from './data/streetview.json'

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
              <Route path="/" element={<HomePage state={state} updateState={updateState} accessible={accessible} speak={speak} />} />
              <Route path="/events" element={<EventsPage onNavigate={room => window.location.assign(`/?to=${encodeURIComponent(room)}`)} />} />
              <Route path="/admin" element={<AdminPage state={state} updateState={updateState}/>} />
              <Route path="/qr" element={<QrPage />} />
              <Route path="/360" element={<PanoramaPage />} />
              <Route path="/twin" element={<TwinPage />} />
              <Route path="*" element={<HomePage state={state} updateState={updateState} accessible={accessible} speak={speak} />} />
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
  speak: (text: string) => void
}

function HomePage({ state, updateState, accessible, speak }: HomeProps) {
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState(() => {
    const landmark = new URLSearchParams(window.location.search).get('landmark')
    return landmark && campus.nodes.some(node => node.id === landmark) ? landmark : 'gate'
  })
  const [target, setTarget] = useState<CampusRoom | null>(null)
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [block, setBlock] = useState<string | null>(null)
  const [floor, setFloor] = useState(0)
  const [showSteps, setShowSteps] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showHere, setShowHere] = useState(false)
  const [emergency, setEmergency] = useState(false)
  const [voiceListening, setVoiceListening] = useState(false)
  const fuse = useMemo(() => new Fuse(campus.rooms, {
    keys: ['id', 'name', 'dept', 'aliases', 'type', 'block'],
    threshold: 0.38, ignoreLocation: true, minMatchCharLength: 2
  }), [])
  const filtered = query.trim() ? fuse.search(query.replace(/^(where is|find|take me to|navigate to)\s+/i, '').trim()).slice(0, 5).map(result => result.item) : []

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
        const next = Math.min(value + 1, route.nodeIds.length - 1)
        const nextNode = campus.nodes.find(node => node.id === route.nodeIds[next])
        if (nextNode?.block) {
          setBlock(nextNode.block)
          setFloor(nextNode.floor)
        }
        if (next >= route.nodeIds.length - 1) {
          setSimulating(false)
          return next
        }
        return next
      })
    }, 1700)
    return () => window.clearInterval(timer)
  }, [simulating, route])

  useEffect(() => {
    if (!target) return
    setRoute(findRoute(from, target.id, { accessible, blocked: state.blocked }))
    setSimulating(false)
    setProgress(0)
  }, [state.blocked, accessible])

  function chooseRoom(room: CampusRoom | null, searchTerm = query) {
    if (!room) return
    const nextRoute = findRoute(from, room.id, { accessible, blocked: state.blocked })
    setTarget(room)
    setBlock(room.block)
    setFloor(room.floor)
    setQuery(room.id)
    setRoute(nextRoute)
    setShowSteps(true)
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
    setFrom(id)
    setShowHere(false)
    setQuery('')
    setRoute(null)
    setTarget(null)
    setProgress(0)
  }

  function triggerEmergency() {
    const destination = findRoute(from, 'exit', { accessible, blocked: state.blocked })
    setEmergency(true)
    setTarget(null)
    setRoute(destination)
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
            {filtered.length > 0 && <div className="search-results">{filtered.map(room => <button key={room.id} onClick={() => chooseRoom(room)}><span className="result-icon"><MapPin size={16}/></span><span><b>{room.name}</b><small>{room.id} · Block {room.block} · {floorNames[room.floor]} floor</small></span><ChevronRight size={17}/></button>)}</div>}
            <div className="search-hint"><span>Try</span> <button onClick={() => { setQuery('where is CSE department'); submitSearch('where is CSE department') }}>“where is CSE department”</button><span>or</span><button onClick={() => { setQuery('nearest washroom'); submitSearch('nearest washroom') }}>“nearest washroom”</button></div>
          </div>
          <div className="category-row">{categories.map(({ label, query: itemQuery, icon: Icon }) => <button key={label} className="category-chip" onClick={() => { setQuery(itemQuery); submitSearch(itemQuery) }}><Icon size={15}/>{label}</button>)}</div>
          {!query && state.recentSearches.length > 0 && <div className="recent-searches"><span>RECENT</span>{state.recentSearches.slice(0, 3).map(item => <button key={item} onClick={() => { setQuery(item); submitSearch(item) }}>{item}</button>)}</div>}
          <div className="hero-stats"><div><b>5</b><span>blocks</span></div><i/><div><b>5</b><span>floors</span></div><i/><div><b>{campus.rooms.length}+</b><span>destinations</span></div></div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit orbit-a"/><div className="hero-orbit orbit-b"/>
          <div className="hero-illustration">
            <img src="/assets/stanley-logo.jpeg" alt=""/>
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
        <div className="section-heading">
          <div><div className="eyebrow">EXPLORE THE CAMPUS</div><h2>{block ? `Block ${block}` : 'A campus at a glance'}</h2><p>{block ? `Choose a floor to explore rooms and find your destination.` : 'Tap a building to open its floor plan, or start a route from the main gate.'}</p></div>
          {block && <button className="quiet-button" onClick={() => { setBlock(null); setFloor(0); setTarget(null); setRoute(null) }}><ArrowLeft size={16}/> All campus</button>}
        </div>
        <div className={`explore-grid ${route ? 'has-route' : ''}`}>
          <div className="map-card">
            <div className="map-card-top"><div><span className="live-dot"/><b>{block ? `BLOCK ${block} · ${floorNames[floor].toUpperCase()} FLOOR` : 'STANLEY CAMPUS · ABIDS'}</b></div><span className="map-caption">{block && floor > 0 ? 'Approximate layout' : 'Ground-floor plan · simplified'}</span></div>
            {!block ? (
              <div className="campus-map">
                <img src="/maps/ground-plan.svg" alt="Simplified illustrated ground-floor campus plan"/>
                {campus.buildings.map(building => <button key={building.id} className={`map-building map-building-${building.id.toLowerCase()}`} style={{ left: `${building.x}%`, top: `${building.y}%`, '--building-color': building.color } as React.CSSProperties} onClick={() => { setBlock(building.id); setFloor(0); setTarget(null); setRoute(null) }}><b>{building.id}</b><span>{building.name}</span></button>)}
                <button className="map-place place-gate" onClick={() => selectLandmark('gate')}><span/>Main Gate</button>
                <button className="map-place place-open" onClick={() => selectLandmark('quad')}>Open area</button>
                <button className="map-place place-parking" onClick={() => selectLandmark('parking')}>Parking</button>
                <button className="map-place place-play" onClick={() => selectLandmark('play')}>Play area</button>
                <button className="map-place place-canteen" onClick={() => submitSearch('canteen')}>Canteen</button>
                <div className="map-scale"><span/> 50 m</div>
              </div>
            ) : (
              <FloorMap block={block} floor={floor} target={target} route={route} onSelect={chooseRoom}/>
            )}
            {block && <div className="floor-switcher" role="group" aria-label="Choose floor">{floorNames.map((name, index) => <button key={name} onClick={() => setFloor(index)} className={floor === index ? 'selected' : ''}>{name}</button>)}</div>}
            <div className="map-legend"><span><i className="legend-room"/> Destination</span><span><i className="legend-route"/> Route</span><button onClick={() => setShowHere(true)}><LocateFixed size={14}/> I'm here / Scan QR</button></div>
            <div className="map-disclaimer"><Info size={14}/>{block && floor > 0 ? 'Upper-floor room placements are approximate. Confirm directions with campus staff.' : 'Illustrated demo map · distances and positioning are estimates.'}</div>
          </div>

          <aside className="route-panel">
            {emergency && route ? (
              <div className="emergency-card"><div className="emergency-head"><ShieldAlert size={20}/><span>EMERGENCY MODE</span><button onClick={() => setEmergency(false)} aria-label="Close emergency mode"><X size={16}/></button></div><h3>Move to safety</h3><p>Follow the route to the nearest exit. Avoid blocked passages.</p><div className="safe-destination"><MapPin size={18}/><span><b>Main Gate Exit</b><small>Assembly point: Open Area</small></span></div><ol>{route.steps.map((step, index) => <li key={index}>{step}</li>)}</ol><button className="emergency-action" onClick={() => speak(route.steps.join(' '))}><Volume2 size={16}/> Speak directions</button></div>
            ) : route && target ? (
              <div className="directions-card">
                <div className="directions-head"><div className="route-badge"><Navigation size={17}/></div><div><span>YOUR ROUTE</span><b>To {target.name}</b></div><button className="close-route" onClick={() => { setRoute(null); setTarget(null); setSimulating(false) }} aria-label="Clear route"><X size={17}/></button></div>
                <div className="route-metrics"><span><Footprints size={15}/>{route.distance} m</span><span><Clock3 size={15}/>{route.minutes} min walk</span><span>{route.edges.some(edge => edge.type === 'stairs') ? 'Stairs' : 'Step-free'}</span></div>
                <div className="route-controls"><button className="start-button" onClick={() => { setSimulating(value => !value); setProgress(0) }}><Navigation size={16}/>{simulating ? 'Pause demo walk' : 'Start navigation'}</button><button className="icon-button" onClick={speakDirections} title="Read directions aloud"><Volume2 size={17}/></button></div>
                <div className="simulation-note"><span className="blue-pulse"/> Simulated positioning (demo) <button onClick={() => setShowHere(true)}>Set location</button></div>
                <button className="steps-toggle" onClick={() => setShowSteps(value => !value)}>{showSteps ? 'Hide' : 'Show'} turn-by-turn <ChevronDown size={16}/></button>
                {showSteps && <ol className="directions-list">{route.steps.map((step, index) => {
                  const nextId = route.nodeIds[index + 1]
                  const panorama = panoramaAssets.find(item => item.room === nextId)
                  const shareLink = streetviewLinks.find(item => item.room === nextId)
                  return <li key={`${step}-${index}`} className={index < progress ? 'passed' : ''}><span className="step-marker">{index < progress ? <Check size={12}/> : index + 1}</span><span>{step}{index < route.edges.length && (panorama ? <Link className="preview-chip" to={`/360?room=${encodeURIComponent(panorama.room)}`}>Preview this turn <ArrowUpRight size={11}/></Link> : shareLink ? <a className="preview-chip" href={shareLink.url} target="_blank" rel="noopener noreferrer">Preview this turn <ExternalLink size={11}/></a> : <small className="preview-chip">360° preview coming soon</small>)}</span></li>
                })}</ol>}
                {progress >= route.nodeIds.length - 1 && <div className="arrived-card"><Sparkles size={17}/><div><b>You have arrived</b><small>{target.id} · Block {target.block}</small></div></div>}
                <a className="street-view-link" href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${import.meta.env.VITE_CAMPUS_LAT ?? '17.3913'},${import.meta.env.VITE_CAMPUS_LNG ?? '78.4750'}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Outdoor Street View</a>
              </div>
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
            <div className="ar-coming"><span><Sparkles size={15}/></span><div><b>AR navigation</b><small>Coming soon · WebXR roadmap</small></div><ArrowRight size={15}/></div>
          </aside>
        </div>
        <div className="below-links"><Link to="/events">See what’s happening <ArrowRight size={15}/></Link><Link to="/twin">Explore the digital twin <ArrowRight size={15}/></Link><Link to="/qr">Landmark QR codes <ArrowRight size={15}/></Link></div>
      </section>

      <AnimatePresence>{showHere && <HereModal onClose={() => setShowHere(false)} onSelect={selectLandmark}/>}</AnimatePresence>
    </div>
  )
}

function FloorMap({ block, floor, target, route, onSelect }: { block: string; floor: number; target: CampusRoom | null; route: RouteResult | null; onSelect: (room: CampusRoom) => void }) {
  const rooms = campus.rooms.filter(room => room.block === block && room.floor === floor)
  const routeIds = route?.nodeIds ?? []
  return (
    <div className="floor-map" aria-label={`Block ${block} floor ${floor} schematic`}>
      <div className="floor-hallway"><span>MAIN CORRIDOR</span><i className="stairs-marker">STAIRS</i><i className="lift-marker">LIFT</i></div>
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
