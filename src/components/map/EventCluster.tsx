import { Marker, Popup, CircleMarker } from 'react-leaflet'
import { useState, useEffect } from 'react'
import { SketchMarker } from './SketchMarker'
import type { Sketch } from '@/lib/types'
import { supabase } from '@/lib/supabaseClient'
import type { Event } from '@/lib/types'

interface EventClusterProps {
  sketches: Sketch[]
}

export function EventCluster({ sketches }: EventClusterProps) {
  const [event, setEvent] = useState<Event | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (sketches.length === 0 || !sketches[0].event_id) return
    fetchEvent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sketches[0]?.event_id])

  const fetchEvent = async () => {
    if (!sketches[0]?.event_id) return
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('id', sketches[0].event_id)
      .single()
    setEvent(data)
  }

  if (sketches.length === 0 || !sketches[0].event_id || !event) return null

  // Calculate cluster center (use event location or average of sketches)
  const centerLat = event.latitude || sketches[0].latitude || 0
  const centerLng = event.longitude || sketches[0].longitude || 0

  if (expanded) {
    // Show all sketches spread around the cluster center
    return (
      <>
        {sketches.map((sketch, index) => {
          if (!sketch.latitude || !sketch.longitude) return null
          // Spread sketches in a circle around the center
          const angle = (index * 2 * Math.PI) / sketches.length
          const radius = 0.001 // Small radius in degrees
          const lat = centerLat + radius * Math.cos(angle)
          const lng = centerLng + radius * Math.sin(angle)
          return (
            <SketchMarker
              key={sketch.id}
              sketch={{ ...sketch, latitude: lat, longitude: lng }}
            />
          )
        })}
        <CircleMarker
          center={[centerLat, centerLng]}
          radius={20}
          fillColor="blue"
          fillOpacity={0.3}
          color="blue"
          eventHandlers={{
            click: () => setExpanded(false),
          }}
        >
          <Popup>
            <div>
              <h3 className="font-semibold">{event.title}</h3>
              <p className="text-sm text-gray-600">{sketches.length} sketches</p>
              <button
                onClick={() => setExpanded(false)}
                className="mt-2 text-xs text-blue-600"
              >
                Collapse
              </button>
            </div>
          </Popup>
        </CircleMarker>
      </>
    )
  }

  // Show cluster as a single marker
  return (
    <CircleMarker
      center={[centerLat, centerLng]}
      radius={15 + Math.min(sketches.length * 2, 30)}
      fillColor="blue"
      fillOpacity={0.5}
      color="blue"
      weight={2}
      eventHandlers={{
        click: () => setExpanded(true),
      }}
    >
      <Popup>
        <div>
          <h3 className="font-semibold">{event.title}</h3>
          <p className="text-sm text-gray-600">{sketches.length} sketches</p>
          <p className="text-xs text-gray-500">{event.location_name || ''}</p>
          <button
            onClick={() => setExpanded(true)}
            className="mt-2 text-xs text-blue-600"
          >
            Expand
          </button>
        </div>
      </Popup>
    </CircleMarker>
  )
}

