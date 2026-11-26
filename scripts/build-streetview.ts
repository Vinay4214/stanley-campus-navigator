import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import Fuse from 'fuse.js'
import { campus } from '../src/data/routing'

interface StreetViewLink {
  place: string
  url: string
  room: string
}

const inputPath = resolve('inputs/streetview-links.txt')
const outputPath = resolve('src/data/streetview.json')

try {
  const contents = await readFile(inputPath, 'utf8')
  const searchable = new Fuse(campus.rooms, {
    keys: ['id', 'name', 'dept', 'aliases'],
    threshold: 0.4,
    ignoreLocation: true
  })
  const links: StreetViewLink[] = []
  const unmatched: string[] = []

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('|')
    if (separator < 1) {
      unmatched.push(line)
      continue
    }

    const place = line.slice(0, separator).trim()
    const rawUrl = line.slice(separator + 1).trim()
    let url: URL
    try {
      url = new URL(rawUrl)
    } catch {
      unmatched.push(line)
      continue
    }
    if (!['google.com', 'www.google.com', 'maps.app.goo.gl'].includes(url.hostname)) {
      unmatched.push(line)
      continue
    }

    const match = campus.rooms.find(room => room.id.toLowerCase() === place.toLowerCase())
      ?? searchable.search(place)[0]?.item
    if (!match) {
      unmatched.push(line)
      continue
    }
    links.push({ place, url: url.toString(), room: match.id })
  }

  await writeFile(outputPath, `${JSON.stringify(links, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${links.length} official share link(s) to ${outputPath}.`)
  if (unmatched.length) {
    console.warn('Unmatched or invalid lines (not written):')
    for (const line of unmatched) console.warn(`  ${line}`)
  }
} catch (error) {
  console.error(`Unable to build Street View links from ${inputPath}.`, error)
  process.exitCode = 1
}
