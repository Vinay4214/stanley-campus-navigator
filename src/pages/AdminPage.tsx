import { useMemo, useState } from 'react'
import { ArrowRight, Bell, Check, Info, Navigation, ShieldAlert, Sparkles } from 'lucide-react'
import { campus, edgeKey } from '../data/routing'
import { toggleBlocked } from '../data/store'
import type { DemoState } from '../data/store'

export default function AdminPage({ state, updateState }: { state: DemoState; updateState: (state: DemoState) => void }) {
  const [pin, setPin] = useState('')
  const [authorized, setAuthorized] = useState(sessionStorage.getItem('stanley-admin') === 'yes')
  const [announcement, setAnnouncement] = useState(state.announcement)
  const [announcementSaved, setAnnouncementSaved] = useState(false)
  const uniqueEdges = useMemo(() => {
    const seen = new Set<string>()
    return campus.edges.filter(edge => {
      const key = edgeKey(edge)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [])
  const searchData = Object.entries(state.searches).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const routeData = Object.entries(state.routes).sort((a, b) => b[1] - a[1]).slice(0, 5)
  if (!authorized) return <section className="page subpage admin-login"><div className="admin-login-card"><span className="admin-lock"><ShieldAlert size={23}/></span><div className="eyebrow">CAMPUS OPERATIONS</div><h1>Admin sign in</h1><p>Demo access for managing routes and campus notices.</p><form onSubmit={event => { event.preventDefault(); if (pin === '1234') { setAuthorized(true); sessionStorage.setItem('stanley-admin', 'yes') } else setPin('') }}><label htmlFor="admin-pin">Demo PIN</label><input id="admin-pin" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={event => setPin(event.target.value)} placeholder="Enter 4-digit PIN"/><button className="button-primary">Continue <ArrowRight size={16}/></button></form><small>Use demo PIN <b>1234</b></small></div></section>
  return <section className="page subpage admin-page">
    <div className="subpage-intro"><div className="eyebrow">CAMPUS OPERATIONS</div><h1>Admin dashboard</h1><p>Manage route conditions, share updates and review local demo analytics.</p></div>
    <div className="admin-grid">
      <div className="admin-card admin-announcement"><div className="admin-card-heading"><span className="admin-icon gold-bg"><Bell size={18}/></span><div><h3>Campus announcement</h3><p>Shown across all open navigator tabs on this device.</p></div></div><textarea value={announcement} onChange={event => { setAnnouncement(event.target.value); setAnnouncementSaved(false) }} placeholder="e.g. Library entrance temporarily closed…"/><div className="admin-form-bottom"><small>{announcement.length}/160 characters</small><button className="button-primary small" disabled={announcement.length > 160} onClick={() => { updateState({ ...state, announcement }); setAnnouncementSaved(true) }}>{announcementSaved ? <><Check size={15}/> Published</> : 'Publish announcement'}</button></div></div>
      <div className="admin-card"><div className="admin-card-heading"><span className="admin-icon rose-bg"><Navigation size={18}/></span><div><h3>Route conditions</h3><p>Block a corridor, stairs or lift to recalculate routes.</p></div></div><div className="edge-list">{uniqueEdges.filter(edge => ['corridor', 'stairs', 'lift', 'ramp'].includes(edge.type)).map(edge => { const key = edgeKey(edge); const blocked = state.blocked.includes(key); const label = `${campus.nodes.find(node => node.id === edge.from)?.name ?? edge.from} → ${campus.nodes.find(node => node.id === edge.to)?.name ?? edge.to}`; return <div key={key} className="edge-row"><span><b>{edge.type}</b><small>{label}</small></span><button className={`switch ${blocked ? 'switch-on' : ''}`} role="switch" aria-checked={blocked} aria-label={`${blocked ? 'Unblock' : 'Block'} ${edge.type}`} onClick={() => updateState(toggleBlocked(state, edge))}><i/></button></div> })}</div></div>
      <div className="admin-card analytics-card"><div className="admin-card-heading"><span className="admin-icon green-bg"><Sparkles size={18}/></span><div><h3>Demo analytics</h3><p>Search and route counts saved locally in this browser.</p></div></div><div className="analytics-columns"><div><h4>Most searched</h4>{searchData.length ? searchData.map(([name, count]) => <div className="analytics-row" key={name}><span>{name}</span><b>{count}</b></div>) : <p className="empty-analytics">Searches will appear here as you explore.</p>}</div><div><h4>Busiest routes</h4>{routeData.length ? routeData.map(([name, count]) => <div className="analytics-row" key={name}><span>{name}</span><b>{count}</b></div>) : <p className="empty-analytics">Route activity will appear here.</p>}</div></div></div>
    </div><div className="admin-footer-note"><Info size={15}/>Demo PIN protects the interface only. This dashboard is not an authenticated production admin system.</div>
  </section>
}
