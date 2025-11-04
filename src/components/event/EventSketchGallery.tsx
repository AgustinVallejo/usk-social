import { useState } from 'react'
import { useSketches } from '@/hooks/useSketches'
import { SketchCard } from '../sketch/SketchCard'
import { SketchModal } from '../sketch/SketchModal'
import { SketchUpload } from '../sketch/SketchUpload'
import type { Sketch } from '@/lib/types'
import type { Event } from '@/lib/types'

interface EventSketchGalleryProps {
  event: Event
  onClose: () => void
}

export function EventSketchGallery({ event, onClose }: EventSketchGalleryProps) {
  const { sketches, loading, refetch: refetchSketches } = useSketches()
  const [selectedSketch, setSelectedSketch] = useState<Sketch | null>(null)
  const [editingSketch, setEditingSketch] = useState<Sketch | null>(null)

  // Filter sketches for this event
  const eventSketches = sketches.filter((sketch) => sketch.event_id === event.id)

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-gray-50 rounded-lg max-w-6xl w-full my-12 max-h-[90vh] overflow-y-auto shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gray-50 border-b border-gray-300 p-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{event.title}</h2>
            {event.location_name && (
              <p className="text-sm text-gray-600 mt-1">📍 {event.location_name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ✕
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">Cargando sketches...</div>
          ) : eventSketches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No hay sketches subidos para este encuentro aún.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {eventSketches.map((sketch) => (
                <SketchCard
                  key={sketch.id}
                  sketch={sketch}
                  onClick={() => setSelectedSketch(sketch)}
                />
              ))}
            </div>
          )}
        </div>
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingSketch(null)
            }
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
    </div>
  )
}

