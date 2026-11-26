import { motion } from 'framer-motion'
import { ArrowRight, AudioLines, BookOpen, Clock3, GraduationCap, Info, MapPin, Sparkles } from 'lucide-react'

const demoEvents = [
  { title: 'Campus research symposium', kind: 'Seminar', time: 'Today · 11:00 AM', place: 'Main Auditorium', room: 'A-001', color: 'gold' },
  { title: 'End-semester examinations', kind: 'Exams', time: 'Tomorrow · 9:30 AM', place: 'Examination Cell', room: 'E-012', color: 'rose' },
  { title: 'Stanley cultural fest', kind: 'Fest', time: 'Fri, 2:00 PM', place: 'Open Area', room: 'quad', color: 'green' },
  { title: 'Career & placements briefing', kind: 'Placements', time: 'Mon · 10:00 AM', place: 'Student Services', room: 'D-110', color: 'blue' }
]

export default function EventsPage({ onNavigate }: { onNavigate: (room: string) => void }) {
  return <section className="page subpage">
    <div className="subpage-intro"><div className="eyebrow">CAMPUS LIFE</div><h1>What's happening</h1><p>Find your next seminar, exam, celebration or career moment.</p></div>
    <div className="events-grid">{demoEvents.map((event, index) => <motion.article key={event.title} className="event-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}><div className={`event-art ${event.color}`}><span>{event.kind}</span><div className="event-art-mark">{index === 0 ? <AudioLines/> : index === 1 ? <BookOpen/> : index === 2 ? <Sparkles/> : <GraduationCap/>}</div><b>STANLEY<br/><em>{event.kind.toUpperCase()}</em></b></div><div className="event-content"><small><Clock3 size={14}/>{event.time}</small><h3>{event.title}</h3><p><MapPin size={15}/>{event.place}</p><button className="button-primary" onClick={() => onNavigate(event.room)}>Navigate to event <ArrowRight size={16}/></button></div></motion.article>)}</div>
    <div className="notice-card"><Info size={18}/><span>Event listings are sample demo data. Check official college notices for current schedules.</span></div>
  </section>
}
