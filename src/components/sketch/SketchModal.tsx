import { useNavigate, Link } from 'react-router-dom'
import { useUsername } from '@/hooks/useUsername'
import type { Sketch } from '@/lib/types'

interface SketchModalProps {
  sketch: Sketch
  onClose: () => void
  onUpdate?: () => void
}

export function SketchModal({ sketch, onClose }: SketchModalProps) {
  const { profile } = useUsername()
  const navigate = useNavigate()
  const isOwner = profile?.id === sketch.user_id

  // Note: handleDelete function is defined but not currently used in the UI
  // Uncomment and add delete button in the UI if needed
  // const handleDelete = async () => {
  //   if (!confirm('Are you sure you want to delete this sketch?')) return
  //
  //   try {
  //     // Delete from storage
  //     const urlParts = sketch.image_url.split('/')
  //     const filePath = urlParts.slice(urlParts.indexOf('sketches') + 1).join('/')
  //     await supabase.storage.from('sketches').remove([filePath])
  //
  //     // Delete from database
  //     const { error } = await supabase
  //       .from('sketches')
  //       .delete()
  //       .eq('id', sketch.id)
  //
  //     if (error) throw error
  //
  //     onUpdate?.()
  //     onClose()
  //   } catch (err) {
  //     alert('Failed to delete sketch')
  //     console.error(err)
  //   }
  // }

  const handleViewOnMap = () => {
    if (sketch.latitude && sketch.longitude) {
      navigate(`/map?lat=${sketch.latitude}&lng=${sketch.longitude}&zoom=15`)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 z-10"
          >
            ✕
          </button>
          <img
            src={sketch.image_url}
            alt={sketch.title}
            className="w-full h-auto"
          />
        </div>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{sketch.title}</h2>
          {sketch.description && (
            <p className="text-gray-600 mb-4">{sketch.description}</p>
          )}
          <div className="flex items-center space-x-4 mb-4">
            {sketch.profiles?.avatar_url && (
              <img
                src={sketch.profiles.avatar_url}
                alt={sketch.profiles.username}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              {sketch.profiles?.username ? (
                <Link
                  to={`/profile/${sketch.profiles.username}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onClose()
                  }}
                  className="font-medium text-gray-800 hover:text-blue-600"
                >
                  {sketch.profiles.username}
                </Link>
              ) : (
                <p className="font-medium text-gray-800">Unknown</p>
              )}
              <p className="text-sm text-gray-500">
                {new Date(sketch.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          {(sketch.location_name || (sketch.latitude && sketch.longitude)) && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                📍 {sketch.location_name || `${sketch.latitude}, ${sketch.longitude}`}
              </p>
            </div>
          )}
          <div className="flex space-x-4">
            {sketch.latitude && sketch.longitude && (
              <button
                onClick={handleViewOnMap}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Ver en Mapa
              </button>
            )}
            {isOwner && (
              <>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

