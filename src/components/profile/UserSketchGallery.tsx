import { useState } from 'react'
import { useSketches } from '@/hooks/useSketches'
import { SketchCard } from '../sketch/SketchCard'
import { SketchModal } from '../sketch/SketchModal'
import type { Sketch } from '@/lib/types'

interface UserSketchGalleryProps {
  userId: string
}

export function UserSketchGallery({ userId }: UserSketchGalleryProps) {
  const { sketches, loading } = useSketches(userId)
  const [selectedSketch, setSelectedSketch] = useState<Sketch | null>(null)

  if (loading) {
    return <div className="text-center py-12">Loading sketches...</div>
  }

  if (sketches.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No sketches uploaded yet.
      </div>
    )
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Sketches</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sketches.map((sketch) => (
          <SketchCard
            key={sketch.id}
            sketch={sketch}
            onClick={() => setSelectedSketch(sketch)}
          />
        ))}
      </div>
      {selectedSketch && (
        <SketchModal
          sketch={selectedSketch}
          onClose={() => setSelectedSketch(null)}
          onUpdate={() => window.location.reload()}
        />
      )}
    </>
  )
}

