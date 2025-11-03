import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Sketch, Event } from '@/lib/types'
import { supabase } from '@/lib/supabaseClient'

interface InteractiveMapProps {
  sketches: Sketch[]
  initialCenter?: [number, number]
  initialZoom?: number
  onSketchClick?: (sketch: Sketch) => void
}

interface BlobData {
  eventId: string
  event: Event
  sketches: Sketch[]
  x: number
  y: number
  radius: number
  mergedCount: number
  color: string
  mergedEvents?: Event[] // Events that were merged into this blob
  mergedEventIds?: string[] // Event IDs for zoom functionality
}

interface SketchCloudItem {
  sketch: Sketch
  x: number
  y: number
  angle: number
  distance: number
}

// Component to listen to Leaflet map events and update canvas state
function MapEventListener({ 
  onMapMove, 
  onMapZoom,
  externalCenter,
  externalZoom,
  onMapReady
}: { 
  onMapMove: (center: [number, number]) => void
  onMapZoom: (zoom: number) => void
  externalCenter?: [number, number]
  externalZoom?: number
  onMapReady: (map: any) => void
}) {
  const map = useMap()
  
  // Provide map instance to parent
  useEffect(() => {
    onMapReady(map)
  }, [map, onMapReady])
  
  // Listen to map events
  useMapEvents({
    moveend() {
      const center = map.getCenter()
      onMapMove([center.lat, center.lng])
    },
    zoomend() {
      onMapZoom(map.getZoom())
    },
  })
  
  // Sync external changes to map (for programmatic zoom/pan)
  useEffect(() => {
    if (externalCenter && externalZoom) {
      const currentCenter = map.getCenter()
      const currentZoom = map.getZoom()
      
      const centerChanged = 
        Math.abs(currentCenter.lat - externalCenter[0]) > 0.0001 ||
        Math.abs(currentCenter.lng - externalCenter[1]) > 0.0001
      const zoomChanged = Math.abs(currentZoom - externalZoom) > 0.1
      
      if (centerChanged || zoomChanged) {
        map.setView(externalCenter, externalZoom, { animate: true })
      }
    }
  }, [map, externalCenter, externalZoom])
  
  // Initial sync
  useEffect(() => {
    const center = map.getCenter()
    onMapMove([center.lat, center.lng])
    onMapZoom(map.getZoom())
  }, [map, onMapMove, onMapZoom])
  
  return null
}

export function InteractiveMap({
  sketches,
  initialCenter = [6.2476, -75.5658], // Medellín, Colombia
  initialZoom = 12,
  onSketchClick,
}: InteractiveMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [center, setCenter] = useState<[number, number]>(initialCenter)
  const [zoom, setZoom] = useState(initialZoom)
  const [events, setEvents] = useState<Map<string, Event>>(new Map())
  const [hoveredBlob, setHoveredBlob] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedSketch, setSelectedSketch] = useState<Sketch | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const [sketchCloudPositions, setSketchCloudPositions] = useState<Map<string, { x: number; y: number }>>(new Map())
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const animationFrameRef = useRef<number>()
  const mapInstanceRef = useRef<any>(null) // Leaflet map instance

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      const eventIds = new Set<string>()
      sketches.forEach((sketch) => {
        if (sketch.event_id) eventIds.add(sketch.event_id)
      })

      if (eventIds.size === 0) return

      const { data } = await supabase
        .from('events')
        .select('*')
        .in('id', Array.from(eventIds))

      if (data) {
        const eventsMap = new Map<string, Event>()
        data.forEach((event) => eventsMap.set(event.id, event))
        setEvents(eventsMap)
      }
    }
    fetchEvents()
  }, [sketches])

  // Handle URL params
  useEffect(() => {
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

  // Callbacks for map events
  const handleMapMove = useCallback((newCenter: [number, number]) => {
    setCenter(newCenter)
  }, [])

  const handleMapZoom = useCallback((newZoom: number) => {
    setZoom(newZoom)
  }, [])

  const handleMapReady = useCallback((map: any) => {
    mapInstanceRef.current = map
    
    // Resize canvas when map is ready
    const canvas = canvasRef.current
    if (canvas) {
      const container = map.getContainer()
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      
      // Trigger resize on map resize
      map.on('resize', () => {
        const newRect = container.getBoundingClientRect()
        canvas.width = newRect.width
        canvas.height = newRect.height
        canvas.style.width = newRect.width + 'px'
        canvas.style.height = newRect.height + 'px'
      })
    }
  }, [])

  // Convert lat/lng to pixel coordinates using Leaflet's actual projection
  const latLngToPixel = useCallback(
    (lat: number, lng: number): [number, number] => {
      const map = mapInstanceRef.current
      if (!map) {
        // Map not ready yet - return invalid coordinates that won't render
        return [-1000, -1000]
      }

      try {
        // Use Leaflet's containerPoint method which gives coordinates relative to map container
        const latlng = { lat, lng }
        const containerPoint = map.latLngToContainerPoint(latlng)
        
        const x = containerPoint.x
        const y = containerPoint.y
        
        return [x, y]
      } catch (error) {
        console.warn('Error converting lat/lng to pixel:', error)
        return [-1000, -1000]
      }
    },
    []
  )

  // Removed pixelToLatLngDelta - Leaflet handles pan/zoom

  // Generate pastel color for event
  const generatePastelColor = useCallback((eventId: string): string => {
    // Use event ID as seed for consistent colors
    let hash = 0
    for (let i = 0; i < eventId.length; i++) {
      hash = eventId.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = (hash % 360 + 360) % 360
    const saturation = 40 + (hash % 20) // 40-60%
    const lightness = 75 + (hash % 15) // 75-90%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }, [])

  // Group sketches by event and prepare blob data
  const prepareBlobs = useCallback((): BlobData[] => {
    const sketchesByEvent = new Map<string, Sketch[]>()
    
    sketches.forEach((sketch) => {
      if (sketch.event_id && sketch.latitude && sketch.longitude) {
        if (!sketchesByEvent.has(sketch.event_id)) {
          sketchesByEvent.set(sketch.event_id, [])
        }
        sketchesByEvent.get(sketch.event_id)!.push(sketch)
      }
    })

    const canvas = canvasRef.current
    if (!canvas) return []

    const blobs: BlobData[] = []
    sketchesByEvent.forEach((eventSketches, eventId) => {
      const event = events.get(eventId)
      if (!event || !event.latitude || !event.longitude) return

      const [x, y] = latLngToPixel(event.latitude, event.longitude)
      
      // Skip if coordinates are invalid (map not ready or out of bounds)
      if (x === -1000 && y === -1000) {
        return
      }
      
      const baseRadius = 20 + Math.min(eventSketches.length * 3, 40)
      
      blobs.push({
        eventId,
        event,
        sketches: eventSketches,
        x,
        y,
        radius: baseRadius,
        mergedCount: 1,
        color: generatePastelColor(eventId),
      })
    })

    // Merge close blobs - distance scales with zoom level
    // At lower zoom (farther out), merge distance is larger
    // At higher zoom (closer in), merge distance is smaller
    const baseMergeDistance = 80
    const zoomFactor = Math.pow(2, 12 - zoom) // Scale based on zoom
    const MERGE_DISTANCE = baseMergeDistance * Math.max(0.5, Math.min(2, zoomFactor))
    const merged: BlobData[] = []
    const processed = new Set<string>()

    blobs.forEach((blob, i) => {
      if (processed.has(blob.eventId)) return

      const closeBlobs = [blob]
      blobs.forEach((other, j) => {
        if (i !== j && !processed.has(other.eventId)) {
          const dx = blob.x - other.x
          const dy = blob.y - other.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < MERGE_DISTANCE) {
            closeBlobs.push(other)
            processed.add(other.eventId)
          }
        }
      })

      if (closeBlobs.length > 1) {
        // Merge into one blob
        const totalSketches = closeBlobs.reduce((sum, b) => sum + b.sketches.length, 0)
        const avgX = closeBlobs.reduce((sum, b) => sum + b.x, 0) / closeBlobs.length
        const avgY = closeBlobs.reduce((sum, b) => sum + b.y, 0) / closeBlobs.length
        const mergedRadius = 25 + Math.min(totalSketches * 2, 50)

        merged.push({
          eventId: blob.eventId, // Use first event ID
          event: blob.event,
          sketches: closeBlobs.flatMap((b) => b.sketches),
          x: avgX,
          y: avgY,
          radius: mergedRadius,
          mergedCount: closeBlobs.length,
          color: blob.color,
          mergedEvents: closeBlobs.map((b) => b.event),
          mergedEventIds: closeBlobs.map((b) => b.eventId),
        })
      } else {
        merged.push(blob)
      }
      
      processed.add(blob.eventId)
    })

    return merged
  }, [sketches, events, latLngToPixel, generatePastelColor, zoom])

  // Draw gradient noise blob
  const drawBlob = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      radius: number,
      color: string,
      mouseProximity: number
    ) => {
      const scale = 1 + mouseProximity * 0.3
      const scaledRadius = radius * scale

      // Create gradient
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, scaledRadius)
      const baseColor = color
      const hslMatch = baseColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
      
      if (hslMatch) {
        const [, h, s, l] = hslMatch
        const baseHue = parseInt(h)
        const saturation = parseInt(s)
        const lightness = parseInt(l)
        
        // Increase hue as mouse gets closer (hue shift based on proximity)
        const hueShift = mouseProximity * 60 // Shift up to 60 degrees
        const hue = (baseHue + hueShift) % 360
        
        // Create gradient with noise-like variations
        gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${Math.min(lightness + 20, 95)}%, 0.9)`)
        gradient.addColorStop(0.3, `hsla(${(hue + 30) % 360}, ${saturation + 10}%, ${lightness + 10}%, 0.7)`)
        gradient.addColorStop(0.6, `hsla(${(hue - 20 + 360) % 360}, ${saturation - 5}%, ${lightness}%, 0.5)`)
        gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${Math.max(lightness - 10, 60)}%, 0.3)`)
      }

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, scaledRadius, 0, Math.PI * 2)
      ctx.fill()

      // Add constant noise texture (using seeded random for consistency)
      // Crop to circle by using a clipping path
      ctx.save()
      ctx.beginPath()
      ctx.arc(x, y, scaledRadius, 0, Math.PI * 2)
      ctx.clip()
      
      const imageData = ctx.getImageData(x - scaledRadius, y - scaledRadius, scaledRadius * 2, scaledRadius * 2)
      const data = imageData.data
      const width = scaledRadius * 2
      const height = scaledRadius * 2
      
      // Use position-based seed for consistent noise (instead of Math.random())
      const seed = (x * 73 + y * 37) % 10000
      let noiseSeed = seed
      
      const seededRandom = () => {
        noiseSeed = (noiseSeed * 9301 + 49297) % 233280
        return noiseSeed / 233280
      }
      
      // Only apply noise to pixels within the circle
      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          const pixelX = px - scaledRadius
          const pixelY = py - scaledRadius
          const distFromCenter = Math.sqrt(pixelX * pixelX + pixelY * pixelY)
          
          // Only modify pixels within the circle
          if (distFromCenter <= scaledRadius) {
            const i = (py * width + px) * 4
            const noise = (seededRandom() - 0.5) * 20
            data[i] = Math.max(0, Math.min(255, data[i] + noise)) // R
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)) // G
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)) // B
          }
        }
      }
      
      ctx.putImageData(imageData, x - scaledRadius, y - scaledRadius)
      ctx.restore()
    },
    []
  )

  // Store render function in ref for image loading
  const renderRef = useRef<() => void>()

  // Draw sketch cloud
  const drawSketchCloud = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      sketches: Sketch[],
      centerX: number,
      centerY: number
    ): SketchCloudItem[] => {
      const items: SketchCloudItem[] = []
      const angleStep = (Math.PI * 2) / Math.max(sketches.length, 1)
      const baseDistance = 100
      const positions = new Map<string, { x: number; y: number }>()

      sketches.forEach((sketch, index) => {
        const angle = index * angleStep
        // Use constant offset based on index instead of temporal evolution
        const distance = baseDistance + Math.sin(index * 0.5) * 10
        const x = centerX + Math.cos(angle) * distance
        const y = centerY + Math.sin(angle) * distance

        items.push({ sketch, x, y, angle, distance })
        positions.set(sketch.id, { x, y })

        // Draw sketch thumbnail as small circle
        const size = 40
        const imageUrl = sketch.thumbnail_url || sketch.image_url
        
        // Draw background circle
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(x, y, size / 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = '#333'
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw image if cached
        if (imageUrl) {
          const cachedImg = imageCacheRef.current.get(imageUrl)
          if (cachedImg && cachedImg.complete) {
            ctx.save()
            ctx.beginPath()
            ctx.arc(x, y, size / 2 - 1, 0, Math.PI * 2)
            ctx.clip()
            ctx.drawImage(cachedImg, x - size / 2, y - size / 2, size, size)
            ctx.restore()
          }
        }
      })

      setSketchCloudPositions(positions)
      return items
    },
    []
  )

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Don't render if map isn't ready
    if (!mapInstanceRef.current) {
      animationFrameRef.current = requestAnimationFrame(render)
      return
    }

    // Clear canvas with transparent background (map tiles show through)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const blobs = prepareBlobs()

    // Draw all blobs
    blobs.forEach((blob) => {
      const isSelected = selectedEventId === blob.eventId

      // Calculate mouse proximity effect
      let mouseProximity = 0
      if (mousePos) {
        const dx = blob.x - mousePos.x
        const dy = blob.y - mousePos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxDist = 150
        mouseProximity = Math.max(0, 1 - dist / maxDist)
      }

      // Draw blob with mouse proximity for hue shift
      drawBlob(ctx, blob.x, blob.y, blob.radius, blob.color, mouseProximity)

      // Draw merged count
      if (blob.mergedCount > 1) {
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 14px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(blob.mergedCount.toString(), blob.x, blob.y)
      }

      // Draw sketch cloud if selected
      if (isSelected) {
        drawSketchCloud(ctx, blob.sketches, blob.x, blob.y)
      }
    })

    animationFrameRef.current = requestAnimationFrame(render)
  }, [prepareBlobs, selectedEventId, mousePos, drawBlob, drawSketchCloud])

  // Update render ref
  useEffect(() => {
    renderRef.current = render
  }, [render])

  // Load and cache images when event is selected
  useEffect(() => {
    if (selectedEventId) {
      const selectedBlob = prepareBlobs().find((b) => b.eventId === selectedEventId)
      if (selectedBlob) {
        selectedBlob.sketches.forEach((sketch) => {
          const imageUrl = sketch.thumbnail_url || sketch.image_url
          if (imageUrl && !imageCacheRef.current.has(imageUrl)) {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              imageCacheRef.current.set(imageUrl, img)
              // Trigger re-render using ref
              if (renderRef.current) {
                if (animationFrameRef.current) {
                  cancelAnimationFrame(animationFrameRef.current)
                }
                animationFrameRef.current = requestAnimationFrame(renderRef.current)
              }
            }
            img.src = imageUrl
          }
        })
      }
    }
  }, [selectedEventId, prepareBlobs])

  // Setup canvas and start render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      // Get the map container size to match canvas to it
      const mapContainer = mapInstanceRef.current?.getContainer()
      if (mapContainer) {
        const rect = mapContainer.getBoundingClientRect()
        canvas.width = rect.width
        canvas.height = rect.height
        canvas.style.width = rect.width + 'px'
        canvas.style.height = rect.height + 'px'
      } else {
        // Fallback to canvas container size
        const parent = canvas.parentElement
        if (parent) {
          const rect = parent.getBoundingClientRect()
          canvas.width = rect.width
          canvas.height = rect.height
          canvas.style.width = rect.width + 'px'
          canvas.style.height = rect.height + 'px'
        }
      }
    }

    resize()
    
    // Resize when map is ready
    const checkMapReady = setInterval(() => {
      if (mapInstanceRef.current) {
        resize()
        clearInterval(checkMapReady)
      }
    }, 100)
    
    window.addEventListener('resize', resize)
    
    // Also listen to map move events to resize
    const map = mapInstanceRef.current
    if (map) {
      map.on('resize', resize)
    }

    render()

    return () => {
      clearInterval(checkMapReady)
      window.removeEventListener('resize', resize)
      if (map) {
        map.off('resize', resize)
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [render])

  // Handle mouse move for hover detection
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setMousePos({ x, y })

      // Check hover
      const blobs = prepareBlobs()
      let foundHover = false
      
      for (const blob of blobs) {
        const dx = blob.x - x
        const dy = blob.y - y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        // Only show hover for single blobs (not merged)
        if (dist < blob.radius && blob.mergedCount === 1) {
          setHoveredBlob(blob.eventId)
          foundHover = true
          break
        }
      }

      if (!foundHover) {
        setHoveredBlob(null)
      }
    },
    [prepareBlobs]
  )

  // Wheel zoom handled by Leaflet, removed

  // Calculate zoom level needed to separate merged blobs
  const calculateZoomForSeparation = useCallback(
    (mergedEvents: Event[]): number => {
      if (mergedEvents.length < 2) return zoom

      // Calculate bounding box of merged events
      let minLat = mergedEvents[0].latitude
      let maxLat = mergedEvents[0].latitude
      let minLng = mergedEvents[0].longitude
      let maxLng = mergedEvents[0].longitude

      mergedEvents.forEach((event) => {
        minLat = Math.min(minLat, event.latitude)
        maxLat = Math.max(maxLat, event.latitude)
        minLng = Math.min(minLng, event.longitude)
        maxLng = Math.max(maxLng, event.longitude)
      })

      // Calculate required zoom to separate (need at least 200 pixels between blobs)
      const latRange = maxLat - minLat
      const lngRange = maxLng - minLng
      const maxRange = Math.max(latRange, lngRange)

      // Estimate required zoom level
      const canvas = canvasRef.current
      if (!canvas) return zoom + 3

      const requiredPixelSeparation = 200
      const currentScale = Math.pow(2, zoom) * 0.001
      const currentPixelRange = maxRange * currentScale * Math.min(canvas.width, canvas.height)

      if (currentPixelRange < requiredPixelSeparation) {
        const zoomIncrease = Math.ceil(
          Math.log2(requiredPixelSeparation / currentPixelRange)
        )
        return Math.min(20, zoom + Math.max(2, zoomIncrease))
      }

      return zoom + 2 // Default zoom in by 2 levels
    },
    [zoom]
  )

  // Handle click on canvas (for blob/sketch selection)
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.stopPropagation() // Prevent map click

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const blobs = prepareBlobs()

      // Check if clicking on a blob
      for (const blob of blobs) {
        const dx = blob.x - x
        const dy = blob.y - y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < blob.radius) {
          // If it's a merged blob, zoom in to separate
          if (blob.mergedCount > 1 && blob.mergedEvents) {
            // Calculate center of merged events
            const centerLat =
              blob.mergedEvents.reduce((sum, e) => sum + e.latitude, 0) /
              blob.mergedEvents.length
            const centerLng =
              blob.mergedEvents.reduce((sum, e) => sum + e.longitude, 0) /
              blob.mergedEvents.length

            setCenter([centerLat, centerLng])
            const newZoom = calculateZoomForSeparation(blob.mergedEvents)
            setZoom(newZoom)
            setSelectedEventId(null)
            setSelectedSketch(null)
            return
          }

          // Single blob - toggle selection
          if (selectedEventId === blob.eventId) {
            setSelectedEventId(null)
            setSelectedSketch(null)
          } else {
            setSelectedEventId(blob.eventId)
            setSelectedSketch(null)
          }
          return
        }
      }

      // Check if clicking on a sketch in the cloud
      if (selectedEventId) {
        const selectedBlob = blobs.find((b) => b.eventId === selectedEventId)
        if (selectedBlob) {
          for (const [sketchId, pos] of sketchCloudPositions.entries()) {
            const dx = pos.x - x
            const dy = pos.y - y
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist < 20) {
              const sketch = selectedBlob.sketches.find((s) => s.id === sketchId)
              if (sketch) {
                setSelectedSketch(sketch)
                onSketchClick?.(sketch)
                return
              }
            }
          }
        }
      }

      // Click on empty space - close selection (but don't prevent map interaction)
      // Only close if clicking on canvas background, not on map
    },
    [prepareBlobs, selectedEventId, sketchCloudPositions, calculateZoomForSeparation, onSketchClick]
  )

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* OpenStreetMap tile layer - handles all interactions */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          attributionControl={false}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          dragging={true}
          touchZoom={true}
          boxZoom={true}
        >
          <MapEventListener 
            onMapMove={handleMapMove} 
            onMapZoom={handleMapZoom}
            externalCenter={center}
            externalZoom={zoom}
            onMapReady={handleMapReady}
          />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="map-tiles-dark"
          />
        </MapContainer>
      </div>
      
      {/* Canvas overlay - handles blob clicks and hover */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        className="absolute top-0 left-0"
        style={{
          display: 'block',
          pointerEvents: 'auto', // Allow clicks/hover on canvas
          zIndex: 1000, // Ensure canvas is above map
          width: '100%',
          height: '100%',
        }}
      />
      
      {/* Hover tooltip */}
      {hoveredBlob && (
        <div
          className="absolute pointer-events-none bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm z-10"
          style={{
            left: mousePos ? `${mousePos.x + 10}px` : '0',
            top: mousePos ? `${mousePos.y + 10}px` : '0',
          }}
        >
          {events.get(hoveredBlob)?.title || 'Event'}
        </div>
      )}

      {/* Sketch viewer - smaller and less intrusive */}
      {selectedSketch && (
        <div
          className="fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl z-50 overflow-hidden max-w-sm w-full"
          style={{ maxHeight: '60vh' }}
        >
          <button
            onClick={() => setSelectedSketch(null)}
            className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-70 z-10 transition-all"
          >
            ✕
          </button>
          <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
            <img
              src={selectedSketch.image_url}
              alt={selectedSketch.title}
              className="w-full h-auto"
            />
            <div className="p-4">
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                {selectedSketch.title}
              </h3>
              {selectedSketch.profiles && (
                <div className="flex items-start space-x-3 mb-3">
                  {selectedSketch.profiles.avatar_url && (
                    <img
                      src={selectedSketch.profiles.avatar_url}
                      alt={selectedSketch.profiles.username}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700">
                      @{selectedSketch.profiles.username}
                    </p>
                    {selectedSketch.description && (
                      <p className="text-sm text-gray-600 mt-1 break-words">
                        {selectedSketch.description}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {selectedSketch.location_name && (
                <p className="text-xs text-gray-500 mt-2">
                  📍 {selectedSketch.location_name}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {new Date(selectedSketch.sketch_date || selectedSketch.uploaded_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
