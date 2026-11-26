import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { LocateFixed } from 'lucide-react'
import { campus } from '../data/routing'

const floorNames = ['Ground', '1st', '2nd', '3rd', '4th']

export default function QrPage() {
  const landmarks = campus.nodes.filter(node => ['gate', 'quad', 'parking', 'play', 'canteen', 'A-0', 'B-0', 'C-0', 'D-0', 'E-0'].includes(node.id))
  const [codes, setCodes] = useState<Record<string, string>>({})
  useEffect(() => {
    let active = true
    void Promise.all(landmarks.map(async node => [node.id, await QRCode.toDataURL(`${window.location.origin}/?landmark=${encodeURIComponent(node.id)}`, { width: 180, margin: 1, color: { dark: '#39272a', light: '#ffffff' } })] as const))
      .then(entries => { if (active) setCodes(Object.fromEntries(entries)) })
    return () => { active = false }
  }, [])

  return <section className="page subpage">
    <div className="subpage-intro"><div className="eyebrow">FIND YOUR PLACE</div><h1>Landmark QR codes</h1><p>Print these demo markers for key campus spots. Scan one to set your simulated starting point.</p></div>
    <div className="qr-grid">{landmarks.map((node, index) => <article className="qr-card" key={node.id} style={{ animationDelay: `${index * 40}ms` }}>{codes[node.id] ? <img src={codes[node.id]} alt={`QR code for ${node.name}`}/> : <div className="qr-placeholder"/>}<div><span>STANLEY CAMPUS</span><h3>{node.name}</h3><small>{node.block ? `Block ${node.block} · ${floorNames[node.floor]} floor` : 'Outdoor landmark'}</small></div><button onClick={() => window.print()} aria-label={`Print QR code for ${node.name}`}>Print</button></article>)}</div>
    <div className="notice-card"><LocateFixed size={17}/><span>QR codes contain a link to this demo. Selecting “I'm here / Scan QR” in the navigator lets you snap to a landmark without requiring a camera.</span></div>
  </section>
}
