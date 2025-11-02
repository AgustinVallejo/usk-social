import { Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet'
import type { Sketch } from '@/lib/types'

interface SketchMarkerProps {
  sketch: Sketch
  onMarkerClick?: () => void
}

export function SketchMarker({ sketch, onMarkerClick }: SketchMarkerProps) {
  if (!sketch.latitude || !sketch.longitude) return null

  const customIcon = new Icon({
    iconUrl: sketch.thumbnail_url || sketch.image_url,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    className: 'sketch-marker',
  })

  return (
    <Marker
      position={[sketch.latitude, sketch.longitude]}
      icon={customIcon}
      eventHandlers={{
        click: () => onMarkerClick?.(),
      }}
    >
      <Popup>
        <div className="text-center">
          <img
            src={sketch.thumbnail_url || sketch.image_url}
            alt={sketch.title}
            className="w-24 h-24 object-cover rounded mb-2"
          />
          <h3 className="font-semibold text-sm">{sketch.title}</h3>
          {sketch.profiles && (
            <p className="text-xs text-gray-600">@{sketch.profiles.username}</p>
          )}
        </div>
      </Popup>
    </Marker>
  )
}

