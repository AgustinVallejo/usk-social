import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { Icon } from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = new Icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

interface MapPickerProps {
  latitude: number
  longitude: number
  onLocationSelect: (lat: number, lng: number) => void
  height?: string
}

function LocationMarker({ 
  position,
  onLocationSelect 
}: { 
  position: [number, number]
  onLocationSelect: (lat: number, lng: number) => void 
}) {
  const [markerPosition, setMarkerPosition] = useState<[number, number]>(position)

  useEffect(() => {
    setMarkerPosition(position)
  }, [position])

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      setMarkerPosition([lat, lng])
      onLocationSelect(lat, lng)
    },
  })

  return <Marker position={markerPosition} icon={DefaultIcon} />
}

export function MapPicker({ latitude, longitude, onLocationSelect, height = '400px' }: MapPickerProps) {
  return (
    <div className="w-full border border-gray-300 rounded-md overflow-hidden" style={{ height }}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        className="map-picker"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          className="map-tiles-minimal"
        />
        <LocationMarker 
          position={[latitude, longitude]} 
          onLocationSelect={onLocationSelect} 
        />
      </MapContainer>
      <div className="bg-gray-100 px-3 py-2 text-sm text-gray-600 border-t border-gray-300">
        Click on the map to select location
      </div>
    </div>
  )
}

