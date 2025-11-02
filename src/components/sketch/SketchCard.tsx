import { Link } from 'react-router-dom'
import type { Sketch } from '@/lib/types'

interface SketchCardProps {
  sketch: Sketch
  onClick?: () => void
}

export function SketchCard({ sketch, onClick }: SketchCardProps) {
  return (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <div className="aspect-square overflow-hidden bg-gray-200">
        <img
          src={sketch.thumbnail_url || sketch.image_url}
          alt={sketch.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 mb-1 truncate">{sketch.title}</h3>
        {sketch.profiles && (
          <Link
            to={`/profile/${sketch.profiles.username}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-gray-600 hover:text-blue-600"
          >
            @{sketch.profiles.username}
          </Link>
        )}
        {sketch.location_name && (
          <p className="text-xs text-gray-500 mt-1">{sketch.location_name}</p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          {new Date(sketch.sketch_date).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}

