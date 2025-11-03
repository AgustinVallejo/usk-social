import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
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
  initialSearchQuery?: string
  externalSearchQuery?: string
  syncSearchQuery?: string
  onLocationNameUpdate?: (name: string) => void
}

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
  place_id: number
}

function MapController({ 
  center,
  zoom = 13
}: {
  center: [number, number]
  zoom?: number
}) {
  const map = useMap()
  
  useEffect(() => {
    map.setView(center, zoom)
  }, [map, center, zoom])

  return null
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

export function MapPicker({ latitude, longitude, onLocationSelect, height = '400px', initialSearchQuery, externalSearchQuery, syncSearchQuery, onLocationNameUpdate }: MapPickerProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '')
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([latitude, longitude])
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Update map center when latitude/longitude prop changes
  useEffect(() => {
    setMapCenter([latitude, longitude])
  }, [latitude, longitude])

  // Sync search query with locationName field (display only, doesn't trigger search)
  useEffect(() => {
    if (syncSearchQuery !== undefined) {
      setSearchQuery(syncSearchQuery)
    }
  }, [syncSearchQuery])

  // Search using Nominatim API (OpenStreetMap geocoding)
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    try {
      // Use Nominatim API for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        {
          headers: {
            'User-Agent': 'USKSocial/1.0' // Required by Nominatim
          }
        }
      )
      
      if (response.ok) {
        const data: NominatimResult[] = await response.json()
        setSearchResults(data)
        setShowResults(true)
      } else {
        console.error('Geocoding failed:', response.statusText)
        setSearchResults([])
      }
    } catch (error) {
      console.error('Error searching location:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Trigger search when externalSearchQuery changes
  useEffect(() => {
    if (externalSearchQuery && externalSearchQuery.trim()) {
      setSearchQuery(externalSearchQuery)
      performSearch(externalSearchQuery)
    }
  }, [externalSearchQuery, performSearch])

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (value.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value)
      }, 500) // Wait 500ms after user stops typing
    } else {
      setSearchResults([])
      setShowResults(false)
    }
  }

  // Handle result selection
  const handleSelectResult = (result: NominatimResult) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    
    setMapCenter([lat, lng])
    setSearchQuery(result.display_name)
    setShowResults(false)
    setSearchResults([])
    onLocationSelect(lat, lng)
    // Update location name if callback is provided
    if (onLocationNameUpdate) {
      onLocationNameUpdate(result.display_name)
    }
  }

  // Handle Enter key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault()
      performSearch(searchQuery)
    }
  }, [searchQuery, performSearch])

  return (
    <div className="w-full border border-gray-300 rounded-md overflow-hidden" style={{ height }}>
      {/* Search Bar */}
      <div className="relative bg-white border-b border-gray-300">
        <div className="px-3 py-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => searchQuery && searchResults.length > 0 && setShowResults(true)}
            placeholder="Search for a location..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900 text-sm"
          />
          {isSearching && (
            <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
            </div>
          )}
        </div>
        
        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-[1000] w-full bg-white border-t border-gray-300 max-h-48 overflow-y-auto shadow-lg">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => handleSelectResult(result)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-200 last:border-b-0 text-sm text-gray-700"
              >
                <div className="font-medium">{result.display_name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: 'calc(100% - 80px)', width: '100%' }}
        scrollWheelZoom={true}
        className="map-picker"
      >
        <MapController center={mapCenter} zoom={13} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          className="map-tiles-minimal"
        />
        <LocationMarker 
          position={mapCenter} 
          onLocationSelect={onLocationSelect} 
        />
      </MapContainer>
      <div className="bg-gray-100 px-3 py-2 text-sm text-gray-600 border-t border-gray-300">
        Click on the map to select location
      </div>
    </div>
  )
}

