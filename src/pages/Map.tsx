import { useSketches } from '@/hooks/useSketches'
import { InteractiveMap } from '@/components/map/InteractiveMap'
import { useState, useRef } from 'react'
import { SketchModal } from '@/components/sketch/SketchModal'
import { SketchUpload } from '@/components/sketch/SketchUpload'
import type { Sketch } from '@/lib/types'

export function Map() {
  const { sketches, loading, refetch: refetchSketches } = useSketches()
  const [selectedSketch, setSelectedSketch] = useState<Sketch | null>(null)
  const [editingSketch, setEditingSketch] = useState<Sketch | null>(null)
  const editModalRef = useRef<HTMLDivElement | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-gray-50" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
        <div className="text-center">
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }

  const sketchesWithLocation = sketches.filter(
    (sketch) => sketch.latitude && sketch.longitude
  )

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <InteractiveMap sketches={sketchesWithLocation} />
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
    </div>
  )
}

