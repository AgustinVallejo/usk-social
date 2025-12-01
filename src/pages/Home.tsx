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
import { formatDateOnly } from '@/lib/utils'
import type { Sketch } from '@/lib/types'
import type { Event } from '@/lib/types'

export function Home() {
  const { events } = useEvents()
  const { sketches, refetch: refetchSketches } = useSketches()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadEventId, setUploadEventId] = useState<string | undefined>(undefined)
  const [selectedSketch, setSelectedSketch] = useState<Sketch | null>(null)
  const [editingSketch, setEditingSketch] = useState<Sketch | null>(null)
  const [selectedEventGallery, setSelectedEventGallery] = useState<Event | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const createEventModalRef = useRef<HTMLDivElement | null>(null)
  const uploadModalRef = useRef<HTMLDivElement | null>(null)
  const editModalRef = useRef<HTMLDivElement | null>(null)

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

  // Get unique users with sketch counts
  const usersWithSketches = useMemo(() => {
    const userMap = new Map<string, { username: string; sketchCount: number }>()
    sketches.forEach((sketch) => {
      if (sketch.user_id) {
        const profile = sketch.profiles as any
        const username = profile?.username || sketch.user_id
        const current = userMap.get(sketch.user_id) || { username, sketchCount: 0 }
        userMap.set(sketch.user_id, {
          username,
          sketchCount: current.sketchCount + 1,
        })
      }
    })
    return Array.from(userMap.values()).sort((a, b) => b.sketchCount - a.sketchCount)
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
      <div className="flex justify-center items-center pt-8 pb-8">
        <div 
          className="flex space-x-4"
          onMouseMove={handleHeroMouseMove}
          onMouseLeave={handleHeroMouseLeave}
        >
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

      {/* Create Event Modal */}
      {showCreateEvent && (
        <div
          ref={createEventModalRef}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              createEventModalRef.current?.setAttribute('data-mousedown', 'true')
            } else {
              createEventModalRef.current?.removeAttribute('data-mousedown')
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && createEventModalRef.current?.getAttribute('data-mousedown') === 'true') {
              setShowCreateEvent(false)
            }
            createEventModalRef.current?.removeAttribute('data-mousedown')
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
          ref={uploadModalRef}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              uploadModalRef.current?.setAttribute('data-mousedown', 'true')
            } else {
              uploadModalRef.current?.removeAttribute('data-mousedown')
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && uploadModalRef.current?.getAttribute('data-mousedown') === 'true') {
              setShowUpload(false)
            }
            uploadModalRef.current?.removeAttribute('data-mousedown')
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
        {events.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800">Encuentros</h2>
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
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-1">
                {events.map((event) => {
                  const sketchCount = eventSketchCounts.get(event.id) || 0
                  return (
                    <div
                      key={event.id}
                      className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 rounded px-3 py-2 transition-colors"
                      onClick={() => setSelectedEventGallery(event)}
                    >
                      {event.event_date && (
                        <span className="text-gray-500">
                          {formatDateOnly(event.event_date)} -{' '}
                        </span>
                      )}
                      <span className="font-medium">{event.title}</span>
                      {sketchCount > 0 && (
                        <span className="text-gray-500"> ({sketchCount})</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* Users */}
        {usersWithSketches.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Sketchers</h2>
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-1">
                {usersWithSketches.map((userData) => (
                  <Link
                    key={userData.username}
                    to={`/profile/${userData.username}`}
                    className="block text-sm text-gray-700 cursor-pointer hover:bg-gray-100 rounded px-3 py-2 transition-colors"
                  >
                    <span className="font-medium">{userData.username}</span>
                    {userData.sketchCount > 0 && (
                      <span className="text-gray-500"> ({userData.sketchCount})</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {selectedSketch && (
        <SketchModal
          sketch={selectedSketch}
          onClose={() => setSelectedSketch(null)}
          onUpdate={() => {
            refetchSketches()
            setSelectedSketch(null)
          }}
          onEdit={(sketch) => {
            setSelectedSketch(null)
            setEditingSketch(sketch)
          }}
        />
      )}

      {/* Edit Modal */}
      {editingSketch && (
        <div
          ref={editModalRef}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              editModalRef.current?.setAttribute('data-mousedown', 'true')
            } else {
              editModalRef.current?.removeAttribute('data-mousedown')
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && editModalRef.current?.getAttribute('data-mousedown') === 'true') {
              setEditingSketch(null)
            }
            editModalRef.current?.removeAttribute('data-mousedown')
          }}
        >
          <div
            className="bg-gray-50 rounded-lg max-w-2xl w-full my-12 max-h-[90vh] overflow-y-auto shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-300 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Editar Sketch</h2>
              <button
                onClick={() => setEditingSketch(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <SketchUpload
                sketch={editingSketch}
                onSuccess={() => {
                  setEditingSketch(null)
                  refetchSketches()
                }}
                onCancel={() => setEditingSketch(null)}
              />
            </div>
          </div>
        </div>
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

