import { useSketches } from '@/hooks/useSketches'
import { InteractiveMap } from '@/components/map/InteractiveMap'
import { useState } from 'react'
import { SketchModal } from '@/components/sketch/SketchModal'
import type { Sketch } from '@/lib/types'

export function Map() {
  const { sketches, loading } = useSketches()
  const [selectedSketch, setSelectedSketch] = useState<Sketch | null>(null)

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
        />
      )}
    </div>
  )
}

