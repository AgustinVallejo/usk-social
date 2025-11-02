import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUsername } from '@/hooks/useUsername'
import { useEvents } from '@/hooks/useEvents'
import { useSketches } from '@/hooks/useSketches'
import { SketchUpload } from '@/components/sketch/SketchUpload'
import { EventCreate } from '@/components/event/EventCreate'
import { SketchCard } from '@/components/sketch/SketchCard'
import { SketchModal } from '@/components/sketch/SketchModal'
import type { Sketch } from '@/lib/types'

export function Home() {
  const { profile } = useUsername()
  const { events } = useEvents()
  const { sketches } = useSketches()
  const navigate = useNavigate()
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedSketch, setSelectedSketch] = useState<Sketch | null>(null)

  const recentEvents = events.slice(0, 5)
  const recentSketches = sketches.slice(0, 12)

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gray-200 border-b border-gray-300 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-4 text-gray-800">Welcome to USK Social</h1>
          <p className="text-xl mb-8 text-gray-600">
            Connect with Urban Sketchers worldwide. Share your artwork and discover inspiring sketches from around the globe.
          </p>
          <div className="space-x-4">
            <button
              onClick={() => setShowCreateEvent(true)}
              className="bg-gray-700 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors shadow-md"
            >
              Create Event
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="bg-gray-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-700 transition-colors shadow-md"
            >
              Upload Your Sketch
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
            <div className="p-4 border-b border-gray-300">
              <button
                onClick={() => setShowCreateEvent(false)}
                className="float-right text-gray-500 hover:text-gray-700 text-xl font-bold"
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
            <div className="p-4 border-b border-gray-300">
              <button
                onClick={() => setShowUpload(false)}
                className="float-right text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <SketchUpload
                onSuccess={() => {
                  setShowUpload(false)
                  window.location.reload()
                }}
                onCancel={() => setShowUpload(false)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Meetups */}
        {recentEvents.length > 0 && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Featured Meetups</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-gray-100 border border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => navigate(`/map?lat=${event.latitude}&lng=${event.longitude}&zoom=15`)}
                >
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{event.title}</h3>
                  {event.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
                  )}
                  {event.location_name && (
                    <p className="text-sm text-gray-500 mb-2">📍 {event.location_name}</p>
                  )}
                  {event.event_date && (
                    <p className="text-sm text-gray-500">
                      📅 {new Date(event.event_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Sketches */}
        {recentSketches.length > 0 && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800">Recent Sketches</h2>
              <Link
                to="/map"
                className="text-gray-700 hover:text-gray-900 font-medium"
              >
                View All on Map →
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
      </div>

      {selectedSketch && (
        <SketchModal
          sketch={selectedSketch}
          onClose={() => setSelectedSketch(null)}
        />
      )}
    </div>
  )
}

