import { useEffect, useRef, useState, useCallback } from 'react'
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
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number; center: [number, number] } | null>(null)
  const hasDraggedRef = useRef(false)

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

  // Convert lat/lng to pixel coordinates
  const latLngToPixel = useCallback(
    (lat: number, lng: number, canvasWidth: number, canvasHeight: number, centerLat?: number, centerLng?: number): [number, number] => {
      // Simple equirectangular projection
      const scale = Math.pow(2, zoom) * 0.001
      const centerLatVal = centerLat ?? center[0]
      const centerLngVal = centerLng ?? center[1]
      const x = (lng - centerLngVal) * scale * canvasWidth + canvasWidth / 2
      const y = (centerLatVal - lat) * scale * canvasHeight + canvasHeight / 2
      return [x, y]
    },
    [center, zoom]
  )

  // Convert pixel delta to lat/lng delta
  const pixelToLatLngDelta = useCallback(
    (pixelDx: number, pixelDy: number, canvasWidth: number, canvasHeight: number): [number, number] => {
      const scale = Math.pow(2, zoom) * 0.001
      const latDelta = -pixelDy / (scale * canvasHeight)
      const lngDelta = pixelDx / (scale * canvasWidth)
      return [latDelta, lngDelta]
    },
    [zoom]
  )

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

      const [x, y] = latLngToPixel(event.latitude, event.longitude, canvas.width, canvas.height, center[0], center[1])
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

    // Merge close blobs
    const MERGE_DISTANCE = 80
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
  }, [sketches, events, latLngToPixel, generatePastelColor])

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

    // Clear canvas with background
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

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
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    resize()
    window.addEventListener('resize', resize)

    render()

    return () => {
      window.removeEventListener('resize', resize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [render])

  // Handle mouse down - start pan or click
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      // Only pan with left mouse button
      if (e.button !== 0) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Check if clicking on a blob or sketch first
      const blobs = prepareBlobs()
      
      // Check if clicking on a blob
      for (const blob of blobs) {
        const dx = blob.x - x
        const dy = blob.y - y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < blob.radius) {
          // Don't start pan if clicking on blob
          return
        }
      }

      // Check if clicking on a sketch in the cloud
      if (selectedEventId) {
        const selectedBlob = blobs.find((b) => b.eventId === selectedEventId)
        if (selectedBlob) {
          for (const [, pos] of sketchCloudPositions.entries()) {
            const dx = pos.x - x
            const dy = pos.y - y
            const dist = Math.sqrt(dx * dx + dy * dy)
            
            if (dist < 20) {
              // Don't start pan if clicking on sketch
              return
            }
          }
        }
      }

      // Start panning
      setIsDragging(true)
      hasDraggedRef.current = false
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        center: [...center] as [number, number],
      }
    },
    [prepareBlobs, selectedEventId, sketchCloudPositions, center]
  )

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setMousePos({ x, y })

      // Handle panning
      if (isDragging && dragStartRef.current) {
        const dx = e.clientX - dragStartRef.current.x
        const dy = e.clientY - dragStartRef.current.y
        
        // Track if we've actually moved (not just a click)
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          hasDraggedRef.current = true
        }
        
        const [latDelta, lngDelta] = pixelToLatLngDelta(dx, dy, canvas.width, canvas.height)
        
        const newCenter: [number, number] = [
          dragStartRef.current.center[0] - latDelta,
          dragStartRef.current.center[1] - lngDelta,
        ]
        setCenter(newCenter)
        return
      }

      // Check hover (only if not dragging)
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
    [prepareBlobs, isDragging, pixelToLatLngDelta]
  )

  // Handle mouse up - end pan
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      // Reset drag flag after a short delay to allow click handler to check it
      setTimeout(() => {
        hasDraggedRef.current = false
      }, 0)
      dragStartRef.current = null
    }
  }, [isDragging])

  // Handle mouse leave - cancel pan
  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      hasDraggedRef.current = false
      dragStartRef.current = null
    }
  }, [isDragging])

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const zoomSensitivity = 0.5
      const delta = -e.deltaY * zoomSensitivity * 0.01
      const newZoom = Math.max(1, Math.min(20, zoom + delta))
      setZoom(newZoom)
    },
    [zoom]
  )

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

  // Handle click
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Don't handle click if we just finished dragging
      if (hasDraggedRef.current) {
        return
      }

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

      // Click on empty space - close selection
      setSelectedEventId(null)
      setSelectedSketch(null)
    },
    [prepareBlobs, selectedEventId, sketchCloudPositions, calculateZoomForSeparation, onSketchClick]
  )

  return (
    <div className="relative w-full h-screen bg-gray-100">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onWheel={handleWheel}
        className="w-full h-full"
        style={{
          display: 'block',
          cursor: isDragging ? 'grabbing' : 'grab',
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
