import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { SketchMarker } from './SketchMarker'
import { EventCluster } from './EventCluster'
import type { Sketch } from '@/lib/types'

// Component to handle map center updates
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
}

interface InteractiveMapProps {
  sketches: Sketch[]
  initialCenter?: [number, number]
  initialZoom?: number
}

export function InteractiveMap({
  sketches,
  initialCenter = [6.2476, -75.5658], // Medellín, Colombia
  initialZoom = 12,
}: InteractiveMapProps) {
  const [center, setCenter] = useState<[number, number]>(initialCenter)
  const [zoom, setZoom] = useState(initialZoom)

  useEffect(() => {
    // Update center from URL params if available
    const params = new URLSearchParams(window.location.search)
    const lat = params.get('lat')
    const lng = params.get('lng')
    const zoomParam = params.get('zoom')
    if (lat && lng) {
      setCenter([parseFloat(lat), parseFloat(lng)])
      if (zoomParam) {
        setZoom(parseInt(zoomParam))
      }
    }
  }, [])

  // Group sketches by event
  const sketchesByEvent = new Map<string, Sketch[]>()
  const standaloneSketches: Sketch[] = []

  sketches.forEach((sketch) => {
    if (sketch.event_id && sketch.latitude && sketch.longitude) {
      if (!sketchesByEvent.has(sketch.event_id)) {
        sketchesByEvent.set(sketch.event_id, [])
      }
      sketchesByEvent.get(sketch.event_id)!.push(sketch)
    } else if (sketch.latitude && sketch.longitude) {
      standaloneSketches.push(sketch)
    }
  })

  return (
    <div className="w-full h-screen">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapController center={center} zoom={zoom} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          className="map-tiles-minimal"
        />
        {standaloneSketches.map((sketch) => (
          <SketchMarker key={sketch.id} sketch={sketch} />
        ))}
        {Array.from(sketchesByEvent.entries()).map(([eventId, eventSketches]) => (
          <EventCluster key={eventId} sketches={eventSketches} />
        ))}
      </MapContainer>
    </div>
  )
}

