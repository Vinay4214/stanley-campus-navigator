import { useState, type CSSProperties } from 'react'
import { ArrowRight, ArrowUpRight, ExternalLink, Info, X } from 'lucide-react'
import Panorama from '../components/Panorama'
import { campus } from '../data/routing'
import panoramaData from '../data/panoramas.json'
import streetviewData from '../data/streetview.json'

interface PanoramaAsset {
  file: string
  room: string
  name: string
  hotspots?: string[]
}

const panoramaImages = panoramaData as PanoramaAsset[]
const shareLinks = streetviewData as { place: string; url: string; room: string }[]

export default function PanoramaPage() {
  const [current, setCurrent] = useState<PanoramaAsset | null>(() => {
    const room = new URLSearchParams(window.location.search).get('room')
    return panoramaImages.find(item => item.room === room) ?? null
  })
  const hotspots = current?.hotspots
    ?.map(room => panoramaImages.find(image => image.room === room))
    .filter((image): image is PanoramaAsset => image !== undefined) ?? []

  return <section className="page subpage">
    <div className="subpage-intro"><div className="eyebrow">LOOK AROUND</div><h1>360° campus views</h1><p>Preview your surroundings before you set off. Personal panoramas stay on this site; official share links open separately.</p></div>
    {current && <div className="panorama-modal"><div className="panorama-modal-head"><div><b>{current.name}</b><small>{current.room}</small></div><button className="icon-button" onClick={() => setCurrent(null)} aria-label="Close panorama"><X size={18}/></button></div><div className="panorama-stage"><Panorama image={`/360/${encodeURIComponent(current.file)}`}/>{hotspots.length > 0 && <div className="panorama-hotspots" aria-label="Connected panorama hotspots">{hotspots.map((spot, index) => <button key={spot.room} style={{ '--hotspot-index': index } as CSSProperties} onClick={() => setCurrent(spot)}><ArrowRight size={14}/>{spot.name}</button>)}</div>}</div></div>}
    <div className="panorama-grid">
      {panoramaImages.map(image => <button className="panorama-tile has-panorama" key={image.file} onClick={() => setCurrent(image)}><span className="panorama-cover"><span>360°</span></span><b>{image.name}</b><small>{image.room}</small><span className="panorama-chip">Open panorama <ArrowUpRight size={14}/></span></button>)}
      {campus.rooms.slice(0, 8).map(room => <article className="panorama-tile" key={room.id}><div className="panorama-empty"><span className="panorama-symbol">360°</span><span className="view-coming">Coming soon</span></div><b>{room.name}</b><small>{room.id} · Block {room.block}</small><span className="panorama-chip muted-chip">360° view coming soon</span></article>)}
      {shareLinks.map(item => <article className="panorama-tile link-tile" key={item.url}><div className="panorama-empty"><span className="panorama-symbol"><ExternalLink size={22}/></span><span className="view-coming">Official link</span></div><b>{item.place}</b><small>Matched to {item.room}</small><a className="panorama-chip" href={item.url} target="_blank" rel="noopener noreferrer">Open 360° view <ArrowUpRight size={14}/></a></article>)}
    </div>
    <div className="notice-card"><Info size={16}/><span>Only owner-provided panoramas and Google Maps share URLs are supported. Street View imagery is never downloaded, cached or re-hosted here.</span></div>
  </section>
}
