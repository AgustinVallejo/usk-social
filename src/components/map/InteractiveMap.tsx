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
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [center, setCenter] = useState<[number, number]>(initialCenter)
  const [zoom, setZoom] = useState(initialZoom)
  const [events, setEvents] = useState<Map<string, Event>>(new Map())
  const [hoveredBlob, setHoveredBlob] = useState<string | null>(null)
  const [hoveredOrphanSketch, setHoveredOrphanSketch] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedSketch, setSelectedSketch] = useState<Sketch | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const [sketchCloudPositions, setSketchCloudPositions] = useState<Map<string, { x: number; y: number }>>(new Map())
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const animationFrameRef = useRef<number>()
  const mapInstanceRef = useRef<any>(null) // Leaflet map instance
  const animationTimeRef = useRef<number>(0) // Time for noise animation
  const lastFrameTimeRef = useRef<number>(0) // Track frame timing
  const selectionTimeRef = useRef<Map<string, number>>(new Map()) // Track when each event was selected

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

  // Generate vibrant pastel color for event
  const generatePastelColor = useCallback((eventId: string): string => {
    // Use event ID as seed for consistent colors
    let hash = 0
    for (let i = 0; i < eventId.length; i++) {
      hash = eventId.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = (hash % 360 + 360) % 360
    const saturation = 60 + (hash % 30) // 60-90% - more vibrant
    const lightness = 65 + (hash % 15) // 65-80% - not too bright but more visible
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }, [])

  // Prepare orphan sketches (sketches without events but with location data)
  const prepareOrphanSketches = useCallback((): Array<{ sketch: Sketch; x: number; y: number }> => {
    const canvas = canvasRef.current
    if (!canvas) return []

    const orphanSketches: Array<{ sketch: Sketch; x: number; y: number }> = []
    
    sketches.forEach((sketch) => {
      // Orphan sketch: no event_id but has location data
      if (!sketch.event_id && sketch.latitude && sketch.longitude) {
        const [x, y] = latLngToPixel(sketch.latitude, sketch.longitude)
        
        // Skip if coordinates are invalid (map not ready or out of bounds)
        if (x !== -1000 && y !== -1000) {
          orphanSketches.push({ sketch, x, y })
        }
      }
    })

    return orphanSketches
  }, [sketches, latLngToPixel])

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

  // Check if a point hits any blob or orphan sketch
  const checkBlobHit = useCallback((clientX: number, clientY: number): { blob?: BlobData; sketchId?: string; orphanSketch?: Sketch } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    
    const blobs = prepareBlobs()
    const orphanSketches = prepareOrphanSketches()
    
    // Check if clicking on an orphan sketch first (they're smaller, so check them first)
    for (const { sketch, x: sketchX, y: sketchY } of orphanSketches) {
      const dx = sketchX - x
      const dy = sketchY - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist < 15) {
        return { orphanSketch: sketch }
      }
    }
    
    // Check if clicking on a blob
    for (const blob of blobs) {
      const dx = blob.x - x
      const dy = blob.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist < blob.radius) {
        return { blob }
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
            return { blob: selectedBlob, sketchId }
          }
        }
      }
    }
    
    return null
  }, [prepareBlobs, prepareOrphanSketches, selectedEventId, sketchCloudPositions])

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

  // Draw orphan sketch bubble (smaller than event blobs)
  const drawOrphanSketchBubble = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      sketch: Sketch,
      mouseProximity: number
    ) => {
      const baseRadius = 15
      const scale = 1 + mouseProximity * 0.2
      const scaledRadius = baseRadius * scale

      // Use a neutral color for orphan sketches
      const color = 'hsl(200, 60%, 70%)'
      const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
      
      if (hslMatch) {
        const [, h, s, l] = hslMatch
        const baseHue = parseInt(h)
        const saturation = parseInt(s)
        const lightness = parseInt(l)
        
        const hueShift = mouseProximity * 40
        const hue = (baseHue + hueShift) % 360
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, scaledRadius)
        gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${Math.min(lightness + 15, 95)}%, 0.8)`)
        gradient.addColorStop(0.5, `hsla(${(hue + 20) % 360}, ${saturation + 5}%, ${lightness}%, 0.6)`)
        gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${Math.max(lightness - 10, 60)}%, 0.3)`)
        
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(x, y, scaledRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      // Draw sketch thumbnail if available
      const imageUrl = sketch.thumbnail_url || sketch.image_url
      if (imageUrl) {
        const cachedImg = imageCacheRef.current.get(imageUrl)
        if (cachedImg && cachedImg.complete) {
          ctx.save()
          ctx.beginPath()
          ctx.arc(x, y, scaledRadius - 2, 0, Math.PI * 2)
          ctx.clip()
          const size = scaledRadius * 2 - 4
          ctx.drawImage(cachedImg, x - size / 2, y - size / 2, size, size)
          ctx.restore()
        }
      }
    },
    []
  )

  // Store render function in ref for image loading
  const renderRef = useRef<() => void>()

  // Improved hash function for pseudo-random values
  const hash = useCallback((x: number, y: number): number => {
    // Combine coordinates into a seed
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
    return (n - Math.floor(n)) * 2 - 1 // Return value between -1 and 1
  }, [])

  // Smooth interpolation function (smoothstep)
  const smoothstep = useCallback((t: number): number => {
    return t * t * (3 - 2 * t)
  }, [])

  // Improved gradient noise function with proper interpolation
  const gradNoise = useCallback((x: number, y: number): number => {
    const fx = Math.floor(x)
    const fy = Math.floor(y)
    const cx = fx + 1
    const cy = fy + 1
    
    // Get corner values using hash
    const n00 = hash(fx, fy)
    const n10 = hash(cx, fy)
    const n01 = hash(fx, cy)
    const n11 = hash(cx, cy)
    
    // Fractional parts
    const fracX = x - fx
    const fracY = y - fy
    
    // Smooth interpolation
    const u = smoothstep(fracX)
    const v = smoothstep(fracY)
    
    // Bilinear interpolation
    const n0 = n00 * (1 - u) + n10 * u
    const n1 = n01 * (1 - u) + n11 * u
    
    return n0 * (1 - v) + n1 * v
  }, [hash, smoothstep])

  // Multi-octave noise for smoother, more natural movement
  const fbm = useCallback((x: number, y: number, octaves: number = 3): number => {
    let value = 0
    let amplitude = 0.5
    let frequency = 1
    let maxValue = 0
    
    for (let i = 0; i < octaves; i++) {
      value += gradNoise(x * frequency, y * frequency) * amplitude
      maxValue += amplitude
      amplitude *= 0.5
      frequency *= 2
    }
    
    // Normalize from [-1, 1] to [0, 1]
    return (value / maxValue + 1) / 2
  }, [gradNoise])

  // Easing function for smooth flow-out animation (ease-out-cubic)
  const easeOutCubic = useCallback((t: number): number => {
    return 1 - Math.pow(1 - t, 3)
  }, [])

  // Draw sketch cloud
  const drawSketchCloud = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      sketches: Sketch[],
      centerX: number,
      centerY: number,
      eventId: string,
      currentTime: number
    ): SketchCloudItem[] => {
      const items: SketchCloudItem[] = []
      const angleStep = (Math.PI * 2) / Math.max(sketches.length, 1)
      const baseDistance = 100
      const positions = new Map<string, { x: number; y: number }>()
      
      // Get selection time for this event
      const selectionTime = selectionTimeRef.current.get(eventId) || currentTime
      if (!selectionTimeRef.current.has(eventId)) {
        selectionTimeRef.current.set(eventId, currentTime)
      }
      
      // Calculate animation progress (0 to 1) with duration of 0.8 seconds
      const animationDuration = 0.8
      const elapsed = currentTime - selectionTime
      const progress = Math.min(1, elapsed / animationDuration)
      const easedProgress = easeOutCubic(progress)

      sketches.forEach((sketch, index) => {
        // Base angle evenly distributed around circle
        const baseAngle = index * angleStep
        
        // Noise parameters - each sketch has unique seed based on index
        const noiseTime = currentTime * 0.5 // Animation speed
        const angleNoiseScale = 0.7 // How much noise affects angle (in radians)
        const distanceNoiseScale = 30 // How much noise affects distance (in pixels)
        const noiseFrequency = 0.15 // Frequency of noise
        
        // Apply noise to angle separately
        const angleNoise = fbm(index * 0.3, noiseTime * noiseFrequency, 3)
        const angleOffset = (angleNoise - 0.5) * angleNoiseScale
        const finalAngle = baseAngle + angleOffset
        
        // Apply noise to distance separately
        const distanceNoise = fbm(index * 0.3 + 100, noiseTime * noiseFrequency + 50, 3)
        const distanceOffset = (distanceNoise - 0.5) * distanceNoiseScale
        const finalDistance = (baseDistance + distanceOffset) * easedProgress
        
        // Calculate position with animated distance
        const x = centerX + Math.cos(finalAngle) * finalDistance
        const y = centerY + Math.sin(finalAngle) * finalDistance

        items.push({ sketch, x, y, angle: finalAngle, distance: finalDistance })
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
    [fbm, easeOutCubic]
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

    // Update animation time using actual elapsed time
    const now = performance.now() / 1000 // Convert to seconds
    if (lastFrameTimeRef.current === 0 || (now - lastFrameTimeRef.current) > 1) {
      lastFrameTimeRef.current = now
    }
    const deltaTime = now - lastFrameTimeRef.current
    animationTimeRef.current += deltaTime
    lastFrameTimeRef.current = now

    // Clear canvas with transparent background (map tiles show through)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const blobs = prepareBlobs()
    const orphanSketches = prepareOrphanSketches()

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
        drawSketchCloud(ctx, blob.sketches, blob.x, blob.y, blob.eventId, animationTimeRef.current)
      }
    })

    // Draw orphan sketches
    orphanSketches.forEach(({ sketch, x, y }) => {
      // Calculate mouse proximity effect
      let mouseProximity = 0
      if (mousePos) {
        const dx = x - mousePos.x
        const dy = y - mousePos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxDist = 100
        mouseProximity = Math.max(0, 1 - dist / maxDist)
      }

      drawOrphanSketchBubble(ctx, x, y, sketch, mouseProximity)
    })

    animationFrameRef.current = requestAnimationFrame(render)
  }, [prepareBlobs, prepareOrphanSketches, selectedEventId, mousePos, drawBlob, drawSketchCloud, drawOrphanSketchBubble])

  // Update render ref
  useEffect(() => {
    renderRef.current = render
  }, [render])

  // Load and cache images when event is selected or for orphan sketches
  useEffect(() => {
    // Cache images for selected event sketches
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
    
    // Cache images for orphan sketches
    const orphanSketches = prepareOrphanSketches()
    orphanSketches.forEach(({ sketch }) => {
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
  }, [selectedEventId, prepareBlobs, prepareOrphanSketches])

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

  // Handle mouse move for hover detection - now handled on map container
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setMousePos({ x, y })

      // Check if mouse is over any blob, orphan sketch, or sketch cloud
      const blobs = prepareBlobs()
      const orphanSketches = prepareOrphanSketches()
      let foundHover = false
      
      // Check orphan sketches first
      for (const { sketch, x: sketchX, y: sketchY } of orphanSketches) {
        const dx = sketchX - x
        const dy = sketchY - y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < 15) {
          setHoveredOrphanSketch(sketch.id)
          setHoveredBlob(null)
          foundHover = true
          break
        }
      }
      
      // Check event blobs
      if (!foundHover) {
        for (const blob of blobs) {
          const dx = blob.x - x
          const dy = blob.y - y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < blob.radius) {
            // Only show hover for single blobs (not merged)
            if (blob.mergedCount === 1) {
              setHoveredBlob(blob.eventId)
              setHoveredOrphanSketch(null)
              foundHover = true
            }
            break
          }
        }
      }

      if (!foundHover) {
        setHoveredBlob(null)
        setHoveredOrphanSketch(null)
      }
    },
    [prepareBlobs, prepareOrphanSketches]
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

  // Handle click on map container (for blob/sketch selection)
  const handleClick = useCallback(
    (e: MouseEvent) => {
      const hit = checkBlobHit(e.clientX, e.clientY)
      if (!hit) {
        // Clicked on empty space - close selection
        setSelectedEventId(null)
        setSelectedSketch(null)
        return
      }

      // Prevent map interaction when clicking on blob or orphan sketch
      e.stopPropagation()
      e.preventDefault()

      const { blob, sketchId, orphanSketch } = hit

      // If clicking on an orphan sketch
      if (orphanSketch) {
        setSelectedSketch(orphanSketch)
        onSketchClick?.(orphanSketch)
        return
      }

      if (!blob) return

      // If clicking on a sketch in the cloud
      if (sketchId) {
        const sketch = blob.sketches.find((s) => s.id === sketchId)
        if (sketch) {
          setSelectedSketch(sketch)
          onSketchClick?.(sketch)
          return
        }
      }

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
        selectionTimeRef.current.delete(blob.eventId) // Clear animation timing
      } else {
        setSelectedEventId(blob.eventId)
        setSelectedSketch(null)
        // Animation time will be set in drawSketchCloud on first render
      }
    },
    [checkBlobHit, selectedEventId, calculateZoomForSeparation, onSketchClick]
  )

  // Handle mouse down on map container - prevent map drag when clicking blob
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      const hit = checkBlobHit(e.clientX, e.clientY)
      if (hit) {
        // Prevent map drag when clicking blob
        e.stopPropagation()
        e.preventDefault()
      }
    },
    [checkBlobHit]
  )

  // Add event listeners to map container for blob interaction when map is ready
  useEffect(() => {
    if (!mapInstanceRef.current) return
    
    const container = mapInstanceRef.current.getContainer()
    if (!container) return

    // Use capture phase to catch events before Leaflet processes them
    container.addEventListener('mousemove', handleMouseMove, true)
    container.addEventListener('click', handleClick, true)
    container.addEventListener('mousedown', handleMouseDown, true)

    return () => {
      container.removeEventListener('mousemove', handleMouseMove, true)
      container.removeEventListener('click', handleClick, true)
      container.removeEventListener('mousedown', handleMouseDown, true)
    }
  }, [handleMouseMove, handleClick, handleMouseDown])

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* OpenStreetMap tile layer - handles all interactions */}
      <div ref={mapContainerRef} className="absolute inset-0 z-10">
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
      
      {/* Canvas overlay - non-interactive, rendering only */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0"
        style={{
          display: 'block',
          pointerEvents: 'none', // Canvas doesn't block map interactions
          zIndex: 1000, // Renders above map visually, but pointer-events: none means it doesn't intercept
          width: '100%',
          height: '100%',
        }}
      />
      
      {/* Hover tooltip */}
      {hoveredBlob && (() => {
        const event = events.get(hoveredBlob)
        const blob = prepareBlobs().find(b => b.eventId === hoveredBlob)
        const sketchCount = blob?.sketches.length || 0
        return (
          <div
            className="absolute pointer-events-none bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm"
            style={{
              left: mousePos ? `${mousePos.x + 10}px` : '0',
              top: mousePos ? `${mousePos.y + 10}px` : '0',
              zIndex: 1500, // Above canvas
            }}
          >
            {event?.title || 'Event'}
            {sketchCount > 0 && ` (${sketchCount})`}
          </div>
        )
      })()}
      {hoveredOrphanSketch && (() => {
        const sketch = sketches.find(s => s.id === hoveredOrphanSketch)
        return sketch ? (
          <div
            className="absolute pointer-events-none bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm"
            style={{
              left: mousePos ? `${mousePos.x + 10}px` : '0',
              top: mousePos ? `${mousePos.y + 10}px` : '0',
              zIndex: 1500, // Above canvas
            }}
          >
            {sketch.title}
          </div>
        ) : null
      })()}

      {/* Sketch viewer - smaller and less intrusive */}
      {selectedSketch && (
        <div
          className="fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl overflow-hidden max-w-sm w-full"
          style={{ 
            maxHeight: '60vh',
            zIndex: 2000, // Above canvas
          }}
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
