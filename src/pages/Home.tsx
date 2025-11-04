import { useState, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useEvents } from '@/hooks/useEvents'
import { useSketches } from '@/hooks/useSketches'
import { useAuth } from '@/hooks/useAuth'
import { SketchUpload } from '@/components/sketch/SketchUpload'
import { EventCreate } from '@/components/event/EventCreate'
import { SketchCard } from '@/components/sketch/SketchCard'
import { SketchModal } from '@/components/sketch/SketchModal'
import { EventSketchGallery } from '@/components/event/EventSketchGallery'
import type { Sketch } from '@/lib/types'
import type { Event } from '@/lib/types'

// Helper function to format date without timezone issues
function formatDateOnly(dateStr: string): string {
  // If it's a date string like "2024-01-15", parse it as local date
  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString()
  }
  // Fallback: extract date components to avoid timezone shift
  const date = new Date(dateStr)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toLocaleDateString()
}

export function Home() {
  const { events } = useEvents()
  const { sketches } = useSketches()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadEventId, setUploadEventId] = useState<string | undefined>(undefined)
  const [selectedSketch, setSelectedSketch] = useState<Sketch | null>(null)
  const [selectedEventGallery, setSelectedEventGallery] = useState<Event | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const heroSectionRef = useRef<HTMLDivElement | null>(null)

  const recentEvents = events.slice(0, 5)
  const recentSketches = sketches.slice(0, 12)

  // Count sketches per event
  const eventSketchCounts = useMemo(() => {
    const counts = new Map<string, number>()
    sketches.forEach((sketch) => {
      if (sketch.event_id) {
        counts.set(sketch.event_id, (counts.get(sketch.event_id) || 0) + 1)
      }
    })
    return counts
  }, [sketches])

  // Base vibrant color (similar to blob colors - using a vibrant blue/purple)
  const baseHue = 250 // Purple-blue hue
  const baseSaturation = 75
  const baseLightness = 65

  // Update button style based on proximity to button center
  const updateButtonStyle = (mouseX: number, mouseY: number) => {
    const button = buttonRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    // Distance from mouse to button center
    const dx = mouseX - centerX
    const dy = mouseY - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    // Max distance for full proximity effect (button diagonal + margin for area around button)
    const maxDist = Math.sqrt(rect.width * rect.width + rect.height * rect.height) / 2 + 80
    const proximity = Math.max(0, Math.min(1, 1 - dist / maxDist))

    // Calculate dynamic properties
    const hueShift = proximity * 40
    const saturation = Math.min(90, baseSaturation + proximity * 15)
    const lightness = Math.min(80, baseLightness + proximity * 15)
    const hue = (baseHue + hueShift) % 360
    const buttonBg = `hsl(${hue}, ${saturation}%, ${lightness}%)`
    const glowIntensity = proximity * 30
    const scale = 1 + proximity * 0.1

    // Update styles directly for instant response
    button.style.backgroundColor = buttonBg
    button.style.transform = `scale(${scale})`
    button.style.boxShadow = `0 0 ${glowIntensity}px ${buttonBg}, 0 4px 20px rgba(0, 0, 0, 0.3)`
  }

  // Track mouse movement in the hero section area
  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    updateButtonStyle(e.clientX, e.clientY)
  }

  const handleHeroMouseLeave = () => {
    const button = buttonRef.current
    if (!button) return

    // Reset to base state
    const buttonBg = `hsl(${baseHue}, ${baseSaturation}%, ${baseLightness}%)`
    button.style.backgroundColor = buttonBg
    button.style.transform = 'scale(1)'
    button.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)'
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div 
        ref={heroSectionRef}
        className="bg-gray-200 border-b border-gray-300 py-20"
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-4 text-gray-800">Bienvenido a USK Social</h1>
          <p className="text-xl mb-8 text-gray-600">
            Un espacio interactivo para compartir y disfrutar nuestras creaciones alrededor del mundo.
            <br/>Por ahora solo disponible para USK Medellín.
          </p>
          <div className="space-x-4">
            <button
              ref={buttonRef}
              onClick={() => {
                if (!user) {
                  navigate('/auth')
                  return
                }
                setUploadEventId(undefined)
                setShowUpload(true)
              }}
              className="text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 shadow-lg relative overflow-hidden"
              style={{
                backgroundColor: `hsl(${baseHue}, ${baseSaturation}%, ${baseLightness}%)`,
              }}
            >
              <span className="relative z-10">Subir un Sketch</span>
            </button>
            <button
              onClick={() => navigate('/map')}
              className="bg-gray-700 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors shadow-md"
            >
              Ir al Mapa
            </button>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateEvent && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateEvent(false)
            }
          }}
        >
          <div 
            className="bg-gray-50 rounded-lg max-w-2xl w-full my-12 max-h-[90vh] overflow-y-auto shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-300 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Crear Evento</h2>
              <button
                onClick={() => setShowCreateEvent(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <EventCreate
                onSuccess={() => {
                  setShowCreateEvent(false)
                  window.location.reload()
                }}
                onCancel={() => setShowCreateEvent(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUpload(false)
            }
          }}
        >
          <div 
            className="bg-gray-50 rounded-lg max-w-2xl w-full my-12 max-h-[90vh] overflow-y-auto shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-300 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Subir Sketch</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <SketchUpload
                initialEventId={uploadEventId}
                onSuccess={() => {
                  setShowUpload(false)
                  setUploadEventId(undefined)
                  window.location.reload()
                }}
                onCancel={() => {
                  setShowUpload(false)
                  setUploadEventId(undefined)
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Recent Sketches */}
        {recentSketches.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800">Sketches Recientes</h2>
              <Link
                to="/map"
                className="text-gray-700 hover:text-gray-900 font-medium"
              >
                Ver todos en el Mapa →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {recentSketches.map((sketch) => (
                <SketchCard
                  key={sketch.id}
                  sketch={sketch}
                  onClick={() => setSelectedSketch(sketch)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Featured Meetups */}
        {recentEvents.length > 0 && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800">Encuentros Destacados</h2>
              <button
                onClick={() => {
                  if (!user) {
                    navigate('/auth')
                    return
                  }
                  setShowCreateEvent(true)
                }}
                className="bg-gray-700 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors shadow-md"
              >
                Crear Evento
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentEvents.map((event) => {
                const sketchCount = eventSketchCounts.get(event.id) || 0
                return (
                <div
                  key={event.id}
                  className="bg-gray-100 border border-gray-300 rounded-lg p-6 hover:bg-gray-200 transition-colors cursor-pointer"
                  onClick={() => setSelectedEventGallery(event)}
                >
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {event.title}
                    {sketchCount > 0 && (
                      <span className="text-base font-normal text-gray-600 ml-2">
                        ({sketchCount})
                      </span>
                    )}
                  </h3>
                  {event.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
                  )}
                  {event.location_name && (
                    <p className="text-sm text-gray-500 mb-2">📍 {event.location_name}</p>
                  )}
                  {event.event_date && (
                    <p className="text-sm text-gray-500 mb-4">
                      📅 {formatDateOnly(event.event_date)}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!user) {
                          navigate('/auth')
                          return
                        }
                        setUploadEventId(event.id)
                        setShowUpload(true)
                      }}
                      className="flex-1 text-white px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 shadow-lg relative overflow-hidden hover:scale-105"
                      style={{
                        backgroundColor: `hsl(${baseHue}, ${baseSaturation}%, ${baseLightness}%)`,
                      }}
                    >
                      <span className="relative z-10">Subir Sketch</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/map?lat=${event.latitude}&lng=${event.longitude}&zoom=15`)
                      }}
                      className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-600 transition-colors"
                    >
                      Ver en Mapa
                    </button>
                  </div>
                </div>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {selectedSketch && (
        <SketchModal
          sketch={selectedSketch}
          onClose={() => setSelectedSketch(null)}
        />
      )}

      {selectedEventGallery && (
        <EventSketchGallery
          event={selectedEventGallery}
          onClose={() => setSelectedEventGallery(null)}
        />
      )}
    </div>
  )
}

